import { useState, useRef, useEffect } from 'react';
import { FiPlus, FiCalendar, FiFlag } from 'react-icons/fi';

interface Props {
  onAdd: (title: string, priority: 1 | 2 | 3, deadline?: string, note?: string) => void;
}

export default function AddTodoInput({ onAdd }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [priority, setPriority] = useState<1 | 2 | 3>(2);
  const [deadline, setDeadline] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    onAdd(trimmed, priority, deadline || undefined, note.trim() || undefined);
    setTitle('');
    setNote('');
    setPriority(2);
    setDeadline('');
    setExpanded(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="px-3 pt-1 pb-2">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setExpanded(true)}
          placeholder="添加待办事项..."
          className="flex-1 glass-input py-2.5"
          style={{ minWidth: 0, fontSize: '15px' }}
        />
        <button
          onClick={handleSubmit}
          disabled={!title.trim()}
          className="w-9 h-9 flex items-center justify-center rounded-full text-white shrink-0 transition-all duration-200"
          style={{
            background: 'var(--accent-color)',
            opacity: title.trim() ? 1 : 0.35,
            transform: title.trim() ? 'scale(1)' : 'scale(0.95)',
            boxShadow: title.trim() ? '0 2px 8px var(--accent-glow)' : 'none',
          }}
        >
          <FiPlus size={18} />
        </button>
      </div>

      {expanded && (
        <div className="flex items-center gap-3 mt-2 px-1 animate-in">
          {/* Priority */}
          <div className="flex items-center gap-1">
            <FiFlag size={12} className="text-gray-400" />
            {([1, 2, 3] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPriority(p)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-sm font-medium transition-all duration-200"
                style={{
                  background: priority === p ? `var(--accent-color)` : 'var(--input-bg)',
                  color: priority === p ? '#fff' : 'var(--text-secondary)',
                  fontSize: '12px',
                  boxShadow: priority === p ? '0 2px 6px var(--accent-glow)' : 'none',
                }}
              >
                {p === 1 ? '高' : p === 2 ? '中' : '低'}
              </button>
            ))}
          </div>

          {/* Deadline */}
          <div className="flex items-center gap-1">
            <FiCalendar size={12} className="text-gray-400" />
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="glass-input py-1.5 px-2"
              style={{ fontSize: '13px' }}
            />
            {deadline && (
              <button
                onClick={() => setDeadline('')}
                className="text-gray-400 hover:text-gray-600 text-xs ml-1"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
