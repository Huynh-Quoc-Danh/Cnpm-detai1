// Import trực tiếp các file ảnh trong thư mục src/image
import imgVinhHaLong from './image/vinhhalong.jpg';
import imgHonTrongMai from './image/HonTrongMai.jpg';
import imgDinhHuong from './image/hondinhluhuong.jpg';
import imgChoDa from './image/HonChoDa.jpg';
import imgTiTop from './image/dao-titop.jpg';
import imgConCoc from './image/hon-con-coc.jpg';
import imgThienNga from './image/hon-thien-nga.jpg';

export const heritageSites = [
  {
    id: 1,
    name: "Ha Long Bay (Panoramic Overview)",
    nameVi: "Toàn cảnh Vịnh Hạ Long",
    provinceEn: "Quang Ninh, Vietnam",
    provinceVi: "Quảng Ninh, Việt Nam",
    categoryEn: "Natural",
    categoryVi: "Toàn cảnh",
    categoryKey: "Natural",
    durationEn: "6 min",
    durationVi: "6 phút",
    image: imgVinhHaLong,
    lat: 20.9101,
    lng: 107.1839,
    rangeMeters: 1000,
    shortDescVi: "Kỳ quan thiên nhiên thế giới với gần 2.000 đảo đá vôi nổi bật trên làn nước màu ngọc bích.",
    shortDescEn: "World Natural Wonder featuring nearly 2,000 limestone islands emerging from emerald waters.",
    historyVi: "Theo truyền thuyết, đàn Rồng trời hạ phàm phun châu ngọc hóa thành ngàn vạn đảo đá chặn thuyền giặc. Nơi Rồng Mẹ đáp xuống được gọi là Hạ Long.",
    historyEn: "Legend tells that Mother Dragon and her offspring descended, spitting pearls that turned into towering islands to defend Vietnam.",
    geologyVi: "Hình mẫu độc nhất vô nhị về địa hình Karst nhiệt đới ngập nước, trải qua tiến hóa địa chất hơn 500 triệu năm.",
    geologyEn: "A prime example of submerged tropical karst landscapes evolving across 500 million years.",
    highlightsVi: ["2 lần UNESCO vinh danh", "Kỳ quan New7Wonders", "Hơn 60 hang động huyền ảo"],
    highlightsEn: ["Twice UNESCO inscribed", "New7Wonders of Nature", "Over 60 mystical caves"],
    audioText: {
      vi: "Chào mừng quý khách đến với Vịnh Hạ Long, di sản thiên nhiên thế giới tại tỉnh Quảng Ninh. Nơi đây ôm trọn gần 2.000 hòn đảo đá vôi kỳ vĩ muôn hình vạn trạng.",
      en: "Welcome to Ha Long Bay, an extraordinary UNESCO World Natural Heritage site in Vietnam with nearly 2,000 limestone karsts."
    }
  },
  {
    id: 2,
    name: "Fighting Cocks Islet",
    nameVi: "Hòn Trống Mái (Hòn Gà Chọi)",
    provinceEn: "Ha Long Bay, Quang Ninh",
    provinceVi: "Vịnh Hạ Long, Quảng Ninh",
    categoryEn: "Iconic",
    categoryVi: "Biểu tượng",
    categoryKey: "Iconic",
    durationEn: "5 min",
    durationVi: "5 phút",
    image: imgHonTrongMai,
    lat: 20.8932,
    lng: 107.0725,
    rangeMeters: 400,
    shortDescVi: "Biểu tượng bất hủ của du lịch Việt Nam, đôi gà chọi sừng sững giữa sóng nước.",
    shortDescEn: "Timeless emblem of Vietnamese tourism, depicting two roosters facing each other in affection.",
    historyVi: "Hai khối đá cao hơn 12 mét vươn lên giữa làn nước xanh biếc, biểu trưng cho tình yêu lứa đôi chung thủy.",
    historyEn: "Two 12-meter limestone karsts resembling a pair of roosters, symbolizing enduring fidelity.",
    geologyVi: "Chân đá bị thủy triều ăn mòn hàng triệu năm tạo thế đứng thắt eo chênh vênh nhưng kiên cố.",
    geologyEn: "Their narrow pedestals weathered by waves over millennia create an exquisite natural balance.",
    highlightsVi: ["Biểu tượng logo du lịch Việt Nam", "Đẹp nhất vào lúc hoàng hôn"],
    highlightsEn: ["Official Vietnam tourism emblem", "Magnificent at sunset"],
    audioText: {
      vi: "Quý khách đang hướng tầm mắt về Hòn Trống Mái, biểu tượng bất hủ của du lịch Hạ Long với hai khối đá đứng tựa như cặp gà chọi âu yếm.",
      en: "You are looking at Fighting Cocks Islet, the timeless symbol of Ha Long Bay resembling a giant rooster and hen facing each other."
    }
  },
  {
    id: 3,
    name: "Incense Burner Islet",
    nameVi: "Hòn Đỉnh Hương (Hòn Lư Hương)",
    provinceEn: "Ha Long Bay, Quang Ninh",
    provinceVi: "Vịnh Hạ Long, Quảng Ninh",
    categoryEn: "Iconic",
    categoryVi: "Biểu tượng",
    categoryKey: "Iconic",
    durationEn: "4 min",
    durationVi: "4 phút",
    image: imgDinhHuong,
    lat: 20.8998,
    lng: 107.0658,
    rangeMeters: 400,
    shortDescVi: "Khối đá khổng lồ mang dáng hình chiếc lư hương cúng tế đất trời giữa biển khơi.",
    shortDescEn: "Massive stone formation shaped like a sacred incense burner offering gratitude to heaven.",
    historyVi: "Hòn Đỉnh Hương đứng chắn luồng lạch thuyền bè như chiếc lư hương đá tạ ơn trời đất chở che ngư dân.",
    historyEn: "Incense Burner Islet stands as an imposing stone censer, honoring heaven for protecting seafarers.",
    geologyVi: "Khối đá phiến vôi mỏng nguyên khối dựng đứng, chân đá thon hẹp.",
    geologyEn: "Monolithic limestone block showcasing marine karst selective erosion.",
    highlightsVi: ["In trên tờ tiền polymer 200.000 VNĐ", "Cột mốc linh thiêng của ngư dân"],
    highlightsEn: ["Printed on 200,000 VND banknote", "Sacred nautical landmark"],
    audioText: {
      vi: "Trước mắt quý khách là Hòn Đỉnh Hương, danh thắng nổi tiếng được in trang trọng trên tờ tiền 200.000 đồng Việt Nam.",
      en: "Before you stands Incense Burner Islet, famously depicted on Vietnam's 200,000 Dong banknote."
    }
  },
  {
    id: 4,
    name: "Stone Dog Islet",
    nameVi: "Hòn Chó Đá",
    provinceEn: "Ha Long Bay, Quang Ninh",
    provinceVi: "Vịnh Hạ Long, Quảng Ninh",
    categoryEn: "Unique Rock",
    categoryVi: "Hòn kỳ thú",
    categoryKey: "Unique Rock",
    durationEn: "4 min",
    durationVi: "4 phút",
    image: imgChoDa,
    lat: 20.9125,
    lng: 107.0583,
    rangeMeters: 350,
    shortDescVi: "Khối núi đá hình chú chó ngồi canh gác bình yên cho các đoàn tàu qua lại.",
    shortDescEn: "An 8-meter stone pillar resembling a faithful watchdog guarding the maritime passage.",
    historyVi: "Người lính gác phong thủy bảo vệ bình yên cho các chuyến tàu vượt biển.",
    historyEn: "Traditionally symbolizes guardian protection for seafarers over generations.",
    geologyVi: "Sự hòa tan đá vôi tạo nên hình thù tượng hình động vật độc đáo.",
    geologyEn: "Selective dissolution carved this lifelike animal silhouette.",
    highlightsVi: ["Tín ngưỡng chó đá phong thủy", "Điểm check-in tuyến 1"],
    highlightsEn: ["Guardian stone dog custom", "Iconic photo-stop on route 1"],
    audioText: {
      vi: "Hòn Chó Đá cao khoảng 8 mét, mang hình tượng chú chó đá ngồi canh giữ bình yên cho những chuyến tàu vượt biển.",
      en: "Stone Dog Islet is an 8-meter limestone pillar resembling a watchful guardian dog bringing good fortune."
    }
  },
  {
    id: 5,
    name: "Ti Top Island",
    nameVi: "Đảo Ti Tốp",
    provinceEn: "Ha Long Bay, Quang Ninh",
    provinceVi: "Vịnh Hạ Long, Quảng Ninh",
    categoryEn: "Island",
    categoryVi: "Đảo Ti Tốp",
    categoryKey: "Island",
    durationEn: "5 min",
    durationVi: "5 phút",
    image: imgTiTop,
    lat: 20.8597,
    lng: 107.0815,
    rangeMeters: 600,
    shortDescVi: "Hòn đảo với bãi cát vầng trăng khuyết và đỉnh núi ngắm toàn cảnh 360 độ Vịnh Hạ Long.",
    shortDescEn: "Scenic island featuring a crescent sandy beach and a 360-degree panoramic summit.",
    historyVi: "Năm 1962, Chủ tịch Hồ Chí Minh cùng nhà du hành vũ trụ Gherman Titov đã lên thăm và đặt tên đảo.",
    historyEn: "Named in 1962 by President Ho Chi Minh to honor Soviet cosmonaut Gherman Titov.",
    geologyVi: "Đảo đá dốc đứng, dòng hải lưu bồi đắp bãi cát trắng mịn hình vầng trăng khuyết.",
    geologyEn: "A steep karst cliff bordered by a wave-deposited crescent white sandy beach.",
    highlightsVi: ["Hơn 400 bậc đá lên đài quan sát", "Bãi tắm nước trong xanh"],
    highlightsEn: ["Over 400 stone steps to summit", "Crescent swimming beach"],
    audioText: {
      vi: "Đảo Ti Tốp nổi tiếng với bãi tắm trăng khuyết và đài quan sát đỉnh núi nhìn toàn cảnh 360 độ kỳ quan Hạ Long.",
      en: "Ti Top Island is famous for its crescent beach and summit offering a breathtaking 360-degree panorama of Ha Long Bay."
    }
  },
  {
    id: 6,
    name: "Toad Islet",
    nameVi: "Hòn Con Cóc",
    provinceEn: "Ha Long Bay, Quang Ninh",
    provinceVi: "Vịnh Hạ Long, Quảng Ninh",
    categoryEn: "Unique Rock",
    categoryVi: "Hòn kỳ thú",
    categoryKey: "Unique Rock",
    durationEn: "4 min",
    durationVi: "4 phút",
    image: imgConCoc,
    lat: 20.8710,
    lng: 107.1120,
    rangeMeters: 400,
    shortDescVi: "Khối đá hình chú cóc ngóng trời, tích Con cóc là cậu ông Trời.",
    shortDescEn: "Natural karst resembling a giant toad gazing into the sky.",
    historyVi: "Gắn liền với truyện dân gian ca ngợi chú cóc dũng cảm đòi mưa cứu muôn loài.",
    historyEn: "Reflects the Vietnamese folklore tale of the brave toad petitioning heaven for rain.",
    geologyVi: "Khối đá sót vôi nhô cao giữa mặt biển phẳng lặng.",
    geologyEn: "An isolated remnant karst peak sculpted by wind and waves.",
    highlightsVi: ["Hình thù sinh động", "Nằm trên tuyến đi hang Sửng Sốt"],
    highlightsEn: ["Vivid animal silhouette", "Cruise route towards Sung Sot Cave"],
    audioText: {
      vi: "Hòn Con Cóc cao 9 mét trông hệt như một chú cóc khổng lồ ngồi ngóng trời cầu mưa thuận gió hòa.",
      en: "Toad Islet stands 9 meters tall, looking like a giant toad gazing skyward."
    }
  },
  {
    id: 7,
    name: "Swan Islet",
    nameVi: "Hòn Thiên Nga",
    provinceEn: "Ha Long Bay, Quang Ninh",
    provinceVi: "Vịnh Hạ Long, Quảng Ninh",
    categoryEn: "Unique Rock",
    categoryVi: "Hòn kỳ thú",
    categoryKey: "Unique Rock",
    durationEn: "4 min",
    durationVi: "4 phút",
    image: imgThienNga,
    lat: 20.8870,
    lng: 107.1450,
    rangeMeters: 400,
    shortDescVi: "Khối đá vôi với dáng hình chú thiên nga kiêu sa đang bơi lội trên sóng biếc.",
    shortDescEn: "Graceful limestone curve resembling an elegant swan floating upon the emerald bay.",
    historyVi: "Đường nét uốn lượn như cổ chú thiên nga duyên dáng rỉa lông trên mặt biển.",
    historyEn: "Features a graceful swan outline preening feathers in emerald waters.",
    geologyVi: "Đá vôi bị gió biển bào mòn thành hình vòm cong thanh mảnh.",
    geologyEn: "Marine erosion created this delicate, curved limestone outline.",
    highlightsVi: ["Điểm chụp ảnh phong cảnh lãng mạn", "Nét trữ tình của thiên nhiên"],
    highlightsEn: ["Romantic photo destination", "Poetic natural setting"],
    audioText: {
      vi: "Hòn Thiên Nga mang dáng dấp chú chim thiên nga kiêu sa đang bơi lội giữa làn nước xanh biếc.",
      en: "Swan Islet captures the poetic spirit of Ha Long nature, resembling a majestic swan."
    }
  }
];

export const aiKnowledgeBase = [
  {
    keywords: ["trống mái", "gà chọi", "fighting cock"],
    answerVi: "Hòn Trống Mái gồm 2 khối đá cao hơn 12m đối diện nhau, biểu tượng của tình yêu thủy chung và là logo du lịch Việt Nam.",
    answerEn: "Fighting Cocks Islet features two 12m limestone pillars resembling roosters, the national emblem of Vietnamese tourism."
  },
  {
    keywords: ["đỉnh hương", "lư hương", "200"],
    answerVi: "Hòn Đỉnh Hương mang hình chiếc lư hương cúng tế đất trời, được in trên tờ tiền 200.000 đồng Việt Nam.",
    answerEn: "Incense Burner Islet resembles a sacred burner and is printed on the 200,000 VND banknote."
  },
  {
    keywords: ["ti tốp", "titop", "bãi tắm"],
    answerVi: "Đảo Ti Tốp có bãi cát trăng khuyết và đài quan sát 360 độ, được Bác Hồ đặt tên năm 1962 theo phi hành gia Titov.",
    answerEn: "Ti Top Island features a crescent beach and 360-degree viewpoint, named in 1962 after cosmonaut Titov."
  },
  {
    keywords: ["giá", "vé", "ticket", "fee"],
    answerVi: "Vé tham quan Vịnh Hạ Long ban ngày từ 250.000đ - 290.000đ/người (chưa gồm phí tàu du lịch khoảng 150.000đ - 200.000đ).",
    answerEn: "Ha Long Bay sightseeing tickets are 250,000 - 290,000 VND per person (excluding cruise boat rentals)."
  }
];