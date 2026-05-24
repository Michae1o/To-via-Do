import type { TodoItem } from '../types';
import TodoCard from './TodoCard';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Props {
  todos: TodoItem[];
  subTodos: Record<string, TodoItem[]>;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onTogglePin: (id: string) => void;
  onUpdate: (id: string, updates: Partial<TodoItem>) => void;
  onReorder: (orderedIds: string[]) => void;
  onLoadSubs: (parentId: string) => void;
  onAddSub: (parentId: string, title: string) => void;
  onToggleSub: (parentId: string, subId: string) => void;
  onRemoveSub: (parentId: string, subId: string) => void;
}

function SortableItem({ todo, ...props }: { todo: TodoItem } & Omit<Props, 'todos' | 'onReorder'>) {
  const { attributes, setNodeRef, transform, transition, isDragging } = useSortable({ id: todo.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <TodoCard
        todo={todo}
        subTodos={props.subTodos[todo.id] || []}
        onToggle={props.onToggle}
        onRemove={props.onRemove}
        onTogglePin={props.onTogglePin}
        onUpdate={props.onUpdate}
        onLoadSubs={props.onLoadSubs}
        onAddSub={props.onAddSub}
        onToggleSub={props.onToggleSub}
        onRemoveSub={props.onRemoveSub}
      />
    </div>
  );
}

export default function TodoList(props: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = props.todos.findIndex((t) => t.id === active.id);
    const newIndex = props.todos.findIndex((t) => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = [...props.todos];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    // Maintain pinned items at top
    const pinned = reordered.filter((t) => t.isListPinned);
    const unpinned = reordered.filter((t) => !t.isListPinned);
    const final = [...pinned, ...unpinned];

    props.onReorder(final.map((t) => t.id));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={props.todos.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2 px-3">
          {props.todos.map((todo) => (
            <SortableItem key={todo.id} todo={todo} {...props} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
