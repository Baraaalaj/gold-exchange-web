import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import type { DailyRate } from "../types";
import { todayKey } from "../lib/format";

export function useTodayRate() {
  const [rate, setRate] = useState<DailyRate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const key = todayKey();
    const unsub = onSnapshot(doc(db, "daily_rates", key), (snap) => {
      setRate(snap.exists() ? ({ id: snap.id, ...snap.data() } as DailyRate) : null);
      setLoading(false);
    });
    return unsub;
  }, []);

  const setTodayRate = async (buyRate: number, sellRate: number) => {
    const key = todayKey();
    await setDoc(doc(db, "daily_rates", key), { buyRate, sellRate, dateKey: key });
  };

  return { rate, loading, setTodayRate };
}

export function useAllDailyRates() {
  const [rates, setRates] = useState<DailyRate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "daily_rates"), (snap) => {
      setRates(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as DailyRate));
      setLoading(false);
    });
    return unsub;
  }, []);

  return { rates, loading };
}
