
import React, { useMemo } from 'react';
import { Trade, TradeStatus, StrategyType } from '../types';
import { 
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, PieChart, Pie, Cell, Legend, ReferenceLine 
} from 'recharts';
import { TrendingUp, DollarSign, Activity, PieChart as PieIcon, Percent, Target, Edit2, RefreshCw, Layers, Loader2, BarChart2, BarChart3, Settings } from 'lucide-react';

interface DashboardProps {
  trades: Trade[];
  monthlyGoal: number;
  accountValue: number;
  incomeTargetPercent: number;
  tickerPrices: Record<string, number>;
  manualVix: number;
  onEditGoal: () => void;
  onUpdatePrice: (ticker: string, price: number) => void;
  onUpdateVix: (vix: number) => void;
  onRefreshPrices: () => void;
  isRefreshing: boolean;
  hasApiKey: boolean;
  onSettingsClick: () => void;
}

// Updated Softer Palette for Dark Mode (Less Contrast)
const COLORS = ['#38bdf8', '#4ade80', '#f472b6', '#a78bfa', '#facc15', '#fb923c'];
const ASSET_COLORS = { cash: '#4ade80', stock: '#38bdf8', leaps: '#a78bfa' };

// Reusable Spotlight Card Component
const SpotlightCard = ({ children, className = "" }: { children?: React.ReactNode, className?: string }) => {
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { currentTarget: target } = e;
    const rect = target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    target.style.setProperty('--mouse-x', `${x}px`);
    target.style.setProperty('--mouse-y', `${y}px`);
  };

  return (
    <div 
      className={`spotlight-card bg-white/5 backdrop-blur-md border border-white/5 rounded-2xl shadow-xl p-6 transition-all duration-300 hover:border-white/10 ${className}`}
      onMouseMove={handleMouseMove}
    >
        <div className="relative z-10">{children}</div>
    </div>
  );
};

export const Dashboard: React.FC<DashboardProps> = ({ 
  trades, 
  monthlyGoal, 
  accountValue, 
  incomeTargetPercent, 
  tickerPrices, 
  manualVix,
  onEditGoal, 
  onUpdatePrice, 
  onUpdateVix, 
  onRefreshPrices, 
  isRefreshing,
  hasApiKey,
  onSettingsClick
}) => {
  
  const stats = useMemo(() => {
    let totalPnL = 0;
    let wins = 0;
    let losses = 0;
    let totalPremium = 0;
    let openPositions = 0;
    let cashSecured = 0;
    let stockValue = 0;
    let leapsValue = 0;
    let currentMonthIncome = 0;

    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - 11); 
    const cutoffKey = `${cutoffDate.getFullYear()}-${String(cutoffDate.getMonth() + 1).padStart(2, '0')}`;

    const monthlyData: Record<string, number> = {};
    const allocationByTicker: Record<string, number> = {};
    const activeTickers = new Set<string>();

    trades.forEach(t => {
      const currentPrice = tickerPrices[t.ticker] || t.underlyingPrice;

      if (t.status === TradeStatus.OPEN) {
        openPositions++;
        activeTickers.add(t.ticker);
        let exposure = 0;
        if (t.strategy === StrategyType.CSP) {
          const lockedCash = t.strikePrice * t.contracts * 100;
          cashSecured += lockedCash;
          exposure = lockedCash;
        } else if (t.strategy === StrategyType.STOCK_BUY) {
          // Standard Lots
          const shares = t.contracts * 100;
          const value = currentPrice * shares;
          stockValue += value;
          exposure = value;
        } else if (t.strategy === StrategyType.LONG_STOCK) {
          // Direct Shares (Contracts = Shares)
          const value = currentPrice * t.contracts;
          stockValue += value;
          exposure = value;
        } else if (t.strategy === StrategyType.LEAPS) {
          const value = (t.premium || 0) * (t.contracts || 0) * 100;
          leapsValue += value;
          exposure = value;
        }
        if (exposure > 0) {
            allocationByTicker[t.ticker] = (allocationByTicker[t.ticker] || 0) + exposure;
        }
      } else {
        const pnl = t.pnl || 0;
        totalPnL += pnl;
        if (pnl > 0) wins++;
        else if (pnl < 0) losses++;

        if (t.closeDate) {
            const closeMonth = t.closeDate.substring(0, 7);
            if (closeMonth === currentMonthKey) {
                currentMonthIncome += pnl;
            }
        }
      }

      // Premium tracking - exclude stock buys/long stock from "Premium Collected" metric unless they have a weird setup
      if (t.premium && t.strategy !== StrategyType.STOCK_BUY && t.strategy !== StrategyType.LONG_STOCK && t.strategy !== StrategyType.LEAPS) {
        totalPremium += (t.premium * t.contracts * 100);
      }

      const attributionDate = t.closeDate || t.entryDate;
      const monthKey = `${attributionDate.substring(0, 4)}-${attributionDate.substring(5, 7)}`;
      if (t.status !== TradeStatus.OPEN) {
        monthlyData[monthKey] = (monthlyData[monthKey] || 0) + (t.pnl || 0);
      }
    });

    const realizedTrades = trades.filter(t => t.status !== TradeStatus.OPEN && (t.closeDate || t.entryDate));
    realizedTrades.sort((a, b) => {
        const dateA = new Date(a.closeDate || a.entryDate).getTime();
        const dateB = new Date(b.closeDate || b.entryDate).getTime();
        return dateA - dateB;
    });

    let runningPnL = 0;
    const equityCurve = realizedTrades.map(t => {
        runningPnL += (t.pnl || 0);
        return {
            date: t.closeDate || t.entryDate,
            value: runningPnL
        };
    });

    if (equityCurve.length > 0) {
        const firstDate = new Date(equityCurve[0].date);
        firstDate.setDate(firstDate.getDate() - 1);
        equityCurve.unshift({ 
            date: firstDate.toISOString().split('T')[0], 
            value: 0 
        });
    }

    const monthlyChartData = Object.entries(monthlyData)
      .filter(([name]) => name >= cutoffKey)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const allocationData = Object.entries(allocationByTicker)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const assetAllocationData = [
        { name: 'CSP', value: cashSecured },
        { name: 'STOCK', value: stockValue },
        { name: 'LEAPS', value: leapsValue }
    ].filter(d => d.value > 0).sort((a, b) => b.value - a.value);

    const totalClosed = wins + losses;
    const winRate = totalClosed > 0 ? ((wins / totalClosed) * 100).toFixed(1) : '0';

    return {
      totalPnL, winRate, wins, losses, totalPremium, openPositions,
      cashSecured, stockValue, leapsValue, totalDeployed: cashSecured + stockValue + leapsValue,
      equityCurve, monthlyChartData, allocationData, assetAllocationData,
      currentMonthIncome, activeTickers: Array.from(activeTickers).sort()
    };
  }, [trades, tickerPrices]);

  const progressPercent = Math.min(Math.max((stats.currentMonthIncome / Math.max(monthlyGoal, 1)) * 100, 0), 100);

  const getVixAllocation = (vix: number) => {
      let minCash = 0; let maxCash = 0; let stateText = ""; let colorClass = "";
      if (vix <= 12) { minCash = 0.40; maxCash = 0.50; stateText = "Extreme Greed"; colorClass = "text-emerald-400"; } 
      else if (vix <= 15) { minCash = 0.30; maxCash = 0.40; stateText = "Greed"; colorClass = "text-green-400"; } 
      else if (vix <= 20) { minCash = 0.20; maxCash = 0.25; stateText = "Slight Fear"; colorClass = "text-yellow-400"; } 
      else if (vix <= 25) { minCash = 0.10; maxCash = 0.15; stateText = "Fear"; colorClass = "text-orange-400"; } 
      else if (vix <= 30) { minCash = 0.05; maxCash = 0.10; stateText = "Very Fearful"; colorClass = "text-rose-400"; } 
      else { minCash = 0.00; maxCash = 0.05; stateText = "Extreme Fear"; colorClass = "text-red-500 font-bold"; }
      return { minCash, maxCash, stateText, colorClass };
  };

  const vixAlloc = getVixAllocation(manualVix);
  const minCashAmount = accountValue * vixAlloc.minCash;
  const maxCashAmount = accountValue * vixAlloc.maxCash;
  const cashMidpoint = (vixAlloc.minCash + vixAlloc.maxCash) / 2;
  const investedMidpoint = 1 - cashMidpoint;

  const renderLegendText = (value: string) => <span className="text-slate-300 font-medium ml-1 text-xs tracking-wide">{value}</span>;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Card 1: Net P&L */}
        <SpotlightCard className="!bg-white/5 border-white/5">
          <div className="flex items-center justify-between">
            <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider">Total Net P/L</h3>
            <span className={`p-2 rounded-xl ${stats.totalPnL >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
              <DollarSign size={20} />
            </span>
          </div>
          <div className={`text-3xl font-light mt-2 ${stats.totalPnL >= 0 ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]' : 'text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.3)]'}`}>
            ${stats.totalPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-slate-500 mt-2 font-medium text-xs">Realized total return</p>
        </SpotlightCard>

        {/* Card 2: Win Rate */}
        <SpotlightCard className="!bg-white/5 border-white/5">
          <div className="flex items-center justify-between">
            <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider">Win Rate</h3>
            <span className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
              <Percent size={20} />
            </span>
          </div>
          <div className="text-3xl font-light mt-2 text-slate-100 drop-shadow-[0_0_5px_rgba(255,255,255,0.1)]">
            {stats.winRate}%
          </div>
          <p className="text-slate-500 mt-2 font-medium text-xs">{stats.wins} Wins - {stats.losses} Losses</p>
        </SpotlightCard>

        {/* Card 3: Premium */}
        <SpotlightCard className="!bg-white/5 border-white/5">
          <div className="flex items-center justify-between">
            <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider">Total Premium collected</h3>
            <span className="p-2 rounded-xl bg-yellow-500/10 text-yellow-400">
              <Activity size={20} />
            </span>
          </div>
          <div className="text-3xl font-light mt-2 text-slate-100 drop-shadow-[0_0_5px_rgba(255,255,255,0.1)]">
            ${stats.totalPremium.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-slate-500 mt-2 font-medium text-xs">Gross premiums sold</p>
        </SpotlightCard>
      </div>

      {/* Goal Progress Card */}
      <SpotlightCard className="relative overflow-hidden group border-none !bg-white/5 !shadow-xl">
         <div className="relative z-10 flex flex-col md:flex-row justify-between md:items-center gap-4 mb-4">
            <div>
                 <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                    <Target size={20} className="text-yellow-400" /> 
                    Monthly Income Goal
                    <button 
                      onClick={onEditGoal}
                      className="ml-2 p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                    >
                      <Edit2 size={14} />
                    </button>
                 </h3>
                 <p className="text-sm text-slate-400">
                    Target: <span className="text-emerald-400 font-mono">{incomeTargetPercent}%</span> of ${accountValue.toLocaleString()}
                 </p>
            </div>
            <div className="text-right">
                <span className="text-xs text-slate-400 block mb-1 uppercase tracking-wide">Realized Gain (Current Month)</span>
                <span className="text-3xl font-light text-white drop-shadow-md">${stats.currentMonthIncome.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                <span className="text-slate-500 mx-2 text-xl font-thin">/</span>
                <span className="text-xl text-slate-400 font-light">${monthlyGoal.toLocaleString()}</span>
            </div>
         </div>
         
         <div className="w-full bg-black/50 rounded-full h-3 overflow-hidden relative z-10 backdrop-blur-sm border border-white/5">
             <div 
                className={`h-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(52,211,153,0.5)] ${
                    stats.currentMonthIncome >= monthlyGoal ? 'bg-emerald-400' : 'bg-sky-400'
                }`}
                style={{ width: `${progressPercent}%` }}
             ></div>
         </div>
      </SpotlightCard>

      {/* Allocation & Exposure Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <SpotlightCard>
            <h3 className="text-lg font-semibold mb-6 text-slate-200 flex items-center gap-2">
                <BarChart2 size={18} className="text-violet-400" /> VIX-Cash Allocation
            </h3>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-400">Current VIX</label>
                    <input 
                        type="number" 
                        value={manualVix}
                        onChange={(e) => onUpdateVix(parseFloat(e.target.value) || 0)}
                        className="w-20 bg-black/30 border border-white/10 rounded-lg px-2 py-1 text-right text-white focus:border-violet-400 focus:ring-1 focus:ring-violet-400 focus:outline-none font-bold"
                    />
                </div>
                
                <div className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-3">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400">Market State</span>
                        <span className={`font-bold tracking-wide ${vixAlloc.colorClass} drop-shadow-sm`}>{vixAlloc.stateText}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400">Target Cash %</span>
                        <span className="text-white font-mono">{(vixAlloc.minCash * 100).toFixed(0)}% – {(vixAlloc.maxCash * 100).toFixed(0)}%</span>
                    </div>
                </div>

                <div>
                    <div className="text-xs text-slate-400 mb-1 uppercase tracking-wider">Recommended Uninvested Cash</div>
                    <div className="text-xl font-bold text-slate-100">
                        ${minCashAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })} - ${maxCashAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                    
                    <div className="mt-4">
                        <div className="flex h-2 w-full rounded-full overflow-hidden bg-white/10">
                            <div 
                                style={{ width: `${investedMidpoint * 100}%` }} 
                                className="bg-sky-400 h-full shadow-[0_0_10px_rgba(56,189,248,0.4)]"
                            ></div>
                            <div 
                                style={{ width: `${cashMidpoint * 100}%` }} 
                                className="bg-emerald-400 h-full shadow-[0_0_10px_rgba(74,222,128,0.4)]"
                            ></div>
                        </div>
                    </div>
                </div>
            </div>
        </SpotlightCard>

        <SpotlightCard>
            <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2 mb-4">
                <PieIcon size={18} className="text-sky-400" /> Capital Allocation
            </h3>
            
            <div className="bg-white/5 px-4 py-3 rounded-xl border border-white/5 mb-6 flex justify-between items-center">
                 <span className="text-sm text-slate-400">Current Total Value</span>
                 <span className="text-lg font-bold text-emerald-400 font-mono">${stats.totalDeployed.toLocaleString()}</span>
            </div>

            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                    data={stats.assetAllocationData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={6}
                    dataKey="value"
                    stroke="none"
                    >
                        {stats.assetAllocationData.map((entry, index) => {
                            let fill = ASSET_COLORS.cash;
                            if (entry.name === 'STOCK') fill = ASSET_COLORS.stock;
                            if (entry.name === 'LEAPS') fill = ASSET_COLORS.leaps;
                            return <Cell key={`cell-${index}`} fill={fill} style={{ filter: 'drop-shadow(0px 0px 4px rgba(0,0,0,0.5))' }} />;
                        })}
                    </Pie>
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#050505', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)', color: '#fff' }}
                        itemStyle={{ color: '#fff' }}
                        formatter={(value: number) => `$${value.toLocaleString()}`}
                    />
                    <Legend formatter={renderLegendText} wrapperStyle={{ paddingTop: '20px' }} />
                </PieChart>
                </ResponsiveContainer>
            </div>
        </SpotlightCard>

        {stats.allocationData.length > 0 && (
            <SpotlightCard>
                <h3 className="text-lg font-semibold mb-4 text-slate-200 flex items-center gap-2">
                    <Layers size={18} className="text-emerald-400" /> Ticker Exposure
                </h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                        data={stats.allocationData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={6}
                        dataKey="value"
                        stroke="none"
                        >
                        {stats.allocationData.map((entry, index) => {
                            return <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} style={{ filter: 'drop-shadow(0px 0px 4px rgba(0,0,0,0.5))' }} />
                        })}
                        </Pie>
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#050505', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)', color: '#fff' }}
                            itemStyle={{ color: '#fff' }}
                            formatter={(value: number) => `$${value.toLocaleString()}`}
                        />
                        <Legend formatter={renderLegendText} wrapperStyle={{ paddingTop: '20px' }} />
                    </PieChart>
                    </ResponsiveContainer>
                </div>
            </SpotlightCard>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart Area */}
          <div className="lg:col-span-2 space-y-6">
                <SpotlightCard>
                <h3 className="text-lg font-semibold mb-6 text-slate-200 flex items-center gap-2">
                    <TrendingUp size={18} className="text-emerald-400" /> Equity Curve
                </h3>
                <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.equityCurve} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#4ade80" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#4ade80" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                        <XAxis 
                            dataKey="date" 
                            stroke="#64748b" 
                            fontSize={11} 
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(val) => {
                                 const date = new Date(val);
                                 return isNaN(date.getTime()) ? val : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                            }}
                            minTickGap={30}
                        />
                        <YAxis 
                            stroke="#64748b" 
                            fontSize={11} 
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(val) => Math.abs(val) >= 1000 ? `$${(val/1000).toFixed(1)}k` : `$${val}`}
                        />
                        <Tooltip 
                            contentStyle={{ backgroundColor: 'rgba(5,5,5,0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', backdropFilter: 'blur(8px)', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)' }}
                            itemStyle={{ color: '#4ade80' }}
                            formatter={(value: number) => [`$${value.toLocaleString(undefined, {minimumFractionDigits: 2})}`, 'Total P&L']}
                            labelFormatter={(label) => new Date(label).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                        />
                        <Area 
                            type="monotone" 
                            dataKey="value" 
                            stroke="#4ade80"
                            strokeWidth={2} 
                            fillOpacity={1} 
                            fill="url(#colorEquity)" 
                            animationDuration={1500}
                        />
                    </AreaChart>
                    </ResponsiveContainer>
                </div>
                </SpotlightCard>

                <SpotlightCard>
                    <h3 className="text-lg font-semibold mb-6 text-slate-200 flex items-center gap-2">
                        <BarChart3 size={18} className="text-sky-400" /> Monthly P&L
                    </h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.monthlyChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorPnLUp" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#4ade80" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#4ade80" stopOpacity={0.3}/>
                                </linearGradient>
                                <linearGradient id="colorPnLDown" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f87171" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#f87171" stopOpacity={0.3}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                            <XAxis 
                                dataKey="name" 
                                stroke="#64748b" 
                                fontSize={11} 
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(val) => {
                                    const [year, month] = val.split('-');
                                    const date = new Date(parseInt(year), parseInt(month) - 1);
                                    if (isNaN(date.getTime())) return val;
                                    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                                }}
                            />
                            <YAxis 
                                stroke="#64748b" 
                                fontSize={11} 
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(val) => {
                                    if (Math.abs(val) >= 1000) return `$${(val/1000).toFixed(1)}k`;
                                    return `$${val}`;
                                }}
                            />
                            <Tooltip 
                                cursor={{fill: 'rgba(255,255,255,0.05)'}}
                                content={({ active, payload, label }) => {
                                    if (active && payload && payload.length) {
                                    const formattedLabel = (() => {
                                        try {
                                            const [year, month] = label.split('-');
                                            const date = new Date(parseInt(year), parseInt(month) - 1);
                                            return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                                        } catch (e) { return label; }
                                    })();

                                    return (
                                        <div className="bg-obsidian/90 border border-white/10 p-4 rounded-xl shadow-xl backdrop-blur-md">
                                        <p className="text-slate-400 text-xs mb-1 font-medium">{formattedLabel}</p>
                                        <p className={`text-xl font-bold ${payload[0].value >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {payload[0].value >= 0 ? '+' : ''}${payload[0].value?.toLocaleString()}
                                        </p>
                                        </div>
                                    );
                                    }
                                    return null;
                                }}
                            />
                            <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" />
                            <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={60} animationDuration={1000}>
                                {stats.monthlyChartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.value >= 0 ? 'url(#colorPnLUp)' : 'url(#colorPnLDown)'} style={{ filter: 'drop-shadow(0px 0px 8px rgba(0,0,0,0.3))' }} />
                                ))}
                            </Bar>
                        </BarChart>
                        </ResponsiveContainer>
                    </div>
                </SpotlightCard>
          </div>

          {/* Right Column: Market Data */}
          <div className="space-y-6">
                {stats.activeTickers.length > 0 && (
                    <SpotlightCard>
                         <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                                <Activity size={18} className="text-sky-400" /> Market Data
                            </h3>
                            <button 
                              onClick={onRefreshPrices}
                              disabled={isRefreshing}
                              className={`p-2 rounded-lg bg-white/5 hover:bg-white/10 text-sky-400 transition-all border border-white/5 ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
                              title="Refresh Prices from API"
                            >
                              <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                            </button>
                         </div>
                         
                         {!hasApiKey && (
                            <div className="mb-4 p-3 bg-sky-500/10 border border-sky-500/20 rounded-lg flex flex-col gap-2 relative overflow-hidden group">
                                <div className="absolute inset-0 bg-sky-500/5 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                <p className="text-xs text-sky-200 relative z-10">
                                    For live price updates, please configure your Finnhub API key.
                                </p>
                                <button 
                                    onClick={onSettingsClick}
                                    className="text-xs font-bold text-sky-400 hover:text-white flex items-center gap-1 relative z-10 transition-colors"
                                >
                                    <Settings size={12} /> Configure in Settings
                                </button>
                            </div>
                         )}

                         <div className="space-y-4">
                             {stats.activeTickers.map(ticker => (
                                 <div key={ticker} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
                                     <span className="font-bold text-slate-300 w-16 tracking-wider">{ticker}</span>
                                     <div className="relative w-32">
                                         <span className="absolute left-3 top-2 text-slate-400 text-xs">$</span>
                                         <input 
                                            type="number"
                                            step="0.01"
                                            value={tickerPrices[ticker] || ''}
                                            placeholder="Price"
                                            onChange={(e) => onUpdatePrice(ticker, parseFloat(e.target.value))}
                                            className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 pl-6 text-sm text-right text-white focus:border-sky-400 focus:ring-1 focus:ring-sky-400 focus:outline-none transition-all"
                                         />
                                     </div>
                                 </div>
                             ))}
                             <p className="text-xs text-slate-400 mt-2 italic flex items-center gap-1 justify-center">
                                {isRefreshing ? <><Loader2 size={12} className="animate-spin" /> Updating prices...</> : 'Prices impact capital allocation.'}
                             </p>
                         </div>
                    </SpotlightCard>
                )}
          </div>
      </div>
    </div>
  );
};
