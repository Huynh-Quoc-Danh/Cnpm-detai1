// Mã QR render bằng thư viện 'qrcode' (data URL PNG, mức sửa lỗi H để có thể đặt logo ở giữa).
import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export interface QrOptions {
  /** Pixel width of the generated image (defaults to 2x display size for sharp output). */
  width?: number;
  dark?: string;
  light?: string;
  margin?: number;
}

export function generateQrDataUrl(value: string, opts: QrOptions = {}): Promise<string> {
  return QRCode.toDataURL(value, {
    errorCorrectionLevel: 'H',
    margin: opts.margin ?? 1,
    width: opts.width ?? 512,
    color: { dark: opts.dark ?? '#0f172a', light: opts.light ?? '#ffffff' }
  });
}

/** Hook: data URL cho giá trị QR (null khi đang tạo / lỗi). */
export function useQrDataUrl(value: string | null | undefined, opts: QrOptions = {}): string | null {
  const [url, setUrl] = useState<string | null>(null);
  const { width, dark, light, margin } = opts;
  useEffect(() => {
    let alive = true;
    if (!value) {
      setUrl(null);
      return;
    }
    generateQrDataUrl(value, { width, dark, light, margin })
      .then((u) => alive && setUrl(u))
      .catch(() => alive && setUrl(null));
    return () => {
      alive = false;
    };
  }, [value, width, dark, light, margin]);
  return url;
}

export interface QrCodeProps {
  value: string;
  /** Display size in px. */
  size?: number;
  /** Show the brand badge in the middle. */
  logo?: boolean;
  /** Custom FontAwesome icon class for the badge (default fa-headphones). */
  logoIcon?: string;
  dark?: string;
  className?: string;
  alt?: string;
  /** Receives the generated data URL (e.g. for download buttons). */
  onReady?: (dataUrl: string) => void;
}

export const QrCode: React.FC<QrCodeProps> = ({
  value,
  size = 200,
  logo = true,
  logoIcon = 'fa-headphones',
  dark,
  className = '',
  alt = 'QR code',
  onReady
}) => {
  const dataUrl = useQrDataUrl(value, { width: Math.max(256, Math.round(size * 2.5)), dark });

  useEffect(() => {
    if (dataUrl && onReady) onReady(dataUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataUrl]);

  const badge = Math.round(size * 0.22);
  return (
    <div
      className={`relative inline-flex items-center justify-center bg-white ${className}`}
      style={{ width: size, height: size }}
    >
      {dataUrl ? (
        <img src={dataUrl} alt={alt} width={size} height={size} className="block w-full h-full" draggable={false} />
      ) : (
        <div className="w-full h-full rounded-xl bg-slate-100 animate-pulse flex items-center justify-center text-slate-300">
          <i className="fa-solid fa-qrcode text-3xl"></i>
        </div>
      )}
      {logo && dataUrl && (
        <div
          className="absolute rounded-xl bg-white flex items-center justify-center shadow-sm"
          style={{ width: badge, height: badge, padding: Math.max(2, Math.round(badge * 0.1)) }}
        >
          <div className="w-full h-full rounded-lg bg-gradient-to-br from-sky-600 to-teal-500 flex items-center justify-center text-white">
            <i className={`fa-solid ${logoIcon}`} style={{ fontSize: Math.round(badge * 0.42) }}></i>
          </div>
        </div>
      )}
    </div>
  );
};

export default QrCode;
