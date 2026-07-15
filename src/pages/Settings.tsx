import { useState } from "react";
import type { FormEvent } from "react";
import { KeyRound, Mail } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { usePin } from "../context/PinContext";

export function Settings() {
  const { user } = useAuth();
  const { changePin } = usePin();

  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const handleChangePin = (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!/^\d{4}$/.test(newPin)) {
      setMessage({ type: "error", text: "رمز PIN الجديد يجب أن يكون 4 أرقام" });
      return;
    }
    if (newPin !== confirmPin) {
      setMessage({ type: "error", text: "الرمزان الجديدان غير متطابقين" });
      return;
    }
    const ok = changePin(currentPin, newPin);
    if (ok) {
      setMessage({ type: "ok", text: "تم تغيير رمز PIN بنجاح" });
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
    } else {
      setMessage({ type: "error", text: "رمز PIN الحالي غير صحيح" });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">الإعدادات</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">إدارة حسابك وإعدادات الأمان</p>
      </div>

      <section className="card p-5">
        <h2 className="font-bold flex items-center gap-2 mb-4">
          <Mail size={18} className="text-gold" /> معلومات الحساب
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">البريد الإلكتروني</p>
        <p className="font-semibold ltr-nums" dir="ltr">
          {user?.email}
        </p>
      </section>

      <section className="card p-5">
        <h2 className="font-bold flex items-center gap-2 mb-4">
          <KeyRound size={18} className="text-gold" /> تغيير رمز PIN
        </h2>
        <form onSubmit={handleChangePin} className="space-y-4 max-w-sm">
          <div>
            <label className="label">الرمز الحالي</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              dir="ltr"
              className="input ltr-nums"
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          <div>
            <label className="label">الرمز الجديد</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              dir="ltr"
              className="input ltr-nums"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          <div>
            <label className="label">تأكيد الرمز الجديد</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              dir="ltr"
              className="input ltr-nums"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
            />
          </div>

          {message && (
            <p className={`text-sm ${message.type === "ok" ? "text-buy" : "text-sell"}`}>
              {message.text}
            </p>
          )}

          <button type="submit" className="btn-gold">
            حفظ الرمز الجديد
          </button>
        </form>
      </section>
    </div>
  );
}
