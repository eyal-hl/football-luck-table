import type { Theme } from '../../types';
import styles from './ThemeToggle.module.css';

interface Props {
  theme: Theme;
  onToggle: () => void;
}

export function ThemeToggle({ theme, onToggle }: Props) {
  return (
    <button className={styles.toggle} onClick={onToggle} aria-label="Toggle theme">
      <span className={styles.icon}>{theme === 'dark' ? '☀️' : '🌙'}</span>
      {theme === 'dark' ? 'Light mode' : 'Dark mode'}
    </button>
  );
}
