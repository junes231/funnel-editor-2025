(function(){
  if (window.__logPanelInstalled) return;
  window.__logPanelInstalled = true;
  let box=document.getElementById('log');
  if(!box){
    box=document.createElement('div');
    box.id='log';
    box.style.cssText='position:fixed;bottom:0;left:0;right:0;max-height:40%;overflow:auto;background:#000;color:#0f0;font:12px/1.4 monospace;padding:6px;z-index:999999;box-shadow:0 0 4px #0f0;';
    box.textContent='(debug panel ready)';
    document.body.appendChild(box);
  }
  ['log','warn','error'].forEach(fn=>{
    const old=console[fn];
    console[fn]=function(...args){
      try{ old.apply(console,args);}catch(e){}
      if(!box)return;
      const line=document.createElement('div');
      line.style.whiteSpace='pre-wrap';
      line.textContent='['+fn.toUpperCase()+'] '+args.map(a=>{
        try{return typeof a==='object'?JSON.stringify(a):String(a);}catch(e){return String(a);}
      }).join(' ');
      box.appendChild(line);
      box.scrollTop=box.scrollHeight;
    };
  });
  console.log('[log-panel] ready');
})();
