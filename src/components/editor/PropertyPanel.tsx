import React from 'react';
import { FunnelComponent } from '../../types/funnel';
import './PropertyPanel.css';

interface PropertyPanelProps {
  selectedComponent: FunnelComponent | null;
  onUpdateComponent: (id: string, updates: Partial<FunnelComponent>) => void;
}

const PropertyPanel: React.FC<PropertyPanelProps> = ({
  selectedComponent,
  onUpdateComponent,
}) => {
  if (!selectedComponent) {
    return (
      <div className="property-panel">
        <div className="panel-header">
          <h3>⚙️ Properties</h3>
        </div>
        <div className="no-selection">
          <p>Select a component to edit its properties</p>
        </div>
      </div>
    );
  }

  const updateData = (key: string, value: any) => {
    onUpdateComponent(selectedComponent.id, {
      data: { ...selectedComponent.data, [key]: value }
    });
  };

  const updateAnswer = (index: number, value: string) => {
  const newAnswers = [...(selectedComponent.data.answers || [])];
  // 确保答案对象存在，如果不存在则创建一个
  if (!newAnswers[index]) {
    newAnswers[index] = { id: 'answer-' + Date.now(), text: value };
  } else {
    // 只更新 text 字段
    newAnswers[index].text = value;
  }
  updateData('answers', newAnswers);
};

  const updateAffiliateLink = (index: number, value: string) => {
    const newLinks = [...(selectedComponent.data.affiliateLinks || [])];
    newLinks[index] = value;
    updateData('affiliateLinks', newLinks);
  };

  return (
    <div className="property-panel">
      <div className="panel-header">
        <h3>⚙️ Properties</h3>
        <span className="component-type">{selectedComponent.type}</span>
      </div>

      <div className="property-sections">
        {selectedComponent.type === 'quiz' && (
          <>
            <div className="property-section">
              <h4>📝 Content</h4>
              <div className="form-group">
                <label>Question:</label>
                <textarea
                  value={selectedComponent.data.question}
                  onChange={(e) => updateData('question', e.target.value)}
                  placeholder="Enter your question"
                />
              </div>

              <div className="form-group">
                <label>Answers:</label>
                {selectedComponent.data.answers.map((answer: string, index: number) => (
                  <div key={index} className="answer-group">
                    <input
                      type="text"
                      value={answer}
                      onChange={(e) => updateAnswer(index, e.target.value)}
                      placeholder={`Answer ${index + 1}`}
                    />
                    <input
                      type="url"
                      value={selectedComponent.data.affiliateLinks?.[index] || ''}
                      onChange={(e) => updateAffiliateLink(index, e.target.value)}
                      placeholder="Affiliate link"
                      className="affiliate-input"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="property-section">
              <h4>🎨 Styling</h4>
              <div className="color-controls">
                <div className="color-group">
                  <label>Button Color:</label>
                  <input
                    type="color"
                    value={selectedComponent.data.buttonColor}
                    onChange={(e) => updateData('buttonColor', e.target.value)}
                  />
                </div>

                <div className="color-group">
                  <label>Background:</label>
                  <input
                    type="color"
                    value={selectedComponent.data.backgroundColor}
                    onChange={(e) => updateData('backgroundColor', e.target.value)}
                  />
                </div>

                <div className="color-group">
                  <label>Text Color:</label>
                  <input
                    type="color"
                    value={selectedComponent.data.textColor}
                    onChange={(e) => updateData('textColor', e.target.value)}
                  />
                </div>

                <div className="color-group">
                  <label>Button Text:</label>
                  <input
                    type="color"
                    value={selectedComponent.data.buttonTextColor}
                    onChange={(e) => updateData('buttonTextColor', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PropertyPanel;
