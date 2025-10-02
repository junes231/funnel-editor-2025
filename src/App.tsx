import React, { useState, useEffect, useCallback, useRef, ChangeEvent } from 'react';
import { getAuth, onAuthStateChanged, User, signOut } from 'firebase/auth';
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
        <Route path="/play/:funnelId" element={<QuizPlayer />} />

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
  // 验证 funnelId
  if (!funnelId || typeof funnelId !== 'string') {
    showNotification('Invalid funnel ID', 'error');
    return;
  }

  // 使用 window.location.origin 构建基础 URL
  const baseUrl = window.location.origin;
  // 结合 homepage 路径（假设已设为 /funnel-editor-2025/）
  const fullUrl = `${baseUrl}/funnel-editor-2025/#/play/${funnelId}`;

  // 使用 clipboard API
  navigator.clipboard
    .writeText(fullUrl)
    .then(() => {
      // 自定义通知
      showNotification('Funnel link copied to clipboard!');
    })
    .catch((err) => {
      console.error('Failed to copy:', err);
      showNotification('Failed to copy link', 'error');
      // Fallback: 提示用户手动复制
      prompt('Copy this link manually:', fullUrl);
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
  const initialSubView = new URLSearchParams(location.search).get('view') || 'mainEditorDashboard';
  const [currentSubView, _setCurrentSubView] = useState(urlView);
  const [templateFiles, setTemplateFiles] = useState<string[]>([]);
  const [debugLinkValue, setDebugLinkValue] = useState('Debug: N/A');
   const urlParams = new URLSearchParams(location.search);
const urlIndex = urlParams.get('index');
// 如果 view 是 questionForm，则解析 index，否则设为 null
const selectedQuestionIndex = (urlView === 'questionForm' && urlIndex !== null) 
    ? parseInt(urlIndex) : null;
const questionToEdit = selectedQuestionIndex !== null ? questions[selectedQuestionIndex] : undefined;
  const setCurrentSubView = useCallback((newView: string, index: number | null = null) => {
    const newParams = new URLSearchParams();
      if (newView !== 'mainEditorDashboard') {
          newParams.set('view', newView);
      }
      if (index !== null) {
          newParams.set('index', String(index));
      }
    
    // 3. 使用 navigate 更新 URL，保持在 /edit/:funnelId 路径上，并将新 URL 替换历史记录中的当前条目
    navigate({
          pathname: location.pathname,
          search: newParams.toString()
      }, { replace: true });

      // 3. 立即更新内部状态，以确保即使 URL 更新缓慢，UI 也能响应
      _setCurrentSubView(newView);
  }, [location, navigate]);

  useEffect(() => {
    const newView = new URLSearchParams(location.search).get('view') || 'mainEditorDashboard';
    if (newView !== _currentSubView) {
        _setCurrentSubView(newView); 
    }
  }, [location.search, _currentSubView]); 
 
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
          const answersObj: { [answerId: string]: Answer } = {};
          question.answers.forEach((answer: Answer) => {
            answersObj[answer.id] = answer;
          });
          return { ...question, answers: answersObj };
        }
        return question;
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
      navigate('/');
    }
  }, (error) => {
    console.error("监听漏斗数据变化时出错:", error);
    console.error('Failed to load funnel data.', 'error');  // ✅ 添加通知
    navigate('/');
  });

  return () => {
    unsubscribe();
  };
}, [funnelId, db, navigate]);

  const saveFunnelToFirestore = useCallback(() => {
  if (!funnelId) return;

  // ↓↓↓ 增强防御性检查：在保存前确保 questions 是一个数组 ↓↓↓
  const questionsToSave = Array.isArray(questions) ? questions : [];

  const newData: FunnelData = {
    questions: questionsToSave, // 使用安全的数组
    finalRedirectLink,
    tracking,
    conversionGoal,
    primaryColor,
    buttonColor,
    backgroundColor,
    textColor,
  };
  
  // 检查关键数据：如果问题列表为空且我们正在加载模板，则跳过此次自动保存
  // 避免在数据加载过程中，Firestore 自动监听器将中间的空状态写回去
  if (questionsToSave.length === 0 && isDataLoaded) {
      console.log('Skipping auto-save: Question list is empty.');
      return;
  }
  // ↑↑↑ 增强防御性检查 ↑↑↑

  updateFunnelData(funnelId, newData);
}, [funnelId, questions, finalRedirectLink, tracking, conversionGoal, primaryColor, buttonColor, backgroundColor, textColor, updateFunnelData, isDataLoaded]); 

  useEffect(() => {
    if (!isDataLoaded) return;
    const handler = setTimeout(() => {
      saveFunnelToFirestore();
    }, 500);
    return () => clearTimeout(handler);
  }, [
    questions,
    finalRedirectLink,
    tracking,
    conversionGoal,
    primaryColor,
    buttonColor,
    backgroundColor,
    textColor,
    saveFunnelToFirestore,
  ]);
  // 在 FunnelEditor 组件内部，可以放在 saveFunnelToFirestore 函数的下面
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
              clickCount: 0 // 初始化点击次数
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
      return;
    }
    const newQuestion: Question = {
      id: Date.now().toString(),
      title: `New Question ${questions.length + 1}`,
      type: 'single-choice',
      answers: Array(4)
        .fill(null)
        .map((_, i) => ({ id: `option-${Date.now()}-${i}`, text: `Option ${String.fromCharCode(65 + i)}` })),
    };
    setQuestions([...questions, newQuestion]);
    
    setCurrentSubView('questionForm?index=' + questions.length);
  };

  const handleEditQuestion = (index: number) => {
    // 调用修复后的 setCurrentSubView，传入 view 名称和 index
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
    switch (_currentSubView) {
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
          // 动画逻辑，然后返回到问题列表页
          const button = document.querySelector('.cancel-button');
          if (button) {
              button.classList.add('animate-out');
              setTimeout(() => {
                  setCurrentSubView('quizEditorList'); 
              }, 1000);
          } else {
              // 确保在没有动画元素时也能跳转
              setCurrentSubView('quizEditorList');
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
  onCancel, // --- MODIFIED: Renamed from onClose for clarity if needed, or keep as is.
  onDelete,
  onUpdate,
}) => {
  // --- UNCHANGED: Navigation logic remains the same ---
  const navigate = useNavigate();

  // --- REMOVED: Internal state for title, answers, and answerOrder are removed ---
  // const [title, setTitle] = useState(...);
  // const [answers, setAnswers] = useState(...);
  // const [answerOrder, setAnswerOrder] = useState(...);

  // --- UNCHANGED: State for UI effects and affiliate links is kept ---
  const [affiliateLinks, setAffiliateLinks] = useState<string[]>(
    question?.data?.affiliateLinks || []
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // --- REMOVED: The complex useEffect for syncing props to state is no longer needed ---
  // useEffect(() => { ... }, [question]);

  // --- MODIFIED: Create a stable, sorted array for rendering ---
  // This solves the "answer order is messy" problem permanently.
  // It directly uses the 'question' prop, solving the "uploaded file not showing" problem.
  // 中文注释：移除 .sort(...) 部分，以解决移动端输入问题
const stableAnswers = React.useMemo(() => {
    if (!question) return [];
    return Object.values(question.answers).sort((a, b) => a.id.localeCompare(b.id));
  }, [question]);


  // --- UNCHANGED: Helper functions can be kept if used elsewhere, but are not needed for rendering now ---
  const convertAnswersArrayToObject = (answersArray: Answer[]): { [answerId: string]: Answer } => {
    const answersObj: { [answerId: string]: Answer } = {};
    answersArray.forEach(answer => {
      answersObj[answer.id] = answer;
    });
    return answersObj;
  };

  const convertAnswersObjectToArray = (answersObj: { [answerId:string]: Answer }): Answer[] => {
    return Object.values(answersObj);
  };
  
  // --- MODIFIED: Event handlers now create an updated question object and pass it up ---
  const handleTitleChange = (newTitle: string) => {
    if (question) {
      onUpdate({ ...question, title: newTitle });
    }
  };

  const handleAnswerTextChange = (answerId: string, newText: string) => {
    if (question) {
      const updatedAnswers = {
        ...question.answers,
        [answerId]: { ...question.answers[answerId], text: newText },
      };
      onUpdate({ ...question, answers: updatedAnswers });
    }
  };

  // --- UNCHANGED: Affiliate link logic remains the same ---
  const handleLinkChange = (index: number, value: string) => {
  if (!question || !stableAnswers[index]) return;

  // 仅更新本地的 affiliateLinks 数组状态
  const newLinks = [...affiliateLinks];
  newLinks[index] = value;
  setAffiliateLinks(newLinks);
};
  
const handleSave = async () => {
    if (!question) return;

    setIsSaving(true);
    try {
      
      const newAnswersMap: { [answerId: string]: Answer } = {};
      let hasValidAnswer = false;
      
      // 1. 迭代 stableAnswers（这个数组包含了最新的文本和 clickCount）
      // stableAnswers 是通过 React.useMemo 从 question.answers 派生的，包含所有属性
      stableAnswers.forEach((answer) => {
          const currentText = answer.text.trim();
          
          if (currentText !== "") {
              // 2. 关键修复：将完整的 Answer 对象（包括 clickCount）传播到新的 Map 中
              newAnswersMap[answer.id] = {
                  ...answer, // 这一行至关重要：它继承了 clickCount 属性
                  text: currentText, // 确保使用最新的、已修剪的文本
              };
              hasValidAnswer = true;
          }
      });
      
      // 检查标题和答案数量...
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

      // Preserve affiliate links logic
      const cleanAffiliateLinks = Array.from({ length: 4 }).map((_, index) => affiliateLinks[index] || '');
      
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // The final object is passed up to the parent component
      onUpdate({
        ...question,
        answers: newAnswersMap, // 使用安全构建的 Map
        data: { affiliateLinks: cleanAffiliateLinks },
      });

      onSaveAndClose();

    } catch (error) {
      console.error("Error saving question:", error);
    } finally {
      setIsSaving(false);
    }
  };
  
  // --- UNCHANGED: Cancel and Delete logic remains the same ---
  
  // --- 恢复您设计的 Delete 按钮动画和跳转逻辑 ---
   const handleDelete = () => {
  setIsDeleting(true);
  const button = document.querySelector('.delete-button');
  if (button) {
    button.classList.add('animate-out');
  }
  setTimeout(() => {
    onDelete();  // 使用props的onDelete，而不是setFunnelData
  }, 1000);
};
  // Defensive check: If for some reason no question is provided, render nothing.
  if (!question) {
    return <div>Loading question...</div>;
  }

  // --- MODIFIED: The JSX now reads directly from `question` prop and `sortedAnswers` array ---
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
          value={question?.title || ''} 
    onChange={(e) => handleTitleChange(e.target.value)}
    placeholder="e.g., What's your biggest health concern?"
        />
      </div>
      <div className="form-group">
        <label>Question Type:</label>
        <select value={question?.type || 'single-choice'} onChange={() => {}} disabled>
    <option>Single Choice</option>
          <option>Multiple Choice (Coming Soon)</option>
          <option>Text Input (Coming Soon)</option>
        </select>
      </div>
      <div className="answer-options-section">
        <p>Answer Options (Max 4):</p>
        {/* Use the stable sortedAnswers array for rendering */}
        {stableAnswers.map((answer, index) => (
          <div key={answer.id} className="answer-input-group">
    <input type="text" value={answer.text || ''}  onChange={(e) => handleAnswerTextChange(answer.id, e.target.value)} />
    <input type="url" value={affiliateLinks[index] || ''} onChange={(e) => handleLinkChange(index, e.target.value)} placeholder="Affiliate link (optional)" />
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
        <button className="cancel-button" onClick={handleCancel}>
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
          value={finalRedirectLink}
          onChange={(e) => setFinalRedirectLink(e.target.value)}
          placeholder="https://your-custom-product-page.com"
        />
      </div>
      <div className="form-group">
        <label>Optional: Tracking Parameters:</label>
        <input
          type="text"
          value={tracking}
          onChange={(e) => setTracking(e.target.value)}
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
  
  {/* 移除功能冗余的 Back to Editor 按钮 */}
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
  
  {/* 移除功能冗余的 Back to Editor 按钮 */}
</div>
    </div>
  );
};
