'use client';

import { useEffect, useState, useCallback } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import type { ResearchFoundationPackJson, ContentPost, ContentPlanJson } from '@/lib/gemini';
import {
  FaInstagram,
  FaLinkedin,
  FaTiktok,
  FaFacebook,
  FaYoutube,
  FaXTwitter,
} from 'react-icons/fa6';

// ─── Types ─────────────────────────────────────────────────────────────────

interface Artifact {
  id: string;
  type: string;
  format: string;
  title: string;
  content: string | null;
  content_json: any;
  created_at: string;
}

interface Job {
  id: string;
  type: string;
  status: string;
  input_artifact_id: string | null;
  output_artifact_id: string | null;
  error: string | null;
  created_at: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Safely coerce a value that might be a string or undefined into an array. */
function toArray(val: unknown): string[] {
  if (Array.isArray(val)) return val as string[];
  if (typeof val === 'string' && val.trim()) return [val];
  return [];
}

// ─── Research Viewer (ported from AI Studio OutputSection.tsx) ──────────────

type ResearchTab = 'overview' | 'swot' | 'lean' | 'competitors' | 'strategy' | 'raw';

function ResearchViewer({ pack, markdown }: { pack: ResearchFoundationPackJson; markdown: string }) {
  const [tab, setTab] = useState<ResearchTab>('overview');
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const text = tab === 'raw' ? JSON.stringify(pack, null, 2) : markdown;
    await navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(pack, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'research-foundation-pack.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const tabs: { id: ResearchTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'swot', label: 'SWOT Analysis' },
    { id: 'lean', label: 'Lean Canvas' },
    { id: 'competitors', label: 'Competitors' },
    { id: 'strategy', label: 'Strategy & Campaign' },
    { id: 'raw', label: 'Raw Data' },
  ];

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <h3 className="font-bold text-lg text-gray-900">Research Findings</h3>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-gray-900 rounded hover:bg-black"
          >
            Download JSON
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-gray-200 bg-white px-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
              tab === t.id
                ? 'border-purple-600 text-purple-600 bg-purple-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-6 bg-gray-50 min-h-[500px] overflow-y-auto">

        {/* OVERVIEW */}
        {tab === 'overview' && (
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="bg-white p-8 rounded-lg border border-gray-200 shadow-sm">
              <h2 className="text-2xl font-bold text-purple-700 mb-6">Executive Summary</h2>
              <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-line">{markdown}</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-4">Target Audience Pains</h3>
                <ul className="space-y-2">
                    {toArray(pack.market_and_audience_insights?.customer_pains).map((pain, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-red-500 mt-0.5 flex-shrink-0">•</span>{pain}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-4">Key Opportunities</h3>
                <ul className="space-y-2">
                  {toArray(pack.swot?.opportunities).map((opp, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-green-500 mt-0.5 flex-shrink-0">↗</span>{opp}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* SWOT */}
        {tab === 'swot' && (
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { label: 'Strengths', items: toArray(pack.swot?.strengths), color: 'border-green-500', icon: '✓', iconColor: 'text-green-600' },
              { label: 'Weaknesses', items: toArray(pack.swot?.weaknesses), color: 'border-orange-400', icon: '!', iconColor: 'text-orange-500' },
              { label: 'Opportunities', items: toArray(pack.swot?.opportunities), color: 'border-blue-500', icon: '↗', iconColor: 'text-blue-600' },
              { label: 'Threats', items: toArray(pack.swot?.threats), color: 'border-red-500', icon: '×', iconColor: 'text-red-600' },
            ].map(({ label, items, color, icon, iconColor }) => (
              <div key={label} className={`bg-white p-6 rounded-lg border-t-4 ${color} shadow-sm`}>
                <h3 className="font-bold text-lg text-gray-900 mb-4 uppercase tracking-wider">{label}</h3>
                <ul className="space-y-3">
                  {items.map((item, i) => (
                    <li key={i} className="flex gap-3 text-sm text-gray-700">
                      <span className={`font-bold ${iconColor} flex-shrink-0`}>{icon}</span>{item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {/* LEAN CANVAS */}
        {tab === 'lean' && (
          <div className="max-w-7xl mx-auto overflow-x-auto">
            <div className="bg-white rounded border border-gray-300 min-w-[900px] grid grid-cols-5 text-sm">
              {/* Row 1 */}
              <div className="row-span-2 p-4 border-r border-b border-gray-300">
                <div className="text-xs font-bold text-gray-400 uppercase mb-2">Problem</div>
                <p className="whitespace-pre-line text-gray-800">{pack.lean_canvas?.problem}</p>
              </div>
              <div className="p-4 border-r border-b border-gray-300">
                <div className="text-xs font-bold text-gray-400 uppercase mb-2">Solution</div>
                <p className="whitespace-pre-line text-gray-800">{pack.lean_canvas?.solution}</p>
              </div>
              <div className="row-span-2 p-4 border-r border-b border-gray-300 bg-purple-50">
                <div className="text-xs font-bold text-purple-600 uppercase mb-2">Unique Value Proposition</div>
                <p className="whitespace-pre-line text-gray-800 font-medium">{pack.lean_canvas?.unique_value_proposition}</p>
              </div>
              <div className="p-4 border-r border-b border-gray-300">
                <div className="text-xs font-bold text-gray-400 uppercase mb-2">Unfair Advantage</div>
                <p className="whitespace-pre-line text-gray-800">{pack.lean_canvas?.unfair_advantage}</p>
              </div>
              <div className="row-span-2 p-4 border-b border-gray-300">
                <div className="text-xs font-bold text-gray-400 uppercase mb-2">Customer Segments</div>
                <p className="whitespace-pre-line text-gray-800">{pack.lean_canvas?.customer_segments}</p>
              </div>
              {/* Row 2 */}
              <div className="p-4 border-r border-b border-gray-300">
                <div className="text-xs font-bold text-gray-400 uppercase mb-2">Key Metrics</div>
                <p className="whitespace-pre-line text-gray-800">{pack.lean_canvas?.key_metrics}</p>
              </div>
              <div className="p-4 border-r border-b border-gray-300">
                <div className="text-xs font-bold text-gray-400 uppercase mb-2">Channels</div>
                <p className="whitespace-pre-line text-gray-800">{pack.lean_canvas?.channels}</p>
              </div>
              {/* Row 3 - bottom */}
              <div className="col-span-2 p-4 border-r border-gray-300">
                <div className="text-xs font-bold text-gray-400 uppercase mb-2">Cost Structure</div>
                <p className="whitespace-pre-line text-gray-800">{pack.lean_canvas?.cost_structure}</p>
              </div>
              <div className="col-span-3 p-4">
                <div className="text-xs font-bold text-gray-400 uppercase mb-2">Revenue Streams</div>
                <p className="whitespace-pre-line text-gray-800">{pack.lean_canvas?.revenue_streams}</p>
              </div>
            </div>
          </div>
        )}

        {/* COMPETITORS */}
        {tab === 'competitors' && (
          <div className="max-w-5xl mx-auto space-y-6">
            {toArray(pack.competitor_landscape?.competitors).map((comp: any, idx) => (
              <div key={idx} className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-purple-700">{comp.name}</h3>
                    {comp.website && (
                      <a href={comp.website} target="_blank" rel="noreferrer" className="text-sm text-gray-500 hover:underline">
                        {comp.website}
                      </a>
                    )}
                  </div>
                  <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-semibold">Competitor</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs font-bold text-gray-400 uppercase mb-1">Positioning</div>
                      <p className="text-sm text-gray-800">{comp.positioning_summary}</p>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gray-400 uppercase mb-1">Target Customers</div>
                      <p className="text-sm text-gray-800">{comp.target_customers}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs font-bold text-gray-400 uppercase mb-1">Offers</div>
                      <p className="text-sm text-gray-800">{comp.offers}</p>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gray-400 uppercase mb-1">Pricing</div>
                      <p className="text-sm text-gray-600 italic">{comp.pricing_notes}</p>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gray-400 uppercase mb-1">Messaging Angles</div>
                      <p className="text-sm text-gray-800">{comp.messaging_angles}</p>
                    </div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded space-y-3">
                    <div>
                      <div className="text-xs font-bold text-purple-600 uppercase mb-1">Flow's Opportunity</div>
                      <p className="text-sm text-gray-900 font-medium">{comp.differentiation_opportunities}</p>
                    </div>
                    {toArray(comp.strengths).length > 0 && (
                      <div>
                        <div className="text-xs font-bold text-gray-400 uppercase mb-1">Their Strengths</div>
                        <ul className="space-y-1">
                          {toArray(comp.strengths).map((s, i) => <li key={i} className="text-xs text-gray-600">+ {s}</li>)}
                        </ul>
                      </div>
                    )}
                    {toArray(comp.weaknesses).length > 0 && (
                      <div>
                        <div className="text-xs font-bold text-gray-400 uppercase mb-1">Their Weaknesses</div>
                        <ul className="space-y-1">
                          {toArray(comp.weaknesses).map((w, i) => <li key={i} className="text-xs text-gray-600">- {w}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {pack.competitor_landscape?.category_notes && (
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded text-sm text-yellow-900">
                <strong>Category Insight: </strong>{pack.competitor_landscape.category_notes}
              </div>
            )}
          </div>
        )}

        {/* STRATEGY & CAMPAIGN */}
        {tab === 'strategy' && (
          <div className="max-w-5xl mx-auto space-y-8">
            {/* Positioning statement */}
            <div className="bg-purple-700 text-white p-8 rounded-lg shadow-lg">
              <div className="text-xs font-semibold text-yellow-300 uppercase tracking-wider mb-3">Strategic Positioning</div>
              <p className="text-xl md:text-2xl font-serif leading-relaxed">
                "{pack.campaign_foundations?.positioning_statement}"
              </p>
            </div>

            {/* Messaging pillars */}
            {toArray(pack.campaign_foundations?.messaging_pillars).length > 0 && (
              <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                <h3 className="font-bold text-lg text-gray-900 mb-4">Messaging Pillars</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {toArray(pack.campaign_foundations?.messaging_pillars).map((p: any, i) => (
                    <div key={i} className="p-4 bg-gray-50 rounded border border-gray-200">
                      <div className="font-semibold text-gray-900 mb-1">{p.pillar}</div>
                      <div className="text-sm text-gray-600">{p.key_message}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Content themes */}
              <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                <h3 className="font-bold text-lg text-gray-900 mb-4">Content Themes</h3>
                <div className="flex flex-wrap gap-2">
                  {toArray(pack.campaign_foundations?.content_themes).map((theme, i) => (
                    <span key={i} className="px-3 py-1.5 bg-gray-100 text-gray-800 rounded-md text-sm border border-gray-200">
                      {theme}
                    </span>
                  ))}
                </div>
              </div>

              {/* Channel strategy */}
              <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                <h3 className="font-bold text-lg text-gray-900 mb-4">Channel Strategy</h3>
                <ul className="space-y-3">
                  {Object.entries(pack.campaign_foundations?.suggested_channel_strategy || {}).map(([channel, strategy]) => (
                    <li key={channel} className="flex gap-3 text-sm border-b pb-2 last:border-0">
                      <span className="font-semibold text-purple-700 capitalize w-20 flex-shrink-0">{channel}</span>
                      <span className="text-gray-600">{strategy as string}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Content series */}
            {toArray(pack.campaign_foundations?.content_series).length > 0 && (
              <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                <h3 className="font-bold text-lg text-gray-900 mb-4">Content Series</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {toArray(pack.campaign_foundations?.content_series).map((s: any, i) => (
                    <div key={i} className="p-4 bg-gray-50 rounded border border-gray-200">
                      <div className="font-semibold text-gray-900 mb-1">{s.title}</div>
                      <div className="text-sm text-gray-600">{s.concept}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 30-day plan */}
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="font-bold text-lg text-gray-900 mb-4">First 30 Days Action Plan</h3>
              <div className="space-y-4">
                {toArray(pack.campaign_foundations?.first_30_days_plan).map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-700 text-white flex items-center justify-center font-bold text-sm">
                      {i + 1}
                    </div>
                    <p className="text-gray-700 text-sm mt-1.5">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* RAW DATA */}
        {tab === 'raw' && (
          <div className="max-w-5xl mx-auto">
            <pre className="font-mono text-xs text-gray-800 whitespace-pre-wrap break-words bg-white p-6 rounded border border-gray-200 shadow-inner overflow-auto max-h-[700px]">
              {JSON.stringify(pack, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Content Planner Viewer ─────────────────────────────────────────────────

const CHANNEL_META: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  instagram: { icon: <FaInstagram />, color: '#E1306C', label: 'Instagram' },
  linkedin:  { icon: <FaLinkedin />,  color: '#0A66C2', label: 'LinkedIn' },
  tiktok:    { icon: <FaTiktok />,    color: '#010101', label: 'TikTok' },
  facebook:  { icon: <FaFacebook />,  color: '#1877F2', label: 'Facebook' },
  youtube:   { icon: <FaYoutube />,   color: '#FF0000', label: 'YouTube' },
  x:         { icon: <FaXTwitter />,  color: '#000000', label: 'X' },
  twitter:   { icon: <FaXTwitter />,  color: '#000000', label: 'X' },
};

function ChannelIcon({ channel, size = 16 }: { channel: string; size?: number }) {
  const meta = CHANNEL_META[channel.toLowerCase()];
  if (!meta) return <span className="text-gray-400 text-xs font-bold">{channel.slice(0, 2).toUpperCase()}</span>;
  return (
    <span style={{ color: meta.color, fontSize: size }} className="flex items-center">
      {meta.icon}
    </span>
  );
}

function ChannelBadge({ channel }: { channel: string }) {
  const meta = CHANNEL_META[channel.toLowerCase()];
  const label = meta?.label ?? channel;
  const color = meta?.color ?? '#6b7280';
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border" style={{ borderColor: color + '40', color, background: color + '12' }}>
      <ChannelIcon channel={channel} size={11} />
      {label}
    </span>
  );
}

const PILLAR_COLORS: Record<string, string> = {
  education: 'bg-blue-100 text-blue-800',
  authority: 'bg-blue-100 text-blue-800',
  social_proof: 'bg-green-100 text-green-800',
  results: 'bg-green-100 text-green-800',
  behind_scenes: 'bg-orange-100 text-orange-800',
  authenticity: 'bg-orange-100 text-orange-800',
  conversion: 'bg-red-100 text-red-800',
  promotional: 'bg-red-100 text-red-800',
  entertainment: 'bg-pink-100 text-pink-800',
  viral: 'bg-pink-100 text-pink-800',
};

function getPillarColor(pillar: string) {
  const key = pillar.toLowerCase().replace(/[^a-z_]/g, '_');
  return PILLAR_COLORS[key] ?? 'bg-gray-100 text-gray-700';
}

function PostCard({ post }: { post: ContentPost }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <ChannelBadge channel={post.channel} />
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">{post.format}</span>
          <span className={`text-xs px-2 py-0.5 rounded font-medium ${getPillarColor(post.content_pillar)}`}>
            {post.content_pillar}
          </span>
        </div>
        <span className="text-xs text-gray-400 flex-shrink-0 font-medium">{post.day_of_week}</span>
      </div>

      {/* Hook */}
      <p className="text-sm font-bold text-gray-900 mb-2 leading-snug">"{post.hook}"</p>

      {/* Caption preview */}
      <p className={`text-xs text-gray-600 mb-3 whitespace-pre-line leading-relaxed ${expanded ? '' : 'line-clamp-3'}`}>
        {post.caption}
      </p>

      {/* Hashtags */}
      {post.hashtags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {post.hashtags.slice(0, expanded ? undefined : 5).map((tag, i) => (
            <span key={i} className="text-xs text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">{tag}</span>
          ))}
          {!expanded && post.hashtags.length > 5 && (
            <span className="text-xs text-gray-400">+{post.hashtags.length - 5} more</span>
          )}
        </div>
      )}

      {/* CTA */}
      <div className="text-xs text-gray-700 mb-2">
        <span className="font-semibold text-purple-700">CTA: </span>{post.cta}
      </div>

      {/* Growth tactic */}
      <div className="text-xs text-gray-500 mb-3">
        <span className="font-semibold">Growth: </span>{post.growth_tactic}
      </div>

      {/* Visual brief (expanded only) */}
      {expanded && (
        <div className="mt-3 p-3 bg-gray-50 rounded border border-gray-200">
          <div className="text-xs font-bold text-gray-500 uppercase mb-1">Visual Brief</div>
          <p className="text-xs text-gray-700 whitespace-pre-line">{post.visual_brief}</p>
          {post.production_notes && (
            <>
              <div className="text-xs font-bold text-gray-500 uppercase mt-2 mb-1">Production Notes</div>
              <p className="text-xs text-gray-600 italic">{post.production_notes}</p>
            </>
          )}
        </div>
      )}

      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-2 text-xs text-purple-600 hover:underline font-medium"
      >
        {expanded ? '↑ Collapse' : '↓ Full brief + visual'}
      </button>
    </div>
  );
}

function ContentPlanViewer({ plan, markdown, clientName }: { plan: ContentPlanJson; markdown: string; clientName: string }) {
  const [activeWeek, setActiveWeek] = useState<number>(1);
  const [filterChannel, setFilterChannel] = useState<string>('all');
  const [view, setView] = useState<'calendar' | 'strategy' | 'markdown'>('calendar');

  const channels = Array.from(new Set(plan.posts.map(p => p.channel)));
  const filtered = plan.posts.filter(p =>
    p.week === activeWeek && (filterChannel === 'all' || p.channel === filterChannel)
  );

  const postsByWeek = [1, 2, 3, 4].map(w => plan.posts.filter(p => p.week === w));

  const handleDownloadMd = () => {
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${clientName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-content-calendar.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadJson = () => {
    const blob = new Blob([JSON.stringify(plan, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${clientName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-content-calendar.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <h3 className="font-bold text-lg text-gray-900">Content Calendar</h3>
          <span className="bg-purple-100 text-purple-800 text-xs font-bold px-2 py-1 rounded-full">
            {plan.posts.length} posts
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleDownloadMd}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
          >
            ↓ Markdown
          </button>
          <button
            onClick={handleDownloadJson}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-gray-900 rounded hover:bg-black"
          >
            ↓ JSON
          </button>
        </div>
      </div>

      {/* View tabs */}
      <div className="flex border-b border-gray-200 bg-white px-2">
        {(['calendar', 'strategy', 'markdown'] as const).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap capitalize ${
              view === v
                ? 'border-purple-600 text-purple-600 bg-purple-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {v === 'calendar' ? '📅 Calendar' : v === 'strategy' ? '🎯 Strategy' : '📄 Markdown'}
          </button>
        ))}
      </div>

      <div className="p-6 bg-gray-50 min-h-[500px]">

        {/* CALENDAR VIEW */}
        {view === 'calendar' && (
          <>
            {/* Week selector + channel filter */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <div className="flex rounded-lg border border-gray-200 overflow-hidden bg-white">
                {[1, 2, 3, 4].map(w => (
                  <button
                    key={w}
                    onClick={() => setActiveWeek(w)}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      activeWeek === w
                        ? 'bg-purple-700 text-white'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Week {w}
                    <span className="ml-1.5 text-xs opacity-70">({postsByWeek[w - 1].length})</span>
                  </button>
                ))}
              </div>
              <select
                value={filterChannel}
                onChange={e => setFilterChannel(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-300"
              >
                <option value="all">All channels</option>
                {channels.map(c => (
                  <option key={c} value={c}>{CHANNEL_META[c.toLowerCase()]?.label ?? c}</option>
                ))}
              </select>
            </div>

            {filtered.length === 0 ? (
              <p className="text-gray-500 text-sm">No posts for this week/channel combination.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map(post => <PostCard key={post.id} post={post} />)}
              </div>
            )}
          </>
        )}

        {/* STRATEGY VIEW */}
        {view === 'strategy' && plan.strategy_overview && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Goal */}
            <div className="bg-purple-700 text-white p-6 rounded-lg">
              <div className="text-xs font-semibold text-yellow-300 uppercase tracking-wider mb-2">Monthly Goal</div>
              <p className="text-xl font-bold">{plan.strategy_overview.monthly_goal}</p>
              <p className="text-sm text-purple-200 mt-2">{plan.strategy_overview.positioning_theme}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Channels */}
              <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-3">Channel Priorities</h3>
                <div className="space-y-2">
                  {toArray(plan.strategy_overview.channel_priorities).map((ch, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                      <span className="font-bold text-purple-600 w-5">{i + 1}.</span>
                      <ChannelIcon channel={ch} size={16} />
                      <span className="capitalize">{CHANNEL_META[ch.toLowerCase()]?.label ?? ch}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Success metrics */}
              <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-3">Success Metrics</h3>
                <ul className="space-y-2">
                  {toArray(plan.strategy_overview.success_metrics).map((m, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span>{m}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Key themes */}
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-3">Key Themes</h3>
              <div className="flex flex-wrap gap-2">
                {toArray(plan.strategy_overview.key_themes).map((t, i) => (
                  <span key={i} className="px-3 py-1.5 bg-gray-100 text-gray-800 rounded-md text-sm border border-gray-200">{t}</span>
                ))}
              </div>
            </div>

            {/* Growth levers */}
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-3">Growth Levers</h3>
              <div className="space-y-2">
                {toArray(plan.strategy_overview.growth_levers).map((g, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-yellow-500 mt-0.5 flex-shrink-0">⚡</span>{g}
                  </div>
                ))}
              </div>
            </div>

            {plan.strategy_overview.content_mix_rationale && (
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded text-sm text-yellow-900">
                <strong>Content Mix Rationale: </strong>{plan.strategy_overview.content_mix_rationale}
              </div>
            )}
          </div>
        )}

        {/* MARKDOWN VIEW */}
        {view === 'markdown' && (
          <div className="max-w-5xl mx-auto">
            <pre className="font-mono text-xs text-gray-800 whitespace-pre-wrap break-words bg-white p-6 rounded border border-gray-200 shadow-inner overflow-auto max-h-[700px]">
              {markdown}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Agent Pipeline Status ──────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  queued: 'bg-blue-100 text-blue-800',
  running: 'bg-indigo-100 text-indigo-800',
  done: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  needs_approval: 'bg-purple-100 text-purple-800',
};

const AGENT_LABELS: Record<string, string> = {
  research: 'Research Agent',
  kb_packager: 'KB Builder Agent',
  presentation: 'Presentation Agent',
  content_planner: 'Content Planner Agent',
};

// ─── Page ───────────────────────────────────────────────────────────────────

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [project, setProject] = useState<any>(null);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningAgent, setRunningAgent] = useState<string | null>(null);
  const [agentStatus, setAgentStatus] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [activeStep, setActiveStep] = useState<'onboarding' | 'research' | 'kb' | 'presentation' | 'content'>('research');
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['instagram', 'linkedin']);
  const [runningSeconds, setRunningSeconds] = useState(0);

  const loadData = useCallback(async () => {
    try {
      const [projectRes, artifactsRes, jobsRes] = await Promise.all([
        supabase.from('projects').select('*').eq('id', projectId).single(),
        supabase.from('artifacts').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
        supabase.from('jobs').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
      ]);
      if (projectRes.error) throw projectRes.error;
      setProject(projectRes.data);
      setArtifacts((artifactsRes.data as any) || []);
      setJobs((jobsRes.data as any) || []);
    } catch (err) {
      console.error('Failed to load project data:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { loadData(); }, [loadData]);

  // Tick a seconds counter while any agent is running so the user sees progress
  useEffect(() => {
    if (!runningAgent) { setRunningSeconds(0); return; }
    const timer = setInterval(() => setRunningSeconds(s => s + 1), 1000);
    return () => clearInterval(timer);
  }, [runningAgent]);

  // Auto-select furthest completed step once data loads.
  // MUST be before any early returns to satisfy Rules of Hooks.
  useEffect(() => {
    if (loading) return;
    const hasContent = artifacts.some(a => a.type === 'content_plan_json');
    const hasPres = artifacts.some(a => a.type === 'presentation');
    const hasKbFiles = artifacts.some(a => a.type === 'kb_file');
    const hasRes = artifacts.some(a => a.type === 'research_foundation_pack_json');
    if (hasContent) setActiveStep('content');
    else if (hasPres) setActiveStep('presentation');
    else if (hasKbFiles) setActiveStep('kb');
    else if (hasRes) setActiveStep('research');
    else setActiveStep('onboarding');
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const findArtifact = (type: string) => artifacts.find(a => a.type === type);

  const runAgent = async (agentType: string) => {
    setRunningAgent(agentType);
    setAgentStatus(null);

    let inputArtifact: Artifact | undefined;
    let endpoint: string;

    if (agentType === 'research') {
      inputArtifact = findArtifact('onboarding_report_json') ?? findArtifact('onboarding_report');
      if (!inputArtifact) {
        setAgentStatus({ message: 'No onboarding report found. Complete the onboarding survey first.', type: 'error' });
        setRunningAgent(null);
        return;
      }
      endpoint = '/api/workers/research';
    } else if (agentType === 'kb_packager') {
      inputArtifact = findArtifact('research_foundation_pack_json');
      if (!inputArtifact) {
        setAgentStatus({ message: 'Run the Research Agent first — it produces the input for KB Builder.', type: 'error' });
        setRunningAgent(null);
        return;
      }
      endpoint = '/api/workers/kb-packager';
    } else if (agentType === 'presentation') {
      inputArtifact = findArtifact('research_foundation_pack_json');
      if (!inputArtifact) {
        setAgentStatus({ message: 'Run the Research Agent first — it produces the input for the Presentation Agent.', type: 'error' });
        setRunningAgent(null);
        return;
      }
      endpoint = '/api/workers/presentation';
    } else if (agentType === 'content_planner') {
      inputArtifact = findArtifact('research_foundation_pack_json');
      if (!inputArtifact) {
        setAgentStatus({ message: 'Run the Research Agent first — it produces the input for the Content Planner.', type: 'error' });
        setRunningAgent(null);
        return;
      }
      endpoint = '/api/workers/content-planner';
    } else {
      setAgentStatus({ message: `Agent "${agentType}" is not yet available.`, type: 'error' });
      setRunningAgent(null);
      return;
    }

    try {
      // Create job record in Supabase so we can poll it
      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .insert({ project_id: projectId, type: agentType, status: 'running', input_artifact_id: inputArtifact.id } as any)
        .select()
        .single();

      if (jobError) throw jobError;

      const jobId = (job as any).id;

      // Fire the worker — don't await, let it run on the server.
      // We'll learn it's done via polling below, not from the HTTP response.
      const workerBody: Record<string, unknown> = {
        project_id: projectId,
        input_artifact_id: inputArtifact.id,
        job_id: jobId,
      };
      if (agentType === 'content_planner') {
        workerBody.channels = selectedChannels;
      }
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workerBody),
      }).catch(() => {}); // errors are surfaced via job status polling

      // Poll Supabase every 5 s — stop when done or failed
      const POLL_INTERVAL = 5_000;
      const MAX_WAIT_MS = 360_000; // 6 min absolute cap
      const startedAt = Date.now();

      const poll = setInterval(async () => {
        try {
          const { data: jobRow } = await supabase
            .from('jobs')
            .select('status, error')
            .eq('id', jobId)
            .single();

          if (!jobRow) return;

          if (jobRow.status === 'done' || jobRow.status === 'needs_approval') {
            clearInterval(poll);
            setRunningAgent(null);
            setAgentStatus({ message: `${AGENT_LABELS[agentType] || agentType} completed successfully.`, type: 'success' });
            await loadData();
          } else if (jobRow.status === 'failed') {
            clearInterval(poll);
            setRunningAgent(null);
            setAgentStatus({ message: `Error: ${jobRow.error || 'Agent failed'}`, type: 'error' });
          } else if (Date.now() - startedAt > MAX_WAIT_MS) {
            clearInterval(poll);
            setRunningAgent(null);
            setAgentStatus({ message: 'Agent is taking longer than expected. Check back soon — it may still be running.', type: 'error' });
          }
        } catch {
          // network hiccup — keep polling
        }
      }, POLL_INTERVAL);

    } catch (err: any) {
      setAgentStatus({ message: `Error: ${err.message}`, type: 'error' });
      setRunningAgent(null);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Loading project...</p></div>;
  }

  if (!project) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-red-600">Project not found.</p></div>;
  }

  const onboardingArtifact = findArtifact('onboarding_report_json') ?? findArtifact('onboarding_report');
  const researchJsonArtifact = findArtifact('research_foundation_pack_json');
  const researchMdArtifact = findArtifact('research_foundation_pack_md');
  const hasResearch = !!researchJsonArtifact;
  const kbArtifacts = artifacts.filter(a => a.type === 'kb_file');
  const hasKb = kbArtifacts.length > 0;
  const presentationArtifact = findArtifact('presentation');
  const hasPresentation = !!presentationArtifact;
  const contentPlanJsonArtifact = findArtifact('content_plan_json');
  const contentPlanMdArtifact = findArtifact('content_plan_md');
  const hasContentPlan = !!contentPlanJsonArtifact;

  const CHANNEL_OPTIONS = ['instagram', 'linkedin', 'tiktok', 'facebook', 'youtube', 'x'] as const;

  const toggleChannel = (ch: string) => {
    setSelectedChannels(prev =>
      prev.includes(ch) ? (prev.length > 1 ? prev.filter(c => c !== ch) : prev) : [...prev, ch]
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between h-16 items-center">
          <div className="flex items-center gap-3">
            <Link href="/projects" className="text-gray-400 hover:text-gray-600 text-sm">&larr; Projects</Link>
            <img src="/logo.png" alt="Flow" className="h-8 w-auto" />
            <h1 className="text-lg font-bold text-gray-900">{project.client_name}</h1>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">

        {/* Status message */}
        {agentStatus && (
          <div className={`p-4 rounded-md text-sm ${agentStatus.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {agentStatus.message}
          </div>
        )}

        {/* Agent Pipeline */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Agent Pipeline</h2>
          <p className="text-xs text-gray-400 mb-4">Click any step to view its output below.</p>
          <div className="flex flex-wrap gap-3 items-center">

            {/* Step 1 - Onboarding */}
            <div
              onClick={() => setActiveStep('onboarding')}
              className={`flex-1 min-w-[180px] p-4 rounded-lg border-2 cursor-pointer transition-all ${
                activeStep === 'onboarding'
                  ? 'border-purple-600 bg-purple-50 shadow-md ring-2 ring-purple-200'
                  : onboardingArtifact ? 'border-green-400 bg-green-50 hover:shadow' : 'border-gray-200 bg-white hover:shadow'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{onboardingArtifact ? '✅' : '⏳'}</span>
                <h3 className="font-semibold text-sm">1. Onboarding</h3>
              </div>
              <p className="text-xs text-gray-500">{onboardingArtifact ? 'Report received' : 'Awaiting onboarding survey'}</p>
            </div>

            <span className="text-gray-300 text-xl hidden sm:block">&rarr;</span>

            {/* Step 2 - Research Agent */}
            <div
              onClick={() => setActiveStep('research')}
              className={`flex-1 min-w-[180px] p-4 rounded-lg border-2 cursor-pointer transition-all ${
                activeStep === 'research'
                  ? 'border-purple-600 bg-purple-50 shadow-md ring-2 ring-purple-200'
                  : hasResearch ? 'border-green-400 bg-green-50 hover:shadow' : 'border-gray-200 bg-white hover:shadow'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{hasResearch ? '✅' : '🔬'}</span>
                <h3 className="font-semibold text-sm">2. Research Agent</h3>
              </div>
              <p className="text-xs text-gray-500 mb-3">{hasResearch ? 'Research complete' : 'Uses onboarding report'}</p>
              {!hasResearch && (
                <button
                  onClick={(e) => { e.stopPropagation(); runAgent('research'); }}
                  disabled={runningAgent !== null || !onboardingArtifact}
                  className="w-full px-3 py-1.5 bg-purple-700 text-white text-xs rounded hover:bg-purple-800 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {runningAgent === 'research' ? `Running… ${runningSeconds}s` : 'Run Research Agent'}
                </button>
              )}
            </div>

            <span className="text-gray-300 text-xl hidden sm:block">&rarr;</span>

            {/* Step 3 - KB Builder */}
            <div
              onClick={() => setActiveStep('kb')}
              className={`flex-1 min-w-[180px] p-4 rounded-lg border-2 cursor-pointer transition-all ${
                activeStep === 'kb'
                  ? 'border-purple-600 bg-purple-50 shadow-md ring-2 ring-purple-200'
                  : hasKb ? 'border-green-400 bg-green-50 hover:shadow' : 'border-gray-200 bg-white hover:shadow'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{hasKb ? '✅' : '📚'}</span>
                <h3 className="font-semibold text-sm">3. KB Builder</h3>
              </div>
              <p className="text-xs text-gray-500 mb-3">{hasKb ? `${kbArtifacts.length} files ready` : 'Uses research pack'}</p>
              {!hasKb && (
                <button
                  onClick={(e) => { e.stopPropagation(); runAgent('kb_packager'); }}
                  disabled={runningAgent !== null || !hasResearch}
                  className="w-full px-3 py-1.5 bg-purple-700 text-white text-xs rounded hover:bg-purple-800 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {runningAgent === 'kb_packager' ? `Running… ${runningSeconds}s` : 'Run KB Builder'}
                </button>
              )}
            </div>

            <span className="text-gray-300 text-xl hidden sm:block">&rarr;</span>

            {/* Step 4 - Presentation Agent */}
            <div
              onClick={() => setActiveStep('presentation')}
              className={`flex-1 min-w-[180px] p-4 rounded-lg border-2 cursor-pointer transition-all ${
                activeStep === 'presentation'
                  ? 'border-purple-600 bg-purple-50 shadow-md ring-2 ring-purple-200'
                  : hasPresentation ? 'border-green-400 bg-green-50 hover:shadow' : 'border-gray-200 bg-white hover:shadow'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{hasPresentation ? '✅' : '🎨'}</span>
                <h3 className="font-semibold text-sm">4. Presentation</h3>
              </div>
              <p className="text-xs text-gray-500 mb-3">{hasPresentation ? 'PPTX ready to download' : 'Uses research + KB files'}</p>
              {hasPresentation ? (
                <div className="flex flex-col gap-1.5" onClick={(e) => e.stopPropagation()}>
                  {runningAgent === 'presentation' ? (
                    <div className="w-full px-3 py-1.5 bg-gray-100 text-gray-500 text-xs rounded text-center border border-gray-200">
                      Building… {runningSeconds}s
                    </div>
                  ) : (
                    <a
                      href={(presentationArtifact as any)?.file_url ?? '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="block w-full px-3 py-1.5 bg-green-700 text-white text-xs rounded hover:bg-green-800 text-center"
                    >
                      Download PPTX
                    </a>
                  )}
                  <button
                    onClick={() => runAgent('presentation')}
                    disabled={runningAgent !== null}
                    className="w-full px-3 py-1.5 bg-purple-700 text-white text-xs rounded hover:bg-purple-800 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {runningAgent === 'presentation' ? 'Building…' : 'Re-generate'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); runAgent('presentation'); }}
                  disabled={runningAgent !== null || !hasResearch}
                  className="w-full px-3 py-1.5 bg-purple-700 text-white text-xs rounded hover:bg-purple-800 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {runningAgent === 'presentation' ? `Building… ${runningSeconds}s` : 'Run Presentation Agent'}
                </button>
              )}
            </div>

            <span className="text-gray-300 text-xl hidden sm:block">&rarr;</span>

            {/* Step 5 - Content Planner */}
            <div
              onClick={() => setActiveStep('content')}
              className={`flex-1 min-w-[200px] p-4 rounded-lg border-2 cursor-pointer transition-all ${
                activeStep === 'content'
                  ? 'border-purple-600 bg-purple-50 shadow-md ring-2 ring-purple-200'
                  : hasContentPlan ? 'border-green-400 bg-green-50 hover:shadow' : 'border-gray-200 bg-white hover:shadow'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{hasContentPlan ? '✅' : '📅'}</span>
                <h3 className="font-semibold text-sm">5. Content Plan</h3>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                {hasContentPlan ? `${contentPlanJsonArtifact?.content_json?.posts?.length ?? 0} posts planned` : '30-day social calendar'}
              </p>
              {/* Channel picker */}
              <div className="flex flex-wrap gap-1 mb-2" onClick={(e) => e.stopPropagation()}>
                {CHANNEL_OPTIONS.map(ch => {
                  const meta = CHANNEL_META[ch];
                  const active = selectedChannels.includes(ch);
                  return (
                    <button
                      key={ch}
                      onClick={() => toggleChannel(ch)}
                      title={meta.label}
                      className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border font-medium transition-all ${
                        active
                          ? 'text-white border-transparent'
                          : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                      }`}
                      style={active ? { background: meta.color, borderColor: meta.color } : {}}
                    >
                      <span style={{ fontSize: 12, color: active ? '#fff' : meta.color }} className="flex items-center">
                        {meta.icon}
                      </span>
                      {meta.label}
                    </button>
                  );
                })}
              </div>
              {hasContentPlan ? (
                <div className="flex flex-col gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => runAgent('content_planner')}
                    disabled={runningAgent !== null}
                    className="w-full px-3 py-1.5 bg-purple-700 text-white text-xs rounded hover:bg-purple-800 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {runningAgent === 'content_planner' ? `Planning… ${runningSeconds}s` : 'Re-generate'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); runAgent('content_planner'); }}
                  disabled={runningAgent !== null || !hasResearch}
                  className="w-full px-3 py-1.5 bg-purple-700 text-white text-xs rounded hover:bg-purple-800 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {runningAgent === 'content_planner' ? `Planning… ${runningSeconds}s` : 'Run Content Planner'}
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Step content — shows only what the user selected */}

        {/* Onboarding content */}
        {activeStep === 'onboarding' && (
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Onboarding Report</h2>
            {onboardingArtifact ? (
              <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
                <p className="text-sm font-semibold text-gray-700 mb-3">{onboardingArtifact.title}</p>
                <pre className="font-mono text-xs text-gray-800 whitespace-pre-wrap break-words bg-gray-50 p-4 rounded border border-gray-200 overflow-auto max-h-[600px]">
                  {onboardingArtifact.content_json
                    ? JSON.stringify(onboardingArtifact.content_json, null, 2)
                    : onboardingArtifact.content}
                </pre>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No onboarding report yet. Complete the onboarding survey first.</p>
            )}
          </section>
        )}

        {/* Research Viewer */}
        {activeStep === 'research' && hasResearch && researchJsonArtifact?.content_json && (
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Research Foundation Pack</h2>
            <ResearchViewer
              pack={researchJsonArtifact.content_json as ResearchFoundationPackJson}
              markdown={researchMdArtifact?.content ?? ''}
            />
          </section>
        )}
        {activeStep === 'research' && !hasResearch && (
          <section>
            <p className="text-gray-500 text-sm">No research output yet. Run the Research Agent to generate it.</p>
          </section>
        )}

        {/* KB Builder content */}
        {activeStep === 'kb' && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Knowledge Base Files</h2>
              {kbArtifacts.length > 0 && (
                <button
                  onClick={async () => {
                    const JSZip = (await import('jszip')).default;
                    const zip = new JSZip();
                    const folder = zip.folder(`${project.client_name}-kb`) ?? zip;
                    kbArtifacts.forEach((a) => {
                      const filename = `${a.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
                      folder.file(filename, a.content ?? '');
                    });
                    const blob = await zip.generateAsync({ type: 'blob' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `${project.client_name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-knowledge-base.zip`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-700 text-white text-sm font-semibold rounded-lg hover:bg-purple-800"
                >
                  ↓ Download All ({kbArtifacts.length} files)
                </button>
              )}
            </div>
            {kbArtifacts.length > 0 ? (
              <div className="space-y-3">
                {kbArtifacts.map((artifact) => (
                  <div key={artifact.id} className="bg-white p-4 rounded-lg shadow-sm border">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold text-gray-900">{artifact.title}</h3>
                        <p className="text-sm text-gray-500">{new Date(artifact.created_at).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">MD</span>
                        <button
                          onClick={() => {
                            const blob = new Blob([artifact.content ?? ''], { type: 'text/markdown' });
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = `${artifact.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            URL.revokeObjectURL(url);
                          }}
                          className="text-xs text-purple-600 hover:underline px-2 py-1 border border-purple-200 rounded hover:bg-purple-50"
                        >
                          ↓
                        </button>
                      </div>
                    </div>
                    {artifact.content && (
                      <details className="mt-3">
                        <summary className="text-sm text-purple-600 cursor-pointer hover:underline">View content</summary>
                        <pre className="mt-2 p-3 bg-gray-50 rounded text-xs overflow-auto max-h-72 whitespace-pre-wrap">{artifact.content}</pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No KB files yet. Run KB Builder after the Research Agent completes.</p>
            )}
          </section>
        )}

        {/* Presentation download section */}
        {activeStep === 'presentation' && hasPresentation && (
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Client Presentation</h2>
            <div className="bg-white rounded-xl shadow border border-gray-200 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-gray-900">{(presentationArtifact as any)?.title}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Flow Productions branded PPTX · {new Date((presentationArtifact as any)?.created_at).toLocaleString()}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Open in PowerPoint or Google Slides. All content is editable.
                </p>
              </div>
              <div className="flex-shrink-0 flex gap-3 items-center">
                {runningAgent === 'presentation' ? (
                  <div className="flex items-center gap-2 px-5 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500">
                    <span className="animate-spin inline-block w-4 h-4 border-2 border-gray-300 border-t-purple-600 rounded-full" />
                    Building new version… {runningSeconds}s
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => runAgent('presentation')}
                      disabled={runningAgent !== null}
                      className="px-4 py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 text-sm"
                    >
                      Re-generate
                    </button>
                    <a
                      href={(presentationArtifact as any)?.file_url ?? '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="px-6 py-3 bg-purple-700 text-white font-semibold rounded-lg hover:bg-purple-800 text-sm"
                    >
                      Download PPTX
                    </a>
                  </>
                )}
              </div>
            </div>
          </section>
        )}

        {activeStep === 'presentation' && !hasPresentation && (
          <section>
            <p className="text-gray-500 text-sm">No presentation yet. Run the Presentation Agent after Research and KB Builder complete.</p>
          </section>
        )}

        {/* Content Planner output */}
        {activeStep === 'content' && hasContentPlan && contentPlanJsonArtifact?.content_json && (
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Content Calendar</h2>
            <ContentPlanViewer
              plan={contentPlanJsonArtifact.content_json as ContentPlanJson}
              markdown={contentPlanMdArtifact?.content ?? ''}
              clientName={project.client_name}
            />
          </section>
        )}
        {activeStep === 'content' && !hasContentPlan && (
          <section>
            <p className="text-gray-500 text-sm">No content plan yet. Select channels above and run the Content Planner Agent.</p>
          </section>
        )}

        {/* Jobs log */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Agent Run Log</h2>
          {jobs.length === 0 ? (
            <p className="text-gray-500 text-sm">No agent runs yet.</p>
          ) : (
            <div className="space-y-2">
              {jobs.map((job) => (
                <div key={job.id} className="bg-white p-4 rounded-lg shadow-sm border flex justify-between items-center">
                  <div>
                    <span className="font-semibold text-gray-900">{AGENT_LABELS[job.type] || job.type}</span>
                    <span className={`ml-3 text-xs px-2 py-1 rounded-full ${STATUS_COLORS[job.status] || 'bg-gray-100 text-gray-700'}`}>
                      {job.status}
                    </span>
                    {job.error && <p className="text-xs text-red-600 mt-1">Error: {job.error}</p>}
                  </div>
                  <span className="text-sm text-gray-400">{new Date(job.created_at).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
