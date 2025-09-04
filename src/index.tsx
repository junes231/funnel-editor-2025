import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';

// 只需导入一次，内部已经防重复
import { db, auth } from './firebase.ts';
import { installLongPressDebug } from './longPressDebug.ts';

// 初始化长按调试（可选参数）
installLongPressDebug({
  enable: true,   // 或者省略，默认支持 ?debug=1
  longPressMs: 2000, // 长按 2 秒呼出
  maxLines: 300,
});

const rootEl = document.getElementById('root')!;
createRoot(rootEl).render(
  <React.StrictMode>
    <HashRouter>
      <App db={db} auth={auth}/>
    </HashRouter>
  </React.StrictMode>
);
