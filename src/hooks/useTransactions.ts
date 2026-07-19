import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";
import type { Transaction } from "../types";

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "transactions"), orderBy("timestamp", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setTransactions(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              ...data,
              // عمليات الأندرويد ما فيها remainingAmount → استخدم amount كقيمة افتراضية
              remainingAmount: data.remainingAmount ?? data.amount ?? 0,
              lotId: data.lotId ?? "",
            } as Transaction;
          })
        );
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("useTransactions onSnapshot error:", err);
        setError(err.message);
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  return { transactions, loading, error };
}
