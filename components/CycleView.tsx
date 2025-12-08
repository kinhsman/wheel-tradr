import React, { useMemo } from 'react';
import { Trade, StrategyType } from '../types';
import { ArrowDown, DollarSign, Clock, CheckCircle } from 'lucide-react';

interface CycleViewProps {
  trades: Trade[];
}

// Group trades into cycle objects
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
          
          // Determine dates
          if (trade.entryDate < groups[trade.cycleId].startDate) groups[trade.cycleId].startDate = trade.entryDate;
          const endDate = trade.closeDate || trade.expirationDate || trade.entryDate;
          if (endDate > groups[trade.cycleId].lastDate) groups[trade.cycleId].lastDate = endDate;

          // Simple logic for completion: If last trade is closed and stocks sold or CSP closed without assignment
          // This is a heuristic
      });

      // Sort trades within cycles
      Object.values(groups).forEach(group => {
          group.trades.sort((a,b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime());
          
          // Check if likely complete
          const lastTrade = group.trades[group.trades.length - 1];
          if (lastTrade.strategy === StrategyType.STOCK_SELL || 
             (lastTrade.strategy === StrategyType.CSP && lastTrade.status === 'Closed' && !lastTrade.notes.includes('Assigned'))) {
              group.status = 'Complete';
          }
      });

      return Object.values(groups).sort((a,b) => new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime());
  }, [trades]);

  if (cycles.length === 0) {
      return (
          <div className="text-center py-20 text-slate-500">
              <h2 className="text-xl font-semibold mb-2">No Wheel Cycles Found</h2>
              <p>Link trades to a "Cycle ID" when adding them to see them grouped here.</p>
          </div>
      );
  }

  return (
    <div className="space-y-8 animate-fade-in">
        <h2 className="text-2xl font-bold text-slate-200">Wheel Campaigns</h2>
        
        <div className="grid grid-cols-1 gap-6">
            {cycles.map(cycle => (
                <div key={cycle.id} className="bg-surface rounded-xl border border-slate-700 overflow-hidden shadow-sm">
                    {/* Header */}
                    <div className="p-4 bg-slate-800/50 border-b border-slate-700 flex flex-wrap justify-between items-center gap-4">
                        <div className="flex items-center gap-4">
                            <span className="text-2xl font-bold text-white">{cycle.ticker}</span>
                            <span className={`px-2 py-1 rounded text-xs border ${cycle.status === 'Active' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                                {cycle.status}
                            </span>
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                                <Clock size={12} /> {cycle.startDate}
                            </span>
                        </div>
                        <div className="text-right">
                             <div className="text-xs text-slate-500">Total P&L</div>
                             <div className={`text-xl font-bold ${cycle.totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {cycle.totalPnl >= 0 ? '+' : ''}${cycle.totalPnl.toFixed(2)}
                             </div>
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="p-6 relative">
                        <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-slate-700"></div>
                        <div className="space-y-6">
                            {cycle.trades.map((trade, idx) => (
                                <div key={trade.id} className="relative pl-10">
                                    <div className="absolute left-[-11px] top-1.5 w-6 h-6 rounded-full bg-slate-800 border-2 border-slate-600 flex items-center justify-center z-10">
                                        <div className={`w-2 h-2 rounded-full ${trade.status === 'Open' ? 'bg-blue-500 animate-pulse' : 'bg-slate-400'}`}></div>
                                    </div>
                                    <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50 hover:border-slate-600 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <span className="text-sm font-semibold text-blue-300">{trade.strategy}</span>
                                                <span className="text-xs text-slate-500 ml-2">{trade.entryDate}</span>
                                            </div>
                                            <span className={`text-xs px-2 py-0.5 rounded ${trade.pnl && trade.pnl > 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-400 bg-slate-700/30'}`}>
                                                {trade.pnl ? `$${trade.pnl.toFixed(2)}` : 'Open'}
                                            </span>
                                        </div>
                                        <div className="text-sm text-slate-300 grid grid-cols-2 gap-4">
                                            <div>
                                                <span className="text-slate-500 block text-xs">Details</span>
                                                {trade.contracts}x @ {trade.strikePrice > 0 ? trade.strikePrice : trade.underlyingPrice}
                                            </div>
                                            <div>
                                                <span className="text-slate-500 block text-xs">Premium/Share</span>
                                                ${trade.premium}
                                            </div>
                                        </div>
                                        {trade.notes && (
                                            <p className="mt-2 text-xs text-slate-500 italic border-l-2 border-slate-700 pl-2">
                                                "{trade.notes}"
                                            </p>
                                        )}
                                    </div>
                                    {idx < cycle.trades.length - 1 && (
                                        <div className="absolute left-5 top-[100%] h-6 w-0.5 bg-slate-700"></div>
                                    )}
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