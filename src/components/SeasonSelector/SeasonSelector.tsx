import type { SeasonYear } from '../../types';
import { SEASONS } from '../../types';
import styles from './SeasonSelector.module.css';

interface Props {
  selected: SeasonYear;
  onChange: (year: SeasonYear) => void;
}

export function SeasonSelector({ selected, onChange }: Props) {
  return (
    <div className={styles.wrapper} role="group" aria-label="Select season">
      <span className={styles.label}>Season</span>
      {SEASONS.map((s) => (
        <button
          key={s.year}
          className={`${styles.btn} ${selected === s.year ? styles.active : ''}`}
          onClick={() => onChange(s.year)}
          aria-pressed={selected === s.year}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
