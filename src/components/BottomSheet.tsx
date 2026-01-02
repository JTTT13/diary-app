import { useEffect, useState } from 'react';

export interface BottomSheetOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  description?: string;
  selected?: boolean;
}

interface BottomSheetProps {
  isOpen: boolean;
  title: string;
  options: BottomSheetOption[];
  onSelect: (value: string) => void;
  onClose: () => void;
}

export function BottomSheet({ isOpen, title, options, onSelect, onClose }: BottomSheetProps) {
  const [isClosing, setIsClosing] = useState(false);
  const [shouldRender, setShouldRender] = useState(isOpen);

  // 防止背景滾動
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setIsClosing(false);
      document.body.style.overflow = 'hidden';
    } else if (shouldRender) {
      setIsClosing(true);
      // 等待動畫完成後再卸載
      const timer = setTimeout(() => {
        setShouldRender(false);
        document.body.style.overflow = '';
      }, 250); // 動畫時長
      return () => clearTimeout(timer);
    }
  }, [isOpen, shouldRender]);

  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  if (!shouldRender) return null;

  const handleClose = () => {
    if (isClosing) return; // 防止重複觸發
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 200);
  };

  const handleSelect = (value: string) => {
    if (isClosing) return; // 防止重複觸發
    setIsClosing(true);
    onSelect(value);
    setTimeout(() => {
      onClose();
    }, 200);
  };

  return (
    <div className={`fixed inset-0 z-[9999] flex items-end justify-center ${isClosing ? 'animate-fade-out' : 'animate-fade-in-fast'}`}>
      {/* 背景遮罩 */}
      <div
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-200 ${isClosing ? 'opacity-0' : 'opacity-100'}`}
        onClick={handleClose}
      />
      
      {/* 底部彈出選單 */}
      <div className={`relative bg-white dark:bg-gray-800 rounded-t-3xl shadow-2xl w-full max-w-lg pb-safe ${isClosing ? 'animate-slide-down' : 'animate-slide-up'}`}>
        {/* 拖動指示器 */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>
        
        {/* 標題區 */}
        <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white text-center">
            {title}
          </h3>
        </div>
        
        {/* 選項列表 */}
        <div className="px-4 py-3 max-h-[60vh] overflow-y-auto">
          <div className="space-y-1">
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className={`w-full px-4 py-4 rounded-xl text-left transition-all active:scale-98 ${
                  option.selected
                    ? 'bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-500'
                    : 'bg-gray-50 dark:bg-gray-700/50 border-2 border-transparent hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  {option.icon && (
                    <div className={`flex-shrink-0 ${option.selected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
                      {option.icon}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className={`font-medium ${option.selected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                      {option.label}
                    </div>
                    {option.description && (
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        {option.description}
                      </div>
                    )}
                  </div>
                  {option.selected && (
                    <div className="flex-shrink-0">
                      <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
        
        {/* 取消按鈕 */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleClose}
            className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-all active:scale-98"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}