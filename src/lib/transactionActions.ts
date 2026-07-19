import {
  collection,
  doc,
  getDocs,
  increment,
  query,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";
import type { Person, ServiceType, Transaction, TransactionType } from "../types";
import { fifoDeduct } from "./usdtLots";

export const NO_PERSON = "NONE";

async function findPersonRefByName(name: string) {
  if (!name || name === NO_PERSON) return null;
  const snap = await getDocs(query(collection(db, "persons"), where("name", "==", name)));
  if (snap.empty) return null;
  return snap.docs[0].ref;
}

/** BUY decreases a person's automatic balance, SELL increases it. */
function personBalanceDelta(transactionType: TransactionType, total: number) {
  return transactionType === "BUY" ? -total : total;
}

export async function createUsdtBuy(input: {
  amount: number;
  price: number;
  note: string;
  person: string;
}) {
  const total = input.amount * input.price;
  const batch = writeBatch(db);
  const ref = doc(collection(db, "transactions"));

  const tx: Omit<Transaction, "id"> = {
    serviceType: "USDT",
    transactionType: "BUY",
    amount: input.amount,
    price: input.price,
    total,
    profit: 0,
    avgBuyRate: input.price,
    person: input.person || NO_PERSON,
    note: input.note,
    timestamp: Date.now(),
    remainingAmount: input.amount,
    lotId: "",
  };
  batch.set(ref, tx);

  const personRef = await findPersonRefByName(input.person);
  if (personRef) {
    batch.update(personRef, { balanceFromTx: increment(personBalanceDelta("BUY", total)) });
  }

  await batch.commit();
}

export async function createUsdtSell(input: {
  lotDocs: Transaction[]; // active BUY docs belonging to the price group being sold from
  groupPrice: number;
  amount: number;
  sellPrice: number;
  note: string;
  person: string;
}) {
  const deductions = fifoDeduct(input.lotDocs, input.amount);
  const total = input.amount * input.sellPrice;
  const profit = (input.sellPrice - input.groupPrice) * input.amount;

  const batch = writeBatch(db);

  for (const d of deductions) {
    batch.update(doc(db, "transactions", d.lotId), { remainingAmount: d.newRemainingAmount });
  }

  const sellRef = doc(collection(db, "transactions"));
  const tx: Omit<Transaction, "id"> = {
    serviceType: "USDT",
    transactionType: "SELL",
    amount: input.amount,
    price: input.sellPrice,
    total,
    profit,
    avgBuyRate: input.groupPrice,
    person: input.person || NO_PERSON,
    note: input.note,
    timestamp: Date.now(),
    remainingAmount: 0,
    lotId: JSON.stringify(deductions.map((d) => ({ lotId: d.lotId, amount: d.deductAmount }))),
  };
  batch.set(sellRef, tx);

  const personRef = await findPersonRefByName(input.person);
  if (personRef) {
    batch.update(personRef, { balanceFromTx: increment(personBalanceDelta("SELL", total)) });
  }

  await batch.commit();
}

/**
 * Corrects a BUY transaction's original amount (e.g. fixing a bad import). remainingAmount
 * is derived automatically via FIFO from `amount`, so editing it directly has no effect —
 * this updates `amount`/`total` instead, and adjusts the linked person's balance by the delta.
 */
export async function editLotAmount(tx: Transaction, newAmount: number) {
  const newTotal = newAmount * tx.price;
  const batch = writeBatch(db);
  batch.update(doc(db, "transactions", tx.id), { amount: newAmount, total: newTotal });

  const personRef = await findPersonRefByName(tx.person);
  if (personRef) {
    batch.update(personRef, {
      balanceFromTx: increment(personBalanceDelta(tx.transactionType, newTotal - tx.total)),
    });
  }

  await batch.commit();
}

export interface GenericTransactionInput {
  serviceType: Exclude<ServiceType, "USDT">;
  transactionType: TransactionType;
  amount: number;
  price: number;
  total: number;
  profit: number;
  note: string;
  person: string;
}

export async function createGenericTransaction(input: GenericTransactionInput) {
  const batch = writeBatch(db);
  const ref = doc(collection(db, "transactions"));

  const tx: Omit<Transaction, "id"> = {
    serviceType: input.serviceType,
    transactionType: input.transactionType,
    amount: input.amount,
    price: input.price,
    total: input.total,
    profit: input.profit,
    avgBuyRate: 0,
    person: input.person || NO_PERSON,
    note: input.note,
    timestamp: Date.now(),
    remainingAmount: 0,
    lotId: "",
  };
  batch.set(ref, tx);

  const personRef = await findPersonRefByName(input.person);
  if (personRef) {
    batch.update(personRef, {
      balanceFromTx: increment(personBalanceDelta(input.transactionType, input.total)),
    });
  }

  await batch.commit();
}

export async function deleteTransaction(tx: Transaction) {
  const batch = writeBatch(db);
  batch.delete(doc(db, "transactions", tx.id));

  if (tx.serviceType === "USDT" && tx.transactionType === "SELL" && tx.lotId) {
    try {
      const refs = JSON.parse(tx.lotId) as { lotId: string; amount: number }[];
      for (const r of refs) {
        batch.update(doc(db, "transactions", r.lotId), { remainingAmount: increment(r.amount) });
      }
    } catch {
      // lotId wasn't valid JSON (legacy/blank) — nothing to restore
    }
  }

  const personRef = await findPersonRefByName(tx.person);
  if (personRef) {
    // reverse of the delta that was applied when the transaction was created
    batch.update(personRef, {
      balanceFromTx: increment(-personBalanceDelta(tx.transactionType, tx.total)),
    });
  }

  await batch.commit();
}

export async function updateTransactionFields(
  tx: Transaction,
  updates: { note?: string; person?: string; profit?: number; amount?: number; price?: number }
) {
  const nextAmount = updates.amount ?? tx.amount;
  const nextPrice = updates.price ?? tx.price;
  const nextTotal = nextAmount * nextPrice;
  const totalChanged = updates.amount !== undefined || updates.price !== undefined;

  const docUpdates: Record<string, unknown> = { ...updates };
  if (totalChanged) docUpdates.total = nextTotal;

  const batch = writeBatch(db);
  batch.update(doc(db, "transactions", tx.id), docUpdates);

  const nextPerson = updates.person ?? tx.person;
  if (nextPerson !== tx.person) {
    const oldPersonRef = await findPersonRefByName(tx.person);
    if (oldPersonRef) {
      batch.update(oldPersonRef, {
        balanceFromTx: increment(-personBalanceDelta(tx.transactionType, tx.total)),
      });
    }
    const newPersonRef = await findPersonRefByName(nextPerson);
    if (newPersonRef) {
      batch.update(newPersonRef, {
        balanceFromTx: increment(personBalanceDelta(tx.transactionType, nextTotal)),
      });
    }
  } else if (totalChanged) {
    const personRef = await findPersonRefByName(tx.person);
    if (personRef) {
      batch.update(personRef, {
        balanceFromTx: increment(personBalanceDelta(tx.transactionType, nextTotal - tx.total)),
      });
    }
  }

  await batch.commit();
}

export function personDisplayBalance(p: Person): number {
  return p.manualBalance + p.balanceFromTx - p.debt;
}
