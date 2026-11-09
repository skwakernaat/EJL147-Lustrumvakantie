// De enige noodzakelijke JavaScript: lokale carrousels met toetsenbordondersteuning.
document.addEventListener('DOMContentLoaded', () => {
 document.querySelectorAll('[data-foto-slider]').forEach((slider) => {
  const images=[...slider.querySelectorAll('.foto-slider__frame img')];
  if (!images.length) return;
  let active=0;
  function show(n){active=(n+images.length)%images.length;
   images.forEach((img,i)=>{img.classList.toggle('is-active',i===active);img.setAttribute('aria-hidden',String(i!==active));});
  }
  const prev=slider.querySelector('.foto-slider__prev'),next=slider.querySelector('.foto-slider__next');
  if(prev)prev.addEventListener('click',()=>show(active-1));
  if(next)next.addEventListener('click',()=>show(active+1));
  slider.setAttribute('tabindex','0');
  slider.addEventListener('keydown',(event)=>{
   if(event.key==='ArrowLeft'){event.preventDefault();show(active-1);}
   if(event.key==='ArrowRight'){event.preventDefault();show(active+1);}
  });
  if(images.length===1){if(prev)prev.hidden=true;if(next)next.hidden=true;}
  show(0);
 });
});
