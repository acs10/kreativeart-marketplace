import { useId } from "react";

/** Logo da KreativeArt (recriada do protótipo do Figma Make). */
export function Logo({ className = "", subtitle = "Team" }: { className?: string; subtitle?: string }) {
  // id único por logo: se o mesmo id aparecer numa cópia escondida (menu), o gradiente some nas outras.
  const gradient = useId();
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg width="44" height="44" viewBox="0 0 48 48" fill="none" aria-hidden="true" className="flex-shrink-0">
        <defs>
          <linearGradient id={gradient} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="50%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#EC4899" />
          </linearGradient>
        </defs>
        <circle cx="24" cy="24" r="22" fill={`url(#${gradient})`} />
        <path d="M14 12 L14 36 M14 24 L28 12 M14 24 L30 36" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="32" cy="16" r="2" fill="#FFD700" />
        <circle cx="36" cy="22" r="1.5" fill="#FFD700" />
        <circle cx="34" cy="30" r="1.5" fill="#FFD700" />
        <circle cx="18" cy="14" r="1.5" fill="white" opacity="0.8" />
        <circle cx="22" cy="32" r="1.5" fill="white" opacity="0.8" />
      </svg>
      <div className="flex flex-col leading-tight">
        <span className="brand-text text-2xl font-bold">KreativeArt</span>
        <span className="text-small text-gray-600">{subtitle}</span>
      </div>
    </div>
  );
}
