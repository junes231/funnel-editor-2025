import React, { useState, useEffect } from 'react';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink
} from 'firebase/auth';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoginView, setIsLoginView] = useState(true);
  const [isSendingLink, setIsSendingLink] = useState(false);
  const [notification, setNotification] = useState('');
  const auth = getAuth();

  // Handle email link sign-in
  useEffect(() => {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      let storedEmail = window.localStorage.getItem('emailForSignIn') || '';
      if (!storedEmail) {
        storedEmail = window.prompt('Please enter your email to complete sign in') || '';
      }
      if (storedEmail) {
        signInWithEmailLink(auth, storedEmail, window.location.href)
          .then(() => {
            window.localStorage.removeItem('emailForSignIn');
            setNotification('Sign in with email link successful!');
          })
          .catch((err) => {
            setNotification('Email link sign in failed: ' + err.message);
          });
      }
    }
  }, [auth]);

  const handleSubmit = () => {
    if (!email || !password) {
      setNotification("Please enter both email and password.");
      return;
    }

    if (isLoginView) {
      signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
          setNotification("User logged in successfully.");
        })
        .catch(error => setNotification(`Login Failed: ${error.message}`));
    } else {
      createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
          setNotification("User registered successfully.");
        })
        .catch(error => setNotification(`Sign Up Failed: ${error.message}`));
    }
  };

  // Send Magic Link
  const handleSendMagicLink = () => {
    if (!email) {
      setNotification("Please enter your email.");
      return;
    }
    setIsSendingLink(true);
    const actionCodeSettings = {
      url: 'https://funnel-editor2025.netlify.app/',
      handleCodeInApp: true,
    };
    sendSignInLinkToEmail(auth, email, actionCodeSettings)
      .then(() => {
        window.localStorage.setItem('emailForSignIn', email);
        setNotification('Sign-in link sent! Please check your email and click the link to finish sign in.');
      })
      .catch((error) => {
        setNotification('Failed to send sign-in link: ' + error.message);
      })
      .finally(() => setIsSendingLink(false));
  };

  return (
    <div style={{ padding: 40, fontFamily: 'Arial', textAlign: 'center', maxWidth: '400px', margin: '100px auto', border: '1px solid #ccc', borderRadius: '8px' }}>
      {notification && (
        <div style={{ marginBottom: 16, color: '#fff', backgroundColor: '#222', padding: 12, borderRadius: 6 }}>
          {notification}
        </div>
      )}
      <h2>{isLoginView ? 'Editor Login' : 'Editor Registration'}</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="Email"
          style={{ padding: 12, fontSize: 16 }}
        />
        {isLoginView && (
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            style={{ padding: 12, fontSize: 16 }}
          />
        )}
        <button
          onClick={handleSubmit}
          style={{ padding: '12px 20px', fontSize: 16, cursor: 'pointer', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          {isLoginView ? 'Log in' : 'Register'}
        </button>
        {/* Magic link sign-in button */}
        {isLoginView && (
          <button
            onClick={handleSendMagicLink}
            style={{ padding: '12px 20px', fontSize: 16, cursor: 'pointer', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px' }}
            disabled={isSendingLink}
          >
            {isSendingLink ? 'Sending...' : 'Sign in with Email Link'}
          </button>
        )}
      </div>
      <div>
        <p
          onClick={() => setIsLoginView(!isLoginView)}
          style={{ cursor: 'pointer', color: 'blue', textDecoration: 'underline', marginBottom: 12 }}
        >
          {isLoginView ? "Don't have an account yet? Click here to register" : "Already have an account? Log in"}
        </p>
        <div style={{ marginTop: 24, textAlign: 'center', fontSize: 12, color: '#888' }}>
          <p>By logging in, you agree to our:</p>
          <a
            href="https://github.com/junes231/myfunnel-legal/blob/main/PRIVACY_POLICY.md"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'block', marginTop: 8, color: '#888', textDecoration: 'underline' }}
          >
            Privacy Policy
          </a>
          <a
            href="https://github.com/junes231/myfunnel-legal/blob/main/TERMS_OF_SERVICE.md"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'block', marginTop: 8, color: '#888', textDecoration: 'underline' }}
          >
            Terms of Service
          </a>
        </div>
      </div>
    </div>
  );
}
