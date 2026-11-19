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
 function draw(){if(!chart)return;const cutoff=last.year-Number(years.value)+1;const data=cache.records.filter(d=>d.year>=cutoff);const w=Math.max(320,chart.clientWidth),h=255,p=40,min=Math.min(-1,...data.map(d=>d.value))-.2,max=Math.max(1,...data.map(d=>d.value))+.2;const y=v=>h-p-(v-min)/(max-min)*(h-2*p);const x=i=>p+i/Math.max(1,data.length-1)*(w-2*p);const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox',`0 0 ${w} ${h}`);svg.setAttribute('class','chart');svg.setAttribute('role','img');svg.setAttribute('aria-label',`NOAA RONI history, ${data[0].year} to ${last.year}; numerical data follow in accessible table.`);
 [-.5,0,.5].forEach(v=>{const line=document.createElementNS(ns,'line');for(const [k,val] of Object.entries({x1:p,x2:w-p,y1:y(v),y2:y(v),stroke:'#d0dfe3','stroke-dasharray':v?'4 4':'none'}))line.setAttribute(k,val);svg.append(line);const t=document.createElementNS(ns,'text');t.setAttribute('x',0);t.setAttribute('y',y(v)+4);t.textContent=v;svg.append(t);});
 const path=document.createElementNS(ns,'path');path.setAttribute('d',data.map((d,i)=>`${i?'L':'M'}${x(i)},${y(d.value)}`).join(' '));path.setAttribute('class','chart-line');svg.append(path);
 [0,data.length-1].forEach(i=>{const t=document.createElementNS(ns,'text');t.setAttribute('x',i? w-p:p);t.setAttribute('y',h-10);t.setAttribute('text-anchor',i?'end':'start');t.textContent=`${data[i].season} ${data[i].year}`;svg.append(t);});chart.replaceChildren(svg);
 const t=document.createElement('table'),head=t.createTHead().insertRow();['Season','Year','RONI (°C)'].forEach(label=>{const th=document.createElement('th');th.scope='col';th.textContent=label;head.append(th);});const body=t.createTBody();data.forEach(d=>{const row=body.insertRow();[d.season,d.year,d.value.toFixed(2)].forEach(v=>{row.insertCell().textContent=v;});});table.replaceChildren(t);
 }
 if(years)years.addEventListener('change',draw);draw();if(chart)new ResizeObserver(draw).observe(chart);
 const slot=document.querySelector('[data-shiny-slot]');if(slot){try{const config=await get('assets/site-config.json');if(config.shiny_url&&/^https:\/\/[a-z0-9-]+\.shinyapps\.io\/[a-zA-Z0-9_/-]+\/?$/.test(config.shiny_url)){const a=document.createElement('a');a.href=config.shiny_url;a.className='btn';a.textContent='Open GLOBE Ocean Monitoring ↗';a.target='_blank';a.rel='noopener noreferrer';slot.replaceChildren(a);}}catch(e){}}
})();
