import React, { useState, useCallback } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import ComponentLibrary from '../components/editor/ComponentLibrary';
import Canvas from '../components/editor/Canvas';
import PropertyPanel from '../components/editor/PropertyPanel';
import Toolbar from '../components/editor/Toolbar';
import { FunnelComponent } from '../types/funnel';
import './EditorPage.css';

const EditorPage: React.FC = () => {
  const [components, setComponents] = useState<FunnelComponent[]>([]);
  const [selectedComponent, setSelectedComponent] = useState<FunnelComponent | null>(null);

  const addComponent = useCallback((componentType: string, position: { x: number; y: number }) => {
    const newComponent: FunnelComponent = {
      id: `${componentType}-${Date.now()}`,
      type: componentType,
      position,
      data: getDefaultData(componentType),
    };
    setComponents(prev => [...prev, newComponent]);
  }, []);

  const updateComponent = useCallback((id: string, updates: Partial<FunnelComponent>) => {
    setComponents(prev => 
      prev.map(comp => comp.id === id ? { ...comp, ...updates } : comp)
    );
  }, []);

   const getDefaultData = (type: string) => {
    switch (type) {
      case 'quiz':
        return {
          title: "What's your biggest challenge?",
          answers: ['Option A', 'Option B', 'Option C', 'Option D'],
          buttonColor: '#007bff',
          backgroundColor: '#ffffff',
          textColor: '#333333',
          buttonTextColor: '#ffffff',
          affiliateLinks: ['', '', '', '']
        };
      // 【中文注释：新增表单组件的默认数据】
      case 'form':
        return {
          formTitle: "Get Your Custom Plan!",
          formFields: [
            { type: 'text', label: 'Name', placeholder: 'Enter your name' },
            { type: 'email', label: 'Email', placeholder: 'Enter your best email' },
          ],
          buttonColor: '#28a745',
          backgroundColor: '#ffffff',
          textColor: '#333333',
          buttonTextColor: '#ffffff',
          submitButtonText: 'Download Now',
          webhookUrl: '',
          redirectAfterSubmit: '',
        };
      default:
        return {};
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="editor-page">
        <Toolbar components={components} />
        
        <div className="editor-layout">
          <ComponentLibrary onAddComponent={addComponent} />
          
          <Canvas 
            components={components}
            selectedComponent={selectedComponent}
            onSelectComponent={setSelectedComponent}
            onUpdateComponent={updateComponent}
          />
          
          <PropertyPanel 
            selectedComponent={selectedComponent}
            onUpdateComponent={updateComponent}
          />
        </div>
      </div>
    </DndProvider>
  );
};

export default EditorPage;
