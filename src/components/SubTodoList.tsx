import { useState } from 'react';
import { FiPlus, FiCheck, FiTrash2 } from 'react-icons/fi';
import type { TodoItem } from '../types';

interface Props {
  parentId: string;
  subTodos: TodoItem[];
  onAdd: (parentId: string, title: string) => void;
  onToggle: (parentId: string, subId: string) => void;
  onRemove: (parentId: string, subId: string) => void;
  disabled: boolean;
}

export default function SubTodoList({ parentId, subTodos, onAdd, onToggle, onRemove, disabled }: Props) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');

  const handleAdd = () => {
    if (title.trim()) {
      onAdd(parentId, title.trim());
      setTitle('');
      setAdding(false);
    }
  };

  return (
    <div className="ml-5 mt-2 border-l-2 border-dashed" style={{ borderColor: 'var(--border-color)' }}>
      {subTodos.map((sub) => (
        <div key={sub.id} className="flex items-center gap-2 pl-3 py-1.5 group animate-in">
          <button
            onClick={() => onToggle(parentId, sub.id)}
            disabled={disabled}
            className="w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors"
            style={{
              borderColor: sub.status === 'completed' ? 'var(--accent-color)' : 'var(--text-secondary)',
              background: sub.status === 'completed' ? 'var(--accent-color)' : 'transparent',
              opacity: 0.5,
            }}
          >
            {sub.status === 'completed' && <FiCheck size={9} color="white" />}
          </button>
          <span className={`text-sm flex-1 ${sub.status === 'completed' ? 'line-through opacity-50' : ''}`} style={{ wordBreak: 'break-word' }}>
            {sub.title}
          </span>
          <button
            onClick={() => onRemove(parentId, sub.id)}
            className="w-4 h-4 flex items-center justify-center rounded opacity-0 group-hover:opacity-50 hover:opacity-100 hover:text-red-500 transition-all"
          >
            <FiTrash2 size={10} />
          </button>
        </div>
      ))}

      {!disabled && (adding ? (
        <div className="flex items-center gap-2 pl-3 py-1">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAdding(false); }}
            onBlur={() => { if (!title.trim()) setAdding(false); }}
            placeholder="子事项..."
            className="flex-1 glass-input py-1.5"
            style={{ fontSize: '13px' }}
          />
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1 pl-3 py-1 text-sm opacity-40 hover:opacity-70 transition-opacity"
        >
          <FiPlus size={12} />
          <span>添加子事项</span>
        </button>
      ))}
    </div>
  );
}
