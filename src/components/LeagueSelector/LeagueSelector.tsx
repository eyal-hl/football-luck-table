import type { LeagueId } from '../../types';
import styles from './LeagueSelector.module.css';

interface LeagueOption {
  id: LeagueId;
  name: string;
  flag: string;
}

const LEAGUES: LeagueOption[] = [
  { id: 'premier-league', name: 'Premier League', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { id: 'la-liga', name: 'La Liga', flag: '🇪🇸' },
  { id: 'serie-a', name: 'Serie A', flag: '🇮🇹' },
  { id: 'bundesliga', name: 'Bundesliga', flag: '🇩🇪' },
  { id: 'ligat-haal', name: "Ligat Ha'al", flag: '🇮🇱' },
];

interface Props {
  selected: LeagueId;
  onChange: (id: LeagueId) => void;
}

export function LeagueSelector({ selected, onChange }: Props) {
  return (
    <div className={styles.wrapper} role="group" aria-label="Select league">
      {LEAGUES.map((league) => (
        <button
          key={league.id}
          className={`${styles.btn} ${selected === league.id ? styles.active : ''}`}
          onClick={() => onChange(league.id)}
          aria-pressed={selected === league.id}
        >
          <span className={styles.flag}>{league.flag}</span>
          {league.name}
        </button>
      ))}
    </div>
  );
}
