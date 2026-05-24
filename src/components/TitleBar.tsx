import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { FiMinus, FiX, FiMapPin } from 'react-icons/fi';
import { useCallback } from 'react';

const appWindow = getCurrentWindow();

interface Props {
  onSettingsClick: () => void;
  isPinned: boolean;
  onPinChange: (pinned: boolean) => void;
  isCursorIgnored: boolean;
  onCursorIgnoreChange: (ignored: boolean) => void;
  isGhostMode: boolean;
  onGhostModeChange: (enabled: boolean) => void;
}

export default function TitleBar({ onSettingsClick, isPinned, onPinChange, isCursorIgnored, onCursorIgnoreChange, isGhostMode, onGhostModeChange }: Props) {
  const handlePin = async () => {
    const next = !isPinned;
    onPinChange(next);
    await invoke('set_always_on_top', { onTop: next });
  };

  const handleCursorIgnore = async () => {
    const next = !isCursorIgnored;
    onCursorIgnoreChange(next);
    await invoke('set_ignore_cursor_events', { ignore: next });
  };

  const handleGhostMode = () => {
    onGhostModeChange(!isGhostMode);
  };

  const handleMinimize = useCallback(() => {
    invoke('minimize_window');
  }, []);

  const handleHide = useCallback(() => {
    invoke('hide_window');
  }, []);

  const handleDragStart = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;
    appWindow.startDragging();
  };

  return (
    <div className="titlebar titlebar-drag flex items-center justify-between h-12 px-4 shrink-0" style={{ background: 'transparent' }} onMouseDown={handleDragStart}>
      <div className="flex items-center gap-2 titlebar-no-drag">
        <button
          onClick={handlePin}
          className={`w-8 h-8 flex items-center justify-center rounded-full text-sm transition-colors ${
            isPinned ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
          title={isPinned ? '取消置顶' : '置顶窗口'}
        >
          <FiMapPin size={14} />
        </button>
        <button
          onClick={handleCursorIgnore}
          className={`w-8 h-8 flex items-center justify-center rounded-full text-sm transition-colors ${
            isCursorIgnored ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
          title={isCursorIgnored ? '取消鼠标穿透' : '鼠标穿透'}
        >
          <span style={{ fontSize: '14px', lineHeight: 1 }}>🖱️</span>
        </button>
        <button
          onClick={handleGhostMode}
          className={`w-8 h-8 flex items-center justify-center rounded-full text-sm transition-colors ${
            isGhostMode ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
          title={isGhostMode ? '关闭幽灵模式' : '幽灵模式'}
        >
          <span style={{ fontSize: '14px', lineHeight: 1 }}>👻</span>
        </button>
        <button
          onClick={onSettingsClick}
          className="w-8 h-8 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          title="设置"
        >
          <span style={{ fontSize: '14px' }}>⚙️</span>
        </button>
      </div>

      <div className="flex items-center gap-1 titlebar-no-drag">
        <button
          onClick={handleMinimize}
          className="w-8 h-8 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        >
          <FiMinus size={15} />
        </button>
        <button
          onClick={handleHide}
          className="w-8 h-8 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-red-500/80 transition-colors"
        >
          <FiX size={15} />
        </button>
      </div>
    </div>
  );
}
