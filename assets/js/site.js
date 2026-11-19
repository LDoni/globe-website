"use strict";
// Quarto/List.js cannot initialise an empty listing without an item template.
// Keep the honest empty-state message and initialise native lists once populated.
document.querySelectorAll('.quarto-listing').forEach(listing=>{
 const items=listing.querySelector('.list');
 if(items && !items.children.length) listing.remove();
 else if(listing.nextElementSibling?.classList.contains('empty')) listing.nextElementSibling.hidden=true;
});
document.querySelectorAll('.menu-toggle').forEach(button => button.addEventListener('click',()=>{const expanded=button.getAttribute('aria-expanded')==='true';button.setAttribute('aria-expanded',String(!expanded));document.getElementById('main-nav').classList.toggle('open',!expanded);}));
