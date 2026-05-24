import { useState, useEffect, useCallback } from 'react';
import type { TodoItem } from '../types';
import { generateId, sortTodos } from '../utils';
import * as db from '../db/database';

export function useTodos() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [subTodos, setSubTodos] = useState<Record<string, TodoItem[]>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    db.loadTodos().then((items) => {
      setTodos(items);
      setLoaded(true);
    });
  }, []);

  const addTodo = useCallback(async (title: string, priority: 1 | 2 | 3 = 2, deadline?: string, note?: string) => {
    const item: TodoItem = {
      id: generateId(),
      title,
      note: note || '',
      priority,
      status: 'active',
      sortOrder: Date.now(),
      isListPinned: false,
      isWindowFixed: false,
      createdAt: new Date().toISOString(),
      deadline: deadline || undefined,
    };
    await db.saveTodo(item);
    setTodos((prev) => sortTodos([...prev, item]));
  }, []);

  const addSubTodo = useCallback(async (parentId: string, title: string) => {
    const item: TodoItem = {
      id: generateId(),
      title,
      priority: 2,
      status: 'active',
      sortOrder: Date.now(),
      isListPinned: false,
      isWindowFixed: false,
      parentId,
      createdAt: new Date().toISOString(),
    };
    await db.saveTodo(item);
    setSubTodos((prev) => ({
      ...prev,
      [parentId]: [...(prev[parentId] || []), item],
    }));
  }, []);

  const loadSubTodos = useCallback(async (parentId: string) => {
    const items = await db.loadSubTodos(parentId);
    setSubTodos((prev) => ({ ...prev, [parentId]: items }));
  }, []);

  const updateTodo = useCallback(async (id: string, updates: Partial<TodoItem>) => {
    setTodos((prev) => {
      const next = prev.map((t) => (t.id === id ? { ...t, ...updates } : t));
      const updated = next.find((t) => t.id === id);
      if (updated) db.saveTodo(updated);
      return sortTodos(next);
    });
  }, []);

  const toggleComplete = useCallback(async (id: string) => {
    setTodos((prev) => {
      const todo = prev.find((t) => t.id === id);
      if (!todo) return prev;
      const newStatus = todo.status === 'completed' ? 'active' : 'completed';
      db.updateTodoStatus(id, newStatus);
      return prev.map((t) =>
        t.id === id ? { ...t, status: newStatus, completedAt: newStatus === 'completed' ? new Date().toISOString() : undefined } : t
      );
    });
  }, []);

  const toggleSubComplete = useCallback(async (parentId: string, subId: string) => {
    setSubTodos((prev) => {
      const subs = prev[parentId] || [];
      const sub = subs.find((s) => s.id === subId);
      if (!sub) return prev;
      const newStatus = sub.status === 'completed' ? 'active' : 'completed';
      const updated: TodoItem = { ...sub, status: newStatus, completedAt: newStatus === 'completed' ? new Date().toISOString() : undefined };
      db.saveTodo(updated);
      return { ...prev, [parentId]: subs.map((s) => (s.id === subId ? updated : s)) };
    });
  }, []);

  const removeTodo = useCallback(async (id: string) => {
    await db.deleteTodo(id);
    setTodos((prev) => prev.filter((t) => t.id !== id));
    setSubTodos((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const removeSubTodo = useCallback(async (parentId: string, subId: string) => {
    await db.deleteTodo(subId);
    setSubTodos((prev) => ({
      ...prev,
      [parentId]: (prev[parentId] || []).filter((s) => s.id !== subId),
    }));
  }, []);

  const togglePin = useCallback(async (id: string) => {
    setTodos((prev) => {
      const todo = prev.find((t) => t.id === id);
      if (!todo) return prev;
      const pinned = !todo.isListPinned;
      db.updateTodoPin(id, pinned);
      return sortTodos(prev.map((t) => (t.id === id ? { ...t, isListPinned: pinned } : t)));
    });
  }, []);

  const reorderTodos = useCallback(async (orderedIds: string[]) => {
    setTodos((prev) => {
      const sorted = orderedIds.map((id, idx) => {
        const todo = prev.find((t) => t.id === id)!;
        return { ...todo, sortOrder: idx };
      });
      const updates = sorted.map((t) => ({ id: t.id, sortOrder: t.sortOrder }));
      db.updateTodoSortOrders(updates);
      return sortTodos(sorted);
    });
  }, []);

  const updateTodoRemindedAt = useCallback(async (id: string, time: string) => {
    await db.updateTodoRemindedAt(id, time);
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, remindedAt: time } : t)));
  }, []);

  const activeTodos = sortTodos(todos.filter((t) => t.status === 'active'));
  const completedTodos = todos.filter((t) => t.status === 'completed');

  return {
    todos, activeTodos, completedTodos, subTodos, loaded,
    addTodo, addSubTodo, loadSubTodos, updateTodo, toggleComplete,
    toggleSubComplete, removeTodo, removeSubTodo, togglePin,
    reorderTodos, updateTodoRemindedAt,
  };
}
