import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyA8rJiJnyB6QHgkesFekaRy7f0oftXaF0c',
  authDomain: 'funnel-editor-netlify.firebaseapp.com',
  projectId: 'funnel-editor-netlify',
  storageBucket: 'funnel-editor-netlify.firebasestorage.app',
  messagingSenderId: '498506838505',
  appId: '1:498506838505:web:95f20fdfbb260c2b271b78',
  measurementId: 'G-RVRL76REP7',
};

// 防止重复初始化
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
// 如果以后需要别的服务再加：
// export const functions = getFunctions(app);
