/** Знак Premiero: билет в кино с буквой P. Цвета берутся из темы (--logo-bg, --logo-fg). */
export default function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg className="logo" width={size} height={size} viewBox="0 0 96 96" aria-hidden>
      <rect width="96" height="96" rx="22" fill="var(--logo-bg)" />
      <path d="M14 28a6 6 0 0 1 6-6h56a6 6 0 0 1 6 6v12a8 8 0 0 0 0 16v12a6 6 0 0 1-6 6H20a6 6 0 0 1-6-6V56a8 8 0 0 0 0-16z" fill="var(--logo-fg)" />
      <path d="M32 34h12a9 9 0 0 1 0 18h-5v10h-7z M39 40v6h4a3 3 0 0 0 0-6z" fill="var(--logo-bg)" fillRule="evenodd" />
    </svg>
  );
}
