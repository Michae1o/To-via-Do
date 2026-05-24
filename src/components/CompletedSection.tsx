import { useState } from 'react';
import { FiChevronDown, FiChevronRight, FiTrash2 } from 'react-icons/fi';
import type { TodoItem } from '../types';
import { formatDate } from '../utils';

interface Props {
  todos: TodoItem[];
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}

export default function CompletedSection({ todos, onToggle, onRemove }: Props) {
  const [open, setOpen] = useState(false);

  if (todos.length === 0) return null;

  return (
    <div className="px-3 mt-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-sm opacity-50 hover:opacity-80 transition-opacity py-1"
      >
        {open ? <FiChevronDown size={14} /> : <FiChevronRight size={14} />}
        <span>已完成 ({todos.length})</span>
      </button>

      {open && (
        <div className="flex flex-col gap-1 mt-1 ml-3 border-l-2 border-dashed" style={{ borderColor: 'var(--border-color)' }}>
          {todos.map((todo) => (
            <div key={todo.id} className="flex items-center gap-2 pl-3 py-1 group animate-in">
              <button
                onClick={() => onToggle(todo.id)}
                className="w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors"
                style={{ borderColor: 'var(--accent-color)', background: 'var(--accent-color)', opacity: 0.5 }}
                title="恢复"
              >
                <span style={{ fontSize: '10px', color: 'white' }}>↩</span>
              </button>
              <span className="text-sm flex-1 line-through opacity-50" style={{ wordBreak: 'break-word' }}>
                {todo.title}
              </span>
              <span className="opacity-30" style={{ fontSize: '11px' }}>
                {todo.completedAt ? formatDate(todo.completedAt).split(' ')[0] : ''}
              </span>
              <button
                onClick={() => onRemove(todo.id)}
                className="w-4 h-4 flex items-center justify-center rounded opacity-0 group-hover:opacity-50 hover:opacity-100 hover:text-red-500 transition-all"
              >
                <FiTrash2 size={10} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
