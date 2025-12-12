
import React from 'react';
import { Book, RotateCw, Activity, TrendingUp, ExternalLink, GraduationCap } from 'lucide-react';

const articles = [
  {
    title: "Core Options Trading Principles",
    summary: "Defines the foundational concepts and core trading principles essential for risk management and consistent growth.",
    link: "https://options-trading-principles.pages.dev/",
    icon: GraduationCap,
    color: "text-neon-blue",
    bgCheck: "bg-neon-blue/10",
    borderHover: "group-hover:border-neon-blue/50"
  },
  {
    title: "The Wheel Strategy Deep Dive",
    summary: "A comprehensive explanation of the options \"Wheel Strategy\", covering the mechanics of selling Puts and Calls.",
    link: "https://wheel-strategy.pages.dev/",
    icon: RotateCw,
    color: "text-neon-green",
    bgCheck: "bg-neon-green/10",
    borderHover: "group-hover:border-neon-green/50"
  },
  {
    title: "VIX Cash Allocation Model",
    summary: "Explains the methodology for cash allocation based on Volatility Index (VIX) signals to optimize portfolio drag.",
    link: "https://vix-cash-allocation.pages.dev/",
    icon: Activity,
    color: "text-neon-purple",
    bgCheck: "bg-neon-purple/10",
    borderHover: "group-hover:border-neon-purple/50"
  },
  {
    title: "LEAPS Strategy Entry & Exit Criteria",
    summary: "Details the specific entry and exit criteria for long-term equity anticipation securities (LEAPS) trades.",
    link: "https://leaps-strategy.pages.dev/",
    icon: TrendingUp,
    color: "text-neon-pink",
    bgCheck: "bg-neon-pink/10",
    borderHover: "group-hover:border-neon-pink/50"
  }
];

export const Documentation: React.FC = () => {
  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <div className="flex flex-col gap-2 border-b border-white/10 pb-6">
        <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
          <Book className="text-neon-blue" size={28} /> 
          Documentation & Knowledge Base
        </h2>
        <p className="text-slate-400 max-w-2xl">
          Master your trading strategy with our comprehensive guides. These resources cover everything from core principles to advanced VIX modeling.
        </p>
        <div className="pt-2 mt-2 border-t border-white/5">
            <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
               Credits: Knowledge Base content provided by <span className="text-neon-blue/80">Options Trading University by Ryan Hildreth</span>
            </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {articles.map((article, index) => (
          <a 
            key={index}
            href={article.link}
            target="_blank" 
            rel="noopener noreferrer" 
            className={`group relative bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:bg-white/[0.07] ${article.borderHover} overflow-hidden`}
          >
            {/* Background Glow Effect */}
            <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-[60px] opacity-0 group-hover:opacity-20 transition-opacity duration-500 ${article.color.replace('text-', 'bg-')}`} />

            <div className="relative z-10 flex flex-col h-full">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${article.bgCheck} ${article.color} mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                  <article.icon size={32} />
                </div>
                <ExternalLink size={20} className="text-slate-500 opacity-50 group-hover:opacity-100 group-hover:text-white transition-all duration-300" />
              </div>
              
              <h3 className="text-xl font-bold text-white mb-3 group-hover:text-neon-blue transition-colors">
                {article.title}
              </h3>
              
              <p className="text-slate-400 text-sm leading-relaxed mb-6 flex-grow">
                {article.summary}
              </p>

              <div className="flex items-center text-xs font-bold uppercase tracking-wider text-slate-500 group-hover:text-white transition-colors">
                Read Guide <div className="h-px w-8 bg-current ml-3 opacity-30 group-hover:w-12 group-hover:opacity-100 transition-all"></div>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};
