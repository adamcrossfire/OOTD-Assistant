// 自绘 SVG logo —— 简洁的衣架 + 星辰，呼应 "OOTD"
export function Logo({ size = 28, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-label="OOTD帮你搭"
    >
      {/* 衣架钩 */}
      <path d="M16 6 Q16 3 19 3 Q22 3 22 6" />
      <line x1="16" y1="6" x2="16" y2="10" />
      {/* 衣架横梁 */}
      <path d="M16 10 L5 22 L27 22 L16 10" />
      {/* 小星点缀 */}
      <circle cx="25" cy="8" r="1" fill="currentColor" />
      <circle cx="7" cy="11" r="0.8" fill="currentColor" />
    </svg>
  );
}
