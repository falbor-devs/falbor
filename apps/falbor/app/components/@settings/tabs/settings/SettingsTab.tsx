'use client';
import React, { useState, useEffect, useCallback, memo } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { classNames } from '~/utils/classNames';
import { Switch } from '~/components/ui/Switch';
import { useTranslation } from '~/lib/i18n/useTranslation';
import { setLanguage as setGlobalLanguage } from '~/lib/stores/language';
import { setTheme, type Theme } from '~/lib/stores/theme';

interface GeneralSettings {
  theme: Theme;
  language: string;
  notifications: boolean;
  writeCodeInLive: boolean;
  displayTokenUsage: boolean;
}

export default function SettingsTab() {
  const { t, currentLanguage } = useTranslation();
  
  const [settings, setSettings] = useState<GeneralSettings>({
    theme: 'system',
    language: 'en',
    notifications: true,
    writeCodeInLive: false,
    displayTokenUsage: false,
  });

  const [isLoading, setIsLoading] = useState(true);

  
  useEffect(() => {
    async function loadSettings() {
      try {
        
        const savedProfile = localStorage.getItem('falbor_user_profile');
        const legacyProfile = savedProfile ? JSON.parse(savedProfile) : {};

        
        const res = await fetch('/api/sync');
        if (res.ok) {
          const data = await res.json();
          const isLiveCode = data.falbor_write_code_in_live === true || data.falbor_write_code_in_live === 'true';
          setSettings({
            theme: data.falbor_theme || 'system',
            language: legacyProfile.language || 'en',
            notifications: legacyProfile.notifications ?? true,
            writeCodeInLive: isLiveCode,
            displayTokenUsage: data.falbor_display_token_usage === true || data.falbor_display_token_usage === 'true',
          });
          localStorage.setItem('falbor_write_code_in_live', JSON.stringify(isLiveCode));
        }
      } catch (e) {
        console.error('Failed to load settings', e);
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, []);

  const saveToServer = async (key: string, value: any) => {
    try {
      await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });
    } catch (e) {
      console.error('Failed to sync setting:', key);
    }
  };

  const handleToggleTokenUsage = (checked: boolean) => {
    setSettings(prev => ({ ...prev, displayTokenUsage: checked }));
    saveToServer('falbor_display_token_usage', checked);
    toast[checked ? 'success' : 'info'](`Token usage display ${checked ? 'enabled' : 'disabled'}`);
  };

  const handleToggleWriteCodeInLive = (checked: boolean) => {
    setSettings(prev => ({ ...prev, writeCodeInLive: checked }));
    saveToServer('falbor_write_code_in_live', checked);
    localStorage.setItem('falbor_write_code_in_live', JSON.stringify(checked));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('falbor_write_code_in_live_changed', { detail: checked }));
    }
    toast[checked ? 'success' : 'info'](`Live code writing ${checked ? 'enabled' : 'disabled'}`);
  };

  const handleChangeTheme = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as Theme;
    setSettings(prev => ({ ...prev, theme: val }));
    saveToServer('falbor_theme', val);
    setTheme(val);
    toast.success('Theme updated');
  };

  const handleToggleNotifications = (checked: boolean) => {
    setSettings(prev => ({ ...prev, notifications: checked }));
    const existingProfile = JSON.parse(localStorage.getItem('falbor_user_profile') || '{}');
    const updatedProfile = { ...existingProfile, notifications: checked };
    localStorage.setItem('falbor_user_profile', JSON.stringify(updatedProfile));
    toast.success(`Notifications ${checked ? 'enabled' : 'disabled'}`);
  };

  const handleChangeLanguage = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value;
    setSettings(prev => ({ ...prev, language: newLang }));
    setGlobalLanguage(newLang);
    const existingProfile = JSON.parse(localStorage.getItem('falbor_user_profile') || '{}');
    const updatedProfile = { ...existingProfile, language: newLang };
    localStorage.setItem('falbor_user_profile', JSON.stringify(updatedProfile));
  };

  if (isLoading) {
    return <div className="p-8 text-center text-sm text-falbor-elements-textSecondary">Loading settings...</div>;
  }

  return (
    <div className="flex flex-col gap-10 w-full max-w-4xl mx-auto p-4 md:p-6 text-falbor-elements-textPrimary">
      {}
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
            <div className="i-ph:sliders text-purple-500" />
            General Settings
          </h2>
          <p className="text-sm text-falbor-elements-textSecondary">
            Manage your interface preferences and default settings.
          </p>
        </div>

        {}
        <motion.div
          layout
          className={classNames(
            'border border-falbor-elements-borderColor rounded-xl overflow-hidden',
            'bg-falbor-elements-background-depth-1'
          )}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {}
          <div className="p-5 flex items-start justify-between gap-6 border-b border-falbor-elements-borderColor">
            <div className="flex flex-col gap-1.5 flex-1">
              <div className="flex items-center gap-2">
                <div className="i-ph:code text-xl text-purple-500" />
                <h3 className="font-medium text-[15px]">Write Code in Live</h3>
              </div>
              <p className="text-sm text-falbor-elements-textSecondary leading-relaxed">
                Automatically write code in live mode in the workbench.
              </p>
            </div>
            <div className="pt-1 shrink-0">
              <Switch
                checked={settings.writeCodeInLive}
                onCheckedChange={handleToggleWriteCodeInLive}
              />
            </div>
          </div>

          {}
          <div className="p-5 flex items-start justify-between gap-6 border-b border-falbor-elements-borderColor">
            <div className="flex flex-col gap-1.5 flex-1">
              <div className="flex items-center gap-2">
                <div className="i-ph:moon text-xl text-purple-500" />
                <h3 className="font-medium text-[15px]">Theme</h3>
              </div>
              <p className="text-sm text-falbor-elements-textSecondary leading-relaxed">
                Choose light mode, dark mode, or follow system settings.
              </p>
            </div>
            <div className="pt-1 shrink-0">
              <select
                value={settings.theme}
                onChange={handleChangeTheme}
                className={classNames(
                  'p-2 rounded-lg text-sm min-w-[150px]',
                  'bg-falbor-elements-background-depth-3 border border-falbor-elements-borderColor',
                  'text-falbor-elements-textPrimary',
                  'focus:outline-none focus:ring-2 focus:ring-purple-500/30',
                  'transition-all duration-200'
                )}
              >
                <option value="system">System</option>
                <option value="light">Light Mode</option>
                <option value="dark">Dark Mode</option>
              </select>
            </div>
          </div>

          {}
          <div className="p-5 flex items-start justify-between gap-6 border-b border-falbor-elements-borderColor">
            <div className="flex flex-col gap-1.5 flex-1">
              <div className="flex items-center gap-2">
                <div className="i-ph:coin text-xl text-purple-500" />
                <h3 className="font-medium text-[15px]">Display Token Usage</h3>
              </div>
              <p className="text-sm text-falbor-elements-textSecondary leading-relaxed">
                Show your remaining balance and token usage at the bottom of the chat window.
              </p>
            </div>
            <div className="pt-1 shrink-0">
              <Switch
                checked={settings.displayTokenUsage}
                onCheckedChange={handleToggleTokenUsage}
              />
            </div>
          </div>

          {}
          <div className="p-5 flex items-start justify-between gap-6 border-b border-falbor-elements-borderColor">
            <div className="flex flex-col gap-1.5 flex-1">
              <div className="flex items-center gap-2">
                <div className="i-ph:translate-fill text-xl text-purple-500" />
                <h3 className="font-medium text-[15px]">{t('language')}</h3>
              </div>
            </div>
            <div className="pt-1 shrink-0">
              <select
                value={settings.language}
                onChange={handleChangeLanguage}
                className={classNames(
                  'p-2 rounded-lg text-sm min-w-[150px]',
                  'bg-falbor-elements-background-depth-3 border border-falbor-elements-borderColor',
                  'text-falbor-elements-textPrimary',
                  'focus:outline-none focus:ring-2 focus:ring-purple-500/30',
                  'transition-all duration-200'
                )}
              >
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
                <option value="it">Italiano</option>
                <option value="pt">Português</option>
                <option value="ru">Русский</option>
                <option value="zh">中文</option>
                <option value="ja">日本語</option>
                <option value="ko">한국어</option>
              </select>
            </div>
          </div>

          {}
          <div className="p-5 flex items-start justify-between gap-6">
            <div className="flex flex-col gap-1.5 flex-1">
              <div className="flex items-center gap-2">
                <div className="i-ph:bell-fill text-xl text-purple-500" />
                <h3 className="font-medium text-[15px]">{t('notifications')}</h3>
              </div>
              <p className="text-sm text-falbor-elements-textSecondary leading-relaxed">
                {settings.notifications ? t('notifications_enabled') : t('notifications_disabled')}
              </p>
            </div>
            <div className="pt-1 shrink-0">
              <Switch
                checked={settings.notifications}
                onCheckedChange={handleToggleNotifications}
              />
            </div>
          </div>

        </motion.div>
      </div>
    </div>
  );
}
