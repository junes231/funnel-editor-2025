import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';

// 只需导入一次，内部已经防重复
import { db, auth } from './firebase.ts';
import { installLongPressDebug } from './utils/longPressDebug.tsx';
(window as any).auth = auth;

// 初始化长按调试
installLongPressDebug({
  enable: true,   // 或省略，默认 ?debug=1 启用
  longPressMs: 2000,
  maxLines: 300,
});

// 设置 basename 以适配 GitHub Pages
const basename = process.env.PUBLIC_URL || '/';

const rootEl = document.getElementById('root')!;
createRoot(rootEl).render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <App db={db} auth={auth} />
    </BrowserRouter>
  </React.StrictMode>
);
