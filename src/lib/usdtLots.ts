import type { Transaction } from "../types";

const PRICE_TOLERANCE = 0.0001;

export interface LotGroup {
  price: number;
  totalRemaining: number;
  totalOriginal: number;
  earliestTimestamp: number;
  docs: Transaction[]; // BUY docs with remainingAmount > 0, sorted oldest -> newest
}

/** Groups active BUY lots by price (within PRICE_TOLERANCE) for display only. */
export function groupBuyLots(buyTxs: Transaction[]): LotGroup[] {
  const active = buyTxs
    .filter((t) => t.transactionType === "BUY" && t.remainingAmount > 0)
    .sort((a, b) => a.timestamp - b.timestamp);

  const groups: LotGroup[] = [];

  for (const tx of active) {
    let group = groups.find((g) => Math.abs(g.price - tx.price) < PRICE_TOLERANCE);
    if (!group) {
      group = {
        price: tx.price,
        totalRemaining: 0,
        totalOriginal: 0,
        earliestTimestamp: tx.timestamp,
        docs: [],
      };
      groups.push(group);
    }
    group.docs.push(tx);
    group.totalRemaining += tx.remainingAmount;
    group.totalOriginal += tx.amount;
    group.earliestTimestamp = Math.min(group.earliestTimestamp, tx.timestamp);
  }

  return groups.sort((a, b) => a.earliestTimestamp - b.earliestTimestamp);
}

export interface FifoDeduction {
  lotId: string;
  deductAmount: number;
  newRemainingAmount: number;
}

/**
 * Deducts `amountToSell` from the given BUY docs oldest-first (FIFO).
 * `docs` should already be restricted to the price group being sold from.
 */
export function fifoDeduct(docs: Transaction[], amountToSell: number): FifoDeduction[] {
  const sorted = [...docs].sort((a, b) => a.timestamp - b.timestamp);
  const totalAvailable = sorted.reduce((sum, d) => sum + d.remainingAmount, 0);

  if (amountToSell <= 0) {
    throw new Error("المبلغ يجب أن يكون أكبر من صفر");
  }
  if (amountToSell > totalAvailable + 1e-9) {
    throw new Error("المبلغ المطلوب بيعه أكبر من المتاح في هذه الخانة");
  }

  const deductions: FifoDeduction[] = [];
  let remainingToDeduct = amountToSell;

  for (const doc of sorted) {
    if (remainingToDeduct <= 1e-9) break;
    const deduct = Math.min(doc.remainingAmount, remainingToDeduct);
    if (deduct <= 0) continue;
    deductions.push({
      lotId: doc.id,
      deductAmount: deduct,
      newRemainingAmount: doc.remainingAmount - deduct,
    });
    remainingToDeduct -= deduct;
  }

  return deductions;
}

/** Total USDT balance = initial balance + remaining amount across all active BUY lots. */
export function totalUsdtBalance(initialBalance: number, buyTxs: Transaction[]): number {
  const remaining = buyTxs
    .filter((t) => t.transactionType === "BUY")
    .reduce((sum, t) => sum + t.remainingAmount, 0);
  return initialBalance + remaining;
}

/** Weighted average buy rate across all active (remaining > 0) BUY lots. */
export function weightedAvgRate(buyTxs: Transaction[]): number {
  const active = buyTxs.filter((t) => t.transactionType === "BUY" && t.remainingAmount > 0);
  const totalRemaining = active.reduce((sum, t) => sum + t.remainingAmount, 0);
  if (totalRemaining <= 0) return 0;
  const weighted = active.reduce((sum, t) => sum + t.remainingAmount * t.price, 0);
  return weighted / totalRemaining;
}
