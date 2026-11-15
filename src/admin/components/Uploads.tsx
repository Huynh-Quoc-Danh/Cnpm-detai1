// Tải ảnh / âm thanh lên server (base64 -> POST /api/admin/upload).
import React, { useRef, useState } from 'react';
import { adminApi } from '../../services/api';
import { useAdmin } from '../AdminContext';
import { cx, fmtClock } from '../utils';
import { useToast } from './Toasts';
import { inputCls } from './FormField';

const IMAGE_MAX = 10 * 1024 * 1024;
const AUDIO_MAX = 30 * 1024 * 1024;

function useUploader(kind: 'image' | 'audio') {
  const { handleError } = useAdmin();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const upload = async (file: File): Promise<string | null> => {
    const max = kind === 'image' ? IMAGE_MAX : AUDIO_MAX;
    if (file.size > max) {
      toast.error('Tệp quá lớn', `Tối đa ${kind === 'image' ? '10' : '30'} MB.`);
      return null;
    }
    setBusy(true);
    try {
      const r = await adminApi.uploadFile(file, kind);
      toast.success('Đã tải lên', file.name);
      return r.url;
    } catch (e) {
      handleError(e, 'Tải lên thất bại');
      return null;
    } finally {
      setBusy(false);
    }
  };
  return { busy, upload };
}

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  fallback?: string;
  className?: string;
  aspect?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ value, onChange, fallback, className, aspect = 'aspect-[16/9]' }) => {
  const { busy, upload } = useUploader('image');
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [broken, setBroken] = useState(false);

  const pick = async (f?: File | null) => {
    if (!f) return;
    const url = await upload(f);
    if (url) {
      setBroken(false);
      onChange(url);
    }
  };

  return (
    <div className={cx('space-y-2', className)}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          pick(e.dataTransfer.files?.[0]);
        }}
        onClick={() => inputRef.current?.click()}
        className={cx(
          'group relative w-full rounded-2xl overflow-hidden border-2 border-dashed cursor-pointer transition bg-slate-50',
          aspect,
          drag ? 'border-sky-500 bg-sky-50' : 'border-slate-200 hover:border-sky-400'
        )}
      >
        {value && !broken ? (
          <img
            src={value}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => {
              if (fallback && e.currentTarget.src !== fallback) e.currentTarget.src = fallback;
              else setBroken(true);
            }}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-2">
            <i className="fa-regular fa-image text-3xl"></i>
            <span className="text-xs font-semibold">Kéo thả ảnh vào đây hoặc bấm để chọn</span>
            <span className="text-[10px]">JPG, PNG, WEBP · tối đa 10 MB</span>
          </div>
        )}
        <div
          className={cx(
            'absolute inset-0 flex items-center justify-center bg-slate-900/50 text-white text-sm font-bold gap-2 transition',
            busy ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          )}
        >
          {busy ? (
            <>
              <i className="fa-solid fa-circle-notch fa-spin"></i> Đang tải lên…
            </>
          ) : (
            <>
              <i className="fa-solid fa-cloud-arrow-up"></i> {value ? 'Thay ảnh' : 'Chọn ảnh'}
            </>
          )}
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      <input
        value={value || ''}
        onChange={(e) => {
          setBroken(false);
          onChange(e.target.value);
        }}
        placeholder="/image/ten-anh.jpg hoặc https://…"
        className={cx(inputCls, 'text-xs font-mono')}
      />
    </div>
  );
};

interface AudioUploadProps {
  value: string | null;
  onChange: (url: string | null) => void;
  /** Báo thời lượng thực của file khi tải xong metadata. */
  onDuration?: (sec: number) => void;
  label?: string;
}

export const AudioUpload: React.FC<AudioUploadProps> = ({ value, onChange, onDuration, label = 'Tệp âm thanh (MP3)' }) => {
  const { busy, upload } = useUploader('audio');
  const inputRef = useRef<HTMLInputElement>(null);
  const [dur, setDur] = useState<number | null>(null);

  const pick = async (f?: File | null) => {
    if (!f) return;
    const url = await upload(f);
    if (url) onChange(url);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3.5">
      <div className="flex items-center gap-3">
        <div className={cx('w-10 h-10 shrink-0 rounded-xl flex items-center justify-center', value ? 'bg-teal-50 text-teal-600' : 'bg-slate-100 text-slate-400')}>
          <i className="fa-solid fa-file-audio"></i>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-slate-700">{label}</p>
          <p className="text-[11px] text-slate-500 truncate">
            {value ? (
              <>
                <span className="font-mono">{value.split('/').pop()}</span>
                {dur ? ` · ${fmtClock(dur)}` : ''}
              </>
            ) : (
              'Chưa có – ứng dụng dùng giọng đọc tự động (TTS)'
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="text-xs font-bold px-3 py-1.5 rounded-full bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 transition whitespace-nowrap"
        >
          {busy ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-upload mr-1"></i>}
          {busy ? '' : value ? 'Thay' : 'Tải lên'}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setDur(null);
            }}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
            title="Gỡ tệp"
          >
            <i className="fa-solid fa-trash-can text-xs"></i>
          </button>
        )}
      </div>
      {value && (
        <audio
          key={value}
          src={value}
          controls
          preload="metadata"
          className="w-full mt-3 h-9"
          onLoadedMetadata={(e) => {
            const d = e.currentTarget.duration;
            if (isFinite(d) && d > 0) {
              setDur(d);
              onDuration?.(Math.round(d));
            }
          }}
        />
      )}
      <input ref={inputRef} type="file" accept="audio/*,.mp3,.m4a,.wav,.ogg" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
    </div>
  );
};
