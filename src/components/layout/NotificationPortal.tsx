import React from 'react';
import { NotificationState } from '../../hooks/useNotification.ts';

interface Props {
  notifications: NotificationState[];
}

export const NotificationPortal: React.FC<Props> = ({ notifications }) => {
  if (!notifications.length) return null;
  return (
    <div style={wrap}>
      {notifications.map(n => (
        <div
          key={n.id}
          style={{
            ...item,
            background: n.type === 'success' ? '#1d8533' : '#b51d1d'
          }}
        >
          {n.message}
        </div>
      ))}
    </div>
  );
};

const wrap: React.CSSProperties = {
  position: 'fixed',
  top: 16,
  right: 16,
  zIndex: 9999,
  display: 'flex',
  flexDirection: 'column',
  gap: 8
};

const item: React.CSSProperties = {
  color: '#fff',
  padding: '10px 14px',
  borderRadius: 6,
  fontSize: 14,
  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  maxWidth: 280,
  lineHeight: 1.4
};
