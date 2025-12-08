import React, { useState, useMemo } from 'react';
import { Trade, TradeStatus, StrategyType } from '../types';
import { Edit2, Trash2, ExternalLink, ArrowRightCircle } from 'lucide-react';

interface TradeListProps {
  trades: Trade[];
  onEdit: (trade: Trade) => void;
  onDelete: (id: string) => void;
  onViewCycle: (cycleId: string) => void;
}

export const TradeList: React.FC<TradeListProps> = ({ trades, onEdit, onDelete, onViewCycle }) => {
  const [filterTicker, setFilterTicker] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filteredTrades = useMemo(() => {
    return trades.filter(t => {
      const matchesTicker = t.ticker.toLowerCase().includes(filterTicker.toLowerCase());
      const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
      return matchesTicker && matchesStatus;
    }).sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime());
  }, [trades, filterTicker, filterStatus]);

  const getStatusColor = (status: TradeStatus) => {
    switch (status) {
      case TradeStatus.OPEN: return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case TradeStatus.CLOSED: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
      case TradeStatus.ASSIGNED: return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case TradeStatus.EXPIRED: return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      default: return 'bg-slate-500/10 text-slate-400';
    }
  };

  const getStrategyBadge = (strategy: StrategyType) => {
    switch (strategy) {
      case StrategyType.CSP: return <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">CSP</span>;
      case StrategyType.CC: return <span className="px-2 py-0.5 rounded text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">CC</span>;
      case StrategyType.STOCK_BUY: return <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">STOCK</span>;
      default: return <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-700 text-slate-300">{strategy}</span>;
    }
  };

  return (
    <div className="bg-surface rounded-xl border border-slate-700 shadow-sm overflow-hidden animate-fade-in">
      {/* Filters */}
      <div className="p-4 border-b border-slate-700 flex flex-col md:flex-row gap-4 justify-between items-center">
        <h2 className="text-lg font-semibold text-slate-200">Trade History</h2>
        <div className="flex gap-3 w-full md:w-auto">
          <input
            type="text"
            placeholder="Search Ticker..."
            value={filterTicker}
            onChange={(e) => setFilterTicker(e.target.value)}
            className="bg-background border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary text-slate-200 w-full md:w-48"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-background border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary text-slate-200"
          >
            <option value="all">All Status</option>
            <option value={TradeStatus.OPEN}>Open</option>
            <option value={TradeStatus.CLOSED}>Closed</option>
            <option value={TradeStatus.ASSIGNED}>Assigned</option>
            <option value={TradeStatus.EXPIRED}>Expired</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900/50 text-slate-400 font-medium">
            <tr>
              <th className="px-4 py-3">Ticker</th>
              <th className="px-4 py-3">Strategy</th>
              <th className="px-4 py-3">Opened</th>
              <th className="px-4 py-3">Exp / Strike</th>
              <th className="px-4 py-3 text-right">Prem / Cost</th>
              <th className="px-4 py-3 text-right">P&L</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {filteredTrades.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-500">No trades found matching filters.</td>
              </tr>
            ) : (
              filteredTrades.map((trade) => {
                  // Calculate P&L display
                  const isPositive = (trade.pnl || 0) >= 0;
                  const pnlDisplay = trade.pnl !== undefined 
                    ? `$${trade.pnl.toFixed(2)}` 
                    : '-';
                    
                  return (
                  <tr key={trade.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-200">
                        {trade.ticker}
                        {trade.cycleId && (
                            <button 
                                onClick={() => onViewCycle(trade.cycleId!)}
                                className="ml-2 inline-flex items-center text-xs text-blue-400 hover:text-blue-300"
                                title="View Cycle"
                            >
                                <ArrowRightCircle size={12} />
                            </button>
                        )}
                    </td>
                    <td className="px-4 py-3">{getStrategyBadge(trade.strategy)}</td>
                    <td className="px-4 py-3 text-slate-400">{new Date(trade.entryDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-slate-300">
                      {trade.expirationDate ? new Date(trade.expirationDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) : 'N/A'} 
                      <span className="text-slate-500 mx-1">@</span> 
                      {trade.strikePrice > 0 ? trade.strikePrice : '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-300">
                        ${trade.premium.toFixed(2)}
                    </td>
                    <td className={`px-4 py-3 text-right font-medium ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {pnlDisplay}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-1 rounded text-xs border ${getStatusColor(trade.status)}`}>
                        {trade.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => onEdit(trade)} className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-blue-400 transition-colors">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => onDelete(trade.id)} className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-rose-400 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};