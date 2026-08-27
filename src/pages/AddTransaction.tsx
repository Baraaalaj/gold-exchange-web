import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Repeat } from "lucide-react";
import type { ServiceType, TransactionType } from "../types";
import { SERVICE_LABELS } from "../types";
import { useTodayRate } from "../hooks/useDailyRates";
import { useTransactions } from "../hooks/useTransactions";
import { PersonSelect } from "../components/PersonSelect";
import { createGenericTransaction, createUsdtBuy, NO_PERSON } from "../lib/transactionActions";
import { fmtMoney } from "../lib/format";

const SERVICE_ORDER: ServiceType[] = [
  "USDT",
  "PAYPAL",
  "WESTERN_UNION",
  "VODAFONE_RECEIVE",
  "VODAFONE_SEND",
  "INSTAPAY_RECEIVE",
  "INSTAPAY_SEND",
  "MANUAL",
];

const FIXED_TYPE: Partial<Record<ServiceType, TransactionType>> = {
  VODAFONE_RECEIVE: "SELL",
  INSTAPAY_RECEIVE: "SELL",
  VODAFONE_SEND: "BUY",
  INSTAPAY_SEND: "BUY",
  MANUAL: "SELL",
};

export function AddTransaction() {
  const navigate = useNavigate();
  const { rate } = useTodayRate();
  const { transactions } = useTransactions();

  const [service, setService] = useState<ServiceType>("PAYPAL");
  const [transactionType, setTransactionType] = useState<TransactionType>("BUY");
  const [amount, setAmount] = useState("");
  const [price, setPrice] = useState("");
  const [profit, setProfit] = useState("");
  const [manualProfit, setManualProfit] = useState(false);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [person, setPerson] = useState(NO_PERSON);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const fixedType = FIXED_TYPE[service];
  const effectiveType = fixedType ?? transactionType;
  const usesPrice = service === "USDT" || service === "PAYPAL" || service === "WESTERN_UNION";
  const isManual = service === "MANUAL";

  const amountNum = Number(amount) || 0;
  const priceNum = Number(price) || 0;
  const total = usesPrice ? amountNum * priceNum : amountNum;

  const priceWarning = useMemo(() => {
    if (service !== "USDT" || !rate || !priceNum) return null;
    const reference = effectiveType === "BUY" ? rate.buyRate : rate.sellRate;
    if (!reference) return null;
    const diffPct = Math.abs(priceNum - reference) / reference;
    return diffPct > 0.02 ? `السعر يختلف عن سعر اليوم (${fmtMoney(reference)}) بأكثر من 2%` : null;
  }, [service, rate, priceNum, effectiveType]);

  // آخر عملية بنفس الخدمة (ونفس نوع العملية لو ما كان النوع ثابت) — لتعبئة الفورم منها بسرعة
  const lastSimilar = useMemo(() => {
    const matches = transactions.filter(
      (t) => t.serviceType === service && (fixedType ? true : t.transactionType === transactionType)
    );
    return matches.length ? matches.reduce((a, b) => (a.timestamp > b.timestamp ? a : b)) : null;
  }, [transactions, service, fixedType, transactionType]);

  const repeatLast = () => {
    if (!lastSimilar) return;
    setAmount(String(lastSimilar.amount));
    if (usesPrice) setPrice(String(lastSimilar.price));
    if (!fixedType) setTransactionType(lastSimilar.transactionType);
    setProfit(lastSimilar.profit ? String(lastSimilar.profit) : "");
    setManualProfit(Boolean(lastSimilar.profit));
    setPerson(lastSimilar.person);
    if (isManual) {
      const [n, ...rest] = lastSimilar.note.split(" - ");
      setName(n ?? "");
      setNote(rest.join(" - "));
    } else {
      setNote(lastSimilar.note);
    }
  };

  const reset = () => {
    setAmount("");
    setPrice("");
    setProfit("");
    setManualProfit(false);
    setName("");
    setNote("");
    setPerson(NO_PERSON);
  };

  const handleSubmit = async () => {
    setError("");
    if (!amountNum) {
      setError("الرجاء إدخال المبلغ");
      return;
    }
    if (usesPrice && !priceNum) {
      setError("الرجاء إدخال السعر");
      return;
    }
    if (isManual && !name.trim()) {
      setError("الرجاء إدخال اسم العملية");
      return;
    }

    setBusy(true);
    try {
      if (service === "USDT") {
        if (effectiveType === "SELL") {
          setError("لبيع USDT الرجاء استخدام صفحة USDT لاختيار الخانة المناسبة");
          setBusy(false);
          return;
        }
        await createUsdtBuy({ amount: amountNum, price: priceNum, note, person });
      } else {
        await createGenericTransaction({
          serviceType: service,
          transactionType: effectiveType,
          amount: amountNum,
          price: usesPrice ? priceNum : 1,
          total,
          profit: Number(profit) || 0,
          note: isManual && name ? `${name}${note ? " - " + note : ""}` : note,
          person,
        });
      }
      reset();
      navigate("/reports");
    } catch (e) {
      setError(e instanceof Error ? e.message : "حدث خطأ أثناء الحفظ");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">إضافة معاملة</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">سجّل عملية شراء أو بيع لأي خدمة</p>
        </div>
        {lastSimilar && (
          <button onClick={repeatLast} className="btn-ghost shrink-0 text-sm">
            <Repeat size={15} /> كرر آخر عملية
          </button>
        )}
      </div>

      <div className="card p-5 space-y-4">
        <div>
          <label className="label">نوع الخدمة</label>
          <select
            className="input"
            value={service}
            onChange={(e) => setService(e.target.value as ServiceType)}
          >
            {SERVICE_ORDER.map((s) => (
              <option key={s} value={s}>
                {SERVICE_LABELS[s]}
              </option>
            ))}
          </select>
        </div>

        {!fixedType && !isManual && (
          <div>
            <label className="label">نوع العملية</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTransactionType("BUY")}
                className={transactionType === "BUY" ? "btn-buy flex-1" : "btn-ghost flex-1"}
              >
                شراء
              </button>
              <button
                type="button"
                onClick={() => setTransactionType("SELL")}
                className={transactionType === "SELL" ? "btn-sell flex-1" : "btn-ghost flex-1"}
              >
                بيع
              </button>
            </div>
          </div>
        )}

        {isManual && (
          <div>
            <label className="label">اسم العملية</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        )}

        <div>
          <label className="label">{service === "USDT" ? "المبلغ (USDT)" : "المبلغ"}</label>
          <input
            type="number"
            step="any"
            dir="ltr"
            className="input ltr-nums"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        {usesPrice && (
          <div>
            <label className="label">السعر</label>
            <input
              type="number"
              step="any"
              dir="ltr"
              className="input ltr-nums"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder={
                service === "USDT" && rate
                  ? String(effectiveType === "BUY" ? rate.buyRate : rate.sellRate)
                  : undefined
              }
            />
            {priceWarning && (
              <p className="text-xs text-gold-dark dark:text-gold flex items-center gap-1 mt-1">
                <AlertTriangle size={13} /> {priceWarning}
              </p>
            )}
          </div>
        )}

        {usesPrice && (
          <div className="rounded-xl bg-slate-100 dark:bg-white/5 p-3 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">الإجمالي</p>
            <p className="font-bold ltr-nums">{fmtMoney(total)}</p>
          </div>
        )}

        {service !== "USDT" && (
          <div>
            {(service === "PAYPAL" || service === "WESTERN_UNION") && (
              <label className="flex items-center gap-2 text-sm mb-2">
                <input
                  type="checkbox"
                  checked={manualProfit}
                  onChange={(e) => setManualProfit(e.target.checked)}
                />
                إدخال ربح يدوي لهذه العملية (الربح الفعلي يُحسب من التقرير)
              </label>
            )}
            {(manualProfit || service === "VODAFONE_RECEIVE" || service === "VODAFONE_SEND" || service === "INSTAPAY_RECEIVE" || service === "INSTAPAY_SEND" || isManual) && (
              <>
                <label className="label">الربح</label>
                <input
                  type="number"
                  step="any"
                  dir="ltr"
                  className="input ltr-nums"
                  value={profit}
                  onChange={(e) => setProfit(e.target.value)}
                />
              </>
            )}
          </div>
        )}

        <div>
          <label className="label">ملاحظة</label>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        <PersonSelect value={person} onChange={setPerson} />

        {error && <p className="text-sell text-sm">{error}</p>}

        <button onClick={handleSubmit} disabled={busy} className="btn-gold w-full">
          {busy ? "جارٍ الحفظ..." : "حفظ العملية"}
        </button>
      </div>
    </div>
  );
}
