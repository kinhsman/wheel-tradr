
import React, { ReactNode, useState } from 'react';
import { LayoutDashboard, List, Settings, PlusCircle, RotateCw, ChevronLeft, ChevronRight, TrendingUp, Calendar, BarChart2 } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
  currentView: string;
  onChangeView: (view: string) => void;
  onNewTrade: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentView, onChangeView, onNewTrade }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({ 'performance': true });

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'trades', label: 'Trade Journal', icon: List },
    { id: 'cycles', label: 'Wheel Cycles', icon: RotateCw },
    { 
      id: 'performance', 
      label: 'Portfolio Performance', 
      icon: TrendingUp,
      subItems: [
        { id: 'perf-calendar', label: 'Calendar Summary', icon: Calendar },
        { id: 'perf-summary', label: 'Gain/Loss Summary', icon: BarChart2 }
      ]
    },
    { id: 'settings', label: 'Data & Settings', icon: Settings },
  ];

  const toggleSubmenu = (id: string) => {
    if (isCollapsed) setIsCollapsed(false);
    setExpandedMenus(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="flex h-screen bg-obsidian bg-obsidian-gradient text-slate-200 overflow-hidden transition-all duration-300">
      {/* Sidebar - Glassmorphism */}
      <aside 
        className={`${isCollapsed ? 'w-20' : 'w-64'} bg-white/5 backdrop-blur-xl border-r border-white/5 hidden md:flex flex-col transition-all duration-300 relative z-20 shadow-xl`}
      >
        {/* Toggle Collapse Button */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-9 bg-white/10 border border-white/10 text-slate-300 rounded-full p-1 hover:bg-neon-blue hover:text-black transition-all z-50 shadow-md backdrop-blur-sm"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {/* Logo Section */}
        <div className={`h-24 flex items-center overflow-hidden whitespace-nowrap transition-all ${isCollapsed ? 'justify-center px-0' : 'px-6'}`}>
          {isCollapsed ? (
             <div className="w-10 h-10 min-w-[2.5rem] flex-shrink-0 rounded-xl bg-gradient-to-br from-neon-blue to-neon-purple flex items-center justify-center font-bold text-black tracking-tighter shadow-[0_0_15px_rgba(0,243,255,0.3)]">WT</div>
          ) : (
             <div className="min-w-[200px]">
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-neon-blue to-neon-green filter drop-shadow-sm">
                    WheelTradr
                </h1>
                <p className="text-xs text-slate-400 mt-1 font-light tracking-wide">Options Journal</p>
             </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-2 overflow-x-hidden py-4 overflow-y-auto">
          {navItems.map(item => (
            <div key={item.id}>
              {item.subItems ? (
                // Item with Submenu
                <>
                  <button
                    onClick={() => toggleSubmenu(item.id)}
                    title={isCollapsed ? item.label : undefined}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap group text-slate-400 hover:text-white hover:bg-white/5 ${isCollapsed ? 'justify-center px-2' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon size={20} className={`min-w-[20px] transition-colors group-hover:text-white`} />
                      <span className={`transition-opacity duration-200 ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>
                        {item.label}
                      </span>
                    </div>
                    {!isCollapsed && (
                       <ChevronRight size={14} className={`transition-transform duration-200 ${expandedMenus[item.id] ? 'rotate-90' : ''}`} />
                    )}
                  </button>
                  {/* Submenu Items */}
                  <div className={`overflow-hidden transition-all duration-300 ease-in-out ${expandedMenus[item.id] && !isCollapsed ? 'max-h-40 opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
                     {item.subItems.map(sub => (
                       <button
                         key={sub.id}
                         onClick={() => onChangeView(sub.id)}
                         className={`w-full flex items-center gap-3 pl-12 pr-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap mb-1 ${
                           currentView === sub.id
                             ? 'bg-white/10 text-neon-blue shadow-sm border border-white/5'
                             : 'text-slate-500 hover:text-white hover:bg-white/5'
                         }`}
                       >
                         {sub.icon && <sub.icon size={16} />}
                         <span>{sub.label}</span>
                       </button>
                     ))}
                  </div>
                </>
              ) : (
                // Standard Item
                <button
                  onClick={() => onChangeView(item.id)}
                  title={isCollapsed ? item.label : undefined}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap group ${
                    currentView === item.id
                      ? 'bg-white/10 text-neon-blue shadow-sm border border-white/5'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  } ${isCollapsed ? 'justify-center px-2' : ''}`}
                >
                  <item.icon size={20} className={`min-w-[20px] transition-colors ${currentView === item.id ? 'text-neon-blue drop-shadow-[0_0_8px_rgba(0,243,255,0.3)]' : 'group-hover:text-white'}`} />
                  <span className={`transition-opacity duration-200 ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>
                    {item.label}
                  </span>
                </button>
              )}
            </div>
          ))}
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 space-y-4 border-t border-white/5">
           {/* New Trade Button */}
           <button 
              onClick={onNewTrade}
              title={isCollapsed ? "New Trade" : undefined}
              className={`w-full bg-gradient-to-r from-neon-green to-emerald-500 text-black py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-[0_0_15px_rgba(10,255,96,0.2)] hover:shadow-xl hover:scale-[1.02] whitespace-nowrap overflow-hidden ${isCollapsed ? 'px-0' : ''}`}
           >
              <PlusCircle size={20} className="min-w-[20px]" />
              <span className={`transition-opacity duration-200 ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>
                New Trade
              </span>
           </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-obsidian/80 backdrop-blur-md border-b border-white/10 z-40 flex items-center justify-between px-4">
         <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-neon-blue to-neon-green">WheelTradr</h1>
         <div className="flex items-center gap-3">
             <button onClick={onNewTrade} className="p-2 bg-neon-green rounded-lg text-black shadow-lg shadow-neon-green/30">
                <PlusCircle size={20} />
             </button>
         </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto p-4 md:p-8 pt-20 md:pt-8 scroll-smooth pb-24 md:pb-8 relative">
        <div className="w-full max-w-[1920px] mx-auto relative z-10">
           {children}
        </div>
        {/* Decorative background blurs */}
        <div className="fixed top-0 left-0 right-0 h-[500px] bg-neon-blue/5 rounded-full blur-[120px] pointer-events-none translate-y-[-50%] translate-x-[20%]"></div>
        <div className="fixed bottom-0 right-0 h-[400px] w-[400px] bg-neon-purple/5 rounded-full blur-[100px] pointer-events-none translate-y-[30%]"></div>
      </main>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/5 backdrop-blur-xl border-t border-white/10 flex justify-around p-3 z-40 pb-safe">
        {navItems.map(item => {
           if (item.subItems) {
               return (
                   <button 
                    key={item.id} 
                    onClick={() => onChangeView(item.subItems![0].id)}
                    className={`flex flex-col items-center gap-1 ${item.subItems.some(s => s.id === currentView) ? 'text-neon-blue' : 'text-slate-500'}`}
                   >
                       <item.icon size={20} />
                       <span className="text-[10px] font-medium text-center leading-none">{item.label.split(' ')[0]}</span>
                   </button>
               );
           }
           return (
            <button
              key={item.id}
              onClick={() => onChangeView(item.id)}
              className={`flex flex-col items-center gap-1 ${currentView === item.id ? 'text-neon-blue' : 'text-slate-500'}`}
            >
              <item.icon size={20} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
           );
        })}
      </div>
    </div>
  );
};
