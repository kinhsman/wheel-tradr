
import React from 'react';
import { ArrowLeft, Activity, ExternalLink, Info, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

interface VixDocProps {
  onBack: () => void;
}

export const VixDoc: React.FC<VixDocProps> = ({ onBack }) => {
  return (
    <div className="max-w-7xl mx-auto animate-fade-in pb-12">
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
          <span className="text-neon-purple bg-clip-text text-transparent bg-gradient-to-r from-neon-purple to-indigo-500">VIX</span> Investment Strategy
        </h1>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto">
          A dynamic capital allocation framework based on the CBOE Volatility Index (VIX) to optimize portfolio drag and capitalize on market fear.
        </p>

        <a 
            href="https://www.tradingview.com/chart/?symbol=CBOE%3AVIX" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-6 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-full shadow-lg shadow-blue-500/20 transition-all hover:scale-105"
        >
            <Activity size={18} /> View Live VIX Chart
        </a>
      </div>

      {/* Explanation Box */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-12 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-neon-purple"></div>
          <div className="flex flex-col md:flex-row gap-6">
              <div className="shrink-0">
                  <div className="p-3 bg-neon-purple/10 rounded-xl text-neon-purple">
                      <Info size={24} />
                  </div>
              </div>
              <div>
                  <h3 className="text-xl font-bold text-white mb-2">Why does this model work?</h3>
                  <p className="text-slate-300 leading-relaxed text-sm md:text-base mb-3">
                      The VIX is often called the "Fear Gauge". It measures the market's expectation of near-term volatility. 
                      Markets tend to be cyclical: periods of high complacency (low VIX) are often followed by corrections, and periods of extreme fear (high VIX) often mark bottoms.
                  </p>
                  <p className="text-slate-300 leading-relaxed text-sm md:text-base">
                      By holding more cash when volatility is low (stocks are expensive) and aggressively deploying cash when volatility is high (stocks are on sale), 
                      you naturally <strong>buy low and sell high</strong>, reducing drawdown risk while maximizing upside potential.
                  </p>
              </div>
          </div>
      </div>

      {/* Grid Container for the 6 levels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">

        {/* Level 1 */}
        <VixCard 
            level={1} range="≤ 12" label="Extreme Greed" 
            cashRange="40–50%" investedRange="50–60%"
            color="bg-emerald-500" borderColor="border-emerald-500" textColor="text-emerald-400"
            note="Time to be cautious. Stocks are likely overextended."
        />

        {/* Level 2 */}
        <VixCard 
            level={2} range="12–15" label="Greed" 
            cashRange="30–40%" investedRange="60–70%"
            color="bg-green-400" borderColor="border-green-400" textColor="text-green-400"
            note="Maintaining elevated cash exposure."
        />

        {/* Level 3 */}
        <VixCard 
            level={3} range="15–20" label="Slight Fear" 
            cashRange="20–25%" investedRange="75–80%"
            color="bg-amber-400" borderColor="border-amber-400" textColor="text-amber-400"
            note="The 'normal' range; historically bullish."
        />

        {/* Level 4 */}
        <VixCard 
            level={4} range="20–25" label="Fear" 
            cashRange="10–15%" investedRange="85–90%"
            color="bg-orange-400" borderColor="border-orange-400" textColor="text-orange-400"
            note="Anxiety setting in. Deploy cash into quality names."
        />

        {/* Level 5 */}
        <VixCard 
            level={5} range="25–30" label="Very Fearful" 
            cashRange="5–10%" investedRange="90–95%"
            color="bg-rose-400" borderColor="border-rose-400" textColor="text-rose-400"
            note="Deep value territory. Almost fully invested."
        />

        {/* Level 6 */}
        <VixCard 
            level={6} range="≥ 30" label="Extreme Fear" 
            cashRange="0–5%" investedRange="95–100%"
            color="bg-red-600" borderColor="border-red-600" textColor="text-red-500"
            note="Generational buying opportunity."
            alert="Action: New Cash Added To Brokerage"
        />

      </div>

      <div className="mt-12 text-center text-slate-500 text-sm">
        <p>This strategy uses the VIX level as a contrarian indicator: sell into greed (low VIX) and buy into fear (high VIX).</p>
      </div>
    </div>
  );
};

interface VixCardProps {
    level: number;
    range: string;
    label: string;
    cashRange: string;
    investedRange: string;
    color: string;
    borderColor: string;
    textColor: string;
    note: string;
    alert?: string;
}

const VixCard: React.FC<VixCardProps> = ({ level, range, label, cashRange, investedRange, color, borderColor, textColor, note, alert }) => {
    // Parse percentages for the bar width (simplified logic)
    const cashPercent = parseInt(cashRange.split('–')[0]);
    const investedPercent = 100 - cashPercent;

    return (
        <div className={`bg-white/5 backdrop-blur-md border-t-4 ${borderColor} rounded-xl p-6 shadow-xl hover:bg-white/[0.07] transition-all duration-300 group`}>
            <div className="flex justify-between items-start mb-4">
                <div>
                    <div className="text-3xl font-extrabold text-slate-500/50 mb-1">Level {level}</div>
                    <h2 className="text-2xl font-bold text-white">VIX {range}</h2>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-black ${color} shadow-lg shadow-${color}/20`}>
                    {label}
                </span>
            </div>

            <div className="mt-6 mb-2">
                {/* Bar Visualization */}
                <div className="flex w-full h-3 rounded-full overflow-hidden bg-black/50 mb-3 border border-white/5">
                    {/* Cash Part */}
                    <div 
                        className="h-full bg-slate-500 transition-all duration-1000 group-hover:bg-slate-400" 
                        style={{ width: `${cashPercent}%` }} 
                        title="Cash"
                    ></div>
                    {/* Invested Part */}
                    <div 
                        className={`h-full ${color} transition-all duration-1000 shadow-[0_0_10px_rgba(0,0,0,0.5)]`} 
                        style={{ width: `${investedPercent}%` }} 
                        title="Invested"
                    ></div>
                </div>
                
                {/* Labels */}
                <div className="flex justify-between text-sm font-bold font-mono">
                    <div className="flex flex-col">
                        <span className="text-slate-400 text-[10px] uppercase">Cash</span>
                        <span className="text-slate-200">{cashRange}</span>
                    </div>
                    <div className="flex flex-col text-right">
                        <span className="text-slate-400 text-[10px] uppercase">Invested</span>
                        <span className={textColor}>{investedRange}</span>
                    </div>
                </div>
            </div>

            <hr className="border-white/10 my-4" />
            
            <p className="text-xs text-slate-400 italic text-right">{note}</p>
            {alert && (
                <p className="text-xs font-bold text-red-400 mt-2 text-right flex items-center justify-end gap-1 animate-pulse">
                    <AlertTriangle size={12} /> {alert}
                </p>
            )}
        </div>
    );
};
