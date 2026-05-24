export interface TodoItem {
  id: string;
  title: string;
  note?: string;
  priority: 1 | 2 | 3; // 1=高 2=中 3=低
  status: 'active' | 'completed';
  sortOrder: number;
  isListPinned: boolean;
  isWindowFixed: boolean;
  fixedX?: number;
  fixedY?: number;
  parentId?: string;
  createdAt: string;
  deadline?: string;
  completedAt?: string;
  remindedAt?: string; // 上次提醒时间，防止重复提醒
}

export interface ThemeConfig {
  themeId: 'light' | 'dark' | 'custom';
  blurAmount: number;
  backgroundOpacity: number;
  customBgPath?: string;
  accentColor: string;
}

export const DEFAULT_THEME: ThemeConfig = {
  themeId: 'light',
  blurAmount: 10,
  backgroundOpacity: 1.0,
  accentColor: '#6366f1',
};

export const THEME_PRESETS: Record<string, ThemeConfig> = {
  light: {
    themeId: 'light',
    blurAmount: 10,
    backgroundOpacity: 1.0,
    accentColor: '#6366f1',
  },
  dark: {
    themeId: 'dark',
    blurAmount: 10,
    backgroundOpacity: 0.5,
    accentColor: '#818cf8',
  },
};

export type PriorityLabel = '高' | '中' | '低';
export const PRIORITY_MAP: Record<number, { label: PriorityLabel; color: string }> = {
  1: { label: '高', color: '#ef4444' },
  2: { label: '中', color: '#f59e0b' },
  3: { label: '低', color: '#22c55e' },
};
