import { useEffect, useState } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import type { HomeNote } from "../types";

export function useUsdtSettings() {
  const [initialBalance, setInitialBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "settings", "usdt"),
      (snap) => {
        setInitialBalance(snap.exists() ? (snap.data().initialBalance as number) ?? 0 : 0);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("useUsdtSettings onSnapshot error:", err);
        setError(err.message);
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  const updateInitialBalance = async (value: number) => {
    await setDoc(doc(db, "settings", "usdt"), { initialBalance: value }, { merge: true });
  };

  return { initialBalance, loading, error, updateInitialBalance };
}

export function useHomeNotes() {
  const [notes, setNotes] = useState<HomeNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "home_notes"), (snap) => {
      setNotes(snap.exists() ? ((snap.data().notes as HomeNote[]) ?? []) : []);
      setLoading(false);
    });
    return unsub;
  }, []);

  const saveNotes = async (next: HomeNote[]) => {
    await setDoc(doc(db, "settings", "home_notes"), { notes: next }, { merge: true });
  };

  const addNote = async (content: string) => {
    const now = Date.now();
    const note: HomeNote = { id: crypto.randomUUID(), content, createdAt: now, updatedAt: now };
    await saveNotes([note, ...notes]);
  };

  const updateNote = async (id: string, content: string) => {
    const next = notes.map((n) => (n.id === id ? { ...n, content, updatedAt: Date.now() } : n));
    await saveNotes(next);
  };

  const deleteNote = async (id: string) => {
    await saveNotes(notes.filter((n) => n.id !== id));
  };

  return { notes, loading, addNote, updateNote, deleteNote };
}
