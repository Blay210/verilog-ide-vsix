/** Self-contained webview camera: presentation only; sends no host commands. */
export const structureCanvasScript = String.raw`
(()=>{
  const canvas=document.getElementById?.('structure-canvas');
  const scene=document.getElementById?.('structure-scene');
  if(!canvas?.setAttribute||!scene?.setAttribute)return;
  const zoomLabel=document.getElementById('structure-zoom');
  const width=Number(canvas.dataset.sceneWidth),height=Number(canvas.dataset.sceneHeight);
  const key=canvas.dataset.viewKey;
  let camera={x:0,y:0,scale:1},size={width:0,height:0},fitted=true,drag,swallow=false;
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  const valid=c=>c&&[c.x,c.y,c.scale].every(Number.isFinite)&&Math.abs(c.x)<1e7&&Math.abs(c.y)<1e7&&c.scale>=.01&&c.scale<=8;
  function persist(){
    const state=vscode.getState?.()??{};
    const views=state.structureCameras&&typeof state.structureCameras==='object'?state.structureCameras:{};
    delete views[key]; views[key]={...camera,fitted,width,height,viewportWidth:size.width,viewportHeight:size.height};
    const keys=Object.keys(views);for(const old of keys.slice(0,Math.max(0,keys.length-32)))delete views[old];
    vscode.setState?.({...state,structureCameras:views});
  }
  function paint(){
    scene.setAttribute('transform','translate('+camera.x+' '+camera.y+') scale('+camera.scale+')');
    zoomLabel.textContent=Math.round(camera.scale*100)+'%';
    canvas.dataset.zoom=String(camera.scale);persist();
  }
  function fit(){
    camera.scale=clamp(Math.min(Math.max(1,size.width-40)/width,Math.max(1,size.height-40)/height),.01,8);
    camera.x=(size.width-width*camera.scale)/2;camera.y=(size.height-height*camera.scale)/2;
    fitted=true;paint();
  }
  function zoom(factor,x,y){
    const scale=clamp(camera.scale*factor,.01,8),ratio=scale/camera.scale;
    camera={x:x-(x-camera.x)*ratio,y:y-(y-camera.y)*ratio,scale};fitted=false;paint();
  }
  function resize(first=false){
    const rect=canvas.getBoundingClientRect();if(rect.width<=0||rect.height<=0)return;
    const previous=size;size={width:rect.width,height:rect.height};
    canvas.setAttribute('viewBox','0 0 '+size.width+' '+size.height);
    if(first){
      const saved=vscode.getState?.()?.structureCameras?.[key];
      if(valid(saved)&&saved.width===width&&saved.height===height){
        camera={x:saved.x,y:saved.y,scale:saved.scale};fitted=saved.fitted===true;
        if(!fitted){if(Number.isFinite(saved.viewportWidth)&&Number.isFinite(saved.viewportHeight)){camera.x+=(size.width-saved.viewportWidth)/2;camera.y+=(size.height-saved.viewportHeight)/2;}paint();return;}
      }
      else {fit();return;}
    }
    if(fitted)fit();else {camera.x+=(size.width-previous.width)/2;camera.y+=(size.height-previous.height)/2;paint();}
  }
  canvas.addEventListener('wheel',event=>{
    event.preventDefault();const rect=canvas.getBoundingClientRect();
    const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?rect.height:1);
    zoom(Math.exp(-clamp(delta,-600,600)*.002),event.clientX-rect.left,event.clientY-rect.top);
  },{passive:false});
  canvas.addEventListener('pointerdown',event=>{
    if(!drag)swallow=false;
    if(drag||event.isPrimary===false||![0,1].includes(event.button))return;
    if(event.button===0&&event.target.closest('[data-node],[data-source]'))return;
    event.preventDefault();swallow=false;
    drag={id:event.pointerId,x:event.clientX,y:event.clientY,camera:{...camera},moved:false};
    canvas.setPointerCapture(event.pointerId);canvas.classList.add('panning');canvas.focus();
  });
  canvas.addEventListener('pointermove',event=>{
    if(!drag||event.pointerId!==drag.id)return;
    const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
    if(!drag.moved&&Math.hypot(dx,dy)<3)return;
    drag.moved=true;camera={...drag.camera,x:drag.camera.x+dx,y:drag.camera.y+dy};fitted=false;paint();
  });
  function finish(event){
    if(!drag||event.pointerId!==drag.id)return;
    swallow=drag.moved;drag=undefined;canvas.classList.remove('panning');
    if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);
  }
  for(const kind of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(kind,finish);
  for(const kind of ['click','dblclick'])canvas.addEventListener(kind,event=>{
    if(swallow){event.preventDefault();event.stopImmediatePropagation();}
  },true);
  canvas.addEventListener('keydown',event=>{
    if(event.target!==canvas||event.ctrlKey||event.metaKey||event.altKey)return;
    if(['+','=','-','0','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))event.preventDefault();else return;
    if(event.key==='0')fit();else if(['+','=','-'].includes(event.key))zoom(event.key==='-'?1/1.25:1.25,size.width/2,size.height/2);
    else {camera.x+=event.key==='ArrowLeft'?40:event.key==='ArrowRight'?-40:0;camera.y+=event.key==='ArrowUp'?40:event.key==='ArrowDown'?-40:0;fitted=false;paint();}
  });
  document.querySelectorAll('[data-camera]').forEach(button=>button.addEventListener('click',()=>{
    if(button.dataset.camera==='fit')fit();else zoom(button.dataset.camera==='in'?1.25:1/1.25,size.width/2,size.height/2);
  }));
  resize(true);new ResizeObserver(()=>resize()).observe(canvas);
})();`;
