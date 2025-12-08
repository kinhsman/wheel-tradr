import { Trade, StrategyType, TradeStatus } from '../types';

const STORAGE_KEY = 'wheeltradr_data_v1';

const generateId = () => Math.random().toString(36).substring(2, 9);

const SEED_DATA: Trade[] = [
  {
    id: 't1',
    ticker: 'AMD',
    strategy: StrategyType.CSP,
    entryDate: '2023-11-01',
    expirationDate: '2023-11-17',
    strikePrice: 110,
    premium: 1.50,
    contracts: 1,
    underlyingPrice: 112.50,
    fees: 0.65,
    status: TradeStatus.ASSIGNED,
    closeDate: '2023-11-17',
    closePrice: 0,
    notes: 'Starting the wheel on AMD. Bullish long term.',
    tags: ['tech', 'wheel-start'],
    cycleId: 'cycle_amd_1',
    pnl: 149.35 // (1.50 * 100) - 0.65
  },
  {
    id: 't2',
    ticker: 'AMD',
    strategy: StrategyType.STOCK_BUY,
    entryDate: '2023-11-17',
    expirationDate: '', // N/A for stock
    strikePrice: 0,
    premium: 0,
    contracts: 100, // Shares
    underlyingPrice: 110,
    fees: 0,
    status: TradeStatus.OPEN,
    notes: 'Assigned at 110 strike.',
    tags: ['assignment'],
    cycleId: 'cycle_amd_1',
    pnl: 0
  },
  {
    id: 't3',
    ticker: 'AMD',
    strategy: StrategyType.CC,
    entryDate: '2023-11-20',
    expirationDate: '2023-12-15',
    strikePrice: 120,
    premium: 2.10,
    contracts: 1,
    underlyingPrice: 111,
    fees: 0.65,
    status: TradeStatus.EXPIRED,
    closeDate: '2023-12-15',
    closePrice: 0,
    notes: 'Selling calls against assigned shares.',
    tags: ['income'],
    cycleId: 'cycle_amd_1',
    pnl: 209.35
  },
  {
    id: 't4',
    ticker: 'PLTR',
    strategy: StrategyType.CSP,
    entryDate: '2024-01-05',
    expirationDate: '2024-02-16',
    strikePrice: 15,
    premium: 0.45,
    contracts: 5,
    underlyingPrice: 16.20,
    fees: 3.25,
    status: TradeStatus.OPEN,
    notes: 'IV high before earnings. Selling OTM puts.',
    tags: ['earnings', 'high-iv'],
    cycleId: 'cycle_pltr_1',
    pnl: 0
  }
];

export const StorageService = {
  getTrades: (): Trade[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) {
        // Initialize with seed data if empty
        StorageService.saveTrades(SEED_DATA);
        return SEED_DATA;
      }
      return JSON.parse(data);
    } catch (e) {
      console.error("Error reading from storage", e);
      return [];
    }
  },

  saveTrades: (trades: Trade[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
    } catch (e) {
      console.error("Error saving to storage", e);
    }
  },

  addTrade: (trade: Omit<Trade, 'id'>) => {
    const trades = StorageService.getTrades();
    const newTrade = { ...trade, id: generateId() };
    const updatedTrades = [newTrade, ...trades];
    StorageService.saveTrades(updatedTrades);
    return newTrade;
  },

  updateTrade: (updatedTrade: Trade) => {
    const trades = StorageService.getTrades();
    const index = trades.findIndex(t => t.id === updatedTrade.id);
    if (index !== -1) {
      trades[index] = updatedTrade;
      StorageService.saveTrades(trades);
    }
  },

  deleteTrade: (id: string) => {
    const trades = StorageService.getTrades();
    const filtered = trades.filter(t => t.id !== id);
    StorageService.saveTrades(filtered);
  },

  importTrades: (jsonString: string): boolean => {
      try {
          const parsed = JSON.parse(jsonString);
          if (Array.isArray(parsed)) {
              StorageService.saveTrades(parsed);
              return true;
          }
          return false;
      } catch (e) {
          return false;
      }
  }
};