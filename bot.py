#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
بوت تلقرام بسيط يرسل رسالة ترحيب
Simple Telegram bot that sends a welcome message
"""

import os
import logging
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes
from dotenv import load_dotenv

# تحميل متغيرات البيئة من ملف .env
load_dotenv()

# تفعيل التسجيل
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# رسالة الترحيب
WELCOME_MESSAGE = """
🌟 أهلاً وسهلاً بك! 🌟

مرحباً بك في بوتنا الترحيبي!
نحن سعداء لوجودك هنا.

✨ هذا البوت يرحب بك فقط ✨

Welcome to our bot! 
We're happy to have you here! 🎉
"""

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """إرسال رسالة الترحيب عند استخدام أمر /start"""
    user = update.effective_user
    logger.info(f"User {user.first_name} started the bot")
    
    await update.message.reply_text(
        WELCOME_MESSAGE,
        parse_mode='HTML'
    )

async def welcome_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """إرسال رسالة الترحيب لأي رسالة أخرى"""
    user = update.effective_user
    logger.info(f"User {user.first_name} sent a message")
    
    await update.message.reply_text(
        WELCOME_MESSAGE,
        parse_mode='HTML'
    )

async def error_handler(update: object, context: ContextTypes.DEFAULT_TYPE) -> None:
    """معالج الأخطاء"""
    logger.error(msg="Exception while handling an update:", exc_info=context.error)

def main() -> None:
    """تشغيل البوت"""
    # الحصول على توكن البوت من متغيرات البيئة
    token = os.getenv('BOT_TOKEN')
    if not token:
        logger.error("BOT_TOKEN environment variable is not set!")
        return
    
    # إنشاء التطبيق
    application = Application.builder().token(token).build()
    
    # إضافة معالجات الأوامر والرسائل
    application.add_handler(CommandHandler("start", start))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, welcome_message))
    
    # إضافة معالج الأخطاء
    application.add_error_handler(error_handler)
    
    # تشغيل البوت
    logger.info("Starting bot...")
    application.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == '__main__':
    main()