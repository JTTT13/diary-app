import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { dbService } from '../lib/db';

export function DataManagement() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [lastBackup, setLastBackup] = useState<Date | null>(null);

  const handleExportJSON = async () => {
    setIsExporting(true);
    try {
      const data = await dbService.backupData();
      const fileName = `日記備份_${new Date().toISOString().split('T')[0]}.json`;

      if (Capacitor.isNativePlatform()) {
        // [Mobile] 寫入暫存並呼叫分享選單
        const result = await Filesystem.writeFile({
          path: fileName,
          data: data,
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
        });

        await Share.share({
          title: '匯出日記備份',
          text: '這是我的日記備份 JSON 檔',
          url: result.uri,
          dialogTitle: '儲存備份檔案',
        });
      } else {
        // [Web] 傳統下載方式
        const blob = new Blob([data], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        link.click();
      }

      await dbService.updateLastBackup();
      const lastBackupTime = await dbService.getLastBackup();
      setLastBackup(lastBackupTime);
      
      if (!Capacitor.isNativePlatform()) {
        alert('JSON 匯出成功！');
      }
    } catch (error) {
      console.error(error);
      alert('匯出失敗，請重試');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportJSON = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!confirm('匯入資料會覆蓋現有資料，確定要繼續嗎？')) {
      event.target.value = '';
      return;
    }

    setIsImporting(true);
    try {
      const text = await file.text();
      await dbService.restoreBackup(text);
      alert('資料匯入成功！頁面將重新載入');
      window.location.reload();
    } catch (error) {
      alert('匯入失敗，請確認檔案格式是否正確');
    } finally {
      setIsImporting(false);
      event.target.value = '';
    }
  };

  const handleClearAll = async () => {
    if (!confirm('確定要刪除所有日記嗎？此操作無法復原！')) return;
    if (!confirm('最後確認：真的要刪除所有資料嗎？')) return;

    try {
      const keys = await dbService.getAllKeysFromStore('diary');
      for (const key of keys) {
        await dbService.deleteFromStore('diary', key as string);
      }
      await dbService.init();
      alert('所有日記已刪除');
      window.location.reload();
    } catch (error) {
      alert('刪除失敗，請稍後再試');
    }
  };

  const parseBulkText = (text: string) => {
    const entries: Array<{ content: string; date: Date }> = [];
    
    // 以空行分割多條日記
    const blocks = text.split(/\n\s*\n/).filter(b => b.trim());
    
    for (const block of blocks) {
      const lines = block.trim().split('\n');
      if (lines.length < 2) continue;
      
      // 最後一行是日期時間
      const lastLine = lines[lines.length - 1].trim();
      const content = lines.slice(0, -1).join('\n').trim();
      
      // 匹配日期格式：DD/MM/YYYY HH:MM 或 HH:MM
      const dateTimeMatch = lastLine.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2})[：:](\d{2})/);
      const timeOnlyMatch = lastLine.match(/^(\d{1,2})[：:](\d{2})$/);
      
      let date: Date;
      
      if (dateTimeMatch) {
        const [, day, month, year, hour, minute] = dateTimeMatch;
        date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));
      } else if (timeOnlyMatch) {
        const [, hour, minute] = timeOnlyMatch;
        date = new Date();
        date.setHours(parseInt(hour), parseInt(minute), 0, 0);
      } else {
        // 如果沒有日期，使用當前時間
        date = new Date();
      }
      
      if (content) {
        entries.push({ content, date });
      }
    }
    
    return entries;
  };

  const handleBulkImport = async () => {
    const textarea = document.getElementById('bulk-import-text') as HTMLTextAreaElement;
    const text = textarea?.value;
    
    if (!text || !text.trim()) {
      alert('請輸入要導入的文字');
      return;
    }
    
    try {
      const entries = parseBulkText(text);
      
      if (entries.length === 0) {
        alert('未能解析到有效的日記條目，請檢查格式');
        return;
      }
      
      if (!confirm(`準備導入 ${entries.length} 條日記，確定繼續？`)) {
        return;
      }
      
      // 逐條創建日記
      for (const entry of entries) {
        await dbService.createDiary({
          title: '', // [Vibe] 用戶要求匯入時不自動產生標題，保持乾淨
          content: entry.content,
          createdAt: entry.date,
        });
      }
      
      alert(`成功導入 ${entries.length} 條日記！`);
      textarea.value = '';
      window.location.reload();
      
    } catch (error) {
      alert('導入失敗，請檢查格式');
    }
  };

  return (
    <div className="space-y-6">
      {/* 匯出數據 */}
      <div className="stagger-item card-hover bg-gray-50 dark:bg-gray-800 rounded-lg p-4" style={{ animationDelay: '0.05s' }}>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">匯出數據</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">將你的日記資料匯出為 JSON 格式</p>
        <button
          onClick={handleExportJSON}
          disabled={isExporting}
          className="w-full px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg spring-bounce disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:scale-105 active:scale-95"
        >
          {isExporting ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
            </svg>
          )}
          匯出 JSON
        </button>
      </div>

      {/* 匯入數據 */}
      <div className="stagger-item card-hover bg-gray-50 dark:bg-gray-800 rounded-lg p-4" style={{ animationDelay: '0.1s' }}>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">匯入數據</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">從 JSON 檔案還原你的日記</p>
        <label className="block">
          <input
            type="file"
            accept=".json"
            onChange={handleImportJSON}
            disabled={isImporting}
            className="hidden"
            id="import-file"
          />
          <label
            htmlFor="import-file"
            className={`px-4 py-3 rounded-lg spring-bounce flex items-center justify-center gap-2 cursor-pointer ${
              isImporting ? 'bg-gray-400 text-gray-200 cursor-not-allowed' : 'bg-purple-500 hover:bg-purple-600 text-white hover:scale-105 active:scale-95'
            }`}
          >
            {isImporting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            )}
            選擇檔案匯入
          </label>
        </label>
      </div>

      {/* 智能批量導入 */}
      <div className="stagger-item card-hover bg-gray-50 dark:bg-gray-800 rounded-lg p-4" style={{ animationDelay: '0.15s' }}>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">📝 批量導入</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          貼上帶日期的文字，每條日記格式：內容 + 日期時間
        </p>
        <textarea
          id="bulk-import-text"
          placeholder="今晚月色很美&#10;30/12/2023 20:25&#10;&#10;昨夜夢見了你&#10;31/12/2023 06:13"
          className="w-full h-48 p-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm resize-none mb-3 text-gray-900 dark:text-white"
          style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word', overflowWrap: 'break-word' }}
        />
        <button
          onClick={handleBulkImport}
          className="w-full px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg spring-bounce flex items-center justify-center gap-2 hover:scale-105 active:scale-95"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          批量導入日記
        </button>
      </div>


      {/* 最後備份時間 */}
      <div className="stagger-item card-hover bg-gradient-to-r from-gray-700 to-gray-800 text-white rounded-lg p-4" style={{ animationDelay: '0.25s' }}>
        <h3 className="font-semibold mb-2">最後備份時間</h3>
        <div className="text-sm opacity-90">
          {lastBackup ? (
            <div>{lastBackup.toLocaleString('zh-TW')}</div>
          ) : (
            <div>尚未備份</div>
          )}
        </div>
        <div className="text-xs opacity-70 mt-1">定期備份可以保護你的資料安全</div>
      </div>
    </div>
  );
}
