/**
 * Integer centavos to pesos: "₱1,200" when whole, "₱16.48" otherwise.
 * Money is integer centavos everywhere; this is the only place it is divided.
 */
export function formatPeso(centavos: number): string {
  const whole = centavos % 100 === 0;
  return `₱${(centavos / 100).toLocaleString('en-PH', {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  })}`;
}

const PESO_RE = /^(\d*)(?:\.(\d{0,2}))?$/;

/**
 * Staff-entered pesos to integer centavos, read from the digits so no float
 * multiplication can drift. Accepts "1,200", "₱600.5"; null for negatives,
 * more than 2 decimals, empty input or anything non-numeric.
 */
export function parsePesos(input: string): number | null {
  const cleaned = input.trim().replace(/^₱/, '').replace(/,/g, '').trim();
  const m = PESO_RE.exec(cleaned);
  if (!m) return null;
  const [, whole = '', frac = ''] = m;
  if (whole === '' && frac === '') return null;
  return Number(whole || '0') * 100 + Number(frac.padEnd(2, '0'));
}
