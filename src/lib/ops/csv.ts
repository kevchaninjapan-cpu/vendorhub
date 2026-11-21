// CSV for Excel. Adds a byte-order mark so macrons display correctly, quotes
// cells that need it, and neutralises text starting with = + - @ so a value
// typed by a user can't run as a formula when the file is opened.

type Cell = string | number | boolean | null | undefined | string[];

function cell(v: Cell): string {
  if (v == null) return "";
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  let s = Array.isArray(v) ? v.join("; ") : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  if (/[",\r\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
  return s;
}

export function toCsv(headers: string[], rows: Cell[][]): string {
  const lines = [headers.map(cell).join(","), ...rows.map((r) => r.map(cell).join(","))];
  return "\uFEFF" + lines.join("\r\n") + "\r\n";
}