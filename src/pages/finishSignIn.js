// React 例子
import React, { useEffect, useState } from "react";
import { getAuth, signInWithEmailLink } from "firebase/auth";

export default function FinishSignIn() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    const auth = getAuth();
    const email = window.localStorage.getItem("emailForSignIn");
    if (!email) {
      setMessage("Email not found, please return to the login page and re-enter your email。");
      return;
    }
    signInWithEmailLink(auth, email, window.location.href)
      .then(() => {
        setMessage("Login successful！");
        // 可以跳转到首页等
      })
      .catch((error) => {
        setMessage("Login Failed：" + error.message);
      });
  }, []);

  return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <h2>邮箱登录验证</h2>
      <p>{message || "Logging in, please wait…"}</p>
    </div>
  );
}
