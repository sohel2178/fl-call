'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Shell from '../components/Shell';
import CampaignComposer from '../components/CampaignComposer';
import { LampStrip } from '../components/LampBoard';
import { listCampaigns } from '../lib/api';

const TYPE_LABEL = {
  'service-charge': 'Service charge reminder',
  unassigned: 'Unassigned customers',
  'number-check': 'SIM check',
};

const STATUS_LABEL = {
  pending: 'Starting', running: 'Calling', completed: 'Done', failed: 'Failed', cancelled: 'Stopped',
};

export default function Home() {
  const [campaigns, setCampaigns] = useState(null);

  async function refresh() {
    try { setCampaigns(await listCampaigns()); } catch { /* keep last list */ }
  }

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 2500);
    return () => clearInterval(t);
  }, []);

  return (
    <Shell title="Campaigns" lede="Upload a list of numbers and FleetCall dials them over your SIP trunk.">
      <div className="split">
        <CampaignComposer onCreated={refresh} />
        <section className="sheet" aria-labelledby="recent">
          <div className="sheet-head"><h2 id="recent">Recent campaigns</h2></div>
          {campaigns === null && <p className="empty">Loading campaigns…</p>}
          {campaigns?.length === 0 && <p className="empty">No campaigns yet. Upload a CSV to start one.</p>}
          {campaigns?.map((c) => (
            <Link key={c.id} href={`/campaigns/${c.id}`} className="campaign-row">
              <div style={{ minWidth: 0 }}>
                <div className="campaign-name">{c.name}</div>
                <div className="campaign-meta">
                  {TYPE_LABEL[c.type] || c.type}, <span className={`status ${c.status}`}>{STATUS_LABEL[c.status] || c.status}</span>
                </div>
              </div>
              <div className="campaign-count num">{c.done}<span className="quiet">/{c.total}</span></div>
              <LampStrip meta={c.meta} done={c.done} total={c.total} status={c.status} />
            </Link>
          ))}
        </section>
      </div>
    </Shell>
  );
}
