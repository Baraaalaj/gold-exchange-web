import { useMemo, useState } from "react";
import { Calculator, Coins, NotebookPen, Pencil, Plus, Trash2, TrendingUp } from "lucide-react";
import { useTransactions } from "../hooks/useTransactions";
import { useUsdtSettings, useHomeNotes } from "../hooks/useSettings";
import { useTodayRate } from "../hooks/useDailyRates";
import { totalUsdtBalance } from "../lib/usdtLots";
import { fmtMoney, fmtDateTime } from "../lib/format";
import { Modal } from "../components/Modal";
import { CalculatorDialog } from "../components/CalculatorDialog";
import { PersonSelect } from "../components/PersonSelect";
import { createGenericTransaction, NO_PERSON } from "../lib/transactionActions";

export function Home() {
  const { transactions, error: txError } = useTransactions();
  const { initialBalance, updateInitialBalance, error: balanceError } = useUsdtSettings();
  const { rate, setTodayRate } = useTodayRate();
  const { notes, addNote, updateNote, deleteNote } = useHomeNotes();
  const loadError = txError || balanceError;

  const usdtTxs = useMemo(() => transactions.filter((t) => t.serviceType === "USDT"), [transactions]);
  const balance = totalUsdtBalance(initialBalance, usdtTxs);

  const [balanceModal, setBalanceModal] = useState(false);
  const [ratesModal, setRatesModal] = useState(false);
  const [manualModal, setManualModal] = useState(false);
  const [calcModal, setCalcModal] = useState(false);
  const [noteModal, setNoteModal] = useState<{ id: string | null; content: string } | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">الرئيسية</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">نظرة سريعة على مكتب الصرافة</p>
      </div>

      {loadError && (
        <div className="card p-4 bg-sell/10 border border-sell/30 text-sell text-sm">
          تعذّر تحميل البيانات من Firestore: {loadError}
          <br />
          تأكد من صلاحيات (rules) قاعدة البيانات ومن تسجيل الدخول بشكل صحيح.
        </div>
      )}

      <div className="card p-6 bg-gradient-to-br from-[#16213E] to-[#0F3460] text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-300 text-sm mb-1">رصيد USDT الحالي</p>
            <p className="text-3xl font-extrabold ltr-nums flex items-center gap-2">
              <span className="text-gold">₮</span>
              {fmtMoney(balance)}
            </p>
          </div>
          <div className="w-12 h-12 rounded-full bg-gold/15 flex items-center justify-center">
            <Coins className="text-gold" size={26} />
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mt-5">
          <button onClick={() => setBalanceModal(true)} className="btn-ghost bg-white/10 text-white hover:bg-white/20">
            <Plus size={16} /> الرصيد الأولي
          </button>
          <button onClick={() => setRatesModal(true)} className="btn-ghost bg-white/10 text-white hover:bg-white/20">
            <TrendingUp size={16} /> أسعار اليوم
          </button>
          {rate && (
            <div className="text-xs text-slate-300 flex items-center gap-3 ltr-nums">
              <span>شراء: {fmtMoney(rate.buyRate)}</span>
              <span>بيع: {fmtMoney(rate.sellRate)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button onClick={() => setManualModal(true)} className="btn-sell">
          <Plus size={18} /> معاملة يدوية
        </button>
        <button onClick={() => setCalcModal(true)} className="btn-ghost">
          <Calculator size={18} /> حاسبة
        </button>
      </div>

      <section className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold flex items-center gap-2">
            <NotebookPen size={18} className="text-gold" /> الملاحظات
          </h2>
          <button
            onClick={() => setNoteModal({ id: null, content: "" })}
            className="text-sm text-gold-dark dark:text-gold font-semibold"
          >
            + إضافة ملاحظة
          </button>
        </div>

        {notes.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">لا توجد ملاحظات بعد</p>
        ) : (
          <ul className="space-y-2">
            {notes.map((n) => (
              <li
                key={n.id}
                className="rounded-xl bg-slate-100 dark:bg-white/5 p-3 flex items-start justify-between gap-3"
              >
                <div>
                  <p className="whitespace-pre-wrap text-sm">{n.content}</p>
                  <p className="text-[11px] text-slate-400 mt-1 ltr-nums">
                    أُنشئت: {fmtDateTime(n.createdAt)}
                    {n.updatedAt !== n.createdAt && ` · عُدّلت: ${fmtDateTime(n.updatedAt)}`}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => setNoteModal({ id: n.id, content: n.content })}
                    className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => deleteNote(n.id)}
                    className="p-1.5 rounded-lg hover:bg-sell/10 text-sell"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <InitialBalanceModal
        open={balanceModal}
        onClose={() => setBalanceModal(false)}
        current={initialBalance}
        onSave={updateInitialBalance}
      />
      <RatesModal
        open={ratesModal}
        onClose={() => setRatesModal(false)}
        current={rate}
        onSave={setTodayRate}
      />
      <ManualTransactionModal open={manualModal} onClose={() => setManualModal(false)} />
      <CalculatorDialog
        open={calcModal}
        onClose={() => setCalcModal(false)}
        buyRate={rate?.buyRate ?? 0}
        sellRate={rate?.sellRate ?? 0}
      />
      {noteModal && (
        <NoteModal
          initial={noteModal}
          onClose={() => setNoteModal(null)}
          onSave={async (content) => {
            if (noteModal.id) await updateNote(noteModal.id, content);
            else await addNote(content);
            setNoteModal(null);
          }}
        />
      )}
    </div>
  );
}

function InitialBalanceModal({
  open,
  onClose,
  current,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  current: number;
  onSave: (v: number) => Promise<void>;
}) {
  const [value, setValue] = useState(String(current));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="الرصيد الأولي لـ USDT"
      footer={
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              await onSave(Number(value) || 0);
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
      <label className="label">الرصيد الأولي</label>
      <input
        type="number"
        step="any"
        dir="ltr"
        className="input ltr-nums"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setValue(String(current))}
      />
      {error && <p className="text-sell text-sm">{error}</p>}
    </Modal>
  );
}

function RatesModal({
  open,
  onClose,
  current,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  current: { buyRate: number; sellRate: number } | null;
  onSave: (buy: number, sell: number) => Promise<void>;
}) {
  const [buy, setBuy] = useState(String(current?.buyRate ?? ""));
  const [sell, setSell] = useState(String(current?.sellRate ?? ""));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="أسعار USDT اليومية"
      footer={
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              await onSave(Number(buy) || 0, Number(sell) || 0);
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
        <label className="label">سعر الشراء</label>
        <input
          type="number"
          step="any"
          dir="ltr"
          className="input ltr-nums"
          value={buy}
          onChange={(e) => setBuy(e.target.value)}
        />
      </div>
      <div>
        <label className="label">سعر البيع</label>
        <input
          type="number"
          step="any"
          dir="ltr"
          className="input ltr-nums"
          value={sell}
          onChange={(e) => setSell(e.target.value)}
        />
      </div>
      {error && <p className="text-sell text-sm">{error}</p>}
    </Modal>
  );
}

function ManualTransactionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [profit, setProfit] = useState("");
  const [note, setNote] = useState("");
  const [person, setPerson] = useState(NO_PERSON);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setName("");
    setAmount("");
    setProfit("");
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
      title="معاملة يدوية"
      footer={
        <button
          disabled={busy || !name || !amount}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              await createGenericTransaction({
                serviceType: "MANUAL",
                transactionType: "SELL",
                amount: Number(amount) || 0,
                price: 1,
                total: Number(amount) || 0,
                profit: Number(profit) || 0,
                note: note ? `${name} - ${note}` : name,
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
          className="btn-sell"
        >
          حفظ
        </button>
      }
    >
      <div>
        <label className="label">اسم العملية</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label className="label">المبلغ</label>
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
      <div>
        <label className="label">ملاحظة</label>
        <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <PersonSelect value={person} onChange={setPerson} />
      {error && <p className="text-sell text-sm">{error}</p>}
    </Modal>
  );
}

function NoteModal({
  initial,
  onClose,
  onSave,
}: {
  initial: { id: string | null; content: string };
  onClose: () => void;
  onSave: (content: string) => Promise<void>;
}) {
  const [content, setContent] = useState(initial.content);
  const [busy, setBusy] = useState(false);

  return (
    <Modal
      open
      onClose={onClose}
      title={initial.id ? "تعديل ملاحظة" : "ملاحظة جديدة"}
      footer={
        <button
          disabled={busy || !content.trim()}
          onClick={async () => {
            setBusy(true);
            await onSave(content.trim());
            setBusy(false);
          }}
          className="btn-gold"
        >
          حفظ
        </button>
      }
    >
      <textarea
        className="input min-h-28"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        autoFocus
      />
    </Modal>
  );
}
