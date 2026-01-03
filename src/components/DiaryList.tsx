import { useState, useEffect, useRef, useCallback, useMemo, useLayoutEffect } from 'react';
import { dbService, type DiaryEntry } from '../lib/db';
import { BottomSheet, type BottomSheetOption } from './BottomSheet';

// Debounce hook for search optimization
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

interface DiaryListProps {
  onEdit: (diary: DiaryEntry) => void;
  onNew: () => void;
  refreshTrigger: number;
  cachedDiaries?: DiaryEntry[];
  onDiariesChange?: (diaries: DiaryEntry[]) => void;
  /* [Vibe] 接收外部的選單狀態控制 */
  isMenuOpen?: boolean;
  onMenuOpenChange?: (isOpen: boolean) => void;
  showOnThisDay?: boolean;
}

type SortType = 'date' | 'title' | 'wordCount';
type SortOrder = 'asc' | 'desc';
type FilterType = 'all' | 'starred' | 'archived' | `month-${string}`;

export function DiaryList({ onEdit, onNew, refreshTrigger, cachedDiaries, onDiariesChange, isMenuOpen, onMenuOpenChange, showOnThisDay = true }: DiaryListProps) {
  const [diaries, setDiaries] = useState<DiaryEntry[]>(cachedDiaries || []);
  // [Vibe] Persistence: 記住搜尋狀態
  const [searchTerm, setSearchTerm] = useState(() => sessionStorage.getItem('diary_search_term') || '');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [loading, setLoading] = useState(false);
  // [Vibe] Persistence: 從 localStorage 讀取排序設定
  const [sortType, setSortType] = useState<SortType>(() => {
    const saved = localStorage.getItem('diary_sort_type');
    return (saved as SortType) || 'date';
  });
  const [sortOrder, setSortOrder] = useState<SortOrder>(() => {
    const saved = localStorage.getItem('diary_sort_order');
    return (saved as SortOrder) || 'desc';
  });
  const [filterType, setFilterType] = useState<FilterType>(() => {
    const saved = localStorage.getItem('diary_filter_type');
    return (saved as FilterType) || 'all';
  });
  const [selectedMonth, setSelectedMonth] = useState<string | null>(() => {
    return localStorage.getItem('diary_selected_month');
  });
  
  // [Vibe] UI: 返回頂部按鈕顯示狀態
  const [showBackToTop, setShowBackToTop] = useState(false);
  // [Vibe] UX: 標記滾動位置是否已恢復，用於控制畫面淡入，避免跳動
  const [isRestored, setIsRestored] = useState(false);

  // [Vibe] Persistence: 記住滾動位置
  const [scrollPosition, setScrollPosition] = useState(() => {
    const saved = sessionStorage.getItem('diary_scroll_position');
    return saved ? parseInt(saved) : 0;
  });
  const [actionFeedback, setActionFeedback] = useState<string>('');
  
  /* [Vibe] 同步狀態給父層 App.tsx 以攔截返回鍵 */
  const [activeSheet, setActiveSheet] = useState<'sort' | 'filter' | null>(null);
  
  /* [Vibe] 當年今日 State */
  const [dismissedMemory, setDismissedMemory] = useState<string | null>(() => {
    return localStorage.getItem('dismissed_memory_date')
  });
  
  useEffect(() => {
    if (onMenuOpenChange) {
      onMenuOpenChange(!!activeSheet);
    }
  }, [activeSheet, onMenuOpenChange]);

  /* [Vibe] 如果父層要求關閉 (例如按了返回鍵)，則關閉 */
  useEffect(() => {
    if (isMenuOpen === false) {
      setActiveSheet(null);
    }
  }, [isMenuOpen]);
  
  // [Vibe] Persistence: 更新時寫入 Storage
  useEffect(() => {
    sessionStorage.setItem('diary_search_term', searchTerm)
  }, [searchTerm])

  // [Vibe] Persistence: 保存排序和篩選設定
  useEffect(() => {
    localStorage.setItem('diary_sort_type', sortType);
  }, [sortType]);

  useEffect(() => {
    localStorage.setItem('diary_sort_order', sortOrder);
  }, [sortOrder]);

  useEffect(() => {
    localStorage.setItem('diary_filter_type', filterType);
  }, [filterType]);

  useEffect(() => {
    if (selectedMonth) {
      localStorage.setItem('diary_selected_month', selectedMonth);
    } else {
      localStorage.removeItem('diary_selected_month');
    }
  }, [selectedMonth]);

  // [Vibe] Pagination: 分頁狀態
  const PAGE_SIZE = 20
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  // Use callback-ref to ensure observer attaches only when element exists
  const [sentinelEl, setSentinelEl] = useState<HTMLDivElement | null>(null)

  // [Vibe] Pagination: 搜尋或篩選條件改變時，重置回第一頁
  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [debouncedSearchTerm, filterType, sortType, sortOrder, selectedMonth])

  // [Vibe] Pagination: 監聽底部元素，觸發加載更多
  useEffect(() => {
    if (!sentinelEl) return

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount(prev => prev + PAGE_SIZE)
        }
      },
      { threshold: 0.5 } // 看到 50% 就加載
    )

    observer.observe(sentinelEl)
    return () => observer.disconnect()
  }, [sentinelEl])

  
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const longPressActive = useRef<boolean>(false);
  
  // 移除 Pull to Refresh 狀態和處理函數

  // 輔助函數：移除 HTML 標籤
  const stripHtml = useCallback((html: string) => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }, []);


  // 移除舊的 filterAndSortDiaries useEffect

  useEffect(() => {
    if (actionFeedback) {
      const timer = setTimeout(() => setActionFeedback(''), 2000);
      return () => clearTimeout(timer);
    }
  }, [actionFeedback]);

  useEffect(() => {
    if (!batchMode) {
      setSelectedIds(new Set());
    }
  }, [batchMode]);

  useEffect(() => {
    setBatchMode(false);
    setSelectedIds(new Set());
    if (filterType !== 'all') {
      setSelectedMonth(null);
    }
  }, [filterType]);

  useEffect(() => {
    if (batchMode && selectedIds.size === 0) {
      setBatchMode(false);
    }
  }, [selectedIds, batchMode]);

  useEffect(() => {
    if (selectedMonth) {
      setBatchMode(false);
      setSelectedIds(new Set());
    }
  }, [selectedMonth]);

  const loadDiaries = useCallback(async () => {
    try {
      setLoading(true);
      const data = await dbService.getAllDiaries();
      setDiaries(data);
      if (onDiariesChange) {
        onDiariesChange(data);
      }
    } catch (error) {
      console.error('載入日記失敗:', error);
      setActionFeedback('載入失敗');
    } finally {
      setLoading(false);
    }
  }, [onDiariesChange]);

  // 使用緩存數據初始化 - 修復初次載入滾動bug
  useEffect(() => {
    if (cachedDiaries && cachedDiaries.length > 0) {
      setDiaries(cachedDiaries);
      setLoading(false); // 確保載入狀態正確
    } else if (!cachedDiaries) {
      // 只有當 cachedDiaries 為 undefined 時才載入
      loadDiaries();
    }
  }, [cachedDiaries, loadDiaries]);

  // 將排序邏輯改為普通函數供 useMemo 使用，或直接在 useMemo 內部實現
  // 這裡我們直接在 filteredDiaries 的 useMemo 中處理，減少複雜度

  // 使用 useMemo 替代 filteredDiaries state 和 useEffect
  // 這樣即使是第一次 render，只要 diaries 有值，filteredDiaries 就會有值
  const filteredDiaries = useMemo(() => {
    let result = diaries;
    
    // 1. 篩選
    if (filterType === 'starred') {
      result = diaries.filter(diary => diary.isStarred && !diary.isArchived);
    } else if (filterType === 'archived') {
      result = diaries.filter(diary => diary.isArchived);
    } else {
      result = diaries.filter(diary => !diary.isArchived);
    }
    
    // 2. 年月篩選
    if (selectedMonth) {
      result = result.filter(diary => {
        const date = new Date(diary.createdAt);
        const diaryYearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        return diaryYearMonth === selectedMonth;
      });
    }
    
    // 3. 搜尋
    if (debouncedSearchTerm) {
      const lowerSearch = debouncedSearchTerm.toLowerCase();
      result = result.filter(diary =>
        diary.title.toLowerCase().includes(lowerSearch) ||
        diary.content.toLowerCase().includes(lowerSearch)
      );
    }
    
    // 4. 排序
    const sorted = [...result];
    switch (sortType) {
      case 'date':
        sorted.sort((a, b) => {
          const timeA = new Date(a.createdAt).getTime();
          const timeB = new Date(b.createdAt).getTime();
          return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
        });
        break;
      case 'title':
        sorted.sort((a, b) => {
          const titleA = a.title || stripHtml(a.content).substring(0, 50);
          const titleB = b.title || stripHtml(b.content).substring(0, 50);
          const comparison = titleA.localeCompare(titleB, 'zh-HK');
          return sortOrder === 'desc' ? -comparison : comparison;
        });
        break;
      case 'wordCount':
        sorted.sort((a, b) => {
          return sortOrder === 'desc' ? b.wordCount - a.wordCount : a.wordCount - b.wordCount;
        });
        break;
    }
    
    return sorted;
  }, [diaries, filterType, selectedMonth, debouncedSearchTerm, sortType, sortOrder, stripHtml]);

  /* [Vibe] 計算當年今日的回顧 */
  const memoryDiary = useMemo(() => {
    if (loading || diaries.length === 0) return null;
    const today = new Date();
    const month = today.getMonth();
    const date = today.getDate();
    
    // 尋找過去年份的同一天
    return diaries.find(d => {
      const dDate = new Date(d.createdAt);
      return dDate.getMonth() === month &&
             dDate.getDate() === date &&
             dDate.getFullYear() < today.getFullYear(); // 必須是過去的年份
    });
  }, [diaries, loading]);

  const handleDismissMemory = (e: React.MouseEvent) => {
    e.stopPropagation();
    const todayStr = new Date().toDateString();
    localStorage.setItem('dismissed_memory_date', todayStr);
    setDismissedMemory(todayStr);
  };

  // 渲染判斷
  const showMemoryCard = showOnThisDay && memoryDiary && dismissedMemory !== new Date().toDateString();

  const toggleSortOrder = useCallback(() => {
    setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
  }, []);

  const toggleBatchMode = useCallback(() => {
    setBatchMode(prev => !prev);
    setSelectedIds(new Set());
  }, []);

  const toggleSelectDiary = useCallback((id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredDiaries.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredDiaries.map(d => d.id)));
    }
  }, [selectedIds.size, filteredDiaries]);

  const getSelectedDiariesStatus = useCallback(() => {
    const selectedDiaries = diaries.filter(d => selectedIds.has(d.id));
    const allStarred = selectedDiaries.every(d => d.isStarred);
    const allArchived = selectedDiaries.every(d => d.isArchived);
    const someStarred = selectedDiaries.some(d => d.isStarred);
    const someArchived = selectedDiaries.some(d => d.isArchived);
    
    return {
      allStarred,
      allArchived,
      someStarred,
      someArchived,
    };
  }, [diaries, selectedIds]);

  const handleBatchDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    
    if (!confirm(`確定要刪除 ${selectedIds.size} 篇日記嗎？此操作無法復原！`)) {
      return;
    }

    try {
      for (const id of selectedIds) {
        await dbService.deleteDiary(id);
      }
      await loadDiaries();
      setActionFeedback(`已刪除 ${selectedIds.size} 篇日記`);
      setBatchMode(false);
    } catch (error) {
      setActionFeedback('刪除失敗');
    }
  }, [selectedIds, loadDiaries]);

  const handleBatchToggleStar = useCallback(async () => {
    if (selectedIds.size === 0) return;

    try {
      const status = getSelectedDiariesStatus();
      const actionText = status.allStarred ? '取消打星' : '打星';
      
      for (const id of selectedIds) {
        const diary = diaries.find(d => d.id === id);
        if (diary) {
          if (status.allStarred && diary.isStarred) {
            await dbService.toggleStarred(id);
          } else if (!status.allStarred && !diary.isStarred) {
            await dbService.toggleStarred(id);
          }
        }
      }
      
      await loadDiaries();
      setActionFeedback(`已${actionText} ${selectedIds.size} 篇日記`);
      setBatchMode(false);
    } catch (error) {
      setActionFeedback('操作失敗');
    }
  }, [selectedIds, getSelectedDiariesStatus, diaries, loadDiaries]);

  const handleBatchToggleArchive = useCallback(async () => {
    if (selectedIds.size === 0) return;

    try {
      const status = getSelectedDiariesStatus();
      const actionText = status.allArchived ? '取消封存' : '封存';
      
      for (const id of selectedIds) {
        const diary = diaries.find(d => d.id === id);
        if (diary) {
          if (status.allArchived && diary.isArchived) {
            await dbService.toggleArchived(id);
          } else if (!status.allArchived && !diary.isArchived) {
            await dbService.toggleArchived(id);
          }
        }
      }
      
      await loadDiaries();
      setActionFeedback(`已${actionText} ${selectedIds.size} 篇日記`);
      setBatchMode(false);
    } catch (error) {
      setActionFeedback('操作失敗');
    }
  }, [selectedIds, getSelectedDiariesStatus, diaries, loadDiaries]);

  const handleLongPressStart = useCallback((id: string, e: React.TouchEvent | React.MouseEvent) => {
    if (batchMode) return;
    
    longPressActive.current = false;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    touchStartPos.current = { x: clientX, y: clientY };
    
    longPressTimer.current = setTimeout(() => {
      longPressActive.current = true;
      setBatchMode(true);
      setSelectedIds(new Set([id]));
      
      // [Vibe] UX: 增加震動回饋，讓用戶知道「模式已切換」
      if (navigator.vibrate) navigator.vibrate(50)
    }, 800); // [Vibe] UX: 延長至 800ms 避免誤觸
  }, [batchMode]);

  const handleLongPressEnd = useCallback((e?: React.TouchEvent | React.MouseEvent) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    touchStartPos.current = null;
    const wasLongPress = longPressActive.current;
    longPressActive.current = false;

    if (wasLongPress && e) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartPos.current && longPressTimer.current) {
      const touch = e.touches[0];
      const deltaX = Math.abs(touch.clientX - touchStartPos.current.x);
      const deltaY = Math.abs(touch.clientY - touchStartPos.current.y);
      
      if (deltaX > 10 || deltaY > 10) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    }
  }, []);

  const handleCardClick = useCallback((diary: DiaryEntry, e: React.MouseEvent) => {
    if (batchMode) {
      toggleSelectDiary(diary.id);
    } else if (!longPressActive.current) {
      onEdit(diary);
    }
  }, [batchMode, toggleSelectDiary, onEdit]);

  // stripHtml 移至前面定義

  const formatDateTime = useCallback((date: Date) => {
    const d = new Date(date);
    return d.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }, []);

  // [Vibe] 優化效能: 使用 useMemo 避免每次 render 都重新生成選項
  const sortOptions: BottomSheetOption[] = useMemo(() => [
    {
      value: 'date-desc',
      label: '最新優先',
      description: '按建立時間由新到舊',
      selected: sortType === 'date' && sortOrder === 'desc',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
        </svg>
      )
    },
    {
      value: 'date-asc',
      label: '最舊優先',
      description: '按建立時間由舊到新',
      selected: sortType === 'date' && sortOrder === 'asc',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
        </svg>
      )
    },
    {
      value: 'title-asc',
      label: '標題 A-Z',
      description: '按標題字母順序排列',
      selected: sortType === 'title' && sortOrder === 'asc',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
        </svg>
      )
    },
    {
      value: 'title-desc',
      label: '標題 Z-A',
      description: '按標題字母倒序排列',
      selected: sortType === 'title' && sortOrder === 'desc',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
        </svg>
      )
    },
    {
      value: 'wordCount-desc',
      label: '字數最多',
      description: '按字數由多到少',
      selected: sortType === 'wordCount' && sortOrder === 'desc',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      value: 'wordCount-asc',
      label: '字數最少',
      description: '按字數由少到多',
      selected: sortType === 'wordCount' && sortOrder === 'asc',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    }
  ], [sortType, sortOrder]); // 只在排序狀態變化時重新計算

  // 提取所有有日記的年月
  const availableMonths = useMemo(() => {
    const monthSet = new Map<string, number>();
    diaries.forEach(diary => {
      if (diary.isArchived) return;
      const date = new Date(diary.createdAt);
      const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthSet.set(yearMonth, (monthSet.get(yearMonth) || 0) + 1);
    });
    return Array.from(monthSet.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([yearMonth, count]) => {
        const [year, month] = yearMonth.split('-');
        return {
          value: `month-${yearMonth}`,
          label: `${year}年${parseInt(month)}月`,
          count
        };
      });
  }, [diaries]);

  // 篩選選項
  const filterOptions: BottomSheetOption[] = [
    {
      value: 'all',
      label: `全部日記 (${diaries.filter(d => !d.isArchived).length})`,
      selected: filterType === 'all' && !selectedMonth,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      )
    },
    {
      value: 'starred',
      label: `已收藏 (${diaries.filter(d => d.isStarred && !d.isArchived).length})`,
      selected: filterType === 'starred',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      )
    },
    {
      value: 'archived',
      label: `已封存 (${diaries.filter(d => d.isArchived).length})`,
      selected: filterType === 'archived',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
      )
    },
    ...availableMonths.map(month => ({
      value: month.value,
      label: `${month.label} (${month.count})`,
      selected: selectedMonth === month.value.replace('month-', ''),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    }))
  ];

  const handleSortSelect = useCallback((value: string) => {
    const [type, order] = value.split('-') as [SortType, SortOrder];
    setSortType(type);
    setSortOrder(order);
  }, []);

  const handleFilterSelect = useCallback((value: string) => {
    if (value.startsWith('month-')) {
      const yearMonth = value.replace('month-', '');
      setSelectedMonth(yearMonth);
      setFilterType('all');
    } else {
      setSelectedMonth(null);
      setFilterType(value as FilterType);
    }
  }, []);

  /* [Vibe] Confetti 動畫函數 */
  const triggerConfetti = useCallback((x: number, y: number) => {
    const colors = ['confetti-red', 'confetti-blue', 'confetti-yellow', 'confetti-green', 'confetti-purple'];
    const particleCount = 12;
    
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = `confetti-particle ${colors[Math.floor(Math.random() * colors.length)]}`;
      
      // 隨機偏移位置
      const offsetX = (Math.random() - 0.5) * 60;
      const offsetY = (Math.random() - 0.5) * 40;
      
      particle.style.left = `${x + offsetX}px`;
      particle.style.top = `${y + offsetY}px`;
      
      // 隨機延遲
      particle.style.animationDelay = `${Math.random() * 0.1}s`;
      
      document.body.appendChild(particle);
      
      // 動畫結束後移除
      setTimeout(() => {
        if (particle.parentNode) {
          particle.parentNode.removeChild(particle);
        }
      }, 1000);
    }
  }, []);

  // [Vibe] UX: 無縫滾動恢復 & 返回頂部監聽
  // 使用 useLayoutEffect 確保在畫面渲染前就設定好 Scroll，避免閃爍
  useLayoutEffect(() => {
    // 1. 恢復滾動位置
    const savedPosition = parseInt(sessionStorage.getItem('diary_scroll_position') || '0');
    if (savedPosition > 0) {
      window.scrollTo({ top: savedPosition, behavior: 'instant' });
    }
    
    // 2. 設定為已恢復，觸發淡入動畫
    // 使用 requestAnimationFrame 確保在下一幀才顯示，讓 Scroll 設定完全生效
    requestAnimationFrame(() => {
      setIsRestored(true);
    });

  }, []); // 只在 Mount 時執行一次

  // [Vibe] Persistence & UI: 監聽滾動
  useEffect(() => {
    const handleScroll = () => {
      const position = window.pageYOffset || document.documentElement.scrollTop;
      
      // 保存位置
      sessionStorage.setItem('diary_scroll_position', position.toString());
      setScrollPosition(position);

      // 控制返回頂部按鈕 (超過 500px 顯示)
      setShowBackToTop(position > 500);
    };

    let ticking = false;
    const throttledScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', throttledScroll, { passive: true });
    return () => window.removeEventListener('scroll', throttledScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 只有在真正需要等待資料且沒有任何日記時才顯示 loading
  if (loading && diaries.length === 0) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const selectedStatus = getSelectedDiariesStatus();

  return (
    <div
      className="container mx-auto px-4 py-0 max-w-4xl page-transition-enter min-h-screen"
    >
      {/* [Vibe] Animation: 添加 transition-opacity 實現 Apple 風格的無縫出現 */}
      <div className={`transition-opacity duration-300 ease-out ${isRestored ? 'opacity-100' : 'opacity-0'}`}>
        {actionFeedback && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-gray-900 dark:bg-gray-700 text-white px-6 py-3 rounded-lg shadow-lg animate-slide-down">
            {actionFeedback}
          </div>
        )}

      {/* [Vibe] Floating Action Bar (Batch Mode) */}
      <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${batchMode ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'}`}>
        <div className="bg-gray-900/90 dark:bg-gray-800/95 backdrop-blur-md text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-6 border border-white/10">
          
          {/* 顯示選取數量 */}
          <span className="font-bold text-sm min-w-[20px]">{selectedIds.size}</span>
          <div className="w-px h-4 bg-gray-600"></div>

          {/* Star Button (Dynamic Icon) */}
          <button
            onClick={handleBatchToggleStar}
            disabled={selectedIds.size === 0}
            className={`flex flex-col items-center gap-1 active:scale-90 transition disabled:opacity-50 ${selectedStatus.allStarred ? 'text-yellow-400' : 'text-white'}`}
          >
            {selectedStatus.allStarred ? (
              // 實心星星 (代表全都是星標，點擊取消)
              <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.784.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
            ) : (
              // 空心星星 (代表有點擊可以加星)
              <svg className="w-6 h-6 fill-none stroke-current" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.784.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
            )}
          </button>

          {/* Archive Button (Dynamic Icon) */}
          <button
             onClick={handleBatchToggleArchive}
             disabled={selectedIds.size === 0}
             className={`flex flex-col items-center gap-1 active:scale-90 transition disabled:opacity-50 ${selectedStatus.allArchived ? 'text-blue-400' : 'text-white'}`}
          >
            {selectedStatus.allArchived ? (
              // 實心/有顏色的封存 (代表已封存，點擊解封)
              <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M4 4h16v2H4zM4 8h16v12H4z" /></svg>
            ) : (
              // 空心封存
              <svg className="w-6 h-6 fill-none stroke-current" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
            )}
          </button>

          {/* Delete Button (Red) */}
          <button
             onClick={handleBatchDelete}
             disabled={selectedIds.size === 0}
             className="flex flex-col items-center gap-1 active:scale-90 transition text-red-400 disabled:opacity-50"
          >
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
          
          <div className="w-px h-4 bg-gray-600"></div>

          {/* Select All */}
          <button onClick={toggleSelectAll} className="text-xs font-medium active:scale-95">
             {selectedIds.size === filteredDiaries.length ? '全不選' : '全選'}
          </button>
        </div>
      </div>

      {/* 搜尋和排序控制 */}
      {/* [Vibe] 移除 -mx-4 px-4 避免額外空位，直接使用容器內寬度 */}
      <div className="sticky top-0 z-30 bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur-md pb-4 pt-2 space-y-3 transition-all">
        {/* [Vibe] iOS Style Search Bar */}
        <div className="relative group px-0">
          <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
            <svg className="w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="搜尋日記..."
            className="w-full bg-gray-100 dark:bg-gray-800/80 text-gray-900 dark:text-white rounded-xl py-3 pl-12 pr-4 text-[17px] focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 outline-none placeholder-gray-500 border-none"
          />
          {searchTerm && (
            <button
              onClick={(e) => {
                e.stopPropagation(); // [Vibe] 防止點擊穿透到 input
                setSearchTerm('');
              }}
              // [Vibe] z-10 確保在 input 之上
              // [Vibe] h-full 確保垂直方向容易點到
              // [Vibe] w-10 擴大水平點擊範圍
              className="absolute right-0 top-0 h-full w-10 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors z-10"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* 過濾和排序按鈕 */}
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveSheet('filter')}
            className="flex-shrink-0 px-3 py-2 bg-white dark:bg-gray-800 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            {selectedMonth
              ? (() => {
                  const [year, month] = selectedMonth.split('-');
                  return `${year}年${parseInt(month)}月`;
                })()
              : filterType === 'all'
              ? '全部'
              : filterType === 'starred'
              ? '收藏'
              : '封存'
            }
          </button>
          
          <button
            onClick={() => setActiveSheet('sort')}
            className="flex-shrink-0 px-3 py-2 bg-white dark:bg-gray-800 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {sortOrder === 'desc' ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
              )}
            </svg>
            {sortType === 'date' ? '時間' : sortType === 'title' ? '標題' : '字數'}
          </button>
        </div>
      </div>

      {/* 日記列表 */}
      
      {/* [Vibe] 當年今日卡片 */}
      {showMemoryCard && !searchTerm && filterType === 'all' && (
        <div
          onClick={() => onEdit(memoryDiary)}
          className="mb-6 p-5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg text-white cursor-pointer transform hover:scale-[1.02] transition-all relative overflow-hidden group"
        >
          {/* Dismiss Button */}
          <button
            onClick={handleDismissMemory}
            className="absolute top-2 right-2 p-1.5 bg-black/20 hover:bg-black/40 rounded-full text-white/80 transition-colors z-20"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>

          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:bg-white/20 transition-all"></div>
          
          <div className="flex items-center gap-2 mb-2 text-indigo-100 text-sm font-medium">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
             當年今日 ({new Date(memoryDiary.createdAt).getFullYear()})
          </div>
          
          {/* Title Logic: 有標題顯示標題，沒標題什麼都不顯示(或直接顯示內容) */}
          {memoryDiary.title && (
            <h3 className="text-xl font-bold mb-1 line-clamp-1">{memoryDiary.title}</h3>
          )}
          
          {/* Content: 如果沒標題，內容字體大一點；有標題則正常 */}
          <p className={`text-indigo-100 line-clamp-2 opacity-90 ${!memoryDiary.title ? 'text-lg font-medium' : 'text-sm'}`}>
            {memoryDiary.content}
          </p>
        </div>
      )}

      {filteredDiaries.length === 0 ? (
        <div className="text-center py-16">
          <div className="inline-block p-8 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-700 rounded-3xl mb-6 shadow-inner">
            <svg className="w-20 h-20 text-blue-400 dark:text-blue-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <p className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
            {searchTerm ? '找不到相關日記' : '還沒有日記'}
          </p>
          <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg">
            {searchTerm ? '試試其他搜尋詞' : '點擊下方按鈕開始寫第一篇日記'}
          </p>
          {!searchTerm && (
            <button
              onClick={onNew}
              className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 text-white rounded-2xl shadow-2xl hover:shadow-purple-500/30 transition-all duration-300 transform hover:scale-105 active:scale-95"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              寫第一篇日記
            </button>
          )}
        </div>
      ) : (
        /* [Vibe] 還原貼合佈局，只保留底部 padding 避免被 BottomNav 遮住 */
        <div className="space-y-2.5 mt-0 pb-24">
          {/* [Vibe] Pagination: 只渲染可見部分 (Slice) */}
          {filteredDiaries.slice(0, visibleCount).map((diary) => {
            const hasTitle = diary.title && diary.title.trim().length > 0;
            const cleanContent = stripHtml(diary.content);
            
            return (
              <div
                key={diary.id}
                onClick={(e) => handleCardClick(diary, e)}
                onTouchStart={(e) => handleLongPressStart(diary.id, e)}
                onTouchEnd={handleLongPressEnd}
                onTouchMove={handleTouchMove}
                onMouseDown={(e) => handleLongPressStart(diary.id, e)}
                onMouseUp={handleLongPressEnd}
                onMouseLeave={handleLongPressEnd}
                /* [Vibe] 加入 select-none 禁止文字反白，改善長按體驗 */
                className={`stagger-item relative bg-white dark:bg-gray-800/95 rounded-2xl shadow-md transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] cursor-pointer select-none ${
                  batchMode && selectedIds.has(diary.id)
                    /* [Vibe] 使用 ring-inset 將選中框「吸」進去，不再依賴外部空間 */
                    ? 'scale-[0.97] ring-2 ring-inset ring-blue-500 bg-gray-50 dark:bg-gray-800'
                    : 'hover:scale-[1.01] active:scale-[0.98]'
                } backdrop-blur-sm`}
                style={{ animationDelay: `${Math.min(filteredDiaries.indexOf(diary) * 0.05, 0.4)}s` }}
              >
                <div className="p-5 relative">
                   {/* [Vibe] 右上角星星 (Absolute Position) - 批量模式下隱藏 */}
                   {!batchMode && (
                   <button
                     onClick={async (e) => {
                       e.stopPropagation();
                       if (navigator.vibrate) navigator.vibrate(50);
                       const newStatus = !diary.isStarred;
                       await dbService.toggleStarred(diary.id);
                       if (onDiariesChange && cachedDiaries) {
                         onDiariesChange(cachedDiaries.map(d => d.id === diary.id ? {...d, isStarred: newStatus} : d));
                       }
                     }}
                     className="absolute top-4 right-4 p-2 active:scale-90 transition-all z-10 group/star"
                   >
                     <svg
                       className={`w-6 h-6 transition-all duration-300 ${
                         diary.isStarred
                           ? 'text-yellow-400 fill-yellow-400 drop-shadow-sm scale-110 animate-pop'
                           : 'text-gray-300 dark:text-gray-600 fill-transparent stroke-current hover:text-yellow-400 dark:hover:text-yellow-400'
                       }`}
                       viewBox="0 0 24 24"
                     >
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.784.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                     </svg>
                   </button>
                   )}
  
                   <div className="flex items-center justify-between gap-3 mb-3">
                     <div className="flex-1 min-w-0">
                       {hasTitle && (
                         <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 line-clamp-2">
                           {diary.title}
                         </h3>
                       )}
                        
                        <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2 flex-wrap text-sm text-gray-500 dark:text-gray-400">
                          <span>{formatDateTime(diary.createdAt)}</span>
                          
                          {diary.isEdited && diary.editHistory && diary.editHistory.length > 0 && (
                            <>
                              <span>•</span>
                              <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </>
                          )}
                          
                          <span>•</span>
                          <span>{diary.wordCount} 字</span>
                        </div>
                        
                        {/* [Vibe] 移除右下角星星按鈕 (改由長按 Action Bar 處理) */}
                      </div>
                    </div>

                    {/* [Vibe] Batch Mode 時顯示 Checkbox，平時不顯示任何右側圖標 */}
                    {batchMode && (
                      <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center ml-2">
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelectDiary(diary.id);
                          }}
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all duration-200 ${
                            selectedIds.has(diary.id)
                              ? 'bg-blue-500 border-blue-500 shadow-sm transform scale-100'
                              : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-500'
                          }`}
                        >
                          {selectedIds.has(diary.id) && (
                            <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* [Vibe] text-sm (14px) 改為 text-xs (12px) 或保持 text-sm 但改 leading-snug 讓排版更緊湊 */}
                  <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed line-clamp-3 text-justify">
                    {cleanContent}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* [Vibe] Pagination: 隱形觸發點 (Sentinel) */}
      {filteredDiaries.length > visibleCount && (
        <div ref={setSentinelEl} className="h-10 w-full flex justify-center items-center opacity-50">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-400"></div>
        </div>
      )}
      
      {/* 選單部分修改為使用 activeSheet */}
      <BottomSheet
        isOpen={activeSheet === 'sort'}
        title="排序方式"
        options={sortOptions}
        onSelect={(val) => { handleSortSelect(val); setActiveSheet(null); }}
        onClose={() => setActiveSheet(null)}
      />
      
      <BottomSheet
        isOpen={activeSheet === 'filter'}
        title="篩選日記"
        options={filterOptions}
        onSelect={(val) => { handleFilterSelect(val); setActiveSheet(null); }}
        onClose={() => setActiveSheet(null)}
      />

      {/* [Vibe] UI: 返回頂部按鈕 (Floating Action Button) */}
      <button
        onClick={scrollToTop}
        className={`fixed bottom-24 right-6 p-3 rounded-full shadow-lg bg-blue-600 text-white z-40 transition-all duration-300 transform hover:bg-blue-700 active:scale-95 ${
          showBackToTop ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'
        }`}
        aria-label="返回頂部"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>
      </button>
      </div> {/* Close the transition-opacity div */}
    </div>
  );
}