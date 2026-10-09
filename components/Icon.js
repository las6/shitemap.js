// Vendored Lucide icons; see public/licenses/lucide.txt.
const shapes = {
  'layers': <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5M3 16l9 5 9-5" /></>,
  'grain': <><path d="m5 5 1 2m7-3 1 2m5 4-1 2M5 15l-1 2m8-4 1 2m4 5 1-2" /><circle cx="8" cy="11" r=".7" /><circle cx="10" cy="20" r=".7" /><circle cx="20" cy="5" r=".7" /></>,
  'flask': <><path d="M9 3h6m-5 0v6L4 19a1.3 1.3 0 0 0 1.2 2h13.6a1.3 1.3 0 0 0 1.2-2L14 9V3M7 15h10" /></>,
  'sun': <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></>,
  'search': <><path d="m21 21-4.34-4.34" />
  <circle cx="11" cy="11" r="8" /></>,
  'sliders-horizontal': <><path d="M10 5H3" />
  <path d="M12 19H3" />
  <path d="M14 3v4" />
  <path d="M16 17v4" />
  <path d="M21 12h-9" />
  <path d="M21 19h-5" />
  <path d="M21 5h-7" />
  <path d="M8 10v4" />
  <path d="M8 12H3" /></>,
  'scan': <><path d="M3 7V5a2 2 0 0 1 2-2h2" />
  <path d="M17 3h2a2 2 0 0 1 2 2v2" />
  <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
  <path d="M7 21H5a2 2 0 0 1-2-2v-2" /></>,
  'monitor': <><rect width="20" height="14" x="2" y="3" rx="2" />
  <line x1="8" x2="16" y1="21" y2="21" />
  <line x1="12" x2="12" y1="17" y2="21" /></>,
  'plus': <><path d="M5 12h14" />
  <path d="M12 5v14" /></>,
  'minus': <><path d="M5 12h14" /></>,
  'x': <><path d="M18 6 6 18" />
  <path d="m6 6 12 12" /></>,
  'arrow-right': <><path d="M5 12h14" />
  <path d="m12 5 7 7-7 7" /></>,
  'network': <><rect x="16" y="16" width="6" height="6" rx="1" />
  <rect x="2" y="16" width="6" height="6" rx="1" />
  <rect x="9" y="2" width="6" height="6" rx="1" />
  <path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3" />
  <path d="M12 12V8" /></>,
  'arrow-up-right': <><path d="M7 7h10v10" />
  <path d="M7 17 17 7" /></>,
  'chevron-down': <><path d="m6 9 6 6 6-6" /></>,
};
export default function Icon({ name, size = 18, ...props }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{shapes[name]}</svg>;
}
