import { useState } from "react";
import { Modal } from "./Modal";
import { fmtMoney } from "../lib/format";
import { evalExpression } from "../lib/calculator";

interface CalculatorDialogProps {
  open: boolean;
  onClose: () => void;
  buyRate: number;
  sellRate: number;
}

export function CalculatorDialog({ open, onClose, buyRate, sellRate }: CalculatorDialogProps) {
  const [expr, setExpr] = useState("");
  const [error, setError] = useState("");

  let amount = 0;
  try {
    amount = expr.trim() ? evalExpression(expr) : 0;
  } catch {
    // handled on submit only; live preview just shows 0
  }

  return (
    <Modal open={open} onClose={onClose} title="حاسبة USDT">
      <div>
        <label className="label">المبلغ (يمكن كتابة عملية حسابية مثل 100+50)</label>
        <input
          className="input ltr-nums"
          dir="ltr"
          value={expr}
          onChange={(e) => {
            setExpr(e.target.value);
            setError("");
          }}
          placeholder="0"
        />
        {error && <p className="text-sell text-sm mt-1">{error}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2">
        <div className="rounded-xl bg-buy/10 p-3 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-300 mb-1">إجمالي الشراء</p>
          <p className="font-bold text-buy ltr-nums">{fmtMoney(amount * buyRate)}</p>
          <p className="text-[11px] text-slate-400 mt-1">بسعر {fmtMoney(buyRate)}</p>
        </div>
        <div className="rounded-xl bg-sell/10 p-3 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-300 mb-1">إجمالي البيع</p>
          <p className="font-bold text-sell ltr-nums">{fmtMoney(amount * sellRate)}</p>
          <p className="text-[11px] text-slate-400 mt-1">بسعر {fmtMoney(sellRate)}</p>
        </div>
      </div>
    </Modal>
  );
}
