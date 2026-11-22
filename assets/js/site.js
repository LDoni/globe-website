"use strict";
// Quarto/List.js cannot initialise an empty listing without an item template.
// Keep the honest empty-state message and initialise native lists once populated.
document.querySelectorAll('.quarto-listing').forEach(listing=>{
 const items=listing.querySelector('.list');
 if(items && !items.children.length) listing.remove();
 else if(listing.nextElementSibling?.classList.contains('empty')) listing.nextElementSibling.hidden=true;
});
document.querySelectorAll('.menu-toggle').forEach(button => button.addEventListener('click',()=>{const expanded=button.getAttribute('aria-expanded')==='true';button.setAttribute('aria-expanded',String(!expanded));document.getElementById('main-nav').classList.toggle('open',!expanded);}));

// Animate the original ocean colours; the PNG, lettering and coastlines stay fixed.
document.querySelectorAll('[data-logo-motion]').forEach(logo=>{
 const button=logo.querySelector('[data-logo-motion-toggle]'),preference=matchMedia('(prefers-reduced-motion: reduce)');
 let manual=null,inView=true;
 function update(){
  const wantsMotion=manual??!preference.matches;
  logo.dataset.motionAllowed=String(wantsMotion);
  logo.dataset.motion=wantsMotion?(inView&&!document.hidden?'running':'paused'):(preference.matches?'off':'paused');
  button.hidden=false;button.setAttribute('aria-pressed',String(!wantsMotion));
  const label=wantsMotion?'Pause logo animation':'Play logo animation';button.setAttribute('aria-label',label);button.title=label;button.querySelector('span').textContent=wantsMotion?'Ⅱ':'▶';
 }
 button.addEventListener('click',()=>{manual=!(manual??!preference.matches);update();});
 preference.addEventListener('change',update);document.addEventListener('visibilitychange',update);
 if('IntersectionObserver' in window)new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;update();},{rootMargin:'80px'}).observe(logo);
 update();
});

// Keep the homepage statistic tied to the public register without loading Leaflet.
const networkCount=document.querySelector('[data-network-count]');
if(networkCount){const root=new URL('../../',document.currentScript.src);fetch(new URL('data/network-stations.geojson',root)).then(r=>{if(!r.ok)throw Error('Register unavailable');return r.json();}).then(data=>{if(data.dataset_status==='public_partner_network'&&Array.isArray(data.features))networkCount.textContent=String(data.features.length);}).catch(()=>{});}
