import styles from './RangeSlider.module.css';

interface Props {
  min: number;
  max: number;
  valueA: number; // lower handle
  valueB: number; // upper handle
  label: string;
  onChangeA: (v: number) => void;
  onChangeB: (v: number) => void;
}

export function RangeSlider({ min, max, valueA, valueB, label, onChangeA, onChangeB }: Props) {
  const range = max - min || 1;
  const pA = ((valueA - min) / range) * 100;
  const pB = ((valueB - min) / range) * 100;

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <span className={styles.label}>{label}</span>
        <span className={styles.values}>
          GW {valueA} – GW {valueB}
        </span>
      </div>
      <div
        className={styles.track}
        style={{
          background: `linear-gradient(to right, var(--surface-3) ${pA}%, var(--accent) ${pA}%, var(--accent) ${pB}%, var(--surface-3) ${pB}%)`,
        }}
      >
        <input
          type="range"
          className={`${styles.range} ${styles.rangeA} ${valueA >= valueB ? styles.topZ : ''}`}
          min={min}
          max={max}
          value={valueA}
          onChange={(e) =>
            onChangeA(Math.min(valueB, Math.max(min, parseInt(e.target.value))))
          }
        />
        <input
          type="range"
          className={`${styles.range} ${styles.rangeB}`}
          min={min}
          max={max}
          value={valueB}
          onChange={(e) =>
            onChangeB(Math.max(valueA, Math.min(max, parseInt(e.target.value))))
          }
        />
      </div>
    </div>
  );
}
