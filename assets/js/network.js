/* Leaflet network and quantitative cached SST layers. No remote scientific fetches. */
'use strict';
(() => {
 const ROOT = new URL('../../', document.currentScript.src);
 const colors={incursion:'#ed9465',pacific:'#52c8c4',reference:'#bbc9f1',unclassified:'#98b5c6'};
 const labels={incursion:'Pacific incursion (provisional)',pacific:'Other Pacific (provisional)',reference:'Non-Pacific reference (provisional)',unclassified:'Unclassified'};
 const displayLng=x=>x<30?x+360:x;
 const color=v=>{const stops=[[-3,[54,91,154]],[-1,[165,210,221]],[0,[245,245,235]],[1,[246,223,184]],[2,[232,156,107]],[3,[184,76,67]]];v=Math.max(-3,Math.min(3,v));let i=1;while(i<stops.length-1&&v>stops[i][0])i++;const [a,ca]=stops[i-1],[b,cb]=stops[i],t=(v-a)/(b-a);return 'rgb('+ca.map((c,j)=>Math.round(c+(cb[j]-c)*t)).join(',')+')';};
 async function json(path){const res=await fetch(new URL(path,ROOT));if(!res.ok)throw new Error('Data unavailable');return res.json();}
 document.querySelectorAll('[data-network]').forEach(async shell=>{
  const status=shell.querySelector('[data-status]');
  if(!window.L){status.textContent='Map library unavailable. Download the approved CSV from Resources.';return;}
  const container=shell.querySelector('[data-map]');
  const map=L.map(container,{scrollWheelZoom:false,preferCanvas:true,minZoom:1,maxZoom:12,worldCopyJump:false}).setView([12,210],2);
  // Ocean basemap includes land; scientific overlays are independent of this service.
  let failedTiles=0;
  const tiles=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}',{attribution:'Ocean basemap © Esri, GEBCO, NOAA and contributors',maxNativeZoom:10,maxZoom:12}).addTo(map);
  tiles.on('tileerror',()=>{if(++failedTiles===1){const note=document.createElement('p');note.className='note';note.textContent='Ocean basemap could not load. Coordinate grid, regions and station data remain available.';shell.after(note);}});
  const grid=L.layerGroup().addTo(map);
  for(let lat=-60;lat<=60;lat+=30)L.polyline([[lat,-180],[lat,540]],{weight:1,color:'#54788b',opacity:.22,interactive:false}).addTo(grid);
  for(let lng=-180;lng<=540;lng+=60)L.polyline([[-75,lng],[80,lng]],{weight:1,color:'#54788b',opacity:.22,interactive:false}).addTo(grid);
  const conceptual=L.layerGroup().addTo(map);
  L.rectangle([[-5,190],[5,240]],{color:'#ed9465',weight:1,dashArray:'5 5',fillOpacity:.08}).bindTooltip('Niño 3.4 reference region: 5°N–5°S, 170°W–120°W. Not an observed anomaly.').addTo(conceptual);
  const markers=L.layerGroup().addTo(map), observed=L.layerGroup();
  const registry=shell.querySelector('[data-registry]'),search=shell.querySelector('[data-search]'),category=shell.querySelector('[data-category]'),basin=shell.querySelector('[data-basin]'),date=shell.querySelector('[data-date]');
  const list=shell.nextElementSibling;
  let collection={features:[]},mode='network',sst={frames:[]},serial=0;
  function popup(feature){
   const props=feature.properties,node=document.createElement('div'),heading=document.createElement('h3');heading.textContent=props.station_name;node.append(heading);
   const dl=document.createElement('dl');
   const info={'Station ID':props.station_id,'Country':props.country,'Institution':props.institution,'Category':labels[props.category]||props.category,'Ocean basin':props.ocean_basin,'Sampling status':props.sampling_status,'Coordinates':`${feature.geometry.coordinates[1]}°, ${feature.geometry.coordinates[0]}° (${props.coordinate_status})`};
   for(const [k,v] of Object.entries(info)){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=k;dd.textContent=v||'Not supplied';dl.append(dt,dd);}node.append(dl);
   const desc=document.createElement('p');desc.textContent=props.public_description||'';node.append(desc);
   if(props.institution_url&&/^https:\/\//i.test(props.institution_url)){const a=document.createElement('a');a.href=props.institution_url;a.textContent='Institution website';a.target='_blank';a.rel='noopener noreferrer';node.append(a);}return node;
  }
  function fill(select,key){select.querySelectorAll('option:not(:first-child)').forEach(n=>n.remove());[...new Set(collection.features.map(f=>f.properties[key]).filter(Boolean))].sort().forEach(v=>{const option=document.createElement('option');option.value=v;option.textContent=key==='category'?(labels[v]||v):v;select.append(option);});}
  function render(){
   markers.clearLayers();list.replaceChildren();
   const q=search.value.toLowerCase().trim();
   const visible=collection.features.filter(f=>{const p=f.properties;return (!category.value||p.category===category.value)&&(!basin.value||p.ocean_basin===basin.value)&&[p.station_id,p.station_name,p.country,p.institution].join(' ').toLowerCase().includes(q);});
   visible.forEach(f=>{const p=f.properties,[lng,lat]=f.geometry.coordinates;const marker=L.circleMarker([lat,displayLng(lng)],{radius:6,color:'#e7f5f4',weight:1.4,fillColor:colors[p.category]||colors.unclassified,fillOpacity:.95}).bindPopup(popup(f)).addTo(markers);const b=document.createElement('button');b.type='button';b.className='station-item';b.textContent=p.station_name;const small=document.createElement('small');small.textContent=`${p.station_id} · ${p.country} · ${p.coordinate_status}`;b.append(small);b.addEventListener('click',()=>{map.setView(marker.getLatLng(),5);marker.openPopup();container.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});});list.append(b);});
   const demo=registry.value==='demo';
   if(mode==='network')status.textContent=demo?`DEMONSTRATION · ${visible.length} of ${collection.features.length} approximate starter locations. Categories unconfirmed. Not validated sampling coordinates.`:visible.length?`${visible.length} approved stations. Niño 3.4 outline is a geographic reference, not observed SST.`:'No approved station coordinates published yet. Select the demonstration registry to inspect preliminary starter locations.';
   if(mode==='observed')drawSST();
   const legend=shell.querySelector('[data-legend]');legend.replaceChildren();
   if(mode==='observed'){legend.textContent='SST anomaly (°C): −3 to +3; colors clipped at endpoints, tooltip values retained. Missing cells remain transparent.';['#365b9a','#5b9ac2','#a5d2dd','#f6dfb8','#e89c6b','#b84c43'].forEach(c=>{const dot=document.createElement('i');dot.className='dot';dot.style.background=c;legend.append(dot);});}
   else for(const cat of [...new Set(collection.features.map(f=>f.properties.category))]){const span=document.createElement('span'),dot=document.createElement('i');dot.className='dot';dot.style.background=colors[cat]||colors.unclassified;span.append(dot,document.createTextNode(labels[cat]||cat));legend.append(span);}
  }
  function drawSST(){observed.clearLayers();const frame=sst.frames[Number(date.value)||0];if(!frame){status.textContent='Observed SST anomaly cache unavailable. No quantitative temperature field is displayed. NOAA/Copernicus sources are linked on the monitoring page.';return;}
   if(frame.units!=='degree_C'||!frame.baseline||!frame.observation_date||!Array.isArray(frame.cells)){status.textContent='SST cache metadata incomplete; layer withheld.';return;}
   const step=frame.grid_spacing_deg;
   if(!Number.isFinite(step)||step<=0||step>10){status.textContent='SST grid spacing invalid; layer withheld.';return;}
   frame.cells.forEach(c=>{if(![c.lat,c.lon,c.value].every(Number.isFinite))return;const lng=displayLng(c.lon);L.rectangle([[c.lat-step/2,lng-step/2],[c.lat+step/2,lng+step/2]],{stroke:false,fillColor:color(c.value),fillOpacity:.8}).bindTooltip(`${c.value.toFixed(2)} °C · ${frame.observation_date}`).addTo(observed);});
   status.textContent=`OBSERVED-DATA ANALYSIS · ${frame.observation_date} · ${frame.source} · ${frame.product_id} · ${frame.units} · baseline ${frame.baseline} · display spacing ${step}° (subsampled, not averaged) · retrieved ${frame.retrieved_at}${registry.value==='demo'?' · Demonstration markers use approximate locations.':''}`;
  }
  async function loadRegistry(){const request=++serial;status.textContent='Loading station registry…';try{const data=await json(registry.value==='demo'?'data/demo/stations.geojson':'data/stations.geojson');if(request!==serial)return;collection=data;fill(category,'category');fill(basin,'ocean_basin');render();}catch(e){if(request!==serial)return;markers.clearLayers();list.replaceChildren();status.textContent='Station registry unavailable. Try again later; no substitute coordinates are shown.';}}
  registry.addEventListener('change',loadRegistry);search.addEventListener('input',render);category.addEventListener('change',render);basin.addEventListener('change',render);date.addEventListener('change',render);
  shell.querySelector('[data-reset]').addEventListener('click',()=>{search.value='';category.value='';basin.value='';map.setView([12,210],2);render();});
  shell.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.mode;shell.querySelectorAll('[data-mode]').forEach(n=>n.setAttribute('aria-pressed',String(n===b)));shell.querySelector('[data-date-wrap]').hidden=mode!=='observed';if(mode==='observed'){map.removeLayer(conceptual);observed.addTo(map);}else{map.removeLayer(observed);conceptual.addTo(map);}render();}));
  try{sst=await json('data/monitoring/sst.json');sst.frames.forEach((f,i)=>{const o=document.createElement('option');o.value=i;o.textContent=f.observation_date;date.append(o);});}catch(e){/* Explicit unavailable state is rendered above. */}
  await loadRegistry();new ResizeObserver(()=>map.invalidateSize()).observe(container);
 });
})();
