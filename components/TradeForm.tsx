
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Trade, StrategyType, TradeStatus } from '../types';
import { X, Save, Calculator, Sparkles, Upload, Image as ImageIcon, Loader2, Type } from 'lucide-react';

interface TradeFormProps {
  initialData?: Trade;
  isOpen: boolean;
  onClose: () => void;
  onSave: (trade: Trade) => void;
  existingCycles: {id: string, ticker: string, label: string}[];
}

const DEFAULT_TRADE: Partial<Trade> = {
  ticker: '',
  strategy: StrategyType.CSP,
  entryDate: new Date().toISOString().split('T')[0],
  expirationDate: '',
  strikePrice: 0,
  premium: 0,
  contracts: 1,
  underlyingPrice: 0,
  fees: 0,
  status: TradeStatus.OPEN,
  notes: '',
  tags: [],
  cycleId: ''
};

export const TradeForm: React.FC<TradeFormProps> = ({ initialData, isOpen, onClose, onSave, existingCycles }) => {
  const [formData, setFormData] = useState<Partial<Trade>>(DEFAULT_TRADE);
  const [tagInput, setTagInput] = useState('');
  
  // AI Modal
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiMode, setAiMode] = useState<'text' | 'image'>('text');
  const [aiText, setAiText] = useState('');
  const [aiFile, setAiFile] = useState<File | null>(null);
  const [aiPreview, setAiPreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiError, setAiError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({ ...initialData });
      } else {
        setFormData({ ...DEFAULT_TRADE, entryDate: new Date().toISOString().split('T')[0] });
      }
    }
  }, [isOpen, initialData]);

  // Calculations
  const isLongStock = formData.strategy === StrategyType.LONG_STOCK;
  const isStockBuy = formData.strategy === StrategyType.STOCK_BUY;
  const isEquity = isLongStock || isStockBuy;

  // Contracts/Shares multiplier
  // LONG_STOCK: contracts = shares (multiplier 1)
  // STOCK_BUY: contracts = lots (multiplier 100)
  // Options: contracts = contracts (multiplier 100)
  const multiplier = isLongStock ? 1 : 100;

  const totalPremium = (formData.premium || 0) * (formData.contracts || 0) * 100;
  
  const breakEven = formData.strategy === StrategyType.CSP 
    ? (formData.strikePrice || 0) - (formData.premium || 0)
    : formData.strategy === StrategyType.CC 
      ? (formData.underlyingPrice || 0) - (formData.premium || 0) 
      : 0;

  // For LONG_STOCK, strikePrice stores the Entry/Buy Price
  const collateral = isEquity
    ? (formData.strikePrice || 0) 
    : formData.strategy === StrategyType.CSP 
      ? (formData.strikePrice || 0)
      : formData.strategy === StrategyType.CC 
        ? (formData.underlyingPrice || 0) 
        : 0;

  const estimatedCost = isLongStock 
    ? (formData.strikePrice || 0) * (formData.contracts || 0)
    : 0;

  const ror = (collateral > 0 && formData.premium) 
    ? ((formData.premium / collateral) * 100) 
    : 0;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: (name === 'strikePrice' || name === 'premium' || name === 'contracts' || name === 'fees' || name === 'closePrice') 
        ? (value === '' ? '' : parseFloat(value))
        : value
    }));
  };

  const handleTickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, ticker: e.target.value.toUpperCase() }));
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newStatus = e.target.value as TradeStatus;
      let updates: Partial<Trade> = { status: newStatus };
      if (newStatus !== TradeStatus.OPEN && !formData.closeDate) {
          updates.closeDate = new Date().toISOString().split('T')[0];
      }
      setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Ensure numeric values are numbers before saving (handle empty string case)
    const processedData = {
        ...formData,
        strikePrice: Number(formData.strikePrice) || 0,
        premium: Number(formData.premium) || 0,
        contracts: Number(formData.contracts) || 1,
        fees: Number(formData.fees) || 0,
        closePrice: Number(formData.closePrice) || 0,
        underlyingPrice: Number(formData.underlyingPrice) || 0
    };

    let finalPnl = processedData.pnl;
    if (processedData.status !== TradeStatus.OPEN) {
        const entryCredit = (processedData.premium || 0) * multiplier * (processedData.contracts || 1);
        const exitDebit = (processedData.closePrice || 0) * multiplier * (processedData.contracts || 1);
        
        if (processedData.strategy === StrategyType.STOCK_BUY) {
            // Assignment usually has 0 PnL at open, tracked via stock value later
            finalPnl = 0; 
        } else if (processedData.strategy === StrategyType.LONG_STOCK) {
             // For LONG STOCK: (Exit Price - Entry Price) * Shares - Fees
             // Entry Price is stored in strikePrice field
             finalPnl = ((processedData.closePrice || 0) - (processedData.strikePrice || 0)) * (processedData.contracts || 1) - (processedData.fees || 0);
        } else if (processedData.strategy === StrategyType.LEAPS) {
            finalPnl = (exitDebit - entryCredit) - (processedData.fees || 0);
        } else {
            finalPnl = (entryCredit - exitDebit) - (processedData.fees || 0);
        }
    }
    
    let finalCycleId = processedData.cycleId;
    // Auto-generate cycle ID for new CSPs only
    if (!finalCycleId && processedData.strategy === StrategyType.CSP) {
        finalCycleId = `cycle_${processedData.ticker?.toLowerCase()}_${Date.now()}`;
    }
    
    // 1. Save the trade
    onSave({ ...processedData as Trade, pnl: finalPnl, cycleId: finalCycleId });

    // 2. Automate Assignment logic (CSP -> Stock Buy)
    if (processedData.strategy === StrategyType.CSP && 
        processedData.status === TradeStatus.ASSIGNED && 
        initialData?.status !== TradeStatus.ASSIGNED) {
            
        const assignmentDate = processedData.closeDate || processedData.expirationDate || new Date().toISOString().split('T')[0];
        
        const newStockTrade: Partial<Trade> = {
            ticker: processedData.ticker,
            strategy: StrategyType.STOCK_BUY,
            entryDate: assignmentDate,
            expirationDate: '',
            strikePrice: 0,
            premium: 0,
            contracts: processedData.contracts, // 1 contract = 100 shares (1 lot)
            underlyingPrice: processedData.strikePrice, // The strike becomes the cost basis per share
            fees: 0,
            status: TradeStatus.OPEN,
            notes: `Auto-generated from CSP Assignment (Strike $${processedData.strikePrice})`,
            tags: [...(processedData.tags || []), 'assignment'],
            cycleId: finalCycleId // Link to the same wheel cycle
        };
        
        onSave(newStockTrade as Trade);
    }

    onClose();
  };

  const addTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      setFormData(prev => ({ ...prev, tags: [...(prev.tags || []), tagInput.trim()] }));
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => setFormData(prev => ({ ...prev, tags: (prev.tags || []).filter(t => t !== tag) }));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAiFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setAiPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (const item of items) {
        if (item.type.indexOf("image") !== -1) {
            const blob = item.getAsFile();
            if (blob) {
                setAiFile(blob); setAiMode('image');
                const reader = new FileReader();
                reader.onloadend = () => setAiPreview(reader.result as string);
                reader.readAsDataURL(blob);
            }
        }
    }
  };

  const handleAiAnalyze = async () => {
    if ((aiMode === 'text' && !aiText.trim()) || (aiMode === 'image' && !aiFile)) return;
    setIsAnalyzing(true); setAiError('');
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `You are a financial trading assistant. Extract option/stock trade details from the user input (text or image) into a STRICT JSON object. Output Schema: { "ticker": "Symbol", "strategy": "One of: 'Cash-Secured Put', 'Covered Call', 'Stock Purchase (Assignment)', 'Stock Sale (Called Away)', 'Long-Term Stock', 'LEAPS'", "entryDate": "YYYY-MM-DD", "expirationDate": "YYYY-MM-DD", "strikePrice": Number, "premium": Number, "contracts": Number, "underlyingPrice": Number, "fees": Number }. Rules: Sold Put -> Cash-Secured Put, Sold Call -> Covered Call, Bought Call > 1yr -> LEAPS.`;
        let contentsPayload: any;
        if (aiMode === 'image' && aiPreview && aiFile) {
             const base64Data = aiPreview.split(',')[1];
             contentsPayload = { parts: [ { inlineData: { mimeType: aiFile.type, data: base64Data } }, { text: prompt } ] };
        } else { contentsPayload = { parts: [{ text: prompt + `\n\nInput Data:\n${aiText}` }] }; }
        
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: contentsPayload });
        const text = response.text;
        if (!text) throw new Error("No response from AI");
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const extracted = JSON.parse(jsonStr);
        setFormData(prev => ({ ...prev, ...extracted, ticker: extracted.ticker?.toUpperCase() || prev.ticker }));
        setShowAiModal(false); setAiText(''); setAiFile(null); setAiPreview(null);
    } catch (e: any) { setAiError(e.message || "Failed to extract data."); } finally { setIsAnalyzing(false); }
  };

  if (!isOpen) return null;
  const relevantCycles = existingCycles.filter(c => !formData.ticker || c.ticker.toLowerCase() === formData.ticker?.toLowerCase());

  // Helper for input styling - Scaled down for mobile density
  const inputClass = "w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-neon-blue focus:ring-1 focus:ring-neon-blue focus:outline-none transition-all";
  const labelClass = "block text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider mb-1";

  return (
    <>
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md overflow-hidden">
      <div className="bg-obsidian w-full h-[100dvh] md:h-auto md:max-h-[90vh] md:max-w-3xl md:rounded-2xl border-0 md:border border-white/10 shadow-2xl flex flex-col animate-scale-in">
        
        {/* Header - Fixed & Adjusted for Mobile Visibility */}
        <div className="p-3 md:p-5 border-b border-white/10 flex justify-between items-center bg-white/5 md:rounded-t-2xl shrink-0 gap-3">
          <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
             <h2 className="text-base md:text-xl font-bold text-white flex items-center gap-2 truncate">
                <span className="truncate">{initialData ? 'Edit Trade' : 'New Trade'}</span>
                <span className="text-[10px] font-medium text-slate-300 bg-white/10 px-2 py-1 rounded border border-white/10 uppercase tracking-wide whitespace-nowrap">
                {formData.strategy}
                </span>
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!initialData && (
                <button 
                    type="button"
                    onClick={() => setShowAiModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-xs font-bold rounded-full shadow-lg transition-all shadow-purple-500/20 group"
                >
                    <Sparkles size={12} className="group-hover:animate-spin-slow" /> 
                    <span className="hidden sm:inline">AI Autofill</span>
                    <span className="sm:hidden">AI</span>
                </button>
            )}
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 md:space-y-8 scroll-smooth">
          <div className="grid grid-cols-2 gap-4 md:gap-8">
            <div>
              <label className={labelClass}>Ticker</label>
              <input required name="ticker" value={formData.ticker} onChange={handleTickerChange} className={`${inputClass} font-mono uppercase text-base md:text-lg font-bold`} placeholder="AAPL" />
            </div>
            <div>
              <label className={labelClass}>Strategy</label>
              <select name="strategy" value={formData.strategy} onChange={handleChange} className={inputClass}>
                {Object.values(StrategyType).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 md:gap-8">
            <div>
              <label className={labelClass}>Entry Date</label>
              <input type="date" name="entryDate" required value={formData.entryDate} onChange={handleChange} className={inputClass} />
            </div>
            {!isEquity && (
                <div>
                <label className={labelClass}>Expiration</label>
                <input type="date" name="expirationDate" required value={formData.expirationDate} onChange={handleChange} className={inputClass} />
                </div>
            )}
            {isEquity && (
               <div>
                  <label className={labelClass}>Time Horizon (Notes)</label>
                  <input type="text" disabled value="Indefinite Hold" className={`${inputClass} opacity-50 cursor-not-allowed`} />
               </div>
            )}
          </div>

          {/* Pricing Row - Compact Grid */}
          <div className="grid grid-cols-3 gap-3 md:gap-4">
            {/* Strike Price or Buy Price Input */}
            <div>
              <label className={labelClass}>{isEquity ? "Buy Price" : "Strike"}</label>
              <div className="relative"><span className="absolute left-2.5 top-2 text-slate-400 text-xs">$</span><input type="number" step="0.01" name="strikePrice" value={formData.strikePrice || ''} onChange={handleChange} className={`${inputClass} pl-5`} /></div>
            </div>

            {/* Premium or Empty for Long Stock */}
            {!isLongStock ? (
                <div>
                <label className={labelClass}>Prem/Share</label>
                <div className="relative"><span className="absolute left-2.5 top-2 text-slate-400 text-xs">$</span><input type="number" step="0.01" name="premium" value={formData.premium || ''} onChange={handleChange} className={`${inputClass} pl-5`} /></div>
                </div>
            ) : (
                // Placeholder to keep grid alignment
                <div className="opacity-50">
                    <label className={labelClass}>Prem/Share</label>
                    <input disabled type="text" value="N/A" className={`${inputClass} border-transparent bg-transparent pl-0`} />
                </div>
            )}

            {/* Contracts or Shares Input */}
            <div>
              <label className={labelClass}>
                  {isLongStock ? "Quantity (Shares)" : (formData.strategy === StrategyType.STOCK_BUY ? "Lots (100x)" : "Contracts")}
              </label>
              <input type="number" name="contracts" step="0.01" value={formData.contracts || ''} onChange={handleChange} className={inputClass} />
            </div>
          </div>

          <div className="p-4 md:p-6 bg-white/5 rounded-2xl border border-white/5">
            <h3 className="text-xs font-bold text-slate-200 mb-4 flex items-center gap-2 uppercase tracking-wide"><Calculator size={14} className="text-neon-blue" /> Trade Outcome</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
                 <div className="col-span-1">
                    <label className={labelClass}>Status</label>
                    <select name="status" value={formData.status} onChange={handleStatusChange} className={inputClass}>
                        {Object.values(TradeStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                 <div className="col-span-1">
                    <label className={labelClass}>Fees</label>
                    <div className="relative"><span className="absolute left-2.5 top-2 text-slate-400 text-xs">$</span><input type="number" step="0.01" name="fees" value={formData.fees || ''} onChange={handleChange} className={`${inputClass} pl-5`} /></div>
                </div>
                {formData.status !== TradeStatus.OPEN && (
                    <>
                    <div className="col-span-1">
                        <label className={labelClass}>{isEquity ? "Sell Price" : "Close Price"}</label>
                        <div className="relative"><span className="absolute left-2.5 top-2 text-slate-400 text-xs">$</span><input type="number" step="0.01" name="closePrice" value={formData.closePrice || ''} onChange={handleChange} className={`${inputClass} pl-5`} /></div>
                    </div>
                     <div className="col-span-1">
                        <label className={labelClass}>Close Date</label>
                        <input type="date" name="closeDate" value={formData.closeDate || ''} onChange={handleChange} className={inputClass} />
                    </div>
                    </>
                )}
            </div>
            
            {/* Extended Outcome Stats */}
            <div className="mt-4 md:mt-6 grid grid-cols-3 gap-2 md:gap-8 text-sm pt-4 border-t border-white/10">
                {!isLongStock ? (
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase text-slate-500 font-bold mb-1">Total Premium</span>
                        <span className="text-neon-green font-mono text-base md:text-lg font-bold">${totalPremium.toFixed(2)}</span>
                    </div>
                ) : (
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase text-slate-500 font-bold mb-1">Total Cost Basis</span>
                        <span className="text-neon-blue font-mono text-base md:text-lg font-bold">${estimatedCost.toFixed(2)}</span>
                    </div>
                )}
                
                {formData.strategy === StrategyType.CSP && (
                    <>
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase text-slate-500 font-bold mb-1">ROR</span>
                        <span className="text-neon-purple font-mono text-base md:text-lg font-bold">{ror.toFixed(2)}%</span>
                    </div>
                    
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase text-slate-500 font-bold mb-1">Break Even</span>
                        <span className="text-neon-blue font-mono text-base md:text-lg font-bold">${breakEven.toFixed(2)}</span>
                    </div>
                    </>
                )}
            </div>
          </div>

          {!isEquity && formData.strategy !== StrategyType.LEAPS && (
             <div className="border-t border-white/10 pt-4 md:pt-6">
                <label className={labelClass}>Wheel Cycle Link</label>
                <select name="cycleId" value={formData.cycleId} onChange={handleChange} className={inputClass}>
                    <option value="">Start New Cycle (or No Cycle)</option>
                    {relevantCycles.map(c => <option key={c.id} value={c.id}>Link to: {c.ticker} - Started {c.label}</option>)}
                </select>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:gap-6">
            <div>
              <label className={labelClass}>Notes</label>
              <textarea rows={2} name="notes" value={formData.notes} onChange={handleChange} className={`${inputClass} resize-none`} placeholder="Trade rationale..." />
            </div>
            <div>
              <label className={labelClass}>Tags</label>
              <div className="flex flex-wrap gap-2 p-2 bg-black/20 border border-white/10 rounded-xl min-h-[42px]">
                {formData.tags?.map(tag => (
                  <span key={tag} className="flex items-center gap-1 bg-white/10 text-slate-200 px-2 py-0.5 rounded-md text-[10px] md:text-xs font-bold shadow-sm border border-white/5">
                    {tag}<button type="button" onClick={() => removeTag(tag)} className="hover:text-rose-500"><X size={12} /></button>
                  </span>
                ))}
                <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={addTag} className="flex-1 bg-transparent focus:outline-none min-w-[80px] text-slate-200 text-sm px-2" placeholder="Enter tags" />
              </div>
            </div>
          </div>
        </form>

        {/* Footer - Fixed */}
        <div className="p-3 md:p-5 border-t border-white/10 flex justify-end gap-3 md:gap-4 bg-white/5 md:rounded-b-2xl shrink-0 pb-8 md:pb-5">
          <button type="button" onClick={onClose} className="px-4 md:px-6 py-2 md:py-2.5 text-slate-400 hover:text-white transition-colors font-medium text-sm">Cancel</button>
          <button onClick={handleSubmit} className="px-6 md:px-8 py-2 md:py-2.5 bg-neon-blue hover:bg-cyan-400 text-black rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-[0_0_15px_rgba(0,243,255,0.4)] text-sm md:text-base">
            <Save size={18} /> Save
          </button>
        </div>
      </div>
    </div>

    {/* AI Modal */}
    {showAiModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in overflow-y-auto">
             <div className="bg-obsidian w-full max-w-lg rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-scale-in">
                  <div className="p-4 md:p-5 border-b border-white/10 bg-gradient-to-r from-purple-500/10 to-blue-500/10 flex justify-between items-center">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                          <Sparkles size={18} className="text-neon-purple" /> AI Autofill
                      </h3>
                      <button onClick={() => setShowAiModal(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
                  </div>
                  <div className="p-4 md:p-6">
                      <div className="flex gap-3 mb-6 p-1 bg-white/5 rounded-xl border border-white/5">
                          <button onClick={() => setAiMode('text')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${aiMode === 'text' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>Text</button>
                          <button onClick={() => setAiMode('image')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${aiMode === 'image' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>Image</button>
                      </div>
                      <div className="min-h-[150px]">
                          {aiMode === 'text' ? (
                              <textarea value={aiText} onChange={(e) => setAiText(e.target.value)} onPaste={handlePaste} placeholder="Paste trade details..." className="w-full h-40 bg-black/30 border border-white/10 rounded-xl p-4 text-slate-200 text-sm focus:border-purple-500 focus:outline-none resize-none" />
                          ) : (
                              <div className="border-2 border-dashed border-white/10 hover:border-purple-500 rounded-xl h-40 flex flex-col items-center justify-center cursor-pointer bg-white/5 transition-colors relative overflow-hidden" onClick={() => fileInputRef.current?.click()} onPaste={handlePaste}>
                                  {aiPreview ? <img src={aiPreview} className="h-full w-full object-contain" /> : <><Upload size={32} className="text-slate-400 mb-2" /><p className="text-xs text-slate-500 font-bold uppercase tracking-wide">Upload Image</p></>}
                                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                              </div>
                          )}
                      </div>
                      {aiError && <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 font-medium">{aiError}</div>}
                      <div className="mt-8 flex justify-end gap-3">
                          <button onClick={() => setShowAiModal(false)} className="px-5 py-2.5 text-slate-400 hover:text-white text-sm font-medium">Cancel</button>
                          <button onClick={handleAiAnalyze} disabled={isAnalyzing || (aiMode === 'text' ? !aiText : !aiFile)} className={`px-6 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-purple-500/20 flex items-center gap-2 transition-all disabled:opacity-50`}>
                             {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} {isAnalyzing ? 'Analyzing...' : 'Autofill Form'}
                          </button>
                      </div>
                  </div>
             </div>
        </div>
    )}
    </>
  );
};
