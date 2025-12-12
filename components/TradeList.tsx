
import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Trade, TradeStatus, StrategyType } from '../types';
import { Edit2, Trash2, ArrowRightCircle, XCircle, DollarSign, X, Receipt, Filter, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

interface TradeListProps {
  trades: Trade[];
  onEdit: (trade: Trade) => void;
  onDelete: (id: string) => void;
  onViewCycle: (cycleId: string) => void;
  onQuickClose: (tradeId: string, closePrice: number, exitFees: number) => void;
}

type SortDirection = 'asc' | 'desc';
type SortKey = 'ticker' | 'strategy' | 'entryDate' | 'dte' | 'closeDate' | 'expirationDate' | 'qty' | 'collateral' | 'premium' | 'exit' | 'pnl' | 'ror' | 'apy' | 'status';

export const TradeList: React.FC<TradeListProps> = ({ trades, onEdit, onDelete, onViewCycle, onQuickClose }) => {
  const [filterTicker, setFilterTicker] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterStrategy, setFilterStrategy] = useState<string>('all');
  
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({ key: 'entryDate', direction: 'desc' });

  const [closingTrade, setClosingTrade] = useState<Trade | null>(null);
  const [closePriceInput, setClosePriceInput] = useState<string>('');
  const [closeFeesInput, setCloseFeesInput] = useState<string>('');

  const getCollateralOrCost = (trade: Trade) => {
      if (trade.strategy === StrategyType.CSP) return trade.strikePrice * trade.contracts * 100;
      if (trade.strategy === StrategyType.CC) return (trade.underlyingPrice > 0 ? trade.underlyingPrice : trade.strikePrice) * trade.contracts * 100;
      if (trade.strategy === StrategyType.STOCK_BUY) return (trade.underlyingPrice > 0 ? trade.underlyingPrice : trade.strikePrice) * trade.contracts * 100;
      if (trade.strategy === StrategyType.LEAPS) return trade.premium * trade.contracts * 100;
      return 0;
  };

  const getNetPremium = (trade: Trade) => {
      if (trade.premium > 0 && trade.strategy !== StrategyType.LEAPS) return (trade.premium * trade.contracts * 100) - trade.fees;
      return 0;
  };

  const getExitValue = (trade: Trade) => {
      if ((trade.status === TradeStatus.CLOSED || trade.status === TradeStatus.ROLLED) && trade.closePrice !== undefined) return trade.closePrice * trade.contracts * 100;
      return 0;
  };

  const getQuantityDisplay = (trade: Trade) => trade.strategy === StrategyType.STOCK_BUY ? trade.contracts * 100 : trade.contracts;

  const getRor = (trade: Trade) => {
      if (trade.status === TradeStatus.OPEN || trade.pnl === undefined) return null;
      const collateral = getCollateralOrCost(trade);
      if (!collateral || collateral === 0) return 0;
      return (trade.pnl / collateral) * 100;
  };

  const getDaysHeld = (trade: Trade) => {
      if (!trade.closeDate) return 0;
      const start = new Date(trade.entryDate);
      const end = new Date(trade.closeDate);
      start.setHours(0,0,0,0); end.setHours(0,0,0,0);
      const diffTime = end.getTime() - start.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return Math.max(diffDays, 1);
  };

  const getApy = (trade: Trade) => {
      const ror = getRor(trade);
      if (ror === null) return null;
      const days = getDaysHeld(trade);
      return ror * (365 / days);
  };

  const getValueForSort = (trade: Trade, key: SortKey) => {
      switch (key) {
          case 'ticker': return trade.ticker;
          case 'strategy': return trade.strategy;
          case 'entryDate': return new Date(trade.entryDate).getTime();
          case 'closeDate': return trade.closeDate ? new Date(trade.closeDate).getTime() : 0;
          case 'expirationDate': return trade.expirationDate ? new Date(trade.expirationDate).getTime() : 0;
          case 'qty': return getQuantityDisplay(trade);
          case 'collateral': return getCollateralOrCost(trade);
          case 'premium': return getNetPremium(trade);
          case 'exit': return getExitValue(trade);
          case 'pnl': return trade.pnl !== undefined ? trade.pnl : -Infinity;
          case 'ror': { const ror = getRor(trade); return ror !== null ? ror : -Infinity; }
          case 'apy': { const apy = getApy(trade); return apy !== null ? apy : -Infinity; }
          case 'status': return trade.status;
          case 'dte': {
             if (trade.status !== TradeStatus.OPEN || !trade.expirationDate) return -999999999;
             const today = new Date(); today.setHours(0, 0, 0, 0);
             const expDate = new Date(trade.expirationDate); expDate.setHours(0, 0, 0, 0);
             return expDate.getTime() - today.getTime();
          }
          default: return 0;
      }
  };

  const handleSort = (key: SortKey) => {
      let direction: SortDirection = 'asc';
      if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
      setSortConfig({ key, direction });
  };

  const filteredAndSortedTrades = useMemo(() => {
    let result = trades.filter(t => {
      const matchesTicker = t.ticker.toLowerCase().includes(filterTicker.toLowerCase());
      const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
      let matchesStrategy = true;
      if (filterStrategy !== 'all') {
          if (filterStrategy === 'STOCK') matchesStrategy = t.strategy === StrategyType.STOCK_BUY || t.strategy === StrategyType.STOCK_SELL;
          else matchesStrategy = t.strategy === filterStrategy;
      }
      return matchesTicker && matchesStatus && matchesStrategy;
    });

    return result.sort((a, b) => {
        const valA = getValueForSort(a, sortConfig.key);
        const valB = getValueForSort(b, sortConfig.key);
        if (typeof valA === 'string' && typeof valB === 'string') return sortConfig.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        const numA = valA as number;
        const numB = valB as number;
        return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
    });
  }, [trades, filterTicker, filterStatus, filterStrategy, sortConfig]);

  const getStatusColor = (status: TradeStatus) => {
    switch (status) {
      case TradeStatus.OPEN: return 'bg-blue-500/10 text-neon-blue border-blue-500/20 shadow-[0_0_10px_rgba(0,243,255,0.1)]';
      case TradeStatus.CLOSED: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
      case TradeStatus.ASSIGNED: return 'bg-amber-500/10 text-neon-yellow border-amber-500/20';
      case TradeStatus.EXPIRED: return 'bg-emerald-500/10 text-neon-green border-emerald-500/20';
      default: return 'bg-slate-500/10 text-slate-400';
    }
  };

  const getStrategyBadge = (strategy: StrategyType) => {
    switch (strategy) {
      case StrategyType.CSP: return <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border bg-purple-500/10 text-neon-purple border-purple-500/20">CSP</span>;
      case StrategyType.CC: return <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border bg-indigo-500/10 text-indigo-300 border-indigo-500/20">CC</span>;
      case StrategyType.STOCK_BUY: return <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border bg-emerald-500/10 text-neon-green border-emerald-500/20">STOCK</span>;
      case StrategyType.LEAPS: return <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border bg-pink-500/10 text-neon-pink border-pink-500/20">LEAPS</span>;
      default: return <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-slate-700 text-slate-300">{strategy}</span>;
    }
  };

  const getDTE = (trade: Trade) => {
      if (trade.strategy === StrategyType.STOCK_BUY || trade.strategy === StrategyType.STOCK_SELL) return { text: '-', color: 'text-slate-500' };
      if (trade.status !== TradeStatus.OPEN) return { text: '-', color: 'text-slate-500' };
      if (!trade.expirationDate) return { text: 'N/A', color: 'text-slate-500' };

      const today = new Date(); today.setHours(0, 0, 0, 0);
      const expDate = new Date(trade.expirationDate); expDate.setHours(0, 0, 0, 0);
      const diffTime = expDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) return { text: 'Expired', color: 'text-danger font-bold' };
      let color = 'text-neon-green';
      if (diffDays <= 7) color = 'text-danger font-bold';
      else if (diffDays <= 14) color = 'text-neon-yellow';
      return { text: `${diffDays}d`, color };
  };

  const handleInitiateClose = (trade: Trade) => {
    setClosingTrade(trade);
    setClosePriceInput('');
    const defaultFees = (trade.contracts || 1) * 0.65;
    setCloseFeesInput(defaultFees.toFixed(2));
  };

  const submitQuickClose = (e: React.FormEvent) => {
    e.preventDefault();
    if (closingTrade && closePriceInput !== '') {
      onQuickClose(closingTrade.id, parseFloat(closePriceInput), parseFloat(closeFeesInput) || 0);
      setClosingTrade(null);
      setClosePriceInput('');
      setCloseFeesInput('');
    }
  };

  const isLongStrategy = (strategy: StrategyType) => strategy === StrategyType.LEAPS || strategy === StrategyType.STOCK_BUY;

  const SortHeader = ({ label, sortKey, align = 'left' }: { label: string, sortKey: SortKey, align?: 'left' | 'center' | 'right' }) => (
      <th 
        className={`px-4 py-4 cursor-pointer hover:bg-white/5 transition-colors select-none text-xs uppercase tracking-wider ${align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'} ${sortKey === 'ticker' ? 'sticky left-0 bg-obsidian z-20 border-r border-white/10 shadow-[4px_0_8px_rgba(0,0,0,0.1)]' : ''}`}
        onClick={() => handleSort(sortKey)}
      >
          <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'}`}>
              {label}
              <span className="text-slate-400">
                  {sortConfig.key === sortKey ? (
                      sortConfig.direction === 'asc' ? <ArrowUp size={12} className="text-neon-blue" /> : <ArrowDown size={12} className="text-neon-blue" />
                  ) : (
                      <ArrowUpDown size={12} className="opacity-0 group-hover:opacity-50" />
                  )}
              </span>
          </div>
      </th>
  );

  return (
    <>
      <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/5 shadow-xl overflow-hidden animate-fade-in relative">
        <div className="p-6 border-b border-white/5 flex flex-col md:flex-row gap-4 justify-between items-center bg-white/5">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              Trade History
          </h2>
          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
            <input
              type="text"
              placeholder="Search Ticker..."
              value={filterTicker}
              onChange={(e) => setFilterTicker(e.target.value)}
              className="bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue text-slate-200 w-full md:w-48 transition-all"
            />
            <div className="flex gap-2">
              <div className="relative">
                  <select
                      value={filterStrategy}
                      onChange={(e) => setFilterStrategy(e.target.value)}
                      className="bg-black/20 border border-white/10 rounded-xl pl-4 pr-10 py-2 text-sm focus:outline-none focus:border-neon-blue text-slate-200 appearance-none min-w-[140px] cursor-pointer"
                  >
                      <option value="all">All Strategies</option>
                      <option value={StrategyType.CSP}>CSP</option>
                      <option value={StrategyType.CC}>Covered Call</option>
                      <option value="STOCK">Stock</option>
                      <option value={StrategyType.LEAPS}>LEAPS</option>
                  </select>
                  <div className="absolute right-3 top-2.5 pointer-events-none text-slate-500">
                    <Filter size={14} />
                  </div>
              </div>

              <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-neon-blue text-slate-200 cursor-pointer"
              >
                  <option value="all">All Status</option>
                  <option value={TradeStatus.OPEN}>Open</option>
                  <option value={TradeStatus.CLOSED}>Closed</option>
                  <option value={TradeStatus.ASSIGNED}>Assigned</option>
                  <option value={TradeStatus.EXPIRED}>Expired</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-black/40 text-slate-400 font-medium">
              <tr>
                <SortHeader label="Ticker" sortKey="ticker" />
                <SortHeader label="Strategy" sortKey="strategy" />
                <SortHeader label="Opened" sortKey="entryDate" />
                <SortHeader label="DTE" sortKey="dte" align="center" />
                <SortHeader label="Closed" sortKey="closeDate" />
                <SortHeader label="Exp / Strike" sortKey="expirationDate" />
                <SortHeader label="Qty" sortKey="qty" align="center" />
                <SortHeader label="Collateral / Cost" sortKey="collateral" align="right" />
                <SortHeader label="Premium (Net)" sortKey="premium" align="right" />
                <SortHeader label="Exit Price" sortKey="exit" align="right" />
                <SortHeader label="P&L" sortKey="pnl" align="right" />
                <SortHeader label="ROR" sortKey="ror" align="right" />
                <SortHeader label="APY" sortKey="apy" align="right" />
                <SortHeader label="Status" sortKey="status" align="center" />
                <th className="px-4 py-4 text-right text-xs uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredAndSortedTrades.length === 0 ? (
                <tr>
                  <td colSpan={15} className="px-4 py-12 text-center text-slate-500">No trades found matching filters.</td>
                </tr>
              ) : (
                filteredAndSortedTrades.map((trade) => {
                    const isPositive = (trade.pnl || 0) >= 0;
                    const pnlDisplay = trade.pnl !== undefined ? `$${trade.pnl.toFixed(2)}` : '-';
                    const collateral = getCollateralOrCost(trade);
                    const exitValue = getExitValue(trade);
                    const netPremium = getNetPremium(trade);
                    const dte = getDTE(trade);
                    const ror = getRor(trade);
                    const apy = getApy(trade);
                    const canBTC = trade.status === TradeStatus.OPEN && (trade.strategy === StrategyType.CSP || trade.strategy === StrategyType.CC);
                    const canSTC = trade.status === TradeStatus.OPEN && trade.strategy === StrategyType.LEAPS;

                    return (
                    <tr key={trade.id} className="hover:bg-white/5 transition-colors group">
                      <td className="px-4 py-4 font-bold text-slate-100 sticky left-0 bg-obsidian group-hover:bg-[#1a1a2e] z-10 border-r border-white/10">
                          <div className="flex items-center justify-between">
                              {trade.ticker}
                              {trade.cycleId && (
                                  <button onClick={() => onViewCycle(trade.cycleId!)} className="ml-2 text-neon-blue hover:scale-110 transition-transform" title="View Cycle">
                                      <ArrowRightCircle size={14} />
                                  </button>
                              )}
                          </div>
                      </td>
                      <td className="px-4 py-4">{getStrategyBadge(trade.strategy)}</td>
                      <td className="px-4 py-4 text-slate-400 font-mono text-xs">{new Date(trade.entryDate).toLocaleDateString()}</td>
                      <td className={`px-4 py-4 text-center ${dte.color} font-mono text-xs`}>{dte.text}</td>
                      <td className="px-4 py-4 text-slate-400 font-mono text-xs">{trade.closeDate ? new Date(trade.closeDate).toLocaleDateString() : '-'}</td>
                      <td className="px-4 py-4 text-slate-300">
                        {trade.expirationDate ? new Date(trade.expirationDate).toLocaleDateString(undefined, {month: 'numeric', day: 'numeric'}) : 'N/A'} 
                        <span className="text-slate-400 mx-1">@</span> 
                        {trade.strikePrice > 0 ? trade.strikePrice : '-'}
                      </td>
                      <td className="px-4 py-4 text-center text-slate-300 font-mono">{getQuantityDisplay(trade)}</td>
                      <td className="px-4 py-4 text-right text-slate-400 font-mono text-xs">{collateral ? `$${collateral.toLocaleString()}` : '-'}</td>
                      <td className="px-4 py-4 text-right text-neon-green/90 font-mono">{netPremium !== 0 ? `$${netPremium.toFixed(2)}` : '-'}</td>
                      <td className="px-4 py-4 text-right text-slate-400 font-mono">{exitValue ? `$${exitValue.toFixed(2)}` : '-'}</td>
                      <td className={`px-4 py-4 text-right font-bold font-mono ${isPositive ? 'text-neon-green' : 'text-danger'}`}>{pnlDisplay}</td>
                      <td className={`px-4 py-4 text-right font-medium text-xs font-mono ${ror !== null && ror >= 0 ? 'text-neon-green' : (ror !== null ? 'text-danger' : 'text-slate-500')}`}>{ror !== null ? `${ror.toFixed(2)}%` : '-'}</td>
                      <td className={`px-4 py-4 text-right font-medium text-xs font-mono ${apy !== null && apy >= 0 ? 'text-neon-green' : (apy !== null ? 'text-danger' : 'text-slate-500')}`}>{apy !== null ? `${apy.toFixed(2)}%` : '-'}</td>
                      <td className="px-4 py-4 text-center">
                        <span className={`inline-block px-2 py-1 rounded-md text-[10px] font-bold border uppercase tracking-wide ${getStatusColor(trade.status)}`}>{trade.status}</span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex justify-end gap-2 items-center opacity-0 group-hover:opacity-100 transition-opacity">
                          {canBTC && (
                              <button onClick={() => handleInitiateClose(trade)} className="px-2 py-1 bg-white/10 hover:bg-danger/20 text-[10px] font-bold text-white border border-white/20 hover:border-danger rounded transition-colors" title="Buy To Close">BTC</button>
                          )}
                          {canSTC && (
                              <button onClick={() => handleInitiateClose(trade)} className="px-2 py-1 bg-white/10 hover:bg-neon-green/20 text-[10px] font-bold text-white border border-white/20 hover:border-neon-green rounded transition-colors" title="Sell To Close">STC</button>
                          )}
                          <button onClick={() => onEdit(trade)} className="p-1.5 hover:bg-white/10 rounded text-slate-400 hover:text-neon-blue transition-colors"><Edit2 size={14} /></button>
                          <button onClick={() => onDelete(trade.id)} className="p-1.5 hover:bg-white/10 rounded text-slate-400 hover:text-danger transition-colors"><Trash2 size={14} /></button>
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

      {/* Glassmorphic Modal - Rendered via Portal to avoid clipping/positioning issues */}
      {closingTrade && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in">
            <div className="bg-obsidian w-full max-w-sm rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-scale-in">
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <XCircle size={18} className={isLongStrategy(closingTrade.strategy) ? "text-neon-green" : "text-danger"} /> 
                        {isLongStrategy(closingTrade.strategy) ? "Sell to Close (STC)" : "Buy to Close (BTC)"}
                    </h3>
                    <button onClick={() => setClosingTrade(null)} className="text-slate-400 hover:text-white"><X size={20} /></button>
                </div>
                <form onSubmit={submitQuickClose} className="p-6 space-y-5">
                    <div className="text-sm text-slate-400 mb-2">
                        Closing <span className="font-bold text-white">{closingTrade.ticker}</span> {closingTrade.strategy}
                        <div className="text-xs mt-1 font-mono opacity-75">Contracts: {closingTrade.contracts} | Strike: ${closingTrade.strikePrice}</div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{isLongStrategy(closingTrade.strategy) ? "Credit per Share" : "Debit per Share"}</label>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 text-slate-500"><DollarSign size={14} /></span>
                            <input 
                                type="number" step="0.01" autoFocus required
                                value={closePriceInput} onChange={(e) => setClosePriceInput(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-white focus:border-neon-blue focus:ring-1 focus:ring-neon-blue focus:outline-none transition-all"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Fees</label>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 text-slate-500"><Receipt size={14} /></span>
                            <input 
                                type="number" step="0.01" required
                                value={closeFeesInput} onChange={(e) => setCloseFeesInput(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-white focus:border-neon-blue focus:ring-1 focus:ring-neon-blue focus:outline-none transition-all"
                            />
                        </div>
                    </div>
                    <div className="flex gap-3 mt-6">
                        <button type="button" onClick={() => setClosingTrade(null)} className="flex-1 py-2.5 text-slate-400 hover:bg-white/10 rounded-xl transition-colors text-sm font-medium">Cancel</button>
                        <button type="submit" className={`flex-1 py-2.5 text-black rounded-xl font-bold transition-all shadow-lg ${isLongStrategy(closingTrade.strategy) ? "bg-neon-green hover:bg-emerald-400 shadow-emerald-500/20" : "bg-danger hover:bg-rose-500 shadow-rose-500/20"}`}>{isLongStrategy(closingTrade.strategy) ? "Confirm Sell" : "Confirm Close"}</button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
      )}
    </>
  );
};
