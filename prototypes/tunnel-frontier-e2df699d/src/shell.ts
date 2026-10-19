// The canvas element itself is letterboxed, so its DOM bounds are the input bounds.
export function mountShell(aspect: number, clearInput: () => void) {
 const canvas=document.querySelector<HTMLCanvasElement>('#game')!;
 const arena=document.querySelector<HTMLElement>('.arena')!;
 const dialog=document.querySelector<HTMLDialogElement>('#help-dialog')!;
 const portrait=matchMedia('(orientation: portrait) and (max-width: 900px)');
 const paused=()=>dialog.open||portrait.matches;
 function fit(){const w=Math.min(arena.clientWidth,arena.clientHeight*aspect);canvas.style.width=`${w}px`;canvas.style.height=`${w/aspect}px`;}
 new ResizeObserver(fit).observe(arena);fit();
 document.querySelector('#help')!.addEventListener('click',()=>{clearInput();dialog.showModal();});
 document.querySelector('#help-close')!.addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',()=>{clearInput();canvas.focus({preventScroll:true});});
 portrait.addEventListener('change',clearInput);
 return paused;
}
