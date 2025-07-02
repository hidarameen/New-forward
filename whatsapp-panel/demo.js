#!/usr/bin/env node

// عرض توضيحي للوحة تحكم واتساب ويب
// WhatsApp Web Panel Demo

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3001;

// إعداد المجلدات الثابتة
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// محاكاة بيانات المستخدم
const mockUserInfo = {
    name: 'مستخدم تجريبي',
    number: '966501234567',
    platform: 'web'
};

// محاكاة باركود QR (صورة تجريبية)
const mockQRCode = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

// الصفحة الرئيسية
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// محاكاة API
app.get('/api/status', (req, res) => {
    res.json({
        isReady: false,
        clientInfo: null
    });
});

app.post('/api/send-message', (req, res) => {
    const { number, message } = req.body;
    console.log(`📱 محاكاة إرسال رسالة إلى ${number}: ${message}`);
    res.json({ success: true, message: 'تم إرسال الرسالة بنجاح (محاكاة)' });
});

// إدارة اتصالات Socket.IO
io.on('connection', (socket) => {
    console.log('🔗 مستخدم جديد متصل:', socket.id);

    // محاكاة توليد باركود QR
    setTimeout(() => {
        socket.emit('qr', {
            qrCode: mockQRCode,
            message: 'باركود تجريبي - امسح بواتساب لتسجيل الدخول'
        });
    }, 2000);

    // محاكاة تسجيل دخول ناجح بعد 5 ثوانٍ
    setTimeout(() => {
        socket.emit('ready', {
            message: 'تم تسجيل الدخول بنجاح! (وضع المحاكاة)',
            clientInfo: mockUserInfo
        });
    }, 7000);

    // طلب بدء جلسة جديدة
    socket.on('start_session', () => {
        socket.emit('session_starting', { message: 'جاري بدء جلسة تجريبية...' });
        
        setTimeout(() => {
            socket.emit('qr', {
                qrCode: mockQRCode,
                message: 'باركود تجريبي محدث - امسح بواتساب'
            });
        }, 1000);
    });

    // طلب قطع الاتصال
    socket.on('disconnect_session', () => {
        socket.emit('disconnected', { message: 'تم قطع الاتصال (محاكاة)' });
    });

    // طلب إرسال رسالة تجريبية
    socket.on('send_test_message', (data) => {
        console.log(`📱 محاكاة إرسال رسالة: ${data.message} إلى ${data.number}`);
        setTimeout(() => {
            socket.emit('message_sent', { message: 'تم إرسال الرسالة بنجاح! (محاكاة)' });
        }, 1000);
    });

    socket.on('disconnect', () => {
        console.log('❌ مستخدم منقطع:', socket.id);
    });
});

// بدء الخادم
server.listen(PORT, () => {
    console.log('');
    console.log('🎭 ═══════════════════════════════════════');
    console.log('🎭    عرض توضيحي للوحة واتساب ويب');
    console.log('🎭    WhatsApp Web Panel Demo');
    console.log('🎭 ═══════════════════════════════════════');
    console.log(`🌐 افتح المتصفح على: http://localhost:${PORT}`);
    console.log(`🌐 Open browser at: http://localhost:${PORT}`);
    console.log('');
    console.log('💡 هذا عرض توضيحي يحاكي عمل البوت الحقيقي');
    console.log('💡 This is a demo that simulates the real bot');
    console.log('');
    console.log('🎯 المميزات المحاكاة:');
    console.log('🎯 Simulated features:');
    console.log('   ✅ توليد باركود QR تجريبي');
    console.log('   ✅ Mock QR code generation');
    console.log('   ✅ محاكاة تسجيل الدخول');
    console.log('   ✅ Login simulation');
    console.log('   ✅ محاكاة إرسال الرسائل');
    console.log('   ✅ Message sending simulation');
    console.log('');
    console.log('⚠️  للاستخدام الحقيقي، استخدم: npm start');
    console.log('⚠️  For real usage, use: npm start');
    console.log('');
    console.log('🔚 اضغط Ctrl+C للإيقاف');
    console.log('🔚 Press Ctrl+C to stop');
    console.log('═══════════════════════════════════════');
});

// إيقاف الخادم بأمان
process.on('SIGINT', () => {
    console.log('\n🛑 إيقاف العرض التوضيحي...');
    console.log('🛑 Stopping demo...');
    process.exit(0);
});