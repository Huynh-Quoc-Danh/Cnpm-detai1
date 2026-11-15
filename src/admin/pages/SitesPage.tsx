import React, { useEffect, useState } from 'react';
import type { HeritageSite } from '../../types';
import { adminApi } from '../../services/api';
import { getPublicBaseUrl, siteQrUrl } from '../../services/qr';
import { SiteQrCard } from '../../components/qr/QrPrintSheet';
import { useAdmin } from '../AdminContext';
import { useResource } from '../hooks';
import { DataTable, type Column } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { useConfirm } from '../components/ConfirmDialog';
import { useToast } from '../components/Toasts';
import { Badge, Button, Card, IconButton, PageHeader, Segmented, Toggle } from '../components/ui';
import { CATEGORY_OPTIONS, copyText, fmtClock, fmtNum, inHalong, onImgError } from '../utils';
import { SiteEditor } from './sites/SiteEditor';
import { FlagIcon } from '../../i18n/FlagIcon';

const CAT_TONE: Record<string, any> = { Iconic: 'sky', 'Unique Rock': 'violet', Island: 'teal', Natural: 'green' };

const SitesPage: React.FC = () => {
  const { handleError, settings } = useAdmin();
  const toast = useToast();
  const confirm = useConfirm();
  const sites = useResource(() => adminApi.listSites(), []);
  const [editor, setEditor] = useState<{ open: boolean; site: HeritageSite | null }>({ open: false, site: null });
  const [qrSite, setQrSite] = useState<HeritageSite | null>(null);
  const [baseUrl, setBaseUrl] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [cat, setCat] = useState<string>('all');

  useEffect(() => {
    getPublicBaseUrl().then(setBaseUrl);
  }, [settings?.publicBaseUrl]);

  const list = (sites.data || []).filter((s) => cat === 'all' || s.categoryKey === cat);
  const all = sites.data || [];
  const activeCount = all.filter((s) => s.isActive !== false).length;
  const exhibitCount = all.reduce((n, s) => n + (s.exhibits?.length || 0), 0);
  const okNarr = all.filter((s) => s.durationSec?.vi >= 180 && s.durationSec?.vi <= 270).length;

  const toggleActive = async (s: HeritageSite, v: boolean) => {
    setBusyId(s.id);
    try {
      const u = await adminApi.updateSite(s.id, { isActive: v });
      sites.setData((l) => (l || []).map((x) => (x.id === s.id ? u : x)));
      toast.success(v ? 'Đã hiển thị địa điểm' : 'Đã ẩn địa điểm', s.nameVi);
    } catch (e) {
      handleError(e, 'Không cập nhật được');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (s: HeritageSite) => {
    const ok = await confirm({
      title: 'Xoá địa điểm?',
      message: (
        <>
          Địa điểm <b>{s.nameVi}</b> cùng <b>{s.exhibits?.length || 0} điểm nhấn</b> sẽ bị xoá vĩnh viễn. Mã QR đã in cho điểm này sẽ không còn hoạt động. Nếu chỉ muốn tạm
          ngưng, hãy dùng nút <b>Ẩn</b>.
        </>
      ),
      confirmText: 'Xoá vĩnh viễn'
    });
    if (!ok) return;
    try {
      await adminApi.deleteSite(s.id);
      sites.setData((l) => (l || []).filter((x) => x.id !== s.id));
      toast.success('Đã xoá địa điểm', s.nameVi);
    } catch (e) {
      handleError(e, 'Không xoá được địa điểm');
    }
  };

  const columns: Column<HeritageSite>[] = [
    {
      key: 'name',
      header: 'Địa điểm',
      sortValue: (s) => s.nameVi,
      render: (s) => (
        <div className="flex items-center gap-3 min-w-[220px]">
          <img src={s.image} alt="" onError={onImgError(s.fallbackImage)} className="w-14 h-11 rounded-xl object-cover bg-slate-100 shrink-0 ring-1 ring-slate-200" />
          <div className="min-w-0">
            <p className="font-bold text-slate-900 truncate">{s.nameVi}</p>
            <p className="text-xs text-slate-500 truncate">
              <span className="text-slate-400">#{s.id}</span> · {s.name}
            </p>
          </div>
        </div>
      )
    },
    {
      key: 'cat',
      header: 'Danh mục',
      sortValue: (s) => s.categoryVi,
      hideOnMobile: true,
      render: (s) => <Badge tone={CAT_TONE[s.categoryKey] || 'slate'}>{s.categoryVi}</Badge>
    },
    {
      key: 'coords',
      header: 'Toạ độ GPS',
      hideOnMobile: true,
      sortValue: (s) => s.lat,
      render: (s) => (
        <a
          href={`https://www.google.com/maps?q=${s.lat},${s.lng}`}
          target="_blank"
          rel="noreferrer"
          className="group inline-flex items-center gap-1.5 font-mono text-[11px] text-slate-600 hover:text-sky-700"
          title="Mở trên Google Maps"
        >
          {inHalong(s.lat, s.lng) ? <i className="fa-solid fa-circle-check text-emerald-500 text-[10px]"></i> : <i className="fa-solid fa-triangle-exclamation text-rose-500 text-[10px]"></i>}
          <span className="flex flex-col leading-tight">
            <span className="whitespace-nowrap">
              {s.lat.toFixed(5)}, {s.lng.toFixed(5)}
              <i className="fa-solid fa-arrow-up-right-from-square text-[9px] ml-1 opacity-0 group-hover:opacity-100"></i>
            </span>
            <span className="font-sans text-[10px] text-slate-400">Bán kính {fmtNum(s.rangeMeters)} m</span>
          </span>
        </a>
      )
    },
    {
      key: 'narr',
      header: 'Thuyết minh',
      sortValue: (s) => s.durationSec?.vi,
      render: (s) => {
        const ok = s.durationSec?.vi >= 180 && s.durationSec?.vi <= 270;
        return (
          <div className="flex flex-col gap-1 whitespace-nowrap">
            <span className={'text-xs font-bold tabular-nums ' + (ok ? 'text-slate-800' : 'text-amber-600')}>
              <span className="inline-flex items-center gap-1 align-middle"><FlagIcon code="vi" size={14} />{fmtClock(s.durationSec?.vi)}</span>
              <span className="text-slate-300 mx-1">|</span>
              <span className="inline-flex items-center gap-1 align-middle"><FlagIcon code="en" size={14} />{fmtClock(s.durationSec?.en)}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 tabular-nums">
              {(['ko', 'ja', 'zh'] as const).map((l) => (
                <span key={l} className={'inline-flex items-center gap-0.5 ' + ((s.narration?.[l] || '').trim() || (s.durationSec?.[l] || 0) > 0 ? '' : 'opacity-40')} title={l.toUpperCase()}>
                  <FlagIcon code={l} size={12} />
                  {(s.durationSec?.[l] || 0) > 0 ? fmtClock(s.durationSec?.[l] || 0) : '—'}
                </span>
              ))}
            </span>
            <span className="text-[10px] text-slate-400">
              {s.audioUrl?.vi || s.audioUrl?.en ? (
                <>
                  <i className="fa-solid fa-file-audio mr-1 text-teal-500"></i>Có tệp MP3
                </>
              ) : (
                <>
                  <i className="fa-solid fa-robot mr-1"></i>Giọng đọc tự động
                </>
              )}
            </span>
          </div>
        );
      }
    },
    {
      key: 'exhibits',
      header: 'Điểm nhấn',
      align: 'center',
      sortValue: (s) => s.exhibits?.length || 0,
      hideOnMobile: true,
      render: (s) => <span className="inline-flex min-w-7 justify-center text-xs font-extrabold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">{s.exhibits?.length || 0}</span>
    },
    {
      key: 'active',
      header: 'Hiển thị',
      align: 'center',
      sortValue: (s) => (s.isActive !== false ? 1 : 0),
      render: (s) => (
        <div className="inline-flex" onClick={(e) => e.stopPropagation()}>
          <Toggle size="sm" checked={s.isActive !== false} disabled={busyId === s.id} onChange={(v) => toggleActive(s, v)} />
        </div>
      )
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (s) => (
        <div className="inline-flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
          <IconButton icon="fa-qrcode" label="Mã QR" onClick={() => setQrSite(s)} />
          <IconButton icon="fa-pen-to-square" label="Sửa" onClick={() => setEditor({ open: true, site: s })} />
          <IconButton icon="fa-trash-can" label="Xoá" tone="danger" onClick={() => remove(s)} />
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Địa điểm tham quan"
        desc="Quản lý điểm thuyết minh, toạ độ GPS, vùng nhận diện, lời thuyết minh 3–4 phút và các điểm nhấn."
        actions={
          <Button variant="primary" icon="fa-plus" onClick={() => setEditor({ open: true, site: null })}>
            Thêm địa điểm
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: 'Tổng địa điểm', value: all.length, icon: 'fa-map-location-dot', c: 'bg-sky-50 text-sky-600' },
          { label: 'Đang hiển thị', value: activeCount, icon: 'fa-eye', c: 'bg-emerald-50 text-emerald-600' },
          { label: 'Điểm nhấn', value: exhibitCount, icon: 'fa-star', c: 'bg-amber-50 text-amber-600' },
          { label: 'Thuyết minh đạt 3–4,5 phút', value: `${okNarr}/${all.length}`, icon: 'fa-headphones', c: 'bg-violet-50 text-violet-600' }
        ].map((k) => (
          <div key={k.label} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
            <div className={'w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ' + k.c}>
              <i className={'fa-solid ' + k.icon}></i>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-slate-500 truncate">{k.label}</p>
              <p className="text-xl font-black text-slate-900 tabular-nums">{sites.loading ? '…' : typeof k.value === 'number' ? fmtNum(k.value) : k.value}</p>
            </div>
          </div>
        ))}
      </div>

      <Card noPadding className="pt-5 px-5 sm:px-6 pb-5">
        <DataTable
          columns={columns}
          rows={list}
          rowKey={(s) => s.id}
          loading={sites.loading}
          searchText={(s) => `${s.nameVi} ${s.name} ${s.slug} ${s.categoryVi}`}
          searchPlaceholder="Tìm theo tên địa điểm…"
          onRowClick={(s) => setEditor({ open: true, site: s })}
          rowClassName={(s) => (s.isActive === false ? 'opacity-60' : undefined)}
          toolbar={
            <div className="max-w-full overflow-x-auto [scrollbar-width:none]">
              <Segmented
                size="sm"
                value={cat}
                onChange={setCat}
                options={[{ value: 'all', label: 'Tất cả' }, ...CATEGORY_OPTIONS.map((c) => ({ value: c.key as string, label: c.vi }))]}
              />
            </div>
          }
        />
      </Card>

      <SiteEditor
        open={editor.open}
        site={editor.site}
        allSites={all}
        onClose={() => setEditor({ open: false, site: null })}
        onSaved={(s) => {
          sites.setData((l) => {
            const arr = l || [];
            return arr.some((x) => x.id === s.id) ? arr.map((x) => (x.id === s.id ? s : x)) : [...arr, s];
          });
          setEditor({ open: false, site: null });
        }}
      />

      <Modal
        open={!!qrSite}
        onClose={() => setQrSite(null)}
        icon="fa-qrcode"
        title="Mã QR tại điểm"
        subtitle="Khách quét để mở đúng địa điểm & nghe thử, thanh toán để nghe trọn bài"
        size="sm"
        footer={
          qrSite && (
            <>
              <Button
                icon="fa-copy"
                onClick={async () => {
                  (await copyText(siteQrUrl(baseUrl, qrSite.id))) && toast.success('Đã sao chép liên kết');
                }}
              >
                Sao chép liên kết
              </Button>
              <Button variant="primary" icon="fa-arrow-up-right-from-square" onClick={() => window.open(siteQrUrl(baseUrl, qrSite.id), '_blank')}>
                Mở thử
              </Button>
            </>
          )
        }
      >
        {qrSite && baseUrl && (
          <div className="flex justify-center">
            <SiteQrCard site={qrSite} url={siteQrUrl(baseUrl, qrSite.id)} lang="vi" previewSec={settings?.previewSeconds ?? 30} />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SitesPage;
