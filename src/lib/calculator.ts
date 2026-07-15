/**
 * Safely evaluates a simple arithmetic expression like "100+50-20*2".
 * Only digits, `.`, and the operators + - * / ( ) are allowed — no other
 * characters ever reach `Function`, so arbitrary code cannot be injected.
 */
export function evalExpression(expr: string): number {
  const cleaned = expr.trim();
  if (!cleaned) return 0;

  if (!/^[0-9.+\-*/()\s]+$/.test(cleaned)) {
    throw new Error("تعبير غير صالح");
  }

  let result: unknown;
  try {
    // eslint-disable-next-line no-new-func
    result = Function(`"use strict"; return (${cleaned});`)();
  } catch {
    throw new Error("تعبير غير صالح");
  }

  if (typeof result !== "number" || !Number.isFinite(result)) {
    throw new Error("تعبير غير صالح");
  }

  return result;
}
