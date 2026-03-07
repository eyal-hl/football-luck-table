import { useState, useRef, useEffect } from 'react';
import styles from './Accordion.module.css';

interface Props {
  title: string;
  meta?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function Accordion({ title, meta, defaultOpen = true, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Animate max-height
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    if (open) {
      el.style.maxHeight = el.scrollHeight + 'px';
    } else {
      el.style.maxHeight = '0px';
    }
  }, [open]);

  // Re-measure when children change (e.g. table data updates)
  useEffect(() => {
    const el = bodyRef.current;
    if (!el || !open) return;
    el.style.maxHeight = el.scrollHeight + 'px';
  });

  return (
    <div className={styles.accordion}>
      <button
        className={styles.header}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <div className={styles.headerLeft}>
          <span className={styles.title}>{title}</span>
          {meta && <span className={styles.meta}>{meta}</span>}
        </div>
        <span className={`${styles.chevron} ${open ? styles.open : ''}`}>▼</span>
      </button>
      <div ref={bodyRef} className={styles.body} style={{ maxHeight: open ? undefined : '0px' }}>
        {children}
      </div>
    </div>
  );
}
