import React, { useState, useEffect, useMemo } from 'react';
import debounce from 'lodash.debounce';

interface OptimizedTextInputProps {
  value?: string; // 新增：受控模式
  initialValue?: string; // 兼容旧用法
  onUpdate: (newValue: string) => void;
  debounceTime?: number;
  placeholder?: string;
  type?: string;
  className?: string;
  isTextArea?: boolean;
  style?: React.CSSProperties;
  disabled?: boolean;
}

const OptimizedTextInput: React.FC<OptimizedTextInputProps> = ({
  value,
  initialValue = '',
  onUpdate,
  debounceTime = 100,
  isTextArea = false,
  ...rest
}) => {
  // 优先受控（value），否则降级为初始值模式
  const isControlled = value !== undefined;
  const [localValue, setLocalValue] = useState(value ?? initialValue);

  // 受控模式：value变化时同步本地
  useEffect(() => {
    if (isControlled) setLocalValue(value!);
  }, [value, isControlled]);

  // 非受控（初始值模式）：initialValue变化时同步
  useEffect(() => {
    if (!isControlled) setLocalValue(initialValue);
  }, [initialValue, isControlled]);

  const debouncedUpdate = useMemo(
    () => debounce(onUpdate, debounceTime),
    [onUpdate, debounceTime]
  );

  useEffect(() => () => debouncedUpdate.cancel(), [debouncedUpdate]);

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
