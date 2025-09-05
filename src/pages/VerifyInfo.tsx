import React from "react";

/**
 * 注册后邮箱验证提醒页面
 */
export default function VerifyInfo() {
  return (
    <div style={container}>
      <h2>Please verify your email</h2>
      <p>
        We've sent a verification email to your inbox.
        <br />
        Please click the link in that email to complete registration.
      </p>
      <p>
        After verifying, you can log in and use all features.
      </p>
      <a href="/login">Go to login page</a>
    </div>
  );
}

// 简单样式
const container: React.CSSProperties = {
  maxWidth: 400,
  margin: "60px auto",
  padding: "36px",
  textAlign: "center",
  fontFamily: "sans-serif",
  background: "#fff",
  border: "1px solid #eee",
  borderRadius: 10,
  boxShadow: "0 2px 12px rgba(0,0,0,0.04)"
};
