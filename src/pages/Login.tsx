import React from "react";
import { useLocation } from "react-router-dom";
import Login from "../components/Login.tsx";

/**
 * Login page wrapper.
 *  - 如果 URL 包含 ?verified=1，会显示一个成功提示（Login 组件内也应以 signIn 返回的 user.emailVerified 为准做最终检查）
 */
export default function LoginPage(): JSX.Element {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const verified = params.get("verified");

  return (
    <div>
      {verified === "1" && (
        <div style={{ margin: "12px 0", padding: 12, background: "#e6ffed", border: "1px solid #b7f0c9", borderRadius: 6 }}>
          Email verified — please sign in now.
        </div>
      )}
      <Login />
    </div>
  );
}
