import type { TodoItem } from '../types';

export function formatTime(isoString: string): string {
  const d = new Date(isoString);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  const absDiff = Math.abs(diff);

  // Deadline countdown
  if (diff < 0) {
    if (absDiff < 3600000) return '已过期';
    if (absDiff < 86400000) return `${Math.floor(absDiff / 3600000)}小时前过期`;
    return `${Math.floor(absDiff / 86400000)}天前过期`;
  }
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟后截止`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时后截止`;
  if (diff < 172800000) return '明天截止';
  return `${Math.floor(diff / 86400000)}天后截止`;
}

export function formatDate(isoString: string): string {
  const d = new Date(isoString);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function isDeadlinePassed(isoString: string): boolean {
  return new Date(isoString).getTime() < Date.now();
}

export function isDeadlineSoon(isoString: string): boolean {
  const diff = new Date(isoString).getTime() - Date.now();
  return diff > 0 && diff < 3600000; // within 1 hour
}

export function generateId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function sortTodos(todos: TodoItem[]): TodoItem[] {
  return [...todos].sort((a, b) => {
    if (a.isListPinned !== b.isListPinned) return a.isListPinned ? -1 : 1;
    return a.sortOrder - b.sortOrder;
  });
}
