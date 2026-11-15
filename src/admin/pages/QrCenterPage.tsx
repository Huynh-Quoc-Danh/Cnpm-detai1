import React, { useState } from 'react';
import type { LanguageCode } from '../../types';
import { adminApi } from '../../services/api';
import { appQrUrl, copyText, downloadDataUrl, siteQrUrl, useBaseUrl } from '../../services/qr';
import { QrCode } from '../../components/qr/QrCode';
import { QrPrintSheet } from '../../components/qr/QrPrintSheet';
import { FlagIcon } from '../../i18n/FlagIcon';
import { useAdmin } from '../AdminContext';
import { useResource } from '../hooks';
import { useToast } from '../components/Toasts';
import { Badge, Button, Card, EmptyState, PageHeader, Segmented, Skeleton } from '../components/ui';
import { cx } from '../utils';

const KIND_LABEL = { config: 'URL công khai (Cài đặt)', lan: 'Mạng LAN', origin: 'Địa chỉ hiện tại' } as const;

const QrCenterPage: React.FC = () => {
  const { settings, navigate } = useAdmin();
  const toast = useToast();
  const base = useBaseUrl(true);
  const sites = useResource(() => adminApi.listSites(), []);
  const [lang, setLang] = useState<LanguageCode>('vi');
  const [appQrData, setAppQrData] = useState<string | null>(null);
  const appUrl = appQrUrl(base.baseUrl);
  const active = (sites.data || []).filter((s) => s.isActive !== false);

  const copy = async (t: string) => ((await copyText(t)) ? toast.success('Đã sao chép liên kết', t) : toast.error('Không sao chép được'));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trung tâm mã QR"
        desc="In mã QR đặt tại từng điểm tham quan (khách quét → nghe thử → thanh toán để nghe trọn bài) và mã QR mở ứng dụng trên điện thoại."
        actions={
          <>
            <Segmented
              value={lang}
              onChange={setLang}
              options={[
                { value: 'vi', label: <span className="inline-flex items-center gap-1.5"><FlagIcon code="vi" size={16} />Bản Tiếng Việt</span> },
                { value: 'en', label: <span className="inline-flex items-center gap-1.5"><FlagIcon code="en" size={16} />English</span> }
              ]}
            />
            <Button variant="primary" icon="fa-print" onClick={() => window.print()} disabled={!active.length}>
              In tất cả
            </Button>
          </>
        }
      />

      {/* Địa chỉ gốc */}
      <Card title="Địa chỉ gốc của mã QR" subtitle="Mọi mã QR trỏ tới địa chỉ này – điện thoại của khách phải truy cập được." icon="fa-link">
        {base.loading ? (
          <Skeleton className="h-16" />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center gap-3">
              <div className="flex-1 min-w-0 flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3">
                <i className={cx('fa-solid', base.kind === 'config' ? 'fa-globe text-emerald-600' : base.kind === 'lan' ? 'fa-wifi text-sky-600' : 'fa-display text-slate-500')}></i>
                <span className="font-mono text-sm font-bold text-slate-900 truncate">{base.baseUrl}</span>
                <Badge tone={base.kind === 'config' ? 'green' : base.kind === 'lan' ? 'sky' : 'slate'} className="ml-auto">
                  {KIND_LABEL[base.kind]}
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button icon="fa-copy" onClick={() => copy(base.baseUrl)}>
                  Sao chép
                </Button>
                <Button icon="fa-gear" onClick={() => navigate('settings')}>
                  Đặt URL ngrok
                </Button>
              </div>
            </div>
            {base.options.length > 1 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">Chọn địa chỉ khác:</span>
                {base.options.map((o) => (
                  <button
                    key={o.url}
                    onClick={() => base.setBaseUrl(o.url)}
                    className={cx(
                      'text-[11px] font-mono font-semibold px-2.5 py-1 rounded-full border transition',
                      o.url === base.baseUrl ? 'border-sky-400 bg-sky-50 text-sky-800' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    )}
                  >
                    {o.url}
                  </button>
                ))}
              </div>
            )}
            {base.isLocal ? (
              <Notice tone="red" icon="fa-triangle-exclamation">
                Địa chỉ <b>localhost</b> chỉ mở được trên máy này – điện thoại sẽ không truy cập được. Hãy chạy <code className="font-mono">ngrok http 3001</code> (hoặc
                cổng đang dùng) rồi dán URL vào <b>Cài đặt → URL công khai</b>, hoặc dùng địa chỉ LAN khi điện thoại chung Wi-Fi.
              </Notice>
            ) : base.kind === 'lan' ? (
              <Notice tone="amber" icon="fa-wifi">
                Đang dùng địa chỉ mạng nội bộ: điện thoại phải kết nối <b>cùng Wi-Fi</b> với máy chủ. Để khách quét ở mọi nơi, đặt URL ngrok trong Cài đặt.
              </Notice>
            ) : base.kind === 'config' ? (
              <Notice tone="green" icon="fa-circle-check">
                Đang dùng URL công khai {settings?.publicBaseUrl ? <b className="font-mono">{settings.publicBaseUrl}</b> : null} – khách có thể quét từ bất kỳ mạng nào.
              </Notice>
            ) : null}
          </div>
        )}
      </Card>

      {/* QR mở ứng dụng */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] gap-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-sky-900 to-teal-800 text-white p-6 sm:p-8 shadow-lg">
          <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-white/5"></div>
          <div className="absolute -left-10 -bottom-20 w-56 h-56 rounded-full bg-teal-400/10"></div>
          <div className="relative flex flex-col sm:flex-row items-center gap-6">
            <div className="bg-white p-3 rounded-3xl shadow-2xl shrink-0">
              <QrCode value={appUrl} size={200} logoIcon="fa-water" onReady={setAppQrData} alt="QR mở ứng dụng" />
            </div>
            <div className="min-w-0 text-center sm:text-left">
              <Badge tone="teal" icon="fa-mobile-screen-button" className="!bg-white/10 !text-teal-100 !ring-white/20">
                QR mở ứng dụng
              </Badge>
              <h3 className="text-xl sm:text-2xl font-black mt-3 leading-tight">Quét để mở Hạ Long SmartGuide trên điện thoại</h3>
              <p className="text-sm text-sky-100/80 mt-2">Đặt tại quầy vé, bến tàu, tờ rơi. Không cần cài đặt – mở ngay trên trình duyệt, có thể “Thêm vào màn hình chính”.</p>
              <p className="font-mono text-[11px] text-sky-100/70 mt-3 break-all">{appUrl}</p>
              <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-4">
                <button
                  onClick={() => appQrData && downloadDataUrl(appQrData, 'qr-mo-ung-dung-halong.png')}
                  className="text-xs font-bold px-3.5 py-2 rounded-full bg-white text-slate-900 hover:bg-sky-50 transition"
                >
                  <i className="fa-solid fa-download mr-1.5"></i>Tải PNG
                </button>
                <button onClick={() => copy(appUrl)} className="text-xs font-bold px-3.5 py-2 rounded-full bg-white/10 hover:bg-white/20 transition">
                  <i className="fa-solid fa-copy mr-1.5"></i>Sao chép
                </button>
                <a href={appUrl} target="_blank" rel="noreferrer" className="text-xs font-bold px-3.5 py-2 rounded-full bg-white/10 hover:bg-white/20 transition">
                  <i className="fa-solid fa-arrow-up-right-from-square mr-1.5"></i>Mở thử
                </a>
              </div>
            </div>
          </div>
        </div>

        <Card title="Luồng trải nghiệm của khách" subtitle="Mô hình thuyết minh trả phí chuyên nghiệp" icon="fa-route">
          <ol className="relative space-y-5 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-px before:bg-slate-200">
            {[
              { icon: 'fa-qrcode', t: 'Quét QR tại điểm', d: 'Ứng dụng mở đúng địa điểm, ghi nhận khách đang có mặt (hiện trong Giám sát trực tiếp).' },
              { icon: 'fa-headphones', t: `Nghe thử ${settings?.previewSeconds ?? 30} giây miễn phí`, d: 'Thanh tua hiển thị đủ thời lượng 3–4 phút, phần chưa mở khoá được đánh dấu.' },
              { icon: 'fa-credit-card', t: 'Thanh toán VietQR / MoMo / thẻ', d: 'Chọn gói vé lẻ, vé ngày hoặc vé gia đình; vé được cấp ngay sau khi thanh toán.' },
              { icon: 'fa-unlock', t: 'Nghe trọn bài & các điểm nhấn', d: 'Tự động phát tiếp từ vị trí đang nghe, mở khoá theo phạm vi gói vé.' }
            ].map((s, i) => (
              <li key={s.t} className="relative flex gap-4">
                <span className="relative z-10 w-10 h-10 shrink-0 rounded-2xl bg-white border border-slate-200 text-sky-600 flex items-center justify-center shadow-sm">
                  <i className={cx('fa-solid', s.icon)}></i>
                </span>
                <div className="pt-0.5">
                  <p className="text-sm font-bold text-slate-900">
                    <span className="text-slate-400 mr-1">{i + 1}.</span>
                    {s.t}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      {/* QR từng điểm */}
      <Card
        title="Mã QR tại từng địa điểm"
        subtitle={`${active.length} địa điểm đang hiển thị · in khổ A4, 3 thẻ mỗi hàng`}
        icon="fa-map-pin"
        actions={
          <Button size="sm" icon="fa-print" onClick={() => window.print()} disabled={!active.length}>
            In tất cả
          </Button>
        }
      >
        {sites.loading || base.loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[420px] rounded-3xl" />
            ))}
          </div>
        ) : active.length === 0 ? (
          <EmptyState icon="fa-map-location-dot" title="Chưa có địa điểm đang hiển thị" />
        ) : (
          <>
            <QrPrintSheet sites={active} baseUrl={base.baseUrl} lang={lang} previewSec={settings?.previewSeconds ?? 30} />
            <div className="mt-6 overflow-x-auto -mx-5 sm:-mx-6 border-t border-slate-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 bg-slate-50/80">
                    <th className="text-left px-5 sm:px-6 py-2.5">Địa điểm</th>
                    <th className="text-left px-3 py-2.5">Liên kết trong mã QR</th>
                    <th className="px-5 sm:px-6 py-2.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {active.map((s) => {
                    const u = siteQrUrl(base.baseUrl, s.id);
                    return (
                      <tr key={s.id}>
                        <td className="px-5 sm:px-6 py-2.5 font-semibold text-slate-800 whitespace-nowrap">{s.nameVi}</td>
                        <td className="px-3 py-2.5 font-mono text-[11px] text-slate-500 break-all">{u}</td>
                        <td className="px-5 sm:px-6 py-2.5 text-right whitespace-nowrap">
                          <button onClick={() => copy(u)} className="w-8 h-8 rounded-lg text-slate-400 hover:text-sky-700 hover:bg-sky-50" title="Sao chép">
                            <i className="fa-regular fa-copy text-xs"></i>
                          </button>
                          <a href={u} target="_blank" rel="noreferrer" className="inline-flex w-8 h-8 items-center justify-center rounded-lg text-slate-400 hover:text-sky-700 hover:bg-sky-50" title="Mở thử">
                            <i className="fa-solid fa-arrow-up-right-from-square text-xs"></i>
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

const Notice: React.FC<{ tone: 'red' | 'amber' | 'green'; icon: string; children: React.ReactNode }> = ({ tone, icon, children }) => (
  <div
    className={cx(
      'flex gap-3 text-xs leading-relaxed rounded-2xl px-4 py-3 border',
      tone === 'red' && 'bg-rose-50 border-rose-200 text-rose-800',
      tone === 'amber' && 'bg-amber-50 border-amber-200 text-amber-800',
      tone === 'green' && 'bg-emerald-50 border-emerald-200 text-emerald-800'
    )}
  >
    <i className={cx('fa-solid mt-0.5', icon)}></i>
    <div>{children}</div>
  </div>
);

export default QrCenterPage;
