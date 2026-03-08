import { RangeSlider } from '../RangeSlider/RangeSlider';
import styles from './Controls.module.css';

interface Phase1ControlsProps {
  formWindow: number;
  scheduleStart: number;
  scheduleEnd: number;
  maxGw: number;
  onFormWindowChange: (v: number) => void;
  onScheduleStartChange: (v: number) => void;
  onScheduleEndChange: (v: number) => void;
}

export function Phase1Controls({
  formWindow,
  scheduleStart,
  scheduleEnd,
  maxGw,
  onFormWindowChange,
  onScheduleStartChange,
  onScheduleEndChange,
}: Phase1ControlsProps) {
  return (
    <div className={styles.panel}>
      <div className={styles.group}>
        <label className={styles.label}>Form Window (X)</label>
        <span className={styles.sublabel}>Games used to judge opponent form</span>
        <input
          type="number"
          className={styles.input}
          min={1}
          max={maxGw}
          value={formWindow}
          onChange={(e) => onFormWindowChange(Math.max(1, parseInt(e.target.value) || 1))}
        />
      </div>

      <div className={styles.divider} />

      <RangeSlider
        min={1}
        max={maxGw}
        valueA={scheduleStart}
        valueB={scheduleEnd}
        label="Schedule Range"
        onChangeA={(v) => onScheduleStartChange(Math.max(1, Math.min(scheduleEnd, v)))}
        onChangeB={(v) => onScheduleEndChange(Math.max(scheduleStart, Math.min(maxGw, v)))}
      />
    </div>
  );
}

interface Phase2ControlsProps {
  formWindow: number;
  gwA: number;
  gwB: number;
  maxGw: number;
  onFormWindowChange: (v: number) => void;
  onGwAChange: (v: number) => void;
  onGwBChange: (v: number) => void;
}

export function Phase2Controls({
  formWindow,
  gwA,
  gwB,
  maxGw,
  onFormWindowChange,
  onGwAChange,
  onGwBChange,
}: Phase2ControlsProps) {
  return (
    <div className={styles.panel}>
      <div className={styles.group}>
        <label className={styles.label}>Form Window (X)</label>
        <span className={styles.sublabel}>Games used for sliding form window</span>
        <input
          type="number"
          className={styles.input}
          min={1}
          max={maxGw}
          value={formWindow}
          onChange={(e) => onFormWindowChange(Math.max(1, parseInt(e.target.value) || 1))}
        />
      </div>

      <div className={styles.divider} />

      <RangeSlider
        min={1}
        max={maxGw}
        valueA={gwA}
        valueB={gwB}
        label="Evaluation Range"
        onChangeA={(v) => onGwAChange(Math.min(gwB, Math.max(1, v)))}
        onChangeB={(v) => onGwBChange(Math.min(maxGw, Math.max(gwA, v)))}
      />
    </div>
  );
}
