import { DataManagement } from './DataManagement';
import { useState, useEffect } from 'react';
import { dbService } from '../lib/db';

interface SettingsProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  showTitle: boolean;
  onToggleShowTitle: () => void;
  showOnThisDay?: boolean;
  onToggleShowOnThisDay?: () => void;
  onBack: () => void;
}

export function Settings({ theme, onToggleTheme, showTitle, onToggleShowTitle, showOnThisDay, onToggleShowOnThisDay, onBack }: SettingsProps) {

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 page-transition-enter pb-6">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* 頂部標題列 */}
        <div className="flex items-center gap-4 mb-6 stagger-item" style={{ animationDelay: '0s' }}>
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full smooth-spring hover:translate-x-[-4px]"
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
        <div className="stagger-item card-hover bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 mb-6" style={{ animationDelay: '0.05s' }}>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
            外觀
          </h2>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{theme === 'dark' ? '🌙' : '☀️'}</span>
              <div>
                <div className="font-medium text-gray-900 dark:text-white">深色模式</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">切換淺色/深色主題</div>
              </div>
            </div>
            <button
              onClick={onToggleTheme}
              className={`relative inline-flex h-8 w-14 items-center rounded-full smooth-spring ${
                theme === 'dark' ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-sm spring-bounce ${
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

        {/* 標題設定 */}
        <div className="stagger-item card-hover bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 mb-6" style={{ animationDelay: '0.1s' }}>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
            標題欄位
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900 dark:text-white">標題欄位</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">編輯器顯示標題輸入框</div>
            </div>
            <button
              onClick={onToggleShowTitle}
              className={`relative inline-flex h-8 w-14 items-center rounded-full smooth-spring ${
                showTitle ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-sm spring-bounce ${
                  showTitle ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* 當年今日設定 */}
        <div className="stagger-item card-hover bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 mb-6" style={{ animationDelay: '0.15s' }}>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            當年今日
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900 dark:text-white">當年今日</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">顯示去年的今天的日記回顧</div>
            </div>
            <button
              onClick={onToggleShowOnThisDay}
              className={`relative inline-flex h-8 w-14 items-center rounded-full smooth-spring ${
                showOnThisDay ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-sm spring-bounce ${
                  showOnThisDay ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* 數據管理 */}
        <div className="stagger-item" style={{ animationDelay: '0.15s' }}>
          <DataManagement />
        </div>

        {/* 版本資訊 */}
        <div className="stagger-item mt-8 text-center" style={{ animationDelay: '0.2s' }}>
          <p className="text-sm text-gray-400 dark:text-gray-600 font-medium">
            Diary App v1.0.0 (Build 2026.01)
          </p>
          <p className="text-xs text-gray-300 dark:text-gray-700 mt-1">
            Designed with Vibe
          </p>
        </div>
      </div>
    </div>
  );
}
