// Bộ sinh icon Leaflet (L.divIcon) cho bản đồ: ghim địa điểm có nhãn tên, chấm vị trí, thuyền mô phỏng.
import L from 'leaflet';
import type { HeritageSite } from '../../types';

export const CATEGORY_ICON: Record<string, string> = {
  Iconic: 'fa-landmark',
  'Unique Rock': 'fa-mountain',
  Island: 'fa-umbrella-beach',
  Natural: 'fa-water'
};

export function categoryIcon(key: string | undefined): string {
  return (key && CATEGORY_ICON[key]) || 'fa-location-dot';
}

export function escapeHtml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function truncate(s: string, max = 22): string {
  const t = String(s ?? '').trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

/** Tên ngắn gọn để làm nhãn (bỏ phần trong ngoặc). */
export function shortName(name: string): string {
  return String(name ?? '').replace(/\s*\(.*?\)\s*/g, ' ').trim();
}

const LABEL_W = 170;

/** Ghim tròn trắng viền xanh + icon danh mục + nhãn tên dưới ghim. */
export function siteIcon(site: HeritageSite, label: string, selected: boolean, inside = false): L.DivIcon {
  const pin = selected ? 48 : 38;
  const tip = selected ? 9 : 7;
  const pinH = pin + tip;
  const cls = ['hl-pin', selected ? 'is-selected' : '', inside ? 'is-inside' : ''].join(' ');
  const html = `
    <div class="${cls}" style="width:${LABEL_W}px">
      <div class="hl-pin-head" style="width:${pin}px;height:${pin}px">
        <i class="fa-solid ${categoryIcon(site.categoryKey)}"></i>
      </div>
      <div class="hl-pin-tip" style="border-width:${tip}px ${tip * 0.8}px 0 ${tip * 0.8}px"></div>
      <div class="hl-pin-label" title="${escapeHtml(label)}">${escapeHtml(truncate(shortName(label), 22))}</div>
    </div>`;
  return L.divIcon({
    className: 'hl-site-marker',
    html,
    iconSize: [LABEL_W, pinH + 28],
    iconAnchor: [LABEL_W / 2, pinH],
    popupAnchor: [0, -pinH + 2],
    tooltipAnchor: [0, -pinH]
  });
}

/** Chấm xanh nhấp nháy "Bạn đang ở đây". */
export function userIcon(heading: number | null = null): L.DivIcon {
  const arrow =
    heading !== null && Number.isFinite(heading)
      ? `<div class="hl-user-heading" style="transform:rotate(${heading}deg)"></div>`
      : '';
  return L.divIcon({
    className: 'hl-user-marker',
    html: `<div class="hl-user">${arrow}<span class="hl-user-pulse"></span><span class="hl-user-dot"></span></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
}

/** Thuyền mô phỏng, xoay theo hướng di chuyển. */
export function boatIcon(heading: number): L.DivIcon {
  return L.divIcon({
    className: 'hl-boat-marker',
    html: `<div class="hl-boat"><span class="hl-boat-wake"></span><div class="hl-boat-dir" style="transform:rotate(${Math.round(
      heading
    )}deg)"><span></span></div><div class="hl-boat-core"><i class="fa-solid fa-ship"></i></div></div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });
}

/** Huy hiệu số thứ tự trên tuyến. */
export function routeStepIcon(n: number): L.DivIcon {
  return L.divIcon({
    className: 'hl-step-marker',
    html: `<div class="hl-step">${n}</div>`,
    iconSize: [20, 20],
    iconAnchor: [-12, 34]
  });
}
