import { useState, useCallback } from 'react';
import { FiX, FiBell } from 'react-icons/fi';
import type { TodoItem } from '../types';

interface Toast {
  id: string;
  todo: TodoItem;
}

export function useNotificationToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback(async (todo: TodoItem) => {
    const toast: Toast = { id: `${Date.now()}-${todo.id}`, todo };
    setToasts((prev) => [...prev, toast]);

    // Windows native notification
    try {
      const { isPermissionGranted, requestPermission, sendNotification } = await import('@tauri-apps/plugin-notification');
      let granted = await isPermissionGranted();
      if (!granted) {
        const result = await requestPermission();
        granted = result === 'granted';
      }
      if (granted) {
        sendNotification({
          title: '待办事项提醒',
          body: `"${todo.title}" 已到截止时间`,
        });
      }
    } catch {
      // Notification plugin might not be available
    }

    // Auto-dismiss after 6s
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toast.id));
    }, 6000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, addToast, removeToast };
}

export function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-[110] max-w-[250px]">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="flex items-start gap-2 p-3 rounded-lg shadow-lg toast-enter"
          style={{
            background: 'var(--card-bg)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid var(--border-color)',
          }}
        >
          <FiBell size={15} className="text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium" style={{ wordBreak: 'break-word' }}>{toast.todo.title}</div>
            <div className="text-xs opacity-50 mt-0.5">截止时间已到</div>
          </div>
          <button
            onClick={() => onRemove(toast.id)}
            className="w-5 h-5 flex items-center justify-center rounded opacity-50 hover:opacity-100 shrink-0"
          >
            <FiX size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}
