import React, { useState, useEffect } from 'react';
import { Trade, StrategyType, TradeStatus } from '../types';
import { X, Save, Calculator } from 'lucide-react';

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
        
        if (formData.strategy === StrategyType.STOCK_BUY) {
           // Stock buy doesn't have P&L until sold
           finalPnl = 0; 
        } else {
           // For short options (CSP, CC)
           // P&L = (Entry Premium - Exit Price) * Contracts - Fees
           finalPnl = (entryCredit - exitDebit) - (formData.fees || 0);
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

  if (!isOpen) return null;

  // Filter cycles for the selected ticker
  const relevantCycles = existingCycles.filter(c => 
      !formData.ticker || c.ticker.toLowerCase() === formData.ticker?.toLowerCase()
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-surface w-full max-w-3xl rounded-xl border border-slate-700 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50 rounded-t-xl">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            {initialData ? 'Edit Trade' : 'New Trade'}
            <span className="text-xs font-normal text-slate-400 bg-slate-800 px-2 py-1 rounded border border-slate-700">
               {formData.strategy}
            </span>
          </h2>
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
                onChange={(e) => handleChange({ ...e, target: { ...e.target, value: e.target.value.toUpperCase() } })}
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
                    required={formData.strategy !== StrategyType.STOCK_BUY}
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
              <label className="block text-xs font-medium text-slate-400 mb-1">Contracts</label>
              <input
                type="number"
                name="contracts"
                min="1"
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
                        <label className="block text-xs font-medium text-slate-400 mb-1">Closing Price (Debit)</label>
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
                    <span className="text-xs text-slate-500">Total Premium</span>
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

          {/* Wheel Management */}
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
  );
};