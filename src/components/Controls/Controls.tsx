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

      <div className={styles.group}>
        <label className={styles.label}>Schedule From (GW)</label>
        <span className={styles.sublabel}>First gameweek to analyse</span>
        <input
          type="number"
          className={styles.input}
          min={1}
          max={scheduleEnd}
          value={scheduleStart}
          onChange={(e) =>
            onScheduleStartChange(
              Math.min(scheduleEnd, Math.max(1, parseInt(e.target.value) || 1)),
            )
          }
        />
      </div>

      <div className={styles.group}>
        <label className={styles.label}>Schedule To (GW)</label>
        <span className={styles.sublabel}>Last gameweek to analyse</span>
        <input
          type="number"
          className={styles.input}
          min={scheduleStart}
          max={maxGw}
          value={scheduleEnd}
          onChange={(e) =>
            onScheduleEndChange(
              Math.min(maxGw, Math.max(scheduleStart, parseInt(e.target.value) || scheduleStart)),
            )
          }
        />
      </div>
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

      <div className={styles.group}>
        <label className={styles.label}>Start GW (A)</label>
        <span className={styles.sublabel}>First GW of the evaluation period</span>
        <input
          type="number"
          className={styles.input}
          min={1}
          max={gwB}
          value={gwA}
          onChange={(e) =>
            onGwAChange(Math.min(gwB, Math.max(1, parseInt(e.target.value) || 1)))
          }
        />
      </div>

      <div className={styles.group}>
        <label className={styles.label}>End GW (B)</label>
        <span className={styles.sublabel}>Last GW of the evaluation period</span>
        <input
          type="number"
          className={styles.input}
          min={gwA}
          max={maxGw}
          value={gwB}
          onChange={(e) =>
            onGwBChange(Math.min(maxGw, Math.max(gwA, parseInt(e.target.value) || gwA)))
          }
        />
      </div>
    </div>
  );
}
