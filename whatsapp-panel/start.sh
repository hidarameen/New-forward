#!/bin/bash

# سكريبت تشغيل لوحة تحكم واتساب ويب
# WhatsApp Web Panel Startup Script

echo "🚀 بدء تشغيل لوحة تحكم واتساب ويب..."
echo "🚀 Starting WhatsApp Web Panel..."

# التحقق من وجود Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js غير مثبت. يرجى تثبيت Node.js أولاً"
    echo "❌ Node.js is not installed. Please install Node.js first"
    echo "🔗 https://nodejs.org"
    exit 1
fi

# التحقق من إصدار Node.js
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "⚠️  إصدار Node.js قديم. يُنصح بالإصدار 16 أو أحدث"
    echo "⚠️  Old Node.js version. Version 16 or newer is recommended"
fi

# التحقق من وجود npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm غير مثبت"
    echo "❌ npm is not installed"
    exit 1
fi

echo "✅ Node.js $(node -v) مثبت"
echo "✅ npm $(npm -v) مثبت"

# التحقق من وجود package.json
if [ ! -f "package.json" ]; then
    echo "❌ ملف package.json غير موجود"
    echo "❌ package.json file not found"
    exit 1
fi

# تثبيت التبعيات إذا لم تكن مثبتة
if [ ! -d "node_modules" ]; then
    echo "📦 تثبيت التبعيات..."
    echo "📦 Installing dependencies..."
    npm install
    
    if [ $? -ne 0 ]; then
        echo "❌ فشل في تثبيت التبعيات"
        echo "❌ Failed to install dependencies"
        exit 1
    fi
else
    echo "✅ التبعيات مثبتة مسبقاً"
    echo "✅ Dependencies already installed"
fi

# التحقق من المنافذ المستخدمة
PORT=${PORT:-3000}
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  المنفذ $PORT مستخدم بالفعل"
    echo "⚠️  Port $PORT is already in use"
    echo "💡 يمكنك تغيير المنفذ: PORT=8080 ./start.sh"
    echo "💡 You can change port: PORT=8080 ./start.sh"
    read -p "هل تريد المتابعة؟ (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# إنشاء مجلد الجلسات إذا لم يكن موجوداً
if [ ! -d ".wwebjs_auth" ]; then
    echo "📁 إنشاء مجلد الجلسات..."
    echo "📁 Creating sessions folder..."
    mkdir -p .wwebjs_auth
fi

# عرض معلومات التشغيل
echo ""
echo "════════════════════════════════════════"
echo "🌐 لوحة تحكم واتساب ويب جاهزة للتشغيل"
echo "🌐 WhatsApp Web Panel Ready to Start"
echo "════════════════════════════════════════"
echo "📱 افتح المتصفح على: http://localhost:$PORT"
echo "📱 Open browser at: http://localhost:$PORT"
echo ""
echo "⌨️  اختصارات مفيدة:"
echo "⌨️  Useful shortcuts:"
echo "   Ctrl+C : إيقاف الخادم / Stop server"
echo "   F5     : تحديث الباركود / Refresh QR"
echo ""
echo "🔒 نصائح أمنية:"
echo "🔒 Security tips:"
echo "   • لا تشارك باركود QR مع أحد"
echo "   • Don't share QR code with anyone"
echo "   • قم بقطع الاتصال عند الانتهاء"
echo "   • Disconnect when finished"
echo "════════════════════════════════════════"
echo ""

# بدء الخادم
echo "🚀 تشغيل الخادم..."
echo "🚀 Starting server..."

# التحقق من وضع التطوير
if [ "$1" = "dev" ] || [ "$NODE_ENV" = "development" ]; then
    echo "🔧 وضع التطوير"
    echo "🔧 Development mode"
    if command -v nodemon &> /dev/null; then
        nodemon server.js
    else
        echo "⚠️  nodemon غير مثبت، جاري التثبيت..."
        echo "⚠️  nodemon not installed, installing..."
        npm install -g nodemon
        nodemon server.js
    fi
else
    echo "🏭 وضع الإنتاج"
    echo "🏭 Production mode"
    node server.js
fi