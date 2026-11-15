// Modal thêm / sửa "Điểm nhấn" (exhibit) của một địa điểm.
import React, { useEffect, useState } from 'react';
import type { Exhibit, ExhibitTranslation, ExtraLanguageCode, HeritageSite, LanguageCode } from '../../../types';
import { Modal } from '../../components/Modal';
import { Field, LangTag, NumberInput, TextArea, TextInput } from '../../components/FormField';
import { ImageUpload } from '../../components/Uploads';
import { Button } from '../../components/ui';
import { deepClone, distanceMeters, fmtMeters } from '../../utils';
import { NarrationEditor } from './NarrationEditor';
import { ALL_LANGS, EXTRA_LANGS, LangSegmented, fillNum, fillText, fillUrl } from './langShared';
import { languageMeta } from '../../../i18n';

const blankTr = (): ExhibitTranslation => ({ name: '', zone: '', shortDesc: '' });

/** Chuẩn hoá exhibit cũ (chỉ vi/en) thành đủ 5 ngôn ngữ để soạn thảo. */
export function normalizeExhibitDraft(e: Exhibit): Exhibit {
  return { ...e, narration: fillText(e.narration), durationSec: fillNum(e.durationSec), audioUrl: fillUrl(e.audioUrl), translations: { ...(e.translations || {}) } };
}

export const blankExhibit = (site: Partial<HeritageSite>): Exhibit => ({
  id: '',
  siteId: site.id || 0,
  nameVi: '',
  nameEn: '',
  zoneVi: '',
  zoneEn: '',
  image: site.image || '',
  shortDescVi: '',
  shortDescEn: '',
  narration: fillText(null),
  durationSec: fillNum(null),
  audioUrl: fillUrl(null),
  translations: {},
  sortOrder: 0
});

interface Props {
  open: boolean;
  exhibit: Exhibit | null;
  site: Partial<HeritageSite>;
  previewSec?: number;
  onClose: () => void;
  onSave: (e: Exhibit) => void;
}

export const ExhibitEditor: React.FC<Props> = ({ open, exhibit, site, previewSec, onClose, onSave }) => {
  const [draft, setDraft] = useState<Exhibit>(() => blankExhibit(site));
  const [lang, setLang] = useState<LanguageCode>('vi');
  const [trLang, setTrLang] = useState<ExtraLanguageCode>('ko');
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDraft(exhibit ? normalizeExhibitDraft(deepClone(exhibit)) : blankExhibit(site));
      setErr(null);
      setLang('vi');
      setTrLang('ko');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, exhibit]);

  const set = <K extends keyof Exhibit>(k: K, v: Exhibit[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const setPair = (k: 'narration' | 'durationSec' | 'audioUrl', l: LanguageCode, v: any) => setDraft((d) => ({ ...d, [k]: { ...(d[k] as any), [l]: v } }));
  const trOf = (l: ExtraLanguageCode): ExhibitTranslation => draft.translations?.[l] || blankTr();
  const setTr = (l: ExtraLanguageCode, f: keyof ExhibitTranslation, v: string) =>
    setDraft((d) => ({ ...d, translations: { ...(d.translations || {}), [l]: { ...(d.translations?.[l] || blankTr()), [f]: v } } }));
  const trFilled = (l: LanguageCode) =>
    l === 'vi' || l === 'en' ? true : !!(draft.translations?.[l as ExtraLanguageCode]?.name || '').trim();

  const hasPos = typeof draft.lat === 'number' && typeof draft.lng === 'number' && isFinite(draft.lat) && isFinite(draft.lng);
  const dist = hasPos && typeof site.lat === 'number' ? distanceMeters({ lat: draft.lat!, lng: draft.lng! }, { lat: site.lat!, lng: site.lng! }) : null;

  const save = () => {
    if (!draft.nameVi.trim()) return setErr('Vui lòng nhập tên điểm nhấn (Tiếng Việt)');
    const out = { ...draft, nameEn: draft.nameEn.trim() || draft.nameVi.trim() };
    // Bỏ bản dịch trống
    const trs: Exhibit['translations'] = {};
    for (const l of EXTRA_LANGS) {
      const t = draft.translations?.[l];
      if (t && (t.name.trim() || t.zone.trim() || t.shortDesc.trim())) trs[l] = { name: t.name.trim(), zone: t.zone.trim(), shortDesc: t.shortDesc.trim() };
    }
    out.translations = trs;
    if (!hasPos) {
      delete out.lat;
      delete out.lng;
    }
    onSave(out);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      icon="fa-star"
      title={exhibit ? 'Sửa điểm nhấn' : 'Thêm điểm nhấn'}
      subtitle={`Thuộc: ${site.nameVi || 'địa điểm mới'} · thời lượng khuyến nghị 0:45–1:30`}
      footer={
        <>
          {err && <span className="mr-auto self-center text-xs font-semibold text-rose-600">{err}</span>}
          <Button variant="ghost" onClick={onClose}>
            Hủy
          </Button>
          <Button variant="primary" icon="fa-check" onClick={save}>
            {exhibit ? 'Cập nhật' : 'Thêm vào danh sách'}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        <div className="space-y-4">
          <Field label="Ảnh minh hoạ">
            <ImageUpload value={draft.image} onChange={(u) => set('image', u)} fallback={site.fallbackImage} aspect="aspect-[4/3]" />
          </Field>
          <Field label="Vị trí riêng (tuỳ chọn)" hint={dist !== null ? `Cách tâm điểm ${fmtMeters(dist)}` : 'Bỏ trống nếu trùng vị trí địa điểm.'}>
            <div className="grid grid-cols-2 gap-2">
              <NumberInput value={draft.lat ?? ''} onChange={(v) => set('lat', v === '' ? undefined : v)} placeholder="Vĩ độ" step="0.000001" />
              <NumberInput value={draft.lng ?? ''} onChange={(v) => set('lng', v === '' ? undefined : v)} placeholder="Kinh độ" step="0.000001" />
            </div>
            {typeof site.lat === 'number' && (
              <button type="button" onClick={() => setDraft((d) => ({ ...d, lat: site.lat, lng: site.lng }))} className="mt-2 text-[11px] font-semibold text-sky-700 hover:underline">
                <i className="fa-solid fa-location-dot mr-1"></i>Dùng toạ độ của địa điểm
              </button>
            )}
          </Field>
        </div>
        <div className="space-y-4 min-w-0">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label={<>Tên điểm nhấn<LangTag lang="vi" /></>} required>
              <TextInput value={draft.nameVi} onChange={(e) => set('nameVi', e.target.value)} placeholder="VD: Hình gà trống" />
            </Field>
            <Field label={<>Tên điểm nhấn<LangTag lang="en" /></>}>
              <TextInput value={draft.nameEn} onChange={(e) => set('nameEn', e.target.value)} placeholder="e.g. The rooster rock" />
            </Field>
            <Field label={<>Khu vực<LangTag lang="vi" /></>} hint="Hiển thị dạng nhãn xanh nhỏ, VD: Mặt phía Đông">
              <TextInput value={draft.zoneVi} onChange={(e) => set('zoneVi', e.target.value)} />
            </Field>
            <Field label={<>Khu vực<LangTag lang="en" /></>}>
              <TextInput value={draft.zoneEn} onChange={(e) => set('zoneEn', e.target.value)} />
            </Field>
            <Field label={<>Mô tả ngắn (1 dòng)<LangTag lang="vi" /></>}>
              <TextArea rows={2} value={draft.shortDescVi} onChange={(e) => set('shortDescVi', e.target.value)} />
            </Field>
            <Field label={<>Mô tả ngắn (1 dòng)<LangTag lang="en" /></>}>
              <TextArea rows={2} value={draft.shortDescEn} onChange={(e) => set('shortDescEn', e.target.value)} />
            </Field>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-bold text-slate-700">
                <i className="fa-solid fa-language mr-1 text-sky-600"></i>Bản dịch (KO/JA/ZH)
                <span className="font-normal text-slate-500"> – bỏ trống sẽ hiện bản tiếng Anh</span>
              </p>
              <LangSegmented<ExtraLanguageCode> value={trLang} onChange={setTrLang} langs={EXTRA_LANGS} filled={{ ko: trFilled('ko'), ja: trFilled('ja'), zh: trFilled('zh') }} />
            </div>
            <div className="grid sm:grid-cols-2 gap-3" key={trLang} lang={languageMeta(trLang).bcp47}>
              <Field label={<>Tên điểm nhấn<LangTag lang={trLang} /></>}>
                <TextInput value={trOf(trLang).name} onChange={(e) => setTr(trLang, 'name', e.target.value)} placeholder={draft.nameEn || draft.nameVi} />
              </Field>
              <Field label={<>Khu vực<LangTag lang={trLang} /></>}>
                <TextInput value={trOf(trLang).zone} onChange={(e) => setTr(trLang, 'zone', e.target.value)} placeholder={draft.zoneEn || draft.zoneVi} />
              </Field>
              <div className="sm:col-span-2">
                <Field label={<>Mô tả ngắn (1 dòng)<LangTag lang={trLang} /></>}>
                  <TextArea rows={2} value={trOf(trLang).shortDesc} onChange={(e) => setTr(trLang, 'shortDesc', e.target.value)} placeholder={draft.shortDescEn || draft.shortDescVi} />
                </Field>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold text-slate-700">Thuyết minh điểm nhấn</p>
            <LangSegmented<LanguageCode>
              value={lang}
              onChange={setLang}
              langs={ALL_LANGS}
              durations={draft.durationSec}
              filled={Object.fromEntries(ALL_LANGS.map((l) => [l, !!(draft.narration[l] || '').trim()]))}
            />
          </div>
          <NarrationEditor
            key={lang}
            lang={lang}
            rows={6}
            text={draft.narration[lang] || ''}
            onText={(t) => setPair('narration', lang, t)}
            durationSec={draft.durationSec[lang] || 0}
            onDuration={(s) => setPair('durationSec', lang, s)}
            audioUrl={draft.audioUrl[lang] || null}
            onAudio={(u) => setPair('audioUrl', lang, u)}
            target={[45, 90]}
            previewSec={previewSec}
          />
        </div>
      </div>
    </Modal>
  );
};
