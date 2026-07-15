import type { ServiceType, Transaction } from "../types";

/** Services whose profit is derived at report time as (sum SELL total - sum BUY total). */
const AGGREGATE_PROFIT_SERVICES: ServiceType[] = ["PAYPAL", "WESTERN_UNION", "INSTAPAY_RECEIVE"];

export function isAggregateProfitService(service: ServiceType): boolean {
  return AGGREGATE_PROFIT_SERVICES.includes(service);
}

/** Profit for one service's set of transactions (used to build per-service report rows). */
export function computeServiceProfit(service: ServiceType, txs: Transaction[]): number {
  if (isAggregateProfitService(service)) {
    const buyTotal = txs.filter((t) => t.transactionType === "BUY").reduce((s, t) => s + t.total, 0);
    const sellTotal = txs.filter((t) => t.transactionType === "SELL").reduce((s, t) => s + t.total, 0);
    return sellTotal - buyTotal;
  }
  return txs.reduce((s, t) => s + t.profit, 0);
}

export interface ServiceSummary {
  service: ServiceType;
  buyTotal: number;
  sellTotal: number;
  profit: number;
  count: number;
}

export function summarizeByService(txs: Transaction[]): ServiceSummary[] {
  const byService = new Map<ServiceType, Transaction[]>();
  for (const tx of txs) {
    const list = byService.get(tx.serviceType) ?? [];
    list.push(tx);
    byService.set(tx.serviceType, list);
  }

  return Array.from(byService.entries()).map(([service, list]) => ({
    service,
    buyTotal: list.filter((t) => t.transactionType === "BUY").reduce((s, t) => s + t.total, 0),
    sellTotal: list.filter((t) => t.transactionType === "SELL").reduce((s, t) => s + t.total, 0),
    profit: computeServiceProfit(service, list),
    count: list.length,
  }));
}

export function totalProfit(txs: Transaction[]): number {
  return summarizeByService(txs).reduce((s, row) => s + row.profit, 0);
}
