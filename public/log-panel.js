(function(){
  if (window.__logPanelInstalled) return;
  window.__logPanelInstalled = true;

  // 创建面板
  let panel = document.getElementById('log');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'log';
    panel.style.cssText = [
      'position:fixed',
      'left:0','right:0',
      'bottom:env(safe-area-inset-bottom,0)',
      'max-height:40%',
      'overflow:auto',
      'background:#000',
      'color:#0f0',
      'font:12px/1.4 monospace',
      'padding:6px',
      'z-index:99998',
      'box-shadow:0 0 4px #0f0'
    ].join(';');
    panel.textContent='(debug panel ready)';
    document.body.appendChild(panel);
  }

  // 创建开关按钮
  if (!document.getElementById('logToggle')) {
    const btn = document.createElement('button');
    btn.id = 'logToggle';
    btn.textContent = 'LOG';
    btn.style.cssText = [
      'position:fixed',
      'right:8px',
      'bottom:calc(48px + env(safe-area-inset-bottom,0))',
      'z-index:100000',
      'padding:4px 8px',
      'background:#111',
      'color:#0f0',
      'border:1px solid #0f0',
      'border-radius:4px',
      'font-size:12px'
    ].join(';');
    btn.onclick = function(){
      if (panel.style.display === 'none') {
        panel.style.display='block';
      } else {
        panel.style.display='none';
      }
    };
    document.body.appendChild(btn);
  }

  // 添加清空命令
  window.clearLogPanel = function(){
    if (panel) panel.innerHTML='(cleared)';
  };

  // 重写 console
  ['log','warn','error'].forEach(fn=>{
    const old = console[fn];
    console[fn] = function(...args){
      try { old.apply(console,args); } catch(e){}
      if (!panel) return;
      const line = document.createElement('div');
      line.style.whiteSpace='pre-wrap';
      line.textContent = '['+fn.toUpperCase()+'] ' + args.map(a=>{
        try {
          if (typeof a === 'object') return JSON.stringify(a);
          return String(a);
        } catch(e){ return String(a); }
      }).join(' ');
      if (fn === 'error') line.style.color='#f55';
      if (fn === 'warn') line.style.color='#ff0';
      panel.appendChild(line);
      panel.scrollTop = panel.scrollHeight;
    };
  });

  console.log('[log-panel] ready');
})();
