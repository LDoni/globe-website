'use strict';
(async()=>{
 const shell=document.querySelector('[data-climate]');if(!shell)return;
 const ROOT=new URL('../../',document.currentScript.src),region=shell.querySelector('[data-climate-region]'),date=shell.querySelector('[data-climate-date]'),quantity=shell.querySelector('[data-climate-quantity]'),chart=shell.querySelector('[data-climate-chart]'),years=shell.querySelector('[data-climate-years]'),status=shell.querySelector('[data-climate-status]'),readout=shell.querySelector('[data-climate-readout]');
 const caches=new Map(),colors=['#bd3449','#167e91','#8e66a7','#ce8a28','#546b7a'];let cache,records=[],selectedYears=[],request=0;
 const label=d=>new Date(d+'T12:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'});
 const ordinal=n=>n+(n%100>=11&&n%100<=13?'th':({1:'st',2:'nd',3:'rd'}[n%10]||'th'));
 function metric(name,value,description){const box=shell.querySelector(`[data-climate-stat="${name}"]`);box.querySelector('strong').textContent=value;box.querySelector('span').textContent=description;}
 function stats(row){
  if(!row){['date','anomaly','temperature','rank'].forEach(n=>metric(n,'Unavailable','No observation for this date'));return;}
  const same=records.filter(r=>r[0].slice(5)===row[0].slice(5)&&Number.isFinite(r[1]));
  const rank=Number.isFinite(row[1])?1+same.filter(r=>r[1]>row[1]).length:null;
  metric('date',row[0].slice(0,4),label(row[0]));
  metric('anomaly',row[3]===null?'Unavailable':`${row[3]>=0?'+':''}${row[3].toFixed(2)} °C`,'vs 1991–2020');
  metric('temperature',row[1]===null?'Unavailable':row[1].toFixed(2)+' °C',cache.region+' sea surface temperature');
  metric('rank',rank?`${ordinal(rank)} of ${same.length}`:'Unavailable','Warmest SST on this calendar date');
  status.textContent=`${cache.region} · ERA5 · ${row[4]} · last successful retrieval ${cache.retrieved_at}`;
 }
 function draw(){
  if(!cache)return;const selected=records.find(r=>r[0]===date.value);stats(selected);
  const column=quantity.value==='anomaly'?3:1,groups=selectedYears.map(y=>records.filter(r=>r[0].startsWith(y+'-')&&Number.isFinite(r[column]))),values=groups.flat().map(r=>r[column]);if(column===1)values.push(...records.map(r=>r[2]).filter(Number.isFinite));
  const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg'),w=Math.max(240,chart.clientWidth),h=300,p=38;
  svg.setAttribute('viewBox',`0 0 ${w} ${h}`);svg.setAttribute('role','img');svg.setAttribute('aria-label',`Official ERA5 ${cache.region} ${quantity.value} by year; use the date field to read exact values.`);
  if(!values.length){chart.textContent='Select at least one year with observations.';return;}
  const min=Math.floor(Math.min(...values,quantity.value==='anomaly'?0:Infinity))-.1,max=Math.ceil(Math.max(...values))+.1;
  const day=d=>(Date.parse('2000-'+d.slice(5)+'T12:00:00Z')-Date.parse('2000-01-01T12:00:00Z'))/86400000;
  const x=d=>p+day(d)/365*(w-2*p),y=v=>h-p-(v-min)/(max-min)*(h-2*p);
  function text(t,xx,yy,anchor='start'){const n=document.createElementNS(ns,'text');n.setAttribute('x',xx);n.setAttribute('y',yy);n.setAttribute('text-anchor',anchor);n.textContent=t;svg.append(n);}
  for(let i=0;i<5;i++){const v=min+(max-min)*i/4,line=document.createElementNS(ns,'line');for(const [k,value]of Object.entries({x1:p,x2:w-p,y1:y(v),y2:y(v),stroke:'#dce5e8','stroke-dasharray':'3 5'}))line.setAttribute(k,value);svg.append(line);text(v.toFixed(1),1,y(v)+4);}
  function path(rows,index,color,dash=''){
   const n=document.createElementNS(ns,'path');n.setAttribute('d',rows.map((r,i)=>`${i&&Date.parse(r[0])-Date.parse(rows[i-1][0])<2*86400000?'L':'M'}${x(r[0])},${y(r[index])}`).join(' '));n.setAttribute('fill','none');n.setAttribute('stroke',color);n.setAttribute('stroke-width',2);if(dash)n.setAttribute('stroke-dasharray',dash);svg.append(n);
  }
  groups.forEach((rows,i)=>{if(rows.length)path(rows,column,colors[i%colors.length]);});
  if(quantity.value==='absolute'){
   const climatology=new Map();records.forEach(r=>{if(r[2]!==null)climatology.set(r[0].slice(5),r);});
   const rows=[...climatology.values()].sort((a,b)=>day(a[0])-day(b[0]));const n=document.createElementNS(ns,'path');n.setAttribute('d',rows.map((r,i)=>`${i?'L':'M'}${x(r[0])},${y(r[2])}`).join(' '));n.setAttribute('fill','none');n.setAttribute('stroke','#384d58');n.setAttribute('stroke-dasharray','5 5');n.setAttribute('stroke-width',1.5);svg.append(n);
  }
  for(const [month,name]of [['01','Jan'],['04','Apr'],['07','Jul'],['10','Oct'],['12','Dec']])text(name,x('2000-'+month+'-01'),h-10,month==='01'?'start':month==='12'?'end':'middle');
  text(quantity.value==='anomaly'?'SST anomaly (°C)':'Sea surface temperature (°C)',p,16);
  if(selected&&selected[column]!==null){const circle=document.createElementNS(ns,'circle');circle.setAttribute('cx',x(selected[0]));circle.setAttribute('cy',y(selected[column]));circle.setAttribute('r',4);circle.setAttribute('fill','#bd3449');svg.append(circle);}
  const inspect=event=>{const rect=svg.getBoundingClientRect(),xx=(event.clientX-rect.left)/rect.width*w,year=date.value.slice(0,4),rows=records.filter(r=>r[0].startsWith(year+'-'));return rows.length?rows.reduce((a,b)=>Math.abs(x(a[0])-xx)<Math.abs(x(b[0])-xx)?a:b):null;};
  svg.addEventListener('pointermove',event=>{const row=inspect(event);if(!row)return;readout.textContent=`${label(row[0])}: ${row[column]===null?'unavailable':row[column].toFixed(4)+' °C'} · ${row[4]}`;});
  svg.addEventListener('click',event=>{const row=inspect(event);if(row){date.value=row[0];draw();}});
  chart.replaceChildren(svg);
 }
 async function load(){const serial=++request,key=region.value;status.textContent='Loading official ERA5 series…';try{
  if(!caches.has(key)){const response=await fetch(new URL(`data/monitoring/pulse/${key}.json`,ROOT));if(!response.ok)throw new Error('Unavailable');caches.set(key,await response.json());}
  const value=caches.get(key);if(serial!==request)return;
  if(value.units!=='degree_C'||value.baseline!=='1991–2020'||!value.records.length)throw new Error('Invalid units or baseline');
  cache=value;records=cache.records;date.min=records[0][0];date.max=records[records.length-1][0];date.value=date.max;
  const latest=Number(date.value.slice(0,4)),choices=[latest,2023,2015,1997,1982].filter((v,i,a)=>a.indexOf(v)===i&&records.some(r=>r[0].startsWith(v+'-')));
  selectedYears=choices.slice(0,3);years.replaceChildren();
  choices.forEach(year=>{const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.value=year;input.checked=selectedYears.includes(year);label.style.color=colors[Math.max(0,selectedYears.indexOf(year))];label.append(input,document.createTextNode(' '+year));input.addEventListener('change',()=>{selectedYears=[...years.querySelectorAll('input:checked')].map(el=>Number(el.value));[...years.children].forEach(el=>el.style.color=colors[Math.max(0,selectedYears.indexOf(Number(el.querySelector('input').value)))]);draw();});years.append(label);});
  const source=shell.querySelector('[data-climate-source]');source.href=cache.source_url;shell.querySelector('[data-climate-notes]').textContent=cache.provider_notes;
  draw();
 }catch(error){cache=null;records=[];stats(null);status.textContent='ERA5 series unavailable. Consult the official Climate Pulse link.';chart.replaceChildren();}}
 region.addEventListener('change',load);date.addEventListener('change',draw);quantity.addEventListener('change',draw);new ResizeObserver(draw).observe(chart);await load();
})();
