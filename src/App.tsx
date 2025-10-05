import React, { useState, useEffect, useCallback, useRef, ChangeEvent } from 'react';
import { getAuth, onAuthStateChanged, User, signOut } from 'firebase/auth';
import debounce from 'lodash.debounce'; 
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

// --- Interface Definitions ---
interface Answer {
  id: string;
  text: string;
  clickCount?: number;
}

interface Question {
  id: string;
  title: string;
  type: 'single-choice' | 'text-input';
  answers: { [answerId: string]: Answer }; // Changed from Answer[] to object/Map
 data?: { // <-- 添加这个可选的 'data' 字段
    affiliateLinks?: string[];
  };
}

interface FunnelData {
  questions: Question[];
  finalRedirectLink: string;
  tracking: string;
  conversionGoal: string;
  primaryColor: string;
  buttonColor: string;
  backgroundColor: string;
  textColor: string;
}

interface Funnel {
  id: string;
  name: string;
  data: FunnelData;
}

interface AppProps {
  db: Firestore;
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
};
// REPLACE your old App function with this new one
export default function App({ db }: AppProps) {
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
        <FunnelEditor db={db} updateFunnelData={updateFunnelData} />
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
        <p className="loading-message">Loading funnels...</p>
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
  updateFunnelData: (funnelId: string, newData: FunnelData) => Promise<void>;
}

const FunnelEditor: React.FC<FunnelEditorProps> = ({ db, updateFunnelData }) => {
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
  
  const [templateFiles, setTemplateFiles] = useState<string[]>([]);
  const [debugLinkValue, setDebugLinkValue] = useState('Debug: N/A');
   const urlParams = new URLSearchParams(location.search);
   const currentSubView = urlParams.get('view') || 'mainEditorDashboard';
  const urlIndex = urlParams.get('index');
// 如果 view 是 questionForm，则解析 index，否则设为 null
const selectedQuestionIndex = (currentSubView === 'questionForm' && urlIndex !== null) ? parseInt(urlIndex) : null;
  const questionToEdit = selectedQuestionIndex !== null ? questions[selectedQuestionIndex] : undefined;

  // 3. 驱动路由跳转的函数：仅操作 URL 参数
  const setCurrentSubView = useCallback((newView: string, index: number | null = null) => {
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
  // 使用传入的最新数据对象进行保存
  updateFunnelData(funnelId, currentData);
  console.log('✅ Auto-Save triggered.');
 
};
const debouncedSave = useCallback( 
  debounce(performSave, 300), 
  [funnelId, updateFunnelData] 
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
    if (questions.length >= 6) {
    //  alert('You can only have up to 6 questions for this quiz.');
      const defaultFormData = getDefaultData('form');
      
      const newFormComponent: FunnelStep = {
        id: Date.now().toString(),
        type: 'form', // 【中文注释：类型设置为 form】
        title: defaultFormData.formTitle,
        answers: {}, // 表单没有答案
        ...defaultFormData
      };
      
      setQuestions([...questions, newFormComponent]);
      // 【中文注释：跳转到表单编辑页面 (假设该页面与 questionForm 使用相同的路由参数 index)】
      setCurrentSubView('questionForm', questions.length); 
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
    
    // 【中文注释：跳转到问题编辑页面】
    setCurrentSubView('questionForm', questions.length);
  };

  const handleEditQuestion = (index: number) => { // 【修改点 5：修复 handleEditQuestion 的调用】
    setCurrentSubView('questionForm', index);
  };

  const handleDeleteQuestion = () => {
  if (selectedQuestionIndex !== null) {
    setIsDeleting(true); // 开始动画
    const updatedQuestions = questions.filter((_, i) => i !== selectedQuestionIndex);
    setQuestions(updatedQuestions);
    setSelectedQuestionIndex(null);
    setCurrentSubView('quizEditorList');
    setNotification({ message: 'Question deleted.', type: 'success' });

    setTimeout(() => {
      setIsDeleting(false); // 3秒后恢复
      // 这里可做跳转或其它操作
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
        if (!questionToEdit && selectedQuestionIndex !== null) {
            console.error('Question to edit not found, redirecting to list.');
            setCurrentSubView('quizEditorList');
            return null;
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
        // ...
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
            <li key={q.id} className="question-item" onClick={() => onEditQuestion(index)}>
              Question {index + 1}: {q.title}
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
  
  // 1. 引入本地状态来管理所有表单输入，以确保输入流畅
  const [localQuestion, setLocalQuestion] = useState<Question | undefined>(question);
  const [affiliateLinks, setAffiliateLinks] = useState<string[]>(
    question?.data?.affiliateLinks || []
  );
  
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // 2. 当父组件的 question 属性改变时，同步到本地状态 (即切换问题时)
  useEffect(() => {
    setAffiliateLinks(question?.data?.affiliateLinks || []);
  }, [question]);

 
  
  // 4. 输入事件处理函数：更新本地状态，并触发防抖的父组件更新
    const handleTitleChange = (newTitle: string) => {
    if (question) {
      // 构造新的 Question 对象，并立即传给父组件
      const updatedQuestion: Question = { ...question, title: newTitle };
      onUpdate(updatedQuestion); 
    }
  };

  // 【中文注释：答案文本输入事件处理函数：立即更新父组件状态】
  const handleAnswerTextChange = (answerId: string, newText: string) => {
    if (question) {
      const updatedAnswers = {
        ...question.answers,
        [answerId]: { ...question.answers[answerId], text: newText },
      };
      const updatedQuestion: Question = { ...question, answers: updatedAnswers };
      onUpdate(updatedQuestion);
    }
  };

  // 【中文注释：联盟链接处理函数：立即更新父组件状态（包含最新的 links）】
  const handleLinkChange = (index: number, value: string) => {
      if (!question) return;

      // 1. 更新本地 UI 状态
      const newLinks = [...affiliateLinks];
      newLinks[index] = value;
      setAffiliateLinks(newLinks);
      
      // 2. 立即更新父组件，将新的 links 数据嵌入到 data 字段
       onUpdate({
            ...question,
            // 确保 data 字段是完整的，不丢失其他 data 属性
            data: { ...question.data, affiliateLinks: newLinks } 
       });
  };
  
  
  // 5. handleSave 现在使用本地状态，并直接（非防抖）调用 onUpdate
  const handleSave = async () => {
    if (!question) return;

    setIsSaving(true);
    try {
      
      const newAnswersMap: { [answerId: string]: Answer } = {};
      let hasValidAnswer = false;
      
      // 使用当前最新的 question prop (它包含了最新的 title/text)
      Object.values(question.answers).forEach((answer) => {
          const currentText = answer.text.trim();
          
          if (currentText !== "") {
              newAnswersMap[answer.id] = {
                  ...answer, 
                  text: currentText, 
              };
              hasValidAnswer = true;
          }
      });
      
      if (!question.title.trim()) {
        console.error("Question title cannot be empty!");
        setIsSaving(false);
        return;
      }
      
      if (!hasValidAnswer) {
        console.error("Please provide at least one answer option.");
        setIsSaving(false);
        return;
      }

      // 使用本地最新的 affiliateLinks
      const cleanAffiliateLinks = Array.from({ length: 4 }).map((_, index) => affiliateLinks[index] || '');
      
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // 最终同步更新，确保数据结构正确
      onUpdate({
        ...question,
        answers: newAnswersMap, 
        data: { affiliateLinks: cleanAffiliateLinks },
      });

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

  // 防御性检查: 如果没有本地 question，则显示加载中
   if (!question) {
    return <div>Loading question...</div>;
  }

  // 7. JSX 渲染现在使用 localQuestion
    const stableAnswers = React.useMemo(() => {
      // 保证渲染顺序稳定
      return Object.values(question.answers).sort((a, b) => a.id.localeCompare(b.id));
    }, [question]);  // 仅在 localQuestion 改变时重新计算

  return (
    <div className="question-form-container">
      <h2>
        <span role="img" aria-label="edit">📝</span> Quiz Question Editor
      </h2>
      <p className="question-index-display">
        {questionIndex !== null
          ? `Editing Question ${questionIndex + 1} of 6`
          : 'Adding New Question'}
      </p>
      <div className="form-group">
        <label>Question Title:</label>
        <input
          type="text"
          value={question.title || ''} 
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="e.g., What's your biggest health concern?"
        />
      </div>
      <div className="form-group">
        <label>Question Type:</label>
        <select value={localQuestion.type || 'single-choice'} onChange={() => {}} disabled>
          <option>Single Choice</option>
          <option>Multiple Choice (Coming Soon)</option>
          <option>Text Input (Coming Soon)</option>
        </select>
      </div>
      <div className="answer-options-section">
        <p>Answer Options (Max 4):</p>
        {stableAnswers.map((answer, index) => (
          <div key={answer.id} className="answer-input-group">
            <input 
              type="text" 
              value={answer.text || ''}  
              onChange={(e) => handleAnswerTextChange(answer.id, e.target.value)} 
            />
            <input 
              type="url" 
              value={affiliateLinks[index] || ''} 
              onChange={(e) => handleLinkChange(index, e.target.value)} 
              placeholder="Affiliate link (optional)" 
            />
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '8px 12px', backgroundColor: '#f0f0f0', borderRadius: '6px',
              marginTop: '5px', width: '100%', color: '#333',
              fontSize: '14px', cursor: 'default'
            }}>
              <span role="img" aria-label="clicks" style={{ marginRight: '8px' }}>👁️</span>
              <strong>{answer?.clickCount || 0} clicks</strong>
            </div>
          </div>
        ))}
      </div>
      
      <div className="form-actions">
        {/* --- UNCHANGED: Buttons and their handlers are the same --- */}
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
  onBack: (event: React.MouseEvent<HTMLButtonElement>) => void;
  showNotification: (message: string, type?: 'success' | 'error') => void;
}

// 2. 然后用这个接口来创建组件函数
const LinkSettingsComponent: React.FC<LinkSettingsComponentProps> = ({
  finalRedirectLink,
  setFinalRedirectLink,
  tracking,
  setTracking,
  conversionGoal,
  setConversionGoal,
  onBack,
  showNotification
}) => {
 
    const [localLink, setLocalLink] = useState(finalRedirectLink);
    const [localTracking, setLocalTracking] = useState(tracking);

  
  // 核心修复 2: 当父组件的 finalRedirectLink 变化时（例如：初次加载或从其他视图返回），同步到本地状态
  useEffect(() => {
    setLocalLink(finalRedirectLink);
    setLocalTracking(tracking);
  }, [finalRedirectLink, tracking]);
  
  // 核心修复 3: 使用 useCallback 和 debounce 创建一个延迟通知父组件的函数
  const debouncedSetState = useCallback(
    debounce((linkValue: string, trackingValue: string) => {
      setFinalRedirectLink(linkValue);
      setTracking(trackingValue);
    }, 300),
    [setFinalRedirectLink, setTracking] // 依赖项只包括外部更新函数
  );

  // 核心修复 4: 销毁时清除 debouncer
  useEffect(() => {
    return () => {
      debouncedSetState.cancel();
    };
  }, [debouncedSetState]);

   const handleLinkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // 立即更新本地状态 (保证输入框流畅)
    setLocalLink(value);
    // 延迟通知父组件
    debouncedSetState(value, localTracking);
  };
  
  // 处理追踪参数输入变化
  const handleTrackingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // 立即更新本地状态
    setLocalTracking(value);
    // 延迟通知父组件
    debouncedSetState(localLink, value);
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
        <input
          type="text"
          value={localLink}
          onChange={handleLinkChange}
          placeholder="https://your-custom-product-page.com"
        />
      </div>
      <div className="form-group">
        <label>Optional: Tracking Parameters:</label>
        <input
          type="text"
          value={localTracking} 
          onChange={handleTrackingChange}
          placeholder="utm_source=funnel&utm_campaign=..."
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
