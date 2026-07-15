import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [initialBalance, setInitialBalance] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("كلمتا المرور غير متطابقتين");
      return;
    }
    const balance = Number(initialBalance);
    if (!Number.isFinite(balance) || balance < 0) {
      setError("الرجاء إدخال رصيد USDT أولي صحيح");
      return;
    }

    setBusy(true);
    try {
      await register(email, password, balance);
      navigate("/");
    } catch {
      setError("تعذر إنشاء الحساب، تحقق من البيانات المدخلة");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-svh flex items-center justify-center bg-gradient-to-b from-slate-100 to-slate-200 dark:from-[#0F3460] dark:to-[#16213E] px-4 py-8">
      <div className="card w-full max-w-sm p-7">
        <div className="text-center mb-6">
          <div className="text-gold text-4xl font-extrabold mb-2">₮</div>
          <h1 className="text-xl font-extrabold">إنشاء حساب جديد</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">البريد الإلكتروني</label>
            <input
              type="email"
              required
              dir="ltr"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="label">كلمة المرور</label>
            <input
              type="password"
              required
              dir="ltr"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <label className="label">تأكيد كلمة المرور</label>
            <input
              type="password"
              required
              dir="ltr"
              className="input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <div>
            <label className="label">رصيد USDT الأولي</label>
            <input
              type="number"
              step="any"
              required
              dir="ltr"
              className="input ltr-nums"
              value={initialBalance}
              onChange={(e) => setInitialBalance(e.target.value)}
              placeholder="0.00"
            />
          </div>

          {error && <p className="text-sell text-sm">{error}</p>}

          <button type="submit" disabled={busy} className="btn-gold w-full">
            {busy ? "جارٍ الإنشاء..." : "إنشاء الحساب"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-5">
          لديك حساب بالفعل؟{" "}
          <Link to="/login" className="text-gold-dark dark:text-gold font-semibold">
            تسجيل الدخول
          </Link>
        </p>
      </div>
    </div>
  );
}
