import { useMemo, useState, useRef } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download, Minus, Pencil, Plus, Trash2 } from "lucide-react";
import { useTransactions } from "../hooks/useTransactions";
import { usePersons } from "../hooks/usePersons";
import { SERVICE_LABELS } from "../types";
import type { Transaction } from "../types";
import { fmtDateTime, fmtMoney } from "../lib/format";
import { isInMonth, isSameDay, lastNDays } from "../lib/dateRanges";
import { summarizeByService, totalProfit } from "../lib/profit";
import {
  createGenericTransaction,
  deleteTransaction,
  NO_PERSON,
  updateTransactionFields,
} from "../lib/transactionActions";
import { exportReportPdf } from "../lib/exportPdf";
import { Modal } from "../components/Modal";
import { PersonSelect } from "../components/PersonSelect";

type Tab = "daily" | "monthly" | "weekly" | "analytics";

function toDateInputValue(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function Reports() {
  const { transactions } = useTransactions();
  const { persons } = usePersons();
  const [tab, setTab] = useState<Tab>("daily");
  const [profitAdjust, setProfitAdjust] = useState<1 | -1 | null>(null);

  const [dateStr, setDateStr] = useState(toDateInputValue(new Date()));
  const selectedDate = useMemo(() => new Date(dateStr + "T00:00:00"), [dateStr]);

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());

  const dailyTxs = useMemo(
    () => transactions.filter((t) => isSameDay(new Date(t.timestamp), selectedDate)),
    [transactions, selectedDate]
  );
  const monthlyTxs = useMemo(
    () => transactions.filter((t) => isInMonth(t.timestamp, year, month)),
    [transactions, year, month]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">التقارير</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">تتبع أداء المكتب اليومي والشهري</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setProfitAdjust(1)} className="btn-ghost text-buy">
            <Plus size={16} /> زيادة على ربح اليوم
          </button>
          <button onClick={() => setProfitAdjust(-1)} className="btn-ghost text-sell">
            <Minus size={16} /> خصم من ربح اليوم
          </button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(["daily", "monthly", "weekly", "analytics"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={tab === t ? "btn-gold" : "btn-ghost"}
          >
            {t === "daily" ? "يومي" : t === "monthly" ? "شهري" : t === "weekly" ? "أسبوعي" : "تحليلات"}
          </button>
        ))}
      </div>

      {tab === "daily" && (
        <TransactionsReportView
          title={`تقرير يوم ${dateStr}`}
          transactions={dailyTxs}
          persons={persons}
          headerExtra={
            <input
              type="date"
              className="input max-w-[180px] ltr-nums"
              dir="ltr"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
            />
          }
        />
      )}

      {tab === "monthly" && (
        <TransactionsReportView
          title={`تقرير شهر ${month + 1}/${year}`}
          transactions={monthlyTxs}
          persons={persons}
          headerExtra={
            <div className="flex gap-2">
              <select
                className="input ltr-nums"
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i} value={i}>
                    {i + 1}
                  </option>
                ))}
              </select>
              <select
                className="input ltr-nums"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              >
                {Array.from({ length: 6 }, (_, i) => now.getFullYear() - 3 + i).map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          }
        />
      )}

      {tab === "weekly" && <WeeklyView transactions={transactions} />}
      {tab === "analytics" && <AnalyticsView transactions={transactions} />}

      {profitAdjust !== null && (
        <ProfitAdjustModal sign={profitAdjust} onClose={() => setProfitAdjust(null)} />
      )}
    </div>
  );
}

function ProfitAdjustModal({ sign, onClose }: { sign: 1 | -1; onClose: () => void }) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const isAdd = sign === 1;

  return (
    <Modal
      open
      onClose={onClose}
      title={isAdd ? "زيادة على ربح اليوم" : "خصم من ربح اليوم"}
      footer={
        <button
          disabled={busy || !amount}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              const value = Math.abs(Number(amount) || 0);
              await createGenericTransaction({
                serviceType: "MANUAL",
                transactionType: "SELL",
                amount: 0,
                price: 1,
                total: 0,
                profit: sign * value,
                note: note || (isAdd ? "زيادة يدوية على الربح" : "خصم يدوي من الربح"),
                person: NO_PERSON,
              });
              onClose();
            } catch (e) {
              setError(e instanceof Error ? e.message : "حدث خطأ أثناء الحفظ");
            } finally {
              setBusy(false);
            }
          }}
          className={isAdd ? "btn-buy" : "btn-sell"}
        >
          {isAdd ? "إضافة" : "خصم"}
        </button>
      }
    >
      <div>
        <label className="label">المبلغ</label>
        <input
          type="number"
          step="any"
          dir="ltr"
          className="input ltr-nums"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          autoFocus
        />
      </div>
      <div>
        <label className="label">ملاحظة (اختياري)</label>
        <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      {error && <p className="text-sell text-sm">{error}</p>}
    </Modal>
  );
}

function SummaryCard({ transactions }: { transactions: Transaction[] }) {
  const net = totalProfit(transactions);
  const totalBuy = transactions.filter((t) => t.transactionType === "BUY").reduce((s, t) => s + t.total, 0);
  const totalSell = transactions.filter((t) => t.transactionType === "SELL").reduce((s, t) => s + t.total, 0);
  const byService = summarizeByService(transactions);

  return (
    <div className="card p-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">صافي الربح</p>
          <p className={`font-extrabold text-lg ltr-nums ${net >= 0 ? "text-buy" : "text-sell"}`}>
            {fmtMoney(net)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">إجمالي شراء</p>
          <p className="font-extrabold text-lg ltr-nums">{fmtMoney(totalBuy)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">إجمالي بيع</p>
          <p className="font-extrabold text-lg ltr-nums">{fmtMoney(totalSell)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">عدد العمليات</p>
          <p className="font-extrabold text-lg ltr-nums">{transactions.length}</p>
        </div>
      </div>

      {byService.length > 0 && (
        <div className="border-t border-slate-200/70 dark:border-white/5 pt-3 space-y-1.5">
          {byService.map((row) => (
            <div key={row.service} className="flex justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">{SERVICE_LABELS[row.service]}</span>
              <span className={`font-semibold ltr-nums ${row.profit >= 0 ? "text-buy" : "text-sell"}`}>
                {fmtMoney(row.profit)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TransactionsReportView({
  title,
  transactions,
  persons,
  headerExtra,
}: {
  title: string;
  transactions: Transaction[];
  persons: ReturnType<typeof usePersons>["persons"];
  headerExtra: React.ReactNode;
}) {
  const [pendingDeletes, setPendingDeletes] = useState<Record<string, boolean>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [exporting, setExporting] = useState(false);

  const visible = transactions.filter((t) => !pendingDeletes[t.id]);

  const byService = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of visible) {
      const list = map.get(t.serviceType) ?? [];
      list.push(t);
      map.set(t.serviceType, list);
    }
    return Array.from(map.entries());
  }, [visible]);

  const scheduleDelete = (tx: Transaction) => {
    setPendingDeletes((p) => ({ ...p, [tx.id]: true }));
    timers.current[tx.id] = setTimeout(async () => {
      await deleteTransaction(tx);
      setPendingDeletes((p) => {
        const next = { ...p };
        delete next[tx.id];
        return next;
      });
      delete timers.current[tx.id];
    }, 5000);
  };

  const undoDelete = (id: string) => {
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    setPendingDeletes((p) => {
      const next = { ...p };
      delete next[id];
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">{headerExtra}</div>
        <button
          disabled={exporting}
          onClick={async () => {
            setExporting(true);
            await exportReportPdf({ title, transactions: visible, persons });
            setExporting(false);
          }}
          className="btn-ghost"
        >
          <Download size={16} /> {exporting ? "جارٍ التصدير..." : "تصدير PDF"}
        </button>
      </div>

      <SummaryCard transactions={visible} />

      {Object.keys(pendingDeletes).length > 0 && (
        <div className="space-y-2">
          {Object.keys(pendingDeletes).map((id) => {
            const tx = transactions.find((t) => t.id === id);
            if (!tx) return null;
            return (
              <div
                key={id}
                className="flex items-center justify-between rounded-xl bg-sell/10 border border-sell/30 px-4 py-2.5 text-sm"
              >
                <span>سيتم حذف العملية خلال لحظات...</span>
                <button onClick={() => undoDelete(id)} className="font-bold text-sell">
                  تراجع
                </button>
              </div>
            );
          })}
        </div>
      )}

      {byService.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-10">لا توجد عمليات في هذه الفترة</p>
      ) : (
        byService.map(([service, txs]) => (
          <div key={service} className="card p-4">
            <h3 className="font-bold mb-3">{SERVICE_LABELS[service as Transaction["serviceType"]]}</h3>
            <div className="space-y-2">
              {txs
                .sort((a, b) => b.timestamp - a.timestamp)
                .map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between gap-3 rounded-xl bg-slate-100 dark:bg-white/5 px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm">
                        <span className={t.transactionType === "BUY" ? "text-buy font-semibold" : "text-sell font-semibold"}>
                          {t.transactionType === "BUY" ? "شراء" : "بيع"}
                        </span>
                        <span className="ltr-nums font-semibold">{fmtMoney(t.amount)}</span>
                        {t.price > 0 && <span className="text-slate-400 ltr-nums">@ {fmtMoney(t.price)}</span>}
                      </div>
                      <p className="text-xs text-slate-400 truncate ltr-nums">
                        {fmtDateTime(t.timestamp)}
                        {t.person !== "NONE" && ` · ${t.person}`}
                        {t.note && ` · ${t.note}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-sm font-bold ltr-nums ${t.profit >= 0 ? "text-buy" : "text-sell"}`}>
                        {fmtMoney(t.profit)}
                      </span>
                      <button
                        onClick={() => setEditing(t)}
                        className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => scheduleDelete(t)}
                        className="p-1.5 rounded-lg hover:bg-sell/10 text-sell"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))
      )}

      {editing && <EditTransactionModal tx={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function EditTransactionModal({ tx, onClose }: { tx: Transaction; onClose: () => void }) {
  const [note, setNote] = useState(tx.note);
  const [person, setPerson] = useState(tx.person);
  const [amount, setAmount] = useState(String(tx.amount));
  const [price, setPrice] = useState(String(tx.price));
  const [profit, setProfit] = useState(String(tx.profit));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const isSell = tx.transactionType === "SELL";
  const amountLabel = isSell ? "المبلغ المباع" : "المبلغ المشترى";
  const priceLabel = isSell ? "سعر البيع" : "سعر الشراء";

  return (
    <Modal
      open
      onClose={onClose}
      title="تعديل عملية"
      footer={
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              await updateTransactionFields(tx, {
                note,
                person,
                amount: Number(amount) || 0,
                price: Number(price) || 0,
                profit: Number(profit) || 0,
              });
              onClose();
            } catch (e) {
              setError(e instanceof Error ? e.message : "حدث خطأ أثناء الحفظ");
            } finally {
              setBusy(false);
            }
          }}
          className="btn-gold"
        >
          حفظ
        </button>
      }
    >
      <div>
        <label className="label">ملاحظة</label>
        <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <PersonSelect value={person} onChange={setPerson} />
      <div>
        <label className="label">{amountLabel}</label>
        <input
          type="number"
          step="any"
          dir="ltr"
          className="input ltr-nums"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>
      <div>
        <label className="label">{priceLabel}</label>
        <input
          type="number"
          step="any"
          dir="ltr"
          className="input ltr-nums"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
      </div>
      <div>
        <label className="label">الربح</label>
        <input
          type="number"
          step="any"
          dir="ltr"
          className="input ltr-nums"
          value={profit}
          onChange={(e) => setProfit(e.target.value)}
        />
      </div>
      {error && <p className="text-sell text-sm">{error}</p>}
    </Modal>
  );
}

function WeeklyView({ transactions }: { transactions: Transaction[] }) {
  const days = lastNDays(7);

  const chartData = days.map((d) => {
    const dayTxs = transactions.filter((t) => isSameDay(new Date(t.timestamp), d));
    return {
      label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      profit: Math.round(totalProfit(dayTxs) * 100) / 100,
    };
  });

  const weekStart = days[0];
  const weekTxs = transactions.filter((t) => new Date(t.timestamp) >= weekStart);
  const usdtWeek = weekTxs.filter((t) => t.serviceType === "USDT");
  const buyPrices = usdtWeek.filter((t) => t.transactionType === "BUY").map((t) => t.price);
  const sellPrices = usdtWeek.filter((t) => t.transactionType === "SELL").map((t) => t.price);
  const bestBuy = buyPrices.length ? Math.min(...buyPrices) : null;
  const bestSell = sellPrices.length ? Math.max(...sellPrices) : null;

  return (
    <div className="space-y-6">
      <SummaryCard transactions={weekTxs} />

      <div className="card p-5">
        <h3 className="font-bold mb-4">ربح آخر 7 أيام</h3>
        <div className="h-64" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="label" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip formatter={(v: number) => fmtMoney(v)} />
              <Bar dataKey="profit" radius={[6, 6, 0, 0]}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={d.profit >= 0 ? "#26A17B" : "#C62828"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card p-4 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">أفضل سعر شراء USDT هذا الأسبوع</p>
          <p className="font-extrabold text-lg text-buy ltr-nums">{bestBuy !== null ? fmtMoney(bestBuy) : "—"}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">أفضل سعر بيع USDT هذا الأسبوع</p>
          <p className="font-extrabold text-lg text-sell ltr-nums">{bestSell !== null ? fmtMoney(bestSell) : "—"}</p>
        </div>
      </div>
    </div>
  );
}

function AnalyticsView({ transactions }: { transactions: Transaction[] }) {
  const monthlyData = useMemo(() => {
    const now = new Date();
    const months: { label: string; profit: number; year: number; month: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        label: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        profit: 0,
        year: d.getFullYear(),
        month: d.getMonth(),
      });
    }
    for (const m of months) {
      const txs = transactions.filter((t) => isInMonth(t.timestamp, m.year, m.month));
      m.profit = Math.round(totalProfit(txs) * 100) / 100;
    }
    return months;
  }, [transactions]);

  const serviceData = useMemo(
    () =>
      summarizeByService(transactions)
        .map((row) => ({ label: SERVICE_LABELS[row.service], profit: Math.round(row.profit * 100) / 100 }))
        .sort((a, b) => b.profit - a.profit),
    [transactions]
  );

  const busiestDay = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of transactions) {
      const key = new Date(t.timestamp).toLocaleDateString("en-CA");
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    let best: { date: string; count: number } | null = null;
    for (const [date, count] of counts) {
      if (!best || count > best.count) best = { date, count };
    }
    return best;
  }, [transactions]);

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <h3 className="font-bold mb-4">اتجاه الربح — آخر 12 شهر</h3>
        <div className="h-64" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="label" fontSize={11} />
              <YAxis fontSize={12} />
              <Tooltip formatter={(v: number) => fmtMoney(v)} />
              <Bar dataKey="profit" radius={[6, 6, 0, 0]}>
                {monthlyData.map((d, i) => (
                  <Cell key={i} fill={d.profit >= 0 ? "#26A17B" : "#C62828"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="font-bold mb-4">مقارنة الربح حسب الخدمة</h3>
        {serviceData.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">لا توجد بيانات بعد</p>
        ) : (
          <div className="h-64" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={serviceData} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis type="number" fontSize={12} />
                <YAxis dataKey="label" type="category" width={110} fontSize={12} />
                <Tooltip formatter={(v: number) => fmtMoney(v)} />
                <Bar dataKey="profit" radius={[0, 6, 6, 0]}>
                  {serviceData.map((d, i) => (
                    <Cell key={i} fill={d.profit >= 0 ? "#26A17B" : "#C62828"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="card p-4 text-center">
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">أكثر يوم نشاطاً (على الإطلاق)</p>
        {busiestDay ? (
          <p className="font-extrabold text-lg ltr-nums">
            {busiestDay.date} — {busiestDay.count} عملية
          </p>
        ) : (
          <p className="text-sm text-slate-400">لا توجد بيانات بعد</p>
        )}
      </div>
    </div>
  );
}
