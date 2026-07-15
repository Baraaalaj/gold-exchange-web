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
import type { Person } from "../types";

export function usePersons() {
  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "persons"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setPersons(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Person));
      setLoading(false);
    });
    return unsub;
  }, []);

  const addPerson = async (name: string) => {
    await addDoc(collection(db, "persons"), {
      name,
      debt: 0,
      manualBalance: 0,
      balanceFromTx: 0,
      notes: "",
      createdAt: Date.now(),
    });
  };

  const updatePerson = async (id: string, data: Partial<Person>) => {
    await updateDoc(doc(db, "persons", id), data);
  };

  const removePerson = async (id: string) => {
    await deleteDoc(doc(db, "persons", id));
  };

  return { persons, loading, addPerson, updatePerson, removePerson };
}
