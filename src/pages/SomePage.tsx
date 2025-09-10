import React from "react";
import BackButton from "../components/BackButton";

function SomePage() {
  return (
    <div style={{ padding: 24 }}>
      <h2>Back Button Demo</h2>
      <BackButton>{"< Back to All Funnels"}</BackButton>
      <BackButton>{"Back to Funnel Dashboard"}</BackButton>
      <BackButton>{"< Back to Editor"}</BackButton>
    </div>
  );
}

export default SomePage;
