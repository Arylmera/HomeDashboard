import { memo } from 'react';
import { useToasts } from '../../../lib/toast.js';

export const ToastHost = memo(function ToastHost() {
  const list = useToasts();
  if (list.length === 0) return null;
  return (
    <div className="toast-host" aria-live="polite">
      {list.map(t => (
        <div key={t.id} className={`toast toast-${t.kind || 'info'}`}>{t.message}</div>
      ))}
    </div>
  );
});
