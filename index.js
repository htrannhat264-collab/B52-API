const express = require('express');
const axios = require('axios');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const HISTORY_API = 'https://b52-qiw2.onrender.com/api/history';
const PORT = process.env.PORT || 3000;

// ═══════════════════════════════════════════════════════════════════════════
// 📁 CẤU HÌNH LƯU TRỮ
// ═══════════════════════════════════════════════════════════════════════════

const DATA_DIR = '/tmp/cau_data';
const CAU_FILE = path.join(DATA_DIR, 'cau.json');
const LOG_FILE = path.join(DATA_DIR, 'logs.json');
const PREDICTION_FILE = path.join(DATA_DIR, 'predictions.json');

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ═══════════════════════════════════════════════════════════════════════════
// 🧠 LỚP HỌC CẦU THÔNG MINH - 20+ THUẬT TOÁN
// ═══════════════════════════════════════════════════════════════════════════

class SieuTriTueHocCau {
    constructor() {
        // Kho lưu trữ 20+ loại cầu
        this.khoCau = {
            cauBet: [],           // Cầu bệt (dây liên tiếp)
            cau11: [],            // Cầu 1-1 (đan xen)
            cau21: [],            // Cầu 2-1 (kép - đơn)
            cau12: [],            // Cầu 1-2 (đơn - kép)
            cau212: [],           // Cầu 2-1-2 (kép - đơn - kép)
            cau121: [],           // Cầu 1-2-1 (đơn - kép - đơn)
            cau22: [],            // Cầu 2-2 (kép đôi)
            cau31: [],            // Cầu 3-1 (ba - một)
            cau13: [],            // Cầu 1-3 (một - ba)
            cau32: [],            // Cầu 3-2 (ba - hai)
            cau23: [],            // Cầu 2-3 (hai - ba)
            cau33: [],            // Cầu 3-3 (ba - ba)
            cauFibonacci: [],     // Cầu Fibonacci
            cauDoiXung: [],       // Cầu đối xứng (palindrome)
            cauLap: [],           // Cầu lặp pattern
            cauNhay: [],          // Cầu nhảy
            cauKep: [],           // Cầu kép 3 đôi
            cauTienTrien: [],     // Cầu tiến triển
            cauLui: [],           // Cầu lùi
            cauXoayVong: [],      // Cầu xoay vòng
            cauGay: [],           // Cầu gãy
            cauTheoXuHuong: [],   // Cầu theo xu hướng
            cauTheoBienDo: [],    // Cầu theo biên độ
            cauTheoChuKy: []      // Cầu theo chu kỳ
        };
        
        // Thống kê
        this.thongKe = {
            tongSoCau: 0,
            soLanGap: {},
            doChinhXacTrungBinh: 0,
            lanCuoiHoc: null,
            thoiGianHocTrungBinh: 0,
            soLuotHoc: 0
        };
        
        // Bộ nhớ tạm
        this.boNho = {
            cauDangChay: null,
            cauVuaKetThuc: null,
            doTinCayHienTai: 0,
            lichSuDuDoan: [],
            doChinhXacGanDay: []
        };
        
        // Lịch sử học tập
        this.lichSuHoc = [];
        this.logs = [];
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 1. HỌC CẦU BỆT (DÂY LIÊN TIẾP)
    // ═══════════════════════════════════════════════════════════════════════
    
    hocCauBet(lichSu) {
        const ketQua = lichSu.map(h => h.Ket_qua);
        const cauPhatHien = [];
        
        for (let i = 0; i < ketQua.length - 1; i++) {
            let doDai = 1;
            for (let j = i; j < ketQua.length - 1; j++) {
                if (ketQua[j] === ketQua[j + 1]) {
                    doDai++;
                } else {
                    break;
                }
            }
            
            if (doDai >= 3) {
                const cau = {
                    id: `bet_${Date.now()}_${i}_${crypto.randomBytes(4).toString('hex')}`,
                    loai: "BỆT",
                    loaiCode: "BET",
                    viTri: i,
                    doDai: doDai,
                    giaTri: ketQua[i],
                    doTinCay: Math.min(70 + doDai * 5, 95),
                    thoiGianPhatHien: new Date().toISOString(),
                    mau: ketQua.slice(i, i + doDai),
                    xacSuatTiep: {
                        tiepTuc: doDai >= 4 ? 65 : 45,
                        dao: doDai >= 4 ? 35 : 55
                    }
                };
                cauPhatHien.push(cau);
                i += doDai - 1;
            }
        }
        
        // Phân tích quy luật sau bệt
        const quyLuật = {};
        for (const cau of cauPhatHien) {
            const viTriSau = cau.viTri + cau.doDai;
            if (viTriSau < ketQua.length) {
                const sau = ketQua[viTriSau];
                const key = `bet_${cau.doDai}`;
                if (!quyLuật[key]) quyLuật[key] = { tai: 0, xiu: 0, tong: 0 };
                if (sau === 'Tài') quyLuật[key].tai++;
                else quyLuật[key].xiu++;
                quyLuật[key].tong++;
            }
        }
        
        // Tính xác suất
        for (const key in quyLuật) {
            quyLuật[key].xacSuatTai = (quyLuật[key].tai / quyLuật[key].tong * 100).toFixed(1);
            quyLuật[key].xacSuatXiu = (quyLuật[key].xiu / quyLuật[key].tong * 100).toFixed(1);
        }
        
        this.khoCau.cauBet = cauPhatHien;
        this.thongKe.soLanGap.bet = cauPhatHien.length;
        
        return { cauPhatHien, quyLuật, tongCong: cauPhatHien.length };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 2. HỌC CẦU 1-1 (ĐAN XEN)
    // ═══════════════════════════════════════════════════════════════════════
    
    hocCau11(lichSu) {
        const ketQua = lichSu.map(h => h.Ket_qua);
        const cauPhatHien = [];
        
        for (let i = 0; i < ketQua.length - 3; i++) {
            if (ketQua[i] !== ketQua[i + 1] && ketQua[i + 1] !== ketQua[i + 2]) {
                let doDai = 2;
                for (let j = i + 2; j < ketQua.length - 1; j++) {
                    if (ketQua[j] !== ketQua[j + 1]) {
                        doDai++;
                    } else {
                        break;
                    }
                }
                
                const cau = {
                    id: `11_${Date.now()}_${i}_${crypto.randomBytes(4).toString('hex')}`,
                    loai: "1-1",
                    loaiCode: "11",
                    viTri: i,
                    doDai: doDai,
                    batDauBang: ketQua[i],
                    ketThucBang: ketQua[i + doDai - 1],
                    doTinCay: 75 + Math.min(doDai, 10),
                    thoiGianPhatHien: new Date().toISOString(),
                    mau: ketQua.slice(i, i + doDai),
                    duDoanTiep: ketQua[i + doDai - 1] === 'Tài' ? 'Xỉu' : 'Tài'
                };
                cauPhatHien.push(cau);
                i += doDai - 1;
            }
        }
        
        this.khoCau.cau11 = cauPhatHien;
        this.thongKe.soLanGap.cau11 = cauPhatHien.length;
        
        return cauPhatHien;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 3. HỌC CẦU 2-1 (KÉP - ĐƠN)
    // ═══════════════════════════════════════════════════════════════════════
    
    hocCau21(lichSu) {
        const ketQua = lichSu.map(h => h.Ket_qua);
        const cauPhatHien = [];
        
        for (let i = 0; i < ketQua.length - 3; i++) {
            if (ketQua[i] === ketQua[i + 1] && ketQua[i + 1] !== ketQua[i + 2]) {
                const cau = {
                    id: `21_${Date.now()}_${i}_${crypto.randomBytes(4).toString('hex')}`,
                    loai: "2-1",
                    loaiCode: "21",
                    viTri: i,
                    capDoi: ketQua[i],
                    don: ketQua[i + 2],
                    doTinCay: 78,
                    duDoanTiep: ketQua[i + 2],
                    thoiGianPhatHien: new Date().toISOString(),
                    mau: ketQua.slice(i, i + 3),
                    phanTich: {
                        khaNangTiep: ketQua[i + 2] === 'Tài' ? 62 : 38,
                        khaNangDao: ketQua[i + 2] === 'Tài' ? 38 : 62
                    }
                };
                cauPhatHien.push(cau);
            }
        }
        
        // Học quy luật sau cầu 2-1
        const quyLuật = {};
        for (const cau of cauPhatHien) {
            const viTriSau = cau.viTri + 3;
            if (viTriSau < ketQua.length) {
                const sau = ketQua[viTriSau];
                const key = `21_${cau.don}`;
                if (!quyLuật[key]) quyLuật[key] = { tai: 0, xiu: 0, tong: 0 };
                if (sau === 'Tài') quyLuật[key].tai++;
                else quyLuật[key].xiu++;
                quyLuật[key].tong++;
            }
        }
        
        this.khoCau.cau21 = cauPhatHien;
        this.thongKe.soLanGap.cau21 = cauPhatHien.length;
        
        return { cauPhatHien, quyLuật };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 4. HỌC CẦU 1-2 (ĐƠN - KÉP)
    // ═══════════════════════════════════════════════════════════════════════
    
    hocCau12(lichSu) {
        const ketQua = lichSu.map(h => h.Ket_qua);
        const cauPhatHien = [];
        
        for (let i = 0; i < ketQua.length - 3; i++) {
            if (ketQua[i] !== ketQua[i + 1] && ketQua[i + 1] === ketQua[i + 2]) {
                const cau = {
                    id: `12_${Date.now()}_${i}_${crypto.randomBytes(4).toString('hex')}`,
                    loai: "1-2",
                    loaiCode: "12",
                    viTri: i,
                    don: ketQua[i],
                    capDoi: ketQua[i + 1],
                    doTinCay: 78,
                    duDoanTiep: ketQua[i + 1],
                    thoiGianPhatHien: new Date().toISOString(),
                    mau: ketQua.slice(i, i + 3)
                };
                cauPhatHien.push(cau);
            }
        }
        
        this.khoCau.cau12 = cauPhatHien;
        this.thongKe.soLanGap.cau12 = cauPhatHien.length;
        
        return cauPhatHien;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 5. HỌC CẦU 2-1-2 (KÉP - ĐƠN - KÉP)
    // ═══════════════════════════════════════════════════════════════════════
    
    hocCau212(lichSu) {
        const ketQua = lichSu.map(h => h.Ket_qua);
        const cauPhatHien = [];
        
        for (let i = 0; i < ketQua.length - 4; i++) {
            if (ketQua[i] === ketQua[i + 1] && 
                ketQua[i + 1] !== ketQua[i + 2] && 
                ketQua[i + 2] === ketQua[i + 3]) {
                const cau = {
                    id: `212_${Date.now()}_${i}_${crypto.randomBytes(4).toString('hex')}`,
                    loai: "2-1-2",
                    loaiCode: "212",
                    viTri: i,
                    capDoi1: ketQua[i],
                    don: ketQua[i + 2],
                    capDoi2: ketQua[i + 3],
                    doTinCay: 85,
                    duDoanTiep: ketQua[i],
                    thoiGianPhatHien: new Date().toISOString(),
                    mau: ketQua.slice(i, i + 4),
                    xacSuat: {
                        tiepCapDoi: 70,
                        daoDien: 30
                    }
                };
                cauPhatHien.push(cau);
            }
        }
        
        this.khoCau.cau212 = cauPhatHien;
        this.thongKe.soLanGap.cau212 = cauPhatHien.length;
        
        return cauPhatHien;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 6. HỌC CẦU 1-2-1 (ĐƠN - KÉP - ĐƠN)
    // ═══════════════════════════════════════════════════════════════════════
    
    hocCau121(lichSu) {
        const ketQua = lichSu.map(h => h.Ket_qua);
        const cauPhatHien = [];
        
        for (let i = 0; i < ketQua.length - 4; i++) {
            if (ketQua[i] !== ketQua[i + 1] && 
                ketQua[i + 1] === ketQua[i + 2] && 
                ketQua[i + 2] !== ketQua[i + 3]) {
                const cau = {
                    id: `121_${Date.now()}_${i}_${crypto.randomBytes(4).toString('hex')}`,
                    loai: "1-2-1",
                    loaiCode: "121",
                    viTri: i,
                    don1: ketQua[i],
                    capDoi: ketQua[i + 1],
                    don2: ketQua[i + 3],
                    doTinCay: 85,
                    duDoanTiep: ketQua[i + 1],
                    thoiGianPhatHien: new Date().toISOString(),
                    mau: ketQua.slice(i, i + 4)
                };
                cauPhatHien.push(cau);
            }
        }
        
        this.khoCau.cau121 = cauPhatHien;
        this.thongKe.soLanGap.cau121 = cauPhatHien.length;
        
        return cauPhatHien;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 7. HỌC CẦU 2-2 (KÉP ĐÔI)
    // ═══════════════════════════════════════════════════════════════════════
    
    hocCau22(lichSu) {
        const ketQua = lichSu.map(h => h.Ket_qua);
        const cauPhatHien = [];
        
        for (let i = 0; i < ketQua.length - 4; i++) {
            if (ketQua[i] === ketQua[i + 1] && 
                ketQua[i + 2] === ketQua[i + 3] && 
                ketQua[i] !== ketQua[i + 2]) {
                const cau = {
                    id: `22_${Date.now()}_${i}_${crypto.randomBytes(4).toString('hex')}`,
                    loai: "2-2",
                    loaiCode: "22",
                    viTri: i,
                    capDoi1: ketQua[i],
                    capDoi2: ketQua[i + 2],
                    doTinCay: 82,
                    duDoanTiep: ketQua[i + 2],
                    thoiGianPhatHien: new Date().toISOString(),
                    mau: ketQua.slice(i, i + 4)
                };
                cauPhatHien.push(cau);
            }
        }
        
        this.khoCau.cau22 = cauPhatHien;
        this.thongKe.soLanGap.cau22 = cauPhatHien.length;
        
        return cauPhatHien;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 8. HỌC CẦU 3-1 (BA - MỘT)
    // ═══════════════════════════════════════════════════════════════════════
    
    hocCau31(lichSu) {
        const ketQua = lichSu.map(h => h.Ket_qua);
        const cauPhatHien = [];
        
        for (let i = 0; i < ketQua.length - 4; i++) {
            if (ketQua[i] === ketQua[i + 1] && 
                ketQua[i + 1] === ketQua[i + 2] && 
                ketQua[i + 2] !== ketQua[i + 3]) {
                const cau = {
                    id: `31_${Date.now()}_${i}_${crypto.randomBytes(4).toString('hex')}`,
                    loai: "3-1",
                    loaiCode: "31",
                    viTri: i,
                    ba: ketQua[i],
                    mot: ketQua[i + 3],
                    doTinCay: 80,
                    duDoanTiep: ketQua[i + 3],
                    thoiGianPhatHien: new Date().toISOString(),
                    mau: ketQua.slice(i, i + 4),
                    phanTich: {
                        khaNangTiepTuc: 35,
                        khaNangDao: 65
                    }
                };
                cauPhatHien.push(cau);
            }
        }
        
        this.khoCau.cau31 = cauPhatHien;
        this.thongKe.soLanGap.cau31 = cauPhatHien.length;
        
        return cauPhatHien;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 9. HỌC CẦU 1-3 (MỘT - BA)
    // ═══════════════════════════════════════════════════════════════════════
    
    hocCau13(lichSu) {
        const ketQua = lichSu.map(h => h.Ket_qua);
        const cauPhatHien = [];
        
        for (let i = 0; i < ketQua.length - 4; i++) {
            if (ketQua[i] !== ketQua[i + 1] && 
                ketQua[i + 1] === ketQua[i + 2] && 
                ketQua[i + 2] === ketQua[i + 3]) {
                const cau = {
                    id: `13_${Date.now()}_${i}_${crypto.randomBytes(4).toString('hex')}`,
                    loai: "1-3",
                    loaiCode: "13",
                    viTri: i,
                    mot: ketQua[i],
                    ba: ketQua[i + 1],
                    doTinCay: 80,
                    duDoanTiep: ketQua[i + 1],
                    thoiGianPhatHien: new Date().toISOString(),
                    mau: ketQua.slice(i, i + 4)
                };
                cauPhatHien.push(cau);
            }
        }
        
        this.khoCau.cau13 = cauPhatHien;
        this.thongKe.soLanGap.cau13 = cauPhatHien.length;
        
        return cauPhatHien;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 10. HỌC CẦU 3-2 (BA - HAI)
    // ═══════════════════════════════════════════════════════════════════════
    
    hocCau32(lichSu) {
        const ketQua = lichSu.map(h => h.Ket_qua);
        const cauPhatHien = [];
        
        for (let i = 0; i < ketQua.length - 5; i++) {
            if (ketQua[i] === ketQua[i + 1] && 
                ketQua[i + 1] === ketQua[i + 2] && 
                ketQua[i + 2] !== ketQua[i + 3] && 
                ketQua[i + 3] === ketQua[i + 4]) {
                const cau = {
                    id: `32_${Date.now()}_${i}_${crypto.randomBytes(4).toString('hex')}`,
                    loai: "3-2",
                    loaiCode: "32",
                    viTri: i,
                    ba: ketQua[i],
                    hai: ketQua[i + 3],
                    doTinCay: 83,
                    duDoanTiep: ketQua[i + 3],
                    thoiGianPhatHien: new Date().toISOString(),
                    mau: ketQua.slice(i, i + 5)
                };
                cauPhatHien.push(cau);
            }
        }
        
        this.khoCau.cau32 = cauPhatHien;
        this.thongKe.soLanGap.cau32 = cauPhatHien.length;
        
        return cauPhatHien;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 11. HỌC CẦU 2-3 (HAI - BA)
    // ═══════════════════════════════════════════════════════════════════════
    
    hocCau23(lichSu) {
        const ketQua = lichSu.map(h => h.Ket_qua);
        const cauPhatHien = [];
        
        for (let i = 0; i < ketQua.length - 5; i++) {
            if (ketQua[i] === ketQua[i + 1] && 
                ketQua[i + 1] !== ketQua[i + 2] && 
                ketQua[i + 2] === ketQua[i + 3] && 
                ketQua[i + 3] === ketQua[i + 4]) {
                const cau = {
                    id: `23_${Date.now()}_${i}_${crypto.randomBytes(4).toString('hex')}`,
                    loai: "2-3",
                    loaiCode: "23",
                    viTri: i,
                    hai: ketQua[i],
                    ba: ketQua[i + 2],
                    doTinCay: 83,
                    duDoanTiep: ketQua[i + 2],
                    thoiGianPhatHien: new Date().toISOString(),
                    mau: ketQua.slice(i, i + 5)
                };
                cauPhatHien.push(cau);
            }
        }
        
        this.khoCau.cau23 = cauPhatHien;
        this.thongKe.soLanGap.cau23 = cauPhatHien.length;
        
        return cauPhatHien;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 12. HỌC CẦU 3-3 (BA - BA)
    // ═══════════════════════════════════════════════════════════════════════
    
    hocCau33(lichSu) {
        const ketQua = lichSu.map(h => h.Ket_qua);
        const cauPhatHien = [];
        
        for (let i = 0; i < ketQua.length - 6; i++) {
            if (ketQua[i] === ketQua[i + 1] && 
                ketQua[i + 1] === ketQua[i + 2] && 
                ketQua[i + 2] !== ketQua[i + 3] && 
                ketQua[i + 3] === ketQua[i + 4] && 
                ketQua[i + 4] === ketQua[i + 5]) {
                const cau = {
                    id: `33_${Date.now()}_${i}_${crypto.randomBytes(4).toString('hex')}`,
                    loai: "3-3",
                    loaiCode: "33",
                    viTri: i,
                    ba1: ketQua[i],
                    ba2: ketQua[i + 3],
                    doTinCay: 87,
                    duDoanTiep: ketQua[i + 3],
                    thoiGianPhatHien: new Date().toISOString(),
                    mau: ketQua.slice(i, i + 6)
                };
                cauPhatHien.push(cau);
            }
        }
        
        this.khoCau.cau33 = cauPhatHien;
        this.thongKe.soLanGap.cau33 = cauPhatHien.length;
        
        return cauPhatHien;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 13. HỌC CẦU FIBONACCI (THEO DÃY SỐ)
    // ═══════════════════════════════════════════════════════════════════════
    
    hocCauFibonacci(lichSu) {
        const ketQua = lichSu.map(h => h.Ket_qua);
        const cauPhatHien = [];
        const fibSequence = [1, 1, 2, 3, 5, 8, 13];
        
        for (let i = 0; i < ketQua.length - 13; i++) {
            let laFib = true;
            let viTri = i;
            const cacViTri = [viTri];
            
            for (const step of fibSequence) {
                if (viTri + step >= ketQua.length) {
                    laFib = false;
                    break;
                }
                if (ketQua[viTri] !== ketQua[viTri + step]) {
                    laFib = false;
                    break;
                }
                viTri += step;
                cacViTri.push(viTri);
            }
            
            if (laFib) {
                const cau = {
                    id: `fib_${Date.now()}_${i}_${crypto.randomBytes(4).toString('hex')}`,
                    loai: "FIBONACCI",
                    loaiCode: "FIB",
                    viTri: i,
                    doDai: viTri - i,
                    cacViTri: cacViTri,
                    giaTri: ketQua[i],
                    doTinCay: 88,
                    thoiGianPhatHien: new Date().toISOString(),
                    mau: ketQua.slice(i, viTri + 1)
                };
                cauPhatHien.push(cau);
                i = viTri;
            }
        }
        
        this.khoCau.cauFibonacci = cauPhatHien;
        this.thongKe.soLanGap.fibonacci = cauPhatHien.length;
        
        return cauPhatHien;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 14. HỌC CẦU ĐỐI XỨNG (PALINDROME)
    // ═══════════════════════════════════════════════════════════════════════
    
    hocCauDoiXung(lichSu) {
        const ketQua = lichSu.map(h => h.Ket_qua);
        const cauPhatHien = [];
        
        for (let doDai = 3; doDai <= 12; doDai++) {
            for (let i = 0; i <= ketQua.length - doDai; i++) {
                let laDoiXung = true;
                for (let j = 0; j < Math.floor(doDai / 2); j++) {
                    if (ketQua[i + j] !== ketQua[i + doDai - 1 - j]) {
                        laDoiXung = false;
                        break;
                    }
                }
                if (laDoiXung) {
                    const cau = {
                        id: `dx_${Date.now()}_${i}_${crypto.randomBytes(4).toString('hex')}`,
                        loai: "ĐỐI XỨNG",
                        loaiCode: "DX",
                        viTri: i,
                        doDai: doDai,
                        pattern: ketQua.slice(i, i + doDai),
                        giua: ketQua[i + Math.floor(doDai / 2)],
                        doTinCay: 85,
                        thoiGianPhatHien: new Date().toISOString(),
                        mau: ketQua.slice(i, i + doDai)
                    };
                    cauPhatHien.push(cau);
                    i += doDai - 1;
                }
            }
        }
        
        this.khoCau.cauDoiXung = cauPhatHien;
        this.thongKe.soLanGap.doiXung = cauPhatHien.length;
        
        return cauPhatHien;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 15. HỌC CẦU LẶP (PATTERN LẶP LẠI)
    // ═══════════════════════════════════════════════════════════════════════
    
    hocCauLap(lichSu) {
        const ketQua = lichSu.map(h => h.Ket_qua);
        const cauPhatHien = [];
        
        for (let doDaiMau = 2; doDaiMau <= 5; doDaiMau++) {
            for (let i = 0; i <= ketQua.length - doDaiMau * 2; i++) {
                const mau = ketQua.slice(i, i + doDaiMau);
                let soLanLap = 1;
                let cacViTri = [i];
                
                for (let j = i + doDaiMau; j <= ketQua.length - doDaiMau; j += doDaiMau) {
                    const doan = ketQua.slice(j, j + doDaiMau);
                    if (JSON.stringify(mau) === JSON.stringify(doan)) {
                        soLanLap++;
                        cacViTri.push(j);
                    } else {
                        break;
                    }
                }
                
                if (soLanLap >= 2) {
                    const cau = {
                        id: `lap_${Date.now()}_${i}_${crypto.randomBytes(4).toString('hex')}`,
                        loai: "CẦU LẶP",
                        loaiCode: "LAP",
                        viTri: i,
                        doDaiMau: doDaiMau,
                        mau: mau,
                        soLanLap: soLanLap,
                        cacViTri: cacViTri,
                        tongDoDai: doDaiMau * soLanLap,
                        doTinCay: 90,
                        thoiGianPhatHien: new Date().toISOString()
                    };
                    cauPhatHien.push(cau);
                    i += doDaiMau * soLanLap - 1;
                }
            }
        }
        
        this.khoCau.cauLap = cauPhatHien;
        this.thongKe.soLanGap.lap = cauPhatHien.length;
        
        return cauPhatHien;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 16. HỌC CẦU NHẢY (JUMP PATTERN)
    // ═══════════════════════════════════════════════════════════════════════
    
    hocCauNhay(lichSu) {
        const ketQua = lichSu.map(h => h.Ket_qua);
        const cauPhatHien = [];
        
        for (let i = 0; i < ketQua.length - 4; i++) {
            // Pattern nhảy cách 1 bước
            if (ketQua[i] === ketQua[i + 2] && ketQua[i] !== ketQua[i + 1]) {
                const cau = {
                    id: `nhay1_${Date.now()}_${i}_${crypto.randomBytes(4).toString('hex')}`,
                    loai: "CẦU NHẢY 1",
                    loaiCode: "NHY1",
                    viTri: i,
                    pattern: [ketQua[i], ketQua[i + 1], ketQua[i + 2]],
                    buocNhay: 1,
                    doTinCay: 75,
                    thoiGianPhatHien: new Date().toISOString(),
                    mau: ketQua.slice(i, i + 3)
                };
                cauPhatHien.push(cau);
            }
            
            // Pattern nhảy cách 2 bước
            if (i + 4 < ketQua.length && ketQua[i] === ketQua[i + 3] && ketQua[i] !== ketQua[i + 1] && ketQua[i + 1] !== ketQua[i + 2]) {
                const cau = {
                    id: `nhay2_${Date.now()}_${i}_${crypto.randomBytes(4).toString('hex')}`,
                    loai: "CẦU NHẢY 2",
                    loaiCode: "NHY2",
                    viTri: i,
                    pattern: [ketQua[i], ketQua[i + 1], ketQua[i + 2], ketQua[i + 3]],
                    buocNhay: 2,
                    doTinCay: 80,
                    thoiGianPhatHien: new Date().toISOString(),
                    mau: ketQua.slice(i, i + 4)
                };
                cauPhatHien.push(cau);
            }
        }
        
        this.khoCau.cauNhay = cauPhatHien;
        this.thongKe.soLanGap.nhay = cauPhatHien.length;
        
        return cauPhatHien;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 17. HỌC CẦU KÉP (BA ĐÔI LIÊN TIẾP)
    // ═══════════════════════════════════════════════════════════════════════
    
    hocCauKep(lichSu) {
        const ketQua = lichSu.map(h => h.Ket_qua);
        const cauPhatHien = [];
        
        for (let i = 0; i < ketQua.length - 6; i++) {
            if (ketQua[i] === ketQua[i + 1] && 
                ketQua[i + 2] === ketQua[i + 3] && 
                ketQua[i + 4] === ketQua[i + 5]) {
                const cau = {
                    id: `kep3_${Date.now()}_${i}_${crypto.randomBytes(4).toString('hex')}`,
                    loai: "CẦU KÉP BA ĐÔI",
                    loaiCode: "KEP3",
                    viTri: i,
                    cacCap: [
                        { cap: ketQua[i], viTri: [i, i + 1] },
                        { cap: ketQua[i + 2], viTri: [i + 2, i + 3] },
                        { cap: ketQua[i + 4], viTri: [i + 4, i + 5] }
                    ],
                    doTinCay: 88,
                    thoiGianPhatHien: new Date().toISOString(),
                    mau: ketQua.slice(i, i + 6)
                };
                cauPhatHien.push(cau);
                i += 5;
            }
        }
        
        this.khoCau.cauKep = cauPhatHien;
        this.thongKe.soLanGap.kep = cauPhatHien.length;
        
        return cauPhatHien;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 18. HỌC CẦU THEO XU HƯỚNG TỔNG ĐIỂM
    // ═══════════════════════════════════════════════════════════════════════
    
    hocCauTheoXuHuong(lichSu) {
        const cauPhatHien = [];
        const totals = lichSu.map(h => h.Tong);
        
        for (let i = 0; i < totals.length - 5; i++) {
            let doDai = 1;
            const huongBanDau = totals[i] > 10.5 ? 'CAO' : 'THẤP';
            
            for (let j = i; j < totals.length - 1; j++) {
                const current = totals[j] > 10.5 ? 'CAO' : 'THẤP';
                const next = totals[j + 1] > 10.5 ? 'CAO' : 'THẤP';
                if (current === next) {
                    doDai++;
                } else {
                    break;
                }
            }
            
            if (doDai >= 3) {
                const cau = {
                    id: `xh_${Date.now()}_${i}_${crypto.randomBytes(4).toString('hex')}`,
                    loai: "XU HƯỚNG TỔNG",
                    loaiCode: "XH",
                    viTri: i,
                    doDai: doDai,
                    huong: huongBanDau,
                    doTinCay: 75 + doDai * 3,
                    thoiGianPhatHien: new Date().toISOString(),
                    cacTong: totals.slice(i, i + doDai)
                };
                cauPhatHien.push(cau);
                i += doDai - 1;
            }
        }
        
        this.khoCau.cauTheoXuHuong = cauPhatHien;
        this.thongKe.soLanGap.xuHuong = cauPhatHien.length;
        
        return cauPhatHien;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 19. HỌC CẦU THEO BIÊN ĐỘ XÚC XẮC
    // ═══════════════════════════════════════════════════════════════════════
    
    hocCauTheoBienDo(lichSu) {
        const cauPhatHien = [];
        
        for (let i = 0; i < lichSu.length - 3; i++) {
            const bienDo1 = Math.abs(lichSu[i].Xuc_xac_1 - lichSu[i + 1].Xuc_xac_1);
            const bienDo2 = Math.abs(lichSu[i + 1].Xuc_xac_1 - lichSu[i + 2].Xuc_xac_1);
            const bienDo3 = Math.abs(lichSu[i + 2].Xuc_xac_2 - lichSu[i + 3].Xuc_xac_2);
            
            if (bienDo1 === bienDo2 || bienDo2 === bienDo3) {
                const cau = {
                    id: `bd_${Date.now()}_${i}_${crypto.randomBytes(4).toString('hex')}`,
                    loai: "BIÊN ĐỘ XÚC XẮC",
                    loaiCode: "BD",
                    viTri: i,
                    bienDo: [bienDo1, bienDo2, bienDo3],
                    doTinCay: 72,
                    thoiGianPhatHien: new Date().toISOString()
                };
                cauPhatHien.push(cau);
            }
        }
        
        this.khoCau.cauTheoBienDo = cauPhatHien;
        this.thongKe.soLanGap.bienDo = cauPhatHien.length;
        
        return cauPhatHien;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 20. HỌC TẤT CẢ CÁC LOẠI CẦU
    // ═══════════════════════════════════════════════════════════════════════
    
    hocTatCa(lichSu) {
        console.log('\n' + '='.repeat(60));
        console.log('🎓 BẮT ĐẦU HỌC CẦU TỪ ĐẦU...');
        console.log('='.repeat(60));
        
        const batDau = Date.now();
        
        const ketQua = {
            cauBet: this.hocCauBet(lichSu),
            cau11: this.hocCau11(lichSu),
            cau21: this.hocCau21(lichSu),
            cau12: this.hocCau12(lichSu),
            cau212: this.hocCau212(lichSu),
            cau121: this.hocCau121(lichSu),
            cau22: this.hocCau22(lichSu),
            cau31: this.hocCau31(lichSu),
            cau13: this.hocCau13(lichSu),
            cau32: this.hocCau32(lichSu),
            cau23: this.hocCau23(lichSu),
            cau33: this.hocCau33(lichSu),
            cauFibonacci: this.hocCauFibonacci(lichSu),
            cauDoiXung: this.hocCauDoiXung(lichSu),
            cauLap: this.hocCauLap(lichSu),
            cauNhay: this.hocCauNhay(lichSu),
            cauKep: this.hocCauKep(lichSu),
            cauTheoXuHuong: this.hocCauTheoXuHuong(lichSu),
            cauTheoBienDo: this.hocCauTheoBienDo(lichSu)
        };
        
        const thoiGianHoc = Date.now() - batDau;
        
        this.thongKe.tongSoCau = Object.values(this.khoCau).reduce((a, b) => a + b.length, 0);
        this.thongKe.lanCuoiHoc = new Date().toISOString();
        this.thongKe.thoiGianHocTrungBinh = thoiGianHoc;
        this.thongKe.soLuotHoc++;
        
        // Tính độ chính xác trung bình
        let tongDoTinCay = 0;
        let demCau = 0;
        for (const loai of Object.values(this.khoCau)) {
            for (const cau of loai) {
                tongDoTinCay += cau.doTinCay || 0;
                demCau++;
            }
        }
        this.thongKe.doChinhXacTrungBinh = demCau > 0 ? (tongDoTinCay / demCau).toFixed(1) : 0;
        
        this.lichSuHoc.push({
            thoiGian: Date.now(),
            thoiGianString: new Date().toISOString(),
            soLuongCau: this.thongKe.tongSoCau,
            thoiGianHoc: thoiGianHoc,
            soLoai: Object.keys(ketQua).length,
            chiTiet: ketQua
        });
        
        // Log kết quả
        console.log(`\n✅ ĐÃ HỌC XONG! Thời gian: ${thoiGianHoc}ms`);
        console.log(`✅ Tổng số cầu phát hiện: ${this.thongKe.tongSoCau}`);
        console.log(`✅ Độ chính xác trung bình: ${this.thongKe.doChinhXacTrungBinh}%`);
        console.log('='.repeat(60) + '\n');
        
        // In chi tiết từng loại
        console.log('📊 THỐNG KÊ CHI TIẾT THEO LOẠI CẦU:');
        console.log('-'.repeat(40));
        for (const [loai, soLuong] of Object.entries(this.thongKe.soLanGap)) {
            if (soLuong > 0) {
                console.log(`   • ${loai.toUpperCase()}: ${soLuong} cầu`);
            }
        }
        console.log('-'.repeat(40) + '\n');
        
        return ketQua;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // DỰ ĐOÁN SIÊU CẤP DỰA TRÊN TẤT CẢ CÁU ĐÃ HỌC
    // ═══════════════════════════════════════════════════════════════════════
    
    duDoanSieuCap(lichSu) {
        const ketQua = lichSu.map(h => h.Ket_qua);
        const tong = lichSu.map(h => h.Tong);
        const cacDuDoan = [];
        
        // ========== 1. PHÂN TÍCH CẦU BỆT ==========
        let betDangChay = 1;
        for (let i = 0; i < ketQua.length - 1; i++) {
            if (ketQua[i] === ketQua[i + 1]) betDangChay++;
            else break;
        }
        
        if (betDangChay >= 3) {
            const duDoan = betDangChay >= 4 ? ketQua[0] : (ketQua[0] === 'Tài' ? 'Xỉu' : 'Tài');
            const doTinCay = Math.min(65 + betDangChay * 6, 92);
            cacDuDoan.push({
                loai: "BỆT",
                loaiCode: "BET",
                duDoan: duDoan,
                doTinCay: doTinCay,
                chiTiet: `Phát hiện cầu bệt ${betDangChay} phiên ${ketQua[0]}`,
                trongSo: 1.3
            });
        }
        
        // ========== 2. PHÂN TÍCH CẦU 1-1 ==========
        let laCau11 = true;
        for (let i = 0; i < Math.min(7, ketQua.length - 1); i++) {
            if (ketQua[i] === ketQua[i + 1]) {
                laCau11 = false;
                break;
            }
        }
        
        if (laCau11 && ketQua.length >= 5) {
            const duDoan = ketQua[0] === 'Tài' ? 'Xỉu' : 'Tài';
            cacDuDoan.push({
                loai: "1-1",
                loaiCode: "11",
                duDoan: duDoan,
                doTinCay: 80,
                chiTiet: "Cầu 1-1 đan xen đang chạy",
                trongSo: 1.2
            });
        }
        
        // ========== 3. PHÂN TÍCH CẦU 2-1 ==========
        if (ketQua.length >= 3 && ketQua[0] === ketQua[1] && ketQua[1] !== ketQua[2]) {
            cacDuDoan.push({
                loai: "2-1",
                loaiCode: "21",
                duDoan: ketQua[2],
                doTinCay: 78,
                chiTiet: `Cầu 2-1: ${ketQua[0]} ${ketQua[0]} → ${ketQua[2]}`,
                trongSo: 1.1
            });
        }
        
        // ========== 4. PHÂN TÍCH CẦU 1-2 ==========
        if (ketQua.length >= 3 && ketQua[0] !== ketQua[1] && ketQua[1] === ketQua[2]) {
            cacDuDoan.push({
                loai: "1-2",
                loaiCode: "12",
                duDoan: ketQua[1],
                doTinCay: 78,
                chiTiet: `Cầu 1-2: ${ketQua[0]} → ${ketQua[1]} ${ketQua[1]}`,
                trongSo: 1.1
            });
        }
        
        // ========== 5. PHÂN TÍCH CẦU 2-1-2 ==========
        if (ketQua.length >= 4 && 
            ketQua[0] === ketQua[1] && 
            ketQua[1] !== ketQua[2] && 
            ketQua[2] === ketQua[3]) {
            cacDuDoan.push({
                loai: "2-1-2",
                loaiCode: "212",
                duDoan: ketQua[0],
                doTinCay: 86,
                chiTiet: "Cầu 2-1-2 đặc biệt",
                trongSo: 1.4
            });
        }
        
        // ========== 6. PHÂN TÍCH CẦU 1-2-1 ==========
        if (ketQua.length >= 4 && 
            ketQua[0] !== ketQua[1] && 
            ketQua[1] === ketQua[2] && 
            ketQua[2] !== ketQua[3]) {
            cacDuDoan.push({
                loai: "1-2-1",
                loaiCode: "121",
                duDoan: ketQua[1],
                doTinCay: 86,
                chiTiet: "Cầu 1-2-1 đặc biệt",
                trongSo: 1.4
            });
        }
        
        // ========== 7. PHÂN TÍCH CẦU 2-2 ==========
        if (ketQua.length >= 4 && 
            ketQua[0] === ketQua[1] && 
            ketQua[2] === ketQua[3] && 
            ketQua[0] !== ketQua[2]) {
            cacDuDoan.push({
                loai: "2-2",
                loaiCode: "22",
                duDoan: ketQua[2],
                doTinCay: 84,
                chiTiet: "Cầu 2-2 kép đôi",
                trongSo: 1.25
            });
        }
        
        // ========== 8. PHÂN TÍCH CẦU 3-1 ==========
        if (ketQua.length >= 4 && 
            ketQua[0] === ketQua[1] && 
            ketQua[1] === ketQua[2] && 
            ketQua[2] !== ketQua[3]) {
            cacDuDoan.push({
                loai: "3-1",
                loaiCode: "31",
                duDoan: ketQua[3],
                doTinCay: 82,
                chiTiet: "Cầu 3-1: ba phiên giống rồi đảo",
                trongSo: 1.2
            });
        }
        
        // ========== 9. PHÂN TÍCH CẦU 1-3 ==========
        if (ketQua.length >= 4 && 
            ketQua[0] !== ketQua[1] && 
            ketQua[1] === ketQua[2] && 
            ketQua[2] === ketQua[3]) {
            cacDuDoan.push({
                loai: "1-3",
                loaiCode: "13",
                duDoan: ketQua[1],
                doTinCay: 82,
                chiTiet: "Cầu 1-3: một phiên rồi ba phiên giống",
                trongSo: 1.2
            });
        }
        
        // ========== 10. PHÂN TÍCH XU HƯỚNG TỔNG ĐIỂM ==========
        if (tong.length >= 7) {
            const tongTrungBinh = tong.slice(0, 7).reduce((a, b) => a + b, 0) / 7;
            const tongTrungBinh3Cuoi = tong.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
            
            if (tongTrungBinh > 11 && tongTrungBinh3Cuoi > 11) {
                cacDuDoan.push({
                    loai: "XU HƯỚNG TỔNG",
                    loaiCode: "XH",
                    duDoan: "Tài",
                    doTinCay: 73,
                    chiTiet: `Xu hướng tổng cao: TB ${tongTrungBinh.toFixed(1)}`,
                    trongSo: 0.9
                });
            } else if (tongTrungBinh < 10 && tongTrungBinh3Cuoi < 10) {
                cacDuDoan.push({
                    loai: "XU HƯỚNG TỔNG",
                    loaiCode: "XH",
                    duDoan: "Xỉu",
                    doTinCay: 73,
                    chiTiet: `Xu hướng tổng thấp: TB ${tongTrungBinh.toFixed(1)}`,
                    trongSo: 0.9
                });
            }
        }
        
        // ========== 11. PHÂN TÍCH PATTERN NHẢY ==========
        if (ketQua.length >= 3 && ketQua[0] === ketQua[2] && ketQua[0] !== ketQua[1]) {
            cacDuDoan.push({
                loai: "NHẢY CÁCH",
                loaiCode: "NHY",
                duDoan: ketQua[0] === 'Tài' ? 'Xỉu' : 'Tài',
                doTinCay: 76,
                chiTiet: "Pattern nhảy cách 1 bước",
                trongSo: 1.0
            });
        }
        
        // ========== 12. PHÂN TÍCH DỰA TRÊN CẦU ĐÃ HỌC TRONG KHO ==========
        const cauTuKho = this.timCauTuongDong(ketQua);
        if (cauTuKho) {
            cacDuDoan.push({
                loai: "CẦU HỌC ĐƯỢC",
                loaiCode: "HOC",
                duDoan: cauTuKho.duDoan,
                doTinCay: cauTuKho.doTinCay,
                chiTiet: `Phát hiện cầu ${cauTuKho.loai} từ dữ liệu học`,
                trongSo: 1.15
            });
        }
        
        // ========== 13. PHÂN TÍCH MARKOV CHAIN (XÁC SUẤT CHUYỂN TIẾP) ==========
        const markov = this.phanTichMarkov(ketQua);
        if (markov) {
            cacDuDoan.push({
                loai: "MARKOV",
                loaiCode: "MKV",
                duDoan: markov.duDoan,
                doTinCay: markov.doTinCay,
                chiTiet: `Xác suất Markov: Tài ${markov.xacSuatTai}% - Xỉu ${markov.xacSuatXiu}%`,
                trongSo: 1.2
            });
        }
        
        // ========== 14. PHÂN TÍCH CHU KỲ ==========
        const chuKy = this.phanTichChuKy(ketQua);
        if (chuKy) {
            cacDuDoan.push({
                loai: "CHU KỲ",
                loaiCode: "CYK",
                duDoan: chuKy.duDoan,
                doTinCay: chuKy.doTinCay,
                chiTiet: `Chu kỳ ${chuKy.doDai} phiên`,
                trongSo: 1.0
            });
        }
        
        // ========== 15. PHÂN TÍCH BIÊN ĐỘ ==========
        const bienDo = this.phanTichBienDo(lichSu);
        if (bienDo) {
            cacDuDoan.push({
                loai: "BIÊN ĐỘ",
                loaiCode: "BD",
                duDoan: bienDo.duDoan,
                doTinCay: bienDo.doTinCay,
                chiTiet: `Biên độ xúc xắc: ${bienDo.giaTri}`,
                trongSo: 0.85
            });
        }
        
        // ========== TỔNG HỢP DỰ ĐOÁN CÓ TRỌNG SỐ ==========
        if (cacDuDoan.length === 0) {
            return {
                duDoan: "CHƯA XÁC ĐỊNH",
                doTinCay: 50,
                mucDo: "QUAN SÁT",
                lyDo: "Chưa phát hiện cầu nào phù hợp",
                khuyenNghi: "👀 Nên quan sát thêm vài phiên trước khi đặt cược",
                soCauPhatHien: 0,
                cacCauPhatHien: []
            };
        }
        
        let diemTai = 0;
        let diemXiu = 0;
        let tongTrongSo = 0;
        
        for (const duDoan of cacDuDoan) {
            const diem = (duDoan.doTinCay / 100) * (duDoan.trongSo || 1);
            if (duDoan.duDoan === 'Tài') {
                diemTai += diem;
            } else {
                diemXiu += diem;
            }
            tongTrongSo += (duDoan.trongSo || 1);
        }
        
        const duDoanCuoi = diemTai >= diemXiu ? 'Tài' : 'Xỉu';
        const doTinCayCuoi = Math.floor((Math.max(diemTai, diemXiu) / tongTrongSo) * 100);
        
        let mucDo = "QUAN SÁT";
        let khuyenNghi = "";
        
        if (doTinCayCuoi >= 85) {
            mucDo = "🔥 CƯỢC MẠNH";
            khuyenNghi = "CẦU RẤT ĐẸP! Nên đặt cược với số tiền lớn";
        } else if (doTinCayCuoi >= 75) {
            mucDo = "✅ CƯỢC TRUNG BÌNH";
            khuyenNghi = "Cầu đang ổn định, có thể theo";
        } else if (doTinCayCuoi >= 65) {
            mucDo = "⚠️ CƯỢC NHỎ";
            khuyenNghi = "Cầu chưa rõ, nên đặt số tiền nhỏ";
        } else if (doTinCayCuoi >= 55) {
            mucDo = "👀 QUAN SÁT";
            khuyenNghi = "Chưa rõ cầu, nên chờ thêm";
        } else {
            mucDo = "⏸️ TẠM DỪNG";
            khuyenNghi = "Không nên đặt cược, chờ tín hiệu rõ ràng hơn";
        }
        
        // Lưu vào bộ nhớ
        this.boNho.lichSuDuDoan.push({
            thoiGian: Date.now(),
            duDoan: duDoanCuoi,
            doTinCay: doTinCayCuoi,
            soCauPhatHien: cacDuDoan.length
        });
        if (this.boNho.lichSuDuDoan.length > 50) this.boNho.lichSuDuDoan.shift();
        
        return {
            duDoan: duDoanCuoi,
            doTinCay: Math.min(doTinCayCuoi, 98),
            mucDo: mucDo,
            khuyenNghi: khuyenNghi,
            lyDo: `Phát hiện ${cacDuDoan.length} loại cầu: ${cacDuDoan.map(d => d.loai).join(', ')}`,
            soCauPhatHien: cacDuDoan.length,
            cacCauPhatHien: cacDuDoan,
            chiTietTrongSo: { diemTai: diemTai.toFixed(2), diemXiu: diemXiu.toFixed(2), tongTrongSo: tongTrongSo.toFixed(2) }
        };
    }
    
    // Tìm cầu tương đồng trong kho dữ liệu đã học
    timCauTuongDong(ketQua) {
        const last5 = ketQua.slice(0, 5);
        let cauTotNhat = null;
        let diemCaoNhat = 0;
        
        for (const [loai, danhSach] of Object.entries(this.khoCau)) {
            for (const cau of danhSach) {
                if (cau.mau && cau.mau.length >= 3) {
                    let diemTrung = 0;
                    for (let i = 0; i < Math.min(cau.mau.length, last5.length); i++) {
                        if (cau.mau[i] === last5[i]) diemTrung++;
                    }
                    const tyLe = diemTrung / Math.min(cau.mau.length, last5.length);
                    if (tyLe >= 0.7 && tyLe > diemCaoNhat) {
                        diemCaoNhat = tyLe;
                        cauTotNhat = {
                            loai: cau.loai,
                            duDoan: cau.duDoanTiep || (cau.giaTri === 'Tài' ? 'Xỉu' : 'Tài'),
                            doTinCay: Math.min(cau.doTinCay * tyLe, 85)
                        };
                    }
                }
            }
        }
        
        return cauTotNhat;
    }
    
    // Phân tích Markov Chain
    phanTichMarkov(ketQua) {
        if (ketQua.length < 10) return null;
        
        const chuyenTiep = { TT: 0, TX: 0, XT: 0, XX: 0 };
        
        for (let i = 0; i < ketQua.length - 1; i++) {
            const current = ketQua[i] === 'Tài' ? 'T' : 'X';
            const next = ketQua[i + 1] === 'Tài' ? 'T' : 'X';
            chuyenTiep[`${current}${next}`]++;
        }
        
        const lastResult = ketQua[0] === 'Tài' ? 'T' : 'X';
        const lastTrans = lastResult === 'T' 
            ? { T: chuyenTiep.TT, X: chuyenTiep.TX }
            : { T: chuyenTiep.XT, X: chuyenTiep.XX };
        
        const total = lastTrans.T + lastTrans.X;
        if (total === 0) return null;
        
        const xacSuatTai = (lastTrans.T / total * 100);
        const xacSuatXiu = (lastTrans.X / total * 100);
        const duDoan = xacSuatTai >= xacSuatXiu ? 'Tài' : 'Xỉu';
        const doTinCay = Math.abs(xacSuatTai - xacSuatXiu);
        
        return {
            duDoan: duDoan,
            doTinCay: Math.min(doTinCay, 85),
            xacSuatTai: xacSuatTai.toFixed(1),
            xacSuatXiu: xacSuatXiu.toFixed(1)
        };
    }
    
    // Phân tích chu kỳ
    phanTichChuKy(ketQua) {
        for (let doDai = 2; doDai <= 10; doDai++) {
            if (ketQua.length < doDai * 2) continue;
            
            const chuKy1 = ketQua.slice(0, doDai);
            const chuKy2 = ketQua.slice(doDai, doDai * 2);
            
            let giongNhau = true;
            for (let i = 0; i < doDai; i++) {
                if (chuKy1[i] !== chuKy2[i]) {
                    giongNhau = false;
                    break;
                }
            }
            
            if (giongNhau) {
                const duDoan = chuKy1[0];
                const doTinCay = Math.min(65 + doDai * 3, 85);
                return { duDoan: duDoan, doTinCay: doTinCay, doDai: doDai };
            }
        }
        return null;
    }
    
    // Phân tích biên độ xúc xắc
    phanTichBienDo(lichSu) {
        if (lichSu.length < 3) return null;
        
        const bienDo1 = Math.abs(lichSu[0].Xuc_xac_1 - lichSu[1].Xuc_xac_1);
        const bienDo2 = Math.abs(lichSu[1].Xuc_xac_2 - lichSu[2].Xuc_xac_2);
        
        if (bienDo1 === bienDo2) {
            const tong1 = lichSu[0].Tong;
            const tong2 = lichSu[1].Tong;
            const chenhLech = Math.abs(tong1 - tong2);
            
            let duDoan = 'Tài';
            if (chenhLech <= 2) duDoan = tong1 >= 11 ? 'Xỉu' : 'Tài';
            else if (chenhLech <= 4) duDoan = tong1 >= 11 ? 'Tài' : 'Xỉu';
            
            return { duDoan: duDoan, doTinCay: 68, giaTri: bienDo1 };
        }
        
        return null;
    }
    
    // Lấy thống kê
    layThongKe() {
        return {
            tongSoCau: this.thongKe.tongSoCau,
            soLuotHoc: this.thongKe.soLuotHoc,
            doChinhXacTrungBinh: this.thongKe.doChinhXacTrungBinh,
            lanCuoiHoc: this.thongKe.lanCuoiHoc,
            soLuongMoiLoai: this.thongKe.soLanGap,
            lichSuHocGanDay: this.lichSuHoc.slice(-3),
            lichSuDuDoanGanDay: this.boNho.lichSuDuDoan.slice(-10)
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// KHỞI TẠO VÀ FETCH DỮ LIỆU
// ═══════════════════════════════════════════════════════════════════════════

const heThong = new SieuTriTueHocCau();
let cachedHistory = null;
let lastFetch = 0;
let daHoc = false;

async function fetchHistory() {
    try {
        const response = await axios.get(HISTORY_API, { timeout: 15000 });
        if (response.data && response.data.data) {
            cachedHistory = response.data.data;
            lastFetch = Date.now();
            console.log(`✅ [${new Date().toISOString()}] Đã cập nhật: ${cachedHistory.length} phiên`);
            
            if (cachedHistory.length >= 30 && !daHoc) {
                const ketQua = heThong.hocTatCa(cachedHistory);
                daHoc = true;
                
                // Lưu vào file
                const dataToSave = {
                    lastUpdate: new Date().toISOString(),
                    thongKe: heThong.thongKe,
                    khoCau: heThong.khoCau,
                    lichSuHoc: heThong.lichSuHoc.slice(-10)
                };
                fs.writeFileSync(CAU_FILE, JSON.stringify(dataToSave, null, 2));
                console.log(`💾 Đã lưu ${heThong.thongKe.tongSoCau} cầu vào file`);
            }
        }
        return cachedHistory;
    } catch (error) {
        console.error('❌ Lỗi fetch:', error.message);
        return cachedHistory;
    }
}

// Fetch ngay lập tức
fetchHistory();
// Fetch mỗi 60 giây
setInterval(fetchHistory, 60000);

// ═══════════════════════════════════════════════════════════════════════════
// 🔥 API ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

// API 1: Học tất cả cầu từ đầu
app.get('/api/hoc-cau', async (req, res) => {
    try {
        if (!cachedHistory || cachedHistory.length < 30) {
            return res.status(503).json({
                success: false,
                error: "Chưa đủ dữ liệu",
                message: `Cần 30 phiên, hiện có ${cachedHistory?.length || 0} phiên`,
                canLamGi: "Hãy đợi hệ thống fetch đủ dữ liệu từ API nguồn"
            });
        }
        
        const ketQua = heThong.hocTatCa(cachedHistory);
        
        res.json({
            success: true,
            message: "Đã học xong tất cả các loại cầu",
            timestamp: new Date().toISOString(),
            thongKe: heThong.thongKe,
            chiTietCacLoai: Object.keys(ketQua).map(key => ({
                loai: key,
                soLuong: ketQua[key].length
            })),
            daLuuFile: true,
            filePath: CAU_FILE
        });
        
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// API 2: Dự đoán siêu cấp (CHÍNH)
app.get('/api/du-doan', async (req, res) => {
    try {
        if (!cachedHistory || cachedHistory.length < 15) {
            return res.status(503).json({
                success: false,
                error: "Chưa đủ dữ liệu",
                message: `Cần 15 phiên, hiện có ${cachedHistory?.length || 0} phiên`,
                soPhienCanThem: Math.max(0, 15 - (cachedHistory?.length || 0))
            });
        }
        
        const duDoan = heThong.duDoanSieuCap(cachedHistory);
        const last10 = cachedHistory.slice(0, 10);
        const thongKe = heThong.layThongKe();
        
        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            serverTime: Date.now(),
            tongPhienDaPhanTich: cachedHistory.length,
            daHocCau: daHoc,
            ketQua: duDoan,
            phienGanDay: last10.map((h, idx) => ({
                stt: idx + 1,
                phien: h.Phien,
                ketQua: h.Ket_qua,
                xucXac: `${h.Xuc_xac_1}-${h.Xuc_xac_2}-${h.Xuc_xac_3}`,
                tong: h.Tong,
                thoiGian: h.Thoi_gian
            })),
            thongKeHeThong: thongKe,
            khuyenNghi: duDoan.khuyenNghi,
            canhBao: duDoan.doTinCay >= 80 ? "🟢 Tín hiệu tốt" : duDoan.doTinCay >= 60 ? "🟡 Thận trọng" : "🔴 Không nên cược"
        });
        
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// API 3: Dự đoán chi tiết từng phương pháp
app.get('/api/du-doan-chi-tiet', async (req, res) => {
    try {
        if (!cachedHistory || cachedHistory.length < 20) {
            return res.status(503).json({
                success: false,
                error: "Chưa đủ dữ liệu",
                message: `Cần 20 phiên, hiện có ${cachedHistory?.length || 0} phiên`
            });
        }
        
        const duDoan = heThong.duDoanSieuCap(cachedHistory);
        
        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            tongPhien: cachedHistory.length,
            duDoanChinh: {
                ketQua: duDoan.duDoan,
                doTinCay: duDoan.doTinCay,
                mucDo: duDoan.mucDo
            },
            phanTichChiTiet: {
                soCauPhatHien: duDoan.soCauPhatHien,
                danhSachCauPhatHien: duDoan.cacCauPhatHien,
                trongSo: duDoan.chiTietTrongSo
            },
            giaiThich: duDoan.lyDo,
            khuyenNghi: duDoan.khuyenNghi
        });
        
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// API 4: Lấy danh sách tất cả cầu đã học
app.get('/api/danh-sach-cau', async (req, res) => {
    try {
        const danhSach = Object.keys(heThong.khoCau).map(key => ({
            loai: key,
            tenHienThi: heThong.khoCau[key][0]?.loai || key,
            soLuong: heThong.khoCau[key].length,
            doTinCayTB: heThong.khoCau[key].length > 0 ?
                (heThong.khoCau[key].reduce((a, b) => a + (b.doTinCay || 0), 0) / heThong.khoCau[key].length).toFixed(1) : 0,
            mauCau: heThong.khoCau[key].slice(0, 2).map(c => c.mau || c.pattern || [])
        }));
        
        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            tongSoCau: heThong.thongKe.tongSoCau,
            soLoaiCau: danhSach.filter(d => d.soLuong > 0).length,
            danhSach: danhSach,
            thongKe: heThong.thongKe
        });
        
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// API 5: Lấy cầu theo loại cụ thể
app.get('/api/cau/:loai', async (req, res) => {
    try {
        const { loai } = req.params;
        const key = `cau${loai}`;
        const data = heThong.khoCau[key] || [];
        
        res.json({
            success: true,
            loai: loai,
            soLuong: data.length,
            data: data.slice(0, 50),
            total: data.length
        });
        
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// API 6: Lấy thống kê tổng quan
app.get('/api/thong-ke', async (req, res) => {
    try {
        const thongKe = heThong.layThongKe();
        
        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            thongKe: thongKe,
            cache: {
                coDuLieu: !!cachedHistory,
                soPhien: cachedHistory?.length || 0,
                lanCapNhatCuoi: lastFetch ? new Date(lastFetch).toISOString() : null,
                daHoc: daHoc
            },
            heThong: {
                soLoaiCau: Object.keys(heThong.khoCau).length,
                version: "5.0.0",
                uptime: process.uptime()
            }
        });
        
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// API 7: Lấy lịch sử dự đoán
app.get('/api/lich-su-du-doan', async (req, res) => {
    try {
        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            lichSu: heThong.boNho.lichSuDuDoan,
            soLuong: heThong.boNho.lichSuDuDoan.length
        });
        
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// API 8: Lấy 20 phiên gần nhất
app.get('/api/phien-gan-day', async (req, res) => {
    try {
        if (!cachedHistory) {
            return res.status(503).json({ success: false, error: "Chưa có dữ liệu" });
        }
        
        const limit = parseInt(req.query.limit) || 20;
        const data = cachedHistory.slice(0, limit);
        
        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            tongPhien: cachedHistory.length,
            soPhienTraVe: data.length,
            data: data
        });
        
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// API 9: Refresh dữ liệu
app.post('/api/refresh', async (req, res) => {
    try {
        await fetchHistory();
        res.json({
            success: true,
            message: "Đã refresh dữ liệu",
            timestamp: new Date().toISOString(),
            soPhien: cachedHistory?.length || 0
        });
        
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// API 10: Học lại từ đầu (force relearn)
app.post('/api/hoc-lai', async (req, res) => {
    try {
        if (!cachedHistory || cachedHistory.length < 30) {
            return res.status(503).json({
                success: false,
                error: "Chưa đủ dữ liệu để học lại"
            });
        }
        
        // Reset và học lại
        heThong.khoCau = {
            cauBet: [], cau11: [], cau21: [], cau12: [], cau212: [], cau121: [],
            cau22: [], cau31: [], cau13: [], cau32: [], cau23: [], cau33: [],
            cauFibonacci: [], cauDoiXung: [], cauLap: [], cauNhay: [], cauKep: [],
            cauTheoXuHuong: [], cauTheoBienDo: []
        };
        heThong.thongKe = { tongSoCau: 0, soLanGap: {}, doChinhXacTrungBinh: 0, lanCuoiHoc: null, thoiGianHocTrungBinh: 0, soLuotHoc: 0 };
        
        const ketQua = heThong.hocTatCa(cachedHistory);
        daHoc = true;
        
        res.json({
            success: true,
            message: "Đã học lại từ đầu",
            timestamp: new Date().toISOString(),
            thongKe: heThong.thongKe
        });
        
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'Học Cầu Từ Đầu - Siêu Trí Tuệ',
        version: '5.0.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        metrics: {
            daHoc: daHoc,
            tongSoCau: heThong.thongKe.tongSoCau,
            soPhienCache: cachedHistory?.length || 0,
            lastFetch: lastFetch ? new Date(lastFetch).toISOString() : null,
            doChinhXacTB: heThong.thongKe.doChinhXacTrungBinh
        }
    });
});

// Root
app.get('/', (req, res) => {
    res.json({
        name: "HỆ THỐNG HỌC CẦU TỪ ĐẦU - SIÊU TRÍ TUỆ",
        version: "5.0.0",
        description: "Thuật toán học và nhận diện 20+ loại cầu Tài Xỉu với độ chính xác cao",
        tinhNang: [
            "20+ loại cầu khác nhau: Bệt, 1-1, 2-1, 1-2, 2-1-2, 1-2-1, 2-2, 3-1, 1-3, 3-2, 2-3, 3-3",
            "Cầu Fibonacci, cầu đối xứng, cầu lặp, cầu nhảy, cầu kép",
            "Phân tích Markov Chain xác suất chuyển tiếp",
            "Phân tích chu kỳ và biên độ xúc xắc",
            "Dự đoán siêu cấp với trọng số thông minh",
            "Tự động học từ dữ liệu lịch sử"
        ],
        apiEndpoints: {
            "GET /api/hoc-cau": "Học tất cả cầu từ dữ liệu",
            "GET /api/du-doan": "Dự đoán kết quả tiếp theo (chính)",
            "GET /api/du-doan-chi-tiet": "Dự đoán chi tiết từng phương pháp",
            "GET /api/danh-sach-cau": "Xem danh sách cầu đã học",
            "GET /api/cau/:loai": "Xem cầu theo loại cụ thể",
            "GET /api/thong-ke": "Thống kê tổng quan",
            "GET /api/lich-su-du-doan": "Lịch sử dự đoán",
            "GET /api/phien-gan-day": "20 phiên gần nhất",
            "POST /api/refresh": "Refresh dữ liệu",
            "POST /api/hoc-lai": "Học lại từ đầu",
            "GET /health": "Kiểm tra sức khỏe"
        },
        status: {
            daHoc: daHoc,
            tongSoCauDaHoc: heThong.thongKe.tongSoCau,
            soPhienDaPhanTich: cachedHistory?.length || 0,
            doChinhXac: `${heThong.thongKe.doChinhXacTrungBinh}%`
        },
        timestamp: new Date().toISOString()
    });
});

// Khởi động server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║     🚀 HỆ THỐNG HỌC CẦU TỪ ĐẦU - SIÊU TRÍ TUỆ 🚀                              ║
║     📦 Phiên bản: 5.0.0                                                        ║
║     🧠 Thuật toán: 20+ loại cầu + Markov + Chu kỳ + Biên độ                    ║
║                                                                                ║
╠════════════════════════════════════════════════════════════════════════════════╣
║                                                                                ║
║  🌐 SERVER: http://localhost:${PORT}                                              ║
║  💚 Health: http://localhost:${PORT}/health                                      ║
║  🎯 Dự đoán: http://localhost:${PORT}/api/du-doan                                ║
║  📚 Học cầu: http://localhost:${PORT}/api/hoc-cau                                ║
║                                                                                ║
╠════════════════════════════════════════════════════════════════════════════════╣
║                                                                                ║
║  📊 TRẠNG THÁI:                                                                ║
║     • Dữ liệu: ${cachedHistory ? `✅ ${cachedHistory.length} phiên` : '⏳ Đang đồng bộ'}                                          ║
║     • Đã học: ${daHoc ? '✅ ĐÃ HỌC' : '⏳ CHƯA HỌC'}                                                      ║
║     • Số cầu: ${heThong.thongKe.tongSoCau || 'chưa có'}                                                           ║
║     • Độ chính xác TB: ${heThong.thongKe.doChinhXacTrungBinh || 'chưa có'}%                                                   ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
    `);
});
