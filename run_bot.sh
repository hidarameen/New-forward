#!/bin/bash

# سكريبت لتشغيل بوت تلقرام
# Script to run the Telegram bot

echo "🤖 بدء تشغيل بوت تلقرام الترحيبي..."
echo "🤖 Starting Telegram Welcome Bot..."

# التحقق من وجود Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 غير مثبت"
    echo "❌ Python 3 is not installed"
    exit 1
fi

# التحقق من وجود pip
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 غير مثبت"
    echo "❌ pip3 is not installed"
    exit 1
fi

# التحقق من وجود ملف البيئة
if [ ! -f ".env" ]; then
    echo "⚠️  ملف .env غير موجود. يتم إنشاؤه..."
    echo "⚠️  .env file not found. Creating it..."
    cp .env.example .env
    echo "✅ تم إنشاء ملف .env. يرجى إضافة توكن البوت فيه"
    echo "✅ .env file created. Please add your bot token to it"
    exit 1
fi

# تثبيت المتطلبات
echo "📦 تثبيت المتطلبات..."
echo "📦 Installing requirements..."
pip3 install -r requirements.txt

# تشغيل البوت
echo "🚀 تشغيل البوت..."
echo "🚀 Starting bot..."
python3 bot.py