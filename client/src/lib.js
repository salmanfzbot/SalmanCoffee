/* Shared helpers: language strings, theme presets, data access. */
export const UI = {
  en: { table: 'The table', menu: 'Menu', visit: 'Visit', visitTitle: 'Visit us', address: 'Address', hours: 'Hours', phone: 'Phone', scroll: 'Scroll', sar: 'SAR', switchTo: 'العربية', admin: 'Admin', footer: 'Demo content: placeholder name, address, phone and illustrations. Photos: free licences, credits in images/CREDITS.txt.', top: 'Top' },
  ar: { table: 'المائدة', menu: 'القائمة', visit: 'زوروا', visitTitle: 'زوروا المحل', address: 'العنوان', hours: 'ساعات العمل', phone: 'الهاتف', scroll: 'مرّر', sar: 'ريال', switchTo: 'English', admin: 'الإدارة', footer: 'محتوى تجريبي: اسم وعنوان وهاتف ورسوم توضيحية للعرض. الصور بتراخيص حرة، والأرصدة في images/CREDITS.txt', top: 'أعلى' }
};

export const THEME_KEYS = ['bg', 'ink', 'gold', 'gold2', 'muted', 'card', 'line'];
export const THEME_LABELS = { bg: 'Background', ink: 'Text', gold: 'Accent gold', gold2: 'Light gold', muted: 'Muted text', card: 'Card', line: 'Lines' };
// Dark first: it is the default the owner asked for. The saved default is whatever data.json holds.
export const THEME_PRESETS = [
  { name: 'Espresso dark (default)', theme: { bg: '#0b0907', ink: '#f4ead8', gold: '#d9b15f', gold2: '#f6dc98', muted: '#9d8f7a', card: '#16110c', line: '#2d231a' } },
  { name: 'White and chocolate', theme: { bg: '#faf6f0', ink: '#3b2417', gold: '#6b3d22', gold2: '#9a6436', muted: '#8a7566', card: '#ffffff', line: '#e6dacb' } },
  { name: 'Caramel', theme: { bg: '#fff7ec', ink: '#4a2e1a', gold: '#b8732e', gold2: '#d4944a', muted: '#9a7c63', card: '#ffffff', line: '#f0dfc8' } },
  { name: 'Mint', theme: { bg: '#f3faf6', ink: '#1f3b33', gold: '#2f7d62', gold2: '#4aa187', muted: '#6f8c82', card: '#ffffff', line: '#d5e8df' } }
];

export function tx(obj, base, lang) {
  if (!obj) return '';
  return obj[base + '_' + lang] || obj[base + '_en'] || '';
}
export const pad2 = n => String(n).padStart(2, '0');

export function applyTheme(theme) {
  const root = document.documentElement;
  for (const k of THEME_KEYS) if (theme && theme[k]) root.style.setProperty('--' + k, theme[k]);
}

export async function loadContent() {
  const r = await fetch('/api/data', { cache: 'no-store' });
  if (!r.ok) throw new Error('menu ' + r.status);
  return r.json();
}
export function clamp(v, a = 0, b = 1) { return Math.min(b, Math.max(a, v)); }
