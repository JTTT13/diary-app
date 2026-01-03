import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { dbService, type DiaryEntry } from '../lib/db';
import { calculateWordCount } from '../lib/utils';

interface DiaryEditorProps {
  diary: DiaryEntry | null;
  onSave: () => void;
  onCancel: () => void;
  showTitle: boolean;
}

type SaveStatus = 'saved' | 'saving' | 'unsaved';

export function DiaryEditor({ diary, onSave, onCancel, showTitle }: DiaryEditorProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [wordCount, setWordCount] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [createdTime, setCreatedTime] = useState<Date>(new Date());
  const saveTimeoutRef = useRef<number | null>(null);
  const currentDiaryIdRef = useRef<string | null>(null);
  const initialLoadRef = useRef(true);

  useEffect(() => {
    if (diary) {
      setTitle(diary.title);
      const plainText = diary.content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');
      setContent(plainText);
      currentDiaryIdRef.current = diary.id;
      setCreatedTime(diary.createdAt);
      setSaveStatus('saved');
      initialLoadRef.current = false;
    } else {
      setTitle('');
      setContent('');
      currentDiaryIdRef.current = null;
      setCreatedTime(new Date());
      setSaveStatus('saved');
      setWordCount(0);
      initialLoadRef.current = true;
    }
  }, [diary]);

  useEffect(() => {
    // 避免初始加載時觸發自動儲存
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      return;
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    if (title.trim() || content.trim()) {
      setSaveStatus('saving');
      saveTimeoutRef.current = window.setTimeout(async () => {
        await autoSave();
      }, 500);
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [title, content]);

  const calculatedWordCount = useMemo(() => {
    return calculateWordCount(content)
  }, [content]);

  useEffect(() => {
    setWordCount(calculatedWordCount);
  }, [calculatedWordCount]);

  const autoSave = useCallback(async () => {
    if (!title.trim() && !content.trim()) {
      setSaveStatus('saved');
      return;
    }

    try {
      const contentToSave = content;
      const now = new Date();

      if (currentDiaryIdRef.current) {
        // 編輯現有日記，記錄編輯歷史
        const existingDiary = diary;
        const changes: string[] = [];
        
        if (existingDiary && existingDiary.content !== contentToSave) {
          const oldWordCount = calculateWordCount(existingDiary.content)
          const newWordCount = calculateWordCount(contentToSave)
          const isWordCountChanged = oldWordCount !== newWordCount

          // Only record history if word count actually changed
          if (isWordCountChanged) {
            const diff = newWordCount - oldWordCount
            changes.push(diff > 0 ? `+${diff}` : `${diff}`)
          }

          const newEditHistory = changes.length > 0
              ? [...(existingDiary.editHistory || []), { timestamp: now, changes: changes.join(', ') }]
              : existingDiary.editHistory

          await dbService.updateDiary(currentDiaryIdRef.current, {
            title: title.trim(),
            content: contentToSave,
            updatedAt: now,
            // isEdited is strictly true only if we have edit history (which implies word count changed)
            isEdited: (newEditHistory && newEditHistory.length > 0) || false,
            editHistory: newEditHistory
          })
        } else if (existingDiary) {
          // Content didn't change, but maybe title did
          await dbService.updateDiary(currentDiaryIdRef.current, {
            title: title.trim(),
            content: contentToSave,
            updatedAt: now,
          })
        }
      } else {
        // 創建新日記
        const newDiaryId = await dbService.createDiary({
          title: title.trim(),
          content: contentToSave,
        });
        currentDiaryIdRef.current = newDiaryId;
      }

      setSaveStatus('saved');
    } catch (error) {
      setSaveStatus('unsaved');
    }
  }, [title, content, diary]);

  const handleComplete = useCallback(() => {
    onSave();
  }, [onSave]);

  const getSaveStatusText = useCallback(() => {
    switch (saveStatus) {
      case 'saved': return '已儲存';
      case 'saving': return '儲存中...';
      case 'unsaved': return '未儲存';
    }
  }, [saveStatus]);

  const getSaveStatusColor = useCallback(() => {
    switch (saveStatus) {
      case 'saved': return 'text-green-600 dark:text-green-400';
      case 'saving': return 'text-blue-600 dark:text-blue-400';
      case 'unsaved': return 'text-orange-600 dark:text-orange-400';
    }
  }, [saveStatus]);

  const formatDateTime = useCallback((date: Date) => {
    return new Date(date).toLocaleString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  }, []);

  const getEditorMode = useCallback(() => {
    return diary ? '編輯中' : '新日記';
  }, [diary]);

  return (
    <div className="fixed inset-0 flex flex-col h-screen overflow-hidden bg-white dark:bg-gray-900 page-transition-enter">
      {/* 頂部工具欄 */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-start justify-between">
          {/* 左側信息區 */}
          <div className="flex flex-col gap-2 flex-1">
            {/* 模式標題 */}
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {getEditorMode()}
              </h2>
              {/* 儲存狀態指示器 */}
              <div className="flex items-center gap-2">
                {saveStatus === 'saving' && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 dark:border-blue-400"></div>
                )}
                {saveStatus === 'saved' && (
                  <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                <span className={`text-xs font-medium ${getSaveStatusColor()}`}>
                  {getSaveStatusText()}
                </span>
              </div>
            </div>

            {/* 時間信息 */}
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-500">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>創建於：{formatDateTime(createdTime)}</span>
              </div>
              
            </div>

            {/* 編輯記錄按鈕 */}
            {diary && diary.editHistory && diary.editHistory.length > 0 && (
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors w-fit"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>
                  {showHistory ? '隱藏' : '顯示'}編輯記錄 ({diary.editHistory.length})
                </span>
                <svg className={`w-3.5 h-3.5 transition-transform ${showHistory ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            )}
          </div>

          {/* 右側完成按鈕 */}
          <button
            onClick={handleComplete}
            className="flex-shrink-0 ml-4 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-full shadow-md hover:shadow-lg spring-bounce hover:scale-105 active:scale-95 gradient-breath"
          >
            完成
          </button>
        </div>
      </div>

      {/* 編輯記錄面板 */}
      {showHistory && diary && diary.editHistory && diary.editHistory.length > 0 && (
        <div className="flex-shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="max-h-48 overflow-y-auto rounded-lg bg-gray-50 dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700">
            <div className="space-y-3">
              {diary.editHistory.map((record, index) => (
                <div key={index} className="pb-3 border-b border-gray-200 dark:border-gray-700 last:border-0 last:pb-0">
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-500 mb-0.5">
                      {formatDateTime(record.timestamp)}
                    </div>
                    <div className="space-y-1">
                      {record.changes.split('\n').map((change, idx) => (
                        <div key={idx} className="text-xs text-gray-600 dark:text-gray-400">
                          <span className="break-words">{change}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 編輯區域 */}
      <div className="flex-1 min-h-0 flex flex-col gap-4 p-6 overflow-hidden">
        {/* 標題輸入 */}
        {showTitle && (
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="請輸入標題..."
            className="flex-shrink-0 w-full text-2xl font-bold bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 border-2 border-gray-300 dark:border-gray-600 rounded-xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
          />
        )}

        {/* 內容輸入 */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="搵啲嘢寫..."
          className="flex-1 min-h-0 w-full p-5 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none overflow-y-auto"
          style={{
            lineHeight: '1.8',
            fontSize: '16px'
          }}
        />
      </div>

      {/* 底部工具欄 */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          {/* 字數統計 */}
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-sm font-medium">{wordCount} 字</span>
          </div>

          {/* 返回按鈕 */}
          <button
            onClick={onCancel}
            className="px-5 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-all font-medium"
          >
            返回
          </button>
        </div>
      </div>
    </div>
  );
}