/** Strip Hebrew nikkud / cantillation for reliable substring matching. */
export function stripHebrewNikkud(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0590-\u05bd]/g, '')
    .replace(/[\u05bf-\u05c7]/g, '')
    .normalize('NFC');
}
