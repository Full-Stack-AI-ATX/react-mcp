'use client';

import * as React     from 'react';
import { Moon, Sun }  from 'lucide-react';

import  Button        from '@Components/ui/button';
import styles         from './styles.module.css';


type Theme = 'light' | 'dark';

function ThemeToggle() {
  const [theme, setTheme] = React.useState<Theme | undefined>(undefined);

  React.useEffect(() => {
    const root = document.documentElement;

    const observer = new MutationObserver(() => {
      const newTheme = root.getAttribute('data-theme') as Theme | null;
      if (newTheme) {
        setTheme(newTheme);
      }
    });

    observer.observe(root, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    // Set initial theme
    const initialTheme = root.getAttribute('data-theme') as Theme | null;
    if (initialTheme) {
      setTheme(initialTheme);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    setTheme(newTheme);
  };

  if (!theme) {
    return (
      <Button variant="outline" size="sm" className={styles.toggleButton} disabled>
        <Sun className={styles.icon} />
      </Button>
    );
  }

  const isDark = theme === 'dark';

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleTheme}
      className={styles.toggleButton}
    >
      <Sun
        className={`${styles.icon} ${
          isDark ? styles.sunIconHidden : styles.sunIconVisible
        }`}
      />
      <Moon
        className={`${styles.icon} ${
          isDark ? styles.moonIconVisible : styles.moonIconHidden
        }`}
      />
      <span className={styles['srOnly']}>Toggle theme</span>
    </Button>
  );
}


export default ThemeToggle;
