import React, { useMemo, useState } from 'react';
import { Trade, TradeStatus, StrategyType } from '../types';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, PieChart, Pie, Cell, Legend 
} from 'recharts';
import { TrendingUp, DollarSign, Activity, PieChart as PieIcon, Percent, Target, Edit2, RefreshCw, Layers } from 'lucide-react';

interface DashboardProps {
  trades: Trade[];
  monthlyGoal: number;
  tickerPrices: Record<string, number>;
  onEditGoal: () => void;
  onUpdatePrice: (ticker: string, price: number) => void;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
const ASSET_COLORS = { cash: '#10b981', stock: '#3b82f6' };

export const Dashboard: React.FC<DashboardProps> = ({ trades, monthlyGoal, tickerPrices, onEditGoal, onUpdatePrice }) => {
  
  const stats = useMemo(() => {
    let totalPnL = 0;
    let wins = 0;
    let losses = 0;
    let totalPremium = 0;
    let openPositions = 0;
    
    // Capital Allocation
    let cashSecured = 0;
    let stockValue = 0;
    
    let currentMonthPnL = 0;

    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const sortedTrades = [...trades].sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime());
    const equityCurve = [];
    let runningPnL = 0;

    // Monthly aggregation
    const monthlyData: Record<string, number> = {};
    // Allocation by Ticker
    const allocationByTicker: Record<string, number> = {};
    
    // Active Tickers for price input
    const activeTickers = new Set<string>();

    trades.forEach(t => {
      const currentPrice = tickerPrices[t.ticker] || t.underlyingPrice;

      if (t.status === TradeStatus.OPEN) {
        openPositions++;
        activeTickers.add(t.ticker);
        
        let exposure = 0;

        if (t.strategy === StrategyType.CSP) {
          // Cash Secured Put: Cash locked = Strike * Contracts * 100
          const lockedCash = t.strikePrice * t.contracts * 100;
          cashSecured += lockedCash;
          exposure = lockedCash;
        } else if (t.strategy === StrategyType.STOCK_BUY || t.strategy === StrategyType.CC) {
          // Stock Holdings or Covered Call: Value = Current Price * Shares
          // (CCs technically also have the short call liability, but for asset allocation we count the stock)
          // Note: contracts for stock = shares in this app based on seed data, but usually contracts=100 shares.
          // Seed data uses 'contracts: 100' for stock, and 'contracts: 1' for options.
          const shares = t.strategy === StrategyType.STOCK_BUY ? t.contracts : t.contracts * 100;
          const value = currentPrice * shares;
          stockValue += value;
          exposure = value;
        }

        allocationByTicker[t.ticker] = (allocationByTicker[t.ticker] || 0) + exposure;
      } else {
        // Closed trade calculations
        const pnl = t.pnl || 0;
        totalPnL += pnl;
        runningPnL += pnl;
        if (pnl > 0) wins++;
        else if (pnl < 0) losses++;

        const checkDate = t.closeDate || t.entryDate;
        const checkMonth = checkDate.substring(0, 7);
        if (checkMonth === currentMonthKey) {
            currentMonthPnL += pnl;
        }
      }

      // Track premiums collected
      if (t.premium && t.strategy !== StrategyType.STOCK_BUY) {
        totalPremium += (t.premium * t.contracts * 100);
      }

      // Equity Curve Data Point
      if (t.status !== TradeStatus.OPEN) {
          equityCurve.push({
              date: t.closeDate || t.entryDate,
              value: runningPnL
          });
      }

      // Monthly Chart Data
      const date = new Date(t.entryDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + (t.pnl || 0);
    });

    const monthlyChartData = Object.entries(monthlyData)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const allocationData = Object.entries(allocationByTicker)
      .map(([name, value]) => ({ name, value }));

    const assetAllocationData = [
        { name: 'Cash Secured (Puts)', value: cashSecured },
        { name: 'Stock Holdings', value: stockValue }
    ].filter(d => d.value > 0);

    const totalClosed = wins + losses;
    const winRate = totalClosed > 0 ? ((wins / totalClosed) * 100).toFixed(1) : '0';

    return {
      totalPnL,
      winRate,
      wins,
      losses,
      totalPremium,
      openPositions,
      cashSecured,
      stockValue,
      totalDeployed: cashSecured + stockValue,
      equityCurve,
      monthlyChartData,
      allocationData,
      assetAllocationData,
      currentMonthPnL,
      activeTickers: Array.from(activeTickers).sort()
    };
  }, [trades, tickerPrices]);

  // Goal Progress Calculation
  const progressPercent = Math.min(Math.max((stats.currentMonthPnL / Math.max(monthlyGoal, 1)) * 100, 0), 100);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface p-4 rounded-xl border border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-slate-400 text-sm font-medium">Net P&L (Total)</h3>
            <span className={`p-2 rounded-full ${stats.totalPnL >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
              <DollarSign size={20} />
            </span>
          </div>
          <div className={`text-2xl font-bold mt-2 ${stats.totalPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            ${stats.totalPnL.toFixed(2)}
          </div>
          <p className="text-xs text-slate-500 mt-1">Realized total return</p>
        </div>

        <div className="bg-surface p-4 rounded-xl border border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-slate-400 text-sm font-medium">Win Rate</h3>
            <span className="p-2 rounded-full bg-blue-500/10 text-blue-500">
              <Percent size={20} />
            </span>
          </div>
          <div className="text-2xl font-bold mt-2 text-slate-100">
            {stats.winRate}%
          </div>
          <p className="text-xs text-slate-500 mt-1">{stats.wins}W - {stats.losses}L</p>
        </div>

        <div className="bg-surface p-4 rounded-xl border border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-slate-400 text-sm font-medium">Premium Collected</h3>
            <span className="p-2 rounded-full bg-amber-500/10 text-amber-500">
              <Activity size={20} />
            </span>
          </div>
          <div className="text-2xl font-bold mt-2 text-slate-100">
            ${stats.totalPremium.toFixed(2)}
          </div>
          <p className="text-xs text-slate-500 mt-1">Gross premiums sold</p>
        </div>

        <div className="bg-surface p-4 rounded-xl border border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-slate-400 text-sm font-medium">Total Capital Deployed</h3>
            <span className="p-2 rounded-full bg-purple-500/10 text-purple-500">
              <Layers size={20} />
            </span>
          </div>
          <div className="text-2xl font-bold mt-2 text-slate-100">
            ${stats.totalDeployed.toLocaleString()}
          </div>
          <p className="text-xs text-slate-500 mt-1">
             Cash: <span className="text-emerald-400">${stats.cashSecured.toLocaleString()}</span> • 
             Stock: <span className="text-blue-400">${stats.stockValue.toLocaleString()}</span>
          </p>
        </div>
      </div>

      {/* Goal Progress Card */}
      <div className="bg-surface p-6 rounded-xl border border-slate-700 shadow-sm relative overflow-hidden group">
         <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 mb-3 relative z-10">
            <div>
                 <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                    <Target size={20} className="text-amber-400" /> 
                    Monthly Income Goal
                    <button 
                      onClick={onEditGoal}
                      className="ml-2 p-1 text-slate-500 hover:text-blue-400 hover:bg-slate-700 rounded-full transition-colors opacity-100 md:opacity-0 group-hover:opacity-100"
                      title="Edit Goal"
                    >
                      <Edit2 size={14} />
                    </button>
                 </h3>
                 <p className="text-sm text-slate-400">Current Month Realized P&L vs Target</p>
            </div>
            <div className="text-right">
                <span className="text-2xl font-bold text-slate-100">${stats.currentMonthPnL.toFixed(0)}</span>
                <span className="text-slate-500 mx-2">/</span>
                <span className="text-xl text-slate-400">${monthlyGoal.toLocaleString()}</span>
            </div>
         </div>
         
         <div className="w-full bg-slate-800 rounded-full h-4 overflow-hidden relative z-10">
             <div 
                className={`h-full transition-all duration-1000 ease-out ${
                    stats.currentMonthPnL >= monthlyGoal ? 'bg-emerald-500' : 'bg-blue-500'
                }`}
                style={{ width: `${progressPercent}%` }}
             ></div>
         </div>
         
         <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-blue-500/5 to-transparent z-0"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart Area */}
          <div className="lg:col-span-2 space-y-6">
                <div className="bg-surface p-6 rounded-xl border border-slate-700 shadow-sm">
                <h3 className="text-lg font-semibold mb-4 text-slate-200">Equity Curve</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats.equityCurve}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickFormatter={(val) => val.split('-').slice(1).join('/')} />
                        <YAxis stroke="#94a3b8" fontSize={12} />
                        <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#f1f5f9' }} 
                        itemStyle={{ color: '#10b981' }}
                        formatter={(value: number) => [`$${value.toFixed(2)}`, 'P&L']}
                        />
                        <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#10b981" 
                        strokeWidth={2} 
                        dot={false} 
                        activeDot={{ r: 6 }} 
                        />
                    </LineChart>
                    </ResponsiveContainer>
                </div>
                </div>

                <div className="bg-surface p-6 rounded-xl border border-slate-700 shadow-sm">
                <h3 className="text-lg font-semibold mb-4 text-slate-200">Monthly P&L</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.monthlyChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                        <YAxis stroke="#94a3b8" fontSize={12} />
                        <Tooltip 
                        cursor={{fill: '#334155', opacity: 0.4}}
                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#f1f5f9' }}
                        itemStyle={{ color: '#f1f5f9' }}
                        />
                        <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                        {stats.monthlyChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.value >= 0 ? '#10b981' : '#ef4444'} />
                        ))}
                        </Bar>
                    </BarChart>
                    </ResponsiveContainer>
                </div>
                </div>
          </div>

          {/* Right Column: Allocation & Market Data */}
          <div className="space-y-6">
                {/* Asset Class Allocation */}
                 <div className="bg-surface p-6 rounded-xl border border-slate-700 shadow-sm">
                    <h3 className="text-lg font-semibold mb-4 text-slate-200">Allocation Type</h3>
                    <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                            data={stats.assetAllocationData}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={60}
                            paddingAngle={5}
                            dataKey="value"
                            >
                                {stats.assetAllocationData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.name.includes('Cash') ? ASSET_COLORS.cash : ASSET_COLORS.stock} />
                                ))}
                            </Pie>
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569' }}
                                itemStyle={{ color: '#e2e8f0' }}
                                formatter={(value: number) => `$${value.toLocaleString()}`}
                            />
                            <Legend />
                        </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Ticker Allocation */}
                {stats.allocationData.length > 0 && (
                    <div className="bg-surface p-6 rounded-xl border border-slate-700 shadow-sm">
                        <h3 className="text-lg font-semibold mb-4 text-slate-200">Ticker Exposure</h3>
                        <div className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                data={stats.allocationData}
                                cx="50%"
                                cy="50%"
                                innerRadius={40}
                                outerRadius={60}
                                paddingAngle={5}
                                dataKey="value"
                                >
                                {stats.allocationData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569' }}
                                    itemStyle={{ color: '#e2e8f0' }}
                                    formatter={(value: number) => `$${value.toLocaleString()}`}
                                />
                                <Legend />
                            </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {/* Market Data Widget */}
                {stats.activeTickers.length > 0 && (
                    <div className="bg-surface p-6 rounded-xl border border-slate-700 shadow-sm">
                         <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                                <RefreshCw size={18} className="text-blue-400" /> Market Data
                            </h3>
                         </div>
                         <div className="space-y-3">
                             {stats.activeTickers.map(ticker => (
                                 <div key={ticker} className="flex items-center justify-between">
                                     <span className="font-bold text-slate-300 w-16">{ticker}</span>
                                     <div className="relative w-28">
                                         <span className="absolute left-2 top-1.5 text-slate-500 text-xs">$</span>
                                         <input 
                                            type="number"
                                            step="0.01"
                                            value={tickerPrices[ticker] || ''}
                                            placeholder="Price"
                                            onChange={(e) => onUpdatePrice(ticker, parseFloat(e.target.value))}
                                            className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 pl-5 text-sm text-right text-slate-200 focus:border-blue-500 focus:outline-none"
                                         />
                                     </div>
                                 </div>
                             ))}
                             <p className="text-xs text-slate-500 mt-2 italic">
                                Update prices to refresh capital allocation values.
                             </p>
                         </div>
                    </div>
                )}
          </div>
      </div>
    </div>
  );
};