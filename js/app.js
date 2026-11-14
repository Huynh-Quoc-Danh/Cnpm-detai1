// ==========================================
// ĐỒ ÁN: THUYẾT MINH TỰ ĐỘNG ĐA NGÔN NGỮ
// CHUẨN ĐẶC TẢ PRD - VỊNH HẠ LONG
// ==========================================

// 1. TỪ ĐIỂN DỊCH THUẬT TOÀN DIỆN CHO WEB (I18N)
const uiTranslations = {
  vi: {
    appTitle: "Hạ Long SmartGuide",
    gpsStatus: "GPS Live",
    btnAskAi: "Hỏi AI",
    passNotActive: "Chưa kích hoạt thẻ du khách",
    passActive: "Đã kích hoạt thẻ du khách VIP",
    btnEnterPass: "Nhập mã / Mua vé",
    heroTitle: "Vịnh Hạ Long - Quảng Ninh",
    heroDesc: "Hệ thống thuyết minh tự động GPS và hướng dẫn đa ngôn ngữ 15+ tại chỗ.",
    searchPlaceholder: "Tìm kiếm hòn đá, đảo, biểu tượng...",
    pillAll: "Tất cả (7)",
    pillIconic: "Biểu tượng",
    pillUnique: "Hòn kỳ thú",
    pillIsland: "Đảo Ti Tốp",
    pillNatural: "Toàn cảnh",
    radiusPrefix: "Bán kính",
    btnListenGuide: "Nghe thuyết minh",
    btnBack: "Quay lại",
    labelGpsRadius: "Bán kính GPS:",
    audioBoxBadge: "🔊 BẢN THUYẾT MINH CHUYÊN SÂU",
    labelDuration: "Thời lượng:",
    btnPlayFullAudio: "Nghe thuyết minh ngay",
    detailSectionHistory: "Huyền tích & Lịch sử hình thành",
    detailSectionGeology: "Giá trị Địa chất & Cảnh quan",
    detailSectionHighlights: "Điểm nổi bật & Dấu ấn đặc biệt",
    btnViewOnMap: "Định vị điểm này trên bản đồ",
    btnSimulateGps: "Mô phỏng vị trí thuyền du lịch (GPS)",
    labelRoute: "Lộ trình:",
    routeNone: "Không hiển thị đường đi",
    favTitle: "Danh Thắng Đã Lưu",
    favSubtitle: "Các hòn đảo bạn đã thả tim để nghe lại bất cứ lúc nào.",
    favEmpty: "Chưa có địa điểm nào được lưu.",
    aboutTitle: "Hệ Thống Thuyết Minh Tự Động GPS",
    aboutDesc: "Ứng dụng phát triển theo tài liệu đặc tả sản phẩm (PRD) cho Di sản Vịnh Hạ Long, tỉnh Quảng Ninh.",
    labelAccessCode: "Mã truy cập hiện tại:",
    statusNotActive: "Chưa kích hoạt",
    statusActive: "VIP Active (Đầy đủ chức năng)",
    labelListenedCount: "Số bài thuyết minh đã nghe:",
    unitGuides: "bài",
    btnResetAuth: "Đặt lại quyền truy cập / Đăng xuất",
    navExplore: "Khám phá",
    navMap: "Bản đồ",
    navFavorites: "Yêu thích",
    navSettings: "Cài đặt",
    playingPrefix: "Đang phát tiếng Việt",
    chatHeaderTitle: "Trợ Lý AI Vịnh Hạ Long",
    chatHeaderSubtitle: "Sẵn sàng giải đáp 24/7",
    chatInitialGreeting: "Xin chào quý khách! Tôi là hướng dẫn viên ảo AI. Bạn muốn tìm hiểu gì về các hòn đảo, truyền thuyết hay lộ trình tham quan Vịnh Hạ Long?",
    chatPlaceholder: "Hỏi về Hòn Trống Mái, giá vé, đảo Ti Tốp...",
    authModalTitle: "Kích Hoạt Quyền Thuyết Minh",
    authModalDesc: "Quét mã QR tại cổng hoặc nhập Claim Code từ nhân viên để mở khóa toàn bộ thuyết minh GPS.",
    claimCodePlaceholder: "NHẬP MÃ (VÍ DỤ: HALONG)",
    btnConfirmClaim: "Xác Nhận Claim Code (Tiền mặt)",
    btnPayooOnline: "Thanh Toán Online (Cổng Payoo)",
    btnDismiss: "Để sau",
    popupDetailBtn: "📖 Xem chi tiết",
    gpsBoatLabel: "Vị trí của bạn (Thuyền du lịch)",
    gpsProximityPrompt: "[GPS Phát Hiện] Bạn đang ở ngay gần '{name}' ({dist}m). Bạn có muốn nghe thuyết minh tự động không?"
  },
  en: {
    appTitle: "Ha Long SmartGuide",
    gpsStatus: "GPS Live",
    btnAskAi: "Ask AI",
    passNotActive: "Tourist pass not activated",
    passActive: "VIP Tourist Pass Activated",
    btnEnterPass: "Enter Code / Buy Pass",
    heroTitle: "Ha Long Bay - Quang Ninh",
    heroDesc: "Automatic GPS audio narration and 15+ multilingual on-site guide.",
    searchPlaceholder: "Search islets, islands, landmarks...",
    pillAll: "All (7)",
    pillIconic: "Iconic",
    pillUnique: "Unique Rocks",
    pillIsland: "Ti Top Island",
    pillNatural: "Panoramic",
    radiusPrefix: "Radius",
    btnListenGuide: "Audio Guide",
    btnBack: "Back",
    labelGpsRadius: "GPS Radius:",
    audioBoxBadge: "🔊 IN-DEPTH AUDIO GUIDE",
    labelDuration: "Duration:",
    btnPlayFullAudio: "Play Audio Guide Now",
    detailSectionHistory: "Legends & Formation History",
    detailSectionGeology: "Geology & Landscape Values",
    detailSectionHighlights: "Highlights & Key Features",
    btnViewOnMap: "Locate on Map",
    btnSimulateGps: "Simulate Boat GPS Movement",
    labelRoute: "Route:",
    routeNone: "No route displayed",
    favTitle: "Saved Landmarks",
    favSubtitle: "Islands you have favorited to listen anytime.",
    favEmpty: "No saved landmarks yet.",
    aboutTitle: "GPS Automatic Audio Narration System",
    aboutDesc: "Application developed according to Product Requirements Document (PRD) for Ha Long Bay Heritage, Quang Ninh Province.",
    labelAccessCode: "Current Access Token:",
    statusNotActive: "Not Activated",
    statusActive: "VIP Active (Full Access)",
    labelListenedCount: "Audio guides listened:",
    unitGuides: "guides",
    btnResetAuth: "Reset Access / Log Out",
    navExplore: "Explore",
    navMap: "Map",
    navFavorites: "Favorites",
    navSettings: "Settings",
    playingPrefix: "Playing English Audio",
    chatHeaderTitle: "Ha Long Bay AI Guide",
    chatHeaderSubtitle: "24/7 Virtual Assistant",
    chatInitialGreeting: "Hello! I am your AI Virtual Tour Guide. What would you like to explore about the islets, legends, or itineraries in Ha Long Bay?",
    chatPlaceholder: "Ask about Fighting Cocks, tickets, Ti Top...",
    authModalTitle: "Activate Audio Guide Access",
    authModalDesc: "Scan QR code at the gate or enter Claim Code from staff to unlock all GPS audio guides.",
    claimCodePlaceholder: "ENTER CODE (E.G. HALONG)",
    btnConfirmClaim: "Confirm Claim Code (Cash)",
    btnPayooOnline: "Online Payment (Payoo Gateway)",
    btnDismiss: "Dismiss",
    popupDetailBtn: "📖 View Details",
    gpsBoatLabel: "Your Location (Tour Boat)",
    gpsProximityPrompt: "[GPS Detected] You are right near '{name}' ({dist}m). Would you like to play the automated audio guide?"
  }
};

// TRẠNG THÁI ỨNG DỤNG
let currentLang = localStorage.getItem('app_lang') || 'vi';
let accessToken = localStorage.getItem('access_token') || null;
let favoritesList = JSON.parse(localStorage.getItem('fav_sites')) || [1, 2];
let listenedCount = parseInt(localStorage.getItem('listened_count')) || 0;
let currentDetailSiteId = null;

// BẢN ĐỒ VÀ GPS
let leafletMap = null;
let mapMarkers = [];
let routePolyline = null;
let userGpsMarker = null;
let currentUserCoords = { lat: 20.8932, lng: 107.0725 };

// WEB SPEECH API
const synth = window.speechSynthesis;
let currentUtterance = null;
let currentPlayingSite = null;

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initLanguageToggle();
  initAuthPaywall();
  applyLanguage(currentLang); // Áp dụng ngôn ngữ cho toàn bộ trang
  initSearchAndFilter();
  initDetailViewControls();
  initChatbot();
  initAudioPlayer();
});

// ==========================================
// 2. CHUYỂN ĐỔI TOÀN BỘ NGÔN NGỮ (I18N CORE)
// ==========================================
function applyLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('app_lang', lang);
  const dict = uiTranslations[lang];

  // Cập nhật biểu tượng cờ trên nút tròn (PRD)
  const langBtn = document.getElementById('langToggleBtn');
  if (langBtn) {
    langBtn.textContent = lang === 'vi' ? 'VI' : 'EN';
  }

  // Dịch tất cả các thẻ có thuộc tính data-i18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) {
      el.textContent = dict[key];
    }
  });

  // Dịch placeholder của ô input
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (dict[key]) {
      el.placeholder = dict[key];
    }
  });

  // Cập nhật banner vé
  updateAuthBanner();

  // Render lại toàn bộ các view
  renderExploreList(heritageSites);
  populateRouteDropdown();

  if (currentDetailSiteId) {
    openPoiDetail(currentDetailSiteId);
  }
  if (document.getElementById('tab-favorites').classList.contains('active')) {
    renderFavorites();
  }
  if (leafletMap) {
    renderMapMarkers();
    updateUserGpsMarker();
  }
}

function initLanguageToggle() {
  const btn = document.getElementById('langToggleBtn');
  btn.addEventListener('click', () => {
    const newLang = currentLang === 'vi' ? 'en' : 'vi`';
    applyLanguage(newLang);

    // Nếu đang phát thuyết minh, chuyển sang đọc ngôn ngữ mới
    if (currentPlayingSite) {
      playAudioGuide(currentPlayingSite);
    }
  });
}

// Cập nhật danh sách chọn Route theo ngôn ngữ
function populateRouteDropdown() {
  const select = document.getElementById('routeSelect');
  if (!select) return;
  const dict = uiTranslations[currentLang];
  const curVal = select.value;

  select.innerHTML = `<option value="none">${dict.routeNone}</option>`;
  recommendedRoutes.forEach(r => {
    const name = currentLang === 'vi' ? r.nameVi : r.nameEn;
    select.innerHTML += `<option value="${r.id}">${name}</option>`;
  });
  select.value = curVal || "none";
}

// ==========================================
// 3. ĐIỀU HƯỚNG TABS
// ==========================================
function initNavigation() {
  const tabs = document.querySelectorAll('.nav-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      closePoiDetail();
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const targetId = tab.getAttribute('data-target');
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      document.getElementById(targetId).classList.add('active');

      if (targetId === 'tab-map') {
        initOrUpdateMap();
      } else if (targetId === 'tab-favorites') {
        renderFavorites();
      }
    });
  });
}

// ==========================================
// 4. HIỂN THỊ DANH SÁCH POIs Ở TAB EXPLORE
// ==========================================
function renderExploreList(sites) {
  const container = document.getElementById('poiCardContainer');
  if (!container) return;
  container.innerHTML = '';
  const dict = uiTranslations[currentLang];

  sites.forEach(site => {
    const isFav = favoritesList.includes(site.id);
    const title = currentLang === 'vi' ? site.nameVi : site.name;
    const cat = currentLang === 'vi' ? site.categoryVi : site.categoryEn;
    const desc = currentLang === 'vi' ? site.shortDescVi : site.shortDescEn;
    const duration = currentLang === 'vi' ? site.durationVi : site.durationEn;

    const card = document.createElement('div');
    card.className = 'poi-card';
    card.innerHTML = `
      <div class="poi-thumb-wrapper" onclick="openPoiDetail(${site.id})">
        <img src="${site.image}" alt="${title}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=800&q=80'">
        <span class="poi-badge">${cat}</span>
        <button class="poi-fav-btn ${isFav ? 'active' : ''}" onclick="event.stopPropagation(); toggleFav(${site.id})">
          <i class="fa-solid fa-heart"></i>
        </button>
      </div>
      <div class="poi-details" onclick="openPoiDetail(${site.id})">
        <div class="poi-title-row">
          <div class="poi-title">${title}</div>
          <div class="poi-dist"><i class="fa-solid fa-compass"></i> ${dict.radiusPrefix} ${site.rangeMeters}m</div>
        </div>
        <p class="poi-desc">${desc}</p>
        <button class="poi-action-btn" onclick="event.stopPropagation(); playAudioGuide(${site.id})">
          <i class="fa-solid fa-circle-play"></i>
          <span>${dict.btnListenGuide} (${duration})</span>
        </button>
      </div>
    `;
    container.appendChild(card);
  });
}

// ==========================================
// 5. TRANG GIỚI THIỆU CHI TIẾT (DETAIL VIEW)
// ==========================================
function openPoiDetail(siteId) {
  const site = heritageSites.find(s => s.id === siteId);
  if (!site) return;

  currentDetailSiteId = siteId;
  const detailView = document.getElementById('poiDetailView');
  const title = currentLang === 'vi' ? site.nameVi : site.name;
  const province = currentLang === 'vi' ? site.provinceVi : site.provinceEn;
  const cat = currentLang === 'vi' ? site.categoryVi : site.categoryEn;
  const duration = currentLang === 'vi' ? site.durationVi : site.durationEn;
  const history = currentLang === 'vi' ? site.historyVi : site.historyEn;
  const geology = currentLang === 'vi' ? site.geologyVi : site.geologyEn;
  const highlights = currentLang === 'vi' ? site.highlightsVi : site.highlightsEn;

  document.getElementById('detailImage').src = site.image;
  document.getElementById('detailCategoryTag').textContent = cat;
  document.getElementById('detailTitle').textContent = title;
  document.getElementById('detailProvince').textContent = province;
  document.getElementById('detailRange').textContent = `${site.rangeMeters}m`;
  document.getElementById('detailDuration').textContent = duration;
  document.getElementById('detailHistory').textContent = history;
  document.getElementById('detailGeology').textContent = geology;

  const highlightsList = document.getElementById('detailHighlightsList');
  highlightsList.innerHTML = '';
  if (highlights) {
    highlights.forEach(item => {
      const li = document.createElement('li');
      li.textContent = item;
      highlightsList.appendChild(li);
    });
  }

  const favBtn = document.getElementById('detailFavToggleBtn');
  if (favoritesList.includes(site.id)) {
    favBtn.classList.add('active');
  } else {
    favBtn.classList.remove('active');
  }

  document.getElementById('detailPlayAudioBtn').onclick = () => playAudioGuide(site.id);
  
  document.getElementById('detailViewOnMapBtn').onclick = () => {
    closePoiDetail();
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.nav-tab[data-target="tab-map"]').classList.add('active');
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.getElementById('tab-map').classList.add('active');
    initOrUpdateMap();
    setTimeout(() => {
      if (leafletMap) leafletMap.flyTo([site.lat, site.lng], 14, { duration: 1.2 });
    }, 300);
  };

  detailView.classList.add('active');
  detailView.scrollTop = 0;
}

function closePoiDetail() {
  const detailView = document.getElementById('poiDetailView');
  if (detailView) detailView.classList.remove('active');
  currentDetailSiteId = null;
}

function initDetailViewControls() {
  document.getElementById('closeDetailBtn').addEventListener('click', closePoiDetail);
  document.getElementById('detailFavToggleBtn').addEventListener('click', () => {
    if (currentDetailSiteId) {
      toggleFav(currentDetailSiteId);
      const favBtn = document.getElementById('detailFavToggleBtn');
      if (favoritesList.includes(currentDetailSiteId)) {
        favBtn.classList.add('active');
      } else {
        favBtn.classList.remove('active');
      }
    }
  });
}

// ==========================================
// 6. TÌM KIẾM & BỘ LỌC
// ==========================================
function initSearchAndFilter() {
  const searchInput = document.getElementById('searchInput');
  const pills = document.querySelectorAll('#categoryPills .pill');
  let currentCat = 'All';

  const filterAction = () => {
    const q = searchInput.value.toLowerCase().trim();
    const filtered = heritageSites.filter(site => {
      const matchQ = site.name.toLowerCase().includes(q) || 
                     site.nameVi.toLowerCase().includes(q) ||
                     site.shortDescVi.toLowerCase().includes(q) ||
                     site.shortDescEn.toLowerCase().includes(q);
      const matchC = currentCat === 'All' || site.categoryKey === currentCat;
      return matchQ && matchC;
    });
    renderExploreList(filtered);
  };

  searchInput.addEventListener('input', filterAction);
  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      pills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentCat = pill.getAttribute('data-cat');
      filterAction();
    });
  });
}

// YÊU THÍCH
function toggleFav(id) {
  if (favoritesList.includes(id)) {
    favoritesList = favoritesList.filter(item => item !== id);
  } else {
    favoritesList.push(id);
  }
  localStorage.setItem('fav_sites', JSON.stringify(favoritesList));
  renderExploreList(heritageSites);
  if (document.getElementById('tab-favorites').classList.contains('active')) {
    renderFavorites();
  }
}

function renderFavorites() {
  const container = document.getElementById('favoritesFeed');
  if (!container) return;
  const dict = uiTranslations[currentLang];
  const favSites = heritageSites.filter(s => favoritesList.includes(s.id));
  container.innerHTML = '';

  if (favSites.length === 0) {
    container.innerHTML = `<p style="text-align: center; color: #94a3b8; padding: 40px 0;">${dict.favEmpty}</p>`;
    return;
  }

  favSites.forEach(site => {
    const title = currentLang === 'vi' ? site.nameVi : site.name;
    const duration = currentLang === 'vi' ? site.durationVi : site.durationEn;
    const card = document.createElement('div');
    card.className = 'poi-card';
    card.innerHTML = `
      <div class="poi-thumb-wrapper" style="height: 140px;" onclick="openPoiDetail(${site.id})">
        <img src="${site.image}" alt="${title}">
        <button class="poi-fav-btn active" onclick="event.stopPropagation(); toggleFav(${site.id})"><i class="fa-solid fa-heart"></i></button>
      </div>
      <div class="poi-details" onclick="openPoiDetail(${site.id})">
        <div class="poi-title">${title}</div>
        <button class="poi-action-btn" onclick="event.stopPropagation(); playAudioGuide(${site.id})">
          <i class="fa-solid fa-circle-play"></i>
          <span>${dict.btnListenGuide} (${duration})</span>
        </button>
      </div>
    `;
    container.appendChild(card);
  });
}

// ==========================================
// 7. THUYẾT MINH TỰ ĐỘNG (WEB SPEECH API)
// ==========================================
function playAudioGuide(siteId) {
  const site = heritageSites.find(s => s.id === siteId);
  if (!site) return;

  currentPlayingSite = siteId;
  synth.cancel();

  const textToRead = currentLang === 'vi' ? site.audioText.vi : site.audioText.en;
  currentUtterance = new SpeechSynthesisUtterance(textToRead);
  currentUtterance.lang = currentLang === 'vi' ? 'vi-VN' : 'en-US';
  currentUtterance.rate = 0.95;

  listenedCount++;
  localStorage.setItem('listened_count', listenedCount);
  const stats = document.getElementById('statsListened');
  if (stats) stats.textContent = listenedCount;

  const bar = document.getElementById('audioBar');
  const barTitle = document.getElementById('audioBarTitle');
  const barLang = document.getElementById('audioBarLang');
  
  barTitle.textContent = currentLang === 'vi' ? site.nameVi : site.name;
  barLang.textContent = uiTranslations[currentLang].playingPrefix;
  bar.classList.remove('hidden');

  currentUtterance.onend = () => {
    bar.classList.add('hidden');
    currentPlayingSite = null;
  };

  synth.speak(currentUtterance);
}

function initAudioPlayer() {
  const toggleBtn = document.getElementById('audioToggleBtn');
  const stopBtn = document.getElementById('audioStopBtn');
  const bar = document.getElementById('audioBar');

  toggleBtn.addEventListener('click', () => {
    if (synth.speaking) {
      if (synth.paused) {
        synth.resume();
        toggleBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
      } else {
        synth.pause();
        toggleBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
      }
    }
  });

  stopBtn.addEventListener('click', () => {
    synth.cancel();
    bar.classList.add('hidden');
    currentPlayingSite = null;
  });
}

// ==========================================
// 8. BẢN ĐỒ VỊ TRÍ, GPS & LỘ TRÌNH (PRD)
// ==========================================
function initOrUpdateMap() {
  setTimeout(() => {
    if (!leafletMap) {
      leafletMap = L.map('map').setView([20.8900, 107.0900], 12);

      L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        attribution: '&copy; Google Maps'
      }).addTo(leafletMap);

      document.getElementById('simulateGpsBtn').addEventListener('click', simulateGpsMovement);
      document.getElementById('routeSelect').addEventListener('change', handleRouteChange);
    } else {
      leafletMap.invalidateSize();
    }

    renderMapMarkers();
    updateUserGpsMarker();
  }, 200);
}

function renderMapMarkers() {
  mapMarkers.forEach(m => leafletMap.removeLayer(m));
  mapMarkers = [];
  const dict = uiTranslations[currentLang];

  heritageSites.forEach(site => {
    const marker = L.marker([site.lat, site.lng]).addTo(leafletMap);
    const title = currentLang === 'vi' ? site.nameVi : site.name;
    
    const rangeCircle = L.circle([site.lat, site.lng], {
      color: '#0284c7',
      fillColor: '#38bdf8',
      fillOpacity: 0.15,
      radius: site.rangeMeters
    }).addTo(leafletMap);

    marker.bindPopup(`
      <div style="text-align: center; min-width: 140px;">
        <b style="font-size: 13px;">${title}</b><br>
        <span style="font-size: 11px; color: #64748b;">${dict.labelGpsRadius} ${site.rangeMeters}m</span><br>
        <button style="margin-top: 6px; padding: 4px 10px; background: #0284c7; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 11px; font-weight: 600;" onclick="openPoiDetail(${site.id})">
          ${dict.popupDetailBtn}
        </button>
      </div>
    `);

    mapMarkers.push(marker);
    mapMarkers.push(rangeCircle);
  });
}

function updateUserGpsMarker() {
  if (userGpsMarker) leafletMap.removeLayer(userGpsMarker);

  const gpsIcon = L.divIcon({
    className: 'gps-user-icon',
    html: `<div style="width: 16px; height: 16px; background: #2563eb; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 10px rgba(37,99,235,0.8);"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });

  userGpsMarker = L.marker([currentUserCoords.lat, currentUserCoords.lng], { icon: gpsIcon }).addTo(leafletMap);
  userGpsMarker.bindTooltip(uiTranslations[currentLang].gpsBoatLabel, { permanent: true, direction: "top" });
}

function simulateGpsMovement() {
  currentUserCoords = { lat: 20.8600, lng: 107.0820 }; // Vị trí Đảo Ti Tốp
  updateUserGpsMarker();
  leafletMap.flyTo([currentUserCoords.lat, currentUserCoords.lng], 14, { duration: 1.5 });

  // Kiểm tra tiệm cận phát thông báo
  setTimeout(() => {
    const site = heritageSites.find(s => s.id === 5);
    const title = currentLang === 'vi' ? site.nameVi : site.name;
    const msg = uiTranslations[currentLang].gpsProximityPrompt
      .replace('{name}', title)
      .replace('{dist}', '80');
    
    if (confirm(msg)) {
      playAudioGuide(site.id);
    }
  }, 1600);
}

function handleRouteChange(e) {
  const routeId = e.target.value;
  if (routePolyline) leafletMap.removeLayer(routePolyline);
  if (routeId === "none") return;

  const selectedRoute = recommendedRoutes.find(r => r.id === routeId);
  if (!selectedRoute) return;

  const latlngs = selectedRoute.poiIds.map(id => {
    const site = heritageSites.find(s => s.id === id);
    return [site.lat, site.lng];
  });

  routePolyline = L.polyline(latlngs, {
    color: '#d97706',
    weight: 4,
    dashArray: '8, 8',
    opacity: 0.85
  }).addTo(leafletMap);

  leafletMap.fitBounds(routePolyline.getBounds(), { padding: [30, 30] });
}

// ==========================================
// 9. TRỢ LÝ AI CHATBOT & PAYWALL
// ==========================================
function initChatbot() {
  const openBtn = document.getElementById('openChatBtn');
  const closeBtn = document.getElementById('closeChatBtn');
  const modal = document.getElementById('chatModal');
  const sendBtn = document.getElementById('sendChatBtn');
  const input = document.getElementById('chatInput');
  const messagesBox = document.getElementById('chatMessages');

  openBtn.addEventListener('click', () => modal.classList.add('active'));
  closeBtn.addEventListener('click', () => modal.classList.remove('active'));

  const handleSend = () => {
    const userText = input.value.trim();
    if (!userText) return;

    const userMsg = document.createElement('div');
    userMsg.className = 'msg-bubble msg-user';
    userMsg.textContent = userText;
    messagesBox.appendChild(userMsg);
    input.value = '';
    messagesBox.scrollTop = messagesBox.scrollHeight;

    setTimeout(() => {
      let botResponse = currentLang === 'vi' 
        ? "Tôi có thể giải đáp chi tiết về Hòn Trống Mái, Đỉnh Hương, Đảo Ti Tốp, lịch sử Vịnh Hạ Long hoặc giá vé tham quan nhé!"
        : "I can assist you with details on Fighting Cocks, Ti Top island, ticket prices, or Ha Long legends!";

      const lower = userText.toLowerCase();
      for (const item of aiKnowledgeBase) {
        if (item.keywords.some(kw => lower.includes(kw))) {
          botResponse = currentLang === 'vi' ? item.answerVi : item.answerEn;
          break;
        }
      }

      const botMsg = document.createElement('div');
      botMsg.className = 'msg-bubble msg-bot';
      botMsg.textContent = botResponse;
      messagesBox.appendChild(botMsg);
      messagesBox.scrollTop = messagesBox.scrollHeight;
    }, 400);
  };

  sendBtn.addEventListener('click', handleSend);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSend();
  });
}

function initAuthPaywall() {
  const authModal = document.getElementById('authModal');
  const openBtn = document.getElementById('openAuthModalBtn');
  const closeBtn = document.getElementById('closeAuthModalBtn');
  const submitClaimBtn = document.getElementById('submitClaimCodeBtn');
  const onlinePayBtn = document.getElementById('simulateOnlinePayBtn');
  const claimInput = document.getElementById('claimCodeInput');

  openBtn.addEventListener('click', () => authModal.classList.add('active'));
  closeBtn.addEventListener('click', () => authModal.classList.remove('active'));

  submitClaimBtn.addEventListener('click', () => {
    const code = claimInput.value.trim().toUpperCase();
    if (code.length >= 4) {
      accessToken = `TOKEN_${code}_${Date.now()}`;
      localStorage.setItem('access_token', accessToken);
      authModal.classList.remove('active');
      updateAuthBanner();
      alert(currentLang === 'vi' ? `Kích hoạt thành công mã "${code}"!` : `Claim code "${code}" successfully activated!`);
    } else {
      alert(currentLang === 'vi' ? "Vui lòng nhập mã hợp lệ (ví dụ: HALONG)" : "Please enter a valid code (e.g. HALONG)");
    }
  });

  onlinePayBtn.addEventListener('click', () => {
    accessToken = `PAYOO_PAID_${Date.now()}`;
    localStorage.setItem('access_token', accessToken);
    authModal.classList.remove('active');
    updateAuthBanner();
    alert(currentLang === 'vi' ? "Thanh toán Payoo thành công! Đã kích hoạt thẻ du khách VIP." : "Payoo payment successful! VIP Tourist Pass activated.");
  });
}

function updateAuthBanner() {
  const banner = document.getElementById('authBanner');
  const display = document.getElementById('currentAccessDisplay');
  const stats = document.getElementById('statsListened');
  const dict = uiTranslations[currentLang];

  if (stats) stats.textContent = listenedCount;

  if (accessToken) {
    banner.style.background = "#ecfdf5";
    banner.style.color = "#047857";
    banner.innerHTML = `<span><i class="fa-solid fa-circle-check"></i> ${dict.passActive}</span>`;
    if (display) display.textContent = dict.statusActive;
  } else {
    banner.style.background = "#fffbeb";
    banner.style.color = "#b45309";
    banner.innerHTML = `
      <span id="authBannerText"><i class="fa-solid fa-ticket"></i> ${dict.passNotActive}</span>
      <button class="unlock-action-btn" id="openAuthModalBtn">${dict.btnEnterPass}</button>
    `;
    const openBtn = document.getElementById('openAuthModalBtn');
    if (openBtn) {
      openBtn.addEventListener('click', () => document.getElementById('authModal').classList.add('active'));
    }
    if (display) display.textContent = dict.statusNotActive;
  }
}

function resetAppAccess() {
  localStorage.removeItem('access_token');
  accessToken = null;
  location.reload();
}