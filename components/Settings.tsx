
import React, { useRef, useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { Download, Upload, Trash2, AlertTriangle, CheckCircle, Database, Target, Save, Key, RefreshCw, X } from 'lucide-react';

interface SettingsProps {
  onImportComplete: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ onImportComplete }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  
  const [showImportWarning, setShowImportWarning] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  
  const [monthlyGoal, setMonthlyGoal] = useState<number>(1000);
  const [totalAccountValue, setTotalAccountValue] = useState<number>(0);
  const [incomeTargetPercent, setIncomeTargetPercent] = useState<number>(3);
  const [apiKey, setApiKey] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const settings = StorageService.getSettings();
    setMonthlyGoal(settings.monthlyGoal);
    setTotalAccountValue(settings.totalAccountValue || 0);
    setIncomeTargetPercent(settings.incomeTargetPercent || 3);
    setApiKey(settings.finnhubApiKey || '');
  }, []);

  const persistSettings = () => {
      const currentSettings = StorageService.getSettings();
      StorageService.saveSettings({ ...currentSettings, monthlyGoal, totalAccountValue, incomeTargetPercent, finnhubApiKey: apiKey.trim() });
      setIsSaved(true); setTimeout(() => setIsSaved(false), 2000);
      onImportComplete();
  };

  const handleAccountValueChange = (val: number) => {
      setTotalAccountValue(val);
      const newGoal = (val * incomeTargetPercent) / 100;
      setMonthlyGoal(Math.round(newGoal)); 
  };

  const handlePercentChange = (val: number) => {
      setIncomeTargetPercent(val);
      const newGoal = (totalAccountValue * val) / 100;
      setMonthlyGoal(Math.round(newGoal));
  };

  const handleGoalChange = (val: number) => {
      setMonthlyGoal(val);
      if (totalAccountValue > 0) setIncomeTargetPercent(parseFloat(((val / totalAccountValue) * 100).toFixed(2)));
  };

  const handleExport = () => {
    const exportData = StorageService.getFullExport();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `wheeltradr_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode); downloadAnchorNode.click(); downloadAnchorNode.remove();
    setMessage('Export started successfully.'); setTimeout(() => setMessage(''), 3000);
  };

  const handleImportClick = () => fileInputRef.current?.click();
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file); setShowImportWarning(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const confirmImport = () => {
    if (!pendingFile) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result && StorageService.importData(event.target.result as string)) {
          setImportStatus('success'); setMessage('Data imported successfully!');
          const settings = StorageService.getSettings();
          setMonthlyGoal(settings.monthlyGoal); setTotalAccountValue(settings.totalAccountValue || 0); setIncomeTargetPercent(settings.incomeTargetPercent || 3); setApiKey(settings.finnhubApiKey || '');
          onImportComplete();
      } else { setImportStatus('error'); setMessage('Failed to import data. Invalid format.'); }
      setTimeout(() => { setImportStatus('idle'); setMessage(''); }, 5000);
    };
    reader.readAsText(pendingFile); setShowImportWarning(false); setPendingFile(null);
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to delete ALL trades? This cannot be undone.')) {
      StorageService.saveTrades([]); onImportComplete(); setMessage('All data cleared.');
    }
  };

  const inputClass = "w-full bg-black/30 border border-white/10 rounded-xl pl-8 pr-4 py-2 text-white focus:border-neon-blue focus:ring-1 focus:ring-neon-blue focus:outline-none transition-all font-mono";
  const labelClass = "block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2";

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in relative">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            <Database className="text-neon-blue" /> Settings & Data
        </h2>
        <p className="text-slate-400">Configure your trading goals, API connections, and manage your data.</p>
      </div>

      <div className="bg-white/5 backdrop-blur-md p-8 rounded-2xl border border-white/5 shadow-xl">
        <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                <Target size={20} className="text-neon-yellow" /> Configuration
            </h3>
            <span className={`text-xs font-bold uppercase tracking-wide flex items-center gap-1 transition-all ${isSaved ? 'text-neon-green opacity-100' : 'text-slate-400 opacity-0'}`}>
                <CheckCircle size={14} /> Auto-saved
            </span>
        </div>
        
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div>
                    <label className={labelClass}>Total Account Value</label>
                    <div className="relative"><span className="absolute left-3 top-2.5 text-slate-400">$</span><input type="number" value={totalAccountValue} onChange={(e) => handleAccountValueChange(Number(e.target.value))} onBlur={persistSettings} className={inputClass} /></div>
                </div>
                <div>
                    <label className={labelClass}>Income Target (%)</label>
                    <div className="relative"><input type="number" value={incomeTargetPercent} onChange={(e) => handlePercentChange(Number(e.target.value))} onBlur={persistSettings} step="0.1" className={inputClass} /><span className="absolute right-3 top-2.5 text-slate-400">%</span></div>
                </div>
                <div>
                    <label className={labelClass}>Monthly Profit Target</label>
                    <div className="relative"><span className="absolute left-3 top-2.5 text-slate-400">$</span><input type="number" value={monthlyGoal} onChange={(e) => handleGoalChange(Number(e.target.value))} onBlur={persistSettings} className={inputClass} /></div>
                </div>
            </div>

            <div className="border-t border-white/10 pt-8">
                 <div className="max-w-md">
                    <label className={`${labelClass} flex items-center gap-2`}>Finnhub API Key <Key size={14} /></label>
                    <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} onBlur={persistSettings} className={inputClass} placeholder="Enter Key" />
                    <p className="text-xs text-slate-500 mt-2">Required for price updates. <a href="https://finnhub.io/" target="_blank" className="text-blue-400 hover:underline">Get Free Key</a></p>
                </div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/5 shadow-lg flex flex-col justify-between hover:border-neon-blue/50 transition-colors">
            <div><h3 className="text-lg font-bold text-slate-200 mb-2 flex items-center gap-2"><Download size={20} className="text-blue-400" /> Export Data</h3><p className="text-sm text-slate-500 mb-6">Download a full JSON backup.</p></div>
            <button onClick={handleExport} className="w-full py-2.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/50 rounded-xl font-bold transition-all flex items-center justify-center gap-2"><Download size={18} /> Download Backup</button>
        </div>

        <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/5 shadow-lg flex flex-col justify-between hover:border-neon-green/50 transition-colors">
            <div><h3 className="text-lg font-bold text-slate-200 mb-2 flex items-center gap-2"><Upload size={20} className="text-neon-green" /> Import Data</h3><p className="text-sm text-slate-500 mb-6">Restore from backup file.</p></div>
            <div><input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" /><button onClick={handleImportClick} className="w-full py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/50 rounded-xl font-bold transition-all flex items-center justify-center gap-2"><Upload size={18} /> Select Backup File</button></div>
        </div>

        <div className="bg-rose-900/10 p-6 rounded-2xl border border-rose-500/20 shadow-lg col-span-1 md:col-span-2">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div><h3 className="text-lg font-bold text-rose-400 mb-1 flex items-center gap-2"><AlertTriangle size={20} /> Danger Zone</h3><p className="text-sm text-rose-200/60">Permanently delete all data.</p></div>
                <button onClick={handleReset} className="px-6 py-2.5 bg-transparent border border-rose-500/50 text-rose-400 hover:bg-rose-500/20 rounded-xl font-bold transition-colors flex items-center gap-2"><Trash2 size={18} /> Clear All Data</button>
            </div>
        </div>
      </div>

      {message && <div className={`fixed bottom-8 right-8 p-4 rounded-xl shadow-2xl flex items-center gap-3 animate-slide-up border backdrop-blur-xl ${importStatus === 'error' ? 'bg-rose-900/80 border-rose-500 text-white' : 'bg-slate-800/90 border-slate-600 text-white'}`}>{importStatus === 'success' ? <CheckCircle className="text-emerald-400" /> : <Database className="text-blue-400" />}{message}</div>}

      {showImportWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
            <div className="bg-obsidian w-full max-w-md rounded-2xl border border-amber-500 shadow-2xl overflow-hidden animate-scale-in">
                <div className="p-4 border-b border-amber-500/20 bg-amber-500/10 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-amber-500 flex items-center gap-2"><AlertTriangle size={20} /> Overwrite Warning</h3>
                    <button onClick={() => setShowImportWarning(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
                </div>
                <div className="p-6">
                    <p className="text-slate-300 text-sm mb-4">You are about to restore data from <span className="font-mono bg-white/10 px-1 rounded mx-1 font-bold">{pendingFile?.name}</span></p>
                    <p className="text-slate-300 text-sm mb-6"><strong className="text-rose-400">This action will overwrite</strong> your current data.</p>
                    <div className="flex gap-3">
                        <button onClick={() => setShowImportWarning(false)} className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 text-slate-200 rounded-xl font-bold transition-colors">Cancel</button>
                        <button onClick={confirmImport} className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-rose-500/20">Yes, Overwrite</button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
