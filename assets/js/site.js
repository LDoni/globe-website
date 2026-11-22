"use strict";
// Quarto/List.js cannot initialise an empty listing without an item template.
// Keep the honest empty-state message and initialise native lists once populated.
document.querySelectorAll('.quarto-listing').forEach(listing=>{
 const items=listing.querySelector('.list');
 if(items && !items.children.length) listing.remove();
 else if(listing.nextElementSibling?.classList.contains('empty')) listing.nextElementSibling.hidden=true;
});
document.querySelectorAll('.menu-toggle').forEach(button => button.addEventListener('click',()=>{const expanded=button.getAttribute('aria-expanded')==='true';button.setAttribute('aria-expanded',String(!expanded));document.getElementById('main-nav').classList.toggle('open',!expanded);}));

// The logo colour animation runs continuously in CSS, without playback controls.

// Keep the homepage statistic tied to the public register without loading Leaflet.
const networkCount=document.querySelector('[data-network-count]');
if(networkCount){const root=new URL('../../',document.currentScript.src);fetch(new URL('data/network-stations.geojson',root)).then(r=>{if(!r.ok)throw Error('Register unavailable');return r.json();}).then(data=>{if(data.dataset_status==='public_partner_network'&&Array.isArray(data.features))networkCount.textContent=String(data.features.length);}).catch(()=>{});}
