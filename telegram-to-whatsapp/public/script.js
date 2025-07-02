// إعداد Socket.IO
const socket = io();

// عناصر DOM
const forwardingToggle = document.getElementById('forwardingToggle');
const forwardingStatus = document.getElementById('forwardingStatus');
const restartWhatsAppBtn = document.getElementById('restartWhatsApp');
const qrPlaceholder = document.getElementById('qrPlaceholder');
const qrCode = document.getElementById('qrCode');
const connectionStatus = document.getElementById('connectionStatus');
const whatsappUserInfo = document.getElementById('whatsappUserInfo');

// عناصر الإعدادات
const newPhoneNumber = document.getElementById('newPhoneNumber');
const addPhoneNumberBtn = document.getElementById('addPhoneNumber');
const phoneList = document.getElementById('phoneList');
const newChannelId = document.getElementById('newChannelId');
const addChannelBtn = document.getElementById('addChannel');
const channelList = document.getElementById('channelList');
const newKeyword = document.getElementById('newKeyword');
const addKeywordBtn = document.getElementById('addKeyword');
const keywordList = document.getElementById('keywordList');
const messageTemplate = document.getElementById('messageTemplate');
const addChannelName = document.getElementById('addChannelName');
const addTimestamp = document.getElementById('addTimestamp');
const saveConfigBtn = document.getElementById('saveConfig');

// عناصر الإحصائيات
const totalForwarded = document.getElementById('totalForwarded');
const todayForwarded = document.getElementById('todayForwarded');
const telegramReceived = document.getElementById('telegramReceived');
const whatsappSent = document.getElementById('whatsappSent');
const messagesFiltered = document.getElementById('messagesFiltered');
const totalErrors = document.getElementById('totalErrors');
const activityLog = document.getElementById('activityLog');

// عناصر الحالة
const telegramStatus = document.getElementById('telegramStatus');
const whatsappStatus = document.getElementById('whatsappStatus');

// متغيرات النظام
let currentConfig = {};
let currentStats = {};
let isWhatsAppConnected = false;

// دوال المساعدة
function showNotification(message, type = 'info', duration = 5000) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${getNotificationIcon(type)}"></i>
        ${message}
    `;
    
    document.getElementById('notifications').appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, duration);
}

function getNotificationIcon(type) {
    const icons = {
        success: 'check-circle',
        error: 'exclamation-triangle',
        warning: 'exclamation-circle',
        info: 'info-circle'
    };
    return icons[type] || 'info-circle';
}

function updateStatusIndicator(element, connected, label) {
    const dot = element.querySelector('.status-dot');
    const span = element.querySelector('span');
    
    if (connected) {
        dot.classList.add('connected');
        span.textContent = `${label} - متصل`;
    } else {
        dot.classList.remove('connected');
        span.textContent = `${label} - غير متصل`;
    }
}

function addLogEntry(message, type = 'info') {
    const logItem = document.createElement('div');
    logItem.className = 'log-item';
    
    const time = new Date().toLocaleTimeString('ar-SA');
    logItem.innerHTML = `
        <span class="log-time">${time}</span>
        <span class="log-message">${message}</span>
    `;
    
    activityLog.insertBefore(logItem, activityLog.firstChild);
    
    // الاحتفاظ بآخر 50 إدخال فقط
    if (activityLog.children.length > 50) {
        activityLog.removeChild(activityLog.lastChild);
    }
}

function updateStats(stats) {
    currentStats = stats;
    
    totalForwarded.textContent = stats.totalForwarded || 0;
    todayForwarded.textContent = stats.todayForwarded || 0;
    telegramReceived.textContent = stats.messages_received || 0;
    whatsappSent.textContent = stats.totalForwarded || 0;
    messagesFiltered.textContent = stats.messages_filtered || 0;
    totalErrors.textContent = stats.errors || 0;
}

function renderPhoneList() {
    phoneList.innerHTML = '';
    
    if (currentConfig.targetNumbers) {
        currentConfig.targetNumbers.forEach((number, index) => {
            const item = document.createElement('div');
            item.className = 'list-item';
            item.innerHTML = `
                <span>${number}</span>
                <button class="btn btn-danger" onclick="removePhoneNumber(${index})">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            phoneList.appendChild(item);
        });
    }
}

function renderChannelList() {
    channelList.innerHTML = '';
    
    if (currentConfig.sourceChannels) {
        currentConfig.sourceChannels.forEach((channel, index) => {
            const item = document.createElement('div');
            item.className = 'list-item';
            item.innerHTML = `
                <span>${channel}</span>
                <button class="btn btn-danger" onclick="removeChannel(${index})">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            channelList.appendChild(item);
        });
    }
}

function renderKeywordList() {
    keywordList.innerHTML = '';
    
    if (currentConfig.keywords_filter) {
        currentConfig.keywords_filter.forEach((keyword, index) => {
            const item = document.createElement('div');
            item.className = 'list-item';
            item.innerHTML = `
                <span>${keyword}</span>
                <button class="btn btn-danger" onclick="removeKeyword(${index})">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            keywordList.appendChild(item);
        });
    }
}

function updateConfigUI() {
    // تحديث حالة التوجيه
    forwardingToggle.checked = currentConfig.enabled || false;
    forwardingStatus.textContent = currentConfig.enabled ? 'مفعل' : 'معطل';
    
    // تحديث القوائم
    renderPhoneList();
    renderChannelList();
    renderKeywordList();
    
    // تحديث الإعدادات الأخرى
    messageTemplate.value = currentConfig.messageTemplate || '';
    addChannelName.checked = currentConfig.addChannelName !== false;
    addTimestamp.checked = currentConfig.addTimestamp !== false;
}

// دوال إدارة القوائم
function addPhoneNumber() {
    const number = newPhoneNumber.value.trim();
    if (!number) {
        showNotification('يرجى إدخال رقم الهاتف', 'warning');
        return;
    }
    
    // تنسيق الرقم
    let formattedNumber = number;
    if (!formattedNumber.startsWith('+')) {
        formattedNumber = '+' + formattedNumber.replace(/[^\d]/g, '');
    }
    
    if (formattedNumber.length < 10) {
        showNotification('رقم الهاتف غير صحيح', 'error');
        return;
    }
    
    if (!currentConfig.targetNumbers) {
        currentConfig.targetNumbers = [];
    }
    
    if (currentConfig.targetNumbers.includes(formattedNumber)) {
        showNotification('الرقم موجود مسبقاً', 'warning');
        return;
    }
    
    currentConfig.targetNumbers.push(formattedNumber);
    newPhoneNumber.value = '';
    renderPhoneList();
    showNotification('تم إضافة الرقم بنجاح', 'success');
}

function removePhoneNumber(index) {
    if (currentConfig.targetNumbers && currentConfig.targetNumbers[index]) {
        currentConfig.targetNumbers.splice(index, 1);
        renderPhoneList();
        showNotification('تم حذف الرقم بنجاح', 'success');
    }
}

function addChannel() {
    const channelId = newChannelId.value.trim();
    if (!channelId) {
        showNotification('يرجى إدخال معرف القناة', 'warning');
        return;
    }
    
    if (!currentConfig.sourceChannels) {
        currentConfig.sourceChannels = [];
    }
    
    if (currentConfig.sourceChannels.includes(channelId)) {
        showNotification('القناة موجودة مسبقاً', 'warning');
        return;
    }
    
    currentConfig.sourceChannels.push(channelId);
    newChannelId.value = '';
    renderChannelList();
    showNotification('تم إضافة القناة بنجاح', 'success');
}

function removeChannel(index) {
    if (currentConfig.sourceChannels && currentConfig.sourceChannels[index]) {
        currentConfig.sourceChannels.splice(index, 1);
        renderChannelList();
        showNotification('تم حذف القناة بنجاح', 'success');
    }
}

function addKeyword() {
    const keyword = newKeyword.value.trim();
    if (!keyword) {
        showNotification('يرجى إدخال كلمة مفتاحية', 'warning');
        return;
    }
    
    if (!currentConfig.keywords_filter) {
        currentConfig.keywords_filter = [];
    }
    
    if (currentConfig.keywords_filter.includes(keyword)) {
        showNotification('الكلمة موجودة مسبقاً', 'warning');
        return;
    }
    
    currentConfig.keywords_filter.push(keyword);
    newKeyword.value = '';
    renderKeywordList();
    showNotification('تم إضافة الكلمة بنجاح', 'success');
}

function removeKeyword(index) {
    if (currentConfig.keywords_filter && currentConfig.keywords_filter[index]) {
        currentConfig.keywords_filter.splice(index, 1);
        renderKeywordList();
        showNotification('تم حذف الكلمة بنجاح', 'success');
    }
}

// حفظ الإعدادات
async function saveConfiguration() {
    try {
        // تحديث الإعدادات من الواجهة
        currentConfig.enabled = forwardingToggle.checked;
        currentConfig.messageTemplate = messageTemplate.value.trim() || null;
        currentConfig.addChannelName = addChannelName.checked;
        currentConfig.addTimestamp = addTimestamp.checked;
        
        const response = await fetch('/api/config', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(currentConfig)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('تم حفظ الإعدادات بنجاح', 'success');
            addLogEntry('تم حفظ الإعدادات');
        } else {
            throw new Error(result.error || 'خطأ غير معروف');
        }
        
    } catch (error) {
        console.error('خطأ في حفظ الإعدادات:', error);
        showNotification('فشل في حفظ الإعدادات: ' + error.message, 'error');
    }
}

// إعادة تشغيل واتساب
async function restartWhatsApp() {
    try {
        const response = await fetch('/api/restart-whatsapp', {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('جاري إعادة تشغيل واتساب...', 'info');
            addLogEntry('إعادة تشغيل واتساب');
        } else {
            throw new Error(result.error || 'خطأ غير معروف');
        }
        
    } catch (error) {
        console.error('خطأ في إعادة تشغيل واتساب:', error);
        showNotification('فشل في إعادة تشغيل واتساب: ' + error.message, 'error');
    }
}

// تحميل حالة النظام
async function loadSystemStatus() {
    try {
        const response = await fetch('/api/status');
        const status = await response.json();
        
        // تحديث حالة واتساب
        isWhatsAppConnected = status.whatsapp.isReady;
        updateStatusIndicator(whatsappStatus, isWhatsAppConnected, 'واتساب');
        
        if (isWhatsAppConnected && status.whatsapp.clientInfo) {
            // إخفاء QR وإظهار حالة الاتصال
            document.getElementById('qrContainer').style.display = 'none';
            connectionStatus.style.display = 'block';
            
            whatsappUserInfo.innerHTML = `
                <div><strong>الاسم:</strong> ${status.whatsapp.clientInfo.name || 'غير محدد'}</div>
                <div><strong>الرقم:</strong> ${status.whatsapp.clientInfo.number || 'غير محدد'}</div>
                <div><strong>المنصة:</strong> ${status.whatsapp.clientInfo.platform || 'غير محدد'}</div>
            `;
        } else {
            // إظهار QR وإخفاء حالة الاتصال
            document.getElementById('qrContainer').style.display = 'block';
            connectionStatus.style.display = 'none';
        }
        
        // تحديث الإعدادات
        currentConfig = status.forwarding;
        updateConfigUI();
        
        // تحديث الإحصائيات
        updateStats(status.stats);
        
    } catch (error) {
        console.error('خطأ في تحميل حالة النظام:', error);
        showNotification('فشل في تحميل حالة النظام', 'error');
    }
}

// معالجات أحداث Socket.IO
socket.on('connect', () => {
    console.log('متصل بالخادم');
    addLogEntry('تم الاتصال بالخادم');
    updateStatusIndicator(telegramStatus, true, 'تليجرام');
});

socket.on('disconnect', () => {
    console.log('انقطع الاتصال مع الخادم');
    addLogEntry('انقطع الاتصال مع الخادم');
    updateStatusIndicator(telegramStatus, false, 'تليجرام');
});

socket.on('qr', (data) => {
    console.log('تم استلام باركود QR');
    qrCode.src = data.qrCode;
    qrCode.style.display = 'block';
    qrPlaceholder.style.display = 'none';
    
    addLogEntry('تم توليد باركود QR جديد');
    showNotification(data.message || 'تم توليد باركود جديد', 'info');
});

socket.on('whatsapp_ready', (data) => {
    console.log('واتساب جاهز:', data);
    isWhatsAppConnected = true;
    updateStatusIndicator(whatsappStatus, true, 'واتساب');
    
    // إخفاء QR وإظهار حالة الاتصال
    document.getElementById('qrContainer').style.display = 'none';
    connectionStatus.style.display = 'block';
    
    if (data.clientInfo) {
        whatsappUserInfo.innerHTML = `
            <div><strong>الاسم:</strong> ${data.clientInfo.name || 'غير محدد'}</div>
            <div><strong>الرقم:</strong> ${data.clientInfo.number || 'غير محدد'}</div>
            <div><strong>المنصة:</strong> ${data.clientInfo.platform || 'غير محدد'}</div>
        `;
    }
    
    addLogEntry('تم الاتصال بواتساب بنجاح');
    showNotification(data.message || 'تم الاتصال بواتساب بنجاح!', 'success');
});

socket.on('whatsapp_disconnected', (data) => {
    console.log('تم قطع الاتصال مع واتساب:', data);
    isWhatsAppConnected = false;
    updateStatusIndicator(whatsappStatus, false, 'واتساب');
    
    // إظهار QR وإخفاء حالة الاتصال
    document.getElementById('qrContainer').style.display = 'block';
    connectionStatus.style.display = 'none';
    qrCode.style.display = 'none';
    qrPlaceholder.style.display = 'flex';
    
    addLogEntry('تم قطع الاتصال مع واتساب');
    showNotification(data.message || 'تم قطع الاتصال مع واتساب', 'error');
});

socket.on('whatsapp_auth_failure', (data) => {
    console.log('فشل المصادقة مع واتساب:', data);
    addLogEntry('فشل في المصادقة مع واتساب');
    showNotification(data.message || 'فشل في المصادقة مع واتساب', 'error');
});

socket.on('message_forwarded', (data) => {
    console.log('تم توجيه رسالة:', data);
    
    // تحديث الإحصائيات
    updateStats(data.stats);
    
    // إضافة سجل
    const channelName = data.message.channelName || 'قناة غير معروفة';
    addLogEntry(`تم توجيه رسالة من ${channelName}`);
    
    // إشعار
    const successCount = data.results.filter(r => r.success).length;
    const totalCount = data.results.length;
    
    if (successCount === totalCount) {
        showNotification(`تم توجيه الرسالة إلى ${successCount} رقم بنجاح`, 'success');
    } else {
        showNotification(`تم توجيه الرسالة إلى ${successCount} من أصل ${totalCount} أرقام`, 'warning');
    }
});

socket.on('config_updated', (config) => {
    console.log('تم تحديث الإعدادات:', config);
    currentConfig = config;
    updateConfigUI();
    addLogEntry('تم تحديث الإعدادات');
});

socket.on('status_update', (status) => {
    console.log('تحديث حالة النظام:', status);
    
    // تحديث حالة واتساب
    isWhatsAppConnected = status.whatsapp.isReady;
    updateStatusIndicator(whatsappStatus, isWhatsAppConnected, 'واتساب');
    
    // تحديث الإعدادات
    currentConfig = status.forwarding;
    updateConfigUI();
    
    // تحديث الإحصائيات
    updateStats(status.stats);
});

// معالجات الأحداث
forwardingToggle.addEventListener('change', () => {
    forwardingStatus.textContent = forwardingToggle.checked ? 'مفعل' : 'معطل';
});

addPhoneNumberBtn.addEventListener('click', addPhoneNumber);
addChannelBtn.addEventListener('click', addChannel);
addKeywordBtn.addEventListener('click', addKeyword);
saveConfigBtn.addEventListener('click', saveConfiguration);
restartWhatsAppBtn.addEventListener('click', restartWhatsApp);

// معالجة Enter في حقول الإدخال
newPhoneNumber.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addPhoneNumber();
});

newChannelId.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addChannel();
});

newKeyword.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addKeyword();
});

// تنسيق رقم الهاتف تلقائياً
newPhoneNumber.addEventListener('input', (e) => {
    let value = e.target.value.replace(/[^\d+]/g, '');
    
    if (value && !value.startsWith('+')) {
        value = '+' + value;
    }
    
    e.target.value = value;
});

// دوال المودال
function showHelp() {
    document.getElementById('helpModal').style.display = 'block';
}

function showAbout() {
    showNotification('نظام توجيه تليجرام إلى واتساب - الإصدار 1.0', 'info');
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// إغلاق المودال عند النقر خارجه
window.addEventListener('click', (event) => {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
});

// تحديث دوري للحالة
setInterval(loadSystemStatus, 30000); // كل 30 ثانية

// تحميل الحالة عند بدء التطبيق
window.addEventListener('load', () => {
    loadSystemStatus();
    addLogEntry('تم تحميل لوحة التحكم');
});

// التعامل مع إعادة الاتصال
socket.on('reconnect', () => {
    addLogEntry('تم إعادة الاتصال بالخادم');
    loadSystemStatus();
});

console.log('🚀 لوحة تحكم نظام التوجيه جاهزة!');