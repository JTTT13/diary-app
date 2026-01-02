import { useState, useEffect } from 'react';
import { AppLayout } from './components/AppLayout';
import { DiaryList } from './components/DiaryList';
import { DiaryEditor } from './components/DiaryEditor';
import { StatisticsPanel } from './components/StatisticsPanel';
import { Settings } from './components/Settings';
import { dbService } from './lib/db';
import { type DiaryEntry } from './lib/db';

type ViewType = 'diary' | 'statistics' | 'editor' | 'settings';

function App() {
  const [currentView, setCurrentView] = useState<ViewType>('diary');
  const [editingDiary, setEditingDiary] = useState<DiaryEntry | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    await dbService.init();
    const savedTheme = await dbService.getTheme();
    setTheme(savedTheme);
    applyTheme(savedTheme);
    setLoading(false);
  };

  const applyTheme = (theme: 'light' | 'dark') => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleNewDiary = () => {
    setEditingDiary(null);
    setCurrentView('editor');
  };

  const handleEditDiary = (diary: DiaryEntry) => {
    setEditingDiary(diary);
    setCurrentView('editor');
  };

  const handleSave = async () => {
    setCurrentView('diary');
    setEditingDiary(null);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleCancel = () => {
    setCurrentView('diary');
    setEditingDiary(null);
  };

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    applyTheme(newTheme);
    await dbService.setTheme(newTheme);
  };

  const renderContent = () => {
    switch (currentView) {
      case 'diary':
        return (
          <div className="container mx-auto px-4 py-6 max-w-4xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">我的日記</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">記錄生活中的每一天</p>
              </div>
              <button
                onClick={() => setCurrentView('settings')}
                className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                title="設定"
              >
                <svg className="w-6 h-6 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
            <DiaryList onEdit={handleEditDiary} onNew={handleNewDiary} refreshTrigger={refreshTrigger} />
          </div>
        );
      case 'statistics':
        return (
          <div className="container mx-auto px-4 py-6 max-w-4xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">統計分析</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">查看你的日記統計</p>
              </div>
              <button
                onClick={() => setCurrentView('settings')}
                className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                title="設定"
              >
                <svg className="w-6 h-6 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
            <StatisticsPanel refreshTrigger={refreshTrigger} />
          </div>
        );
      case 'editor':
        return <DiaryEditor diary={editingDiary} onSave={handleSave} onCancel={handleCancel} />;
      case 'settings':
        return <Settings theme={theme} onToggleTheme={toggleTheme} onBack={() => setCurrentView('diary')} />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">載入中...</p>
        </div>
      </div>
    );
  }

  return (
    <AppLayout currentView={currentView} onViewChange={setCurrentView} onAddClick={handleNewDiary}>
      {renderContent()}
    </AppLayout>
  );
}

export default App;
