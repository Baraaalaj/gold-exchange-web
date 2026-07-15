import { useState } from "react";
import { Plus, Trash2, UserRound } from "lucide-react";
import { usePersons } from "../hooks/usePersons";
import { personDisplayBalance } from "../lib/transactionActions";
import { fmtMoney } from "../lib/format";
import { evalExpression } from "../lib/calculator";
import { Modal } from "../components/Modal";
import type { Person } from "../types";

const AVATAR_COLORS = [
  "#D4AF37",
  "#26A17B",
  "#C62828",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
  "#F59E0B",
  "#0EA5E9",
];

function colorFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function Persons() {
  const { persons, addPerson, updatePerson, removePerson } = usePersons();
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<Person | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">الأشخاص والديون</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">إدارة أرصدة وديون الأشخاص</p>
        </div>
        <button onClick={() => setAddOpen(true)} className="btn-gold">
          <Plus size={18} /> شخص جديد
        </button>
      </div>

      {persons.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-10">لا يوجد أشخاص بعد</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {persons.map((p) => {
            const net = personDisplayBalance(p);
            return (
              <div key={p.id} className="card p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold shrink-0"
                    style={{ backgroundColor: colorFor(p.name) }}
                  >
                    {p.name.slice(0, 1)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold truncate">{p.name}</p>
                    <p className={`text-sm font-semibold ltr-nums ${net >= 0 ? "text-buy" : "text-sell"}`}>
                      الصافي: {fmtMoney(net)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs mb-3">
                  <div className="rounded-lg bg-slate-100 dark:bg-white/5 p-2">
                    <p className="text-slate-400 mb-0.5">من العمليات</p>
                    <p className="font-semibold ltr-nums">{fmtMoney(p.balanceFromTx)}</p>
                  </div>
                  <div className="rounded-lg bg-slate-100 dark:bg-white/5 p-2">
                    <p className="text-slate-400 mb-0.5">دين</p>
                    <p className="font-semibold ltr-nums text-sell">{fmtMoney(p.debt)}</p>
                  </div>
                  <div className="rounded-lg bg-slate-100 dark:bg-white/5 p-2">
                    <p className="text-slate-400 mb-0.5">رصيد يدوي</p>
                    <p className="font-semibold ltr-nums">{fmtMoney(p.manualBalance)}</p>
                  </div>
                </div>

                {p.notes && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 whitespace-pre-wrap">
                    {p.notes}
                  </p>
                )}

                <div className="flex gap-2">
                  <button onClick={() => setEditing(p)} className="btn-ghost flex-1 text-sm">
                    تعديل
                  </button>
                  <button
                    onClick={() => removePerson(p.id)}
                    className="p-2.5 rounded-xl hover:bg-sell/10 text-sell"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="شخص جديد"
        footer={
          <button
            disabled={!newName.trim()}
            onClick={async () => {
              await addPerson(newName.trim());
              setNewName("");
              setAddOpen(false);
            }}
            className="btn-gold"
          >
            إضافة
          </button>
        }
      >
        <label className="label">الاسم</label>
        <input className="input" value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus />
      </Modal>

      {editing && (
        <EditPersonModal
          person={editing}
          onClose={() => setEditing(null)}
          onSave={async (data) => {
            await updatePerson(editing.id, data);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function CalcField({
  label,
  value,
  onCommit,
}: {
  label: string;
  value: number;
  onCommit: (next: number) => void;
}) {
  const [expr, setExpr] = useState(String(value));
  const [error, setError] = useState("");

  const apply = () => {
    try {
      const result = evalExpression(expr);
      onCommit(result);
      setExpr(String(result));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعبير غير صالح");
    }
  };

  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex gap-2">
        <input
          className="input ltr-nums"
          dir="ltr"
          value={expr}
          onChange={(e) => setExpr(e.target.value)}
          onBlur={apply}
          onKeyDown={(e) => e.key === "Enter" && apply()}
          placeholder="مثال: 100+50-20"
        />
      </div>
      {error && <p className="text-sell text-xs mt-1">{error}</p>}
    </div>
  );
}

function EditPersonModal({
  person,
  onClose,
  onSave,
}: {
  person: Person;
  onClose: () => void;
  onSave: (data: Partial<Person>) => Promise<void>;
}) {
  const [manualBalance, setManualBalance] = useState(person.manualBalance);
  const [debt, setDebt] = useState(person.debt);
  const [notes, setNotes] = useState(person.notes);
  const [busy, setBusy] = useState(false);

  return (
    <Modal
      open
      onClose={onClose}
      title={`تعديل ${person.name}`}
      footer={
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await onSave({ manualBalance, debt, notes });
            setBusy(false);
          }}
          className="btn-gold"
        >
          حفظ
        </button>
      }
    >
      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm mb-1">
        <UserRound size={16} /> يمكنك كتابة عمليات حسابية مثل 100+50-20
      </div>
      <CalcField label="الرصيد اليدوي" value={manualBalance} onCommit={setManualBalance} />
      <CalcField label="الدين" value={debt} onCommit={setDebt} />
      <div>
        <label className="label">ملاحظات</label>
        <textarea
          className="input min-h-24"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
    </Modal>
  );
}
