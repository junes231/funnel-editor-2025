import React from 'react';
import { FunnelComponent } from '../../../types/funnel.ts';
import './FormComponent.css';

interface FormComponentProps {
  component: FunnelComponent;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<FunnelComponent>) => void;
}

const FormComponent: React.FC<FormComponentProps> = ({
  component,
  isSelected,
  onSelect,
}) => {
  const { data, position } = component;

  return (
    <div
      className={`form-component ${isSelected ? 'selected' : ''}`}
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        backgroundColor: data.backgroundColor,
        color: data.textColor,
      }}
      onClick={onSelect}
    >
      <div className="form-preview">
        <h3 className="form-title">{data.formTitle || 'Lead Capture Form'}</h3>
        
        <form>
          {(data.formFields || []).map((field, index) => (
            <div key={index} className="form-field">
              {/* 【中文注释：在画布预览中，输入框被禁用，只做展示】 */}
              <input
                type={field.type}
                placeholder={field.placeholder}
                disabled
              />
            </div>
          ))}

          <button
            type="submit"
            className="submit-btn"
            style={{
              backgroundColor: data.buttonColor,
              color: data.buttonTextColor,
            }}
            disabled // 【中文注释：在画布预览中禁用按钮】
          >
            {data.submitButtonText || 'Submit'}
          </button>
        </form>
      </div>
      
      {isSelected && (
        <div className="component-controls">
          <button className="control-btn">📝</button>
          <button className="control-btn">🗑️</button>
        </div>
      )}
    </div>
  );
};

export default FormComponent;
