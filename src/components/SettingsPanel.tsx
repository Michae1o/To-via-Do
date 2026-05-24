import { useState, useEffect } from 'react';
import { FiX, FiSun, FiMoon, FiPlus } from 'react-icons/fi';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import type { ThemeConfig } from '../types';
import { THEME_PRESETS } from '../types';

interface Props {
  theme: ThemeConfig;
  onUpdate: (partial: Partial<ThemeConfig>) => void;
  onClose: () => void;
}

export default function SettingsPanel({ theme, onUpdate, onClose }: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Load preview when theme has a background
  useEffect(() => {
    if (theme.customBgPath) {
      invoke<string>('load_image_data_url', { path: theme.customBgPath })
        .then(setPreviewUrl)
        .catch(() => setPreviewUrl(null));
    } else {
      setPreviewUrl(null);
    }
  }, [theme.customBgPath]);

  const handlePickBackground = async () => {
    const selected = await open({
      title: '选择背景图片（建议 9:16 竖屏比例）',
      filters: [{ name: '图片', extensions: ['jpg', 'jpeg', 'png', 'bmp', 'gif', 'webp'] }],
      multiple: false,
    });
    if (selected && typeof selected === 'string') {
      onUpdate({ customBgPath: selected });
    }
  };

  const handleRemoveBackground = () => {
    setPreviewUrl(null);
    onUpdate({ customBgPath: undefined, themeId: 'light' });
  };

  const isActive = (id: string) => theme.themeId === id;

  return (
    <div className="settings-overlay">
      <div className="settings-backdrop" onClick={onClose} />

      <div className="settings-panel" style={{ width: 300, gap: 22, padding: 24 }}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold" style={{ letterSpacing: '-0.01em' }}>设置</span>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full opacity-40 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition-all"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* Theme presets */}
        <div>
          <div className="text-xs font-semibold opacity-35 mb-3 uppercase tracking-widest">主题</div>
          <div className="flex gap-3">
            <button
              onClick={() => onUpdate({ ...THEME_PRESETS.light })}
              className={`flex-1 py-3.5 rounded-xl text-sm flex flex-col items-center gap-1.5 transition-all duration-200 ${
                isActive('light') ? 'scale-105' : 'hover:scale-[1.02]'
              }`}
              style={{
                background: 'rgba(255,255,255,0.5)',
                border: '1px solid var(--border-color)',
                ...(isActive('light') ? { boxShadow: `0 0 0 2px white, 0 0 0 4px ${theme.accentColor}` } : {}),
              }}
            >
              <FiSun size={20} />
              <span className="text-xs font-medium">浅色</span>
            </button>
            <button
              onClick={() => onUpdate({ ...THEME_PRESETS.dark })}
              className={`flex-1 py-3.5 rounded-xl text-sm flex flex-col items-center gap-1.5 transition-all duration-200 ${
                isActive('dark') ? 'scale-105' : 'hover:scale-[1.02]'
              }`}
              style={{
                background: 'rgba(30,30,40,0.5)',
                color: '#e4e4ec',
                border: '1px solid var(--border-color)',
                ...(isActive('dark') ? { boxShadow: `0 0 0 2px white, 0 0 0 4px ${theme.accentColor}` } : {}),
              }}
            >
              <FiMoon size={20} />
              <span className="text-xs font-medium">深色</span>
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="section-divider" />

        {/* Custom background */}
        <div>
          <div className="text-xs font-semibold opacity-35 mb-3 uppercase tracking-widest">自定义背景</div>

          {/* Preview */}
          {previewUrl ? (
            <div className="relative w-full h-28 rounded-xl mb-3 overflow-hidden" style={{ border: '1px solid var(--border-color)' }}>
              <img src={previewUrl} alt="背景预览" className="w-full h-full object-cover" />
              <button
                onClick={handleRemoveBackground}
                className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-red-500 transition-colors text-xs"
                title="移除背景"
              >
                <FiX size={13} />
              </button>
            </div>
          ) : (
            <button
              onClick={handlePickBackground}
              className="w-full h-28 rounded-xl mb-3 flex flex-col items-center justify-center gap-2 transition-all duration-200 hover:scale-[1.01]"
              style={{
                background: 'var(--input-bg)',
                border: '1px dashed var(--border-color)',
              }}
            >
              <FiPlus size={22} className="opacity-40" />
              <span className="text-sm opacity-50">选择背景图片</span>
            </button>
          )}

          <p className="text-xs opacity-30 leading-relaxed">
            建议使用 9:16 竖屏比例图片以获得最佳效果
          </p>
        </div>

        {/* Divider */}
        <div className="section-divider" />

        {/* Blur */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium opacity-55">模糊度</span>
            <span className="text-sm font-semibold opacity-70" style={{ color: 'var(--accent-color)' }}>{theme.blurAmount}px</span>
          </div>
          <input
            type="range"
            min="0"
            max="20"
            value={theme.blurAmount}
            onChange={(e) => onUpdate({ blurAmount: Number(e.target.value) })}
            className="settings-slider w-full"
          />
        </div>

        {/* Opacity */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium opacity-55">背景透明度</span>
            <span className="text-sm font-semibold opacity-70" style={{ color: 'var(--accent-color)' }}>{Math.round(theme.backgroundOpacity * 100)}%</span>
          </div>
          <input
            type="range"
            min="10"
            max="100"
            value={Math.round(theme.backgroundOpacity * 100)}
            onChange={(e) => onUpdate({ backgroundOpacity: Number(e.target.value) / 100 })}
            className="settings-slider w-full"
          />
        </div>

        {/* Divider */}
        <div className="section-divider" />

        {/* Accent color */}
        <div>
          <div className="text-sm font-medium opacity-55 mb-3">主色调</div>
          <div className="flex gap-3 flex-wrap">
            {['#6366f1', '#ec4899', '#14b8a6', '#f97316', '#8b5cf6', '#06b6d4'].map((color) => (
              <button
                key={color}
                onClick={() => onUpdate({ accentColor: color })}
                className="w-10 h-10 rounded-full transition-all duration-200 hover:scale-115"
                style={{
                  background: color,
                  transform: theme.accentColor === color ? 'scale(1.2)' : undefined,
                  boxShadow: theme.accentColor === color
                    ? `0 0 0 2px white, 0 0 0 4px ${color}, 0 2px 8px ${color}40`
                    : '0 1px 3px rgba(0,0,0,0.15)',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
