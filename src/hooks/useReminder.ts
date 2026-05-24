import { useEffect, useRef } from 'react';
import type { TodoItem } from '../types';

export function useReminder(
  activeTodos: TodoItem[],
  onRemind: (todo: TodoItem) => void,
  onUpdateRemindedAt: (id: string, time: string) => void
) {
  const remindedSet = useRef<Set<string>>(new Set());

  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      for (const todo of activeTodos) {
        if (!todo.deadline) continue;
        const deadline = new Date(todo.deadline);
        if (deadline <= now) {
          // Already reminded today?
          if (todo.remindedAt) {
            const remindedDate = new Date(todo.remindedAt);
            if (remindedDate.toDateString() === now.toDateString()) continue;
          }
          if (remindedSet.current.has(todo.id)) continue;

          remindedSet.current.add(todo.id);
          onRemind(todo);
          onUpdateRemindedAt(todo.id, now.toISOString());
        }
      }
    };

    checkReminders();
    const interval = setInterval(checkReminders, 10000);
    return () => clearInterval(interval);
  }, [activeTodos, onRemind, onUpdateRemindedAt]);
}
