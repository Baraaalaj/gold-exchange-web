import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email, password);
      navigate("/");
    } catch {
      setError("البريد الإلكتروني أو كلمة المرور غير صحيحة");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-svh flex items-center justify-center bg-gradient-to-b from-slate-100 to-slate-200 dark:from-[#0F3460] dark:to-[#16213E] px-4">
      <div className="card w-full max-w-sm p-7">
        <div className="text-center mb-6">
          <div className="text-gold text-4xl font-extrabold mb-2">₮</div>
          <h1 className="text-xl font-extrabold">الذهبي للصرافة</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">تسجيل الدخول لإدارة حسابك</p>
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

          {error && <p className="text-sell text-sm">{error}</p>}

          <button type="submit" disabled={busy} className="btn-gold w-full">
            {busy ? "جارٍ الدخول..." : "تسجيل الدخول"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-5">
          ليس لديك حساب؟{" "}
          <Link to="/register" className="text-gold-dark dark:text-gold font-semibold">
            إنشاء حساب جديد
          </Link>
        </p>
      </div>
    </div>
  );
}
