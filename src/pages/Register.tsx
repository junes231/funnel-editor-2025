import React, { useState } from "react";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { auth } from "../firebase.ts";

/**
 * 注册页面，带有明显的 "Create Account" 按钮
 */
export default function Register() {
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // 注册表单提交事件
  async function handleRegister(e: React.FormEvent) {
    e.preventDefault(); // 禁止默认表单提交
    if (loading) return;
    setMsg("");
    setLoading(true);
    try {
      // 注册账号
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), pwd);
      // 发送邮箱验证邮件
      await sendEmailVerification(cred.user, {
        url: "https://funnel-editor2025.netlify.app/#/verify?mode=verifyEmail",
        handleCodeInApp: true
      });
      setMsg("Verification email sent. Please check your inbox.");
      // 跳转到邮箱验证说明页面
      setTimeout(() => {
        window.location.replace("/verify-info");
      }, 2000);
    } catch (e: any) {
      // 错误处理
      let text = e.message || "Registration failed.";
      if (e.code === "auth/email-already-in-use") text = "This email is already registered.";
      if (e.code === "auth/weak-password") text = "Password is too weak.";
      if (e.code === "auth/invalid-email") text = "Invalid email format.";
      setMsg(text);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={container}>
      <h2>Create Account</h2>
      <form onSubmit={handleRegister} autoComplete="off" style={{marginTop:24}}>
        <label style={labelStyle}>Email
          <input
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={inputStyle}
            autoComplete="email"
            placeholder="you@example.com"
          />
        </label>
        <label style={labelStyle}>Password (min 8 chars)
          <input
            type="password"
            required
            minLength={8}
            value={pwd}
            onChange={e => setPwd(e.target.value)}
            style={inputStyle}
            autoComplete="new-password"
            placeholder="At least 8 characters"
          />
        </label>
        
        {/* 明显的注册按钮，支持鼠标点击和回车提交 */}
        <button
          type="submit"
          disabled={loading}
          style={buttonStyle}
        >
          {loading ? "Processing..." : "Create Account"}
        </button>
      </form>
      {/* 密码强度等提示可按需添加 */}
      {msg && <div style={{marginTop:18, color: msg.startsWith("Verification") ? "#0a0" : "#c00", fontSize:14}}>{msg}</div>}
      <div style={{marginTop:24, fontSize:13}}>
        By continuing you agree to:
        <a href="#/legal/privacy" target="_blank" style={linkStyle}> Privacy Policy</a>
        <a href="#/legal/terms" target="_blank" style={linkStyle}> Terms of Service</a>
      </div>
      <div style={{marginTop:16, fontSize:14}}>
        Already have an account? <a href="#/login" style={linkStyle}>Sign in</a>
      </div>
    </div>
  );
}

// 样式定义（中文注释）
const container: React.CSSProperties = {
  maxWidth: 400,
  margin: "60px auto",
  padding: "36px",
  background: "#fff",
  borderRadius: 10,
  boxShadow: "0 2px 12px rgba(0,0,0,0.04)"
};
const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 14,
  fontWeight: 600,
  fontSize: 15
};
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  marginTop: 6,
  fontSize: 15,
  border: "1px solid #ccc",
  borderRadius: 5
};
const buttonStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px",
  marginTop: 18,
  fontSize: 16,
  background: "#007bff",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
  fontWeight: 600
};
const linkStyle: React.CSSProperties = {
  marginLeft: 6,
  color: "#007bff",
  textDecoration: "underline",
  cursor: "pointer"
};
