import React, { useEffect, useState } from "react";
import { getAuth, applyActionCode, signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";

export default function FinishEmailVerification() {
  const [msg, setMsg] = useState("Verifying your email...");
  const navigate = useNavigate();
  const auth = getAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oobCode = params.get("oobCode");
    const email = localStorage.getItem("pendingEmail");
    const pwd = localStorage.getItem("pendingPwd");

    if (!oobCode || !email || !pwd) {
      setMsg("Information is missing or the link is invalid, please re-register。");
      return;
    }

    applyActionCode(auth, oobCode)
      .then(async () => {
        setMsg("Email verification successful, logging in automatically...");
        await signInWithEmailAndPassword(auth, email, pwd);
        localStorage.removeItem("pendingEmail");
        localStorage.removeItem("pendingPwd");
        navigate("/editor");
      })
      .catch(() => {
        setMsg("Verification failed or the link has expired. Please register again。");
      });
  }, [navigate, auth]);

  return (
    <div style={{maxWidth:400,margin:'80px auto',padding:36,background:'#fff',borderRadius:8}}>
      <h2>{msg}</h2>
    </div>
  );
}
