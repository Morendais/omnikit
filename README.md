# OmniKit Tools - Zero-Knowledge Client-Side Web Utilities

A collection of 34 high-performance client-side browser utilities, converters, and hardware diagnostics.
100% in-browser processing. Zero server compute. Zero data leakage.

[English](#english) | [Russian](#russian)

---

<a name="english"></a>
## English

### Overview

OmniKit Tools is an open-source library of standalone client-side JavaScript modules designed for secure, in-browser data processing. Every operation executes entirely on the user's device via native browser APIs (HTML5 Canvas, Web Audio API, Web Crypto API, MediaDevices, and Web Workers).

Files and inputs never leave the client environment.

### Privacy and Architecture

- Zero Network Uploads: File conversions and data parsing occur in client RAM.
- Verifiable: Open DevTools Network tab during operations; zero upload requests are dispatched.
- Offline-First: All computation logic is self-contained.
- No Tracking: Pure algorithm implementations without analytics or keystroke logging.

### Modules Directory

| Module | File | Capabilities |
| :--- | :--- | :--- |
| Image Processing | tools/image-tools.js | Image conversion (PNG, JPG, WebP), lossy/lossless image compression, dimension resizing, EXIF metadata stripping. |
| Media and Creativity | tools/media-creative.js | Watermark engine with typography layers and canvas composition, SVG to PNG/ICO rasterizer with XSS sanitization. |
| Background Removal | tools/bg-remover.js | Client-side edge detection, color distance segmentation, transparent PNG export. |
| Favicon Studio | tools/favicon-studio.js | Multi-resolution ICO generator (16x16, 32x32, 48x48) and PNG favicon builder. |
| PDF Suite | tools/pdf-suite.js | PDF merging, page splitting, PDF-to-image rendering via PDF.js. |
| Images to PDF | tools/media-extended.js | Multi-image compilation into formatted PDF documents with configurable margins and orientation. |
| Hardware Diagnostics | tools/hardware-tools.js | Microphone test (Web Audio frequency and decibel analyzer), Webcam test (resolution, frame rate, mirror), Keyboard test (104-key state matrix and stuck key detection), Mouse test (click velocity, scroll delta, double-click chatter fault detection). |
| Developer Utilities | tools/dev-tools.js | JSON formatting and tree validation, JWT decoder (header/payload/signature base64url parsing), Base64 UTF-8 encoder/decoder, Cryptographic hashing (SHA-256, SHA-512, SHA-1, MD5), RegEx live tester, CSV to JSON (RFC 4180 parser). |
| Text Processing | tools/text-tools.js | Word and character counter with social media limit indicators, Case converter (camelCase, snake_case, kebab-case, Title Case), Diff checker, Transliteration and URL slug generation. |
| LLM Token Counter | tools/token-tool.js | Multi-model token estimation (GPT-5, Claude Opus/Sonnet, DeepSeek) with cost calculation. |
| Text Editor | tools/txt-editor.js | In-memory text manipulation, duplicate line removal, line sorting, whitespace normalization. |
| Office and Numbers | tools/office-tools.js | Number to words converter (Russian and English currency and cardinal spelling), UTM campaign URL generator. |
| Color Studio | tools/utility-extended.js | Dual-slider color spectrum engine (Hue and Lightness), HEX, RGB, and HSL conversions, palette generation. |
| QR Code Studio | tools/qr-tool.js | QR code generation for text, URL, Wi-Fi configuration, vCard, and cryptocurrency addresses. |
| Audio Utilities | tools/audio-tools.js | Audio playback rate and tempo manipulation via Web Audio API. |
| OCR Text Recognition | tools/ocr-tool.js | Client-side optical character recognition pipeline. |

### Installation and Usage

#### Option A: Direct Script Tag
Include any module directly in your HTML:

```html
<script src="tools/image-tools.js"></script>
<script>
  // Access global tool instance
  console.log(window.ImageTools);
</script>
```

#### Option B: CommonJS / Bundler
```javascript
const { DevTools, TextTools, OfficeTools } = require('./index.js');

// Example: Calculate MD5 (RFC 1321)
const hash = DevTools.fastMd5('hello');
console.log('MD5:', hash);

// Example: Generate secure password
const password = DevTools.generatePassword(16);
console.log('Password:', password);

// Example: Character count
const stats = TextTools.updateStats('Sample text');
console.log('Stats:', stats);

// Example: Number to words
console.log(OfficeTools.spellEnglishNumber(125));
// Output: "one hundred twenty-five"
```

---

<a name="russian"></a>
## Russian

### Описание

OmniKit Tools - библиотека независимых JavaScript-модулей для обработки данных и диагностики оборудования непосредственно в браузере пользователя. Все вычисления выполняются локально с использованием стандартных Web API (HTML5 Canvas, Web Audio API, Web Crypto API, MediaDevices, Web Workers).

Данные и файлы пользователя никогда не отправляются на удаленные серверы.

### Гарантия приватности

- Ноль байт исходящего трафика: Все операции выполняются в оперативной памяти браузера.
- Легко проверить: Откройте вкладку Network в консоли разработчика (F12) - при обработке файлов исходящие запросы отсутствуют.
- Работа офлайн: Модули полностью автономны и не требуют серверного API.
- Безопасность: Отсутствие трекеров, сторонней телеметрии и кейлоггеров.

### Каталог модулей

- tools/image-tools.js: Конвертация изображений (PNG, JPG, WebP), сжатие с настройкой качества, изменение размеров, удаление метаданных EXIF.
- tools/media-creative.js: Наложение водяных знаков на холсте, конвертация SVG в PNG/ICO с санитизацией XSS.
- tools/bg-remover.js: Клиентское удаление фона по цветовому порогу и контрасту.
- tools/favicon-studio.js: Генерация многослойных ICO (16x16, 32x32, 48x48) и PNG фавиконов.
- tools/pdf-suite.js: Объединение PDF, извлечение диапазонов страниц, рендеринг страниц PDF в изображения.
- tools/media-extended.js: Сборка нескольких изображений в единый PDF документ.
- tools/hardware-tools.js: Тест микрофона (анализатор спектра частот и децибел), тест веб-камеры (разрешение, FPS), тест клавиатуры (104 клавиши, залипание), тест мыши (скорость скролла, фиксация дабл-кликов).
- tools/dev-tools.js: Форматирование JSON, декодер JWT токенов, кодирование Base64 (UTF-8), расчет хешей (SHA-256, SHA-512, MD5), тестер RegEx, парсер CSV в JSON по RFC 4180.
- tools/text-tools.js: Счетчик знаков и слов с лимитами соцсетей, конвертер регистров, инструмент сравнения текстов (Diff), транслитерация и генератор URL-слагов.
- tools/token-tool.js: Калькулятор токенов и стоимости для нейросетей (GPT, Claude, DeepSeek).
- tools/txt-editor.js: Удаление дубликатов строк, сортировка, нормализация текста.
- tools/office-tools.js: Сумма прописью (рубли, доллары, евро), конструктор UTM-меток.
- tools/utility-extended.js: Конвертер цветов (HEX, RGB, HSL) со спектральным ползунком тона и яркости.
- tools/qr-tool.js: Генерация QR-кодов для ссылок, Wi-Fi, визиток и криптовалют.
- tools/audio-tools.js: Управление скоростью и высотой тона аудио через Web Audio.
- tools/ocr-tool.js: Браузерное оптическое распознавание текста.

### Лицензия

Лицензия MIT. Разрешено свободное коммерческое и некоммерческое использование.
