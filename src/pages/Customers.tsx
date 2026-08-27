import { useState } from "react";
import { MessageCircle, Phone, Plus, Trash2 } from "lucide-react";
import { useCustomers } from "../hooks/useCustomers";
import { fmtMoney } from "../lib/format";
import { evalExpression } from "../lib/calculator";
import { Modal } from "../components/Modal";
import type { Customer } from "../types";

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

/** Normalizes a phone number to digits-only for wa.me links (keeps a leading + off, wa.me wants digits only). */
function normalizePhone(phone: string): string {
  return phone.replace(/[^\d]/g, "");
}

function whatsappReminderUrl(customer: Customer): string {
  const digits = normalizePhone(customer.phone);
  const message = `مرحباً ${customer.name}، تذكير بأنو عليك دين بقيمة ${fmtMoney(customer.debt)} عند الذهبي للصرافة. يرجى التواصل لتسوية الحساب. شكراً.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function Customers() {
  const { customers, addCustomer, updateCustomer, removeCustomer } = useCustomers();
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [editing, setEditing] = useState<Customer | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">العملاء</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            قائمة عملاء منفصلة عن الأشخاص — لأرقام الهواتف وتذكير الديون
          </p>
        </div>
        <button onClick={() => setAddOpen(true)} className="btn-gold">
          <Plus size={18} /> عميل جديد
        </button>
      </div>

      {customers.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-10">لا يوجد عملاء بعد</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {customers.map((c) => (
            <div key={c.id} className="card p-4">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold shrink-0"
                  style={{ backgroundColor: colorFor(c.name) }}
                >
                  {c.name.slice(0, 1)}
                </div>
                <div className="min-w-0">
                  <p className="font-bold truncate">{c.name}</p>
                  {c.phone && (
                    <p className="text-xs text-slate-400 flex items-center gap-1 ltr-nums" dir="ltr">
                      <Phone size={11} /> {c.phone}
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-lg bg-slate-100 dark:bg-white/5 p-2 text-center mb-3">
                <p className="text-xs text-slate-400 mb-0.5">الدين</p>
                <p className={`font-semibold ltr-nums ${c.debt > 0 ? "text-sell" : ""}`}>
                  {fmtMoney(c.debt)}
                </p>
              </div>

              {c.notes && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 whitespace-pre-wrap">
                  {c.notes}
                </p>
              )}

              <div className="flex gap-2">
                <button onClick={() => setEditing(c)} className="btn-ghost flex-1 text-sm">
                  تعديل
                </button>
                {c.debt > 0 && c.phone && (
                  <a
                    href={whatsappReminderUrl(c)}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 rounded-xl hover:bg-buy/10 text-buy"
                    aria-label="تذكير واتساب"
                  >
                    <MessageCircle size={16} />
                  </a>
                )}
                <button
                  onClick={() => removeCustomer(c.id)}
                  className="p-2.5 rounded-xl hover:bg-sell/10 text-sell"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="عميل جديد"
        footer={
          <button
            disabled={!newName.trim()}
            onClick={async () => {
              await addCustomer(newName.trim(), newPhone.trim());
              setNewName("");
              setNewPhone("");
              setAddOpen(false);
            }}
            className="btn-gold"
          >
            إضافة
          </button>
        }
      >
        <div>
          <label className="label">الاسم</label>
          <input className="input" value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus />
        </div>
        <div>
          <label className="label">رقم الهاتف (مع رمز الدولة، مثال: 962791234567)</label>
          <input
            className="input ltr-nums"
            dir="ltr"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
          />
        </div>
      </Modal>

      {editing && (
        <EditCustomerModal
          customer={editing}
          onClose={() => setEditing(null)}
          onSave={async (data) => {
            await updateCustomer(editing.id, data);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function EditCustomerModal({
  customer,
  onClose,
  onSave,
}: {
  customer: Customer;
  onClose: () => void;
  onSave: (data: Partial<Customer>) => Promise<void>;
}) {
  const [phone, setPhone] = useState(customer.phone);
  const [debtExpr, setDebtExpr] = useState(String(customer.debt));
  const [debtError, setDebtError] = useState("");
  const [notes, setNotes] = useState(customer.notes);
  const [busy, setBusy] = useState(false);

  return (
    <Modal
      open
      onClose={onClose}
      title={`تعديل ${customer.name}`}
      footer={
        <button
          disabled={busy}
          onClick={async () => {
            let debt: number;
            try {
              debt = evalExpression(debtExpr);
            } catch (e) {
              setDebtError(e instanceof Error ? e.message : "تعبير غير صالح");
              return;
            }
            setBusy(true);
            await onSave({ phone, debt, notes });
            setBusy(false);
          }}
          className="btn-gold"
        >
          حفظ
        </button>
      }
    >
      <div>
        <label className="label">رقم الهاتف</label>
        <input className="input ltr-nums" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <div>
        <label className="label">الدين (تقدر تكتب عملية حسابية مثل 100+50-20)</label>
        <input
          className="input ltr-nums"
          dir="ltr"
          value={debtExpr}
          onChange={(e) => {
            setDebtExpr(e.target.value);
            setDebtError("");
          }}
        />
        {debtError && <p className="text-sell text-xs mt-1">{debtError}</p>}
      </div>
      <div>
        <label className="label">ملاحظات</label>
        <textarea className="input min-h-24" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
    </Modal>
  );
}
