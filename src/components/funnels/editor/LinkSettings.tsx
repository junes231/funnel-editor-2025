import React from 'react';

interface Props {
  finalRedirectLink: string;
  setFinalRedirectLink: React.Dispatch<React.SetStateAction<string>>;
  tracking: string;
  setTracking: React.Dispatch<React.SetStateAction<string>>;
  conversionGoal: string;
  setConversionGoal: React.Dispatch<React.SetStateAction<string>>;
  onBack: () => void;
  notify: (m: string, t?: 'success' | 'error') => void;
}

export const LinkSettings: React.FC<Props> = ({
  finalRedirectLink,
  setFinalRedirectLink,
  tracking,
  setTracking,
  conversionGoal,
  setConversionGoal,
  onBack,
  notify
}) => {
  return (
    <div className="link-settings-container">
      <h2>🔗 Final Redirect Link Settings</h2>
      <p>Configure where the user is sent after completing the quiz.</p>
      <div className="form-group">
        <label>Custom Final Redirect Link:</label>
        <input
          value={finalRedirectLink}
          onChange={e => setFinalRedirectLink(e.target.value)}
          placeholder="https://your-custom-page.com"
        />
      </div>
      <div className="form-group">
        <label>Tracking Parameters (optional):</label>
        <input
          value={tracking}
          onChange={e => setTracking(e.target.value)}
          placeholder="utm_source=funnel&utm_campaign=launch"
        />
      </div>
      <div className="form-group">
        <label>Conversion Goal:</label>
        <select
          value={conversionGoal}
          onChange={e => setConversionGoal(e.target.value)}
        >
          <option>Product Purchase</option>
          <option>Email Subscription</option>
          <option>Free Trial</option>
        </select>
      </div>
      <div className="form-actions">
        <button
          className="save-button"
          onClick={() => notify('Settings applied (auto-saved)')}
        >
          💾 Applied
        </button>
        <button className="cancel-button" onClick={onBack}>← Back to Editor</button>
      </div>
    </div>
  );
};
