import React from 'react';
import { useDrop } from 'react-dnd';
import QuizComponent from './components/QuizComponent.tsx';
import FormComponent from './components/FormComponent.tsx'; 
import { FunnelComponent } from '../../types/funnel.ts';
import './Canvas.css';

interface CanvasProps {
  components: FunnelComponent[];
  selectedComponent: FunnelComponent | null;
  onSelectComponent: (component: FunnelComponent) => void;
  onUpdateComponent: (id: string, updates: Partial<FunnelComponent>) => void;
}

const Canvas: React.FC<CanvasProps> = ({
  components,
  selectedComponent,
  onSelectComponent,
  onUpdateComponent,
}) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'component',
    drop: (item: { type: string }, monitor) => {
      const offset = monitor.getClientOffset();
      if (offset) {
        const canvasRect = document.getElementById('canvas')?.getBoundingClientRect();
        if (canvasRect) {
          const position = {
            x: offset.x - canvasRect.left,
            y: offset.y - canvasRect.top,
          };
          onAddComponent(item.type, position);
        }
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  const renderComponent = (component: FunnelComponent) => {
    switch (component.type) {
      case 'quiz':
        return (
          <QuizComponent
            key={component.id}
            component={component}
            isSelected={selectedComponent?.id === component.id}
            onSelect={() => onSelectComponent(component)}
            onUpdate={(updates) => onUpdateComponent(component.id, updates)}
          />
        );
          case 'form':
        return (
          <FormComponent
            key={component.id}
            component={component}
            isSelected={selectedComponent?.id === component.id}
            onSelect={() => onSelectComponent(component)}
            onUpdate={(updates) => onUpdateComponent(component.id, updates)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="canvas-container">
      <div className="canvas-toolbar">
        <button className="canvas-btn">🔍 Zoom In</button>
        <button className="canvas-btn">🔍 Zoom Out</button>
        <button className="canvas-btn">📱 Mobile View</button>
        <button className="canvas-btn">💻 Desktop View</button>
      </div>
      
      <div
        id="canvas"
        ref={drop}
        className={`canvas ${isOver ? 'drag-over' : ''}`}
      >
        {components.length === 0 ? (
          <div className="canvas-placeholder">
            <div className="placeholder-content">
              <span className="placeholder-icon">🎯</span>
              <h3>Start Building Your Funnel</h3>
              <p>Drag components from the left panel to get started</p>
            </div>
          </div>
        ) : (
          components.map(renderComponent)
        )}
      </div>
    </div>
  );
};

export default Canvas;
