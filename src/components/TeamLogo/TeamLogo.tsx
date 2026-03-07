import { useState } from 'react';
import styles from './TeamLogo.module.css';

interface Props {
  name: string;
  logoUrl: string;
  size?: number;
}

export function TeamLogo({ name, logoUrl, size = 24 }: Props) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        className={styles.fallback}
        style={{ width: size, height: size, fontSize: size * 0.45 }}
        aria-label={name}
      >
        {name.slice(0, 2).toUpperCase()}
      </span>
    );
  }

  return (
    <img
      src={logoUrl}
      alt={name}
      width={size}
      height={size}
      className={styles.logo}
      onError={() => setFailed(true)}
      loading="lazy"
    />
  );
}
