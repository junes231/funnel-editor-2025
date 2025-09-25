import React, { useState, useEffect, useCallback, useRef, ChangeEvent } from 'react';
import { getAuth, onAuthStateChanged, User, signOut } from 'firebase/auth';
import PrivateRoute from './components/PrivateRoute.tsx';
import ResetPage from './pages/reset.tsx';
import LoginPage from "./pages/Login.tsx";
import VerifyPage from './pages/VerifyPage.tsx';
import FinishEmailVerification from './pages/FinishEmailVerification.tsx';
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
  answers: { [answerId: string]: Answer };
  data?: {
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
  auth: any; 
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

// Header Component
const UserHeader = ({ user, isAdmin } : { user: User, isAdmin: boolean }) => (
    <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid #ccc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span>
        Welcome, <strong>{user.email}</strong>!
        {isAdmin && <span style={{color: 'red', marginLeft: '10px', fontWeight: 'bold'}}>(Admin)</span>}
      </span>
      <button onClick={() => signOut(getAuth())} style={{ padding: '8px 15px' }}>Logout</button>
    </div>
);

// Main App Component
export default function App({ db }: AppProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  
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

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser && currentUser.emailVerified) {
        setUser(currentUser);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

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
    if (user) {
      const currentPath = window.location.hash.split('?')[0].replace('#', '');
      const authPages = ['/login', '/finish-email-verification', '/register', '/reset', '/verify'];
      if (authPages.includes(currentPath)) {
        navigate('/');
      }
    }
    // 当 user 状态确定后，如果不是编辑器页面，就完成加载
    if (user !== null && !location.pathname.startsWith('/edit/')) {
        setIsLoading(false);
    }
  }, [user, navigate, location.pathname]);
   const createFunnel = async (name: string) => {
    if (!db || !user) return;
    const funnelsCollectionRef = collection(db, 'funnels');
    try {
      const newFunnelRef = await addDoc(funnelsCollectionRef, { name, data: defaultFunnelData, ownerId: user.uid });
      navigate(`/edit/${newFunnelRef.id}`);
    } catch (error: any) {
      console.error('Error creating funnel:', error);
    }
  };

  const deleteFunnel = async (funnelId: string) => {
    if (!db || !user) return;
    try {
      await deleteDoc(doc(db, 'funnels', funnelId));
      setFunnels(funnels => funnels.filter(f => f.id !== funnelId));
    } catch (error: any) {
      console.error('Failed to delete funnel:', error);
    }
  };

  const updateFunnelData = async (funnelId: string, newData: FunnelData) => {
    if (!db || !user) return;
    try {
      await updateDoc(doc(db, 'funnels', funnelId), { data: newData });
      console.log('✅ Funnel updated:', funnelId);
    } catch (error) {
      console.error('Error updating funnel:', error);
    }
  };

  if (isLoading) {
    return <div style={{ textAlign: 'center', marginTop: '50px' }}>Loading...</div>;
  }
  
  return (
    <div style={{ padding: 24, fontFamily: 'Arial' }}>
      <Routes>
        <Route path="/play/:funnelId" element={<QuizPlayer db={db} />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/verify" element={<VerifyPage />} />
        <Route path="/finish-email-verification" element={<FinishEmailVerification />} />
        <Route path="/reset" element={<ResetPage />} />
        <Route
          path="/"
          element={
            !user
              ? <LoginPage />
              : <>
                  <UserHeader user={user} isAdmin={isAdmin} />
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
          path="/edit/:funnelId/*"
          element={
            !user
              ? <LoginPage />
              : (
                <>
                  <UserHeader user={user} isAdmin={isAdmin} />
                  <FunnelEditor db={db} updateFunnelData={updateFunnelData} setAppIsLoading={setIsLoading} />
                </>
              )
          }
        />
        <Route path="*" element={<h2>404 Not Found</h2>} />
      </Routes>
    </div>
  );
}
// ===================================================================
// vvvvvvvvvv         All Components Go Here         vvvvvvvvvv
// ===================================================================

interface FunnelDashboardProps {
  db: Firestore;
  user: User;
  isAdmin: boolean;
  funnels: Funnel[];
  setFunnels: React.Dispatch<React.SetStateAction<Funnel[]>>;
  createFunnel: (name: string) => Promise<void>;
  deleteFunnel: (funnelId: string) => Promise<void>;
}

const FunnelDashboard: React.FC<FunnelDashboardProps> = ({ db, user, isAdmin, funnels, setFunnels, createFunnel, deleteFunnel }) => {
  const [newFunnelName, setNewFunnelName] = useState('');
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!user || !db) { setIsLoading(false); return; }
    setIsLoading(true);
    setError(null);
    const funnelsCollectionRef = collection(db, 'funnels');
    const q = isAdmin ? query(funnelsCollectionRef) : query(funnelsCollectionRef, where("ownerId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const loadedFunnels = querySnapshot.docs.map((doc) => ({
          ...(doc.data() as Funnel),
          id: doc.id,
          data: { ...defaultFunnelData, ...doc.data().data },
        }));
        setFunnels(loadedFunnels);
        setIsLoading(false);
    }, (err) => {
        console.error('CRITICAL: Failed to fetch funnels:', err);
        setError(`Failed to load funnels. Error: ${err.message}`);
        setIsLoading(false);
    });
    return () => unsubscribe();
  }, [db, user, isAdmin, setFunnels]);

  const handleCreateFunnel = async () => {
    if (!newFunnelName.trim()) {
      alert('Please enter a funnel name.'); // 保留 alert 作为基础反馈
      return;
    }
    setIsCreating(true);
    await createFunnel(newFunnelName);
    setNewFunnelName('');
    setIsCreating(false);
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
        <p className="loading-message"><div className="loading-spinner"></div>Loading funnels...</p>
      ) : error ? (
        <p className="error-message">{error}</p>
      ) : funnels.length === 0 ? (
        <p className="no-funnels-message">No funnels created yet. Start by creating one!</p>
      ) : (
        <ul className="funnel-list">
          {funnels.map((funnel) => (
            <li key={funnel.id} className="funnel-item">
              <span>{funnel.name}</span>
               <div className="funnel-actions">
                <button className="funnel-action-btn" onClick={() => navigate(`/edit/${funnel.id}`)}>Edit</button>
                <button className="funnel-action-btn" onClick={() => navigate(`/play/${funnel.id}`)}>Play</button>
                <button className="funnel-action-btn" onClick={() => handleCopyLink(funnel.id)}>Copy Link</button>
                <button className="funnel-action-btn delete" onClick={() => deleteFunnel(funnel.id)}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};


// The rest of the components
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
    debugLinkValue: string;
  }>();
};

const FunnelEditor: React.FC<FunnelEditorProps> = ({ db, updateFunnelData }) => {
  const { funnelId } = useParams<{ funnelId: string }>();
  const navigate = useNavigate();

  const [funnelName, setFunnelName] = useState('Loading...');
  const [funnelData, setFunnelData] = useState<FunnelData | null>(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [debugLinkValue, setDebugLinkValue] = useState('Debug: N/A');
  
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
              const id = answer.id || `answer-${Date.now()}-${Math.random()}`;
              answersObj[id] = { ...answer, id };
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
    });
    return () => unsubscribe();
  }, [funnelId, db, navigate]);

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

  const handleSetFunnelData = (updater: (prev: FunnelData) => FunnelData) => {
    setFunnelData(prevData => {
        if (!prevData) return null;
        return updater(prevData);
    });
  };

  if (!isDataLoaded || !funnelData) {
    return <div className="loading-message"><div className="loading-spinner"></div>Loading funnel...</div>;
  }
  
  return (
    <Routes>
      <Route 
        element={
            <Outlet context={{ funnelId, funnelData, funnelName, setFunnelData: handleSetFunnelData, debugLinkValue }} />
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

const QuizEditorComponent: React.FC = () => {
    const { funnelId, funnelData, setFunnelData } = useFunnelEditorContext();
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [templateFiles, setTemplateFiles] = useState<string[]>([]);
    const { questions } = funnelData;

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
          alert('You can only have up to 6 questions for this quiz.');
          return;
        }
        const newQuestion: Question = {
          id: `question-${Date.now()}`,
          title: `New Question ${questions.length + 1}`,
          type: 'single-choice',
          answers: {},
          data: { affiliateLinks: Array(4).fill('') }
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
            alert('Cannot add from template, the 6-question limit has been reached.');
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
                return { ...q, id: questionId, type: 'single-choice', answers: answersObj, data: { affiliateLinks: Array(4).fill('') } };
            });
            if (questions.length + newQuestionsWithIds.length > 6) {
                alert(`Cannot add all questions, it would exceed the 6-question limit.`);
                return;
            }
            setQuestions(prev => [...prev, ...newQuestionsWithIds]);
        } catch (error) {
            console.error('Error loading template:', error);
            alert((error as Error).message || 'Failed to load the template.');
        }
    };

    const handleImportQuestions = (importedQuestions: Question[]) => {
      // Your full implementation of handleImportQuestions here
    };
    
    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
      // Your full implementation of handleFileChange here
    };

    const triggerFileInput = () => { fileInputRef.current?.click(); };

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
                {templateFiles.map(fileName => {
                    const buttonLabel = fileName.replace('.json', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    return (
                        <button key={fileName} className="template-btn" onClick={() => handleSelectTemplate(fileName.replace('.json', ''))}>
                        {buttonLabel}
                        </button>
                    );
                })}
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

const QuestionFormComponent: React.FC = () => {
    const { funnelId, funnelData, setFunnelData } = useFunnelEditorContext();
    const { questionIndex: questionIndexStr } = useParams<{ questionIndex: string }>();
    const navigate = useNavigate();
    
     const [isCancelling, setIsCancelling] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

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
        if (!title.trim()) {
            alert('Question title cannot be empty!');
            return;
        }
        const answersObj: { [answerId: string]: Answer } = {};
        answers.forEach(ans => {
            if(ans.text.trim()) answersObj[ans.id] = ans;
        });

        if (Object.keys(answersObj).length === 0) {
            alert('Please provide at least one answer option.');
            return;
        }

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
        navigate(`/edit/${funnelId}/questions`);
    };

   const onCancel = () => {
        const button = document.querySelector('.cancel-button');
    if (button) {
      button.classList.add('animate-out');
      setTimeout(() => {
        navigate('/');
      }, 1000);
    }
  };
  // --- 恢复您设计的 Delete 按钮动画和跳转逻辑 ---
      const onDelete = () => {
  setIsDeleting(true); // 启动动画状态

  const button = document.querySelector('.delete-button');
  if (button) {
    button.classList.add('animate-out'); // 给按钮加上淡出动画
  }

  // ⏳ 等待1秒（动画时间），再执行删除 + 跳转
  setTimeout(() => {
    // 删除数据
    setFunnelData(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== questionIndex),
    }));

    // 跳转上一页
    navigate(-1, { replace: true });
  }, 1000); // 这里的 1000ms 要和 CSS 动画时长保持一致
};

    // --- 恢复您设计的 Back to List 按钮动画和跳转逻辑 ---
    

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
                <button className="save-button" onClick={handleSave} disabled={isCancelling || isDeleting}>
                    <span role="img" aria-label="save">💾</span> Save Question
                </button>
                <button 
                    className={`cancel-button ${isCancelling ? 'animate-out' : ''}`} 
                    onClick={onCancel}
                    disabled={isCancelling || isDeleting}
                >
                    <span role="img" aria-label="cancel">←</span> Back to List
                </button>
                <button 
                    className={`delete-button ${isDeleting ? 'animate-out' : ''}`} 
                    onClick={onDelete}
                    disabled={isCancelling || isDeleting}
                >
                    <span role="img" aria-label="delete">🗑️</span> Delete Question
                </button>
            </div>
        </div>
    );
};
const LinkSettingsComponent: React.FC = () => {
    const { funnelId, funnelData, setFunnelData } = useFunnelEditorContext();
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
            <button className="save-button">
                <span role="img" aria-label="save">💾</span> Applied (Auto-saved)
            </button>
            <BackButton onClick={() => navigate(`/edit/${funnelId}`)}>
                <span role="img" aria-label="back">←</span> Back to Editor
            </BackButton>
          </div>
        </div>
    );
};

const ColorCustomizerComponent: React.FC = () => {
    const { funnelId, funnelData, setFunnelData } = useFunnelEditorContext();
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
            <button className="save-button">
                <span role="img" aria-label="save">💾</span> Applied (Auto-saved)
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

const QuizPlayer: React.FC<{ db: Firestore }> = ({ db }) => {
  const { funnelId } = useParams<{ funnelId: string }>();
  const [funnelData, setFunnelData] = useState<FunnelData | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [clickedAnswerIndex, setClickedAnswerIndex] = useState<number | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
  const getFunnelForPlay = async () => {
    console.log('funnelId:', funnelId, 'db:', db);
    if (!funnelId) {
      setError('No funnel ID provided!');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const funnelDocRef = doc(db, 'funnels', funnelId);
      const funnelDoc = await getDoc(funnelDocRef);
      console.log('funnelDoc:', funnelDoc.exists(), funnelDoc.data());
      if (funnelDoc.exists()) {
        const funnel = funnelDoc.data() as Funnel;
        const data = { ...defaultFunnelData, ...funnel.data };
        if (data.questions) {
          data.questions = data.questions.map(q => {
            if (Array.isArray(q.answers)) {
              const answersObj: { [id: string]: Answer } = {};
              q.answers.forEach((ans: any) => {
                const id = ans.id || `answer-${Date.now()}-${Math.random()}`;
                answersObj[id] = { ...ans, id };
              });
              return { ...q, answers: answersObj };
            }
            return q;
          });
        }
        setFunnelData(data);
      } else {
        setError('Funnel not found!');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Failed to load quiz.');
    } finally {
      setIsLoading(false);
    }
  };
  getFunnelForPlay();
}, [funnelId, db]);

  const handleAnswerClick = async (answerIndex: number, answerId: string) => {
    if (isAnimating || !funnelData) return;
    setIsAnimating(true);
    setClickedAnswerIndex(answerIndex);

    const currentQuestion = funnelData.questions[currentQuestionIndex];
    const affiliateLink = currentQuestion?.data?.affiliateLinks?.[answerIndex];

    if (funnelId && currentQuestion?.id && answerId) {
        try {
          const trackClickEndpoint = trackClickUrl;
          await fetch(trackClickEndpoint, {
            method: "POST",
            mode: "cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data: { funnelId, questionId: currentQuestion.id, answerId } }),
          });
        } catch (err) { console.error("Failed to track click:", err); }
    }

    if (affiliateLink) window.open(affiliateLink, "_blank");

    setTimeout(() => {
      setIsAnimating(false);
      setClickedAnswerIndex(null);
      if (!funnelData) return;
      const isLastQuestion = currentQuestionIndex >= funnelData.questions.length - 1;
      if (isLastQuestion) {
        if (funnelData.finalRedirectLink) window.location.href = funnelData.finalRedirectLink;
      } else {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      }
    }, 500);
  };
  
  if (isLoading) return <div className="quiz-player-container"><h2>Loading Quiz...</h2></div>;
  if (error || !funnelData || funnelData.questions.length === 0) {
    return <div className="quiz-player-container"><h2>{error || 'Quiz Not Ready'}</h2><p>{error || 'This funnel has no questions configured.'}</p></div>;
  }

  const currentQuestion = funnelData.questions[currentQuestionIndex];
  if (!currentQuestion) return <div className="quiz-player-container"><p>Loading next question...</p></div>;
  
  const sortedAnswers = Object.values(currentQuestion.answers).sort((a, b) => a.text.localeCompare(b.text));

  const quizPlayerContainerStyle = {
    '--primary-color': funnelData.primaryColor,
    '--button-color': funnelData.buttonColor,
    '--background-color': funnelData.backgroundColor,
    '--text-color': funnelData.textColor,
  } as React.CSSProperties;
    
  return (
    <div className="quiz-player-container" style={{ textAlign: 'center', marginTop: '80px' }}>
        <h2 style={{ fontSize: '32px', fontWeight: 'bold', color: '#ff4f81', animation: 'pulse 1.5s infinite' }}>
          Ready to unlock your secret match? 🔥
        </h2>
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
