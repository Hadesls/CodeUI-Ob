/* 静态自检（血泪规则）：改完单文件 JS 必须确认"所有被调用的方法都已定义"。
   做法：从**原始源码**收集所有定义（class 方法 / function / const 箭头函数），
   再收集所有 `this.NAME(` 调用点求差集。
   只查 `this.` 前缀 —— CSS/正则字符串里的 rgba( / :not( / counter( 全是噪音，不参与。 */
const fs = require('fs');
const src = fs.readFileSync(process.argv[2] || 'main.js', 'utf8');

const defs = new Set();
let m;
for (const re of [
  /^\s*(?:async\s+)?([A-Za-z_$][\w$]*)\s*\([^)\n]*\)\s*\{/gm,                 // class 方法简写
  /\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g,                                    // function 声明/表达式
  /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function\b|\([^)\n]*\)\s*=>|[A-Za-z_$][\w$]*\s*=>)/g,
]) { while ((m = re.exec(src))) defs.add(m[1]); }

const calls = new Map();
const callRe = /\bthis\.([A-Za-z_$][\w$]*)\s*\(/g;
while ((m = callRe.exec(src))) calls.set(m[1], (calls.get(m[1]) || 0) + 1);

/* Plugin / Modal / SettingTab 基类自带的方法（不是我们定义的）
   2026-10-17 补：Modal 的 open/close/onOpen/onClose 与 SettingTab 的 display/hide —— 
   写了新插件后误报 this.close() 未定义，才发现漏了。
   2026-10-18 补：**实例字段**也算定义 —— 构造函数里 `this.onSave = onSave` 之后再
   `this.onSave()` 是合法写法，但原来只收集"类方法/函数声明"，会误报。 */
const instField = /\bthis\.([A-Za-z_$][\w$]*)\s*=[^=]/g;
while ((m = instField.exec(src))) defs.add(m[1]);
const base = new Set([
  /* Plugin */
  'loadData','saveData','addSettingTab','addCommand','registerEvent','registerDomEvent',
  'registerInterval','register','app','manifest','onload','onunload','containerEl',
  'addRibbonIcon','addStatusBarItem','registerView','registerMarkdownPostProcessor',
  'registerMarkdownCodeBlockProcessor','addChild','removeChild','registerObsidianProtocolHandler',
  /* 2026-10-18 补：行内补全要往编辑器里装 CodeMirror 扩展 */
  'registerEditorExtension','registerEditorSuggest','registerHoverLinkSource',
  /* Modal */
  'open','close','onOpen','onClose','contentEl','titleEl','modalEl','scope','setTitle',
  /* SettingTab */
  'display','hide',
  /* Modal / SuggestModal / FuzzySuggestModal（2026-10-18 补：写选笔记弹窗时误报 setPlaceholder） */
  'setPlaceholder','setInstructions','setLimits','getItems','getItemText','onChooseItem',
  'getSuggestions','renderSuggestion','onChooseSuggestion','limit','inputEl','emptyStateText',
]);
const missing = [];
for (const [n, c] of calls) if (!defs.has(n) && !base.has(n)) missing.push('this.' + n + '()  ×' + c);

console.log('定义数:', defs.size, ' this.* 调用名数:', calls.size);
if (missing.length) { console.log('❌ 未找到定义的方法:'); missing.forEach(x => console.log('   -', x)); process.exit(1); }
console.log('✅ 所有 this.* 调用都有定义');
