const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');
const QRCode = require('qrcode');
const fs = require('fs-extra');
const cron = require('node-cron');
const moment = require('moment');
const { Client, LocalAuth } = require('whatsapp-web.js');

require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

// إعداد التطبيق
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// متغيرات النظام
let whatsappClient = null;
let isWhatsAppReady = false;
let clientInfo = null;
let forwardingStats = {
    totalForwarded: 0,
    todayForwarded: 0,
    lastForwarded: null,
    errors: 0
};

// قائمة الرسائل المعلقة
let pendingMessages = [];

// إعدادات التوجيه
let forwardingConfig = {
    enabled: false,
    targetNumbers: [],
    sourceChannels: [],
    messageTemplate: null,
    addTimestamp: true,
    addChannelName: true
};

// تحميل الإعدادات
async function loadConfig() {
    try {
        if (await fs.pathExists('config.json')) {
            const config = await fs.readJson('config.json');
            forwardingConfig = { ...forwardingConfig, ...config };
            console.log('✅ تم تحميل الإعدادات من config.json');
        }
    } catch (error) {
        console.log('⚠️ لم يتم العثور على ملف الإعدادات، سيتم استخدام الإعدادات الافتراضية');
    }
}

// حفظ الإعدادات
async function saveConfig() {
    try {
        await fs.writeJson('config.json', forwardingConfig, { spaces: 2 });
        console.log('✅ تم حفظ الإعدادات');
    } catch (error) {
        console.error('❌ خطأ في حفظ الإعدادات:', error);
    }
}

// تحميل الإحصائيات
async function loadStats() {
    try {
        if (await fs.pathExists('stats.json')) {
            const stats = await fs.readJson('stats.json');
            forwardingStats = { ...forwardingStats, ...stats };
        }
    } catch (error) {
        console.log('⚠️ لم يتم العثور على ملف الإحصائيات');
    }
}

// حفظ الإحصائيات
async function saveStats() {
    try {
        await fs.writeJson('stats.json', forwardingStats, { spaces: 2 });
    } catch (error) {
        console.error('❌ خطأ في حفظ الإحصائيات:', error);
    }
}

// إنشاء عميل واتساب
function createWhatsAppClient() {
    whatsappClient = new Client({
        authStrategy: new LocalAuth({
            dataPath: '.wwebjs_auth'
        }),
        puppeteer: {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor'
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
        }
    });

    // عند الاستعداد
    whatsappClient.on('ready', async () => {
        isWhatsAppReady = true;
        clientInfo = {
            name: whatsappClient.info.pushname,
            number: whatsappClient.info.wid.user,
            platform: whatsappClient.info.platform
        };
        
        console.log('✅ واتساب ويب جاهز!', clientInfo);
        io.emit('whatsapp_ready', {
            message: 'تم الاتصال بواتساب بنجاح!',
            clientInfo: clientInfo
        });

        // معالجة الرسائل المعلقة
        await processPendingMessages();
    });

    // عند قطع الاتصال
    whatsappClient.on('disconnected', (reason) => {
        console.log('❌ تم قطع الاتصال مع واتساب:', reason);
        isWhatsAppReady = false;
        clientInfo = null;
        io.emit('whatsapp_disconnected', { message: 'تم قطع الاتصال مع واتساب', reason: reason });
    });

    // عند حدوث خطأ
    whatsappClient.on('auth_failure', (msg) => {
        console.error('❌ فشل المصادقة مع واتساب:', msg);
        io.emit('whatsapp_auth_failure', { message: 'فشل في المصادقة مع واتساب', error: msg });
    });

    // بدء العميل
    whatsappClient.initialize();
}

// معالجة الرسائل المعلقة
async function processPendingMessages() {
    if (pendingMessages.length === 0) return;

    console.log(`📤 معالجة ${pendingMessages.length} رسالة معلقة...`);
    
    for (const message of pendingMessages) {
        try {
            await forwardToWhatsApp(message);
            await new Promise(resolve => setTimeout(resolve, 2000)); // انتظار ثانيتين بين الرسائل
        } catch (error) {
            console.error('خطأ في معالجة رسالة معلقة:', error);
        }
    }
    
    pendingMessages = [];
    console.log('✅ تم انتهاء معالجة الرسائل المعلقة');
}

// توجيه الرسالة إلى واتساب
async function forwardToWhatsApp(messageData) {
    if (!isWhatsAppReady || !whatsappClient) {
        pendingMessages.push(messageData);
        console.log('📝 تم إضافة الرسالة للقائمة المعلقة');
        return { success: false, message: 'واتساب غير متصل، تم إضافة الرسالة للقائمة المعلقة' };
    }

    if (!forwardingConfig.enabled) {
        return { success: false, message: 'التوجيه معطل' };
    }

    try {
        // تنسيق الرسالة
        let formattedMessage = messageData.text;
        
        if (forwardingConfig.addChannelName && messageData.channelName) {
            formattedMessage = `📢 من: ${messageData.channelName}\n\n${formattedMessage}`;
        }
        
        if (forwardingConfig.addTimestamp) {
            const timestamp = moment().format('DD/MM/YYYY HH:mm');
            formattedMessage += `\n\n⏰ ${timestamp}`;
        }

        if (forwardingConfig.messageTemplate) {
            formattedMessage = forwardingConfig.messageTemplate
                .replace('{message}', messageData.text)
                .replace('{channel}', messageData.channelName || 'غير محدد')
                .replace('{time}', moment().format('DD/MM/YYYY HH:mm'));
        }

        // إرسال للأرقام المحددة
        const results = [];
        for (const number of forwardingConfig.targetNumbers) {
            try {
                const cleanNumber = number.replace(/[^\d]/g, '');
                const chatId = cleanNumber + '@c.us';
                
                await whatsappClient.sendMessage(chatId, formattedMessage);
                results.push({ number, success: true });
                
                // تحديث الإحصائيات
                forwardingStats.totalForwarded++;
                forwardingStats.todayForwarded++;
                forwardingStats.lastForwarded = new Date().toISOString();
                
                console.log(`✅ تم إرسال الرسالة إلى ${number}`);
                
            } catch (error) {
                console.error(`❌ فشل إرسال الرسالة إلى ${number}:`, error);
                results.push({ number, success: false, error: error.message });
                forwardingStats.errors++;
            }
            
            // انتظار بين الرسائل لتجنب الحظر
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        await saveStats();
        
        // إرسال تحديث للواجهة
        io.emit('message_forwarded', {
            message: messageData,
            results: results,
            stats: forwardingStats
        });

        return { success: true, results: results };

    } catch (error) {
        console.error('❌ خطأ في توجيه الرسالة:', error);
        forwardingStats.errors++;
        await saveStats();
        return { success: false, message: error.message };
    }
}

// الصفحة الرئيسية
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API للحصول على حالة النظام
app.get('/api/status', (req, res) => {
    res.json({
        whatsapp: {
            isReady: isWhatsAppReady,
            clientInfo: clientInfo
        },
        forwarding: forwardingConfig,
        stats: forwardingStats,
        pendingMessages: pendingMessages.length
    });
});

// API لتحديث إعدادات التوجيه
app.post('/api/config', async (req, res) => {
    try {
        forwardingConfig = { ...forwardingConfig, ...req.body };
        await saveConfig();
        
        io.emit('config_updated', forwardingConfig);
        
        res.json({ success: true, config: forwardingConfig });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// API لاستقبال الرسائل من بوت تليجرام
app.post('/api/forward', async (req, res) => {
    try {
        const { text, channelName, channelId, messageId, timestamp } = req.body;
        
        if (!text) {
            return res.status(400).json({ success: false, message: 'النص مطلوب' });
        }

        const messageData = {
            text,
            channelName,
            channelId,
            messageId,
            timestamp: timestamp || new Date().toISOString()
        };

        const result = await forwardToWhatsApp(messageData);
        res.json(result);

    } catch (error) {
        console.error('❌ خطأ في API التوجيه:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// API لإعادة تشغيل واتساب
app.post('/api/restart-whatsapp', async (req, res) => {
    try {
        if (whatsappClient) {
            await whatsappClient.destroy();
        }
        
        setTimeout(() => {
            createWhatsAppClient();
        }, 2000);
        
        res.json({ success: true, message: 'جاري إعادة تشغيل واتساب...' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// API للحصول على الإحصائيات التفصيلية
app.get('/api/stats', (req, res) => {
    res.json({
        ...forwardingStats,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        pendingMessages: pendingMessages.length
    });
});

// إدارة اتصالات Socket.IO
io.on('connection', (socket) => {
    console.log('🔗 مستخدم جديد متصل:', socket.id);

    // إرسال حالة النظام الحالية
    socket.emit('status_update', {
        whatsapp: {
            isReady: isWhatsAppReady,
            clientInfo: clientInfo
        },
        forwarding: forwardingConfig,
        stats: forwardingStats
    });

    socket.on('disconnect', () => {
        console.log('❌ مستخدم منقطع:', socket.id);
    });
});

// إعادة تعيين إحصائيات اليوم في منتصف الليل
cron.schedule('0 0 * * *', async () => {
    forwardingStats.todayForwarded = 0;
    await saveStats();
    console.log('🔄 تم إعادة تعيين إحصائيات اليوم');
});

// بدء النظام
async function startSystem() {
    try {
        await loadConfig();
        await loadStats();
        
        // إنشاء مجلدات ضرورية
        await fs.ensureDir('.wwebjs_auth');
        await fs.ensureDir('logs');
        
        // بدء خادم الويب
        server.listen(PORT, () => {
            console.log('');
            console.log('🌉 ═══════════════════════════════════════');
            console.log('🌉    نظام توجيه تليجرام ← واتساب');
            console.log('🌉    Telegram → WhatsApp Bridge');
            console.log('🌉 ═══════════════════════════════════════');
            console.log(`🌐 لوحة التحكم: http://localhost:${PORT}`);
            console.log(`🌐 Control Panel: http://localhost:${PORT}`);
            console.log('');
            console.log('📊 حالة النظام:');
            console.log('📊 System Status:');
            console.log(`   التوجيه: ${forwardingConfig.enabled ? '✅ مفعل' : '❌ معطل'}`);
            console.log(`   Forwarding: ${forwardingConfig.enabled ? '✅ Enabled' : '❌ Disabled'}`);
            console.log(`   الأرقام المستهدفة: ${forwardingConfig.targetNumbers.length}`);
            console.log(`   Target Numbers: ${forwardingConfig.targetNumbers.length}`);
            console.log('');
            console.log('🚀 بدء تشغيل واتساب ويب...');
            console.log('🚀 Starting WhatsApp Web...');
            console.log('═══════════════════════════════════════');
        });

        // بدء عميل واتساب
        createWhatsAppClient();

    } catch (error) {
        console.error('❌ خطأ في بدء النظام:', error);
        process.exit(1);
    }
}

// إيقاف النظام بأمان
process.on('SIGINT', async () => {
    console.log('\n🛑 جاري إيقاف النظام...');
    
    if (whatsappClient) {
        await whatsappClient.destroy();
    }
    
    await saveConfig();
    await saveStats();
    
    console.log('✅ تم إيقاف النظام بأمان');
    process.exit(0);
});

// بدء النظام
startSystem();