import React, { useMemo } from 'react';
import { Trade, TradeStatus, StrategyType } from '../types';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, PieChart, Pie, Cell, Legend 
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Activity, PieChart as PieIcon, Percent } from 'lucide-react';

interface DashboardProps {
  trades: Trade[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export const Dashboard: React.FC<DashboardProps> = ({ trades }) => {
  
  const stats = useMemo(() => {
    let totalPnL = 0;
    let wins = 0;
    let losses = 0;
    let totalPremium = 0;
    let openPositions = 0;
    let collateral = 0;

    const sortedTrades = [...trades].sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime());
    const equityCurve = [];
    let runningPnL = 0;

    // Monthly aggregation
    const monthlyData: Record<string, number> = {};
    // Allocation
    const allocation: Record<string, number> = {};

    trades.forEach(t => {
      if (t.status === TradeStatus.OPEN) {
        openPositions++;
        // Estimate collateral for CSP: Strike * Contracts * 100
        if (t.strategy === StrategyType.CSP) {
          collateral += t.strikePrice * t.contracts * 100;
        }
      } else {
        // Closed trade calculations
        const pnl = t.pnl || 0;
        totalPnL += pnl;
        runningPnL += pnl;
        if (pnl > 0) wins++;
        else if (pnl < 0) losses++;
      }

      // Track premiums collected regardless of open/close
      if (t.premium) {
        totalPremium += (t.premium * t.contracts * 100);
      }

      // Equity Curve Data Point
      if (t.status !== TradeStatus.OPEN) {
          equityCurve.push({
              date: t.closeDate || t.entryDate,
              value: runningPnL
          });
      }

      // Monthly
      const date = new Date(t.entryDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + (t.pnl || 0);

      // Allocation (Exposure) - Count contracts * strike roughly for exposure
      if (t.status === TradeStatus.OPEN) {
          const exposure = t.strikePrice * t.contracts * 100;
          allocation[t.ticker] = (allocation[t.ticker] || 0) + exposure;
      }
    });

    // Format Monthly Data for Chart
    const monthlyChartData = Object.entries(monthlyData)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => a.name.localeCompare(b.name));

    // Format Allocation for Chart
    const allocationData = Object.entries(allocation)
      .map(([name, value]) => ({ name, value }));

    const totalClosed = wins + losses;
    const winRate = totalClosed > 0 ? ((wins / totalClosed) * 100).toFixed(1) : '0';

    return {
      totalPnL,
      winRate,
      wins,
      losses,
      totalPremium,
      openPositions,
      collateral,
      equityCurve,
      monthlyChartData,
      allocationData
    };
  }, [trades]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface p-4 rounded-xl border border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-slate-400 text-sm font-medium">Net P&L</h3>
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
            <h3 className="text-slate-400 text-sm font-medium">Active Exposure</h3>
            <span className="p-2 rounded-full bg-purple-500/10 text-purple-500">
              <PieIcon size={20} />
            </span>
          </div>
          <div className="text-2xl font-bold mt-2 text-slate-100">
            ${stats.collateral.toLocaleString()}
          </div>
          <p className="text-xs text-slate-500 mt-1">{stats.openPositions} open positions</p>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

      {/* Charts Row 2 */}
      {stats.allocationData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-surface p-6 rounded-xl border border-slate-700 shadow-sm">
              <h3 className="text-lg font-semibold mb-4 text-slate-200">Capital Allocation (Open Trades)</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.allocationData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {stats.allocationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#f1f5f9' }}
                        formatter={(value: number) => `$${value.toLocaleString()}`}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-surface p-6 rounded-xl border border-slate-700 shadow-sm flex flex-col justify-center items-center text-center">
                <TrendingUp size={48} className="text-emerald-500 mb-4" />
                <h3 className="text-xl font-bold text-slate-100">Wheel Strategy Focus</h3>
                <p className="text-slate-400 mt-2 max-w-sm">
                    Consistent income generation through selling premiums. Keep your probability of assignment in mind and manage your expiration dates.
                </p>
                <div className="mt-6 flex gap-4">
                    <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                        <span className="block text-2xl font-bold text-blue-400">{stats.openPositions}</span>
                        <span className="text-xs text-slate-500">Active Wheels</span>
                    </div>
                    <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                        <span className="block text-2xl font-bold text-emerald-400">
                             ${(stats.totalPremium / (Math.max(stats.collateral, 10000)) * 100).toFixed(1)}%
                        </span>
                        <span className="text-xs text-slate-500">Est. ROI (vs Active)</span>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};