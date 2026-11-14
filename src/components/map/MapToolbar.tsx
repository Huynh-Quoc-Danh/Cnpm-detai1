// Thanh công cụ bản đồ: chọn tuyến, mô phỏng hành trình tàu, đặt vị trí giả lập, tự động phát.
import React from 'react';
import type { LanguageCode, RecommendedRoute } from '../../types';
import type { CruiseStatus } from './useCruise';
import { tr, type TrMap } from '../../i18n';

/** ko/ja/zh names for the recommended routes (mockData only carries vi/en). */
const ROUTE_NAMES: Record<string, Pick<TrMap, 'ko' | 'ja' | 'zh'>> = {
  'route-1': {
    ko: '코스 1: 하롱베이의 전설 (4시간)',
    ja: 'ルート1：ハロン湾の伝説 (4時間)',
    zh: '路线 1：下龙湾传奇之旅（4 小时）'
  },
  'route-2': {
    ko: '코스 2: 생태 경관과 석회암 섬 (6시간)',
    ja: 'ルート2：自然の驚異と奇岩の島々 (6時間)',
    zh: '路线 2：生态奇观与石灰岩岛屿（6 小时）'
  }
};

const routeName = (lang: LanguageCode, r: RecommendedRoute) =>
  tr(lang, { vi: r.nameVi, en: r.nameEn, ...(ROUTE_NAMES[r.id] || {}) });

interface MapToolbarProps {
  lang: LanguageCode;
  routes: RecommendedRoute[];
  routeId: string;
  onRouteChange: (id: string) => void;
  cruiseStatus: CruiseStatus;
  cruiseProgress: number;
  speed: number;
  onSpeed: (f: number) => void;
  onCruiseStart: () => void;
  onCruisePause: () => void;
  onCruiseResume: () => void;
  onCruiseStop: () => void;
  clickToPlace: boolean;
  onToggleClickToPlace: () => void;
  hasManualPos: boolean;
  onClearSim: () => void;
  autoPlay: boolean;
  onToggleAutoPlay: () => void;
}

export const Switch: React.FC<{ checked: boolean; onChange: () => void; label: React.ReactNode; id: string }> = ({
  checked,
  onChange,
  label,
  id
}) => (
  <label htmlFor={id} className="inline-flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-slate-600">
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative w-9 h-5 rounded-full transition-colors ${checked ? 'bg-teal-500' : 'bg-slate-300'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-4' : ''
        }`}
      />
    </button>
    {label}
  </label>
);

export const MapToolbar: React.FC<MapToolbarProps> = (p) => {
  const lang = p.lang;
  const running = p.cruiseStatus === 'running';
  const paused = p.cruiseStatus === 'paused';
  const active = running || paused;

  return (
    <div className="flex flex-wrap items-center gap-2 px-3 sm:px-4 py-3 border-b border-slate-100 bg-white">
      {/* Chọn tuyến */}
      <div className="relative">
        <i className="fa-solid fa-route absolute left-3 top-1/2 -translate-y-1/2 text-amber-500 text-xs pointer-events-none" />
        <select
          value={p.routeId}
          onChange={(e) => p.onRouteChange(e.target.value)}
          className="appearance-none pl-8 pr-8 py-2 rounded-full border border-slate-200 bg-slate-50 hover:bg-white text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-200 max-w-[230px] sm:max-w-[300px] truncate"
          aria-label={tr(lang, { vi: 'Chọn tuyến tham quan', en: 'Choose a route', ko: '관광 코스 선택', ja: '観光ルートを選択', zh: '选择游览路线' })}
        >
          <option value="none">
            {tr(lang, { vi: 'Không hiển thị tuyến', en: 'No route', ko: '코스 표시 안 함', ja: 'ルートを表示しない', zh: '不显示路线' })}
          </option>
          {p.routes.map((r) => (
            <option key={r.id} value={r.id}>
              {routeName(lang, r)}
            </option>
          ))}
          <option value="all">
            {tr(lang, {
              vi: 'Tuyến tổng hợp: tất cả các điểm (Tây → Đông)',
              en: 'Grand tour: all sites (west → east)',
              ko: '종합 코스: 모든 관광지 (서 → 동)',
              ja: '総合ルート：全スポット (西 → 東)',
              zh: '综合路线：全部景点（西 → 东）'
            })}
          </option>
        </select>
        <i className="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none" />
      </div>

      {/* Mô phỏng hành trình */}
      {!active ? (
        <button
          type="button"
          onClick={p.onCruiseStart}
          className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-sky-600 to-teal-500 text-white px-3.5 py-2 text-xs font-bold shadow-sm shadow-sky-600/30 hover:brightness-110 active:scale-95 transition"
        >
          <i className="fa-solid fa-ship" />
          {tr(lang, {
            vi: 'Mô phỏng hành trình tàu',
            en: 'Simulate boat cruise',
            ko: '유람선 항해 시뮬레이션',
            ja: '遊覧船の航路をシミュレーション',
            zh: '模拟游船航程'
          })}
        </button>
      ) : (
        <div className="inline-flex items-center gap-1 rounded-full bg-sky-50 border border-sky-200 pl-1 pr-2 py-1">
          <button
            type="button"
            onClick={running ? p.onCruisePause : p.onCruiseResume}
            className="w-7 h-7 rounded-full bg-sky-600 text-white text-[11px] flex items-center justify-center hover:bg-sky-700"
            aria-label={
              running
                ? tr(lang, { vi: 'Tạm dừng', en: 'Pause', ko: '일시 정지', ja: '一時停止', zh: '暂停' })
                : tr(lang, { vi: 'Tiếp tục', en: 'Resume', ko: '계속', ja: '再開', zh: '继续' })
            }
          >
            <i className={`fa-solid ${running ? 'fa-pause' : 'fa-play ml-0.5'}`} />
          </button>
          <button
            type="button"
            onClick={p.onCruiseStop}
            className="w-7 h-7 rounded-full bg-white border border-slate-200 text-rose-500 text-[11px] flex items-center justify-center hover:bg-rose-50"
            aria-label={tr(lang, { vi: 'Dừng mô phỏng', en: 'Stop simulation', ko: '시뮬레이션 중지', ja: 'シミュレーションを停止', zh: '停止模拟' })}
          >
            <i className="fa-solid fa-stop" />
          </button>
          <div className="w-16 sm:w-24 h-1.5 rounded-full bg-sky-100 overflow-hidden mx-1">
            <div className="h-full bg-gradient-to-r from-sky-500 to-teal-400" style={{ width: `${Math.round(p.cruiseProgress * 100)}%` }} />
          </div>
          {[1, 2, 4].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => p.onSpeed(f)}
              className={`text-[10px] font-extrabold rounded-full px-1.5 py-0.5 ${
                p.speed === f ? 'bg-sky-600 text-white' : 'text-sky-700 hover:bg-sky-100'
              }`}
            >
              x{f}
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={p.onToggleClickToPlace}
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold border transition ${
          p.clickToPlace
            ? 'bg-violet-600 border-violet-600 text-white shadow-sm'
            : 'bg-white border-slate-200 text-slate-600 hover:border-violet-300 hover:text-violet-700'
        }`}
        title={tr(lang, {
          vi: 'Click bản đồ để đặt vị trí giả lập',
          en: 'Click the map to set a simulated position',
          ko: '지도를 클릭해 가상 위치를 지정해요',
          ja: '地図をクリックして仮想位置を設定します',
          zh: '点击地图设置模拟位置'
        })}
      >
        <i className="fa-solid fa-hand-pointer" />
        <span className="hidden sm:inline">
          {tr(lang, {
            vi: 'Click bản đồ để đặt vị trí giả lập',
            en: 'Click map to set position',
            ko: '지도 클릭으로 위치 지정',
            ja: '地図クリックで位置を設定',
            zh: '点击地图设置位置'
          })}
        </span>
        <span className="sm:hidden">
          {tr(lang, { vi: 'Đặt vị trí', en: 'Set position', ko: '위치 지정', ja: '位置を設定', zh: '设置位置' })}
        </span>
      </button>

      {p.hasManualPos && !active && (
        <button
          type="button"
          onClick={p.onClearSim}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold border border-slate-200 text-slate-600 hover:bg-slate-50"
        >
          <i className="fa-solid fa-location-crosshairs" />
          {tr(lang, { vi: 'Dùng GPS thật', en: 'Use real GPS', ko: '실제 GPS 사용', ja: '実際のGPSを使用', zh: '使用真实 GPS' })}
        </button>
      )}

      <div className="ml-auto">
        <Switch
          id="hl-autoplay"
          checked={p.autoPlay}
          onChange={p.onToggleAutoPlay}
          label={
            <span>
              <i className="fa-solid fa-wand-magic-sparkles text-teal-500 mr-1" />
              {tr(lang, { vi: 'Tự động phát', en: 'Auto-play', ko: '자동 재생', ja: '自動再生', zh: '自动播放' })}
            </span>
          }
        />
      </div>
    </div>
  );
};
