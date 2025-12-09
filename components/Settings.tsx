
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
  
  // Import Modal State
  const [showImportWarning, setShowImportWarning] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  
  // Settings State
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

  // Helper to persist current state to storage
  const persistSettings = () => {
      const currentSettings = StorageService.getSettings();
      StorageService.saveSettings({ 
        ...currentSettings, 
        monthlyGoal,
        totalAccountValue,
        incomeTargetPercent,
        finnhubApiKey: apiKey.trim()
      });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
      onImportComplete(); // Triggers app refresh to update dashboard
  };

  // Logic: When Account Value or Percent changes, update Goal
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
      // Reverse calc percentage
      if (totalAccountValue > 0) {
          const newPercent = (val / totalAccountValue) * 100;
          setIncomeTargetPercent(parseFloat(newPercent.toFixed(2)));
      }
  };

  const handleExport = () => {
    const exportData = StorageService.getFullExport();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    const date = new Date().toISOString().split('T')[0];
    downloadAnchorNode.setAttribute("download", `wheeltradr_backup_${date}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    
    setMessage('Export started successfully.');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Store file and show custom warning modal instead of blocking window.confirm
    setPendingFile(file);
    setShowImportWarning(true);

    // Reset input immediately to allow re-selection if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const confirmImport = () => {
    if (!pendingFile) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const success = StorageService.importData(event.target.result as string);
        if (success) {
          setImportStatus('success');
          setMessage('Data imported successfully!');
          // Refresh local state
          const settings = StorageService.getSettings();
          setMonthlyGoal(settings.monthlyGoal);
          setTotalAccountValue(settings.totalAccountValue || 0);
          setIncomeTargetPercent(settings.incomeTargetPercent || 3);
          setApiKey(settings.finnhubApiKey || '');
          onImportComplete();
        } else {
          setImportStatus('error');
          setMessage('Failed to import data. Invalid format.');
        }
        
        setTimeout(() => {
            setImportStatus('idle');
            setMessage('');
        }, 5000);
      }
    };
    reader.readAsText(pendingFile);
    
    // Cleanup
    setShowImportWarning(false);
    setPendingFile(null);
  };

  const cancelImport = () => {
      setShowImportWarning(false);
      setPendingFile(null);
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to delete ALL trades? This cannot be undone.')) {
      StorageService.saveTrades([]);
      onImportComplete(); // Triggers a reload of data
      setMessage('All data cleared.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in relative">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            <Database className="text-primary" /> Settings & Data
        </h2>
        <p className="text-slate-400">
            Configure your trading goals, API connections, and manage your data.
        </p>
      </div>

      {/* Goal & API Configuration */}
      <div className="bg-surface p-6 rounded-xl border border-slate-700 shadow-sm">
        <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                <Target size={20} className="text-amber-400" /> Configuration
            </h3>
            <span className={`text-xs font-medium flex items-center gap-1 transition-all ${isSaved ? 'text-emerald-400 opacity-100' : 'text-slate-500 opacity-0'}`}>
                <CheckCircle size={12} /> Auto-saved
            </span>
        </div>
        
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Total Account Value ($)</label>
                    <div className="relative">
                        <span className="absolute left-3 top-2.5 text-slate-500">$</span>
                        <input 
                            type="number" 
                            value={totalAccountValue}
                            onChange={(e) => handleAccountValueChange(Number(e.target.value))}
                            onBlur={persistSettings}
                            className="w-full bg-background border border-slate-600 rounded-lg pl-8 pr-4 py-2 text-slate-100 focus:border-primary focus:outline-none"
                            placeholder="e.g. 50000"
                        />
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                        Used to calculate target income.
                    </p>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Income Target (%)</label>
                    <div className="relative">
                        <input 
                            type="number" 
                            value={incomeTargetPercent}
                            onChange={(e) => handlePercentChange(Number(e.target.value))}
                            onBlur={persistSettings}
                            step="0.1"
                            className="w-full bg-background border border-slate-600 rounded-lg pl-3 pr-8 py-2 text-slate-100 focus:border-primary focus:outline-none"
                            placeholder="3.0"
                        />
                        <span className="absolute right-3 top-2.5 text-slate-500">%</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                        Monthly return goal (Default: 3%).
                    </p>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Monthly Profit Target ($)</label>
                    <div className="relative">
                        <span className="absolute left-3 top-2.5 text-slate-500">$</span>
                        <input 
                            type="number" 
                            value={monthlyGoal}
                            onChange={(e) => handleGoalChange(Number(e.target.value))}
                            onBlur={persistSettings}
                            className="w-full bg-background border border-slate-600 rounded-lg pl-8 pr-4 py-2 text-slate-100 focus:border-primary focus:outline-none"
                        />
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                        Calculated: {incomeTargetPercent}% of ${totalAccountValue.toLocaleString()}
                    </p>
                </div>
            </div>

            <div className="border-t border-slate-700 pt-6">
                 <div className="max-w-md">
                    <label className="block text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
                        Finnhub API Key <Key size={14} className="text-slate-500" />
                    </label>
                    <input 
                        type="password" 
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        onBlur={persistSettings}
                        placeholder="Enter your API key"
                        className="w-full bg-background border border-slate-600 rounded-lg px-4 py-2 text-slate-100 focus:border-primary focus:outline-none"
                    />
                    <p className="text-xs text-slate-500 mt-2">
                        Required for auto-fetching prices. <a href="https://finnhub.io/register" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">Get a free key</a>.
                    </p>
                </div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export Card */}
        <div className="bg-surface p-6 rounded-xl border border-slate-700 shadow-sm flex flex-col justify-between">
            <div>
                <h3 className="text-lg font-semibold text-slate-200 mb-2 flex items-center gap-2">
                    <Download size={20} className="text-blue-400" /> Export Data
                </h3>
                <p className="text-sm text-slate-400 mb-6">
                    Download a backup of your trades and settings.
                </p>
            </div>
            <button 
                onClick={handleExport}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
                <Download size={18} /> Download Backup
            </button>
        </div>

        {/* Import Card */}
        <div className="bg-surface p-6 rounded-xl border border-slate-700 shadow-sm flex flex-col justify-between">
            <div>
                <h3 className="text-lg font-semibold text-slate-200 mb-2 flex items-center gap-2">
                    <Upload size={20} className="text-emerald-400" /> Import Data
                </h3>
                <p className="text-sm text-slate-400 mb-6">
                    Restore from backup.
                    <span className="text-amber-400 block mt-1 text-xs font-medium">Warning: Overwrites current data.</span>
                </p>
            </div>
            <div>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept=".json" 
                    className="hidden" 
                />
                <button 
                    onClick={handleImportClick}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                    <Upload size={18} /> Select Backup File
                </button>
            </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-surface p-6 rounded-xl border border-red-900/30 shadow-sm col-span-1 md:col-span-2 mt-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h3 className="text-lg font-semibold text-red-400 mb-1 flex items-center gap-2">
                        <AlertTriangle size={20} /> Danger Zone
                    </h3>
                    <p className="text-sm text-slate-400">
                        Permanently delete all local data. This action cannot be undone.
                    </p>
                </div>
                <button 
                    onClick={handleReset}
                    className="px-6 py-2 bg-transparent border border-red-500/50 text-red-400 hover:bg-red-500/10 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                    <Trash2 size={18} /> Clear All Data
                </button>
            </div>
        </div>
      </div>

      {/* Status Messages */}
      {message && (
          <div className={`fixed bottom-8 right-8 p-4 rounded-lg shadow-xl flex items-center gap-3 animate-slide-up border ${
             importStatus === 'error' ? 'bg-red-500/20 border-red-500 text-red-200' : 'bg-slate-800 border-slate-600 text-slate-200'
          }`}>
             {importStatus === 'success' ? <CheckCircle className="text-emerald-400" /> : <Database className="text-blue-400" />}
             {message}
          </div>
      )}

      {/* Custom Import Confirmation Modal */}
      {showImportWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-surface w-full max-w-md rounded-xl border border-amber-500/50 shadow-2xl overflow-hidden animate-scale-in">
                <div className="p-4 border-b border-slate-700 bg-amber-500/10 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-amber-400 flex items-center gap-2">
                        <AlertTriangle size={20} /> Overwrite Warning
                    </h3>
                    <button onClick={cancelImport} className="text-slate-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6">
                    <p className="text-slate-300 text-sm mb-4">
                        You are about to restore data from a backup file:
                        <br />
                        <span className="font-mono bg-slate-800 px-1 rounded text-white">{pendingFile?.name}</span>
                    </p>
                    <p className="text-slate-300 text-sm mb-6">
                        <strong className="text-rose-400">This action will completely overwrite</strong> your current trades, settings, and journal entries. This cannot be undone.
                    </p>
                    <div className="flex gap-3">
                        <button 
                            onClick={cancelImport}
                            className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={confirmImport}
                            className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-medium transition-colors shadow-lg shadow-rose-500/20"
                        >
                            Yes, Overwrite
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
    