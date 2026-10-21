'use client';
import { useEffect, useMemo, useState } from 'react';
import Shell from './Shell';
import * as pbxApi from '../lib/api';

// The two PBXs share one admin UI; each talks to its own API base.
const PBXES = {
  1: {
    base: '/api/pbx',
    title: 'PBX',
    lede: 'Phones for your team in the PortSIP app, and who answers when customers call in.',
  },
  2: {
    base: '/api/pbx2',
    title: 'PBX-2',
    lede: 'A separate PBX on its own phone number, for another department. Not used by campaigns.',
  },
};

/** PBX API helpers bound to one PBX's base path. */
function bindApi(base) {
  const names = ['getPbx', 'createExtension', 'updateExtension', 'deleteExtension',
    'createRingGroup', 'updateRingGroup', 'deleteRingGroup', 'setInbound'];
  return Object.fromEntries(names.map((n) => [n, (...args) => pbxApi[n](base, ...args)]));
}

const STRATEGY = {
  ringall: 'Ring everyone at once',
  sequential: 'Ring one by one, in order',
};

// ── Inbound route: trunk ──▶ destination ───────────────────
function InboundRoute({ data, run, api }) {
  const value = data.inbound.type === 'none' ? 'none' : `${data.inbound.type}:${data.inbound.id}`;
  function change(e) {
    const [type, id] = e.target.value.split(':');
    run(() => api.setInbound(type === 'none' ? { type: 'none' } : { type, id: Number(id) }));
  }
  return (
    <section className="sheet" aria-labelledby="inbound">
      <h2 id="inbound" style={{ marginBottom: 14 }}>Incoming calls</h2>
      <div className="route">
        <div className="route-node">
          <span className="quiet small">Calls to your trunk</span>
          <span className="num">{data.server.trunkNumber || 'SIP trunk'}</span>
        </div>
        <div className={`route-wire${value === 'none' ? ' dead' : ''}`} aria-hidden="true" />
        <label className="field" style={{ minWidth: 240 }}>
          Ring
          <select className="input" value={value} onChange={change}>
            <option value="none">Nobody (reject incoming calls)</option>
            {data.ringGroups.length > 0 && (
              <optgroup label="Ring groups">
                {data.ringGroups.map((g) => <option key={g.id} value={`ringgroup:${g.id}`}>{g.number} {g.name}</option>)}
              </optgroup>
            )}
            {data.extensions.length > 0 && (
              <optgroup label="Extensions">
                {data.extensions.map((x) => <option key={x.id} value={`extension:${x.id}`}>{x.number} {x.name}</option>)}
              </optgroup>
            )}
          </select>
        </label>
      </div>
    </section>
  );
}

// ── Extensions ──────────────────────────────────────────────
function Extensions({ data, run, api }) {
  const [form, setForm] = useState({ number: '', name: '', password: '' });
  const [shown, setShown] = useState({});

  async function add(e) {
    e.preventDefault();
    const body = { number: form.number.trim(), name: form.name };
    if (form.password) body.password = form.password;
    const res = await run(() => api.createExtension(body));
    if (res) {
      setForm({ number: '', name: '', password: '' });
      setShown((s) => ({ ...s, [res.extension.id]: true }));
    }
  }

  function rename(x) {
    const name = window.prompt(`New name for extension ${x.number}`, x.name);
    if (name && name !== x.name) run(() => api.updateExtension(x.id, { name }));
  }

  function newPassword(x) {
    if (window.confirm(`Make a new password for ${x.number}? The PortSIP app on that phone stops working until you enter it.`)) {
      run(() => api.updateExtension(x.id, { regeneratePassword: true }));
      setShown((s) => ({ ...s, [x.id]: true }));
    }
  }

  function remove(x) {
    if (window.confirm(`Delete extension ${x.number} (${x.name})? It's also taken out of its ring groups.`)) {
      run(() => api.deleteExtension(x.id));
    }
  }

  return (
    <section className="sheet" aria-labelledby="extensions">
      <div className="sheet-head">
        <h2 id="extensions">Extensions</h2>
        <span className="quiet small">{data.extensions.filter((x) => x.state === 'online').length} of {data.extensions.length} online</span>
      </div>
      {data.extensions.length === 0 ? (
        <p className="empty">No extensions yet. Add one for each person who answers calls in the PortSIP app.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Extension</th><th>Password</th><th /></tr></thead>
            <tbody>
              {data.extensions.map((x) => {
                const online = x.state === 'online';
                return (
                  <tr key={x.id}>
                    <td>
                      <span className="outcome" title={online ? 'App connected' : 'App not connected'}>
                        <span className={`lamp ${online ? 'ok' : 'queued'}`} aria-hidden="true" />
                        <span className="ext-tag">{x.number}</span> {x.name}
                        <span className="sr-only">{online ? 'online' : 'offline'}</span>
                      </span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span className="secret">{shown[x.id] ? x.password : '••••••••••'}</span>
                      <span className="links" style={{ marginLeft: 10 }}>
                        <button className="btn-link small" onClick={() => setShown((s) => ({ ...s, [x.id]: !s[x.id] }))}>
                          {shown[x.id] ? 'Hide' : 'Show'}
                        </button>
                        <button className="btn-link small" onClick={() => navigator.clipboard?.writeText(x.password)}>Copy</button>
                      </span>
                    </td>
                    <td className="right">
                      <span className="links">
                        <button className="btn-link small" onClick={() => rename(x)}>Rename</button>
                        <button className="btn-link small" onClick={() => newPassword(x)}>New password</button>
                        <button className="btn-link small danger" onClick={() => remove(x)}>Delete</button>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <form className="form-row" style={{ marginTop: 16 }} onSubmit={add}>
        <label className="field" style={{ width: 96 }}>
          Number
          <input className="input" type="text" inputMode="numeric" placeholder="101" required value={form.number}
            onChange={(e) => setForm({ ...form, number: e.target.value })} />
        </label>
        <label className="field grow">
          Name
          <input className="input" type="text" placeholder="Front desk" required value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </label>
        <label className="field grow">
          Password
          <input className="input" type="text" placeholder="Leave empty to generate" value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </label>
        <button className="btn primary">Add extension</button>
      </form>
    </section>
  );
}

// ── Ring groups ─────────────────────────────────────────────
const EMPTY_GROUP = { number: '', name: '', strategy: 'ringall', ring_time: 30, members: [] };

function Members({ group }) {
  if (!group.members.length) return <span className="quiet">No members</span>;
  const sep = group.strategy === 'sequential' ? '→' : '+';
  return (
    <span className="chain">
      {group.members.map((m, i) => (
        <span key={m.extension_id} className="chain">
          {i > 0 && <span className="quiet" aria-hidden="true">{sep}</span>}
          <span className="ext-tag" title={m.name}>{m.number}</span>
        </span>
      ))}
    </span>
  );
}

function RingGroupForm({ extensions, initial, onSave, onCancel }) {
  const [g, setG] = useState(initial);
  const editing = Boolean(initial.id);
  const toggle = (id) => setG((cur) => ({
    ...cur,
    members: cur.members.includes(id) ? cur.members.filter((m) => m !== id) : [...cur.members, id],
  }));

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSave({ ...g, ring_time: Number(g.ring_time) }); }}
      style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--rule)' }}
    >
      <h3>{editing ? `Edit ring group ${g.number}` : 'New ring group'}</h3>
      <div className="form-row">
        <label className="field" style={{ width: 96 }}>
          Number
          <input className="input" type="text" inputMode="numeric" placeholder="600" required disabled={editing}
            value={g.number} onChange={(e) => setG({ ...g, number: e.target.value })} />
        </label>
        <label className="field grow">
          Name
          <input className="input" type="text" placeholder="Sales" required value={g.name}
            onChange={(e) => setG({ ...g, name: e.target.value })} />
        </label>
      </div>
      <div className="form-row">
        <label className="field grow">
          How to ring
          <select className="input" value={g.strategy} onChange={(e) => setG({ ...g, strategy: e.target.value })}>
            {Object.entries(STRATEGY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label className="field" style={{ width: 150 }}>
          {g.strategy === 'sequential' ? 'Seconds per person' : 'Seconds to ring'}
          <input className="input" type="number" min={5} max={120} required value={g.ring_time}
            onChange={(e) => setG({ ...g, ring_time: e.target.value })} />
        </label>
      </div>
      <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend style={{ marginBottom: 6 }}>
          Members{g.strategy === 'sequential' ? ', rung in the order you pick them' : ''}
        </legend>
        {extensions.length === 0 ? <span>Add extensions first.</span> : (
          <div className="member-pick">
            {extensions.map((x) => {
              const pos = g.members.indexOf(x.id);
              return (
                <label key={x.id} className={pos >= 0 ? 'on' : undefined}>
                  <input type="checkbox" checked={pos >= 0} onChange={() => toggle(x.id)} />
                  {g.strategy === 'sequential' && pos >= 0 && <span className="order">{pos + 1}</span>}
                  {x.number} {x.name}
                </label>
              );
            })}
          </div>
        )}
      </fieldset>
      <div className="actions">
        <button className="btn primary">{editing ? 'Save ring group' : 'Create ring group'}</button>
        <button type="button" className="btn" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

function RingGroups({ data, run, api }) {
  const [editing, setEditing] = useState(null);

  async function save(g) {
    const body = { name: g.name, strategy: g.strategy, ring_time: g.ring_time, members: g.members };
    const res = await run(() => (g.id ? api.updateRingGroup(g.id, body) : api.createRingGroup({ ...body, number: g.number })));
    if (res) setEditing(null);
  }

  function remove(g) {
    if (window.confirm(`Delete ring group ${g.number} (${g.name})?`)) run(() => api.deleteRingGroup(g.id));
  }

  return (
    <section className="sheet" aria-labelledby="groups">
      <div className="sheet-head">
        <h2 id="groups">Ring groups</h2>
        {!editing && <button className="btn sm" onClick={() => setEditing(EMPTY_GROUP)}>New ring group</button>}
      </div>
      {data.ringGroups.length === 0 && !editing && (
        <p className="empty">No ring groups yet. A ring group lets one number ring several extensions.</p>
      )}
      {data.ringGroups.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Group</th><th>Rings</th><th /></tr></thead>
            <tbody>
              {data.ringGroups.map((g) => (
                <tr key={g.id}>
                  <td><span className="ext-tag">{g.number}</span> {g.name}</td>
                  <td>
                    <Members group={g} />
                    <div className="quiet small">
                      {g.strategy === 'sequential' ? `One by one, ${g.ring_time}s each` : `All at once for ${g.ring_time}s`}
                    </div>
                  </td>
                  <td className="right">
                    <span className="links">
                      <button className="btn-link small"
                        onClick={() => setEditing({ ...g, members: g.members.map((m) => m.extension_id) })}>Edit</button>
                      <button className="btn-link small danger" onClick={() => remove(g)}>Delete</button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing && (
        <RingGroupForm key={editing.id || 'new'} extensions={data.extensions} initial={editing}
          onSave={save} onCancel={() => setEditing(null)} />
      )}
    </section>
  );
}

// ── Page ────────────────────────────────────────────────────
export default function PbxManager({ pbx }) {
  const { base, title, lede } = PBXES[pbx];
  const api = useMemo(() => bindApi(base), [base]);
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [notice, setNotice] = useState('');

  async function refresh() {
    try { setData(await api.getPbx()); } catch (e) { setErr(e.message); }
  }

  async function run(fn) {
    setErr(''); setNotice('');
    try {
      const res = await fn();
      if (res?.applied?.warning) setNotice(res.applied.warning);
      await refresh();
      return res;
    } catch (e) {
      setErr(e.message);
      return null;
    }
  }

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 10000);
    return () => clearInterval(t);
  }, []);

  return (
    <Shell title={title} lede={lede}>
      {err && <p className="err" role="alert" style={{ marginBottom: 12 }}>{err}</p>}
      {notice && <p className="notice" style={{ marginBottom: 12 }}>{notice}</p>}
      {!data ? <p className="empty">Loading PBX…</p> : (
        <>
          {data.server.enabled === false && (
            <p className="notice" style={{ marginBottom: 12 }}>
              {title} has no phone line yet. Set SIP2_HOST, SIP2_USERNAME and SIP2_PASSWORD on the server and restart it.
              You can still add extensions now; they start working once the line is set.
            </p>
          )}
          <InboundRoute data={data} run={run} api={api} />
          <div className="stack" style={{ marginTop: 16 }}>
            <Extensions data={data} run={run} api={api} />
            <RingGroups data={data} run={run} api={api} />
          </div>
          <section className="sheet" style={{ marginTop: 16 }} aria-labelledby="connect">
            <h2 id="connect" style={{ marginBottom: 14 }}>Connect a phone</h2>
            <dl className="connect">
              <div><dt>SIP server</dt><dd>{data.server.domain || 'Set PBX_DOMAIN'}</dd></div>
              <div><dt>Port</dt><dd>{data.server.port}</dd></div>
              <div><dt>Transport</dt><dd>{data.server.transport}</dd></div>
              <div><dt>User name and auth ID</dt><dd>Extension number</dd></div>
              <div><dt>Password</dt><dd>From the list above</dd></div>
            </dl>
            {data.server.driver !== 'ari' && (
              <p className="notice" style={{ marginTop: 14 }}>
                Calling is simulated right now, so phones can’t connect. Set DIALER_DRIVER=ari on the server.
              </p>
            )}
          </section>
        </>
      )}
    </Shell>
  );
}
