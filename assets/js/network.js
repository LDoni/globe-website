/* Leaflet network and quantitative cached SST layers. No remote scientific fetches. */
'use strict';
(() => {
 const ROOT = new URL('../../', document.currentScript.src);
 const colors={incursion:'#ed9465',pacific:'#52c8c4',reference:'#bbc9f1',unclassified:'#98b5c6'};
 const labels={incursion:'Pacific incursion',pacific:'Other Pacific',reference:'Non-Pacific reference',unclassified:'Unclassified'};
 const displayLng=x=>x<30?x+360:x;
 const color=v=>{const stops=[[-3,[54,91,154]],[-1,[165,210,221]],[0,[245,245,235]],[1,[246,223,184]],[2,[232,156,107]],[3,[184,76,67]]];v=Math.max(-3,Math.min(3,v));let i=1;while(i<stops.length-1&&v>stops[i][0])i++;const [a,ca]=stops[i-1],[b,cb]=stops[i],t=(v-a)/(b-a);return 'rgb('+ca.map((c,j)=>Math.round(c+(cb[j]-c)*t)).join(',')+')';};
 async function json(path){const res=await fetch(new URL(path,ROOT));if(!res.ok)throw new Error('Data unavailable');return res.json();}
 document.querySelectorAll('[data-network]').forEach(async shell=>{
  const status=shell.querySelector('[data-status]');
  if(!window.L){status.textContent='Map library unavailable. Download the approved CSV from Resources.';return;}
  const container=shell.querySelector('[data-map]');
  const dateBanner=document.createElement('div'),dateTitle=document.createElement('span'),dateValue=document.createElement('time'),dateUpdate=document.createElement('small');
  dateBanner.className='map-date-banner';dateBanner.dataset.mapDateBanner='';dateBanner.hidden=true;
  dateBanner.setAttribute('role','status');dateTitle.textContent='SST anomaly map · Data date';dateValue.dataset.mapObservationDate='';dateUpdate.dataset.mapUpdateTime='';
  dateBanner.append(dateTitle,dateValue,dateUpdate);container.before(dateBanner);
  const map=L.map(container,{crs:L.CRS.EPSG4326,scrollWheelZoom:false,preferCanvas:true,minZoom:-1,maxZoom:6,worldCopyJump:false}).setView([10,180],0);
  const resetView=()=>map.fitBounds([[-65,0],[80,360]],{padding:[12,12]});resetView();
  map.createPane('land');map.getPane('land').style.zIndex='450';
  map.createPane('sstRaster');map.getPane('sstRaster').style.zIndex='350';
  map.attributionControl.addAttribution('Land: Natural Earth (public domain)');
  json('assets/vendor/natural-earth/land.geojson').then(land=>{
   for(const shift of [-360,0,360])L.geoJSON(land,{pane:'land',interactive:false,coordsToLatLng:coords=>L.latLng(coords[1],coords[0]+shift),style:{color:'#7c8991',weight:.65,fillColor:'#f0f2f3',fillOpacity:1}}).addTo(map);
  }).catch(()=>{status.textContent='Coastline layer unavailable; station coordinates remain available.';});
  const grid=L.layerGroup().addTo(map);
  for(let lat=-60;lat<=60;lat+=30)L.polyline([[lat,-180],[lat,540]],{weight:1,color:'#54788b',opacity:.22,interactive:false}).addTo(grid);
  for(let lng=-180;lng<=540;lng+=60)L.polyline([[-75,lng],[80,lng]],{weight:1,color:'#54788b',opacity:.22,interactive:false}).addTo(grid);
  map.createPane('stationMarkers');map.getPane('stationMarkers').style.zIndex='625';
  const stationRenderer=L.svg({pane:'stationMarkers'});
  const markers=L.layerGroup().addTo(map), observed=L.layerGroup();
  const registry=shell.querySelector('[data-registry]'),search=shell.querySelector('[data-search]'),category=shell.querySelector('[data-category]'),basin=shell.querySelector('[data-basin]'),date=shell.querySelector('[data-date]');
  const list=shell.nextElementSibling,showStations=shell.querySelector('[data-show-stations]');
  if(showStations)showStations.addEventListener('change',()=>{if(showStations.checked)markers.addTo(map);else map.removeLayer(markers);});
  let collection={features:[]},mode='network',sst={frames:[]},serial=0,rasterSerial=0;
  function popup(feature){
   const props=feature.properties,node=document.createElement('div'),heading=document.createElement('h3');heading.textContent=props.station_name;node.append(heading);
   const dl=document.createElement('dl');
   const info={'Station ID':props.station_id,'Country':props.country,'Institution':props.institution,'Category':labels[props.category]||props.category,'Ocean basin':props.ocean_basin,'Sampling status':props.sampling_status,'Coordinates':`${feature.geometry.coordinates[1]}°, ${feature.geometry.coordinates[0]}°`};
   for(const [k,v] of Object.entries(info)){const dt=document.createElement('dt'),dd=document.createElement('dd');if(!v||v==='unconfirmed')continue;dt.textContent=k;dd.textContent=v;dl.append(dt,dd);}node.append(dl);
   const desc=document.createElement('p');desc.textContent=props.public_description||'';node.append(desc);
   if(props.institution_url&&/^https:\/\//i.test(props.institution_url)){const a=document.createElement('a');a.href=props.institution_url;a.textContent='Institution website';a.target='_blank';a.rel='noopener noreferrer';node.append(a);}return node;
  }
  function fill(select,key){select.querySelectorAll('option:not(:first-child)').forEach(n=>n.remove());[...new Set(collection.features.map(f=>f.properties[key]).filter(Boolean))].sort().forEach(v=>{const option=document.createElement('option');option.value=v;option.textContent=key==='category'?(labels[v]||v):v;select.append(option);});}
  function render(){
   markers.clearLayers();list.replaceChildren();
   const q=search.value.toLowerCase().trim();
   const visible=collection.features.filter(f=>{const p=f.properties;return (!category.value||p.category===category.value)&&(!basin.value||p.ocean_basin===basin.value)&&[p.station_id,p.station_name,p.country,p.institution].join(' ').toLowerCase().includes(q);});
   visible.forEach(f=>{const p=f.properties,[lng,lat]=f.geometry.coordinates;const marker=L.circleMarker([lat,displayLng(lng)],{pane:'stationMarkers',renderer:stationRenderer,radius:7,color:'#e7f5f4',weight:1.4,fillColor:colors[p.category]||colors.unclassified,fillOpacity:.95}).bindPopup(popup(f)).addTo(markers);const b=document.createElement('button');b.type='button';b.className='station-item';b.textContent=p.station_name;const small=document.createElement('small');small.textContent=`${p.station_id} · ${p.country}`;b.append(small);b.addEventListener('click',()=>{map.setView(marker.getLatLng(),5);marker.openPopup();container.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});});list.append(b);});
   const demo=registry.value!=='approved';if(registry.value==='network')document.querySelectorAll('[data-network-count]').forEach(el=>el.textContent=collection.features.length);
   if(mode==='network')status.textContent=demo?`${visible.length} of ${collection.features.length} network stations shown.`:visible.length?`${visible.length} approved sampling coordinates.`:'No approved sampling coordinates published yet. Select Network stations to explore the partner register.';
   dateBanner.hidden=true;
   if(mode==='observed')drawSST();
   const legend=shell.querySelector('[data-legend]');legend.replaceChildren();
   if(mode==='observed'&&sst.frames[Number(date.value)||0]?.legend_url&&!sst.frames[Number(date.value)||0]?.raster_failed){const f=sst.frames[Number(date.value)||0],img=document.createElement('img');img.src=new URL(f.legend_url,ROOT);img.alt='NOAA SST anomaly legend, −5 to +5 °C';img.className='sst-official-legend';legend.append(img);}else if(mode==='observed'){legend.textContent='SST anomaly (°C): −3 to +3; colors clipped at endpoints, tooltip values retained. Missing cells remain transparent.';['#365b9a','#5b9ac2','#a5d2dd','#f6dfb8','#e89c6b','#b84c43'].forEach(c=>{const dot=document.createElement('i');dot.className='dot';dot.style.background=c;legend.append(dot);});}
   else for(const cat of [...new Set(collection.features.map(f=>f.properties.category))]){const span=document.createElement('span'),dot=document.createElement('i');dot.className='dot';dot.style.background=colors[cat]||colors.unclassified;span.append(dot,document.createTextNode(labels[cat]||cat));legend.append(span);}
  }
  function drawSST(){observed.clearLayers();const rasterRequest=++rasterSerial;const frame=sst.frames[Number(date.value)||0];if(!frame){status.textContent='Observed SST anomaly cache unavailable. No quantitative temperature field is displayed. NOAA/Copernicus sources are linked on the monitoring page.';return;}
   if(frame.units!=='degree_C'||!frame.baseline||!frame.observation_date||!Array.isArray(frame.cells)){status.textContent='SST cache metadata incomplete; layer withheld.';return;}
   const step=frame.grid_spacing_deg;
   if(!Number.isFinite(step)||step<=0||step>10){status.textContent='SST grid spacing invalid; layer withheld.';return;}
   const observation=new Date(frame.observation_date+'T12:00:00Z');
   if(!/^\d{4}-\d{2}-\d{2}$/.test(frame.observation_date)||!Number.isFinite(observation.getTime())){status.textContent='SST observation date invalid; layer withheld.';return;}
   dateValue.dateTime=frame.observation_date;
   dateValue.textContent=observation.toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'});
   const updatedAt=frame.raster_url&&!frame.raster_failed?(frame.raster_retrieved_at||frame.retrieved_at):frame.retrieved_at;
   const updated=updatedAt?new Date(updatedAt):new Date(NaN);
   dateUpdate.textContent=Number.isFinite(updated.getTime())?'Last successful update: '+updated.toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'})+' · '+updated.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'UTC'})+' UTC':'Update time unavailable';
   dateBanner.hidden=false;
   if(frame.raster_url&&!frame.raster_failed){
    for(const shift of [-360,0,360])L.imageOverlay(new URL(frame.raster_url,ROOT).href,[[-90,shift],[90,360+shift]],{pane:'sstRaster',opacity:1,attribution:'SST: NOAA Coral Reef Watch'}).on('error',()=>{if(rasterRequest===rasterSerial){frame.raster_failed=true;render();}}).addTo(observed);
    status.textContent=`SST ANOMALY · ${frame.observation_date} · ${frame.source} · °C · reference ${frame.baseline} · retrieved ${frame.raster_retrieved_at||frame.retrieved_at}`;
    return;
   }
   frame.cells.forEach(c=>{if(![c.lat,c.lon,c.value].every(Number.isFinite))return;const lng=displayLng(c.lon);L.rectangle([[c.lat-step/2,lng-step/2],[c.lat+step/2,lng+step/2]],{stroke:false,fillColor:color(c.value),fillOpacity:.8}).bindTooltip(`${c.value.toFixed(2)} °C · ${frame.observation_date}`).addTo(observed);});
   status.textContent=`OBSERVED-DATA ANALYSIS · ${frame.observation_date} · ${frame.source} · ${frame.product_id} · ${frame.units} · baseline ${frame.baseline} · display spacing ${step}° (subsampled, not averaged) · retrieved ${frame.raster_retrieved_at||frame.retrieved_at}`;
  }
  async function loadRegistry(){const request=++serial;status.textContent='Loading station registry…';try{const data=await json(registry.value==='local'?'data/local-network.geojson':registry.value==='network'?'data/network-stations.geojson':registry.value==='demo'?'data/demo/stations.geojson':'data/stations.geojson');if(request!==serial)return;collection=data;
   const flags=document.querySelector('[data-country-flags]');
   if(flags){flags.replaceChildren();const countries=new Map();data.features.forEach(f=>countries.set(f.properties.country,f.properties.country_iso2));
    [...countries].sort(([a],[b])=>a.localeCompare(b,'en')).forEach(([name,code])=>{const item=document.createElement('li'),text=document.createElement('span');text.textContent=name;
     if(/^[a-z]{2}$/.test(code||'')){const img=document.createElement('img');img.src=new URL('assets/vendor/flags/'+code+'.svg',ROOT).href;img.alt='';img.width=32;img.height=24;img.addEventListener('error',()=>img.remove());item.append(img);}item.append(text);flags.append(item);});
   }
   fill(category,'category');fill(basin,'ocean_basin');render();}catch(e){if(request!==serial)return;markers.clearLayers();list.replaceChildren();status.textContent='Station registry unavailable. Try again later; no substitute coordinates are shown.';}}
  registry.addEventListener('change',loadRegistry);search.addEventListener('input',render);category.addEventListener('change',render);basin.addEventListener('change',render);date.addEventListener('change',render);
  shell.querySelector('[data-reset]').addEventListener('click',()=>{search.value='';category.value='';basin.value='';resetView();render();});
  shell.querySelector('[data-map-view]').addEventListener('change',event=>{mode=event.target.value;shell.querySelector('[data-date-wrap]').hidden=mode!=='observed';if(mode==='observed')observed.addTo(map);else map.removeLayer(observed);render();});
  try{sst=await json('data/monitoring/sst.json');sst.frames.forEach((f,i)=>{const o=document.createElement('option');o.value=i;o.textContent=f.observation_date;date.append(o);});}catch(e){/* Explicit unavailable state is rendered above. */}
  await loadRegistry();new ResizeObserver(()=>map.invalidateSize()).observe(container);
 });
})();
