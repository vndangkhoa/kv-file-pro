import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Palette,
  FolderTree,
  HardDrive,
  Info,
  Blocks,
  Maximize2,
  Minimize2,
  Crown,
} from 'lucide-react';
import { useSettingsStore, SettingsTab } from '../../stores/useSettingsStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { useExtensionStore } from '../../stores/useExtensionStore';
import { AccountTab } from './settings/AccountTab';
import { AppearanceTab } from './settings/AppearanceTab';
import { ExplorerTab } from './settings/ExplorerTab';
import { StorageTab } from './settings/StorageTab';
import { ExtensionsTab } from './settings/ExtensionsTab';
import { AboutTab } from './settings/AboutTab';

import { LucideIcon } from 'lucide-react';

interface NavItem {
  id: SettingsTab;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'account', label: 'Account', icon: User },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'explorer', label: 'Explorer', icon: FolderTree },
  { id: 'storage', label: 'Storage', icon: HardDrive },
  { id: 'extensions', label: 'Extensions', icon: Blocks },
  { id: 'about', label: 'About', icon: Info },
];

export const SettingsModal: React.FC = () => {
  const { isOpen, closeSettings, activeTab, setActiveTab } = useSettingsStore();
  const { user } = useAuthStore();
  const { isProLicensed } = useExtensionStore();
  const [isFullscreen, setIsFullscreen] = useState(true);

  // Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeSettings();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeSettings]);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 select-none animate-in fade-in duration-150 ${
        isFullscreen
          ? 'p-0 flex flex-col bg-white dark:bg-[#1e1e24]'
          : 'flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-6'
      }`}
      onClick={isFullscreen ? undefined : closeSettings}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-white dark:bg-[#1e1e24] flex flex-col overflow-hidden transition-all duration-200 ${
          isFullscreen
            ? 'w-full h-full rounded-none border-0'
            : 'w-full max-w-5xl h-[720px] max-h-[92vh] rounded-2xl shadow-2xl border border-gray-200 dark:border-[#33333d] animate-in zoom-in-95 duration-150'
        }`}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3 border-b border-gray-200 dark:border-[#2f2f38] shrink-0 bg-gray-50/80 dark:bg-[#19191e]">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-xl bg-blue-600 text-white shadow-xs">
              <Blocks size={16} />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight text-gray-900 dark:text-gray-100">
                Preferences & Settings
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs">
                PRO
              </span>
              {activeTab === 'extensions' && (
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 font-semibold text-[10px]">
                  Studio & Viewers
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? 'Restore Window (Downsize)' : 'Maximize (Full Screen)'}
              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-200/60 dark:hover:bg-[#2d2d35] transition-colors"
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <button
              onClick={closeSettings}
              title="Close (Esc)"
              className="p-1.5 rounded-lg text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Master-Detail Layout */}
        <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">
          {/* Left Tabs Sidebar */}
          <aside className="w-full sm:w-60 bg-gray-50/70 dark:bg-[#18181c] border-b sm:border-b-0 sm:border-r border-gray-200 dark:border-[#2f2f38] p-2.5 sm:p-4 flex sm:flex-col justify-between shrink-0 overflow-x-auto sm:overflow-x-visible">
            <div className="flex sm:flex-col gap-1 w-full">
              <div className="hidden sm:block text-[10px] font-bold uppercase tracking-wider text-gray-400 px-3 py-1">
                Workspace
              </div>
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap text-left ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-xs font-semibold'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-[#26262c]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon
                        size={16}
                        className={isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400'}
                      />
                      <span>{item.label}</span>
                    </div>
                    {item.id === 'extensions' && (
                      <span
                        className={`hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : isProLicensed
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                            : 'bg-gray-200 dark:bg-[#2d2d35] text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {isProLicensed ? 'PRO' : 'Store'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* User Profile & License Badge Card in Sidebar */}
            <div className="hidden sm:block pt-4 mt-auto border-t border-gray-200 dark:border-[#282830]">
              <div className="p-3 rounded-2xl bg-white dark:bg-[#16161c] border border-gray-200/80 dark:border-[#282832] shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs shrink-0">
                    {user?.username ? user.username.slice(0, 2) : 'KV'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-xs text-gray-900 dark:text-gray-100 truncate">
                      {user?.username || 'Administrator'}
                    </p>
                    <p className="text-[10px] text-gray-400 capitalize">
                      {user?.role || 'Admin'}
                    </p>
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-gray-100 dark:border-[#24242e] flex items-center justify-between">
                  {isProLicensed ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 font-mono">
                      <Crown size={11} className="text-amber-500" />
                      PRO LIFETIME
                    </span>
                  ) : (
                    <span className="text-[10px] text-gray-400 font-mono">
                      Community Edition
                    </span>
                  )}
                  <span className="text-[10px] font-mono text-gray-400">v2.0</span>
                </div>
              </div>
            </div>
          </aside>

          {/* Right Tab Content View */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-8 bg-white dark:bg-[#1e1e24]">
            {activeTab === 'account' && <AccountTab />}
            {activeTab === 'appearance' && <AppearanceTab />}
            {activeTab === 'explorer' && <ExplorerTab />}
            {activeTab === 'storage' && <StorageTab />}
            {activeTab === 'extensions' && <ExtensionsTab />}
            {activeTab === 'about' && <AboutTab />}
          </main>
        </div>
      </div>
    </div>
  );
};
