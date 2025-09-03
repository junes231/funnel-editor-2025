import React, { useEffect, useState } from 'react';
import { getAuth, applyActionCode } from 'firebase/auth';

export default function VerifyPage() {
  const auth = getAuth();
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [continueUrl, setContinueUrl] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        console.log('VerifyPage: Starting email verification process');
        
        // Parse URL parameters
        const searchParams = new URLSearchParams(window.location.search);
        const mode = searchParams.get('mode');
        const oobCode = searchParams.get('oobCode');
        const continueUrlParam = searchParams.get('continueUrl');

        console.log('VerifyPage: URL parameters:', { mode, oobCode, continueUrlParam });

        // Set continue URL for later use
        if (continueUrlParam) {
          try {
            setContinueUrl(decodeURIComponent(continueUrlParam));
          } catch (e) {
            console.error('Error decoding continueUrl:', e);
            setContinueUrl('/#/login?verified=1');
          }
        } else {
          setContinueUrl('/#/login?verified=1');
        }

        // Validate parameters
        if (mode !== 'verifyEmail' || !oobCode) {
          console.log('VerifyPage: Invalid parameters, showing error state');
          setState('error');
          setMessage('Invalid verification link. Please check your email and try again.');
          return;
        }

        console.log('VerifyPage: Calling applyActionCode with oobCode:', oobCode);
        
        // Apply the action code to verify email
        await applyActionCode(auth, oobCode);
        
        console.log('VerifyPage: Email verification successful');
        setState('success');
        setMessage('Email verified successfully! Redirecting...');
        
        // Redirect after a short delay
        setTimeout(() => {
          window.location.href = continueUrl || '/#/login?verified=1';
        }, 2000);

      } catch (error: any) {
        console.error('VerifyPage: Email verification failed:', error);
        setState('error');
        setMessage(`Verification failed: ${error?.message || 'Unknown error. Please try again or contact support.'}`);
      }
    };

    verifyEmail();
  }, [auth, continueUrl]);

  const handleGoToSignIn = () => {
    if (state === 'success') {
      window.location.href = continueUrl || '/#/login?verified=1';
    } else {
      window.location.href = '/#/login';
    }
  };

  // Button styles matching Login component
  const primaryBtn = (disabled: boolean): React.CSSProperties => ({
    padding: '12px 20px',
    fontSize: 16,
    cursor: disabled ? 'not-allowed' : 'pointer',
    backgroundColor: '#0069d9',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    fontWeight: 600,
    letterSpacing: 0.3,
    opacity: disabled ? 0.7 : 1,
    transition: 'background .2s'
  });

  const secondaryBtn = (disabled: boolean): React.CSSProperties => ({
    padding: '10px 18px',
    fontSize: 14,
    cursor: disabled ? 'not-allowed' : 'pointer',
    backgroundColor: '#6c757d',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    opacity: disabled ? 0.6 : 1
  });

  // Spinner animation (inline CSS since we want to keep it minimal)
  const spinnerStyle: React.CSSProperties = {
    display: 'inline-block',
    width: 20,
    height: 20,
    border: '3px solid #f3f3f3',
    borderTop: '3px solid #007bff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginRight: 8
  };

  return (
    <div style={{
      padding: 40,
      fontFamily: 'Inter, Arial, sans-serif',
      textAlign: 'center',
      maxWidth: 480,
      margin: '80px auto',
      border: '1px solid #ddd',
      borderRadius: 10,
      boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
      background: '#fff'
    }}>
      {/* Title */}
      <h2 style={{ marginTop: 0, fontSize: 24, letterSpacing: 0.5 }}>
        {state === 'loading' && 'Verifying email...'}
        {state === 'success' && 'Email Verified!'}
        {state === 'error' && 'Verification Failed'}
      </h2>

      {/* Loading State */}
      {state === 'loading' && (
        <div style={{ margin: '24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <div style={spinnerStyle}></div>
            <span style={{ fontSize: 16, color: '#666' }}>Verifying your email address...</span>
          </div>
          <p style={{ fontSize: 14, color: '#888', lineHeight: 1.5 }}>
            Please wait while we confirm your email verification.
          </p>
        </div>
      )}

      {/* Success State */}
      {state === 'success' && (
        <div style={{ margin: '24px 0' }}>
          <div style={{
            marginBottom: 20,
            color: '#28a745',
            background: '#d4edda',
            border: '1px solid #c3e6cb',
            padding: 12,
            borderRadius: 6,
            fontSize: 14,
            lineHeight: 1.5
          }}>
            {message}
          </div>
          <button
            onClick={handleGoToSignIn}
            style={primaryBtn(false)}
          >
            Go to Sign In
          </button>
        </div>
      )}

      {/* Error State */}
      {state === 'error' && (
        <div style={{ margin: '24px 0' }}>
          <div style={{
            marginBottom: 20,
            color: '#dc3545',
            background: '#f8d7da',
            border: '1px solid #f5c6cb',
            padding: 12,
            borderRadius: 6,
            fontSize: 14,
            lineHeight: 1.5,
            textAlign: 'left'
          }}>
            {message}
          </div>
          <button
            onClick={handleGoToSignIn}
            style={secondaryBtn(false)}
          >
            Back to Sign In
          </button>
        </div>
      )}

      {/* Add the CSS animation keyframes */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}