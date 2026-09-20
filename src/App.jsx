import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Circle } from 'react-leaflet';
import L from 'leaflet';
import poiData from './pois.json';
import { Globe, MessageSquare, CreditCard, Volume2, Square, Navigation, Send, X } from 'lucide-react';

const createCustomMarker = (isActive) => {
  return L.divIcon({
    className: 'custom-poi-marker',
    html: `
      <div style="
        width: 38px;
        height: 38px;
        background: ${isActive ? '#f59e0b' : '#2563eb'};
        border: 3px solid #ffffff;
        border-radius: 50%;
        box-shadow: 0 4px 12px rgba(0,0,0,0.35);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 18px;
        transform: translate(-50%, -50%);
        transition: all 0.2s ease;
      ">
        📍
      </div>
    `,
    iconSize: [0, 0],
  });
};

export default function App() {
  const [isPaid, setIsPaid] = useState(() => !!localStorage.getItem('access_token'));
  const [lang, setLang] = useState('vi');
  const [userLocation, setUserLocation] = useState(null);
  const [activePOI, setActivePOI] = useState(null);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { sender: 'bot', text: 'Xin chào! Tôi có thể hỗ trợ thông tin gì về Chùa Linh Ứng?' }
  ]);
  const [inputMessage, setInputMessage] = useState('');

  useEffect(() => {
    if ('geolocation' in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
        (err) => console.log('Chưa cấp quyền GPS:', err),
        { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  // Tự động dừng đọc khi đổi điểm tham quan hoặc đổi ngôn ngữ
  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsPlayingVoice(false);
    }
  }, [activePOI, lang]);

  // Hàm phát/dừng giọng đọc thuyết minh AI
  const toggleVoice = () => {
    if (!('speechSynthesis' in window) || !activePOI) return;

    if (isPlayingVoice) {
      window.speechSynthesis.cancel();
      setIsPlayingVoice(false);
    } else {
      window.speechSynthesis.cancel();
      const textToRead = `${activePOI.translations[lang].title}. ${activePOI.translations[lang].description}`;
      const utterance = new SpeechSynthesisUtterance(textToRead);
      utterance.lang = lang === 'vi' ? 'vi-VN' : 'en-US';
      utterance.rate = 0.95;

      utterance.onend = () => setIsPlayingVoice(false);
      utterance.onerror = () => setIsPlayingVoice(false);

      window.speechSynthesis.speak(utterance);
      setIsPlayingVoice(true);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;
    const msg = inputMessage;
    setChatMessages((prev) => [...prev, { sender: 'user', text: msg }]);
    setInputMessage('');
    setTimeout(() => {
      setChatMessages((prev) => [
        ...prev,
        { sender: 'bot', text: 'Chùa Linh Ứng Bãi Bụt mở cửa miễn phí từ 6h00 đến 21h00 hằng ngày.' }
      ]);
    }, 600);
  };

  if (!isPaid) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{
          background: '#ffffff',
          borderRadius: 24,
          padding: '36px 24px',
          maxWidth: 380,
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
        }}>
          <div style={{
            width: 68,
            height: 68,
            margin: '0 auto 16px',
            background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
            borderRadius: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff'
          }}>
            <Navigation size={34} />
          </div>
          <h2 style={{ margin: '0 0 8px', fontSize: 22, color: '#0f172a', fontWeight: 700 }}>
            Linh Ứng Audio Guide
          </h2>
          <p style={{ margin: '0 0 24px', fontSize: 14, color: '#64748b', lineHeight: 1.5 }}>
            Thuyết minh định vị GPS đa ngôn ngữ tự động tại Chùa Linh Ứng - Sơn Trà.
          </p>
          <button
            onClick={() => {
              localStorage.setItem('access_token', 'demo_token');
              setIsPaid(true);
            }}
            style={{
              width: '100%',
              padding: '14px',
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              color: '#fff',
              border: 'none',
              borderRadius: 14,
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8
            }}
          >
            <CreditCard size={18} /> Kích hoạt trải nghiệm
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* Header trạng thái */}
      <header style={{
        position: 'absolute',
        top: 16,
        left: 16,
        right: 16,
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        pointerEvents: 'none'
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(8px)',
          padding: '8px 14px',
          borderRadius: 30,
          boxShadow: '0 4px 15px rgba(0,0,0,0.12)',
          fontSize: 13,
          fontWeight: 600,
          color: '#1e293b',
          pointerEvents: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: 6
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }}></span>
          Chùa Linh Ứng GPS
        </div>

        <button
          onClick={() => setLang(lang === 'vi' ? 'en' : 'vi')}
          style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(8px)',
            padding: '8px 14px',
            borderRadius: 30,
            border: 'none',
            boxShadow: '0 4px 15px rgba(0,0,0,0.12)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: 13,
            color: '#1e293b',
            pointerEvents: 'auto'
          }}
        >
          <Globe size={16} color="#2563eb" />
          {lang.toUpperCase()}
        </button>
      </header>

      {/* Bản đồ */}
      <MapContainer
        center={[16.1001, 108.2778]}
        zoom={17}
        zoomControl={false}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />

        {userLocation && (
          <Circle
            center={userLocation}
            radius={10}
            pathOptions={{ color: '#2563eb', fillColor: '#60a5fa', fillOpacity: 0.75, weight: 2 }}
          />
        )}

        {poiData.map((poi) => (
          <Marker
            key={poi.id}
            position={poi.coords}
            icon={createCustomMarker(activePOI?.id === poi.id)}
            eventHandlers={{ click: () => setActivePOI(poi) }}
          />
        ))}
      </MapContainer>

      {/* Khung thông tin POI & Nút giọng nói thuyết minh */}
      {activePOI && (
        <section style={{
          position: 'absolute',
          bottom: 24,
          left: 16,
          right: 16,
          background: 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(12px)',
          borderRadius: 20,
          padding: 18,
          zIndex: 1000,
          boxShadow: '0 12px 30px rgba(0,0,0,0.2)',
          maxHeight: '48vh',
          overflowY: 'auto'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#2563eb' }}>
                {lang === 'vi' ? 'Điểm tham quan' : 'Point of Interest'}
              </span>
              <h3 style={{ margin: '2px 0 0', fontSize: 18, color: '#0f172a', fontWeight: 700 }}>
                {activePOI.translations[lang].title}
              </h3>
            </div>
            <button
              onClick={() => setActivePOI(null)}
              style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <X size={16} color="#64748b" />
            </button>
          </div>

          <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.55, margin: '0 0 14px' }}>
            {activePOI.translations[lang].description}
          </p>

          {/* Nút bấm nghe giọng đọc thuyết minh AI */}
          <button
            onClick={toggleVoice}
            style={{
              width: '100%',
              padding: '12px',
              background: isPlayingVoice ? '#ef4444' : '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'background 0.2s'
            }}
          >
            {isPlayingVoice ? (
              <>
                <Square size={18} fill="#fff" />
                {lang === 'vi' ? 'Dừng đọc thuyết minh' : 'Stop Narration'}
              </>
            ) : (
              <>
                <Volume2 size={18} />
                {lang === 'vi' ? 'Phát giọng đọc thuyết minh' : 'Play Audio Narration'}
              </>
            )}
          </button>
        </section>
      )}

      {/* Chatbot */}
      <button
        onClick={() => setShowChat(!showChat)}
        style={{
          position: 'absolute',
          bottom: 24,
          right: 16,
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
          color: '#fff',
          border: 'none',
          display: activePOI ? 'none' : 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(37, 99, 235, 0.4)'
        }}
      >
        <MessageSquare size={24} />
      </button>

      {showChat && (
        <section style={{
          position: 'absolute',
          bottom: 86,
          right: 16,
          width: 310,
          background: '#ffffff',
          borderRadius: 20,
          padding: 16,
          zIndex: 1000,
          boxShadow: '0 12px 35px rgba(0,0,0,0.22)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottom: '1px solid #e2e8f0', paddingBottom: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>Linh Ứng AI</span>
            <button onClick={() => setShowChat(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              <X size={16} color="#64748b" />
            </button>
          </div>

          <div style={{ height: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  background: msg.sender === 'user' ? '#2563eb' : '#f1f5f9',
                  color: msg.sender === 'user' ? '#fff' : '#1e293b',
                  padding: '8px 12px',
                  borderRadius: 14,
                  fontSize: 13,
                  maxWidth: '85%'
                }}
              >
                {msg.text}
              </div>
            ))}
          </div>

          <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: 6, marginTop: 12 }}>
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Đặt câu hỏi..."
              style={{ flex: 1, padding: '8px 12px', borderRadius: 12, border: '1px solid #cbd5e1', fontSize: 13 }}
            />
            <button type="submit" style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 12, padding: '0 12px', cursor: 'pointer' }}>
              <Send size={16} />
            </button>
          </form>
        </section>
      )}
    </div>
  );
}