import React, { useState, useEffect, useCallback, useRef, ChangeEvent, useMemo } from 'react';
import { getAuth, onAuthStateChanged, User, signOut } from 'firebase/auth';
import { FunnelData, FunnelComponent, Answer, Question, FunnelOutcome } from './types/funnel.ts'; 
import debounce from 'lodash.debounce'; 
import { getFirestore } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject, uploadString } from 'firebase/storage';
import QuizPlayer from './components/QuizPlayer.tsx';
import ResetPage from './pages/reset.tsx';
import LoginPage from "./pages/Login.tsx";
import VerifyPage from './pages/VerifyPage.tsx';
import FinishEmailVerification from './pages/FinishEmailVerification.tsx';
import { checkPasswordStrength } from './utils/passwordStrength.ts';
import BackButton from './components/BackButton.tsx'; 
import SmartAnalysisReport from './components/SmartAnalysisReport.tsx';
import './components/SmartAnalysisReport.css';
import { useNavigate, useParams, Routes, Route, useLocation } from 'react-router-dom';
import OptimizedTextInput from './components/OptimizedTextInput.tsx';
import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  Firestore,
  onSnapshot,
  query,
  where,
  getDoc
} from 'firebase/firestore';

import Login from './components/Login.tsx';
import './App.css';



interface Question {
  id: string;
  title: string;
  type: 'single-choice' | 'text-input';
  answers: { [answerId: string]: Answer }; // Changed from Answer[] to object/Map
 data?: { 
    affiliateLinks?: string[];
  };
}

interface Funnel {
  id: string;
  name: string;
  data: FunnelData;
}

interface AppProps {
  db: Firestore;
  storage: FirebaseStorage;
}

const defaultFunnelData: FunnelData = {
  questions: [],
  finalRedirectLink: '',
  tracking: '',
  conversionGoal: 'Product Purchase',
  primaryColor: '#007bff',
  buttonColor: '#28a745',
  backgroundColor: '#f8f9fa',
  textColor: '#333333',
  enableLeadCapture: false, 
  leadCaptureWebhookUrl: '',
  // 【新增默认结果列表】
  outcomes: [
    {
      id: 'default-result',
      name: 'Default result',
      title: 'Congratulations! This is your personalized report.',
      summary: "We've matched your answers to the most suitable products for you. See our exclusive recommendations below.",
      ctaLink: '', // 默认链接为空，需用户填写
      imageUrl: '', // 默认图片链接为空
    },
  ],
  scoreMappings: [
    { minScore: 0, maxScore: 100, outcomeId: 'default-result' },
  ],
};
const getDefaultData = (type: string) => {
    switch (type) {
      case 'quiz':
        return {
          title: "New Question Title", // 使用 title 字段
          answers: ['Option A', 'Option B', 'Option C', 'Option D'],
          buttonColor: '#007bff',
          backgroundColor: '#ffffff',
          textColor: '#333333',
          buttonTextColor: '#ffffff',
          affiliateLinks: ['', '', '', '']
        };
      default:
        return {};
         }
          };
// REPLACE your old App function with this new one
export default function App({ db, storage }: AppProps) {
  const navigate = useNavigate();
  const location = useLocation();
  // New state variables to manage authentication and user roles
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  
  // 在现有的 state 声明附近添加
const [notification, setNotification] = useState<{
  message: string;
  type: 'success' | 'error';
  visible: boolean;
}>({
  message: '',
  type: 'success',
  visible: false
});
 
// 添加显示通知的函数
const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
  setNotification({
    message,
    type,
    visible: true
  });
  
  setTimeout(() => {
    setNotification(prev => ({ ...prev, visible: false }));
  }, 1000);
};
  // useEffect for Authentication and Role checking
  // --- 请粘贴这两个新的 useEffect ---

// 新的 useEffect 1: 只负责监听和设置用户登录状态
useEffect(() => {
    const auth = getAuth();
    // onAuthStateChanged 返回一个 unsubscribe 函数
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      // 只要这个函数被调用，就意味着 Firebase 的首次检查已完成
      // 无论 currentUser 是否存在，我们都可以结束初始加载状态
      if (currentUser && currentUser.emailVerified) {
        setUser(currentUser);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    // 组件卸载时，取消监听以防止内存泄漏
    return () => unsubscribe();
  }, []); // 空依赖数组，确保只在组件首次加载时设置监听器

  // (检查管理员权限的 useEffect 保持不变)
  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    user.getIdTokenResult().then(idTokenResult => {
        setIsAdmin(idTokenResult.claims.role === 'admin');
    }).catch(() => setIsAdmin(false));
  }, [user]);
    
  // --- CRUD Functions (These should be inside the App component) ---
  const createFunnel = async (name: string) => {
    if (!db || !user) return; 
    const funnelsCollectionRef = collection(db, 'funnels');
    try {
      const newFunnelRef = await addDoc(funnelsCollectionRef, {
        name: name,
        data: defaultFunnelData,
        ownerId: user.uid, 
      });
      setNotification({ message: `Funnel "${name}" created!`, type: 'success' });
    navigate(`/edit/${newFunnelRef.id}`);
  } catch (error: any) {
    console.error('Error creating funnel:', error);
    // ✅ Use the error notification
    setNotification({ message: `Failed to create funnel: ${error.message}`, type: 'error' });
    }
  };

  const deleteFunnel = async (funnelId: string) => {
  if (!db || !user) return;
  try {
    const funnelDoc = doc(db, 'funnels', funnelId);
    await deleteDoc(funnelDoc);

    setNotification({ message: 'Funnel deleted.', type: 'success' });
    // 更新本地state（假设你有setFunnels这个方法）
    setFunnels(funnels => funnels.filter(f => f.id !== funnelId));
    // 3秒后可选：跳转或其它操作
    // setTimeout(() => navigate('/'), 3000);
  } catch (error) {
    setNotification({ message: `Failed to delete funnel: ${error.message}`, type: 'error' });
  }
};
  const updateFunnelData = async (funnelId: string, newData: FunnelData) => {
    if (!db || !user) return;
    try {
      const funnelDoc = doc(db, 'funnels', funnelId);
      await updateDoc(funnelDoc, { data: newData });
      console.log('✅ Funnel updated:', funnelId);
    } catch (error) {
      console.error('Error updating funnel:', error);
    }
  };

  // --- Render Logic ---
   return (
    <div style={{ padding: 24, fontFamily: 'Arial' }}>
      <Routes>
        {/* --- 1. 公开路由（无需身份验证） --- */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<LoginPage isRegister={true} />} />
        <Route path="/reset" element={<ResetPage />} />
        <Route path="/verify-email" element={<FinishEmailVerification />} />
        <Route path="/play/:funnelId" element={<QuizPlayer db={db} />} />

        {/* --- 2. 私有路由 (处理身份验证和加载状态) --- */}
        
         <Route
  path="/"
  element={
    <AuthRouteWrapper user={user} isLoading={isLoading} isAdmin={isAdmin} db={db}>
        <FunnelDashboard
            db={db}
            user={user}
            isAdmin={isAdmin}
            funnels={funnels}
            setFunnels={setFunnels}
            createFunnel={createFunnel}
            deleteFunnel={deleteFunnel}
        />
    </AuthRouteWrapper>
  }
/>

        {/* ↓↓↓ 2. 编辑页 /edit/:funnelId (Funnel Editor) 的新逻辑 ↓↓↓ */}
        <Route
  path="/edit/:funnelId"
  element={
    <AuthRouteWrapper user={user} isLoading={isLoading} isAdmin={isAdmin} db={db}>
        <FunnelEditor db={db} storage={storage} updateFunnelData={updateFunnelData} />
    </AuthRouteWrapper>
  }
/>
        
      <Route path="*" element={<h2>404 Not Found</h2>} />
      </Routes>
      {notification.visible && (
        <div className={`custom-notification ${notification.type}`}>
          <div className="notification-content">
            {notification.message}
          </div>
        </div>
          )}
         </div>
         );
        }

const AuthHeader: React.FC<{ user: User, isAdmin: boolean }> = ({ user, isAdmin }) => (
    <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid #ccc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>
            Welcome, <strong>{user.email}</strong>!
            {isAdmin && <span style={{color: 'red', marginLeft: '10px', fontWeight: 'bold'}}>(Admin)</span>}
        </span>
        <button onClick={() => signOut(getAuth())} style={{ padding: '8px 15px' }}>Logout</button>
    </div>
);
const EmailVerifyPrompt: React.FC = () => (
    <div style={{ padding: 40, lineHeight: 1.6, textAlign: 'center', background: '#fff', borderRadius: '8px', maxWidth: '400px', margin: '50px auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <h2>Email Not Verified</h2>
        <p>Your email address has not been verified.</p>
        <p>Please check your inbox and click the verification link.</p>
        <p style={{ marginTop: '20px' }}>
            <a href="#/login" style={{ color: '#007bff', textDecoration: 'underline', fontWeight: 'bold' }}>Return to Login Page</a>
        </p>
    </div>
);
interface AuthRouteWrapperProps {
    children: React.ReactNode;
    user: User | null;
    isLoading: boolean;
    isAdmin: boolean;
    db: any; // Firestore instance
    // ... 其他必要的 props
}

const AuthRouteWrapper: React.FC<AuthRouteWrapperProps> = ({ children, user, isLoading, isAdmin, ...props }) => {

    if (isLoading) {
        return <div style={{ textAlign: 'center', marginTop: '50px' }}>Verifying user status...</div>;
    }

    if (!user) {
        return <LoginPage />;
    }

    if (!user.emailVerified) {
        return <EmailVerifyPrompt />;
    }

    // 状态 4: 已登录且已验证，渲染子组件
    return (
        <>
            <AuthHeader user={user} isAdmin={isAdmin} />
            {children}
        </>
    );
};
interface FunnelDashboardProps {
  db: Firestore;
  user: User; // <-- 添加这一行
  isAdmin: boolean;
  funnels: Funnel[];
  setFunnels: React.Dispatch<React.SetStateAction<Funnel[]>>;
  createFunnel: (name: string) => Promise<void>;
  deleteFunnel: (funnelId: string) => Promise<void>;
}

// REPLACE your old FunnelDashboard component with this new one
const FunnelDashboard: React.FC<FunnelDashboardProps> = ({ db, user, isAdmin, funnels, setFunnels, createFunnel, deleteFunnel }) => {
  
  // const [funnels, setFunnels] = useState<Funnel[]>([]); 
  
  const [newFunnelName, setNewFunnelName] = useState('');
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [copyingId, setCopyingId] = useState<string | null>(null);
  useEffect(() => {
    const fetchFunnels = async () => {
      if (!user || !db) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const funnelsCollectionRef = collection(db, 'funnels');
        let q;
        if (isAdmin) {
          q = query(funnelsCollectionRef);
        } else {
          q = query(funnelsCollectionRef, where("ownerId", "==", user.uid));
        }

        const querySnapshot = await getDocs(q);
        const loadedFunnels = querySnapshot.docs.map((doc) => ({
          ...(doc.data() as Funnel),
          id: doc.id,
          data: { ...defaultFunnelData, ...doc.data().data },
        }));
        
        // 正确地调用从 App 传来的 setFunnels 方法来更新父组件的状态
        setFunnels(loadedFunnels); 

      } catch (err: any) {
        console.error('CRITICAL: Failed to fetch funnels:', err);
        setError(`Failed to load funnels. Error: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFunnels();
  }, [db, user, isAdmin, setFunnels]); // 依赖项中包含 setFunnels

  const handleCreateFunnel = async () => {
    if (!newFunnelName.trim()) {
      alert('Please enter a funnel name.');
      return;
    }
    setIsCreating(true);
    try {
      await createFunnel(newFunnelName);
      setNewFunnelName('');
    } catch (err) {
      setError('Failed to create funnel. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };
  
  const handleDeleteFunnel = async (funnelId: string) => {
    await deleteFunnel(funnelId);
    setFunnels(prevFunnels => prevFunnels.filter(funnel => funnel.id !== funnelId));
  };
  
  const handleCopyLink = async (funnelId: string) => {
  // 【修复点：函数签名增加了 async】

  // 标志，用于追踪复制操作是否成功
  let copiedSuccessfully = false; 

  // 1. 启动动画状态，按钮类切换为 'copy-success'
  setCopyingId(funnelId);

  // 检查 Funnel ID 是否存在
  if (!funnelId || funnelId.trim() === '') {
    showNotification('Funnel ID missing! Please ensure the funnel is saved.', 'error');
  } else {
    // 使用 package.json homepage 路径构建完整的 URL
    const basePath = "/funnel-editor-2025/";
    const fullUrl = `${window.location.origin}${basePath}#/play/${funnelId}`;

    try {
      // 使用 clipboard API 复制链接 (因为是 await，所以 try/catch 能够捕获异步错误)
      await navigator.clipboard.writeText(fullUrl);
      copiedSuccessfully = true; // 标记成功
    } catch (err: any) {
      console.error('Failed to copy:', err);
      showNotification('Failed to copy link', 'error');
      // Fallback: 提示用户手动复制
      prompt('Copy this link manually:', fullUrl);
    }
  }

  // 2. 等待动画持续时间（0.6秒）
  await new Promise(resolve => setTimeout(resolve, 600));

  // 3. 重置动画状态，按钮类切换回 'copy-primary'
  setCopyingId(null);
  
  // 4. 动画结束后发送成功通知（仅在复制操作成功时发送）
  if (copiedSuccessfully) {
    console.log('Funnel link copied to clipboard!', 'success');
  }
};

  
  return (
    <div className="dashboard-container">
      <h2><span role="img" aria-label="funnel">🥞</span> Your Funnels</h2>
      <div className="create-funnel-section">
        <input
          type="text"
          placeholder="New Funnel Name"
          value={newFunnelName}
          onChange={(e) => setNewFunnelName(e.target.value)}
          className="funnel-name-input"
        />
        <button className="add-button" onClick={handleCreateFunnel} disabled={isCreating}>
          {isCreating ? 'Creating...' : 'Create New Funnel'}
        </button>
      </div>
      {isLoading ? (
        <p className="loading-message">
    <span className="loading-spinner"></span>
    Loading funnels...
  </p>
      ) : error ? (
        <p className="error-message">{error}</p>
      ) : funnels.length === 0 ? (
        <p className="no-funnels-message">No funnels created yet. Start by creating one!</p>
      ) : (
        // 直接使用从 props 传来的 funnels 变量进行渲染
        <ul className="funnel-list">
          {funnels.map((funnel) => (
            <li key={funnel.id} className="funnel-item">
              <span>{funnel.name}</span>
               <div className="funnel-actions">
                <button className="funnel-action-btn" onClick={() => navigate(`/edit/${funnel.id}`)}>Edit</button>
                <button className="funnel-action-btn" onClick={() => navigate(`/play/${funnel.id}`)}>Play</button>
                <button 
    // 根据状态切换类名：正在复制时为 copy-success，否则为 copy-primary
    className={`funnel-action-btn ${copyingId === funnel.id ? 'copy-success' : 'copy-primary'}`} 
    onClick={() => handleCopyLink(funnel.id)}
  >
    {/* 根据状态切换按钮文本 */}
    {copyingId === funnel.id ? 'Copied!' : 'Copy Link'}
  </button>
                <button className="funnel-action-btn delete" onClick={() => handleDeleteFunnel(funnel.id)}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
interface FunnelEditorProps {
  db: Firestore;
  storage: FirebaseStorage;
  updateFunnelData: (funnelId: string, newData: FunnelData) => Promise<void>;
}


const FunnelEditor: React.FC<FunnelEditorProps> = ({ db, auth, storage, updateFunnelData }) => {
  const { funnelId } = useParams<{ funnelId: string }>();
  const navigate = useNavigate();
  const location = useLocation(); 
  const [funnelName, setFunnelName] = useState('Loading...');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [finalRedirectLink, setFinalRedirectLink] = useState('');
  const [tracking, setTracking] = useState('');
  const [conversionGoal, setConversionGoal] = useState('Product Purchase');
  const [primaryColor, setPrimaryColor] = useState(defaultFunnelData.primaryColor);
  const [buttonColor, setButtonColor] = useState(defaultFunnelData.buttonColor);
  const [backgroundColor, setBackgroundColor] = useState(defaultFunnelData.backgroundColor);
  const [textColor, setTextColor] = useState(defaultFunnelData.textColor);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [outcomes, setOutcomes] = useState<FunnelOutcome[]>(defaultFunnelData.outcomes);
  const [scoreMappings, setScoreMappings] = useState<ScoreOutcomeMapping[]>(defaultFunnelData.scoreMappings);
  const [leadCaptureEnabled, setLeadCaptureEnabled] = useState(false);
  const [leadCaptureWebhookUrl, setLeadCaptureWebhookUrl] = useState('');
  
  const [templateFiles, setTemplateFiles] = useState<string[]>([]);
  const [debugLinkValue, setDebugLinkValue] = useState('Debug: N/A');
  const urlParams = new URLSearchParams(location.search);
  const currentSubView = urlParams.get('view') || 'mainEditorDashboard';
  const urlIndex = urlParams.get('index');

  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<number | null>(null);

  useEffect(() => {
    // 这个 Effect 专门负责监听 URL 的变化，并更新我们的 state
    const indexFromUrl = urlIndex !== null ? parseInt(urlIndex, 10) : null;
    if (currentSubView === 'questionForm' && indexFromUrl !== null) {
        setSelectedQuestionIndex(indexFromUrl);
    } else {
        // 如果我们不在 questionForm 视图，就重置 index
        setSelectedQuestionIndex(null);
    }
  }, [currentSubView, urlIndex]); // 依赖项是 URL 参数

  // 在 state 声明之后，安全地派生出 questionToEdit
  const questionToEdit = selectedQuestionIndex !== null && questions[selectedQuestionIndex]
    ? questions[selectedQuestionIndex]
    : undefined;

  // 3. 驱动路由跳转的函数 (保持不变)
  const setCurrentSubView = useCallback((newView: string, index: number | null = null) => {
  // --- END: NEW REPLACEMENT CODE ---
  const newParams = new URLSearchParams(location.search);

  if (newView !== 'mainEditorDashboard') {
    newParams.set('view', newView);
  } else {
    newParams.delete('view'); // 避免冗余参数
  }

  if (newView === 'questionForm' && index !== null) {
    newParams.set('index', String(index));
  } else {
    newParams.delete('index');
  }

  navigate(
    { pathname: location.pathname, search: newParams.toString() },
    { replace: true }
  );
}, [location.pathname, location.search, navigate]);

   useEffect(() => {
  // Hardcode the list of available template files.
  // This avoids the need for a server-side call on a static site.
  const availableTemplates = [
    'education-learning.json',
    'entrepreneurship-business.json',
    'fitness-health.json',
    'marketing-funnel.json',
    'personal-growth.json',
  ];
  setTemplateFiles(availableTemplates);
}, []);
  useEffect(() => {
  if (!funnelId) return;
  const funnelDocRef = doc(db, 'funnels', funnelId);

  const unsubscribe = onSnapshot(funnelDocRef, (funnelDoc) => {
    if (funnelDoc.exists()) {
      const funnel = funnelDoc.data() as Funnel;
      
      let compatibleQuestions = Array.isArray(funnel.data.questions) ? funnel.data.questions : [];
      compatibleQuestions = compatibleQuestions.map(question => {
        if (Array.isArray(question.answers)) {
          // 确保答案总是对象形式，以便 QuizPlayer 和 QuestionFormComponent 正确读取 clickCount
          const answersObj: { [answerId: string]: Answer } = {};
          question.answers.forEach((answer: Answer) => {
            // 如果旧数据没有 ID，为其生成一个
            answersObj[answer.id || `answer-${Date.now()}-${Math.random()}`] = answer;
          });
          return { ...question, answers: answersObj };
        }
        // 【中文注释：处理旧数据结构中的 text 字段缺失问题】
        if (!question.title && (question as any).question) {
            question.title = (question as any).question;
        }
        return question; // 已经是对象格式
      });

      // ✅ 移除 if (compatibleQuestions.length > 0) 检查，总是加载
      // 这能防止初始空数据时阻塞
      setFunnelName(funnel.name);
      setQuestions(compatibleQuestions);
      const loadedLink = funnel.data.finalRedirectLink || '';
      setFinalRedirectLink(loadedLink);
      setTracking(funnel.data.tracking || '');
      setConversionGoal(funnel.data.conversionGoal || 'Product Purchase');
      setPrimaryColor(funnel.data.primaryColor || defaultFunnelData.primaryColor);
      setButtonColor(funnel.data.buttonColor || defaultFunnelData.buttonColor);
      setBackgroundColor(funnel.data.backgroundColor || defaultFunnelData.backgroundColor);
      setTextColor(funnel.data.textColor || defaultFunnelData.textColor);
      setLeadCaptureEnabled(funnel.data.enableLeadCapture || false); 
      setLeadCaptureWebhookUrl(funnel.data.leadCaptureWebhookUrl || '');
      setOutcomes(funnel.data.outcomes || defaultFunnelData.outcomes);
      setScoreMappings(funnel.data.scoreMappings || defaultFunnelData.scoreMappings); 
      setIsDataLoaded(true);  // 总是设置为true，确保保存能触发
      setDebugLinkValue(`<strong>DEBUG:</strong> <br /> ${loadedLink || 'N/A'}`);
      console.log('✅ Firestore data loaded and state updated. Questions length:', compatibleQuestions.length);
      
    } else {
       console.log('未找到该漏斗!');
      // 【中文注释：文档不存在，停止加载并跳转】
      setIsDataLoaded(true); 
      navigate('/');
    }
  }, (error) => {
    console.error("监听漏斗数据变化时出错:", error);
    // 【中文注释：加载失败，停止加载并跳转】
    setIsDataLoaded(true); 
    console.error('Failed to load funnel data.', 'error');
    navigate('/');
  });

  return () => {
    unsubscribe();
  };
}, [funnelId, db, navigate]);

  const performSave = (currentData: FunnelData) => {
  if (!funnelId) return;
  const dataToSave: FunnelData = {
    ...currentData,
    enableLeadCapture: leadCaptureEnabled, // 【中文注释：保存 Lead Capture 状态】
    leadCaptureWebhookUrl: leadCaptureWebhookUrl, // 【中文注释：保存 Webhook URL 状态】
    outcomes: outcomes,
    scoreMappings: scoreMappings,
  };
  updateFunnelData(funnelId, dataToSave);
  console.log('✅ Auto-Save triggered.');
};
const debouncedSave = useCallback( 
  debounce(performSave, 300), 
[funnelId, updateFunnelData, leadCaptureEnabled, leadCaptureWebhookUrl]
);

// 3. 监听状态变化并调用防抖保存的 useEffect (替代原有的 unoptimized useEffect)
useEffect(() => {
  if (!isDataLoaded) return;

  // 每次依赖项变化时，构造最新的数据对象
  const latestData: FunnelData = {
    questions: Array.isArray(questions) ? questions : [],
    finalRedirectLink,
    tracking,
    conversionGoal,
    primaryColor,
    buttonColor,
    backgroundColor,
    textColor,
   enableLeadCapture: leadCaptureEnabled, 
    leadCaptureWebhookUrl: leadCaptureWebhookUrl, 
  };
   (window as any).__funnelData = latestData;

  // 调用防抖动的保存函数，传入最新数据
  debouncedSave(latestData);

  // 在组件卸载或依赖项改变时，取消所有待处理的防抖动调用
  return () => {
    // 强制取消任何待执行的 debouncedSave
    debouncedSave.cancel(); 
  };
}, [
  questions,
  finalRedirectLink,
  tracking,
  conversionGoal,
  primaryColor,
  buttonColor,
  backgroundColor,
  textColor,
  leadCaptureEnabled, 
  leadCaptureWebhookUrl,
  outcomes,
  scoreMappings,
  isDataLoaded,
  debouncedSave 
]);
  
   useEffect(() => {
    setDebugLinkValue(`<strong>DEBUG:</strong> <br /> ${finalRedirectLink || 'N/A'}`);
}, [finalRedirectLink]);
const handleSelectTemplate = async (templateName: string) => {
  console.log(`[LOG] handleSelectTemplate called with: ${templateName}`);
  
  if (questions.length >= 6) {
    setNotification({ message: 'Cannot add from template, the 6-question limit has been reached.', type: 'error' });
    return;
  }

  try {
    const response = await fetch(`${process.env.PUBLIC_URL}/templates/${templateName}.json`);
    if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.statusText}`);
    }
    const templateData = await response.json();

    // --- 核心修复逻辑开始 ---
    // 验证模板数据是一个数组
    if (!Array.isArray(templateData)) {
        throw new Error("Template format is invalid. Expected an array of questions.");
    }
    
    // 为模板中的问题和答案生成新的、唯一的ID，并转换数据结构
    const newQuestionsWithIds: Question[] = templateData.map((q: any, questionIndex: number) => {
      const questionId = `question-${Date.now()}-${questionIndex}`;
      const answersObj: { [answerId: string]: Answer } = {};
      
      // 确保 q.answers 是一个数组再进行遍历
      if (Array.isArray(q.answers)) {
        q.answers.forEach((answer: any, answerIndex: number) => {
          // 确保答案文本存在且为字符串
          if (answer && typeof answer.text === 'string') {
            const answerId = `answer-${Date.now()}-${questionIndex}-${answerIndex}`;
            answersObj[answerId] = {
              id: answerId,
              text: answer.text.trim(),
              clickCount: 0 
            };
          }
        });
      }

      // 返回符合您应用内部 Question 结构的对象
      return {
        ...q,
        id: questionId,
        type: q.type || 'single-choice', // 提供默认类型
        answers: answersObj,
      };
    });
    // --- 核心修复逻辑结束 ---

    // 检查合并后是否超出限制
    if (questions.length + newQuestionsWithIds.length > 6) {
      setNotification({ message: `Cannot add all questions from template, it would exceed the 6-question limit.`, type: 'error' });
      return;
    }

    setQuestions(prevQuestions => [...prevQuestions, ...newQuestionsWithIds]);
    setNotification({ message: `Template "${templateName}" loaded successfully!`, type: 'success' });

  } catch (error) {
    console.error('Error loading template:', error);
    // 强制类型转换以访问 message 属性
    const errorMessage = (error as Error).message || 'Failed to load the template.';
    setNotification({ message: errorMessage, type: 'error' });
  }
};
    const handleAddQuestion = () => {
    // 【中文注释：修改：移除 form 逻辑，只保留 quiz 逻辑，限制在 6 个问题】
    if (questions.length >= 6) {
     // alert('You can only have up to 6 questions for this quiz.');
      return;
    }
      const newQuestion: Question = {
      id: Date.now().toString(),
      title: `New Question ${questions.length + 1}`, // 【中文注释：使用 title 字段】
      type: 'single-choice',
      // ... (answers 初始化逻辑保持不变)
      answers: Array(4)
        .fill(null)
        .reduce((acc, _, i) => {
          const answerId = `option-${Date.now()}-${i}`;
          acc[answerId] = { id: answerId, text: `Option ${String.fromCharCode(65 + i)}`, clickCount: 0 }; 
          return acc;
        }, {} as { [answerId: string]: Answer }),
    };
    setQuestions([...questions, newQuestion]);
    setCurrentSubView('questionForm', questions.length);
  };

  const handleEditQuestion = (index: number) => { // 【修改点 5：修复 handleEditQuestion 的调用】
    setCurrentSubView('questionForm', index);
  };

  const handleDeleteQuestion = () => {
  if (selectedQuestionIndex !== null) {
    setIsDeleting(true); 
    const updatedQuestions = questions.filter((_, i) => i !== selectedQuestionIndex);
    setQuestions(updatedQuestions);
    setSelectedQuestionIndex(null); // 确保是调用状态更新函数
    setCurrentSubView('quizEditorList');
    setNotification({ message: 'Question deleted.', type: 'success' });

    setTimeout(() => {
      setIsDeleting(false);
    }, 1000);
  }
};
 const handleCancel = () => {
    
    setCurrentSubView('mainEditorDashboard');// 返回漏斗编辑页
  };
const handleImportQuestions = (importedQuestions: Question[]) => {
  try {
    if (questions.length + importedQuestions.length > 6) {
      setNotification({
        show: true,
        message: `Cannot import. This funnel already has ${questions.length} questions. Importing ${importedQuestions.length} more would exceed the 6-question limit.`,
        type: 'error',
      });
      return;
    }

    const validImportedQuestions = importedQuestions.filter(
      (q) => {
        // 检查 title 是否有效
        const hasValidTitle = q.title && typeof q.title === 'string' && q.title.trim() !== '';
        
        // 检查 answers 是否为非空对象
        const hasValidAnswersObject = 
            typeof q.answers === 'object' && 
            q.answers !== null && 
            Object.keys(q.answers).length > 0;

        // 如果答案是对象，则检查每个答案的文本是否有效
        const allAnswersHaveText = hasValidAnswersObject 
            ? Object.values(q.answers).every((a) => a.text && typeof a.text === 'string' && a.text.trim() !== '')
            : false;

        return hasValidTitle && hasValidAnswersObject && allAnswersHaveText;
      }
    );

    if (validImportedQuestions.length === 0) {
      setNotification({
        show: true,
        message: 'No valid questions found in the imported file. Please check the file format (title and answer text are required)',
        type: 'error',
      });
      return;
    }

    setQuestions((prevQuestions) => [...prevQuestions, ...validImportedQuestions]);
    setNotification({
      show: true,
      message: `Successfully imported ${validImportedQuestions.length} questions!`,
      type: 'success',
    });
  } catch (err) {
    setNotification({
      show: true,
      message: 'Error reading or parsing JSON file. Please check file format.',
      type: 'error',
    });　
  }
};
  const renderEditorContent = () => {
     switch (currentSubView) {
       case 'quizEditorList':
       return (
          <QuizEditorComponent
            questions={questions}
            onAddQuestion={handleAddQuestion}
            onEditQuestion={handleEditQuestion}
            onBack={() => setCurrentSubView('mainEditorDashboard')}
            onImportQuestions={handleImportQuestions}
            onSelectTemplate={handleSelectTemplate}
            templateFiles={templateFiles}
            />
        );
      case 'questionForm':
        if (selectedQuestionIndex === null || !questionToEdit) {
            // 当状态正在同步或数据还未加载时，显示加载中...
            return <div>Loading question...</div>; 
        }
          return (
          <QuestionFormComponent
            question={questionToEdit}
            questionIndex={selectedQuestionIndex}
            onUpdate={(q) => {
              setQuestions((prev) => {
                if (selectedQuestionIndex === null) return prev;
                const next = [...prev];
                next[selectedQuestionIndex] = q;
                return next;
              });
            }}
            // onSave 只负责在点击保存按钮后返回列表
           onSave={() => {
              setCurrentSubView('quizEditorList');
            }}
            onCancel={() => {
           const button = document.querySelector('.cancel-button');
          if (button) {
              button.classList.add('animate-out');
              setTimeout(() => {
                  // 跳转到根路径 /，即 Funnel List Page
                  navigate('/'); 
              }, 1000);
          } else {
              // 确保在没有动画元素时也能跳转
              navigate('/');
          }
      }}
             onDelete={handleDeleteQuestion}
            />
           );
      case 'linkSettings':
        return (
          <LinkSettingsComponent
            finalRedirectLink={finalRedirectLink}
            setFinalRedirectLink={setFinalRedirectLink}
            tracking={tracking}
            setTracking={setTracking}
            conversionGoal={conversionGoal}
            setConversionGoal={setConversionGoal}
            leadCaptureEnabled={leadCaptureEnabled}
            setLeadCaptureEnabled={setLeadCaptureEnabled}
            leadCaptureWebhookUrl={leadCaptureWebhookUrl}
            setLeadCaptureWebhookUrl={setLeadCaptureWebhookUrl}
            onBack={() => setCurrentSubView('mainEditorDashboard')}
          />
        );
      case 'colorCustomizer':
        return (
          <ColorCustomizerComponent
            primaryColor={primaryColor}
            setPrimaryColor={setPrimaryColor}
            buttonColor={buttonColor}
            setButtonColor={setButtonColor}
            backgroundColor={backgroundColor}
            setBackgroundColor={setBackgroundColor}
            textColor={textColor}
            setTextColor={setTextColor}
            onBack={() => setCurrentSubView('mainEditorDashboard')}
          />
        );

         case 'outcomeSettings': // <--- 新增视图
        return (
          <OutcomeSettingsComponent
            outcomes={outcomes}
            setOutcomes={setOutcomes}
            funnelId={funnelId!}
            storage={storage} // 传入 storage 实例
            onBack={() => setCurrentSubView('mainEditorDashboard')}
          />
        );
       
       case 'scoreMapping': // <--- 新增视图入口
        return (
          <ScoreMappingComponent
            scoreMappings={scoreMappings}
            setScoreMappings={setScoreMappings}
            outcomes={outcomes}
            onBack={() => setCurrentSubView('mainEditorDashboard')}
          />
        );
       case 'analytics':
       return (
    <SmartAnalysisReport
      questions={questions}
      finalRedirectLink={finalRedirectLink}
      onBack={() => setCurrentSubView('mainEditorDashboard')}
    />
  );
// ...
      default:
        return (
          <div className="dashboard-container">
            <h2>
              <span role="img" aria-label="funnel">
                🥞
              </span>{' '}
              {funnelName} Editor
            </h2>
            <p>Manage components for this funnel.</p>
            <div className="dashboard-card" onClick={() => setCurrentSubView('quizEditorList')}>
              <h3>
                <span role="img" aria-label="quiz">
                  📝
                </span>{' '}
                Interactive Quiz Builder
              </h3>
              <p>Manage quiz questions for this funnel.</p>
            </div>
            <div className="dashboard-card" onClick={() => setCurrentSubView('linkSettings')}>
              <h3>
                <span role="img" aria-label="link">
                  🔗
                </span>{' '}
                Final Redirect Link Settings
              </h3>
              <p>Configure the custom link where users will be redirected.</p>
            </div>
            <div className="dashboard-card" onClick={() => setCurrentSubView('colorCustomizer')}>
              <h3>
                <span role="img" aria-label="palette">
                  🎨
                </span>{' '}
                Color Customization
              </h3>
              <p>Customize theme colors for this funnel.</p>
            </div>

           <div className="dashboard-card" onClick={() => setCurrentSubView('analytics')}>
            <h3>
            <span role="img" aria-label="analytics">
             🚀
           </span>{' '}
           Smart Analysis
           </h3>
          <p>Get data-driven insights to boost your funnel's performance.</p>
          </div>

              {/* 新增：结果配置卡片 (OutcomeSettingsComponent 的入口) */}
            <div className="dashboard-card" onClick={() => setCurrentSubView('outcomeSettings')}>
            <h3>
            <span role="img" aria-label="trophy">
             🏆
           </span>{' '}
           Exclusive Results Configuration
           </h3>
          <p>Configure personalized results, images, and unique CTA links based on quiz answers.</p>
          </div>
            
            {/* 新增：分数映射卡片 (ScoreMappingComponent 的入口) */}
            <div className="dashboard-card" onClick={() => setCurrentSubView('scoreMapping')}>
            <h3>
            <span role="img" aria-label="score">
             🔢
           </span>{' '}
           Score to Result Mapping
           </h3>
          <p>Map cumulative quiz scores to specific exclusive result pages.</p>
          </div>
         <div style={{ marginTop: '40px', textAlign: 'center' }}>
            <BackButton to="/" data-testid="back-button"> 
              <span role="img" aria-label="back">←</span> Back to All Funnels
            </BackButton>
         </div>

         <div 
         style={{ 
         marginTop: '20px', 
         padding: '10px', 
         border: '1px dashed #ccc', 
        fontSize: '0.8em', 
        wordBreak: 'break-all', 
        textAlign: 'left' 
          }}
            dangerouslySetInnerHTML={{ __html: debugLinkValue }} 
           />
          </div>
           );
            }
           };

           return <div className="App">{renderEditorContent()}</div>;
           };


interface QuizEditorComponentProps {
  questions: Question[];
  onAddQuestion: () => void;
  onEditQuestion: (index: number) => void;
  onBack: () => void;
  onImportQuestions: (importedQuestions: Question[]) => void;
  onSelectTemplate: (templateName: string) => void;
  templateFiles: string[];
}

const QuizEditorComponent: React.FC<QuizEditorComponentProps> = ({ 
  questions, 
  onAddQuestion, 
  onEditQuestion, 
  onBack, 
  onImportQuestions,
  onSelectTemplate,
  templateFiles // <-- Destructure the prop here
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
   
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) {
    setNotification({
      show: true,
      message: 'No file selected.',
      type: 'error'
    });
    return;
  }
  if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
    setNotification({
      show: true,
      message: 'Please select a JSON file.',
      type: 'error'
    });
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const content = e.target?.result as string;
      const parsedData: Question[] = JSON.parse(content);

      if (!Array.isArray(parsedData)) {
        setNotification({
          show: true,
          message: 'Invalid JSON format. Expected an array of questions.',
          type: 'error'
        });
        return;
      }

      // More permissive validation: check structure but allow some invalid answers if there are enough valid ones
      const isValidStructure = parsedData.every(
        (q) =>
          q.title &&
          typeof q.title === 'string' &&
          q.title.trim() !== '' &&
          ((Array.isArray(q.answers) && q.answers.length > 0) ||
           (typeof q.answers === 'object' && Object.keys(q.answers).length > 0))
      );

      if (!isValidStructure) {
        setNotification({
          show: true,
          message: 'Invalid JSON format. Please ensure it is an array of questions, each with a "title" and an "answers" array or object.',
          type: 'error'
        });
        return;
      }

      const questionsWithNewIds = parsedData.map((q, questionIndex) => {
        let answersObj: { [answerId: string]: Answer };
        
        if (Array.isArray(q.answers)) {
          // Convert array to object structure, filtering out invalid answers
          answersObj = {};
          let validAnswerIndex = 0;
          q.answers.forEach((answer: Answer, originalIndex) => {
            // Only process answers with valid text content
            if (answer.text && typeof answer.text === 'string' && answer.text.trim() !== '') {
              // Generate more predictable and sequential IDs
              const id = answer.id && answer.id.trim() !== '' ? answer.id : `answer-${questionIndex}-${validAnswerIndex}`;
              answersObj[id] = {
                ...answer,
                id,
                text: answer.text.trim(), // Ensure text is trimmed
              };
              validAnswerIndex++;
            }
          });
        } else {
          // Already object structure, just ensure IDs and filter invalid answers
          answersObj = {};
          let validAnswerIndex = 0;
          Object.entries(q.answers).forEach(([key, answer]) => {
            // Only process answers with valid text content
            if (answer.text && typeof answer.text === 'string' && answer.text.trim() !== '') {
              const id = answer.id && answer.id.trim() !== '' ? answer.id : (key && key.trim() !== '' ? key : `answer-${questionIndex}-${validAnswerIndex}`);
              answersObj[id] = {
                ...answer,
                id,
                text: answer.text.trim(), // Ensure text is trimmed
              };
              validAnswerIndex++;
            }
          });
        }

        return {
          ...q,
          id: `question-${questionIndex}`,
          type: q.type || 'single-choice',
          answers: answersObj,
        };
      });

      // Final validation: ensure each question has at least one valid answer after filtering
      const hasValidAnswers = questionsWithNewIds.every(q => Object.keys(q.answers).length > 0);
      
      if (!hasValidAnswers) {
        setNotification({
          show: true,
          message: 'Invalid JSON format. After filtering, some questions have no valid answers. Please ensure each question has at least one answer with non-empty text.',
          type: 'error'
        });
        return;
      }

      onImportQuestions(questionsWithNewIds);
      setNotification({
        show: true,
        message: 'Questions imported successfully!',
        type: 'success'
      });

    } catch (err) {
      setNotification({
        show: true,
        message: 'Error reading or parsing JSON file. Please check file format.',
        type: 'error'
      });
    }
  };

  reader.readAsText(file);
};

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="quiz-editor-container">
      <h2>
        <span role="img" aria-label="quiz">
          📝
        </span>{' '}
        Quiz Question List
      </h2>
       
      <div className="quiz-editor-actions">
        <button className="add-button" onClick={onAddQuestion}>
          <span role="img" aria-label="add">
            ➕
          </span>{' '}
          Add New Question
        </button>
        <button className="import-button" onClick={triggerFileInput}>
          <span role="img" aria-label="import">
            📥
          </span>{' '}
          Import Questions
        </button>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" style={{ display: 'none' }} />
      </div>
         
         {/* --- 模板库区域 --- */}
      <div style={{ textAlign: 'center', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
        <h3 style={{ marginBottom: '15px' }}>Or, start with a template:</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>

          {templateFiles.length > 0 ? (
            templateFiles.map(fileName => {
              // 从文件名生成一个更易读的按钮标签
              const buttonLabel = fileName.replace('.json', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
              return (
                <button 
                  key={fileName}
                  className="template-btn" 
                  onClick={() => onSelectTemplate(fileName.replace('.json', ''))}
                >
                  {buttonLabel}
                </button>
              );
            })
          ) : (
            <p>Loading templates...</p>
          )}
      </div>
      </div>
      {questions.length === 0 ? (
        <p className="no-questions-message">No questions added yet. Click "Add New Question" or "Import Questions" to start!</p>
      ) : (
            <ul className="question-list">
          {questions.map((q, index) => (
            <li 
  key={q.id} 
  className="question-item"
  onClick={() => onEditQuestion(index)}
>
  <span class="question-badge">Q{index + 1}</span> 
  {/* 标题和 ID 文本直接作为 li 的子元素 */}
  <span className="question-title-text">{q.title}</span> 
  <span className="question-id-text">
    (ID: {q.id.replace('question-', '')}) 
  </span>
</li>
    ))}
    </ul>
     )}

     
         <BackButton onClick={onBack}>
  <span role="img" aria-label="back">←</span> Back to Funnel Dashboard
        </BackButton>
     </div>
      );
      };

interface QuestionFormComponentProps {
  question?: Question;
  questionIndex: number | null;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onUpdate: (updatedQuestion: Question) => void;
}

// ===================================================================
// vvvvvvvvvv 请将您的 QuestionFormComponent 替换为以下代码 vvvvvvvvvv
// ===================================================================

const QuestionFormComponent: React.FC<QuestionFormComponentProps> = ({
  question,
  questionIndex,
  onSave: onSaveAndClose,
  onCancel,
  onDelete,
  onUpdate, 
}) => {
   const navigate = useNavigate();

  // 1. 使用 localQuestion 作为数据的唯一源，用于渲染
  const [localQuestion, setLocalQuestion] = useState<Question>(question);

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // 2. 外部状态变化时同步 localQuestion
  useEffect(() => {
    setLocalQuestion(question);
  }, [question]);

  // 获取稳定的 question ID，用于 useCallback 依赖项
  const questionId = localQuestion.id;

  // 3. 核心更新逻辑：接收到 OptimizedTextInput 传来的 debounced 值后，
  //    更新 localQuestion (用于渲染) 并通知父组件 (onUpdate)

  const updateLocalAndParent = useCallback((updatedQuestion: Question) => {
    // 仅在 ID 匹配时才更新，防止异步更新混乱
    // ⚠️ 修正: 将 localQuestion 替换为 questionId 作为依赖，确保引用稳定
    if (updatedQuestion.id === questionId) {
      setLocalQuestion(updatedQuestion);
      onUpdate(updatedQuestion); // 触发父组件的 debouncedSave
    }
  }, [questionId, onUpdate]);

  // ⚠️ 修正: 将 localQuestion 替换为 questionId 作为依赖项
const handleTitleUpdate = useCallback((newTitle: string) => {
    setLocalQuestion((prevQuestion) => {
      const updatedQuestion: Question = { ...prevQuestion, title: newTitle };
      onUpdate(updatedQuestion); // 通知父组件更新
      return updatedQuestion;
    });
  }, [onUpdate]);

  const handleAnswerScoreUpdate = useCallback((answerId: string, newScore: string) => {
  setLocalQuestion((prevQuestion) => {
    // 尝试将输入转换为数字，如果无效则为 0
    const scoreValue = newScore === '' ? undefined : (isNaN(Number(newScore)) ? 0 : Number(newScore));

    const updatedAnswers = {
      ...prevQuestion.answers,
      [answerId]: { ...prevQuestion.answers[answerId], resultScore: scoreValue },
    };
    const updatedQuestion: Question = { ...prevQuestion, answers: updatedAnswers };
    onUpdate(updatedQuestion); // 通知父组件更新
    return updatedQuestion;
  });
}, [onUpdate]);
  // 【已修复：答案文本更新】
  const handleAnswerTextUpdate = useCallback((answerId: string, newText: string) => {
    setLocalQuestion((prevQuestion) => {
      const updatedAnswers = {
        ...prevQuestion.answers,
        [answerId]: { ...prevQuestion.answers[answerId], text: newText },
      };
      const updatedQuestion: Question = { ...prevQuestion, answers: updatedAnswers };
      onUpdate(updatedQuestion); // 通知父组件更新
      return updatedQuestion;
    });
  }, [onUpdate]);

  // 【修复 1: NextStepId 更新】
  const handleAnswerNextStepIdUpdate = useCallback((answerId: string, newNextStepId: string) => {
    setLocalQuestion((prevQuestion) => {
      const standardizedId = newNextStepId.trim();
      const updatedAnswers = {
        ...prevQuestion.answers,
        [answerId]: { ...prevQuestion.answers[answerId], nextStepId: standardizedId },
      };
      const updatedQuestion: Question = { ...prevQuestion, answers: updatedAnswers };
      onUpdate(updatedQuestion); // 通知父组件更新
      return updatedQuestion;
    });
  }, [onUpdate]);

  // 【修复 2: Link 更新】
  const handleLinkUpdate = useCallback((index: number, value: string) => {
    setLocalQuestion((prevQuestion) => {
      const currentData = prevQuestion.data || {};
      const currentLinks = currentData.affiliateLinks || [];
      const newLinks = [...currentLinks];
      newLinks[index] = value;

      const updatedQuestion: Question = {
        ...prevQuestion,
        data: { ...currentData, affiliateLinks: newLinks },
      };
      onUpdate(updatedQuestion); // 通知父组件更新
      return updatedQuestion;
    });
  }, [onUpdate]);


  const handleSave = async () => {
    if (!localQuestion) return;

    setIsSaving(true);
    try {
      const newAnswersMap: { [answerId: string]: Answer } = {};
      let hasValidAnswer = false;

      Object.values(localQuestion.answers).forEach((answer) => {
        const currentText = answer.text.trim();

        // 验证逻辑
        if (currentText !== "") {
          newAnswersMap[answer.id] = { ...answer, text: currentText };
          hasValidAnswer = true;
        }
      });

      if (!localQuestion.title.trim()) {
        console.error("Question title cannot be empty!");
        setIsSaving(false);
        return;
      }

      if (!hasValidAnswer) {
        console.error("Please provide at least one answer option.");
        setIsSaving(false);
        return;
      }
      
      // 2. 调用 onUpdate 确保父组件在跳转前获得最终的干净状态
      onUpdate({
        ...localQuestion,
        answers: newAnswersMap,
        data: { affiliateLinks: localQuestion.data?.affiliateLinks || [] },
      });

      await new Promise((resolve) => setTimeout(resolve, 100)); // 留出时间给 React 和 Firestore 更新
      onSaveAndClose();

    } catch (error) {
      console.error("Error saving question:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    setIsDeleting(true);
    const button = document.querySelector('.delete-button');
    if (button) {
      button.classList.add('animate-out');
    }
    setTimeout(() => {
      onDelete();
    }, 1000);
  };

  if (!localQuestion) {
    return <div>Loading question...</div>;
  }

  const stableAnswers = useMemo(() => {
    // 确保答案按 ID 稳定排序
    return Object.values(localQuestion.answers).sort((a, b) => a.id.localeCompare(b.id));
  }, [localQuestion]);

  // ... QuestionFormComponent 组件的 return 语句开始 ...

return (
    <div className="question-form-container">
        <h2>
            <span role="img" aria-label="edit">
                📝
            </span>{" "}
            Quiz Question Editor
        </h2>

        <p className="question-index-display">
            {questionIndex !== null
                ? `Editing Question ${questionIndex + 1} of 6`
                : "Adding New Question"}
        </p>

        {/* --- 标题输入 --- */}
        <div className="form-group">
            <label>Question Title:</label>
            {/* ✅ 使用 OptimizedTextInput 替换 <input>，绑定到 handleTitleUpdate */}
            <OptimizedTextInput
                initialValue={localQuestion.title || ""}
                onUpdate={handleTitleUpdate}
                placeholder="e.g., What's your biggest health concern?"
                type="text"
            />
        </div>

        {/* --- 问题类型 --- */}
        <div className="form-group">
            <label>Question Type:</label>
            <select
                value={localQuestion.type || "single-choice"}
                onChange={() => {}} // 保持不变，因为它被禁用
                disabled
            >
                <option>Single Choice</option>
                <option>Multiple Choice (Coming Soon)</option>
                <option>Text Input (Coming Soon)</option>
            </select>
        </div>

        {/* --- 答案选项 --- */}
        <div className="answer-options-section">
            <p>Answer Options (Max 4):</p>
             {stableAnswers.map((answer, index) => (
            <div key={answer.id} 
            className="answer-input-group">
                    
                    {/* 选项文字 (Answer Text) */}
                    {/* ✅ 替换为 OptimizedTextInput */}
                    <OptimizedTextInput
                        initialValue={answer.text || ""}
                        onUpdate={(newText) => handleAnswerTextUpdate(answer.id, newText)}
                        placeholder={`Option ${index + 1}`}
                        type="text"
                    />
                     {/* 关联分数 (Result Score) <-- 新增内容 */}
                      <OptimizedTextInput
                        type="number"
                        initialValue={answer.resultScore !== undefined ? String(answer.resultScore) : ""}
                        onUpdate={(value) => handleAnswerScoreUpdate(answer.id, value)}
                        placeholder="Result Score (e.g. 10)"
                        style={{ marginTop: "5px" }}
                    />
                    {/* 关联链接 (Affiliate Link) */}
                     <OptimizedTextInput
                        type="url"
                        initialValue={localQuestion.data?.affiliateLinks?.[index] || ""}
                        onUpdate={(value) => handleLinkUpdate(index, value)}
                        placeholder="Affiliate link (optional)"
                    />

                    {/* 下一步 ID (Next Step ID) */}
                    
                    <OptimizedTextInput
                        initialValue={answer.nextStepId || ""}
                        onUpdate={(newNextStepId) => handleAnswerNextStepIdUpdate(answer.id, newNextStepId)}
                        placeholder="Next Step ID (Optional)"
                        className="affiliate-input"
                        style={{ marginTop: "5px" }}
                        type="text"
                    />

                    {/* 点击数展示 (Clicks Display) - 保持不变 */}
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "8px 12px",
                            backgroundColor: "#f0f0f0",
                            borderRadius: "6px",
                            marginTop: "5px",
                            width: "100%",
                            color: "#333",
                            fontSize: "14px",
                            cursor: "default",
                        }}
                    >
                        <span
                            role="img"
                            aria-label="clicks"
                            style={{ marginRight: "8px" }}
                        >
                            👁️
                        </span>
                        <strong>{answer?.clickCount || 0} clicks</strong>
                    </div>
                </div>
            ))}
        </div>
        
         <div className="form-actions">
        <button className="save-button" onClick={handleSave}>
          <span role="img" aria-label="save">💾</span> Save Question
        </button>
        <button className="cancel-button" onClick={onCancel}>
          <span role="img" aria-label="cancel">←</span> Back to List
        </button>
        {questionIndex !== null && (
          <button className="delete-button" onClick={handleDelete}>
            <span role="img" aria-label="delete">🗑️</span> Delete Question
          </button>
        )}
      </div>
    </div>
  );
};


interface LinkSettingsComponentProps {
  finalRedirectLink: string;
  setFinalRedirectLink: React.Dispatch<React.SetStateAction<string>>;
  tracking: string;
  setTracking: React.Dispatch<React.SetStateAction<string>>;
  conversionGoal: string;
  setConversionGoal: React.Dispatch<React.SetStateAction<string>>;
  leadCaptureEnabled: boolean;
  setLeadCaptureEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  leadCaptureWebhookUrl: string;
  setLeadCaptureWebhookUrl: React.Dispatch<React.SetStateAction<string>>;
  onBack: (event: React.MouseEvent<HTMLButtonElement>) => void;
  
}

// 2. 然后用这个接口来创建组件函数
const LinkSettingsComponent: React.FC<LinkSettingsComponentProps> = ({
  finalRedirectLink,
  setFinalRedirectLink,
  tracking,
  setTracking,
  conversionGoal,
  setConversionGoal,
  leadCaptureEnabled,
  setLeadCaptureEnabled,
  leadCaptureWebhookUrl,
  setLeadCaptureWebhookUrl,
  onBack,
  
}) => {
 
  
    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setLeadCaptureEnabled(checked);
  };
  return (
    <div className="link-settings-container">
      <h2>
        <span role="img" aria-label="link">
          🔗
        </span>{' '}
        Final Redirect Link Settings
      </h2>
      <p>This is the custom link where users will be redirected after completing the quiz.</p>
      <div className="form-group">
        <label>Custom Final Redirect Link:</label>
        {/* 替换为 OptimizedTextInput */}
        <OptimizedTextInput
          type="text"
          initialValue={finalRedirectLink}
          onUpdate={setFinalRedirectLink} // 直接将 setFinalRedirectLink 作为回调
          placeholder="https://your-custom-product-page.com"
          style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box', marginTop: '5px' }}
        />
      </div>
      <div className="form-group">
        <label>Optional: Tracking Parameters:</label>
        {/* 替换为 OptimizedTextInput */}
        <OptimizedTextInput
          type="text"
          initialValue={tracking} 
          onUpdate={setTracking} // 直接将 setTracking 作为回调
          placeholder="utm_source=funnel&utm_campaign=..."
          style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box', marginTop: '5px' }}
        />
      </div>
      <div className="form-group">
        <label>Conversion Goal:</label>
        <select value={conversionGoal} onChange={(e) => setConversionGoal(e.target.value)}>
          <option>Product Purchase</option>
          <option>Email Subscription</option>
          <option>Free Trial</option>
        </select>
      </div>
      <div className="form-group" style={{marginTop: '30px', borderTop: '1px solid #eee', paddingTop: '20px'}}>
        <label style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
          <span>📧 Enable Name & Email Capture (Before Redirect)</span>
          <input
            type="checkbox"
            checked={leadCaptureEnabled}
            onChange={handleCheckboxChange}
            style={{width: 'auto'}}
          />
        </label>
        <p style={{fontSize: '0.8em', color: '#888', marginTop: '5px'}}>If enabled, users will be asked to enter their name and email address at the end of the quiz.</p>
      </div>
      
      {leadCaptureEnabled && (
          <div className="form-group">
            <label>Webhook URL (Data Destination):</label>
             {/* 替换为 OptimizedTextInput */}
            <OptimizedTextInput
              type="url"
              initialValue={leadCaptureWebhookUrl}
              onUpdate={setLeadCaptureWebhookUrl} // 直接将 setLeadCaptureWebhookUrl 作为回调
              placeholder="https://your-crm-webhook.com/endpoint"
              style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box', marginTop: '5px' }}
            />
          </div>
          )}
      <div className="form-actions">
  {/* 新增的按钮：使用 BackButton 来获得动画，使用 className 继承蓝色样式 */}
  <BackButton 
      onClick={onBack} 
      className="save-button" // 继承蓝色样式
  >
    <span role="img" aria-label="save">💾</span> Apply & Return to Editor
  </BackButton>
  
  </div>
    </div>
  );
};

interface ColorCustomizerComponentProps {
  primaryColor: string;
  setPrimaryColor: React.Dispatch<React.SetStateAction<string>>;
  buttonColor: string;
  setButtonColor: React.Dispatch<React.SetStateAction<string>>;
  backgroundColor: string;
  setBackgroundColor: React.Dispatch<React.SetStateAction<string>>;
  textColor: string;
  setTextColor: React.Dispatch<React.SetStateAction<string>>;
  onBack: (event: React.MouseEvent<HTMLButtonElement>) => void;
  showNotification: (message: string, type?: 'success' | 'error') => void;
}

const ColorCustomizerComponent: React.FC<ColorCustomizerComponentProps> = ({
  primaryColor,
  setPrimaryColor,
  buttonColor,
  setButtonColor,
  backgroundColor,
  setBackgroundColor,
  textColor,
  setTextColor,
  onBack,
}) => {
  return (
    <div className="color-customizer-container">
      <h2>
        <span role="img" aria-label="palette">
          🎨
        </span>{' '}
        Color Customization
      </h2>
      <p>Customize theme colors for this funnel. (Changes are auto-saved).</p>
      <div className="form-group">
        <label>Primary Color:</label>
        <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} />
      </div>
      <div className="form-group">
        <label>Button Color:</label>
        <input type="color" value={buttonColor} onChange={(e) => setButtonColor(e.target.value)} />
      </div>
      <div className="form-group">
        <label>Background Color:</label>
        <input type="color" value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} />
      </div>
      <div className="form-group">
        <label>Text Color:</label>
        <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} />
      </div>
     <div className="form-actions">
  {/* 新增的按钮：使用 BackButton 来获得动画，使用 className 继承蓝色样式 */}
  <BackButton 
      onClick={onBack} 
      className="save-button" // 继承蓝色样式
  >
    <span role="img" aria-label="save">💾</span> Apply & Return to Editor
  </BackButton>
  
  
</div>
    </div>
  );
};

interface OutcomeSettingsComponentProps {
  outcomes: FunnelOutcome[];
  setOutcomes: React.Dispatch<React.SetStateAction<FunnelOutcome[]>>;
  funnelId: string;
  storage: FirebaseStorage;
  onBack: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

const OutcomeSettingsComponent: React.FC<OutcomeSettingsComponentProps> = ({
  outcomes,
  setOutcomes,
  funnelId,
  storage,
  onBack,
}) => {
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null); // NEW: 上传进度 (0-100)
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileLabel, setFileLabel] = useState<Record<string, string>>({}); // <--- 新增状态：存储文件名
  const fileInputRef = useRef<Record<string, HTMLInputElement | null>>({});
  const handleUpdateOutcome = (id: string, updates: Partial<FunnelOutcome>) => {
    setOutcomes(prev =>
      prev.map(o => (o.id === id ? { ...o, ...updates } : o))
    );
  };

  // 假设这是你前端的 handleClearImage 函数
const handleClearImage = async (outcomeId) => {
    // ... 获取 fileUrlToDelete ...
    
    // ⭐ 必须在这里获取 ID Token ⭐
    const auth = getAuth(); // 假设你已获取 Firebase Auth 实例
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
        // 如果用户没有登录，我们不能发送删除请求
        showNotification('User not logged in.', 'error');
        return; 
    }
    
    let idToken;
    try {
        idToken = await currentUser.getIdToken();
    } catch (tokenError) {
        console.error("Failed to get ID Token:", tokenError);
        showNotification('Failed to verify user session.', 'error');
        return;
    }
    
    // ... fetch 调用 ...
    try {
        const trackClickBaseUrl = process.env.REACT_APP_TRACK_CLICK_URL.replace(/\/trackClick$/, '');
        
        const response = await fetch(`${trackClickBaseUrl}/deleteFile`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                // ⭐ 必须包含 ID Token ⭐
                "Authorization": `Bearer ${idToken}` 
            },
            body: JSON.stringify({
                data: { 
                    fileUrl: fileUrlToDelete,
                }
            }),
        });

        // 检查非 2xx 响应
        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            throw new Error(errorBody.error || `HTTP error! Status: ${response.status}`);
        }
        
        // ... (成功通知和清除数据库 URL 的逻辑) ...

    } catch (error) {
        // 🚨 错误捕获和通知 🚨
        console.error("❌ File deletion failed:", error);
        showNotification(`Deletion failed: ${error.message || 'Unknown error.'}`, 'error');
    }
    // ... 清除数据库 URL (handleUpdateOutcome) ...
};


  
// NEW: 处理文件选择或拖放
const processFile = (selectedFile: File | null, outcomeId: string) => {
    if (!selectedFile) return;
    
    // 检查文件类型 (仅限图片)
    if (!selectedFile.type.startsWith('image/')) {
        showNotification('Only image files are supported for upload.', 'error');
        return;
    }
    
    // 模拟文件选择事件结构并调用 handleImageUpload
    // 注意：我们将文件对象直接传递给 handleImageUpload
    handleImageUpload(selectedFile, outcomeId);
};

// NEW: 拖放事件处理器
const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
};

const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
};

const handleDrop = (e: React.DragEvent, outcomeId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
        processFile(droppedFile, outcomeId);
    }
};
const handleImageUpload = async (file: File, outcomeId: string) => {
  setFileLabel(prev => ({ ...prev, [outcomeId]: file.name }));

  if (uploadingId === outcomeId) return; 

  setUploadingId(outcomeId);
  setUploadProgress(0);
  const trackClickBaseUrl = process.env.REACT_APP_TRACK_CLICK_URL.replace(/\/trackClick$/, '');

  try {
    // Step 1: 获取签名 URL
  const generateUrlResponse = await fetch(`${trackClickBaseUrl}/generateUploadUrl`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            data: { 
                funnelId, 
                outcomeId, 
                fileName: file.name,
                fileType: file.type 
            }
        }),
    });

    if (!generateUrlResponse.ok) {
        const errorResponse = await generateUrlResponse.json().catch(() => ({}));
        const details = errorResponse.error || "Failed to get signed URL (Check backend logs for details).";
        showNotification(`Upload setup failed: ${details}`, 'error');
        throw new Error(`Failed to get signed URL: ${details}`);
    }

    const { data } = await generateUrlResponse.json();
    const { uploadUrl, fileUrl } = data;
     console.log("📎 uploadUrl value:", uploadUrl);
     console.log("📎 uploadUrl typeof:", typeof uploadUrl);
    // 步骤 2: 前端直接上传文件到 GCS (使用 XMLHttpRequest 来追踪进度)
    
    await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type);

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                const percent = Math.round((event.loaded / event.total) * 100);
                setUploadProgress(percent); // 更新进度
            }
        };

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve(xhr.responseText);
            } else {
                reject(new Error(`File PUT failed with status: ${xhr.status}`));
            }
        };

        xhr.onerror = () => {
            reject(new Error('File PUT failed due to network error. Check CORS settings.'));
        };

        xhr.send(file);
    });

    // 步骤 3: 成功后更新 Firestore
    handleUpdateOutcome(outcomeId, { imageUrl: fileUrl }); 
    showNotification('Image uploaded successfully!', 'success');
    
    // 清理状态
    setUploadingId(null);
    setUploadProgress(null);

  } catch (error: any) { 
    console.error("❌ Upload Error:", error.message);
    setUploadingId(null);
    setUploadProgress(null);
    // 确保错误通知在 catch 中被显示
    if (!error.message.includes("Failed to get signed URL")) {
        showNotification(`Critical Upload Error: ${error.message}`, 'error');
    }
  }
};

  return (
    <div className="link-settings-container">
      <h2>
        <span role="img" aria-label="trophy">🏆</span>{' '}
        Exclusive Results Configuration
      </h2>
      <p>Configure different result pages for high-converting, personalized recommendations. (Changes are auto-saved).</p>

      {outcomes.map((outcome, index) => {
        const isCurrentUploading = uploadingId === outcome.id;
        
        return (
          <div key={outcome.id} className="outcome-card" style={{ marginBottom: '25px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px', position: 'relative' }}>
            
            <h4 style={{marginTop: 0, borderBottom: '1px solid #eee', paddingBottom: '10px'}}>{outcome.name} (Result #{index + 1})</h4>
            
            <div className="form-group">
              <label>Result Name (Internal):</label>
              <OptimizedTextInput
                initialValue={outcome.name}
                onUpdate={(v) => handleUpdateOutcome(outcome.id, { name: v })}
                placeholder="e.g., Top Budget Recommendation"
                type="text"
              />
            </div>

            <div className="form-group">
              <label>Result Title (Displayed to User):</label>
              <OptimizedTextInput
                initialValue={outcome.title}
                onUpdate={(v) => handleUpdateOutcome(outcome.id, { title: v })}
                placeholder="e.g., Congratulations! You are a High-Value Client."
                type="text"
              />
            </div>
            
            <div className="form-group">
              <label>CTA Link:</label>
              <OptimizedTextInput
                initialValue={outcome.ctaLink}
                onUpdate={(v) => handleUpdateOutcome(outcome.id, { ctaLink: v })}
                placeholder="https://your-product-link.com"
                type="url"
              />
            </div>

            {/* 图片上传区域 - 整合拖放和进度条 */}
            <div className="form-group">
              <label>Result Image URL (For Visual Recommendation):</label>
              
              {/* 预览和删除区域 (NEW) */}
              {outcome.imageUrl && (
                <div className="image-preview-wrapper">
                  <div className="image-preview-container">
                    <img 
                      src={outcome.imageUrl} 
                      alt="Result Preview" 
                      onError={(e) => {
                          // 图片加载失败时显示占位符或清除 URL
                          e.currentTarget.onerror = null; 
                          e.currentTarget.src = 'https://placehold.co/100x100/F44336/ffffff?text=Load+Error';
                      }}
                    />
                  </div>
                  <button 
                    className="delete-image-btn" 
                    onClick={() => handleClearImage(outcome.id)}
                  >
                    Clear Image
                  </button>
                </div>
              )}
              
              {/* 拖放/点击上传区域 (核心交互) */}
              <div 
                className={`file-upload-wrapper ${isDragOver && !isCurrentUploading ? 'drag-over' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, outcome.id)}
              >
                <button 
                  className="custom-file-button"
                  onClick={() => fileInputRef.current[outcome.id]?.click()} 
                  disabled={isCurrentUploading}
                >
                  <span role="img" aria-label="upload-icon" style={{ marginRight: 8 }}>
                    {isCurrentUploading ? '⏳' : '📤'}
                  </span>
                  {isCurrentUploading 
                    ? `Uploading: ${uploadProgress !== null ? uploadProgress : 0}%` 
                    : 'Click to Select File'}
                </button>
                
                {/* 进度条 (NEW) */}
                {isCurrentUploading && uploadProgress !== null && (
                  <div className="upload-progress-container">
                    <div 
                      className="upload-progress-bar" 
                      style={{ width: `${uploadProgress}%` }} 
                    />
                  </div>
                )}
                
                <span className="file-name-display">
                  {isCurrentUploading 
                    ? `Transferring data: ${uploadProgress !== null ? uploadProgress : 0}%`
                    : fileLabel[outcome.id] 
                      ? `Current: ${fileLabel[outcome.id]}`
                      : 'Or drag and drop files into this area (maximum 25MB)'}
                </span>
                
                {/* 隐藏的 input (用于点击) */}
                <input
                  type="file"
                  accept="image/*"
                  ref={el => fileInputRef.current[outcome.id] = el}
                  onChange={(e) => processFile(e.target.files?.[0] || null, outcome.id)}
                  disabled={isCurrentUploading}
                  className="file-upload-input" 
                />
              </div>

              <OptimizedTextInput
                initialValue={outcome.imageUrl}
                onUpdate={(v) => handleUpdateOutcome(outcome.id, { imageUrl: v })}
                placeholder="Or paste an external URL"
                type="url"
                style={{marginTop: '10px'}}
                disabled={isCurrentUploading}
              />
            </div>
          </div>
        );
      })}
      
      <button 
        className="add-button" 
        onClick={() => setOutcomes(prev => [...prev, { id: `result-${Date.now()}`, name: `New Result ${prev.length + 1}`, title: 'New Personalized Result', summary: '', ctaLink: '', imageUrl: '' }])}
      >
        <span role="img" aria-label="add">➕</span> Add New Result
      </button>

      <div className="form-actions">
        <BackButton onClick={onBack} className="save-button">
          <span role="img" aria-label="save">💾</span> Apply & Return to Editor
        </BackButton>
      </div>
    </div>
  );
};

interface ScoreMappingComponentProps {
  scoreMappings: ScoreOutcomeMapping[];
  setScoreMappings: React.Dispatch<React.SetStateAction<ScoreOutcomeMapping[]>>;
  outcomes: FunnelOutcome[];
  onBack: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

const ScoreMappingComponent: React.FC<ScoreMappingComponentProps> = ({
  scoreMappings,
  setScoreMappings,
  outcomes,
  onBack,
}) => {
  // 确保至少有一个默认结果供选择
  const hasOutcomes = outcomes && outcomes.length > 0;
  
  const handleUpdateMapping = useCallback((index: number, updates: Partial<ScoreOutcomeMapping>) => {
    setScoreMappings(prev => {
      const newMappings = [...prev];
      newMappings[index] = { ...newMappings[index], ...updates };
      return newMappings;
    });
  }, [setScoreMappings]);

  const handleAddMapping = () => {
    // 计算下一个映射的起始分数
    const defaultMinScore = scoreMappings.length > 0
        ? Math.max(...scoreMappings.map(m => m.maxScore || 0)) + 1
        : 0;

    const newMapping: ScoreOutcomeMapping = {
      minScore: defaultMinScore,
      maxScore: defaultMinScore + 10,
      outcomeId: outcomes[0]?.id || 'default-result', // 默认指向第一个结果
    };
    setScoreMappings(prev => [...prev, newMapping]);
  };

  const handleRemoveMapping = (index: number) => {
    if (scoreMappings.length <= 1) {
       // 您可以添加通知提示：至少需要保留一个映射
       return;
    }
    setScoreMappings(prev => prev.filter((_, i) => i !== index));
  };
  
  return (
    <div className="link-settings-container">
      <h2>
        <span role="img" aria-label="score">🔢</span>{' '}
        Score to Result Mapping
      </h2>
      <p>Define which score range from the quiz matches a specific exclusive result page.</p>
      
      {!hasOutcomes && (
          <p style={{color: '#dc3545', fontWeight: 'bold'}}>
             ❌ Please first“Exclusive Results Configuration”Create at least one results page in.
          </p>
      )}

      {scoreMappings.map((mapping, index) => {
        const outcome = outcomes.find(o => o.id === mapping.outcomeId);
        
        return (
          <div key={index} style={{ marginBottom: '20px', padding: '15px', border: '1px solid #007bff', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0 }}>Mapping #{index + 1}</h4>
              {scoreMappings.length > 1 && (
                <button className="delete-button" onClick={() => handleRemoveMapping(index)} style={{ padding: '5px 10px' }}>
                  Remove
                </button>
              )}
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Minimum Score:</label>
                <OptimizedTextInput
                  initialValue={String(mapping.minScore)}
                  onUpdate={(v) => handleUpdateMapping(index, { minScore: isNaN(Number(v)) ? 0 : Number(v) })}
                  type="number"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Maximum Score:</label>
                <OptimizedTextInput
                  initialValue={String(mapping.maxScore)}
                  onUpdate={(v) => handleUpdateMapping(index, { maxScore: isNaN(Number(v)) ? 100 : Number(v) })}
                  type="number"
                />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '10px', marginBottom: 0 }}>
              <label>Map to Result Page:</label>
              <select
                value={mapping.outcomeId}
                onChange={(e) => handleUpdateMapping(index, { outcomeId: e.target.value })}
                disabled={!hasOutcomes}
                style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
              >
                {hasOutcomes ? (
                  outcomes.map(o => (
                    <option key={o.id} value={o.id}>
                      {o.name} (ID: {o.id})
                    </option>
                  ))
                ) : (
                    <option value="">No Results Available</option>
                )}
              </select>
               <p style={{ fontSize: '0.8em', color: '#666', margin: '5px 0 0' }}>Current Link: {outcome?.ctaLink || 'N/A'}</p>
            </div>
            
          </div>
        );
      })}
      
      <button 
        className="add-button" 
        onClick={handleAddMapping}
        style={{ marginBottom: '20px' }}
      >
        <span role="img" aria-label="add">➕</span> Add New Score Range
      </button>

      <div className="form-actions">
        <BackButton onClick={onBack} className="save-button">
          <span role="img" aria-label="save">💾</span> Apply & Return to Editor
        </BackButton>
      </div>
    </div>
  );
};
