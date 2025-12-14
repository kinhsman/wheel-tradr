
import React from 'react';
import { ArrowLeft, Ban, AlertTriangle, Clock, ExternalLink, Info, CheckCircle2 } from 'lucide-react';

interface LeapsDocProps {
  onBack: () => void;
}

export const LeapsDoc: React.FC<LeapsDocProps> = ({ onBack }) => {
  return (
    <div className="max-w-4xl mx-auto animate-fade-in pb-12">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors group"
      >
        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
        Back to Documentation
      </button>

      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">
          <span className="text-neon-pink bg-clip-text text-transparent bg-gradient-to-r from-neon-pink to-purple-500">LEAPS</span> Entry Criteria
        </h1>
        <p className="text-xl text-slate-400 italic">
          Use this checklist before considering any LEAPS trade.
        </p>
      </div>

      {/* Intro Box */}
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-6 mb-12 flex gap-4 backdrop-blur-sm">
        <Info className="text-neon-blue shrink-0 mt-1" size={24} />
        <div>
          <h3 className="text-lg font-bold text-neon-blue mb-2">What is a LEAPS option?</h3>
          <p className="text-slate-300 leading-relaxed text-sm md:text-base">
            LEAPS (Long-Term Equity Anticipation Securities) are standard stock options with much longer expirations—typically 1 to 3 years. They behave more like the underlying stock, provide long‑term exposure with less capital, and experience slower time decay compared to short‑dated options.
          </p>
        </div>
      </div>

      {/* Checklist */}
      <div className="space-y-6 mb-16">
        
        {/* Item 1 */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-neon-pink/30 transition-all hover:bg-white/[0.07] group">
            <h3 className="text-xl font-bold text-slate-100 mb-3 flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-neon-pink/10 text-neon-pink text-sm border border-neon-pink/20 font-mono">1</span>
                Stock Selection
            </h3>
            <div className="ml-11">
                <p className="text-slate-400">
                    Only consider LEAPS on names already vetted and listed in the 
                    <a href="https://docs.google.com/spreadsheets/d/1JLe89TXB7nWWR7Nho6wMS3RvFAiEV3hr/edit?gid=822998282#gid=822998282" target="_blank" rel="noopener noreferrer" className="text-neon-green hover:underline ml-1 inline-flex items-center gap-1 font-semibold">
                        approved stocks list <ExternalLink size={14} />
                    </a>.
                </p>
            </div>
        </div>

        {/* Item 2 */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-neon-pink/30 transition-all hover:bg-white/[0.07] group">
            <h3 className="text-xl font-bold text-slate-100 mb-3 flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-neon-pink/10 text-neon-pink text-sm border border-neon-pink/20 font-mono">2</span>
                Technical Setup
            </h3>
            <div className="ml-11 space-y-3">
                <p className="text-slate-400">Prefer price at or near the <strong className="text-white">lower Bollinger Band</strong> for entry on the daily timeframe.</p>
                <p className="text-slate-400">For high beta stocks (β above 2.2), mid-Bollinger Band entries are acceptable.</p>
                
                <div className="flex items-start gap-3 bg-rose-500/10 border border-rose-500/20 p-3 rounded-lg mt-2">
                    <Ban className="text-rose-400 shrink-0 mt-0.5" size={16} />
                    <span className="text-rose-200 text-sm font-medium">MUST NOT be at the lower Bollinger Band because of bad earnings. If so, DO NOT TRADE.</span>
                </div>
            </div>
        </div>

        {/* Item 3 */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-neon-pink/30 transition-all hover:bg-white/[0.07] group">
            <h3 className="text-xl font-bold text-slate-100 mb-3 flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-neon-pink/10 text-neon-pink text-sm border border-neon-pink/20 font-mono">3</span>
                Market Condition
            </h3>
            <div className="ml-11">
                <p className="text-slate-400">
                    <strong className="text-white">VIX must be 15 or higher</strong> before initiating any new LEAPS position.
                </p>
            </div>
        </div>

        {/* Item 4 */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-neon-pink/30 transition-all hover:bg-white/[0.07] group">
            <h3 className="text-xl font-bold text-slate-100 mb-3 flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-neon-pink/10 text-neon-pink text-sm border border-neon-pink/20 font-mono">4</span>
                Option Duration
            </h3>
            <div className="ml-11 space-y-2">
                <p className="text-slate-400">Buy call options with <strong className="text-white">at least 365 days</strong> until expiration.</p>
                <div className="flex items-center gap-2 text-sm text-slate-500 bg-black/20 w-fit px-3 py-1 rounded-full border border-white/5">
                    <Clock size={14} className="text-neon-pink" /> 
                    <span>Recommendation: 400+ days to be safe.</span>
                </div>
            </div>
        </div>

        {/* Item 5 */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-neon-pink/30 transition-all hover:bg-white/[0.07] group">
            <h3 className="text-xl font-bold text-slate-100 mb-3 flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-neon-pink/10 text-neon-pink text-sm border border-neon-pink/20 font-mono">5</span>
                Strike Selection
            </h3>
            <div className="ml-11">
                <p className="text-slate-400">
                    Choose call options with <strong className="text-white">70+ delta</strong> for stronger correlation to the stock movement.
                </p>
            </div>
        </div>

         {/* Item 6 */}
         <div className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-neon-pink/30 transition-all hover:bg-white/[0.07] group">
            <h3 className="text-xl font-bold text-slate-100 mb-3 flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-neon-pink/10 text-neon-pink text-sm border border-neon-pink/20 font-mono">6</span>
                Position Sizing
            </h3>
            <ul className="ml-11 space-y-2 text-slate-400 list-disc pl-4 marker:text-neon-pink">
                <li>No more than <strong className="text-white">10%</strong> of total portfolio allocated to LEAPS.</li>
                <li>No more than <strong className="text-white">33%</strong> of the LEAPS allocation in any single ticker.</li>
            </ul>
        </div>

        {/* Item 7 */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-neon-pink/30 transition-all hover:bg-white/[0.07] group">
            <h3 className="text-xl font-bold text-slate-100 mb-3 flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-neon-pink/10 text-neon-pink text-sm border border-neon-pink/20 font-mono">7</span>
                Avoid Earnings
            </h3>
            <div className="ml-11 space-y-2">
                <p className="text-slate-400">LEAPS during earnings is a 50/50 gamble. Not worth the risk unless you are committed to holding long term.</p>
                <p className="font-bold text-white flex items-center gap-2">
                    <AlertTriangle size={16} className="text-amber-500" /> Avoid earnings at all costs.
                </p>
            </div>
        </div>
      </div>

      {/* Exit Criteria */}
      <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-8 relative overflow-hidden backdrop-blur-md">
        <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
        <h2 className="text-2xl md:text-3xl font-bold text-amber-500 mb-6 flex items-center gap-3">
            <AlertTriangle size={32} /> EXIT CRITERIA
        </h2>
        <ul className="space-y-4 text-lg text-slate-200">
            <li className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
                    <span><strong className="text-white">10–20% ROI</strong> in 7 days or less</span>
                </div>
                <span className="hidden sm:inline text-slate-500">→</span>
                <span className="text-amber-300 font-bold border border-amber-500/30 bg-amber-500/10 px-3 py-0.5 rounded text-sm uppercase tracking-wide w-fit">Exit Trade</span>
            </li>
            <li className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                 <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
                    <span><strong className="text-white">20–40% ROI</strong> in 4 weeks or less</span>
                </div>
                <span className="hidden sm:inline text-slate-500">→</span>
                <span className="text-amber-300 font-bold border border-amber-500/30 bg-amber-500/10 px-3 py-0.5 rounded text-sm uppercase tracking-wide w-fit">Exit Trade</span>
            </li>
            <li className="flex items-center gap-3">
                 <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
                <span>Manage before <strong className="text-white">90 days</strong> until expiration if planning to hold longer.</span>
            </li>
        </ul>
      </div>

      {/* Footer */}
      <div className="mt-12 pt-8 border-t border-white/10 text-center">
        <p className="text-xl md:text-2xl font-bold text-neon-green tracking-wide drop-shadow-sm">
            Stay disciplined. Stick to the criteria. No FOMO.
        </p>
      </div>
    </div>
  );
};
