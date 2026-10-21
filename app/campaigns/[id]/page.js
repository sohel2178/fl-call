'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Shell from '../../../components/Shell';
import { LampBoard, Outcome, KINDS, recordKind } from '../../../components/LampBoard';
import { getCampaign, getRecords, downloadResults, cancelCampaign, deleteCampaign } from '../../../lib/api';

const TYPE_LABEL = {
  'service-charge': 'Service charge reminder',
  unassigned: 'Unassigned customers reminder',
  'number-check': 'SIM reachability check',
};

const yesNo = (v) => (v == null ? '–' : v ? 'Yes' : 'No');

export default function CampaignPage({ params }) {
  const { id } = params;
  const router = useRouter();
  const [c, setC] = useState(null);
  const [records, setRecords] = useState([]);
  const [err, setErr] = useState('');
  const [filter, setFilter] = useState('all');
  const [flash, setFlash] = useState(null);

  async function refresh() {
    try {
      setC(await getCampaign(id));
      setRecords(await getRecords(id));
    } catch (e) { setErr(e.message); }
  }

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 2000);
    return () => clearInterval(t);
  }, [id]);

  const counts = useMemo(() => {
    const n = { ok: 0, rang: 0, down: 0, unk: 0, waiting: 0 };
    for (const r of records) {
      const k = recordKind(r);
      n[k in n ? k : 'waiting'] += 1;
    }
    return n;
  }, [records]);

  const shown = filter === 'all' ? records
    : records.filter((r) => (filter === 'waiting' ? !r.outcome : recordKind(r) === filter));

  function pick(r) {
    setFilter('all');
    setFlash(r.id);
    requestAnimationFrame(() => document.getElementById(`rec-${r.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    setTimeout(() => setFlash(null), 1600);
  }

  async function stop() {
    if (window.confirm('Stop this campaign? Numbers not dialed yet will be skipped.')) {
      try { await cancelCampaign(id); refresh(); } catch (e) { setErr(e.message); }
    }
  }

  async function remove() {
    const msg = c?.status === 'running'
      ? 'This campaign is still calling. Stop it and delete it with all its results?'
      : 'Delete this campaign and all its results? This can’t be undone.';
    if (!window.confirm(msg)) return;
    try {
      await deleteCampaign(id);
      router.replace('/');
    } catch (e) { setErr(e.message); }
  }

  if (err && !c) {
    return (
      <Shell title="Campaign not found">
        <p className="err">{err}</p>
        <p style={{ marginTop: 12 }}><Link href="/">Back to campaigns</Link></p>
      </Shell>
    );
  }
  if (!c) return <Shell title="Loading…" />;

  const isCheck = c.type === 'number-check';
  const running = c.status === 'running' || c.status === 'pending';
  const meta = c.meta || {};
  const state = running
    ? (meta.retrying ? `redialing inconclusive numbers (pass ${meta.retrying})` : 'calling now')
    : { completed: 'done', cancelled: 'stopped', failed: 'failed' }[c.status] || c.status;

  return (
    <Shell
      title={c.name}
      lede={`${TYPE_LABEL[c.type] || c.type}, ${state}. ${c.done} of ${c.total} numbers dialed.`}
      actions={(
        <>
          <button className="btn" onClick={() => downloadResults(id, c.type).catch((e) => setErr(e.message))}
            disabled={c.done === 0}>Download results</button>
          {running && <button className="btn" onClick={stop}>Stop campaign</button>}
          <button className="btn danger" onClick={remove}>Delete campaign</button>
        </>
      )}
    >
      {err && <p className="err" style={{ marginBottom: 12 }}>{err}</p>}
      {meta.warnings?.length > 0 && <p className="notice" style={{ marginBottom: 12 }}>{meta.warnings.slice(0, 4).join(' ')}</p>}

      <div className="stack">
      <section className="sheet board-layout" aria-label="Call results">
        <LampBoard records={records} onPick={pick} />
        <div className="legend">
          {KINDS.map(({ kind, label }) => (
            <div className="legend-row" key={kind}>
              <span className={`lamp ${kind}`} aria-hidden="true" />
              <span>{label}</span>
              <span className="num">{counts[kind]}</span>
            </div>
          ))}
          {counts.waiting > 0 && (
            <div className="legend-row">
              <span className="lamp queued" aria-hidden="true" />
              <span>Waiting or dialing</span>
              <span className="num">{counts.waiting}</span>
            </div>
          )}
        </div>
      </section>

      <section className="sheet" aria-labelledby="numbers">
        <div className="sheet-head">
          <h2 id="numbers">Numbers</h2>
          <div className="chips" role="group" aria-label="Show">
            <button className="chip" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
              All <span className="num">{records.length}</span>
            </button>
            {KINDS.filter(({ kind }) => counts[kind] > 0).map(({ kind, label }) => (
              <button key={kind} className="chip" aria-pressed={filter === kind} onClick={() => setFilter(kind)}>
                <span className={`lamp ${kind}`} aria-hidden="true" /> {label} <span className="num">{counts[kind]}</span>
              </button>
            ))}
            {counts.waiting > 0 && (
              <button className="chip" aria-pressed={filter === 'waiting'} onClick={() => setFilter('waiting')}>
                Waiting <span className="num">{counts.waiting}</span>
              </button>
            )}
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              {isCheck ? (
                <tr><th>Number</th><th>Result</th><th>Reachable</th><th className="right">Cause</th><th>Detail</th><th className="right">Tries</th></tr>
              ) : (
                <tr><th>Number</th><th className="right">Vehicles</th><th className="right">Due</th><th>Result</th><th>Message played</th><th className="right">Tries</th></tr>
              )}
            </thead>
            <tbody>
              {shown.length === 0 && <tr><td colSpan={6} className="empty">No numbers in this group.</td></tr>}
              {shown.map((r) => (
                <tr key={r.id} id={`rec-${r.id}`} className={flash === r.id ? 'flash' : undefined}>
                  <td className="num">{r.number}</td>
                  {isCheck ? (
                    <>
                      <td><Outcome record={r} /></td>
                      <td>{yesNo(r.reachable)}</td>
                      <td className="right num">{r.hangup_cause ?? '–'}</td>
                      <td className="quiet small">{r.detail || '–'}</td>
                    </>
                  ) : (
                    <>
                      <td className="right num">{r.vehicles ?? '–'}</td>
                      <td className="right num">{r.due_charge ?? '–'}</td>
                      <td><Outcome record={r} /></td>
                      <td>{yesNo(r.played)}</td>
                    </>
                  )}
                  <td className="right num">{r.attempts || '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      </div>
    </Shell>
  );
}
