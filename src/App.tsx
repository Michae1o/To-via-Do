import { useState, useCallback, useEffect, useRef } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { listen } from '@tauri-apps/api/event';
import TitleBar from './components/TitleBar';
import AddTodoInput from './components/AddTodoInput';
import TodoList from './components/TodoList';
import CompletedSection from './components/CompletedSection';
import SettingsPanel from './components/SettingsPanel';
import { ToastContainer, useNotificationToast } from './components/NotificationToast';
import { useTodos } from './hooks/useTodos';
import { useTheme } from './hooks/useTheme';
import { useReminder } from './hooks/useReminder';
import { loadWindowConfig, saveWindowConfig } from './db/database';
import type { WindowConfig } from './db/database';
import type { TodoItem } from './types';

const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export default function App() {
  const [showSettings, setShowSettings] = useState(false);
  const { theme, updateTheme, loaded: themeLoaded } = useTheme();
  const {
    activeTodos, completedTodos, subTodos, loaded: todosLoaded,
    addTodo, addSubTodo, loadSubTodos, updateTodo, toggleComplete,
    toggleSubComplete, removeTodo, removeSubTodo, togglePin,
    reorderTodos, updateTodoRemindedAt,
  } = useTodos();

  const { toasts, addToast, removeToast } = useNotificationToast();

  // Window config state
  const [windowConfig, setWindowConfig] = useState<WindowConfig>({
    alwaysOnTop: false,
    ignoreCursorEvents: false,
    ghostMode: false,
  });
  const [configLoaded, setConfigLoaded] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Idle state
  const isIdleRef = useRef(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ghost mode state
  const [ghostDimmed, setGhostDimmed] = useState(false);

  const enterIdle = useCallback(async () => {
    isIdleRef.current = true;
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('set_ignore_cursor_events', { ignore: true });
    setWindowConfig((prev) => {
      const next = { ...prev, ignoreCursorEvents: true };
      saveWindowConfig(next);
      return next;
    });
  }, []);

  const exitIdle = useCallback(async () => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    isIdleRef.current = false;
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('set_ignore_cursor_events', { ignore: false });
    setWindowConfig((prev) => {
      const next = { ...prev, ignoreCursorEvents: false };
      saveWindowConfig(next);
      return next;
    });
  }, []);

  const resetIdleTimer = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      enterIdle();
    }, IDLE_TIMEOUT_MS);
  }, [enterIdle]);

  // Load window config on mount
  useEffect(() => {
    loadWindowConfig().then(async (config) => {
      setWindowConfig(config);
      setConfigLoaded(true);
      if (config.alwaysOnTop) {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('set_always_on_top', { onTop: true });
      }
      if (config.windowX !== undefined && config.windowY !== undefined) {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('set_window_position', { x: config.windowX, y: config.windowY });
      }
      if (config.ignoreCursorEvents) {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('set_ignore_cursor_events', { ignore: true });
      }
    });
  }, []);

  // Listen for tray menu clickthrough toggle
  useEffect(() => {
    const unlisten = listen<boolean>('tray-toggle-clickthrough', (event) => {
      setWindowConfig((prev) => {
        const next = { ...prev, ignoreCursorEvents: event.payload };
        saveWindowConfig(next);
        return next;
      });
      exitIdle();
      resetIdleTimer();
    });
    return () => { unlisten.then((fn) => fn()); };
  }, [exitIdle, resetIdleTimer]);

  // Listen for focus-based auto-disable of clickthrough
  useEffect(() => {
    const unlisten = listen('focus-disable-clickthrough', () => {
      exitIdle();
      resetIdleTimer();
    });
    return () => { unlisten.then((fn) => fn()); };
  }, [exitIdle, resetIdleTimer]);

  // Listen for window focused event (for idle recovery)
  useEffect(() => {
    const unlisten = listen('window-focused', () => {
      exitIdle();
      resetIdleTimer();
    });
    return () => { unlisten.then((fn) => fn()); };
  }, [exitIdle, resetIdleTimer]);

  // Save window position on move (debounced)
  useEffect(() => {
    if (!configLoaded) return;
    const unlisten = getCurrentWindow().onMoved(({ payload }) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        setWindowConfig((prev) => {
          const next = { ...prev, windowX: payload.x, windowY: payload.y };
          saveWindowConfig(next);
          return next;
        });
      }, 500);
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [configLoaded]);

  // Ghost mode: mouse leave → dim, mouse enter → restore
  useEffect(() => {
    if (!configLoaded) return;
    if (!windowConfig.ghostMode) {
      setGhostDimmed(false);
      return;
    }
    const handleMouseLeave = () => setGhostDimmed(true);
    const handleMouseEnter = () => setGhostDimmed(false);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);
    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, [configLoaded, windowConfig.ghostMode]);

  // Idle detection: track user activity
  useEffect(() => {
    if (!configLoaded) return;
    resetIdleTimer();

    const handleActivity = () => {
      if (isIdleRef.current) {
        exitIdle();
      }
      resetIdleTimer();
    };
    document.addEventListener('mousemove', handleActivity);
    document.addEventListener('mousedown', handleActivity);
    document.addEventListener('keydown', handleActivity);

    return () => {
      document.removeEventListener('mousemove', handleActivity);
      document.removeEventListener('mousedown', handleActivity);
      document.removeEventListener('keydown', handleActivity);
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [configLoaded, resetIdleTimer, exitIdle]);

  const handlePinChange = useCallback((pinned: boolean) => {
    setWindowConfig((prev) => {
      const next = { ...prev, alwaysOnTop: pinned };
      saveWindowConfig(next);
      return next;
    });
  }, []);

  const handleCursorIgnoreChange = useCallback((ignored: boolean) => {
    setWindowConfig((prev) => {
      const next = { ...prev, ignoreCursorEvents: ignored };
      saveWindowConfig(next);
      return next;
    });
    if (ignored) {
      // Manually enabled: stop idle timer (user intends this)
      if (idleTimer.current) clearTimeout(idleTimer.current);
      isIdleRef.current = false;
    } else {
      // Manually disabled: restart idle tracking
      exitIdle();
      resetIdleTimer();
    }
  }, [exitIdle, resetIdleTimer]);

  const handleGhostModeChange = useCallback((enabled: boolean) => {
    setWindowConfig((prev) => {
      const next = { ...prev, ghostMode: enabled };
      saveWindowConfig(next);
      return next;
    });
  }, []);

  const handleRemind = useCallback((todo: TodoItem) => {
    addToast(todo);
  }, [addToast]);

  useReminder(activeTodos, handleRemind, updateTodoRemindedAt);

  if (!themeLoaded || !todosLoaded || !configLoaded) {
    return (
      <div className="glass-app flex items-center justify-center">
        <div className="text-sm opacity-50">加载中...</div>
      </div>
    );
  }

  return (
    <div className="glass-app" style={{ opacity: windowConfig.ignoreCursorEvents ? 0.2 : ghostDimmed ? 0.3 : 1, transition: 'opacity 0.8s ease' }}>
      <TitleBar
        onSettingsClick={() => setShowSettings(!showSettings)}
        isPinned={windowConfig.alwaysOnTop}
        onPinChange={handlePinChange}
        isCursorIgnored={windowConfig.ignoreCursorEvents}
        onCursorIgnoreChange={handleCursorIgnoreChange}
        isGhostMode={windowConfig.ghostMode}
        onGhostModeChange={handleGhostModeChange}
      />

      <AddTodoInput onAdd={addTodo} />

      <div className="flex-1 overflow-y-auto pb-2">
        {activeTodos.length === 0 && completedTodos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full opacity-30 gap-2">
            <span style={{ fontSize: '36px' }}>📝</span>
            <span className="text-sm">还没有待办事项，添加一个吧</span>
          </div>
        ) : (
          <TodoList
            todos={activeTodos}
            subTodos={subTodos}
            onToggle={toggleComplete}
            onRemove={removeTodo}
            onTogglePin={togglePin}
            onUpdate={updateTodo}
            onReorder={reorderTodos}
            onLoadSubs={loadSubTodos}
            onAddSub={addSubTodo}
            onToggleSub={toggleSubComplete}
            onRemoveSub={removeSubTodo}
          />
        )}

        <CompletedSection
          todos={completedTodos}
          onToggle={toggleComplete}
          onRemove={removeTodo}
        />
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {showSettings && (
        <SettingsPanel
          theme={theme}
          onUpdate={updateTheme}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
