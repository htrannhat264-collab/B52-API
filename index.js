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
    MIN_DATA: 10,
    THREAD_COUNT: 5,                    // Số luồng phân tích song song
    CONFIDENCE_THRESHOLD: 65,           // Ngưỡng độ tin cậy tối thiểu
    ENSEMBLE_WEIGHTS: {                 // Trọng số cho ensemble learning
        CAU_TRUYEN_THONG: 0.25,
        CAU_NANG_CAO: 0.20,
        THONG_KE: 0.15,
        MARKOV: 0.15,
        XU_HUONG: 0.10,
        CHU_KY: 0.10,
        PHAN_KY: 0.05
    },
    CAU_PATTERNS: {                     // Định nghĩa mẫu cầu chuẩn
        CAU_1_1: { do_dai_toi_thieu: 4, trong_so: 0.8 },
        CAU_2_2: { do_dai_toi_thieu: 4, trong_so: 0.75 },
        CAU_3_1: { do_dai_toi_thieu: 4, trong_so: 0.7 },
        CAU_1_3: { do_dai_toi_thieu: 4, trong_so: 0.7 },
        CAU_BET: { do_dai_toi_thieu: 4, trong_so: 0.65 },
        CAU_3_2: { do_dai_toi_thieu: 5, trong_so: 0.68 },
        CAU_2_1_1: { do_dai_toi_thieu: 6, trong_so: 0.72 },
        CAU_1_2_2: { do_dai_toi_thieu: 6, trong_so: 0.72 },
        CAU_XEN_KE: { do_dai_toi_thieu: 5, trong_so: 0.6 },
        CAU_DOI_XUNG: { do_dai_toi_thieu: 8, trong_so: 0.55 }
    }
};

// ============================================================================
// BIẾN TOÀN CỤC MỞ RỘNG
// ============================================================================
let history = [];
let historyChiTiet = [];            // Lưu chi tiết từng phiên (xúc xắc, tổng)
let stats = { 
    total: 0, 
    correct: 0, 
    wrong: 0, 
    streak: 0,
    maxStreak: 0,
    currentStreak: 0,
    streakType: '',                 // 'correct' hoặc 'wrong'
    byCauType: {},                  // Thống kê theo loại cầu
    byTime: [],                     // Thống kê theo thời gian
    rollingAccuracy: []             // Độ chính xác trượt 50 phiên gần nhất
};

let cauHistory = [];                // Lịch sử các cầu đã phát hiện
let predictionHistory = [];         // Lịch sử dự đoán để đánh giá
let threadResults = [];             // Kết quả từ các luồng phân tích

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
        ti_le: '0%',
        streak_hien_tai: 0,
        streak_cao_nhat: 0
    },
    Nhan_dien_cau: {
        ten_cau: '',
        do_dai: 0,
        vi_tri_hien_tai: 0,
        du_doan_tiep: '',
        xac_suat: '0%',
        danh_sach_cau: [],
        so_luong_cau: 0
    },
    Phan_tich_chi_tiet: {
        tong_phan_tich: 0,
        cau_phat_hien: {},
        ty_le_tai: 50,
        ty_le_xiu: 50,
        do_tin_cay: 50,
        phan_tich_da_luong: {},
        ensemble_score: {},
        chi_bao_ky_thuat: {}
    },
    id: '@tranhoang2286'
};

// ============================================================================
// HÀM LẤY DỮ LIỆU NÂNG CẤP (CÓ RETRY)
// ============================================================================
async function layKetQua(retryCount = 0) {
    const maxRetries = 3;
    try {
        const response = await axios.get(CONFIG.API_URL, {
            timeout: 8000,
            headers: { 
                'Cache-Control': 'no-cache',
                'User-Agent': 'MAX789-SieuDuDoan/11.0'
            }
        });
        
        // Validate dữ liệu
        if (response.data && response.data.phien) {
            return response.data;
        }
        
        if (retryCount < maxRetries) {
            console.log(`⚠️ Dữ liệu không hợp lệ, thử lại lần ${retryCount + 1}...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
            return layKetQua(retryCount + 1);
        }
        
        return null;
    } catch (error) {
        console.error('❌ Lỗi API:', error.message);
        if (retryCount < maxRetries) {
            console.log(`🔄 Thử lại lần ${retryCount + 1}...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            return layKetQua(retryCount + 1);
        }
        return null;
    }
}

// ============================================================================
// ============ HỆ THỐNG PHÂN TÍCH ĐA LUỒNG ============
// ============================================================================

/**
 * LUỒNG 1: Phân tích cầu truyền thống (Cầu 1-1, 2-2, 3-1, Bệt)
 */
class ThreadCauTruyenThong {
    constructor(data) {
        this.data = data;
        this.name = 'Cầu Truyền Thống';
        this.weight = CONFIG.ENSEMBLE_WEIGHTS.CAU_TRUYEN_THONG;
    }

    analyze() {
        const results = [];
        const data = this.data;
        
        if (data.length < 4) return this.emptyResult();

        // Cầu 1-1 (So le): T-X-T-X hoặc X-T-X-T
        const cau11 = this.detectCau11(data);
        if (cau11.detected) results.push(cau11);

        // Cầu 2-2: T-T-X-X hoặc X-X-T-T
        const cau22 = this.detectCau22(data);
        if (cau22.detected) results.push(cau22);

        // Cầu 3-1: T-T-T-X hoặc X-X-X-T
        const cau31 = this.detectCau31(data);
        if (cau31.detected) results.push(cau31);

        // Cầu 1-3: T-X-X-X hoặc X-T-T-T
        const cau13 = this.detectCau13(data);
        if (cau13.detected) results.push(cau13);

        // Cầu Bệt: T-T-T-T hoặc X-X-X-X
        const cauBet = this.detectCauBet(data);
        if (cauBet.detected) results.push(cauBet);

        // Cầu 2-1: T-T-X hoặc X-X-T
        const cau21 = this.detectCau21(data);
        if (cau21.detected) results.push(cau21);

        // Cầu 1-2: T-X-X hoặc X-T-T
        const cau12 = this.detectCau12(data);
        if (cau12.detected) results.push(cau12);

        return this.aggregateResults(results);
    }

    detectCau11(data) {
        const last6 = data.slice(-6);
        if (last6.length < 4) return { detected: false };
        
        // Kiểm tra mẫu so le
        let isAlternating = true;
        for (let i = 1; i < last6.length; i++) {
            if (last6[i] === last6[i-1]) {
                isAlternating = false;
                break;
            }
        }
        
        if (isAlternating && last6.length >= 4) {
            const next = last6[last6.length - 1] === 'tai' ? 'xiu' : 'tai';
            const doDai = this.tinhDoDaiCau(data, 'so_le');
            return {
                detected: true,
                ten_cau: 'Cầu 1-1 (So le)',
                do_dai: doDai,
                du_doan: next,
                xac_suat: Math.min(70 + doDai * 2, 85),
                trong_so: CONFIG.CAU_PATTERNS.CAU_1_1.trong_so
            };
        }
        
        return { detected: false };
    }

    detectCau22(data) {
        const last4 = data.slice(-4);
        if (last4.length < 4) return { detected: false };
        
        if (last4[0] === last4[1] && last4[2] === last4[3] && last4[0] !== last4[2]) {
            const next = last4[3] === 'tai' ? 'xiu' : 'tai';
            const doDai = this.tinhDoDaiCau(data, '2_2');
            return {
                detected: true,
                ten_cau: 'Cầu 2-2',
                do_dai: doDai,
                du_doan: next,
                xac_suat: Math.min(65 + doDai * 2, 80),
                trong_so: CONFIG.CAU_PATTERNS.CAU_2_2.trong_so
            };
        }
        
        return { detected: false };
    }

    detectCau31(data) {
        const last4 = data.slice(-4);
        if (last4.length < 4) return { detected: false };
        
        // Pattern: XXXY hoặc YXXX
        if (last4[0] === last4[1] && last4[1] === last4[2] && last4[2] !== last4[3]) {
            return {
                detected: true,
                ten_cau: 'Cầu 3-1',
                do_dai: 4,
                du_doan: last4[2],
                xac_suat: 70,
                trong_so: CONFIG.CAU_PATTERNS.CAU_3_1.trong_so
            };
        }
        
        if (last4[1] === last4[2] && last4[2] === last4[3] && last4[0] !== last4[1]) {
            return {
                detected: true,
                ten_cau: 'Cầu 1-3',
                do_dai: 4,
                du_doan: last4[1],
                xac_suat: 70,
                trong_so: CONFIG.CAU_PATTERNS.CAU_1_3.trong_so
            };
        }
        
        return { detected: false };
    }

    detectCau13(data) {
        const last4 = data.slice(-4);
        if (last4.length < 4) return { detected: false };
        
        if (last4[0] !== last4[1] && last4[1] === last4[2] && last4[2] === last4[3]) {
            const next = last4[0];
            return {
                detected: true,
                ten_cau: 'Cầu 1-3 (Đảo)',
                do_dai: 4,
                du_doan: next,
                xac_suat: 72,
                trong_so: CONFIG.CAU_PATTERNS.CAU_1_3.trong_so
            };
        }
        
        return { detected: false };
    }

    detectCauBet(data) {
        const last4 = data.slice(-4);
        if (last4.length < 4) return { detected: false };
        
        if (last4.every(x => x === 'tai')) {
            const doDai = this.tinhDoDaiCau(data, 'bet_tai');
            return {
                detected: true,
                ten_cau: 'Cầu bệt Tài',
                do_dai: doDai,
                du_doan: 'tai',
                xac_suat: Math.min(55 + doDai * 1.5, 70),
                trong_so: CONFIG.CAU_PATTERNS.CAU_BET.trong_so
            };
        }
        
        if (last4.every(x => x === 'xiu')) {
            const doDai = this.tinhDoDaiCau(data, 'bet_xiu');
            return {
                detected: true,
                ten_cau: 'Cầu bệt Xỉu',
                do_dai: doDai,
                du_doan: 'xiu',
                xac_suat: Math.min(55 + doDai * 1.5, 70),
                trong_so: CONFIG.CAU_PATTERNS.CAU_BET.trong_so
            };
        }
        
        return { detected: false };
    }

    detectCau21(data) {
        const last3 = data.slice(-3);
        if (last3.length < 3) return { detected: false };
        
        if (last3[0] === last3[1] && last3[1] !== last3[2]) {
            // T-T-X hoặc X-X-T
            const next = last3[2] === 'tai' ? 'xiu' : 'tai';
            return {
                detected: true,
                ten_cau: 'Cầu 2-1',
                do_dai: 3,
                du_doan: next,
                xac_suat: 65,
                trong_so: 0.6
            };
        }
        
        return { detected: false };
    }

    detectCau12(data) {
        const last3 = data.slice(-3);
        if (last3.length < 3) return { detected: false };
        
        if (last3[0] !== last3[1] && last3[1] === last3[2]) {
            // T-X-X hoặc X-T-T
            const next = last3[0];
            return {
                detected: true,
                ten_cau: 'Cầu 1-2',
                do_dai: 3,
                du_doan: next,
                xac_suat: 65,
                trong_so: 0.6
            };
        }
        
        return { detected: false };
    }

    tinhDoDaiCau(data, loaiCau) {
        if (data.length < 2) return 0;
        const last = data[data.length - 1];
        let count = 0;
        
        switch(loaiCau) {
            case 'so_le':
                for (let i = data.length - 1; i >= 0; i--) {
                    if (i % 2 === (data.length - 1) % 2) {
                        if (data[i] === last) count++;
                        else break;
                    } else {
                        if (data[i] !== last) count++;
                        else break;
                    }
                }
                break;
            case 'bet_tai':
            case 'bet_xiu':
                for (let i = data.length - 1; i >= 0; i--) {
                    if (data[i] === last) count++;
                    else break;
                }
                break;
            case '2_2':
                const pattern = data.slice(-4);
                let idx = data.length - 1;
                while (idx >= 3) {
                    if (data[idx] === pattern[3] && data[idx-1] === pattern[2] && 
                        data[idx-2] === pattern[1] && data[idx-3] === pattern[0]) {
                        count += 4;
                        idx -= 4;
                    } else break;
                }
                break;
            default:
                count = 1;
        }
        
        return count;
    }

    aggregateResults(results) {
        if (results.length === 0) {
            return {
                luong: this.name,
                trong_so: this.weight,
                du_doan: '',
                xac_suat: 50,
                cac_cau: [],
                so_luong_cau: 0
            };
        }

        // Sắp xếp theo xác suất * trọng số
        results.sort((a, b) => (b.xac_suat * b.trong_so) - (a.xac_suat * a.trong_so));
        
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

    emptyResult() {
        return {
            luong: this.name,
            trong_so: this.weight,
            du_doan: '',
            xac_suat: 50,
            cac_cau: [],
            so_luong_cau: 0
        };
    }
}

/**
 * LUỒNG 2: Phân tích cầu nâng cao (Cầu 3-2, 2-1-1, 1-2-2, Đối xứng)
 */
class ThreadCauNangCao {
    constructor(data) {
        this.data = data;
        this.name = 'Cầu Nâng Cao';
        this.weight = CONFIG.ENSEMBLE_WEIGHTS.CAU_NANG_CAO;
    }

    analyze() {
        const results = [];
        const data = this.data;
        
        if (data.length < 5) return this.emptyResult();

        // Cầu 3-2: T-T-T-X-X hoặc X-X-X-T-T
        const cau32 = this.detectCau32(data);
        if (cau32.detected) results.push(cau32);

        // Cầu 2-1-1: T-T-X-T hoặc X-X-T-X
        const cau211 = this.detectCau211(data);
        if (cau211.detected) results.push(cau211);

        // Cầu 1-2-2: T-X-X-T-X hoặc X-T-T-X-T
        const cau122 = this.detectCau122(data);
        if (cau122.detected) results.push(cau122);

        // Cầu Đối xứng: T-X-X-T hoặc X-T-T-X
        const cauDoiXung = this.detectCauDoiXung(data);
        if (cauDoiXung.detected) results.push(cauDoiXung);

        // Cầu Bậc thang: T-X-T-T-X hoặc X-T-X-X-T
        const cauBacThang = this.detectCauBacThang(data);
        if (cauBacThang.detected) results.push(cauBacThang);

        // Cầu Zigzag: T-T-X-T-T-X hoặc X-X-T-X-X-T
        const cauZigzag = this.detectCauZigzag(data);
        if (cauZigzag.detected) results.push(cauZigzag);

        // Cầu 4-2: T-T-T-T-X-X hoặc X-X-X-X-T-T
        const cau42 = this.detectCau42(data);
        if (cau42.detected) results.push(cau42);

        return this.aggregateResults(results);
    }

    detectCau32(data) {
        if (data.length < 5) return { detected: false };
        
        const last5 = data.slice(-5);
        const countTai = last5.filter(x => x === 'tai').length;
        
        if (countTai === 3) {
            // Kiểm tra pattern 3-2
            const pattern1 = last5[0] === last5[1] && last5[1] === last5[2] && last5[2] !== last5[3] && last5[3] === last5[4];
            const pattern2 = last5[0] === last5[1] && last5[1] !== last5[2] && last5[2] === last5[3] && last5[3] === last5[4];
            
            if (pattern1 || pattern2) {
                const next = countTai === 3 ? 'xiu' : 'tai';
                return {
                    detected: true,
                    ten_cau: 'Cầu 3-2',
                    do_dai: 5,
                    du_doan: next,
                    xac_suat: 68,
                    trong_so: CONFIG.CAU_PATTERNS.CAU_3_2.trong_so
                };
            }
        }
        
        return { detected: false };
    }

    detectCau211(data) {
        if (data.length < 6) return { detected: false };
        
        const last6 = data.slice(-6);
        let matchCount = 0;
        
        // Pattern: T-T-X-T-T-X hoặc X-X-T-X-X-T
        for (let i = 0; i <= last6.length - 4; i++) {
            if (last6[i] === last6[i+1] && last6[i+1] !== last6[i+2] && last6[i+2] === last6[i+3]) {
                matchCount++;
            }
        }
        
        if (matchCount >= 2) {
            const last = data[data.length - 1];
            const next = last === 'tai' ? 'xiu' : 'tai';
            return {
                detected: true,
                ten_cau: 'Cầu 2-1-1',
                do_dai: 6,
                du_doan: next,
                xac_suat: 66,
                trong_so: CONFIG.CAU_PATTERNS.CAU_2_1_1.trong_so
            };
        }
        
        return { detected: false };
    }

    detectCau122(data) {
        if (data.length < 7) return { detected: false };
        
        const last7 = data.slice(-7);
        // Pattern: T-X-X-T-X-X
        let patternMatch = true;
        const expected = ['tai', 'xiu', 'xiu', 'tai', 'xiu', 'xiu', 'tai'];
        
        for (let i = 0; i < Math.min(7, last7.length); i++) {
            if (last7[last7.length - 7 + i] !== expected[i]) {
                patternMatch = false;
                break;
            }
        }
        
        if (patternMatch) {
            return {
                detected: true,
                ten_cau: 'Cầu 1-2-2',
                do_dai: 7,
                du_doan: 'xiu',
                xac_suat: 70,
                trong_so: CONFIG.CAU_PATTERNS.CAU_1_2_2.trong_so
            };
        }
        
        return { detected: false };
    }

    detectCauDoiXung(data) {
        if (data.length < 6) return { detected: false };
        
        // Tìm điểm đối xứng
        const mid = Math.floor(data.length / 2);
        const left = data.slice(data.length - 6, data.length - 3);
        const right = data.slice(data.length - 3).reverse();
        
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
                xac_suat: 62,
                trong_so: CONFIG.CAU_PATTERNS.CAU_DOI_XUNG.trong_so
            };
        }
        
        return { detected: false };
    }

    detectCauBacThang(data) {
        if (data.length < 8) return { detected: false };
        
        // T-T-X-T-T-T-X hoặc X-X-T-X-X-X-T
        const last8 = data.slice(-8);
        const segments = [
            last8.slice(0, 2),
            last8.slice(2, 3),
            last8.slice(3, 5),
            last8.slice(5, 6),
            last8.slice(6, 8)
        ];
        
        // Kiểm tra pattern bậc thang
        let isBacThang = true;
        const expectedLengths = [2, 1, 2, 1, 2];
        
        for (let i = 0; i < segments.length; i++) {
            if (segments[i].length !== expectedLengths[i]) {
                isBacThang = false;
                break;
            }
            if (i > 0 && segments[i][0] === segments[i-1][segments[i-1].length - 1]) {
                isBacThang = false;
                break;
            }
        }
        
        if (isBacThang) {
            const next = last8[last8.length - 1] === 'tai' ? 'xiu' : 'tai';
            return {
                detected: true,
                ten_cau: 'Cầu Bậc thang',
                do_dai: 8,
                du_doan: next,
                xac_suat: 64,
                trong_so: 0.6
            };
        }
        
        return { detected: false };
    }

    detectCauZigzag(data) {
        if (data.length < 6) return { detected: false };
        
        const last6 = data.slice(-6);
        const pattern = [last6[0], last6[1], last6[2], last6[3], last6[4], last6[5]];
        
        // T-T-X-T-T-X
        if (pattern[0] === pattern[1] && pattern[1] !== pattern[2] && 
            pattern[2] === pattern[3] && pattern[3] === pattern[4] && pattern[4] !== pattern[5]) {
            return {
                detected: true,
                ten_cau: 'Cầu Zigzag',
                do_dai: 6,
                du_doan: pattern[2],
                xac_suat: 63,
                trong_so: 0.55
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
                xac_suat: 67,
                trong_so: 0.65
            };
        }
        
        return { detected: false };
    }

    aggregateResults(results) {
        if (results.length === 0) {
            return {
                luong: this.name,
                trong_so: this.weight,
                du_doan: '',
                xac_suat: 50,
                cac_cau: [],
                so_luong_cau: 0
            };
        }

        results.sort((a, b) => (b.xac_suat * b.trong_so) - (a.xac_suat * a.trong_so));
        
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

    emptyResult() {
        return {
            luong: this.name,
            trong_so: this.weight,
            du_doan: '',
            xac_suat: 50,
            cac_cau: [],
            so_luong_cau: 0
        };
    }
}

/**
 * LUỒNG 3: Phân tích thống kê (Tần suất, Chuỗi, Biến động)
 */
class ThreadThongKe {
    constructor(data) {
        this.data = data;
        this.name = 'Thống Kê';
        this.weight = CONFIG.ENSEMBLE_WEIGHTS.THONG_KE;
    }

    analyze() {
        const data = this.data;
        if (data.length < CONFIG.MIN_DATA) return this.emptyResult();

        const tanSuat = this.tinhTanSuat(data);
        const chuoi = this.tinhChuoi(data);
        const bienDong = this.tinhBienDong(data);
        const phanPhoi = this.tinhPhanPhoi(data);
        const entropy = this.tinhEntropy(data);

        // Tổng hợp điểm
        let diemTai = 50;
        let diemXiu = 50;

        // Tần suất
        if (tanSuat.tai > 60) diemTai += 10 * this.weight;
        else if (tanSuat.xiu > 60) diemXiu += 10 * this.weight;

        // Chuỗi
        if (chuoi.do_dai >= 5) {
            if (chuoi.hien_tai === 'tai') diemXiu += 8 * this.weight;
            else diemTai += 8 * this.weight;
        }

        // Biến động
        if (bienDong > 70) {
            // Biến động cao -> xu hướng đảo chiều
            const last = data[data.length - 1];
            if (last === 'tai') diemXiu += 6 * this.weight;
            else diemTai += 6 * this.weight;
        }

        // Phân phối
        if (phanPhoi.matCanBang) {
            const last = data[data.length - 1];
            if (last === 'tai') diemXiu += 4 * this.weight;
            else diemTai += 4 * this.weight;
        }

        // Entropy
        if (entropy > 0.9) {
            // Độ hỗn loạn cao -> khó dự đoán
            diemTai = diemXiu = 50;
        }

        const total = diemTai + diemXiu;
        const tiLeTai = Math.round((diemTai / total) * 100);
        const tiLeXiu = Math.round((diemXiu / total) * 100);

        return {
            luong: this.name,
            trong_so: this.weight,
            du_doan: tiLeTai > tiLeXiu ? 'tai' : 'xiu',
            xac_suat: Math.abs(tiLeTai - tiLeXiu) + 50,
            chi_tiet: {
                tan_suat: tanSuat,
                chuoi: chuoi,
                bien_dong: bienDong,
                phan_phoi: phanPhoi,
                entropy: entropy
            }
        };
    }

    tinhTanSuat(data) {
        if (data.length === 0) return { tai: 50, xiu: 50 };
        const tai = data.filter(x => x === 'tai').length;
        return {
            tai: Math.round((tai / data.length) * 100),
            xiu: Math.round(((data.length - tai) / data.length) * 100)
        };
    }

    tinhChuoi(data) {
        if (data.length === 0) return { hien_tai: '', do_dai: 0 };
        const current = data[data.length - 1];
        let count = 0;
        for (let i = data.length - 1; i >= 0; i--) {
            if (data[i] === current) count++;
            else break;
        }
        return { hien_tai: current, do_dai: count };
    }

    tinhBienDong(data) {
        if (data.length < 2) return 0;
        let changes = 0;
        for (let i = 1; i < data.length; i++) {
            if (data[i] !== data[i-1]) changes++;
        }
        return Math.round((changes / (data.length - 1)) * 100);
    }

    tinhPhanPhoi(data) {
        if (data.length < 20) return { matCanBang: false, doLech: 0 };
        const tai = data.filter(x => x === 'tai').length;
        const tyLe = tai / data.length;
        const doLech = Math.abs(tyLe - 0.5);
        
        return {
            matCanBang: doLech < 0.1,
            doLech: Math.round(doLech * 100),
            thienVe: tyLe > 0.5 ? 'tai' : 'xiu'
        };
    }

    tinhEntropy(data) {
        if (data.length < 2) return 0;
        const tai = data.filter(x => x === 'tai').length;
        const xiu = data.length - tai;
        const pTai = tai / data.length;
        const pXiu = xiu / data.length;
        
        let entropy = 0;
        if (pTai > 0) entropy -= pTai * Math.log2(pTai);
        if (pXiu > 0) entropy -= pXiu * Math.log2(pXiu);
        
        return Math.round(entropy * 100) / 100;
    }

    emptyResult() {
        return {
            luong: this.name,
            trong_so: this.weight,
            du_doan: '',
            xac_suat: 50,
            chi_tiet: {}
        };
    }
}

/**
 * LUỒNG 4: Phân tích Markov (Xác suất chuyển đổi trạng thái)
 */
class ThreadMarkov {
    constructor(data) {
        this.data = data;
        this.name = 'Markov Chain';
        this.weight = CONFIG.ENSEMBLE_WEIGHTS.MARKOV;
    }

    analyze() {
        const data = this.data;
        if (data.length < 10) return this.emptyResult();

        // Ma trận chuyển đổi Markov bậc 1
        const markov1 = this.tinhMarkovBac1(data);
        
        // Ma trận chuyển đổi Markov bậc 2
        const markov2 = this.tinhMarkovBac2(data);
        
        // Dự đoán từ bậc 1
        const last = data[data.length - 1];
        let duDoan1 = '', xacSuat1 = 50;
        
        if (last === 'tai' && markov1.tai_sau_tai + markov1.xiu_sau_tai > 0) {
            const total = markov1.tai_sau_tai + markov1.xiu_sau_tai;
            duDoan1 = markov1.tai_sau_tai > markov1.xiu_sau_tai ? 'tai' : 'xiu';
            xacSuat1 = Math.round((Math.max(markov1.tai_sau_tai, markov1.xiu_sau_tai) / total) * 100);
        } else if (last === 'xiu' && markov1.tai_sau_xiu + markov1.xiu_sau_xiu > 0) {
            const total = markov1.tai_sau_xiu + markov1.xiu_sau_xiu;
            duDoan1 = markov1.tai_sau_xiu > markov1.xiu_sau_xiu ? 'tai' : 'xiu';
            xacSuat1 = Math.round((Math.max(markov1.tai_sau_xiu, markov1.xiu_sau_xiu) / total) * 100);
        }

        // Dự đoán từ bậc 2
        const last2 = data.slice(-2).join('-');
        const duDoan2 = markov2[last2] || { du_doan: duDoan1, xac_suat: 50 };

        // Kết hợp
        const duDoan = duDoan2.du_doan || duDoan1;
        const xacSuat = Math.round((xacSuat1 * 0.4 + duDoan2.xac_suat * 0.6));

        return {
            luong: this.name,
            trong_so: this.weight,
            du_doan: duDoan,
            xac_suat: Math.min(xacSuat, 85),
            chi_tiet: {
                markov_bac_1: markov1,
                markov_bac_2: markov2,
                du_doan_bac_1: duDoan1,
                du_doan_bac_2: duDoan2.du_doan || ''
            }
        };
    }

    tinhMarkovBac1(data) {
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
        
        return { tai_sau_tai, xiu_sau_tai, tai_sau_xiu, xiu_sau_xiu };
    }

    tinhMarkovBac2(data) {
        const transitions = {};
        
        for (let i = 0; i < data.length - 2; i++) {
            const state = data[i] + '-' + data[i+1];
            const next = data[i+2];
            
            if (!transitions[state]) {
                transitions[state] = { tai: 0, xiu: 0 };
            }
            
            if (next === 'tai') transitions[state].tai++;
            else transitions[state].xiu++;
        }
        
        // Tính xác suất cho trạng thái hiện tại
        if (data.length >= 2) {
            const currentState = data[data.length - 2] + '-' + data[data.length - 1];
            const probs = transitions[currentState];
            
            if (probs && probs.tai + probs.xiu > 0) {
                const total = probs.tai + probs.xiu;
                return {
                    [currentState]: {
                        du_doan: probs.tai > probs.xiu ? 'tai' : 'xiu',
                        xac_suat: Math.round((Math.max(probs.tai, probs.xiu) / total) * 100)
                    }
                };
            }
        }
        
        return {};
    }

    emptyResult() {
        return {
            luong: this.name,
            trong_so: this.weight,
            du_doan: '',
            xac_suat: 50,
            chi_tiet: {}
        };
    }
}

/**
 * LUỒNG 5: Phân tích Xu hướng & Chu kỳ
 */
class ThreadXuHuongChuKy {
    constructor(data) {
        this.data = data;
        this.name = 'Xu Hướng & Chu Kỳ';
        this.weight = CONFIG.ENSEMBLE_WEIGHTS.XU_HUONG + CONFIG.ENSEMBLE_WEIGHTS.CHU_KY;
    }

    analyze() {
        const data = this.data;
        if (data.length < 15) return this.emptyResult();

        const xuHuong = this.phanTichXuHuong(data);
        const chuKy = this.phanTichChuKy(data);
        const fibonacci = this.phanTichFibonacci(data);
        const movingAverage = this.phanTichMovingAverage(data);

        // Tổng hợp
        let diemTai = 50;
        let diemXiu = 50;

        // Xu hướng
        if (xuHuong.du_doan === 'tai') diemTai += xuHuong.xac_suat - 50;
        else if (xuHuong.du_doan === 'xiu') diemXiu += xuHuong.xac_suat - 50;

        // Chu kỳ
        if (chuKy.du_doan === 'tai') diemTai += chuKy.xac_suat - 50;
        else if (chuKy.du_doan === 'xiu') diemXiu += chuKy.xac_suat - 50;

        // Fibonacci
        if (fibonacci.du_doan === 'tai') diemTai += fibonacci.xac_suat - 50;
        else if (fibonacci.du_doan === 'xiu') diemXiu += fibonacci.xac_suat - 50;

        // Moving Average
        if (movingAverage.du_doan === 'tai') diemTai += movingAverage.xac_suat - 50;
        else if (movingAverage.du_doan === 'xiu') diemXiu += movingAverage.xac_suat - 50;

        const total = diemTai + diemXiu;
        const tiLeTai = total > 0 ? Math.round((diemTai / total) * 100) : 50;
        const tiLeXiu = total > 0 ? Math.round((diemXiu / total) * 100) : 50;

        return {
            luong: this.name,
            trong_so: this.weight,
            du_doan: tiLeTai > tiLeXiu ? 'tai' : 'xiu',
            xac_suat: Math.abs(tiLeTai - tiLeXiu) + 50,
            chi_tiet: {
                xu_huong: xuHuong,
                chu_ky: chuKy,
                fibonacci: fibonacci,
                moving_average: movingAverage
            }
        };
    }

    phanTichXuHuong(data) {
        const segments = 3;
        const segSize = Math.floor(data.length / segments);
        
        const ratios = [];
        for (let i = 0; i < segments; i++) {
            const start = i * segSize;
            const end = i === segments - 1 ? data.length : (i + 1) * segSize;
            const seg = data.slice(start, end);
            const taiRatio = seg.filter(x => x === 'tai').length / seg.length;
            ratios.push(taiRatio);
        }

        // Kiểm tra xu hướng
        let duDoan = '', xacSuat = 50;
        
        if (ratios[0] < ratios[1] && ratios[1] < ratios[2]) {
            duDoan = 'tai';
            xacSuat = 65;
        } else if (ratios[0] > ratios[1] && ratios[1] > ratios[2]) {
            duDoan = 'xiu';
            xacSuat = 65;
        } else {
            // Tính trung bình có trọng số (gần đây hơn có trọng số cao hơn)
            const weightedAvg = ratios[0] * 0.2 + ratios[1] * 0.3 + ratios[2] * 0.5;
            duDoan = weightedAvg > 0.5 ? 'tai' : 'xiu';
            xacSuat = Math.round(Math.abs(weightedAvg - 0.5) * 100 + 50);
        }

        return { du_doan: duDoan, xac_suat: xacSuat, ratios };
    }

    phanTichChuKy(data) {
        // Tìm chu kỳ lặp lại
        for (let k = 2; k <= Math.min(20, Math.floor(data.length / 3)); k++) {
            let match = 0;
            let total = 0;
            
            for (let i = data.length - 1; i >= k; i--) {
                if (data[i] === data[i - k]) match++;
                total++;
            }
            
            const ratio = match / total;
            if (ratio > 0.6) {
                const next = data[data.length - k];
                return {
                    du_doan: next,
                    xac_suat: Math.round(ratio * 100),
                    chu_ky: k
                };
            }
        }
        
        return { du_doan: '', xac_suat: 50, chu_ky: 0 };
    }

    phanTichFibonacci(data) {
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

    phanTichMovingAverage(data) {
        const periods = [5, 10, 20];
        const currentValue = data[data.length - 1] === 'tai' ? 1 : 0;
        const mas = {};
        let signal = 0;
        
        for (const p of periods) {
            if (data.length < p) continue;
            const slice = data.slice(-p);
            const tai = slice.filter(x => x === 'tai').length;
            const ma = tai / p;
            mas[`MA${p}`] = Math.round(ma * 100);
            
            if (ma > 0.5) signal++;
            else signal--;
        }
        
        return {
            du_doan: signal > 0 ? 'tai' : signal < 0 ? 'xiu' : '',
            xac_suat: 50 + Math.abs(signal) * 5,
            moving_averages: mas
        };
    }

    emptyResult() {
        return {
            luong: this.name,
            trong_so: this.weight,
            du_doan: '',
            xac_suat: 50,
            chi_tiet: {}
        };
    }
}

/**
 * LUỒNG 6: Phân tích Phân kỳ & Hội tụ
 */
class ThreadPhanKy {
    constructor(data) {
        this.data = data;
        this.name = 'Phân Kỳ';
        this.weight = CONFIG.ENSEMBLE_WEIGHTS.PHAN_KY;
    }

    analyze() {
        const data = this.data;
        if (data.length < 10) return this.emptyResult();

        const tai = data.filter(x => x === 'tai').length;
        const tyLe = tai / data.length;
        const divergence = tyLe - 0.5;
        
        let duDoan = '', xacSuat = 50;
        
        if (divergence > 0.15) {
            // Quá nhiều Tài -> dự đoán Xỉu (phân kỳ)
            duDoan = 'xiu';
            xacSuat = Math.min(50 + divergence * 100, 70);
        } else if (divergence < -0.15) {
            // Quá nhiều Xỉu -> dự đoán Tài (phân kỳ)
            duDoan = 'tai';
            xacSuat = Math.min(50 + Math.abs(divergence) * 100, 70);
        } else {
            // Cân bằng -> theo xu hướng nhẹ
            duDoan = tyLe > 0.5 ? 'tai' : 'xiu';
            xacSuat = 55;
        }

        return {
            luong: this.name,
            trong_so: this.weight,
            du_doan: duDoan,
            xac_suat: xacSuat,
            chi_tiet: {
                ty_le_hien_tai: Math.round(tyLe * 100),
                do_phan_ky: Math.round(divergence * 100)
            }
        };
    }

    emptyResult() {
        return {
            luong: this.name,
            trong_so: this.weight,
            du_doan: '',
            xac_suat: 50,
            chi_tiet: {}
        };
    }
}

// ============================================================================
// ============ ENSEMBLE LEARNING - TỔNG HỢP ĐA LUỒNG ============
// ============================================================================

function ensemblePrediction(data) {
    // Khởi tạo tất cả các luồng phân tích
    const threads = [
        new ThreadCauTruyenThong(data),
        new ThreadCauNangCao(data),
        new ThreadThongKe(data),
        new ThreadMarkov(data),
        new ThreadXuHuongChuKy(data),
        new ThreadPhanKy(data)
    ];

    // Chạy tất cả các luồng và thu thập kết quả
    threadResults = threads.map(thread => thread.analyze());

    // Tổng hợp kết quả
    let tongDiemTai = 50;
    let tongDiemXiu = 50;
    let tongTrongSo = 0;
    const chiTietLuong = [];

    for (const result of threadResults) {
        if (!result.du_doan || result.xac_suat === 50) continue;

        const trongSo = result.trong_so;
        const diemDieuChinh = (result.xac_suat - 50) * 2 * trongSo;

        if (result.du_doan === 'tai') {
            tongDiemTai += diemDieuChinh;
        } else if (result.du_doan === 'xiu') {
            tongDiemXiu += diemDieuChinh;
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

    // Chuẩn hóa
    const total = tongDiemTai + tongDiemXiu;
    let tiLeTai = total > 0 ? Math.round((tongDiemTai / total) * 100) : 50;
    let tiLeXiu = total > 0 ? Math.round((tongDiemXiu / total) * 100) : 50;

    // Đảm bảo tổng = 100
    if (tiLeTai + tiLeXiu !== 100) {
        if (tiLeTai > tiLeXiu) tiLeTai = 100 - tiLeXiu;
        else tiLeXiu = 100 - tiLeTai;
    }

    const duDoan = tiLeTai > tiLeXiu ? 'tai' : 'xiu';
    const doTinCay = Math.min(50 + Math.abs(tiLeTai - tiLeXiu) * 0.4, 90);

    // Tìm cầu chính từ các luồng
    let cauChinh = '';
    let mauCau = '';
    let danhSachCau = [];
    
    for (const ct of chiTietLuong) {
        if (ct.cau_chinh) {
            mauCau = ct.cau_chinh;
            if (!cauChinh) cauChinh = ct.cau_chinh;
        }
        if (ct.cac_cau && ct.cac_cau.length > 0) {
            danhSachCau.push(...ct.cac_cau.map(c => c.ten));
        }
    }

    // Loại bỏ trùng lặp
    danhSachCau = [...new Set(danhSachCau)];

    return {
        duDoan,
        tiLeTai,
        tiLeXiu,
        doTinCay,
        loaiCau: cauChinh || 'Phân tích tổng hợp',
        mauCau: mauCau || 'Đa luồng',
        cauPhatHien: {
            tong_cau: danhSachCau.length,
            danh_sach: danhSachCau,
            cau_chinh: cauChinh || 'Tổng hợp'
        },
        chiTietLuong,
        threadResults
    };
}

// ============================================================================
// ============ HÀM DỰ ĐOÁN CHÍNH (SỬ DỤNG ENSEMBLE) ============
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
            cauPhatHien: { tong_cau: 0, danh_sach: [], cau_chinh: '' },
            chiTietLuong: [],
            threadResults: []
        };
    }

    // Sử dụng Ensemble Learning
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
    
    // Cập nhật streak cao nhất
    if (Math.abs(stats.currentStreak) > stats.maxStreak) {
        stats.maxStreak = Math.abs(stats.currentStreak);
    }

    // Thống kê theo loại cầu
    if (loaiCau && loaiCau !== 'Không xác định') {
        if (!stats.byCauType[loaiCau]) {
            stats.byCauType[loaiCau] = { total: 0, correct: 0 };
        }
        stats.byCauType[loaiCau].total++;
        if (duDoan === ketQuaThucTe) {
            stats.byCauType[loaiCau].correct++;
        }
    }

    // Độ chính xác trượt 50 phiên
    const recentHistory = history.slice(-50);
    const recentCorrect = recentHistory.filter((val, idx) => {
        if (idx < predictionHistory.length) {
            return predictionHistory[predictionHistory.length - recentHistory.length + idx] === val;
        }
        return false;
    }).length;
    
    stats.rollingAccuracy.push({
        thoi_diem: new Date().toISOString(),
        do_chinh_xac: recentHistory.length > 0 ? Math.round((recentCorrect / recentHistory.length) * 100) : 0
    });
    
    // Giới hạn lịch sử
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
            // Lưu lịch sử
            history.push(ketQuaChuan);
            historyChiTiet.push({ phien, d1, d2, d3, tong, ketQua: ketQuaChuan });
            
            if (history.length > CONFIG.MAX_HISTORY) {
                history.shift();
                historyChiTiet.shift();
            }

            // Kiểm tra dự đoán trước đó
            if (currentData.Du_doan && currentData.Phien) {
                const isCorrect = currentData.Du_doan === ketQuaChuan;
                predictionHistory.push(currentData.Du_doan);
                
                if (predictionHistory.length > CONFIG.MAX_HISTORY) {
                    predictionHistory.shift();
                }
                
                capNhatThongKe(ketQuaChuan, currentData.Du_doan, currentData.Loai_cau);
            }
        }

        // Thực hiện dự đoán mới
        const prediction = duDoanTongHop(history);
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
                do_dai: history.length > 0 ? Math.min(10, history.length) : 0,
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

        // Log chi tiết
        hienThiLogChiTiet(phien, d1, d2, d3, tong, ketQuaChuan, prediction);
        
        // Lưu lịch sử cầu
        cauHistory.push({
            phien,
            loai_cau: prediction.loaiCau,
            mau_cau: prediction.mauCau,
            du_doan: prediction.duDoan,
            ket_qua: ketQuaChuan,
            chinh_xac: prediction.duDoan === ketQuaChuan
        });
        
        if (cauHistory.length > 200) cauHistory.shift();
    }
}

function hienThiLogChiTiet(phien, d1, d2, d3, tong, ketQuaChuan, prediction) {
    console.log('\n' + '═'.repeat(80));
    console.log(`📊 PHIÊN: ${phien} | 🎲 [${d1}, ${d2}, ${d3}] = ${tong}`);
    console.log(`✅ KẾT QUẢ: ${ketQuaChuan.toUpperCase()}`);
    console.log('─'.repeat(80));
    console.log(`🔮 DỰ ĐOÁN ENSEMBLE: ${prediction.duDoan.toUpperCase()}`);
    console.log(`📈 TỈ LỆ: Tài ${prediction.tiLeTai}% | Xỉu ${prediction.tiLeXiu}%`);
    console.log(`🎯 ĐỘ TIN CẬY: ${prediction.doTinCay}%`);
    console.log('─'.repeat(80));
    console.log('📐 PHÂN TÍCH ĐA LUỒNG:');
    
    if (prediction.chiTietLuong && prediction.chiTietLuong.length > 0) {
        prediction.chiTietLuong.forEach((luong, idx) => {
            const icon = luong.du_doan === 'tai' ? '🟢' : luong.du_doan === 'xiu' ? '🔴' : '⚪';
            console.log(`  ${icon} Luồng ${idx + 1}: ${luong.luong}`);
            console.log(`     Dự đoán: ${luong.du_doan || 'N/A'} | Xác suất: ${luong.xac_suat}% | Trọng số: ${(luong.trong_so * 100).toFixed(0)}%`);
            if (luong.cau_chinh) {
                console.log(`     Cầu chính: ${luong.cau_chinh} | Số cầu: ${luong.so_luong_cau || 0}`);
            }
            if (luong.cac_cau && luong.cac_cau.length > 0) {
                luong.cac_cau.forEach(c => {
                    console.log(`       ↳ ${c.ten}: ${c.du_doan} (${c.xac_suat}%)`);
                });
            }
        });
    }
    
    console.log('─'.repeat(80));
    console.log(`📋 TỔNG HỢP CẦU:`);
    console.log(`  • Loại cầu: ${prediction.loaiCau}`);
    console.log(`  • Mẫu cầu: ${prediction.mauCau}`);
    console.log(`  • Số cầu phát hiện: ${prediction.cauPhatHien.tong_cau}`);
    if (prediction.cauPhatHien.danh_sach && prediction.cauPhatHien.danh_sach.length > 0) {
        prediction.cauPhatHien.danh_sach.forEach((c, i) => {
            console.log(`  • Cầu ${i + 1}: ${c}`);
        });
    }
    
    console.log('─'.repeat(80));
    console.log(`📊 THỐNG KÊ: ${stats.correct}/${stats.total} (${stats.total > 0 ? Math.round(stats.correct / stats.total * 100) : 0}%)`);
    console.log(`🔥 STREAK: ${stats.currentStreak > 0 ? '+' : ''}${stats.currentStreak} | MAX: ${stats.maxStreak}`);
    console.log(`🏷️ ID: @tranhoang2286`);
    console.log('═'.repeat(80));
}

// ============================================================================
// ============ MIDDLEWARE & API MỞ RỘNG ============
// ============================================================================

app.set('etag', false);
app.use((req, res, next) => {
    res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.header('Pragma', 'no-cache');
    res.header('Expires', '0');
    res.header('X-Powered-By', 'MAX789-SieuDuDoan');
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
        by_cau_type: stats.byCauType,
        rolling_accuracy: stats.rollingAccuracy.slice(-20),
        history: history.slice(-50),
        cau_phat_hien: currentData.Phan_tich_chi_tiet.cau_phat_hien || {}
    });
});

app.get('/api/cau', (req, res) => {
    const result = duDoanTongHop(history);
    res.json({
        success: true,
        cau: result.cauPhatHien,
        loai_cau: result.loaiCau,
        mau_cau: result.mauCau,
        du_doan: result.duDoan,
        ti_le: { tai: result.tiLeTai, xiu: result.tiLeXiu },
        do_tin_cay: result.doTinCay,
        phan_tich_da_luong: result.chiTietLuong || []
    });
});

app.get('/api/threads', (req, res) => {
    res.json({
        success: true,
        thread_results: threadResults,
        ensemble: currentData.Phan_tich_chi_tiet.ensemble_score || {},
        chi_bao: currentData.Phan_tich_chi_tiet.chi_bao_ky_thuat || {}
    });
});

app.get('/api/history', (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    res.json({
        success: true,
        history: history.slice(-limit),
        history_chi_tiet: historyChiTiet.slice(-limit),
        cau_history: cauHistory.slice(-limit)
    });
});

app.get('/api/performance', (req, res) => {
    const byCau = {};
    Object.keys(stats.byCauType).forEach(key => {
        const val = stats.byCauType[key];
        byCau[key] = {
            ...val,
            accuracy: val.total > 0 ? Math.round(val.correct / val.total * 100) : 0
        };
    });

    res.json({
        success: true,
        overall: {
            total: stats.total,
            correct: stats.correct,
            wrong: stats.wrong,
            accuracy: stats.total > 0 ? Math.round(stats.correct / stats.total * 100) : 0
        },
        by_cau_type: byCau,
        streak: {
            current: stats.currentStreak,
            max: stats.maxStreak,
            type: stats.streakType
        },
        rolling_accuracy: stats.rollingAccuracy.slice(-10)
    });
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        phien: currentData.Phien, 
        total: history.length,
        threads_active: CONFIG.THREAD_COUNT,
        last_update: new Date().toISOString()
    });
});

// ============================================================================
// ============ KHỞI ĐỘNG ============
// ============================================================================

app.listen(PORT, async () => {
    console.log('\n' + '═'.repeat(80));
    console.log('🚀 MAX789 SIÊU DỰ ĐOÁN V11.0 - ENSEMBLE LEARNING');
    console.log('═'.repeat(80));
    console.log(`🔗 Server: http://localhost:${PORT}`);
    console.log(`👤 Creator: @tranhoang2286`);
    console.log(`🧠 Thuật toán: Ensemble Learning (Không Random)`);
    console.log(`🔬 Luồng phân tích: ${CONFIG.THREAD_COUNT} luồng song song`);
    console.log(`📊 Các luồng:`);
    console.log(`   1. Phân tích Cầu Truyền Thống (7 mẫu cầu)`);
    console.log(`   2. Phân tích Cầu Nâng Cao (7 mẫu cầu)`);
    console.log(`   3. Phân tích Thống Kê (Tần suất, Chuỗi, Entropy)`);
    console.log(`   4. Phân tích Markov Chain (Bậc 1 & 2)`);
    console.log(`   5. Phân tích Xu Hướng & Chu Kỳ (Fibonacci, MA)`);
    console.log(`   6. Phân tích Phân Kỳ`);
    console.log(`⚖️ Ensemble: Trọng số động kết hợp tất cả luồng`);
    console.log(`📈 Ngưỡng tin cậy: ${CONFIG.CONFIDENCE_THRESHOLD}%`);
    console.log('═'.repeat(80) + '\n');
    
    await xuLyDuDoan();
    setInterval(xuLyDuDoan, CONFIG.CHECK_INTERVAL);
});

// Xử lý lỗi
process.on('uncaughtException', (error) => {
    console.error('🔥 Lỗi:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('⚠️ Unhandled Rejection:', reason);
});

// Helper function
Math.log2 = Math.log2 || function(x) {
    return Math.log(x) / Math.LN2;
};
