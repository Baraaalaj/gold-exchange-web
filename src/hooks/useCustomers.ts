import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import type { Customer } from "../types";

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "customers"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setCustomers(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Customer));
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("useCustomers onSnapshot error:", err);
        setError(err.message);
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  const addCustomer = async (name: string, phone: string) => {
    await addDoc(collection(db, "customers"), {
      name,
      phone,
      debt: 0,
      notes: "",
      createdAt: Date.now(),
    });
  };

  const updateCustomer = async (id: string, data: Partial<Customer>) => {
    await updateDoc(doc(db, "customers", id), data);
  };

  const removeCustomer = async (id: string) => {
    await deleteDoc(doc(db, "customers", id));
  };

  return { customers, loading, error, addCustomer, updateCustomer, removeCustomer };
}
