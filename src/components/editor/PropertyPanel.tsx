import React from 'react';
import { FunnelComponent } from '../../types/funnel';
import './PropertyPanel.css';

// Helper functions to handle both array and object formats for answers
const getAnswersAsArray = (answers: any): { id: string; text: string; }[] => {
  if (!answers) return [];
  if (Array.isArray(answers)) return answers;
  if (typeof answers === 'object') return Object.values(answers);
  return [];
};

const updateAnswersFormat = (answers: any, index: number, value: string): { id: string; text: string; }[] => {
  const answersArray = getAnswersAsArray(answers);
  const newAnswers = [...answersArray];
  
  // Ensure answer object exists, create if not
  if (!newAnswers[index]) {
    newAnswers[index] = { id: 'answer-' + Date.now(), text: value };
  } else {
    // Only update text field
    newAnswers[index].text = value;
  }
  
  return newAnswers;
};

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
    const newAnswers = updateAnswersFormat(selectedComponent.data.answers, index, value);
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
                  value={selectedComponent.data.title}
                  onChange={(e) => updateData('title', e.target.value)}
                  placeholder="Enter your question"
                />
              </div>

              <div className="form-group">
                <label>Answers:</label>
                {getAnswersAsArray(selectedComponent.data.answers).map((answer: { id: string; text: string; }, index: number) => (
                  <div key={index} className="answer-group">
                    <input
                      type="text"
                      value={answer.text}
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
        {selectedComponent.type === 'form' && (
          <>
            <div className="property-section">
              <h4>📝 Content</h4>
              <div className="form-group">
                <label>Form Title:</label>
                <textarea
                  value={selectedComponent.data.formTitle}
                  onChange={(e) => updateData('formTitle', e.target.value)}
                  placeholder="e.g., Download Your Guide"
                />
              </div>
              <div className="form-group">
                <label>Submit Button Text:</label>
                <input
                  type="text"
                  value={selectedComponent.data.submitButtonText}
                  onChange={(e) => updateData('submitButtonText', e.target.value)}
                  placeholder="e.g., Get Access Now"
                />
              </div>
              {/* 【中文注释：简化字段编辑：目前只显示固定的 Name/Email 字段信息】 */}
              <div className="form-group">
                 <label>Form Fields (Fixed):</label>
                 <p style={{fontSize: '0.8rem', color: '#999', margin: '5px 0 0 10px'}}>Name (text), Email (email). 字段配置不可编辑。</p>
              </div>
            </div>

            <div className="property-section">
              <h4>🔗 Integration & Redirect</h4>
              <div className="form-group">
                <label>Webhook URL:</label>
                <input
                  type="url"
                  value={selectedComponent.data.webhookUrl}
                  onChange={(e) => updateData('webhookUrl', e.target.value)}
                  placeholder="https://your-crm-webhook.com/api"
                />
                <p style={{fontSize: '0.8rem', color: '#999', margin: '5px 0 0'}}>数据将发送到此地址。</p>
              </div>
              <div className="form-group">
                <label>Redirect After Submit:</label>
                <input
                  type="url"
                  value={selectedComponent.data.redirectAfterSubmit}
                  onChange={(e) => updateData('redirectAfterSubmit', e.target.value)}
                  placeholder="https://thank-you-page.com"
                />
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
