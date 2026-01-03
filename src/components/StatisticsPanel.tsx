import { useMemo } from 'react';
import { dbService, type DiaryEntry } from '../lib/db';

interface StatisticsPanelProps {
  refreshTrigger?: number;
  cachedDiaries?: DiaryEntry[];
}

export function StatisticsPanel({ refreshTrigger, cachedDiaries }: StatisticsPanelProps) {
  // 使用 useMemo 即時計算統計數據,避免初次渲染閃爍
  const statistics = useMemo(() => {
    const entries: DiaryEntry[] = cachedDiaries || [];
    
    // 基本統計
    const totalEntries = entries.length;
    const totalWords = entries.reduce((sum, entry) => sum + entry.wordCount, 0);
    const avgWords = entries.length > 0 ? Math.round(totalWords / entries.length) : 0;

    // 本月統計
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const thisMonthEntries = entries.filter(entry => {
      const entryDate = new Date(entry.createdAt);
      return entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear;
    });
    const monthlyCount = thisMonthEntries.length;

    // 最後日記日期
    let lastEntryDate: Date | null = null;
    if (entries.length > 0) {
      const sortedEntries = [...entries].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      lastEntryDate = new Date(sortedEntries[0].createdAt);
    }

    // 時間熱力圖
    const timeHeatmap: number[][] = Array.from({ length: 24 }, () => Array(7).fill(0));
    entries.forEach(entry => {
      const date = new Date(entry.createdAt);
      const hour = date.getHours();
      const day = date.getDay();
      timeHeatmap[hour][day]++;
    });

    /* [Vibe] 計算連續寫作天數 (Streak) */
    const sortedDates = [...entries]
      .map(d => new Date(d.createdAt).toDateString())
      .filter((date, index, self) => self.indexOf(date) === index) // 去重
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime()) // 降序：最新在最前

    let currentStreak = 0
    
    // 計算 Current Streak
    if (sortedDates.length > 0) {
      const today = new Date().toDateString()
      const yesterday = new Date(Date.now() - 86400000).toDateString()
      const lastWriteDate = sortedDates[0]

      // 如果最後一次寫作是今天或昨天，那麼 Streak 依然有效
      if (lastWriteDate === today || lastWriteDate === yesterday) {
        currentStreak = 1
        let checkDate = new Date(lastWriteDate)
        
        for (let i = 1; i < sortedDates.length; i++) {
          checkDate.setDate(checkDate.getDate() - 1) // 往前推一天
          if (sortedDates[i] === checkDate.toDateString()) {
            currentStreak++
          } else {
            break
          }
        }
      }
    }

    return {
      totalEntries,
      totalWords,
      avgWords,
      monthlyCount,
      lastEntryDate,
      timeHeatmap,
      currentStreak, // [Vibe] 新增欄位
    };
  }, [cachedDiaries, refreshTrigger]);

  // 解構統計數據以便使用
  const { totalEntries, totalWords, avgWords, monthlyCount, lastEntryDate, timeHeatmap, currentStreak } = statistics;

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

  // loading 狀態已移除,因為使用 useMemo 即時計算

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
  const maxCount = Math.max(...timeHeatmap.flat());

  return (
    <div className="space-y-6">
      {/* [Vibe] 新增 Streak 卡片，激勵用戶 */}
      <div
        className="stagger-item card-hover bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-xl p-6 shadow-lg transform hover:scale-[1.02] transition-all"
        style={{ animationDelay: '0s' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/80 text-sm font-medium mb-1">連續寫作</p>
            <h3 className="text-3xl font-bold flex items-baseline gap-2">
              {currentStreak}
              <span className="text-lg font-normal opacity-80">天</span>
            </h3>
          </div>
          <div className="bg-white/20 p-3 rounded-full backdrop-blur-sm">
             <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" aria-hidden="true">
               <path d="M12 2c.9 3.4-.9 5.3-2.5 7-1.3 1.4-2.5 2.7-2.5 4.9a5 5 0 0010 0c0-2.2-1.2-3.5-2.5-4.9-1.6-1.7-3.4-3.6-2.5-7z" />
               <path d="M12 10.2c.35 1.5-.5 2.3-1.2 3-.6.6-1.1 1.1-1.1 1.9a2.3 2.3 0 004.6 0c0-.8-.5-1.3-1.1-1.9-.7-.7-1.55-1.5-1.2-3z" opacity="0.7" />
             </svg>
           </div>
        </div>
      </div>

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
