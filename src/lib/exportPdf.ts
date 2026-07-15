import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import type { Person, Transaction } from "../types";
import { SERVICE_LABELS } from "../types";
import { fmtDateTime, fmtMoney } from "./format";
import { summarizeByService, totalProfit } from "./profit";

export async function exportReportPdf(opts: {
  title: string;
  transactions: Transaction[];
  persons: Person[];
}) {
  const { title, transactions, persons } = opts;
  const summary = summarizeByService(transactions);
  const net = totalProfit(transactions);
  const totalBuy = transactions.filter((t) => t.transactionType === "BUY").reduce((s, t) => s + t.total, 0);
  const totalSell = transactions.filter((t) => t.transactionType === "SELL").reduce((s, t) => s + t.total, 0);

  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.top = "-99999px";
  container.style.left = "-99999px";
  container.style.width = "794px";
  container.style.padding = "32px";
  container.style.background = "#ffffff";
  container.style.color = "#0F172A";
  container.style.direction = "rtl";
  container.style.fontFamily = "Tajawal, Cairo, Arial, sans-serif";

  container.innerHTML = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:28px;font-weight:800;color:#D4AF37;">₮ الذهبي للصرافة</div>
      <div style="font-size:18px;font-weight:700;margin-top:6px;">${title}</div>
    </div>

    <div style="display:flex;gap:12px;margin-bottom:20px;">
      ${summaryTile("صافي الربح", fmtMoney(net), net >= 0 ? "#26A17B" : "#C62828")}
      ${summaryTile("إجمالي الشراء", fmtMoney(totalBuy), "#0F172A")}
      ${summaryTile("إجمالي البيع", fmtMoney(totalSell), "#0F172A")}
      ${summaryTile("عدد العمليات", String(transactions.length), "#0F172A")}
    </div>

    <div style="font-weight:700;margin-bottom:8px;">تفصيل الأرباح حسب الخدمة</div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;font-size:12px;">
      <thead>
        <tr style="background:#F1F5F9;">
          <th style="${th}">الخدمة</th><th style="${th}">شراء</th><th style="${th}">بيع</th><th style="${th}">الربح</th><th style="${th}">العدد</th>
        </tr>
      </thead>
      <tbody>
        ${summary
          .map(
            (row) => `
          <tr>
            <td style="${td}">${SERVICE_LABELS[row.service]}</td>
            <td style="${td}">${fmtMoney(row.buyTotal)}</td>
            <td style="${td}">${fmtMoney(row.sellTotal)}</td>
            <td style="${td};color:${row.profit >= 0 ? "#26A17B" : "#C62828"}">${fmtMoney(row.profit)}</td>
            <td style="${td}">${row.count}</td>
          </tr>`
          )
          .join("")}
      </tbody>
    </table>

    <div style="font-weight:700;margin-bottom:8px;">العمليات</div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;font-size:11px;">
      <thead>
        <tr style="background:#F1F5F9;">
          <th style="${th}">التاريخ</th><th style="${th}">الخدمة</th><th style="${th}">النوع</th><th style="${th}">المبلغ</th><th style="${th}">السعر</th><th style="${th}">الإجمالي</th><th style="${th}">الربح</th><th style="${th}">الشخص</th>
        </tr>
      </thead>
      <tbody>
        ${transactions
          .map(
            (t) => `
          <tr>
            <td style="${td}">${fmtDateTime(t.timestamp)}</td>
            <td style="${td}">${SERVICE_LABELS[t.serviceType]}</td>
            <td style="${td};color:${t.transactionType === "BUY" ? "#26A17B" : "#C62828"}">${
              t.transactionType === "BUY" ? "شراء" : "بيع"
            }</td>
            <td style="${td}">${fmtMoney(t.amount)}</td>
            <td style="${td}">${fmtMoney(t.price)}</td>
            <td style="${td}">${fmtMoney(t.total)}</td>
            <td style="${td}">${fmtMoney(t.profit)}</td>
            <td style="${td}">${t.person === "NONE" ? "-" : t.person}</td>
          </tr>`
          )
          .join("")}
      </tbody>
    </table>

    <div style="font-weight:700;margin-bottom:8px;">الأشخاص والديون</div>
    <table style="width:100%;border-collapse:collapse;font-size:12px;">
      <thead>
        <tr style="background:#F1F5F9;">
          <th style="${th}">الاسم</th><th style="${th}">رصيد من العمليات</th><th style="${th}">دين</th><th style="${th}">رصيد يدوي</th>
        </tr>
      </thead>
      <tbody>
        ${persons
          .map(
            (p) => `
          <tr>
            <td style="${td}">${p.name}</td>
            <td style="${td}">${fmtMoney(p.balanceFromTx)}</td>
            <td style="${td}">${fmtMoney(p.debt)}</td>
            <td style="${td}">${fmtMoney(p.manualBalance)}</td>
          </tr>`
          )
          .join("")}
      </tbody>
    </table>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, { scale: 2, backgroundColor: "#ffffff" });
    document.body.removeChild(container);

    const pdf = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;
    const imgData = canvas.toDataURL("image/png");

    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(`${title}.pdf`);
  } finally {
    if (container.parentNode) document.body.removeChild(container);
  }
}

const th = "padding:6px 8px;text-align:center;border:1px solid #E2E8F0;";
const td = "padding:6px 8px;text-align:center;border:1px solid #E2E8F0;";

function summaryTile(label: string, value: string, color: string): string {
  return `
    <div style="flex:1;background:#F8FAFC;border-radius:12px;padding:12px;text-align:center;">
      <div style="font-size:11px;color:#64748B;margin-bottom:4px;">${label}</div>
      <div style="font-size:16px;font-weight:800;color:${color};">${value}</div>
    </div>
  `;
}
