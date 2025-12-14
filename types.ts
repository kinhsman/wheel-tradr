
export enum StrategyType {
  CSP = "Cash-Secured Put",
  CC = "Covered Call",
  PCS = "Put Credit Spread",
  STOCK_BUY = "Stock Purchase (Assignment)",
  STOCK_SELL = "Stock Sale (Called Away)",
  LONG_STOCK = "Long-Term Stock",
  LEAPS = "LEAPS"
}

export enum TradeStatus {
  OPEN = "Open",
  CLOSED = "Closed",
  ASSIGNED = "Assigned",
  EXPIRED = "Expired Worthless",
  ROLLED = "Rolled"
}

export interface Trade {
  id: string;
  ticker: string;
  strategy: StrategyType;
  entryDate: string;
  expirationDate: string;
  strikePrice: number;
  premium: number; // Per share
  contracts: number;
  underlyingPrice: number;
  fees: number;
  status: TradeStatus;
  closeDate?: string;
  closePrice?: number; // Per share (debit to close)
  notes: string;
  tags: string[];
  cycleId?: string; // Links related wheel trades
  pnl?: number; // Realized P&L
}

export interface Cycle {
  id: string;
  ticker: string;
  startDate: string;
  endDate?: string;
  isOpen: boolean;
  trades: Trade[];
  totalPnl: number;
  roi?: number;
}

export interface FilterState {
  ticker: string;
  status: string;
  dateRange: 'all' | 'mtd' | 'ytd';
}
