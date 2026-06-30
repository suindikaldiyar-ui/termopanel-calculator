# Термопанель — калькулятор фасада + AI-визуализация

Pitch-MVP: расчёт сметы термопанельного фасада из травертина и AI-визуализация дома (Gemini).

## Стек
- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- AI-визуализация: Google Gemini (`gemini-3.1-flash-image`), роут `/api/visualize` (`runtime = "nodejs"`)
- Деплой: Vercel

## Запуск
```bash
npm install
cp .env.local.example .env.local   # вставьте GEMINI_API_KEY
npm run dev
```
Откройте http://localhost:3000

## Переменные окружения
| Переменная | Описание |
|---|---|
| `GEMINI_API_KEY` | Ключ Google Gemini (https://aistudio.google.com/apikey) |
| `GEMINI_IMAGE_MODEL` | Модель генерации (по умолчанию `gemini-3.1-flash-image`) |

> Калькулятор работает без ключа. Ключ нужен только для AI-визуализации.

## Калькулятор — нормы расхода (зафиксированы)
- Клей: 1 мешок 25 кг = 8 м²
- Травертин: 20 кг = 1 ведро = 10 м²
- Лак: 10 кг = 66 м²
- Обрамление: 1 окно = 8 м
- Затирка — 🎁 бонус (бесплатно)

Термопанель — 3200 тг/м² (задано). Остальные цены редактируются вживую
в панели «Настройка цен». Смету можно распечатать / сохранить (`window.print`).

## Структура
```
app/
  layout.tsx            шрифт Manrope, метаданные
  page.tsx              главная: header + 2 колонки + визуализация
  globals.css           тема, печать
  api/visualize/route.ts  Gemini (nodejs runtime)
components/
  ParamsPanel.tsx       инпуты + настройка цен
  PriceSettings.tsx     раскрывающаяся панель цен
  EstimatePanel.tsx     смета + итого + печать
  Visualizer.tsx        загрузка фото, палитра, генерация
lib/
  calc.ts               формулы и нормы
  textures.ts           каталог цветов травертина
  image.ts              сжатие фото через canvas
```

## Деплой на Vercel
Приложение лежит в подпапке `termopanel-calculator/`. В настройках проекта Vercel
**Root Directory** должен быть = `termopanel-calculator`. `vercel.json` задаёт
framework-хинт (`nextjs`), но Root Directory настраивается только в дашборде.

<!-- redeploy: fix vercel deploy (framework hint + trigger) -->
