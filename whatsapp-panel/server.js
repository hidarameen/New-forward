const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const QRCode = require('qrcode');
const { Client, LocalAuth } = require('whatsapp-web.js');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// إعداد المجلدات الثابتة
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// متغيرات الحالة
let whatsappClient = null;
let isClientReady = false;
let clientInfo = null;

// الصفحة الرئيسية
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// إنشاء عميل واتساب
function createWhatsAppClient() {
    whatsappClient = new Client({
        authStrategy: new LocalAuth(),
        puppeteer: {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ]
        }
    });

    // عند توليد باركود QR
    whatsappClient.on('qr', async (qr) => {
        console.log('🔄 تم توليد باركود QR جديد');
        try {
            const qrImage = await QRCode.toDataURL(qr);
            io.emit('qr', { qrCode: qrImage, message: 'امسح الباركود بتطبيق واتساب' });
        } catch (error) {
            console.error('خطأ في توليد باركود QR:', error);
            io.emit('error', { message: 'خطأ في توليد الباركود' });
        }
    });

    // عند الاستعداد
    whatsappClient.on('ready', async () => {
        isClientReady = true;
        clientInfo = {
            name: whatsappClient.info.pushname,
            number: whatsappClient.info.wid.user,
            platform: whatsappClient.info.platform
        };
        
        console.log('✅ العميل جاهز!', clientInfo);
        io.emit('ready', {
            message: 'تم تسجيل الدخول بنجاح!',
            clientInfo: clientInfo
        });
    });

    // عند قطع الاتصال
    whatsappClient.on('disconnected', (reason) => {
        console.log('❌ تم قطع الاتصال:', reason);
        isClientReady = false;
        clientInfo = null;
        io.emit('disconnected', { message: 'تم قطع الاتصال', reason: reason });
    });

    // عند حدوث خطأ
    whatsappClient.on('auth_failure', (msg) => {
        console.error('❌ فشل المصادقة:', msg);
        io.emit('auth_failure', { message: 'فشل في المصادقة', error: msg });
    });

    // بدء العميل
    whatsappClient.initialize();
}

// إدارة اتصالات Socket.IO
io.on('connection', (socket) => {
    console.log('🔗 مستخدم جديد متصل:', socket.id);

    // إرسال حالة العميل الحالية
    if (isClientReady && clientInfo) {
        socket.emit('ready', {
            message: 'تم تسجيل الدخول مسبقاً',
            clientInfo: clientInfo
        });
    }

    // طلب بدء جلسة جديدة
    socket.on('start_session', () => {
        if (whatsappClient) {
            whatsappClient.destroy();
        }
        createWhatsAppClient();
        socket.emit('session_starting', { message: 'جاري بدء جلسة جديدة...' });
    });

    // طلب قطع الاتصال
    socket.on('disconnect_session', async () => {
        if (whatsappClient) {
            await whatsappClient.destroy();
            isClientReady = false;
            clientInfo = null;
            io.emit('disconnected', { message: 'تم قطع الاتصال بناءً على طلبك' });
        }
    });

    // طلب إرسال رسالة تجريبية
    socket.on('send_test_message', async (data) => {
        if (isClientReady && whatsappClient) {
            try {
                const number = data.number.replace(/[^\d]/g, '');
                const chatId = number + '@c.us';
                await whatsappClient.sendMessage(chatId, data.message);
                socket.emit('message_sent', { message: 'تم إرسال الرسالة بنجاح!' });
            } catch (error) {
                console.error('خطأ في إرسال الرسالة:', error);
                socket.emit('error', { message: 'فشل في إرسال الرسالة: ' + error.message });
            }
        } else {
            socket.emit('error', { message: 'العميل غير متصل' });
        }
    });

    socket.on('disconnect', () => {
        console.log('❌ مستخدم منقطع:', socket.id);
    });
});

// API endpoints
app.get('/api/status', (req, res) => {
    res.json({
        isReady: isClientReady,
        clientInfo: clientInfo
    });
});

app.post('/api/send-message', async (req, res) => {
    if (!isClientReady || !whatsappClient) {
        return res.status(400).json({ error: 'العميل غير متصل' });
    }

    try {
        const { number, message } = req.body;
        const cleanNumber = number.replace(/[^\d]/g, '');
        const chatId = cleanNumber + '@c.us';
        
        await whatsappClient.sendMessage(chatId, message);
        res.json({ success: true, message: 'تم إرسال الرسالة بنجاح' });
    } catch (error) {
        console.error('خطأ في إرسال الرسالة:', error);
        res.status(500).json({ error: 'فشل في إرسال الرسالة' });
    }
});

// بدء الخادم
server.listen(PORT, () => {
    console.log(`🚀 الخادم يعمل على البورت ${PORT}`);
    console.log(`🌐 افتح المتصفح على: http://localhost:${PORT}`);
    
    // بدء عميل واتساب تلقائياً
    createWhatsAppClient();
});

// إيقاف الخادم بأمان
process.on('SIGINT', async () => {
    console.log('\n🛑 جاري إيقاف الخادم...');
    if (whatsappClient) {
        await whatsappClient.destroy();
    }
    process.exit(0);
});