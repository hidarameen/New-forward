#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
عرض توضيحي لرسالة الترحيب
Demo of the welcome message
"""

# رسالة الترحيب نفسها المستخدمة في البوت
WELCOME_MESSAGE = """
🌟 أهلاً وسهلاً بك! 🌟

مرحباً بك في بوتنا الترحيبي!
نحن سعداء لوجودك هنا.

✨ هذا البوت يرحب بك فقط ✨

Welcome to our bot! 
We're happy to have you here! 🎉
"""

def main():
    """عرض رسالة الترحيب"""
    print("=" * 50)
    print("🤖 عرض توضيحي لبوت تلقرام الترحيبي")
    print("🤖 Telegram Welcome Bot Demo")
    print("=" * 50)
    
    print("\nهذه هي الرسالة التي سيرسلها البوت:")
    print("This is the message the bot will send:")
    print("-" * 30)
    print(WELCOME_MESSAGE)
    print("-" * 30)
    
    print("\n💡 لتشغيل البوت الحقيقي:")
    print("💡 To run the actual bot:")
    print("1. احصل على توكن من @BotFather")
    print("   Get a token from @BotFather")
    print("2. أضف التوكن في ملف .env")
    print("   Add the token to .env file")
    print("3. نفذ: python bot.py")
    print("   Run: python bot.py")

if __name__ == '__main__':
    main()