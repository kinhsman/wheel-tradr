import React, { useRef, useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { Download, Upload, Trash2, AlertTriangle, CheckCircle, Database, Target, Save } from 'lucide-react';

interface SettingsProps {
  onImportComplete: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ onImportComplete }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  
  // Goal State
  const [monthlyGoal, setMonthlyGoal] = useState<number>(1000);
  const [isGoalSaved, setIsGoalSaved] = useState(false);

  useEffect(() => {
    const settings = StorageService.getSettings();
    setMonthlyGoal(settings.monthlyGoal);
  }, []);

  const handleSaveGoal = () => {
    const currentSettings = StorageService.getSettings();
    StorageService.saveSettings({ ...currentSettings, monthlyGoal });
    setIsGoalSaved(true);
    setTimeout(() => setIsGoalSaved(false), 2000);
    onImportComplete(); // Triggers app refresh to update dashboard
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
          onImportComplete();
        } else {
          setImportStatus('error');
          setMessage('Failed to import data. Invalid format.');
        }
        
        // Reset file input
        if (fileInputRef.current) fileInputRef.current.value = '';
        
        setTimeout(() => {
            setImportStatus('idle');
            setMessage('');
        }, 5000);
      }
    };
    reader.readAsText(file);
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to delete ALL trades? This cannot be undone.')) {
      StorageService.saveTrades([]);
      onImportComplete(); // Triggers a reload of data
      setMessage('All data cleared.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            <Database className="text-primary" /> Settings & Data
        </h2>
        <p className="text-slate-400">
            Configure your trading goals and manage your data.
        </p>
      </div>

      {/* Goal Setting */}
      <div className="bg-surface p-6 rounded-xl border border-slate-700 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <Target size={20} className="text-amber-400" /> Financial Goals
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
            <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Monthly Profit Target ($)</label>
                <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-500">$</span>
                    <input 
                        type="number" 
                        value={monthlyGoal}
                        onChange={(e) => setMonthlyGoal(Number(e.target.value))}
                        className="w-full bg-background border border-slate-600 rounded-lg pl-8 pr-4 py-2 text-slate-100 focus:border-primary focus:outline-none"
                    />
                </div>
                <p className="text-xs text-slate-500 mt-2">
                    Used to track your progress on the dashboard based on realized P&L.
                </p>
            </div>
            <button 
                onClick={handleSaveGoal}
                className={`py-2 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                    isGoalSaved 
                    ? 'bg-emerald-500 text-white' 
                    : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                }`}
            >
                {isGoalSaved ? <CheckCircle size={18} /> : <Save size={18} />}
                {isGoalSaved ? 'Saved!' : 'Save Goal'}
            </button>
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
    </div>
  );
};