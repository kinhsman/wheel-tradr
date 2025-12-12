
import React, { useMemo } from 'react';
import { Trade, StrategyType } from '../types';
import { ArrowDown, DollarSign, Clock, CheckCircle } from 'lucide-react';

interface CycleViewProps {
  trades: Trade[];
}

interface WheelCycle {
    id: string;
    ticker: string;
    trades: Trade[];
    startDate: string;
    lastDate: string;
    totalPnl: number;
    status: 'Active' | 'Complete';
    steps: number;
}

export const CycleView: React.FC<CycleViewProps> = ({ trades }) => {
  const cycles = useMemo(() => {
      const groups: Record<string, WheelCycle> = {};
      trades.forEach(trade => {
          if (!trade.cycleId) return;
          if (!groups[trade.cycleId]) {
              groups[trade.cycleId] = {
                  id: trade.cycleId,
                  ticker: trade.ticker,
                  trades: [],
                  startDate: trade.entryDate,
                  lastDate: trade.entryDate,
                  totalPnl: 0,
                  status: 'Active',
                  steps: 0
              };
          }
          groups[trade.cycleId].trades.push(trade);
          groups[trade.cycleId].totalPnl += (trade.pnl || 0);
          groups[trade.cycleId].steps++;
          if (trade.entryDate < groups[trade.cycleId].startDate) groups[trade.cycleId].startDate = trade.entryDate;
          const endDate = trade.closeDate || trade.expirationDate || trade.entryDate;
          if (endDate > groups[trade.cycleId].lastDate) groups[trade.cycleId].lastDate = endDate;
      });
      Object.values(groups).forEach(group => {
          group.trades.sort((a,b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime());
          const lastTrade = group.trades[group.trades.length - 1];
          if (lastTrade.strategy === StrategyType.STOCK_SELL || (lastTrade.strategy === StrategyType.CSP && lastTrade.status === 'Closed' && !lastTrade.notes.includes('Assigned'))) group.status = 'Complete';
      });
      return Object.values(groups).sort((a,b) => new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime());
  }, [trades]);

  if (cycles.length === 0) {
      return (
          <div className="text-center py-20 text-slate-400">
              <h2 className="text-2xl font-bold mb-2">No Wheel Cycles Found</h2>
              <p>Link trades to a "Cycle ID" when adding them to see them grouped here.</p>
          </div>
      );
  }

  return (
    <div className="space-y-8 animate-fade-in">
        <h2 className="text-2xl font-bold text-slate-100 border-b border-white/10 pb-4">Wheel Campaigns</h2>
        
        <div className="grid grid-cols-1 gap-6">
            {cycles.map(cycle => (
                <div key={cycle.id} className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden shadow-2xl hover:border-neon-blue/50 transition-all duration-300">
                    <div className="p-5 bg-white/5 border-b border-white/10 flex flex-wrap justify-between items-center gap-4">
                        <div className="flex items-center gap-4">
                            <span className="text-2xl font-bold text-white tracking-tight">{cycle.ticker}</span>
                            <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide border ${cycle.status === 'Active' ? 'bg-blue-500/10 text-neon-blue border-blue-500/20' : 'bg-white/10 text-slate-400 border-white/10'}`}>
                                {cycle.status}
                            </span>
                            <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                                <Clock size={12} /> {cycle.startDate}
                            </span>
                        </div>
                        <div className="text-right">
                             <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Total P&L</div>
                             <div className={`text-xl font-bold ${cycle.totalPnl >= 0 ? 'text-neon-green' : 'text-danger'}`}>
                                {cycle.totalPnl >= 0 ? '+' : ''}${cycle.totalPnl.toFixed(2)}
                             </div>
                        </div>
                    </div>
                    <div className="p-6 relative">
                        <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-white/10"></div>
                        <div className="space-y-6">
                            {cycle.trades.map((trade, idx) => (
                                <div key={trade.id} className="relative pl-12 group">
                                    <div className="absolute left-[-11px] top-4 w-6 h-6 rounded-full bg-obsidian border-2 border-white/20 flex items-center justify-center z-10">
                                        <div className={`w-2 h-2 rounded-full ${trade.status === 'Open' ? 'bg-neon-blue animate-pulse' : 'bg-slate-600'}`}></div>
                                    </div>
                                    <div className="bg-white/5 p-4 rounded-xl border border-white/5 group-hover:border-white/20 transition-colors shadow-sm">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <span className="text-sm font-bold text-blue-300 uppercase tracking-wide">{trade.strategy}</span>
                                                <span className="text-xs text-slate-500 ml-2 font-mono">{trade.entryDate}</span>
                                            </div>
                                            <span className={`text-xs px-2 py-1 rounded font-bold font-mono ${trade.pnl && trade.pnl > 0 ? 'text-neon-green bg-emerald-500/10' : 'text-slate-400 bg-white/10'}`}>
                                                {trade.pnl ? `$${trade.pnl.toFixed(2)}` : 'OPEN'}
                                            </span>
                                        </div>
                                        <div className="text-sm text-slate-300 grid grid-cols-2 gap-4 mt-2">
                                            <div>
                                                <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">Position</span>
                                                {trade.contracts}x @ {trade.strikePrice > 0 ? trade.strikePrice : trade.underlyingPrice}
                                            </div>
                                            <div>
                                                <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">Prem/Share</span>
                                                ${trade.premium}
                                            </div>
                                        </div>
                                        {trade.notes && (
                                            <p className="mt-3 text-xs text-slate-500 italic border-l-2 border-white/10 pl-3 py-0.5">
                                                {trade.notes}
                                            </p>
                                        )}
                                    </div>
                                    {idx < cycle.trades.length - 1 && <div className="absolute left-5 top-[100%] h-6 w-0.5 bg-white/10"></div>}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
};
