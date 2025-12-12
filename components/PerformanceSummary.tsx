
import React, { useState, useMemo } from 'react';
import { Trade, TradeStatus, StrategyType } from '../types';
import { Search, Calendar, ChevronDown, Info } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface PerformanceSummaryProps {
  trades: Trade[];
}

type DateRangeOption = 'today' | 'current_month' | 'last_3_months' | 'last_6_months' | 'prev_year' | 'custom';

export const PerformanceSummary: React.FC<PerformanceSummaryProps> = ({ trades }) => {
  const [dateRange, setDateRange] = useState<DateRangeOption>('current_month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [symbolFilter, setSymbolFilter] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const ranges: {label: string, value: DateRangeOption}[] = [
    { label: 'Today', value: 'today' },
    { label: 'Current month', value: 'current_month' },
    { label: 'Last 3 months', value: 'last_3_months' },
    { label: 'Last 6 months', value: 'last_6_months' },
    { label: 'Previous calendar year', value: 'prev_year' },
    { label: 'Custom date range', value: 'custom' },
  ];

  const handleRangeSelect = (value: DateRangeOption) => {
    setDateRange(value);
    setIsDropdownOpen(false);
  };

  const { filteredTrades, startDate, endDate } = useMemo(() => {
    const now = new Date();
    let start = new Date();
    let end = new Date();
    
    // Reset hours for accurate daily comparison
    start.setHours(0,0,0,0);
    end.setHours(23,59,59,999);

    switch (dateRange) {
      case 'today':
        break; // start/end are already today
      case 'current_month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'last_3_months':
        start = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        break;
      case 'last_6_months':
        start = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        break;
      case 'prev_year':
        start = new Date(now.getFullYear() - 1, 0, 1);
        end = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
        break;
      case 'custom':
        if (customStart) start = new Date(customStart);
        if (customEnd) end = new Date(customEnd);
        end.setHours(23,59,59,999);
        break;
    }

    const filtered = trades.filter(t => {
      // Must be closed or assigned/expired to have realized PnL
      if (t.status === TradeStatus.OPEN || !t.closeDate) return false;
      
      const closeDate = new Date(t.closeDate);
      const inDateRange = closeDate >= start && closeDate <= end;
      const matchesSymbol = !symbolFilter || t.ticker.includes(symbolFilter.toUpperCase());
      
      return inDateRange && matchesSymbol;
    });

    return { filteredTrades: filtered, startDate: start, endDate: end };
  }, [trades, dateRange, customStart, customEnd, symbolFilter]);

  const stats = useMemo(() => {
    let longTermGains = 0;
    let shortTermGains = 0;
    let longTermLosses = 0;
    let shortTermLosses = 0;
    
    let totalGL = 0;
    let totalCollateral = 0;

    filteredTrades.forEach(t => {
        const pnl = t.pnl || 0;
        const entry = new Date(t.entryDate);
        const exit = new Date(t.closeDate!);
        const heldDays = (exit.getTime() - entry.getTime()) / (1000 * 60 * 60 * 24);
        const isLongTerm = heldDays > 365;

        // Metric 1: Total G/L
        totalGL += pnl;

        // Gain/Loss buckets
        if (pnl >= 0) {
            if (isLongTerm) longTermGains += pnl;
            else shortTermGains += pnl;
        } else {
            if (isLongTerm) longTermLosses += pnl;
            else shortTermLosses += pnl;
        }

        // Metric 2: Total Collateral Calculation
        // Calculate collateral/cost basis used for this trade
        let tradeCollateral = 0;
        if (t.strategy === StrategyType.CSP) {
            tradeCollateral = t.strikePrice * t.contracts * 100;
        } else if (t.strategy === StrategyType.CC) {
            // For CC, collateral is the underlying shares. Using entry price or strike as proxy for cost basis.
            tradeCollateral = (t.underlyingPrice > 0 ? t.underlyingPrice : t.strikePrice) * t.contracts * 100;
        } else if (t.strategy === StrategyType.STOCK_BUY) {
            // For Stock Buy, collateral is the purchase price (cost basis)
            tradeCollateral = (t.underlyingPrice > 0 ? t.underlyingPrice : t.premium) * t.contracts * 100;
        } else if (t.strategy === StrategyType.LEAPS) {
            // For LEAPS, collateral is the premium paid
            tradeCollateral = t.premium * t.contracts * 100;
        } else {
            // Fallback for other strategies like PCS (assuming width or strike as max risk/collateral)
            // Using strike as a safe fallback for unknown spreads to avoid zero division
            tradeCollateral = t.strikePrice * t.contracts * 100;
        }
        
        totalCollateral += tradeCollateral;
    });

    const totalGains = longTermGains + shortTermGains;
    const totalLosses = longTermLosses + shortTermLosses;
    const netGain = totalGL;
    
    // Metric 3: Net Gain % (Return on Collateral)
    const returnPercentage = totalCollateral > 0 ? (totalGL / totalCollateral) * 100 : 0;
    
    // Win/Loss Ratio for Gauge
    const totalVolume = totalGains + Math.abs(totalLosses);
    const ratio = totalVolume > 0 ? (totalGains / totalVolume) * 100 : 0;

    return {
        longTerm: longTermGains + longTermLosses,
        shortTerm: shortTermGains + shortTermLosses,
        longTermGains, longTermLosses,
        shortTermGains, shortTermLosses,
        totalGains, totalLosses, netGain,
        totalGL, totalCollateral, returnPercentage,
        ratio
    };
  }, [filteredTrades]);

  // Gauge Data
  const gaugeData = [
    { name: 'Gains', value: stats.ratio },
    { name: 'Losses', value: 100 - stats.ratio }
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/5 p-6 shadow-xl">
         {/* Filter Header */}
         <div className="flex flex-col md:flex-row gap-4 mb-8">
             <div className="relative min-w-[240px]">
                 <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Date range</label>
                 <button 
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-full flex items-center justify-between bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white hover:border-white/20 transition-all"
                 >
                     <span className="flex items-center gap-2">
                        {dateRange === 'custom' ? 'Custom date range' : ranges.find(r => r.value === dateRange)?.label}
                     </span>
                     <ChevronDown size={16} className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                 </button>
                 
                 {isDropdownOpen && (
                     <div className="absolute top-full left-0 right-0 mt-2 bg-obsidian border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden animate-scale-in">
                         {ranges.map(range => (
                             <button
                                key={range.value}
                                onClick={() => handleRangeSelect(range.value)}
                                className={`w-full text-left px-4 py-3 text-sm hover:bg-white/5 transition-colors flex items-center gap-2 ${dateRange === range.value ? 'text-neon-blue font-bold bg-white/5' : 'text-slate-300'}`}
                             >
                                 {dateRange === range.value && <div className="w-1.5 h-1.5 rounded-full bg-neon-blue" />}
                                 {range.label}
                             </button>
                         ))}
                     </div>
                 )}
             </div>

             <div className="flex-1">
                 <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Symbol (Optional)</label>
                 <div className="relative">
                     <Search size={16} className="absolute left-3 top-3 text-slate-500" />
                     <input 
                        type="text" 
                        value={symbolFilter}
                        onChange={(e) => setSymbolFilter(e.target.value)}
                        className="w-full bg-black/30 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:border-neon-blue focus:ring-1 focus:ring-neon-blue focus:outline-none transition-all"
                     />
                 </div>
             </div>
             
             <div className="flex items-end">
                <button className="bg-white/10 hover:bg-white/20 text-white px-6 py-2.5 rounded-xl font-bold transition-colors text-sm border border-white/5">
                    Search
                </button>
             </div>
         </div>
         
         {dateRange === 'custom' && (
             <div className="flex gap-4 mb-6 animate-fade-in">
                 <div>
                     <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Start Date</label>
                     <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />
                 </div>
                 <div>
                     <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">End Date</label>
                     <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />
                 </div>
             </div>
         )}

         {/* Summary Content */}
         <div className="border-t border-white/10 pt-8">
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
                 {/* Column 1: Reporting Period Info & Metrics */}
                 <div className="space-y-6">
                     <div>
                        <h3 className="text-sm font-bold text-slate-200 mb-1">Reporting Period</h3>
                        <div className="text-xl md:text-2xl font-light text-white">
                            {startDate.toLocaleDateString()} to {endDate.toLocaleDateString()}
                        </div>
                     </div>
                     <div className="space-y-3 pt-4">
                         <div className="flex justify-between text-sm">
                             <span className="text-slate-400">Total G/L</span>
                             <span className={`font-mono font-bold ${stats.totalGL >= 0 ? 'text-neon-green' : 'text-danger'}`}>
                                 {stats.totalGL >= 0 ? '+' : '-'}${Math.abs(stats.totalGL).toLocaleString(undefined, {minimumFractionDigits: 2})}
                             </span>
                         </div>
                         <div className="flex justify-between text-sm">
                             <span className="text-slate-400">Total Collateral</span>
                             <span className="font-mono text-slate-200">${stats.totalCollateral.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                         </div>
                         <div className="flex justify-between text-sm border-t border-white/10 pt-3 mt-1">
                             <span className="text-slate-200 font-bold">Net Gain %</span>
                             <span className={`font-mono font-bold ${stats.returnPercentage >= 0 ? 'text-neon-green' : 'text-danger'}`}>
                                 {stats.returnPercentage >= 0 ? '+' : ''}{stats.returnPercentage.toFixed(2)}%
                             </span>
                         </div>
                     </div>
                 </div>

                 {/* Column 2: Totals & Gauge */}
                 <div className="flex flex-col justify-between lg:border-l border-white/10 lg:pl-12">
                     <div className="flex items-start justify-between mb-4">
                         <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1">Totals <Info size={12} className="text-slate-500"/></h3>
                     </div>
                     
                     <div className="flex flex-row gap-4 items-center">
                         <div className="flex-1 space-y-2 text-sm">
                             <div className="flex justify-between">
                                 <span className="text-slate-400">Total Gains</span>
                                 <span className="text-neon-green font-mono">+{stats.totalGains.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                             </div>
                             <div className="flex justify-between">
                                 <span className="text-slate-400">Total Losses</span>
                                 <span className="text-danger font-mono">{stats.totalLosses.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                             </div>
                             <div className="flex justify-between pt-2 border-t border-white/10 font-bold">
                                 <span className="text-slate-200">Net Gain</span>
                                 <span className={stats.netGain >= 0 ? 'text-neon-green' : 'text-danger'}>
                                     {stats.netGain >= 0 ? '+' : ''}${stats.netGain.toLocaleString(undefined, {minimumFractionDigits: 2})}
                                 </span>
                             </div>
                         </div>
                         
                         {/* Gauge Chart */}
                         <div className="w-32 h-32 relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={gaugeData}
                                        cx="50%"
                                        cy="50%"
                                        startAngle={180}
                                        endAngle={0}
                                        innerRadius={40}
                                        outerRadius={55}
                                        paddingAngle={2}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        <Cell fill="#15803d" /> {/* Darker green base */}
                                        <Cell fill="#b91c1c" /> {/* Darker red base */}
                                    </Pie>
                                    {/* Overlay active bright colors based on ratio */}
                                    <Pie
                                        data={[{ value: stats.ratio }, { value: 100 - stats.ratio }]}
                                        cx="50%"
                                        cy="50%"
                                        startAngle={180}
                                        endAngle={0}
                                        innerRadius={40}
                                        outerRadius={55}
                                        paddingAngle={0}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        <Cell fill="#22c55e" /> {/* Neon Green */}
                                        <Cell fill="#ef4444" /> {/* Red */}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pt-8">
                                <span className="text-[10px] text-slate-400 uppercase tracking-tighter">Gain/Loss Ratio</span>
                                <span className="text-lg font-mono text-white">{stats.ratio.toFixed(2)}%</span>
                            </div>
                         </div>
                     </div>
                 </div>
             </div>
         </div>
      </div>
    </div>
  );
};
