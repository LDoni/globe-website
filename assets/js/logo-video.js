'use strict';
document.querySelectorAll('[data-logo-motion]').forEach(root=>{
 const video=root.querySelector('video');if(!video)return;
 const fallback=()=>{root.dataset.motion='fallback';};
 video.muted=true;video.defaultMuted=true;
 video.addEventListener('playing',()=>{root.dataset.motion='running';});
 video.addEventListener('error',fallback);
 const source=video.querySelector('source');if(source)source.addEventListener('error',fallback);
 // Preloading can fail before this script attaches its listeners.
 if(video.error||video.networkState===3){fallback();return;}
 try{const started=video.play();if(started)started.catch(fallback);}catch{fallback();}
});
