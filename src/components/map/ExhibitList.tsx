// Thẻ "Điểm nhấn": danh sách các hạng mục con của địa điểm, mỗi mục có nút "Nghe".
import React from 'react';
import type { HeritageSite, LanguageCode } from '../../types';
import { useNarration } from '../../context/NarrationContext';
import { useEntitlement } from '../../context/EntitlementContext';
import { usePreviewSeconds } from '../../hooks/usePreviewSeconds';
import {
  exhibitName,
  exhibitShortDesc,
  exhibitZone,
  formatDurationLabel,
  narrationDuration,
  siteName as localSiteName,
  tr,
  trf
} from '../../i18n';

interface ExhibitListProps {
  site: HeritageSite | null;
  lang: LanguageCode;
}

export const PlayingBars: React.FC<{ className?: string; paused?: boolean }> = ({ className = '', paused }) => (
  <span className={`hl-eq2 ${paused ? 'is-paused' : ''} ${className}`} aria-hidden="true">
    <span />
    <span />
    <span />
    <span />
  </span>
);

// Khi các điểm nhấn dùng chung ảnh của địa điểm: mỗi dòng một khung cắt khác nhau để danh sách không lặp lại.
const CROPS = [
  { pos: '50% 50%', zoom: 1 },
  { pos: '15% 35%', zoom: 1.9 },
  { pos: '85% 45%', zoom: 1.9 },
  { pos: '50% 90%', zoom: 1.7 },
  { pos: '30% 70%', zoom: 2.2 }
];

export const ExhibitList: React.FC<ExhibitListProps> = ({ site, lang }) => {
  const { track, status, playExhibit, toggle, previewSec: trackPreview } = useNarration();
  const previewSecs = usePreviewSeconds(trackPreview);
  const { hasAccess } = useEntitlement();
  if (!site) return null;
  const exhibits = [...(site.exhibits || [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const unlocked = hasAccess(site.id);
  const siteName = localSiteName(site, lang);

  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <header className="flex items-center gap-2.5 px-4 pt-4 pb-3 border-b border-slate-100">
        <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
          <i className="fa-solid fa-landmark-dome text-sm" />
        </span>
        <h3 className="font-extrabold text-slate-800 text-[15px] leading-tight min-w-0 truncate" title={siteName}>
          {tr(lang, { vi: 'Điểm nhấn', en: 'Highlights', ko: '주요 볼거리', ja: '見どころ', zh: '亮点' })}
          {tr(lang, { vi: ': ', en: ': ', ko: ': ', ja: '：', zh: '：' })}
          <span className="text-sky-700">{siteName}</span>
        </h3>
        <span className="ml-auto shrink-0 text-[11px] font-bold text-slate-500 bg-slate-100 rounded-full px-2 py-0.5">
          {exhibits.length}
        </span>
      </header>

      {exhibits.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-slate-400">
          <i className="fa-regular fa-folder-open text-2xl mb-2 block" />
          {tr(lang, {
            vi: 'Chưa có điểm nhấn cho địa điểm này.',
            en: 'No highlights for this site yet.',
            ko: '이 관광지에는 아직 주요 볼거리가 없어요.',
            ja: 'このスポットにはまだ見どころがありません。',
            zh: '该景点暂无亮点。'
          })}
        </div>
      ) : (
        <ul className="hl-scroll max-h-[340px] overflow-y-auto divide-y divide-slate-100">
          {exhibits.map((ex, idx) => {
            const sharesPhoto = !ex.image || ex.image === site.image;
            const crop = CROPS[idx % CROPS.length];
            const isCurrent = track?.exhibitId === ex.id;
            const isPlaying = isCurrent && status === 'playing';
            const isLoading = isCurrent && status === 'loading';
            const name = exhibitName(ex, lang);
            const zone = exhibitZone(ex, lang);
            const desc = exhibitShortDesc(ex, lang);
            const dur = narrationDuration(ex, lang);
            return (
              <li
                key={ex.id}
                className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                  isCurrent ? 'bg-sky-50/70' : 'hover:bg-slate-50'
                }`}
              >
                <div className="relative w-14 h-14 shrink-0 rounded-xl overflow-hidden ring-1 ring-slate-200">
                  <img
                    src={ex.image || site.image}
                    alt={name}
                    loading="lazy"
                    onError={(e) => {
                      const img = e.currentTarget;
                      if (site.fallbackImage && img.src !== site.fallbackImage) img.src = site.fallbackImage;
                    }}
                    className="w-14 h-14 object-cover"
                    style={
                      sharesPhoto
                        ? { objectPosition: crop.pos, transform: `scale(${crop.zoom})`, transformOrigin: crop.pos }
                        : undefined
                    }
                  />
                  {isCurrent && (
                    <span className="absolute inset-0 rounded-xl bg-sky-900/45 flex items-center justify-center">
                      <PlayingBars paused={!isPlaying} />
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-800 text-sm truncate" title={name}>
                    {name}
                  </p>
                  <p className="text-[11px] font-semibold text-sky-600 truncate">
                    <i className="fa-solid fa-location-dot mr-1 text-[10px]" />
                    {zone}
                    {dur > 0 && <span className="text-slate-400 font-medium"> · {formatDurationLabel(dur)}</span>}
                  </p>
                  <p className="text-xs text-slate-500 truncate" title={desc}>
                    {desc}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => (isCurrent && status !== 'ended' && status !== 'locked' ? toggle() : playExhibit(site, ex, { lang }))}
                  className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all active:scale-95 ${
                    isPlaying
                      ? 'bg-teal-500 text-white shadow-sm shadow-teal-500/30'
                      : 'bg-sky-50 text-sky-700 hover:bg-sky-600 hover:text-white border border-sky-200 hover:border-sky-600'
                  }`}
                  aria-label={`${tr(lang, { vi: 'Nghe', en: 'Listen', ko: '듣기', ja: '聞く', zh: '收听' })}: ${name}`}
                >
                  {isLoading ? (
                    <i className="fa-solid fa-circle-notch fa-spin" />
                  ) : isPlaying ? (
                    <PlayingBars className="scale-75 -mx-0.5" />
                  ) : (
                    <i className="fa-solid fa-volume-high" />
                  )}
                  {isPlaying
                    ? tr(lang, { vi: 'Đang phát', en: 'Playing', ko: '재생 중', ja: '再生中', zh: '播放中' })
                    : isCurrent && status === 'paused'
                      ? tr(lang, { vi: 'Tiếp tục', en: 'Resume', ko: '계속', ja: '再開', zh: '继续' })
                      : tr(lang, { vi: 'Nghe', en: 'Listen', ko: '듣기', ja: '聞く', zh: '收听' })}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {!unlocked && exhibits.length > 0 && (
        <p className="px-4 py-2.5 text-[11px] text-slate-500 bg-slate-50 border-t border-slate-100">
          <i className="fa-solid fa-lock text-amber-500 mr-1" />
          {trf(
            lang,
            {
              vi: 'Mỗi điểm nhấn được nghe thử {n} giây đầu.',
              en: 'Each highlight has a {n}-second free preview.',
              ko: '각 볼거리는 처음 {n}초를 무료로 미리 들을 수 있어요.',
              ja: '各見どころは最初の{n}秒を無料で試聴できます。',
              zh: '每个亮点可免费试听前 {n} 秒。'
            },
            { n: previewSecs }
          )}
        </p>
      )}
    </section>
  );
};
