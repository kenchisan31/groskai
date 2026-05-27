const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch'); 
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// 1. Danh sách API Keys (Mình đã xóa Key số 3 bị hỏng của bro)
// LƯU Ý: Nên dùng Key từ các GMAIL KHÁC NHAU để nhân sự Quota thực sự!
const API_KEYS = [
    "AIzaSyCUi2TGR_KGonIeM536MguK_i1QhB_Clmo", 
    "AIzaSyB7PunlJNp69hrMiW2P9a05JVxVOilebDQ",            
    "AIzaSyDxTWKYQuMxBIuOpct7ankE5sjt_4YezmM"            
];

let currentKeyIndex = 0; 
let chatContext = []; 

const today = new Date().toLocaleDateString('vi-VN', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
});

app.post('/api/chat', async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "Không có nội dung" });

    chatContext.push({ role: "user", parts: [{ text: prompt }] });
    if (chatContext.length > 12) chatContext.shift();

    let success = false;
    let attempts = 0;
    let finalAiText = "Hệ thống đang quá tải, bro thử lại sau vài giây nhé! 🔥";

    // VÒNG LẶP AUTO-RETRY: Thử lần lượt các Key cho đến khi thành công
    while (attempts < API_KEYS.length && !success) {
        const ACTIVE_KEY = API_KEYS[currentKeyIndex];
        console.log(`[Thử lần ${attempts + 1}] Đang dùng Key số: ${currentKeyIndex + 1}`);
        
        // Nhảy sang key tiếp theo cho lần chạy tới
        currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length; 
        attempts++;

        try {
            // ĐÃ ĐỔI SANG gemini-1.5-flash
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${ACTIVE_KEY}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    system_instruction: {
                        parts: [{ text: `Bạn là GroskAI - một AI vui tính. Hôm nay là ${today}.` }]
                    },
                    contents: chatContext
                })
            });

            const data = await response.json();

            // Nếu key này bị lỗi Quota hoặc Denied -> Bỏ qua, vòng lặp tự chạy Key tiếp theo
            if (data.error) {
                console.error(`=> Key lỗi: ${data.error.message}`);
                continue; 
            }

            // Nếu thành công -> Lấy kết quả và thoát vòng lặp
            if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
                finalAiText = data.candidates[0].content.parts[0].text;
                success = true;
            }
        } catch (error) {
            console.error("=> Lỗi kết nối mạng nội bộ:", error);
        }
    } // Kết thúc vòng lặp

    // Xử lý kết quả cuối cùng sau khi đã thử hết các Key
    if (success) {
        chatContext.push({ role: "model", parts: [{ text: finalAiText }] });
        res.json({ text: finalAiText });
    } else {
        res.json({ text: finalAiText });
    }
});

app.listen(port, () => {
    console.log(`🚀 Server GroskAI đa luồng đang chạy tại http://localhost:${port}`);
});