
import React from 'react';
import { TrendingUp, PieChart, Target, Ban, CalendarClock, Activity, ShieldCheck, CheckCircle2, XCircle, ArrowLeft, ArrowRight } from 'lucide-react';

interface PrinciplesDocProps {
  onBack: () => void;
}

export const PrinciplesDoc: React.FC<PrinciplesDocProps> = ({ onBack }) => {
  return (
    <div className="max-w-7xl mx-auto animate-fade-in pb-12">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors group"
      >
        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
        Back to Documentation
      </button>

      {/* Hero Section */}
      <div className="text-center py-8 md:py-12 mb-12">
        <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-6 tracking-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-neon-blue to-neon-green">
                Disciplined
            </span> Trading
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-xl text-slate-400 leading-relaxed">
            A core set of principles for selling puts and managing risk. 
            Prioritize capital preservation over quick gains.
        </p>
      </div>

      {/* Core Principles Grid */}
      <div className="mb-16">
        <h2 className="text-2xl font-bold text-slate-100 mb-8 flex items-center gap-3">
             <div className="h-8 w-1 bg-neon-blue rounded-full"></div>
             Core Principles
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <PrincipleCard 
                icon={TrendingUp} color="text-neon-blue" bg="bg-blue-500/10" border="border-blue-500/20"
                title="Only Sell Puts on Stocks You Truly Believe In"
            >
                <ul className="space-y-3 text-slate-400 text-sm leading-relaxed">
                    <li className="flex items-start gap-2">
                        <span className="text-neon-blue mt-1">•</span>
                        <span>Choose stocks you <strong className="text-slate-200">don’t mind owning</strong>.</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-neon-blue mt-1">•</span>
                        <span><strong className="text-slate-200">Must have:</strong> Upward-trending chart, strong fundamentals (positive earnings, low PE), and rich/liquid options.</span>
                    </li>
                </ul>
            </PrincipleCard>

            <PrincipleCard 
                icon={PieChart} color="text-neon-purple" bg="bg-purple-500/10" border="border-purple-500/20"
                title="Keep LEAPS Exposure Under 10%"
            >
                <div className="space-y-3 text-slate-400 text-sm leading-relaxed">
                    <p>Your portfolio should <strong className="text-slate-200">never exceed 10%</strong> in LEAPS options.</p>
                    <div className="flex items-start gap-2 bg-white/5 p-3 rounded-lg border border-white/5 mt-2">
                        <ArrowRight size={16} className="text-neon-purple mt-0.5 shrink-0" />
                        <span>Goal: Efficient capital multiplication + monthly income.</span>
                    </div>
                </div>
            </PrincipleCard>

            <PrincipleCard 
                icon={Target} color="text-neon-yellow" bg="bg-amber-500/10" border="border-amber-500/20"
                title="Don’t Chase Premium"
            >
                <div className="space-y-3 text-slate-400 text-sm leading-relaxed">
                    <p>Never sell options <em className="text-slate-300">just</em> for income.</p>
                    <p className="text-neon-yellow/80 text-xs font-bold uppercase tracking-wide mt-2">👉 The setup must be solid — always refer back to Rule #1.</p>
                </div>
            </PrincipleCard>

            <PrincipleCard 
                icon={Ban} color="text-danger" bg="bg-rose-500/10" border="border-rose-500/20"
                title="Avoid Selling Options on Leveraged ETFs"
            >
                <div className="space-y-3 text-slate-400 text-sm leading-relaxed">
                    <p className="font-bold text-rose-400">❌ No NVDL, TQQQ, MSTX, etc.</p>
                    <p>If assigned, <strong className="text-slate-200">theta decay hurts you</strong>. These products are meant for short-term trading only.</p>
                </div>
            </PrincipleCard>

            <PrincipleCard 
                icon={CalendarClock} color="text-cyan-400" bg="bg-cyan-500/10" border="border-cyan-500/20"
                title="Manage Positions Early"
            >
                <div className="space-y-3 text-slate-400 text-sm leading-relaxed">
                    <p>To avoid assignment or when trading vertical spreads:</p>
                    <p className="font-bold text-cyan-300">📅 Manage ideally by Monday of expiration week (or earlier).</p>
                </div>
            </PrincipleCard>

            <PrincipleCard 
                icon={Activity} color="text-orange-400" bg="bg-orange-500/10" border="border-orange-500/20"
                title="Respect VIX Levels"
            >
                <ul className="space-y-3 text-slate-400 text-sm leading-relaxed">
                    <li className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                        <span>VIX <strong className="text-slate-200">18–20</strong> = Gray Zone</span>
                    </li>
                    <li className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                        <span>Wait for <strong className="text-slate-200">break above 21</strong> before deploying remaining capital.</span>
                    </li>
                </ul>
            </PrincipleCard>

            <PrincipleCard 
                icon={ShieldCheck} color="text-neon-green" bg="bg-emerald-500/10" border="border-emerald-500/20"
                title="Avoid Margin — Use Cash Secured"
            >
                <div className="space-y-3 text-slate-400 text-sm leading-relaxed">
                    <p>Margin is <strong className="text-slate-200">not recommended</strong>. Cash-secured keeps you safe during volatile spikes.</p>
                    <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-lg text-xs text-rose-300 mt-2">
                        ⚠️ Lesson learned: A $100k loss on margin during the 2020 COVID crash.
                    </div>
                </div>
            </PrincipleCard>
        </div>
      </div>

      {/* Do's and Don'ts Section */}
      <div className="bg-white/5 rounded-3xl p-8 md:p-12 border border-white/5 shadow-2xl">
         <h2 className="text-3xl font-bold text-white mb-10 text-center">The Trader's Checklist</h2>
         
         <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
            
            {/* Do's */}
            <div className="bg-obsidian/50 rounded-2xl p-8 border border-emerald-500/20 shadow-lg relative overflow-hidden group hover:border-emerald-500/40 transition-colors">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neon-green to-emerald-600"></div>
                <div className="flex items-center gap-3 mb-6">
                    <CheckCircle2 className="w-8 h-8 text-neon-green" />
                    <h3 className="text-2xl font-bold text-white">The Do's</h3>
                </div>
                <ul className="space-y-4">
                    {[
                        "Sell puts only on fundamentally strong, upward-trending stocks.",
                        "Keep LEAPS exposure small (≤10%).",
                        "Manage your positions proactively.",
                        "Stay patient and wait for favorable VIX conditions.",
                        "Prioritize safety by using cash-secured strategies."
                    ].map((item, i) => (
                        <li key={i} className="flex items-start gap-3 text-slate-300 text-sm">
                            <CheckCircle2 className="w-5 h-5 text-neon-green/50 mt-0.5 shrink-0" />
                            <span>{item}</span>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Don'ts */}
            <div className="bg-obsidian/50 rounded-2xl p-8 border border-rose-500/20 shadow-lg relative overflow-hidden group hover:border-rose-500/40 transition-colors">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-danger to-rose-600"></div>
                <div className="flex items-center gap-3 mb-6">
                    <XCircle className="w-8 h-8 text-danger" />
                    <h3 className="text-2xl font-bold text-white">The Don'ts</h3>
                </div>
                <ul className="space-y-4">
                     {[
                        "Don’t chase premium without a proper setup.",
                        "Don’t sell options on leveraged ETFs or leveraged stocks.",
                        "Don’t rely on margin — avoid unnecessary risk.",
                        "Don’t deploy capital in a low-VIX, uncertain environment."
                    ].map((item, i) => (
                        <li key={i} className="flex items-start gap-3 text-slate-300 text-sm">
                            <XCircle className="w-5 h-5 text-danger/50 mt-0.5 shrink-0" />
                            <span>{item}</span>
                        </li>
                    ))}
                </ul>
            </div>
         </div>
      </div>
    </div>
  );
};

const PrincipleCard = ({ icon: Icon, color, bg, border, title, children }: any) => (
    <div className={`bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:bg-white/[0.07] group ${border} hover:border-opacity-50`}>
        <div className="flex items-center gap-4 mb-4">
            <div className={`p-3 rounded-xl ${bg} ${color} transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                <Icon size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-100 leading-tight group-hover:text-white transition-colors">{title}</h3>
        </div>
        <div>
            {children}
        </div>
    </div>
);
