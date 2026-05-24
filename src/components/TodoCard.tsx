import { useState } from 'react';
import { FiChevronDown, FiChevronRight, FiCheck, FiTrash2, FiMapPin, FiCalendar, FiEdit2 } from 'react-icons/fi';
import type { TodoItem } from '../types';
import { PRIORITY_MAP } from '../types';
import { formatTime, formatDate, isDeadlinePassed, isDeadlineSoon } from '../utils';
import SubTodoList from './SubTodoList';

interface Props {
  todo: TodoItem;
  subTodos: TodoItem[];
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onTogglePin: (id: string) => void;
  onUpdate: (id: string, updates: Partial<TodoItem>) => void;
  onLoadSubs: (parentId: string) => void;
  onAddSub: (parentId: string, title: string) => void;
  onToggleSub: (parentId: string, subId: string) => void;
  onRemoveSub: (parentId: string, subId: string) => void;
}

export default function TodoCard({
  todo, subTodos, onToggle, onRemove, onTogglePin, onUpdate,
  onLoadSubs, onAddSub, onToggleSub, onRemoveSub,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(todo.title);
  const [editNote, setEditNote] = useState(todo.note || '');
  const isCompleted = todo.status === 'completed';
  const deadlinePassed = todo.deadline ? isDeadlinePassed(todo.deadline) : false;
  const deadlineSoon = todo.deadline ? isDeadlineSoon(todo.deadline) : false;
  const prio = PRIORITY_MAP[todo.priority];

  const handleExpand = () => {
    if (!expanded) {
      onLoadSubs(todo.id);
    }
    setExpanded(!expanded);
  };

  const handleSaveEdit = () => {
    if (editTitle.trim()) {
      onUpdate(todo.id, { title: editTitle.trim(), note: editNote.trim() });
    }
    setEditing(false);
  };

  return (
    <div className={`todo-card ${isCompleted ? 'completed' : ''} ${todo.isListPinned ? 'pinned' : ''} animate-in`}>
      <div className="flex items-start gap-2">
        {/* Checkbox */}
        <button
          onClick={() => onToggle(todo.id)}
          className="check-circle w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5"
          style={{
            borderColor: isCompleted ? 'var(--accent-color)' : 'var(--text-secondary)',
            background: isCompleted ? 'var(--accent-color)' : 'transparent',
            opacity: isCompleted ? 0.85 : 0.45,
          }}
        >
          {isCompleted && <FiCheck size={12} color="white" />}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0" onDoubleClick={() => { if (!isCompleted) setEditing(true); }}>
          {editing ? (
            <div className="flex flex-col gap-1">
              <input
                autoFocus
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={handleSaveEdit}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') setEditing(false); }}
                className="glass-input text-sm py-1"
              />
              <input
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                placeholder="备注（可选）"
                className="glass-input text-xs py-1"
                style={{ fontSize: '11px' }}
              />
            </div>
          ) : (
            <>
              <div className={`text-base font-medium ${isCompleted ? 'line-through' : ''}`} style={{ wordBreak: 'break-word' }}>
                {todo.title}
              </div>
              {todo.note && (
                <div className="text-sm mt-1 opacity-60" style={{ wordBreak: 'break-word' }}>{todo.note}</div>
              )}
            </>
          )}
        </div>

        {/* Priority dot */}
        <span className="priority-dot shrink-0 mt-1.5" style={{ background: prio.color }} title={prio.label} />
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-2 mt-2 ml-7 flex-wrap">
        {todo.deadline && (
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5"
            style={{
              background: deadlinePassed ? 'rgba(239,68,68,0.15)' : deadlineSoon ? 'rgba(245,158,11,0.15)' : 'rgba(34,197,94,0.1)',
              color: deadlinePassed ? '#ef4444' : deadlineSoon ? '#f59e0b' : '#22c55e',
              fontSize: '11px',
            }}
          >
            <FiCalendar size={10} />
            {formatTime(todo.deadline)}
          </span>
        )}
        <span className="opacity-40" style={{ fontSize: '11px' }}>{formatDate(todo.createdAt)}</span>

        {/* Action buttons */}
        <div className="flex items-center gap-0.5 ml-auto">
          <button
            onClick={handleExpand}
            className="w-6 h-6 flex items-center justify-center rounded-full opacity-40 hover:opacity-100 hover:bg-black/5 transition-all"
            title="子事项"
          >
            {expanded ? <FiChevronDown size={13} /> : <FiChevronRight size={13} />}
          </button>
          {!isCompleted && (
            <button
              onClick={() => setEditing(true)}
              className="w-6 h-6 flex items-center justify-center rounded-full opacity-40 hover:opacity-100 hover:bg-black/5 transition-all"
              title="编辑"
            >
              <FiEdit2 size={12} />
            </button>
          )}
          <button
            onClick={() => onTogglePin(todo.id)}
            className="w-6 h-6 flex items-center justify-center rounded-full transition-all"
            style={{
              opacity: todo.isListPinned ? 1 : 0.4,
              color: todo.isListPinned ? 'var(--accent-color)' : undefined,
            }}
            title="列表置顶"
          >
            <FiMapPin size={12} />
          </button>
          <button
            onClick={() => onRemove(todo.id)}
            className="w-6 h-6 flex items-center justify-center rounded-full opacity-30 hover:opacity-100 hover:text-red-500 hover:bg-red-500/10 transition-all"
            title="删除"
          >
            <FiTrash2 size={12} />
          </button>
        </div>
      </div>

      {/* Sub todos */}
      {expanded && (
        <SubTodoList
          parentId={todo.id}
          subTodos={subTodos}
          onAdd={onAddSub}
          onToggle={onToggleSub}
          onRemove={onRemoveSub}
          disabled={isCompleted}
        />
      )}
    </div>
  );
}
