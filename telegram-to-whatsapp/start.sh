#!/bin/bash

# سكريبت تشغيل نظام توجيه تليجرام إلى واتساب
# Telegram to WhatsApp Bridge Startup Script

echo "🌉 ═══════════════════════════════════════"
echo "🌉    نظام توجيه تليجرام ← واتساب"
echo "🌉    Telegram → WhatsApp Bridge"
echo "🌉 ═══════════════════════════════════════"

# ألوان للنص
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# دوال المساعدة
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# التحقق من المتطلبات
check_requirements() {
    print_status "فحص المتطلبات..."
    print_status "Checking requirements..."
    
    # التحقق من Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js غير مثبت"
        print_error "Node.js is not installed"
        echo "🔗 Download: https://nodejs.org"
        exit 1
    fi
    
    # التحقق من إصدار Node.js
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 16 ]; then
        print_warning "إصدار Node.js قديم. يُنصح بالإصدار 16 أو أحدث"
        print_warning "Old Node.js version. Version 16 or newer is recommended"
    fi
    
    # التحقق من npm
    if ! command -v npm &> /dev/null; then
        print_error "npm غير مثبت"
        print_error "npm is not installed"
        exit 1
    fi
    
    # التحقق من Python
    if ! command -v python3 &> /dev/null; then
        print_error "Python 3 غير مثبت"
        print_error "Python 3 is not installed"
        echo "🔗 Download: https://python.org"
        exit 1
    fi
    
    # التحقق من pip
    if ! command -v pip3 &> /dev/null; then
        print_error "pip3 غير مثبت"
        print_error "pip3 is not installed"
        exit 1
    fi
    
    print_success "جميع المتطلبات متوفرة"
    print_success "All requirements met"
    echo "  Node.js: $(node -v)"
    echo "  npm: $(npm -v)"
    echo "  Python: $(python3 --version)"
    echo "  pip: $(pip3 --version | cut -d' ' -f2)"
}

# تثبيت التبعيات
install_dependencies() {
    print_status "تثبيت التبعيات..."
    print_status "Installing dependencies..."
    
    # تبعيات Node.js
    if [ ! -d "node_modules" ]; then
        print_status "تثبيت تبعيات Node.js..."
        print_status "Installing Node.js dependencies..."
        npm install
        
        if [ $? -ne 0 ]; then
            print_error "فشل في تثبيت تبعيات Node.js"
            print_error "Failed to install Node.js dependencies"
            exit 1
        fi
    else
        print_success "تبعيات Node.js مثبتة مسبقاً"
        print_success "Node.js dependencies already installed"
    fi
    
    # تبعيات Python
    print_status "تثبيت تبعيات Python..."
    print_status "Installing Python dependencies..."
    pip3 install -r requirements.txt --quiet
    
    if [ $? -ne 0 ]; then
        print_error "فشل في تثبيت تبعيات Python"
        print_error "Failed to install Python dependencies"
        exit 1
    fi
    
    print_success "تم تثبيت جميع التبعيات بنجاح"
    print_success "All dependencies installed successfully"
}

# التحقق من الإعدادات
check_configuration() {
    print_status "فحص الإعدادات..."
    print_status "Checking configuration..."
    
    # التحقق من ملف .env
    if [ ! -f ".env" ]; then
        print_warning "ملف .env غير موجود، جاري إنشاؤه..."
        print_warning ".env file not found, creating it..."
        
        if [ -f ".env.example" ]; then
            cp .env.example .env
            print_warning "تم إنشاء ملف .env من .env.example"
            print_warning ".env file created from .env.example"
            print_warning "يرجى تحرير ملف .env وإضافة TELEGRAM_BOT_TOKEN"
            print_warning "Please edit .env file and add TELEGRAM_BOT_TOKEN"
            echo ""
            echo "nano .env"
            echo ""
            exit 1
        else
            print_error "ملف .env.example غير موجود"
            print_error ".env.example file not found"
            exit 1
        fi
    fi
    
    # التحقق من توكن البوت
    if ! grep -q "TELEGRAM_BOT_TOKEN=" .env || grep -q "TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here" .env; then
        print_error "TELEGRAM_BOT_TOKEN غير محدد في ملف .env"
        print_error "TELEGRAM_BOT_TOKEN not set in .env file"
        print_warning "احصل على التوكن من @BotFather في تليجرام"
        print_warning "Get the token from @BotFather in Telegram"
        exit 1
    fi
    
    print_success "الإعدادات صحيحة"
    print_success "Configuration is valid"
}

# إنشاء المجلدات الضرورية
create_directories() {
    print_status "إنشاء المجلدات الضرورية..."
    print_status "Creating necessary directories..."
    
    mkdir -p logs
    mkdir -p .wwebjs_auth
    
    print_success "تم إنشاء المجلدات"
    print_success "Directories created"
}

# التحقق من المنافذ
check_ports() {
    PORT=${PORT:-3000}
    
    if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_warning "المنفذ $PORT مستخدم بالفعل"
        print_warning "Port $PORT is already in use"
        
        read -p "هل تريد إيقاف الخدمة العاملة والمتابعة؟ (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            print_status "محاولة إيقاف الخدمة على المنفذ $PORT..."
            lsof -ti:$PORT | xargs kill -9 2>/dev/null
            sleep 2
        else
            print_error "تم إلغاء التشغيل"
            print_error "Startup cancelled"
            exit 1
        fi
    fi
}

# تشغيل النظام
start_system() {
    print_status "بدء تشغيل النظام..."
    print_status "Starting system..."
    
    # تشغيل خادم واتساب في الخلفية
    print_status "تشغيل خادم واتساب..."
    print_status "Starting WhatsApp server..."
    
    # إنشاء ملف pid لتتبع العمليات
    echo $$ > .bridge.pid
    
    # تشغيل Node.js server
    node app.js &
    WHATSAPP_PID=$!
    echo $WHATSAPP_PID > .whatsapp.pid
    
    # انتظار قليل للتأكد من بدء الخادم
    sleep 3
    
    # التحقق من أن الخادم يعمل
    if ! ps -p $WHATSAPP_PID > /dev/null 2>&1; then
        print_error "فشل في تشغيل خادم واتساب"
        print_error "Failed to start WhatsApp server"
        cleanup
        exit 1
    fi
    
    print_success "خادم واتساب يعمل (PID: $WHATSAPP_PID)"
    print_success "WhatsApp server running (PID: $WHATSAPP_PID)"
    
    # انتظار قليل ثم تشغيل بوت تليجرام
    print_status "تشغيل بوت تليجرام..."
    print_status "Starting Telegram bot..."
    
    sleep 2
    python3 telegram_bot.py &
    TELEGRAM_PID=$!
    echo $TELEGRAM_PID > .telegram.pid
    
    # التحقق من أن البوت يعمل
    sleep 2
    if ! ps -p $TELEGRAM_PID > /dev/null 2>&1; then
        print_error "فشل في تشغيل بوت تليجرام"
        print_error "Failed to start Telegram bot"
        cleanup
        exit 1
    fi
    
    print_success "بوت تليجرام يعمل (PID: $TELEGRAM_PID)"
    print_success "Telegram bot running (PID: $TELEGRAM_PID)"
}

# تنظيف العمليات
cleanup() {
    print_status "تنظيف العمليات..."
    print_status "Cleaning up processes..."
    
    if [ -f ".whatsapp.pid" ]; then
        WHATSAPP_PID=$(cat .whatsapp.pid)
        if ps -p $WHATSAPP_PID > /dev/null 2>&1; then
            kill $WHATSAPP_PID 2>/dev/null
            print_status "تم إيقاف خادم واتساب"
            print_status "WhatsApp server stopped"
        fi
        rm -f .whatsapp.pid
    fi
    
    if [ -f ".telegram.pid" ]; then
        TELEGRAM_PID=$(cat .telegram.pid)
        if ps -p $TELEGRAM_PID > /dev/null 2>&1; then
            kill $TELEGRAM_PID 2>/dev/null
            print_status "تم إيقاف بوت تليجرام"
            print_status "Telegram bot stopped"
        fi
        rm -f .telegram.pid
    fi
    
    rm -f .bridge.pid
}

# معالج الإشارات
signal_handler() {
    echo ""
    print_status "تم استلام إشارة الإيقاف..."
    print_status "Stop signal received..."
    cleanup
    print_success "تم إيقاف النظام بأمان"
    print_success "System stopped safely"
    exit 0
}

# ربط معالج الإشارات
trap signal_handler SIGINT SIGTERM

# عرض معلومات النظام
show_system_info() {
    echo ""
    echo "🌐 ═══════════════════════════════════════"
    echo "🌐    معلومات النظام | System Info"
    echo "🌐 ═══════════════════════════════════════"
    echo "📱 لوحة التحكم | Control Panel:"
    echo "   http://localhost:${PORT:-3000}"
    echo ""
    echo "📊 API الحالة | Status API:"
    echo "   http://localhost:${PORT:-3000}/api/status"
    echo ""
    echo "📝 ملفات السجلات | Log Files:"
    echo "   logs/telegram_bot.log"
    echo "   logs/system.log"
    echo ""
    echo "⌨️  اختصارات مفيدة | Useful Commands:"
    echo "   Ctrl+C : إيقاف النظام | Stop System"
    echo "   tail -f logs/telegram_bot.log : مراقبة سجلات تليجرام"
    echo "   tail -f logs/system.log : مراقبة سجلات النظام"
    echo ""
    echo "🔧 استكشاف الأخطاء | Troubleshooting:"
    echo "   curl http://localhost:${PORT:-3000}/api/status"
    echo "   ps aux | grep -E '(node|python)'"
    echo ""
    echo "🛑 لإيقاف النظام | To Stop System:"
    echo "   pkill -f 'node app.js'"
    echo "   pkill -f 'python3 telegram_bot.py'"
    echo "═══════════════════════════════════════"
    echo ""
}

# البدء الرئيسي
main() {
    # فحص المعاملات
    case "${1:-start}" in
        "start")
            check_requirements
            install_dependencies
            check_configuration
            create_directories
            check_ports
            start_system
            show_system_info
            
            # انتظار حتى الإيقاف
            print_success "النظام يعمل بنجاح!"
            print_success "System running successfully!"
            print_status "اضغط Ctrl+C للإيقاف"
            print_status "Press Ctrl+C to stop"
            
            # مراقبة العمليات
            while true; do
                # التحقق من خادم واتساب
                if [ -f ".whatsapp.pid" ]; then
                    WHATSAPP_PID=$(cat .whatsapp.pid)
                    if ! ps -p $WHATSAPP_PID > /dev/null 2>&1; then
                        print_error "خادم واتساب توقف بشكل غير متوقع"
                        print_error "WhatsApp server stopped unexpectedly"
                        cleanup
                        exit 1
                    fi
                fi
                
                # التحقق من بوت تليجرام
                if [ -f ".telegram.pid" ]; then
                    TELEGRAM_PID=$(cat .telegram.pid)
                    if ! ps -p $TELEGRAM_PID > /dev/null 2>&1; then
                        print_warning "بوت تليجرام توقف، جاري إعادة التشغيل..."
                        print_warning "Telegram bot stopped, restarting..."
                        python3 telegram_bot.py &
                        TELEGRAM_PID=$!
                        echo $TELEGRAM_PID > .telegram.pid
                    fi
                fi
                
                sleep 10
            done
            ;;
            
        "stop")
            print_status "إيقاف النظام..."
            print_status "Stopping system..."
            cleanup
            print_success "تم إيقاف النظام"
            print_success "System stopped"
            ;;
            
        "restart")
            print_status "إعادة تشغيل النظام..."
            print_status "Restarting system..."
            cleanup
            sleep 2
            $0 start
            ;;
            
        "status")
            print_status "فحص حالة النظام..."
            print_status "Checking system status..."
            
            if [ -f ".whatsapp.pid" ]; then
                WHATSAPP_PID=$(cat .whatsapp.pid)
                if ps -p $WHATSAPP_PID > /dev/null 2>&1; then
                    print_success "خادم واتساب يعمل (PID: $WHATSAPP_PID)"
                    print_success "WhatsApp server running (PID: $WHATSAPP_PID)"
                else
                    print_error "خادم واتساب متوقف"
                    print_error "WhatsApp server stopped"
                fi
            else
                print_error "خادم واتساب غير مُشغل"
                print_error "WhatsApp server not running"
            fi
            
            if [ -f ".telegram.pid" ]; then
                TELEGRAM_PID=$(cat .telegram.pid)
                if ps -p $TELEGRAM_PID > /dev/null 2>&1; then
                    print_success "بوت تليجرام يعمل (PID: $TELEGRAM_PID)"
                    print_success "Telegram bot running (PID: $TELEGRAM_PID)"
                else
                    print_error "بوت تليجرام متوقف"
                    print_error "Telegram bot stopped"
                fi
            else
                print_error "بوت تليجرام غير مُشغل"
                print_error "Telegram bot not running"
            fi
            ;;
            
        "help"|"-h"|"--help")
            echo "الاستخدام | Usage:"
            echo "  $0 [start|stop|restart|status|help]"
            echo ""
            echo "الأوامر | Commands:"
            echo "  start    - تشغيل النظام (افتراضي) | Start system (default)"
            echo "  stop     - إيقاف النظام | Stop system"  
            echo "  restart  - إعادة تشغيل النظام | Restart system"
            echo "  status   - فحص حالة النظام | Check system status"
            echo "  help     - عرض هذه المساعدة | Show this help"
            ;;
            
        *)
            print_error "أمر غير معروف: $1"
            print_error "Unknown command: $1"
            echo "استخدم '$0 help' للمساعدة"
            echo "Use '$0 help' for help"
            exit 1
            ;;
    esac
}

# تشغيل البرنامج الرئيسي
main "$@"