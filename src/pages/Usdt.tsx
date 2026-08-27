import { useMemo, useState } from "react";
import { Pencil, Plus, RotateCcw, TrendingDown, TrendingUp, Trash2, Wallet } from "lucide-react";
import { useTransactions } from "../hooks/useTransactions";
import { useUsdtSettings } from "../hooks/useSettings";
import { useTodayRate } from "../hooks/useDailyRates";
import { groupBuyLots, totalUsdtBalance, weightedAvgRate, type LotGroup } from "../lib/usdtLots";
import { fmtMoney, fmtDate } from "../lib/format";
import { isToday } from "../lib/dateRanges";
import { Modal } from "../components/Modal";
import { PersonSelect } from "../components/PersonSelect";
import {
  createUsdtBuy,
  createUsdtSell,
  deleteTransaction,
  editLotAmount,
  NO_PERSON,
} from "../lib/transactionActions";
import type { Transaction } from "../types";

export function Usdt() {
  const { transactions, error: txError } = useTransactions();
  const { initialBalance, updateInitialBalance, error: balanceError } = useUsdtSettings();
  const { rate } = useTodayRate();
  const loadError = txError || balanceError;

  const usdtTxs = useMemo(() => transactions.filter((t) => t.serviceType === "USDT"), [transactions]);

  const balance = totalUsdtBalance(initialBalance, usdtTxs);
  const avgRate = weightedAvgRate(usdtTxs);
  const expectedProfit = rate ? (rate.sellRate - avgRate) * balance : 0;
  const lotGroups = useMemo(() => groupBuyLots(usdtTxs), [usdtTxs]);

  const todayTxs = useMemo(() => usdtTxs.filter((t) => isToday(t.timestamp)), [usdtTxs]);
  const todayBought = todayTxs.filter((t) => t.transactionType === "BUY").reduce((s, t) => s + t.amount, 0);
  const todaySold = todayTxs.filter((t) => t.transactionType === "SELL").reduce((s, t) => s + t.amount, 0);
  const todayProfit = todayTxs.filter((t) => t.transactionType === "SELL").reduce((s, t) => s + t.profit, 0);

  const [buyOpen, setBuyOpen] = useState(false);
  const [sellGroup, setSellGroup] = useState<LotGroup | null>(null);
  const [editGroup, setEditGroup] = useState<LotGroup | null>(null);
  const [deletingPrice, setDeletingPrice] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [resetOpen, setResetOpen] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [resetError, setResetError] = useState("");

  const handleDeleteGroup = async (group: LotGroup) => {
    const ok = window.confirm(
      `هل أنت متأكد من حذف خانة ${fmtMoney(group.price)}؟ سيتم خصم ${fmtMoney(group.totalOriginal)} من الرصيد الكلي.`
    );
    if (!ok) return;
    setDeleteError("");
    setDeletingPrice(group.price);
    try {
      await Promise.all(group.docs.map((d) => deleteTransaction(d)));
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "حدث خطأ أثناء الحذف");
    } finally {
      setDeletingPrice(null);
    }
  };

  // إعادة تصفير: تحذف فقط الخانات النشطة (عمليات الشراء غير المباعة بالكامل) وتصفّر الرصيد
  // الحالي المعروض إلى 0 — سجل عمليات البيع التاريخية (وبالتالي أرباح التقارير) ما بينحذف ولا
  // بيتأثر. نفس قاعدة بيانات Firestore يستخدمها تطبيق الأندرويد، فالخانات بتصير صفر هناك تلقائياً.
  //
  // ملاحظة: الرصيد الأولي بعد التصفير مش بالضرورة 0 حرفياً — بيتحسب بحيث "الرصيد الحالي"
  // (initialBalance + كل الشراء - كل البيع) يطلع 0 بالضبط، حتى لو كان هناك عدم توازن تاريخي
  // بين مجموع الشراء والبيع بالبيانات القديمة غير النشطة. أي شراء جديد بعد هيك بيزيد الرصيد
  // بشكل طبيعي وصحيح.
  const activeLotDocs = useMemo(() => lotGroups.flatMap((g) => g.docs), [lotGroups]);

  const handleReset = async () => {
    setResetBusy(true);
    setResetError("");
    try {
      const activeSum = activeLotDocs.reduce((s, d) => s + d.amount, 0);
      const newInitialBalance = activeSum - balance + initialBalance;
      await Promise.all(activeLotDocs.map((tx) => deleteTransaction(tx)));
      await updateInitialBalance(newInitialBalance);
      setResetOpen(false);
    } catch (e) {
      setResetError(e instanceof Error ? e.message : "حدث خطأ أثناء التصفير");
    } finally {
      setResetBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">USDT</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">إدارة خانات الشراء والبيع</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setResetOpen(true)} className="btn-ghost text-sell">
            <RotateCcw size={18} /> إعادة تصفير
          </button>
          <button onClick={() => setBuyOpen(true)} className="btn-buy">
            <Plus size={18} /> شراء USDT
          </button>
        </div>
      </div>

      {loadError && (
        <div className="card p-4 bg-sell/10 border border-sell/30 text-sell text-sm">
          تعذّر تحميل البيانات من Firestore: {loadError}
          <br />
          تأكد من صلاحيات (rules) قاعدة البيانات ومن تسجيل الدخول بشكل صحيح.
        </div>
      )}
      {deleteError && (
        <div className="card p-4 bg-sell/10 border border-sell/30 text-sell text-sm">{deleteError}</div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Wallet} label="إجمالي الرصيد" value={`₮ ${fmtMoney(balance)}`} />
        <StatCard icon={TrendingUp} label="المتوسط المرجّح" value={fmtMoney(avgRate)} />
        <StatCard
          icon={TrendingUp}
          label="الربح المتوقع"
          value={fmtMoney(expectedProfit)}
          tone={expectedProfit >= 0 ? "buy" : "sell"}
        />
        <StatCard icon={Wallet} label="عدد الخانات" value={String(lotGroups.length)} />
      </div>

      <div className="card p-5">
        <h2 className="font-bold mb-3">حركة اليوم</h2>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">مشترى</p>
            <p className="font-bold text-buy ltr-nums">{fmtMoney(todayBought)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">مباع</p>
            <p className="font-bold text-sell ltr-nums">{fmtMoney(todaySold)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">الربح</p>
            <p className={`font-bold ltr-nums ${todayProfit >= 0 ? "text-buy" : "text-sell"}`}>
              {fmtMoney(todayProfit)}
            </p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="font-bold mb-3">الخانات</h2>
        {lotGroups.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-10">لا توجد خانات نشطة</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {lotGroups.map((g) => (
              <LotCard
                key={g.price}
                group={g}
                onSell={() => setSellGroup(g)}
                onEdit={() => setEditGroup(g)}
                onDelete={() => handleDeleteGroup(g)}
                deleting={deletingPrice === g.price}
              />
            ))}
          </div>
        )}
      </div>

      <BuyDialog
        open={buyOpen}
        onClose={() => setBuyOpen(false)}
        defaultPrice={rate?.buyRate ?? 0}
      />
      {sellGroup && (
        <SellDialog
          group={sellGroup}
          defaultPrice={rate?.sellRate ?? 0}
          onClose={() => setSellGroup(null)}
        />
      )}
      {editGroup && <EditLotDialog group={editGroup} onClose={() => setEditGroup(null)} />}
      <ResetDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={handleReset}
        busy={resetBusy}
        error={resetError}
        count={activeLotDocs.length}
      />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  tone?: "buy" | "sell";
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        <Icon size={16} className="text-gold" />
      </div>
      <p
        className={`text-lg font-extrabold ltr-nums ${
          tone === "buy" ? "text-buy" : tone === "sell" ? "text-sell" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function LotCard({
  group,
  onSell,
  onEdit,
  onDelete,
  deleting,
}: {
  group: LotGroup;
  onSell: () => void;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const pct = group.totalOriginal > 0 ? (group.totalRemaining / group.totalOriginal) * 100 : 0;

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">سعر الشراء</p>
          <p className="text-xl font-extrabold ltr-nums">{fmtMoney(group.price)}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={onDelete}
            disabled={deleting}
            className="p-1.5 rounded-lg hover:bg-sell/10 text-sell disabled:opacity-50"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <div className="flex justify-between text-sm mb-1 ltr-nums">
        <span className="text-slate-500 dark:text-slate-400">المتبقي: {fmtMoney(group.totalRemaining)}</span>
        <span className="text-slate-400">الإجمالي: {fmtMoney(group.totalOriginal)}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden mb-3">
        <div className="h-full bg-gold" style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
      </div>

      <p className="text-[11px] text-slate-400 mb-3 ltr-nums">{fmtDate(group.earliestTimestamp)}</p>

      <button onClick={onSell} className="btn-sell w-full">
        <TrendingDown size={16} /> بيع
      </button>
    </div>
  );
}

function ResetDialog({
  open,
  onClose,
  onConfirm,
  busy,
  error,
  count,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  busy: boolean;
  error: string;
  count: number;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="إعادة تصفير رصيد USDT"
      footer={
        <button disabled={busy} onClick={onConfirm} className="btn-sell">
          {busy ? "جارٍ التصفير..." : "نعم، صفّر كل شي"}
        </button>
      }
    >
      <p className="text-sm">
        هذا الإجراء سيحذف <b className="ltr-nums">{count}</b> عملية شراء (الخانات النشطة حالياً فقط)
        ويضبط الرصيد الحالي المعروض ليصير <b className="ltr-nums">0</b> بالضبط — والخانات صفر
        مباشرة. سجل عمليات البيع التاريخية وأرباح USDT بصفحة التقارير{" "}
        <b>ما بينحذف ولا بيتأثر إطلاقاً</b>.
      </p>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        بما إنو نفس قاعدة البيانات مستخدمة بتطبيق الأندرويد، الخانات هناك رح تصير صفر تلقائياً كمان.
        أي عملية شراء جديدة بعد التصفير رح تزيد الرصيد بشكل طبيعي وصحيح.
      </p>
      <p className="text-sm text-sell font-semibold">تنبيه: هذا الإجراء لا يمكن التراجع عنه.</p>
      {error && <p className="text-sell text-sm">{error}</p>}
    </Modal>
  );
}

function BuyDialog({
  open,
  onClose,
  defaultPrice,
}: {
  open: boolean;
  onClose: () => void;
  defaultPrice: number;
}) {
  const [amount, setAmount] = useState("");
  const [price, setPrice] = useState(String(defaultPrice || ""));
  const [note, setNote] = useState("");
  const [person, setPerson] = useState(NO_PERSON);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setAmount("");
    setPrice(String(defaultPrice || ""));
    setNote("");
    setPerson(NO_PERSON);
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        onClose();
        reset();
      }}
      title="شراء USDT"
      footer={
        <button
          disabled={busy || !amount || !price}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              await createUsdtBuy({
                amount: Number(amount) || 0,
                price: Number(price) || 0,
                note,
                person,
              });
              onClose();
              reset();
            } catch (e) {
              setError(e instanceof Error ? e.message : "حدث خطأ أثناء الحفظ");
            } finally {
              setBusy(false);
            }
          }}
          className="btn-buy"
        >
          شراء
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
        <label className="label">السعر</label>
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
        <label className="label">ملاحظة</label>
        <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <PersonSelect value={person} onChange={setPerson} />
      {error && <p className="text-sell text-sm">{error}</p>}
    </Modal>
  );
}

function SellDialog({
  group,
  defaultPrice,
  onClose,
}: {
  group: LotGroup;
  defaultPrice: number;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [sellPrice, setSellPrice] = useState(String(defaultPrice || ""));
  const [note, setNote] = useState("");
  const [person, setPerson] = useState(NO_PERSON);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const amountNum = Number(amount) || 0;
  const sellPriceNum = Number(sellPrice) || 0;
  const profit = (sellPriceNum - group.price) * amountNum;
  const total = amountNum * sellPriceNum;

  return (
    <Modal
      open
      onClose={onClose}
      title={`بيع من خانة ${fmtMoney(group.price)}`}
      footer={
        <button
          disabled={busy || !amount || !sellPrice}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              await createUsdtSell({
                lotDocs: group.docs,
                groupPrice: group.price,
                amount: amountNum,
                sellPrice: sellPriceNum,
                note,
                person,
              });
              onClose();
            } catch (e) {
              setError(e instanceof Error ? e.message : "حدث خطأ");
            } finally {
              setBusy(false);
            }
          }}
          className="btn-sell"
        >
          بيع
        </button>
      }
    >
      <p className="text-sm text-slate-500 dark:text-slate-400 ltr-nums">
        المتاح للبيع: {fmtMoney(group.totalRemaining)}
      </p>
      <div>
        <label className="label">المبلغ المراد بيعه</label>
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
        <label className="label">سعر البيع</label>
        <input
          type="number"
          step="any"
          dir="ltr"
          className="input ltr-nums"
          value={sellPrice}
          onChange={(e) => setSellPrice(e.target.value)}
        />
      </div>
      <div className="rounded-xl bg-slate-100 dark:bg-white/5 p-3 text-center">
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">الربح المتوقع</p>
        <p className={`font-bold ltr-nums ${profit >= 0 ? "text-buy" : "text-sell"}`}>
          {fmtMoney(profit)}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 mb-1">
          الإجمالي (المبلغ × سعر البيع)
        </p>
        <p className="font-bold ltr-nums">{fmtMoney(total)}</p>
      </div>
      <div>
        <label className="label">ملاحظة</label>
        <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <PersonSelect value={person} onChange={setPerson} />
      {error && <p className="text-sell text-sm">{error}</p>}
    </Modal>
  );
}

function EditLotDialog({ group, onClose }: { group: LotGroup; onClose: () => void }) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(group.docs.map((d: Transaction) => [d.id, String(d.amount)]))
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  return (
    <Modal
      open
      onClose={onClose}
      title={`تعديل خانة ${fmtMoney(group.price)}`}
      footer={
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              await Promise.all(
                group.docs.map((d) => editLotAmount(d, Number(values[d.id]) || 0))
              );
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
      {group.docs.map((d) => (
        <div key={d.id}>
          <label className="label ltr-nums">المبلغ الأصلي — {new Date(d.timestamp).toLocaleDateString("en-US")}</label>
          <input
            type="number"
            step="any"
            dir="ltr"
            className="input ltr-nums"
            value={values[d.id]}
            onChange={(e) => setValues((v) => ({ ...v, [d.id]: e.target.value }))}
          />
        </div>
      ))}
      {error && <p className="text-sell text-sm">{error}</p>}
    </Modal>
  );
}
