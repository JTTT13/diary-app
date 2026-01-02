import { memo } from 'react';

interface BottomNavProps {
  currentView?: 'diary' | 'statistics' | 'editor' | 'settings';
  onViewChange?: (view: 'diary' | 'statistics' | 'editor' | 'settings') => void;
  onAddClick?: () => void;
}

export const BottomNav = memo(function BottomNav({ currentView = 'diary', onViewChange, onAddClick }: BottomNavProps) {
  // 只在非編輯和設定頁面顯示底部導航
  if (currentView === 'editor' || currentView === 'settings') {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 glass-effect border-t border-gray-200 dark:border-gray-700 z-40 nav-enter">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-4 relative">
        {/* 日記 */}
        <button
          onClick={() => onViewChange?.('diary')}
          className={`flex flex-col items-center justify-center flex-1 h-full smooth-spring ${
            currentView === 'diary' ? 'text-blue-600 dark:text-blue-400 icon-active' : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <span className="text-xs mt-1">日記</span>
        </button>

        {/* 寫日記 - 中間浮動大按鈕 */}
        <button
          onClick={onAddClick}
          className="absolute left-1/2 -translate-x-1/2 -top-6 flex items-center justify-center w-14 h-14 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full shadow-lg hover:shadow-xl fab-enhanced gradient-breath spring-bounce hover:scale-110 active:scale-95"
        >
          <svg className="w-8 h-8 text-white relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
        </button>

        {/* 統計 */}
        <button
          onClick={() => onViewChange?.('statistics')}
          className={`flex flex-col items-center justify-center flex-1 h-full smooth-spring ${
            currentView === 'statistics' ? 'text-blue-600 dark:text-blue-400 icon-active' : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span className="text-xs mt-1">統計</span>
        </button>
      </div>
    </nav>
  );
});
