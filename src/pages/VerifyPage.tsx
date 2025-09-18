import React, { useEffect, useState } from "react";
import { getAuth, applyActionCode } from "firebase/auth";

/**
 * 邮箱验证结果页面
 */
export default function VerifyPage(): JSX.Element {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState<string>("Verifying your email...");
  const [errorCode, setErrorCode] = useState<string | null>(null);

  // 验证成功后自动跳转登录页
  const REDIRECT_DELAY_MS = 2000;
  const REDIRECT_TO = "/login";

  useEffect(() => {
    // 解析邮箱验证链接参数
    const searchParams = new URLSearchParams(window.location.search);
    let oobCode = searchParams.get("oobCode");
    let mode = searchParams.get("mode");

    if (!oobCode || mode !== "verifyEmail") {
      setStatus("error");
      setMessage("Verification link is missing or malformed.");
      return;
    }

    const auth = getAuth();

    (async () => {
      try {
        // 验证邮箱
        await applyActionCode(auth, oobCode);
        setMessage("Your email has been verified! You can now log in.");
        setStatus("success");
        // 2秒后跳转到登录页
        setTimeout(() => {
          window.location.href = REDIRECT_TO;
        }, REDIRECT_DELAY_MS);
      } catch (err: any) {
        const code = err?.code || err?.message || "unknown";
        setErrorCode(code);
        let friendly = "An error occurred while verifying your email.";
        setStatus("error");
        setMessage(friendly);
      }
    })();
  }, []);

  const handleGoLogin = () => {
    window.location.href = "/login";
  };

  return (
    <div style={container}>
      <div style={card}>
        {status === "loading" && (
          <>
            <h2>Verifying...</h2>
            <p>{message}</p>
          </>
        )}
        {status === "success" && (
          <>
            <h2>Email Verified</h2>
            <p>{message}</p>
            <button style={button} onClick={handleGoLogin}>Go to Login</button>
            <p style={{fontSize:12, color:"#888"}}>Redirecting in a moment…</p>
          </>
        )}
        {status === "error" && (
          <>
            <h2>Verification Failed</h2>
            <p>{message}</p>
            {errorCode && <pre style={{color:"#c00"}}>{errorCode}</pre>}
            <button style={button} onClick={handleGoLogin}>Go to Login</button>
          </>
        )}
      </div>
    </div>
  );
}

// 简单样式
const container: React.CSSProperties = {
  maxWidth: 400,
  margin: "60px auto",
  padding: "36px",
  textAlign: "center",
  fontFamily: "sans-serif"
};
const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #eee",
  borderRadius: 10,
  padding: "30px",
  boxShadow: "0 2px 12px rgba(0,0,0,0.04)"
};
const button: React.CSSProperties = {
  marginTop: 18,
  padding: "10px 24px",
  fontSize: 16,
  background: "#0069d9",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  cursor: "pointer"
};
