import { useCallback, useState } from 'react';

export interface NotificationState {
  id: number;
  message: string;
  type: 'success' | 'error';
}

export function useNotification() {
  const [items, setItems] = useState<NotificationState[]>([]);

  const push = useCallback((message: string, type: 'success' | 'error' = 'success', ttl = 1500) => {
    const id = Date.now() + Math.random();
    setItems(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setItems(prev => prev.filter(n => n.id !== id));
    }, ttl);
  }, []);

  const clear = useCallback(() => setItems([]), []);

  return { notifications: items, push, clear };
}
