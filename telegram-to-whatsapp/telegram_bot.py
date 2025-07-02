#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
بوت تليجرام لمراقبة القنوات وتوجيه الرسائل إلى واتساب
Telegram bot to monitor channels and forward messages to WhatsApp
"""

import os
import json
import asyncio
import logging
import aiohttp
from datetime import datetime
from telegram import Update
from telegram.ext import Application, MessageHandler, filters, ContextTypes
from dotenv import load_dotenv

# تحميل متغيرات البيئة
load_dotenv()

# إعداد التسجيل
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO,
    handlers=[
        logging.FileHandler('logs/telegram_bot.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class TelegramForwardingBot:
    def __init__(self):
        self.bot_token = os.getenv('TELEGRAM_BOT_TOKEN')
        self.whatsapp_api_url = os.getenv('WHATSAPP_API_URL', 'http://localhost:3000/api/forward')
        self.config_file = 'config.json'
        self.stats_file = 'telegram_stats.json'
        
        # إعدادات البوت
        self.config = {
            'enabled': False,
            'monitored_channels': [],
            'keywords_filter': [],
            'message_delay': 1,  # ثواني بين الرسائل
            'max_message_length': 4000
        }
        
        # إحصائيات البوت
        self.stats = {
            'messages_received': 0,
            'messages_forwarded': 0,
            'messages_filtered': 0,
            'errors': 0,
            'last_activity': None
        }
        
        self.load_config()
        self.load_stats()

    def load_config(self):
        """تحميل إعدادات البوت"""
        try:
            if os.path.exists(self.config_file):
                with open(self.config_file, 'r', encoding='utf-8') as f:
                    file_config = json.load(f)
                    # تحديث إعدادات تليجرام فقط
                    if 'telegram' in file_config:
                        self.config.update(file_config['telegram'])
                    logger.info('✅ تم تحميل إعدادات تليجرام')
        except Exception as e:
            logger.warning(f'⚠️ خطأ في تحميل الإعدادات: {e}')

    def save_config(self):
        """حفظ إعدادات البوت"""
        try:
            # قراءة الإعدادات الحالية
            current_config = {}
            if os.path.exists(self.config_file):
                with open(self.config_file, 'r', encoding='utf-8') as f:
                    current_config = json.load(f)
            
            # تحديث قسم تليجرام
            current_config['telegram'] = self.config
            
            # حفظ الإعدادات
            with open(self.config_file, 'w', encoding='utf-8') as f:
                json.dump(current_config, f, ensure_ascii=False, indent=2)
            logger.info('✅ تم حفظ إعدادات تليجرام')
        except Exception as e:
            logger.error(f'❌ خطأ في حفظ الإعدادات: {e}')

    def load_stats(self):
        """تحميل إحصائيات البوت"""
        try:
            if os.path.exists(self.stats_file):
                with open(self.stats_file, 'r', encoding='utf-8') as f:
                    self.stats.update(json.load(f))
        except Exception as e:
            logger.warning(f'⚠️ خطأ في تحميل الإحصائيات: {e}')

    def save_stats(self):
        """حفظ إحصائيات البوت"""
        try:
            with open(self.stats_file, 'w', encoding='utf-8') as f:
                json.dump(self.stats, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.error(f'❌ خطأ في حفظ الإحصائيات: {e}')

    def should_forward_message(self, message_text: str) -> bool:
        """تحديد ما إذا كان يجب توجيه الرسالة"""
        if not self.config.get('enabled', False):
            return False
        
        # فلترة الكلمات المفتاحية
        keywords = self.config.get('keywords_filter', [])
        if keywords:
            message_lower = message_text.lower()
            for keyword in keywords:
                if keyword.lower() in message_lower:
                    return True
            return False
        
        # إذا لم تكن هناك كلمات مفتاحية، توجيه جميع الرسائل
        return True

    def format_message(self, message_text: str, channel_name: str) -> str:
        """تنسيق الرسالة قبل الإرسال"""
        # قطع الرسالة إذا كانت طويلة جداً
        max_length = self.config.get('max_message_length', 4000)
        if len(message_text) > max_length:
            message_text = message_text[:max_length] + '...'
        
        return message_text

    async def forward_to_whatsapp(self, message_data: dict) -> bool:
        """إرسال الرسالة إلى واتساب عبر API"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.whatsapp_api_url,
                    json=message_data,
                    headers={'Content-Type': 'application/json'},
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as response:
                    result = await response.json()
                    
                    if response.status == 200 and result.get('success'):
                        logger.info(f'✅ تم توجيه الرسالة من {message_data.get("channelName", "قناة غير معروفة")}')
                        self.stats['messages_forwarded'] += 1
                        return True
                    else:
                        logger.error(f'❌ فشل توجيه الرسالة: {result.get("message", "خطأ غير معروف")}')
                        self.stats['errors'] += 1
                        return False
                        
        except Exception as e:
            logger.error(f'❌ خطأ في الاتصال بـ API واتساب: {e}')
            self.stats['errors'] += 1
            return False

    async def handle_channel_message(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """معالجة رسائل القنوات"""
        try:
            if not update.channel_post:
                return

            message = update.channel_post
            
            # تحديث الإحصائيات
            self.stats['messages_received'] += 1
            self.stats['last_activity'] = datetime.now().isoformat()

            # الحصول على معلومات القناة
            chat = message.chat
            channel_id = str(chat.id)
            channel_name = chat.title or f"قناة {channel_id}"

            # التحقق من أن القناة مراقبة
            monitored_channels = self.config.get('monitored_channels', [])
            if monitored_channels and channel_id not in monitored_channels:
                logger.debug(f'تجاهل رسالة من قناة غير مراقبة: {channel_name}')
                return

            # الحصول على نص الرسالة
            message_text = message.text or message.caption or ''
            
            if not message_text:
                logger.debug('تجاهل رسالة بدون نص')
                return

            # فلترة الرسالة
            if not self.should_forward_message(message_text):
                logger.info(f'تم فلترة رسالة من {channel_name}')
                self.stats['messages_filtered'] += 1
                self.save_stats()
                return

            # تنسيق الرسالة
            formatted_message = self.format_message(message_text, channel_name)

            # إعداد بيانات الرسالة
            message_data = {
                'text': formatted_message,
                'channelName': channel_name,
                'channelId': channel_id,
                'messageId': message.message_id,
                'timestamp': datetime.now().isoformat()
            }

            logger.info(f'📨 رسالة جديدة من {channel_name}: {formatted_message[:100]}...')

            # توجيه الرسالة إلى واتساب
            success = await self.forward_to_whatsapp(message_data)
            
            if success:
                logger.info(f'✅ تم توجيه الرسالة بنجاح من {channel_name}')
            else:
                logger.error(f'❌ فشل توجيه الرسالة من {channel_name}')

            # حفظ الإحصائيات
            self.save_stats()

            # تأخير بين الرسائل
            delay = self.config.get('message_delay', 1)
            if delay > 0:
                await asyncio.sleep(delay)

        except Exception as e:
            logger.error(f'❌ خطأ في معالجة رسالة القناة: {e}')
            self.stats['errors'] += 1
            self.save_stats()

    async def handle_private_message(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """معالجة الرسائل الخاصة"""
        try:
            if not update.message:
                return

            user = update.effective_user
            message_text = update.message.text

            logger.info(f'📩 رسالة خاصة من {user.first_name}: {message_text}')

            # رسائل التحكم
            if message_text == '/start':
                welcome_text = """
🤖 مرحباً بك في بوت توجيه تليجرام إلى واتساب!

📋 الأوامر المتاحة:
/status - حالة البوت
/stats - الإحصائيات
/help - المساعدة

📊 حالة التوجيه: """ + ('✅ مفعل' if self.config.get('enabled') else '❌ معطل')

                await update.message.reply_text(welcome_text)

            elif message_text == '/status':
                status_text = f"""
📊 حالة البوت:

🔘 التوجيه: {'✅ مفعل' if self.config.get('enabled') else '❌ معطل'}
📺 القنوات المراقبة: {len(self.config.get('monitored_channels', []))}
🔍 كلمات الفلترة: {len(self.config.get('keywords_filter', []))}
⏱️ آخر نشاط: {self.stats.get('last_activity', 'لا يوجد')}
"""
                await update.message.reply_text(status_text)

            elif message_text == '/stats':
                stats_text = f"""
📈 إحصائيات البوت:

📨 الرسائل المستلمة: {self.stats.get('messages_received', 0)}
📤 الرسائل المُوجهة: {self.stats.get('messages_forwarded', 0)}
🚫 الرسائل المفلترة: {self.stats.get('messages_filtered', 0)}
❌ الأخطاء: {self.stats.get('errors', 0)}
"""
                await update.message.reply_text(stats_text)

            elif message_text == '/help':
                help_text = """
📘 دليل استخدام البوت:

1️⃣ إضافة البوت كمشرف في القناة المراد مراقبتها
2️⃣ تفعيل التوجيه من لوحة التحكم
3️⃣ إعداد أرقام واتساب المستهدفة
4️⃣ (اختياري) إعداد كلمات فلترة

🌐 لوحة التحكم: http://localhost:3000
📞 للدعم: راجع الدليل في README.md
"""
                await update.message.reply_text(help_text)

            else:
                await update.message.reply_text(
                    '❓ أمر غير معروف. استخدم /help للمساعدة.'
                )

        except Exception as e:
            logger.error(f'❌ خطأ في معالجة الرسالة الخاصة: {e}')

    async def error_handler(self, update: object, context: ContextTypes.DEFAULT_TYPE):
        """معالج الأخطاء"""
        logger.error(f'❌ خطأ في البوت: {context.error}')
        self.stats['errors'] += 1
        self.save_stats()

    def run(self):
        """تشغيل البوت"""
        if not self.bot_token:
            logger.error('❌ TELEGRAM_BOT_TOKEN غير محدد في متغيرات البيئة')
            return

        # إنشاء التطبيق
        application = Application.builder().token(self.bot_token).build()

        # إضافة معالجات الرسائل
        application.add_handler(
            MessageHandler(filters.TEXT & filters.ChatType.CHANNEL, self.handle_channel_message)
        )
        application.add_handler(
            MessageHandler(filters.TEXT & filters.ChatType.PRIVATE, self.handle_private_message)
        )

        # إضافة معالج الأخطاء
        application.add_error_handler(self.error_handler)

        # بدء البوت
        logger.info('🚀 بدء تشغيل بوت تليجرام...')
        logger.info(f'🔗 API واتساب: {self.whatsapp_api_url}')
        logger.info(f'📊 التوجيه: {"✅ مفعل" if self.config.get("enabled") else "❌ معطل"}')
        
        application.run_polling(allowed_updates=Update.ALL_TYPES)

def main():
    """نقطة البداية الرئيسية"""
    print('🤖 بوت توجيه تليجرام إلى واتساب')
    print('🤖 Telegram to WhatsApp Forwarding Bot')
    print('=' * 50)
    
    # إنشاء مجلدات ضرورية
    os.makedirs('logs', exist_ok=True)
    
    # إنشاء وتشغيل البوت
    bot = TelegramForwardingBot()
    
    try:
        bot.run()
    except KeyboardInterrupt:
        logger.info('🛑 تم إيقاف البوت بواسطة المستخدم')
        bot.save_stats()
    except Exception as e:
        logger.error(f'❌ خطأ في تشغيل البوت: {e}')
        bot.save_stats()

if __name__ == '__main__':
    main()