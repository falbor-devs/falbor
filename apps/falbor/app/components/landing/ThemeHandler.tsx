"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";
import { kTheme, DEFAULT_THEME, Theme } from "~/lib/stores/theme";

export function ThemeHandler({ force }: { force?: "light" | "dark" }) {
    const { setTheme } = useTheme();

    useEffect(() => {
        if (force) {
            setTheme(force);
            
            
            document.documentElement.setAttribute('data-theme', force);
            document.documentElement.classList.add(force);

            
            if (force === 'dark') {
                document.documentElement.classList.remove('light');
                document.documentElement.style.colorScheme = 'dark';
            }
        }
        
        return () => {
            
            const persistedTheme = localStorage.getItem(kTheme) as Theme | undefined;
            const theme = persistedTheme ?? DEFAULT_THEME;
            let actualTheme = theme;
            if (theme === 'system') {
                actualTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            }
            setTheme(actualTheme);
            document.documentElement.setAttribute('data-theme', actualTheme);
            document.documentElement.classList.remove(actualTheme === 'dark' ? 'light' : 'dark');
            document.documentElement.classList.add(actualTheme);
            document.documentElement.style.colorScheme = actualTheme;
        };
    }, [force, setTheme]);

    return null;
}
