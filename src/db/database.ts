import Database from '@tauri-apps/plugin-sql';
import type { TodoItem, ThemeConfig } from '../types';

let db: Database | null = null;

async function getDb(): Promise<Database> {
  if (!db) {
    db = await Database.load('sqlite:todo.db');
    await initTables(db);
  }
  return db;
}

async function initTables(database: Database) {
  await database.execute(`
    CREATE TABLE IF NOT EXISTS todos (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      note TEXT DEFAULT '',
      priority INTEGER DEFAULT 2,
      status TEXT DEFAULT 'active',
      sort_order INTEGER DEFAULT 0,
      is_list_pinned INTEGER DEFAULT 0,
      is_window_fixed INTEGER DEFAULT 0,
      fixed_x INTEGER,
      fixed_y INTEGER,
      parent_id TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      deadline TEXT,
      completed_at TEXT,
      reminded_at TEXT
    )
  `);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS theme_config (
      id INTEGER PRIMARY KEY DEFAULT 1,
      theme_id TEXT DEFAULT 'light',
      blur_amount REAL DEFAULT 10,
      background_opacity REAL DEFAULT 0.4,
      custom_bg_path TEXT DEFAULT '',
      accent_color TEXT DEFAULT '#6366f1'
    )
  `);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS window_config (
      id INTEGER PRIMARY KEY DEFAULT 1,
      always_on_top INTEGER DEFAULT 0,
      ignore_cursor_events INTEGER DEFAULT 0,
      window_x INTEGER,
      window_y INTEGER
    )
  `);

  // Add ghost_mode column if not exists (safe to fail)
  try { await database.execute('ALTER TABLE window_config ADD COLUMN ghost_mode INTEGER DEFAULT 0'); } catch (_) {}
  await database.execute(`
    INSERT OR IGNORE INTO window_config (id, always_on_top, ignore_cursor_events, ghost_mode)
    VALUES (1, 0, 0, 0)
  `);

  // Ensure default theme row exists
  await database.execute(`
    INSERT OR IGNORE INTO theme_config (id, theme_id, blur_amount, background_opacity, custom_bg_path, accent_color)
    VALUES (1, 'light', 10, 1.0, '', '#6366f1')
  `);
}

// -- Todo CRUD --

export async function loadTodos(): Promise<TodoItem[]> {
  const database = await getDb();
  const rows: any[] = await database.select(
    'SELECT * FROM todos WHERE parent_id = "" OR parent_id IS NULL ORDER BY is_list_pinned DESC, sort_order ASC, created_at DESC'
  );
  return rows.map(mapRow);
}

export async function loadSubTodos(parentId: string): Promise<TodoItem[]> {
  const database = await getDb();
  const rows: any[] = await database.select(
    'SELECT * FROM todos WHERE parent_id = ? ORDER BY sort_order ASC, created_at DESC',
    [parentId]
  );
  return rows.map(mapRow);
}

export async function saveTodo(item: TodoItem): Promise<void> {
  const database = await getDb();
  await database.execute(
    `INSERT OR REPLACE INTO todos (id, title, note, priority, status, sort_order, is_list_pinned, is_window_fixed, fixed_x, fixed_y, parent_id, created_at, deadline, completed_at, reminded_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      item.id, item.title, item.note || '', item.priority, item.status,
      item.sortOrder, item.isListPinned ? 1 : 0, item.isWindowFixed ? 1 : 0,
      item.fixedX ?? null, item.fixedY ?? null, item.parentId || '',
      item.createdAt, item.deadline ?? null, item.completedAt ?? null, item.remindedAt ?? null,
    ]
  );
}

export async function deleteTodo(id: string): Promise<void> {
  const database = await getDb();
  await database.execute('DELETE FROM todos WHERE id = ? OR parent_id = ?', [id, id]);
}

export async function updateTodoStatus(id: string, status: 'active' | 'completed'): Promise<void> {
  const database = await getDb();
  if (status === 'completed') {
    await database.execute(
      "UPDATE todos SET status = 'completed', completed_at = datetime('now') WHERE id = ?",
      [id]
    );
  } else {
    await database.execute(
      "UPDATE todos SET status = 'active', completed_at = NULL WHERE id = ?",
      [id]
    );
  }
}

export async function updateTodoSortOrders(items: { id: string; sortOrder: number }[]): Promise<void> {
  const database = await getDb();
  for (const item of items) {
    await database.execute('UPDATE todos SET sort_order = ? WHERE id = ?', [item.sortOrder, item.id]);
  }
}

export async function updateTodoPin(id: string, pinned: boolean): Promise<void> {
  const database = await getDb();
  await database.execute('UPDATE todos SET is_list_pinned = ? WHERE id = ?', [pinned ? 1 : 0, id]);
}

export async function updateTodoRemindedAt(id: string, time: string): Promise<void> {
  const database = await getDb();
  await database.execute('UPDATE todos SET reminded_at = ? WHERE id = ?', [time, id]);
}

// -- Theme --

export async function loadTheme(): Promise<ThemeConfig> {
  const database = await getDb();
  const rows: any[] = await database.select('SELECT * FROM theme_config WHERE id = 1');
  if (rows.length === 0) {
    return {
      themeId: 'light',
      blurAmount: 10,
      backgroundOpacity: 0.4,
      accentColor: '#6366f1',
    };
  }
  const r = rows[0];
  return {
    themeId: r.theme_id,
    blurAmount: r.blur_amount,
    backgroundOpacity: r.background_opacity,
    customBgPath: r.custom_bg_path,
    accentColor: r.accent_color,
  };
}

export async function saveTheme(theme: ThemeConfig): Promise<void> {
  const database = await getDb();
  await database.execute(
    `UPDATE theme_config SET theme_id=?, blur_amount=?, background_opacity=?, custom_bg_path=?, accent_color=? WHERE id=1`,
    [theme.themeId, theme.blurAmount, theme.backgroundOpacity, theme.customBgPath || '', theme.accentColor]
  );
}

// -- Window config --

export interface WindowConfig {
  alwaysOnTop: boolean;
  ignoreCursorEvents: boolean;
  ghostMode: boolean;
  windowX?: number;
  windowY?: number;
}

export async function loadWindowConfig(): Promise<WindowConfig> {
  const database = await getDb();
  const rows: any[] = await database.select('SELECT * FROM window_config WHERE id = 1');
  if (rows.length === 0) {
    return { alwaysOnTop: false, ignoreCursorEvents: false, ghostMode: false };
  }
  const r = rows[0];
  return {
    alwaysOnTop: r.always_on_top === 1,
    ignoreCursorEvents: r.ignore_cursor_events === 1,
    ghostMode: r.ghost_mode === 1,
    windowX: r.window_x ?? undefined,
    windowY: r.window_y ?? undefined,
  };
}

export async function saveWindowConfig(config: WindowConfig): Promise<void> {
  const database = await getDb();
  await database.execute(
    `UPDATE window_config SET always_on_top=?, ignore_cursor_events=?, ghost_mode=?, window_x=?, window_y=? WHERE id=1`,
    [config.alwaysOnTop ? 1 : 0, config.ignoreCursorEvents ? 1 : 0, config.ghostMode ? 1 : 0, config.windowX ?? null, config.windowY ?? null]
  );
}

// -- Helpers --

function mapRow(r: any): TodoItem {
  return {
    id: r.id,
    title: r.title,
    note: r.note || '',
    priority: r.priority as 1 | 2 | 3,
    status: r.status as 'active' | 'completed',
    sortOrder: r.sort_order,
    isListPinned: r.is_list_pinned === 1,
    isWindowFixed: r.is_window_fixed === 1,
    fixedX: r.fixed_x ?? undefined,
    fixedY: r.fixed_y ?? undefined,
    parentId: r.parent_id || undefined,
    createdAt: r.created_at,
    deadline: r.deadline ?? undefined,
    completedAt: r.completed_at ?? undefined,
    remindedAt: r.reminded_at ?? undefined,
  };
}
