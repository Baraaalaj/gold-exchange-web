import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

interface PinContextValue {
  hasPin: boolean;
  isUnlocked: boolean;
  setPin: (pin: string) => void;
  verifyPin: (pin: string) => boolean;
  changePin: (currentPin: string, newPin: string) => boolean;
  clearPin: () => void;
  lock: () => void;
}

const PinContext = createContext<PinContextValue | null>(null);

const STORAGE_KEY = "golden-exchange-pin";

export function PinProvider({ children }: { children: ReactNode }) {
  const [hasPin, setHasPin] = useState(() => !!localStorage.getItem(STORAGE_KEY));
  const [isUnlocked, setIsUnlocked] = useState(false);

  const setPin = (pin: string) => {
    localStorage.setItem(STORAGE_KEY, pin);
    setHasPin(true);
    setIsUnlocked(true);
  };

  const verifyPin = (pin: string) => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const ok = stored !== null && stored === pin;
    if (ok) setIsUnlocked(true);
    return ok;
  };

  const changePin = (currentPin: string, newPin: string) => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== currentPin) return false;
    localStorage.setItem(STORAGE_KEY, newPin);
    return true;
  };

  const clearPin = () => {
    localStorage.removeItem(STORAGE_KEY);
    setHasPin(false);
    setIsUnlocked(false);
  };

  const lock = () => setIsUnlocked(false);

  return (
    <PinContext.Provider
      value={{ hasPin, isUnlocked, setPin, verifyPin, changePin, clearPin, lock }}
    >
      {children}
    </PinContext.Provider>
  );
}

export function usePin(): PinContextValue {
  const ctx = useContext(PinContext);
  if (!ctx) throw new Error("usePin must be used within PinProvider");
  return ctx;
}
