import type { Transaction } from "../types";

const PRICE_TOLERANCE = 0.0001;

export interface LotGroup {
  price: number;
  totalRemaining: number;
  totalOriginal: number;
  earliestTimestamp: number;
  docs: Transaction[]; // BUY docs with remainingAmount > 0, sorted oldest -> newest
}

/**
 * Computes each BUY transaction's remaining amount across the full USDT history, ignoring
 * any stored `remainingAmount` (legacy transactions never had a per-lot amount tracked, so
 * trusting the stored field would show them as fully unsold).
 *
 * Every SELL made through this app records exactly which BUY lots it drew from in `lotId`
 * (a JSON list of `{ lotId, amount }`) — that recorded link is honored first, so selling from
 * lot #3 always deducts lot #3, regardless of how old it is. Only legacy SELLs without that
 * link (e.g. imported from Android, which never tracked lots) fall back to a best-effort
 * oldest-BUY-first guess.
 */
function computeFifoRemaining(usdtTxs: Transaction[]): Map<string, number> {
  const sorted = [...usdtTxs].sort((a, b) => a.timestamp - b.timestamp);
  const remaining = new Map<string, number>();
  const buyQueue: Transaction[] = [];

  for (const tx of sorted) {
    if (tx.transactionType === "BUY") {
      remaining.set(tx.id, tx.amount);
      buyQueue.push(tx);
      continue;
    }

    let refs: { lotId: string; amount: number }[] | null = null;
    if (tx.lotId) {
      try {
        const parsed = JSON.parse(tx.lotId);
        if (Array.isArray(parsed) && parsed.length > 0) refs = parsed;
      } catch {
        refs = null;
      }
    }

    if (refs) {
      for (const r of refs) {
        const rem = remaining.get(r.lotId);
        if (rem === undefined) continue; // referenced lot isn't in this set — nothing to do
        remaining.set(r.lotId, Math.max(0, rem - r.amount));
      }
    } else {
      // No recorded link (legacy data) — best-effort guess: deduct oldest lots first.
      let toDeduct = tx.amount;
      for (const buy of buyQueue) {
        if (toDeduct <= 1e-9) break;
        const rem = remaining.get(buy.id) ?? 0;
        if (rem <= 0) continue;
        const deduct = Math.min(rem, toDeduct);
        remaining.set(buy.id, rem - deduct);
        toDeduct -= deduct;
      }
    }
  }

  return remaining;
}

/** Groups active BUY lots by price (within PRICE_TOLERANCE) for display only. `usdtTxs` must include BUY and SELL. */
export function groupBuyLots(usdtTxs: Transaction[]): LotGroup[] {
  const remaining = computeFifoRemaining(usdtTxs);
  const active = usdtTxs
    .filter((t) => t.transactionType === "BUY" && (remaining.get(t.id) ?? 0) > 1e-9)
    .sort((a, b) => a.timestamp - b.timestamp);

  const groups: LotGroup[] = [];

  for (const tx of active) {
    const remAmount = remaining.get(tx.id) ?? 0;
    const doc = { ...tx, remainingAmount: remAmount };
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
    group.docs.push(doc);
    group.totalRemaining += remAmount;
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

/** Total USDT balance = initial balance + total bought - total sold. Expects BUY and SELL txs together. */
export function totalUsdtBalance(initialBalance: number, usdtTxs: Transaction[]): number {
  const totalBought = usdtTxs
    .filter((t) => t.transactionType === "BUY")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalSold = usdtTxs
    .filter((t) => t.transactionType === "SELL")
    .reduce((sum, t) => sum + t.amount, 0);
  return initialBalance + totalBought - totalSold;
}

/**
 * Weighted average buy rate as a running average over the full USDT history (BUY and SELL,
 * sorted by timestamp): each BUY blends its price into the average proportionally to the
 * balance at that point; each SELL only reduces the balance and leaves the average untouched;
 * the average resets once the balance hits zero.
 */
export function weightedAvgRate(usdtTxs: Transaction[]): number {
  const sorted = [...usdtTxs].sort((a, b) => a.timestamp - b.timestamp);

  let balance = 0;
  let avg = 0;

  for (const tx of sorted) {
    if (tx.transactionType === "BUY") {
      const newBalance = balance + tx.amount;
      avg = newBalance > 1e-9 ? (balance * avg + tx.amount * tx.price) / newBalance : 0;
      balance = newBalance;
    } else {
      balance -= tx.amount;
      if (balance <= 1e-9) {
        balance = 0;
        avg = 0;
      }
    }
  }

  return avg;
}
