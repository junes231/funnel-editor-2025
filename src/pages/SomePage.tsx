// src/pages/SomePage.tsx
import BackButton from "../components/BackButton.tsx";

function SomePage() {
  return (
    <div>
      {/* 假设“/”是所有漏斗的列表页 */}
      <BackButton to="/">&lt; Back to All Funnels</BackButton>

      {/* 假设“/dashboard”是漏斗的仪表盘 */}
      <BackButton to="/dashboard">Back to Funnel Dashboard</BackButton>

      {/* 假设“/editor”是编辑器页面 */}
      <BackButton to="/editor">&lt; Back to Editor</BackButton>
    </div>
  );
}

export default SomePage;
