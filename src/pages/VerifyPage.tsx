import React, { useEffect, useState } from 'react';
import { auth } from '../firebase.ts';
import { applyActionCode, signOut } from 'firebase/auth';
import './VerifyPage.css';

export default function VerifyPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        // Get the action code from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const oobCode = urlParams.get('oobCode');
        
        if (!oobCode) {
          setStatus('error');
          setMessage('Invalid verification link. Please check your email for a new verification link.');
          return;
        }

        // Apply the email verification code
        await applyActionCode(auth, oobCode);
        
        setStatus('success');
        setMessage('Your email has been successfully verified! You can now sign in to your account.');
        
        // Start countdown for automatic redirect
        let timeLeft = 5;
        const timer = setInterval(() => {
          timeLeft -= 1;
          setCountdown(timeLeft);
          
          if (timeLeft <= 0) {
            clearInterval(timer);
            // Redirect to login page after 400ms (shortened from 900ms)
            setTimeout(() => {
              window.location.href = '/#/login?verified=1';
            }, 400);
          }
        }, 1000);

        return () => clearInterval(timer);
      } catch (error: any) {
        console.error('Email verification error:', error);
        setStatus('error');
        
        if (error.code === 'auth/invalid-action-code') {
          setMessage('This verification link is invalid or has already been used.');
        } else if (error.code === 'auth/expired-action-code') {
          setMessage('This verification link has expired. Please request a new verification email.');
        } else {
          setMessage('An error occurred during verification. Please try again or contact support.');
        }
      }
    };

    verifyEmail();
  }, []);

  const handleSignInClick = () => {
    window.location.href = '/#/login?verified=1';
  };

  const handleRequestNewLink = () => {
    window.location.href = '/#/register';
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h1 style={titleStyle}>Email Verification</h1>
        
        {status === 'loading' && (
          <div style={contentStyle}>
            <div style={loadingSpinnerStyle} className="loading-spinner"></div>
            <p style={messageStyle}>Verifying your email address...</p>
          </div>
        )}

        {status === 'success' && (
          <div style={contentStyle}>
            <div style={successIconStyle}>✓</div>
            <p style={messageStyle}>{message}</p>
            <p style={countdownStyle}>
              Redirecting to sign in in {countdown} seconds...
            </p>
            <button 
              onClick={handleSignInClick}
              style={primaryButtonStyle}
            >
              Sign In Now
            </button>
          </div>
        )}

        {status === 'error' && (
          <div style={contentStyle}>
            <div style={errorIconStyle}>✗</div>
            <p style={messageStyle}>{message}</p>
            <div style={buttonContainerStyle}>
              <button 
                onClick={handleSignInClick}
                style={primaryButtonStyle}
              >
                Go to Sign In
              </button>
              <button 
                onClick={handleRequestNewLink}
                style={secondaryButtonStyle}
              >
                Request New Link
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Styles
const containerStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#f8f9fa',
  fontFamily: 'sans-serif',
  padding: '20px'
};

const cardStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
  padding: '40px',
  maxWidth: '400px',
  width: '100%',
  textAlign: 'center'
};

const titleStyle: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: '600',
  marginBottom: '30px',
  color: '#333333'
};

const contentStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '20px'
};

const messageStyle: React.CSSProperties = {
  fontSize: '16px',
  lineHeight: '1.5',
  color: '#666666',
  margin: '0'
};

const countdownStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#888888',
  margin: '0'
};

const loadingSpinnerStyle: React.CSSProperties = {
  width: '40px',
  height: '40px',
  border: '4px solid #f3f3f3',
  borderTop: '4px solid #0b5ed7',
  borderRadius: '50%'
};

const successIconStyle: React.CSSProperties = {
  fontSize: '48px',
  color: '#28a745',
  fontWeight: 'bold'
};

const errorIconStyle: React.CSSProperties = {
  fontSize: '48px',
  color: '#dc3545',
  fontWeight: 'bold'
};

const buttonContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  width: '100%'
};

const primaryButtonStyle: React.CSSProperties = {
  backgroundColor: '#0b5ed7',
  color: '#ffffff',
  border: 'none',
  borderRadius: '4px',
  padding: '12px 24px',
  fontSize: '16px',
  fontWeight: '600',
  cursor: 'pointer',
  width: '100%',
  transition: 'background-color 0.2s ease'
};

const secondaryButtonStyle: React.CSSProperties = {
  backgroundColor: '#343a40',
  color: '#ffffff',
  border: 'none',
  borderRadius: '4px',
  padding: '12px 24px',
  fontSize: '16px',
  fontWeight: '600',
  cursor: 'pointer',
  width: '100%',
  transition: 'background-color 0.2s ease'
};