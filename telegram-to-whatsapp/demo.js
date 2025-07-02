#!/usr/bin/env node
/**
 * نظام توجيه تليجرام إلى واتساب - عرض تجريبي
 * Telegram to WhatsApp Bridge - Demo Version
 * 
 * هذا الملف يعرض وظائف النظام بدون الحاجة لتوكن حقيقي أو اتصال واتساب
 * This file demonstrates system functionality without requiring real tokens or WhatsApp connection
 */

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.DEMO_PORT || 3001;

// إعداد التطبيق
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// بيانات تجريبية
let demoStats = {
    totalForwarded: 127,
    todayForwarded: 23,
    messages_received: 156,
    messages_filtered: 29,
    errors: 3,
    lastActivity: new Date().toISOString()
};

let demoConfig = {
    enabled: true,
    targetNumbers: ['+966501234567', '+971501234567'],
    sourceChannels: ['-1001234567890', '-1009876543210'],
    keywords_filter: ['عاجل', 'خبر'],
    messageTemplate: '📢 من: {channel}\n\n{message}\n\n⏰ {time}',
    addChannelName: true,
    addTimestamp: true
};

let isWhatsAppConnected = false;
let clientInfo = {
    name: 'العرض التجريبي',
    number: '966501234567',
    platform: 'web'
};

// رسائل تجريبية للمحاكاة
const demoMessages = [
    {
        text: '🚨 عاجل: تطوير نظام جديد للتوجيه التلقائي',
        channelName: 'قناة التطوير التقني',
        channelId: '-1001234567890'
    },
    {
        text: '📰 خبر: إطلاق ميزات جديدة في النظام',
        channelName: 'أخبار التقنية',
        channelId: '-1009876543210'
    },
    {
        text: '💡 تحديث مهم: تحسينات على الأداء والاستقرار',
        channelName: 'قناة التطوير التقني',
        channelId: '-1001234567890'
    }
];

// الصفحة الرئيسية
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API للحصول على حالة النظام
app.get('/api/status', (req, res) => {
    res.json({
        whatsapp: {
            isReady: isWhatsAppConnected,
            clientInfo: isWhatsAppConnected ? clientInfo : null
        },
        forwarding: demoConfig,
        stats: demoStats,
        pendingMessages: 0,
        demo: true
    });
});

// API لتحديث إعدادات التوجيه
app.post('/api/config', (req, res) => {
    demoConfig = { ...demoConfig, ...req.body };
    
    io.emit('config_updated', demoConfig);
    
    setTimeout(() => {
        io.emit('notification', {
            type: 'success',
            message: 'تم حفظ الإعدادات بنجاح (عرض تجريبي)'
        });
    }, 500);
    
    res.json({ success: true, config: demoConfig });
});

// API لمحاكاة إعادة تشغيل واتساب
app.post('/api/restart-whatsapp', (req, res) => {
    isWhatsAppConnected = false;
    
    io.emit('whatsapp_disconnected', { 
        message: 'تم قطع الاتصال لإعادة التشغيل (عرض تجريبي)' 
    });
    
    setTimeout(() => {
        io.emit('qr', { 
            qrCode: generateDemoQR(),
            message: 'امسح الباركود (عرض تجريبي)'
        });
    }, 2000);
    
    setTimeout(() => {
        isWhatsAppConnected = true;
        io.emit('whatsapp_ready', {
            message: 'تم الاتصال بواتساب بنجاح (عرض تجريبي)!',
            clientInfo: clientInfo
        });
    }, 8000);
    
    res.json({ success: true, message: 'جاري إعادة تشغيل واتساب (عرض تجريبي)...' });
});

// API لمحاكاة توجيه الرسائل
app.post('/api/forward', (req, res) => {
    const { text, channelName, channelId } = req.body;
    
    if (!text) {
        return res.status(400).json({ success: false, message: 'النص مطلوب' });
    }

    // محاكاة التوجيه
    const results = demoConfig.targetNumbers.map(number => ({
        number,
        success: Math.random() > 0.1 // 90% نجاح
    }));

    // تحديث الإحصائيات
    demoStats.totalForwarded++;
    demoStats.todayForwarded++;
    demoStats.lastActivity = new Date().toISOString();

    // إرسال تحديث للواجهة
    setTimeout(() => {
        io.emit('message_forwarded', {
            message: { text, channelName, channelId },
            results: results,
            stats: demoStats
        });
    }, 1000);

    res.json({ success: true, results: results });
});

// إدارة اتصالات Socket.IO
io.on('connection', (socket) => {
    console.log('🔗 مستخدم جديد متصل:', socket.id);

    // إرسال حالة النظام الحالية
    socket.emit('status_update', {
        whatsapp: {
            isReady: isWhatsAppConnected,
            clientInfo: isWhatsAppConnected ? clientInfo : null
        },
        forwarding: demoConfig,
        stats: demoStats
    });

    // محاكاة QR Code في البداية إذا لم يكن متصلاً
    if (!isWhatsAppConnected) {
        setTimeout(() => {
            socket.emit('qr', { 
                qrCode: generateDemoQR(),
                message: 'امسح الباركود للاتصال (عرض تجريبي)'
            });
        }, 1000);
    }

    socket.on('disconnect', () => {
        console.log('❌ مستخدم منقطع:', socket.id);
    });

    // محاكاة تسجيل دخول واتساب بعد 10 ثوانٍ
    if (!isWhatsAppConnected) {
        setTimeout(() => {
            isWhatsAppConnected = true;
            io.emit('whatsapp_ready', {
                message: 'تم الاتصال بواتساب بنجاح (عرض تجريبي)!',
                clientInfo: clientInfo
            });
        }, 10000);
    }
});

// توليد QR Code تجريبي
function generateDemoQR() {
    const canvas = `data:image/svg+xml;base64,${Buffer.from(`
        <svg width="300" height="300" xmlns="http://www.w3.org/2000/svg">
            <rect width="300" height="300" fill="white"/>
            <rect x="50" y="50" width="200" height="200" fill="none" stroke="black" stroke-width="2"/>
            <text x="150" y="150" text-anchor="middle" font-family="Arial" font-size="16" fill="black">
                QR Code Demo
            </text>
            <text x="150" y="170" text-anchor="middle" font-family="Arial" font-size="12" fill="gray">
                عرض تجريبي
            </text>
            <text x="150" y="190" text-anchor="middle" font-family="Arial" font-size="12" fill="gray">
                Demo Mode
            </text>
        </svg>
    `).toString('base64')}`;
    
    return canvas;
}

// محاكاة رسائل واردة من تليجرام
function simulateIncomingMessages() {
    if (!demoConfig.enabled) return;
    
    const randomMessage = demoMessages[Math.floor(Math.random() * demoMessages.length)];
    
    // زيادة إحصائيات الاستلام
    demoStats.messages_received++;
    
    console.log(`📨 رسالة تجريبية من ${randomMessage.channelName}: ${randomMessage.text.substring(0, 50)}...`);
    
    // محاكاة التوجيه
    setTimeout(() => {
        const results = demoConfig.targetNumbers.map(number => ({
            number,
            success: Math.random() > 0.1
        }));

        demoStats.totalForwarded++;
        demoStats.todayForwarded++;
        demoStats.lastActivity = new Date().toISOString();

        io.emit('message_forwarded', {
            message: randomMessage,
            results: results,
            stats: demoStats
        });
    }, 2000 + Math.random() * 3000);
}

// بدء النظام
server.listen(PORT, () => {
    console.log('');
    console.log('🎭 ═══════════════════════════════════════');
    console.log('🎭      عرض تجريبي - نظام التوجيه');
    console.log('🎭       Demo Mode - Bridge System');
    console.log('🎭 ═══════════════════════════════════════');
    console.log(`🌐 لوحة التحكم التجريبية: http://localhost:${PORT}`);
    console.log(`🌐 Demo Control Panel: http://localhost:${PORT}`);
    console.log('');
    console.log('✨ المميزات المتاحة في العرض التجريبي:');
    console.log('✨ Demo Features Available:');
    console.log('   📱 واجهة تحكم كاملة');
    console.log('   📊 إحصائيات ديناميكية');
    console.log('   🔄 محاكاة رسائل واردة');
    console.log('   ⚙️ إدارة الإعدادات');
    console.log('   🎯 محاكاة QR Code');
    console.log('');
    console.log('📝 ملاحظة: هذا عرض تجريبي ولا يتطلب توكن حقيقي');
    console.log('📝 Note: This is a demo and does not require real tokens');
    console.log('═══════════════════════════════════════');
    
    // بدء محاكاة الرسائل الواردة كل 15-45 ثانية
    setInterval(simulateIncomingMessages, 15000 + Math.random() * 30000);
    
    // محاكاة بعض الأخطاء أحياناً
    setInterval(() => {
        if (Math.random() < 0.1) { // 10% احتمال
            demoStats.errors++;
            io.emit('notification', {
                type: 'warning',
                message: 'خطأ تجريبي: فشل في إرسال رسالة لرقم واحد'
            });
        }
    }, 60000);
});

// إيقاف النظام بأمان
process.on('SIGINT', () => {
    console.log('\n🛑 جاري إيقاف العرض التجريبي...');
    console.log('🛑 Stopping demo...');
    
    console.log('✅ تم إيقاف العرض التجريبي بأمان');
    console.log('✅ Demo stopped safely');
    process.exit(0);
});

console.log('🎭 بدء العرض التجريبي...');
console.log('🎭 Starting demo...');