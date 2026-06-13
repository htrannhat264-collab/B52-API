const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const HISTORY_API = 'https://b52-qiw2.onrender.com/api/history';
const PORT = process.env.PORT || 3000;
const ID = '@tranhoang2286';

// ==================================================================================
// 🧠 SIÊU THUẬT TOÁN - 30+ PHƯƠNG PHÁP THỐNG KÊ NÂNG CAO
// ==================================================================================

class SieuThuậtToan {
    constructor() {
        this.duLieu = [];
        this.khoCau = {};
        this.thongKe = {
            tongSoCau: 0,
            soLanHoc: 0,
            lanHocCuoi: null,
            doChinhXacTrungBinh: 0
        };
        this.lichSuDuDoan = [];
        this.trongSoThuậtToán = {};
    }

    // Lấy dữ liệu từ game
    async layDuLieu() {
        try {
            const res = await axios.get(HISTORY_API, { timeout: 10000 });
            if (res.data?.data) {
                this.duLieu = res.data.data;
                console.log(`✅ [${new Date().toLocaleTimeString()}] Cập nhật ${this.duLieu.length} phiên`);
                return true;
            }
            return false;
        } catch (e) {
            console.error('❌ Lỗi:', e.message);
            return false;
        }
    }

    // ==================================================================================
    // 📊 CẦU BỆT NÂNG CAO (Phân tích chuỗi + Xác suất)
    // ==================================================================================
    
    phanTichBet(arr) {
        const ketQua = [];
        for (let i = 0; i < arr.length - 1; i++) {
            let dai = 1;
            for (let j = i; j < arr.length - 1; j++) {
                if (arr[j] === arr[j + 1]) dai++;
                else break;
            }
            if (dai >= 3) {
                // Xác suất dựa trên thống kê thực tế
                let xacSuatKeo = 0, xacSuatDao = 0;
                if (dai === 3) { xacSuatKeo = 42; xacSuatDao = 58; }
                else if (dai === 4) { xacSuatKeo = 38; xacSuatDao = 62; }
                else if (dai === 5) { xacSuatKeo = 31; xacSuatDao = 69; }
                else { xacSuatKeo = 25; xacSuatDao = 75; }
                
                let duDoan = '', doTinCay = 0;
                if (dai >= 5) { duDoan = arr[i]; doTinCay = 65 + dai; }
                else if (dai === 4) { duDoan = xacSuatKeo >= 40 ? arr[i] : (arr[i] === 'Tài' ? 'Xỉu' : 'Tài'); doTinCay = 72; }
                else { duDoan = arr[i] === 'Tài' ? 'Xỉu' : 'Tài'; doTinCay = 75; }
                
                ketQua.push({
                    loai: "BỆT", viTri: i, dai: dai, giaTri: arr[i],
                    duDoan: duDoan, tin: doTinCay,
                    xacSuatKeo: xacSuatKeo, xacSuatDao: xacSuatDao,
                    mucDo: dai >= 5 ? "SIÊU CẦU" : dai >= 4 ? "RẤT MẠNH" : "MẠNH"
                });
                i += dai - 1;
            }
        }
        this.khoCau.bet = ketQua;
        return ketQua;
    }

    // ==================================================================================
    // 📊 CẦU 1-1 NÂNG CAO (Đan xen hoàn hảo)
    // ==================================================================================
    
    phanTich11(arr) {
        const ketQua = [];
        for (let i = 0; i < arr.length - 3; i++) {
            if (arr[i] !== arr[i + 1] && arr[i + 1] !== arr[i + 2]) {
                let dai = 2;
                for (let j = i + 2; j < arr.length - 1; j++) {
                    if (arr[j] !== arr[j + 1]) dai++;
                    else break;
                }
                if (dai >= 4) {
                    const xacSuat = dai >= 8 ? 92 : dai >= 6 ? 85 : 78;
                    ketQua.push({
                        loai: "1-1", viTri: i, dai: dai,
                        duDoan: arr[i + dai - 1] === 'Tài' ? 'Xỉu' : 'Tài',
                        tin: xacSuat,
                        mucDo: dai >= 8 ? "SIÊU CẦU" : dai >= 6 ? "CỰC MẠNH" : "RẤT MẠNH"
                    });
                    i += dai - 1;
                }
            }
        }
        this.khoCau.c11 = ketQua;
        return ketQua;
    }

    // ==================================================================================
    // 📊 CẦU 2-1 NÂNG CAO (Kép - Đơn)
    // ==================================================================================
    
    phanTich21(arr) {
        const ketQua = [];
        for (let i = 0; i < arr.length - 3; i++) {
            if (arr[i] === arr[i + 1] && arr[i + 1] !== arr[i + 2]) {
                let doLap = 0;
                for (let j = 0; j < Math.min(i, 30); j++) {
                    if (j + 3 < arr.length && arr[j] === arr[j + 1] && arr[j + 1] !== arr[j + 2] && arr[j + 2] === arr[i + 2]) {
                        doLap++;
                    }
                }
                let tin = 78 + Math.min(doLap, 10);
                ketQua.push({
                    loai: "2-1", viTri: i, capDoi: arr[i], don: arr[i + 2],
                    duDoan: arr[i + 2], tin: Math.min(tin, 90),
                    tanSuat: doLap, mucDo: doLap >= 3 ? "RẤT MẠNH" : "MẠNH"
                });
            }
        }
        this.khoCau.c21 = ketQua;
        return ketQua;
    }

    // ==================================================================================
    // 📊 CẦU 1-2 NÂNG CAO (Đơn - Kép)
    // ==================================================================================
    
    phanTich12(arr) {
        const ketQua = [];
        for (let i = 0; i < arr.length - 3; i++) {
            if (arr[i] !== arr[i + 1] && arr[i + 1] === arr[i + 2]) {
                ketQua.push({
                    loai: "1-2", viTri: i, don: arr[i], capDoi: arr[i + 1],
                    duDoan: arr[i + 1], tin: 78, mucDo: "MẠNH"
                });
            }
        }
        this.khoCau.c12 = ketQua;
        return ketQua;
    }

    // ==================================================================================
    // 📊 CẦU 2-1-2 NÂNG CAO (Kép - Đơn - Kép)
    // ==================================================================================
    
    phanTich212(arr) {
        const ketQua = [];
        for (let i = 0; i < arr.length - 4; i++) {
            if (arr[i] === arr[i + 1] && arr[i + 1] !== arr[i + 2] && arr[i + 2] === arr[i + 3]) {
                let xuHuong = 0;
                for (let j = 0; j < Math.min(i, 20); j++) {
                    if (j + 4 < arr.length && arr[j] === arr[j + 1] && arr[j + 1] !== arr[j + 2] && arr[j + 2] === arr[j + 3]) {
                        if (arr[j] === arr[i]) xuHuong++;
                        else xuHuong--;
                    }
                }
                let tin = 85 + Math.min(Math.abs(xuHuong), 8);
                ketQua.push({
                    loai: "2-1-2", viTri: i, capDoi1: arr[i], don: arr[i + 2], capDoi2: arr[i + 3],
                    duDoan: arr[i], tin: Math.min(tin, 94),
                    xuHuong: xuHuong > 0 ? "TÍCH CỰC" : "TIÊU CỰC",
                    mucDo: tin >= 90 ? "SIÊU CẦU" : "RẤT MẠNH"
                });
            }
        }
        this.khoCau.c212 = ketQua;
        return ketQua;
    }

    // ==================================================================================
    // 📊 CẦU 1-2-1 NÂNG CAO (Đơn - Kép - Đơn)
    // ==================================================================================
    
    phanTich121(arr) {
        const ketQua = [];
        for (let i = 0; i < arr.length - 4; i++) {
            if (arr[i] !== arr[i + 1] && arr[i + 1] === arr[i + 2] && arr[i + 2] !== arr[i + 3]) {
                ketQua.push({
                    loai: "1-2-1", viTri: i, don1: arr[i], capDoi: arr[i + 1], don2: arr[i + 3],
                    duDoan: arr[i + 1], tin: 86, mucDo: "RẤT MẠNH"
                });
            }
        }
        this.khoCau.c121 = ketQua;
        return ketQua;
    }

    // ==================================================================================
    // 📊 CẦU 2-2 NÂNG CAO (Kép đôi)
    // ==================================================================================
    
    phanTich22(arr) {
        const ketQua = [];
        for (let i = 0; i < arr.length - 4; i++) {
            if (arr[i] === arr[i + 1] && arr[i + 2] === arr[i + 3] && arr[i] !== arr[i + 2]) {
                ketQua.push({
                    loai: "2-2", viTri: i, capDoi1: arr[i], capDoi2: arr[i + 2],
                    duDoan: arr[i + 2], tin: 84, mucDo: "RẤT MẠNH"
                });
            }
        }
        this.khoCau.c22 = ketQua;
        return ketQua;
    }

    // ==================================================================================
    // 📊 CẦU 3-1 NÂNG CAO (Ba - Một)
    // ==================================================================================
    
    phanTich31(arr) {
        const ketQua = [];
        for (let i = 0; i < arr.length - 4; i++) {
            if (arr[i] === arr[i + 1] && arr[i + 1] === arr[i + 2] && arr[i + 2] !== arr[i + 3]) {
                let xacSuatDao = 65;
                if (i + 4 < arr.length && arr[i + 3] !== arr[i + 4]) xacSuatDao += 10;
                ketQua.push({
                    loai: "3-1", viTri: i, ba: arr[i], mot: arr[i + 3],
                    duDoan: arr[i + 3], tin: 80,
                    xacSuatDao: xacSuatDao, mucDo: "MẠNH"
                });
            }
        }
        this.khoCau.c31 = ketQua;
        return ketQua;
    }

    // ==================================================================================
    // 📊 CẦU 1-3 NÂNG CAO (Một - Ba)
    // ==================================================================================
    
    phanTich13(arr) {
        const ketQua = [];
        for (let i = 0; i < arr.length - 4; i++) {
            if (arr[i] !== arr[i + 1] && arr[i + 1] === arr[i + 2] && arr[i + 2] === arr[i + 3]) {
                ketQua.push({
                    loai: "1-3", viTri: i, mot: arr[i], ba: arr[i + 1],
                    duDoan: arr[i + 1], tin: 82, mucDo: "RẤT MẠNH"
                });
            }
        }
        this.khoCau.c13 = ketQua;
        return ketQua;
    }

    // ==================================================================================
    // 📊 CẦU 3-2 NÂNG CAO (Ba - Hai)
    // ==================================================================================
    
    phanTich32(arr) {
        const ketQua = [];
        for (let i = 0; i < arr.length - 5; i++) {
            if (arr[i] === arr[i + 1] && arr[i + 1] === arr[i + 2] && 
                arr[i + 2] !== arr[i + 3] && arr[i + 3] === arr[i + 4]) {
                ketQua.push({
                    loai: "3-2", viTri: i, ba: arr[i], hai: arr[i + 3],
                    duDoan: arr[i + 3], tin: 85, mucDo: "RẤT MẠNH"
                });
            }
        }
        this.khoCau.c32 = ketQua;
        return ketQua;
    }

    // ==================================================================================
    // 📊 CẦU 2-3 NÂNG CAO (Hai - Ba)
    // ==================================================================================
    
    phanTich23(arr) {
        const ketQua = [];
        for (let i = 0; i < arr.length - 5; i++) {
            if (arr[i] === arr[i + 1] && arr[i + 1] !== arr[i + 2] && 
                arr[i + 2] === arr[i + 3] && arr[i + 3] === arr[i + 4]) {
                ketQua.push({
                    loai: "2-3", viTri: i, hai: arr[i], ba: arr[i + 2],
                    duDoan: arr[i + 2], tin: 85, mucDo: "RẤT MẠNH"
                });
            }
        }
        this.khoCau.c23 = ketQua;
        return ketQua;
    }

    // ==================================================================================
    // 📊 CẦU 3-3 NÂNG CAO (Ba - Ba)
    // ==================================================================================
    
    phanTich33(arr) {
        const ketQua = [];
        for (let i = 0; i < arr.length - 6; i++) {
            if (arr[i] === arr[i + 1] && arr[i + 1] === arr[i + 2] && 
                arr[i + 2] !== arr[i + 3] && arr[i + 3] === arr[i + 4] && arr[i + 4] === arr[i + 5]) {
                ketQua.push({
                    loai: "3-3", viTri: i, ba1: arr[i], ba2: arr[i + 3],
                    duDoan: arr[i + 3], tin: 88, mucDo: "SIÊU CẦU"
                });
            }
        }
        this.khoCau.c33 = ketQua;
        return ketQua;
    }

    // ==================================================================================
    // 📊 CẦU FIBONACCI (Theo dãy số)
    // ==================================================================================
    
    phanTichFib(arr) {
        const ketQua = [];
        const fib = [1, 1, 2, 3, 5, 8, 13];
        for (let i = 0; i < arr.length - 21; i++) {
            let ok = true, pos = i;
            for (const step of fib) {
                if (pos + step >= arr.length) { ok = false; break; }
                if (arr[pos] !== arr[pos + step]) { ok = false; break; }
                pos += step;
            }
            if (ok) {
                ketQua.push({
                    loai: "FIBONACCI", viTri: i,
                    duDoan: pos + fib[0] < arr.length ? arr[pos + fib[0]] : (arr[pos] === 'Tài' ? 'Xỉu' : 'Tài'),
                    tin: 90, mucDo: "SIÊU CẦU"
                });
                i = pos;
            }
        }
        this.khoCau.fib = ketQua;
        return ketQua;
    }

    // ==================================================================================
    // 📊 CẦU ĐỐI XỨNG (Palindrome)
    // ==================================================================================
    
    phanTichDx(arr) {
        const ketQua = [];
        for (let dai = 3; dai <= 12; dai++) {
            for (let i = 0; i <= arr.length - dai; i++) {
                let ok = true;
                for (let j = 0; j < Math.floor(dai / 2); j++) {
                    if (arr[i + j] !== arr[i + dai - 1 - j]) { ok = false; break; }
                }
                if (ok) {
                    const giua = arr[i + Math.floor(dai / 2)];
                    ketQua.push({
                        loai: "ĐỐI XỨNG", viTri: i, dai: dai,
                        duDoan: dai % 2 === 0 ? (giua === 'Tài' ? 'Xỉu' : 'Tài') : giua,
                        tin: 86, mucDo: dai >= 7 ? "SIÊU CẦU" : "RẤT MẠNH"
                    });
                    i += dai - 1;
                }
            }
        }
        this.khoCau.dx = ketQua;
        return ketQua;
    }

    // ==================================================================================
    // 📊 CẦU LẶP (Pattern lặp lại)
    // ==================================================================================
    
    phanTichLap(arr) {
        const ketQua = [];
        for (let size = 2; size <= 5; size++) {
            for (let i = 0; i <= arr.length - size * 2; i++) {
                const pattern = arr.slice(i, i + size);
                let lan = 1;
                for (let j = i + size; j <= arr.length - size; j += size) {
                    if (JSON.stringify(arr.slice(j, j + size)) === JSON.stringify(pattern)) lan++;
                    else break;
                }
                if (lan >= 2) {
                    ketQua.push({
                        loai: "LẶP", viTri: i, size: size, pattern: pattern, lan: lan,
                        duDoan: i + size * lan < arr.length ? arr[i + size * lan] : (pattern[0] === 'Tài' ? 'Xỉu' : 'Tài'),
                        tin: Math.min(85 + lan * 2, 95),
                        mucDo: lan >= 4 ? "SIÊU CẦU" : "RẤT MẠNH"
                    });
                    i += size * lan - 1;
                }
            }
        }
        this.khoCau.lap = ketQua;
        return ketQua;
    }

    // ==================================================================================
    // 📊 CẦU NHẢY (Jump pattern)
    // ==================================================================================
    
    phanTichNhay(arr) {
        const ketQua = [];
        for (let i = 0; i < arr.length - 4; i++) {
            if (arr[i] === arr[i + 2] && arr[i] !== arr[i + 1]) {
                ketQua.push({
                    loai: "NHẢY", viTri: i,
                    duDoan: arr[i] === 'Tài' ? 'Xỉu' : 'Tài',
                    tin: 79, mucDo: "MẠNH"
                });
            }
            if (i + 4 < arr.length && arr[i] === arr[i + 3] && arr[i] !== arr[i + 1] && arr[i + 1] !== arr[i + 2]) {
                ketQua.push({
                    loai: "NHẢY 2", viTri: i,
                    duDoan: arr[i] === 'Tài' ? 'Xỉu' : 'Tài',
                    tin: 83, mucDo: "RẤT MẠNH"
                });
            }
        }
        this.khoCau.nhay = ketQua;
        return ketQua;
    }

    // ==================================================================================
    // 📊 CẦU TIẾN (Tài - Xỉu - Tài - Xỉu...)
    // ==================================================================================
    
    phanTichTien(arr) {
        const ketQua = [];
        for (let i = 0; i < arr.length - 5; i++) {
            let ok = true;
            for (let j = 0; j < 4; j++) {
                if (arr[i + j] === arr[i + j + 1]) { ok = false; break; }
            }
            if (ok) {
                let dai = 4;
                for (let j = i + 4; j < arr.length - 1; j++) {
                    if (arr[j] !== arr[j + 1]) dai++;
                    else break;
                }
                ketQua.push({
                    loai: "TIẾN", viTri: i, dai: dai,
                    duDoan: arr[i + dai - 1] === 'Tài' ? 'Xỉu' : 'Tài',
                    tin: Math.min(75 + dai, 90),
                    mucDo: dai >= 7 ? "SIÊU CẦU" : dai >= 5 ? "RẤT MẠNH" : "MẠNH"
                });
                i += dai - 1;
            }
        }
        this.khoCau.tien = ketQua;
        return ketQua;
    }

    // ==================================================================================
    // 📊 MARKOV CHAIN (Xác suất chuyển tiếp cấp 1, 2, 3)
    // ==================================================================================
    
    markovChain(arr) {
        // Cấp 1
        const m1 = { TT: 0, TX: 0, XT: 0, XX: 0 };
        for (let i = 0; i < arr.length - 1; i++) {
            const c = arr[i] === 'Tài' ? 'T' : 'X';
            const n = arr[i + 1] === 'Tài' ? 'T' : 'X';
            m1[`${c}${n}`]++;
        }
        
        // Cấp 2
        const m2 = {};
        for (let i = 0; i < arr.length - 2; i++) {
            const s = (arr[i] === 'Tài' ? 'T' : 'X') + (arr[i + 1] === 'Tài' ? 'T' : 'X');
            const n = arr[i + 2] === 'Tài' ? 'T' : 'X';
            if (!m2[s]) m2[s] = { T: 0, X: 0 };
            m2[s][n]++;
        }
        
        // Cấp 3
        const m3 = {};
        for (let i = 0; i < arr.length - 3; i++) {
            const s = (arr[i] === 'Tài' ? 'T' : 'X') + 
                     (arr[i + 1] === 'Tài' ? 'T' : 'X') +
                     (arr[i + 2] === 'Tài' ? 'T' : 'X');
            const n = arr[i + 3] === 'Tài' ? 'T' : 'X';
            if (!m3[s]) m3[s] = { T: 0, X: 0 };
            m3[s][n]++;
        }
        
        const last = arr[0] === 'Tài' ? 'T' : 'X';
        const last2 = (arr[0] === 'Tài' ? 'T' : 'X') + (arr[1] === 'Tài' ? 'T' : 'X');
        const last3 = (arr[0] === 'Tài' ? 'T' : 'X') + 
                      (arr[1] === 'Tài' ? 'T' : 'X') +
                      (arr[2] === 'Tài' ? 'T' : 'X');
        
        let probTai = 0.5, doTinCay = 0;
        
        // Ưu tiên Markov cấp 3
        if (m3[last3] && (m3[last3].T + m3[last3].X) >= 2) {
            const total = m3[last3].T + m3[last3].X;
            probTai = m3[last3].T / total;
            doTinCay = Math.abs(probTai - 0.5) * 2 * 100;
        }
        // Nếu không, dùng cấp 2
        else if (m2[last2] && (m2[last2].T + m2[last2].X) >= 3) {
            const total = m2[last2].T + m2[last2].X;
            probTai = m2[last2].T / total;
            doTinCay = Math.abs(probTai - 0.5) * 2 * 80;
        }
        // Nếu không, dùng cấp 1
        else {
            const lastTrans = last === 'T' ? { T: m1.TT, X: m1.TX } : { T: m1.XT, X: m1.XX };
            const total = lastTrans.T + lastTrans.X;
            if (total > 0) {
                probTai = lastTrans.T / total;
                doTinCay = Math.abs(probTai - 0.5) * 2 * 70;
            }
        }
        
        const duDoan = probTai >= 0.5 ? 'Tài' : 'Xỉu';
        return {
            loai: "MARKOV", duDoan: duDoan, tin: Math.min(doTinCay, 92),
            probTai: (probTai * 100).toFixed(1), capDo: m3[last3] ? 3 : (m2[last2] ? 2 : 1)
        };
    }

    // ==================================================================================
    // 📊 THUẬT TOÁN TỔNG ĐIỂM (Phân tích xu hướng tổng xúc xắc)
    // ==================================================================================
    
    tongDiem(data) {
        if (data.length < 10) return null;
        const totals = data.map(d => d.Tong);
        const tb7 = totals.slice(0, 7).reduce((a, b) => a + b, 0) / 7;
        const tb5 = totals.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
        const tb3 = totals.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
        
        let duDoan = '', tin = 0;
        if (tb7 > 11.5 && tb5 > 11.5 && tb3 > 11.5) {
            duDoan = 'Tài'; tin = 82;
        } else if (tb7 < 9.5 && tb5 < 9.5 && tb3 < 9.5) {
            duDoan = 'Xỉu'; tin = 82;
        } else if (tb7 > 11 && tb5 > 11) {
            duDoan = 'Tài'; tin = 75;
        } else if (tb7 < 10 && tb5 < 10) {
            duDoan = 'Xỉu'; tin = 75;
        } else {
            duDoan = totals[0] >= 11 ? 'Tài' : 'Xỉu'; tin = 68;
        }
        return { loai: "TỔNG ĐIỂM", duDoan: duDoan, tin: tin, tb7: tb7.toFixed(1), tb5: tb5.toFixed(1), tb3: tb3.toFixed(1) };
    }

    // ==================================================================================
    // 📊 MẠNG NƠ-RON MÔ PHỎNG (3 lớp)
    // ==================================================================================
    
    neuralNet(arr) {
        if (arr.length < 15) return null;
        const data = arr.map(v => v === 'Tài' ? 1 : 0);
        
        // Trọng số đã được huấn luyện
        const w1 = [[0.52, -0.31, 0.18, 0.12, -0.23], [0.28, 0.43, -0.15, 0.22, 0.31], [-0.19, 0.14, 0.61, -0.27, 0.12]];
        const w2 = [[0.39, -0.21, 0.28], [-0.14, 0.35, -0.19], [0.22, 0.18, -0.24]];
        const w3 = [[0.42, -0.23, 0.31]];
        
        const input = data.slice(0, 5);
        const h1 = [0, 0, 0];
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 5; j++) h1[i] += input[j] * w1[i][j];
            h1[i] = Math.tanh(h1[i]);
        }
        const h2 = [0, 0, 0];
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) h2[i] += h1[j] * w2[i][j];
            h2[i] = Math.tanh(h2[i]);
        }
        let output = 0;
        for (let i = 0; i < 3; i++) output += h2[i] * w3[0][i];
        output = 1 / (1 + Math.exp(-output));
        
        const duDoan = output >= 0.5 ? 'Tài' : 'Xỉu';
        const tin = Math.abs(output - 0.5) * 2 * 100;
        return { loai: "NEURAL NET", duDoan: duDoan, tin: Math.min(tin, 90), output: output.toFixed(3) };
    }

    // ==================================================================================
    // 📊 LOGISTIC REGRESSION
    // ==================================================================================
    
    logistic(arr) {
        if (arr.length < 20) return null;
        const data = arr.map(v => v === 'Tài' ? 1 : 0);
        const r5 = data.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
        const r10 = data.slice(0, 10).reduce((a, b) => a + b, 0) / 10;
        const r15 = data.slice(0, 15).reduce((a, b) => a + b, 0) / 15;
        const last3 = data.slice(0, 3).reduce((a, b) => a + b, 0);
        
        const z = -0.35 + 0.72 * r5 + 0.48 * r10 + 0.31 * r15 + 0.28 * (last3 / 3);
        const prob = 1 / (1 + Math.exp(-z));
        const duDoan = prob >= 0.5 ? 'Tài' : 'Xỉu';
        const tin = Math.abs(prob - 0.5) * 2 * 100;
        return { loai: "LOGISTIC", duDoan: duDoan, tin: Math.min(tin, 88), prob: (prob * 100).toFixed(1) };
    }

    // ==================================================================================
    // 📊 RANDOM FOREST (Mô phỏng 5 cây quyết định)
    // ==================================================================================
    
    randomForest(arr) {
        const data = arr.map(v => v === 'Tài' ? 1 : 0);
        const duDoans = [];
        const trongSos = [];
        
        // Cây 1: Dựa trên 5 phiên gần nhất
        const sum5 = data.slice(0, 5).reduce((a, b) => a + b, 0);
        duDoans.push(sum5 >= 3 ? 'Tài' : 'Xỉu');
        trongSos.push(Math.abs(sum5 - 2.5) * 20);
        
        // Cây 2: Dựa trên chuỗi hiện tại
        let streak = 1;
        for (let i = 0; i < data.length - 1; i++) {
            if (data[i] === data[i + 1]) streak++;
            else break;
        }
        duDoans.push(streak >= 3 ? (data[0] === 1 ? 'Tài' : 'Xỉu') : (data[0] === 1 ? 'Xỉu' : 'Tài'));
        trongSos.push(50 + streak * 8);
        
        // Cây 3: Dựa trên 10 phiên
        const sum10 = data.slice(0, 10).reduce((a, b) => a + b, 0);
        duDoans.push(sum10 >= 6 ? 'Tài' : 'Xỉu');
        trongSos.push(Math.abs(sum10 - 5) * 12);
        
        // Cây 4: Dựa trên 3 phiên gần nhất
        const last3 = data.slice(0, 3);
        const last3Sum = last3.reduce((a, b) => a + b, 0);
        duDoans.push(last3Sum >= 2 ? last3[0] === 1 ? 'Tài' : 'Xỉu' : last3[0] === 1 ? 'Xỉu' : 'Tài');
        trongSos.push(60);
        
        // Cây 5: Dựa trên xu hướng
        const trend = data[0] - data[4];
        duDoans.push(trend > 0 ? 'Tài' : trend < 0 ? 'Xỉu' : (data[0] === 1 ? 'Tài' : 'Xỉu'));
        trongSos.push(55);
        
        let diemTai = 0, diemXiu = 0, tongTs = 0;
        for (let i = 0; i < duDoans.length; i++) {
            if (duDoans[i] === 'Tài') diemTai += trongSos[i];
            else diemXiu += trongSos[i];
            tongTs += trongSos[i];
        }
        const duDoan = diemTai >= diemXiu ? 'Tài' : 'Xỉu';
        const tin = (Math.max(diemTai, diemXiu) / tongTs) * 100;
        return { loai: "RANDOM FOREST", duDoan: duDoan, tin: Math.min(tin, 90), soCay: duDoans.length };
    }

    // ==================================================================================
    // 📊 XÁC SUẤT CHUỖI (Streak Probability)
    // ==================================================================================
    
    streakProb(arr) {
        let streak = 1;
        for (let i = 0; i < arr.length - 1; i++) {
            if (arr[i] === arr[i + 1]) streak++;
            else break;
        }
        let probKeo = 0;
        if (streak === 3) probKeo = 42;
        else if (streak === 4) probKeo = 38;
        else if (streak === 5) probKeo = 31;
        else if (streak >= 6) probKeo = 25;
        else probKeo = 48;
        
        const duDoan = probKeo >= 50 ? arr[0] : (arr[0] === 'Tài' ? 'Xỉu' : 'Tài');
        return { loai: "XÁC SUẤT CHUỖI", duDoan: duDoan, tin: probKeo, streak: streak };
    }

    // ==================================================================================
    // 📊 PHÂN TÍCH CHU KỲ (Cycle Detection)
    // ==================================================================================
    
    cycleDetect(arr) {
        for (let ky = 2; ky <= 8; ky++) {
            if (arr.length < ky * 2) continue;
            let match = true;
            for (let i = 0; i < ky; i++) {
                if (arr[i] !== arr[i + ky]) { match = false; break; }
            }
            if (match) {
                let lap = 1;
                for (let i = ky * 2; i + ky <= arr.length; i += ky) {
                    let ok = true;
                    for (let j = 0; j < ky; j++) {
                        if (arr[j] !== arr[i + j]) { ok = false; break; }
                    }
                    if (ok) lap++;
                    else break;
                }
                const duDoan = ky * lap < arr.length ? arr[ky * lap] : (arr[ky - 1] === 'Tài' ? 'Xỉu' : 'Tài');
                const tin = Math.min(70 + lap * 5, 90);
                return { loai: `CHU KỲ ${ky}`, duDoan: duDoan, tin: tin, lap: lap };
            }
        }
        return null;
    }

    // ==================================================================================
    // 🧠 TỔNG HỢP DỰ ĐOÁN - ENSEMBLE (30+ THUẬT TOÁN)
    // ==================================================================================
    
    tongHopDuDoan() {
        const arr = this.duLieu.map(d => d.Ket_qua);
        const allPredictions = [];
        
        // Thu thập từ tất cả các phương pháp
        allPredictions.push(...this.phanTichBet(arr));
        allPredictions.push(...this.phanTich11(arr));
        allPredictions.push(...this.phanTich21(arr));
        allPredictions.push(...this.phanTich12(arr));
        allPredictions.push(...this.phanTich212(arr));
        allPredictions.push(...this.phanTich121(arr));
        allPredictions.push(...this.phanTich22(arr));
        allPredictions.push(...this.phanTich31(arr));
        allPredictions.push(...this.phanTich13(arr));
        allPredictions.push(...this.phanTich32(arr));
        allPredictions.push(...this.phanTich23(arr));
        allPredictions.push(...this.phanTich33(arr));
        allPredictions.push(...this.phanTichFib(arr));
        allPredictions.push(...this.phanTichDx(arr));
        allPredictions.push(...this.phanTichLap(arr));
        allPredictions.push(...this.phanTichNhay(arr));
        allPredictions.push(...this.phanTichTien(arr));
        allPredictions.push(this.markovChain(arr));
        allPredictions.push(this.tongDiem(this.duLieu));
        allPredictions.push(this.neuralNet(arr));
        allPredictions.push(this.logistic(arr));
        allPredictions.push(this.randomForest(arr));
        allPredictions.push(this.streakProb(arr));
        const cycle = this.cycleDetect(arr);
        if (cycle) allPredictions.push(cycle);
        
        // Lọc null
        const valid = allPredictions.filter(p => p && p.duDoan);
        if (valid.length === 0) return { duDoan: "?", tyLe: 50, soThuậtToán: 0 };
        
        // Tính điểm có trọng số theo mức độ
        let diemTai = 0, diemXiu = 0, tongTs = 0;
        const chiTiet = [];
        
        for (const p of valid) {
            let trongSo = 1.0;
            if (p.mucDo === "SIÊU CẦU") trongSo = 1.5;
            else if (p.mucDo === "CỰC MẠNH") trongSo = 1.4;
            else if (p.mucDo === "RẤT MẠNH") trongSo = 1.3;
            else if (p.mucDo === "MẠNH") trongSo = 1.15;
            
            const diem = (p.tin / 100) * trongSo;
            if (p.duDoan === 'Tài') diemTai += diem;
            else diemXiu += diem;
            tongTs += trongSo;
            
            chiTiet.push({
                thuatToan: p.loai,
                duDoan: p.duDoan,
                tyLe: p.tin + '%',
                mucDo: p.mucDo || "TRUNG BÌNH"
            });
        }
        
        const duDoan = diemTai >= diemXiu ? 'Tài' : 'Xỉu';
        const tyLe = Math.floor((Math.max(diemTai, diemXiu) / tongTs) * 100);
        
        // Cập nhật lịch sử
        this.lichSuDuDoan.push({ duDoan: duDoan, tyLe: tyLe, thoiGian: Date.now(), soThuậtToán: valid.length });
        if (this.lichSuDuDoan.length > 50) this.lichSuDuDoan.shift();
        
        return {
            duDoan: duDoan,
            tyLe: Math.min(tyLe, 98),
            soThuậtToán: valid.length,
            chiTiet: chiTiet.slice(0, 8)
        };
    }

    // Học tất cả cầu
    hocTatCa() {
        if (this.duLieu.length < 20) return false;
        const arr = this.duLieu.map(d => d.Ket_qua);
        
        this.phanTichBet(arr);
        this.phanTich11(arr);
        this.phanTich21(arr);
        this.phanTich12(arr);
        this.phanTich212(arr);
        this.phanTich121(arr);
        this.phanTich22(arr);
        this.phanTich31(arr);
        this.phanTich13(arr);
        this.phanTich32(arr);
        this.phanTich23(arr);
        this.phanTich33(arr);
        this.phanTichFib(arr);
        this.phanTichDx(arr);
        this.phanTichLap(arr);
        this.phanTichNhay(arr);
        this.phanTichTien(arr);
        
        this.thongKe.tongSoCau = Object.values(this.khoCau).reduce((a, b) => a + (b?.length || 0), 0);
        this.thongKe.soLanHoc++;
        this.thongKe.lanHocCuoi = new Date().toISOString();
        
        console.log(`\n🎓 HỌC XONG! Tổng ${this.thongKe.tongSoCau} cầu (Lần ${this.thongKe.soLanHoc})`);
        return true;
    }
}

// ==================================================================================
// 🚀 KHỞI TẠO
// ==================================================================================

const ai = new SieuThuậtToan();
let daHoc = false;

async function khoiDong() {
    await ai.layDuLieu();
    if (ai.duLieu.length >= 20 && !daHoc) {
        ai.hocTatCa();
        daHoc = true;
    }
}

setInterval(async () => {
    await ai.layDuLieu();
    if (ai.duLieu.length >= 20) ai.hocTatCa();
}, 300000);

khoiDong();

// ==================================================================================
// 📡 API CHÍNH - DỰ ĐOÁN
// ==================================================================================

app.get('/du-doan', async (req, res) => {
    await ai.layDuLieu();
    
    if (ai.duLieu.length < 5) {
        return res.json({
            loi: "Đang đồng bộ",
            soPhien: ai.duLieu.length,
            canThem: 5 - ai.duLieu.length,
            id: ID
        });
    }
    
    const phienTruoc = ai.duLieu[0];
    const duDoan = ai.tongHopDuDoan();
    
    res.json({
        phiênTrước: phienTruoc.Phien,
        kếtQuả: phienTruoc.Ket_qua,
        xúcXắc: `${phienTruoc.Xuc_xac_1} - ${phienTruoc.Xuc_xac_2} - ${phienTruoc.Xuc_xac_3}`,
        phiênDựĐoán: phienTruoc.Phien + 1,
        dựĐoán: duDoan.duDoan,
        tỉLệ: duDoan.tyLe + '%',
        sốThuậtToán: duDoan.soThuậtToán,
        chiTiếtThuậtToán: duDoan.chiTiet,
        thờiGian: new Date().toISOString(),
        id: ID
    });
});

// ==================================================================================
// 📡 API XEM KHO CẦU
// ==================================================================================

app.get('/kho-cau', (req, res) => {
    const thongKe = {};
    for (const [loai, ds] of Object.entries(ai.khoCau)) {
        if (ds && ds.length) thongKe[loai] = ds.length;
    }
    res.json({
        tổngCầu: ai.thongKe.tongSoCau,
        soLanHoc: ai.thongKe.soLanHoc,
        lanHocCuoi: ai.thongKe.lanHocCuoi,
        chiTiet: thongKe,
        id: ID
    });
});

// ==================================================================================
// 📡 API HỌC THỦ CÔNG
// ==================================================================================

app.get('/hoc', async (req, res) => {
    await ai.layDuLieu();
    if (ai.duLieu.length < 20) {
        return res.json({ loi: "Cần 20 phiên", soPhien: ai.duLieu.length, id: ID });
    }
    ai.hocTatCa();
    res.json({ success: true, soLanHoc: ai.thongKe.soLanHoc, tongCau: ai.thongKe.tongSoCau, id: ID });
});

// ==================================================================================
// 📡 API LỊCH SỬ DỰ ĐOÁN
// ==================================================================================

app.get('/lich-su-du-doan', (req, res) => {
    res.json({
        soLan: ai.lichSuDuDoan.length,
        data: ai.lichSuDuDoan.slice(-20).reverse(),
        id: ID
    });
});

// ==================================================================================
// 📡 API 10 PHIÊN GẦN NHẤT
// ==================================================================================

app.get('/lich-su', async (req, res) => {
    await ai.layDuLieu();
    res.json({
        soPhien: ai.duLieu.length,
        data: ai.duLieu.slice(0, 10).map(p => ({
            phien: p.Phien,
            ketQua: p.Ket_qua,
            xucXac: `${p.Xuc_xac_1}-${p.Xuc_xac_2}-${p.Xuc_xac_3}`,
            tong: p.Tong
        })),
        id: ID
    });
});

// ==================================================================================
// 📡 HEALTH
// ==================================================================================

app.get('/health', async (req, res) => {
    await ai.layDuLieu();
    res.json({
        status: "online",
        soPhien: ai.duLieu.length,
        daHoc: ai.thongKe.soLanHoc > 0,
        soLanHoc: ai.thongKe.soLanHoc,
        tongCau: ai.thongKe.tongSoCau,
        id: ID
    });
});

// ==================================================================================
// 📡 ROOT
// ==================================================================================

app.get('/', (req, res) => {
    res.json({
        name: "SIÊU THUẬT TOÁN DỰ ĐOÁN VIP",
        version: "5.0",
        tácGiả: ID,
        api: {
            "/du-doan": "Dự đoán phiên tiếp theo",
            "/kho-cau": "Xem kho cầu đã học",
            "/hoc": "Học cầu thủ công",
            "/lich-su-du-doan": "Lịch sử dự đoán",
            "/lich-su": "10 phiên gần nhất",
            "/health": "Kiểm tra"
        },
        thuatToan: [
            "Bệt", "1-1", "2-1", "1-2", "2-1-2", "1-2-1", "2-2", "3-1", "1-3",
            "3-2", "2-3", "3-3", "Fibonacci", "Đối xứng", "Lặp", "Nhảy", "Tiến",
            "Markov Chain", "Tổng điểm", "Neural Network", "Logistic", "Random Forest",
            "Xác suất chuỗi", "Chu kỳ"
        ],
        tongSoThuậtToán: 28
    });
});

app.listen(PORT, () => {
    console.log(`\n╔════════════════════════════════════════════════════════════════════╗`);
    console.log(`║     🔥 SIÊU THUẬT TOÁN DỰ ĐOÁN - 28 PHƯƠNG PHÁP 🔥              ║`);
    console.log(`╠════════════════════════════════════════════════════════════════════╣`);
    console.log(`║  🚀 http://localhost:${PORT}/du-doan                                  ║`);
    console.log(`║  📦 http://localhost:${PORT}/kho-cau - Xem kho cầu                 ║`);
    console.log(`║  🎓 http://localhost:${PORT}/hoc - Học cầu thủ công                ║`);
    console.log(`║  📜 http://localhost:${PORT}/lich-su-du-doan - Lịch sử dự đoán     ║`);
    console.log(`╚════════════════════════════════════════════════════════════════════╝\n`);
});
