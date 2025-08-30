import React, { useEffect, useState } from "react";
import {
  getAuth,
  isSignInWithEmailLink,
  signInWithEmailLink
} from "firebase/auth";

/**
 * Minimal, robust Email Link finish sign-in page (JavaScript version).
 * Features:
 * - Validates the URL is a sign-in link
 * - Supports cross‑device flow (prompts for email if not in localStorage)
 * - Friendly error messages
 * - Clears stored email after success
 * - Optional redirect (configure REDIRECT_AFTER_LOGIN if needed)
 */

const ERROR_MAP = {
  "auth/invalid-action-code": "The link is invalid or has already been used.",
  "auth/expired-action-code": "The link has expired. Please request a new one.",
  "auth/invalid-email": "Invalid email address.",
  "auth/missing-email": "Email is missing. Please enter it again.",
  "auth/user-disabled": "This account has been disabled.",
  "auth/operation-not-allowed": "Email link sign-in is not enabled.",
  "auth/too-many-requests": "Too many attempts. Please try later."
};

// Change this if you want to redirect after success
const REDIRECT_AFTER_LOGIN = "/";

function mapError(err) {
  const code = err?.code;
  if (code && ERROR_MAP[code]) return `${ERROR_MAP[code]} (code: ${code})`;
  return `Sign-in failed: ${code || ""} ${err?.message || ""}`.trim();
}

// Simple internal redirect guard (prevents open redirect via query param)
function sanitizeRedirect(raw) {
  if (!raw) return REDIRECT_AFTER_LOGIN;
  if (/^https?:\/\//i.test(raw)) return REDIRECT_AFTER_LOGIN;
  if (!raw.startsWith("/")) return REDIRECT_AFTER_LOGIN;
  return raw;
}

export default function FinishSignIn() {
  const [status, setStatus] = useState("Verifying the sign-in link...");
  const [needEmail, setNeedEmail] = useState(false);
  const [manualEmail, setManualEmail] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const auth = getAuth();
    const fullUrl = window.location.href;

    // 1. Validate link
    if (!isSignInWithEmailLink(auth, fullUrl)) {
      setStatus("Not a valid sign-in link (might be expired or malformed).");
      setLoading(false);
      return;
    }

    // 2. Support optional ?redirect=/path
    const sp = new URLSearchParams(window.location.search);
    const redirectTarget = sanitizeRedirect(sp.get("redirect") || sp.get("continueUrl"));

    // 3. Try stored email (same-device flow)
    let email = window.localStorage.getItem("emailForSignIn");

    if (!email) {
      // Cross-device: ask user to input the email they used
      setNeedEmail(true);
      setStatus("Please enter the email you used to request the link.");
      setLoading(false);
      return;
    }

    // 4. Attempt sign in
    signInWithEmailLink(auth, email, fullUrl)
      .then(cred => {
        if (!mounted) return;
        window.localStorage.removeItem("emailForSignIn");
        setStatus(`Signed in as ${cred.user.email}. Redirecting...`);
        setLoading(false);
        setTimeout(() => {
          window.location.replace(redirectTarget);
        }, 1200);
      })
      .catch(err => {
        if (!mounted) return;
        setStatus(mapError(err));
        setLoading(false);
      });

    return () => { mounted = false; };
  }, []);

  const handleManualSubmit = () => {
    if (!manualEmail.trim()) {
      setStatus("Please enter your email.");
      return;
    }
    const auth = getAuth();
    const fullUrl = window.location.href;
    setLoading(true);
    setStatus("Signing in...");
    signInWithEmailLink(auth, manualEmail.trim(), fullUrl)
      .then(cred => {
        window.localStorage.removeItem("emailForSignIn");
        setStatus(`Signed in as ${cred.user.email}. Redirecting...`);
        setLoading(false);
        setTimeout(() => {
          window.location.replace(REDIRECT_AFTER_LOGIN);
        }, 1200);
      })
      .catch(err => {
        setStatus(mapError(err));
        setLoading(false);
      });
  };

  return (
    <div style={styles.wrap}>
      <h2 style={styles.title}>Email Link Sign-In</h2>
      <p style={styles.message}>{status}</p>

      {needEmail && (
        <div style={{ marginTop: 16 }}>
          <input
            type="email"
            placeholder="Enter your email"
            value={manualEmail}
            onChange={e => setManualEmail(e.target.value)}
            style={styles.input}
          />
          <button
            onClick={handleManualSubmit}
            disabled={loading}
            style={{
              ...styles.button,
              opacity: loading ? 0.6 : 1,
              cursor: loading ? "not-allowed" : "pointer"
            }}
          >
            {loading ? "Submitting..." : "Confirm Sign-In"}
          </button>
        </div>
      )}

      {!needEmail && loading && (
        <div style={styles.note}>Processing, please wait...</div>
      )}

      <div style={styles.footer}>
        If nothing happens, go back and request a new link.
      </div>
    </div>
  );
}

const styles = {
  wrap: {
    maxWidth: 480,
    margin: "60px auto",
    padding: "32px 28px",
    fontFamily: "system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial",
    border: "1px solid #e5e5e5",
    borderRadius: 12,
    boxShadow: "0 4px 12px rgba(0,0,0,.05)"
  },
  title: { textAlign: "center", margin: 0 },
  message: { minHeight: 48, lineHeight: 1.5, fontSize: 15 },
  input: {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #ccc",
    borderRadius: 6,
    fontSize: 14,
    boxSizing: "border-box"
  },
  button: {
    marginTop: 14,
    width: "100%",
    padding: "10px 12px",
    background: "#1677ff",
    color: "#fff",
    fontSize: 15,
    border: "none",
    borderRadius: 6
  },
  note: { marginTop: 12, fontSize: 13, color: "#555" },
  footer: {
    marginTop: 32,
    fontSize: 12,
    textAlign: "center",
    color: "#888"
  }
};
