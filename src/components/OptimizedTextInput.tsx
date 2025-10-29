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

  // 【核心修复 1】: 监听 initialValue 变化，同步到 localValue
  // 解决了当父组件属性更新后，输入框内容没有被正确同步的问题。
  // 注意：这个 useEffect 只有在 localValue 与传入的 initialValue 不一致时才会同步。
  useEffect(() => {
    // 只有当传入的 prop 与当前的 localValue 不一致时，才进行同步
    if (initialValue !== localValue) {
      setLocalValue(initialValue);
    }
  }, [initialValue]); 


  const debouncedUpdate = useMemo(
    () => debounce(onUpdate, debounceTime),
    [onUpdate, debounceTime]
  );

  // 确保在组件卸载时取消所有待执行的 debouncedUpdate
   useEffect(() => {
    return () => {
      debouncedUpdate.cancel();
    };
  }, [debouncedUpdate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    
    // 【核心修复 2】: 立即调用 debouncedUpdate
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
