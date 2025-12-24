import { useEffect, useState } from 'react';

export function useTheme() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    // Check localStorage and system preference synchronously on init
    if (typeof window === 'undefined') return true; // Default to dark on server if SSR (though Vite is client-side mostly)
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return savedTheme ? savedTheme === 'dark' : prefersDark;
  });

  // Apply theme class when isDark changes
  useEffect(() => {
    const html = document.documentElement;
    if (isDark) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark(prev => !prev);
  };

  return { isDark, toggleTheme };
}
