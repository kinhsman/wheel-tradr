import React, { useState, useEffect, useCallback } from 'react';
import { StorageService } from './services/storageService';
import { Trade } from './types';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { TradeList } from './components/TradeList';
import { TradeForm } from './components/TradeForm';
import { CycleView } from './components/CycleView';

function App() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [currentView, setCurrentView] = useState('dashboard');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | undefined>(undefined);
  const [filterCycleId, setFilterCycleId] = useState<string | null>(null);

  useEffect(() => {
    // Load data on mount
    const loadedTrades = StorageService.getTrades();
    setTrades(loadedTrades);
  }, []);

  const handleSaveTrade = (trade: Trade) => {
    if (editingTrade) {
      StorageService.updateTrade(trade);
    } else {
      StorageService.addTrade(trade);
    }
    // Refresh local state
    setTrades(StorageService.getTrades());
    setEditingTrade(undefined);
  };

  const handleDeleteTrade = (id: string) => {
    if (window.confirm('Are you sure you want to delete this trade?')) {
      StorageService.deleteTrade(id);
      setTrades(StorageService.getTrades());
    }
  };

  const handleEditTrade = (trade: Trade) => {
    setEditingTrade(trade);
    setIsFormOpen(true);
  };

  const handleNewTrade = () => {
    setEditingTrade(undefined);
    setIsFormOpen(true);
  };

  const handleViewCycle = (cycleId: string) => {
      setFilterCycleId(cycleId);
      setCurrentView('cycles');
  };

  // Prepare cycles list for the form dropdown
  const cyclesList = React.useMemo(() => {
      const uniqueCycles = new Set<string>();
      const list: {id: string, ticker: string, label: string}[] = [];
      trades.forEach(t => {
          if (t.cycleId && !uniqueCycles.has(t.cycleId)) {
              uniqueCycles.add(t.cycleId);
              list.push({
                  id: t.cycleId,
                  ticker: t.ticker,
                  label: t.entryDate
              });
          }
      });
      return list;
  }, [trades]);

  const filteredTradesForCycles = filterCycleId 
    ? trades.filter(t => t.cycleId === filterCycleId) 
    : trades;

  return (
    <Layout 
      currentView={currentView} 
      onChangeView={(view) => { setCurrentView(view); setFilterCycleId(null); }}
      onNewTrade={handleNewTrade}
    >
      {currentView === 'dashboard' && <Dashboard trades={trades} />}
      
      {currentView === 'trades' && (
        <TradeList 
          trades={trades} 
          onEdit={handleEditTrade} 
          onDelete={handleDeleteTrade}
          onViewCycle={handleViewCycle}
        />
      )}

      {currentView === 'cycles' && <CycleView trades={filteredTradesForCycles} />}

      <TradeForm 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
        initialData={editingTrade}
        onSave={handleSaveTrade}
        existingCycles={cyclesList}
      />
    </Layout>
  );
}

export default App;