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
    // 空值改用更明顯的灰色實色，確保在白色背景上能看見格子
    if (count === 0) return 'bg-gray-100 dark:bg-gray-700/50';
    const intensity = maxCount > 0 ? count / maxCount : 0;
    
    // 7 層粉色深度，調整透明度讓層次更分明
    if (intensity <= 0.15) return 'bg-pink-200 dark:bg-pink-900/40';
    if (intensity <= 0.3) return 'bg-pink-300 dark:bg-pink-800/50';
    if (intensity <= 0.45) return 'bg-pink-400 dark:bg-pink-700/60';
    if (intensity <= 0.6) return 'bg-pink-500 dark:bg-pink-600/70';
    if (intensity <= 0.75) return 'bg-pink-600 dark:bg-pink-500/80';
    if (intensity <= 0.9) return 'bg-pink-700 dark:bg-pink-400/90';
    return 'bg-pink-800 dark:bg-pink-300';
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
  
  // 生成從 06:00 開始的 24 小時順序 (06:00 在頂部, 05:00 在底部)
  const hourOrder = Array.from({ length: 24 }, (_, i) => (6 + i) % 24);

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
           {/* 標準實心火焰圖示 */}
           <svg className="w-8 h-8 text-orange-500 dark:text-orange-400 drop-shadow-sm" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
             <path fillRule="evenodd" d="M12.9 14.32a8 8 0 0 1 1.76 4.5c0 1.4-.44 2.72-1.2 3.8.72-.25 1.4-.64 1.96-1.13 1.94-1.7 2.45-4.5 1.1-7.17M13.63 2c-.93 2.1-1.3 4.56.36 6.84-2.83-2-4-4.83-3.6-7.38C6.18 3.5 4.64 6.95 5.92 10.3c.96 2.5 3.32 4.3 5.38 4.02L12 14l.7 1.25.1.25-.1.24c-.62 1.54-2.14 2.56-3.8 2.54-1.92 0-3.6-1.37-4.1-3.2-.2-1-.07-2 .3-2.93l.26-.64-.5-.53c-1.3-1.36-2-3.14-1.93-5A11.3 11.3 0 0 1 5.06 0C1.86 4.6 1.46 10.95 4.14 16A9.96 9.96 0 0 0 13 22a10 10 0 0 0 7.07-2.93c4.1-4.1 3.9-10.93-.45-14.8-.82-.74-1.8-1.4-2.8-1.84l-.86-.33.15.9c.14.78.22 1.58.23 2.38-.02 1.34-.33 2.66-.9 3.85l-.4 1.13-.88-.7c-2.15-1.7-2.6-4.63-1.07-6.93l.46-.73L13.63 2Z" clipRule="evenodd" />
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

      {/* 寫作習慣熱圖 - 手機寬度適配版 */}
      {totalEntries > 0 && (
        <div className="stagger-item card-hover bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-lg">
              <svg className="w-5 h-5 text-pink-600 dark:text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white">寫作時間分佈</h3>
          </div>

          <div className="flex w-full">
            {/* 左側時間軸標籤 - 每3小時顯示 (對齊格子高度) */}
            <div className="flex flex-col pt-6 pb-0 pr-2 text-[10px] text-gray-400 dark:text-gray-500 font-medium w-10 flex-shrink-0 text-right gap-1">
              {hourOrder.map((hour, i) => (
                <div key={hour} className="h-3 sm:h-4 flex items-center justify-end">
                  {/* 每 3 小時顯示一次標籤 (06, 09, 12...) */}
                  {hour % 3 === 0 ? `${String(hour).padStart(2, '0')}:00` : ''}
                </div>
              ))}
            </div>

            {/* 熱圖主體 - 使用 flex-1 和 grid 確保填滿寬度 */}
            <div className="flex-1 min-w-0">
              {/* 頂部星期標籤 (週一至週日) */}
              <div className="grid grid-cols-7 gap-1 mb-2 text-center">
                {['一', '二', '三', '四', '五', '六', '日'].map((d) => (
                  <div key={d} className="text-xs text-gray-400 dark:text-gray-500 font-medium">
                    {d}
                  </div>
                ))}
              </div>

              {/* 格子區域 */}
              <div className="flex flex-col gap-1 w-full">
                {hourOrder.map((hour) => (
                  <div key={hour} className="grid grid-cols-7 gap-1 w-full h-3 sm:h-4">
                    {/* 映射週一(1)到週日(0)的順序 */}
                    {[1, 2, 3, 4, 5, 6, 0].map((dayIndex) => {
                      const count = timeHeatmap[hour][dayIndex];
                      return (
                        <div
                          key={`${hour}-${dayIndex}`}
                          className={`rounded-sm ${getHeatmapColor(count, maxCount)} transition-all hover:opacity-80`}
                          title={`週${['日','一','二','三','四','五','六'][dayIndex]} ${String(hour).padStart(2, '0')}:00 - ${count} 篇`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* 圖例說明 (粉色系) */}
          <div className="flex items-center justify-end gap-2 mt-4 text-xs text-gray-400">
            <span>少</span>
            <div className="flex gap-1">
              <div className="w-3 h-3 rounded-sm bg-gray-100 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700"></div>
              <div className="w-3 h-3 rounded-sm bg-pink-200 dark:bg-pink-900/40"></div>
              <div className="w-3 h-3 rounded-sm bg-pink-400 dark:bg-pink-700/60"></div>
              <div className="w-3 h-3 rounded-sm bg-pink-600 dark:bg-pink-500/80"></div>
              <div className="w-3 h-3 rounded-sm bg-pink-800 dark:bg-pink-300"></div>
            </div>
            <span>多</span>
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
