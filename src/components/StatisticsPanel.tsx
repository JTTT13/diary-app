import { useState, useEffect } from 'react';
import { dbService, type DiaryEntry } from '../lib/db';

interface StatisticsPanelProps {
  refreshTrigger?: number;
}

export function StatisticsPanel({ refreshTrigger }: StatisticsPanelProps) {
  const [totalEntries, setTotalEntries] = useState(0);
  const [totalWords, setTotalWords] = useState(0);
  const [monthlyCount, setMonthlyCount] = useState(0);
  const [avgWords, setAvgWords] = useState(0);
  const [lastEntryDate, setLastEntryDate] = useState<Date | null>(null);
  const [timeHeatmap, setTimeHeatmap] = useState<number[][]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatistics();
  }, [refreshTrigger]);

  const loadStatistics = async () => {
    try {
      const entries = await dbService.getAllDiaries();
      
      setTotalEntries(entries.length);
      
      const words = entries.reduce((sum, entry) => sum + entry.wordCount, 0);
      setTotalWords(words);
      setAvgWords(entries.length > 0 ? Math.round(words / entries.length) : 0);

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const thisMonthEntries = entries.filter(entry => {
        const entryDate = new Date(entry.createdAt);
        return entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear;
      });
      setMonthlyCount(thisMonthEntries.length);

      // 獲取最後寫日記的日期
      if (entries.length > 0) {
        const sortedEntries = [...entries].sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setLastEntryDate(new Date(sortedEntries[0].createdAt));
      }

      // 計算時間熱力圖
      const heatmap = calculateTimeHeatmap(entries);
      setTimeHeatmap(heatmap);
    } catch (error) {
      // 錯誤已被靜默處理，不會顯示 console
    } finally {
      setLoading(false);
    }
  };

  const calculateTimeHeatmap = (entries: DiaryEntry[]): number[][] => {
    const heatmap: number[][] = Array.from({ length: 24 }, () => Array(7).fill(0));

    entries.forEach(entry => {
      const date = new Date(entry.createdAt);
      const hour = date.getHours();
      const day = date.getDay();
      heatmap[hour][day]++;
    });

    return heatmap;
  };

  const getHeatmapColor = (count: number, maxCount: number): string => {
    if (count === 0) return 'bg-gray-100 dark:bg-gray-800';
    const intensity = maxCount > 0 ? count / maxCount : 0;
    if (intensity <= 0.25) return 'bg-blue-200 dark:bg-blue-900/40';
    if (intensity <= 0.5) return 'bg-blue-300 dark:bg-blue-800/60';
    if (intensity <= 0.75) return 'bg-blue-400 dark:bg-blue-700/80';
    return 'bg-blue-500 dark:bg-blue-600';
  };

  const formatDateTime = (date: Date): string => {
    return date.toLocaleString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
  const maxCount = Math.max(...timeHeatmap.flat());

  return (
    <div className="space-y-6">
      {/* 統計卡片 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="stagger-item card-hover bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-6 shadow-sm border border-blue-200 dark:border-blue-800" style={{ animationDelay: '0.05s' }}>
          <div className="flex items-center gap-3 mb-2">
            <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <div className="text-sm font-medium text-blue-600 dark:text-blue-400">總日記數</div>
          </div>
          <div className="text-4xl font-bold text-blue-900 dark:text-blue-100">{totalEntries}</div>
          <div className="text-sm text-blue-600 dark:text-blue-400 mt-1">本月 {monthlyCount} 篇</div>
        </div>

        <div className="stagger-item card-hover bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-6 shadow-sm border border-purple-200 dark:border-purple-800" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center gap-3 mb-2">
            <svg className="w-8 h-8 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div className="text-sm font-medium text-purple-600 dark:text-purple-400">總字數</div>
          </div>
          <div className="text-4xl font-bold text-purple-900 dark:text-purple-100">{totalWords.toLocaleString()}</div>
          <div className="text-sm text-purple-600 dark:text-purple-400 mt-1">平均 {avgWords} 字</div>
        </div>
      </div>

      {/* 最後寫日記時間 */}
      {lastEntryDate && (
        <div className="stagger-item card-hover bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-5 border border-green-200 dark:border-green-800" style={{ animationDelay: '0.15s' }}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-medium text-green-600 dark:text-green-400 mb-1">最後寫日記</div>
              <div className="text-lg font-bold text-green-900 dark:text-green-100">{formatDateTime(lastEntryDate)}</div>
            </div>
          </div>
        </div>
      )}

      {/* 時間熱力圖 */}
      {totalEntries > 0 && (
        <div className="stagger-item card-hover bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700" style={{ animationDelay: '0.2s' }}>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            寫作時間分析
          </h3>
          
          <div className="flex items-center gap-2 mb-4 text-sm text-gray-500 dark:text-gray-400">
            <span>頻率</span>
            <div className="flex gap-1">
              <div className="w-3 h-3 rounded bg-gray-100 dark:bg-gray-800"></div>
              <div className="w-3 h-3 rounded bg-blue-200 dark:bg-blue-900/40"></div>
              <div className="w-3 h-3 rounded bg-blue-300 dark:bg-blue-800/60"></div>
              <div className="w-3 h-3 rounded bg-blue-400 dark:bg-blue-700/80"></div>
              <div className="w-3 h-3 rounded bg-blue-500 dark:bg-blue-600"></div>
            </div>
            <span>高</span>
          </div>

          <div className="overflow-x-auto overflow-y-hidden -mx-4 px-4">
            <div className="inline-flex gap-1 min-w-max">
              {/* 時間標籤 */}
              <div className="flex flex-col text-xs text-gray-500 dark:text-gray-400 pr-2">
                <div className="h-6"></div>
                {Array.from({ length: 24 }, (_, i) => (
                  <div key={i} className="h-4 flex items-center justify-end">
                    {i % 3 === 0 ? `${String(i).padStart(2, '0')}:00` : ''}
                  </div>
                ))}
              </div>

              {/* 熱力圖 */}
              {weekDays.map((day, dayIndex) => (
                <div key={dayIndex} className="flex flex-col items-center">
                  <div className="h-6 text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{day}</div>
                  {timeHeatmap.map((hourData, hourIndex) => {
                    const count = hourData[dayIndex];
                    return (
                      <div
                        key={hourIndex}
                        className={`w-6 h-4 rounded-sm ${getHeatmapColor(count, maxCount)} transition-all hover:scale-110 hover:shadow-md cursor-pointer relative group`}
                        title={`${day} ${String(hourIndex).padStart(2, '0')}:00 - ${count}篇`}
                      >
                        {count > 0 && (
                          <div className="absolute hidden group-hover:block bg-gray-900 dark:bg-gray-700 text-white text-xs px-2 py-1 rounded -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap z-10">
                            {count}篇
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
            每個方格代表該時段寫日記的次數
          </div>
        </div>
      )}

      {/* 空狀態 */}
      {totalEntries === 0 && (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700">
          <svg className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">還沒有日記</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">開始寫日記，查看更多統計數據</p>
        </div>
      )}
    </div>
  );
}
