
import React, { ReactNode, useState } from 'react';
import { LayoutDashboard, List, Activity, Settings, PlusCircle, RotateCw, ChevronLeft, ChevronRight } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
  currentView: string;
  onChangeView: (view: string) => void;
  onNewTrade: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentView, onChangeView, onNewTrade }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'trades', label: 'Trade Journal', icon: List },
    { id: 'cycles', label: 'Wheel Cycles', icon: RotateCw },
    { id: 'settings', label: 'Data & Settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-background text-slate-100 overflow-hidden">
      {/* Sidebar */}
      <aside 
        className={`${isCollapsed ? 'w-20' : 'w-64'} bg-surface border-r border-slate-800 hidden md:flex flex-col transition-all duration-300 relative`}
      >
        {/* Toggle Button */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-9 bg-slate-700 border border-slate-600 text-slate-300 rounded-full p-1 hover:bg-slate-600 hover:text-white transition-colors z-50 shadow-md"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div className={`h-24 flex items-center overflow-hidden whitespace-nowrap transition-all ${isCollapsed ? 'justify-center px-0' : 'px-6'}`}>
          {isCollapsed ? (
             <div className="w-10 h-10 min-w-[2.5rem] flex-shrink-0 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center font-bold text-white tracking-tighter shadow-lg">WT</div>
          ) : (
             <div className="min-w-[200px]">
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
                    WheelTradr
                </h1>
                <p className="text-xs text-slate-500 mt-1">Options Journal</p>
             </div>
          )}
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-x-hidden">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => onChangeView(item.id)}
              title={isCollapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                currentView === item.id
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
              } ${isCollapsed ? 'justify-center px-2' : ''}`}
            >
              <item.icon size={20} className="min-w-[20px]" />
              <span className={`transition-opacity duration-200 ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>
                {item.label}
              </span>
            </button>
          ))}
        </nav>

        <div className="p-4 space-y-4">
           {/* New Trade Button */}
           <button 
              onClick={onNewTrade}
              title={isCollapsed ? "New Trade" : undefined}
              className={`w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 whitespace-nowrap overflow-hidden ${isCollapsed ? 'px-0' : ''}`}
           >
              <PlusCircle size={20} className="min-w-[20px]" />
              <span className={`transition-opacity duration-200 ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>
                New Trade
              </span>
           </button>
        </div>
      </aside>

      {/* Mobile Header (Visible only on small screens) */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-surface border-b border-slate-800 z-40 flex items-center justify-between px-4">
         <h1 className="text-xl font-bold text-blue-400">WheelTradr</h1>
         <div className="flex items-center gap-3">
             <button onClick={onNewTrade} className="p-2 bg-emerald-600 rounded-lg text-white">
                <PlusCircle size={20} />
             </button>
         </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4 md:p-8 pt-20 md:pt-8 scroll-smooth pb-24 md:pb-8">
        <div className="w-full">
           {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-slate-800 flex justify-around p-3 z-40">
        {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => onChangeView(item.id)}
              className={`flex flex-col items-center gap-1 ${currentView === item.id ? 'text-primary' : 'text-slate-500'}`}
            >
              <item.icon size={20} />
              <span className="text-[10px]">{item.label}</span>
            </button>
        ))}
      </div>
    </div>
  );
};
