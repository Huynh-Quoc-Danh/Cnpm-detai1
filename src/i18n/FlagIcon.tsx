// Cờ dạng SVG nội tuyến (Windows Chrome không có glyph emoji cờ nên 🇻🇳/🇬🇧 hiện thành chữ "VN"/"GB").
import React from 'react';
import type { LanguageCode } from '../types';

interface FlagIconProps {
  code: LanguageCode;
  /** Chiều rộng (px), cao = 2/3 rộng. Mặc định 18. */
  size?: number;
  className?: string;
  title?: string;
}

/** Ngôi sao 5 cánh tâm (cx, cy), bán kính ngoài r. */
function starPoints(cx: number, cy: number, r: number, rotateDeg = 0): string {
  const inner = r * 0.382;
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rad = ((-90 + rotateDeg + i * 36) * Math.PI) / 180;
    const rr = i % 2 === 0 ? r : inner;
    pts.push(`${(cx + rr * Math.cos(rad)).toFixed(2)},${(cy + rr * Math.sin(rad)).toFixed(2)}`);
  }
  return pts.join(' ');
}

const FLAGS: Record<LanguageCode, React.ReactNode> = {
  // Việt Nam
  vi: (
    <>
      <rect width="30" height="20" fill="#DA251D" />
      <polygon fill="#FFDD00" points={starPoints(15, 10.2, 6)} />
    </>
  ),
  // Vương quốc Anh (Union Jack, giản lược)
  en: (
    <>
      <rect width="30" height="20" fill="#012169" />
      <path d="M0,0 L30,20 M30,0 L0,20" stroke="#fff" strokeWidth="4" />
      <path d="M0,0 L30,20 M30,0 L0,20" stroke="#C8102E" strokeWidth="1.4" />
      <path d="M15,0 V20 M0,10 H30" stroke="#fff" strokeWidth="6" />
      <path d="M15,0 V20 M0,10 H30" stroke="#C8102E" strokeWidth="3.4" />
    </>
  ),
  // Hàn Quốc (Taegukgi, giản lược)
  ko: (
    <>
      <rect width="30" height="20" fill="#fff" />
      <g transform="translate(15 10) rotate(33.7)">
        <path d="M-5,0 A5,5 0 0 1 5,0 A2.5,2.5 0 0 1 0,0 A2.5,2.5 0 0 0 -5,0 Z" fill="#CD2E3A" />
        <path d="M-5,0 A5,5 0 0 0 5,0 A2.5,2.5 0 0 0 0,0 A2.5,2.5 0 0 1 -5,0 Z" fill="#0047A0" />
      </g>
      <g fill="#000">
        <g transform="translate(6.2 4.2) rotate(-56.3)">
          <rect x="-2.2" y="-1.5" width="4.4" height="0.7" />
          <rect x="-2.2" y="-0.35" width="4.4" height="0.7" />
          <rect x="-2.2" y="0.8" width="4.4" height="0.7" />
        </g>
        <g transform="translate(23.8 15.8) rotate(-56.3)">
          <rect x="-2.2" y="-1.5" width="1.9" height="0.7" />
          <rect x="0.3" y="-1.5" width="1.9" height="0.7" />
          <rect x="-2.2" y="-0.35" width="1.9" height="0.7" />
          <rect x="0.3" y="-0.35" width="1.9" height="0.7" />
          <rect x="-2.2" y="0.8" width="1.9" height="0.7" />
          <rect x="0.3" y="0.8" width="1.9" height="0.7" />
        </g>
        <g transform="translate(23.8 4.2) rotate(56.3)">
          <rect x="-2.2" y="-1.5" width="4.4" height="0.7" />
          <rect x="-2.2" y="-0.35" width="1.9" height="0.7" />
          <rect x="0.3" y="-0.35" width="1.9" height="0.7" />
          <rect x="-2.2" y="0.8" width="4.4" height="0.7" />
        </g>
        <g transform="translate(6.2 15.8) rotate(56.3)">
          <rect x="-2.2" y="-1.5" width="1.9" height="0.7" />
          <rect x="0.3" y="-1.5" width="1.9" height="0.7" />
          <rect x="-2.2" y="-0.35" width="4.4" height="0.7" />
          <rect x="-2.2" y="0.8" width="1.9" height="0.7" />
          <rect x="0.3" y="0.8" width="1.9" height="0.7" />
        </g>
      </g>
    </>
  ),
  // Nhật Bản
  ja: (
    <>
      <rect width="30" height="20" fill="#fff" />
      <circle cx="15" cy="10" r="6" fill="#BC002D" />
    </>
  ),
  // Trung Quốc
  zh: (
    <>
      <rect width="30" height="20" fill="#EE1C25" />
      <polygon fill="#FFFF00" points={starPoints(5, 5, 3)} />
      <polygon fill="#FFFF00" points={starPoints(10, 2, 1, 23)} />
      <polygon fill="#FFFF00" points={starPoints(12, 4, 1, 46)} />
      <polygon fill="#FFFF00" points={starPoints(12, 7, 1, 70)} />
      <polygon fill="#FFFF00" points={starPoints(10, 9, 1, 21)} />
    </>
  )
};

export const FlagIcon: React.FC<FlagIconProps> = ({ code, size = 18, className = '', title }) => (
  <svg
    viewBox="0 0 30 20"
    width={size}
    height={Math.round((size * 2) / 3)}
    className={`rounded-[2px] shadow-sm shrink-0 ring-1 ring-black/5 ${className}`}
    role={title ? 'img' : undefined}
    aria-hidden={title ? undefined : true}
    aria-label={title}
  >
    {FLAGS[code] || FLAGS.en}
  </svg>
);

export default FlagIcon;
