// 文件路径: src/pages/ResetPassword.tsx

import React, { useState, useEffect } from "react";
import { getAuth, confirmPasswordReset } from "firebase/auth";
import { useNavigate } from "react-router-dom";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [oobCode, setOobCode] = useState<string | null>(null);
  const navigate = useNavigate();
  const auth = getAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("oobCode");
    if (code) {
      setOobCode(code);
    } else {
      setError("Invalid or expired password reset link.");
    }
  }, []);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!oobCode) {
      setError("Invalid or expired password reset link.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    try {
      await confirmPasswordReset(auth, oobCode, password);
      setMessage("Your password has been reset successfully! Redirecting...");
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setError(`Error resetting password: ${err.message}`);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', padding: 36, background: '#fff', borderRadius: 8, textAlign: 'center' }}
         className="page-fade-in" // <-- 添加页面淡入动画
    >
      <h2 style={{ marginBottom: 20 }}>Reset Password</h2>

      {error && (
        <div style={{ color: 'red', marginBottom: 15, padding: 10, border: '1px solid red', borderRadius: 5 }}
             className="error-shake" // <-- 添加错误消息抖动动画
        >
          {error}
        </div>
      )}

      {message && (
        <div style={{ color: 'green', marginBottom: 15, padding: 10, border: '1px solid green', borderRadius: 5 }}>
          {message}
        </div>
      )}

      {!oobCode ? (
        <button 
          onClick={() => navigate('/login')}
          style={{padding: '12px 24px', fontSize: 16, cursor: 'pointer', background: '#007bff', color: 'white', border: 'none', borderRadius: 5, marginTop: 20}}
        >
          Return to Login
        </button>
      ) : (
        <form onSubmit={handlePasswordReset}>
          <input
            type="password"
            placeholder="New Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: 10, marginBottom: 15, border: '1px solid #ccc', borderRadius: 5, boxSizing: 'border-box' }}
          />
          <input
            type="password"
            placeholder="Confirm New Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            style={{ width: '100%', padding: 10, marginBottom: 20, border: '1px solid #ccc', borderRadius: 5, boxSizing: 'border-box' }}
          />
          <button
            type="submit"
            style={{ width: '100%', padding: 12, fontSize: 18, cursor: 'pointer', background: '#28a745', color: 'white', border: 'none', borderRadius: 5 }}
          >
            Reset Password
          </button>
        </form>
      )}

      <button 
        onClick={() => navigate('/login')}
        style={{padding: '12px 24px', fontSize: 16, cursor: 'pointer', background: 'none', color: '#007bff', border: 'none', borderRadius: 5, marginTop: 20}}
      >
        Return to Login
      </button>
    </div>
  );
}
