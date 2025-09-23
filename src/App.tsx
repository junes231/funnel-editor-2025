import React, { useState, useEffect, useCallback, useRef, ChangeEvent } from 'react';
import { getAuth, onAuthStateChanged, User, signOut } from 'firebase/auth';
import PrivateRoute from './components/PrivateRoute.tsx';
import ResetPage from './pages/reset.tsx';
import LoginPage from "./pages/Login.tsx";
import VerifyPage from './pages/VerifyPage.tsx';
import FinishEmailVerification from './pages/FinishEmailVerification.tsx';
import { checkPasswordStrength } from './utils/passwordStrength.ts';
import BackButton from './components/BackButton.tsx'; 
import SmartAnalysisReport from './components/SmartAnalysisReport.tsx';
import './components/SmartAnalysisReport.css';
import { useNavigate, useParams, Routes, Route, useLocation, Outlet, useOutletContext } from 'react-router-dom';
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
const UserHeader = ({ user, isAdmin } : { user: User, isAdmin: boolean }) => (
  <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid #ccc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <span>
      Welcome, <strong>{user.email}</strong>!
      {isAdmin && <span style={{color: 'red', marginLeft: '10px', fontWeight: 'bold'}}>(Admin)</span>}
    </span>
    <button onClick={() => signOut(getAuth())} style={{ padding: '8px 15px' }}>Logout</button>
  </div>
);
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
    useEffect(() => {
    // 仅当用户成功登录后执行
    if (user) {
      // 获取当前所在的页面路径
      const currentPath = window.location.hash.split('?')[0].replace('#', '');
      // 定义所有与认证相关的页面
      const authPages = ['/login', '/finish-email-verification', '/register', '/reset', '/verify'];
      
      // 如果用户当前在任何一个认证页面上，说明他刚刚完成了登录流程
      if (authPages.includes(currentPath)) {
        // 则将他导航到应用的主页
        navigate('/');
      }
    }
  }, [user, navigate]);
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
   const isPublicPlayPath = location.pathname.startsWith('/play/');

  // 只有当页面正在加载，并且访问的不是公开播放页时，才显示用户状态验证
  if (isLoading && !isPublicPlayPath) {
    return <div style={{ textAlign: 'center', marginTop: '50px' }}>Verifying user status...</div>;
  }
  return (
    <div style={{ padding: 24, fontFamily: 'Arial' }}>
      <Routes>
        {/* 公开路由 */}
        <Route path="/play/:funnelId" element={<QuizPlayer db={db} />} />
       <Route path="/login" element={<LoginPage />} />
       <Route path="/verify" element={<VerifyPage />} />
       <Route path="/finish-email-verification" element={<FinishEmailVerification />} />
        <Route path="/reset" element={<ResetPage />} />
        {/* 需要登录的路由 */}
        <Route
          path="/"
          element={
            !user
              ? <LoginPage />
              : <>
                  <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid #ccc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>
                      Welcome, <strong>{user.email}</strong>!
                      {isAdmin && <span style={{color: 'red', marginLeft: '10px', fontWeight: 'bold'}}>(Admin)</span>}
                    </span>
                    <button onClick={() => signOut(getAuth())} style={{ padding: '8px 15px' }}>Logout</button>
                  </div>
                  <FunnelDashboard
                    db={db}
                    user={user}
                    isAdmin={isAdmin}
                    funnels={funnels}
                    setFunnels={setFunnels}
                    createFunnel={createFunnel}
                    deleteFunnel={deleteFunnel}
                  />
                </>
          }
        />
           <Route
          path="/edit/:funnelId/*"  // 注意：这里末尾加了 "/*"
          element={
            !user
              ? <LoginPage />
              : (
                <>
                  <UserHeader user={user} isAdmin={isAdmin} />
                  {/* 注意：这里添加了 showNotification 属性 */}
                  <FunnelEditor db={db} updateFunnelData={updateFunnelData} showNotification={showNotification} />
                </>
              )
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
  
  const handleCopyLink = (funnelId: string) => {
  // 使用 window.location.href 获取完整的当前URL
  const baseUrl = window.location.href.split('#')[0];
  // 构建完整的funnel链接
  const url = `${baseUrl}/#/play/${funnelId}`;
  
  // 使用clipboard API
  navigator.clipboard.writeText(url).then(() => {
    // 使用自定义通知而不是alert
    showNotification('Funnel link copied to clipboard!');
  }).catch(err => {
    console.error('Failed to copy:', err);
    showNotification('Failed to copy link', 'error');
  });
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
                <button className="funnel-action-btn" onClick={() => handleCopyLink(funnel.id)}>Copy Link</button>
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

const useFunnelEditorContext = () => {
  return useOutletContext<{
    funnelId: string;
    funnelData: FunnelData;
    funnelName: string;
    setFunnelData: (updater: (prev: FunnelData) => FunnelData) => void;
   }>();
};

// 新的 FunnelEditor: 它现在只负责路由和数据加载
const FunnelEditor: React.FC<FunnelEditorProps> = ({ db, updateFunnelData, }) => {
  const { funnelId } = useParams<{ funnelId: string }>();
  const navigate = useNavigate();

  // 1. 将所有 useState 和 useEffect 从旧组件移动到这里
  const [funnelName, setFunnelName] = useState('Loading...');
  const [funnelData, setFunnelData] = useState<FunnelData | null>(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [debugLinkValue, setDebugLinkValue] = useState('Debug: N/A');
  
  // 2. 数据加载的 useEffect (保持不变)
  useEffect(() => {
    if (!funnelId) return;
    const funnelDocRef = doc(db, 'funnels', funnelId);
    const unsubscribe = onSnapshot(funnelDocRef, (funnelDoc) => {
      if (funnelDoc.exists()) {
        const funnel = funnelDoc.data() as Funnel;
        setFunnelName(funnel.name);
        
        const data = { ...defaultFunnelData, ...funnel.data };
        
        let compatibleQuestions = data.questions || [];
        compatibleQuestions = compatibleQuestions.map(question => {
          if (Array.isArray(question.answers)) {
            const answersObj: { [answerId: string]: Answer } = {};
            (question.answers as any[]).forEach((answer: any) => {
              answersObj[answer.id || `answer-${Date.now()}`] = answer;
            });
            return { ...question, answers: answersObj };
          }
          return question;
        });
        
        data.questions = compatibleQuestions;
        setFunnelData(data);
        setIsDataLoaded(true);
      } else {
        navigate('/');
      }
    }, (error) => {
      console.error("监听漏斗数据变化时出错:", error);
      navigate('/');
    });
    return () => unsubscribe();
  }, [funnelId, db, navigate]);

  // 3. 自动保存的 useCallback 和 useEffect (保持不变)
  const saveFunnelToFirestore = useCallback(() => {
    if (!funnelId || !funnelData) return;
    setDebugLinkValue(`Saving: ${funnelData.finalRedirectLink || 'Empty'}`);
    updateFunnelData(funnelId, funnelData);
  }, [funnelId, funnelData, updateFunnelData]);

  useEffect(() => {
    if (!isDataLoaded) return;
    const handler = setTimeout(() => saveFunnelToFirestore(), 500);
    return () => clearTimeout(handler);
  }, [funnelData, isDataLoaded, saveFunnelToFirestore]);

  // 封装 state 更新函数，以便自动保存
  const handleSetFunnelData = (updater: (prev: FunnelData) => FunnelData) => {
    setFunnelData(prevData => {
        if (!prevData) return null;
        return updater(prevData);
    });
  };

  if (!isDataLoaded || !funnelData) {
    return <div className="loading-message">Loading funnel...</div>;
  }
  
  // 4. 返回路由，而不是 renderEditorContent()
  return (
    <Routes>
      <Route 
        element={
            <Outlet context={{ funnelId, funnelData, funnelName, setFunnelData: handleSetFunnelData, updateFunnelData, showNotification, debugLinkValue }} />
        }>
        <Route path="/" element={<FunnelEditorDashboard />} />
        <Route path="questions" element={<QuizEditorComponent />} />
        <Route path="questions/:questionIndex" element={<QuestionFormComponent />} />
        <Route path="settings" element={<LinkSettingsComponent />} />
        <Route path="colors" element={<ColorCustomizerComponent />} />
        <Route path="analytics" element={<SmartAnalysisReportWrapper />} />
      </Route>
    </Routes>
  );
};

  const FunnelEditorDashboard: React.FC = () => {
    const { funnelId, funnelName, debugLinkValue } = useFunnelEditorContext();
    const navigate = useNavigate();
    return (
        <div className="dashboard-container">
            <h2><span role="img" aria-label="funnel">🥞</span> {funnelName} Editor</h2>
            <p>Manage components for this funnel.</p>
            <div className="dashboard-card" onClick={() => navigate(`/edit/${funnelId}/questions`)}>
                <h3><span role="img" aria-label="quiz">📝</span> Interactive Quiz Builder</h3>
                <p>Manage quiz questions for this funnel.</p>
            </div>
            <div className="dashboard-card" onClick={() => navigate(`/edit/${funnelId}/settings`)}>
                <h3><span role="img" aria-label="link">🔗</span> Final Redirect Link Settings</h3>
                <p>Configure the custom link where users will be redirected.</p>
            </div>
            <div className="dashboard-card" onClick={() => navigate(`/edit/${funnelId}/colors`)}>
                <h3><span role="img" aria-label="palette">🎨</span> Color Customization</h3>
                <p>Customize theme colors for this funnel.</p>
            </div>
            <div className="dashboard-card" onClick={() => navigate(`/edit/${funnelId}/analytics`)}>
                <h3><span role="img" aria-label="analytics">🚀</span> Smart Analysis</h3>
                <p>Get data-driven insights to boost your funnel's performance.</p>
            </div>
            <BackButton to="/">
                <span role="img" aria-label="back">←</span> Back to All Funnels
            </BackButton>
            <div style={{ marginTop: '20px', padding: '10px', border: '1px dashed #ccc', fontSize: '0.8em', wordBreak: 'break-all', textAlign: 'left' }}>
                <strong>DEBUG:</strong> {debugLinkValue}
            </div>
        </div>
    );
};


interface QuizPlayerProps {
  db: Firestore;
}

// 文件路径: src/App.tsx -> 请用这个版本替换旧的 QuizPlayer 组件

const QuizPlayer: React.FC<QuizPlayerProps> = ({ db }) => {
  const { funnelId } = useParams<{ funnelId: string }>();
  const navigate = useNavigate();

  const [funnelData, setFunnelData] = useState<FunnelData | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [clickedAnswerIndex, setClickedAnswerIndex] = useState<number | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // [中文注释] 从数据库加载漏斗数据... (这部分逻辑保持不变)
  useEffect(() => {
    const getFunnelForPlay = async () => {
      if (!funnelId) {
        setError('No funnel ID provided!');
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const funnelDocRef = doc(db, 'funnels', funnelId);
        const funnelDoc = await getDoc(funnelDocRef);
        if (funnelDoc.exists()) {
          const funnel = funnelDoc.data() as Funnel;
          
          // Add backward compatibility: convert answers from array to object if needed
          const compatibleFunnelData = { ...defaultFunnelData, ...funnel.data };
          if (compatibleFunnelData.questions) {
            compatibleFunnelData.questions = compatibleFunnelData.questions.map(question => {
              if (Array.isArray(question.answers)) {
                // Convert legacy array format to object format
                const answersObj: { [answerId: string]: Answer } = {};
                question.answers.forEach((answer: Answer) => {
                  answersObj[answer.id] = answer;
                });
                return { ...question, answers: answersObj };
              }
              return question; // Already in object format
            });
          }
          
          setFunnelData(compatibleFunnelData);
        } else {
          setError('Funnel not found!');
        }
      } catch (err) {
        console.error('Error loading funnel for play:', err);
        setError('Failed to load quiz.');
      } finally {
        setIsLoading(false);
      }
    };
    getFunnelForPlay();
  }, [funnelId, db]);

  // [中文注释] 关键升级：这是新的 handleAnswerClick 函数
  const handleAnswerClick = async (answerIndex: number, answerId: string) => {
  if (isAnimating || !funnelData) return;

  setIsAnimating(true);
  setClickedAnswerIndex(answerIndex);

   const affiliateLink = currentQuestion?.data?.affiliateLinks?.[answerIndex];

  // --- ↓↓↓ 健壮的点击追踪逻辑 ↓↓↓ ---
  if (funnelId && currentQuestion?.id && answerId) {
    try {
      const trackClickEndpoint = "https://api-track-click-jgett3ucqq-uc.a.run.app/trackClick";
      
      const response = await fetch(trackClickEndpoint, {
        method: "POST",
        mode: "cors",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: {
            funnelId: funnelId,
            questionId: currentQuestion.id,
            answerId: answerId,
          },
        }),
      });

      if (!response.ok) {
        // 即使追踪失败，也只是记录错误，不影响用户体验
        const errorText = await response.text();
        console.error("Failed to track click (API Error):", response.statusText, errorText);
      } else {
        const data = await response.json();
        console.log("Click tracked successfully:", data);
      }
    } catch (err) {
      // 捕获所有可能的错误 (网络错误, CORS 错误等)
      // 同样，只在控制台记录错误，不中断应用
      console.error("Failed to track click (Network or other error):", err);
    }
  }
  // --- ↑↑↑ 点击追踪逻辑结束 ↑↑↑ ---

  // [中文注释] 在新标签页中打开推广链接
  if (affiliateLink && affiliateLink.trim() !== "") {
    window.open(affiliateLink, "_blank");
  }

  // 动画和跳题逻辑 (保持不变)
  setTimeout(() => {
    setIsAnimating(false);
    setClickedAnswerIndex(null);
    if (!funnelData) return;

    const isLastQuestion = currentQuestionIndex >= funnelData.questions.length - 1;

    if (isLastQuestion) {
      const redirectLink = funnelData.finalRedirectLink;
      if (redirectLink && redirectLink.trim() !== "") {
        window.location.href = redirectLink;
      } else {
        console.log("Quiz complete! No final redirect link set.");
      }
      return;
    }

    setCurrentQuestionIndex(currentQuestionIndex + 1);
  }, 500);
};
  
  // [中文注释] 组件的 JSX 渲染部分保持不变...
  if (isLoading) {
    return (
      <div className="quiz-player-container" style={{ textAlign: 'center', marginTop: '80px' }}>
        <h2 style={{ fontSize: '32px', fontWeight: 'bold', color: '#ff4f81', animation: 'pulse 1.5s infinite' }}>
          Ready to unlock your secret match? 🔥
        </h2>
      </div>
    );
  }

  if (error || !funnelData || funnelData.questions.length === 0) {
    return (
      <div className="quiz-player-container">
        <h2>{error ? 'Error Loading Quiz' : 'Quiz Not Ready'}</h2>
        <p>{error || 'This funnel has no questions configured.'}</p>
      </div>
    );
  }

   const currentQuestion = funnelData.questions[currentQuestionIndex];

  // 2. 增加一个防御性检查：如果 currentQuestion 因为某种原因不存在，就显示加载状态
  if (!currentQuestion) {
    return (
      <div className="quiz-player-container">
        <p>Loading next question...</p>
      </div>
    );
  }

  // 3. 现在可以安全地使用 currentQuestion 了
  const sortedAnswers = (currentQuestion.answers 
    ? Object.values(currentQuestion.answers) 
    : []
  ).sort((a, b) => a.text.localeCompare(b.text));

  const quizPlayerContainerStyle = {
    '--primary-color': funnelData.primaryColor,
    '--button-color': funnelData.buttonColor,
    '--background-color': funnelData.backgroundColor,
    '--text-color': funnelData.textColor,
  } as React.CSSProperties;
    
  return (
    <div className="quiz-player-container" style={quizPlayerContainerStyle}>
      {/* --- 安全性增强：在访问 title 之前也检查 currentQuestion --- */}
      <h3 style={{ color: 'var(--text-color)' }}>{currentQuestion?.title || 'Loading question...'}</h3>
      <div className="quiz-answers-container">
 {sortedAnswers.map((answer, index) => {
  const match = answer.text.match(/^([A-Z]\.)\s*(.*)$/);
  const prefix = match ? match[1] : "";
  const content = match ? match[2] : answer.text;

  return (
    <button
      key={answer.id}
      className={`quiz-answer-button ${clickedAnswerIndex === index ? 'selected-answer animating' : ''}`}
      onClick={() => handleAnswerClick(index, answer.id)}
      disabled={isAnimating}
      style={{ backgroundColor: 'var(--button-color)', color: 'var(--text-color)', borderColor: 'var(--primary-color)' }}
      >
      <span className="answer-prefix">{prefix}</span>
      <span className="answer-content">{content}</span>
    </button>
  );
})}
      </div>
    </div>
  );
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

const QuizEditorComponent: React.FC = () => {
    const { funnelId, funnelData, setFunnelData } = useFunnelEditorContext();
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [templateFiles, setTemplateFiles] = useState<string[]>([]);
    const questions = funnelData.questions;

    useEffect(() => {
        const availableTemplates = [
            'education-learning.json', 'entrepreneurship-business.json', 'fitness-health.json',
            'marketing-funnel.json', 'personal-growth.json',
        ];
        setTemplateFiles(availableTemplates);
    }, []);

    const setQuestions = (updater: (prev: Question[]) => Question[]) => {
        setFunnelData(prev => ({...prev, questions: updater(prev.questions)}));
    };
  
    const handleAddQuestion = () => {
        if (questions.length >= 6) {
          setNotification('You can only have up to 6 questions for this quiz.', 'error');
          return;
        }
        const newQuestion: Question = {
          id: `question-${Date.now()}`,
          title: `New Question ${questions.length + 1}`,
          type: 'single-choice',
          answers: {},
        };
        for (let i = 0; i < 4; i++) {
            const answerId = `answer-${Date.now()}-${i}`;
            newQuestion.answers[answerId] = { id: answerId, text: `Option ${String.fromCharCode(65 + i)}`, clickCount: 0 };
        }
        const newQuestions = [...questions, newQuestion];
        setQuestions(() => newQuestions);
        navigate(`/edit/${funnelId}/questions/${newQuestions.length - 1}`);
    };
    
    const handleSelectTemplate = async (templateName: string) => {
        if (questions.length >= 6) {
            setNotification('Cannot add from template, the 6-question limit has been reached.', 'error');
            return;
        }
        try {
            const response = await fetch(`${process.env.PUBLIC_URL}/templates/${templateName}.json`);
            if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);
            const templateData = await response.json();
            if (!Array.isArray(templateData)) throw new Error("Template format is invalid.");
            const newQuestionsWithIds: Question[] = templateData.map((q: any, qIndex: number) => {
                const questionId = `question-${Date.now()}-${qIndex}`;
                const answersObj: { [answerId: string]: Answer } = {};
                if (Array.isArray(q.answers)) {
                    q.answers.forEach((ans: any, aIndex: number) => {
                        if (ans && typeof ans.text === 'string') {
                            const answerId = `answer-${Date.now()}-${qIndex}-${aIndex}`;
                            answersObj[answerId] = { id: answerId, text: ans.text.trim(), clickCount: 0 };
                        }
                    });
                }
                return { ...q, id: questionId, type: 'single-choice', answers: answersObj };
            });
            if (questions.length + newQuestionsWithIds.length > 6) {
                setNotification(`Cannot add all questions, it would exceed the 6-question limit.`, 'error');
                return;
            }
            setQuestions(prev => [...prev, ...newQuestionsWithIds]);
            setNotification(`Template "${templateName}" loaded successfully!`, 'success');
        } catch (error) {
            console.error('Error loading template:', error);
            setNotification((error as Error).message || 'Failed to load the template.', 'error');
        }
    };

    const handleImportQuestions = (importedQuestions: Question[]) => {
      try {
        if (questions.length + importedQuestions.length > 6) {
          setNotification(`Cannot import. This funnel already has ${questions.length} questions. Importing ${importedQuestions.length} more would exceed the 6-question limit.`, 'error');
          return;
        }
    
        const validImportedQuestions = importedQuestions.filter(
          (q) => {
            const hasValidTitle = q.title && typeof q.title === 'string' && q.title.trim() !== '';
            const hasValidAnswersObject = typeof q.answers === 'object' && q.answers !== null && Object.keys(q.answers).length > 0;
            const allAnswersHaveText = hasValidAnswersObject ? Object.values(q.answers).every((a) => a.text && typeof a.text === 'string' && a.text.trim() !== '') : false;
            return hasValidTitle && hasValidAnswersObject && allAnswersHaveText;
          }
        );
    
        if (validImportedQuestions.length === 0) {
          setNotification('No valid questions found in the imported file. Please check the file format (title and answer text are required)','error');
          return;
        }
    
        setQuestions((prevQuestions) => [...prevQuestions, ...validImportedQuestions]);
        setNotification(`Successfully imported ${validImportedQuestions.length} questions!`, 'success');
      } catch (err) {
        setNotification('Error reading or parsing JSON file. Please check file format.', 'error');
      }
    };
    
    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
        setNotification('Please select a JSON file.', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          handleImportQuestions(JSON.parse(content));
        } catch (err) {
          setNotification('Error reading or parsing JSON file. Please check file format.', 'error');
        }
      };
      reader.readAsText(file);
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="quiz-editor-container">
            <h2><span role="img" aria-label="quiz">📝</span> Quiz Question List</h2>
            <div className="quiz-editor-actions">
                <button className="add-button" onClick={handleAddQuestion}><span role="img" aria-label="add">➕</span> Add New Question</button>
                <button className="import-button" onClick={triggerFileInput}><span role="img" aria-label="import">📥</span> Import Questions</button>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" style={{ display: 'none' }} />
            </div>
            <div style={{ textAlign: 'center', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
                <h3 style={{ marginBottom: '15px' }}>Or, start with a template:</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
                {templateFiles.length > 0 ? (
                    templateFiles.map(fileName => {
                    const buttonLabel = fileName.replace('.json', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    return (
                        <button key={fileName} className="template-btn" onClick={() => handleSelectTemplate(fileName.replace('.json', ''))}>
                        {buttonLabel}
                        </button>
                    );
                    })
                ) : <p>Loading templates...</p>}
                </div>
            </div>
            {questions.length === 0 ? (
                <p className="no-questions-message">No questions added yet. Click "Add New Question" or "Import Questions" to start!</p>
            ) : (
                <ul className="question-list">
                {questions.map((q, index) => (
                    <li key={q.id || index} className="question-item" onClick={() => navigate(`/edit/${funnelId}/questions/${index}`)}>
                    Question {index + 1}: {q.title}
                    </li>
                ))}
                </ul>
            )}
            <BackButton onClick={() => navigate(`/edit/${funnelId}`)}>
                <span role="img" aria-label="back">←</span> Back to Funnel Dashboard
            </BackButton>
        </div>
    );
};

interface QuestionFormComponentProps {
  question?: Question;
  questionIndex: number | null;
  onSave: (question: Question) => void;
  onCancel: () => void;
  onDelete: () => void;
}

const QuestionFormComponent: React.FC = () => {
    const { funnelId, funnelData, setFunnelData, showNotification } = useFunnelEditorContext();
    const { questionIndex: questionIndexStr } = useParams<{ questionIndex: string }>();
    const navigate = useNavigate();
    const questionIndex = parseInt(questionIndexStr!, 10);
    const question = funnelData.questions[questionIndex];

    const [title, setTitle] = useState(question?.title || '');
    const [answers, setAnswers] = useState(question ? Object.values(question.answers) : []);
    const [affiliateLinks, setAffiliateLinks] = useState(question?.data?.affiliateLinks || Array(4).fill(''));
    
    useEffect(() => {
        if (question) {
            setTitle(question.title);
            setAnswers(Object.values(question.answers));
            setAffiliateLinks(question.data?.affiliateLinks || Array(4).fill(''));
        }
    }, [question]);

    const handleSave = () => {
        const answersObj: { [answerId: string]: Answer } = {};
        answers.forEach(ans => {
            if(ans.text.trim()) answersObj[ans.id] = ans;
        });

        const updatedQuestion: Question = {
            ...question,
            title,
            answers: answersObj,
            data: { affiliateLinks },
        };
        
        setFunnelData(prev => {
            const newQuestions = [...prev.questions];
            newQuestions[questionIndex] = updatedQuestion;
            return {...prev, questions: newQuestions};
        });
        setowNotification('Question saved!', 'success');
        navigate(`/edit/${funnelId}/questions`);
    };

    const onDelete = () => {
        setFunnelData(prev => ({
            ...prev,
            questions: prev.questions.filter((_, i) => i !== questionIndex)
        }));
        setNotification('Question deleted.', 'success');
        navigate(`/edit/${funnelId}/questions`);
    };

    const onCancel = () => {
        navigate(`/edit/${funnelId}/questions`);
    };

    if (!question) {
        useEffect(() => { navigate(`/edit/${funnelId}/questions`, { replace: true }); }, [funnelId, navigate]);
        return null;
    }

    const handleAnswerTextChange = (id: string, newText: string) => {
        setAnswers(currentAnswers => currentAnswers.map(ans => ans.id === id ? { ...ans, text: newText } : ans));
    };

    const handleLinkChange = (index: number, value: string) => {
        const updatedLinks = [...affiliateLinks];
        updatedLinks[index] = value;
        setAffiliateLinks(updatedLinks);
    };

    return (
        <div className="question-form-container">
            <h2><span role="img" aria-label="edit">📝</span> Quiz Question Editor</h2>
            <p className="question-index-display">Editing Question {questionIndex + 1}</p>
            <div className="form-group">
                <label>Question Title:</label>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., What's your biggest health concern?"
                />
            </div>
            <div className="answer-options-section">
                <p>Answer Options & Links:</p>
                {answers.map((answer, index) => (
                    <div key={answer.id} className="answer-input-group">
                        <input
                            type="text"
                            value={answer.text}
                            onChange={(e) => handleAnswerTextChange(answer.id, e.target.value)}
                            placeholder={`Option ${String.fromCharCode(65 + index)}`}
                        />
                        <input
                            type="url"
                            value={affiliateLinks[index] || ''}
                            onChange={(e) => handleLinkChange(index, e.target.value)}
                            placeholder="Affiliate link (optional)"
                            className="affiliate-link-input"
                        />
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 12px', backgroundColor: '#f0f0f0', borderRadius: '6px', marginTop: '5px', width: '100%', color: '#333', fontSize: '14px', cursor: 'default' }}>
                            <span role="img" aria-label="clicks" style={{ marginRight: '8px' }}>👁️</span>
                            <strong>{answer.clickCount || 0} clicks</strong>
                        </div>
                    </div>
                ))}
            </div>
            <div className="form-actions">
                <button className="save-button" onClick={handleSave}><span role="img" aria-label="save">💾</span> Save Question</button>
                <button className="cancel-button" onClick={onCancel}><span role="img" aria-label="cancel">←</span> Back to List</button>
                <button className="delete-button" onClick={onDelete}><span role="img" aria-label="delete">🗑️</span> Delete Question</button>
            </div>
        </div>
    );
};

const LinkSettingsComponent: React.FC = () => {
    const { funnelId, funnelData, setFunnelData, showNotification } = useFunnelEditorContext();
    const navigate = useNavigate();
    
    return (
        <div className="link-settings-container">
          <h2><span role="img" aria-label="link">🔗</span> Final Redirect Link Settings</h2>
          <p>This is the custom link where users will be redirected after completing the quiz.</p>
          <div className="form-group">
            <label>Custom Final Redirect Link:</label>
            <input
              type="text"
              value={funnelData.finalRedirectLink}
              onChange={(e) => setFunnelData(prev => ({...prev, finalRedirectLink: e.target.value}))}
              placeholder="https://your-custom-product-page.com"
            />
          </div>
          <div className="form-group">
            <label>Optional: Tracking Parameters:</label>
            <input
              type="text"
              value={funnelData.tracking}
              onChange={(e) => setFunnelData(prev => ({...prev, tracking: e.target.value}))}
              placeholder="utm_source=funnel&utm_campaign=..."
            />
          </div>
          <div className="form-group">
            <label>Conversion Goal:</label>
            <select value={funnelData.conversionGoal} onChange={(e) => setFunnelData(prev => ({...prev, conversionGoal: e.target.value}))}>
              <option>Product Purchase</option>
              <option>Email Subscription</option>
              <option>Free Trial</option>
            </select>
          </div>
          <div className="form-actions">
          <button className="save-button" onClick={() => showNotification('Settings applied! (Auto-saved)')}>
          <span role="img" aria-label="save">💾</span> Applied
           </button>
            <BackButton onClick={() => navigate(`/edit/${funnelId}`)}>
                <span role="img" aria-label="back">←</span> Back to Editor
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
  
}

const ColorCustomizerComponent: React.FC = () => {
    const { funnelId, funnelData, setFunnelData, } = useFunnelEditorContext();
    const navigate = useNavigate();

    return (
        <div className="color-customizer-container">
          <h2><span role="img" aria-label="palette">🎨</span> Color Customization</h2>
          <p>Customize theme colors for this funnel. (Changes are auto-saved).</p>
          <div className="form-group">
            <label>Primary Color:</label>
            <input type="color" value={funnelData.primaryColor} onChange={(e) => setFunnelData(prev => ({...prev, primaryColor: e.target.value}))} />
          </div>
          <div className="form-group">
            <label>Button Color:</label>
            <input type="color" value={funnelData.buttonColor} onChange={(e) => setFunnelData(prev => ({...prev, buttonColor: e.target.value}))} />
          </div>
          <div className="form-group">
            <label>Background Color:</label>
            <input type="color" value={funnelData.backgroundColor} onChange={(e) => setFunnelData(prev => ({...prev, backgroundColor: e.target.value}))} />
          </div>
          <div className="form-group">
            <label>Text Color:</label>
            <input type="color" value={funnelData.textColor} onChange={(e) => setFunnelData(prev => ({...prev, textColor: e.target.value}))} />
          </div>
          <div className="form-actions">
            <button className="save-button" onClick={() => showNotification('Color settings applied! (Auto-saved)')}>
            <span role="img" aria-label="save">💾</span> Applied
            </button>
            <BackButton onClick={() => navigate(`/edit/${funnelId}`)}>
                <span role="img" aria-label="back">←</span> Back to Editor
            </BackButton>
          </div>
        </div>
    );
};
const SmartAnalysisReportWrapper: React.FC = () => {
    const { funnelId, funnelData } = useFunnelEditorContext();
    const navigate = useNavigate();
    return (
        <SmartAnalysisReport 
            questions={funnelData.questions}
            finalRedirectLink={funnelData.finalRedirectLink}
            onBack={() => navigate(`/edit/${funnelId}`)}
        />
    );
};
