import React, { useState, useEffect, useCallback } from 'react';
import { StorageService } from './services/storageService';
import { Trade, TradeStatus } from './types';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { TradeList } from './components/TradeList';
import { TradeForm } from './components/TradeForm';
import { CycleView } from './components/CycleView';
import { Settings } from './components/Settings';

function App() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [monthlyGoal, setMonthlyGoal] = useState(1000);
  const [tickerPrices, setTickerPrices] = useState<Record<string, number>>({});
  const [currentView, setCurrentView] = useState('dashboard');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | undefined>(undefined);
  const [filterCycleId, setFilterCycleId] = useState<string | null>(null);

  const loadData = useCallback(() => {
    const loadedTrades = StorageService.getTrades();
    const settings = StorageService.getSettings();
    setTrades(loadedTrades);
    setMonthlyGoal(settings.monthlyGoal);
    setTickerPrices(settings.tickerPrices || {});
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUpdatePrice = (ticker: string, price: number) => {
    const newPrices = { ...tickerPrices, [ticker]: price };
    setTickerPrices(newPrices);
    const settings = StorageService.getSettings();
    StorageService.saveSettings({ ...settings, tickerPrices: newPrices });
  };

  const handleSaveTrade = (trade: Trade) => {
    if (editingTrade) {
      StorageService.updateTrade(trade);
    } else {
      StorageService.addTrade(trade);
    }
    loadData();
    setEditingTrade(undefined);
  };

  const handleDeleteTrade = (id: string) => {
    if (window.confirm('Are you sure you want to delete this trade?')) {
      StorageService.deleteTrade(id);
      loadData();
    }
  };

  const handleEditTrade = (trade: Trade) => {
    setEditingTrade(trade);
    setIsFormOpen(true);
  };

  const handleQuickClose = (tradeId: string, closePrice: number, exitFees: number = 0) => {
    const trade = trades.find(t => t.id === tradeId);
    if (!trade) return;

    // Calculate P&L: (Entry Credit - Exit Debit) - (Entry Fees + Exit Fees)
    // Entry Credit = Premium * Contracts * 100
    // Exit Debit = ClosePrice * Contracts * 100
    const contracts = trade.contracts || 1;
    const entryCredit = (trade.premium || 0) * 100 * contracts;
    const exitDebit = closePrice * 100 * contracts;
    
    const totalFees = (trade.fees || 0) + exitFees;
    
    const pnl = (entryCredit - exitDebit) - totalFees;

    const updatedTrade: Trade = {
      ...trade,
      status: TradeStatus.CLOSED,
      closePrice: closePrice,
      closeDate: new Date().toISOString().split('T')[0],
      pnl: pnl,
      fees: totalFees // Update total fees for the record
    };

    StorageService.updateTrade(updatedTrade);
    loadData();
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
      {currentView === 'dashboard' && (
        <Dashboard 
          trades={trades} 
          monthlyGoal={monthlyGoal} 
          tickerPrices={tickerPrices}
          onUpdatePrice={handleUpdatePrice}
          onEditGoal={() => setCurrentView('settings')}
        />
      )}
      
      {currentView === 'trades' && (
        <TradeList 
          trades={trades} 
          onEdit={handleEditTrade} 
          onDelete={handleDeleteTrade}
          onViewCycle={handleViewCycle}
          onQuickClose={handleQuickClose}
        />
      )}

      {currentView === 'cycles' && <CycleView trades={filteredTradesForCycles} />}
      
      {currentView === 'settings' && <Settings onImportComplete={loadData} />}

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