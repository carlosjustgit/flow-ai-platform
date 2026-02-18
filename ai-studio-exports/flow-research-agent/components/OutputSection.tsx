import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Copy, Check, Download, FileJson, LayoutDashboard, Target, Users, TrendingUp, ShieldAlert, Swords, Lightbulb } from 'lucide-react';
import { ResearchResponse } from '../types';

interface OutputSectionProps {
  data: ResearchResponse;
}

type TabType = 'overview' | 'swot' | 'lean' | 'competitors' | 'strategy' | 'json';

export const OutputSection: React.FC<OutputSectionProps> = ({ data }) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [copied, setCopied] = useState(false);

  const pack = data.research_foundation_pack_json;

  const handleCopy = async () => {
    const textToCopy =
      activeTab === 'json'
        ? JSON.stringify(data.research_foundation_pack_json, null, 2)
        : data.research_foundation_pack_markdown;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy!', err);
    }
  };

  const handleDownload = () => {
    const content = JSON.stringify(data.research_foundation_pack_json, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `research-pack.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const TabButton = ({ id, label, icon: Icon }: { id: TabType; label: string; icon: any }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
        activeTab === id
          ? 'border-flow-purple text-flow-purple bg-flow-purple/5'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden flex flex-col min-h-[700px]">
      {/* Header Toolbar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
        <h3 className="font-bold text-lg text-flow-charcoal">Research Findings</h3>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-flow-charcoal rounded hover:bg-black transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Download JSON
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex overflow-x-auto border-b border-gray-200 bg-white px-2">
        <TabButton id="overview" label="Overview" icon={LayoutDashboard} />
        <TabButton id="swot" label="SWOT Analysis" icon={ShieldAlert} />
        <TabButton id="lean" label="Lean Canvas" icon={Target} />
        <TabButton id="competitors" label="Competitors" icon={Swords} />
        <TabButton id="strategy" label="Strategy & Campaign" icon={TrendingUp} />
        <TabButton id="json" label="Raw Data" icon={FileJson} />
      </div>

      {/* Content Area */}
      <div className="flex-grow p-6 bg-[#f8f9fa] overflow-y-auto">
        
        {/* VIEW: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
            <div className="bg-white p-8 rounded-lg border border-gray-200 shadow-sm">
                <h2 className="text-2xl font-bold text-flow-purple mb-6">Executive Summary</h2>
                <div className="prose prose-sm max-w-none text-gray-700">
                    <ReactMarkdown>{data.research_foundation_pack_markdown}</ReactMarkdown>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Users className="w-5 h-5 text-flow-purple" />
                        Target Audience Pains
                    </h3>
                    <ul className="space-y-2">
                        {pack.market_and_audience_insights.customer_pains.map((pain, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                                <span className="text-red-500 mt-1">•</span>
                                {pain}
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Lightbulb className="w-5 h-5 text-flow-yellow text-yellow-600" />
                        Key Opportunities
                    </h3>
                    <ul className="space-y-2">
                        {pack.swot.opportunities.map((opp, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                                <span className="text-green-500 mt-1">•</span>
                                {opp}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
          </div>
        )}

        {/* VIEW: SWOT */}
        {activeTab === 'swot' && (
           <div className="max-w-6xl mx-auto animate-fade-in">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Strengths */}
                <div className="bg-white p-6 rounded-lg border-t-4 border-green-500 shadow-sm">
                    <h3 className="font-bold text-lg text-gray-900 mb-4 uppercase tracking-wider">Strengths</h3>
                    <ul className="space-y-3">
                        {pack.swot.strengths.map((item, i) => (
                            <li key={i} className="flex gap-3 text-sm text-gray-700">
                                <span className="font-bold text-green-500">✓</span> {item}
                            </li>
                        ))}
                    </ul>
                </div>
                {/* Weaknesses */}
                <div className="bg-white p-6 rounded-lg border-t-4 border-orange-400 shadow-sm">
                    <h3 className="font-bold text-lg text-gray-900 mb-4 uppercase tracking-wider">Weaknesses</h3>
                    <ul className="space-y-3">
                        {pack.swot.weaknesses.map((item, i) => (
                            <li key={i} className="flex gap-3 text-sm text-gray-700">
                                <span className="font-bold text-orange-400">!</span> {item}
                            </li>
                        ))}
                    </ul>
                </div>
                {/* Opportunities */}
                <div className="bg-white p-6 rounded-lg border-t-4 border-blue-500 shadow-sm">
                    <h3 className="font-bold text-lg text-gray-900 mb-4 uppercase tracking-wider">Opportunities</h3>
                    <ul className="space-y-3">
                        {pack.swot.opportunities.map((item, i) => (
                            <li key={i} className="flex gap-3 text-sm text-gray-700">
                                <span className="font-bold text-blue-500">↗</span> {item}
                            </li>
                        ))}
                    </ul>
                </div>
                {/* Threats */}
                <div className="bg-white p-6 rounded-lg border-t-4 border-red-500 shadow-sm">
                    <h3 className="font-bold text-lg text-gray-900 mb-4 uppercase tracking-wider">Threats</h3>
                    <ul className="space-y-3">
                        {pack.swot.threats.map((item, i) => (
                            <li key={i} className="flex gap-3 text-sm text-gray-700">
                                <span className="font-bold text-red-500">×</span> {item}
                            </li>
                        ))}
                    </ul>
                </div>
             </div>
           </div>
        )}

        {/* VIEW: LEAN CANVAS */}
        {activeTab === 'lean' && (
            <div className="max-w-7xl mx-auto overflow-x-auto animate-fade-in">
                <div className="bg-white rounded border border-gray-300 min-w-[1000px] grid grid-cols-5 grid-rows-3 text-sm">
                    {/* Row 1 */}
                    <div className="col-span-1 row-span-2 p-4 border-r border-b border-gray-300">
                        <h4 className="font-bold text-gray-500 uppercase text-xs mb-2">Problem</h4>
                        <p className="whitespace-pre-line text-gray-800">{pack.lean_canvas.problem}</p>
                    </div>
                    <div className="col-span-1 row-span-1 p-4 border-r border-b border-gray-300">
                        <h4 className="font-bold text-gray-500 uppercase text-xs mb-2">Solution</h4>
                        <p className="whitespace-pre-line text-gray-800">{pack.lean_canvas.solution}</p>
                    </div>
                    <div className="col-span-1 row-span-2 p-4 border-r border-b border-gray-300 bg-purple-50">
                        <h4 className="font-bold text-flow-purple uppercase text-xs mb-2">Unique Value Prop</h4>
                        <p className="whitespace-pre-line text-gray-800 font-medium">{pack.lean_canvas.unique_value_proposition}</p>
                    </div>
                    <div className="col-span-1 row-span-1 p-4 border-r border-b border-gray-300">
                        <h4 className="font-bold text-gray-500 uppercase text-xs mb-2">Unfair Advantage</h4>
                        <p className="whitespace-pre-line text-gray-800">{pack.lean_canvas.unfair_advantage}</p>
                    </div>
                    <div className="col-span-1 row-span-2 p-4 border-b border-gray-300">
                        <h4 className="font-bold text-gray-500 uppercase text-xs mb-2">Customer Segments</h4>
                        <p className="whitespace-pre-line text-gray-800">{pack.lean_canvas.customer_segments}</p>
                    </div>

                    {/* Row 1.5 (Middle fillers) */}
                    <div className="col-span-1 row-span-1 col-start-2 row-start-2 p-4 border-r border-b border-gray-300">
                        <h4 className="font-bold text-gray-500 uppercase text-xs mb-2">Key Metrics</h4>
                        <p className="whitespace-pre-line text-gray-800">{pack.lean_canvas.key_metrics}</p>
                    </div>
                    <div className="col-span-1 row-span-1 col-start-4 row-start-2 p-4 border-r border-b border-gray-300">
                        <h4 className="font-bold text-gray-500 uppercase text-xs mb-2">Channels</h4>
                        <p className="whitespace-pre-line text-gray-800">{pack.lean_canvas.channels}</p>
                    </div>

                    {/* Row 2 (Bottom) */}
                    <div className="col-span-2.5 p-4 border-r border-gray-300">
                         <h4 className="font-bold text-gray-500 uppercase text-xs mb-2">Cost Structure</h4>
                         <p className="whitespace-pre-line text-gray-800">{pack.lean_canvas.cost_structure}</p>
                    </div>
                     <div className="col-span-2.5 col-start-3 p-4">
                         <h4 className="font-bold text-gray-500 uppercase text-xs mb-2">Revenue Streams</h4>
                         <p className="whitespace-pre-line text-gray-800">{pack.lean_canvas.revenue_streams}</p>
                    </div>
                </div>
            </div>
        )}

        {/* VIEW: COMPETITORS */}
        {activeTab === 'competitors' && (
            <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
                <div className="grid gap-6">
                    {pack.competitor_landscape.competitors.map((comp, idx) => (
                        <div key={idx} className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-xl font-bold text-flow-purple">{comp.name}</h3>
                                    <a href={comp.website} target="_blank" rel="noreferrer" className="text-sm text-gray-500 hover:underline">{comp.website}</a>
                                </div>
                                <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-semibold">
                                    Competitor
                                </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase">Positioning</h4>
                                    <p className="text-sm text-gray-800">{comp.positioning_summary}</p>
                                    <h4 className="text-xs font-bold text-gray-500 uppercase mt-4">Target</h4>
                                    <p className="text-sm text-gray-800">{comp.target_customers}</p>
                                </div>
                                <div className="space-y-2">
                                     <h4 className="text-xs font-bold text-gray-500 uppercase">Offers & Pricing</h4>
                                     <p className="text-sm text-gray-800">{comp.offers}</p>
                                     <p className="text-xs text-gray-600 italic">{comp.pricing_notes}</p>
                                </div>
                                <div className="space-y-2 bg-gray-50 p-4 rounded">
                                     <h4 className="text-xs font-bold text-gray-500 uppercase">Flow's Opportunity</h4>
                                     <p className="text-sm text-flow-charcoal font-medium">{comp.differentiation_opportunities}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                
                {pack.competitor_landscape.category_notes && (
                    <div className="bg-yellow-50 border border-yellow-200 p-4 rounded text-sm text-yellow-900">
                        <strong>Category Insight: </strong> {pack.competitor_landscape.category_notes}
                    </div>
                )}
            </div>
        )}

        {/* VIEW: STRATEGY */}
        {activeTab === 'strategy' && (
            <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
                {/* Positioning */}
                <div className="bg-flow-purple text-white p-8 rounded-lg shadow-lg">
                    <h3 className="text-sm font-semibold text-flow-yellow uppercase tracking-wider mb-3">Strategic Positioning</h3>
                    <p className="text-xl md:text-2xl font-serif leading-relaxed">
                        "{pack.campaign_foundations.positioning_statement}"
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Content Themes */}
                    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                        <h3 className="font-bold text-lg text-gray-900 mb-4">Content Themes</h3>
                        <div className="flex flex-wrap gap-2">
                            {pack.campaign_foundations.content_themes.map((theme, i) => (
                                <span key={i} className="px-3 py-1.5 bg-gray-100 text-gray-800 rounded-md text-sm border border-gray-200">
                                    {theme}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Channel Strategy */}
                    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                        <h3 className="font-bold text-lg text-gray-900 mb-4">Channel Mix</h3>
                        <ul className="space-y-3">
                            <li className="flex justify-between items-center text-sm border-b pb-2">
                                <span className="font-semibold text-blue-700">LinkedIn</span>
                                <span className="text-gray-600 text-right w-2/3">{pack.campaign_foundations.suggested_channel_strategy.linkedin}</span>
                            </li>
                            <li className="flex justify-between items-center text-sm border-b pb-2">
                                <span className="font-semibold text-pink-600">Instagram</span>
                                <span className="text-gray-600 text-right w-2/3">{pack.campaign_foundations.suggested_channel_strategy.instagram}</span>
                            </li>
                             <li className="flex justify-between items-center text-sm">
                                <span className="font-semibold text-blue-500">Facebook</span>
                                <span className="text-gray-600 text-right w-2/3">{pack.campaign_foundations.suggested_channel_strategy.facebook}</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* 30 Day Plan */}
                 <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                    <h3 className="font-bold text-lg text-gray-900 mb-4">First 30 Days Action Plan</h3>
                    <div className="space-y-4">
                        {pack.campaign_foundations.first_30_days_plan.map((item, i) => (
                            <div key={i} className="flex gap-4">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-flow-purple text-white flex items-center justify-center font-bold text-sm">
                                    {i + 1}
                                </div>
                                <p className="text-gray-700 text-sm mt-1.5">{item}</p>
                            </div>
                        ))}
                    </div>
                 </div>
            </div>
        )}

        {/* VIEW: JSON */}
        {activeTab === 'json' && (
             <div className="max-w-6xl mx-auto">
                <pre className="font-mono text-xs text-gray-800 whitespace-pre-wrap break-words bg-white p-6 rounded border border-gray-200 shadow-inner">
                  {JSON.stringify(pack, null, 2)}
                </pre>
            </div>
        )}

      </div>
    </div>
  );
};
