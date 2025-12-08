import React, { ReactNode } from 'react';
import { LayoutDashboard, List, Activity, Settings, PlusCircle, RotateCw } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
  currentView: string;
  onChangeView: (view: string) => void;
  onNewTrade: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentView, onChangeView, onNewTrade }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'trades', label: 'Trade Journal', icon: List },
    { id: 'cycles', label: 'Wheel Cycles', icon: RotateCw },
  ];

  return (
    <div className="flex h-screen bg-background text-slate-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-surface border-r border-slate-800 hidden md:flex flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
            WheelTradr
          </h1>
          <p className="text-xs text-slate-500 mt-1">Options Journal</p>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => onChangeView(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                currentView === item.id
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
              }`}
            >
              <item.icon size={20} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
           <button 
              onClick={onNewTrade}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
           >
              <PlusCircle size={20} />
              New Trade
           </button>
        </div>
      </aside>

      {/* Mobile Header (Visible only on small screens) */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-surface border-b border-slate-800 z-40 flex items-center justify-between px-4">
         <h1 className="text-xl font-bold text-blue-400">WheelTradr</h1>
         <button onClick={onNewTrade} className="p-2 bg-emerald-600 rounded-lg text-white">
            <PlusCircle size={20} />
         </button>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4 md:p-8 pt-20 md:pt-8 scroll-smooth">
        <div className="max-w-7xl mx-auto">
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