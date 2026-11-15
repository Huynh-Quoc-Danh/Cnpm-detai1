// Ngăn kéo tạo / sửa địa điểm: Thông tin chung · Bản dịch (KO/JA/ZH) · Vị trí GPS · Thuyết minh (5 ngôn ngữ) · Hình ảnh · Điểm nhấn.
import React, { useEffect, useMemo, useState } from 'react';
import type { Exhibit, ExtraLanguageCode, HeritageSite, LanguageCode, SiteTranslation } from '../../../types';
import { adminApi } from '../../../services/api';
import { useAdmin } from '../../AdminContext';
import { Drawer } from '../../components/Modal';
import { BilingualRow, Field, LangTag, NumberInput, Select, TextArea, TextInput } from '../../components/FormField';
import { MapPicker } from '../../components/MapPicker';
import { ImageUpload } from '../../components/Uploads';
import { useConfirm } from '../../components/ConfirmDialog';
import { useToast } from '../../components/Toasts';
import { Badge, Button, EmptyState, IconButton, Tabs, Toggle } from '../../components/ui';
import { CATEGORY_OPTIONS, deepClone, distanceMeters, fmtClock, fmtMeters, inHalong, onImgError } from '../../utils';
import { NarrationEditor } from './NarrationEditor';
import { ExhibitEditor, normalizeExhibitDraft } from './ExhibitEditor';
import { ALL_LANGS, EXTRA_LANGS, LangSegmented, fillNum, fillText, fillUrl } from './langShared';
import { languageMeta } from '../../../i18n';

const blankSiteTr = (): SiteTranslation => ({
  name: '',
  province: '',
  year: '',
  category: '',
  shortDesc: '',
  history: '',
  geology: '',
  highlights: []
});

/** Tên danh mục gợi ý cho ko/ja/zh theo categoryKey. */
const CATEGORY_TR: Record<string, Record<ExtraLanguageCode, string>> = {
  Iconic: { ko: '상징', ja: 'シンボル', zh: '标志景观' },
  'Unique Rock': { ko: '기암', ja: '奇岩', zh: '奇石' },
  Island: { ko: '섬', ja: '島', zh: '岛屿' },
  Natural: { ko: '파노라마', ja: 'パノラマ', zh: '全景' }
};

type TabKey = 'general' | 'translations' | 'gps' | 'narration' | 'media' | 'exhibits';

export const blankSite = (): HeritageSite => ({
  id: 0,
  slug: '',
  name: '',
  nameVi: '',
  provinceEn: 'Ha Long Bay, Quang Ninh',
  provinceVi: 'Vịnh Hạ Long, Quảng Ninh',
  yearEn: '',
  yearVi: '',
  categoryEn: 'Natural',
  categoryVi: 'Thiên nhiên',
  categoryKey: 'Natural',
  image: '',
  fallbackImage: '',
  lat: '' as any,
  lng: '' as any,
  rangeMeters: 300,
  rating: 4.8,
  reviewsCount: 0,
  shortDescVi: '',
  shortDescEn: '',
  historyVi: '',
  historyEn: '',
  geologyVi: '',
  geologyEn: '',
  highlightsVi: [],
  highlightsEn: [],
  narration: fillText(null),
  durationSec: fillNum(null),
  audioUrl: fillUrl(null),
  translations: {},
  coordSource: '',
  isActive: true,
  exhibits: []
});

const num = (v: unknown): v is number => typeof v === 'number' && isFinite(v);

interface Props {
  open: boolean;
  site: HeritageSite | null;
  allSites: HeritageSite[];
  onClose: () => void;
  onSaved: (s: HeritageSite) => void;
}

export const SiteEditor: React.FC<Props> = ({ open, site, allSites, onClose, onSaved }) => {
  const { handleError, settings } = useAdmin();
  const toast = useToast();
  const confirm = useConfirm();
  const [draft, setDraft] = useState<HeritageSite>(blankSite);
  const [initial, setInitial] = useState('');
  const [tab, setTab] = useState<TabKey>('general');
  const [lang, setLang] = useState<LanguageCode>('vi');
  const [trLang, setTrLang] = useState<ExtraLanguageCode>('ko');
  const [saving, setSaving] = useState(false);
  const [exEdit, setExEdit] = useState<{ open: boolean; index: number | null }>({ open: false, index: null });
  const [coordPaste, setCoordPaste] = useState('');
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    if (!open) return;
    const d = site ? deepClone(site) : blankSite();
    d.exhibits = [...(d.exhibits || [])].sort((a, b) => a.sortOrder - b.sortOrder).map(normalizeExhibitDraft);
    // Dữ liệu cũ chỉ có vi/en -> đủ 5 ngôn ngữ
    d.narration = fillText(d.narration);
    d.durationSec = fillNum(d.durationSec);
    d.audioUrl = fillUrl(d.audioUrl);
    d.translations = { ...(d.translations || {}) };
    setDraft(d);
    setInitial(JSON.stringify(d));
    setTab('general');
    setLang('vi');
    setTrLang('ko');
    setShowErrors(false);
    setCoordPaste('');
  }, [open, site]);

  const dirty = open && JSON.stringify(draft) !== initial;
  const set = <K extends keyof HeritageSite>(k: K, v: HeritageSite[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const setPair = (k: 'narration' | 'durationSec' | 'audioUrl', l: LanguageCode, v: any) => setDraft((d) => ({ ...d, [k]: { ...(d[k] as any), [l]: v } }));
  const trOf = (l: ExtraLanguageCode): SiteTranslation => ({ ...blankSiteTr(), ...(draft.translations?.[l] || {}) });
  const setTr = <F extends keyof SiteTranslation>(l: ExtraLanguageCode, f: F, v: SiteTranslation[F]) =>
    setDraft((d) => ({
      ...d,
      translations: { ...(d.translations || {}), [l]: { ...blankSiteTr(), ...(d.translations?.[l] || {}), [f]: v } }
    }));
  const trFilled = (l: ExtraLanguageCode) => !!(draft.translations?.[l]?.name || '').trim();

  // ---- Kiểm tra dữ liệu ----
  const errors = useMemo(() => {
    const e: Partial<Record<string, string>> = {};
    if (!draft.nameVi.trim()) e.nameVi = 'Bắt buộc nhập tên Tiếng Việt';
    if (!num(draft.lat) || draft.lat < -90 || draft.lat > 90) e.lat = 'Vĩ độ không hợp lệ';
    if (!num(draft.lng) || draft.lng < -180 || draft.lng > 180) e.lng = 'Kinh độ không hợp lệ';
    if (!num(draft.rangeMeters) || draft.rangeMeters < 20 || draft.rangeMeters > 5000) e.rangeMeters = 'Bán kính 20–5000 m';
    return e;
  }, [draft]);
  const tabErrors: Record<TabKey, number> = {
    general: errors.nameVi ? 1 : 0,
    translations: 0,
    gps: ['lat', 'lng', 'rangeMeters'].filter((k) => errors[k]).length,
    narration: 0,
    media: 0,
    exhibits: 0
  };
  const err = (k: string) => (showErrors ? errors[k] || null : null);

  const others = allSites.filter((s) => s.id !== draft.id);
  const nearest = useMemo(() => {
    if (!num(draft.lat) || !num(draft.lng)) return null;
    let best: { s: HeritageSite; d: number } | null = null;
    others.forEach((s) => {
      const d = distanceMeters({ lat: draft.lat, lng: draft.lng }, s);
      if (!best || d < best.d) best = { s, d };
    });
    return best as { s: HeritageSite; d: number } | null;
  }, [draft.lat, draft.lng, others]);

  const close = async () => {
    if (dirty && !(await confirm({ title: 'Bỏ các thay đổi?', message: 'Những chỉnh sửa chưa lưu sẽ bị mất.', confirmText: 'Bỏ thay đổi' }))) return;
    onClose();
  };

  const save = async () => {
    setShowErrors(true);
    const firstBad = (Object.keys(tabErrors) as TabKey[]).find((k) => tabErrors[k] > 0);
    if (firstBad) {
      setTab(firstBad);
      toast.warning('Vui lòng kiểm tra lại thông tin', Object.values(errors)[0]);
      return;
    }
    setSaving(true);
    try {
      const payload: any = deepClone(draft);
      payload.name = payload.name.trim() || payload.nameVi.trim();
      payload.exhibits = draft.exhibits.map((e, i) => {
        const x: any = { ...e, sortOrder: i + 1 };
        if (!x.id || String(x.id).startsWith('new-')) delete x.id;
        if (site) x.siteId = site.id;
        else delete x.siteId;
        return x;
      });
      // Bản dịch: bỏ ngôn ngữ trống, cắt khoảng trắng, danh mục mặc định theo categoryKey
      const trs: HeritageSite['translations'] = {};
      for (const l of EXTRA_LANGS) {
        const t = draft.translations?.[l];
        if (!t) continue;
        const clean: SiteTranslation = {
          name: (t.name || '').trim(),
          province: (t.province || '').trim(),
          year: (t.year || '').trim(),
          category: (t.category || '').trim(),
          shortDesc: (t.shortDesc || '').trim(),
          history: (t.history || '').trim(),
          geology: (t.geology || '').trim(),
          highlights: (t.highlights || []).map((x) => x.trim()).filter(Boolean)
        };
        const any = Object.values(clean).some((v) => (Array.isArray(v) ? v.length : v));
        if (!any) continue;
        if (!clean.category) clean.category = CATEGORY_TR[payload.categoryKey]?.[l] || '';
        trs[l] = clean;
      }
      payload.translations = trs;
      const cat = CATEGORY_OPTIONS.find((c) => c.key === payload.categoryKey);
      if (cat) {
        payload.categoryVi = cat.vi;
        payload.categoryEn = cat.en;
      }
      let saved: HeritageSite;
      if (site) saved = await adminApi.updateSite(site.id, payload);
      else {
        delete payload.id;
        if (!payload.slug) delete payload.slug;
        saved = await adminApi.createSite(payload);
      }
      toast.success(site ? 'Đã lưu địa điểm' : 'Đã thêm địa điểm mới', saved.nameVi);
      onSaved(saved);
    } catch (e) {
      handleError(e, 'Không lưu được địa điểm');
    } finally {
      setSaving(false);
    }
  };

  const parsePaste = (v: string) => {
    setCoordPaste(v);
    const m = v.match(/(-?\d{1,3}\.\d+)\s*[,; ]\s*(-?\d{1,3}\.\d+)/);
    if (m) {
      set('lat', +(+m[1]).toFixed(6));
      set('lng', +(+m[2]).toFixed(6));
    }
  };

  const moveExhibit = (i: number, dir: -1 | 1) =>
    setDraft((d) => {
      const list = [...d.exhibits];
      const j = i + dir;
      if (j < 0 || j >= list.length) return d;
      [list[i], list[j]] = [list[j], list[i]];
      return { ...d, exhibits: list };
    });

  const removeExhibit = async (i: number) => {
    const ex = draft.exhibits[i];
    if (!(await confirm({ title: 'Xoá điểm nhấn?', message: <>Điểm nhấn <b>{ex.nameVi}</b> sẽ bị xoá khi bạn lưu địa điểm.</>, confirmText: 'Xoá' }))) return;
    setDraft((d) => ({ ...d, exhibits: d.exhibits.filter((_, k) => k !== i) }));
  };

  const saveExhibit = (e: Exhibit) => {
    setDraft((d) => {
      const list = [...d.exhibits];
      if (exEdit.index === null) list.push({ ...e, id: e.id || `new-${Date.now()}` });
      else list[exEdit.index] = e;
      return { ...d, exhibits: list };
    });
    setExEdit({ open: false, index: null });
  };

  const previewSec = settings?.previewSeconds ?? 30;
  const totalDur = Math.max(...ALL_LANGS.map((l) => draft.durationSec[l] || 0));
  const narrFilled = Object.fromEntries(ALL_LANGS.map((l) => [l, !!(draft.narration[l] || '').trim()]));

  return (
    <>
      <Drawer
        open={open}
        onClose={close}
        width="max-w-4xl"
        title={site ? `Sửa: ${site.nameVi}` : 'Thêm địa điểm mới'}
        subtitle={site ? `ID #${site.id} · ${site.slug}` : 'Điền thông tin, vị trí GPS và lời thuyết minh 3–4 phút'}
        headerExtra={
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { value: 'general', label: 'Thông tin chung', icon: 'fa-circle-info', badge: <ErrDot n={showErrors ? tabErrors.general : 0} /> },
              {
                value: 'translations',
                label: 'Bản dịch (KO/JA/ZH)',
                icon: 'fa-language',
                badge: (
                  <span className="text-[10px] font-extrabold px-1.5 rounded-md bg-slate-100 text-slate-500">
                    {EXTRA_LANGS.filter(trFilled).length}/3
                  </span>
                )
              },
              { value: 'gps', label: 'Vị trí GPS', icon: 'fa-location-dot', badge: <ErrDot n={showErrors ? tabErrors.gps : 0} /> },
              { value: 'narration', label: 'Thuyết minh', icon: 'fa-headphones' },
              { value: 'media', label: 'Hình ảnh', icon: 'fa-image' },
              {
                value: 'exhibits',
                label: 'Điểm nhấn',
                icon: 'fa-star',
                badge: <span className="text-[10px] font-extrabold px-1.5 rounded-md bg-slate-100 text-slate-500">{draft.exhibits.length}</span>
              }
            ]}
          />
        }
        footer={
          <>
            <div className="mr-auto flex items-center gap-3">
              <Toggle checked={draft.isActive !== false} onChange={(v) => set('isActive', v)} label={draft.isActive !== false ? 'Đang hiển thị' : 'Đang ẩn'} />
              {dirty && <Badge tone="amber" dot>Chưa lưu</Badge>}
            </div>
            <Button variant="ghost" onClick={close}>
              Hủy
            </Button>
            <Button variant="primary" icon="fa-floppy-disk" loading={saving} onClick={save}>
              {site ? 'Lưu thay đổi' : 'Tạo địa điểm'}
            </Button>
          </>
        }
      >
        {tab === 'general' && (
          <div className="space-y-5">
            <Section title="Tên & phân loại">
              <BilingualRow>
                <Field label={<>Tên địa điểm<LangTag lang="vi" /></>} required error={err('nameVi')}>
                  <TextInput value={draft.nameVi} onChange={(e) => set('nameVi', e.target.value)} placeholder="VD: Hòn Trống Mái" invalid={!!err('nameVi')} />
                </Field>
                <Field label={<>Tên địa điểm<LangTag lang="en" /></>}>
                  <TextInput value={draft.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Fighting Cocks Islet" />
                </Field>
              </BilingualRow>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Danh mục">
                  <Select value={draft.categoryKey} onChange={(e) => set('categoryKey', e.target.value as any)}>
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.vi} ({c.en})
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Đường dẫn (slug)" hint="Tự tạo nếu bỏ trống">
                  <TextInput value={draft.slug} onChange={(e) => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} placeholder="hon-trong-mai" />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Đánh giá">
                    <NumberInput value={draft.rating} onChange={(v) => set('rating', v === '' ? 0 : Math.min(5, Math.max(0, v)))} step="0.1" min={0} max={5} suffix="★" />
                  </Field>
                  <Field label="Lượt đánh giá">
                    <NumberInput value={draft.reviewsCount} onChange={(v) => set('reviewsCount', v === '' ? 0 : Math.max(0, Math.round(v)))} />
                  </Field>
                </div>
              </div>
              <BilingualRow>
                <Field label={<>Khu vực<LangTag lang="vi" /></>}>
                  <TextInput value={draft.provinceVi} onChange={(e) => set('provinceVi', e.target.value)} />
                </Field>
                <Field label={<>Khu vực<LangTag lang="en" /></>}>
                  <TextInput value={draft.provinceEn} onChange={(e) => set('provinceEn', e.target.value)} />
                </Field>
              </BilingualRow>
              <BilingualRow>
                <Field label={<>Danh hiệu / niên đại<LangTag lang="vi" /></>}>
                  <TextInput value={draft.yearVi} onChange={(e) => set('yearVi', e.target.value)} placeholder="VD: Di sản thiên nhiên thế giới 1994" />
                </Field>
                <Field label={<>Danh hiệu / niên đại<LangTag lang="en" /></>}>
                  <TextInput value={draft.yearEn} onChange={(e) => set('yearEn', e.target.value)} />
                </Field>
              </BilingualRow>
            </Section>
            <Section title="Nội dung giới thiệu">
              <BilingualRow>
                <Field label={<>Mô tả ngắn<LangTag lang="vi" /></>} aside={`${draft.shortDescVi.length} ký tự`}>
                  <TextArea rows={3} value={draft.shortDescVi} onChange={(e) => set('shortDescVi', e.target.value)} />
                </Field>
                <Field label={<>Mô tả ngắn<LangTag lang="en" /></>} aside={`${draft.shortDescEn.length} chars`}>
                  <TextArea rows={3} value={draft.shortDescEn} onChange={(e) => set('shortDescEn', e.target.value)} />
                </Field>
              </BilingualRow>
              <BilingualRow>
                <Field label={<>Lịch sử & văn hoá<LangTag lang="vi" /></>}>
                  <TextArea rows={5} value={draft.historyVi} onChange={(e) => set('historyVi', e.target.value)} />
                </Field>
                <Field label={<>Lịch sử & văn hoá<LangTag lang="en" /></>}>
                  <TextArea rows={5} value={draft.historyEn} onChange={(e) => set('historyEn', e.target.value)} />
                </Field>
              </BilingualRow>
              <BilingualRow>
                <Field label={<>Địa chất<LangTag lang="vi" /></>}>
                  <TextArea rows={4} value={draft.geologyVi} onChange={(e) => set('geologyVi', e.target.value)} />
                </Field>
                <Field label={<>Địa chất<LangTag lang="en" /></>}>
                  <TextArea rows={4} value={draft.geologyEn} onChange={(e) => set('geologyEn', e.target.value)} />
                </Field>
              </BilingualRow>
              <BilingualRow>
                <Field label={<>Điểm nổi bật<LangTag lang="vi" /></>} hint="Mỗi dòng một ý">
                  <TextArea
                    rows={4}
                    value={draft.highlightsVi.join('\n')}
                    onChange={(e) => set('highlightsVi', e.target.value.split('\n'))}
                    onBlur={() => set('highlightsVi', draft.highlightsVi.map((s) => s.trim()).filter(Boolean))}
                  />
                </Field>
                <Field label={<>Điểm nổi bật<LangTag lang="en" /></>} hint="One item per line">
                  <TextArea
                    rows={4}
                    value={draft.highlightsEn.join('\n')}
                    onChange={(e) => set('highlightsEn', e.target.value.split('\n'))}
                    onBlur={() => set('highlightsEn', draft.highlightsEn.map((s) => s.trim()).filter(Boolean))}
                  />
                </Field>
              </BilingualRow>
            </Section>
          </div>
        )}

        {tab === 'translations' && (
          <div className="space-y-5">
            <div className="rounded-2xl bg-gradient-to-r from-sky-50 to-indigo-50 border border-sky-100 p-4 flex flex-wrap items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white text-sky-600 flex items-center justify-center shadow-sm">
                <i className="fa-solid fa-language"></i>
              </div>
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-bold text-slate-900">Nội dung hiển thị cho khách Hàn, Nhật, Trung</p>
                <p className="text-xs text-slate-600 mt-0.5">
                  Ô nào bỏ trống, ứng dụng khách sẽ hiện bản <b>tiếng Anh</b> (rồi tới tiếng Việt). Lời thuyết minh soạn ở tab <b>Thuyết minh</b>.
                </p>
              </div>
              <LangSegmented<ExtraLanguageCode>
                value={trLang}
                onChange={setTrLang}
                langs={EXTRA_LANGS}
                filled={{ ko: trFilled('ko'), ja: trFilled('ja'), zh: trFilled('zh') }}
              />
            </div>
            <div key={trLang} lang={languageMeta(trLang).bcp47} className="space-y-5">
              <Section title={`Tên & thông tin chung · ${languageMeta(trLang).viName}`}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label={<>Tên địa điểm<LangTag lang={trLang} /></>} hint={`EN: ${draft.name || '—'}`}>
                    <TextInput value={trOf(trLang).name} onChange={(e) => setTr(trLang, 'name', e.target.value)} placeholder={draft.name || draft.nameVi} />
                  </Field>
                  <Field label={<>Danh mục<LangTag lang={trLang} /></>} hint="Bỏ trống: tự điền theo danh mục">
                    <TextInput
                      value={trOf(trLang).category}
                      onChange={(e) => setTr(trLang, 'category', e.target.value)}
                      placeholder={CATEGORY_TR[draft.categoryKey]?.[trLang] || draft.categoryEn}
                    />
                  </Field>
                  <Field label={<>Khu vực<LangTag lang={trLang} /></>}>
                    <TextInput value={trOf(trLang).province} onChange={(e) => setTr(trLang, 'province', e.target.value)} placeholder={draft.provinceEn} />
                  </Field>
                  <Field label={<>Danh hiệu / niên đại<LangTag lang={trLang} /></>}>
                    <TextInput value={trOf(trLang).year} onChange={(e) => setTr(trLang, 'year', e.target.value)} placeholder={draft.yearEn} />
                  </Field>
                </div>
              </Section>
              <Section title="Nội dung giới thiệu">
                <Field label={<>Mô tả ngắn<LangTag lang={trLang} /></>} aside={`${trOf(trLang).shortDesc.length} ký tự`}>
                  <TextArea rows={3} value={trOf(trLang).shortDesc} onChange={(e) => setTr(trLang, 'shortDesc', e.target.value)} placeholder={draft.shortDescEn} />
                </Field>
                <Field label={<>Lịch sử & văn hoá<LangTag lang={trLang} /></>}>
                  <TextArea rows={5} value={trOf(trLang).history} onChange={(e) => setTr(trLang, 'history', e.target.value)} placeholder={draft.historyEn} />
                </Field>
                <Field label={<>Địa chất<LangTag lang={trLang} /></>}>
                  <TextArea rows={4} value={trOf(trLang).geology} onChange={(e) => setTr(trLang, 'geology', e.target.value)} placeholder={draft.geologyEn} />
                </Field>
                <Field label={<>Điểm nổi bật<LangTag lang={trLang} /></>} hint="Mỗi dòng một ý">
                  <TextArea
                    rows={4}
                    value={trOf(trLang).highlights.join('\n')}
                    onChange={(e) => setTr(trLang, 'highlights', e.target.value.split('\n'))}
                    onBlur={() => setTr(trLang, 'highlights', trOf(trLang).highlights.map((x) => x.trim()).filter(Boolean))}
                    placeholder={draft.highlightsEn.join('\n')}
                  />
                </Field>
              </Section>
            </div>
          </div>
        )}

        {tab === 'gps' && (
          <div className="space-y-5">
            <Section title="Toạ độ & vùng nhận diện (geofence)" desc="Khi khách vào trong bán kính này, ứng dụng tự nhận diện và phát thuyết minh.">
              <MapPicker
                lat={draft.lat}
                lng={draft.lng}
                radius={draft.rangeMeters}
                onChange={(lat, lng) => setDraft((d) => ({ ...d, lat, lng }))}
                others={others}
                className="h-80 sm:h-[380px]"
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Vĩ độ (Latitude)" required error={err('lat')}>
                  <NumberInput value={draft.lat} onChange={(v) => set('lat', v as any)} step="0.000001" placeholder="20.89075" />
                </Field>
                <Field label="Kinh độ (Longitude)" required error={err('lng')}>
                  <NumberInput value={draft.lng} onChange={(v) => set('lng', v as any)} step="0.000001" placeholder="107.0258" />
                </Field>
                <Field label="Bán kính nhận diện" error={err('rangeMeters')}>
                  <NumberInput value={draft.rangeMeters} onChange={(v) => set('rangeMeters', v as any)} min={20} max={5000} step={10} suffix="mét" />
                </Field>
              </div>
              <input
                type="range"
                min={50}
                max={2000}
                step={10}
                value={num(draft.rangeMeters) ? draft.rangeMeters : 300}
                onChange={(e) => set('rangeMeters', Number(e.target.value))}
                className="w-full accent-sky-600"
              />
              <Field label="Dán toạ độ từ Google Maps" hint='Bấm chuột phải trên Google Maps → sao chép "20.89075, 107.0258" rồi dán vào đây.'>
                <TextInput icon="fa-paste" value={coordPaste} onChange={(e) => parsePaste(e.target.value)} placeholder="20.89075, 107.0258" />
              </Field>
              <div className="flex flex-wrap gap-2">
                {num(draft.lat) && num(draft.lng) && (
                  <>
                    {inHalong(draft.lat, draft.lng) ? (
                      <Badge tone="green" icon="fa-circle-check">
                        Nằm trong khu vực Vịnh Hạ Long
                      </Badge>
                    ) : (
                      <Badge tone="red" icon="fa-triangle-exclamation">
                        Toạ độ nằm ngoài khu vực Vịnh Hạ Long – kiểm tra lại
                      </Badge>
                    )}
                    {nearest && (
                      <Badge tone={nearest.d < (draft.rangeMeters || 0) + (nearest.s.rangeMeters || 0) ? 'amber' : 'slate'} icon="fa-ruler">
                        Cách {nearest.s.nameVi} {fmtMeters(nearest.d)}
                        {nearest.d < (draft.rangeMeters || 0) + (nearest.s.rangeMeters || 0) ? ' · vùng geofence bị chồng lấn' : ''}
                      </Badge>
                    )}
                    <a
                      href={`https://www.google.com/maps?q=${draft.lat},${draft.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200 hover:bg-sky-100"
                    >
                      <i className="fa-solid fa-arrow-up-right-from-square text-[9px]"></i>Kiểm tra trên Google Maps
                    </a>
                  </>
                )}
              </div>
              <Field label="Nguồn toạ độ" hint="Ghi chú nguồn đối chiếu (VD: Google Maps / OpenStreetMap, đo thực địa).">
                <TextInput value={draft.coordSource || ''} onChange={(e) => set('coordSource', e.target.value)} />
              </Field>
            </Section>
          </div>
        )}

        {tab === 'narration' && (
          <div className="space-y-5">
            <div className="rounded-2xl bg-gradient-to-r from-sky-50 to-teal-50 border border-sky-100 p-4 flex flex-wrap items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-white text-sky-600 flex items-center justify-center shadow-sm">
                <i className="fa-solid fa-headphones"></i>
              </div>
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-bold text-slate-900">Thuyết minh đầy đủ 3–4 phút mỗi ngôn ngữ (VI · EN · KO · JA · ZH)</p>
                <p className="text-xs text-slate-600 mt-0.5">
                  Khách chưa mua vé chỉ nghe thử <b>{previewSec} giây</b> đầu; phần còn lại mở khoá sau khi quét QR & thanh toán. Lời thuyết minh không bao giờ được gửi
                  cho khách chưa có vé.
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-bold text-slate-500 uppercase">Dài nhất</p>
                <p className="text-xl font-black text-slate-900 tabular-nums">{fmtClock(totalDur)}</p>
              </div>
            </div>
            <div className="flex justify-end">
              <LangSegmented<LanguageCode> value={lang} onChange={setLang} langs={ALL_LANGS} durations={draft.durationSec} filled={narrFilled} />
            </div>
            <NarrationEditor
              key={lang}
              lang={lang}
              rows={16}
              text={draft.narration[lang] || ''}
              onText={(t) => setPair('narration', lang, t)}
              durationSec={draft.durationSec[lang] || 0}
              onDuration={(s) => setPair('durationSec', lang, s)}
              audioUrl={draft.audioUrl[lang] || null}
              onAudio={(u) => setPair('audioUrl', lang, u)}
              target={[180, 270]}
              previewSec={previewSec}
            />
          </div>
        )}

        {tab === 'media' && (
          <div className="space-y-5">
            <Section title="Ảnh đại diện" desc="Hiển thị trên thẻ địa điểm, bản đồ và mã QR in ấn.">
              <ImageUpload value={draft.image} onChange={(u) => set('image', u)} fallback={draft.fallbackImage} />
            </Section>
            <Section title="Ảnh dự phòng" desc="Dùng khi ảnh chính không tải được (URL ảnh online).">
              <TextInput value={draft.fallbackImage} onChange={(e) => set('fallbackImage', e.target.value)} placeholder="/image/VinhHaLong.jpg" className="font-mono text-xs" />
              {draft.fallbackImage && (
                <img src={draft.fallbackImage} alt="" className="mt-3 h-32 rounded-xl object-cover border border-slate-200" onError={(e) => (e.currentTarget.style.display = 'none')} />
              )}
            </Section>
          </div>
        )}

        {tab === 'exhibits' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-slate-600 flex-1 min-w-[200px]">
                Các điểm nhấn hiển thị trong thẻ <b>“Điểm nhấn”</b> trên bản đồ, mỗi mục có nút <b>Nghe</b> riêng (45–90 giây).
              </p>
              <Button variant="primary" icon="fa-plus" onClick={() => setExEdit({ open: true, index: null })}>
                Thêm điểm nhấn
              </Button>
            </div>
            {draft.exhibits.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-300">
                <EmptyState icon="fa-star" title="Chưa có điểm nhấn" desc="Thêm các góc nhìn, khối đá, hang động… để khách nghe chi tiết hơn." />
              </div>
            ) : (
              <ul className="space-y-2.5">
                {draft.exhibits.map((ex, i) => (
                  <li key={ex.id || i} className="bg-white rounded-2xl border border-slate-200 p-3 flex items-center gap-3 shadow-sm">
                    <div className="flex flex-col">
                      <IconButton icon="fa-chevron-up" label="Lên" disabled={i === 0} onClick={() => moveExhibit(i, -1)} className="w-7 h-6" />
                      <IconButton icon="fa-chevron-down" label="Xuống" disabled={i === draft.exhibits.length - 1} onClick={() => moveExhibit(i, 1)} className="w-7 h-6" />
                    </div>
                    <img src={ex.image || draft.image} alt="" onError={onImgError(draft.fallbackImage)} className="w-14 h-14 rounded-xl object-cover bg-slate-100 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-900 truncate">
                        <span className="text-slate-400 font-semibold mr-1">{i + 1}.</span>
                        {ex.nameVi}
                      </p>
                      <p className="text-[11px] font-semibold text-sky-600 truncate">{ex.zoneVi || '—'}</p>
                      <p className="text-xs text-slate-500 truncate">{ex.shortDescVi}</p>
                    </div>
                    <div className="hidden sm:flex flex-col items-end gap-1">
                      <Badge tone="sky" icon="fa-headphones">
                        {fmtClock(ex.durationSec?.vi)} / {fmtClock(ex.durationSec?.en)}
                      </Badge>
                      <span className="text-[10px] font-bold text-slate-400" title="Số ngôn ngữ đã có lời thuyết minh">
                        {ALL_LANGS.filter((l) => (ex.narration?.[l] || '').trim()).length}/5 ngôn ngữ
                      </span>
                      {String(ex.id).startsWith('new-') && <Badge tone="amber">Mới</Badge>}
                    </div>
                    <IconButton icon="fa-pen" label="Sửa" onClick={() => setExEdit({ open: true, index: i })} />
                    <IconButton icon="fa-trash-can" label="Xoá" tone="danger" onClick={() => removeExhibit(i)} />
                  </li>
                ))}
              </ul>
            )}
            <p className="text-[11px] text-slate-500">
              <i className="fa-solid fa-circle-info mr-1"></i>Thay đổi điểm nhấn được lưu cùng lúc khi bấm <b>{site ? 'Lưu thay đổi' : 'Tạo địa điểm'}</b>.
            </p>
          </div>
        )}
      </Drawer>

      <ExhibitEditor
        open={exEdit.open}
        exhibit={exEdit.index !== null ? draft.exhibits[exEdit.index] : null}
        site={draft}
        previewSec={previewSec}
        onClose={() => setExEdit({ open: false, index: null })}
        onSave={saveExhibit}
      />
    </>
  );
};

const Section: React.FC<{ title: string; desc?: string; children: React.ReactNode }> = ({ title, desc, children }) => (
  <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4 shadow-sm">
    <div>
      <h4 className="text-sm font-extrabold text-slate-900">{title}</h4>
      {desc && <p className="text-xs text-slate-500 mt-0.5">{desc}</p>}
    </div>
    {children}
  </section>
);

const ErrDot: React.FC<{ n: number }> = ({ n }) =>
  n > 0 ? <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">{n}</span> : null;
