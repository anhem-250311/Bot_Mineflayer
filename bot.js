const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Bot Mineflayer dang hoat dong!');
});

app.listen(port, () => {
  console.log(`Cong web dang mo tai port: ${port}`);
});

const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const GoalBlock = goals.GoalBlock;
const vec3 = require('vec3');

const config = {
    host: '163.5.201.10',         
    port: 14794,                  
    username: 'Bot_Mineflayer',   
    version: '1.21.11'            
};

function createBot() {
    console.log(`[${new Date().toLocaleTimeString()}] [BOT] Đang khởi tạo kết nối...`);

    const bot = mineflayer.createBot({
        host: config.host,
        port: config.port,
        username: config.username,
        version: config.version,
        auth: 'offline',
        viewDistance: 'tiny' 
    });

    bot.loadPlugin(pathfinder);

    let toadoGhim = null;        
    let xoayTronInterval = null; 
    let thoiGianChoTimeout = null; // Bộ đếm thời gian chống đơ cho bot
    let dangHanhDong = false;    // Biến kiểm soát trạng thái tránh trùng lệnh

    bot.once('spawn', () => {
        console.log(`\n🎉 [THÀNH CÔNG] Bot "${bot.username}" đã vào game!`);
        bot.physics.enabled = true; 

        const mcData = require('minecraft-data')(bot.version);
        const movements = new Movements(bot, mcData);
        movements.canDig = false; // Tuyệt đối không đập phá block
        bot.pathfinder.setMovements(movements);

        // GHIM TÂM CỐ ĐỊNH (Lấy vị trí đứng chính xác lúc vừa vào game)
        toadoGhim = bot.entity.position.clone();
        console.log(`📌 ĐÃ GHIM TÂM CỐ ĐỊNH TẠI: X: ${toadoGhim.x.toFixed(0)}, Y: ${toadoGhim.y.toFixed(0)}, Z: ${toadoGhim.z.toFixed(0)}`);
        
        // Đợi 2 giây cho thế giới game tải xong rồi bắt đầu đi luẩn quẩn
        setTimeout(batDauChuKyMoi, 2000);
    });

    function batDauChuKyMoi() {
        if (dangHanhDong) return;
        dangHanhDong = true;

        // Tắt trạng thái xoay tròn cũ để chuẩn bị đi
        if (xoayTronInterval) {
            clearInterval(xoayTronInterval);
            xoayTronInterval = null;
        }

        // Chọn vị trí ngẫu nhiên trong bán kính 5 block quanh tâm ghim
        const randomX = Math.floor(Math.random() * 11) - 5;
        const randomZ = Math.floor(Math.random() * 11) - 5;
        
        // Đảm bảo bot đi trên mặt phẳng bằng cách giữ nguyên độ cao Y
        const diemDen = new vec3(
            Math.floor(toadoGhim.x) + randomX, 
            Math.floor(toadoGhim.y), 
            Math.floor(toadoGhim.z) + randomZ
        );

        console.log(`📍 Bốc tọa độ mới: X: ${diemDen.x}, Z: ${diemDen.z}. Đang di chuyển tới...`);
        
        // Ép bot nhìn về hướng điểm đến trước khi đi
        bot.lookAt(diemDen);
        bot.pathfinder.setGoal(new GoalBlock(diemDen.x, diemDen.y, diemDen.z));

        // ⏱️ CƠ CHẾ CHỐNG ĐƠ: Nếu sau 1.5 giây bot lười không di chuyển hoặc kẹt đường, ép nó kích hoạt xoay luôn!
        if (thoiGianChoTimeout) clearTimeout(thoiGianChoTimeout);
        thoiGianChoTimeout = setTimeout(() => {
            if (dangHanhDong) {
                console.log(`⚠️ Đường đi khó hoặc trùng vị trí cũ, kích hoạt xoay tại chỗ luôn.`);
                bot.pathfinder.setGoal(null); // Hủy mục tiêu di chuyển cũ
                kichHoatXoayVaChoTiepTheo();
            }
        }, 1500);
    }

    // Sự kiện: Khi bot chạm chân được vào ô mục tiêu thành công
    bot.on('goal_reached', () => {
        if (!dangHanhDong) return;
        console.log(`➡️ Đã đến đích thành công!`);
        kichHoatXoayVaChoTiepTheo();
    });

    // Hàm xử lý xoay tròn 3 giây rồi nhảy chu kỳ mới
    function kichHoatXoayVaChoTiepTheo() {
        if (thoiGianChoTimeout) clearTimeout(thoiGianChoTimeout);

        // Kích hoạt xoay tròn tại chỗ mượt mà
        if (!xoayTronInterval) {
            let gocXoay = 0;
            xoayTronInterval = setInterval(() => {
                gocXoay += 0.4; 
                if (gocXoay > Math.PI * 2) gocXoay = 0;
                bot.look(gocXoay, 0, true); // Thực hiện xoay đầu liên tục
            }, 50);
        }

        // Đứng im xoay tròn đúng 3 giây, sau đó tắt trạng thái và tìm ô mới
        setTimeout(() => {
            dangHanhDong = false;
            batDauChuKyMoi();
        }, 3000);
    }

    // Tự động kết nối lại
    bot.on('end', (reason) => {
        console.log(`⏳ Mất kết nối do: ${reason}. Đang vào lại...`);
        if (xoayTronInterval) clearInterval(xoayTronInterval);
        if (thoiGianChoTimeout) clearTimeout(thoiGianChoTimeout);
        setTimeout(createBot, 5000); 
    });

    bot.on('error', (err) => {
        console.error(`⚠️ Lỗi: ${err.message}`);
    });
}

createBot();