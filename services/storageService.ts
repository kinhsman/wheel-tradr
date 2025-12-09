
import { Trade, StrategyType, TradeStatus } from '../types';

// Static keys for single-user mode
const CURRENT_STORAGE_KEY = 'wheeltradr_data_v1';
const CURRENT_SETTINGS_KEY = 'wheeltradr_settings_v1';

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
    contracts: 1, // 1 lot = 100 shares
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

export interface AppSettings {
  monthlyGoal: number;
  totalAccountValue: number;
  incomeTargetPercent: number;
  tickerPrices: Record<string, number>;
  finnhubApiKey?: string;
  lastVix?: number;
  manualVix?: number;
}

const DEFAULT_SETTINGS: AppSettings = {
  monthlyGoal: 1000,
  totalAccountValue: 33000, // Default seed
  incomeTargetPercent: 3, // Default 3%
  tickerPrices: {},
  finnhubApiKey: '',
  lastVix: 0,
  manualVix: 15
};

export const StorageService = {
  getTrades: (): Trade[] => {
    try {
      const data = localStorage.getItem(CURRENT_STORAGE_KEY);
      if (!data) {
        // Initialize with seed data if empty
        StorageService.saveTrades(SEED_DATA);
        return SEED_DATA;
      }
      
      let trades = JSON.parse(data);
      
      // MIGRATION: Fix legacy Stock trades
      let modified = false;
      trades = trades.map((t: Trade) => {
          if (t.strategy === StrategyType.STOCK_BUY && t.contracts >= 100) {
              modified = true;
              return { ...t, contracts: t.contracts / 100 };
          }
          return t;
      });

      if (modified) {
          StorageService.saveTrades(trades);
      }
      
      return trades;
    } catch (e) {
      console.error("Error reading from storage", e);
      return [];
    }
  },

  saveTrades: (trades: Trade[]) => {
    try {
      localStorage.setItem(CURRENT_STORAGE_KEY, JSON.stringify(trades));
    } catch (e) {
      console.error("Error saving to storage", e);
    }
  },

  getSettings: (): AppSettings => {
    try {
      const data = localStorage.getItem(CURRENT_SETTINGS_KEY);
      if (!data) return DEFAULT_SETTINGS;
      const parsed = JSON.parse(data);
      return { ...DEFAULT_SETTINGS, ...parsed };
    } catch (e) {
      return DEFAULT_SETTINGS;
    }
  },

  saveSettings: (settings: AppSettings) => {
    try {
      localStorage.setItem(CURRENT_SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error("Error saving settings", e);
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

  getFullExport: () => {
    return {
      version: 1,
      trades: StorageService.getTrades(),
      settings: StorageService.getSettings()
    };
  },

  importData: (jsonString: string): boolean => {
      try {
          const parsed = JSON.parse(jsonString);
          
          if (Array.isArray(parsed)) {
              StorageService.saveTrades(parsed);
              return true;
          }
          
          if (parsed.trades && Array.isArray(parsed.trades)) {
              StorageService.saveTrades(parsed.trades);
              if (parsed.settings) {
                StorageService.saveSettings(parsed.settings);
              }
              return true;
          }

          return false;
      } catch (e) {
          return false;
      }
  }
};
