import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Compass, 
  MapPin, 
  Volume2, 
  Square, 
  Heart, 
  Info, 
  Globe, 
  Ship, 
  MessageSquare, 
  Send, 
  X, 
  Sparkles,
  Navigation
} from 'lucide-react';
import { heritageSites, aiKnowledgeBase } from './data';

// Công thức Haversine tính khoảng cách giữa 2 toạ độ GPS (đơn vị: mét)
function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Bán kính trái đất (m)
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

function MapController({ centerCoords }) {
  const map = useMap();

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);
    return () => clearTimeout(timer);
  }, [map]);

  useEffect(() => {
    if (centerCoords) {
      map.flyTo(centerCoords, 14, { animate: true, duration: 1.2 });
    }
  }, [centerCoords, map]);

  return null;
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('access_token') || null);
  const [lang, setLang] = useState('vi');
  const [activeTab, setActiveTab] = useState('explore');
  const [selectedSite, setSelectedSite] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [favorites, setFavorites] = useState([2, 5]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  
  // Toạ độ mặc định của tàu
  const [boatCoords, setBoatCoords] = useState([20.8932, 107.0725]);
  const [lastTriggeredSiteId, setLastTriggeredSiteId] = useState(null);
  
  // Chatbot State
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([
    { sender: 'bot', text: 'Xin chào quý khách! Tôi là trợ lý AI Vịnh Hạ Long. Bạn cần tìm hiểu thông tin gì về các hòn đảo hay giá vé tham quan?' }
  ]);
  const [inputMsg, setInputMsg] = useState('');

  // Audio Speech Synthesis
  const playAudio = (site) => {
    window.speechSynthesis.cancel();
    const text = lang === 'vi' ? site.audioText.vi : site.audioText.en;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'vi' ? 'vi-VN' : 'en-US';
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);
    setIsPlaying(true);
    window.speechSynthesis.speak(utterance);
  };

  const stopAudio = () => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
  };

  const handleSelectSite = (site) => {
    setSelectedSite(site);
    playAudio(site);
  };

  // TỰ ĐỘNG KÍCH HOẠT THUYẾT MINH KHI TÀU TIẾN VÀO BÁN KÍNH GPS (GEOFENCING)
  useEffect(() => {
    const [bLat, bLng] = boatCoords;
    for (const site of heritageSites) {
      const distance = getDistanceMeters(bLat, bLng, site.lat, site.lng);
      if (distance <= site.rangeMeters) {
        if (lastTriggeredSiteId !== site.id) {
          setLastTriggeredSiteId(site.id);
          setSelectedSite(site);
          playAudio(site);
        }
        return;
      }
    }
  }, [boatCoords]);

  const toggleFavorite = (id) => {
    setFavorites(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  // Mô phỏng di chuyển thuyền vào thẳng vùng quét của Đảo Ti Tốp
  const simulateBoatGps = () => {
    const titopSite = heritageSites.find(s => s.id === 5);
    if (titopSite) {
      // Đặt thuyền cách Ti Tốp 150m (nằm lọt trong bán kính 600m của đảo)
      setBoatCoords([titopSite.lat + 0.001, titopSite.lng + 0.001]);
    }
  };

  const handleSendChat = () => {
    if (!inputMsg.trim()) return;
    const userText = inputMsg;
    const newChat = [...messages, { sender: 'user', text: userText }];
    setMessages(newChat);
    setInputMsg('');

    setTimeout(() => {
      let reply = lang === 'vi' 
        ? "Tôi có thể giải đáp về Hòn Trống Mái, Đỉnh Hương, Đảo Ti Tốp hoặc giá vé tham quan nhé!"
        : "I can help with questions about Fighting Cocks, Ti Top island, and tour tickets!";
      const q = userText.toLowerCase();
      for (const item of aiKnowledgeBase) {
        if (item.keywords.some(k => q.includes(k))) {
          reply = lang === 'vi' ? item.answerVi : item.answerEn;
          break;
        }
      }
      setMessages([...newChat, { sender: 'bot', text: reply }]);
    }, 400);
  };

  const filteredSites = heritageSites.filter(site => {
    const matchSearch = site.nameVi.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        site.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = categoryFilter === 'All' || site.categoryKey === categoryFilter;
    return matchSearch && matchCat;
  });

  if (!token) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center', background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)' }}>
        <div style={{ width: 72, height: 72, background: 'rgba(2, 132, 199, 0.2)', border: '1px solid #0284c7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <Ship size={36} color="#38bdf8" />
        </div>
        <h1 style={{ fontSize: 24, fontWeight: '800', marginBottom: 8, color: '#fff' }}>HẠ LONG SMARTGUIDE</h1>
        <p style={{ color: '#94a3b8', fontSize: 14, maxWidth: 320, marginBottom: 28 }}>
          Hệ thống thuyết minh tự động GPS và hướng dẫn viên AI đa ngôn ngữ tại Di sản Vịnh Hạ Long.
        </p>

        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 16, padding: 20, width: '100%', maxWidth: 340, textAlign: 'left', marginBottom: 24, color: '#f8fafc' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, fontSize: 13 }}>
            <Compass size={18} color="#38bdf8" /> Định vị thuyền & bán kính Geofence tự động
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, fontSize: 13 }}>
            <Volume2 size={18} color="#f59e0b" /> Thuyết minh 7 danh thắng độc quyền
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
            <Sparkles size={18} color="#22c55e" /> Trợ lý AI giải đáp lịch sử & giá vé
          </div>
        </div>

        <button
          onClick={() => {
            localStorage.setItem('access_token', 'TOKEN_HALONG_VIP');
            setToken('TOKEN_HALONG_VIP');
          }}
          style={{ width: '100%', maxWidth: 340, background: '#0284c7', color: 'white', border: 'none', borderRadius: 12, padding: '16px', fontSize: 15, fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 15px rgba(2, 132, 199, 0.4)' }}
        >
          Kích Hoạt Thẻ Du Khách (Mở Khóa)
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', backgroundColor: '#0f172a', color: '#f8fafc' }}>
      
      <style>{`
        .custom-leaflet-container {
          background: transparent !important;
          border: none !important;
        }
        .poi-pulse-marker {
          position: relative;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .poi-pulse-marker .core-dot {
          width: 14px;
          height: 14px;
          background-color: #0284c7;
          border: 2px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 0 8px rgba(2, 132, 199, 0.8);
          z-index: 2;
          transition: transform 0.2s ease, background-color 0.2s ease;
        }
        .poi-pulse-marker.active .core-dot {
          background-color: #ef4444;
          transform: scale(1.3);
          box-shadow: 0 0 12px rgba(239, 68, 68, 0.9);
        }
        .poi-pulse-marker .pulse-ring {
          position: absolute;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background-color: rgba(2, 132, 199, 0.45);
          animation: radar-pulse 2s infinite ease-out;
          z-index: 1;
        }
        .poi-pulse-marker.active .pulse-ring {
          background-color: rgba(239, 68, 68, 0.55);
          animation-duration: 1.2s;
        }
        @keyframes radar-pulse {
          0% { transform: scale(0.3); opacity: 1; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        .custom-boat-marker {
          background: #10b981;
          border: 2px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 0 10px #10b981;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
        }
      `}</style>

      {/* TOP HEADER */}
      <header style={{ position: 'sticky', top: 0, zIndex: 1000, background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #334155', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Ship size={20} color="#38bdf8" />
          <strong style={{ fontSize: 15, color: '#f8fafc' }}>Hạ Long SmartGuide</strong>
          <span style={{ fontSize: 10, background: '#064e3b', color: '#34d399', padding: '2px 6px', borderRadius: 10, fontWeight: 'bold' }}>Geofence Active</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setLang(lang === 'vi' ? 'en' : 'vi')} style={{ background: '#334155', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 10px', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Globe size={14} /> {lang.toUpperCase()}
          </button>
          <button onClick={() => setChatOpen(true)} style={{ background: '#0284c7', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 10px', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <MessageSquare size={14} /> Hỏi AI
          </button>
        </div>
      </header>

      {/* VIEWPORT BODY */}
      <div style={{ flex: 1, position: 'relative', overflowY: activeTab === 'map' ? 'hidden' : 'auto' }}>
        
        {/* TAB 1: KHÁM PHÁ (EXPLORE POIs) */}
        {activeTab === 'explore' && (
          <div style={{ padding: '16px', paddingBottom: '90px' }}>
            <div style={{ background: 'linear-gradient(135deg, #0284c7, #0369a1)', borderRadius: 16, padding: 18, color: '#fff', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 4 }}>Vịnh Hạ Long - Quảng Ninh</h2>
              <p style={{ fontSize: 13, opacity: 0.9 }}>Hệ thống thuyết minh tự động GPS và hướng dẫn đa ngôn ngữ.</p>
            </div>

            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm hòn đá, đảo, biểu tượng..."
              style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 13, marginBottom: 12, outline: 'none' }}
            />

            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 10, marginBottom: 10 }}>
              {['All', 'Iconic', 'Unique Rock', 'Island', 'Natural'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 20,
                    border: '1px solid #334155',
                    background: categoryFilter === cat ? '#0284c7' : '#1e293b',
                    color: '#fff',
                    fontSize: 12,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {cat === 'All' ? 'Tất cả' : cat}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {filteredSites.map(site => (
                <div key={site.id} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 16, overflow: 'hidden' }}>
                  <div style={{ position: 'relative', height: 160 }}>
                    <img src={site.image} alt={site.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button
                      onClick={() => toggleFavorite(site.id)}
                      style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', color: favorites.includes(site.id) ? '#ef4444' : '#fff', cursor: 'pointer' }}
                    >
                      <Heart size={18} fill={favorites.includes(site.id) ? '#ef4444' : 'none'} />
                    </button>
                  </div>
                  <div style={{ padding: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                      <strong style={{ fontSize: 16 }}>{lang === 'vi' ? site.nameVi : site.name}</strong>
                      <span style={{ fontSize: 11, color: '#38bdf8' }}>Bán kính: {site.rangeMeters}m</span>
                    </div>
                    <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.4, marginBottom: 12 }}>
                      {lang === 'vi' ? site.shortDescVi : site.shortDescEn}
                    </p>
                    <button
                      onClick={() => handleSelectSite(site)}
                      style={{ width: '100%', background: '#0284c7', color: '#fff', border: 'none', borderRadius: 8, padding: 10, fontSize: 13, fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer' }}
                    >
                      <Volume2 size={16} /> Nghe Thuyết Minh ({lang === 'vi' ? site.durationVi : site.durationEn})
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: BẢN ĐỒ VỊ TRÍ (MAP) */}
        {activeTab === 'map' && (
          <div style={{ position: 'relative', width: '100%', height: 'calc(100vh - 125px)' }}>
            {/* ĐOẠN MỚI: Chọn điểm nào thuyền tự chạy tới điểm đó */}
<div style={{ position: 'absolute', top: 12, left: 12, zIndex: 1000, display: 'flex', alignItems: 'center', gap: 8, background: '#1e293b', border: '1px solid #334155', borderRadius: 20, padding: '6px 12px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
  <Navigation size={16} color="#22c55e" />
  <span style={{ fontSize: 12, fontWeight: 'bold', color: '#94a3b8' }}>Lái thuyền đến:</span>
  <select
    onChange={(e) => {
      const siteId = Number(e.target.value);
      const targetSite = heritageSites.find(s => s.id === siteId);
      if (targetSite) {
        // Cho thuyền đến sát tâm danh thắng (cách ~100m, lọt hẳn vào bán kính Geofence)
        setBoatCoords([targetSite.lat + 0.0008, targetSite.lng + 0.0008]);
      }
    }}
    style={{
      background: '#0f172a',
      color: '#38bdf8',
      border: '1px solid #475569',
      borderRadius: 12,
      padding: '4px 8px',
      fontSize: 12,
      fontWeight: 'bold',
      outline: 'none',
      cursor: 'pointer'
    }}
  >
    <option value="">-- Chọn danh thắng --</option>
    {heritageSites.map(site => (
      <option key={site.id} value={site.id}>
        {lang === 'vi' ? site.nameVi : site.name}
      </option>
    ))}
  </select>
</div>
            <MapContainer center={[20.8900, 107.0900]} zoom={12} style={{ width: '100%', height: '100%' }} zoomControl={false}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              
              {/* Vòng tròn bán kính Geofence của từng danh thắng */}
              {heritageSites.map(site => (
                <React.Fragment key={`geo-${site.id}`}>
                  <Circle
                    center={[site.lat, site.lng]}
                    radius={site.rangeMeters}
                    pathOptions={{
                      color: selectedSite?.id === site.id ? '#ef4444' : '#0284c7',
                      fillColor: selectedSite?.id === site.id ? '#ef4444' : '#38bdf8',
                      fillOpacity: 0.15,
                      weight: 1.5,
                      dashArray: '4, 4'
                    }}
                  />
                  <Marker
                    position={[site.lat, site.lng]}
                    icon={L.divIcon({
                      className: 'custom-leaflet-container',
                      html: `
                        <div class="poi-pulse-marker ${selectedSite?.id === site.id ? 'active' : ''}">
                          <div class="pulse-ring"></div>
                          <div class="core-dot"></div>
                        </div>
                      `,
                      iconSize: [32, 32],
                      iconAnchor: [16, 16]
                    })}
                    eventHandlers={{ click: () => handleSelectSite(site) }}
                  >
                    <Popup>
                      <div style={{ textAlign: 'center', color: '#0f172a' }}>
                        <strong>{lang === 'vi' ? site.nameVi : site.name}</strong>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>Bán kính kích hoạt: {site.rangeMeters}m</div>
                      </div>
                    </Popup>
                  </Marker>
                </React.Fragment>
              ))}

              {/* Vị trí tàu */}
              <Marker position={boatCoords} icon={L.divIcon({ className: 'custom-boat-marker', html: '⛵', iconSize: [26, 26], iconAnchor: [13, 13] })}>
                <Popup>Vị trí tàu du lịch của bạn (Đang quét GPS)</Popup>
              </Marker>
              
              <MapController centerCoords={boatCoords} />
            </MapContainer>
          </div>
        )}

        {/* TAB 3: DANH SÁCH YÊU THÍCH (FAVORITES) */}
        {activeTab === 'favorites' && (
          <div style={{ padding: '16px', paddingBottom: '90px' }}>
            <h2 style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 4 }}>Danh Thắng Đã Lưu</h2>
            <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 16 }}>Các hòn đảo bạn đã thả tim để nghe lại bất cứ lúc nào.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {heritageSites.filter(s => favorites.includes(s.id)).map(site => (
                <div key={site.id} style={{ display: 'flex', gap: 12, background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: 10, alignItems: 'center' }}>
                  <img src={site.image} alt={site.name} style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover' }} />
                  <div style={{ flex: 1 }}>
                    <strong style={{ fontSize: 14 }}>{lang === 'vi' ? site.nameVi : site.name}</strong>
                    <div style={{ fontSize: 12, color: '#38bdf8' }}>Bán kính: {site.rangeMeters}m</div>
                  </div>
                  <button onClick={() => handleSelectSite(site)} style={{ background: '#0284c7', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 12px', fontSize: 12, cursor: 'pointer' }}>
                    <Volume2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: THÔNG TIN (ABOUT) */}
        {activeTab === 'about' && (
          <div style={{ padding: '20px 16px', paddingBottom: '90px' }}>
            <h2 style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>Hệ Thống Thuyết Minh GPS Vịnh Hạ Long</h2>
            <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5, marginBottom: 16 }}>
              Ứng dụng phát triển theo đặc tả PRD phục vụ bảo tồn và số hóa trải nghiệm du lịch di sản thiên nhiên thế giới.
            </p>
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: 14, marginBottom: 16 }}>
              <div style={{ fontSize: 13, marginBottom: 6 }}><b>Trạng thái:</b> <span style={{ color: '#22c55e' }}>VIP Active</span></div>
              <div style={{ fontSize: 13 }}><b>Điểm thuyết minh:</b> 7 danh thắng</div>
            </div>
            <button
              onClick={() => { localStorage.removeItem('access_token'); setToken(null); }}
              style={{ width: '100%', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 10, padding: 12, fontWeight: 'bold', cursor: 'pointer' }}
            >
              Đăng Xuất / Đặt Lại Thẻ
            </button>
          </div>
        )}
      </div>

      {/* FLOATING AUDIO CONTROLLER */}
      {selectedSite && (
        <div style={{ position: 'fixed', bottom: 65, left: 16, right: 16, zIndex: 1200, background: '#1e293b', border: '1px solid #475569', borderRadius: 30, padding: '10px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 'bold', color: '#f8fafc' }}>{lang === 'vi' ? selectedSite.nameVi : selectedSite.name}</div>
            <div style={{ fontSize: 11, color: '#38bdf8' }}>{isPlaying ? 'Đang phát thuyết minh...' : 'Đã tạm dừng'}</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => isPlaying ? stopAudio() : playAudio(selectedSite)}
              style={{ width: 36, height: 36, borderRadius: '50%', background: '#0284c7', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              {isPlaying ? <Square size={16} /> : <Volume2 size={16} />}
            </button>
            <button
              onClick={() => { setSelectedSite(null); stopAudio(); }}
              style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* BOTTOM NAVIGATION BAR */}
      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 60, background: '#0f172a', borderTop: '1px solid #334155', display: 'flex', justifyContent: 'space-around', alignItems: 'center', zIndex: 1100 }}>
        <button onClick={() => setActiveTab('explore')} style={{ background: 'transparent', border: 'none', color: activeTab === 'explore' ? '#38bdf8' : '#94a3b8', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, cursor: 'pointer' }}>
          <Compass size={18} /> <span style={{ fontSize: 11 }}>Khám phá</span>
        </button>
        <button onClick={() => setActiveTab('map')} style={{ background: 'transparent', border: 'none', color: activeTab === 'map' ? '#38bdf8' : '#94a3b8', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, cursor: 'pointer' }}>
          <MapPin size={18} /> <span style={{ fontSize: 11 }}>Bản đồ</span>
        </button>
        <button onClick={() => setActiveTab('favorites')} style={{ background: 'transparent', border: 'none', color: activeTab === 'favorites' ? '#38bdf8' : '#94a3b8', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, cursor: 'pointer' }}>
          <Heart size={18} /> <span style={{ fontSize: 11 }}>Yêu thích</span>
        </button>
        <button onClick={() => setActiveTab('about')} style={{ background: 'transparent', border: 'none', color: activeTab === 'about' ? '#38bdf8' : '#94a3b8', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, cursor: 'pointer' }}>
          <Info size={18} /> <span style={{ fontSize: 11 }}>Cài đặt</span>
        </button>
      </nav>

      {/* POPUP CHATBOT AI */}
      {chatOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: 440, height: '70vh', background: '#1e293b', borderTopLeftRadius: 20, borderTopRightRadius: 20, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', background: '#0f172a', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={18} color="#38bdf8" />
                <strong style={{ fontSize: 14 }}>Trợ Lý AI Vịnh Hạ Long</strong>
              </div>
              <button onClick={() => setChatOpen(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ flex: 1, padding: 14, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {messages.map((m, idx) => (
                <div key={idx} style={{ alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start', background: m.sender === 'user' ? '#0284c7' : '#334155', color: '#fff', borderRadius: 12, padding: '8px 12px', fontSize: 13, maxWidth: '80%' }}>
                  {m.text}
                </div>
              ))}
            </div>
            <div style={{ padding: 10, background: '#0f172a', display: 'flex', gap: 8, borderTop: '1px solid #334155' }}>
              <input
                type="text"
                value={inputMsg}
                onChange={e => setInputMsg(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                placeholder="Hỏi về Hòn Trống Mái, giá vé, đảo Ti Tốp..."
                style={{ flex: 1, background: '#1e293b', border: '1px solid #475569', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none' }}
              />
              <button onClick={handleSendChat} style={{ background: '#0284c7', color: '#fff', border: 'none', borderRadius: 8, padding: '0 14px', cursor: 'pointer' }}>
                <Send size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}