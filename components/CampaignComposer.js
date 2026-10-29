'use client';
import { useEffect, useRef, useState } from 'react';
import { createCampaign, getLines, previewOffer } from '../lib/api';

const OFFER_MAX = 2000;

const TYPES = [
  {
    type: 'service-charge',
    tab: 'Service charge',
    what: 'Calls each customer and plays a Bangla reminder of their vehicles and due charge.',
    columns: 'number, vehicles, due_charge',
    placeholder: 'October service charge',
    cta: 'Start calling',
  },
  {
    type: 'unassigned',
    tab: 'Unassigned',
    what: 'Calls customers whose tracker isn’t activated yet and plays a Bangla reminder.',
    columns: 'number, plus vehicles and due_charge if you have them',
    placeholder: 'Unassigned customers',
    cta: 'Start calling',
  },
  {
    type: 'number-check',
    tab: 'SIM check',
    what: 'Dials each tracker SIM without playing audio and reports whether it’s reachable.',
    columns: 'number',
    placeholder: 'Tracker SIM check',
    cta: 'Check numbers',
  },
  {
    type: 'offer',
    tab: 'Offer',
    what: 'Calls each number and plays your offer, spoken in a natural voice.',
    columns: 'number',
    placeholder: 'Eid offer',
    cta: 'Start calling',
  },
];

export default function CampaignComposer({ onCreated }) {
  const [type, setType] = useState(TYPES[0].type);
  const [name, setName] = useState('');
  const [file, setFile] = useState(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [warn, setWarn] = useState([]);
  const [offerText, setOfferText] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewing, setPreviewing] = useState(false);
  const [lines, setLines] = useState([]);
  const [pbx, setPbx] = useState(1);
  const inputRef = useRef(null);
  const def = TYPES.find((t) => t.type === type);
  const isOffer = type === 'offer';

  // Lines the offer can call from (PBX-2 only appears when the server has it).
  useEffect(() => { getLines().then(setLines).catch(() => setLines([])); }, []);

  // Free the blob URL of the previous preview.
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  function editOffer(text) {
    setOfferText(text);
    setPreviewUrl(''); // the preview no longer matches the text
  }

  async function preview() {
    setErr('');
    if (!offerText.trim()) { setErr('Write the offer text first.'); return; }
    setPreviewing(true);
    try {
      setPreviewUrl(URL.createObjectURL(await previewOffer(offerText.trim())));
    } catch (e) {
      setErr(e.message);
    } finally {
      setPreviewing(false);
    }
  }

  function pick(f) {
    setErr('');
    if (f && !/\.csv$/i.test(f.name) && f.type !== 'text/csv') { setErr('Choose a .csv file.'); return; }
    setFile(f || null);
  }

  async function submit(e) {
    e.preventDefault();
    setErr(''); setWarn([]);
    if (isOffer && !offerText.trim()) { setErr('Write the offer text to play on the call.'); return; }
    if (!file) { setErr('Add a CSV file with the numbers to call.'); return; }
    setBusy(true);
    try {
      const res = await createCampaign({
        type, name, file,
        offerText: isOffer ? offerText.trim() : '',
        pbx: isOffer ? pbx : undefined,
      });
      setWarn(res.warnings || []);
      setName(''); setFile(null);
      if (isOffer) editOffer('');
      if (inputRef.current) inputRef.current.value = '';
      onCreated?.(res.campaign);
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="sheet" onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h2>Start a campaign</h2>
      <div className="segmented" role="group" aria-label="Campaign type">
        {TYPES.map((t) => (
          <button key={t.type} type="button" aria-pressed={t.type === type} onClick={() => setType(t.type)}>
            {t.tab}
          </button>
        ))}
      </div>
      <div>
        <p>{def.what}</p>
        <p className="quiet small" style={{ marginTop: 4 }}>CSV columns: {def.columns}</p>
      </div>

      <label className="field">
        {isOffer ? 'Campaign name' : 'Name (optional)'}
        <input className="input" type="text" value={name} placeholder={def.placeholder}
          onChange={(e) => setName(e.target.value)} />
      </label>

      {isOffer && lines.length > 1 && (
        <div className="field">
          Call from
          <div className="segmented" role="group" aria-label="Call from">
            {lines.map((l) => (
              <button key={l.pbx} type="button" aria-pressed={l.pbx === pbx} onClick={() => setPbx(l.pbx)}>
                PBX-{l.pbx} · {l.number}
              </button>
            ))}
          </div>
        </div>
      )}

      {isOffer && (
        <div>
          <label className="field">
            Offer text
            <textarea className="input" rows={5} maxLength={OFFER_MAX} value={offerText}
              placeholder="আসসালামু আলাইকুম। সুলতান ট্র্যাকার থেকে বলছি…"
              onChange={(e) => editOffer(e.target.value)} />
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
            <button type="button" className="btn" onClick={preview} disabled={previewing || !offerText.trim()}>
              {previewing ? 'Generating voice…' : 'Preview voice'}
            </button>
            <span className="quiet small">{offerText.length}/{OFFER_MAX}</span>
          </div>
          {previewUrl && <audio src={previewUrl} controls autoPlay style={{ width: '100%', marginTop: 8 }} />}
        </div>
      )}

      <label
        className={`dropzone${over ? ' over' : ''}${file ? ' has-file' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files[0]); }}
      >
        <input ref={inputRef} type="file" accept=".csv,text/csv" onChange={(e) => pick(e.target.files[0])} />
        {file && <span className="lamp ok" aria-hidden="true" />}
        <span>{file ? file.name : 'Drop the CSV here, or click to choose it'}</span>
      </label>

      {err && <p className="err" role="alert">{err}</p>}
      {warn.length > 0 && <p className="notice">{warn.slice(0, 3).join(' ')}</p>}

      <div>
        <button className="btn primary" disabled={busy}>{busy ? 'Starting…' : def.cta}</button>
      </div>
    </form>
  );
}
