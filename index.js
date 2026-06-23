const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================================
// CẤU HÌNH HỆ THỐNG
// ============================================================================
const CONFIG = {
    API_URL: 'https://expected-paying-pins-childhood.trycloudflare.com/api/tx',
    CHECK_INTERVAL: 3000,
    MAX_HISTORY: 500,
    MIN_DATA: 5
};

// ============================================================================
// BIẾN TOÀN CỤC
// ============================================================================
let history = [];
let stats = { total: 0, correct: 0, wrong: 0, streak: 0 };

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
    Nhan_dien_cau: {
        ten_cau: '',
        do_dai: 0,
        vi_tri_hien_tai: 0,
        du_doan_tiep: '',
        xac_suat: '0%'
    },
    Phan_tich_chi_tiet: {},
    id: '@tranhoang2286'
};

// ============================================================================
// HÀM LẤY DỮ LIỆU
// ============================================================================
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
// ============ 20 TẦNG PHÂN TÍCH ============
// ============================================================================

// TẦNG 1-5: THỐNG KÊ CƠ BẢN
function tang1_TanSuat(data) {
    if (data.length < 3) return { tai: 50, xiu: 50 };
    const tai = data.filter(x => x === 'tai').length;
    return {
        tai: Math.round((tai / data.length) * 100),
        xiu: Math.round(((data.length - tai) / data.length) * 100)
    };
}

function tang2_Chuoi(data) {
    if (data.length < 2) return { hien_tai: '', do_dai: 0 };
    let current = data[data.length - 1];
    let count = 0;
    for (let i = data.length - 1; i >= 0; i--) {
        if (data[i] === current) count++;
        else break;
    }
    return { hien_tai: current, do_dai: count };
}

function tang3_TongDiem(data, tongData) {
    if (tongData.length < 3) return { trung_binh: 10.5, xu_huong: 'can_bang' };
    const avg = tongData.reduce((a, b) => a + b, 0) / tongData.length;
    let xuHuong = 'can_bang';
    if (avg > 12) xuHuong = 'thien_tai';
    else if (avg < 9) xuHuong = 'thien_xiu';
    return { trung_binh: Math.round(avg * 10) / 10, xu_huong: xuHuong };
}

function tang4_BienDong(data) {
    if (data.length < 5) return { do_bien_dong: 50 };
    let changes = 0;
    for (let i = 1; i < data.length; i++) {
        if (data[i] !== data[i-1]) changes++;
    }
    return { do_bien_dong: Math.round((changes / (data.length - 1)) * 100) };
}

function tang5_XacSuatCoDieuKien(data) {
    if (data.length < 8) return { tai_sau_tai: 50, tai_sau_xiu: 50 };
    let tt = 0, tx = 0, xt = 0, xx = 0;
    for (let i = 0; i < data.length - 1; i++) {
        if (data[i] === 'tai' && data[i+1] === 'tai') tt++;
        else if (data[i] === 'tai' && data[i+1] === 'xiu') tx++;
        else if (data[i] === 'xiu' && data[i+1] === 'tai') xt++;
        else if (data[i] === 'xiu' && data[i+1] === 'xiu') xx++;
    }
    return {
        tai_sau_tai: tt + tx > 0 ? Math.round((tt / (tt + tx)) * 100) : 50,
        tai_sau_xiu: xt + xx > 0 ? Math.round((xt / (xt + xx)) * 100) : 50
    };
}

// ============================================================================
// TẦNG 6-10: NHẬN DIỆN CẦU
// ============================================================================

function tang6_NhanDienCau11(data) {
    // Cầu 1-1: T-X-T-X hoặc X-T-X-T
    if (data.length < 4) return { nhan_dang: false, du_doan: '' };
    const last4 = data.slice(-4);
    const isSoLe = last4.every((val, idx) => idx === 0 || val !== last4[idx-1]);
    if (isSoLe) {
        const next = data[data.length - 1] === 'tai' ? 'xiu' : 'tai';
        return { nhan_dang: true, ten_cau: 'Cầu 1-1 (So le)', do_dai: 4, du_doan: next, xac_suat: 75 };
    }
    return { nhan_dang: false };
}

function tang7_NhanDienCau22(data) {
    // Cầu 2-2: T-T-X-X hoặc X-X-T-T
    if (data.length < 4) return { nhan_dang: false };
    const last4 = data.slice(-4);
    if (last4[0] === last4[1] && last4[2] === last4[3] && last4[0] !== last4[2]) {
        const next = last4[3] === 'tai' ? 'xiu' : 'tai';
        return { nhan_dang: true, ten_cau: 'Cầu 2-2', do_dai: 4, du_doan: next, xac_suat: 72 };
    }
    return { nhan_dang: false };
}

function tang8_NhanDienCau31(data) {
    // Cầu 3-1: T-T-T-X hoặc X-X-X-T
    if (data.length < 4) return { nhan_dang: false };
    const last4 = data.slice(-4);
    if (last4[0] === last4[1] && last4[1] === last4[2] && last4[2] !== last4[3]) {
        return { nhan_dang: true, ten_cau: 'Cầu 3-1', do_dai: 4, du_doan: last4[2], xac_suat: 70 };
    }
    if (last4[1] === last4[2] && last4[2] === last4[3] && last4[0] !== last4[1]) {
        return { nhan_dang: true, ten_cau: 'Cầu 1-3', do_dai: 4, du_doan: last4[1], xac_suat: 70 };
    }
    return { nhan_dang: false };
}

function tang9_NhanDienCauBet(data) {
    // Cầu bệt: T-T-T-T hoặc X-X-X-X
    if (data.length < 4) return { nhan_dang: false };
    const last4 = data.slice(-4);
    if (last4.every(x => x === 'tai')) {
        return { nhan_dang: true, ten_cau: 'Cầu bệt Tài', do_dai: 4, du_doan: 'tai', xac_suat: 65 };
    }
    if (last4.every(x => x === 'xiu')) {
        return { nhan_dang: true, ten_cau: 'Cầu bệt Xỉu', do_dai: 4, du_doan: 'xiu', xac_suat: 65 };
    }
    return { nhan_dang: false };
}

function tang10_NhanDienCau32(data) {
    // Cầu 3-2: T-T-X-T-X hoặc X-X-T-X-T
    if (data.length < 5) return { nhan_dang: false };
    const last5 = data.slice(-5);
    const tai = last5.filter(x => x === 'tai').length;
    if (tai === 3 || tai === 2) {
        const next = tai === 3 ? 'xiu' : 'tai';
        return { nhan_dang: true, ten_cau: `Cầu 3-2 (${tai === 3 ? '3T-2X' : '2T-3X'})`, do_dai: 5, du_doan: next, xac_suat: 68 };
    }
    return { nhan_dang: false };
}

// ============================================================================
// TẦNG 11-15: PHÂN TÍCH NÂNG CAO
// ============================================================================

function tang11_Markov(data) {
    if (data.length < 10) return { du_doan: '', xac_suat: 50 };
    const last = data[data.length - 1];
    let taiSauTai = 0, xiuSauTai = 0, taiSauXiu = 0, xiuSauXiu = 0;
    for (let i = 0; i < data.length - 1; i++) {
        if (data[i] === 'tai') {
            if (data[i+1] === 'tai') taiSauTai++;
            else xiuSauTai++;
        } else {
            if (data[i+1] === 'tai') taiSauXiu++;
            else xiuSauXiu++;
        }
    }
    let duDoan = '';
    let xacSuat = 50;
    if (last === 'tai') {
        const total = taiSauTai + xiuSauTai;
        if (total > 0) {
            duDoan = taiSauTai > xiuSauTai ? 'tai' : 'xiu';
            xacSuat = Math.round((Math.max(taiSauTai, xiuSauTai) / total) * 100);
        }
    } else {
        const total = taiSauXiu + xiuSauXiu;
        if (total > 0) {
            duDoan = taiSauXiu > xiuSauXiu ? 'tai' : 'xiu';
            xacSuat = Math.round((Math.max(taiSauXiu, xiuSauXiu) / total) * 100);
        }
    }
    return { du_doan: duDoan, xac_suat: xacSuat };
}

function tang12_Fibonacci(data) {
    if (data.length < 15) return { du_doan: '', xac_suat: 50 };
    const levels = [0.236, 0.382, 0.5, 0.618, 0.786];
    const results = [];
    for (const level of levels) {
        const idx = Math.floor(data.length * level);
        const slice = data.slice(-idx);
        const tai = slice.filter(x => x === 'tai').length;
        results.push((tai / slice.length) * 100);
    }
    const avg = results.reduce((a, b) => a + b, 0) / results.length;
    return {
        du_doan: avg > 50 ? 'tai' : 'xiu',
        xac_suat: Math.round(Math.abs(avg - 50) + 50)
    };
}

function tang13_XuHuong(data) {
    if (data.length < 20) return { du_doan: '', xac_suat: 50 };
    const segSize = Math.floor(data.length / 3);
    const seg1 = data.slice(0, segSize);
    const seg2 = data.slice(segSize, 2*segSize);
    const seg3 = data.slice(2*segSize);
    const tai1 = seg1.filter(x => x === 'tai').length / seg1.length * 100;
    const tai2 = seg2.filter(x => x === 'tai').length / seg2.length * 100;
    const tai3 = seg3.filter(x => x === 'tai').length / seg3.length * 100;
    let duDoan = '';
    let xacSuat = 50;
    if (tai1 < tai2 && tai2 < tai3) {
        duDoan = 'tai';
        xacSuat = 65;
    } else if (tai1 > tai2 && tai2 > tai3) {
        duDoan = 'xiu';
        xacSuat = 65;
    } else if (Math.abs(tai1 - tai3) < 10) {
        duDoan = tai3 > 50 ? 'tai' : 'xiu';
        xacSuat = 55;
    }
    return { du_doan: duDoan, xac_suat: xacSuat };
}

function tang14_PhanKy(data) {
    if (data.length < 10) return { du_doan: '', xac_suat: 50 };
    const tai = data.filter(x => x === 'tai').length;
    const tyLe = tai / data.length;
    const divergence = tyLe - 0.5;
    let duDoan = '';
    let xacSuat = 50;
    if (divergence > 0.15) {
        duDoan = 'xiu';
        xacSuat = 65;
    } else if (divergence < -0.15) {
        duDoan = 'tai';
        xacSuat = 65;
    }
    return { du_doan: duDoan, xac_suat: xacSuat };
}

function tang15_ChuKy(data) {
    if (data.length < 15) return { du_doan: '', xac_suat: 50, chu_ky: 0 };
    for (let k = 2; k <= 10; k++) {
        let match = 0;
        for (let i = 0; i < data.length - k; i++) {
            if (data[i] === data[i+k]) match++;
        }
        if (match / (data.length - k) > 0.6) {
            const last = data[data.length - 1];
            const next = data[data.length - 1 - k] || '';
            return { du_doan: next, xac_suat: 70, chu_ky: k };
        }
    }
    return { du_doan: '', xac_suat: 50, chu_ky: 0 };
}

// ============================================================================
// TẦNG 16-20: TỔNG HỢP & ENSEMBLE
// ============================================================================

function tang16_TongHopCau(data) {
    // Tổng hợp tất cả các cầu đã nhận diện
    const cau11 = tang6_NhanDienCau11(data);
    const cau22 = tang7_NhanDienCau22(data);
    const cau31 = tang8_NhanDienCau31(data);
    const cauBet = tang9_NhanDienCauBet(data);
    const cau32 = tang10_NhanDienCau32(data);
    
    const cauPhatHien = [cau11, cau22, cau31, cauBet, cau32].filter(c => c.nhan_dang);
    
    if (cauPhatHien.length === 0) {
        return { ten_cau: 'Không xác định', du_doan: '', xac_suat: 50 };
    }
    
    // Lấy cầu có xác suất cao nhất
    const best = cauPhatHien.reduce((a, b) => a.xac_suat > b.xac_suat ? a : b);
    return {
        ten_cau: best.ten_cau,
        du_doan: best.du_doan,
        xac_suat: best.xac_suat,
        so_luong: cauPhatHien.length
    };
}

function tang17_TrongSo(data) {
    const tanSuat = tang1_TanSuat(data);
    const chuoi = tang2_Chuoi(data);
    const tongDiem = tang3_TongDiem(data, []);
    const bienDong = tang4_BienDong(data);
    const xacSuat = tang5_XacSuatCoDieuKien(data);
    const markov = tang11_Markov(data);
    const fibo = tang12_Fibonacci(data);
    const xuHuong = tang13_XuHuong(data);
    const phanKy = tang14_PhanKy(data);
    const chuKy = tang15_ChuKy(data);
    const tongCau = tang16_TongHopCau(data);
    
    // Trọng số cho từng tầng
    const weights = {
        tanSuat: 0.10,
        chuoi: 0.12,
        tongDiem: 0.05,
        bienDong: 0.05,
        xacSuat: 0.08,
        markov: 0.10,
        fibo: 0.06,
        xuHuong: 0.06,
        phanKy: 0.05,
        chuKy: 0.08,
        tongCau: 0.25
    };
    
    let diemTai = 50;
    let diemXiu = 50;
    let tongTrongSo = 0;
    
    // Hàm cộng điểm
    const congDiem = (duDoan, xacSuat, weight) => {
        if (!duDoan) return;
        const diem = (xacSuat - 50) * 2;
        if (duDoan === 'tai') {
            diemTai += diem * weight;
        } else if (duDoan === 'xiu') {
            diemXiu += diem * weight;
        }
        tongTrongSo += weight;
    };
    
    // Áp dụng từng tầng
    congDiem(tanSuat.tai > tanSuat.xiu ? 'tai' : 'xiu', 
             Math.abs(tanSuat.tai - tanSuat.xiu) + 50, weights.tanSuat);
    
    if (chuoi.do_dai >= 3) {
        congDiem(chuoi.hien_tai === 'tai' ? 'xiu' : 'tai', 65, weights.chuoi);
    }
    
    congDiem(markov.du_doan, markov.xac_suat, weights.markov);
    congDiem(fibo.du_doan, fibo.xac_suat, weights.fibo);
    congDiem(xuHuong.du_doan, xuHuong.xac_suat, weights.xuHuong);
    congDiem(phanKy.du_doan, phanKy.xac_suat, weights.phanKy);
    congDiem(chuKy.du_doan, chuKy.xac_suat, weights.chuKy);
    congDiem(tongCau.du_doan, tongCau.xac_suat, weights.tongCau);
    
    // Chuẩn hóa
    const total = diemTai + diemXiu;
    diemTai = Math.round((diemTai / total) * 100);
    diemXiu = Math.round((diemXiu / total) * 100);
    
    if (diemTai + diemXiu !== 100) {
        if (diemTai > diemXiu) diemTai = 100 - diemXiu;
        else diemXiu = 100 - diemTai;
    }
    
    return {
        tiLeTai: diemTai,
        tiLeXiu: diemXiu,
        duDoan: diemTai > diemXiu ? 'tai' : 'xiu',
        doTinCay: Math.min(50 + Math.abs(diemTai - diemXiu) * 0.3, 85),
        cauPhatHien: tongCau
    };
}

// ============================================================================
// ============ HÀM DỰ ĐOÁN CHÍNH ============
// ============================================================================

function duDoanTongHop(data) {
    if (data.length < CONFIG.MIN_DATA) {
        return {
            duDoan: 'tai',
            tiLeTai: 50,
            tiLeXiu: 50,
            doTinCay: 50,
            loaiCau: 'Chưa đủ dữ liệu',
            mauCau: 'Chưa đủ dữ liệu',
            cauPhatHien: {}
        };
    }
    
    // Lấy kết quả từ tầng 17 (trọng số)
    const result = tang17_TrongSo(data);
    
    // Phân tích cầu chi tiết
    const cau11 = tang6_NhanDienCau11(data);
    const cau22 = tang7_NhanDienCau22(data);
    const cau31 = tang8_NhanDienCau31(data);
    const cauBet = tang9_NhanDienCauBet(data);
    const cau32 = tang10_NhanDienCau32(data);
    const tongCau = tang16_TongHopCau(data);
    
    // Tìm cầu đang hoạt động
    let cauHoatDong = [];
    if (cau11.nhan_dang) cauHoatDong.push(cau11);
    if (cau22.nhan_dang) cauHoatDong.push(cau22);
    if (cau31.nhan_dang) cauHoatDong.push(cau31);
    if (cauBet.nhan_dang) cauHoatDong.push(cauBet);
    if (cau32.nhan_dang) cauHoatDong.push(cau32);
    
    let tenCau = tongCau.ten_cau || 'Không xác định';
    let mauCau = '';
    if (cauHoatDong.length > 0) {
        const bestCau = cauHoatDong.reduce((a, b) => a.xac_suat > b.xac_suat ? a : b);
        mauCau = bestCau.ten_cau;
        if (tenCau === 'Không xác định') tenCau = bestCau.ten_cau;
    }
    
    return {
        duDoan: result.duDoan,
        tiLeTai: result.tiLeTai,
        tiLeXiu: result.tiLeXiu,
        doTinCay: result.doTinCay,
        loaiCau: tenCau,
        mauCau: mauCau || tenCau,
        cauPhatHien: {
            tong_cau: cauHoatDong.length,
            danh_sach: cauHoatDong.map(c => c.ten_cau),
            cau_chinh: tenCau
        }
    };
}

// ============================================================================
// ============ XỬ LÝ DỰ ĐOÁN ============
// ============================================================================

async function xuLyDuDoan() {
    const data = await layKetQua();
    if (!data) return;

    const d1 = data.xuc_xac_1 || 0;
    const d2 = data.xuc_xac_2 || 0;
    const d3 = data.xuc_xac_3 || 0;
    const tong = d1 + d2 + d3;
    const ketQua = data.ket_qua || (tong >= 11 ? 'tài' : 'xỉu');
    const phien = data.phien || 0;
    const ketQuaChuan = ketQua.toLowerCase().replace('ài', 'ai').replace('ỉu', 'iu');

    if (phien > (currentData.Phien || 0)) {
        if (ketQuaChuan) {
            history.push(ketQuaChuan);
            if (history.length > CONFIG.MAX_HISTORY) history.shift();

            if (currentData.Du_doan) {
                const isCorrect = currentData.Du_doan === ketQuaChuan;
                stats.total++;
                if (isCorrect) stats.correct++;
                else stats.wrong++;
            }
        }

        const prediction = duDoanTongHop(history);
        const tiLe = stats.total > 0 ? (stats.correct / stats.total * 100).toFixed(1) + '%' : '0%';

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
            Ti_le_Tai: prediction.tiLeTai + '%',
            Ti_le_Xiu: prediction.tiLeXiu + '%',
            Do_tin_cay: prediction.doTinCay + '%',
            Trang_thai: 'Đã dự đoán',
            Ket_qua_du_doan: stats.total > 0 ? (stats.correct > stats.wrong ? '✅' : '❌') : '',
            Thong_ke: {
                tong: stats.total,
                dung: stats.correct,
                sai: stats.wrong,
                ti_le: tiLe
            },
            Nhan_dien_cau: {
                ten_cau: prediction.loaiCau,
                do_dai: history.length > 0 ? Math.min(10, history.length) : 0,
                vi_tri_hien_tai: history.length,
                du_doan_tiep: prediction.duDoan,
                xac_suat: prediction.doTinCay + '%'
            },
            Phan_tich_chi_tiet: {
                tong_phan_tich: history.length,
                cau_phat_hien: prediction.cauPhatHien,
                ty_le_tai: prediction.tiLeTai,
                ty_le_xiu: prediction.tiLeXiu,
                do_tin_cay: prediction.doTinCay
            },
            id: '@tranhoang2286'
        };

        // Log chi tiết
        console.log('\n' + '='.repeat(70));
        console.log(`📊 PHIÊN: ${phien}`);
        console.log(`🎲 Xúc xắc: [${d1}, ${d2}, ${d3}] = ${tong}`);
        console.log(`✅ Kết quả: ${ketQuaChuan.toUpperCase()}`);
        console.log(`🔮 DỰ ĐOÁN: ${prediction.duDoan.toUpperCase()}`);
        console.log(`📈 TỈ LỆ: Tài ${prediction.tiLeTai}% - Xỉu ${prediction.tiLeXiu}%`);
        console.log(`🎯 ĐỘ TIN CẬY: ${prediction.doTinCay}%`);
        console.log(`🏷️ ID: @tranhoang2286`);
        console.log(`\n📐 NHẬN DIỆN CẦU:`);
        console.log(`   • Loại cầu: ${prediction.loaiCau}`);
        console.log(`   • Mẫu cầu: ${prediction.mauCau}`);
        console.log(`   • Số cầu phát hiện: ${prediction.cauPhatHien.tong_cau}`);
        if (prediction.cauPhatHien.danh_sach) {
            prediction.cauPhatHien.danh_sach.forEach((c, i) => {
                console.log(`   • Cầu ${i+1}: ${c}`);
            });
        }
        console.log('='.repeat(70));
    }
}

// ============================================================================
// ============ MIDDLEWARE & API ============
// ============================================================================

app.set('etag', false);
app.use((req, res, next) => {
    res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.header('Pragma', 'no-cache');
    res.header('Expires', '0');
    next();
});

app.get('/', (req, res) => {
    res.json(currentData);
});

app.get('/api/tx', async (req, res) => {
    const fresh = await layKetQua();
    if (fresh && fresh.phien > currentData.Phien) {
        await xuLyDuDoan();
    }
    res.json(currentData);
});

app.get('/api/predict', (req, res) => {
    res.json({
        success: true,
        data: currentData,
        timestamp: new Date().toISOString()
    });
});

app.get('/api/stats', (req, res) => {
    res.json({
        success: true,
        stats: currentData.Thong_ke,
        history: history.slice(-30),
        cau_phat_hien: currentData.Phan_tich_chi_tiet.cau_phat_hien || {}
    });
});

app.get('/api/cau', (req, res) => {
    // Endpoint chuyên nhận diện cầu
    const result = duDoanTongHop(history);
    res.json({
        success: true,
        cau: result.cauPhatHien,
        loai_cau: result.loaiCau,
        mau_cau: result.mauCau,
        du_doan: result.duDoan,
        ti_le: { tai: result.tiLeTai, xiu: result.tiLeXiu }
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'OK', phien: currentData.Phien, total: history.length });
});

// ============================================================================
// ============ KHỞI ĐỘNG ============
// ============================================================================

app.listen(PORT, async () => {
    console.log('\n' + '='.repeat(70));
    console.log('🚀 MAX789 SIÊU DỰ ĐOÁN V11.0 - 20 TẦNG PHÂN TÍCH');
    console.log('='.repeat(70));
    console.log(`🔗 Server: http://localhost:${PORT}`);
    console.log(`👤 Creator: @tranhoang2286`);
    console.log(`📊 20 tầng phân tích + Nhận diện cầu chuyên sâu`);
    console.log('='.repeat(70));
    
    await xuLyDuDoan();
    setInterval(xuLyDuDoan, CONFIG.CHECK_INTERVAL);
});

process.on('uncaughtException', (error) => {
    console.error('🔥 Lỗi:', error);
});
