import { useState } from "react";
import { Delete } from "lucide-react";
import { usePin } from "../context/PinContext";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"];

export function PinGate() {
  const { hasPin, setPin, verifyPin } = usePin();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const isSetup = !hasPin;
  const [stage, setStage] = useState<"enter" | "confirm">("enter");
  const [value, setValue] = useState("");
  const [firstPin, setFirstPin] = useState("");
  const [error, setError] = useState("");

  const reset = () => {
    setValue("");
    setError("");
  };

  const handleKey = (key: string) => {
    if (key === "") return;
    if (key === "back") {
      setValue((v) => v.slice(0, -1));
      return;
    }
    if (value.length >= 4) return;
    const next = value + key;
    setValue(next);

    if (next.length === 4) {
      if (isSetup) {
        if (stage === "enter") {
          setFirstPin(next);
          setStage("confirm");
          setValue("");
        } else {
          if (next === firstPin) {
            setPin(next);
          } else {
            setError("الرمزان غير متطابقين، حاول مرة أخرى");
            setStage("enter");
            setFirstPin("");
            setValue("");
          }
        }
      } else {
        if (verifyPin(next)) {
          navigate("/", { replace: true });
        } else {
          setError("رمز غير صحيح");
          setValue("");
        }
      }
    }
  };

  const title = isSetup
    ? stage === "enter"
      ? "أنشئ رمز PIN مكوّن من 4 أرقام"
      : "أعد إدخال الرمز للتأكيد"
    : "أدخل رمز PIN";

  return (
    <div className="min-h-svh flex items-center justify-center bg-gradient-to-b from-slate-100 to-slate-200 dark:from-[#0F3460] dark:to-[#16213E] px-4">
      <div className="card w-full max-w-xs p-7 text-center">
        <div className="text-gold text-3xl font-extrabold mb-4">₮</div>
        <h2 className="font-bold mb-6">{title}</h2>

        <div className="flex justify-center gap-3 mb-6" dir="ltr">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={`w-4 h-4 rounded-full border-2 border-gold ${
                i < value.length ? "bg-gold" : "bg-transparent"
              }`}
            />
          ))}
        </div>

        {error && <p className="text-sell text-sm mb-4">{error}</p>}

        <div className="grid grid-cols-3 gap-3">
          {KEYS.map((key, i) => (
            <button
              key={i}
              onClick={() => handleKey(key)}
              disabled={key === ""}
              className={`h-14 rounded-xl text-lg font-bold flex items-center justify-center transition ${
                key === ""
                  ? "invisible"
                  : "bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 active:scale-95"
              }`}
            >
              {key === "back" ? <Delete size={20} /> : key}
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            reset();
            logout();
            navigate("/login");
          }}
          className="text-sm text-slate-400 mt-6 hover:text-sell transition"
        >
          تسجيل الخروج
        </button>
      </div>
    </div>
  );
}
