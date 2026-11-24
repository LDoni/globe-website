'use strict';
document.querySelectorAll('[data-logo-motion]').forEach(root=>{
 const video=root.querySelector('.hero-logo-video');if(!video)return;
 const fallback=()=>{root.dataset.motion='fallback';};
 video.muted=true;video.defaultMuted=true;
 // Slightly clearer flow in the first O; the second O keeps its 72-second orbit.
 video.defaultPlaybackRate=1.12;video.playbackRate=1.12;
 const running=()=>{if(!video.paused&&!video.error)root.dataset.motion='running';};
 video.addEventListener('playing',running);
 video.addEventListener('error',fallback);
 const sources=[...video.querySelectorAll('source')],failed=new Set();
 sources.forEach(source=>source.addEventListener('error',()=>{
  failed.add(source);
  if(failed.size===sources.length&&video.readyState<2)fallback();
 }));
 // One unsupported format must not hide a working alternative.
 if(video.error){fallback();return;}
 // Retry an early exhausted selection with the error listeners already attached.
 if(video.networkState===3)video.load();
 try{const started=video.play();if(started)started.then(running).catch(fallback);}catch{fallback();}
});
