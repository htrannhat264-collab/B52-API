const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

// ============ CẤU HÌNH ============
const API_URL = 'https://expected-paying-pins-childhood.trycloudflare.com/api/tx';
const CHECK_INTERVAL = 5000; // 5 giây để cập nhật nhanh

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
    Do_tin_cay: '0%',
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
        const response = await axios.get(API_URL, {
            timeout: 5000,
            headers: { 'Cache-Control': 'no-cache' }
        });
        return response.data;
    } catch (error) {
        console.error('❌ Lỗi API:', error.message);
        return null;
    }
}

// ============ TẦNG 1: PHÂN TÍCH TẦN SUẤT ============
function phanTichTanSuat(data) {
    if (data.length < 3) return { tai: 0, xiu: 0, tyLeTai: 50 };
    const tai = data.filter(x => x === 'tai').length;
    const tyLe = (tai / data.length) * 100;
    return { tai, xiu: data.length - tai, tyLeTai: tyLe };
}

// ============ TẦNG 2: PHÂN TÍCH CHUỖI ============
function phanTichChuoi(data) {
    if (data.length < 2) return { chuoiHienTai: '', doDai: 0 };
    let current = data[data.length - 1];
    let count = 0;
    for (let i = data.length - 1; i >= 0; i--) {
        if (data[i] === current) count++;
        else break;
    }
    return { chuoiHienTai: current, doDai: count };
}

// ============ TẦNG 3: NHẬN DIỆN MẪU CẦU ============
function nhanDienMauCau(data) {
    if (data.length < 4) return { pattern: 'Chưa đủ dữ liệu', type: 'Chưa xác định' };
    
    const last4 = data.slice(-4);
    const last3 = data.slice(-3);
    
    // Cầu 1-1 (so le)
    if (last4[0] !== last4[1] && last4[1] !== last4[2] && last4[2] !== last4[3]) {
        return { pattern: '1-1', type: 'Cầu so le' };
    }
    
    // Cầu 2-2 (Tài Xỉu Tài Xỉu)
    if (last4[0] === last4[2] && last4[1] === last4[3] && last4[0] !== last4[1]) {
        return { pattern: '2-2', type: 'Cầu 2-2' };
    }
    
    // Cầu 3-1 (3 Tài 1 Xỉu hoặc ngược lại)
    if (last4[0] === last4[1] && last4[1] === last4[2] && last4[2] !== last4[3]) {
        return { pattern: '3-1', type: 'Cầu 3-1' };
    }
    if (last4[1] === last4[2] && last4[2] === last4[3] && last4[0] !== last4[1]) {
        return { pattern: '1-3', type: 'Cầu 1-3' };
    }
    
    // Cầu bệt (toàn Tài hoặc toàn Xỉu)
    if (last3.every(x => x === 'tai')) {
        return { pattern: 'Bệt Tài', type: 'Cầu bệt' };
    }
    if (last3.every(x => x === 'xiu')) {
        return { pattern: 'Bệt Xỉu', type: 'Cầu bệt' };
    }
    
    return { pattern: 'Không xác định', type: 'Cầu lộn xộn' };
}

// ============ TẦNG 4: DỰ ĐOÁN TỔNG HỢP ============
function duDoanTongHop(data) {
    if (data.length < 3) return { duDoan: 'tai', confidence: 50, loaiCau: 'Chưa xác định', mauCau: 'Chưa đủ' };
    
    // Phân tích tần suất
    const tanSuat = phanTichTanSuat(data);
    const chuoi = phanTichChuoi(data);
    const mauCau = nhanDienMauCau(data);
    
    let diemTai = tanSuat.tyLeTai;
    let diemXiu = 100 - diemTai;
    let confidence = 0;
    
    // Điều chỉnh theo chuỗi
    if (chuoi.doDai >= 3) {
        if (chuoi.chuoiHienTai === 'tai') {
            diemTai -= 15; // Giảm điểm cho Tài khi đã bệt
            diemXiu += 15;
        } else {
            diemTai += 15;
            diemXiu -= 15;
        }
    }
    
    // Điều chỉnh theo mẫu cầu
    if (mauCau.type === 'Cầu so le') {
        const last = data[data.length - 1];
        if (last === 'tai') {
            diemTai -= 10;
            diemXiu += 10;
        } else {
            diemTai += 10;
            diemXiu -= 10;
        }
    }
    
    // Đảm bảo tổng = 100
    const total = diemTai + diemXiu;
    diemTai = (diemTai / total) * 100;
    diemXiu = (diemXiu / total) * 100;
    
    // Quyết định
    const duDoan = diemTai > 50 ? 'tai' : 'xiu';
    confidence = Math.abs(diemTai - diemXiu);
    
    return {
        duDoan: duDoan,
        confidence: Math.min(confidence / 100, 0.95),
        loaiCau: mauCau.type,
        mauCau: mauCau.pattern,
        tyLeTai: diemTai,
        tyLeXiu: diemXiu
    };
}

// ============ XỬ LÝ DỰ ĐOÁN CHÍNH ============
async function xuLyDuDoan() {
    const data = await layKetQua();
    if (!data) return;
    
    const d1 = data.xuc_xac_1 || 0;
    const d2 = data.xuc_xac_2 || 0;
    const d3 = data.xuc_xac_3 || 0;
    const tong = d1 + d2 + d3;
    const ketQua = data.ket_qua || (tong >= 11 ? 'tài' : 'xỉu');
    const phien = data.phien || 0;
    const ketQuaChuan = ketQua.toLowerCase();
    
    // Cập nhật lịch sử
    if (phien > (currentData.Phien || 0)) {
        if (ketQuaChuan) {
            history.push(ketQuaChuan);
            if (history.length > 100) history.shift();
            
            // Kiểm tra dự đoán trước đó
            if (currentData.Du_doan) {
                const prevPrediction = currentData.Du_doan;
                const isCorrect = prevPrediction === ketQuaChuan;
                stats.total++;
                if (isCorrect) stats.correct++;
                else stats.wrong++;
            }
        }
        
        // Dự đoán phiên tiếp theo
        const prediction = duDoanTongHop(history);
        const tiLe = stats.total > 0 ? (stats.correct / stats.total * 100).toFixed(1) + '%' : '0%';
        
        // Cập nhật dữ liệu
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
            Do_tin_cay: (prediction.confidence * 100).toFixed(0) + '%',
            Trang_thai: 'Đã dự đoán',
            Ket_qua_du_doan: stats.total > 0 ? (stats.correct > stats.wrong ? '✅' : '❌') : '',
            Thong_ke: {
                tong: stats.total,
                dung: stats.correct,
                sai: stats.wrong,
                ti_le: tiLe
            },
            id: '@tranhoang2286'
        };
        
        console.log(`\n📊 PHIÊN ${phien}: ${ketQuaChuan.toUpperCase()}`);
        console.log(`🎲 Xúc xắc: [${d1}, ${d2}, ${d3}] - Tổng: ${tong}`);
        console.log(`🔮 DỰ ĐOÁN PHIÊN ${phien+1}: ${prediction.duDoan.toUpperCase()}`);
        console.log(`📈 ĐỘ TIN CẬY: ${(prediction.confidence * 100).toFixed(0)}%`);
        console.log(`📊 Tỷ lệ: Tài ${prediction.tyLeTai.toFixed(1)}% - Xỉu ${prediction.tyLeXiu.toFixed(1)}%`);
        console.log(`🏷️ ID: @tranhoang2286`);
        console.log('-'.repeat(50));
    }
}

// ============ API ENDPOINTS ============

// Middleware xóa cache
app.set('etag', false);
app.use((req, res, next) => {
    res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.header('Pragma', 'no-cache');
    res.header('Expires', '0');
    next();
});

// Endpoint chính - trả về đúng format mày cần
app.get('/', (req, res) => {
    res.json(currentData);
});

// Endpoint /api/tx - clone API gốc nhưng có thêm dự đoán
app.get('/api/tx', async (req, res) => {
    // Lấy dữ liệu mới nhất
    const freshData = await layKetQua();
    if (freshData) {
        // Cập nhật nếu có phiên mới
        const phien = freshData.phien || 0;
        if (phien > currentData.Phien) {
            await xuLyDuDoan();
        }
    }
    res.json(currentData);
});

// Endpoint /api/predict - dự đoán riêng
app.get('/api/predict', (req, res) => {
    res.json({
        success: true,
        data: currentData,
        timestamp: new Date().toISOString()
    });
});

// Endpoint /api/stats - thống kê
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

// ============ KHỞI ĐỘNG SERVER ============
app.listen(PORT, async () => {
    console.log('\n🚀 MAX789 PREDICTOR V9.0');
    console.log('='.repeat(50));
    console.log(`🔗 Server: http://localhost:${PORT}`);
    console.log(`👤 Creator: @tranhoang2286`);
    console.log('='.repeat(50));
    
    // Chạy lần đầu
    await xuLyDuDoan();
    
    // Cập nhật mỗi 5 giây
    setInterval(xuLyDuDoan, CHECK_INTERVAL);
});

// Xử lý lỗi
process.on('uncaughtException', (error) => {
    console.error('🔥 Lỗi:', error);
});
