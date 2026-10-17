const svg = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, 'aria-hidden': true } as const;

export const Bell = () => <svg {...svg} width={14} height={14}><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>;
export const Feed = () => <svg {...svg}><rect x="3" y="4" width="5" height="7" rx="1" /><rect x="10" y="4" width="5" height="7" rx="1" /><rect x="17" y="4" width="4" height="7" rx="1" /><path d="M3 16h18M3 20h12" /></svg>;
export const Month = () => <svg {...svg}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" /></svg>;
export const List = () => <svg {...svg}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>;
export const Prev = () => <svg {...svg}><path d="m15 18-6-6 6-6" /></svg>;
export const Next = () => <svg {...svg}><path d="m9 18 6-6-6-6" /></svg>;
export const Close = () => <svg {...svg}><path d="M18 6 6 18M6 6l12 12" /></svg>;
export const Search = () => <svg {...svg}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>;
export const Play = () => <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M7 4v16l13-8z" /></svg>;
export const Star = () => <svg width={11} height={11} viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z" /></svg>;
