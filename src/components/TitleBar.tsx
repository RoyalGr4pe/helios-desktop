import { useState, useEffect } from 'react';
import { useAppStore } from '../store/appStore';

interface TitleBarProps {
  onSettingsClick: () => void;
}

export function TitleBar({ onSettingsClick }: TitleBarProps) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [clickThrough, setClickThrough] = useState(false);

  useEffect(() => {
    const checkClickThrough = () => {
      if (window.electronAPI) {
        window.electronAPI.toggleClickThrough?.(clickThrough);
      }
    };
    checkClickThrough();
  }, [clickThrough]);

  const handleClose = () => {
    if (window.electronAPI) {
      window.electronAPI.close?.();
    }
  };

  return (
    <div className="flex items-center justify-between px-2 py-1 select-none" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500" />
        <span className="text-white/70 text-xs font-medium">Helios</span>
      </div>
      <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <button
          onClick={() => setClickThrough(!clickThrough)}
          className={`p-1 rounded hover:bg-white/10 text-xs transition-colors ${
            clickThrough ? 'text-green-400' : 'text-white/50 hover:text-white'
          }`}
          title="Toggle click-through mode"
        >
          {clickThrough ? '◎' : '◉'}
        </button>
        <button
          onClick={onSettingsClick}
          className="p-1.5 rounded hover:bg-white/10 text-white/50 hover:text-white text-xs transition-colors"
          title="Settings"
        >
          ⚙
        </button>
        <button
          onClick={handleClose}
          className="p-1.5 rounded hover:bg-red-500/80 text-white/50 hover:text-white text-xs transition-colors"
          title="Close"
        >
          ✕
        </button>
      </div>
    </div>
  );
}