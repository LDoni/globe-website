"use strict";
// Quarto/List.js cannot initialise an empty listing without an item template.
// Keep the honest empty-state message and initialise native lists once populated.
document.querySelectorAll('.quarto-listing').forEach(listing=>{
 const items=listing.querySelector('.list');
 if(items && !items.children.length) listing.remove();
 else if(listing.nextElementSibling?.classList.contains('empty')) listing.nextElementSibling.hidden=true;
});
document.querySelectorAll('.menu-toggle').forEach(button => button.addEventListener('click',()=>{const expanded=button.getAttribute('aria-expanded')==='true';button.setAttribute('aria-expanded',String(!expanded));document.getElementById('main-nav').classList.toggle('open',!expanded);}));

// The supplied PNG stays intact; SVG currents decorate only the homepage logo.
document.querySelectorAll('[data-logo-motion]').forEach(logo=>{
 const button=logo.querySelector('[data-logo-motion-toggle]'),preference=matchMedia('(prefers-reduced-motion: reduce)');
 let paused=false,inView=true;
 function update(){
  logo.dataset.motion=preference.matches?'off':(!paused&&inView&&!document.hidden?'running':'paused');
  const ocean=logo.querySelector('svg');if(ocean){if(logo.dataset.motion==='running')ocean.unpauseAnimations();else ocean.pauseAnimations();}
  button.hidden=preference.matches;button.setAttribute('aria-pressed',String(paused));
  const label=paused?'Play logo animation':'Pause logo animation';button.setAttribute('aria-label',label);button.title=label;button.querySelector('span').textContent=paused?'▶':'Ⅱ';
 }
 button.addEventListener('click',()=>{paused=!paused;update();});
 preference.addEventListener('change',update);document.addEventListener('visibilitychange',update);
 if('IntersectionObserver' in window)new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;update();},{rootMargin:'80px'}).observe(logo);
 update();
});
