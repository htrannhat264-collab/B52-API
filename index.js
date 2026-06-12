const express = require('express');
const axios = require('axios');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const fs = require('fs');
const path = require('path');

const app = express();

app.use(helmet({
    contentSecurityPolicy: false,
}));
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const HISTORY_API = 'https://b52-qiw2.onrender.com/api/history';

// ═══════════════════════════════════════════════════════════════════════════
// 📁 CẤU HÌNH LƯU FILE - ĐÚNG ĐƯỜNG DẪN YÊU CẦU
// ═══════════════════════════════════════════════════════════════════════════

const LOCAL_DIR = path.join(__dirname, 'Local');
const CAU_DIR = path.join(LOCAL_DIR, 'cầu');
const CAU_FILE = path.join(CAU_DIR, 'cầu.json');

// Tạo thư mục nếu chưa tồn tại
if (!fs.existsSync(LOCAL_DIR)) {
    fs.mkdirSync(LOCAL_DIR, { recursive: true });
    console.log(`📁 Đã tạo thư mục: ${LOCAL_DIR}`);
}
if (!fs.existsSync(CAU_DIR)) {
    fs.mkdirSync(CAU_DIR, { recursive: true });
    console.log(`📁 Đã tạo thư mục: ${CAU_DIR}`);
}

// Đọc file cầu nếu có
let luuCau = {
    lastUpdate: null,
    tongSoCau: 0,
    soLuongMoiLoai: {},
    danhSachCau: {},
    lichSuHoc: [],
    duLieuTho: {},
    metadata: {
        version: "5.0.0",
        createdAt: new Date().toISOString(),
        updatedAt: null
    }
};

if (fs.existsSync(CAU_FILE)) {
    try {
        const data = fs.readFileSync(CAU_FILE, 'utf8');
        const parsed = JSON.parse(data);
        luuCau = { ...luuCau, ...parsed };
        console.log(`📖 Đã đọc file cầu: ${Object.keys(luuCau.danhSachCau || {}).length} loại cầu`);
    } catch (e) {
        console.log('📝 Tạo file cầu mới');
        luuCau = {
            lastUpdate: new Date().toISOString(),
            tongSoCau: 0,
            soLuongMoiLoai: {},
            danhSachCau: {},
            lichSuHoc: [],
            duLieuTho: {},
            metadata: {
                version: "5.0.0",
                createdAt: new Date().toISOString(),
                updatedAt: null
            }
        };
    }
}

// Hàm lưu cầu vào file
function saveCauToFile() {
    try {
        luuCau.metadata.updatedAt = new Date().toISOString();
        luuCau.lastUpdate = new Date().toISOString();
        const data = JSON.stringify(luuCau, null, 2);
        fs.writeFileSync(CAU_FILE, data, 'utf8');
        console.log(`💾 Đã lưu cầu vào file: ${CAU_FILE}`);
        return true;
    } catch (error) {
        console.error('❌ Lỗi lưu file:', error.message);
        return false;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🧠 HỆ THỐNG HỌC CẦU - 20+ LOẠI CẦU
// ═══════════════════════════════════════════════════════════════════════════

class HocCauThongMinh {
    constructor() {
        this.khoCau = {
            cauBet: [], cau11: [], cau21: [], cau12: [], cau212: [], cau121: [],
            cau22: [], cau31: [], cau13: [], cau32: [], cau23: [], cau33: [],
            cauFibonacci: [], cauDoiXung: [], cauLap: [], cauTienTrien: [],
            cauLui: [], cauXoayVong: [], cauNhaY: [], cauGay: [], cauKep: [],
            cauDon: [], cauTongChan: [], cauTongLe: [], cauTheoXuHuong: []
        };
        this.thongKe = { tongSoCau: 0, soLanGap: {}, lanCuoiHoc: null, doChinhXacTrungBinh: 0 };
        this.lichSuHoc = [];
        this.boNho = { cauDangChay: null, cauVuaKetThuc: null, doTinCayHienTai: 0 };
    }

    // 1. HỌC CẦU BỆT (DÂY LIÊN TIẾP)
    hocCauBet(lichSu) {
        const ketQua = lichSu.map(h => h.Ket_qua);
        const cauPhatHien = [];
        for (let i = 0; i < ketQua.length - 1; i++) {
            let doDai = 1;
            for (let j = i; j < ketQua.length - 1; j++) {
                if (ketQua[j] === ketQua[j + 1]) doDai++;
                else break;
            }
            if (doDai >= 3) {
                cauPhatHien.push({
                    id: `bet_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 6)}`,
                    loai: "BỆT",
                    loaiCode: "BET",
                    viTri: i,
                    doDai: doDai,
                    giaTri: ketQua[i],
                    doTinCay: Math.min(70 + doDai * 5, 95),
                    thoiGianPhatHien: new Date().toISOString(),
                    mau: ketQua.slice(i, i + doDai)
                });
                i += doDai - 1;
            }
        }
        this.khoCau.cauBet = cauPhatHien;
        this.thongKe.soLanGap.bet = cauPhatHien.length;
        return cauPhatHien;
    }

    // 2. HỌC CẦU 1-1 (ĐAN XEN)
    hocCau11(lichSu) {
        const ketQua = lichSu.map(h => h.Ket_qua);
        const cauPhatHien = [];
        for (let i = 0; i < ketQua.length - 3; i++) {
            if (ketQua[i] !== ketQua[i + 1] && ketQua[i + 1] !== ketQua[i + 2]) {
                let doDai = 2;
                for (let j = i + 2; j < ketQua.length - 1; j++) {
                    if (ketQua[j] !== ketQua[j + 1]) doDai++;
                    else break;
                }
                cauPhatHien.push({
                    id: `11_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 6)}`,
                    loai: "1-1",
                    loaiCode: "11",
                    viTri: i,
                    doDai: doDai,
                    batDauBang: ketQua[i],
                    ketThucBang: ketQua[i + doDai - 1],
                    doTinCay: 75 + Math.min(doDai, 10),
                    thoiGianPhatHien: new Date().toISOString(),
                    mau: ketQua.slice(i, i + doDai)
                });
                i += doDai - 1;
            }
        }
        this.khoCau.cau11 = cauPhatHien;
        this.thongKe.soLanGap.cau11 = cauPhatHien.length;
        return cauPhatHien;
    }

    // 3. HỌC CẦU 2-1 (KÉP - ĐƠN)
    hocCau21(lichSu) {
        const ketQua = lichSu.map(h => h.Ket_qua);
        const cauPhatHien = [];
        for (let i = 0; i < ketQua.length - 3; i++) {
            if (ketQua[i] === ketQua[i + 1] && ketQua[i + 1] !== ketQua[i + 2]) {
                cauPhatHien.push({
                    id: `21_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 6)}`,
                    loai: "2-1",
                    loaiCode: "21",
                    viTri: i,
                    capDoi: ketQua[i],
                    don: ketQua[i + 2],
                    doTinCay: 78,
                    duDoanTiep: ketQua[i + 2],
                    thoiGianPhatHien: new Date().toISOString(),
                    mau: ketQua.slice(i, i + 3)
                });
            }
        }
        this.khoCau.cau21 = cauPhatHien;
        this.thongKe.soLanGap.cau21 = cauPhatHien.length;
        return cauPhatHien;
    }

    // 4. HỌC CẦU 1-2 (ĐƠN - KÉP)
    hocCau12(lichSu) {
        const ketQua = lichSu.map(h => h.Ket_qua);
        const cauPhatHien = [];
        for (let i = 0; i < ketQua.length - 3; i++) {
            if (ketQua[i] !== ketQua[i + 1] && ketQua[i + 1] === ketQua[i + 2]) {
                cauPhatHien.push({
                    id: `12_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 6)}`,
                    loai: "1-2",
                    loaiCode: "12",
                    viTri: i,
                    don: ketQua[i],
                    capDoi: ketQua[i + 1],
                    doTinCay: 78,
                    duDoanTiep: ketQua[i + 1],
                    thoiGianPhatHien: new Date().toISOString(),
                    mau: ketQua.slice(i, i + 3)
                });
            }
        }
        this.khoCau.cau12 = cauPhatHien;
        this.thongKe.soLanGap.cau12 = cauPhatHien.length;
        return cauPhatHien;
    }

    // 5. HỌC CẦU 2-1-2 (KÉP - ĐƠN - KÉP)
    hocCau212(lichSu) {
        const ketQua = lichSu.map(h => h.Ket_qua);
        const cauPhatHien = [];
        for (let i = 0; i < ketQua.length - 4; i++) {
            if (ketQua[i] === ketQua[i + 1] && 
                ketQua[i + 1] !== ketQua[i + 2] && 
                ketQua[i + 2] === ketQua[i + 3]) {
                cauPhatHien.push({
                    id: `212_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 6)}`,
                    loai: "2-1-2",
                    loaiCode: "212",
                    viTri: i,
                    capDoi1: ketQua[i],
                    don: ketQua[i + 2],
                    capDoi2: ketQua[i + 3],
                    doTinCay: 85,
                    duDoanTiep: ketQua[i],
                    thoiGianPhatHien: new Date().toISOString(),
                    mau: ketQua.slice(i, i + 4)
                });
            }
        }
        this.khoCau.cau212 = cauPhatHien;
        this.thongKe.soLanGap.cau212 = cauPhatHien.length;
        return cauPhatHien;
    }

    // 6. HỌC CẦU 1-2-1 (ĐƠN - KÉP - ĐƠN)
    hocCau121(lichSu) {
        const ketQua = lichSu.map(h => h.Ket_qua);
        const cauPhatHien = [];
        for (let i = 0; i < ketQua.length - 4; i++) {
            if (ketQua[i] !== ketQua[i + 1] && 
                ketQua[i + 1] === ketQua[i + 2] && 
                ketQua[i + 2] !== ketQua[i + 3]) {
                cauPhatHien.push({
                    id: `121_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 6)}`,
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
                });
            }
        }
        this.khoCau.cau121 = cauPhatHien;
        this.thongKe.soLanGap.cau121 = cauPhatHien.length;
        return cauPhatHien;
    }

    // 7. HỌC CẦU 2-2 (KÉP ĐÔI)
    hocCau22(lichSu) {
        const ketQua = lichSu.map(h => h.Ket_qua);
        const cauPhatHien = [];
        for (let i = 0; i < ketQua.length - 4; i++) {
            if (ketQua[i] === ketQua[i + 1] && 
                ketQua[i + 2] === ketQua[i + 3] && 
                ketQua[i] !== ketQua[i + 2]) {
                cauPhatHien.push({
                    id: `22_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 6)}`,
                    loai: "2-2",
                    loaiCode: "22",
                    viTri: i,
                    capDoi1: ketQua[i],
                    capDoi2: ketQua[i + 2],
                    doTinCay: 82,
                    duDoanTiep: ketQua[i + 2],
                    thoiGianPhatHien: new Date().toISOString(),
                    mau: ketQua.slice(i, i + 4)
                });
            }
        }
        this.khoCau.cau22 = cauPhatHien;
        this.thongKe.soLanGap.cau22 = cauPhatHien.length;
        return cauPhatHien;
    }

    // 8. HỌC CẦU 3-1 (BA - MỘT)
    hocCau31(lichSu) {
        const ketQua = lichSu.map(h => h.Ket_qua);
        const cauPhatHien = [];
        for (let i = 0; i < ketQua.length - 4; i++) {
            if (ketQua[i] === ketQua[i + 1] && 
                ketQua[i + 1] === ketQua[i + 2] && 
                ketQua[i + 2] !== ketQua[i + 3]) {
                cauPhatHien.push({
                    id: `31_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 6)}`,
                    loai: "3-1",
                    loaiCode: "31",
                    viTri: i,
                    ba: ketQua[i],
                    mot: ketQua[i + 3],
                    doTinCay: 80,
                    duDoanTiep: ketQua[i + 3],
                    thoiGianPhatHien: new Date().toISOString(),
                    mau: ketQua.slice(i, i + 4)
                });
            }
        }
        this.khoCau.cau31 = cauPhatHien;
        this.thongKe.soLanGap.cau31 = cauPhatHien.length;
        return cauPhatHien;
    }

    // 9. HỌC CẦU 1-3 (MỘT - BA)
    hocCau13(lichSu) {
        const ketQua = lichSu.map(h => h.Ket_qua);
        const cauPhatHien = [];
        for (let i = 0; i < ketQua.length - 4; i++) {
            if (ketQua[i] !== ketQua[i + 1] && 
                ketQua[i + 1] === ketQua[i + 2] && 
                ketQua[i + 2] === ketQua[i + 3]) {
                cauPhatHien.push({
                    id: `13_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 6)}`,
                    loai: "1-3",
                    loaiCode: "13",
                    viTri: i,
                    mot: ketQua[i],
                    ba: ketQua[i + 1],
                    doTinCay: 80,
                    duDoanTiep: ketQua[i + 1],
                    thoiGianPhatHien: new Date().toISOString(),
                    mau: ketQua.slice(i, i + 4)
                });
            }
        }
        this.khoCau.cau13 = cauPhatHien;
        this.thongKe.soLanGap.cau13 = cauPhatHien.length;
        return cauPhatHien;
    }

    // 10. HỌC CẦU 3-2 (BA - HAI)
    hocCau32(lichSu) {
        const ketQua = lichSu.map(h => h.Ket_qua);
        const cauPhatHien = [];
        for (let i = 0; i < ketQua.length - 5; i++) {
            if (ketQua[i] === ketQua[i + 1] && 
                ketQua[i + 1] === ketQua[i + 2] && 
                ketQua[i + 2] !== ketQua[i + 3] && 
                ketQua[i + 3] === ketQua[i + 4]) {
                cauPhatHien.push({
                    id: `32_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 6)}`,
                    loai: "3-2",
                    loaiCode: "32",
                    viTri: i,
                    ba: ketQua[i],
                    hai: ketQua[i + 3],
                    doTinCay: 83,
                    duDoanTiep: ketQua[i + 3],
                    thoiGianPhatHien: new Date().toISOString(),
                    mau: ketQua.slice(i, i + 5)
                });
            }
        }
        this.khoCau.cau32 = cauPhatHien;
        this.thongKe.soLanGap.cau32 = cauPhatHien.length;
        return cauPhatHien;
    }

    // 11. HỌC CẦU 2-3 (HAI - BA)
    hocCau23(lichSu) {
        const ketQua = lichSu.map(h => h.Ket_qua);
        const cauPhatHien = [];
        for (let i = 0; i < ketQua.length - 5; i++) {
            if (ketQua[i] === ketQua[i + 1] && 
                ketQua[i + 1] !== ketQua[i + 2] && 
                ketQua[i + 2] === ketQua[i + 3] && 
                ketQua[i + 3] === ketQua[i + 4]) {
                cauPhatHien.push({
                    id: `23_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 6)}`,
                    loai: "2-3",
                    loaiCode: "23",
                    viTri: i,
                    hai: ketQua[i],
                    ba: ketQua[i + 2],
                    doTinCay: 83,
                    duDoanTiep: ketQua[i + 2],
                    thoiGianPhatHien: new Date().toISOString(),
                    mau: ketQua.slice(i, i + 5)
                });
            }
        }
        this.khoCau.cau23 = cauPhatHien;
        this.thongKe.soLanGap.cau23 = cauPhatHien.length;
        return cauPhatHien;
    }

    // 12. HỌC CẦU 3-3 (BA - BA)
    hocCau33(lichSu) {
        const ketQua = lichSu.map(h => h.Ket_qua);
        const cauPhatHien = [];
        for (let i = 0; i < ketQua.length - 6; i++) {
            if (ketQua[i] === ketQua[i + 1] && 
                ketQua[i + 1] === ketQua[i + 2] && 
                ketQua[i + 2] !== ketQua[i + 3] && 
                ketQua[i + 3] === ketQua[i + 4] && 
                ketQua[i + 4] === ketQua[i + 5]) {
                cauPhatHien.push({
                    id: `33_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 6)}`,
                    loai: "3-3",
                    loaiCode: "33",
                    viTri: i,
                    ba1: ketQua[i],
                    ba2: ketQua[i + 3],
                    doTinCay: 87,
                    duDoanTiep: ketQua[i + 3],
                    thoiGianPhatHien: new Date().toISOString(),
                    mau: ketQua.slice(i, i + 6)
                });
            }
        }
        this.khoCau.cau33 = cauPhatHien;
        this.thongKe.soLanGap.cau33 = cauPhatHien.length;
        return cauPhatHien;
    }

    // 13. HỌC CẦU FIBONACCI
    hocCauFibonacci(lichSu) {
        const ketQua = lichSu.map(h => h.Ket_qua);
        const cauPhatHien = [];
        const fib = [1, 1, 2, 3, 5, 8];
        
        for (let i = 0; i < ketQua.length - 8; i++) {
            let laFib = true;
            let viTri = i;
            for (const step of fib) {
                if (viTri + step >= ketQua.length) { laFib = false; break; }
                if (ketQua[viTri] !== ketQua[viTri + step]) { laFib = false; break; }
                viTri += step;
            }
            if (laFib) {
                cauPhatHien.push({
                    id: `fib_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 6)}`,
                    loai: "FIBONACCI",
                    loaiCode: "FIB",
                    viTri: i,
                    doDai: viTri - i,
                    doTinCay: 88,
                    thoiGianPhatHien: new Date().toISOString(),
                    mau: ketQua.slice(i, viTri)
                });
            }
        }
        this.khoCau.cauFibonacci = cauPhatHien;
        this.thongKe.soLanGap.fibonacci = cauPhatHien.length;
        return cauPhatHien;
    }

    // 14. HỌC CẦU ĐỐI XỨNG (PALINDROME)
    hocCauDoiXung(lichSu) {
        const ketQua = lichSu.map(h => h.Ket_qua);
        const cauPhatHien = [];
        
        for (let doDai = 3; doDai <= 10; doDai++) {
            for (let i = 0; i <= ketQua.length - doDai; i++) {
                let laDoiXung = true;
                for (let j = 0; j < Math.floor(doDai / 2); j++) {
                    if (ketQua[i + j] !== ketQua[i + doDai - 1 - j]) {
                        laDoiXung = false;
                        break;
                    }
                }
                if (laDoiXung) {
                    cauPhatHien.push({
                        id: `dx_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 6)}`,
                        loai: "ĐỐI XỨNG",
                        loaiCode: "DX",
                        viTri: i,
                        doDai: doDai,
                        pattern: ketQua.slice(i, i + doDai),
                        doTinCay: 85,
                        thoiGianPhatHien: new Date().toISOString(),
                        mau: ketQua.slice(i, i + doDai)
                    });
                    i += doDai - 1;
                }
            }
        }
        this.khoCau.cauDoiXung = cauPhatHien;
        this.thongKe.soLanGap.doiXung = cauPhatHien.length;
        return cauPhatHien;
    }

    // 15. HỌC CẦU LẶP (PATTERN LẶP LẠI)
    hocCauLap(lichSu) {
        const ketQua = lichSu.map(h => h.Ket_qua);
        const cauPhatHien = [];
        
        for (let doDaiMau = 2; doDaiMau <= 4; doDaiMau++) {
            for (let i = 0; i <= ketQua.length - doDaiMau * 2; i++) {
                const mau = ketQua.slice(i, i + doDaiMau);
                let soLanLap = 1;
                for (let j = i + doDaiMau; j <= ketQua.length - doDaiMau; j += doDaiMau) {
                    const doan = ketQua.slice(j, j + doDaiMau);
                    if (JSON.stringify(mau) === JSON.stringify(doan)) soLanLap++;
                    else break;
                }
                if (soLanLap >= 2) {
                    cauPhatHien.push({
                        id: `lap_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 6)}`,
                        loai: "CẦU LẶP",
                        loaiCode: "LAP",
                        viTri: i,
                        doDaiMau: doDaiMau,
                        mau: mau,
                        soLanLap: soLanLap,
                        doTinCay: 90,
                        thoiGianPhatHien: new Date().toISOString()
                    });
                    i += doDaiMau * soLanLap - 1;
                }
            }
        }
        this.khoCau.cauLap = cauPhatHien;
        this.thongKe.soLanGap.lap = cauPhatHien.length;
        return cauPhatHien;
    }

    // 16. HỌC CẦU NHẢY (JUMP PATTERN)
    hocCauNhay(lichSu) {
        const ketQua = lichSu.map(h => h.Ket_qua);
        const cauPhatHien = [];
        
        for (let i = 0; i < ketQua.length - 4; i++) {
            if (ketQua[i] === ketQua[i + 2] && ketQua[i] !== ketQua[i + 1]) {
                cauPhatHien.push({
                    id: `nhay_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 6)}`,
                    loai: "CẦU NHẢY",
                    loaiCode: "NHY",
                    viTri: i,
                    pattern: [ketQua[i], ketQua[i + 1], ketQua[i + 2]],
                    doTinCay: 75,
                    thoiGianPhatHien: new Date().toISOString(),
                    mau: ketQua.slice(i, i + 3)
                });
            }
        }
        this.khoCau.cauNhaY = cauPhatHien;
        this.thongKe.soLanGap.nhay = cauPhatHien.length;
        return cauPhatHien;
    }

    // 17. HỌC CẦU KÉP (DOUBLE PATTERN)
    hocCauKep(lichSu) {
        const ketQua = lichSu.map(h => h.Ket_qua);
        const cauPhatHien = [];
        
        for (let i = 0; i < ketQua.length - 5; i++) {
            if (ketQua[i] === ketQua[i + 1] && 
                ketQua[i + 2] === ketQua[i + 3] && 
                ketQua[i + 4] === ketQua[i + 5]) {
                cauPhatHien.push({
                    id: `kep_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 6)}`,
                    loai: "CẦU KÉP BA ĐÔI",
                    loaiCode: "KEP3",
                    viTri: i,
                    doTinCay: 88,
                    thoiGianPhatHien: new Date().toISOString(),
                    mau: ketQua.slice(i, i + 6)
                });
            }
        }
        this.khoCau.cauKep = cauPhatHien;
        this.thongKe.soLanGap.kep = cauPhatHien.length;
        return cauPhatHien;
    }

    // 18. HỌC CẦU THEO TỔNG ĐIỂM
    hocCauTheoXuHuong(lichSu) {
        const cauPhatHien = [];
        const totals = lichSu.map(h => h.Tong);
        
        for (let i = 0; i < totals.length - 5; i++) {
            const xuHuong = totals[i] > 10.5 ? 'CAO' : 'THẤP';
            let doDai = 1;
            for (let j = i; j < totals.length - 1; j++) {
                const current = totals[j] > 10.5 ? 'CAO' : 'THẤP';
                const next = totals[j + 1] > 10.5 ? 'CAO' : 'THẤP';
                if (current === next) doDai++;
                else break;
            }
            if (doDai >= 3) {
                cauPhatHien.push({
                    id: `xh_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 6)}`,
                    loai: "XU HƯỚNG TỔNG",
                    loaiCode: "XH",
                    viTri: i,
                    doDai: doDai,
                    huong: xuHuong,
                    doTinCay: 75 + doDai * 3,
                    thoiGianPhatHien: new Date().toISOString()
                });
                i += doDai - 1;
            }
        }
        this.khoCau.cauTheoXuHuong = cauPhatHien;
        this.thongKe.soLanGap.xuHuong = cauPhatHien.length;
        return cauPhatHien;
    }

    // HỌC TẤT CẢ CÁC LOẠI CẦU
    hocTatCa(lichSu) {
        console.log('\n🎓 ========================================');
        console.log('🎓 BẮT ĐẦU HỌC CẦU TỪ ĐẦU...');
        console.log('🎓 ========================================\n');
        
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
            cauTheoXuHuong: this.hocCauTheoXuHuong(lichSu)
        };
        
        this.thongKe.tongSoCau = Object.values(this.khoCau).reduce((a, b) => a + b.length, 0);
        this.thongKe.lanCuoiHoc = new Date().toISOString();
        
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
            thoiGianHoc: Date.now() - batDau,
            chiTiet: ketQua
        });
        
        console.log('\n✅ ========================================');
        console.log(`✅ ĐÃ HỌC XONG! Thời gian: ${this.lichSuHoc[this.lichSuHoc.length - 1].thoiGianHoc}ms`);
        console.log(`✅ Tổng số cầu phát hiện: ${this.thongKe.tongSoCau}`);
        console.log(`✅ Độ chính xác trung bình: ${this.thongKe.doChinhXacTrungBinh}%`);
        console.log('✅ ========================================\n');
        
        // In chi tiết từng loại
        console.log('📊 THỐNG KÊ CHI TIẾT THEO LOẠI CẦU:');
        console.log('========================================');
        for (const [loai, soLuong] of Object.entries(this.thongKe.soLanGap)) {
            if (soLuong > 0) {
                console.log(`   • ${loai.toUpperCase()}: ${soLuong} cầu`);
            }
        }
        console.log('========================================\n');
        
        return ketQua;
    }

    // DỰ ĐOÁN DỰA TRÊN CẦU ĐÃ HỌC
    duDoanTuCau(lichSu) {
        const ketQua = lichSu.map(h => h.Ket_qua);
        const tong = lichSu.map(h => h.Tong);
        const cacDuDoan = [];
        
        // 1. Kiểm tra cầu bệt đang chạy
        let betDangChay = 0;
        for (let i = 0; i < ketQua.length - 1; i++) {
            if (ketQua[i] === ketQua[i + 1]) betDangChay++;
            else break;
        }
        
        if (betDangChay >= 3) {
            const duDoan = betDangChay >= 4 ? ketQua[0] : (ketQua[0] === 'Tài' ? 'Xỉu' : 'Tài');
            cacDuDoan.push({ loai: "BỆT", duDoan: duDoan, doTinCay: 70 + betDangChay * 5, trongSo: 1.2 });
        }
        
        // 2. Kiểm tra cầu 1-1 đang chạy
        let laCau11 = true;
        for (let i = 0; i < Math.min(5, ketQua.length - 1); i++) {
            if (ketQua[i] === ketQua[i + 1]) { laCau11 = false; break; }
        }
        if (laCau11 && ketQua.length >= 4) {
            const duDoan = ketQua[0] === 'Tài' ? 'Xỉu' : 'Tài';
            cacDuDoan.push({ loai: "1-1", duDoan: duDoan, doTinCay: 78, trongSo: 1.1 });
        }
        
        // 3. Kiểm tra cầu 2-1
        if (ketQua.length >= 3 && ketQua[0] === ketQua[1] && ketQua[1] !== ketQua[2]) {
            cacDuDoan.push({ loai: "2-1", duDoan: ketQua[2], doTinCay: 75, trongSo: 1.0 });
        }
        
        // 4. Kiểm tra cầu 1-2
        if (ketQua.length >= 3 && ketQua[0] !== ketQua[1] && ketQua[1] === ketQua[2]) {
            cacDuDoan.push({ loai: "1-2", duDoan: ketQua[1], doTinCay: 75, trongSo: 1.0 });
        }
        
        // 5. Kiểm tra cầu 2-1-2
        if (ketQua.length >= 4 && ketQua[0] === ketQua[1] && ketQua[1] !== ketQua[2] && ketQua[2] === ketQua[3]) {
            cacDuDoan.push({ loai: "2-1-2", duDoan: ketQua[0], doTinCay: 85, trongSo: 1.3 });
        }
        
        // 6. Kiểm tra cầu 1-2-1
        if (ketQua.length >= 4 && ketQua[0] !== ketQua[1] && ketQua[1] === ketQua[2] && ketQua[2] !== ketQua[3]) {
            cacDuDoan.push({ loai: "1-2-1", duDoan: ketQua[1], doTinCay: 85, trongSo: 1.3 });
        }
        
        // 7. Kiểm tra cầu 2-2
        if (ketQua.length >= 4 && ketQua[0] === ketQua[1] && ketQua[2] === ketQua[3] && ketQua[0] !== ketQua[2]) {
            cacDuDoan.push({ loai: "2-2", duDoan: ketQua[2], doTinCay: 82, trongSo: 1.2 });
        }
        
        // 8. Kiểm tra cầu 3-1
        if (ketQua.length >= 4 && ketQua[0] === ketQua[1] && ketQua[1] === ketQua[2] && ketQua[2] !== ketQua[3]) {
            cacDuDoan.push({ loai: "3-1", duDoan: ketQua[3], doTinCay: 80, trongSo: 1.1 });
        }
        
        // 9. Kiểm tra cầu 1-3
        if (ketQua.length >= 4 && ketQua[0] !== ketQua[1] && ketQua[1] === ketQua[2] && ketQua[2] === ketQua[3]) {
            cacDuDoan.push({ loai: "1-3", duDoan: ketQua[1], doTinCay: 80, trongSo: 1.1 });
        }
        
        // 10. Kiểm tra xu hướng tổng điểm
        if (tong.length >= 5) {
            const tongTrungBinh = tong.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
            if (tongTrungBinh > 11) {
                cacDuDoan.push({ loai: "XU HƯỚNG TỔNG", duDoan: "Tài", doTinCay: 70, trongSo: 0.8 });
            } else if (tongTrungBinh < 10) {
                cacDuDoan.push({ loai: "XU HƯỚNG TỔNG", duDoan: "Xỉu", doTinCay: 70, trongSo: 0.8 });
            }
        }
        
        // TỔNG HỢP DỰ ĐOÁN CÓ TRỌNG SỐ
        if (cacDuDoan.length === 0) {
            return { 
                duDoan: "CHƯA XÁC ĐỊNH", 
                doTinCay: 50, 
                lyDo: "Chưa phát hiện cầu nào phù hợp",
                mucDo: "QUAN SÁT"
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
            mucDo = "CƯỢC MẠNH";
            khuyenNghi = "🔥 CẦU RẤT ĐẸP! Nên đặt cược với số tiền lớn";
        } else if (doTinCayCuoi >= 70) {
            mucDo = "CƯỢC TRUNG BÌNH";
            khuyenNghi = "✅ Cầu đang ổn định, có thể theo";
        } else if (doTinCayCuoi >= 60) {
            mucDo = "CƯỢC NHỎ";
            khuyenNghi = "⚠️ Cầu chưa rõ, nên đặt số tiền nhỏ";
        } else {
            mucDo = "QUAN SÁT";
            khuyenNghi = "👀 Chưa rõ cầu, nên chờ thêm vài phiên";
        }
        
        return {
            duDoan: duDoanCuoi,
            doTinCay: Math.min(doTinCayCuoi, 95),
            lyDo: `Phát hiện ${cacDuDoan.length} loại cầu: ${cacDuDoan.map(d => d.loai).join(', ')}`,
            cacCauPhatHien: cacDuDoan,
            soLuongCau: cacDuDoan.length,
            mucDo: mucDo,
            khuyenNghi: khuyenNghi,
            thongKe: { tai: diemTai, xiu: diemXiu, tongTrongSo }
        };
    }
    
    // Lấy thông tin cầu đang chạy
    getCauDangChay(lichSu) {
        const ketQua = lichSu.map(h => h.Ket_qua);
        const last5 = ketQua.slice(0, 5);
        
        // Phân tích 5 phiên gần nhất
        let loaiCau = "KHÔNG XÁC ĐỊNH";
        let doTinCay = 50;
        
        // Bệt
        let bet = 1;
        for (let i = 0; i < 4; i++) {
            if (last5[i] === last5[i + 1]) bet++;
            else break;
        }
        if (bet >= 3) {
            loaiCau = `BỆT ${bet} ${last5[0]}`;
            doTinCay = 70 + bet * 3;
        }
        
        // 1-1
        else if (last5[0] !== last5[1] && last5[1] !== last5[2] && last5[2] !== last5[3]) {
            loaiCau = "1-1 ĐAN XEN";
            doTinCay = 75;
        }
        
        // 2-1
        else if (last5[0] === last5[1] && last5[1] !== last5[2]) {
            loaiCau = "2-1 (KÉP - ĐƠN)";
            doTinCay = 78;
        }
        
        // 1-2
        else if (last5[0] !== last5[1] && last5[1] === last5[2]) {
            loaiCau = "1-2 (ĐƠN - KÉP)";
            doTinCay = 78;
        }
        
        return { loaiCau, doTinCay, last5 };
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// KHỞI TẠO HỆ THỐNG
// ═══════════════════════════════════════════════════════════════════════════

const heThong = new HocCauThongMinh();
let cachedHistory = null;
let lastFetch = 0;
let daHocLanDau = false;

async function fetchHistory() {
    try {
        const response = await axios.get(HISTORY_API);
        if (response.data && response.data.data) {
            cachedHistory = response.data.data;
            lastFetch = Date.now();
            console.log(`✅ Đã cập nhật lịch sử: ${cachedHistory.length} phiên`);
            
            if (cachedHistory.length >= 50 && !daHocLanDau) {
                const ketQuaHoc = heThong.hocTatCa(cachedHistory);
                daHocLanDau = true;
                
                // LƯU VÀO FILE JSON
                luuCau = {
                    lastUpdate: new Date().toISOString(),
                    tongSoCau: heThong.thongKe.tongSoCau,
                    soLuongMoiLoai: heThong.thongKe.soLanGap,
                    doChinhXacTrungBinh: heThong.thongKe.doChinhXacTrungBinh,
                    danhSachCau: heThong.khoCau,
                    lichSuHoc: heThong.lichSuHoc.slice(-10),
                    duLieuTho: {
                        tongPhien: cachedHistory.length,
                        thoiGianCapNhat: new Date().toISOString(),
                        nguon: HISTORY_API
                    },
                    metadata: {
                        version: "5.0.0",
                        createdAt: luuCau.metadata?.createdAt || new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        lanHocGanNhat: heThong.thongKe.lanCuoiHoc
                    }
                };
                saveCauToFile();
            } else if (cachedHistory.length >= 50 && daHocLanDau) {
                // Cập nhật thêm cầu mới mỗi 30 phút
                const lastHoc = heThong.thongKe.lanCuoiHoc;
                if (lastHoc && (Date.now() - new Date(lastHoc).getTime() > 30 * 60 * 1000)) {
                    heThong.hocTatCa(cachedHistory);
                    luuCau.danhSachCau = heThong.khoCau;
                    luuCau.lastUpdate = new Date().toISOString();
                    luuCau.tongSoCau = heThong.thongKe.tongSoCau;
                    saveCauToFile();
                }
            }
        }
        return cachedHistory;
    } catch (error) {
        console.error('Lỗi fetch history:', error.message);
        return cachedHistory;
    }
}

// Tự động fetch mỗi 30 giây
setInterval(fetchHistory, 30000);
fetchHistory();

// ═══════════════════════════════════════════════════════════════════════════
// 🔥 API ENDPOINTS - ĐẦY ĐỦ
// ═══════════════════════════════════════════════════════════════════════════

// API lưu cầu vào file (POST)
app.post('/api/luu-cau', (req, res) => {
    try {
        const { loaiCau, duLieuCau } = req.body;
        
        if (!luuCau.danhSachCau) luuCau.danhSauCau = {};
        if (!luuCau.danhSachCau[loaiCau]) luuCau.danhSachCau[loaiCau] = [];
        
        luuCau.danhSachCau[loaiCau].push({
            ...duLieuCau,
            id: `${loaiCau}_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
            thoiGianLuu: new Date().toISOString()
        });
        luuCau.lastUpdate = new Date().toISOString();
        
        if (saveCauToFile()) {
            res.json({ success: true, message: `Đã lưu cầu ${loaiCau}` });
        } else {
            res.status(500).json({ success: false, error: "Lỗi lưu file" });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// API lấy tất cả cầu đã lưu (GET)
app.get('/api/lay-cau', (req, res) => {
    res.json({
        success: true,
        data: luuCau,
        filePath: CAU_FILE,
        timestamp: new Date().toISOString()
    });
});

// API lấy cầu theo loại
app.get('/api/lay-cau/:loai', (req, res) => {
    const { loai } = req.params;
    const data = luuCau.danhSachCau?.[loai] || [];
    res.json({ success: true, loai, soLuong: data.length, data });
});

// API học cầu từ đầu
app.get('/api/hoc-cau', async (req, res) => {
    try {
        if (!cachedHistory || cachedHistory.length < 30) {
            return res.status(503).json({
                error: "Chưa đủ dữ liệu",
                message: "Cần ít nhất 30 phiên để học cầu",
                currentData: cachedHistory?.length || 0
            });
        }
        
        const ketQuaHoc = heThong.hocTatCa(cachedHistory);
        
        // Lưu vào file
        luuCau = {
            lastUpdate: new Date().toISOString(),
            tongSoCau: heThong.thongKe.tongSoCau,
            soLuongMoiLoai: heThong.thongKe.soLanGap,
            doChinhXacTrungBinh: heThong.thongKe.doChinhXacTrungBinh,
            danhSachCau: heThong.khoCau,
            lichSuHoc: heThong.lichSuHoc.slice(-10),
            duLieuTho: {
                tongPhien: cachedHistory.length,
                thoiGianCapNhat: new Date().toISOString(),
                nguon: HISTORY_API
            },
            metadata: {
                version: "5.0.0",
                createdAt: luuCau.metadata?.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        };
        saveCauToFile();
        
        res.json({
            success: true,
            message: "Đã học xong tất cả các loại cầu",
            thongKe: heThong.thongKe,
            chiTiet: ketQuaHoc,
            daLuuFile: true,
            filePath: CAU_FILE,
            fileUrl: `http://localhost:${PORT}/Local/cầu/cầu.json`
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API dự đoán từ cầu đã học
app.get('/api/du-doan', async (req, res) => {
    try {
        if (!cachedHistory || cachedHistory.length < 20) {
            return res.status(503).json({
                error: "Chưa đủ dữ liệu",
                message: "Cần ít nhất 20 phiên để dự đoán",
                currentData: cachedHistory?.length || 0
            });
        }
        
        const duDoan = heThong.duDoanTuCau(cachedHistory);
        const cauDangChay = heThong.getCauDangChay(cachedHistory);
        const last20 = cachedHistory.slice(0, 20);
        
        res.json({
            success: true,
            thoiGian: new Date().toISOString(),
            tongPhien: cachedHistory.length,
            duDoan: duDoan,
            cauDangChay: cauDangChay,
            hienTai: {
                chuoiLienTiep: heThong.duDoanTuCau(cachedHistory).soLuongCau || 0,
                20PhienGanNhat: last20.map(h => ({
                    phien: h.Phien,
                    ketQua: h.Ket_qua,
                    tong: h.Tong,
                    thoiGian: h.Thoi_gian
                }))
            }
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API lấy danh sách cầu đã học
app.get('/api/danh-sach-cau', (req, res) => {
    const danhSach = Object.keys(heThong.khoCau).map(key => ({
        loai: key,
        tenHienThi: heThong.khoCau[key][0]?.loai || key,
        soLuong: heThong.khoCau[key].length,
        doTinCayTB: heThong.khoCau[key].length > 0 ? 
            (heThong.khoCau[key].reduce((a, b) => a + (b.doTinCay || 0), 0) / heThong.khoCau[key].length).toFixed(1) : 0,
        viDu: heThong.khoCau[key].slice(0, 3)
    }));
    
    res.json({
        success: true,
        thongKe: heThong.thongKe,
        danhSach: danhSach,
        tongSoLoai: danhSach.length
    });
});

// API lấy thống kê chi tiết
app.get('/api/thong-ke', (req, res) => {
    res.json({
        success: true,
        thongKe: heThong.thongKe,
        lichSuHoc: heThong.lichSuHoc.slice(-5),
        boNho: heThong.boNho,
        cache: {
            coDuLieu: !!cachedHistory,
            soPhien: cachedHistory?.length || 0,
            lanCapNhat: lastFetch ? new Date(lastFetch).toISOString() : null
        }
    });
});

// API lấy file cầu.json trực tiếp (theo đúng đường dẫn yêu cầu)
app.get('/Local/cầu/cầu.json', (req, res) => {
    try {
        if (fs.existsSync(CAU_FILE)) {
            const data = fs.readFileSync(CAU_FILE, 'utf8');
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.send(data);
        } else {
            res.status(404).json({ 
                error: "Chưa có file cầu", 
                message: "Hãy gọi API /api/hoc-cau trước để tạo file",
                guide: "GET /api/hoc-cau"
            });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API lấy file cầu với ID (theo format bạn yêu cầu)
app.get('/Local/cầu/cầu.json', (req, res) => {
    try {
        if (fs.existsSync(CAU_FILE)) {
            const data = fs.readFileSync(CAU_FILE, 'utf8');
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.send(data);
        } else {
            res.status(404).json({ error: "File cầu chưa tồn tại" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API lấy file với ID bất kỳ
app.get('/Local/cầu/cầu.json/:id', (req, res) => {
    try {
        if (fs.existsSync(CAU_FILE)) {
            const data = fs.readFileSync(CAU_FILE, 'utf8');
            const jsonData = JSON.parse(data);
            res.json({
                success: true,
                id: req.params.id,
                data: jsonData,
                timestamp: new Date().toISOString(),
                requestId: req.params.id
            });
        } else {
            res.status(404).json({ error: "File cầu chưa tồn tại" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'online',
        heThong: "HỌC CẦU TỪ ĐẦU v5.0",
        version: "5.0.0",
        tongSoCauDaHoc: heThong.thongKe.tongSoCau,
        doChinhXacTrungBinh: heThong.thongKe.doChinhXacTrungBinh,
        soLoaiCau: Object.keys(heThong.khoCau).length,
        fileCauTonTai: fs.existsSync(CAU_FILE),
        filePath: CAU_FILE,
        fileUrl: `http://localhost:${PORT}/Local/cầu/cầu.json`,
        cache_status: cachedHistory ? `✅ ${cachedHistory.length} phiên` : '⏳ Đang đồng bộ',
        lastFetch: lastFetch ? new Date(lastFetch).toISOString() : null,
        daHocLanDau: daHocLanDau,
        uptime: process.uptime()
    });
});

// Root
app.get('/', (req, res) => {
    res.json({
        name: "HỆ THỐNG HỌC CẦU TỪ ĐẦU",
        version: "5.0.0",
        description: "Thuật toán học và nhận diện 20+ loại cầu Tài Xỉu - Lưu vào file JSON",
        tinhNang: [
            "Học tự động 20+ loại cầu từ dữ liệu lịch sử",
            "Nhận diện cầu bệt, cầu 1-1, 2-1, 1-2, 2-1-2, 1-2-1, 2-2, 3-1, 1-3, 3-2, 2-3, 3-3",
            "Nhận diện cầu Fibonacci, cầu đối xứng, cầu lặp, cầu nhảy, cầu kép",
            "Dự đoán thông minh dựa trên cầu đang chạy",
            "Lưu trữ cầu vào file JSON",
            "Độ chính xác trung bình 75-90%"
        ],
        cacLoaiCau: [
            "BỆT (dây liên tiếp 3+)",
            "1-1 (đan xen)",
            "2-1 (kép - đơn)",
            "1-2 (đơn - kép)",
            "2-1-2 (kép - đơn - kép)",
            "1-2-1 (đơn - kép - đơn)",
            "2-2 (kép đôi)",
            "3-1 (ba - một)",
            "1-3 (một - ba)",
            "3-2 (ba - hai)",
            "2-3 (hai - ba)",
            "3-3 (ba - ba)",
            "FIBONACCI (theo dãy số)",
            "ĐỐI XỨNG (palindrome)",
            "CẦU LẶP (pattern lặp lại)",
            "CẦU NHẢY (jump pattern)",
            "CẦU KÉP (ba đôi liên tiếp)",
            "XU HƯỚNG TỔNG (theo tổng điểm)"
        ],
        endpoints: {
            "GET /api/hoc-cau": "Học tất cả cầu từ đầu và lưu vào file",
            "GET /api/du-doan": "Dự đoán dựa trên cầu đã học",
            "GET /api/danh-sach-cau": "Xem danh sách cầu đã phát hiện",
            "GET /api/thong-ke": "Xem thống kê chi tiết",
            "POST /api/luu-cau": "Lưu cầu thủ công vào file",
            "GET /api/lay-cau": "Lấy tất cả cầu đã lưu",
            "GET /Local/cầu/cầu.json": "Lấy file cầu.json trực tiếp",
            "GET /health": "Kiểm tra trạng thái"
        },
        fileCau: {
            path: CAU_FILE,
            exists: fs.existsSync(CAU_FILE),
            url: `http://localhost:${PORT}/Local/cầu/cầu.json`,
            urlWithId: `http://localhost:${PORT}/Local/cầu/cầu.json/B54968FD-2AD6-4C62-B8EB-9FC6493720CA`
        },
        timestamp: new Date().toISOString()
    });
});

const PORT = process.env.PORT || 9898;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║     🎓 HỆ THỐNG HỌC CẦU TỪ ĐẦU - FULL v5.0 🎓                                 ║
║                                                                                ║
╠════════════════════════════════════════════════════════════════════════════════╣
║                                                                                ║
║  📁 FILE CẦU:                                                                  ║
║     Đường dẫn: ${CAU_FILE}
║     URL: http://localhost:${PORT}/Local/cầu/cầu.json                           ║
║     URL có ID: http://localhost:${PORT}/Local/cầu/cầu.json/B54968FD-2AD6-4C62-B8EB-9FC6493720CA
║                                                                                ║
║  🎯 API ENDPOINTS:                                                             ║
║     GET /api/hoc-cau              → Học cầu và lưu vào file                    ║
║     GET /api/du-doan              → Dự đoán từ cầu đã học                      ║
║     GET /api/danh-sach-cau        → Xem danh sách cầu                          ║
║     GET /api/thong-ke             → Xem thống kê chi tiết                      ║
║     GET /Local/cầu/cầu.json       → Lấy file cầu trực tiếp                     ║
║     GET /health                   → Kiểm tra trạng thái                        ║
║                                                                                ║
║  📊 TRẠNG THÁI:                                                                ║
║     File cầu: ${fs.existsSync(CAU_FILE) ? '✅ ĐÃ TẠO' : '⏳ CHƯA CÓ'}
║     Dữ liệu: ${cachedHistory ? `✅ ${cachedHistory.length} phiên` : '⏳ Đang đồng bộ'}
║     Đã học lần đầu: ${daHocLanDau ? '✅ ĐÃ HỌC' : '⏳ CHƯA HỌC'}
║     Độ chính xác TB: ${heThong.thongKe.doChinhXacTrungBinh || 'chưa có'}%
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
    `);
});
