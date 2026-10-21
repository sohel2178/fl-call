'use client';
import { useState } from 'react';

// One lamp vocabulary for the whole app: every outcome maps to a lamp kind.
const KIND = {
  answered: 'ok',
  'no-answer': 'rang', busy: 'rang', rejected: 'rang',
  unreachable: 'down', invalid: 'down',
  congestion: 'unk', failed: 'unk',
};

export const KINDS = [
  { kind: 'ok', label: 'Answered' },
  { kind: 'rang', label: 'Rang, not answered' },
  { kind: 'down', label: 'Unreachable or invalid' },
  { kind: 'unk', label: 'Inconclusive' },
];

const OUTCOME_LABEL = {
  answered: 'Answered', 'no-answer': 'No answer', busy: 'Busy', rejected: 'Rejected',
  unreachable: 'Unreachable', invalid: 'Invalid number', congestion: 'Congestion', failed: 'Failed',
};

/** Lamp kind for a call record: outcome colour, or dialing / queued. */
export function recordKind(r) {
  if (r.outcome) return KIND[r.outcome] || 'unk';
  if (r.status === 'dialing') return 'dialing';
  return 'queued';
}

export function outcomeLabel(r) {
  if (r.outcome) return OUTCOME_LABEL[r.outcome] || r.outcome;
  return r.status === 'dialing' ? 'Dialing' : 'Waiting';
}

export function Outcome({ record }) {
  return (
    <span className="outcome">
      <span className={`lamp ${recordKind(record)}`} aria-hidden="true" />
      {outcomeLabel(record)}
    </span>
  );
}

// Fewer numbers → bigger lamps, so a 20-number check still reads as a panel.
const lampSize = (n) => (n <= 40 ? 28 : n <= 120 ? 22 : n <= 500 ? 16 : 12);

/** Full board: one focusable lamp per number. */
export function LampBoard({ records, onPick }) {
  const [tip, setTip] = useState('');
  const say = (r) => setTip(`${r.number}: ${outcomeLabel(r)}${r.detail ? ` (${r.detail})` : ''}`);
  return (
    <div>
      <div className="board" role="list" aria-label="Numbers in this campaign" style={{ '--lamp': `${lampSize(records.length)}px` }}>
        {records.map((r) => (
          <button
            key={r.id}
            type="button"
            role="listitem"
            className={`lamp ${recordKind(r)}`}
            aria-label={`${r.number}: ${outcomeLabel(r)}`}
            onMouseEnter={() => say(r)}
            onFocus={() => say(r)}
            onClick={() => onPick?.(r)}
          />
        ))}
      </div>
      <p className="board-tip num" aria-live="polite">{tip || 'Point at a lamp to see its number.'}</p>
    </div>
  );
}

/** Mini strip for campaign lists, drawn from outcome counts (no per-record data). */
export function LampStrip({ meta = {}, done = 0, total = 0, status }) {
  const width = Math.min(60, Math.max(total, 1));
  const counts = { ok: 0, rang: 0, down: 0, unk: 0 };
  for (const [outcome, n] of Object.entries(meta)) {
    if (KIND[outcome] && typeof n === 'number') counts[KIND[outcome]] += n;
  }
  const scale = total ? width / total : 0;
  const lamps = [];
  for (const k of ['ok', 'rang', 'down', 'unk']) {
    for (let i = 0; i < Math.round(counts[k] * scale); i++) lamps.push(k);
  }
  const finished = Math.round(done * scale);
  while (lamps.length < finished) lamps.push('unk');
  lamps.length = Math.min(lamps.length, width);
  if (status === 'running' && lamps.length < width) lamps.push('dialing');
  while (lamps.length < width) lamps.push('queued');
  return (
    <div className="strip" aria-hidden="true">
      {lamps.map((k, i) => <span key={i} className={`lamp ${k}`} />)}
    </div>
  );
}
