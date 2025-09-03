import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { useAuth } from './hooks/useAuth.ts';
import { useNotification } from './hooks/useNotification.ts';
import { useFunnels } from './hooks/useFunnels.ts';
import { NotificationPortal } from './components/layout/NotificationPortal.tsx';

// Existing pages (keep your original Login / Register / Reset)
import Login from './pages/Login.tsx';
import Register from './pages/Register.tsx';
import ResetPage from './pages/reset.tsx';

// Legal
import TermsOfService from './legal/TermsOfService';
import PrivacyPolicy from './legal/PrivacyPolicy';

// Funnel feature components
import { FunnelDashboard } from './components/funnels/FunnelDashboard.tsx';
import { FunnelEditor } from './components/funnels/editor/FunnelEditor.tsx';
import { QuizPlayer } from './components/funnels/QuizPlayer.tsx';

// Firebase instance must be passed from main entry or import db if you export it.
import { db } from './firebase.ts';

export default function App() {
  const { user, isAdmin, loading } = useAuth();
  const { notifications, push } = useNotification();
  const {
    funnels,
    loading: funnelsLoading,
    error: funnelsError,
    createFunnel,
    deleteFunnelById,
    updateFunnelData,
    setFunnels
  } = useFunnels({
    db,
    user,
    isAdmin,
    notify: push
  });

  if (loading) {
    return <div style={{ textAlign: 'center', marginTop: 60 }}>Loading user...</div>;
  }

  return (
    <HashRouter>
      <div style={{ padding: 24, fontFamily: 'Arial' }}>
        <Routes>
          <Route path="/login" element={<Login/>}/>
          <Route path="/register" element={<Register/>}/>
          <Route path="/reset" element={<ResetPage/>}/>
          <Route path="/legal/terms" element={<TermsOfService/>}/>
          <Route path="/legal/privacy" element={<PrivacyPolicy/>}/>
          <Route path="/play/:funnelId" element={<QuizPlayer db={db}/>}/>
          <Route
            path="/"
            element={
              !user ? (
                <Login/>
              ) : (
                <>
                  <Header userEmail={user.email || ''} isAdmin={isAdmin} />
                  <FunnelDashboard
                    funnels={funnels}
                    loading={funnelsLoading}
                    error={funnelsError}
                    createFunnel={createFunnel}
                    deleteFunnel={deleteFunnelById}
                    notify={push}
                  />
                </>
              )
            }
          />
          <Route
            path="/edit/:funnelId"
            element={
              !user ? (
                <Login/>
              ) : (
                <>
                  <Header userEmail={user.email || ''} isAdmin={isAdmin} />
                  <FunnelEditor
                    db={db}
                    updateFunnelData={updateFunnelData}
                    notify={push}
                  />
                </>
              )
            }
          />
          <Route path="*" element={<h2>404 Not Found</h2>} />
        </Routes>
      </div>
      <NotificationPortal notifications={notifications}/>
    </HashRouter>
  );
}

interface HeaderProps {
  userEmail: string;
  isAdmin: boolean;
}
function Header({ userEmail, isAdmin }: HeaderProps) {
  return (
    <div style={{
      marginBottom: 20,
      paddingBottom: 20,
      borderBottom: '1px solid #ccc',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <span>
        Welcome, <strong>{userEmail}</strong>
        {isAdmin && <span style={{ color: 'red', marginLeft: 10, fontWeight: 'bold' }}>(Admin)</span>}
      </span>
      <button
        onClick={() => {
          import('firebase/auth').then(({ getAuth, signOut }) => signOut(getAuth()));
        }}
        style={{ padding: '8px 15px' }}
      >
        Logout
      </button>
    </div>
  );
}
