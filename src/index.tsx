import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';

// 只需导入一次，内部已经防重复
import { db, auth } from './firebase.ts';
import { installlongPressDebug } from './utils/longPressDebug.ts';


// 初始化长按调试
installlongPressDebug({
  enable: true,   // 或省略，默认 ?debug=1 启用
  longPressMs: 2000,
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
