// إعداد Socket.IO
const socket = io();

// عناصر DOM
const statusIndicator = document.getElementById('statusIndicator');
const statusDot = statusIndicator.querySelector('.status-dot');
const statusText = statusIndicator.querySelector('.status-text');
const qrSection = document.getElementById('qrSection');
const qrPlaceholder = document.getElementById('qrPlaceholder');
const qrCode = document.getElementById('qrCode');
const loginSuccess = document.getElementById('loginSuccess');
const userInfo = document.getElementById('userInfo');
const messageSection = document.getElementById('messageSection');
const refreshQrBtn = document.getElementById('refreshQr');
const disconnectBtn = document.getElementById('disconnectBtn');
const messageForm = document.getElementById('messageForm');
const phoneNumberInput = document.getElementById('phoneNumber');
const messageTextInput = document.getElementById('messageText');
const notificationsContainer = document.getElementById('notifications');

// حالة التطبيق
let isConnected = false;
let currentClientInfo = null;

// دوال المساعدة
function updateStatus(connected, text) {
    isConnected = connected;
    statusDot.classList.toggle('connected', connected);
    statusText.textContent = text;
}

function showNotification(message, type = 'info', duration = 5000) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    notificationsContainer.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, duration);
}

function showQrSection() {
    qrSection.style.display = 'block';
    loginSuccess.style.display = 'none';
    messageSection.style.display = 'none';
}

function showLoginSuccess(clientInfo) {
    qrSection.style.display = 'none';
    loginSuccess.style.display = 'block';
    messageSection.style.display = 'block';
    
    // عرض معلومات المستخدم
    userInfo.innerHTML = `
        <div class="user-detail">
            <i class="fas fa-user"></i>
            <span><strong>الاسم:</strong> ${clientInfo.name || 'غير محدد'}</span>
        </div>
        <div class="user-detail">
            <i class="fas fa-phone"></i>
            <span><strong>الرقم:</strong> ${clientInfo.number || 'غير محدد'}</span>
        </div>
        <div class="user-detail">
            <i class="fas fa-desktop"></i>
            <span><strong>المنصة:</strong> ${clientInfo.platform || 'غير محدد'}</span>
        </div>
    `;
}

function resetQrDisplay() {
    qrCode.style.display = 'none';
    qrPlaceholder.style.display = 'flex';
    qrPlaceholder.innerHTML = `
        <i class="fas fa-mobile-alt"></i>
        <p>جاري تحضير باركود QR...</p>
        <div class="loading-spinner">
            <div class="spinner"></div>
        </div>
    `;
}

// معالجات أحداث Socket.IO
socket.on('connect', () => {
    console.log('متصل بالخادم');
    showNotification('تم الاتصال بالخادم بنجاح', 'success');
});

socket.on('disconnect', () => {
    console.log('انقطع الاتصال مع الخادم');
    updateStatus(false, 'انقطع الاتصال مع الخادم');
    showNotification('انقطع الاتصال مع الخادم', 'error');
});

socket.on('qr', (data) => {
    console.log('تم استلام باركود QR');
    updateStatus(false, 'في انتظار المسح');
    
    qrCode.src = data.qrCode;
    qrCode.style.display = 'block';
    qrPlaceholder.style.display = 'none';
    
    showNotification(data.message || 'تم توليد باركود جديد', 'info');
});

socket.on('ready', (data) => {
    console.log('العميل جاهز:', data);
    updateStatus(true, 'متصل');
    currentClientInfo = data.clientInfo;
    
    showLoginSuccess(data.clientInfo);
    showNotification(data.message || 'تم تسجيل الدخول بنجاح!', 'success');
});

socket.on('disconnected', (data) => {
    console.log('تم قطع الاتصال:', data);
    updateStatus(false, 'غير متصل');
    currentClientInfo = null;
    
    showQrSection();
    resetQrDisplay();
    showNotification(data.message || 'تم قطع الاتصال', 'error');
});

socket.on('auth_failure', (data) => {
    console.log('فشل المصادقة:', data);
    updateStatus(false, 'فشل المصادقة');
    showNotification(data.message || 'فشل في المصادقة', 'error');
    
    // إعادة تحضير الباركود
    setTimeout(() => {
        resetQrDisplay();
        socket.emit('start_session');
    }, 3000);
});

socket.on('session_starting', (data) => {
    console.log('بدء جلسة جديدة');
    updateStatus(false, 'جاري بدء الجلسة...');
    resetQrDisplay();
    showQrSection();
    showNotification(data.message || 'جاري بدء جلسة جديدة...', 'info');
});

socket.on('message_sent', (data) => {
    showNotification(data.message || 'تم إرسال الرسالة بنجاح!', 'success');
    messageForm.reset();
});

socket.on('error', (data) => {
    console.error('خطأ:', data);
    showNotification(data.message || 'حدث خطأ غير متوقع', 'error');
});

// معالجات الأحداث
refreshQrBtn.addEventListener('click', () => {
    console.log('تحديث الباركود');
    resetQrDisplay();
    socket.emit('start_session');
    showNotification('جاري تحديث الباركود...', 'info');
});

disconnectBtn.addEventListener('click', () => {
    if (confirm('هل أنت متأكد من قطع الاتصال؟')) {
        socket.emit('disconnect_session');
        showNotification('جاري قطع الاتصال...', 'info');
    }
});

messageForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const phoneNumber = phoneNumberInput.value.trim();
    const messageText = messageTextInput.value.trim();
    
    if (!phoneNumber || !messageText) {
        showNotification('يرجى ملء جميع الحقول', 'error');
        return;
    }
    
    if (!isConnected) {
        showNotification('يجب تسجيل الدخول أولاً', 'error');
        return;
    }
    
    // تنسيق رقم الهاتف
    const cleanNumber = phoneNumber.replace(/[^\d+]/g, '');
    
    if (cleanNumber.length < 10) {
        showNotification('رقم الهاتف غير صحيح', 'error');
        return;
    }
    
    socket.emit('send_test_message', {
        number: cleanNumber,
        message: messageText
    });
    
    showNotification('جاري إرسال الرسالة...', 'info');
});

// تنسيق رقم الهاتف تلقائياً
phoneNumberInput.addEventListener('input', (e) => {
    let value = e.target.value.replace(/[^\d+]/g, '');
    
    // إضافة + في البداية إذا لم تكن موجودة
    if (value && !value.startsWith('+')) {
        value = '+' + value;
    }
    
    e.target.value = value;
});

// تحديد النص في الحقول عند التركيز
phoneNumberInput.addEventListener('focus', () => {
    phoneNumberInput.select();
});

messageTextInput.addEventListener('focus', () => {
    messageTextInput.select();
});

// اختصارات لوحة المفاتيح
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Enter لإرسال الرسالة
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (messageSection.style.display !== 'none') {
            messageForm.dispatchEvent(new Event('submit'));
        }
    }
    
    // F5 لتحديث الباركود
    if (e.key === 'F5' && qrSection.style.display !== 'none') {
        e.preventDefault();
        refreshQrBtn.click();
    }
});

// التحقق من حالة الاتصال عند تحميل الصفحة
window.addEventListener('load', () => {
    fetch('/api/status')
        .then(response => response.json())
        .then(data => {
            if (data.isReady && data.clientInfo) {
                updateStatus(true, 'متصل');
                currentClientInfo = data.clientInfo;
                showLoginSuccess(data.clientInfo);
            } else {
                showQrSection();
                resetQrDisplay();
            }
        })
        .catch(error => {
            console.error('خطأ في جلب الحالة:', error);
            showQrSection();
            resetQrDisplay();
        });
});

// منع إعادة تحميل الصفحة عند إرسال النماذج
document.addEventListener('submit', (e) => {
    e.preventDefault();
});

// تأثيرات بصرية إضافية
document.addEventListener('DOMContentLoaded', () => {
    // إضافة تأثير التموج للأزرار
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(button => {
        button.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                left: ${x}px;
                top: ${y}px;
                background: rgba(255, 255, 255, 0.3);
                border-radius: 50%;
                pointer-events: none;
                animation: ripple 0.6s ease-out;
            `;
            
            this.style.position = 'relative';
            this.style.overflow = 'hidden';
            this.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
    
    // إضافة تأثير CSS للتموج
    const style = document.createElement('style');
    style.textContent = `
        @keyframes ripple {
            from {
                transform: scale(0);
                opacity: 1;
            }
            to {
                transform: scale(2);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
});

console.log('🚀 لوحة تحكم واتساب ويب جاهزة!');