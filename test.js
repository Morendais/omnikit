const assert = require('assert');
const tools = require('./index.js');

console.log('Testing OmniKit Tools module exports...\n');

// 1. Verify all 18 modules are exported
const expectedModules = [
  'AudioTools', 'BatchImageStudio', 'BgRemover', 'DevTools', 'FaviconStudio',
  'HardwareTools', 'ImageTools', 'MediaCreative', 'MediaExtended',
  'OcrTool', 'OfficeTools', 'P2PDrop', 'PdfSuite', 'QrTool',
  'TextTools', 'TokenTool', 'TxtEditor', 'UtilityExtended'
];

for (const m of expectedModules) {
  assert(tools[m], `Module ${m} is not exported!`);
  console.log(`  [OK] Export: ${m}`);
}

// 2. Test TextTools counting
const textStats = tools.TextTools.updateStats('OmniKit clean tool library');
assert.strictEqual(textStats.words, 4, 'Word count mismatch');
assert.strictEqual(textStats.totalChars, 26, 'Total chars mismatch');
console.log('  [OK] TextTools word and char counting');

// 3. Test DevTools MD5 Vector (RFC 1321)
const md5Sample = tools.DevTools.fastMd5('hello');
assert.strictEqual(md5Sample, '5d41402abc4b2a76b9719d911017c592', 'MD5 vector mismatch');
console.log('  [OK] DevTools MD5 RFC 1321 vector');

// 4. Test DevTools Password Generator
const pwd = tools.DevTools.generatePassword(16, true, true, true, true);
assert.strictEqual(pwd.length, 16, 'Password length mismatch');
console.log('  [OK] DevTools Password Generator (16 chars)');

// 5. Test OfficeTools Num to Words
const numInWordsEn = tools.OfficeTools.spellEnglishNumber(125);
assert(numInWordsEn.includes('one hundred'), 'Num to words EN mismatch');
console.log('  [OK] OfficeTools Number to Words (EN)');

const numInWordsRu = tools.OfficeTools.spellRussianNumber(250);
assert(numInWordsRu.includes('двести пятьдесят'), 'Num to words RU mismatch');
console.log('  [OK] OfficeTools Number to Words (RU)');

console.log('\nAll OmniKit tool verification checks passed successfully with 100% success!');
