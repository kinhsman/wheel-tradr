import React, { useState, useMemo } from 'react';
import { Trade, TradeStatus, StrategyType } from '../types';
import { Edit2, Trash2, ArrowRightCircle, XCircle, DollarSign, X, Receipt } from 'lucide-react';

interface TradeListProps {
  trades: Trade[];
  onEdit: (trade: Trade) => void;
  onDelete: (id: string) => void;
  onViewCycle: (cycleId: string) => void;
  onQuickClose: (tradeId: string, closePrice: number, exitFees: number) => void;
}

export const TradeList: React.FC<TradeListProps> = ({ trades, onEdit, onDelete, onViewCycle, onQuickClose }) => {
  const [filterTicker, setFilterTicker] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Quick Close State
  const [closingTrade, setClosingTrade] = useState<Trade | null>(null);
  const [btcDebit, setBtcDebit] = useState<string>('');
  const [btcFees, setBtcFees] = useState<string>('');

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

  const getCollateralOrCost = (trade: Trade) => {
      if (trade.strategy === StrategyType.CSP) {
          // Cash locked = Strike * Contracts * 100
          return trade.strikePrice * trade.contracts * 100;
      }
      if (trade.strategy === StrategyType.STOCK_BUY) {
          // Cost basis = Price * Contracts (lots of 100) * 100
          return trade.underlyingPrice * trade.contracts * 100;
      }
      return null;
  };

  const getBTCDebit = (trade: Trade) => {
      if ((trade.status === TradeStatus.CLOSED || trade.status === TradeStatus.ROLLED) && trade.closePrice !== undefined) {
          return trade.closePrice * trade.contracts * 100;
      }
      return null;
  };

  const getNetPremium = (trade: Trade) => {
      // Only calculate net premium if there was an initial premium (excludes Stock Buys)
      if (trade.premium > 0) {
          return (trade.premium * trade.contracts * 100) - trade.fees;
      }
      return 0;
  };

  // Quick Close Handlers
  const handleInitiateClose = (trade: Trade) => {
    setClosingTrade(trade);
    setBtcDebit('');
    // Default fees: $0.65 per contract
    const defaultFees = (trade.contracts || 1) * 0.65;
    setBtcFees(defaultFees.toFixed(2));
  };

  const submitQuickClose = (e: React.FormEvent) => {
    e.preventDefault();
    if (closingTrade && btcDebit !== '') {
      onQuickClose(
          closingTrade.id, 
          parseFloat(btcDebit),
          parseFloat(btcFees) || 0
      );
      setClosingTrade(null);
      setBtcDebit('');
      setBtcFees('');
    }
  };

  return (
    <div className="bg-surface rounded-xl border border-slate-700 shadow-sm overflow-hidden animate-fade-in relative">
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
      <div className="overflow-x-auto min-h-[400px]">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-900/50 text-slate-400 font-medium">
            <tr>
              <th className="px-4 py-3 sticky left-0 bg-slate-900/90 backdrop-blur-sm z-10">Ticker</th>
              <th className="px-4 py-3">Strategy</th>
              <th className="px-4 py-3">Opened</th>
              <th className="px-4 py-3">Exp / Strike</th>
              <th className="px-4 py-3 text-center">Qty</th>
              <th className="px-4 py-3 text-right">Collateral / Cost</th>
              <th className="px-4 py-3 text-right">Premium (Net)</th>
              <th className="px-4 py-3 text-right">BTC Debit</th>
              <th className="px-4 py-3 text-right">P&L</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {filteredTrades.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-center text-slate-500">No trades found matching filters.</td>
              </tr>
            ) : (
              filteredTrades.map((trade) => {
                  const isPositive = (trade.pnl || 0) >= 0;
                  const pnlDisplay = trade.pnl !== undefined 
                    ? `$${trade.pnl.toFixed(2)}` 
                    : '-';
                  
                  const collateral = getCollateralOrCost(trade);
                  const btcDebitValue = getBTCDebit(trade);
                  const netPremium = getNetPremium(trade);

                  const canQuickClose = trade.status === TradeStatus.OPEN && 
                                        (trade.strategy === StrategyType.CSP || trade.strategy === StrategyType.CC);

                  return (
                  <tr key={trade.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-200 sticky left-0 bg-surface/50 backdrop-blur-sm z-10">
                        <div className="flex items-center">
                            {trade.ticker}
                            {trade.cycleId && (
                                <button 
                                    onClick={() => onViewCycle(trade.cycleId!)}
                                    className="ml-2 text-blue-400 hover:text-blue-300"
                                    title="View Cycle"
                                >
                                    <ArrowRightCircle size={14} />
                                </button>
                            )}
                        </div>
                    </td>
                    <td className="px-4 py-3">{getStrategyBadge(trade.strategy)}</td>
                    <td className="px-4 py-3 text-slate-400">{new Date(trade.entryDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-slate-300">
                      {trade.expirationDate ? new Date(trade.expirationDate).toLocaleDateString(undefined, {month: 'numeric', day: 'numeric'}) : 'N/A'} 
                      <span className="text-slate-500 mx-1">@</span> 
                      {trade.strikePrice > 0 ? trade.strikePrice : '-'}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-300">
                        {trade.contracts}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-400 font-mono text-xs">
                        {collateral ? `$${collateral.toLocaleString()}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-400/80">
                        {netPremium !== 0 ? `$${netPremium.toFixed(2)}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-rose-400/80">
                        {btcDebitValue ? `$${btcDebitValue.toFixed(2)}` : '-'}
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
                      <div className="flex justify-end gap-2 items-center">
                        {canQuickClose && (
                            <button 
                                onClick={() => handleInitiateClose(trade)}
                                className="px-2 py-1 bg-slate-700 hover:bg-rose-500/20 text-xs font-medium text-slate-300 hover:text-rose-400 rounded border border-slate-600 hover:border-rose-500/50 transition-colors mr-2"
                                title="Buy To Close"
                            >
                                BTC
                            </button>
                        )}
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

      {/* Quick Close Modal */}
      {closingTrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-surface rounded-xl border border-slate-700 shadow-2xl w-full max-w-sm overflow-hidden animate-slide-up">
                <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
                    <h3 className="font-bold text-slate-100 flex items-center gap-2">
                        <XCircle size={18} className="text-rose-400" /> Close Position (BTC)
                    </h3>
                    <button onClick={() => setClosingTrade(null)} className="text-slate-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={submitQuickClose} className="p-6 space-y-4">
                    <div className="text-sm text-slate-400 mb-2">
                        Closing <span className="font-bold text-white">{closingTrade.ticker}</span> {closingTrade.strategy}
                        <div className="text-xs mt-1">
                            Contracts: {closingTrade.contracts} | Strike: ${closingTrade.strikePrice}
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Debit per Share to Close ($)
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 text-slate-500"><DollarSign size={14} /></span>
                            <input 
                                type="number" 
                                step="0.01"
                                autoFocus
                                required
                                value={btcDebit}
                                onChange={(e) => setBtcDebit(e.target.value)}
                                placeholder="e.g. 0.05"
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-9 pr-4 py-2 text-slate-100 focus:border-primary focus:outline-none"
                            />
                        </div>
                        <p className="text-xs text-slate-500 mt-2">
                            Price paid to buy back the option.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Total Commission Fee ($)
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 text-slate-500"><Receipt size={14} /></span>
                            <input 
                                type="number" 
                                step="0.01"
                                required
                                value={btcFees}
                                onChange={(e) => setBtcFees(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-9 pr-4 py-2 text-slate-100 focus:border-primary focus:outline-none"
                            />
                        </div>
                        <p className="text-xs text-slate-500 mt-2">
                            Default: $0.65/contract. Adjust if needed.
                        </p>
                    </div>

                    <div className="flex gap-3 mt-6">
                        <button 
                            type="button" 
                            onClick={() => setClosingTrade(null)}
                            className="flex-1 py-2 text-slate-400 hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-medium transition-colors shadow-lg shadow-rose-500/20"
                        >
                            Confirm Close
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};