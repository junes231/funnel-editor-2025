// src/pages/SomePage.tsx (现在是正确的用法)

import BackButton from "../components/BackButton.tsx";

function SomePage() {
  return (
    <div>
      <BackButton>&lt; Back to All Funnels</BackButton>
      <BackButton>Back to Funnel Dashboard</BackButton>
      <BackButton>&lt; Back to Editor</BackButton>
    </div>
  );
}

export default SomePage;
