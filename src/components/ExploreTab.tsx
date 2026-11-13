// Trang Khám phá: hero, dải thống kê, tìm kiếm/lọc và thẻ các điểm tham quan.
import React from 'react';
import { HeritageSite, LanguageCode, CategoryKey } from '../types';
import { uiTranslations } from '../data/mockData';
import { useEntitlement } from '../context/EntitlementContext';
import { useNarration } from '../context/NarrationContext';
import { formatTime } from '../services/narrationEngine';
import { narrationDuration, siteName, siteText, tr, trf } from '../i18n';

interface ExploreTabProps {
  lang: LanguageCode;
  sites: HeritageSite[];
  /** Tổng số điểm (trước khi lọc) cho dải thống kê. */
  totalSites?: number;
  loading?: boolean;
  offline?: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedCategory: CategoryKey;
  onCategoryChange: (cat: CategoryKey) => void;
  favorites: number[];
  onToggleFavorite: (id: number) => void;
  onOpenDetail: (site: HeritageSite) => void;
  onOpenQr?: (site: HeritageSite) => void;
  onOpenMap?: () => void;
  isDesktop: boolean;
  /** Ẩn hero + bộ lọc (dùng cho trang Yêu thích). */
  bare?: boolean;
  previewSec?: number;
}

const HERO_IMAGE = '/image/VinhHaLong.jpg';

export const siteDurationLabel = (site: HeritageSite, lang: LanguageCode) =>
  formatTime(narrationDuration(site, lang));

export const SiteCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-3xl overflow-hidden border border-slate-200/80 shadow-sm animate-pulse">
    <div className="h-52 bg-slate-200" />
    <div className="p-4 space-y-3">
      <div className="h-4 w-2/3 rounded-full bg-slate-200" />
      <div className="h-3 w-1/3 rounded-full bg-slate-100" />
      <div className="h-3 w-full rounded-full bg-slate-100" />
      <div className="h-3 w-5/6 rounded-full bg-slate-100" />
      <div className="h-10 w-full rounded-xl bg-slate-100 mt-2" />
    </div>
  </div>
);

export const ExploreTab: React.FC<ExploreTabProps> = ({
  lang,
  sites,
  totalSites,
  loading,
  offline,
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  favorites,
  onToggleFavorite,
  onOpenDetail,
  onOpenQr,
  onOpenMap,
  isDesktop,
  bare,
  previewSec = 30
}) => {
  const dict = uiTranslations[lang];
  const { hasAccess, openCheckout, ticket } = useEntitlement();
  const { playSite, isCurrent, status, toggle } = useNarration();

  const count = totalSites ?? sites.length;
  const categories: { key: CategoryKey; label: string; icon: string }[] = [
    { key: 'All', label: trf(lang, { vi: 'Tất cả ({n})', en: 'All ({n})', ko: '전체 ({n})', ja: 'すべて ({n})', zh: '全部 ({n})' }, { n: count }), icon: 'fa-layer-group' },
    { key: 'Iconic', label: dict.pillIconic, icon: 'fa-crown' },
    { key: 'Unique Rock', label: dict.pillUnique, icon: 'fa-shapes' },
    { key: 'Island', label: dict.pillIsland, icon: 'fa-umbrella-beach' },
    { key: 'Natural', label: dict.pillNatural, icon: 'fa-mountain-sun' }
  ];

  const stats = [
    { icon: 'fa-location-dot', value: String(count || 7), label: tr(lang, { vi: 'Điểm thuyết minh', en: 'Narrated sites', ko: '해설 명소', ja: 'ガイド付きスポット', zh: '讲解景点' }) },
    { icon: 'fa-headphones', value: tr(lang, { vi: '3–4 phút', en: '3–4 min', ko: '3–4분', ja: '3〜4分', zh: '3–4 分钟' }), label: tr(lang, { vi: 'Mỗi bài thuyết minh', en: 'Per narration', ko: '해설 1편당', ja: 'ガイド1本あたり', zh: '每段讲解' }) },
    { icon: 'fa-language', value: '5', label: tr(lang, { vi: 'Ngôn ngữ thuyết minh', en: 'Narration languages', ko: '해설 언어', ja: 'ガイド言語', zh: '讲解语言' }) },
    { icon: 'fa-qrcode', value: 'QR', label: tr(lang, { vi: 'Quét tại điểm để nghe', en: 'Scan on site to listen', ko: '현장에서 스캔해 듣기', ja: '現地でスキャンして聴く', zh: '现场扫码即可收听' }) }
  ];

  const grid = isDesktop ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1';

  return (
    <div className={bare ? 'space-y-6' : 'p-4 md:p-6 space-y-6'}>
      {!bare && (
        <>
          {/* Hero */}
          <section className="relative rounded-3xl overflow-hidden text-white shadow-xl min-h-[260px] md:min-h-[320px] flex items-end">
            <img
              src={HERO_IMAGE}
              alt={tr(lang, { vi: 'Vịnh Hạ Long', en: 'Ha Long Bay', ko: '하롱베이', ja: 'ハロン湾', zh: '下龙湾' })}
              className="absolute inset-0 w-full h-full object-cover"
              onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
            />
            <div className="absolute inset-0 bg-gradient-to-br from-sky-900/90 via-sky-800/60 to-teal-700/40" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
            <div className="relative z-10 w-full p-6 md:p-10 space-y-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-white/15 backdrop-blur-md border border-white/25">
                <i className="fa-solid fa-award text-amber-300"></i>
                {dict.heroBadge}
              </span>
              <div className="space-y-2 max-w-2xl">
                <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight">{dict.heroTitle}</h2>
                <p className="text-sm md:text-base text-sky-50/90 leading-relaxed">
                  {tr(lang, {
                    vi: 'Quét mã QR tại mỗi điểm hoặc để GPS tự nhận diện — nghe câu chuyện huyền thoại, địa chất và văn hoá của vịnh bằng tiếng Việt, Anh, Hàn, Nhật hoặc Trung.',
                    en: 'Scan the QR code at each site or let GPS detect where you are — hear the legends, geology and culture of the bay in Vietnamese, English, Korean, Japanese or Chinese.',
                    ko: '각 명소의 QR 코드를 스캔하거나 GPS로 현재 위치를 자동 인식해 보세요. 하롱베이의 전설과 지질, 문화 이야기를 베트남어·영어·한국어·일본어·중국어로 들을 수 있어요.',
                    ja: '各スポットのQRコードをスキャンするか、GPSで現在地を自動検出。ハロン湾の伝説や地質、文化の物語を、ベトナム語・英語・韓国語・日本語・中国語でお楽しみいただけます。',
                    zh: '在每个景点扫描二维码，或让 GPS 自动识别您的位置——用越南语、英语、韩语、日语或中文聆听下龙湾的传说、地质与文化故事。'
                  })}
                </p>
              </div>
              <div className="flex flex-wrap gap-2.5 pt-1">
                {sites[0] && (
                  <button
                    onClick={() => playSite(sites.find((s) => s.categoryKey === 'Natural') || sites[0])}
                    className="px-5 py-3 rounded-full bg-white text-sky-800 font-extrabold text-sm flex items-center gap-2 shadow-lg hover:bg-sky-50 transition active:scale-95"
                  >
                    <i className="fa-solid fa-circle-play text-lg text-sky-600"></i>
                    {tr(lang, { vi: 'Nghe thử ngay', en: 'Listen now', ko: '지금 들어보기', ja: '今すぐ試聴', zh: '立即试听' })}
                  </button>
                )}
                {onOpenMap && (
                  <button
                    onClick={onOpenMap}
                    className="px-5 py-3 rounded-full bg-white/15 hover:bg-white/25 border border-white/30 backdrop-blur-md font-bold text-sm flex items-center gap-2 transition"
                  >
                    <i className="fa-solid fa-map-location-dot"></i>
                    {tr(lang, { vi: 'Mở bản đồ GPS', en: 'Open GPS map', ko: 'GPS 지도 열기', ja: 'GPSマップを開く', zh: '打开 GPS 地图' })}
                  </button>
                )}
                {!ticket && (
                  <button
                    onClick={() => openCheckout({ reason: 'manual' })}
                    className="px-5 py-3 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-900 font-extrabold text-sm flex items-center gap-2 shadow-lg transition active:scale-95"
                  >
                    <i className="fa-solid fa-ticket"></i>
                    {tr(lang, { vi: 'Mua vé nghe trọn bộ', en: 'Get the full pass', ko: '전체 이용권 구매', ja: 'チケットを購入', zh: '购买全程通票' })}
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Dải thống kê */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {stats.map((s) => (
              <div key={s.label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-50 to-teal-50 text-sky-600 flex items-center justify-center shrink-0">
                  <i className={`fa-solid ${s.icon}`}></i>
                </div>
                <div className="min-w-0">
                  <div className="text-base font-extrabold text-slate-900 leading-tight">{s.value}</div>
                  <div className="text-[11px] text-slate-500 leading-tight break-words">{s.label}</div>
                </div>
              </div>
            ))}
          </section>

          {offline && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 text-amber-900 text-xs px-4 py-3 flex items-center gap-2">
              <i className="fa-solid fa-plug-circle-exclamation"></i>
              {tr(lang, {
                vi: 'Chưa kết nối được máy chủ — đang hiển thị dữ liệu ngoại tuyến (chỉ nghe thử).',
                en: 'Server unreachable — showing offline data (previews only).',
                ko: '서버에 연결할 수 없어 오프라인 데이터를 표시하고 있어요(미리 듣기만 가능).',
                ja: 'サーバーに接続できません。オフラインデータを表示しています（試聴のみ）。',
                zh: '无法连接服务器——正在显示离线数据（仅可试听）。'
              })}
            </div>
          )}

          {/* Tìm kiếm & bộ lọc */}
          <section className="space-y-3">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h3 className="text-lg md:text-xl font-extrabold text-slate-900">
                  {tr(lang, { vi: 'Điểm tham quan nổi bật', en: 'Featured sites', ko: '추천 명소', ja: 'おすすめスポット', zh: '精选景点' })}
                </h3>
                <p className="text-xs text-slate-500">
                  {trf(
                    lang,
                    {
                      vi: 'Nghe thử miễn phí {s} giây • Mở khóa trọn bộ bằng vé điện tử',
                      en: 'Free {s}-second preview • Unlock everything with an e-pass',
                      ko: '{s}초 무료 미리 듣기 • 전자 이용권으로 전체 해설 잠금 해제',
                      ja: '{s}秒間の無料試聴 • 電子チケットで全編を解放',
                      zh: '免费试听 {s} 秒 • 购买电子通票解锁全部内容'
                    },
                    { s: previewSec }
                  )}
                </p>
              </div>
            </div>
            <div className="relative">
              <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={dict.searchPlaceholder}
                className="w-full pl-11 pr-10 py-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  aria-label={tr(lang, { vi: 'Xóa tìm kiếm', en: 'Clear search', ko: '검색어 지우기', ja: '検索をクリア', zh: '清除搜索' })}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <i className="fa-solid fa-circle-xmark"></i>
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              {categories.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => onCategoryChange(cat.key)}
                  className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    selectedCategory === cat.key
                      ? 'bg-sky-600 text-white shadow-md shadow-sky-600/25'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <i className={`fa-solid ${cat.icon} text-[11px]`}></i>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </section>
        </>
      )}

      {/* Lưới thẻ */}
      {loading && sites.length === 0 ? (
        <div className={`grid gap-5 ${grid}`}>
          {Array.from({ length: 6 }).map((_, i) => (
            <SiteCardSkeleton key={i} />
          ))}
        </div>
      ) : sites.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 text-slate-400 text-sm">
          <i className="fa-solid fa-magnifying-glass text-3xl mb-3 block"></i>
          {tr(lang, { vi: 'Không tìm thấy điểm tham quan phù hợp.', en: 'No matching sites found.', ko: '일치하는 명소가 없어요.', ja: '該当するスポットが見つかりません。', zh: '未找到匹配的景点。' })}
        </div>
      ) : (
        <div className={`grid gap-5 ${grid}`}>
          {sites.map((site) => {
            const isFav = favorites.includes(site.id);
            const current = isCurrent(site.id);
            const playing = current && (status === 'playing' || status === 'loading');
            const unlocked = hasAccess(site.id);
            const title = siteName(site, lang);
            const category = siteText(site, lang, 'category');
            const desc = siteText(site, lang, 'shortDesc');
            const duration = siteDurationLabel(site, lang);
            const exhibitsCount = site.exhibits?.length || 0;

            return (
              <article
                key={site.id}
                onClick={() => onOpenDetail(site)}
                className="group bg-white rounded-3xl overflow-hidden border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-sky-200 transition-all duration-300 flex flex-col cursor-pointer hover:-translate-y-1"
              >
                <div className="relative h-52 w-full overflow-hidden bg-slate-200">
                  <img
                    src={site.image}
                    alt={title}
                    loading="lazy"
                    onError={(e) => {
                      const img = e.target as HTMLImageElement;
                      if (site.fallbackImage && img.src !== site.fallbackImage) img.src = site.fallbackImage;
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-transparent"></div>

                  <span className="absolute top-3 left-3 max-w-[calc(100%-4.5rem)] truncate px-3 py-1 rounded-full text-[11px] font-bold bg-slate-900/70 text-white backdrop-blur-md">
                    {category}
                  </span>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(site.id);
                    }}
                    aria-label={tr(lang, { vi: 'Yêu thích', en: 'Favourite', ko: '즐겨찾기', ja: 'お気に入り', zh: '收藏' })}
                    className={`absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md transition active:scale-90 ${
                      isFav ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30' : 'bg-white/90 text-slate-400 hover:text-rose-500'
                    }`}
                  >
                    <i className="fa-solid fa-heart"></i>
                  </button>

                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 text-white text-xs">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold backdrop-blur-md ${
                        unlocked ? 'bg-emerald-500/90' : 'bg-black/45'
                      }`}
                    >
                      <i className={`fa-solid ${unlocked ? 'fa-lock-open' : 'fa-lock'} text-[10px]`}></i>
                      {unlocked
                        ? tr(lang, { vi: 'Đã mở khóa', en: 'Unlocked', ko: '잠금 해제됨', ja: 'アンロック済み', zh: '已解锁' })
                        : trf(lang, { vi: 'Nghe thử {s}s', en: '{s}s preview', ko: '{s}초 미리 듣기', ja: '{s}秒試聴', zh: '试听 {s} 秒' }, { s: previewSec })}
                    </span>
                    <span className="font-bold flex items-center gap-1 bg-amber-400 text-slate-950 px-2 py-0.5 rounded-lg">
                      <i className="fa-solid fa-star text-[10px]"></i>
                      {site.rating}
                    </span>
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                  <div className="space-y-1.5">
                    <h3 className="font-extrabold text-slate-900 text-base group-hover:text-sky-700 transition-colors break-words">{title}</h3>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 font-semibold">
                      <span className="text-sky-700">
                        <i className="fa-regular fa-clock mr-1"></i>
                        {duration}
                      </span>
                      {exhibitsCount > 0 && (
                        <span>
                          <i className="fa-solid fa-layer-group mr-1"></i>
                          {trf(lang, { vi: '{n} điểm nhấn', en: '{n} highlights', ko: '하이라이트 {n}곳', ja: '見どころ{n}か所', zh: '{n} 个亮点' }, { n: exhibitsCount })}
                        </span>
                      )}
                      <span>
                        <i className="fa-solid fa-satellite-dish mr-1"></i>
                        {site.rangeMeters} m
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{desc}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (current && (status === 'playing' || status === 'paused')) toggle();
                        else playSite(site);
                      }}
                      className={`flex-1 py-2.5 px-3 rounded-full font-bold text-xs flex items-center justify-center gap-2 transition ${
                        playing
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                          : unlocked
                          ? 'bg-sky-600 hover:bg-sky-700 text-white shadow-md shadow-sky-600/20'
                          : 'bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200'
                      }`}
                    >
                      <i className={`fa-solid ${playing ? 'fa-pause' : 'fa-circle-play'}`}></i>
                      <span className="truncate">
                        {playing
                          ? tr(lang, { vi: 'Đang phát', en: 'Playing', ko: '재생 중', ja: '再生中', zh: '正在播放' })
                          : unlocked
                          ? trf(lang, { vi: 'Nghe thuyết minh · {d}', en: 'Listen · {d}', ko: '해설 듣기 · {d}', ja: 'ガイドを聴く · {d}', zh: '收听讲解 · {d}' }, { d: duration })
                          : tr(lang, { vi: 'Nghe thử', en: 'Preview', ko: '미리 듣기', ja: '試聴', zh: '试听' })}
                      </span>
                    </button>
                    {onOpenQr && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenQr(site);
                        }}
                        title={tr(lang, { vi: 'Mã QR điểm này', en: 'Site QR code', ko: '이 명소의 QR 코드', ja: 'このスポットのQRコード', zh: '本景点二维码' })}
                        className="w-10 h-10 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center transition"
                      >
                        <i className="fa-solid fa-qrcode"></i>
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
