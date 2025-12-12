
import React, { useState, useEffect, useCallback } from 'react';
import { StorageService } from './services/storageService';
import { MarketService } from './services/marketService';
import { Trade, TradeStatus, StrategyType } from './types';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { TradeList } from './components/TradeList';
import { TradeForm } from './components/TradeForm';
import { CycleView } from './components/CycleView';
import { Settings } from './components/Settings';
import { PerformanceCalendar } from './components/PerformanceCalendar';
import { PerformanceSummary } from './components/PerformanceSummary';

function App() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [monthlyGoal, setMonthlyGoal] = useState(1000);
  const [accountValue, setAccountValue] = useState(0);
  const [incomeTargetPercent, setIncomeTargetPercent] = useState(3);
  const [tickerPrices, setTickerPrices] = useState<Record<string, number>>({});
  const [manualVix, setManualVix] = useState(15);
  const [currentView, setCurrentView] = useState('dashboard');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | undefined>(undefined);
  const [filterCycleId, setFilterCycleId] = useState<string | null>(null);
  const [isRefreshingPrices, setIsRefreshingPrices] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  
  const loadData = useCallback(() => {
    const loadedTrades = StorageService.getTrades();
    const settings = StorageService.getSettings();
    setTrades(loadedTrades);
    setMonthlyGoal(settings.monthlyGoal);
    setAccountValue(settings.totalAccountValue || 0);
    setIncomeTargetPercent(settings.incomeTargetPercent || 3);
    setTickerPrices(settings.tickerPrices || {});
    setManualVix(settings.manualVix || 15);
    setHasApiKey(!!settings.finnhubApiKey);
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

  const handleUpdateVix = (vix: number) => {
      setManualVix(vix);
      const settings = StorageService.getSettings();
      StorageService.saveSettings({ ...settings, manualVix: vix });
  };

  const handleRefreshMarketData = async () => {
    const settings = StorageService.getSettings();
    const apiKey = settings.finnhubApiKey;
    
    setIsRefreshingPrices(true);
    
    // Refresh Stock Prices (Requires API Key)
    let newPrices = { ...tickerPrices };
    
    if (apiKey) {
        const activeTickers = Array.from(new Set(
          trades.filter(t => t.status === TradeStatus.OPEN).map(t => t.ticker)
        )) as string[];

        if (activeTickers.length > 0) {
            const fetchedPrices = await MarketService.fetchQuotes(activeTickers, apiKey);
            newPrices = { ...newPrices, ...fetchedPrices };
            setTickerPrices(newPrices);
        }
    }

    StorageService.saveSettings({ ...settings, tickerPrices: newPrices });
    setIsRefreshingPrices(false);
  };

  const handleSaveTrade = (trade: Trade) => {
    // Only update if we are editing AND the trade ID matches the one being edited.
    // This allows the "Assignment" logic to pass a NEW trade (with no ID or different ID) 
    // which will correctly fall through to 'addTrade'.
    if (editingTrade && trade.id === editingTrade.id) {
      StorageService.updateTrade(trade);
      setEditingTrade(undefined);
    } else {
      StorageService.addTrade(trade);
    }
    loadData();
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

    const contracts = trade.contracts || 1;
    const totalFees = (trade.fees || 0) + exitFees;
    let pnl = 0;
    
    if (trade.strategy === StrategyType.LEAPS) {
        const entryDebit = (trade.premium || 0) * 100 * contracts;
        const exitCredit = closePrice * 100 * contracts;
        pnl = (exitCredit - entryDebit) - totalFees;
    } else {
        const entryCredit = (trade.premium || 0) * 100 * contracts;
        const exitDebit = closePrice * 100 * contracts;
        pnl = (entryCredit - exitDebit) - totalFees;
    }

    const updatedTrade: Trade = {
      ...trade,
      status: TradeStatus.CLOSED,
      closePrice: closePrice,
      closeDate: new Date().toISOString().split('T')[0],
      pnl: pnl,
      fees: totalFees
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
    <>
      <Layout 
        currentView={currentView} 
        onChangeView={(view) => { setCurrentView(view); setFilterCycleId(null); }}
        onNewTrade={handleNewTrade}
      >
        {currentView === 'dashboard' && (
          <Dashboard 
            trades={trades} 
            monthlyGoal={monthlyGoal}
            accountValue={accountValue}
            incomeTargetPercent={incomeTargetPercent}
            tickerPrices={tickerPrices}
            manualVix={manualVix}
            onUpdatePrice={handleUpdatePrice}
            onUpdateVix={handleUpdateVix}
            onEditGoal={() => setCurrentView('settings')}
            onRefreshPrices={handleRefreshMarketData}
            isRefreshing={isRefreshingPrices}
            hasApiKey={hasApiKey}
            onSettingsClick={() => setCurrentView('settings')}
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
        
        {currentView === 'perf-calendar' && <PerformanceCalendar trades={trades} />}
        {currentView === 'perf-summary' && <PerformanceSummary trades={trades} />}

        {currentView === 'settings' && <Settings onImportComplete={loadData} />}

      </Layout>
      
      {/* Moved TradeForm outside of Layout to ensure it sits on top of all z-indexes including the mobile header */}
      <TradeForm 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
        initialData={editingTrade}
        onSave={handleSaveTrade}
        existingCycles={cyclesList}
      />
    </>
  );
}

export default App;
