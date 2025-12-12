
import React, { useState, useMemo } from 'react';
import { Trade, TradeStatus } from '../types';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Calendar as CalendarIcon } from 'lucide-react';

interface PerformanceCalendarProps {
  trades: Trade[];
}

export const PerformanceCalendar: React.FC<PerformanceCalendarProps> = ({ trades }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const { dailyData, monthlyTotal, monthlyWins, monthlyLosses } = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const data: Record<number, number> = {};
    let total = 0;
    let wins = 0;
    let losses = 0;

    trades.forEach(trade => {
      // Only consider closed/assigned/expired trades with a close date
      if (trade.status === TradeStatus.OPEN || !trade.closeDate) return;

      const tDate = new Date(trade.closeDate);
      if (tDate.getFullYear() === year && tDate.getMonth() === month) {
        const day = tDate.getDate();
        const pnl = trade.pnl || 0;
        data[day] = (data[day] || 0) + pnl;
        total += pnl;
        if (pnl > 0) wins++;
        else if (pnl < 0) losses++;
      }
    });

    return { dailyData: data, monthlyTotal: total, monthlyWins: wins, monthlyLosses: losses };
  }, [trades, currentDate]);

  const renderCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days = [];

    // Empty cells for previous month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 md:h-32 bg-white/[0.02] border border-white/5 opacity-50"></div>);
    }

    // Days of current month
    for (let day = 1; day <= daysInMonth; day++) {
      const pnl = dailyData[day];
      const hasPnl = pnl !== undefined;
      const isPositive = pnl >= 0;

      days.push(
        <div key={day} className={`h-24 md:h-32 border border-white/5 p-2 relative group transition-colors ${hasPnl ? 'bg-white/5 hover:bg-white/10' : 'bg-transparent'}`}>
          <span className={`text-sm font-mono ${hasPnl ? 'text-slate-300' : 'text-slate-600'}`}>{day}</span>
          {hasPnl && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className={`text-sm md:text-lg font-bold ${isPositive ? 'text-neon-green' : 'text-danger'} drop-shadow-sm`}>
                {isPositive ? '+' : '-'}${Math.abs(pnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </div>
      );
    }

    return days;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
           <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
             <CalendarIcon className="text-neon-blue" /> Daily Performance
           </h2>
           <p className="text-slate-400 text-sm">Realized P/L by close date</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white/5 rounded-xl p-2 border border-white/5">
            <button onClick={prevMonth} className="p-2 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors">
                <ChevronLeft size={20} />
            </button>
            <span className="text-lg font-bold text-white w-40 text-center select-none">
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <button onClick={nextMonth} className="p-2 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors">
                <ChevronRight size={20} />
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Calendar */}
          <div className="lg:col-span-3 bg-obsidian rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
              <div className="grid grid-cols-7 bg-white/5 border-b border-white/10">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                      <div key={d} className="py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-500">{d}</div>
                  ))}
              </div>
              <div className="grid grid-cols-7 bg-black/20">
                  {renderCalendarDays()}
              </div>
          </div>

          {/* Sidebar Summary */}
          <div className="space-y-4">
              <div className="bg-white/5 rounded-2xl border border-white/10 p-6 shadow-xl relative overflow-hidden group">
                  <div className={`absolute inset-0 opacity-10 ${monthlyTotal >= 0 ? 'bg-neon-green' : 'bg-danger'}`}></div>
                  <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Total P/L ({currentDate.toLocaleDateString('en-US', { month: 'short' })})</h3>
                  <div className={`text-4xl font-bold mb-4 ${monthlyTotal >= 0 ? 'text-neon-green' : 'text-danger'}`}>
                      {monthlyTotal >= 0 ? '+' : '-'}${Math.abs(monthlyTotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="space-y-3">
                      <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-400">Winning Days</span>
                          <span className="font-bold text-neon-green">{monthlyWins}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-400">Losing Days</span>
                          <span className="font-bold text-danger">{monthlyLosses}</span>
                      </div>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};
