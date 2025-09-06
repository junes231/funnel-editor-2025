import React, { useState, useEffect, useCallback, useRef, ChangeEvent } from 'react';
import { getAuth, onAuthStateChanged, User, signOut } from 'firebase/auth';
import PrivateRoute from './components/PrivateRoute.tsx';
import ResetPage from './pages/reset.tsx';
import LoginPage from "./pages/Login.tsx";
import VerifyPage from './pages/VerifyPage.tsx';
import FinishEmailVerification from './pages/FinishEmailVerification.tsx';
import { checkPasswordStrength } from './utils/passwordStrength.ts';
import { useNavigate, useParams, Routes, Route } from 'react-router-dom';
import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  Firestore,
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
}

interface Question {
  id: string;
  title: string;
  type: 'single-choice' | 'text-input';
  answers: Answer[];
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

  // New state variables to manage authentication and user roles
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
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
  useEffect(() => {
   const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      // 只有当用户存在且邮箱已验证时，我们才认为他是有效登录用户
      if (currentUser && currentUser.emailVerified) {
        try {
          // 为确保状态最新，重新加载用户信息
          await currentUser.reload();
          // 再次检查，防止在 reload 期间状态发生变化
          if (currentUser.emailVerified) {
            setUser(currentUser);
            const idTokenResult = await currentUser.getIdTokenResult(true);
            setIsAdmin(idTokenResult.claims.role === 'admin');
          } else {
            // 如果 reload 后发现邮箱未验证，则视为未登录
            setUser(null);
            setIsAdmin(false);
          }
        } catch (error) {
          console.error('Error reloading user:', error);
          setUser(null);
          setIsAdmin(false);
        }
      } else {
        // 对于所有其他情况（用户不存在，或邮箱未验证），都视为未登录
        setUser(null);
        setIsAdmin(false);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

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
  if (user && isLoading) {
    return <div style={{ textAlign: 'center', marginTop: '50px', fontFamily: 'Arial' }}>Loading user data...</div>;
  }

  return (
    <div style={{ padding: 24, fontFamily: 'Arial' }}>
      <Routes>
        {/* 公开路由 */}
        <Route path="/play/:funnelId" element={<QuizPlayer db={db} />} />
       <Route path="/login" element={<LoginPage />} />
       <Route path="/verify" element={<VerifyPage />} />
       <Route path="/finish-email-verification" element={<FinishEmailVerification />} />
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
          path="/edit/:funnelId"
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
                  <FunnelEditor db={db} updateFunnelData={updateFunnelData} />
                </>
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
                <button className="button-link" onClick={() => navigate(`/edit/${funnel.id}`)}>Edit</button>
                <button className="button-link" onClick={() => navigate(`/play/${funnel.id}`)}>Play</button>
                <button className="button-link" onClick={() => handleCopyLink(funnel.id)}>Copy Link</button>
                <button className="button-link delete-button" onClick={() => handleDeleteFunnel(funnel.id)}>Delete</button>
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
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentSubView, setCurrentSubView] = useState('mainEditorDashboard');

  const [debugLinkValue, setDebugLinkValue] = useState('Debug: N/A');

  useEffect(() => {
    const getFunnel = async () => {
      if (!funnelId) return;
      const funnelDocRef = doc(db, 'funnels', funnelId);
      const funnelDoc = await getDoc(funnelDocRef);
      if (funnelDoc.exists()) {
        const funnel = funnelDoc.data() as Funnel;
        setFunnelName(funnel.name);
        setQuestions(funnel.data.questions || []);
        setFinalRedirectLink(funnel.data.finalRedirectLink || '');
        setTracking(funnel.data.tracking || '');
        setConversionGoal(funnel.data.conversionGoal || 'Product Purchase');
        setPrimaryColor(funnel.data.primaryColor || defaultFunnelData.primaryColor);
        setButtonColor(funnel.data.buttonColor || defaultFunnelData.buttonColor);
        setBackgroundColor(funnel.data.backgroundColor || defaultFunnelData.backgroundColor);
        setTextColor(funnel.data.textColor || defaultFunnelData.textColor);

        const loadedLink = funnel.data.finalRedirectLink || 'Empty';
        setDebugLinkValue(`Loaded: ${loadedLink}`);
        console.log('FunnelEditor: Loaded finalRedirectLink from Firestore:', loadedLink);
        setIsDataLoaded(true);
      } else {
        alert('Funnel not found!');
        navigate('/');
      }
    };
    getFunnel();
  }, [funnelId, db, navigate]);

  const saveFunnelToFirestore = useCallback(() => {
    if (!funnelId) return;
    const newData: FunnelData = {
      questions,
      finalRedirectLink,
      tracking,
      conversionGoal,
      primaryColor,
      buttonColor,
      backgroundColor,
      textColor,
    };
    setDebugLinkValue(`Saving: ${finalRedirectLink || 'Empty'}`);
    console.log('FunnelEditor: Saving finalRedirectLink to Firestore:', finalRedirectLink);
    updateFunnelData(funnelId, newData);
  }, [
    funnelId,
    questions,
    finalRedirectLink,
    tracking,
    conversionGoal,
    primaryColor,
    buttonColor,
    backgroundColor,
    textColor,
    updateFunnelData,
  ]);

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

  const handleAddQuestion = () => {
    if (questions.length >= 6) {
      alert('You can only have up to 6 questions for this quiz.');
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
    setSelectedQuestionIndex(questions.length);
    setCurrentSubView('questionForm');
  };

  const handleEditQuestion = (index: number) => {
    setSelectedQuestionIndex(index);
    setCurrentSubView('questionForm');
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
    setSelectedQuestionIndex(null);
    setCurrentSubView('funnelEditor'); // 返回漏斗编辑页
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
      (q) =>
        q.title &&
        typeof q.title === 'string' &&
        q.title.trim() !== '' &&
        Array.isArray(q.answers) &&
        q.answers.length > 0 &&
        q.answers.every((a) => a.text && typeof a.text === 'string' && a.text.trim() !== '')
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
          />
        );
      case 'questionForm':
        const questionToEdit = selectedQuestionIndex !== null ? questions[selectedQuestionIndex] : undefined;
        return (
          <QuestionFormComponent
            question={questionToEdit}
            questionIndex={selectedQuestionIndex}
            onSave={(q) => {
              setQuestions((prev) => {
                if (selectedQuestionIndex === null) return prev;
                const next = [...prev];
                next[selectedQuestionIndex] = q;
                return next;
              });
              setSelectedQuestionIndex(null);
              setCurrentSubView('quizEditorList');
            }}
            onCancel={handleCancel}
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
            <button className="back-button" onClick={() => navigate('/')}>
              <span role="img" aria-label="back">
                ←
              </span>{' '}
              Back to All Funnels
            </button>
            <div style={{ marginTop: '20px', padding: '10px', border: '1px dashed #ccc', fontSize: '0.8em', wordBreak: 'break-all', textAlign: 'left' }}>
              <strong>DEBUG:</strong> {debugLinkValue}
            </div>
          </div>
        );
    }
  };

  return <div className="App">{renderEditorContent()}</div>;
};

interface QuizPlayerProps {
  db: Firestore;
}

const QuizPlayer: React.FC<QuizPlayerProps> = ({ db }) => {
  const { funnelId } = useParams<{ funnelId: string }>();
  const navigate = useNavigate();

  const [funnelData, setFunnelData] = useState<FunnelData | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [clickedAnswerIndex, setClickedAnswerIndex] = useState<number | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          setFunnelData({ ...defaultFunnelData, ...funnel.data });
          console.log('QuizPlayer: Loaded funnel data for play:', funnel.data);
          console.log('QuizPlayer: Loaded finalRedirectLink for play:', funnel.data.finalRedirectLink);
        } else {
          setError('Funnel not found! Please check the link or contact the funnel creator.');
        }
      } catch (err) {
        console.error('Error loading funnel for play:', err);
        setError('Failed to load quiz. Please check your internet connection and Firebase rules.');
      } finally {
        setIsLoading(false);
      }
    };
    getFunnelForPlay();
  }, [funnelId, db]);

  const handleAnswerClick = (answerIndex: number) => {
    if (isAnimating || !funnelData) return;

    setIsAnimating(true);
    setClickedAnswerIndex(answerIndex);

    setTimeout(() => {
      setIsAnimating(false);
      setClickedAnswerIndex(null);

      if (!funnelData || funnelData.questions.length === 0) return;

      if (currentQuestionIndex === 5 && funnelData.questions.length === 6) {
        let redirectLink = funnelData.finalRedirectLink || 'https://example.com/default-final-redirect-link';

        if (funnelData.tracking && funnelData.tracking.trim() !== '') {
          const hasQueryParams = redirectLink.includes('?');
          redirectLink = `${redirectLink}${hasQueryParams ? '&' : '?'}${funnelData.tracking.trim()}`;
        }

        console.log('QuizPlayer: Attempting redirect to:', redirectLink);
        window.location.href = redirectLink;
        return;
      }

      if (currentQuestionIndex < funnelData.questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      } else {
        alert('Quiz complete! No more questions.');
      }
    }, 500);
  };

  if (isLoading) {
  return (
    <div className="quiz-player-container" style={{ textAlign: 'center', marginTop: '80px' }}>
      <h2
        style={{
          fontSize: '32px',
          fontWeight: 'bold',
          color: '#ff4f81',
          animation: 'pulse 1.5s infinite',
        }}
      >
        Ready to unlock your secret match? 🔥
      </h2>
    </div>
  );
}

  if (error) {
    return (
      <div className="quiz-player-container">
        <h2>Error Loading Quiz</h2>
        <p className="error-message">{error}</p>
      </div>
    );
  }

  // ... (在 QuizPlayer 组件内部)
  if (!funnelData || funnelData.questions.length === 0) {
    return (
      <div className="quiz-player-container">
        <h2>Quiz Not Ready</h2>
        <p>This funnel has no questions configured. Please contact the funnel creator.</p>
      </div>
    );
  }

  const currentQuestion = funnelData.questions[currentQuestionIndex];

  const quizPlayerContainerStyle = {
    '--primary-color': funnelData.primaryColor,
    '--button-color': funnelData.buttonColor,
    '--background-color': funnelData.backgroundColor,
    '--text-color': funnelData.textColor,
    backgroundColor: funnelData.backgroundColor,
    color: funnelData.textColor,
  } as React.CSSProperties;

  return (
    <div className="quiz-player-container" style={quizPlayerContainerStyle}>
      
    <h3 style={{ color: 'var(--text-color)' }}>{currentQuestion.title}</h3>

      <div className="quiz-answers-container">
        {currentQuestion.answers.map((answer, index) => (
          <button
            key={answer.id}
            className={`quiz-answer-button ${clickedAnswerIndex === index ? 'selected-answer animating' : ''}`}
            onClick={() => handleAnswerClick(index)}
            disabled={isAnimating}
            style={{
              backgroundColor: 'var(--button-color)',
              color: 'var(--text-color)',
              borderColor: 'var(--primary-color)',
            }}
          >
            {answer.text}
          </button>
        ))}
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
}

const QuizEditorComponent: React.FC<QuizEditorComponentProps> = ({ questions, onAddQuestion, onEditQuestion, onBack, onImportQuestions }) => {
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

      const isValid = parsedData.every(
        (q) =>
          q.title &&
          typeof q.title === 'string' &&
          q.title.trim() !== '' &&
          Array.isArray(q.answers) &&
          q.answers.length > 0 &&
          q.answers.every((a) => a.text && typeof a.text === 'string' && a.text.trim() !== '')
      );

      if (!isValid) {
        setNotification({
          show: true,
          message: 'Invalid JSON format. Please ensure it is an array of questions, each with a "title" and an "answers" array, where each answer has a "text" field.',
          type: 'error'
        });
        return;
      }

      const questionsWithNewIds = parsedData.map((q) => ({
        ...q,
        id: Date.now().toString() + Math.random().toString(),
        type: q.type || 'single-choice',
        answers: q.answers.map((a) => ({
          ...a,
          id: a.id || Date.now().toString() + Math.random().toString(),
        })),
      }));

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

      <button className="back-button" onClick={onBack}>
        <span role="img" aria-label="back">
          ←
        </span>{' '}
        Back to Funnel Dashboard
      </button>
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

const QuestionFormComponent: React.FC<QuestionFormComponentProps> = ({
  question,
  questionIndex,
  onSave,
  onCancel,
  onDelete,
}) => {
  const navigate = useNavigate();
  const [title, setTitle] = useState(question ? question.title : "");
  const [answers, setAnswers] = useState<Answer[]>(
    question && question.answers.length > 0
      ? question.answers
      : Array(4)
          .fill(null)
          .map((_, i) => ({
            id: `option-${Date.now()}-${i}`,
            text: `Option ${String.fromCharCode(65 + i)}`,
          }))
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setTitle(question ? question.title : "");
    setAnswers(
      question && question.answers.length > 0
        ? question.answers
        : answers
    );
  }, [question]);

  const handleAnswerTextChange = (index: number, value: string) => {
    const updatedAnswers = [...answers];
    if (!updatedAnswers[index]) {
      updatedAnswers[index] = {
        id: `option-${Date.now()}-${index}`,
        text: "",
      };
    }
    updatedAnswers[index].text = value;
    setAnswers(updatedAnswers);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const filteredAnswers = answers.filter((ans) => ans.text.trim() !== "");
      if (!title.trim()) {
        console.error("Question title cannot be empty!");
        return;
      }
      if (filteredAnswers.length === 0) {
        console.error("Please provide at least one answer option.");
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
      onSave({
        id: question?.id || Date.now().toString(),
        title,
        type: "single-choice",
        answers: filteredAnswers,
      });
    } catch (error) {
      console.error("Error saving question:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    const button = document.querySelector('.cancel-button');
    if (button) {
      button.classList.add('animate-out');
      setTimeout(() => {
        navigate('/');
      }, 1000); // 3秒后导航
    }
  };

  const handleDelete = () => {
    setIsDeleting(true); // ✅ 现在不会报错了

    const button = document.querySelector('.delete-button');
    if (button) {
      button.classList.add('animate-out');
      setTimeout(() => {
        onDelete();
        navigate(-1, { replace: true }); // 跳转到列表页（换成你真正的路径）
      }, 1000);
    } else {
    console.error("Question ID is missing!");
  }
};
  

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
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., What's your biggest health concern?"
        />
      </div>
      <div className="form-group">
        <label>Question Type:</label>
        <select value="single-choice" onChange={() => {}} disabled>
          <option>Single Choice</option>
          <option>Multiple Choice (Coming Soon)</option>
          <option>Text Input (Coming Soon)</option>
        </select>
      </div>
      <div className="answer-options-section">
        <p>Answer Options (Max 4):</p>
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="answer-input-group">
            <input
              type="text"
              value={answers[index]?.text || ''}
              onChange={(e) => handleAnswerTextChange(index, e.target.value)}
              placeholder={`Option ${String.fromCharCode(65 + index)}`}
            />
          </div>
        ))}
      </div>
      <div className="form-actions">
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





const LinkSettingsComponent: React.FC<LinkSettingsComponentProps> = ({
  finalRedirectLink,
  setFinalRedirectLink,
  tracking,
  setTracking,
  conversionGoal,
  setConversionGoal,
  onBack,
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
      <button className="save-button" onClick={() => showNotification('Settings applied! (Auto-saved)')}>
      <span role="img" aria-label="save">
        💾
      </span>{' '}
       Applied
       </button>
        <button className="cancel-button" onClick={onBack}>
          <span role="img" aria-label="back">
            ←
          </span>{' '}
          Back to Editor
        </button>
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
  onBack: () => void;
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
        <button className="save-button" onClick={() => showNotification('Color settings applied! (Auto-saved)')}>
        <span role="img" aria-label="save">
          💾
        </span>{' '}
        Applied
        </button>
        <button className="cancel-button" onClick={onBack}>
          <span role="img" aria-label="back">
            ←
          </span>{' '}
          Back to Editor
        </button>
      </div>
    </div>
  );
};
