import React from 'react';

interface Props {
  primaryColor: string; setPrimaryColor: React.Dispatch<React.SetStateAction<string>>;
  buttonColor: string; setButtonColor: React.Dispatch<React.SetStateAction<string>>;
  backgroundColor: string; setBackgroundColor: React.Dispatch<React.SetStateAction<string>>;
  textColor: string; setTextColor: React.Dispatch<React.SetStateAction<string>>;
  onBack: () => void;
  notify: (m: string, t?: 'success' | 'error') => void;
}

export const ColorCustomizer: React.FC<Props> = ({
  primaryColor, setPrimaryColor,
  buttonColor, setButtonColor,
  backgroundColor, setBackgroundColor,
  textColor, setTextColor,
  onBack, notify
}) => {
  return (
    <div className="color-customizer-container">
      <h2>🎨 Color Customization</h2>
      <p>Adjust color theme (auto-saved).</p>
      <div className="form-group">
        <label>Primary Color:</label>
        <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} />
      </div>
      <div className="form-group">
        <label>Button Color:</label>
        <input type="color" value={buttonColor} onChange={e => setButtonColor(e.target.value)} />
      </div>
      <div className="form-group">
        <label>Background Color:</label>
        <input type="color" value={backgroundColor} onChange={e => setBackgroundColor(e.target.value)} />
      </div>
      <div className="form-group">
        <label>Text Color:</label>
        <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} />
      </div>
      <div className="form-actions">
        <button className="save-button" onClick={() => notify('Color settings applied')}>
          💾 Applied
        </button>
        <button className="cancel-button" onClick={onBack}>← Back to Editor</button>
      </div>
    </div>
  );
};
