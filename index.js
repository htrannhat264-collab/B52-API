const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const HISTORY_API = 'https://b52-qiw2.onrender.com/api/history';
const PORT = process.env.PORT || 3000;

// ═══════════════════════════════════════════════════════════════════════════
// HỆ THỐNG HỌC CẦU - 15+ THUẬT TOÁN
// ═══════════════════════════════════════════════════════════════════════════

class HocCau {
    constructor() {
        this.cauBet = [];
        this.cau11 = [];
        this.cau21 = [];
        this.cau12 = [];
        this.cau212 = [];
        this.cau121 = [];
        this.cau22 = [];
        this.cau31 = [];
        this.cau13 = [];
        this.cau32 = [];
        this.cau23 = [];
        this.cau33 = [];
        this.cauFibonacci = [];
        this.cauDoiXung = [];
        this.cauLap = [];
        this.thongKe = { tong: 0 };
    }

    // Học cầu bệt
    hocBet(ketQua) {
        const cau = [];
        for (let i = 0; i < ketQua.length - 1; i++) {
            let dai = 1;
            for (let j = i; j < ketQua.length - 1; j++) {
                if (ketQua[j] === ketQua[j + 1]) dai++;
                else break;
            }
            if (dai >= 3) {
                cau.push({ viTri: i, dai: dai, giaTri: ketQua[i], doTinCay: 70 + dai * 5 });
                i += dai - 1;
            }
        }
        this.cauBet = cau;
        return cau;
    }

    // Học cầu 1-1
    hoc11(ketQua) {
        const cau = [];
        for (let i = 0; i < ketQua.length - 3; i++) {
            if (ketQua[i] !== ketQua[i + 1] && ketQua[i + 1] !== ketQua[i + 2]) {
                let dai = 2;
                for (let j = i + 2; j < ketQua.length - 1; j++) {
                    if (ketQua[j] !== ketQua[j + 1]) dai++;
                    else break;
                }
                cau.push({ viTri: i, dai: dai, doTinCay: 75 + Math.min(dai, 10) });
                i += dai - 1;
            }
        }
        this.cau11 = cau;
        return cau;
    }

    // Học cầu 2-1
    hoc21(ketQua) {
        const cau = [];
        for (let i = 0; i < ketQua.length - 3; i++) {
            if (ketQua[i] === ketQua[i + 1] && ketQua[i + 1] !== ketQua[i + 2]) {
                cau.push({ viTri: i, capDoi: ketQua[i], don: ketQua[i + 2], doTinCay: 78 });
            }
        }
        this.cau21 = cau;
        return cau;
    }

    // Học cầu 1-2
    hoc12(ketQua) {
        const cau = [];
        for (let i = 0; i < ketQua.length - 3; i++) {
            if (ketQua[i] !== ketQua[i + 1] && ketQua[i + 1] === ketQua[i + 2]) {
                cau.push({ viTri: i, don: ketQua[i], capDoi: ketQua[i + 1], doTinCay: 78 });
            }
        }
        this.cau12 = cau;
        return cau;
    }

    // Học cầu 2-1-2
    hoc212(ketQua) {
        const cau = [];
        for (let i = 0; i < ketQua.length - 4; i++) {
            if (ketQua[i] === ketQua[i + 1] && ketQua[i + 1] !== ketQua[i + 2] && ketQua[i + 2] === ketQua[i + 3]) {
                cau.push({ viTri: i, doTinCay: 85 });
            }
        }
        this.cau212 = cau;
        return cau;
    }

    // Học cầu 1-2-1
    hoc121(ketQua) {
        const cau = [];
        for (let i = 0; i < ketQua.length - 4; i++) {
            if (ketQua[i] !== ketQua[i + 1] && ketQua[i + 1] === ketQua[i + 2] && ketQua[i + 2] !== ketQua[i + 3]) {
                cau.push({ viTri: i, doTinCay: 85 });
            }
        }
        this.cau121 = cau;
        return cau;
    }

    // Học cầu 2-2
    hoc22(ketQua) {
        const cau = [];
        for (let i = 0; i < ketQua.length - 4; i++) {
            if (ketQua[i] === ketQua[i + 1] && ketQua[i + 2] === ketQua[i + 3] && ketQua[i] !== ketQua[i + 2]) {
                cau.push({ viTri: i, doTinCay: 82 });
            }
        }
        this.cau22 = cau;
        return cau;
    }

    // Học cầu 3-1
    hoc31(ketQua) {
        const cau = [];
        for (let i = 0; i < ketQua.length - 4; i++) {
            if (ketQua[i] === ketQua[i + 1] && ketQua[i + 1] === ketQua[i + 2] && ketQua[i + 2] !== ketQua[i + 3]) {
                cau.push({ viTri: i, ba: ketQua[i], mot: ketQua[i + 3], doTinCay: 80 });
            }
        }
        this.cau31 = cau;
        return cau;
    }

    // Học cầu 1-3
    hoc13(ketQua) {
        const cau = [];
        for (let i = 0; i < ketQua.length - 4; i++) {
            if (ketQua[i] !== ketQua[i + 1] && ketQua[i + 1] === ketQua[i + 2] && ketQua[i + 2] === ketQua[i + 3]) {
                cau.push({ viTri: i, mot: ketQua[i], ba: ketQua[i + 1], doTinCay: 80 });
            }
        }
        this.cau13 = cau;
        return cau;
    }

    // Học cầu Fibonacci
    hocFibonacci(ketQua) {
        const cau = [];
        const fib = [1, 1, 2, 3, 5, 8];
        for (let i = 0; i < ketQua.length - 13; i++) {
            let ok = true;
            let pos = i;
            for (const step of fib) {
                if (pos + step >= ketQua.length) { ok = false; break; }
                if (ketQua[pos] !== ketQua[pos + step]) { ok = false; break; }
                pos += step;
            }
            if (ok) cau.push({ viTri: i, doTinCay: 88 });
        }
        this.cauFibonacci = cau;
        return cau;
    }

    // Học cầu đối xứng
    hocDoiXung(ketQua) {
        const cau = [];
        for (let dai = 3; dai <= 10; dai++) {
            for (let i = 0; i <= ketQua.length - dai; i++) {
                let ok = true;
                for (let j = 0; j < Math.floor(dai / 2); j++) {
                    if (ketQua[i + j] !== ketQua[i + dai - 1 - j]) { ok = false; break; }
                }
                if (ok) cau.push({ viTri: i, dai: dai, doTinCay: 85 });
            }
        }
        this.cauDoiXung = cau;
        return cau;
    }

    // Học cầu lặp
    hocLap(ketQua) {
        const cau = [];
        for (let size = 2; size <= 4; size++) {
            for (let i = 0; i <= ketQua.length - size * 2; i++) {
                const mau = ketQua.slice(i, i + size);
                let lan = 1;
                for (let j = i + size; j <= ketQua.length - size; j += size) {
                    if (JSON.stringify(ketQua.slice(j, j + size)) === JSON.stringify(mau)) lan++;
                    else break;
                }
                if (lan >= 2) cau.push({ viTri: i, size: size, lan: lan, doTinCay: 90 });
            }
        }
        this.cauLap = cau;
        return cau;
    }

    // Học tất cả
    hocTatCa(lichSu) {
        const ketQua = lichSu.map(h => h.Ket_qua);
        
        console.log(`\n📚 HỌC CẦU - 10 phiên gần nhất:`);
        console.log(`   ${ketQua.slice(0, 10).join(' → ')}`);
        
        const bets = this.hocBet(ketQua);
        const c11 = this.hoc11(ketQua);
        const c21 = this.hoc21(ketQua);
        const c12 = this.hoc12(ketQua);
        const c212 = this.hoc212(ketQua);
        const c121 = this.hoc121(ketQua);
        const c22 = this.hoc22(ketQua);
        const c31 = this.hoc31(ketQua);
        const c13 = this.hoc13(ketQua);
        const fib = this.hocFibonacci(ketQua);
        const dx = this.hocDoiXung(ketQua);
        const lap = this.hocLap(ketQua);
        
        const tong = bets.length + c11.length + c21.length + c12.length + c212.length + 
                     c121.length + c22.length + c31.length + c13.length + fib.length + dx.length + lap.length;
        
        this.thongKe = { tong: tong, bet: bets.length, c11: c11.length, c21: c21.length, c12: c12.length, 
                         c212: c212.length, c121: c121.length, c22: c22.length, c31: c31.length, 
                         c13: c13.length, fib: fib.length, dx: dx.length, lap: lap.length };
        
        console.log(`   ✅ Phát hiện ${tong} cầu (Bet:${bets.length} | 1-1:${c11.length} | 2-1:${c21.length} | 1-2:${c12.length} | 2-1-2:${c212.length} | 1-2-1:${c121.length} | 2-2:${c22.length} | 3-1:${c31.length} | 1-3:${c13.length} | Fib:${fib.length} | DX:${dx.length} | Lap:${lap.length})`);
        
        return this.thongKe;
    }

    // Dự đoán
    duDoan(lichSu) {
        const ketQua = lichSu.map(h => h.Ket_qua);
        const tong = lichSu.map(h => h.Tong);
        const cacDuDoan = [];
        
        // Cầu bệt
        let betDangChay = 1;
        for (let i = 0; i < ketQua.length - 1; i++) {
            if (ketQua[i] === ketQua[i + 1]) betDangChay++;
            else break;
        }
        if (betDangChay >= 3) {
            const duDoan = betDangChay >= 4 ? ketQua[0] : (ketQua[0] === 'Tài' ? 'Xỉu' : 'Tài');
            cacDuDoan.push({ loai: "Bệt", duDoan: duDoan, tin: 70 + betDangChay * 5 });
        }
        
        // Cầu 1-1
        let la11 = true;
        for (let i = 0; i < Math.min(7, ketQua.length - 1); i++) {
            if (ketQua[i] === ketQua[i + 1]) { la11 = false; break; }
        }
        if (la11 && ketQua.length >= 5) {
            cacDuDoan.push({ loai: "1-1", duDoan: ketQua[0] === 'Tài' ? 'Xỉu' : 'Tài', tin: 80 });
        }
        
        // Cầu 2-1
        if (ketQua.length >= 3 && ketQua[0] === ketQua[1] && ketQua[1] !== ketQua[2]) {
            cacDuDoan.push({ loai: "2-1", duDoan: ketQua[2], tin: 78 });
        }
        
        // Cầu 1-2
        if (ketQua.length >= 3 && ketQua[0] !== ketQua[1] && ketQua[1] === ketQua[2]) {
            cacDuDoan.push({ loai: "1-2", duDoan: ketQua[1], tin: 78 });
        }
        
        // Cầu 2-1-2
        if (ketQua.length >= 4 && ketQua[0] === ketQua[1] && ketQua[1] !== ketQua[2] && ketQua[2] === ketQua[3]) {
            cacDuDoan.push({ loai: "2-1-2", duDoan: ketQua[0], tin: 86 });
        }
        
        // Cầu 1-2-1
        if (ketQua.length >= 4 && ketQua[0] !== ketQua[1] && ketQua[1] === ketQua[2] && ketQua[2] !== ketQua[3]) {
            cacDuDoan.push({ loai: "1-2-1", duDoan: ketQua[1], tin: 86 });
        }
        
        // Cầu 2-2
        if (ketQua.length >= 4 && ketQua[0] === ketQua[1] && ketQua[2] === ketQua[3] && ketQua[0] !== ketQua[2]) {
            cacDuDoan.push({ loai: "2-2", duDoan: ketQua[2], tin: 84 });
        }
        
        // Cầu 3-1
        if (ketQua.length >= 4 && ketQua[0] === ketQua[1] && ketQua[1] === ketQua[2] && ketQua[2] !== ketQua[3]) {
            cacDuDoan.push({ loai: "3-1", duDoan: ketQua[3], tin: 82 });
        }
        
        // Cầu 1-3
        if (ketQua.length >= 4 && ketQua[0] !== ketQua[1] && ketQua[1] === ketQua[2] && ketQua[2] === ketQua[3]) {
            cacDuDoan.push({ loai: "1-3", duDoan: ketQua[1], tin: 82 });
        }
        
        // Xu hướng tổng
        if (tong.length >= 7) {
            const tb = tong.slice(0, 7).reduce((a,b) => a+b, 0) / 7;
            if (tb > 11) cacDuDoan.push({ loai: "Tổng cao", duDoan: "Tài", tin: 73 });
            else if (tb < 10) cacDuDoan.push({ loai: "Tổng thấp", duDoan: "Xỉu", tin: 73 });
        }
        
        // Cầu nhảy
        if (ketQua.length >= 3 && ketQua[0] === ketQua[2] && ketQua[0] !== ketQua[1]) {
            cacDuDoan.push({ loai: "Nhảy", duDoan: ketQua[0] === 'Tài' ? 'Xỉu' : 'Tài', tin: 76 });
        }
        
        // Tổng hợp
        if (cacDuDoan.length === 0) {
            return { duDoan: "?", tin: 50, soCau: 0 };
        }
        
        let diemTai = 0, diemXiu = 0;
        for (const d of cacDuDoan) {
            if (d.duDoan === 'Tài') diemTai += d.tin;
            else diemXiu += d.tin;
        }
        
        const duDoan = diemTai >= diemXiu ? 'Tài' : 'Xỉu';
        const tin = Math.floor(Math.max(diemTai, diemXiu) / cacDuDoan.length);
        
        // Xuống dòng hiển thị cầu
        console.log(`\n📊 CÁC CẦU PHÁT HIỆN:`);
        for (const d of cacDuDoan) {
            console.log(`   → ${d.loai}: ${d.duDoan} (${d.tin}%)`);
        }
        console.log(`\n🎯 KẾT LUẬN: ${duDoan} | Độ tin cậy: ${tin}% | Dựa trên ${cacDuDoan.length} loại cầu\n`);
        
        return {
            duDoan: duDoan,
            tin: Math.min(tin, 95),
            soCau: cacDuDoan.length,
            dsCau: cacDuDoan
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// KHỞI TẠO
// ═══════════════════════════════════════════════════════════════════════════

const heThong = new HocCau();
let cache = null;
let daHoc = false;

async function fetchData() {
    try {
        const res = await axios.get(HISTORY_API, { timeout: 10000 });
        if (res.data && res.data.data) {
            cache = res.data.data;
            console.log(`✅ [${new Date().toLocaleTimeString()}] Cập nhật: ${cache.length} phiên`);
            
            if (cache.length >= 10 && !daHoc) {
                heThong.hocTatCa(cache);
                daHoc = true;
            }
        }
    } catch (e) {
        console.error('❌ Lỗi fetch:', e.message);
    }
}

fetchData();
setInterval(fetchData, 60000);

// ═══════════════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════════════

app.get('/du-doan', (req, res) => {
    if (!cache || cache.length < 10) {
        return res.json({ loi: "Đang đồng bộ", soPhien: cache?.length || 0 });
    }
    
    const kq = heThong.duDoan(cache);
    const last10 = cache.slice(0, 10).map(h => h.Ket_qua);
    
    res.json({
        status: "ok",
        thoiGian: new Date().toISOString(),
        duDoan: kq.duDoan,
        doTinCay: kq.tin,
        soCauPhatHien: kq.soCau,
        chiTietCau: kq.dsCau,
        lichSu10Phien: last10
    });
});

app.get('/hoc', (req, res) => {
    if (!cache || cache.length < 10) {
        return res.json({ loi: "Chưa đủ dữ liệu", soPhien: cache?.length || 0 });
    }
    const thongKe = heThong.hocTatCa(cache);
    res.json({ status: "ok", thongKe: thongKe });
});

app.get('/10phien', (req, res) => {
    if (!cache) return res.json({ loi: "Chưa có dữ liệu" });
    const data = cache.slice(0, 10).map(h => ({
        phien: h.Phien,
        ketQua: h.Ket_qua,
        tong: h.Tong
    }));
    res.json({ status: "ok", data: data });
});

app.get('/health', (req, res) => {
    res.json({
        status: "ok",
        daHoc: daHoc,
        soPhien: cache?.length || 0,
        soCau: heThong.thongKe.tong
    });
});

app.get('/', (req, res) => {
    res.json({
        api: "/du-doan - Dự đoán kết quả",
        api2: "/hoc - Học cầu từ đầu",
        api3: "/10phien - 10 phiên gần nhất",
        api4: "/health - Kiểm tra"
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 API chạy tại port ${PORT}`);
    console.log(`   /du-doan - Dự đoán\n`);
});
