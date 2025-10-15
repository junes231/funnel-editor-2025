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
  // 1. 本地状态：确保输入流畅
  const [localValue, setLocalValue] = useState(initialValue);

  // 2. 稳定的防抖函数：确保 onUpdate 只有在停止输入后才触发
  const debouncedUpdate = useMemo(
    () => debounce(onUpdate, debounceTime),
    [onUpdate, debounceTime]
  );

  // 3. 效果：同步外部状态到本地 (例如，切换问题时)
  useEffect(() => {
    // 只有当外部值与本地值不同时才进行同步，避免覆盖未防抖完成的输入
    if (initialValue !== localValue) {
      setLocalValue(initialValue);
      // 如果外部值改变，取消任何正在等待的更新
      debouncedUpdate.cancel();
    }
  }, [initialValue]); 

  // 4. 效果：清理防抖函数 (组件卸载或更新时)
  useEffect(() => {
    return () => {
      debouncedUpdate.cancel();
    };
  }, [debouncedUpdate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    // 立即更新本地状态
    setLocalValue(newValue);
    // 延迟调用父组件的 onUpdate
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
