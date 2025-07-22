#!/bin/bash

echo "🚀 Установка зависимостей для CLI интерфейса..."

# Проверяем наличие npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm не установлен!"
    echo "Установите Node.js с https://nodejs.org/"
    exit 1
fi

# Основные зависимости для парсера
echo "📦 Установка основных зависимостей..."
npm install axios cli-progress puppeteer

# CLI зависимости (правильные версии)
echo "🎨 Установка CLI зависимостей..."
npm install inquirer@8.2.6 ora@5.4.1 figlet@1.6.0 boxen@5.1.2

# Пробуем установить chalk v4 (совместимая версия)
echo "🎨 Установка chalk (версия 4 для совместимости)..."
npm install chalk@4.1.2

# Альтернативно, можно установить более новые версии с исправленным кодом
echo "🔄 Установка альтернативных версий..."
npm install ora@6.3.0 figlet@1.6.0 boxen@6.2.1

echo ""
echo "✅ Все зависимости установлены!"
echo ""
echo "🎮 Запуск CLI:"
echo "   node cli-parser-simple.js    # Простая версия (без chalk)"
echo "   node cli-parser.js           # Полная версия (с chalk)"
echo "   ./start-cli.sh               # Через скрипт" 