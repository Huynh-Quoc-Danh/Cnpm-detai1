// Cửa sổ mua vé thuyết minh: chọn gói → thanh toán (VietQR / quét bằng điện thoại) → vé điện tử.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useOverlay } from '../../hooks/useOverlay';
import type { HeritageSite, LanguageCode, Order, PublicConfig, Ticket, TicketPackage } from '../../types';
import { api, ApiError, formatVnd } from '../../services/api';
import { copyText, getPublicBaseUrl, payUrl } from '../../services/qr';
import { useSites } from '../../context/SitesContext';
import { QrCode } from '../qr/QrCode';
import { rememberPendingOrder } from './ticketStorage';
import { narrationDuration, siteName as siteNameOf, siteText } from '../../i18n';
import {
  CheckoutStyles,
  ConfettiBurst,
  CopyButton,
  SuccessCheck,
  T,
  bankDisplayName,
  durationLabel,
  formatCountdown,
  formatDateTime,
  packageBadge,
  packageIcon,
  packageName,
  packageNameFromLabel,
  ticketScopeLabel,
  vietQrImageUrl
} from './checkoutShared';

export interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: LanguageCode;
  siteId?: number | null;
  /** Optional: pass the site directly (otherwise looked up from SitesContext / API). */
  site?: HeritageSite | null;
  reason?: 'preview-ended' | 'manual' | 'qr';
  currentTicket?: Ticket | null;
  onSuccess: (ticket: Ticket) => void;
}

type View = 'packages' | 'code' | 'pay' | 'success';
type PayTab = 'bank' | 'phone';

/** useSites() nhưng không lỗi khi nằm ngoài SitesProvider. */
function useSitesSafe() {
  try {
    return useSites();
  } catch {
    return null;
  }
}

const DEFAULT_PREVIEW = 30;

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  lang,
  siteId = null,
  site: siteProp = null,
  reason = 'manual',
  currentTicket = null,
  onSuccess
}) => {
  const t = T[lang];
  const sitesCtx = useSitesSafe();
  const [fetchedSites, setFetchedSites] = useState<HeritageSite[]>([]);
  const allSites = sitesCtx?.sites?.length ? sitesCtx.sites : fetchedSites;

  const [view, setView] = useState<View>('packages');
  const [packages, setPackages] = useState<TicketPackage[]>([]);
  const [pkgState, setPkgState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [baseUrl, setBaseUrl] = useState<string>(() => window.location.origin);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [chosenSiteId, setChosenSiteId] = useState<number | null>(siteId);
  const [showCustomer, setShowCustomer] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<PayTab>('bank');
  const [now, setNow] = useState(() => Date.now());
  const [imgFailed, setImgFailed] = useState(false);
  const [successTicket, setSuccessTicket] = useState<Ticket | null>(null);
  const [successKind, setSuccessKind] = useState<'paid' | 'code'>('paid');
  const [code, setCode] = useState('');
  const [codeBusy, setCodeBusy] = useState(false);
  const [codeMsg, setCodeMsg] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);
  const paidRef = useRef(false);
  const viewRef = useRef(view);
  viewRef.current = view;

  const site = useMemo<HeritageSite | null>(() => {
    if (siteProp) return siteProp;
    const id = chosenSiteId ?? siteId;
    if (id == null) return null;
    return allSites.find((s) => Number(s.id) === Number(id)) || null;
  }, [siteProp, chosenSiteId, siteId, allSites]);

  const siteName = useCallback(
    (id: number) => {
      const s = allSites.find((x) => Number(x.id) === Number(id));
      return s ? siteNameOf(s, lang) : undefined;
    },
    [allSites, lang]
  );

  const loadPackages = useCallback(async () => {
    setPkgState('loading');
    try {
      const list = (await api.getPackages()).filter((p) => p.isActive !== false);
      list.sort((a, b) => (a.sortOrder ?? a.id) - (b.sortOrder ?? b.id));
      setPackages(list);
      setPkgState('ready');
      setSelectedId((cur) => {
        if (cur && list.some((p) => p.id === cur)) return cur;
        const popular = list.find((p) => p.code === 'ALL_DAY') || list.find((p) => p.badgeVi) || list[0];
        return popular ? popular.id : null;
      });
    } catch {
      setPkgState('error');
    }
  }, []);

  // Tải dữ liệu khi mở
  useEffect(() => {
    if (!isOpen) return;
    void loadPackages();
    api.getConfig().then(setConfig).catch(() => undefined);
    getPublicBaseUrl().then(setBaseUrl).catch(() => undefined);
    if (!sitesCtx?.sites?.length) api.getSites().then(setFetchedSites).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Khóa cuộn trang (đếm tham chiếu) + phím Esc chỉ đóng lớp trên cùng; không đóng khi đang thanh toán
  useOverlay(isOpen, onClose, { canEscape: () => viewRef.current !== 'pay' });

  const finish = useCallback(
    (ticket: Ticket, kind: 'paid' | 'code') => {
      if (paidRef.current) return;
      paidRef.current = true;
      rememberPendingOrder(null);
      setSuccessTicket(ticket);
      setSuccessKind(kind);
      setView('success');
      onSuccess(ticket);
    },
    [onSuccess]
  );

  // Thăm dò trạng thái đơn mỗi 2 giây
  useEffect(() => {
    if (!isOpen || view !== 'pay' || !order || order.status !== 'pending') return;
    let alive = true;
    const iv = window.setInterval(async () => {
      try {
        const o = await api.getOrder(order.id);
        if (!alive) return;
        if (o.status === 'paid' && o.ticket) finish(o.ticket, 'paid');
        else if (o.status !== order.status) setOrder(o);
      } catch {
        /* thử lại lần sau */
      }
    }, 2000);
    return () => {
      alive = false;
      window.clearInterval(iv);
    };
  }, [isOpen, view, order, finish]);

  // Đồng hồ đếm ngược
  useEffect(() => {
    if (!isOpen || view !== 'pay') return;
    const iv = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(iv);
  }, [isOpen, view]);

  // Tự đóng sau khi thành công
  useEffect(() => {
    if (view !== 'success') return;
    const tm = window.setTimeout(onClose, 5000);
    return () => window.clearTimeout(tm);
  }, [view, onClose]);

  const selected = packages.find((p) => p.id === selectedId) || null;
  const needsSite = !!selected && selected.scope === 'site';
  const effectiveSiteId = chosenSiteId ?? siteId;
  const previewSec = config?.previewSeconds ?? DEFAULT_PREVIEW;
  const siteCount = allSites.length || 7;

  const createOrder = useCallback(async () => {
    if (!selected) return;
    if (selected.scope === 'site' && effectiveSiteId == null) {
      setError(t.needSite);
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const o = await api.createOrder({
        packageId: selected.id,
        siteId: effectiveSiteId ?? undefined,
        lang,
        method: 'vietqr',
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined
      });
      setOrder(o);
      setImgFailed(false);
      setNow(Date.now());
      rememberPendingOrder(o);
      setView('pay');
    } catch (e: any) {
      setError((e && e.message) || t.errCreate);
    } finally {
      setCreating(false);
    }
  }, [selected, effectiveSiteId, lang, customerName, customerPhone, t]);

  const simulatePaid = useCallback(async () => {
    if (!order) return;
    setSimulating(true);
    try {
      const o = await api.payOrder(order.id, 'vietqr');
      if (o.status === 'paid' && o.ticket) finish(o.ticket, 'paid');
      else setOrder(o);
    } catch (e: any) {
      if (e instanceof ApiError && e.status === 409) {
        try {
          setOrder(await api.getOrder(order.id));
        } catch {
          /* ignore */
        }
      } else setError((e && e.message) || t.errCreate);
    } finally {
      setSimulating(false);
    }
  }, [order, finish, t]);

  const submitCode = useCallback(async () => {
    const c = code.trim();
    if (!c) {
      setCodeMsg(t.codeEmpty);
      return;
    }
    setCodeBusy(true);
    setCodeMsg(null);
    try {
      const r = await api.redeemCode(c);
      if (r.ok && r.ticket) finish(r.ticket, 'code');
      else setCodeMsg(r.message || t.invalidCode);
    } catch (e: any) {
      setCodeMsg((e && e.message) || t.connError);
    } finally {
      setCodeBusy(false);
    }
  }, [code, finish, t]);

  if (!isOpen) return null;

  const expiresMs = order ? new Date(order.expiresAt).getTime() - now : 0;
  const isExpired = !!order && (order.status === 'expired' || (order.status === 'pending' && expiresMs <= 0));
  const isCancelled = !!order && (order.status === 'cancelled' || order.status === 'refunded');
  const stepIndex = view === 'success' ? 2 : view === 'pay' ? 1 : 0;
  const reasonText = reason === 'preview-ended' ? t.reasonPreview : reason === 'qr' ? t.reasonQr : t.reasonManual;
  const siteTitle = site ? siteNameOf(site, lang) : null;

  // ---------- Phần đầu ----------
  const header = (
    <div className="relative shrink-0 bg-gradient-to-br from-sky-600 via-sky-600 to-teal-500 text-white px-5 sm:px-7 pt-5 pb-4 overflow-hidden">
      <div className="absolute -right-10 -top-16 w-48 h-48 rounded-full bg-white/10"></div>
      <div className="absolute right-16 -bottom-20 w-40 h-40 rounded-full bg-white/5"></div>
      <div className="relative flex items-start gap-3">
        <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
          <i className="fa-solid fa-headphones-simple text-lg"></i>
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg sm:text-xl font-extrabold leading-tight">
            {view === 'code' ? t.codeTitle : t.title}
          </h2>
          <p className="text-[12px] sm:text-[13px] text-sky-50/90 mt-0.5">{view === 'code' ? t.codeDesc : t.subtitle}</p>
        </div>
        <button
          onClick={onClose}
          aria-label={t.close}
          className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition shrink-0"
        >
          <i className="fa-solid fa-xmark"></i>
        </button>
      </div>
      {view !== 'code' && (
        <div className="relative mt-4 flex items-center gap-2">
          {[t.step1, t.step2, t.step3].map((label, i) => (
            <React.Fragment key={label}>
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-6 h-6 rounded-full text-[11px] font-extrabold flex items-center justify-center transition ${
                    i < stepIndex
                      ? 'bg-white text-teal-600'
                      : i === stepIndex
                      ? 'bg-white text-sky-700 ring-4 ring-white/25'
                      : 'bg-white/20 text-white/80'
                  }`}
                >
                  {i < stepIndex ? <i className="fa-solid fa-check text-[10px]"></i> : i + 1}
                </span>
                <span className={`text-[11px] font-bold ${i <= stepIndex ? 'text-white' : 'text-white/60'}`}>{label}</span>
              </div>
              {i < 2 && <div className={`flex-1 h-0.5 rounded ${i < stepIndex ? 'bg-white' : 'bg-white/25'}`}></div>}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );

  // ---------- Bước 1: chọn gói ----------
  const includes = selected
    ? [
        { icon: 'fa-headphones', text: t.incFull },
        { icon: 'fa-landmark', text: t.incExhibits },
        { icon: 'fa-forward', text: t.incSeek },
        { icon: 'fa-language', text: t.incBilingual },
        { icon: 'fa-clock', text: t.incValid(durationLabel(selected.durationHours, lang)) },
        ...((selected.maxPeople || 1) > 1 ? [{ icon: 'fa-user-group', text: t.incPeople(selected.maxPeople || 1) }] : [])
      ]
    : [];

  const packagesView = (
    <>
      <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-5 space-y-5">
        <div
          className={`flex items-start gap-3 rounded-2xl px-4 py-3 text-[13px] ${
            reason === 'preview-ended'
              ? 'bg-amber-50 text-amber-800 border border-amber-200'
              : 'bg-sky-50 text-sky-800 border border-sky-100'
          }`}
        >
          <i
            className={`fa-solid ${reason === 'preview-ended' ? 'fa-lock' : reason === 'qr' ? 'fa-qrcode' : 'fa-circle-info'} mt-0.5`}
          ></i>
          <div>
            <p className="font-semibold">{reasonText}</p>
            <p className="text-[12px] opacity-80 mt-0.5">{t.previewNote(previewSec)}</p>
          </div>
        </div>

        {currentTicket && (
          <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-[12px] text-emerald-800">
            <i className="fa-solid fa-ticket"></i>
            <span>
              <b>{t.alreadyHave}:</b> {packageNameFromLabel(currentTicket.packageName, lang)} · {ticketScopeLabel(currentTicket, lang, siteName)} ·{' '}
              {t.validUntil} {formatDateTime(currentTicket.expiresAt, lang)}
            </span>
          </div>
        )}

        {site && (
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 p-2.5 pr-4">
            <img
              src={site.image}
              onError={(e) => {
                if (site.fallbackImage && e.currentTarget.src !== site.fallbackImage) e.currentTarget.src = site.fallbackImage;
              }}
              alt=""
              className="w-14 h-14 rounded-xl object-cover bg-slate-100 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-sky-600">
                {siteText(site, lang, 'category')}
              </p>
              <p className="font-extrabold text-slate-900 truncate">{siteTitle}</p>
              <p className="text-[12px] text-slate-500 truncate">
                <i className="fa-regular fa-clock mr-1"></i>
                {t.narrationMin(Math.max(1, Math.round((narrationDuration(site, lang) || 210) / 60)))}
                {site.exhibits?.length ? ` · ${site.exhibits.length} ${t.highlights}` : ''}
              </p>
            </div>
          </div>
        )}

        {pkgState === 'loading' && (
          <div className="grid sm:grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-44 rounded-2xl bg-slate-100 animate-pulse"></div>
            ))}
          </div>
        )}
        {pkgState === 'error' && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-center text-sm text-rose-700">
            <p className="font-semibold">{t.loadPkgError}</p>
            <button
              onClick={() => void loadPackages()}
              className="mt-3 px-4 py-2 rounded-full bg-rose-600 text-white text-xs font-bold hover:bg-rose-700"
            >
              <i className="fa-solid fa-rotate-right mr-1.5"></i>
              {t.retry}
            </button>
          </div>
        )}
        {pkgState === 'ready' && (
          <div className="grid sm:grid-cols-3 gap-3" role="radiogroup">
            {packages.map((p) => {
              const active = p.id === selectedId;
              const badge = packageBadge(p, lang);
              const popular = p.code === 'ALL_DAY' || (!!badge && /phổ biến|popular/i.test(`${p.badgeVi || ''} ${p.badgeEn || ''}`));
              const scopeLine =
                p.scope === 'site'
                  ? site
                    ? `${t.scopeSite}: ${siteTitle}`
                    : t.oneSite
                  : t.scopeAll(siteCount);
              return (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => {
                    setSelectedId(p.id);
                    setError(null);
                  }}
                  className={`relative text-left rounded-2xl border-2 p-4 pt-5 transition-all ${
                    active
                      ? 'border-sky-500 bg-sky-50/60 ring-4 ring-sky-100 shadow-md'
                      : 'border-slate-200 bg-white hover:border-sky-300 hover:shadow-sm'
                  }`}
                >
                  {badge && (
                    <span
                      className={`absolute -top-2.5 left-4 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide shadow-sm ${
                        popular ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white' : 'bg-teal-500 text-white'
                      }`}
                    >
                      {popular && <i className="fa-solid fa-star mr-1"></i>}
                      {badge}
                    </span>
                  )}
                  <span
                    className={`absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      active ? 'border-sky-600 bg-sky-600 text-white' : 'border-slate-300'
                    }`}
                  >
                    {active && <i className="fa-solid fa-check text-[9px]"></i>}
                  </span>
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
                      active ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <i className={`fa-solid ${packageIcon(p)}`}></i>
                  </div>
                  <p className="font-extrabold text-slate-900 text-[15px] leading-snug pr-5">
                    {packageName(p, lang)}
                  </p>
                  <p className="mt-1.5">
                    <span className="text-xl font-black text-slate-900">{formatVnd(p.price)}</span>
                  </p>
                  <p className="mt-2 text-[12px] text-slate-500 leading-snug">
                    <i className="fa-regular fa-clock mr-1"></i>
                    {durationLabel(p.durationHours, lang)}
                    {(p.maxPeople || 1) > 1 && (
                      <>
                        {' · '}
                        <i className="fa-solid fa-user-group mr-1"></i>
                        {p.maxPeople}
                      </>
                    )}
                  </p>
                  <p className="mt-1 text-[12px] text-slate-500 leading-snug line-clamp-2">
                    <i className={`fa-solid ${p.scope === 'site' ? 'fa-location-dot' : 'fa-map'} mr-1`}></i>
                    {scopeLine}
                  </p>
                </button>
              );
            })}
          </div>
        )}

        {needsSite && !siteProp && (siteId == null || !site) && (
          <label className="block">
            <span className="text-[12px] font-bold text-slate-600">{t.chooseSite}</span>
            <select
              value={chosenSiteId ?? ''}
              onChange={(e) => {
                setChosenSiteId(e.target.value ? Number(e.target.value) : null);
                setError(null);
              }}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="">— {t.chooseSite} —</option>
              {allSites.map((s) => (
                <option key={s.id} value={s.id}>
                  {siteNameOf(s, lang)}
                </option>
              ))}
            </select>
          </label>
        )}

        {selected && (
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-2.5">{t.included}</p>
            <ul className="grid sm:grid-cols-2 gap-x-4 gap-y-2">
              {includes.map((it) => (
                <li key={it.text} className="flex items-start gap-2 text-[13px] text-slate-700">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-px">
                    <i className="fa-solid fa-check text-[10px]"></i>
                  </span>
                  <span>{it.text}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="rounded-2xl border border-slate-200">
          <button
            type="button"
            onClick={() => setShowCustomer((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-[13px] font-bold text-slate-700"
          >
            <span>
              <i className="fa-regular fa-user mr-2 text-slate-400"></i>
              {t.customer}
            </span>
            <i className={`fa-solid fa-chevron-down text-xs text-slate-400 transition ${showCustomer ? 'rotate-180' : ''}`}></i>
          </button>
          {showCustomer && (
            <div className="grid sm:grid-cols-2 gap-3 px-4 pb-4">
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder={t.name}
                maxLength={80}
                autoComplete="name"
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value.replace(/[^\d+\s]/g, ''))}
                placeholder={t.phone}
                inputMode="tel"
                maxLength={15}
                autoComplete="tel"
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 border-t border-slate-200 bg-white px-5 sm:px-7 py-4">
        {error && (
          <p className="mb-2 text-[12px] font-semibold text-rose-600">
            <i className="fa-solid fa-circle-exclamation mr-1"></i>
            {error}
          </p>
        )}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setCodeMsg(null);
              setView('code');
            }}
            className="text-[13px] font-bold text-sky-700 hover:text-sky-800 sm:mr-auto"
          >
            <i className="fa-solid fa-ticket mr-1.5"></i>
            {t.haveCode}
          </button>
          <button
            type="button"
            disabled={!selected || creating}
            onClick={() => void createOrder()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-sky-600 to-teal-500 text-white font-extrabold text-sm shadow-lg shadow-sky-600/25 hover:brightness-105 disabled:opacity-60 transition"
          >
            {creating ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-lock"></i>}
            {t.continue}
            {selected && <span className="opacity-90">· {formatVnd(selected.price)}</span>}
          </button>
        </div>
        <p className="mt-2.5 text-center sm:text-right text-[11px] text-slate-400">
          <i className="fa-solid fa-shield-halved mr-1"></i>
          {t.secure}
        </p>
      </div>
    </>
  );

  // ---------- Nhập mã vé ----------
  const codeView = (
    <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-6">
      <div className="max-w-sm mx-auto text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center text-2xl">
          <i className="fa-solid fa-ticket"></i>
        </div>
        <form
          className="mt-5 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void submitCode();
          }}
        >
          <input
            autoFocus
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''));
              setCodeMsg(null);
            }}
            placeholder={t.codePlaceholder}
            maxLength={32}
            className={`w-full py-3.5 px-4 rounded-2xl border-2 border-dashed text-center font-black text-lg tracking-[0.3em] uppercase text-slate-900 focus:outline-none ${
              codeMsg ? 'border-rose-400 bg-rose-50/40' : 'border-slate-300 focus:border-sky-500'
            }`}
          />
          {codeMsg && (
            <p className="text-[13px] font-semibold text-rose-600">
              <i className="fa-solid fa-circle-exclamation mr-1"></i>
              {codeMsg}
            </p>
          )}
          <button
            type="submit"
            disabled={codeBusy}
            className="w-full py-3 rounded-full bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-sm shadow-lg shadow-sky-600/20 disabled:opacity-60 transition"
          >
            {codeBusy ? (
              <>
                <i className="fa-solid fa-circle-notch fa-spin mr-2"></i>
                {t.redeeming}
              </>
            ) : (
              <>
                <i className="fa-solid fa-key mr-2"></i>
                {t.redeem}
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => setView('packages')}
            className="w-full py-2 text-[13px] font-bold text-slate-500 hover:text-slate-700"
          >
            <i className="fa-solid fa-arrow-left mr-1.5"></i>
            {t.back}
          </button>
        </form>
      </div>
    </div>
  );

  // ---------- Bước 2: thanh toán ----------
  const bank = config?.bank;
  const phonePayUrl = order ? payUrl(baseUrl, order.id) : '';
  const payView = order && (
    <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-5">
      <div className="grid md:grid-cols-[1fr_1.05fr] gap-5">
        {/* Cột QR */}
        <div>
          <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-slate-100">
            {(
              [
                ['bank', 'fa-building-columns', t.tabBank, t.tabBankSub],
                ['phone', 'fa-mobile-screen-button', t.tabPhone, t.tabPhoneSub]
              ] as const
            ).map(([key, icon, label, sub]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`rounded-xl px-2 py-2 text-left transition ${
                  tab === key ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <span className="flex items-center gap-2">
                  <i className={`fa-solid ${icon} ${tab === key ? 'text-sky-600' : ''}`}></i>
                  <span className="min-w-0">
                    <span className="block text-[12px] font-extrabold leading-tight truncate">{label}</span>
                    <span className="block text-[10px] font-medium opacity-70 truncate">{sub}</span>
                  </span>
                </span>
              </button>
            ))}
          </div>

          <div className="relative mt-4 rounded-3xl border border-slate-200 bg-white p-4 flex flex-col items-center">
            <div className="relative">
              {tab === 'bank' ? (
                bank && !imgFailed ? (
                  <img
                    src={vietQrImageUrl(bank, order.amount, order.transferNote)}
                    onError={() => setImgFailed(true)}
                    alt="VietQR"
                    className="w-64 max-w-full h-auto"
                  />
                ) : (
                  <QrCode
                    value={`${bank ? `${bankDisplayName(bank.bankId)} ${bank.accountNo} ` : ''}${order.amount} ${order.transferNote}`}
                    size={224}
                    logoIcon="fa-building-columns"
                  />
                )
              ) : (
                <QrCode value={phonePayUrl} size={224} logoIcon="fa-wallet" />
              )}
            </div>
            {(isExpired || isCancelled) && (
              <div className="absolute inset-0 rounded-3xl bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6 hlco-fade">
                <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-xl">
                  <i className={`fa-solid ${isCancelled ? 'fa-ban' : 'fa-hourglass-end'}`}></i>
                </div>
                <p className="mt-3 font-extrabold text-slate-900">{isCancelled ? t.cancelledTitle : t.expiredTitle}</p>
                {!isCancelled && <p className="mt-1 text-[12px] text-slate-500">{t.expiredDesc}</p>}
                <button
                  onClick={() => void createOrder()}
                  disabled={creating}
                  className="mt-4 px-5 py-2.5 rounded-full bg-sky-600 hover:bg-sky-700 text-white text-[13px] font-extrabold disabled:opacity-60"
                >
                  {creating ? (
                    <i className="fa-solid fa-circle-notch fa-spin mr-1.5"></i>
                  ) : (
                    <i className="fa-solid fa-rotate-right mr-1.5"></i>
                  )}
                  {t.newCode}
                </button>
              </div>
            )}
            <p className="mt-3 text-[12px] text-slate-500 text-center leading-relaxed max-w-xs">
              {tab === 'bank' ? t.bankHint : t.phoneHint}
            </p>
            {tab === 'phone' && (
              <a
                href={order.checkoutUrl}
                target="_blank"
                rel="noopener"
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-sky-200 text-sky-700 text-[12px] font-bold hover:bg-sky-50"
              >
                <i className="fa-solid fa-arrow-up-right-from-square"></i>
                {t.openHere}
              </a>
            )}
          </div>
        </div>

        {/* Cột thông tin */}
        <div className="space-y-4">
          <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4">
            <div className="flex items-center justify-between text-[12px] text-slate-300">
              <span>{t.package}</span>
              <span>
                {t.orderId} <b className="text-white font-mono">{order.id}</b>
              </span>
            </div>
            <p className="mt-1 font-bold">{packageNameFromLabel(order.packageName, lang)}</p>
            {order.siteId != null && siteName(order.siteId) && (
              <p className="text-[12px] text-slate-300">
                <i className="fa-solid fa-location-dot mr-1"></i>
                {siteName(order.siteId)}
              </p>
            )}
            <div className="mt-3 flex items-end justify-between">
              <span className="text-[12px] text-slate-300">{t.amount}</span>
              <span className="text-2xl font-black tracking-tight">{formatVnd(order.amount)}</span>
            </div>
          </div>

          {!isExpired && !isCancelled && (
            <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <span className="relative flex w-3 h-3">
                <span className="absolute inline-flex w-full h-full rounded-full bg-amber-400 opacity-75 animate-ping"></span>
                <span className="relative inline-flex w-3 h-3 rounded-full bg-amber-500"></span>
              </span>
              <div className="flex-1 text-[12px] text-amber-800">
                <p className="font-bold">{t.waiting}</p>
                <p>{t.expiresIn}</p>
              </div>
              <span className="font-mono font-black text-lg text-amber-700 tabular-nums">{formatCountdown(expiresMs)}</span>
            </div>
          )}

          {tab === 'bank' ? (
            <div className="rounded-2xl border border-slate-200 divide-y divide-slate-100">
              {bank && (
                <>
                  <Row label={t.bank} value={bankDisplayName(bank.bankId)} />
                  <Row
                    label={t.accountNo}
                    value={bank.accountNo}
                    mono
                    copy={<CopyButton text={bank.accountNo} label={t.copy} doneLabel={t.copied} onCopy={copyText} />}
                  />
                  <Row label={t.accountName} value={bank.accountName} />
                </>
              )}
              <Row
                label={t.amount}
                value={formatVnd(order.amount)}
                strong
                copy={<CopyButton text={String(order.amount)} label={t.copy} doneLabel={t.copied} onCopy={copyText} />}
              />
              <Row
                label={t.note}
                value={order.transferNote}
                mono
                strong
                copy={<CopyButton text={order.transferNote} label={t.copy} doneLabel={t.copied} onCopy={copyText} />}
              />
              <p className="px-4 py-2.5 text-[11px] text-amber-700 bg-amber-50/60 rounded-b-2xl">
                <i className="fa-solid fa-triangle-exclamation mr-1"></i>
                {t.noteWarn}
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
              <div className="flex flex-wrap gap-2">
                {[
                  ['MoMo', 'bg-pink-600'],
                  ['ZaloPay', 'bg-sky-500'],
                  ['ATM', 'bg-emerald-600'],
                  ['VISA', 'bg-indigo-700'],
                  ['Master', 'bg-orange-500']
                ].map(([n, c]) => (
                  <span key={n} className={`px-2.5 py-1 rounded-lg text-white text-[11px] font-black ${c}`}>
                    {n}
                  </span>
                ))}
              </div>
              <p className="text-[12px] text-slate-600 leading-relaxed">{t.phoneWaiting}</p>
              <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
                <span className="flex-1 min-w-0 truncate font-mono text-[11px] text-slate-500">{phonePayUrl}</span>
                <CopyButton text={phonePayUrl} label={t.copy} doneLabel={t.copied} onCopy={copyText} />
              </div>
            </div>
          )}

          <p className="text-[11px] text-slate-500 leading-relaxed">
            <i className="fa-solid fa-circle-check text-emerald-500 mr-1"></i>
            {t.autoConfirm}
          </p>
          {error && (
            <p className="text-[12px] font-semibold text-rose-600">
              <i className="fa-solid fa-circle-exclamation mr-1"></i>
              {error}
            </p>
          )}
          <div className="flex items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={() => {
                setView('packages');
                setError(null);
              }}
              className="text-[13px] font-bold text-slate-500 hover:text-slate-700"
            >
              <i className="fa-solid fa-arrow-left mr-1.5"></i>
              {t.back}
            </button>
            {!isExpired && !isCancelled && (
              <button
                type="button"
                onClick={() => void simulatePaid()}
                disabled={simulating}
                className="text-[11px] font-semibold text-slate-400 hover:text-sky-600 underline decoration-dotted underline-offset-2 disabled:opacity-60"
              >
                {simulating && <i className="fa-solid fa-circle-notch fa-spin mr-1"></i>}
                {t.simulate}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // ---------- Bước 3: thành công ----------
  const successView = successTicket && (
    <div className="relative flex-1 overflow-y-auto px-5 sm:px-7 py-8">
      <ConfettiBurst />
      <div className="relative max-w-sm mx-auto text-center hlco-pop">
        <SuccessCheck />
        <h3 className="mt-5 text-xl font-black text-slate-900">
          {successKind === 'code' ? t.successRedeem : t.successTitle}
        </h3>
        <p className="mt-1.5 text-[13px] text-slate-500 leading-relaxed">{t.successDesc}</p>

        <div className="mt-5 relative rounded-2xl border border-slate-200 bg-white text-left shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-sky-600 to-teal-500 px-4 py-2.5 text-white flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">
              <i className="fa-solid fa-ticket mr-1.5"></i>
              {t.ticket}
            </span>
            <span className="text-[11px] font-mono opacity-90">
              {successTicket.orderId || successTicket.code || successTicket.token.slice(0, 8).toUpperCase()}
            </span>
          </div>
          <div className="px-4 py-3 space-y-1.5 text-[13px]">
            <p className="font-extrabold text-slate-900">{packageNameFromLabel(successTicket.packageName, lang)}</p>
            <p className="text-slate-600">
              <span className="text-slate-400">{t.appliesTo}:</span> {ticketScopeLabel(successTicket, lang, siteName)}
            </p>
            <p className="text-slate-600">
              <span className="text-slate-400">{t.validUntil}:</span>{' '}
              <b className="text-slate-800">{formatDateTime(successTicket.expiresAt, lang)}</b>
            </p>
          </div>
          <div className="absolute left-0 right-0 bottom-0 h-1 bg-slate-100">
            <div className="hlco-bar h-full bg-teal-500" style={{ animationDuration: '5s' }}></div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full py-3 rounded-full bg-gradient-to-r from-sky-600 to-teal-500 text-white font-extrabold text-sm shadow-lg shadow-sky-600/25 hover:brightness-105"
        >
          <i className="fa-solid fa-play mr-2"></i>
          {t.keepListening}
        </button>
        <p className="mt-2 text-[11px] text-slate-400">{t.autoClose}</p>
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-[3000] flex items-end sm:items-center justify-center sm:p-4 bg-slate-950/70 backdrop-blur-sm hlco-fade"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && view !== 'pay') onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <CheckoutStyles />
      <div
        className={`hlco-pop w-full ${
          view === 'pay' ? 'sm:max-w-4xl' : view === 'code' || view === 'success' ? 'sm:max-w-lg' : 'sm:max-w-3xl'
        } max-h-[94vh] sm:max-h-[90vh] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden`}
      >
        {header}
        {view === 'packages' && packagesView}
        {view === 'code' && codeView}
        {view === 'pay' && payView}
        {view === 'success' && successView}
      </div>
    </div>
  );
};

const Row: React.FC<{ label: string; value: string; mono?: boolean; strong?: boolean; copy?: React.ReactNode }> = ({
  label,
  value,
  mono,
  strong,
  copy
}) => (
  <div className="flex items-center gap-3 px-4 py-2.5">
    <span className="w-28 shrink-0 text-[12px] text-slate-500">{label}</span>
    <span
      className={`flex-1 min-w-0 truncate text-[13px] ${mono ? 'font-mono' : ''} ${
        strong ? 'font-extrabold text-slate-900' : 'font-semibold text-slate-700'
      }`}
    >
      {value}
    </span>
    {copy}
  </div>
);

export default CheckoutModal;
