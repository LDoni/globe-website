'use strict';
document.querySelectorAll('[data-logo-motion]').forEach(root=>{
 const video=root.querySelector('.hero-logo-video');if(!video)return;
 const fallback=()=>{root.dataset.motion='fallback';};
 video.muted=true;video.defaultMuted=true;
 // Slightly clearer flow in the first O; the second O keeps its 72-second orbit.
 video.playbackRate=1.12;
 const running=()=>{if(!video.paused&&!video.error)root.dataset.motion='running';};
 video.addEventListener('playing',running);
 video.addEventListener('error',fallback);
 const source=video.querySelector('source');if(source)source.addEventListener('error',fallback);
 // Preloading can fail before this script attaches its listeners.
 if(video.error||video.networkState===3){fallback();return;}
 try{const started=video.play();if(started)started.then(running).catch(fallback);}catch{fallback();}
});
