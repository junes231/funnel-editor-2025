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
  debounceTime = 300,
  isTextArea = false,
  ...rest
}) => {
  const [localValue, setLocalValue] = useState(initialValue);

  const debouncedUpdate = useMemo(
    () => debounce(onUpdate, debounceTime),
    [onUpdate, debounceTime]
  );

  useEffect(() => {
    if (initialValue !== localValue) {
      setLocalValue(initialValue);
      debouncedUpdate.cancel();
    }
  }, [initialValue, localValue, debouncedUpdate]); 

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
