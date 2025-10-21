// src/components/OptimizedTextInput.tsx

import React, { useState, useEffect, useMemo } from 'react';
import debounce from 'lodash.debounce';

interface OptimizedTextInputProps {
  initialValue: string;
  onUpdate: (newValue: string) => void;
  debounceTime?: number;
  placeholder?: string;
  type?: string;
  className?: string;
  isTextArea?: boolean;
  style?: React.CSSProperties;
}

const OptimizedTextInput: React.FC<OptimizedTextInputProps> = ({
  initialValue,
  onUpdate,
  debounceTime = 100,
  isTextArea = false,
  ...rest
}) => {
  const [localValue, setLocalValue] = useState(initialValue);

  const debouncedUpdate = useMemo(
    () => debounce(onUpdate, debounceTime),
    [onUpdate, debounceTime]
  );
   useEffect(() => {
    // 只有在外部传入的 initialValue 改变时，才更新组件内部的 localValue
    setLocalValue(initialValue);
  }, [initialValue]); 
  
  useEffect(() => {
    return () => {
      debouncedUpdate.cancel();
    };
  }, [debouncedUpdate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    debouncedUpdate(newValue);
  };

  const commonProps = {
    value: localValue,
    onChange: handleChange,
    ...rest,
  };

  return isTextArea ? (
    <textarea {...commonProps} />
  ) : (
    <input {...commonProps} type={rest.type || 'text'} />
  );
};

export default OptimizedTextInput;
