import { DataManagement } from './DataManagement';

interface SettingsProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onBack: () => void;
}

export function Settings({ theme, onToggleTheme, onBack }: SettingsProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-6">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* 頂部標題列 */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition"
          >
            <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">設定</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">管理你的應用設定</p>
          </div>
        </div>
        
        {/* 外觀設定 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
            外觀
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900 dark:text-white">深色模式</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">切換淺色/深色主題</div>
            </div>
            <button
              onClick={onToggleTheme}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                theme === 'dark' ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform ${
                theme === 'dark' ? 'translate-x-7' : 'translate-x-1'
              }`}>
                {theme === 'dark' ? (
                  <svg className="w-6 h-6 p-1 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 p-1 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                )}
              </span>
            </button>
          </div>
        </div>

        {/* 數據管理 */}
        <DataManagement />
      </div>
    </div>
  );
}
