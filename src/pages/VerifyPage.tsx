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
        await applyActionCode(auth, oobCode);
        console.log("[VERIFY-DEBUG] applyActionCode resolved");
        console.log("[VERIFY-DEBUG] after applyActionCode currentUser", auth.currentUser?.uid, auth.currentUser?.emailVerified);

       if (auth.currentUser) {
       try {
       await auth.currentUser.reload();
       console.log("[VERIFY-DEBUG] after reload currentUser", auth.currentUser?.uid, auth.currentUser?.emailVerified);
       } catch (reloadErr) {
       console.warn("auth.currentUser.reload() failed:", reloadErr);
     }
   }

        // 有时后端状态传播与客户端缓存存在短延迟，尝试短轮询确认 emailVerified 为 true
        const maxAttempts = 6;
        let verified = false;
        for (let i = 0; i < maxAttempts; i++) {
          const u = auth.currentUser;
          if (u && u.emailVerified) {
            verified = true;
            break;
          }
          // 若没有登录用户，可能需要等待客户端刷新或用户重新登录后才能看到标记
          await new Promise((r) => setTimeout(r, 350));
          try {
            await u?.reload();
          } catch {
            // 忽略 reload 错误
          }
        }

        setStatus("success");
        setMessage(verified ? "Your email has been verified successfully." : "Verification processed. Please sign in; if you still see an unverified message, wait a moment and try again.");

        // 给用户一点时间阅读消息后跳转到 login，并带上 verified=1 以便 login 页面显示提示
        setTimeout(() => {
  window.location.href = "/login?verified=1";
}, 800);
      } catch (err: any) {
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
