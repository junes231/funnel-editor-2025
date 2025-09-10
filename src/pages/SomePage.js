import BackButton from "../components/BackButton.js";

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
