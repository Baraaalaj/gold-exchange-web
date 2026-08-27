export type ServiceType =
  | "USDT"
  | "PAYPAL"
  | "WESTERN_UNION"
  | "VODAFONE_RECEIVE"
  | "VODAFONE_SEND"
  | "INSTAPAY_RECEIVE"
  | "INSTAPAY_SEND"
  | "MANUAL";

export type TransactionType = "BUY" | "SELL";

export interface Transaction {
  id: string;
  serviceType: ServiceType;
  transactionType: TransactionType;
  amount: number;
  price: number;
  total: number;
  profit: number;
  avgBuyRate: number;
  person: string;
  note: string;
  timestamp: number;
  remainingAmount: number;
  lotId: string;
}

export interface DailyRate {
  id: string;
  buyRate: number;
  sellRate: number;
  dateKey: string;
}

export interface Person {
  id: string;
  name: string;
  debt: number;
  manualBalance: number;
  balanceFromTx: number;
  notes: string;
  createdAt: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  debt: number;
  notes: string;
  createdAt: number;
}

export interface ExternalRevenue {
  id: string;
  profit: number;
  timestamp: number;
  note: string;
}

export interface HomeNote {
  id: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export interface UsdtSettings {
  initialBalance: number;
}

export interface HomeNotesSettings {
  notes: HomeNote[];
}

export const SERVICE_LABELS: Record<ServiceType, string> = {
  USDT: "USDT",
  PAYPAL: "PayPal",
  WESTERN_UNION: "ويسترن يونيون",
  VODAFONE_RECEIVE: "فودافون كاش (استلام)",
  VODAFONE_SEND: "فودافون كاش (إرسال)",
  INSTAPAY_RECEIVE: "إنستاباي (استلام)",
  INSTAPAY_SEND: "إنستاباي (إرسال)",
  MANUAL: "عملية يدوية",
};
