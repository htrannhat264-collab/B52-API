const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

// ============ CẤU HÌNH ============
const API_URL = 'https://expected-paying-pins-childhood.trycloudflare.com/api/tx';
const CHECK_INTERVAL = 30000;
const MAX_HISTORY = 200;

// ============ BIẾN TOÀN CỤC ============
let history = [];
let phanTichData = {
  tai: 0,
  xiu: 0,
  chuoiTai: 0,
  chuoiXiu: 0,
  tong: 0
};

let duDoanHienTai = {
  phien: 0,
  ketQua: '',
  duDoan: '',
  tyLe: 0,
  xucXac: [],
  confidence: 0,
  phanTich: {}
};

// ============ HÀM LẤY DỮ LIỆU ============
async function layKetQua() {
  try {
    const response = await axios.get(API_URL, { 
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });
    return response.data;
  } catch (error) {
    console.error('❌ Lỗi API:', error.message);
    return null;
  }
}

// ============ TẦNG 1: PHÂN TÍCH TẦN SUẤT ============
function phanTichTanSuat(historyData) {
  if (historyData.length < 5) return { tai: 0, xiu: 0, tyLeTai: 50, tyLeXiu: 50 };
  
  const tai = historyData.filter(x => x === 'tai').length;
  const xiu = historyData.length - tai;
  const tyLeTai = (tai / historyData.length) * 100;
  const tyLeXiu = (xiu / historyData.length) * 100;
  
  return { tai, xiu, tyLeTai, tyLeXiu };
}

// ============ TẦNG 2: PHÂN TÍCH CHUỖI ============
function phanTichChuoi(historyData) {
  if (historyData.length < 3) return { maxChuoiTai: 0, maxChuoiXiu: 0, chuoiHienTai: '' };
  
  let maxTai = 0, maxXiu = 0;
  let currentTai = 0, currentXiu = 0;
  let currentStreak = '';
  
  for (let i = 0; i < historyData.length; i++) {
    if (historyData[i] === 'tai') {
      currentTai++;
      currentXiu = 0;
      if (currentTai > maxTai) maxTai = currentTai;
      currentStreak = 'tai';
    } else {
      currentXiu++;
      currentTai = 0;
      if (currentXiu > maxXiu) maxXiu = currentXiu;
      currentStreak = 'xiu';
    }
  }
  
  // Lấy 5 phiên gần nhất
  const ganDay = historyData.slice(-5);
  const soTai = ganDay.filter(x => x === 'tai').length;
  
  return { 
    maxChuoiTai: maxTai, 
    maxChuoiXiu: maxXiu, 
    chuoiHienTai: currentStreak,
    soTai5Phien: soTai,
    tyLeTai5Phien: (soTai / ganDay.length) * 100
  };
}

// ============ TẦNG 3: PHÂN TÍCH MẪU (PATTERN) ============
function phanTichMau(historyData) {
  if (historyData.length < 10) return { mau: [], duDoan: '' };
  
  // Tìm các mẫu 3 phiên
  const patterns = [];
  for (let i = 0; i < historyData.length - 2; i++) {
    const pattern = historyData.slice(i, i + 3).join('-');
    patterns.push(pattern);
  }
  
  // Thống kê tần suất mẫu
  const freq = {};
  patterns.forEach(p => {
    freq[p] = (freq[p] || 0) + 1;
  });
  
  // Lấy 3 mẫu xuất hiện nhiều nhất
  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
  const topPatterns = sorted.slice(0, 3).map(p => p[0]);
  
  // Tìm mẫu cuối cùng
  const last3 = historyData.slice(-3).join('-');
  const nextPredict = historyData[historyData.length - 1] === 'tai' ? 'xiu' : 'tai';
  
  return { 
    topPatterns, 
    lastPattern: last3,
    duDoanTheoMau: nextPredict
  };
}

// ============ TẦNG 4: PHÂN TÍCH BIẾN ĐỘNG ============
function phanTichBienDong(historyData) {
  if (historyData.length < 10) return { doBienDong: 0, xuHuong: 'trung' };
  
  let changes = 0;
  for (let i = 1; i < historyData.length; i++) {
    if (historyData[i] !== historyData[i-1]) changes++;
  }
  
  const doBienDong = (changes / (historyData.length - 1)) * 100;
  let xuHuong = 'trung';
  
  if (doBienDong > 70) xuHuong = 'bienDongCao';
  else if (doBienDong < 30) xuHuong = 'bienDongThap';
  else xuHuong = 'bienDongTrung';
  
  return { doBienDong, xuHuong };
}

// ============ TẦNG 5: PHÂN TÍCH TỶ LỆ VÀNG (FIBONACCI) ============
function phanTichFibonacci(historyData) {
  if (historyData.length < 15) return { fiboTai: 50, fiboXiu: 50 };
  
  // Áp dụng tỷ lệ Fibonacci: 38.2%, 50%, 61.8%
  const n = historyData.length;
  const fibo38 = Math.floor(n * 0.382);
  const fibo50 = Math.floor(n * 0.5);
  const fibo62 = Math.floor(n * 0.618);
  
  const data38 = historyData.slice(-fibo38);
  const data50 = historyData.slice(-fibo50);
  const data62 = historyData.slice(-fibo62);
  
  const tai38 = data38.filter(x => x === 'tai').length / data38.length * 100;
  const tai50 = data50.filter(x => x === 'tai').length / data50.length * 100;
  const tai62 = data62.filter(x => x === 'tai').length / data62.length * 100;
  
  const trungBinh = (tai38 + tai50 + tai62) / 3;
  
  return { 
    fiboTai: trungBinh, 
    fiboXiu: 100 - trungBinh,
    tai38, tai50, tai62
  };
}

// ============ TẦNG 6: PHÂN TÍCH TÍN HIỆU ============
function phanTichTinHieu(historyData) {
  if (historyData.length < 20) return { tinHieu: 'trung', diem: 50 };
  
  let diem = 50;
  
  // Kiểm tra 10 phiên gần nhất
  const gan10 = historyData.slice(-10);
  const tai10 = gan10.filter(x => x === 'tai').length;
  const tyLe10 = (tai10 / 10) * 100;
  
  // Điều chỉnh điểm
  if (tyLe10 >= 80) diem += 15;  // Quá lệch về Tài
  else if (tyLe10 <= 20) diem -= 15;  // Quá lệch về Xỉu
  else if (tyLe10 >= 60) diem += 8;
  else if (tyLe10 <= 40) diem -= 8;
  
  // Kiểm tra xu hướng gần đây
  const gan5 = historyData.slice(-5);
  const tai5 = gan5.filter(x => x === 'tai').length;
  if (tai5 >= 4) diem -= 10;  // Sắp đảo chiều
  else if (tai5 <= 1) diem += 10;
  
  // Kiểm tra biến động
  const bienDong = phanTichBienDong(historyData);
  if (bienDong.xuHuong === 'bienDongCao') diem += 5;
  else if (bienDong.xuHuong === 'bienDongThap') diem -= 5;
  
  // Đóng khung điểm
  diem = Math.max(0, Math.min(100, diem));
  
  let tinHieu = 'trung';
  if (diem >= 65) tinHieu = 'tai';
  else if (diem <= 35) tinHieu = 'xiu';
  
  return { tinHieu, diem };
}

// ============ TẦNG 7: THUẬT TOÁN HỌC MÁY ĐƠN GIẢN ============
function machineLearning(historyData) {
  if (historyData.length < 30) return { mlTai: 50, mlXiu: 50 };
  
  // Trọng số cho các vị trí
  const weights = [0.15, 0.12, 0.10, 0.08, 0.07, 0.06, 0.05, 0.04, 0.03, 0.02];
  const last10 = historyData.slice(-10);
  let weightedTai = 0;
  let totalWeight = 0;
  
  for (let i = 0; i < last10.length; i++) {
    const weight = weights[i] || 0.01;
    if (last10[i] === 'tai') weightedTai += weight;
    totalWeight += weight;
  }
  
  const tyLeTai = (weightedTai / totalWeight) * 100;
  const tyLeXiu = 100 - tyLeTai;
  
  return { mlTai: tyLeTai, mlXiu: tyLeXiu };
}

// ============ TẦNG 8: MÔ HÌNH MARKOV CHAIN ============
function markovChain(historyData) {
  if (historyData.length < 20) return { transition: {}, next: '' };
  
  // Xây dựng ma trận chuyển tiếp
  const transitions = {
    'tai_tai': 0, 'tai_xiu': 0,
    'xiu_tai': 0, 'xiu_xiu': 0
  };
  
  for (let i = 0; i < historyData.length - 1; i++) {
    const key = `${historyData[i]}_${historyData[i+1]}`;
    transitions[key] = (transitions[key] || 0) + 1;
  }
  
  const last = historyData[historyData.length - 1];
  let next = '';
  
  if (last === 'tai') {
    next = transitions['tai_xiu'] > transitions['tai_tai'] ? 'xiu' : 'tai';
  } else {
    next = transitions['xiu_tai'] > transitions['xiu_xiu'] ? 'tai' : 'xiu';
  }
  
  return { transition: transitions, next };
}

// ============ TẦNG 9: PHÂN TÍCH CHU KỲ ============
function phanTichChuKy(historyData) {
  if (historyData.length < 20) return { chuKy: 0, duDoan: '' };
  
  // Tìm chu kỳ lặp lại
  let timChuKy = 0;
  for (let k = 2; k <= 10; k++) {
    let found = true;
    for (let i = 0; i < historyData.length - k; i++) {
      if (historyData[i] !== historyData[i + k]) {
        found = false;
        break;
      }
    }
    if (found) {
      timChuKy = k;
      break;
    }
  }
  
  let duDoan = '';
  if (timChuKy > 0) {
    const lastIndex = historyData.length - 1;
    const patternIndex = lastIndex - timChuKy;
    if (patternIndex >= 0) {
      duDoan = historyData[patternIndex];
    }
  }
  
  return { chuKy: timChuKy, duDoan };
}

// ============ HÀM TỔNG HỢP DỰ ĐOÁN ============
function tongHopDuDoan(historyData) {
  console.log('🧠 Đang phân tích với 9 tầng...');
  
  // Tầng 1: Tần suất
  const tanSuat = phanTichTanSuat(historyData);
  console.log(`  Tầng 1 - Tần suất: Tài ${tanSuat.tyLeTai.toFixed(1)}% - Xỉu ${tanSuat.tyLeXiu.toFixed(1)}%`);
  
  // Tầng 2: Chuỗi
  const chuoi = phanTichChuoi(historyData);
  console.log(`  Tầng 2 - Chuỗi: Tài ${chuoi.maxChuoiTai} - Xỉu ${chuoi.maxChuoiXiu} - Hiện tại: ${chuoi.chuoiHienTai}`);
  
  // Tầng 3: Mẫu
  const mau = phanTichMau(historyData);
  console.log(`  Tầng 3 - Mẫu: ${mau.topPatterns.join(', ')}`);
  
  // Tầng 4: Biến động
  const bienDong = phanTichBienDong(historyData);
  console.log(`  Tầng 4 - Biến động: ${bienDong.doBienDong.toFixed(1)}% - ${bienDong.xuHuong}`);
  
  // Tầng 5: Fibonacci
  const fibo = phanTichFibonacci(historyData);
  console.log(`  Tầng 5 - Fibonacci: Tài ${fibo.fiboTai.toFixed(1)}% - Xỉu ${fibo.fiboXiu.toFixed(1)}%`);
  
  // Tầng 6: Tín hiệu
  const tinHieu = phanTichTinHieu(historyData);
  console.log(`  Tầng 6 - Tín hiệu: ${tinHieu.tinHieu} (${tinHieu.diem.toFixed(0)} điểm)`);
  
  // Tầng 7: Machine Learning
  const ml = machineLearning(historyData);
  console.log(`  Tầng 7 - ML: Tài ${ml.mlTai.toFixed(1)}% - Xỉu ${ml.mlXiu.toFixed(1)}%`);
  
  // Tầng 8: Markov Chain
  const markov = markovChain(historyData);
  console.log(`  Tầng 8 - Markov: Dự đoán ${markov.next.toUpperCase()}`);
  
  // Tầng 9: Chu kỳ
  const chuKy = phanTichChuKy(historyData);
  console.log(`  Tầng 9 - Chu kỳ: ${chuKy.chuKy > 0 ? `Tìm thấy chu kỳ ${chuKy.chuKy}` : 'Không có chu kỳ'}`);
  
  // ============ TỔNG HỢP TRỌNG SỐ ============
  const tyLeTai = (
    tanSuat.tyLeTai * 0.20 +
    (chuoi.chuoiHienTai === 'tai' ? 60 : 40) * 0.10 +
    (mau.duDoanTheoMau === 'tai' ? 65 : 35) * 0.05 +
    (bienDong.xuHuong === 'bienDongCao' ? 55 : 45) * 0.05 +
    fibo.fiboTai * 0.20 +
    (tinHieu.tinHieu === 'tai' ? 70 : 30) * 0.15 +
    ml.mlTai * 0.15 +
    (markov.next === 'tai' ? 70 : 30) * 0.05 +
    (chuKy.duDoan === 'tai' ? 65 : 35) * 0.05
  );
  
  const tyLeXiu = 100 - tyLeTai;
  const duDoan = tyLeTai >= 50 ? 'tai' : 'xiu';
  const confidence = Math.max(tyLeTai, tyLeXiu);
  
  // Điều chỉnh confidence dựa trên số lượng dữ liệu
  let adjustedConfidence = confidence;
  if (historyData.length < 20) adjustedConfidence = Math.min(65, confidence);
  else if (historyData.length < 50) adjustedConfidence = Math.min(75, confidence);
  else adjustedConfidence = Math.min(85, confidence);
  
  return {
    duDoan,
    tyLeTai: tyLeTai,
    tyLeXiu: tyLeXiu,
    confidence: Math.round(adjustedConfidence),
    chiTiet: {
      tanSuat,
      chuoi,
      mau,
      bienDong,
      fibo,
      tinHieu,
      ml,
      markov,
      chuKy
    }
  };
}

// ============ XỬ LÝ DỰ ĐOÁN CHÍNH ============
async function xuLyDuDoan() {
  console.log('\n🔄 Đang kiểm tra phiên mới...');
  
  const data = await layKetQua();
  if (!data) {
    console.log('⏳ Đợi 5s thử lại...');
    return;
  }

  const ketQua = data.ket_qua ? data.ket_qua.toLowerCase() : '';
  const phien = data.phien || 0;
  const xucXac = [
    data.xuc_xac_1 || 0,
    data.xuc_xac_2 || 0,
    data.xuc_xac_3 || 0
  ];
  
  // Xác định kết quả
  let ketQuaChuan = ketQua;
  if (!ketQuaChuan || !['tai', 'xiu'].includes(ketQuaChuan)) {
    const tong = xucXac.reduce((a, b) => a + b, 0);
    ketQuaChuan = tong >= 11 ? 'tai' : 'xiu';
  }

  // Cập nhật lịch sử
  if (phien > duDoanHienTai.phien && ketQuaChuan) {
    history.push(ketQuaChuan);
    if (history.length > MAX_HISTORY) {
      history.shift();
    }
    
    // Phân tích tổng hợp
    const phanTich = tongHopDuDoan(history);
    
    duDoanHienTai = {
      phien: phien,
      ketQua: ketQuaChuan,
      duDoan: phanTich.duDoan,
      tyLe: phanTich.confidence,
      xucXac: xucXac,
      confidence: phanTich.confidence,
      phanTich: phanTich.chiTiet,
      tyLeTai: Math.round(phanTich.tyLeTai),
      tyLeXiu: Math.round(phanTich.tyLeXiu)
    };

    // Hiển thị kết quả
    console.log('\n' + '='.repeat(60));
    console.log(`📊 PHIÊN: ${phien}`);
    console.log(`🎲 Xúc xắc: [${xucXac.join(', ')}] (Tổng: ${xucXac.reduce((a,b) => a+b, 0)})`);
    console.log(`✅ Kết quả: ${ketQuaChuan.toUpperCase()}`);
    console.log(`🔮 DỰ ĐOÁN PHIÊN TIẾP THEO: ${phanTich.duDoan.toUpperCase()}`);
    console.log(`📈 ĐỘ TIN CẬY: ${phanTich.confidence}%`);
    console.log(`📊 Tỷ lệ Tài: ${Math.round(phanTich.tyLeTai)}% - Xỉu: ${Math.round(phanTich.tyLeXiu)}%`);
    console.log(`🏷️ ID: @tranhoang2286`);
    console.log('='.repeat(60));
    
    // Log chi tiết
    console.log('\n📋 CHI TIẾT PHÂN TÍCH:');
    console.log(`  • Tần suất: Tài ${phanTich.chiTiet.tanSuat.tyLeTai.toFixed(1)}% - Xỉu ${phanTich.chiTiet.tanSuat.tyLeXiu.toFixed(1)}%`);
    console.log(`  • Chuỗi max: Tài ${phanTich.chiTiet.chuoi.maxChuoiTai} - Xỉu ${phanTich.chiTiet.chuoi.maxChuoiXiu}`);
    console.log(`  • Biến động: ${phanTich.chiTiet.bienDong.doBienDong.toFixed(1)}%`);
    console.log(`  • Tín hiệu: ${phanTich.chiTiet.tinHieu.tinHieu} (${phanTich.chiTiet.tinHieu.diem.toFixed(0)} điểm)`);
    console.log(`  • Markov: Dự đoán ${phanTich.chiTiet.markov.next.toUpperCase()}`);
    console.log(`  • Chu kỳ: ${phanTich.chiTiet.chuKy.chuKy > 0 ? `Có (${phanTich.chiTiet.chuKy.chuKy})` : 'Không'}`);
    console.log('-'.repeat(60));
  }
}

// ============ API ENDPOINTS ============
app.get('/', (req, res) => {
  res.json({
    status: 'running',
    version: '9.0',
    message: 'MAX789 Siêu Dự Đoán - @tranhoang2286',
    current: duDoanHienTai,
    history: history.slice(-20)
  });
});

app.get('/api/predict', (req, res) => {
  res.json({
    success: true,
    data: duDoanHienTai,
    timestamp: new Date().toISOString(),
    system: '9 tầng phân tích'
  });
});

app.get('/api/history', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  res.json({
    success: true,
    history: history.slice(-limit),
    total: history.length
  });
});

app.get('/api/stats', (req, res) => {
  const tai = history.filter(x => x === 'tai').length;
  const xiu = history.length - tai;
  
  res.json({
    success: true,
    stats: {
      tai,
      xiu,
      tyLeTai: history.length > 0 ? Math.round((tai / history.length) * 100) : 0,
      tyLeXiu: history.length > 0 ? Math.round((xiu / history.length) * 100) : 0,
      total: history.length,
      maxChuoi: phanTichChuoi(history)
    }
  });
});

app.get('/api/detail', (req, res) => {
  res.json({
    success: true,
    detail: duDoanHienTai.phanTich || {},
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// ============ KHỞI ĐỘNG SERVER ============
app.listen(PORT, () => {
  console.log('\n🚀 MAX789 SIÊU DỰ ĐOÁN 9 TẦNG');
  console.log('='.repeat(60));
  console.log(`🔗 Server: http://localhost:${PORT}`);
  console.log(`📡 API: ${API_URL}`);
  console.log(`👤 Creator: @tranhoang2286`);
  console.log('='.repeat(60));
  
  setTimeout(async () => {
    await xuLyDuDoan();
    setInterval(xuLyDuDoan, CHECK_INTERVAL);
  }, 1000);
});

process.on('uncaughtException', (error) => {
  console.error('🔥 Lỗi:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('🔥 Promise lỗi:', error);
});
