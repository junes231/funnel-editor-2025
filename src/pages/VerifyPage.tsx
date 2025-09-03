import React, { useEffect, useState } from "react";
import { getAuth, applyActionCode } from "firebase/auth";
import "../styles/VerifyPage.css";

type Status = "loading" | "success" | "error";

export default function VerifyPage(): JSX.Element {
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState<string>("Verifying your email...");
  const [errorCode, setErrorCode] = useState<string | null>(null);

  // 400ms redirect delay as requested
  const REDIRECT_DELAY_MS = 400;
  const REDIRECT_TO = "/login";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oobCode = params.get("oobCode");

    if (!oobCode) {
      setStatus("error");
      setMessage("Verification link is missing or malformed.");
      return;
    }

    const auth = getAuth();

    (async () => {
      try {
        await applyActionCode(auth, oobCode);
        setStatus("success");
        setMessage("Your email has been verified successfully.");
        // Give the user a short moment to read the message, then redirect
        setTimeout(() => {
          window.location.href = REDIRECT_TO;
        }, REDIRECT_DELAY_MS);
      } catch (err: any) {
        // Map common Firebase errors to friendlier messages
        const code = err?.code || err?.message || "unknown";
        setErrorCode(code);

        let friendly = "An error occurred while verifying your email.";
        if (code === "auth/invalid-action-code" || code === "auth/invalid-oob-code") {
          friendly = "This verification link is invalid.";
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
    window.location.href = REDIRECT_TO;
  };

  const handleRetry = () => {
    // reload will re-run useEffect and re-attempt applyActionCode if oobCode present
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
              <button className="btn primary" onClick={handleGoLogin}>
                Go to Login
              </button>
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
              <button className="btn secondary" onClick={handleRetry}>
                Try Again
              </button>
              <button className="btn primary" onClick={handleGoLogin}>
                Go to Login
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
