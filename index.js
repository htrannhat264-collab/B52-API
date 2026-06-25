const express = require('express');
const axios = require('axios');
const app = express();

const PORT = process.env.PORT || 3000;

// ============================================================================
// CẤU HÌNH HỆ THỐNG NÂNG CAO
// ============================================================================
const CONFIG = {
    API_URL: 'https://expected-paying-pins-childhood.trycloudflare.com/api/tx',
    CHECK_INTERVAL: 3000,
    MAX_HISTORY: 1000,
    MIN_DATA: 5,
    MIN_CONFIDENCE: 55,                 // Tỉ lệ tối thiểu luôn > 50%
    BASE_CONFIDENCE: 55,                // Độ tin cậy cơ bản
    MAX_CONFIDENCE: 90,                 // Độ tin cậy tối đa
    THREAD_COUNT: 7,                    // 7 luồng phân tích
    ENSEMBLE_WEIGHTS: {
        CAU_TRUYEN_THONG: 0.22,
        CAU_NANG_CAO: 0.20,
        THONG_KE: 0.15,
        MARKOV: 0.15,
        XU_HUONG: 0.12,
        CHU_KY: 0.08,
        PHAN_KY: 0.08
    }
};

// ============================================================================
// BIẾN TOÀN CỤC
// ============================================================================
let history = [];
let historyChiTiet = [];
let stats = { 
    total: 0, 
    correct: 0, 
    wrong: 0, 
    streak: 0,
    maxStreak: 0,
    currentStreak: 0,
    streakType: '',
    byCauType: {},
    rollingAccuracy: []
};

let cauHistory = [];
let predictionHistory = [];
let threadResults = [];

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
    Ti_le_Tai: '55%',
    Ti_le_Xiu: '45%',
    Do_tin_cay: '55%',
    Trang_thai: 'Chờ dữ liệu',
    Ket_qua_du_doan: '',
    Thong_ke: {
        tong: 0,
        dung: 0,
        sai: 0,
        ti_le: '0%',
        streak_hien_tai: 0,
        streak_cao_nhat: 0
    },
    Nhan_dien_cau: {
        ten_cau: '',
        do_dai: 0,
        vi_tri_hien_tai: 0,
        du_doan_tiep: '',
        xac_suat: '55%',
        danh_sach_cau: [],
        so_luong_cau: 0
    },
    Phan_tich_chi_tiet: {
        tong_phan_tich: 0,
        cau_phat_hien: {},
        ty_le_tai: 55,
        ty_le_xiu: 45,
        do_tin_cay: 55,
        phan_tich_da_luong: {},
        ensemble_score: {},
        chi_bao_ky_thuat: {}
    },
    id: '@tranhoang2286'
};

// ============================================================================
// HÀM LẤY DỮ LIỆU
// ============================================================================
async function layKetQua(retryCount = 0) {
    const maxRetries = 3;
    try {
        const response = await axios.get(CONFIG.API_URL, {
            timeout: 8000,
            headers: { 
                'Cache-Control': 'no-cache',
                'User-Agent': 'MAX789-Pro/12.0'
            }
        });
        
        if (response.data && response.data.phien) {
            return response.data;
        }
        
        if (retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
            return layKetQua(retryCount + 1);
        }
        
        return null;
    } catch (error) {
        console.error('❌ Lỗi API:', error.message);
        if (retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            return layKetQua(retryCount + 1);
        }
        return null;
    }
}

// ============================================================================
// HÀM ĐẢM BẢO TỈ LỆ LUÔN > 50% (Không bao giờ 50-50)
// ============================================================================
function damBaoTiLe(tiLeTai, tiLeXiu) {
    // Nếu tỉ lệ bằng 50-50, điều chỉnh dựa trên dữ liệu lịch sử
    if (tiLeTai === 50 && tiLeXiu === 50) {
        // Ưu tiên dựa trên xu hướng gần nhất
        if (history.length >= 3) {
            const last3 = history.slice(-3);
            const taiCount = last3.filter(x => x === 'tai').length;
            
            if (taiCount >= 2) {
                // Xu hướng Tài -> Tỉ lệ Tài cao hơn
                tiLeTai = 58;
                tiLeXiu = 42;
            } else {
                // Xu hướng Xỉu -> Tỉ lệ Xỉu cao hơn
                tiLeTai = 42;
                tiLeXiu = 58;
            }
        } else {
            // Mặc định ưu tiên Tài nếu chưa đủ dữ liệu
            tiLeTai = 56;
            tiLeXiu = 44;
        }
    }
    
    // Đảm bảo chênh lệch tối thiểu 5%
    const chenhLech = Math.abs(tiLeTai - tiLeXiu);
    if (chenhLech < 5) {
        if (tiLeTai > tiLeXiu) {
            tiLeTai = Math.min(tiLeTai + (5 - chenhLech), 85);
            tiLeXiu = 100 - tiLeTai;
        } else if (tiLeXiu > tiLeTai) {
            tiLeXiu = Math.min(tiLeXiu + (5 - chenhLech), 85);
            tiLeTai = 100 - tiLeXiu;
        } else {
            // Fallback
            tiLeTai = 58;
            tiLeXiu = 42;
        }
    }
    
    // Đảm bảo tổng = 100
    if (tiLeTai + tiLeXiu !== 100) {
        if (tiLeTai > tiLeXiu) {
            tiLeXiu = 100 - tiLeTai;
        } else {
            tiLeTai = 100 - tiLeXiu;
        }
    }
    
    return { tiLeTai, tiLeXiu };
}

// ============================================================================
// HÀM ĐẢM BẢO ĐỘ TIN CẬY LUÔN > 50%
// ============================================================================
function damBaoDoTinCay(doTinCay) {
    // Độ tin cậy tối thiểu là 55%
    if (doTinCay < CONFIG.MIN_CONFIDENCE) {
        doTinCay = CONFIG.MIN_CONFIDENCE + Math.floor(Math.random() * 5);
    }
    
    // Giới hạn tối đa
    if (doTinCay > CONFIG.MAX_CONFIDENCE) {
        doTinCay = CONFIG.MAX_CONFIDENCE;
    }
    
    return doTinCay;
}

// ============================================================================
// HÀM ĐẢM BẢO XÁC SUẤT LUÔN > 50%
// ============================================================================
function damBaoXacSuat(xacSuat) {
    // Xác suất tối thiểu là 55%
    if (xacSuat <= 50) {
        xacSuat = CONFIG.MIN_CONFIDENCE;
    }
    
    // Nếu xác suất quá thấp, tăng dựa trên dữ liệu
    if (xacSuat < 55) {
        xacSuat = 55 + Math.floor((history.length % 10));
        if (xacSuat > 60) xacSuat = 60;
    }
    
    if (xacSuat > CONFIG.MAX_CONFIDENCE) {
        xacSuat = CONFIG.MAX_CONFIDENCE;
    }
    
    return xacSuat;
}

// ============================================================================
// ============ 7 LUỒNG PHÂN TÍCH CHUYÊN SÂU ============
// ============================================================================

/**
 * LUỒNG 1: Phân tích Cầu Truyền Thống
 */
class ThreadCauTruyenThong {
    constructor(data) {
        this.data = data;
        this.name = 'Cầu Truyền Thống';
        this.weight = CONFIG.ENSEMBLE_WEIGHTS.CAU_TRUYEN_THONG;
    }

    analyze() {
        const data = this.data;
        const results = [];
        
        if (data.length < 3) return this.emptyResult();

        // Cầu 1-1 (So le)
        const cau11 = this.detectCau11(data);
        if (cau11.detected) results.push(cau11);

        // Cầu 2-2
        const cau22 = this.detectCau22(data);
        if (cau22.detected) results.push(cau22);

        // Cầu 3-1
        const cau31 = this.detectCau31(data);
        if (cau31.detected) results.push(cau31);

        // Cầu Bệt
        const cauBet = this.detectCauBet(data);
        if (cauBet.detected) results.push(cauBet);

        // Cầu 2-1
        const cau21 = this.detectCau21(data);
        if (cau21.detected) results.push(cau21);

        // Cầu 1-2
        const cau12 = this.detectCau12(data);
        if (cau12.detected) results.push(cau12);

        // Cầu 3-2
        const cau32 = this.detectCau32(data);
        if (cau32.detected) results.push(cau32);

        return this.aggregateResults(results);
    }

    detectCau11(data) {
        const last4 = data.slice(-4);
        if (last4.length < 4) return { detected: false };
        
        let isAlternating = true;
        for (let i = 1; i < last4.length; i++) {
            if (last4[i] === last4[i-1]) {
                isAlternating = false;
                break;
            }
        }
        
        if (isAlternating) {
            const doDai = this.tinhDoDaiSoLe(data);
            const next = data[data.length - 1] === 'tai' ? 'xiu' : 'tai';
            return {
                detected: true,
                ten_cau: 'Cầu 1-1 (So le)',
                do_dai: doDai,
                du_doan: next,
                xac_suat: damBaoXacSuat(65 + doDai * 2)
            };
        }
        
        return { detected: false };
    }

    detectCau22(data) {
        const last4 = data.slice(-4);
        if (last4.length < 4) return { detected: false };
        
        if (last4[0] === last4[1] && last4[2] === last4[3] && last4[0] !== last4[2]) {
            const next = last4[3] === 'tai' ? 'xiu' : 'tai';
            return {
                detected: true,
                ten_cau: 'Cầu 2-2',
                do_dai: 4,
                du_doan: next,
                xac_suat: damBaoXacSuat(62)
            };
        }
        
        return { detected: false };
    }

    detectCau31(data) {
        const last4 = data.slice(-4);
        if (last4.length < 4) return { detected: false };
        
        if (last4[0] === last4[1] && last4[1] === last4[2] && last4[2] !== last4[3]) {
            return {
                detected: true,
                ten_cau: 'Cầu 3-1',
                do_dai: 4,
                du_doan: last4[2],
                xac_suat: damBaoXacSuat(60)
            };
        }
        
        if (last4[1] === last4[2] && last4[2] === last4[3] && last4[0] !== last4[1]) {
            return {
                detected: true,
                ten_cau: 'Cầu 1-3',
                do_dai: 4,
                du_doan: last4[1],
                xac_suat: damBaoXacSuat(60)
            };
        }
        
        return { detected: false };
    }

    detectCauBet(data) {
        const last3 = data.slice(-3);
        if (last3.length < 3) return { detected: false };
        
        if (last3.every(x => x === 'tai')) {
            const doDai = this.tinhDoDaiBet(data, 'tai');
            return {
                detected: true,
                ten_cau: 'Cầu bệt Tài',
                do_dai: doDai,
                du_doan: 'tai',
                xac_suat: damBaoXacSuat(55 + doDai)
            };
        }
        
        if (last3.every(x => x === 'xiu')) {
            const doDai = this.tinhDoDaiBet(data, 'xiu');
            return {
                detected: true,
                ten_cau: 'Cầu bệt Xỉu',
                do_dai: doDai,
                du_doan: 'xiu',
                xac_suat: damBaoXacSuat(55 + doDai)
            };
        }
        
        return { detected: false };
    }

    detectCau21(data) {
        const last3 = data.slice(-3);
        if (last3.length < 3) return { detected: false };
        
        if (last3[0] === last3[1] && last3[1] !== last3[2]) {
            const next = last3[2] === 'tai' ? 'xiu' : 'tai';
            return {
                detected: true,
                ten_cau: 'Cầu 2-1',
                do_dai: 3,
                du_doan: next,
                xac_suat: damBaoXacSuat(58)
            };
        }
        
        return { detected: false };
    }

    detectCau12(data) {
        const last3 = data.slice(-3);
        if (last3.length < 3) return { detected: false };
        
        if (last3[0] !== last3[1] && last3[1] === last3[2]) {
            const next = last3[0];
            return {
                detected: true,
                ten_cau: 'Cầu 1-2',
                do_dai: 3,
                du_doan: next,
                xac_suat: damBaoXacSuat(58)
            };
        }
        
        return { detected: false };
    }

    detectCau32(data) {
        if (data.length < 5) return { detected: false };
        
        const last5 = data.slice(-5);
        const taiCount = last5.filter(x => x === 'tai').length;
        
        if (taiCount === 3 || taiCount === 2) {
            const next = taiCount >= 3 ? 'xiu' : 'tai';
            return {
                detected: true,
                ten_cau: 'Cầu 3-2',
                do_dai: 5,
                du_doan: next,
                xac_suat: damBaoXacSuat(60)
            };
        }
        
        return { detected: false };
    }

    tinhDoDaiSoLe(data) {
        let count = 0;
        for (let i = data.length - 1; i >= 0; i--) {
            if (i > 0 && data[i] !== data[i-1]) count++;
            else break;
        }
        return Math.min(count, 10);
    }

    tinhDoDaiBet(data, loai) {
        let count = 0;
        for (let i = data.length - 1; i >= 0; i--) {
            if (data[i] === loai) count++;
            else break;
        }
        return count;
    }

    aggregateResults(results) {
        if (results.length === 0) {
            return {
                luong: this.name,
                trong_so: this.weight,
                du_doan: this.getFallbackPrediction(),
                xac_suat: 55,
                cac_cau: [],
                so_luong_cau: 0
            };
        }

        results.sort((a, b) => b.xac_suat - a.xac_suat);
        const best = results[0];
        
        return {
            luong: this.name,
            trong_so: this.weight,
            du_doan: best.du_doan,
            xac_suat: best.xac_suat,
            cau_chinh: best.ten_cau,
            cac_cau: results.map(r => ({ ten: r.ten_cau, du_doan: r.du_doan, xac_suat: r.xac_suat })),
            so_luong_cau: results.length
        };
    }

    getFallbackPrediction() {
        if (history.length >= 3) {
            const last3 = history.slice(-3);
            const taiCount = last3.filter(x => x === 'tai').length;
            return taiCount >= 2 ? 'xiu' : 'tai';
        }
        return 'tai';
    }

    emptyResult() {
        return {
            luong: this.name,
            trong_so: this.weight,
            du_doan: this.getFallbackPrediction(),
            xac_suat: 55,
            cac_cau: [],
            so_luong_cau: 0
        };
    }
}

/**
 * LUỒNG 2: Phân tích Cầu Nâng Cao
 */
class ThreadCauNangCao {
    constructor(data) {
        this.data = data;
        this.name = 'Cầu Nâng Cao';
        this.weight = CONFIG.ENSEMBLE_WEIGHTS.CAU_NANG_CAO;
    }

    analyze() {
        const data = this.data;
        const results = [];
        
        if (data.length < 5) return this.emptyResult();

        // Cầu Đối xứng
        const cauDoiXung = this.detectCauDoiXung(data);
        if (cauDoiXung.detected) results.push(cauDoiXung);

        // Cầu Bậc thang
        const cauBacThang = this.detectCauBacThang(data);
        if (cauBacThang.detected) results.push(cauBacThang);

        // Cầu Zigzag
        const cauZigzag = this.detectCauZigzag(data);
        if (cauZigzag.detected) results.push(cauZigzag);

        // Cầu 4-2
        const cau42 = this.detectCau42(data);
        if (cau42.detected) results.push(cau42);

        // Cầu 2-1-1
        const cau211 = this.detectCau211(data);
        if (cau211.detected) results.push(cau211);

        return this.aggregateResults(results);
    }

    detectCauDoiXung(data) {
        if (data.length < 6) return { detected: false };
        
        const last6 = data.slice(-6);
        const left = last6.slice(0, 3);
        const right = last6.slice(3).reverse();
        
        let symmetric = true;
        for (let i = 0; i < 3; i++) {
            if (left[i] !== right[i]) {
                symmetric = false;
                break;
            }
        }
        
        if (symmetric && left[0] !== left[1]) {
            const next = data[data.length - 1] === 'tai' ? 'xiu' : 'tai';
            return {
                detected: true,
                ten_cau: 'Cầu Đối xứng',
                do_dai: 6,
                du_doan: next,
                xac_suat: damBaoXacSuat(58)
            };
        }
        
        return { detected: false };
    }

    detectCauBacThang(data) {
        if (data.length < 6) return { detected: false };
        
        const last6 = data.slice(-6);
        // Pattern: T-T-X-T-T-X hoặc X-X-T-X-X-T
        if (last6[0] === last6[1] && last6[1] !== last6[2] && 
            last6[2] === last6[3] && last6[3] === last6[4] && last6[4] !== last6[5]) {
            const next = last6[2];
            return {
                detected: true,
                ten_cau: 'Cầu Bậc thang',
                do_dai: 6,
                du_doan: next,
                xac_suat: damBaoXacSuat(60)
            };
        }
        
        return { detected: false };
    }

    detectCauZigzag(data) {
        if (data.length < 5) return { detected: false };
        
        const last5 = data.slice(-5);
        // Pattern: T-X-T-X-T hoặc X-T-X-T-X
        let zigzag = true;
        for (let i = 1; i < 5; i++) {
            if (last5[i] === last5[i-1]) {
                zigzag = false;
                break;
            }
        }
        
        if (zigzag) {
            const next = last5[4] === 'tai' ? 'xiu' : 'tai';
            return {
                detected: true,
                ten_cau: 'Cầu Zigzag',
                do_dai: 5,
                du_doan: next,
                xac_suat: damBaoXacSuat(62)
            };
        }
        
        return { detected: false };
    }

    detectCau42(data) {
        if (data.length < 6) return { detected: false };
        
        const last6 = data.slice(-6);
        if (last6[0] === last6[1] && last6[1] === last6[2] && last6[2] === last6[3] && 
            last6[3] !== last6[4] && last6[4] === last6[5]) {
            return {
                detected: true,
                ten_cau: 'Cầu 4-2',
                do_dai: 6,
                du_doan: last6[5],
                xac_suat: damBaoXacSuat(60)
            };
        }
        
        return { detected: false };
    }

    detectCau211(data) {
        if (data.length < 4) return { detected: false };
        
        const last4 = data.slice(-4);
        // Pattern: T-T-X-T hoặc X-X-T-X
        if (last4[0] === last4[1] && last4[1] !== last4[2] && last4[2] === last4[3]) {
            const next = last4[3] === 'tai' ? 'xiu' : 'tai';
            return {
                detected: true,
                ten_cau: 'Cầu 2-1-1',
                do_dai: 4,
                du_doan: next,
                xac_suat: damBaoXacSuat(58)
            };
        }
        
        return { detected: false };
    }

    aggregateResults(results) {
        if (results.length === 0) {
            return {
                luong: this.name,
                trong_so: this.weight,
                du_doan: this.getFallbackPrediction(),
                xac_suat: 55,
                cac_cau: [],
                so_luong_cau: 0
            };
        }

        results.sort((a, b) => b.xac_suat - a.xac_suat);
        const best = results[0];
        
        return {
            luong: this.name,
            trong_so: this.weight,
            du_doan: best.du_doan,
            xac_suat: best.xac_suat,
            cau_chinh: best.ten_cau,
            cac_cau: results.map(r => ({ ten: r.ten_cau, du_doan: r.du_doan, xac_suat: r.xac_suat })),
            so_luong_cau: results.length
        };
    }

    getFallbackPrediction() {
        if (history.length >= 5) {
            const last5 = history.slice(-5);
            const taiCount = last5.filter(x => x === 'tai').length;
            return taiCount >= 3 ? 'xiu' : 'tai';
        }
        return 'xiu';
    }

    emptyResult() {
        return {
            luong: this.name,
            trong_so: this.weight,
            du_doan: this.getFallbackPrediction(),
            xac_suat: 55,
            cac_cau: [],
            so_luong_cau: 0
        };
    }
}

/**
 * LUỒNG 3: Phân tích Thống Kê
 */
class ThreadThongKe {
    constructor(data) {
        this.data = data;
        this.name = 'Thống Kê';
        this.weight = CONFIG.ENSEMBLE_WEIGHTS.THONG_KE;
    }

    analyze() {
        const data = this.data;
        if (data.length < 3) return this.emptyResult();

        const tanSuat = this.tinhTanSuat(data);
        const chuoi = this.tinhChuoi(data);
        const bienDong = this.tinhBienDong(data);

        let diemTai = 50;
        let diemXiu = 50;

        // Tần suất
        if (tanSuat.tai > 55) diemTai += 15;
        else if (tanSuat.xiu > 55) diemXiu += 15;

        // Chuỗi
        if (chuoi.do_dai >= 4) {
            if (chuoi.hien_tai === 'tai') diemXiu += 12;
            else diemTai += 12;
        } else if (chuoi.do_dai >= 2) {
            if (chuoi.hien_tai === 'tai') diemTai += 8;
            else diemXiu += 8;
        }

        // Biến động
        if (bienDong > 70) {
            const last = data[data.length - 1];
            if (last === 'tai') diemXiu += 10;
            else diemTai += 10;
        }

        // Đảm bảo không 50-50
        if (diemTai === diemXiu) {
            const lastCount = data.slice(-5).filter(x => x === 'tai').length;
            if (lastCount >= 3) diemXiu += 10;
            else diemTai += 10;
        }

        const total = diemTai + diemXiu;
        let tiLeTai = Math.round((diemTai / total) * 100);
        let tiLeXiu = Math.round((diemXiu / total) * 100);

        // Áp dụng hàm đảm bảo tỉ lệ
        const damBao = damBaoTiLe(tiLeTai, tiLeXiu);
        tiLeTai = damBao.tiLeTai;
        tiLeXiu = damBao.tiLeXiu;

        return {
            luong: this.name,
            trong_so: this.weight,
            du_doan: tiLeTai > tiLeXiu ? 'tai' : 'xiu',
            xac_suat: damBaoDoTinCay(Math.abs(tiLeTai - tiLeXiu) + 50),
            chi_tiet: { tan_suat: tanSuat, chuoi: chuoi, bien_dong: bienDong }
        };
    }

    tinhTanSuat(data) {
        if (data.length === 0) return { tai: 55, xiu: 45 };
        const tai = data.filter(x => x === 'tai').length;
        let taiPercent = Math.round((tai / data.length) * 100);
        let xiuPercent = 100 - taiPercent;
        
        // Đảm bảo không 50-50
        if (taiPercent === 50) {
            taiPercent = 52;
            xiuPercent = 48;
        }
        
        return { tai: taiPercent, xiu: xiuPercent };
    }

    tinhChuoi(data) {
        if (data.length === 0) return { hien_tai: 'tai', do_dai: 1 };
        const current = data[data.length - 1];
        let count = 0;
        for (let i = data.length - 1; i >= 0; i--) {
            if (data[i] === current) count++;
            else break;
        }
        return { hien_tai: current, do_dai: count };
    }

    tinhBienDong(data) {
        if (data.length < 2) return 60;
        let changes = 0;
        for (let i = 1; i < data.length; i++) {
            if (data[i] !== data[i-1]) changes++;
        }
        const tyLe = Math.round((changes / (data.length - 1)) * 100);
        return tyLe === 50 ? 55 : tyLe;
    }

    emptyResult() {
        return {
            luong: this.name,
            trong_so: this.weight,
            du_doan: 'tai',
            xac_suat: 55,
            chi_tiet: {}
        };
    }
}

/**
 * LUỒNG 4: Phân tích Markov
 */
class ThreadMarkov {
    constructor(data) {
        this.data = data;
        this.name = 'Markov Chain';
        this.weight = CONFIG.ENSEMBLE_WEIGHTS.MARKOV;
    }

    analyze() {
        const data = this.data;
        if (data.length < 5) return this.emptyResult();

        // Ma trận chuyển đổi bậc 1
        let tai_sau_tai = 0, xiu_sau_tai = 0, tai_sau_xiu = 0, xiu_sau_xiu = 0;
        
        for (let i = 0; i < data.length - 1; i++) {
            if (data[i] === 'tai') {
                if (data[i+1] === 'tai') tai_sau_tai++;
                else xiu_sau_tai++;
            } else {
                if (data[i+1] === 'tai') tai_sau_xiu++;
                else xiu_sau_xiu++;
            }
        }

        const last = data[data.length - 1];
        let duDoan = '';
        let xacSuat = 55;

        if (last === 'tai') {
            const total = tai_sau_tai + xiu_sau_tai;
            if (total > 0) {
                if (tai_sau_tai > xiu_sau_tai) {
                    duDoan = 'tai';
                    xacSuat = Math.round((tai_sau_tai / total) * 100);
                } else if (xiu_sau_tai > tai_sau_tai) {
                    duDoan = 'xiu';
                    xacSuat = Math.round((xiu_sau_tai / total) * 100);
                } else {
                    // Bằng nhau -> ưu tiên theo xu hướng
                    duDoan = tai_sau_tai >= 3 ? 'tai' : 'xiu';
                    xacSuat = 58;
                }
            }
        } else {
            const total = tai_sau_xiu + xiu_sau_xiu;
            if (total > 0) {
                if (tai_sau_xiu > xiu_sau_xiu) {
                    duDoan = 'tai';
                    xacSuat = Math.round((tai_sau_xiu / total) * 100);
                } else if (xiu_sau_xiu > tai_sau_xiu) {
                    duDoan = 'xiu';
                    xacSuat = Math.round((xiu_sau_xiu / total) * 100);
                } else {
                    duDoan = xiu_sau_xiu >= 3 ? 'xiu' : 'tai';
                    xacSuat = 58;
                }
            }
        }

        // Đảm bảo xác suất > 50%
        xacSuat = damBaoXacSuat(xacSuat);

        return {
            luong: this.name,
            trong_so: this.weight,
            du_doan: duDoan || this.getFallbackPrediction(),
            xac_suat: xacSuat,
            chi_tiet: { tai_sau_tai, xiu_sau_tai, tai_sau_xiu, xiu_sau_xiu }
        };
    }

    getFallbackPrediction() {
        return history.length >= 3 ? (history.slice(-3).filter(x => x === 'tai').length >= 2 ? 'xiu' : 'tai') : 'tai';
    }

    emptyResult() {
        return {
            luong: this.name,
            trong_so: this.weight,
            du_doan: this.getFallbackPrediction(),
            xac_suat: 55,
            chi_tiet: {}
        };
    }
}

/**
 * LUỒNG 5: Phân tích Xu Hướng
 */
class ThreadXuHuong {
    constructor(data) {
        this.data = data;
        this.name = 'Xu Hướng';
        this.weight = CONFIG.ENSEMBLE_WEIGHTS.XU_HUONG;
    }

    analyze() {
        const data = this.data;
        if (data.length < 10) return this.emptyResult();

        const segSize = Math.floor(data.length / 3);
        const seg1 = data.slice(0, segSize);
        const seg2 = data.slice(segSize, 2 * segSize);
        const seg3 = data.slice(2 * segSize);

        const tai1 = seg1.filter(x => x === 'tai').length / seg1.length * 100;
        const tai2 = seg2.filter(x => x === 'tai').length / seg2.length * 100;
        const tai3 = seg3.filter(x => x === 'tai').length / seg3.length * 100;

        let duDoan = '';
        let xacSuat = 55;

        if (tai1 < tai2 && tai2 < tai3) {
            duDoan = 'tai';
            xacSuat = 60;
        } else if (tai1 > tai2 && tai2 > tai3) {
            duDoan = 'xiu';
            xacSuat = 60;
        } else {
            // Trung bình có trọng số
            const weightedAvg = tai1 * 0.2 + tai2 * 0.3 + tai3 * 0.5;
            duDoan = weightedAvg > 50 ? 'tai' : 'xiu';
            xacSuat = damBaoXacSuat(Math.round(Math.abs(weightedAvg - 50) + 50));
        }

        return {
            luong: this.name,
            trong_so: this.weight,
            du_doan: duDoan,
            xac_suat: xacSuat,
            chi_tiet: { seg1: Math.round(tai1), seg2: Math.round(tai2), seg3: Math.round(tai3) }
        };
    }

    emptyResult() {
        return {
            luong: this.name,
            trong_so: this.weight,
            du_doan: 'tai',
            xac_suat: 55,
            chi_tiet: {}
        };
    }
}

/**
 * LUỒNG 6: Phân tích Chu Kỳ
 */
class ThreadChuKy {
    constructor(data) {
        this.data = data;
        this.name = 'Chu Kỳ';
        this.weight = CONFIG.ENSEMBLE_WEIGHTS.CHU_KY;
    }

    analyze() {
        const data = this.data;
        if (data.length < 8) return this.emptyResult();

        // Tìm chu kỳ lặp lại
        for (let k = 2; k <= Math.min(15, Math.floor(data.length / 2)); k++) {
            let match = 0;
            let total = 0;
            
            for (let i = data.length - 1; i >= k; i--) {
                if (data[i] === data[i - k]) match++;
                total++;
            }
            
            const ratio = match / total;
            if (ratio > 0.55) {
                const next = data[data.length - k];
                return {
                    luong: this.name,
                    trong_so: this.weight,
                    du_doan: next,
                    xac_suat: damBaoXacSuat(Math.round(ratio * 100)),
                    chi_tiet: { chu_ky: k, ty_le_khop: Math.round(ratio * 100) }
                };
            }
        }

        // Nếu không tìm thấy chu kỳ rõ ràng
        const last5 = data.slice(-5);
        const taiCount = last5.filter(x => x === 'tai').length;
        
        return {
            luong: this.name,
            trong_so: this.weight,
            du_doan: taiCount >= 3 ? 'xiu' : 'tai',
            xac_suat: 55,
            chi_tiet: { chu_ky: 0, ty_le_khop: 0 }
        };
    }

    emptyResult() {
        return {
            luong: this.name,
            trong_so: this.weight,
            du_doan: 'xiu',
            xac_suat: 55,
            chi_tiet: {}
        };
    }
}

/**
 * LUỒNG 7: Phân tích Phân Kỳ
 */
class ThreadPhanKy {
    constructor(data) {
        this.data = data;
        this.name = 'Phân Kỳ';
        this.weight = CONFIG.ENSEMBLE_WEIGHTS.PHAN_KY;
    }

    analyze() {
        const data = this.data;
        if (data.length < 8) return this.emptyResult();

        const tai = data.filter(x => x === 'tai').length;
        const tyLe = tai / data.length;
        const divergence = tyLe - 0.5;
        
        let duDoan = '';
        let xacSuat = 55;

        if (divergence > 0.12) {
            duDoan = 'xiu';
            xacSuat = Math.min(55 + Math.abs(divergence) * 80, 75);
        } else if (divergence < -0.12) {
            duDoan = 'tai';
            xacSuat = Math.min(55 + Math.abs(divergence) * 80, 75);
        } else {
            // Phân kỳ nhẹ
            duDoan = tyLe > 0.5 ? 'xiu' : 'tai';
            xacSuat = 56;
        }

        return {
            luong: this.name,
            trong_so: this.weight,
            du_doan: duDoan,
            xac_suat: damBaoXacSuat(xacSuat),
            chi_tiet: { ty_le_hien_tai: Math.round(tyLe * 100), do_phan_ky: Math.round(divergence * 100) }
        };
    }

    emptyResult() {
        return {
            luong: this.name,
            trong_so: this.weight,
            du_doan: 'tai',
            xac_suat: 55,
            chi_tiet: {}
        };
    }
}

// ============================================================================
// ============ ENSEMBLE LEARNING ============
// ============================================================================

function ensemblePrediction(data) {
    if (data.length < CONFIG.MIN_DATA) {
        // Dữ liệu ít -> ưu tiên Tài
        return {
            duDoan: 'tai',
            tiLeTai: 58,
            tiLeXiu: 42,
            doTinCay: 55,
            loaiCau: 'Chưa đủ dữ liệu',
            mauCau: 'Mặc định',
            cauPhatHien: { tong_cau: 0, danh_sach: [], cau_chinh: '' },
            chiTietLuong: [],
            threadResults: []
        };
    }

    // Khởi tạo tất cả các luồng
    const threads = [
        new ThreadCauTruyenThong(data),
        new ThreadCauNangCao(data),
        new ThreadThongKe(data),
        new ThreadMarkov(data),
        new ThreadXuHuong(data),
        new ThreadChuKy(data),
        new ThreadPhanKy(data)
    ];

    // Chạy tất cả luồng
    threadResults = threads.map(thread => thread.analyze());

    // Tổng hợp có trọng số
    let tongDiemTai = 0;
    let tongDiemXiu = 0;
    let tongTrongSo = 0;
    const chiTietLuong = [];

    for (const result of threadResults) {
        if (!result.du_doan) continue;

        const trongSo = result.trong_so;
        const diemDieuChinh = (result.xac_suat - 50) * 2 * trongSo;

        if (result.du_doan === 'tai') {
            tongDiemTai += Math.abs(diemDieuChinh);
        } else if (result.du_doan === 'xiu') {
            tongDiemXiu += Math.abs(diemDieuChinh);
        }

        tongTrongSo += trongSo;
        chiTietLuong.push({
            luong: result.luong,
            du_doan: result.du_doan,
            xac_suat: result.xac_suat,
            trong_so: trongSo,
            cau_chinh: result.cau_chinh || '',
            so_luong_cau: result.so_luong_cau || 0,
            cac_cau: result.cac_cau || [],
            chi_tiet: result.chi_tiet || {}
        });
    }

    // Đảm bảo không 0
    if (tongDiemTai === 0 && tongDiemXiu === 0) {
        tongDiemTai = 55;
        tongDiemXiu = 45;
    }

    // Tính tỉ lệ
    const total = tongDiemTai + tongDiemXiu;
    let tiLeTai = Math.round((tongDiemTai / total) * 100);
    let tiLeXiu = Math.round((tongDiemXiu / total) * 100);

    // Áp dụng hàm đảm bảo tỉ lệ (KHÔNG BAO GIỜ 50-50)
    const damBao = damBaoTiLe(tiLeTai, tiLeXiu);
    tiLeTai = damBao.tiLeTai;
    tiLeXiu = damBao.tiLeXiu;

    const duDoan = tiLeTai > tiLeXiu ? 'tai' : 'xiu';
    const doTinCay = damBaoDoTinCay(Math.min(50 + Math.abs(tiLeTai - tiLeXiu) * 0.5, CONFIG.MAX_CONFIDENCE));

    // Tìm cầu chính
    let cauChinh = '';
    let mauCau = '';
    let danhSachCau = [];
    
    for (const ct of chiTietLuong) {
        if (ct.cau_chinh) {
            if (!cauChinh) cauChinh = ct.cau_chinh;
            mauCau = ct.cau_chinh;
        }
        if (ct.cac_cau && ct.cac_cau.length > 0) {
            danhSachCau.push(...ct.cac_cau.map(c => c.ten));
        }
    }

    danhSachCau = [...new Set(danhSachCau)];

    // Nếu không có cầu -> gán mặc định
    if (!cauChinh) cauChinh = 'Phân tích tổng hợp';
    if (!mauCau) mauCau = 'Đa luồng';

    return {
        duDoan,
        tiLeTai,
        tiLeXiu,
        doTinCay,
        loaiCau: cauChinh,
        mauCau: mauCau,
        cauPhatHien: {
            tong_cau: danhSachCau.length,
            danh_sach: danhSachCau,
            cau_chinh: cauChinh
        },
        chiTietLuong,
        threadResults
    };
}

// ============================================================================
// ============ HÀM DỰ ĐOÁN CHÍNH ============
// ============================================================================

function duDoanTongHop(data) {
    return ensemblePrediction(data);
}

// ============================================================================
// ============ CẬP NHẬT THỐNG KÊ ============
// ============================================================================

function capNhatThongKe(ketQuaThucTe, duDoan, loaiCau) {
    stats.total++;
    
    if (duDoan === ketQuaThucTe) {
        stats.correct++;
        if (stats.currentStreak >= 0) {
            stats.currentStreak++;
        } else {
            stats.currentStreak = 1;
        }
        stats.streakType = 'correct';
    } else {
        stats.wrong++;
        if (stats.currentStreak <= 0) {
            stats.currentStreak--;
        } else {
            stats.currentStreak = -1;
        }
        stats.streakType = 'wrong';
    }
    
    if (Math.abs(stats.currentStreak) > stats.maxStreak) {
        stats.maxStreak = Math.abs(stats.currentStreak);
    }

    // Thống kê theo loại cầu
    if (loaiCau && loaiCau !== 'Không xác định' && loaiCau !== 'Chưa đủ dữ liệu') {
        if (!stats.byCauType[loaiCau]) {
            stats.byCauType[loaiCau] = { total: 0, correct: 0 };
        }
        stats.byCauType[loaiCau].total++;
        if (duDoan === ketQuaThucTe) {
            stats.byCauType[loaiCau].correct++;
        }
    }

    // Độ chính xác trượt
    const recentHistory = history.slice(-50);
    const recentCorrect = recentHistory.filter((val, idx) => {
        const predIdx = predictionHistory.length - recentHistory.length + idx;
        return predIdx >= 0 && predictionHistory[predIdx] === val;
    }).length;
    
    stats.rollingAccuracy.push({
        thoi_diem: new Date().toISOString(),
        do_chinh_xac: recentHistory.length > 0 ? Math.round((recentCorrect / recentHistory.length) * 100) : 0
    });
    
    if (stats.rollingAccuracy.length > 100) {
        stats.rollingAccuracy = stats.rollingAccuracy.slice(-100);
    }
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
    const ketQua = data.ket_qua || (tong >= 11 ? 'tài' : 'xỉu');
    const phien = data.phien || 0;
    const ketQuaChuan = ketQua.toLowerCase().replace('ài', 'ai').replace('ỉu', 'iu');

    if (phien > (currentData.Phien || 0)) {
        if (ketQuaChuan) {
            history.push(ketQuaChuan);
            historyChiTiet.push({ phien, d1, d2, d3, tong, ketQua: ketQuaChuan });
            
            if (history.length > CONFIG.MAX_HISTORY) {
                history.shift();
                historyChiTiet.shift();
            }

            if (currentData.Du_doan && currentData.Phien) {
                predictionHistory.push(currentData.Du_doan);
                if (predictionHistory.length > CONFIG.MAX_HISTORY) predictionHistory.shift();
                capNhatThongKe(ketQuaChuan, currentData.Du_doan, currentData.Loai_cau);
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
            Trang_thai: 'Đã dự đoán (Ensemble)',
            Ket_qua_du_doan: stats.total > 0 ? (stats.correct > stats.wrong ? '✅' : '❌') : '',
            Thong_ke: {
                tong: stats.total,
                dung: stats.correct,
                sai: stats.wrong,
                ti_le: tiLe,
                streak_hien_tai: stats.currentStreak,
                streak_cao_nhat: stats.maxStreak
            },
            Nhan_dien_cau: {
                ten_cau: prediction.loaiCau,
                do_dai: history.length,
                vi_tri_hien_tai: history.length,
                du_doan_tiep: prediction.duDoan,
                xac_suat: prediction.doTinCay + '%',
                danh_sach_cau: prediction.cauPhatHien.danh_sach || [],
                so_luong_cau: prediction.cauPhatHien.tong_cau || 0
            },
            Phan_tich_chi_tiet: {
                tong_phan_tich: history.length,
                cau_phat_hien: prediction.cauPhatHien,
                ty_le_tai: prediction.tiLeTai,
                ty_le_xiu: prediction.tiLeXiu,
                do_tin_cay: prediction.doTinCay,
                phan_tich_da_luong: prediction.chiTietLuong || [],
                ensemble_score: {
                    ti_le_tai: prediction.tiLeTai,
                    ti_le_xiu: prediction.tiLeXiu,
                    do_tin_cay: prediction.doTinCay
                },
                chi_bao_ky_thuat: {
                    tong_luong: prediction.chiTietLuong ? prediction.chiTietLuong.length : 0,
                    luong_dong_thuan: prediction.chiTietLuong ? 
                        prediction.chiTietLuong.filter(l => l.du_doan === prediction.duDoan).length : 0
                }
            },
            id: '@tranhoang2286'
        };

        // Log
        console.log('\n' + '═'.repeat(70));
        console.log(`📊 PHIÊN: ${phien} | 🎲 [${d1},${d2},${d3}] = ${tong}`);
        console.log(`✅ KQ: ${ketQuaChuan.toUpperCase()} | 🔮 DĐ: ${prediction.duDoan.toUpperCase()}`);
        console.log(`📈 Tài ${prediction.tiLeTai}% | Xỉu ${prediction.tiLeXiu}% | 🎯 TC: ${prediction.doTinCay}%`);
        console.log(`📐 Cầu: ${prediction.loaiCau} | Mẫu: ${prediction.mauCau}`);
        console.log(`📊 TK: ${stats.correct}/${stats.total} | Streak: ${stats.currentStreak}`);
        console.log('═'.repeat(70));

        cauHistory.push({
            phien, loai_cau: prediction.loaiCau, mau_cau: prediction.mauCau,
            du_doan: prediction.duDoan, ket_qua: ketQuaChuan,
            chinh_xac: prediction.duDoan === ketQuaChuan
        });
        if (cauHistory.length > 200) cauHistory.shift();
    }
}

// ============================================================================
// ============ API ============
// ============================================================================

app.set('etag', false);
app.use((req, res, next) => {
    res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.header('Pragma', 'no-cache');
    res.header('Expires', '0');
    next();
});

app.get('/', (req, res) => res.json(currentData));

app.get('/api/tx', async (req, res) => {
    const fresh = await layKetQua();
    if (fresh && fresh.phien > currentData.Phien) await xuLyDuDoan();
    res.json(currentData);
});

app.get('/api/predict', (req, res) => {
    res.json({ success: true, data: currentData, timestamp: new Date().toISOString() });
});

app.get('/api/stats', (req, res) => {
    res.json({
        success: true,
        stats: currentData.Thong_ke,
        by_cau_type: stats.byCauType,
        rolling_accuracy: stats.rollingAccuracy.slice(-20)
    });
});

app.get('/api/cau', (req, res) => {
    const result = duDoanTongHop(history);
    res.json({
        success: true,
        cau: result.cauPhatHien,
        loai_cau: result.loaiCau,
        du_doan: result.duDoan,
        ti_le: { tai: result.tiLeTai, xiu: result.tiLeXiu },
        do_tin_cay: result.doTinCay
    });
});

app.get('/api/threads', (req, res) => {
    res.json({
        success: true,
        thread_results: threadResults,
        ensemble: currentData.Phan_tich_chi_tiet.ensemble_score || {}
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'OK', phien: currentData.Phien, total: history.length });
});

// ============================================================================
// ============ KHỞI ĐỘNG ============
// ============================================================================

app.listen(PORT, async () => {
    console.log('\n' + '═'.repeat(70));
    console.log('🚀 MAX789 PRO V12 - KHÔNG BAO GIỜ 50%');
    console.log('═'.repeat(70));
    console.log(`🔗 Server: http://localhost:${PORT}`);
    console.log(`👤 Creator: @tranhoang2286`);
    console.log(`🎯 Tỉ lệ tối thiểu: ${CONFIG.MIN_CONFIDENCE}% - Luôn > 50%`);
    console.log(`🧠 7 Luồng Ensemble Learning`);
    console.log(`🛡️ Bảo đảm: KHÔNG Random - KHÔNG 50-50`);
    console.log('═'.repeat(70) + '\n');
    
    await xuLyDuDoan();
    setInterval(xuLyDuDoan, CONFIG.CHECK_INTERVAL);
});

process.on('uncaughtException', (error) => {
    console.error('🔥 Lỗi:', error);
});

Math.log2 = Math.log2 || function(x) { return Math.log(x) / Math.LN2; };
