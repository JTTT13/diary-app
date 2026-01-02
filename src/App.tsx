import { useState, useEffect, useCallback } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { AppLayout } from './components/AppLayout';
import { ConfirmDialog } from './components/ConfirmDialog';
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
  const [showTitle, setShowTitle] = useState(true);
  const [loading, setLoading] = useState(true);
  const [viewHistory, setViewHistory] = useState<ViewType[]>(['diary']);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    await dbService.init();
    const savedTheme = await dbService.getTheme();
    setTheme(savedTheme);
    applyTheme(savedTheme);
    const savedShowTitle = await dbService.getShowTitle();
    setShowTitle(savedShowTitle);
    setLoading(false);
  };

  const applyTheme = (theme: 'light' | 'dark') => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // 顯示確認對話框
  const showConfirm = useCallback((title: string, message: string, onConfirm: () => void) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      onConfirm
    });
  }, []);

  // 關閉對話框
  const closeConfirm = useCallback(() => {
    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
  }, []);

  // 導航到新頁面並記錄歷史
  const navigateToView = useCallback((view: ViewType) => {
    setViewHistory(prev => [...prev, view]);
    setCurrentView(view);
  }, []);

  // 底部導航切換 - 不累積歷史
  const switchToView = useCallback((view: ViewType) => {
    setViewHistory(['diary']); // 重置歷史為主頁
    setCurrentView(view);
  }, []);

  // 返回上一頁
  const goBack = useCallback(() => {
    setViewHistory(prev => {
      if (prev.length <= 1) {
        // 如果已經是第一頁，彈出確認對話框
        showConfirm('退出應用', '確定要退出應用嗎？', () => {
          closeConfirm();
          CapacitorApp.exitApp();
        });
        return prev;
      }
      
      const newHistory = prev.slice(0, -1);
      const previousView = newHistory[newHistory.length - 1];
      setCurrentView(previousView);
      
      // 如果返回時不是編輯頁,清除編輯狀態
      if (previousView !== 'editor') {
        setEditingDiary(null);
      }
      
      return newHistory;
    });
  }, [showConfirm, closeConfirm]);

  // 監聽 Android 返回鍵
  useEffect(() => {
    let listenerHandle: any = null;

    const setupBackButtonListener = async () => {
      try {
        listenerHandle = await CapacitorApp.addListener('backButton', () => {
          goBack();
        });
      } catch (error) {
        // 在瀏覽器環境中 Capacitor 可能不可用，忽略錯誤
        console.log('Capacitor not available in browser environment');
      }
    };

    setupBackButtonListener();

    return () => {
      if (listenerHandle && typeof listenerHandle.remove === 'function') {
        listenerHandle.remove();
      }
    };
  }, [goBack]);

  const handleNewDiary = useCallback(() => {
    setEditingDiary(null);
    navigateToView('editor');
  }, [navigateToView]);

  const handleEditDiary = useCallback((diary: DiaryEntry) => {
    setEditingDiary(diary);
    navigateToView('editor');
  }, [navigateToView]);

  const handleSave = useCallback(async () => {
    goBack();
    setEditingDiary(null);
    setRefreshTrigger(prev => prev + 1);
  }, [goBack]);

  const handleCancel = useCallback(() => {
    goBack();
    setEditingDiary(null);
  }, [goBack]);

  const toggleTheme = useCallback(async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    applyTheme(newTheme);
    await dbService.setTheme(newTheme);
  }, [theme]);
  
  const toggleShowTitle = useCallback(async () => {
    const newValue = !showTitle;
    setShowTitle(newValue);
    await dbService.setShowTitle(newValue);
  }, [showTitle]);

  const renderContent = () => {
    switch (currentView) {
      case 'diary':
        return (
          <div className="container mx-auto px-4 py-6 max-w-4xl page-transition-enter">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">我的日記</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">記錄生活中的每一天</p>
              </div>
              <button
                onClick={() => navigateToView('settings')}
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
          <div className="container mx-auto px-4 py-6 max-w-4xl page-transition-enter">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">統計分析</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">查看你的日記統計</p>
              </div>
              <button
                onClick={() => navigateToView('settings')}
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
        return <DiaryEditor diary={editingDiary} onSave={handleSave} onCancel={handleCancel} showTitle={showTitle} />;
      case 'settings':
        return <Settings theme={theme} onToggleTheme={toggleTheme} showTitle={showTitle} onToggleShowTitle={toggleShowTitle} onBack={goBack} />;
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
    <>
      <AppLayout currentView={currentView} onViewChange={switchToView} onAddClick={handleNewDiary}>
        {renderContent()}
      </AppLayout>
      
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText="確定"
        cancelText="取消"
        confirmColor="red"
        onConfirm={confirmDialog.onConfirm}
        onCancel={closeConfirm}
      />
    </>
  );
}

export default App;
