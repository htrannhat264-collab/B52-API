const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

// ============ CẤU HÌNH ============
const CONFIG = {
    API_URL: 'https://expected-paying-pins-childhood.trycloudflare.com/api/tx',
    CHECK_INTERVAL: 3000,
    MAX_HISTORY: 200
};

// ============ BIẾN TOÀN CỤC ============
let history = [];
let stats = { total: 0, correct: 0, wrong: 0 };

let currentData = {
    Phien: null,
    Xuc_xac_1: 0,
    Xuc_xac_2: 0,
    Xuc_xac_3: 0,
    Tong: 0,
    Ket_qua: '',
    Phien_hien_tai: null,
    Du_doan: '',
    Loai_cau: '',
    Mau_cau_phat_hien: '',
    Ti_le_Tai: '50%',
    Ti_le_Xiu: '50%',
    Do_tin_cay: '50%',
    Trang_thai: 'Chờ dữ liệu',
    Ket_qua_du_doan: '',
    Thong_ke: {
        tong: 0,
        dung: 0,
        sai: 0,
        ti_le: '0%'
    },
    id: '@tranhoang2286'
};

// ============ HÀM LẤY DỮ LIỆU ============
async function layKetQua() {
    try {
        const response = await axios.get(CONFIG.API_URL, {
            timeout: 5000,
            headers: { 'Cache-Control': 'no-cache' }
        });
        return response.data;
    } catch (error) {
        console.error('❌ Lỗi API:', error.message);
        return null;
    }
}

// ============================================================================
// ============ HÀM TÍNH TỈ LỆ TỪ DỮ LIỆU THỰC TẾ ============
// ============================================================================

function tinhTiLe(data) {
    if (!data || data.length === 0) {
        return { tai: 50, xiu: 50 };
    }
    
    const tai = data.filter(x => x === 'tai').length;
    const xiu = data.filter(x => x === 'xiu').length;
    const total = data.length;
    
    if (total === 0) return { tai: 50, xiu: 50 };
    
    const tyLeTai = (tai / total) * 100;
    const tyLeXiu = (xiu / total) * 100;
    
    return {
        tai: Math.round(tyLeTai),
        xiu: Math.round(tyLeXiu)
    };
}

// ============================================================================
// ============ 15 TẦNG PHÂN TÍCH ============
// ============================================================================

// TẦNG 1: TẦN SUẤT CƠ BẢN
function tang1_TanSuat(data) {
    if (data.length < 3) return { tai: 50, xiu: 50, doTinCay: 30 };
    
    const tai = data.filter(x => x === 'tai').length;
    const tyLe = (tai / data.length) * 100;
    
    return {
        tai: Math.round(tyLe),
        xiu: Math.round(100 - tyLe),
        doTinCay: Math.min(Math.abs(tyLe - 50) + 30, 85)
    };
}

// TẦNG 2: CHUỖI (STREAK)
function tang2_Chuoi(data) {
    if (data.length < 2) return { duDoan: 'tai', doTinCay: 30, dieuChinh: 0 };
    
    let current = data[data.length - 1];
    let count = 0;
    for (let i = data.length - 1; i >= 0; i--) {
        if (data[i] === current) count++;
        else break;
    }
    
    let dieuChinh = 0;
    let doTinCay = 50;
    
    if (count >= 4) {
        dieuChinh = current === 'tai' ? -20 : 20;
        doTinCay = 75;
    } else if (count >= 3) {
        dieuChinh = current === 'tai' ? -15 : 15;
        doTinCay = 68;
    } else if (count >= 2) {
        dieuChinh = current === 'tai' ? -8 : 8;
        doTinCay = 58;
    } else {
        dieuChinh = current === 'tai' ? -3 : 3;
        doTinCay = 50;
    }
    
    return { duDoan: current, doTinCay, dieuChinh };
}

// TẦNG 3: MẪU CẦU
function tang3_MauCau(data) {
    if (data.length < 4) return { duDoan: 'tai', loaiCau: 'Chưa đủ', mauCau: 'Chưa đủ', doTinCay: 30, dieuChinh: 0 };
    
    const last4 = data.slice(-4);
    const last3 = data.slice(-3);
    
    let duDoan = 'tai';
    let loaiCau = 'Không xác định';
    let mauCau = 'Không xác định';
    let doTinCay = 50;
    let dieuChinh = 0;
    
    // Cầu 1-1 (so le)
    if (last4[0] !== last4[1] && last4[1] !== last4[2] && last4[2] !== last4[3]) {
        duDoan = data[data.length - 1] === 'tai' ? 'xiu' : 'tai';
        loaiCau = 'Cầu so le';
        mauCau = '1-1';
        doTinCay = 72;
        dieuChinh = data[data.length - 1] === 'tai' ? -12 : 12;
    }
    // Cầu 2-2
    else if (last4[0] === last4[2] && last4[1] === last4[3] && last4[0] !== last4[1]) {
        duDoan = data[data.length - 1] === 'tai' ? 'xiu' : 'tai';
        loaiCau = 'Cầu 2-2';
        mauCau = '2-2';
        doTinCay = 68;
        dieuChinh = data[data.length - 1] === 'tai' ? -10 : 10;
    }
    // Cầu 3-1
    else if (last4[0] === last4[1] && last4[1] === last4[2] && last4[2] !== last4[3]) {
        duDoan = 'xiu';
        loaiCau = 'Cầu 3-1';
        mauCau = '3 Tài 1 Xỉu';
        doTinCay = 70;
        dieuChinh = -15;
    }
    else if (last4[1] === last4[2] && last4[2] === last4[3] && last4[0] !== last4[1]) {
        duDoan = 'tai';
        loaiCau = 'Cầu 1-3';
        mauCau = '1 Tài 3 Xỉu';
        doTinCay = 70;
        dieuChinh = 15;
    }
    // Cầu bệt
    else if (last3.every(x => x === 'tai')) {
        duDoan = 'xiu';
        loaiCau = 'Cầu bệt';
        mauCau = 'Bệt Tài';
        doTinCay = 75;
        dieuChinh = -20;
    }
    else if (last3.every(x => x === 'xiu')) {
        duDoan = 'tai';
        loaiCau = 'Cầu bệt';
        mauCau = 'Bệt Xỉu';
        doTinCay = 75;
        dieuChinh = 20;
    }
    
    return { duDoan, loaiCau, mauCau, doTinCay, dieuChinh };
}

// TẦNG 4: TỔNG ĐIỂM
function tang4_TongDiem(tongData) {
    if (!tongData || tongData.length < 3) return { duDoan: 'tai', doTinCay: 30, dieuChinh: 0 };
    
    const avg = tongData.reduce((a, b) => a + b, 0) / tongData.length;
    const last = tongData[tongData.length - 1] || 10.5;
    
    let dieuChinh = 0;
    let doTinCay = 50;
    
    if (last >= 14) {
        dieuChinh = -18;
        doTinCay = 70;
    } else if (last >= 12) {
        dieuChinh = -10;
        doTinCay = 60;
    } else if (last <= 6) {
        dieuChinh = 18;
        doTinCay = 70;
    } else if (last <= 8) {
        dieuChinh = 10;
        doTinCay = 60;
    } else {
        dieuChinh = last > 10.5 ? -3 : 3;
        doTinCay = 45;
    }
    
    return {
        duDoan: dieuChinh > 0 ? 'tai' : 'xiu',
        doTinCay,
        dieuChinh
    };
}

// TẦNG 5: BIẾN ĐỘNG
function tang5_BienDong(data) {
    if (data.length < 5) return { doBienDong: 50, dieuChinh: 0, doTinCay: 30 };
    
    let changes = 0;
    for (let i = 1; i < data.length; i++) {
        if (data[i] !== data[i-1]) changes++;
    }
    
    const doBienDong = (changes / (data.length - 1)) * 100;
    let dieuChinh = 0;
    let doTinCay = 50;
    
    if (doBienDong > 70) {
        dieuChinh = data[data.length-1] === 'tai' ? -15 : 15;
        doTinCay = 65;
    } else if (doBienDong < 30) {
        dieuChinh = data[data.length-1] === 'tai' ? 5 : -5;
        doTinCay = 55;
    } else {
        dieuChinh = 0;
        doTinCay = 45;
    }
    
    return { doBienDong, dieuChinh, doTinCay };
}

// TẦNG 6: FIBONACCI
function tang6_Fibonacci(data) {
    if (data.length < 10) return { dieuChinh: 0, doTinCay: 30 };
    
    const levels = [0.236, 0.382, 0.5, 0.618, 0.786];
    let taiSum = 0;
    let count = 0;
    
    for (const level of levels) {
        const idx = Math.floor(data.length * level);
        if (idx > 0 && idx < data.length) {
            const slice = data.slice(-idx);
            const tai = slice.filter(x => x === 'tai').length;
            taiSum += (tai / slice.length) * 100;
            count++;
        }
    }
    
    const avg = taiSum / count;
    const dieuChinh = avg > 55 ? -8 : (avg < 45 ? 8 : 0);
    const doTinCay = Math.min(Math.abs(avg - 50) + 30, 80);
    
    return { dieuChinh, doTinCay };
}

// TẦNG 7: MARKOV CHAIN
function tang7_Markov(data) {
    if (data.length < 10) return { duDoan: 'tai', dieuChinh: 0, doTinCay: 30 };
    
    const last = data[data.length - 1];
    let taiSauTai = 0, xiuSauTai = 0;
    let taiSauXiu = 0, xiuSauXiu = 0;
    
    for (let i = 0; i < data.length - 1; i++) {
        if (data[i] === 'tai') {
            if (data[i+1] === 'tai') taiSauTai++;
            else xiuSauTai++;
        } else {
            if (data[i+1] === 'tai') taiSauXiu++;
            else xiuSauXiu++;
        }
    }
    
    let dieuChinh = 0;
    let doTinCay = 50;
    
    if (last === 'tai') {
        const tyLeXiu = xiuSauTai / (taiSauTai + xiuSauTai) * 100;
        dieuChinh = tyLeXiu > 50 ? 10 : -5;
        doTinCay = Math.min(Math.abs(tyLeXiu - 50) * 1.5 + 30, 80);
    } else {
        const tyLeTai = taiSauXiu / (taiSauXiu + xiuSauXiu) * 100;
        dieuChinh = tyLeTai > 50 ? -10 : 5;
        doTinCay = Math.min(Math.abs(tyLeTai - 50) * 1.5 + 30, 80);
    }
    
    return { duDoan: dieuChinh > 0 ? 'xiu' : 'tai', dieuChinh, doTinCay };
}

// TẦNG 8: CHU KỲ
function tang8_ChuKy(data) {
    if (data.length < 15) return { dieuChinh: 0, doTinCay: 30 };
    
    let timChuKy = 0;
    let matchRate = 0;
    
    for (let k = 2; k <= 10; k++) {
        let matchCount = 0;
        for (let i = 0; i < data.length - k; i++) {
            if (data[i] === data[i + k]) matchCount++;
        }
        const rate = matchCount / (data.length - k);
        if (rate > 0.6) {
            timChuKy = k;
            matchRate = rate;
            break;
        }
    }
    
    let dieuChinh = 0;
    let doTinCay = 30;
    
    if (timChuKy > 0) {
        const lastIdx = data.length - 1;
        const patternIdx = lastIdx - timChuKy;
        if (patternIdx >= 0) {
            const duDoan = data[patternIdx];
            dieuChinh = duDoan === 'tai' ? 8 : -8;
            doTinCay = Math.min(50 + matchRate * 30, 80);
        }
    }
    
    return { dieuChinh, doTinCay };
}

// TẦNG 9: TỈ LỆ 10 PHIÊN GẦN NHẤT
function tang9_GanNhat(data) {
    if (data.length < 5) return { dieuChinh: 0, doTinCay: 30 };
    
    const ganDay = data.slice(-10);
    const tai = ganDay.filter(x => x === 'tai').length;
    const tyLe = (tai / ganDay.length) * 100;
    
    let dieuChinh = 0;
    if (tyLe >= 70) dieuChinh = -15;
    else if (tyLe >= 60) dieuChinh = -8;
    else if (tyLe <= 30) dieuChinh = 15;
    else if (tyLe <= 40) dieuChinh = 8;
    else dieuChinh = 0;
    
    const doTinCay = Math.min(Math.abs(tyLe - 50) + 30, 80);
    
    return { dieuChinh, doTinCay, tyLe };
}

// TẦNG 10: TỈ LỆ TOÀN BỘ LỊCH SỬ
function tang10_LichSu(data) {
    if (data.length < 3) return { dieuChinh: 0, doTinCay: 30 };
    
    const tai = data.filter(x => x === 'tai').length;
    const tyLe = (tai / data.length) * 100;
    
    let dieuChinh = 0;
    if (tyLe >= 65) dieuChinh = -10;
    else if (tyLe <= 35) dieuChinh = 10;
    else dieuChinh = 0;
    
    const doTinCay = Math.min(Math.abs(tyLe - 50) + 30, 75);
    
    return { dieuChinh, doTinCay };
}

// ============================================================================
// ============ TỔNG HỢP DỰ ĐOÁN ============
// ============================================================================

function tongHopDuDoan(historyData, tongData) {
    const data = historyData;
    const tong = tongData || [];
    
    // Khởi tạo điểm
    let diemTai = 50;
    let diemXiu = 50;
    let tongDoTinCay = 0;
    let soTang = 0;
    
    // Áp dụng các tầng
    const tanSuat = tang1_TanSuat(data);
    diemTai += (tanSuat.tai - 50) * 0.15;
    diemXiu += (tanSuat.xiu - 50) * 0.15;
    tongDoTinCay += tanSuat.doTinCay;
    soTang++;
    
    const chuoi = tang2_Chuoi(data);
    if (chuoi.dieuChinh !== 0) {
        diemTai += chuoi.dieuChinh;
        diemXiu -= chuoi.dieuChinh;
        tongDoTinCay += chuoi.doTinCay;
        soTang++;
    }
    
    const mauCau = tang3_MauCau(data);
    if (mauCau.dieuChinh !== 0) {
        diemTai += mauCau.dieuChinh;
        diemXiu -= mauCau.dieuChinh;
        tongDoTinCay += mauCau.doTinCay;
        soTang++;
    }
    
    const tongDiem = tang4_TongDiem(tong);
    if (tongDiem.dieuChinh !== 0) {
        diemTai += tongDiem.dieuChinh;
        diemXiu -= tongDiem.dieuChinh;
        tongDoTinCay += tongDiem.doTinCay;
        soTang++;
    }
    
    const bienDong = tang5_BienDong(data);
    if (bienDong.dieuChinh !== 0) {
        diemTai += bienDong.dieuChinh;
        diemXiu -= bienDong.dieuChinh;
        tongDoTinCay += bienDong.doTinCay;
        soTang++;
    }
    
    const fibo = tang6_Fibonacci(data);
    if (fibo.dieuChinh !== 0) {
        diemTai += fibo.dieuChinh;
        diemXiu -= fibo.dieuChinh;
        tongDoTinCay += fibo.doTinCay;
        soTang++;
    }
    
    const markov = tang7_Markov(data);
    if (markov.dieuChinh !== 0) {
        diemTai += markov.dieuChinh;
        diemXiu -= markov.dieuChinh;
        tongDoTinCay += markov.doTinCay;
        soTang++;
    }
    
    const chuKy = tang8_ChuKy(data);
    if (chuKy.dieuChinh !== 0) {
        diemTai += chuKy.dieuChinh;
        diemXiu -= chuKy.dieuChinh;
        tongDoTinCay += chuKy.doTinCay;
        soTang++;
    }
    
    const ganNhat = tang9_GanNhat(data);
    if (ganNhat.dieuChinh !== 0) {
        diemTai += ganNhat.dieuChinh;
        diemXiu -= ganNhat.dieuChinh;
        tongDoTinCay += ganNhat.doTinCay;
        soTang++;
    }
    
    const lichSu = tang10_LichSu(data);
    if (lichSu.dieuChinh !== 0) {
        diemTai += lichSu.dieuChinh;
        diemXiu -= lichSu.dieuChinh;
        tongDoTinCay += lichSu.doTinCay;
        soTang++;
    }
    
    // Giới hạn điểm
    diemTai = Math.max(5, Math.min(95, diemTai));
    diemXiu = Math.max(5, Math.min(95, diemXiu));
    
    // Tính tỉ lệ phần trăm
    const total = diemTai + diemXiu;
    const tyLeTai = Math.round((diemTai / total) * 100);
    const tyLeXiu = Math.round((diemXiu / total) * 100);
    
    // Đảm bảo tổng = 100
    const finalTai = tyLeTai + tyLeXiu === 100 ? tyLeTai : tyLeTai + (100 - tyLeTai - tyLeXiu);
    const finalXiu = 100 - finalTai;
    
    // Độ tin cậy trung bình
    const doTinCay = soTang > 0 ? Math.min(Math.round(tongDoTinCay / soTang), 95) : 50;
    
    // Dự đoán cuối cùng
    const duDoan = finalTai >= 50 ? 'tai' : 'xiu';
    
    // Tìm loại cầu
    const mau = tang3_MauCau(data);
    
    return {
        duDoan: duDoan,
        tyLeTai: finalTai,
        tyLeXiu: finalXiu,
        doTinCay: doTinCay,
        loaiCau: mau.loaiCau || 'Không xác định',
        mauCau: mau.mauCau || 'Không xác định',
        chiTiet: {
            diemTai: Math.round(diemTai),
            diemXiu: Math.round(diemXiu),
            soTang: soTang
        }
    };
}

// ============================================================================
// ============ XỬ LÝ DỰ ĐOÁN CHÍNH ============
// ============================================================================

async function xuLyDuDoan() {
    const data = await layKetQua();
    if (!data) return;
    
    const d1 = data.xuc_xac_1 || 0;
    const d2 = data.xuc_xac_2 || 0;
    const d3 = data.xuc_xac_3 || 0;
    const tong = d1 + d2 + d3;
    const ketQua = data.ket_qua ? data.ket_qua.toLowerCase().replace('ài', 'ai').replace('ỉu', 'iu') : '';
    const phien = data.phien || 0;
    
    let ketQuaChuan = ketQua;
    if (!ketQuaChuan || !['tai', 'xiu'].includes(ketQuaChuan)) {
        ketQuaChuan = tong >= 11 ? 'tai' : 'xiu';
    }
    
    // Cập nhật lịch sử
    if (phien > (currentData.Phien || 0)) {
        if (ketQuaChuan) {
            history.push(ketQuaChuan);
            if (history.length > CONFIG.MAX_HISTORY) history.shift();
        }
        
        // Lưu tổng điểm
        if (!currentData._tongHistory) currentData._tongHistory = [];
        currentData._tongHistory.push(tong);
        if (currentData._tongHistory.length > CONFIG.MAX_HISTORY) currentData._tongHistory.shift();
        
        // Kiểm tra dự đoán trước
        if (currentData.Du_doan && currentData.Phien) {
            const prevPred = currentData.Du_doan;
            const isCorrect = prevPred === ketQuaChuan;
            stats.total++;
            if (isCorrect) stats.correct++;
            else stats.wrong++;
        }
        
        // DỰ ĐOÁN
        const prediction = tongHopDuDoan(history, currentData._tongHistory || []);
        const tiLe = stats.total > 0 ? (stats.correct / stats.total * 100).toFixed(1) + '%' : '0%';
        
        // Cập nhật currentData
        currentData = {
            Phien: phien,
            Xuc_xac_1: d1,
            Xuc_xac_2: d2,
            Xuc_xac_3: d3,
            Tong: tong,
            Ket_qua: ketQuaChuan,
            Phien_hien_tai: phien + 1,
            Du_doan: prediction.duDoan,
            Loai_cau: prediction.loaiCau,
            Mau_cau_phat_hien: prediction.mauCau,
            Ti_le_Tai: prediction.tyLeTai + '%',
            Ti_le_Xiu: prediction.tyLeXiu + '%',
            Do_tin_cay: prediction.doTinCay + '%',
            Trang_thai: 'Đã dự đoán',
            Ket_qua_du_doan: stats.total > 0 ? (stats.correct > stats.wrong ? '✅' : '❌') : '',
            Thong_ke: {
                tong: stats.total,
                dung: stats.correct,
                sai: stats.wrong,
                ti_le: tiLe
            },
            _tongHistory: currentData._tongHistory,
            id: '@tranhoang2286'
        };
        
        // Log
        console.log('\n' + '='.repeat(60));
        console.log(`📊 PHIÊN: ${phien}`);
        console.log(`🎲 Xúc xắc: [${d1}, ${d2}, ${d3}] - Tổng: ${tong}`);
        console.log(`✅ Kết quả: ${ketQuaChuan.toUpperCase()}`);
        console.log(`🔮 DỰ ĐOÁN PHIÊN ${phien+1}: ${prediction.duDoan.toUpperCase()}`);
        console.log(`📊 TỈ LỆ: Tài ${prediction.tyLeTai}% - Xỉu ${prediction.tyLeXiu}%`);
        console.log(`📈 ĐỘ TIN CẬY: ${prediction.doTinCay}%`);
        console.log(`🎯 LOẠI CẦU: ${prediction.loaiCau} - ${prediction.mauCau}`);
        console.log(`🏷️ ID: @tranhoang2286`);
        console.log('='.repeat(60));
    }
}

// ============================================================================
// ============ SERVER ============
// ============================================================================

app.set('etag', false);
app.use((req, res, next) => {
    res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.header('Pragma', 'no-cache');
    res.header('Expires', '0');
    next();
});

// Endpoint chính
app.get('/', (req, res) => {
    res.json(currentData);
});

// Endpoint API
app.get('/api/tx', async (req, res) => {
    const freshData = await layKetQua();
    if (freshData) {
        const phien = freshData.phien || 0;
        if (phien > currentData.Phien) {
            await xuLyDuDoan();
        }
    }
    res.json(currentData);
});

// Endpoint dự đoán
app.get('/api/predict', (req, res) => {
    res.json({
        success: true,
        data: currentData,
        timestamp: new Date().toISOString()
    });
});

// Endpoint thống kê
app.get('/api/stats', (req, res) => {
    res.json({
        success: true,
        stats: currentData.Thong_ke,
        history: history.slice(-20)
    });
});

// Health check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', phien: currentData.Phien });
});

// ============================================================================
// ============ KHỞI ĐỘNG ============
// ============================================================================

app.listen(PORT, async () => {
    console.log('\n🚀 MAX789 PREDICTOR V10.0');
    console.log('='.repeat(50));
    console.log(`🔗 Server: http://localhost:${PORT}`);
    console.log(`👤 Creator: @tranhoang2286`);
    console.log('='.repeat(50));
    
    // Chạy lần đầu
    await xuLyDuDoan();
    
    // Cập nhật mỗi 3 giây
    setInterval(xuLyDuDoan, CONFIG.CHECK_INTERVAL);
});

process.on('uncaughtException', (error) => {
    console.error('🔥 Lỗi:', error);
});
