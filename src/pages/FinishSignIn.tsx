import React, { useEffect, useState } from "react";
import { isSignInWithEmailLink, signInWithEmailLink } from "firebase/auth";
import { auth } from "../firebase/firebaseApp";

const errorMessageMap: Record<string, string> = {
  "auth/invalid-action-code": "The link is invalid or already used.",
  "auth/expired-action-code": "The link has expired. Request a new one.",
  "auth/invalid-email": "Invalid email address.",
  "auth/missing-email": "Email is missing. Please enter it again.",
  "auth/user-disabled": "Account disabled.",
  "auth/operation-not-allowed": "Email link sign-in not enabled.",
  "auth/too-many-requests": "Too many attempts. Try later."
};

function translateError(err: any) {
  const code = err?.code;
  if (code && errorMessageMap[code]) return `${errorMessageMap[code]} (code: ${code})`;
  return `Sign-in failed: ${code || ""} ${err?.message || ""}`.trim();
}

function sanitizeRedirect(raw?: string | null): string {
  if (!raw) return "/";
  if (/^https?:\/\//i.test(raw)) return "/";
  if (!raw.startsWith("/")) return "/";
  return raw;
}

const FinishSignIn: React.FC = () => {
  const [message, setMessage] = useState("Verifying the sign-in link...");
  const [emailInput, setEmailInput] = useState("");
  const [needEmail, setNeedEmail] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      const currentUrl = window.location.href;

      if (!isSignInWithEmailLink(auth, currentUrl)) {
        setMessage("Not a valid email sign-in link. It may be expired or malformed.");
        setLoading(false);
        return;
      }

      const sp = new URLSearchParams(window.location.search);
      const redirect = sanitizeRedirect(sp.get("continueUrl") || sp.get("redirect"));

      let email = window.localStorage.getItem("emailForSignIn");

      if (!email) {
        setNeedEmail(true);
        setMessage("Please enter the email you used to request the link.");
        setLoading(false);
        return;
      }

      try {
        const cred = await signInWithEmailLink(auth, email, currentUrl);
        if (!mounted) return;
        window.localStorage.removeItem("emailForSignIn");
        setMessage(`Signed in as ${cred.user.email}. Redirecting...`);
        setLoading(false);
        setTimeout(() => window.location.replace(redirect), 1200);
      } catch (err) {
        if (!mounted) return;
        setMessage(translateError(err));
        setLoading(false);
      }
    };
    run();
    return () => { mounted = false; };
  }, []);

  const submitManualEmail = async () => {
    const currentUrl = window.location.href;
    if (!emailInput.trim()) {
      setMessage("Please provide an email address.");
      return;
    }
    setLoading(true);
    try {
      const cred = await signInWithEmailLink(auth, emailInput.trim(), currentUrl);
      window.localStorage.removeItem("emailForSignIn");
      setMessage(`Signed in as ${cred.user.email}. Redirecting...`);
      setLoading(false);
      setTimeout(() => window.location.replace("/"), 1200);
    } catch (err) {
      setMessage(translateError(err));
      setLoading(false);
    }
  };

  return (
    <div style={{
      maxWidth: 480,
      margin: "60px auto",
      padding: "32px 28px",
      fontFamily: "system-ui, -apple-system, BlinkMacSystemFont",
      border: "1px solid #e5e5e5",
      borderRadius: 12,
      boxShadow: "0 4px 12px rgba(0,0,0,.04)"
    }}>
      <h2 style={{ textAlign: "center", marginTop: 0 }}>Email Link Sign-In</h2>
      <p style={{ lineHeight: 1.6, minHeight: 48 }}>{message}</p>

      {needEmail && (
        <div style={{ marginTop: 20 }}>
          <input
            type="email"
            placeholder="Enter your email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              fontSize: 14,
              boxSizing: "border-box",
              borderRadius: 6,
              border: "1px solid #ccc"
            }}
          />
          <button
            onClick={submitManualEmail}
            disabled={loading}
            style={{
              marginTop: 16,
              width: "100%",
              padding: "10px 12px",
              background: "#1677ff",
              color: "#fff",
              fontSize: 15,
              border: "none",
              borderRadius: 6,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? "Submitting..." : "Confirm Sign-In"}
          </button>
        </div>
      )}

      {!needEmail && loading && (
        <div style={{ marginTop: 16, fontSize: 13, color: "#666" }}>
          Processing, please wait...
        </div>
      )}

      <div style={{ marginTop: 32, fontSize: 12, textAlign: "center", color: "#888" }}>
        If nothing happens, return to the login page and request a new link.
      </div>
    </div>
  );
};

export default FinishSignIn;
