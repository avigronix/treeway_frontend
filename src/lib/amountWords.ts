// "₹1,250.50" -> "Rupees One Thousand Two Hundred Fifty and Fifty Paise Only" (Indian system: lakh, crore), for
// the invoice. Only words for an amount the server sent; nothing is calculated to decide anything.

const ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function below100(n: number): string {
  return n < 20 ? ONES[n]! : `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ''}`;
}

function below1000(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  return [h ? `${ONES[h]} Hundred` : '', r ? below100(r) : ''].filter(Boolean).join(' ');
}

function wholeWords(n: number): string {
  if (n === 0) return 'Zero';
  const parts: string[] = [];
  const crore = Math.floor(n / 1_00_00_000);
  const lakh = Math.floor((n % 1_00_00_000) / 1_00_000);
  const thousand = Math.floor((n % 1_00_000) / 1000);
  const rest = n % 1000;
  if (crore) parts.push(`${wholeWords(crore)} Crore`);
  if (lakh) parts.push(`${below100(lakh)} Lakh`);
  if (thousand) parts.push(`${below100(thousand)} Thousand`);
  if (rest) parts.push(below1000(rest));
  return parts.join(' ');
}

export function amountInWords(rupees: number): string {
  const paise = Math.round(Math.abs(rupees) * 100);
  const r = Math.floor(paise / 100);
  const p = paise % 100;
  return `Rupees ${wholeWords(r)}${p ? ` and ${below100(p)} Paise` : ''} Only`;
}
