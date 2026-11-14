import React, { useEffect, useRef, useState } from 'react';
import { useOverlay } from '../hooks/useOverlay';
import { ChatMessage, LanguageCode } from '../types';
import { uiTranslations } from '../data/mockData';
import { tr } from '../i18n';

interface ChatbotModalProps {
  isOpen: boolean;
  lang: LanguageCode;
  messages: ChatMessage[];
  onClose: () => void;
  onSendMessage: (text: string) => void;
}

export const ChatbotModal: React.FC<ChatbotModalProps> = ({
  isOpen,
  lang,
  messages,
  onClose,
  onSendMessage
}) => {
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  useOverlay(isOpen, onClose);
  useEffect(() => {
    if (isOpen) endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, isOpen]);
  if (!isOpen) return null;

  const dict = uiTranslations[lang] || uiTranslations.en;

  const quickSuggestions: string[] = [
    tr(lang, { vi: 'Hòn Trống Mái có ý nghĩa gì?', en: 'Tell me about Fighting Cocks', ko: '싸움닭 바위에는 어떤 의미가 있나요?', ja: '闘鶏岩にはどんな意味がありますか？', zh: '斗鸡石有什么寓意？' }),
    tr(lang, { vi: 'Đảo Ti Tốp', en: 'Ti Top Island', ko: '띠똡섬', ja: 'ティートップ島', zh: '迪托普岛' }),
    tr(lang, { vi: 'Sự tích vịnh Hạ Long', en: 'Legend of Ha Long Bay', ko: '하롱베이의 전설', ja: 'ハロン湾の伝説', zh: '下龙湾的传说' }),
    tr(lang, { vi: 'Giá vé nghe thuyết minh', en: 'Audio pass prices', ko: '해설 이용권 가격', ja: '音声ガイドの料金', zh: '语音讲解价格' }),
    tr(lang, { vi: 'Quét mã QR thế nào?', en: 'How does the QR work?', ko: 'QR 코드는 어떻게 사용하나요?', ja: 'QRコードの使い方は？', zh: '如何扫描二维码？' })
  ];
  const closeLabel = tr(lang, { vi: 'Đóng', en: 'Close', ko: '닫기', ja: '閉じる', zh: '关闭' });
  const sendLabel = tr(lang, { vi: 'Gửi', en: 'Send', ko: '보내기', ja: '送信', zh: '发送' });

  const handleSend = () => {
    if (!input.trim()) return;
    onSendMessage(input.trim());
    setInput('');
  };

  return (
    <div
      className="fixed inset-0 z-[1200] bg-slate-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md h-[80vh] sm:h-[620px] rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col hl-modal-in"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={dict.chatHeaderTitle}
      >
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-sky-600 via-indigo-600 to-purple-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-lg">
              <i className="fa-solid fa-robot"></i>
            </div>
            <div>
              <h3 className="font-extrabold text-sm">{dict.chatHeaderTitle}</h3>
              <p className="text-[11px] text-sky-100">{dict.chatHeaderSubtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label={closeLabel}
            title={closeLabel}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Danh sách tin nhắn */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col max-w-[85%] ${
                msg.sender === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
              }`}
            >
              <div
                className={`px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow-sm whitespace-pre-line break-words ${
                  msg.sender === 'user'
                    ? 'bg-sky-600 text-white rounded-br-md'
                    : 'bg-white text-slate-800 border border-slate-200 rounded-bl-md'
                }`}
              >
                {msg.text}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 px-1">{msg.timestamp}</span>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        {/* Gợi ý câu hỏi nhanh */}
        <div className="px-3 py-2 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {quickSuggestions.map((item, idx) => (
            <button
              key={idx}
              onClick={() => onSendMessage(item)}
              className="px-3 py-1 rounded-full bg-slate-100 hover:bg-sky-50 hover:text-sky-700 text-slate-600 text-[11px] font-semibold whitespace-nowrap transition"
            >
              {item}
            </button>
          ))}
        </div>

        {/* Ô nhập tin nhắn */}
        <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={dict.chatPlaceholder}
            className="flex-1 px-4 py-2.5 rounded-full bg-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          <button
            onClick={handleSend}
            aria-label={sendLabel}
            title={sendLabel}
            className="w-10 h-10 rounded-full bg-sky-600 hover:bg-sky-700 text-white flex items-center justify-center shadow-md transition"
          >
            <i className="fa-solid fa-paper-plane text-xs"></i>
          </button>
        </div>
      </div>
    </div>
  );
};