import React, { useEffect, useState } from "react";
import { getAuth, applyActionCode } from "firebase/auth";
import "../styles/VerifyPage.css";

type Status = "loading" | "success" | "error";

function extractParamsFromHash(): URLSearchParams | null {
  // 处理 single-page app 使用 hash 路由的情况，例如 continueUrl 包含 #/login?verified=1
  const hash = window.location.hash || "";
  const idx = hash.indexOf("?");
  if (idx === -1) return null;
  return new URLSearchParams(hash.substring(idx));
}

export default function VerifyPage(): JSX.Element {
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState<string>("Verifying your email...");
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const REDIRECT_DELAY_MS = 800; // 给后端/客户端短时间传播状态
  const REDIRECT_TO = "/login?verified=1";

  useEffect(() => {
    // 优先从 location.search 读取；若为空则尝试从 hash 中读取（兼容 hash router）
    const searchParams = new URLSearchParams(window.location.search);
    let oobCode = searchParams.get("oobCode");
    let mode = searchParams.get("mode");

    if (!oobCode) {
      const hashParams = extractParamsFromHash();
      if (hashParams) {
        oobCode = hashParams.get("oobCode") || oobCode;
        mode = hashParams.get("mode") || mode;
      }
    }

    if (!oobCode || mode !== "verifyEmail") {
      setStatus("error");
      setMessage("Verification link is missing or malformed.");
      return;
    }

    const auth = getAuth();

    (async () => {
      try {
        // 调用 applyActionCode 让 Firebase 后端标记该邮箱为 verified
        console.log("[VERIFY-DEBUG] applyActionCode start", oobCode);
  await applyActionCode(auth, oobCode);
  console.log("[VERIFY-DEBUG] applyActionCode resolved");

   // 修改后的 message 明确要求重新setStatus("success");
setMessage("Your email has been verified successfully. Please sign in again.");

// 跳转到登录页面，但不要附加 verified=1
setTimeout(() => {
  window.location.href = "/login";  // 这里不再带 ?verified=1
}, REDIRECT_DELAY_MS);
} catch (err: any) {
  console.log("[VERIFY-DEBUG] applyActionCode failed", err); // ✅ 失败时打印
  const code = err?.code || err?.message || "unknown";
        setErrorCode(code);

        let friendly = "An error occurred while verifying your email.";
        if (code === "auth/invalid-action-code" || code === "auth/invalid-oob-code") {
          friendly = "This verification link is invalid or has already been used.";
        } else if (code === "auth/expired-action-code" || code === "auth/code-expired") {
          friendly = "This verification link has expired.";
        } else if (code === "auth/user-disabled") {
          friendly = "The user account has been disabled.";
        } else if (code === "auth/user-not-found") {
          friendly = "No user record found for this verification link.";
        }

        setStatus("error");
        setMessage(friendly);
      }
    })();
  }, []);

  const handleGoLogin = () => {
    window.location.href = "/login";
  };

  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="verify-page">
      <div className="verify-card" role="main" aria-live="polite">
        {status === "loading" && (
          <>
            <div className="spinner" aria-hidden="true" />
            <h2 className="title">Verifying...</h2>
            <p className="subtitle">{message}</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="icon success" aria-hidden="true">✓</div>
            <h2 className="title">Verified</h2>
            <p className="subtitle">{message}</p>
            <div className="actions">
              <button className="btn primary" onClick={handleGoLogin}>Go to Login</button>
            </div>
            <p className="tiny">Redirecting to login shortly…</p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="icon error" aria-hidden="true">✕</div>
            <h2 className="title">Verification Failed</h2>
            <p className="subtitle">{message}</p>
            {errorCode && <pre className="error-code">{errorCode}</pre>}
            <div className="actions">
              <button className="btn secondary" onClick={handleRetry}>Try Again</button>
              <button className="btn primary" onClick={handleGoLogin}>Go to Login</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
