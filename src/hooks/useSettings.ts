import { useCallback, useState } from 'react';

export type Settings = {
  baseUrl: string;
  darkMode: boolean;
};

const SETTINGS_KEY = 'reddpwa_settings';
const DEFAULT_SETTINGS: Settings = {
  baseUrl: '/proxy/https://old.reddit.com',
  darkMode: false
};

const readStoredSettings = (): Settings => {
  if (typeof window === 'undefined') {
    return DEFAULT_SETTINGS;
  }

  const stored = window.localStorage.getItem(SETTINGS_KEY);

  if (!stored) {
    return DEFAULT_SETTINGS;
  }

  try {
    const parsed = JSON.parse(stored) as Partial<Settings>;

    return {
      baseUrl: typeof parsed.baseUrl === 'string' ? parsed.baseUrl : DEFAULT_SETTINGS.baseUrl,
      darkMode: typeof parsed.darkMode === 'boolean' ? parsed.darkMode : DEFAULT_SETTINGS.darkMode
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

export const useSettings = (): [Settings, (updates: Partial<Settings>) => void] => {
  const [settings, setSettings] = useState<Settings>(readStoredSettings);

  const updateSettings = useCallback((updates: Partial<Settings>) => {
    setSettings((previous) => {
      const nextSettings = { ...previous, ...updates };
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(nextSettings));

      return nextSettings;
    });
  }, []);

  return [settings, updateSettings];
};
