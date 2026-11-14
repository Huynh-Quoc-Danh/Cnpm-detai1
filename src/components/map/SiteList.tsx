// Thẻ "Danh sách điểm tham quan": sắp xếp theo khoảng cách tới người dùng (nếu biết vị trí).
import React, { useMemo } from 'react';
import type { HeritageSite, LanguageCode } from '../../types';
import { formatDistance, haversineMeters } from '../../services/geo';
import { categoryIcon } from './markers';
import { siteName, siteText, tr, trf } from '../../i18n';

interface SiteListProps {
  sites: HeritageSite[];
  lang: LanguageCode;
  selectedId: number | null;
  insideSiteId: number | null;
  position: { lat: number; lng: number } | null;
  onPick: (site: HeritageSite) => void;
}

export const SiteList: React.FC<SiteListProps> = ({ sites, lang, selectedId, insideSiteId, position, onPick }) => {
  const rows = useMemo(() => {
    const list = sites.map((s) => ({
      site: s,
      dist: position ? haversineMeters(position, { lat: s.lat, lng: s.lng }) : null
    }));
    if (position) list.sort((a, b) => (a.dist ?? 0) - (b.dist ?? 0));
    return list;
  }, [sites, position]);

  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <header className="flex items-center gap-2.5 px-4 pt-4 pb-3 border-b border-slate-100">
        <span className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
          <i className="fa-solid fa-map-location-dot text-sm" />
        </span>
        <h3 className="font-extrabold text-slate-800 text-[15px] min-w-0 truncate">
          {tr(lang, { vi: 'Danh sách điểm tham quan', en: 'Sites', ko: '관광지 목록', ja: '観光スポット一覧', zh: '景点列表' })}
        </h3>
        <span className="ml-auto shrink-0 text-[11px] font-semibold text-slate-400">
          {position
            ? tr(lang, { vi: 'Gần nhất trước', en: 'Nearest first', ko: '가까운 순', ja: '近い順', zh: '由近到远' })
            : trf(lang, { vi: '{n} điểm', en: '{n} sites', ko: '{n}곳', ja: '{n}か所', zh: '{n} 个景点' }, { n: sites.length })}
        </span>
      </header>
      <ul className="hl-scroll max-h-[300px] overflow-y-auto p-2 space-y-1">
        {rows.map(({ site, dist }) => {
          const sel = site.id === selectedId;
          const inside = site.id === insideSiteId;
          const name = siteName(site, lang);
          return (
            <li key={site.id}>
              <button
                type="button"
                onClick={() => onPick(site)}
                className={`w-full flex items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-all ${
                  sel ? 'bg-gradient-to-r from-sky-50 to-teal-50 ring-1 ring-sky-200' : 'hover:bg-slate-50'
                }`}
              >
                <span
                  className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border-2 text-sm ${
                    inside
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : sel
                        ? 'bg-teal-500 border-teal-500 text-white'
                        : 'bg-white border-sky-600 text-sky-600'
                  }`}
                >
                  <i className={`fa-solid ${categoryIcon(site.categoryKey)}`} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-slate-800 truncate">{name}</span>
                  <span className="block text-[11px] text-slate-500 truncate">
                    {siteText(site, lang, 'category')} · <i className="fa-solid fa-star text-amber-400 text-[9px]" />{' '}
                    {site.rating}
                  </span>
                </span>
                {inside ? (
                  <span className="shrink-0 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5">
                    {tr(lang, { vi: 'Bạn ở đây', en: 'You are here', ko: '현재 위치', ja: '現在地', zh: '您在这里' })}
                  </span>
                ) : dist !== null ? (
                  <span className="shrink-0 text-[11px] font-bold rounded-full bg-slate-100 text-slate-600 px-2 py-0.5 tabular-nums">
                    {formatDistance(dist, lang)}
                  </span>
                ) : (
                  <i className="fa-solid fa-chevron-right text-slate-300 text-xs shrink-0" />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
};
