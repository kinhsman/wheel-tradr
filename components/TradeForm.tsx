import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Trade, StrategyType, TradeStatus } from '../types';
import { X, Save, Calculator, Sparkles, Upload, Image as ImageIcon, Loader2, Type } from 'lucide-react';

interface TradeFormProps {
  initialData?: Trade;
  isOpen: boolean;
  onClose: () => void;
  onSave: (trade: Trade) => void;
  existingCycles: {id: string, ticker: string, label: string}[]; // Simplified cycle info
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

  // AI Modal State
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

  // Derived calculations
  const totalPremium = (formData.premium || 0) * (formData.contracts || 0) * 100;
  const breakEven = formData.strategy === StrategyType.CSP 
    ? (formData.strikePrice || 0) - (formData.premium || 0)
    : formData.strategy === StrategyType.CC 
      ? (formData.underlyingPrice || 0) - (formData.premium || 0) // Simplified
      : 0;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: (name === 'strikePrice' || name === 'premium' || name === 'contracts' || name === 'underlyingPrice' || name === 'fees' || name === 'closePrice') 
        ? parseFloat(value) || 0 
        : value
    }));
  };

  const handleTickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    setFormData(prev => ({ ...prev, ticker: val }));
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newStatus = e.target.value as TradeStatus;
      let updates: Partial<Trade> = { status: newStatus };
      
      // Auto set close date if closing
      if (newStatus !== TradeStatus.OPEN && !formData.closeDate) {
          updates.closeDate = new Date().toISOString().split('T')[0];
      }
      setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Calculate P&L if closed
    let finalPnl = formData.pnl;
    if (formData.status !== TradeStatus.OPEN) {
        const entryCredit = (formData.premium || 0) * 100 * (formData.contracts || 1);
        const exitDebit = (formData.closePrice || 0) * 100 * (formData.contracts || 1);
        
        // Cast strategy to StrategyType to avoid TS error about lack of overlap
        if ((formData.strategy as StrategyType) === StrategyType.STOCK_BUY) {
           // Stock buy doesn't have P&L until sold
           finalPnl = 0; 
        } else {
           // For short options (CSP, CC)
           // P&L = (Entry Premium - Exit Price) * Contracts - Fees
           // For LEAPS (Long call), Logic is inverted: P&L = (Exit Price - Entry Price) * Contracts - Fees
           if ((formData.strategy as StrategyType) === StrategyType.LEAPS) {
               // LEAPS P&L = (Exit Debit [Sold Price] - Entry Credit [Paid Price])
               // NOTE: In this app, 'premium' is entry price, 'closePrice' is exit price
               // So: (closePrice - premium) * 100 * contracts - fees
               finalPnl = (exitDebit - entryCredit) - (formData.fees || 0);
           } else {
               // CSP/CC (Short)
               finalPnl = (entryCredit - exitDebit) - (formData.fees || 0);
           }
        }
    }

    // Auto-generate cycle ID if starting a new wheel
    let finalCycleId = formData.cycleId;
    if (!finalCycleId && formData.strategy === StrategyType.CSP) {
        finalCycleId = `cycle_${formData.ticker?.toLowerCase()}_${Date.now()}`;
    }

    onSave({
      ...formData as Trade,
      pnl: finalPnl,
      cycleId: finalCycleId
    });
    onClose();
  };

  const addTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: (prev.tags || []).filter(t => t !== tag)
    }));
  };

  // --- AI Logic ---
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
                setAiFile(blob);
                setAiMode('image');
                const reader = new FileReader();
                reader.onloadend = () => setAiPreview(reader.result as string);
                reader.readAsDataURL(blob);
            }
        }
    }
  };

  const handleAiAnalyze = async () => {
    if ((aiMode === 'text' && !aiText.trim()) || (aiMode === 'image' && !aiFile)) return;

    setIsAnalyzing(true);
    setAiError('');

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

        const prompt = `
        You are a financial trading assistant. 
        Extract option/stock trade details from the user input (text or image) into a STRICT JSON object.
        
        Output Schema:
        {
            "ticker": "Symbol string (e.g. AAPL)",
            "strategy": "One of: 'Cash-Secured Put', 'Covered Call', 'Stock Purchase (Assignment)', 'Stock Sale (Called Away)', 'LEAPS'",
            "entryDate": "YYYY-MM-DD (Use ${new Date().toISOString().split('T')[0]} if 'today')",
            "expirationDate": "YYYY-MM-DD",
            "strikePrice": Number,
            "premium": Number (price per share),
            "contracts": Number,
            "underlyingPrice": Number (optional),
            "fees": Number (optional, commission)
        }

        Rules:
        - If input says "Sold Put", map to "Cash-Secured Put".
        - If input says "Sold Call" or "Covered Call", map to "Covered Call".
        - If input says "Bought Call" with expiration > 1 year, map to "LEAPS".
        - Do not output markdown code blocks, just raw JSON.
        `;

        let contentsPayload: any;

        if (aiMode === 'image' && aiPreview && aiFile) {
             const base64Data = aiPreview.split(',')[1];
             contentsPayload = {
                 parts: [
                     { inlineData: { mimeType: aiFile.type, data: base64Data } },
                     { text: prompt }
                 ]
             };
        } else {
             contentsPayload = {
                 parts: [{ text: prompt + `\n\nInput Data:\n${aiText}` }]
             };
        }

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: contentsPayload
        });

        const text = response.text;
        if (!text) throw new Error("No response from AI");

        // Clean markdown if present
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const extracted = JSON.parse(jsonStr);

        // Update form
        setFormData(prev => ({
            ...prev,
            ...extracted,
            // Ensure enums match exactly if AI returned slight variation, though prompt instructions are strict
            ticker: extracted.ticker?.toUpperCase() || prev.ticker
        }));

        setShowAiModal(false);
        setAiText('');
        setAiFile(null);
        setAiPreview(null);
    } catch (e: any) {
        console.error("AI Error:", e);
        setAiError(e.message || "Failed to extract data. Please try again or enter manually.");
    } finally {
        setIsAnalyzing(false);
    }
  };

  if (!isOpen) return null;

  // Filter cycles for the selected ticker
  const relevantCycles = existingCycles.filter(c => 
      !formData.ticker || c.ticker.toLowerCase() === formData.ticker?.toLowerCase()
  );

  return (
    <>
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-surface w-full max-w-3xl rounded-xl border border-slate-700 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50 rounded-t-xl">
          <div className="flex items-center gap-4">
             <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                {initialData ? 'Edit Trade' : 'New Trade'}
                <span className="text-xs font-normal text-slate-400 bg-slate-800 px-2 py-1 rounded border border-slate-700">
                {formData.strategy}
                </span>
            </h2>
            {!initialData && (
                <button 
                    onClick={() => setShowAiModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-xs font-bold rounded-full shadow-lg transition-all border border-white/10 group"
                >
                    <Sparkles size={12} className="group-hover:animate-spin-slow" /> AI Autofill
                </button>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Top Row: Ticker & Strategy */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Ticker Symbol</label>
              <input
                required
                name="ticker"
                value={formData.ticker}
                onChange={handleTickerChange}
                className="w-full bg-background border border-slate-600 rounded-lg px-3 py-2 text-slate-100 focus:border-primary focus:outline-none font-mono uppercase"
                placeholder="AAPL"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Strategy</label>
              <select
                name="strategy"
                value={formData.strategy}
                onChange={handleChange}
                className="w-full bg-background border border-slate-600 rounded-lg px-3 py-2 text-slate-100 focus:border-primary focus:outline-none"
              >
                {Object.values(StrategyType).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Entry Date</label>
              <input
                type="date"
                name="entryDate"
                required
                value={formData.entryDate}
                onChange={handleChange}
                className="w-full bg-background border border-slate-600 rounded-lg px-3 py-2 text-slate-100 focus:border-primary focus:outline-none"
              />
            </div>
            {formData.strategy !== StrategyType.STOCK_BUY && (
                <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Expiration Date</label>
                <input
                    type="date"
                    name="expirationDate"
                    required
                    value={formData.expirationDate}
                    onChange={handleChange}
                    className="w-full bg-background border border-slate-600 rounded-lg px-3 py-2 text-slate-100 focus:border-primary focus:outline-none"
                />
                </div>
            )}
          </div>

          {/* Pricing Data */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Strike Price</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-500">$</span>
                <input
                  type="number"
                  step="0.5"
                  name="strikePrice"
                  value={formData.strikePrice}
                  onChange={handleChange}
                  className="w-full bg-background border border-slate-600 rounded-lg pl-6 pr-2 py-2 text-slate-100 focus:border-primary focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Premium / Share</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  name="premium"
                  value={formData.premium}
                  onChange={handleChange}
                  className="w-full bg-background border border-slate-600 rounded-lg pl-6 pr-2 py-2 text-slate-100 focus:border-primary focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                 {formData.strategy === StrategyType.STOCK_BUY ? "Lots (1 = 100 shares)" : "Contracts"}
              </label>
              <input
                type="number"
                name="contracts"
                step="0.01"
                value={formData.contracts}
                onChange={handleChange}
                className="w-full bg-background border border-slate-600 rounded-lg px-3 py-2 text-slate-100 focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Underlying Price</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  name="underlyingPrice"
                  value={formData.underlyingPrice}
                  onChange={handleChange}
                  className="w-full bg-background border border-slate-600 rounded-lg pl-6 pr-2 py-2 text-slate-100 focus:border-primary focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Status & Fees */}
          <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700/50">
            <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <Calculator size={14} /> Trade Outcome & Management
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Status</label>
                    <select
                        name="status"
                        value={formData.status}
                        onChange={handleStatusChange}
                        className="w-full bg-background border border-slate-600 rounded-lg px-3 py-2 text-slate-100 focus:border-primary focus:outline-none"
                    >
                        {Object.values(TradeStatus).map(s => (
                        <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </div>
                 <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Commission/Fees</label>
                    <div className="relative">
                        <span className="absolute left-3 top-2 text-slate-500">$</span>
                        <input
                        type="number"
                        step="0.01"
                        name="fees"
                        value={formData.fees}
                        onChange={handleChange}
                        className="w-full bg-background border border-slate-600 rounded-lg pl-6 pr-2 py-2 text-slate-100 focus:border-primary focus:outline-none"
                        />
                    </div>
                </div>
                {formData.status !== TradeStatus.OPEN && (
                    <>
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Closing Price (Debit/Credit)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-2 text-slate-500">$</span>
                            <input
                            type="number"
                            step="0.01"
                            name="closePrice"
                            value={formData.closePrice || 0}
                            onChange={handleChange}
                            className="w-full bg-background border border-slate-600 rounded-lg pl-6 pr-2 py-2 text-slate-100 focus:border-primary focus:outline-none"
                            />
                        </div>
                    </div>
                     <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Closing Date</label>
                        <input
                            type="date"
                            name="closeDate"
                            value={formData.closeDate || ''}
                            onChange={handleChange}
                            className="w-full bg-background border border-slate-600 rounded-lg px-3 py-2 text-slate-100 focus:border-primary focus:outline-none"
                        />
                    </div>
                    </>
                )}
            </div>
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-400">
                <div className="flex flex-col">
                    <span className="text-xs text-slate-500">Total Premium / Cost</span>
                    <span className="text-emerald-400 font-mono">${totalPremium.toFixed(2)}</span>
                </div>
                {breakEven > 0 && (
                     <div className="flex flex-col">
                        <span className="text-xs text-slate-500">Breakeven</span>
                        <span className="text-blue-400 font-mono">${breakEven.toFixed(2)}</span>
                    </div>
                )}
            </div>
          </div>

          {/* Wheel Management - Hidden for LEAPS */}
          {formData.strategy !== StrategyType.LEAPS && (
             <div className="border-t border-slate-700 pt-4">
                <label className="block text-sm font-medium text-slate-400 mb-2">Wheel Cycle Link</label>
                <div className="flex flex-col gap-2">
                    <select 
                        name="cycleId" 
                        value={formData.cycleId} 
                        onChange={handleChange}
                        className="w-full bg-background border border-slate-600 rounded-lg px-3 py-2 text-slate-100 focus:border-primary focus:outline-none"
                    >
                        <option value="">Start New Cycle (or No Cycle)</option>
                        {relevantCycles.map(c => (
                            <option key={c.id} value={c.id}>
                                Link to: {c.ticker} - Started {c.label}
                            </option>
                        ))}
                    </select>
                    <p className="text-xs text-slate-500">
                        If this trade is part of an ongoing wheel (e.g., selling a CC against previously assigned stock), select the cycle here.
                    </p>
                </div>
            </div>
          )}

          {/* Notes & Tags */}
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Notes</label>
              <textarea
                rows={3}
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Why did you take this trade?"
                className="w-full bg-background border border-slate-600 rounded-lg px-3 py-2 text-slate-100 focus:border-primary focus:outline-none resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Tags (Press Enter)</label>
              <div className="flex flex-wrap gap-2 p-2 bg-background border border-slate-600 rounded-lg min-h-[42px]">
                {formData.tags?.map(tag => (
                  <span key={tag} className="flex items-center gap-1 bg-slate-700 text-slate-200 px-2 py-0.5 rounded text-sm">
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)} className="hover:text-white"><X size={12} /></button>
                  </span>
                ))}
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={addTag}
                  className="flex-1 bg-transparent focus:outline-none min-w-[100px] text-slate-200"
                  placeholder={formData.tags?.length === 0 ? "earning, high-iv..." : ""}
                />
              </div>
            </div>
          </div>

        </form>

        <div className="p-4 border-t border-slate-700 flex justify-end gap-4 bg-slate-800/50 rounded-b-xl">
          <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white transition-colors">
            Cancel
          </button>
          <button 
            onClick={handleSubmit}
            className="px-6 py-2 bg-primary hover:bg-blue-600 text-white rounded-lg font-medium flex items-center gap-2 transition-colors shadow-lg shadow-blue-500/20"
          >
            <Save size={18} /> Save Trade
          </button>
        </div>
      </div>
    </div>

    {/* AI Autofill Modal */}
    {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
             <div className="bg-surface w-full max-w-lg rounded-xl border border-slate-600 shadow-2xl overflow-hidden animate-scale-in">
                  <div className="p-4 border-b border-slate-700 bg-gradient-to-r from-purple-900/30 to-blue-900/30 flex justify-between items-center">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                          <Sparkles size={18} className="text-purple-400" /> AI Autofill
                      </h3>
                      <button onClick={() => setShowAiModal(false)} className="text-slate-400 hover:text-white">
                          <X size={20} />
                      </button>
                  </div>

                  <div className="p-6">
                      <p className="text-sm text-slate-300 mb-4">
                          Paste your trade details or upload a screenshot to automatically populate the form.
                      </p>

                      <div className="flex gap-2 mb-4 p-1 bg-slate-900/50 rounded-lg">
                          <button 
                             onClick={() => setAiMode('text')}
                             className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${aiMode === 'text' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                          >
                             <div className="flex items-center justify-center gap-2"><Type size={14}/> Text Input</div>
                          </button>
                          <button 
                             onClick={() => setAiMode('image')}
                             className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${aiMode === 'image' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                          >
                             <div className="flex items-center justify-center gap-2"><ImageIcon size={14}/> Image / Screenshot</div>
                          </button>
                      </div>

                      <div className="min-h-[150px]">
                          {aiMode === 'text' ? (
                              <textarea 
                                 value={aiText}
                                 onChange={(e) => setAiText(e.target.value)}
                                 onPaste={handlePaste}
                                 placeholder="e.g. Sold 5 AMD Puts strike 110 exp Nov 17 for 1.50..."
                                 className="w-full h-40 bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 text-sm focus:border-purple-500 focus:outline-none resize-none"
                              />
                          ) : (
                              <div 
                                className="border-2 border-dashed border-slate-700 hover:border-purple-500/50 rounded-lg h-40 flex flex-col items-center justify-center cursor-pointer bg-slate-900/30 transition-colors relative overflow-hidden"
                                onClick={() => fileInputRef.current?.click()}
                                onPaste={handlePaste}
                              >
                                  {aiPreview ? (
                                      <img src={aiPreview} alt="Preview" className="h-full w-full object-contain" />
                                  ) : (
                                      <>
                                        <Upload size={32} className="text-slate-600 mb-2" />
                                        <p className="text-xs text-slate-500 font-medium">Click to Upload or Paste Image</p>
                                      </>
                                  )}
                                  <input 
                                     ref={fileInputRef}
                                     type="file" 
                                     accept="image/*" 
                                     className="hidden" 
                                     onChange={handleFileChange}
                                  />
                              </div>
                          )}
                      </div>

                      {aiError && (
                          <div className="mt-3 p-2 bg-rose-500/10 border border-rose-500/30 rounded text-xs text-rose-300">
                              {aiError}
                          </div>
                      )}

                      <div className="mt-6 flex justify-end gap-3">
                          <button 
                             onClick={() => setShowAiModal(false)}
                             className="px-4 py-2 text-slate-400 hover:text-white text-sm"
                          >
                             Cancel
                          </button>
                          <button 
                             onClick={handleAiAnalyze}
                             disabled={isAnalyzing || (aiMode === 'text' ? !aiText : !aiFile)}
                             className={`px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-purple-900/20 flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                             {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                             {isAnalyzing ? 'Analyzing...' : 'Autofill Form'}
                          </button>
                      </div>
                  </div>
             </div>
        </div>
    )}
    </>
  );
};
