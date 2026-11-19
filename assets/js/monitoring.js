'use strict';
(async()=>{
 const ROOT=new URL('../../',document.currentScript.src);
 async function get(p){const r=await fetch(new URL(p,ROOT));if(!r.ok)throw new Error('Cache unavailable');return r.json();}
 let cache;
 try{cache=await get('data/monitoring/enso.json');if(!cache.records.length)throw new Error('No observations');}
 catch(e){document.querySelectorAll('[data-enso-summary]').forEach(el=>{el.textContent='ENSO cache unavailable. Consult NOAA CPC for the current assessment.';});return;}
 const last=cache.records[cache.records.length-1];
 document.querySelectorAll('[data-enso-summary]').forEach(el=>{const strong=document.createElement('strong'),p=document.createElement('p'),meta=document.createElement('p');strong.textContent=`${last.value>=0?'+':''}${last.value.toFixed(2)} °C`;p.textContent=`${last.season} ${last.year} · RONI`;meta.className='metadata';meta.textContent=`Observation period: ${last.period_start} to ${last.period_end}. Last successful retrieval: ${cache.retrieved_at}. ${cache.snapshot_note||''}`;el.replaceChildren(strong,p,meta);});
 const meta=document.querySelector('[data-enso-meta]');if(meta)meta.textContent=`Source: ${cache.source} · ${cache.definition} · Reference: ${cache.baseline} · Units: °C · Retrieved: ${cache.retrieved_at}. ${cache.snapshot_note||''}`;
 const chart=document.querySelector('[data-enso-chart]'),table=document.querySelector('[data-enso-table]'),years=document.querySelector('[data-years]');
 const view=document.querySelector('[data-enso-view]'),yearPanel=document.querySelector('[data-enso-years]'),probe=document.querySelector('[data-enso-probe]');
 const palette=['#d55243','#087e83','#8858a5','#bd7809','#426da9'];
 const compareYears=[last.year,2023,2015,1997,1982].filter((y,i,a)=>a.indexOf(y)===i&&cache.records.some(r=>r.year===y));
 if(yearPanel)compareYears.forEach((year,i)=>{const label=document.createElement('label'),check=document.createElement('input');check.type='checkbox';check.value=year;check.checked=i<3;label.style.color=palette[i];label.append(check,document.createTextNode(year));yearPanel.append(label);check.addEventListener('change',draw);});
 function draw(){
  if(!chart)return;
  const comparison=view?.value==='comparison';
  if(yearPanel)yearPanel.hidden=!comparison;
  if(years)years.disabled=comparison;
  const chosen=yearPanel?[...yearPanel.querySelectorAll('input:checked')].map(el=>Number(el.value)):compareYears;
  const data=comparison?cache.records.filter(d=>chosen.includes(d.year)):cache.records.filter(d=>d.year>=last.year-Number(years.value)+1);
  if(!data.length){chart.textContent='Select at least one year.';table.replaceChildren();return;}
  const w=Math.max(220,chart.clientWidth),h=290,p=32,min=Math.floor(Math.min(-1,...data.map(d=>d.value))),max=Math.ceil(Math.max(1,...data.map(d=>d.value)));
  const y=v=>h-p-(v-min)/(max-min)*(h-2*p),start=Date.parse(data[0].period_end),end=Date.parse(data[data.length-1].period_end);
  const seasons=['DJF','JFM','FMA','MAM','AMJ','MJJ','JJA','JAS','ASO','SON','OND','NDJ'];
  const x=d=>comparison?p+seasons.indexOf(d.season)/11*(w-2*p):p+(Date.parse(d.period_end)-start)/Math.max(1,end-start)*(w-2*p);
  const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');
  svg.setAttribute('viewBox',`0 0 ${w} ${h}`);svg.setAttribute('class','chart');svg.setAttribute('role','img');svg.setAttribute('aria-label',comparison?'NOAA RONI seasonal comparison by year; values in the table below.':`NOAA RONI history, ${data[0].year} to ${last.year}; values in the table below.`);
  function text(label,xx,yy,anchor='start'){const el=document.createElementNS(ns,'text');el.setAttribute('x',xx);el.setAttribute('y',yy);el.setAttribute('text-anchor',anchor);el.textContent=label;svg.append(el);}
  [...new Set([min,-.5,0,.5,max])].forEach(v=>{const line=document.createElementNS(ns,'line');for(const [k,val] of Object.entries({x1:p,x2:w-p,y1:y(v),y2:y(v),stroke:'#d0dfe3','stroke-dasharray':v?'3 5':'none'}))line.setAttribute(k,val);svg.append(line);text(v,2,y(v)+4);});
  const groups=comparison?chosen.map(year=>data.filter(d=>d.year===year)):[data];
  groups.forEach(group=>{
   if(!group.length)return;
   const path=document.createElementNS(ns,'path');path.setAttribute('d',group.map((d,i)=>`${i&&Date.parse(d.period_end)-Date.parse(group[i-1].period_end)<50*86400000?'L':'M'}${x(d)},${y(d.value)}`).join(' '));path.setAttribute('fill','none');path.setAttribute('stroke',comparison?palette[compareYears.indexOf(group[0].year)]:'#087e83');path.setAttribute('stroke-width','2.5');svg.append(path);
  });
  if(comparison){[0,3,6,9,11].forEach(i=>text(seasons[i],p+i/11*(w-2*p),h-8,i===11?'end':i===0?'start':'middle'));}
  else{[data[0],data[data.length-1]].forEach((d,i)=>text(`${d.season} ${d.year}`,i?w-p:p,h-8,i?'end':'start'));}
  text('RONI (°C)',p,14);
  const cursor=document.createElementNS(ns,'line');cursor.setAttribute('stroke','#537282');cursor.setAttribute('stroke-dasharray','3 3');cursor.setAttribute('y1',p);cursor.setAttribute('y2',h-p);cursor.style.display='none';svg.append(cursor);
  svg.addEventListener('pointermove',event=>{const rect=svg.getBoundingClientRect(),xx=(event.clientX-rect.left)/rect.width*w;const closest=data.reduce((a,b)=>Math.abs(x(a)-xx)<Math.abs(x(b)-xx)?a:b);cursor.style.display='';cursor.setAttribute('x1',x(closest));cursor.setAttribute('x2',x(closest));const rows=comparison?data.filter(d=>d.season===closest.season):[closest];if(probe)probe.textContent=rows.map(d=>`${d.season} ${d.year}: ${d.value.toFixed(2)} °C`).join(' · ');});
  chart.replaceChildren(svg);
  const t=document.createElement('table'),head=t.createTHead().insertRow();['Season','Year','RONI (°C)'].forEach(label=>{const th=document.createElement('th');th.scope='col';th.textContent=label;head.append(th);});const body=t.createTBody();data.forEach(d=>{const row=body.insertRow();[d.season,d.year,d.value.toFixed(2)].forEach(v=>{row.insertCell().textContent=v;});});table.replaceChildren(t);
 }
 if(view)view.addEventListener('change',draw);
 document.querySelector('[data-enso-export]')?.addEventListener('click',()=>{const svg=chart?.querySelector('svg');if(!svg)return;const copy=svg.cloneNode(true);copy.setAttribute('xmlns','http://www.w3.org/2000/svg');const source=document.createElementNS('http://www.w3.org/2000/svg','text');source.setAttribute('x','32');source.setAttribute('y','315');source.setAttribute('font-size','9');source.textContent='Source: NOAA CPC · RONI (°C)';const desc=document.createElementNS('http://www.w3.org/2000/svg','desc');desc.textContent=`${cache.baseline}; retrieved ${cache.retrieved_at}; ${cache.source_url}`;copy.append(desc);const dims=copy.getAttribute('viewBox').split(' ');dims[3]='330';copy.setAttribute('viewBox',dims.join(' '));copy.append(source);const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(copy)],{type:'image/svg+xml'}));const a=document.createElement('a');a.href=url;a.download='GLOBE-NOAA-RONI.svg';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
 if(years)years.addEventListener('change',draw);draw();if(chart)new ResizeObserver(draw).observe(chart);
 const slot=document.querySelector('[data-shiny-slot]');if(slot){try{const config=await get('assets/site-config.json');if(config.shiny_url&&/^https:\/\/[a-z0-9-]+\.shinyapps\.io\/[a-zA-Z0-9_/-]+\/?$/.test(config.shiny_url)){const a=document.createElement('a');a.href=config.shiny_url;a.className='btn';a.textContent='Open GLOBE Ocean Monitoring ↗';a.target='_blank';a.rel='noopener noreferrer';slot.replaceChildren(a);}}catch(e){}}
})();
