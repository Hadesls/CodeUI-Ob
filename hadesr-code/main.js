'use strict';

/*
 * Hadesr Code
 * 作者: Hadesr
 *
 * 约束：不依赖 CodeMirror 扩展；只读编辑器 DOM；不改代码行高相关样式。
 */

const { Plugin, PluginSettingTab, Setting, Notice, MarkdownView, setIcon } = require('obsidian');

const PREFIX = 'Hadesr Code: ';

/* ------------------------------------------------------------ 语言 */
const LANGUAGES = [
  ['plaintext', 'Plain Text'], ['abap', 'ABAP'], ['ada', 'Ada'], ['apache', 'Apache'], ['asm', 'Assembly'],
  ['awk', 'AWK'], ['bash', 'Bash'], ['basic', 'Basic'], ['bat', 'bat'], ['batch', 'Batch'], ['c', 'C'], ['cisco', 'cisco'], ['csharp', 'C#'],
  ['cpp', 'C++'], ['clojure', 'Clojure'], ['cmake', 'CMake'], ['cmd', 'cmd'], ['coffee', 'CoffeeScript'], ['css', 'CSS'],
  ['csv', 'CSV'], ['curl', 'curl'], ['d', 'D'], ['dart', 'Dart'], ['diff', 'Diff'], ['dockerfile', 'Dockerfile'], ['dos', 'DOS'],
  ['elixir', 'Elixir'], ['elm', 'Elm'], ['erlang', 'Erlang'], ['fortran', 'Fortran'], ['fsharp', 'F#'],
  ['gdscript', 'GDScript'], ['git', 'Git'], ['glsl', 'GLSL'], ['go', 'Go'], ['gradle', 'Gradle'],
  ['graphql', 'GraphQL'], ['groovy', 'Groovy'], ['h3c', 'h3c'], ['haskell', 'Haskell'], ['hcl', 'HCL'], ['html', 'HTML'], ['huawei', 'huawei'],
  ['http', 'http'], ['ini', 'ini（conf、env）'], ['ios', 'ios'], ['java', 'Java'], ['javascript', 'JavaScript'], ['json', 'JSON'],
  ['json5', 'JSON5'], ['julia', 'Julia'], ['kotlin', 'Kotlin'], ['latex', 'LaTeX'], ['less', 'Less'],
  ['linux', 'linux'], ['lisp', 'Lisp'], ['lua', 'Lua'], ['makefile', 'Makefile'], ['markdown', 'Markdown'], ['matlab', 'MATLAB'],
  ['network', 'network'], ['nginx', 'Nginx'], ['nim', 'Nim'], ['nix', 'Nix'], ['objectivec', 'Objective-C'], ['ocaml', 'OCaml'],
  ['pascal', 'Pascal'], ['perl', 'Perl'], ['php', 'PHP'], ['powershell', 'powershell'], ['prolog', 'Prolog'], ['ps1', 'ps1'], ['pwsh', 'pwsh'],
  ['protobuf', 'Protobuf'], ['pug', 'Pug'], ['python', 'Python'], ['r', 'R'], ['racket', 'Racket'],
  ['ruby', 'Ruby'], ['rust', 'Rust'], ['sas', 'SAS'], ['sass', 'Sass'], ['scala', 'Scala'], ['scheme', 'Scheme'],
  ['scss', 'SCSS'], ['sh', 'sh'], ['shell', 'Shell'], ['sql', 'SQL'], ['solidity', 'Solidity'], ['stylus', 'Stylus'], ['switch', 'switch'],
  ['swift', 'Swift'], ['tcl', 'Tcl'], ['toml', 'TOML'], ['typescript', 'TypeScript'], ['vbnet', 'VB.NET'],
  ['verilog', 'Verilog'], ['vhdl', 'VHDL'], ['vim', 'Vim Script'], ['vrp', 'vrp'], ['vue', 'Vue'], ['xml', 'XML'],
  ['yaml', 'YAML'], ['zig', 'Zig'], ['zsh', 'zsh'],
];
const LANG_MAP = {};
LANGUAGES.forEach(function (l) { LANG_MAP[l[0]] = l[1]; });
const ALIAS = { js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript', py: 'python', sh: 'bash', zsh: 'bash', yml: 'yaml', md: 'markdown', ps1: 'powershell', rs: 'rust', rb: 'ruby', kt: 'kotlin', cs: 'csharp',   'c++': 'cpp', golang: 'go', text: 'plaintext',
  /* 命令行 / 配置类常见写法 → 映射到高亮器认识的 id（这样阅读态 Prism 才会出 token 颜色） */
  cmd: 'batch', bat: 'batch', dos: 'batch', ps: 'powershell', pwsh: 'powershell',
  node: 'javascript', mjs: 'javascript', cjs: 'javascript',
  conf: 'ini', cfg: 'ini', env: 'ini', properties: 'ini', dotenv: 'ini',
  curl: 'bash', console: 'bash', terminal: 'bash',
  htm: 'html', tf: 'hcl' };
function normLang(v) { let l = String(v || '').toLowerCase().trim(); if (!l) return 'plaintext'; if (ALIAS[l]) l = ALIAS[l]; return l; }
/* 「显示名」与「高亮 id」分离（用户诉求：bash / bat / cmd 要分开显示，别混成一个"Batch / CMD / BAT"）。
   - normLang() = 高亮 id：把别名归一化到 Prism/CodeMirror 认识的语法名（cmd→batch、sh→bash），**只用于上色/哈希/下载扩展名**。
   - dispLang() = 显示名：**只有真正的"简写"**（js→javascript、py→python…）才归一化，命令行别名（sh/zsh/cmd/bat/ps1/curl…）原样保留 → 工具栏与下拉里各自独立显示。 */
const DISP_ALIAS = { js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript', py: 'python', yml: 'yaml', md: 'markdown', rs: 'rust', rb: 'ruby', kt: 'kotlin', cs: 'csharp', 'c++': 'cpp', golang: 'go', htm: 'html', tf: 'hcl', mjs: 'javascript', cjs: 'javascript',
  text: 'plaintext', ps: 'powershell', node: 'javascript',
  conf: 'ini', cfg: 'ini', env: 'ini', properties: 'ini', dotenv: 'ini',
  console: 'bash', terminal: 'bash' };
function dispLang(v) { const s = String(v || '').toLowerCase().trim(); if (!s) return 'plaintext'; return DISP_ALIAS[s] || s; }
/* 依据背景亮度挑一个不刺眼的「选中高亮」颜色（深色块用浅色叠加，浅色块用深色叠加） */
function selColor(bg) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(bg || ''));
  let r = 30, g = 30, b = 30;
  if (m) { const h = m[1]; r = parseInt(h.slice(0, 2), 16); g = parseInt(h.slice(2, 4), 16); b = parseInt(h.slice(4, 6), 16); }
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  return lum > 140 ? 'rgba(0,0,0,.20)' : 'rgba(255,255,255,.24)';
}
function langName(id) { return LANG_MAP[id] || (id ? id.charAt(0).toUpperCase() + id.slice(1) : 'Plain Text'); }

/* 表头文本归一化：去掉全部空白并截断。
   用途：阅读视图与实时预览 widget 取到的表头文本可能有空白/换行差异，
   不归一化会导致「编辑页拖好的宽度在阅读页找不到记录」。 */
function normHead(s) { return String(s == null ? '' : s).replace(/\s+/g, '').slice(0, 60); }
const EXT = { javascript: 'js', typescript: 'ts', python: 'py', bash: 'sh', shell: 'sh', batch: 'bat', cmd: 'bat', json: 'json', html: 'html', css: 'css', scss: 'scss', yaml: 'yml', xml: 'xml', sql: 'sql', java: 'java', c: 'c', cpp: 'cpp', csharp: 'cs', go: 'go', rust: 'rs', php: 'php', ruby: 'rb', kotlin: 'kt', swift: 'swift', markdown: 'md', toml: 'toml', ini: 'ini', powershell: 'ps1', http: 'http', plaintext: 'txt' };

/* ============================================================ 自定义正则高亮
   要解决的问题：Obsidian 的语言库是**内置固定**的（阅读态 Prism 371 种 / 编辑态 CodeMirror 122 种），
   cmd / bat / 网络设备命令（switch / cisco / huawei…）都不在里面 —— fence 写这些名字一点颜色都没有。
   这里由插件自己做一层**轻量正则着色**：
     · token 类型 → 固定类名 `cbs-hl-*`，颜色由 HL_STYLE 用官方 --code-* 变量给出（换主题也有色）；
     · 内置包放常用规则：IP / MAC / 端口 / 注释 / 字符串 / 参数 / 变量 / 路径 / 网络命令 / cmd 关键字 /
       Linux 命令名 / 网络设备关键字；
     · 设置里还能追加自定义规则（每行 `语言 | token类型 | 正则`）。
   ★ 生效范围：**阅读态** + **实时预览里未聚焦的代码块**。
     编辑态（光标停在块内）由 Obsidian 自己的 CodeMirror 渲染，插件不介入（不碰编辑器 DOM 是铁律）。
   ★ 接管条件（二选一）：① 该语言在规则表里有**专属**规则；② 宿主没给这个块任何高亮（`.token` 为空 = Obsidian 不认识它）。
     这样 bash / js / python 这些 Obsidian 本来就支持的块不会被覆盖。 */
const HL_CLASS = {
  keyword: 'cbs-hl-keyword', comment: 'cbs-hl-comment', string: 'cbs-hl-string',
  number: 'cbs-hl-number', cmd: 'cbs-hl-cmd', option: 'cbs-hl-option',
  variable: 'cbs-hl-variable', path: 'cbs-hl-path', ip: 'cbs-hl-ip',
  mac: 'cbs-hl-mac', port: 'cbs-hl-port', op: 'cbs-hl-op',
};
const HL_STYLE = [
  '.token.cbs-hl-keyword{color:var(--code-keyword,#c678dd)!important}',
  '.token.cbs-hl-comment{color:var(--code-comment,#7f848e)!important;font-style:italic}',
  '.token.cbs-hl-string{color:var(--code-string,#98c379)!important}',
  '.token.cbs-hl-number{color:var(--code-value,#d19a66)!important}',
  '.token.cbs-hl-cmd{color:var(--code-function,#61afef)!important}',
  '.token.cbs-hl-option{color:var(--cbs-pr,var(--code-function,#61afef))!important}',
  '.token.cbs-hl-variable{color:var(--cbs-vr,var(--code-important,#e06c75))!important}',
  '.token.cbs-hl-path{color:var(--code-string,#98c379)!important}',
  '.token.cbs-hl-ip{color:var(--cbs-ty,#66d9ef)!important}',
  '.token.cbs-hl-mac{color:var(--cbs-at,#e5c07b)!important}',
  '.token.cbs-hl-port{color:var(--code-important,#d19a66)!important}',
  '.token.cbs-hl-op{color:var(--code-operator,#56b6c2)!important}',
].join('\n');
/* 内置规则：[语言（逗号分隔；'*' = 通用，要跟专属规则一起命中才生效）, token 类型, 正则]
   数组顺序 = 优先级（先匹配的先占位；后面的匹配不能与已占位区间重叠）。
   所以顺序是：注释/字符串 → 网络标识 → 参数/变量/路径 → 数字 → 各语言关键字。 */
const HL_BUILTIN = [
  /* ── 通用 ── */
  ['*', 'comment', /(?:^|\s)(?:#{1,3}|\/\/|::|rem\b).*$/i],
  ['*', 'string', /"[^"\n]*"|'[^'\n]*'/],
  ['*', 'ip', /\b(?:\d{1,3}\.){3}\d{1,3}(?:\/\d{1,2})?\b/],
  ['*', 'mac', /\b[0-9A-Fa-f]{2}(?:[:-][0-9A-Fa-f]{2}){5}\b|\b[0-9A-Fa-f]{4}(?:[-.:][0-9A-Fa-f]{4}){2}\b/],
  ['*', 'port', /\b\d{1,5}\b(?=\/(?:tcp|udp))|(?<=:)\d{2,5}\b|(?<=\b(?:port|端口)\s*[:=]?\s*)\d{1,5}\b/i],
  ['*', 'option', /(?:^|\s)(?:-{1,2}[A-Za-z][\w-]*|\/[A-Za-z?][\w?]*)\b/],
  ['*', 'variable', /\$\{[^}\n]+\}|\$[A-Za-z_]\w*|%[A-Za-z_]\w*%|![A-Za-z_]\w*!/],
  ['*', 'path', /[A-Za-z]:\\[\w\\.-]+|(?:\/[\w.-]+){2,}\/?/],
  ['*', 'number', /\b\d+(?:\.\d+)?\b/],
  /* ── Windows cmd / bat ── */
  ['cmd,bat', 'keyword', /\b(?:if|else|for|goto|call|set|setlocal|endlocal|echo|start|exit|pause|copy|xcopy|move|del|erase|md|mkdir|rd|rmdir|dir|cd|chdir|type|find|findstr|taskkill|tasklist|sc|net|reg|robocopy|attrib|chkdsk|diskpart|cls|timeout|shutdown|whoami|hostname|ver|title|color|choice|shift|subst|pushd|popd|schtasks|logoff|quser|wmic|certutil|icacls|takeown|setx|mode|label|replace|comp|more|sort)\b/i],
  /* ── 网络命令（Windows / *nix 通用）── */
  ['cmd,bat,linux,switch,cisco,huawei,h3c,ios,network,vrp', 'cmd',
    /\b(?:ping|tracert|traceroute|nslookup|ipconfig|ifconfig|netstat|netsh|route|arp|telnet|ftp|sftp|ssh|scp|curl|wget|tftp|dig|host|whois|tcpdump|nmap|ncat|mtr|firewall-cmd|ufw|iptables)\b/i],
  /* ── *nix shell 命令名（行首，或管道/分号/括号之后）── */
  ['linux', 'cmd',
    /(?:^|[\s|&;(])(?:ls|ll|cd|pwd|cp|mv|rm|mkdir|rmdir|touch|cat|tac|less|more|head|tail|grep|egrep|rg|sed|awk|cut|tr|sort|uniq|wc|find|xargs|chmod|chown|chgrp|ln|stat|file|which|whereis|ps|top|htop|kill|killall|pkill|systemctl|journalctl|service|df|du|mount|umount|fdisk|lsblk|tar|zip|unzip|gzip|git|docker|kubectl|apt|apt-get|yum|dnf|pacman|brew|useradd|usermod|passwd|sudo|su|export|source|env|echo|printf|make|gcc|python|pip|node|npm|yarn|vim|vi|nano|rsync|tmux|nohup|crontab|date|uname|uptime|whoami|free|ss|lsof|nc|openssl)\b/],
  /* ── 网络设备（Cisco IOS / 华为 VRP / H3C Comware 常见动词）── */
  ['switch,cisco,huawei,h3c,ios,network,vrp', 'keyword',
    /\b(?:show|display|interface|vlan|shutdown|switchport|trunk|access|router|ospf|bgp|isis|eigrp|acl|nat|dhcp|enable|disable|configure|terminal|exit|end|write|copy|reload|hostname|sysname|username|password|secret|line|vty|console|spanning-tree|stp|port-channel|etherchannel|description|speed|duplex|mtu|ip|ipv4|ipv6|address|route|static|standby|vrrp|hsrp|save|undo|quit|system-view|user-interface|commit|clear|reset|debug|logging|snmp|ntp|aaa|radius|poe|stack|link-aggregation)\b/i],
];
function hash(s) { let h = 5381; s = String(s || ''); for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return 'k' + (h >>> 0).toString(36); }
function escHtml(x) { return String(x == null ? '' : x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

/* ------------------------------------------------------------ 主题 */
/* 特殊值：不注入任何代码配色，完全用主题（Hadesr UI）自带的配色 —— 阅读/编辑天然一致 */
const THEME_FOLLOW = 'theme';
const THEMES = {
  'one-dark-pro': { name: 'One Dark Pro', bg: '#282c34', fg: '#abb2bf', head: '#21252b', border: '#181a1f', kw: '#c678dd', str: '#98c379', num: '#d19a66', com: '#5c6370', fn: '#61afef', vr: '#e06c75', ty: '#e5c07b', op: '#56b6c2', tag: '#e06c75', at: '#d19a66', pr: '#e06c75', mt: '#61afef' },
  dracula: { name: 'Dracula', bg: '#282a36', fg: '#f8f8f2', head: '#21222c', border: '#191a21', kw: '#ff79c6', str: '#f1fa8c', num: '#bd93f9', com: '#6272a4', fn: '#50fa7b', vr: '#f8f8f2', ty: '#8be9fd', op: '#ff79c6', tag: '#ff79c6', at: '#50fa7b', pr: '#8be9fd', mt: '#f1fa8c' },
  'night-owl': { name: 'Night Owl', bg: '#011627', fg: '#d6deeb', head: '#01111d', border: '#00101a', kw: '#c792ea', str: '#ecc48d', num: '#f78c6c', com: '#637777', fn: '#82aaff', vr: '#d6deeb', ty: '#addb67', op: '#7fdbca', tag: '#7fdbca', at: '#addb67', pr: '#80cbc4', mt: '#82aaff' },
  monokai: { name: 'Monokai', bg: '#272822', fg: '#f8f8f2', head: '#1f2018', border: '#1a1b16', kw: '#f92672', str: '#e6db74', num: '#ae81ff', com: '#75715e', fn: '#a6e22e', vr: '#f8f8f2', ty: '#66d9ef', op: '#f92672', tag: '#f92672', at: '#a6e22e', pr: '#a6e22e', mt: '#75715e' },
  material: { name: 'Material', bg: '#263238', fg: '#eeffff', head: '#1e272c', border: '#1a2126', kw: '#c792ea', str: '#c3e88d', num: '#f78c6c', com: '#546e7a', fn: '#82aaff', vr: '#eeffff', ty: '#ffcb6b', op: '#89ddff', tag: '#f07178', at: '#ffcb6b', pr: '#f07178', mt: '#89ddff' },
  'github-dark': { name: 'GitHub Dark', bg: '#0d1117', fg: '#c9d1d9', head: '#161b22', border: '#30363d', kw: '#ff7b72', str: '#a5d6ff', num: '#79c0ff', com: '#8b949e', fn: '#d2a8ff', vr: '#ffa657', ty: '#ffa657', op: '#ff7b72', tag: '#7ee787', at: '#79c0ff', pr: '#79c0ff', mt: '#8b949e' },
  'github-light': { name: 'GitHub Light', bg: '#f6f8fa', fg: '#24292e', head: '#eef1f4', border: '#d0d7de', kw: '#cf222e', str: '#0a3069', num: '#0550ae', com: '#6e7781', fn: '#8250df', vr: '#953800', ty: '#953800', op: '#cf222e', tag: '#116329', at: '#0550ae', pr: '#0550ae', mt: '#6e7781' },
  'solarized-dark': { name: 'Solarized Dark', bg: '#002b36', fg: '#93a1a1', head: '#00252e', border: '#002028', kw: '#859900', str: '#2aa198', num: '#d33682', com: '#586e75', fn: '#268bd2', vr: '#b58900', ty: '#b58900', op: '#859900', tag: '#268bd2', at: '#b58900', pr: '#268bd2', mt: '#586e75' },
  'solarized-light': { name: 'Solarized Light', bg: '#fdf6e3', fg: '#657b83', head: '#f2ebd6', border: '#e3dbc4', kw: '#859900', str: '#2aa198', num: '#d33682', com: '#93a1a1', fn: '#268bd2', vr: '#b58900', ty: '#b58900', op: '#859900', tag: '#268bd2', at: '#b58900', pr: '#268bd2', mt: '#93a1a1' },
};

const DEFAULTS = { theme: 'one-dark-pro', themes: {}, titles: {}, showToolbar: true, showInReading: true, reserveSpace: true, lineNumbers: true, barOpacity: 1, barHeight: 34, barFont: 12.5, codeFont: '', codeFontSize: 0, quoteBar: 'gold', tableStyle: 'blueB', tableBar: true, tableWidths: {}, fileLineNumbers: {}, fontBody: '', fontBodySize: 0, customCss: '', customHighlight: true, customRules: '',
  /* 主题外观：复用主题 theme.css 里现成的 CSS，本插件只负责往 body 加/删类名。
     默认值与主题默认一致。 */
  appFolderColor: true, appFolderColorMode: 'folder-style-change-options-colorful-border',
  appFolderColorPalette: 'folder-colorful-six', appFolderIcons: true, appNoArrow: true, appNoRootIcon: true,
  /* 第二批：代码块样式 + 文件树细节。默认一律「不生效」，保证升级后观感不变，由用户自己开启 */
  appCodeNoIndentLine: false, appCodeWrapReading: false, appCodeNoWrapEdit: false,
  appCodeLetterSpace: 0, appCodeNoActiveLine: false, appCodeBoxStyle: '',
  appNoFileIcons: false, appFolderUnderline: false, appFolderDot: false,
  appDarkFileBg: false, appPlainFileTitle: false,
  appFileNameStyle: '', appFileBgShape: '',
  /* 第三步：整体配色方案（13 套，纯换一个 body class）。'' = 不额外加类，保持主题原样 */
  appColorScheme: '' };

/* 彩色文件夹的 6 种模式 —— 互斥，body 上同一时刻只能有一个 */
const FOLDER_COLOR_MODES = [
  'folder-style-change-options-colorful-default',
  'folder-style-change-options-colorful',
  'folder-style-change-options-colorful-order',
  'folder-style-change-options-colorful-title',
  'folder-style-change-options-colorful-tab-liked',
  'folder-style-change-options-colorful-border'
];
const FOLDER_COLOR_MODE_NAMES = {
  'folder-style-change-options-colorful-default': '不着色',
  'folder-style-change-options-colorful': '按名字首字符（0-9 / A-Z）',
  'folder-style-change-options-colorful-order': '按排列顺序',
  'folder-style-change-options-colorful-title': '只给标题上色',
  'folder-style-change-options-colorful-tab-liked': '标签页样式',
  'folder-style-change-options-colorful-border': '边框卡片'
};
/* 配色套数 —— 同样互斥。'folder-colorful-custom' 要配自定义颜色，本插件暂不提供，但清理时要一并移除 */
const FOLDER_PALETTES = [
  'folder-colorful-one', 'folder-colorful-two', 'folder-colorful-three',
  'folder-colorful-four', 'folder-colorful-five', 'folder-colorful-six', 'folder-colorful-custom'
];
const FOLDER_PALETTE_NAMES = {
  'folder-colorful-one': '样式 1（高透明）',
  'folder-colorful-two': '样式 2（低透明）',
  'folder-colorful-three': '样式 3',
  'folder-colorful-four': '样式 4',
  'folder-colorful-five': '样式 5',
  'folder-colorful-six': '样式 6'
};

/* 三个样式下拉。'' = 不额外加类（保持主题现状）。
   下面 *_VALUES 是"清理用"的全集 —— 换选项时先把整组清掉，避免残留。 */
const FILE_NAME_STYLES = { '': '默认（不换行）', 'file-name-wrapped': '自动换行', 'file-name-animation': '悬停时滚动' };
const FILE_NAME_STYLE_VALUES = ['file-name-wrapped', 'file-name-non-wrapped', 'file-name-animation'];
const FILE_BG_SHAPES = { '': '默认（矩形）', 'file-bg-rounded-rectangle': '圆角矩形', 'file-bg-pill': '胶囊形' };
const FILE_BG_SHAPE_VALUES = ['file-shape-default', 'file-bg-rounded-rectangle', 'file-bg-pill'];
const CODEBOX_STYLES = { '': '默认', 'codebox-frosted-glass': '毛玻璃' };
const CODEBOX_STYLE_VALUES = ['codebox-default-style', 'codebox-frosted-glass'];

/* 整体配色方案（13 套）。'' = 不额外加类。
   原理同样是"换一个 body class" —— 配色变量全在主题里，插件不负责颜色。 */
const COLOR_SCHEMES = {
  '': '默认（不加类）',
  'color-scheme-options-default': 'Default',
  'color-scheme-options-avocado-topaz': 'Avocado',
  'color-scheme-options-monochrome-topaz': 'Monochrome',
  'color-scheme-options-pink-topaz': 'Pink',
  'color-scheme-options-topaz-nord': 'Topaz-Nord',
  'color-scheme-options-flamingo': 'Flamingo',
  'color-scheme-options-honey-milk-topaz': 'Honey milk 蜂蜜牛奶',
  'color-scheme-options-chocolate-topaz': 'Hazelnut chocolate 榛子巧克力',
  'color-scheme-options-lilac': 'Lilac 丁香',
  'color-scheme-options-autumn-topaz': 'Autumn 秋日',
  'color-scheme-options-lillimon-topaz': 'Rubik\'s Cube 魔方',
  'color-scheme-options-simplicity-topaz': 'Simplicity 简约'
};
const COLOR_SCHEME_VALUES = [
  'color-scheme-options-default', 'color-scheme-options-avocado-topaz',
  'color-scheme-options-monochrome-topaz', 'color-scheme-options-pink-topaz',
  'color-scheme-options-topaz-nord', 'color-scheme-options-flamingo',
  'color-scheme-options-honey-milk-topaz', 'color-scheme-options-chocolate-topaz',
  'color-scheme-options-lilac', 'color-scheme-options-autumn-topaz',
  'color-scheme-options-lillimon-topaz', 'color-scheme-options-simplicity-topaz'
];

/* ------------------------------------------------------------ 外观变体（引用条/表格）
   全部变体 CSS 常驻注入，用 body 类门控 —— 下拉只换类，即时生效。
   （教训：门控 CSS 不能条件注入，否则类挂上了没样式 = 点了没反应） */
/* 引用块成套样式：竖条颜色 + 底色配对（换色 = 整套换）
   每档给两组值：
     c / bg  = 浅色模式（竖条色 / 底色，实色）
     dc / dbg= 深色模式（竖条略提亮；底色用**半透明叠色**，跟着暗背景走，不写死）
   ⚠ 深色规则的选择器必须是 `body.theme-dark.cs-qbar-x` ——
      `theme-dark` 类挂在 <body> 上，写成 `.theme-dark body.…` 会永远匹配不到。 */
const LOOK_QUOTE = {
  gold:  { name: '暖金（Drake 粉底）', c: '#d99a2b', bg: '#fdefee', dc: '#e0a83c', dbg: 'rgba(217,154,43,.13)' },
  blue:  { name: '浅蓝',              c: '#64b5f6', bg: '#e9f2fb', dc: '#7cc0f8', dbg: 'rgba(100,181,246,.13)' },
  teal:  { name: '青绿',              c: '#2a9d8f', bg: '#e7f4f1', dc: '#3fbfae', dbg: 'rgba(42,157,143,.15)' },
  coral: { name: '珊瑚红（原版）',    c: '#e95f59', bg: '#fdefee', dc: '#f07a75', dbg: 'rgba(233,95,89,.13)' },
  gray:  { name: '暖灰',              c: '#a89f94', bg: '#f1efeb', dc: '#b8afa4', dbg: 'rgba(168,159,148,.13)' },
};
const LOOK_TABLE = {
  none:  { name: '主题默认' },
  blueA: { name: '雾蓝全框线' },
  blueB: { name: '浅蓝强调' },
  blueC: { name: '斑马蓝' },
  blueD: { name: '深蓝表头' },
  gold:  { name: '暖金' },
};
const LOOK_CSS = [
  /* ---- 引用块成套（竖条色 + 底色同时变；阅读态 + 编辑态竖线都覆盖） ---- */
  ...Object.keys(LOOK_QUOTE).map(function (k) {
    const q = LOOK_QUOTE[k];
    const S = 'body.cs-qbar-' + k;            /* 浅色（也是默认档） */
    const D = 'body.theme-dark.cs-qbar-' + k; /* 深色覆盖：更多一个类 → 必胜 */
    const darkColor = 'color:var(--text-normal) !important;'; /* 深色底上字要浅，不能沿用 #333 */
    return '/* ' + k + ' */' +
      /* ① 变量兜底：Obsidian / 主题里凡是用变量的地方一起跟着变（明暗通用，竖条色两模式都够亮） */
      S + '{--blockquote-border-color:' + q.c + ';--quote-border-color:' + q.c + ';}' +
      D + '{--blockquote-border-color:' + q.dc + ';--quote-border-color:' + q.dc + ';}' +
      /* ② 阅读态：竖条（snippet 画的 ::before）+ 底色 */
      S + ' :is(.markdown-rendered,.markdown-preview-view) blockquote::before{background-color:' + q.c + ' !important;}' +
      S + ' :is(.markdown-rendered,.markdown-preview-view) blockquote{background-color:' + q.bg + ' !important;}' +
      D + ' :is(.markdown-rendered,.markdown-preview-view) blockquote::before{background-color:' + q.dc + ' !important;}' +
      D + ' :is(.markdown-rendered,.markdown-preview-view) blockquote{background-color:' + q.dbg + ' !important;' + darkColor + '}' +
      D + ' :is(.markdown-rendered,.markdown-preview-view) blockquote :not(pre)>code{background:rgba(160,160,160,.16) !important;color:#ff7a6b !important;}' +
      /* ③ 编辑态：底色 + 竖线（用 .cm-blockquote-border 的 border-color；
         某些主题/版本用 ::before 画条或 border-inline-start，全部覆盖） */
      S + ' .markdown-source-view.mod-cm6 .HyperMD-quote{background-color:' + q.bg + ' !important;}' +
      D + ' .markdown-source-view.mod-cm6 .HyperMD-quote{background-color:' + q.dbg + ' !important;' + darkColor + '}' +
      S + ' .markdown-source-view .cm-blockquote-border{border-color:' + q.c + ' !important;border-inline-start-color:' + q.c + ' !important;border-left-color:' + q.c + ' !important;}' +
      D + ' .markdown-source-view .cm-blockquote-border{border-color:' + q.dc + ' !important;border-inline-start-color:' + q.dc + ' !important;border-left-color:' + q.dc + ' !important;}' +
      S + ' .markdown-source-view .cm-blockquote-border::before,' + S + ' .markdown-source-view .cm-blockquote-border::after{background-color:' + q.c + ' !important;border-color:' + q.c + ' !important;}' +
      D + ' .markdown-source-view .cm-blockquote-border::before,' + D + ' .markdown-source-view .cm-blockquote-border::after{background-color:' + q.dc + ' !important;border-color:' + q.dc + ' !important;}';
  }),
  /* ---- 表格（阅读视图；编辑态表格是 CM6 行渲染，不在此列） ---- */
  'body.cs-table-blueA :is(.markdown-rendered,.markdown-preview-view) table{border-collapse:collapse}',
  'body.cs-table-blueA :is(.markdown-rendered,.markdown-preview-view) table th,body.cs-table-blueA :is(.markdown-rendered,.markdown-preview-view) table td{border:1px solid #c3d3e2 !important;padding:6px 12px}',
  'body.cs-table-blueA :is(.markdown-rendered,.markdown-preview-view) table th{background:#f2f7fb !important;color:inherit}',
  'body.cs-table-blueB :is(.markdown-rendered,.markdown-preview-view) table{border-collapse:collapse}',
  'body.cs-table-blueB :is(.markdown-rendered,.markdown-preview-view) table th{border:1px solid #a8c8e8 !important;background:#e3eefb !important;color:#2c5a8f}',
  'body.cs-table-blueB :is(.markdown-rendered,.markdown-preview-view) table td{border:1px solid #c9ddf2 !important;padding:6px 12px}',
  'body.cs-table-blueC :is(.markdown-rendered,.markdown-preview-view) table{border:2px solid #9fc0dd !important;border-collapse:separate;border-spacing:0;border-radius:6px;overflow:hidden}',
  'body.cs-table-blueC :is(.markdown-rendered,.markdown-preview-view) table th{background:#dcebfa !important;border-bottom:1px solid #9fc0dd !important;color:inherit}',
  'body.cs-table-blueC :is(.markdown-rendered,.markdown-preview-view) table td{border-bottom:1px solid #d5e5f3 !important;padding:6px 12px}',
  'body.cs-table-blueC :is(.markdown-rendered,.markdown-preview-view) table tr:nth-child(even) td{background:#f4f9fe !important}',
  'body.cs-table-blueD :is(.markdown-rendered,.markdown-preview-view) table{border-collapse:collapse}',
  'body.cs-table-blueD :is(.markdown-rendered,.markdown-preview-view) table th{background:#4a7fae !important;color:#fff !important;border:1px solid #4a7fae !important}',
  'body.cs-table-blueD :is(.markdown-rendered,.markdown-preview-view) table td{border:1px solid #c3d3e2 !important;padding:6px 12px}',
  'body.cs-table-blueD :is(.markdown-rendered,.markdown-preview-view) table tr:nth-child(even) td{background:#f6fafd !important}',
  'body.cs-table-gold :is(.markdown-rendered,.markdown-preview-view) table{border-collapse:collapse}',
  'body.cs-table-gold :is(.markdown-rendered,.markdown-preview-view) table th{border:1px solid #e3c98d !important;background:#fdf6e7 !important;color:#7a5a12}',
  'body.cs-table-gold :is(.markdown-rendered,.markdown-preview-view) table td{border:1px solid #e8ddc4 !important;padding:6px 12px}',

  /* ---- 表格：深色模式分支 ----
     只覆盖**颜色**（边框/表头底色/斑马纹），结构规则（border-collapse 等）上面那批
     不带 .theme-dark 门控、两种模式都生效，不必重复。
     深色一律用 rgba 半透明叠色 —— 跟着暗背景走；写实色又会变成"浅色块"。
     ⚠ 选择器是 `body.theme-dark.cs-table-x`：theme-dark 挂在 <body> 上。 */
  'body.theme-dark.cs-table-blueA :is(.markdown-rendered,.markdown-preview-view) table th,body.theme-dark.cs-table-blueA :is(.markdown-rendered,.markdown-preview-view) table td{border:1px solid rgba(122,170,215,.30) !important;padding:6px 12px}',
  'body.theme-dark.cs-table-blueA :is(.markdown-rendered,.markdown-preview-view) table th{background:rgba(122,170,215,.14) !important;color:inherit}',
  'body.theme-dark.cs-table-blueB :is(.markdown-rendered,.markdown-preview-view) table th{border:1px solid rgba(100,181,246,.40) !important;background:rgba(100,181,246,.20) !important;color:#a8d0f7}',
  'body.theme-dark.cs-table-blueB :is(.markdown-rendered,.markdown-preview-view) table td{border:1px solid rgba(100,181,246,.22) !important;padding:6px 12px}',
  'body.theme-dark.cs-table-blueC :is(.markdown-rendered,.markdown-preview-view) table{border:2px solid rgba(122,170,215,.36) !important}',
  'body.theme-dark.cs-table-blueC :is(.markdown-rendered,.markdown-preview-view) table th{background:rgba(100,181,246,.18) !important;border-bottom:1px solid rgba(122,170,215,.36) !important;color:inherit}',
  'body.theme-dark.cs-table-blueC :is(.markdown-rendered,.markdown-preview-view) table td{border-bottom:1px solid rgba(122,170,215,.18) !important;padding:6px 12px}',
  'body.theme-dark.cs-table-blueC :is(.markdown-rendered,.markdown-preview-view) table tr:nth-child(even) td{background:rgba(100,181,246,.07) !important}',
  'body.theme-dark.cs-table-blueD :is(.markdown-rendered,.markdown-preview-view) table th{background:#3f6d99 !important;color:#fff !important;border:1px solid #3f6d99 !important}',
  'body.theme-dark.cs-table-blueD :is(.markdown-rendered,.markdown-preview-view) table td{border:1px solid rgba(122,170,215,.28) !important;padding:6px 12px}',
  'body.theme-dark.cs-table-blueD :is(.markdown-rendered,.markdown-preview-view) table tr:nth-child(even) td{background:rgba(100,181,246,.06) !important}',
  'body.theme-dark.cs-table-gold :is(.markdown-rendered,.markdown-preview-view) table th{border:1px solid rgba(217,154,43,.38) !important;background:rgba(217,154,43,.18) !important;color:#e6c37a}',
  'body.theme-dark.cs-table-gold :is(.markdown-rendered,.markdown-preview-view) table td{border:1px solid rgba(217,154,43,.20) !important;padding:6px 12px}',
].join('\n');

/* ------------------------------------------------------------ 图标（16px，贴近语雀） */
function S(p, sz) { return '<svg viewBox="0 0 24 24" width="' + (sz || 15) + '" height="' + (sz || 15) + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>'; }
const ICON = {
  chev: S('<polyline points="6 9 12 15 18 9"/>'),
  copy: S('<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>'),
  check: S('<polyline points="20 6 9 17 4 12"/>'),
  play: S('<polygon points="6 4 20 12 6 20 6 4" fill="currentColor" stroke="none"/>', 14),
  more: S('<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>'),
  pal: S('<circle cx="12" cy="12" r="9"/><circle cx="8.5" cy="10" r="1.2" fill="currentColor" stroke="none"/><circle cx="12" cy="7.5" r="1.2" fill="currentColor" stroke="none"/><circle cx="15.5" cy="10" r="1.2" fill="currentColor" stroke="none"/>', 12),
  down: S('<path d="M12 3v12"/><polyline points="7 10 12 15 17 10"/><path d="M5 21h14"/>'),
  text: S('<polyline points="4 7 4 4 20 4 20 7"/><line x1="12" y1="4" x2="12" y2="20"/><line x1="9" y1="20" x2="15" y2="20"/>'),
  indent: S('<line x1="3" y1="6" x2="21" y2="6"/><line x1="11" y1="12" x2="21" y2="12"/><line x1="11" y1="18" x2="21" y2="18"/><polyline points="3 10 6 13 3 16"/>'),
  wrap: S('<line x1="3" y1="6" x2="21" y2="6"/><path d="M3 12h15a3 3 0 1 1 0 6h-4"/><polyline points="16 16 13 18 16 20"/><line x1="3" y1="18" x2="9" y2="18"/>'),
  lines: S('<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3.5" y1="6" x2="3.7" y2="6"/><line x1="3.5" y1="12" x2="3.7" y2="12"/><line x1="3.5" y1="18" x2="3.7" y2="18"/>'),
  sync: S('<path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><polyline points="3 21 3 16 8 16"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><polyline points="21 3 21 8 16 8"/>'),
  eye: S('<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z"/><circle cx="12" cy="12" r="2.6"/>'),
  close: S('<line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>'),
  /* 表格工具栏图标 */
  tRowPlus: S('<rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="12" x2="21" y2="12"/><path d="M12 14.5v4M10 16.5h4"/>'),
  tRowMinus: S('<rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="10" y1="16.5" x2="14" y2="16.5"/>'),
  tColPlus: S('<rect x="3" y="4" width="18" height="16" rx="2"/><line x1="12" y1="4" x2="12" y2="20"/><path d="M15 12h5M17.5 9.5v5"/>'),
  tColMinus: S('<rect x="3" y="4" width="18" height="16" rx="2"/><line x1="12" y1="4" x2="12" y2="20"/><line x1="15" y1="12" x2="20" y2="12"/>'),
  tAlignL: S('<line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="13" y2="12"/><line x1="4" y1="18" x2="16" y2="18"/>'),
  tAlignC: S('<line x1="4" y1="6" x2="20" y2="6"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="5" y1="18" x2="19" y2="18"/>'),
  tAlignR: S('<line x1="4" y1="6" x2="20" y2="6"/><line x1="11" y1="12" x2="20" y2="12"/><line x1="8" y1="18" x2="20" y2="18"/>'),
  tDel: S('<path d="M4 7h16"/><path d="M10 7V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2"/><path d="M6.5 7l.9 12a2 2 0 0 0 2 1.9h5.2a2 2 0 0 0 2-1.9l.9-12"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>'),
};

/* ------------------------------------------------------------ 插件 */
class CodeStudioPlugin extends Plugin {
  async onload() {
    try {
      await this.loadSettings();
      this.styleEl = document.createElement('style');
      this.styleEl.id = 'hadesr-code-theme';
      document.head.appendChild(this.styleEl);
      this.customEl = document.createElement('style');
      this.customEl.id = 'hadesr-code-custom';
      document.head.appendChild(this.customEl);

      this.overlays = new Map();
      this._content = null;
      this._raf = 0;
      this._observer = null;
      /* 会话级「本块行号」覆盖：键 = 该块的 DOM 元素。用于保证点了就变、且不被下一轮刷新冲掉。
         持久化仍走 settings.blockLineNumbers（按内容哈希）。两层保险，任一命中即生效。 */
      this._lnSession = new WeakMap();
      /* ⋯ 菜单的「点外部关闭」监听器句柄：全局只保留一个，注册前先摘旧的（见 moreMenu 注释） */
      this._menuCloser = null;
      /* 阅读态重刷版本：设置一变就 +1，代码块只在版本变化时重刷（性能关键，见 applyReadingTheme） */
      this._paintVer = 1;
      /* 会话级覆盖条数（WeakMap 无法遍历，用它判断"有没有本块覆盖"来决定要不要算 id） */
      this._lnSessionCount = 0;

      this.applyTheme();
      this.applyCodeThemeClass();   /* 把保存的代码主题落到 body 类上（配色在主题里） */
      this.applyCustom();
      this.applyBarCss();
      this.applyLook();
      this.applyAppearance();   /* 主题外观（彩色文件夹 / 文件夹图标 / 折叠箭头）：只往 body 加类，CSS 在主题里 */
      this.addSettingTab(new CodeStudioSettingTab(this.app, this));

      this.addCommand({ id: 'cs-next-theme', name: '切换代码主题（下一个）', callback: () => this.cycleTheme() });
      this.addCommand({ id: 'cs-toggle-toolbar', name: '显示 / 隐藏代码块工具栏', callback: async () => { this.settings.showToolbar = !this.settings.showToolbar; await this.saveSettings(); this.applyBarCss(); this.hideAll(); this.markDirty(); } });
      this.addCommand({ id: 'cs-cycle-file-ln', name: '本文件行号：跟随全局 / 强制开 / 强制关（循环）', callback: () => {
        const v = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (v) this.cycleFileLN(v);
      } });
            this.addCommand({ id: 'cs-diag-code', name: '诊断：代码块样式（结果复制到剪贴板）', callback: () => this.diagCode() });
            this.addCommand({ id: 'cs-diag-table', name: '诊断：表格列宽匹配情况（结果复制到剪贴板）', callback: () => this.diagTableWidths() });

      this.registerEvent(this.app.workspace.on('active-leaf-change', () => this.schedule()));
      this.registerEvent(this.app.workspace.on('layout-change', () => this.schedule()));
      /* 滚动：只做定位，用 rAF 节流（原来每次滚动事件都对所有代码块读 getBoundingClientRect，
         代码块一多就会出现「滚动卡顿 + 拖动时白屏」）。 */
      let sRaf = 0;
      this.registerDomEvent(window, 'scroll', () => {
        if (sRaf) return;
        sRaf = window.requestAnimationFrame(() => {
          sRaf = 0;
          try { this.position(); this.positionTableBar(); } catch (e) { }
          /* 阅读态：滚进视口的代码块要**立刻**补刷（视口裁剪会把远处的推后处理）。
             这里直接调用上色，省掉 refresh 里那次文档签名计算；memo + 裁剪让它很便宜。 */
          try {
            const v = this.app.workspace.getActiveViewOfType(MarkdownView);
            if (v && typeof v.getMode === 'function' && v.getMode() === 'preview'
                && ((this._readPending || 0) > 0 || (this._readMiss || 0) > 0)) {
              this.applyReadingTheme(v);   /* 只有"还有待补的块"时才跑；都为 0 说明整篇已刷完 */
            }
          } catch (e) { }
        });
      }, true);
      this.registerDomEvent(window, 'resize', () => this.position());
      /* 点击后立刻重扫（rAF 自带节流）：表格工具栏要"点到表格就出现"，等轮询太慢 */
      this.registerDomEvent(document, 'pointerup', () => this.schedule());
      /* 表格列宽拖拽（委托到 document：表格 DOM 会被重绘，元素级监听会丢） */
      this.registerDomEvent(document, 'pointerdown', (e) => this.tblGripDown(e), true);
      this.registerDomEvent(document, 'dblclick', (e) => this.tblGripReset(e), true);
      /* 轮询兜底：主要刷新由「编辑器变更 / 布局变化 / MutationObserver」驱动，
         这里只需低频兜底（原来 1.2s 太频繁，长笔记会持续占用主线程）。 */
      this.registerInterval(window.setInterval(() => this.refresh(), 2500));

      /* 阅读/预览态：点「语言名胶囊」= 复制。
         必须 document 捕获 + mousedown 拦截：实时预览里直接点 widget 会把块聚焦成编辑态，
         widget 随之销毁，挂在胶囊元素上的监听永远收不到 click —— 这就是「点了没反应」的根因。
         mousedown 阶段 preventDefault+stopPropagation 挡掉聚焦，click 阶段执行复制。 */
      const flairCopy = (e) => {
        try {
          const t = e.target;
          if (!t || !t.closest) return;
          const flair = t.closest('.cbs-flair');
          if (!flair) return;
          e.preventDefault(); e.stopPropagation();
          if (e.type === 'mousedown') return;   /* 只负责挡聚焦，复制在 click 里做 */
          const code = flair._cbsCode || (function () {
            const host = flair.closest('.cm-preview-code-block, .el-pre') || flair.parentElement;
            return host ? (host.querySelector('code') || host.querySelector('pre')) : null;
          })();
          if (!code) return;
          /* 行号开着时 innerText 会带行号，优先用拆行时缓存的纯文本 */
          const txt = code._cbsText !== undefined ? code._cbsText : (code.innerText || code.textContent || '').replace(/\n$/, '');
          if (txt) this.copyText(txt);
        } catch (err) { }
      };
      this.registerDomEvent(document, 'mousedown', flairCopy, { capture: true });
      this.registerDomEvent(document, 'click', flairCopy, { capture: true });

      this.registerRuntimeAliases();   /* 给 Prism 注册 cmd/bat/ps1… 别名 → 阅读态也能按 batch/powershell 上色 */
      this.schedule();

      if (!this.settings.showToolbar) {
        new Notice(PREFIX + '工具栏处于隐藏状态 —— 右下角「显示代码块工具栏」按钮，或命令面板「显示 / 隐藏代码块工具栏」可恢复', 12000);
      }
      console.log(PREFIX + '已加载 v' + this.manifest.version);
    } catch (e) { console.error(PREFIX + 'onload 出错（已忽略）', e); }
  }

  onunload() {
    try {
      if (this._observer) this._observer.disconnect();
      if (this._heavyTimer) { clearTimeout(this._heavyTimer); this._heavyTimer = 0; }
      this._lnQueue = null; this._lnScheduled = false;
      if (this._prismTimer) { clearInterval(this._prismTimer); this._prismTimer = 0; }
      if (this._raf) cancelAnimationFrame(this._raf);
      this.hideAll();
      this.closeFloating();
      this.removeRestoreChip();
      if (this.styleEl) this.styleEl.remove();
      if (this.customEl) this.customEl.remove();
      if (this._lookEl) this._lookEl.remove();
      try {
        document.body.classList.remove('cs-qbar-' + (this.settings.quoteBar || 'gold'));
        if (this.settings.tableStyle && this.settings.tableStyle !== 'none') document.body.classList.remove('cs-table-' + this.settings.tableStyle);
      } catch (e) { }
      this.clearAppearance();
    } catch (e) { }
  }

  async loadSettings() { this.settings = Object.assign({}, DEFAULTS, await this.loadData()); if (!this.settings.titles) this.settings.titles = {}; if (!this.settings.blockLineNumbers) this.settings.blockLineNumbers = {}; if (!this.settings.tableWidths) this.settings.tableWidths = {}; if (!this.settings.fileLineNumbers) this.settings.fileLineNumbers = {}; }
  async saveSettings() { await this.saveData(this.settings); }

  /* -------------------------------------------------- 调度 */
  schedule() {
    if (this._raf) return;
    const self = this;
    this._raf = window.requestAnimationFrame(function () { self._raf = 0; try { self.refresh(); } catch (e) { console.error(PREFIX, e); } });
  }
  reobserve(el) {
    try {
      if (this._observer) this._observer.disconnect();
      const self = this;
      this._observer = new MutationObserver(function () { self.schedule(); });
      this._observer.observe(el, { childList: true, subtree: true });
    } catch (e) { }
  }

  /* 标记"需要重做一遍"（设置改了 / 行号改了 / 语言改了等）。
     refresh() 会用文档签名做闸门：签名没变就只做定位，跳过全部重建。 */
  markDirty() { this._dirty = true; this.schedule(); }

  /* ── 行号的作用域（三级，从窄到宽）──────────────────────────────────
     1) 本文件：settings.fileLineNumbers[路径] = true/false（undefined = 跟随下一级）
     2) 本块  ：settings.blockLineNumbers[id] / 会话级覆盖
     3) 全局  ：settings.lineNumbers
     这样"行号只在这一篇显示"就点「本文件」那一项即可，不必动全局开关。 */
  /* 本文件的行号开关：只有开/关两种（没记录过就取 settings.lineNumbers 作为新文件默认值）。
     行号是**每篇文件各自控制**的，"行号（本文件全部块）"= 本篇所有代码块统一开/关。 */
  lnForFile(view) {
    try {
      const p = view && view.file && view.file.path;
      const m = this.settings.fileLineNumbers || {};
      if (p && m[p] !== undefined) return !!m[p];
      return !!this.settings.lineNumbers;
    } catch (e) { return !!this.settings.lineNumbers; }
  }
  /* 切换「本文件全部块」的行号：一句话 —— 本篇开 / 本篇关。 */
  cycleFileLN(view) {
    try {
      const f = view && view.file;
      if (!f || !f.path) { new Notice(PREFIX + '当前不是文件视图'); return; }
      const m = this.settings.fileLineNumbers = this.settings.fileLineNumbers || {};
      const now = !this.lnForFile(view);
      m[f.path] = now;
      this.saveSettings();
      this.applyLineNumbers();
      new Notice(PREFIX + '本篇行号：' + (now ? '开' : '关') + '（仅对本文件生效）');
    } catch (e) { }
  }
  fileLNLabel(view) {
    return this.lnForFile(view) ? '开' : '关';
  }

  /* 诊断：把"当前视图里代码块实际算出来的样式"抄到剪贴板 —— 用于定位
     "代码块浅底/看不清"这类问题（CSS 到底有没有生效、被谁压掉）。 */
  diagCode() {
    try {
      const view = this.app.workspace.getActiveViewOfType(MarkdownView);
      const root = view && (view.contentEl || view.containerEl);
      const mode = (view && typeof view.getMode === 'function') ? view.getMode() : '?';
      const L = ['模式: ' + mode + '  行号: ' + this.settings.lineNumbers,
                 '代码主题: ' + this.settings.theme + '  showInReading: ' + this.settings.showInReading,
                 '文件: ' + ((view && view.file && view.file.path) || '?')];
      const cs = getComputedStyle(document.body);
      L.push('--code-background = ' + cs.getPropertyValue('--code-background').trim());
      L.push('--background-code = ' + cs.getPropertyValue('--background-code').trim());
      const pres = root ? root.querySelectorAll('pre') : [];
      L.push('pre 数量: ' + pres.length);
      for (let i = 0; i < pres.length && i < 4; i++) {
        const pre = pres[i];
        const g = getComputedStyle(pre);
        const par = pre.parentElement;
        const gp = par ? getComputedStyle(par) : null;
        const code = pre.querySelector('code');
        const gc = code ? getComputedStyle(code) : null;
        L.push('#' + (i + 1) + ' pre←' + (par ? par.tagName.toLowerCase() + '.' + String(par.className).split(' ').slice(0, 2).join('.') : '-')
             + ' | pre.bg=' + g.backgroundColor + ' pre.color=' + g.color
             + ' | code.bg=' + (gc ? gc.backgroundColor : '-')
             + ' | 父.bg=' + (gp ? gp.backgroundColor : '-'));
      }
      const txt = L.join('\n');
      try { navigator.clipboard.writeText(txt); } catch (e) { }
      console.log(PREFIX + 'diagCode\n' + txt);
      new Notice(PREFIX + '诊断（已复制）：\n' + txt, 15000);
    } catch (e) { new Notice(PREFIX + '诊断失败：' + e.message); }
  }

  /* -------------------------------------------------- 扫描 */
  refresh() {
    try {
      this.removeRestoreChip();
      /* 样式表看门狗：宿主重建 head / 换主题时，我们注入的 <style> 可能被丢掉
         → 表现为"阅读态啥样式都没有"。发现就立刻补回（一次判断，开销可忽略）。 */
      if (this.styleEl && this.styleEl.isConnected === false) { try { this.applyTheme(); } catch (e) { } }
      const view = this.app.workspace.getActiveViewOfType(MarkdownView);
      if (!view || !view.contentEl) { this.hideAll(); return; }
      /* 编辑 ↔ 阅读 切换：宿主复用 DOM 节点会让块上的 memo 签名"看起来已刷过"，
         必须在这里让整篇重来一遍（详见 _syncMode）。 */
      this._syncMode(view);
      /* ── 刷新闸门（性能核心）────────────────────────────────────
         触发 refresh 的来源很多：MutationObserver（CM6 虚拟滚动会不断改 DOM）、
         scroll/resize、点击、2.5s 轮询。若每来一次就重建全部工具栏，
         长笔记打开/滚动时就会持续卡顿。
         这里用「廉价签名」判断是否真的需要重建：
           文件路径 + 文档长度 + 行数 + 光标行 + 当前渲染出的代码块行数/预览块数
         签名不变（例如只是在滚动、只是光标在同一行内移动）→ 只做定位，立刻返回。 */
      const cm = view.editor && view.editor.cm;
      let sig = ((view.file && view.file.path) || '') + '|no-cm';
      if (cm && cm.state) {
        const d = cm.state.doc;
        /* 一次选择器扫描完成三种计数（避免多次全量 DOM 查询）：
           CM 代码块行、实时预览代码块、以及 <pre>（阅读视图）——任何一个数量变化都说明
           "渲染出的代码块集合变了"（滚动进出视口、光标进出块、阅读视图渐进渲染），必须重建。 */
        let nLines = 0, nWid = 0, nPre = 0;
        try {
          const all = view.contentEl.querySelectorAll('.cm-line.HyperMD-codeblock, .cm-preview-code-block, pre');
          for (let i = 0; i < all.length; i++) {
            const cl = all[i].classList;
            if (cl && cl.contains('cm-preview-code-block')) { nWid++; continue; }
            if (cl && cl.contains('HyperMD-codeblock')) { nLines++; continue; }
            nPre++;
          }
        } catch (e) { }
        const cur = cm.state.selection && cm.state.selection.main ? cm.state.selection.main.head : 0;
        sig = ((view.file && view.file.path) || '') + '|' + d.length + '|' + d.lines + '|' + d.lineAt(cur).number + '|' + nLines + '|' + nWid + '|' + nPre;
      } else {
        /* 阅读视图（无 CM）：用 <pre> 数量兜底，兼顾渐进渲染 */
        try { sig = ((view.file && view.file.path) || '') + '|read|' + view.contentEl.querySelectorAll('pre').length; } catch (e) { }
      }
      const dirty = !!this._dirty;
      if (!dirty && this._refreshSig === sig) {
        /* ── 阅读态**必须**在这里继续走一遍上色 ──────────────────────
           原因：阅读态有「视口裁剪」——远处的块会被跳过，等滚进视口再补。
           而滚动不改文档签名的，若这里直接 return，被裁剪跳过的块就永远没人补
           → 表现为"往上翻一片白、要等重新渲染"。
           memo（_cbsSig）+ 裁剪让这一遍很便宜：已刷过的块在 memo 那步就 continue 了。 */
        try {
          if (typeof view.getMode === 'function' && view.getMode() === 'preview') {
            /* 还有待补的块才走上色（_readPending=被裁剪跳过的，_readMiss=新出现的未刷块） */
            if ((this._readPending || 0) > 0 || (this._readMiss || 0) > 0) this.applyReadingTheme(view);
            this.decorateTables(view.contentEl || view.containerEl);
          }
        } catch (e) { }
        this.position();
        try { this.positionTableBar(); } catch (e) { }
        return;
      }
      /* ── 重活节流（打开文件慢的关键之一）─────────────────────────
         初次渲染 / 连续打字 / 快速滚动时，CM6 会高频改动 DOM，
         MutationObserver 就把 refresh 连着叫起来；每轮都做「findRuns + 建工具栏 + 上色」
         的话，打开一篇长笔记的前一两秒会被几十次全量重建拖死。
         这里限制重活最快 120ms 一次，中间只做定位；被挡掉的那次用定时器补一轮。 */
      const now = Date.now();
      if (now - (this._heavyAt || 0) < 120) {
        this._dirty = true;                       /* 保持"待重做"，别丢 */
        if (!this._heavyTimer) {
          const self = this;
          this._heavyTimer = window.setTimeout(function () { self._heavyTimer = 0; self.schedule(); }, 120);
        }
        this.position();
        try { this.positionTableBar(); } catch (e) { }
        return;
      }
      this._heavyAt = now;
      this._refreshSig = sig;
      this._dirty = false;
      /* ─────────────────────────────────────────────────────────── */
      /* 表格列宽：**任何视图模式、任何开关状态下都必须先应用**（独立于代码块工具栏）。
         之前只在主流程尾部调用 → 关掉「显示代码块工具栏」时 refresh 提前 return，
         列宽永远应用不上；阅读视图也走的是不同分支，容易漏。现在收敛到这一处。 */
      try { this.decorateTables(view.contentEl || view.containerEl); } catch (e) { }
      if (!this.settings.showToolbar) { this.hideAll(); this.removeRestoreChip(); try { this.positionTableBar(); } catch (e) { } return; }
      /* 阅读视图：CSS 选择器不可靠（可见卡片是 .el-pre 外层），直接用 JS 上色；阅读态是静态 DOM，改它零风险 */
      try {
        if (typeof view.getMode === 'function' && view.getMode() === 'preview') {
          this.hideAll();
          this.removeRestoreChip();
          this.applyReadingTheme(view);
          /* 刚切到阅读视图 / 刚打开行号：立刻把队列跑掉一小段（8ms 预算），
             剩下的交给分片 —— 保证"切过来就能看到行号"，而不是等好几秒（甚至以为没生效）。 */
          if (this._lnFlushOnce) { this._lnFlushOnce = false; this.flushLN(8); }
          this.removeTableBar();
          this.decorateTables(view.contentEl || view.containerEl);
          return;
        }
      } catch (e) { }
      const content = view.contentEl.querySelector('.cm-content');
      if (!content) { this.hideAll(); return; }
      if (this._content !== content) { this._content = content; this.reobserve(content); }

      const runs = this.findRuns(content);
      for (let i = 0; i < runs.length; i++) {
        const raw = this.langOfRun(view, runs[i]);
        runs[i].lang = normLang(raw);
        runs[i].disp = dispLang(raw);
      }
      /* 行号：全局默认（settings.lineNumbers）+ 每个代码块单独覆盖（settings.blockLineNumbers[id]）
         id 必须走 blockIdOf（只读文档、不依赖 DOM），否则本块开关的覆盖值会匹配不上。
         性能：**没有任何「本块覆盖」时直接跳过 id 计算**（blockIdOf 含文档扫描 + getRange，
         代码块一多就是每轮刷新的主要开销）；此时一律听全局开关。 */
      const lnMap = this.settings.blockLineNumbers || {};
      const hasOverrides = Object.keys(lnMap).length > 0 || (this._lnSessionCount || 0) > 0;
      /* 行号三级作用域：**本文件 > 本块 > 全局**（本文件设为"强制开/关"时整篇听它） */
      const fileLn = this.lnForFile(view);   /* 本文件行号（每篇各自控制，见 lnForFile） */
      for (let i = 0; i < runs.length; i++) {
        const run = runs[i];
        let show = fileLn;   /* 行号：每篇文件各自控制 */
        if (hasOverrides) {
          try {
            const ev = view.editor && view.editor.cm;
            if (ev && ev.state && ev.posAtDOM) run.docBegin = ev.state.doc.lineAt(ev.posAtDOM(run.begin, 0)).number;
          } catch (e) { }
          const id = this.blockIdOf(view, run);
          /* 两级解析：
             1) 会话级覆盖（key = 该块的行 DOM 元素）—— 点击「本块行号」时立刻写入，优先命中
             2) 持久化覆盖 settings.blockLineNumbers[id]（按内容哈希）
             3) 全局开关 settings.lineNumbers —— 最终兜底「听调度」
             全局开关一动会清空 1) 和 2)，所以「不管你本块设了啥，全局都会开或者关」。 */
          const sess = this._lnSession ? this._lnSession.get(run.begin) : undefined;
          show = (sess !== undefined) ? sess : (lnMap[id] !== undefined ? lnMap[id] : fileLn);
          run._lnId = id;
        } else {
          run._lnId = undefined;
        }
        run._lnShow = show;
        /* 在块的每行上加/撤 cbs-ln-show（只控制 ::before 是否显示，不动 font-size/line-height/padding，不影响 CM6 行高） */
        for (let k = 0; k < run.els.length; k++) { try { run.els[k].classList.toggle('cbs-ln-show', !!show); } catch (e) { } }
      }
      const keep = new Set();
      for (let i = 0; i < runs.length; i++) {
        const run = runs[i];
        const sig = String(i);
        keep.add(sig);
        let ov = this.overlays.get(sig);
        if (!ov) { ov = this.buildBar(view, run); document.body.appendChild(ov); this.overlays.set(sig, ov); }
        ov._run = run; ov._view = view;
        if (ov._sync) ov._sync(run);
      }
      this.overlays.forEach(function (ov, sig) { if (!keep.has(sig)) { ov.remove(); this.overlays.delete(sig); } }, this);
      /* 实时预览下，没聚焦的代码块由 Obsidian 用 .cm-preview-code-block 渲染，
         它们不是 CM6 编辑行，单独刷成深色卡（不影响编辑态） */
      try { this.paintPreviewWidgets(THEMES[this.settings.theme] || THEMES[DEFAULTS.theme]); } catch (e) { }
      /* 实时预览里「光标不在表内」的表格由 .cm-table-widget 渲染成 HTML，同样支持拖拽调宽 */
      try { this.decorateTables(view.contentEl || view.containerEl); } catch (e) { }
      this.position();
      /* 表格工具栏：编辑态且光标在表格内才出现（独立于代码块工具栏，互不影响） */
      try { this.positionTableBar(); } catch (e) { }
    } catch (e) { console.error(PREFIX, e); }
  }

  /* ---------------- 阅读视图：用 JS 直接上色（与编辑器同一套主题，只是没有工具栏/行号） ----------------
     性能约定（重要）：每个代码块只按「当前设置版本」刷一次，之后靠 _cbsSig 跳过。
     原来这里每 1.2s 把整篇的代码块全量重刷一遍（还给每个后代元素写 3 条 inline !important），
     代码块一多就持续卡顿、首屏也要等 JS 跑完才出效果。 */
  /* 超大代码块保护阈值：阅读态跳过「行号 DOM 重建」与「逐 span 上色」。
     一个 1600 行 / 87KB 的代码块，光是建行号 DOM（每行 2 个 span）就要造 3000+ 节点，
     逐 span 上色还要几千次样式写 —— 整篇会卡死。块太大时让 Prism/宿主保持原样最稳。 */
  isHugeCode(raw) {
    if (!raw) return false;
    if (raw.length > 40000) return true;
    let n = 0;
    for (let i = 0; i < raw.length; i++) if (raw.charCodeAt(i) === 10) { n++; if (n > 600) return true; }
    return false;
  }
  themeName(id) {
    if (id === THEME_FOLLOW) return '跟随主题（Hadesr UI）';
    return (THEMES[id] || {}).name || id;
  }
  /* ── 配色归属：数据在主题里，插件只切类名 ─────────────────────────────
     Hadesr UI 主题里定义了 `body.cbs-code-theme-<id>{--code-*: ...}`（9 套）与消费规则，
     并给出标记 `--cbs-code-ct`。此时插件什么都不用注入（更快），
     阅读态/编辑态吃的是同一份变量 → 天然一致。
     换到别的主题（没有该标记）时，插件回退成"自己注入整套配色"的老做法，保证仍可用。 */
  themeProvidesColors() {
    try {
      const v = getComputedStyle(document.body).getPropertyValue('--cbs-code-ct');
      return !!(v && v.trim());
    } catch (e) { return false; }
  }
  applyCodeThemeClass() {
    try {
      const cl = document.body.classList;
      Object.keys(THEMES).forEach(function (id) { cl.remove('cbs-code-theme-' + id); });
      const id = this.settings.theme;
      if (id && id !== THEME_FOLLOW && THEMES[id]) cl.add('cbs-code-theme-' + id);
      /* 主题提供配色时，历史遗留的内联配色（以前注入过）会压住主题 CSS → 清一次 */
      if (this.themeProvidesColors()) this.stripInlineColors();
    } catch (e) { }
  }
  /* ===== 主题外观 =====
     只做一件事：按设置往 <body> 上加/删类名。
     CSS 全部来自主题「Hadesr UI」（已合成进 theme.css），
     本插件不新增任何样式 —— 所以观感与装 Style Settings 时逐像素一致，也不增加渲染负担。 */
  applyAppearance() {
    try {
      const cl = document.body.classList;
      const s = this.settings;

      /* --- 彩色文件夹：三种类（主开关 + 模式 + 配色），模式和配色各自互斥 --- */
      FOLDER_COLOR_MODES.forEach(function (m) { cl.remove(m); });
      FOLDER_PALETTES.forEach(function (m) { cl.remove(m); });

      if (s.appFolderColor) {
        cl.add('bt-toggle-colorful-folder');
        const mode = FOLDER_COLOR_MODES.indexOf(s.appFolderColorMode) >= 0
          ? s.appFolderColorMode : 'folder-style-change-options-colorful-border';
        cl.add(mode);
        const pal = FOLDER_PALETTES.indexOf(s.appFolderColorPalette) >= 0
          ? s.appFolderColorPalette : 'folder-colorful-six';
        cl.add(pal);
      } else {
        cl.remove('bt-toggle-colorful-folder');
      }

      /* --- 三个独立开关 --- */
      cl.toggle('folder-icons', !!s.appFolderIcons);
      cl.toggle('remove-arrow', !!s.appNoArrow);
      cl.toggle('remove-first-folder-icon', !!s.appNoRootIcon);

      /* --- 文件树细节 --- */
      cl.toggle('remove-file-icons', !!s.appNoFileIcons);
      cl.toggle('folder-note-underline', !!s.appFolderUnderline);
      cl.toggle('folder-note-dot', !!s.appFolderDot);
      cl.toggle('dark-background-file', !!s.appDarkFileBg);
      cl.toggle('plain-file-title', !!s.appPlainFileTitle);

      /* --- 整体配色方案（13 套，互斥；配色变量全在主题里。值不合法就不认）--- */
      COLOR_SCHEME_VALUES.forEach(function (v) { cl.remove(v); });
      if (s.appColorScheme && COLOR_SCHEME_VALUES.indexOf(s.appColorScheme) >= 0) cl.add(s.appColorScheme);

      /* --- 三个样式下拉：先整组清掉，再按选择加一个（值必须合法，否则不认）--- */
      FILE_NAME_STYLE_VALUES.forEach(function (v) { cl.remove(v); });
      if (s.appFileNameStyle && FILE_NAME_STYLE_VALUES.indexOf(s.appFileNameStyle) >= 0) cl.add(s.appFileNameStyle);
      FILE_BG_SHAPE_VALUES.forEach(function (v) { cl.remove(v); });
      if (s.appFileBgShape && FILE_BG_SHAPE_VALUES.indexOf(s.appFileBgShape) >= 0) cl.add(s.appFileBgShape);
      CODEBOX_STYLE_VALUES.forEach(function (v) { cl.remove(v); });
      if (s.appCodeBoxStyle && CODEBOX_STYLE_VALUES.indexOf(s.appCodeBoxStyle) >= 0) cl.add(s.appCodeBoxStyle);

      /* --- 代码块样式（都是加个类）--- */
      cl.toggle('mute-code-indent-line', !!s.appCodeNoIndentLine);
      cl.toggle('whole-code-wrap', !!s.appCodeWrapReading);
      cl.toggle('nowrap-edit-codebox', !!s.appCodeNoWrapEdit);
      cl.toggle('muted-code-activeline-bg', !!s.appCodeNoActiveLine);

      /* --- 代码字间距：本功能唯一需要"注入一条 CSS 变量"的地方 ---
         主题在 body 上定义了 --letter-space-code（默认 0），代码块用
         calc(var(--letter-space-code) * 0.02em) 消费。用 html body 提一级特异性稳压。
         先清掉可能残留的同 id 元素（比如上次禁用时 onunload 没能跑到），再建新的。 */
      if (!this._appEl) {
        const stale = document.getElementById('hadesr-code-appearance');
        if (stale) stale.remove();
        this._appEl = document.createElement('style');
        this._appEl.id = 'hadesr-code-appearance';
        document.head.appendChild(this._appEl);
      }
      const ls = Number(s.appCodeLetterSpace) || 0;
      this._appEl.textContent = ls > 0 ? 'html body{--letter-space-code:' + ls + ';}' : '';
    } catch (e) { }
  }

  /* 退出时把本功能加的类全部摘掉 —— 与 Style Settings 的 removeClasses() 行为一致，
     避免插件被禁用后 body 上残留"幽灵类"造成样式来源说不清。 */
  clearAppearance() {
    try {
      const cl = document.body.classList;
      const plain = ['bt-toggle-colorful-folder', 'folder-icons', 'remove-arrow', 'remove-first-folder-icon',
        'remove-file-icons', 'folder-note-underline', 'folder-note-dot', 'dark-background-file',
        'plain-file-title', 'mute-code-indent-line', 'whole-code-wrap',
        'nowrap-edit-codebox', 'muted-code-activeline-bg'];
      cl.remove.apply(cl, plain);
      FOLDER_COLOR_MODES.forEach(function (m) { cl.remove(m); });
      FOLDER_PALETTES.forEach(function (m) { cl.remove(m); });
      FILE_NAME_STYLE_VALUES.forEach(function (v) { cl.remove(v); });
      FILE_BG_SHAPE_VALUES.forEach(function (v) { cl.remove(v); });
      CODEBOX_STYLE_VALUES.forEach(function (v) { cl.remove(v); });
      COLOR_SCHEME_VALUES.forEach(function (v) { cl.remove(v); });
      if (this._appEl) { this._appEl.textContent = ''; this._appEl.remove(); this._appEl = null; }
    } catch (e) { }
  }

  stripInlineColors() {
    try {
      const view = this.app.workspace.getActiveViewOfType(MarkdownView);
      const root = view && (view.contentEl || view.containerEl);
      if (!root) return;
      const nodes = root.querySelectorAll('.el-pre,.cm-preview-code-block,pre,pre>code,pre code');
      const props = ['background', 'background-color', 'color', 'border', 'border-radius', 'box-shadow', 'padding', 'min-height'];
      for (let i = 0; i < nodes.length; i++) {
        for (let k = 0; k < props.length; k++) { try { nodes[i].style.removeProperty(props[k]); } catch (e) { } }
      }
    } catch (e) { }
  }
  /* 字体/字号（与配色无关）——主题提供配色时插件只注入这一条 */
  /* 字体：正文字体/字号只作用**阅读视图**（编辑态正文不动，避免打乱 CM6 行高缓存）；
     代码字体/字号同样只作用阅读视图（编辑态代码字号绝不动 —— 会错行）。 */
  fontCss() {
    const out = [];
    const readRoot = '.markdown-rendered,.markdown-preview-view';
    if (this.settings.fontBody || this.settings.fontBodySize) {
      out.push(readRoot + '{'
        + (this.settings.fontBody ? 'font-family:' + this.settings.fontBody + ' !important;' : '')
        + (this.settings.fontBodySize ? 'font-size:' + this.settings.fontBodySize + 'px !important;' : '')
        + '}');
    }
    const rb = this.settings.fontBodySize ? ';font-size:' + this.settings.fontBodySize + 'px !important' : '';
    if (rb) out.push(readRoot + ' p,' + readRoot + ' li,' + readRoot + ' td,' + readRoot + ' h1,' + readRoot + ' h2,' + readRoot + ' h3,' + readRoot + ' h4,' + readRoot + ' h5,' + readRoot + ' h6{font-size:inherit !important}');
    /* 代码块字体/字号：覆盖 pre 与 code **两层**。
       只改 pre 不够 —— Obsidian 阅读态代码字号设在 code 上（font-size: var(--code-size)），
       只改 pre 会改不到 code，于是「代码块字号」下拉形同虚设（这正是「编辑/阅读字号不一致」的另一半原因）。 */
    const rc = '.markdown-rendered pre,.markdown-preview-view pre,.cm-preview-code-block,.cm-preview-code-block pre,.markdown-rendered pre code,.markdown-preview-view pre code,.cm-preview-code-block code';
    if (this.settings.codeFont || this.settings.codeFontSize) {
      out.push(rc + '{'
        + (this.settings.codeFont ? 'font-family:' + this.settings.codeFont + ' !important;' : '')
        + (this.settings.codeFontSize ? 'font-size:' + this.settings.codeFontSize + 'px !important;' : '')
        + '}');
    }
    return out.join('\n');
  }
  _oldFontCss() {
    const f = this.settings.codeFont, z = this.settings.codeFontSize;
    if (!f && !z) return '';
    const rc = '.markdown-rendered pre,.markdown-preview-view pre,.cm-preview-code-block,.cm-preview-code-block pre';
    return rc + '{' + (f ? 'font-family:' + f + ' !important;' : '') + (z ? 'font-size:' + z + 'px !important;' : '') + '}';
  }

  /* ── 阅读态的 http / REST 补色 ────────────────────────────────────────
     Obsidian 的 Prism 没有 http 语法，会 fallback 到 C 高亮；
     这里按 fence 语言或内容嗅探，接管 http 请求/响应的 token 着色。 */
  httpHighlight(code, raw, lang) {
    try {
      if (!code) return;
      const text = (raw !== undefined && raw !== null) ? String(raw)
        : (code._cbsText !== undefined ? code._cbsText : (code.textContent || ''));
      if (!text) return;
      /* 判定是否要接管：fence 是 http 家族 → 一定接管；否则只看内容头 400 字符 */
      const isHttpLang = !!(lang && /^(https?|rest)$/i.test(String(lang)));
      if (!isHttpLang) {
        const head = text.slice(0, 400);
        /* 请求行（GET /x HTTP/1.1 或 GET /x） / 响应行（HTTP/1.1 200 OK）——
           必须落在**行首**，这样 shell / 脚本里的 "curl -X GET" 之类不会误判。 */
        const isReq = /^[ \t]*(?:GET|POST|PUT|DELETE|HEAD|OPTIONS|PATCH|TRACE|CONNECT|PRI)[ \t]+\S/m.test(head);
        const isRes = /^[ \t]*HTTP\/[\d.]+/m.test(head);
        if (!isReq && !isRes) return;
      }
      /* 指纹幂等：内容变了（长度或首行变了）才重新着色 */
      const fp = text.length + ':' + (text.split('\n')[0] || '').slice(0, 40);
      if (code.getAttribute('data-cbs-http') === fp) return;
      const esc = function (x) { return String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
      /* 每个 span 挂多个等价类名：Hadesr UI 主题认 request-target/status-code 这些，
         其它主题走 Obsidian 自带的 .token.method / .token.string / .token.number 也能上色。 */
      const out = text.split('\n').map(function (line) {
        let m = /^([ \t]*)([A-Z]+)([ \t]+)(\S+)([ \t]+)(HTTP\/[\d.]+)([\s\S]*)$/.exec(line);
        if (m) return m[1] + '<span class="token method function-name property">' + esc(m[2]) + '</span>' + m[3]
          + '<span class="token request-target url property-access">' + esc(m[4]) + '</span>' + m[5]
          + '<span class="token http-version version property">' + esc(m[6]) + '</span>' + esc(m[7]);
        m = /^([ \t]*HTTP\/[\d.]+)([ \t]+)(\d{3})([ \t]*)([\s\S]*)$/.exec(line);
        if (m) return '<span class="token http-version version property">' + esc(m[1]) + '</span>' + m[2]
          + '<span class="token status-code number value">' + esc(m[3]) + '</span>' + m[4]
          + (m[5] ? '<span class="token reason-phrase string">' + esc(m[5]) + '</span>' : '');
        m = /^([ \t]*)([A-Z]+)([ \t]+)(\S+)([ \t]*)$/.exec(line);
        if (m) return m[1] + '<span class="token method function-name property">' + esc(m[2]) + '</span>' + m[3]
          + '<span class="token request-target url property-access">' + esc(m[4]) + '</span>' + m[5];
        m = /^([A-Za-z][\w-]*)(:)([ \t]*)([\s\S]*)$/.exec(line);
        if (m) return '<span class="token header-name property property-access">' + esc(m[1]) + '</span>' + m[2] + m[3]
          + '<span class="token header-value string">' + esc(m[4]) + '</span>';
        return esc(line);
      }).join('\n');
      code.innerHTML = out;
      /* innerHTML 被换掉了：把行号包装状态复位，让 queueLN 有机会按新的 DOM 重新拆行。
         _cbsOrig 同步成新标记，关闭行号时还原的是"有色的"版本（不是原味单色）。 */
      code._cbsOrig = out;
      code._cbsWrapped = false;
      code._cbsText = undefined;
      code.setAttribute('data-cbs-http', fp);
    } catch (e) { }
  }

  /* ── 自定义高亮：规则解析 / 取规则 / 渲染 ───────────────────────────── */

  /* 解析设置里的自定义规则：每行 `语言 | token类型 | 正则`；`#` 或 `//` 开头是注释。
     正则里允许出现 `|`（从第 3 段起整段拼回），默认加 `i`（不区分大小写，对命令/关键字最实用）。 */
  parseHLRules(text) {
    const out = [];
    try {
      const lines = String(text || '').split('\n');
      for (let i = 0; i < lines.length; i++) {
        const ln = lines[i].trim();
        if (!ln || ln.charAt(0) === '#' || ln.slice(0, 2) === '//') continue;
        const parts = ln.split('|');
        if (parts.length < 3) continue;
        const langs = parts[0].trim(), token = parts[1].trim().toLowerCase(), src = parts.slice(2).join('|').trim();
        if (!langs || !token || !src || !HL_CLASS[token]) continue;
        let re = null;
        try { re = new RegExp(src, 'i'); } catch (e) { re = null; }
        if (!re) continue;
        out.push({ langs: langs.split(/[,\s]+/).filter(Boolean), token: token, cls: HL_CLASS[token], reG: new RegExp(re.source, 'gi') });
      }
    } catch (e) { }
    return out;
  }
  /* 规则表（内置 + 自定义），带缓存：设置没变就不重建 */
  _ensureHLRules() {
    const src = this.settings.customRules || '';
    if (this._hlAll && this._hlAllSrc === src) return;
    this._hlAllSrc = src;
    const built = HL_BUILTIN.map(function (r) {
      const re = r[2];
      return { langs: String(r[0]).split(','), token: r[1], cls: HL_CLASS[r[1]] || 'cbs-hl-keyword',
               reG: new RegExp(re.source, re.flags.indexOf('g') >= 0 ? re.flags : re.flags + 'g') };
    });
    this._hlAll = built.concat(this.parseHLRules(src));
  }
  /* 取某语言可用的规则：{ rules: [...], own: 是否有该语言的**专属**规则 }。
     own=false（只有通用 '*' 命中）时不接管 —— 借此保住 bash / js / python 等宿主原生高亮。 */
  hlRulesFor(lang) {
    try {
      this._ensureHLRules();
      const names = [dispLang(lang), normLang(lang)];
      let own = false;
      const picked = [];
      for (let i = 0; i < this._hlAll.length; i++) {
        const r = this._hlAll[i];
        let hit = false, star = false;
        for (let k = 0; k < r.langs.length; k++) {
          if (r.langs[k] === '*') star = true;
          else if (names.indexOf(r.langs[k]) >= 0) hit = true;
        }
        if (hit) own = true;
        if (star || hit) picked.push(r);
      }
      return { rules: picked, own: own };
    } catch (e) { return { rules: [], own: false }; }
  }
  /* 自定义高亮入口：返回 true = 已接管 */
  customHighlight(code, raw, lang) {
    try {
      if (!code || !this.settings.customHighlight) return false;
      const text = (raw !== undefined && raw !== null) ? String(raw)
        : (code._cbsText !== undefined ? code._cbsText : (code.textContent || ''));
      if (!text) return false;
      const got = this.hlRulesFor(lang);
      if (!got.own || !got.rules.length) return false;      /* 没有专属规则 → 不插手 */
      if (this.isHugeCode(text)) return false;              /* 超大块不做（逐行正则代价高） */
      const fp = 'hl|' + (this._hlVer || 1) + '|' + text.length + '|' + (text.split('\n')[0] || '').slice(0, 40) + '|' + String(lang || '');
      if (code.getAttribute('data-cbs-hl') === fp) return false;
      const lines = text.split('\n'), out = [];
      for (let i = 0; i < lines.length; i++) out.push(this._hlLine(lines[i], got.rules));
      const html = out.join('\n');
      code.innerHTML = html;
      code._cbsOrig = html;
      code._cbsWrapped = false;
      code._cbsText = undefined;
      code.setAttribute('data-cbs-hl', fp);
      return true;
    } catch (e) { return false; }
  }
  /* 单行着色：按规则顺序找匹配，先匹配的先占位（后面的匹配不能与已占位区间重叠），最后按位置拼 HTML。
     占位用**字符占用表**（Uint8Array）而不是区间列表 —— 越密的行越快（避免 O(marks²)）。 */
  _hlLine(line, rules) {
    const n = line.length;
    if (!n) return '';
    const taken = new Uint8Array(n);
    const marks = [];
    for (let ri = 0; ri < rules.length; ri++) {
      const reG = rules[ri].reG;
      reG.lastIndex = 0;
      let m, guard = 0;
      while ((m = reG.exec(line)) !== null && guard++ < 400) {
        const len = m[0].length;
        if (!len) { reG.lastIndex++; continue; }
        const s = m.index, e = s + len;
        let free = true;
        for (let k = s; k < e; k++) { if (taken[k]) { free = false; break; } }
        if (free) {
          for (let k = s; k < e; k++) taken[k] = 1;
          marks.push({ s: s, e: e, cls: rules[ri].cls, t: m[0] });
        }
      }
    }
    if (!marks.length) return escHtml(line);
    marks.sort(function (a, b) { return a.s - b.s; });
    let html = '', pos = 0;
    for (let i = 0; i < marks.length; i++) {
      const mk = marks[i];
      if (mk.s < pos) continue;
      html += escHtml(line.slice(pos, mk.s)) + '<span class="token ' + mk.cls + '">' + escHtml(mk.t) + '</span>';
      pos = mk.e;
    }
    return html + escHtml(line.slice(pos));
  }

  /* ── 运行时语言别名──────────────────────────────────────────
     背景（已从 Obsidian 主程序里核实）：Obsidian 的语言库是**内置固定**的 ——
       · 阅读态 = Prism（371 种）：有 batch / powershell / http / ini / bash，
         **没有** cmd / bat / ps1 / zsh / node / curl / conf / env（这些只是别名，Prism 里不存在）；
       · 编辑态 = CodeMirror mode（122 种）：有 shell（别名 bash/sh/zsh）/ powershell / http / properties(ini)，
         **没有** batch / cmd / bat / ps1。
     所以在 fence 里写 `cmd`/`bat` 这类名字，Obsidian 两端都不认识 → 一点颜色都没有
     （这就是用户说的"只加了个名字、等于没改"）。
     这里做力所能及的一件事：**给 Prism 注册别名**，让笔记里已经写下的 cmd/bat/ps1/... 在**阅读态**
     能用对应规范语言的语法上色。编辑态改不了（Obsidian 的 mode 表是内置的，插件无扩展点）——
     要编辑态也有颜色，fence 必须直接写规范名（powershell / bash / http / ini）。
     幂等 + 重试：Prism 由宿主异步加载，onload 时可能还没到，所以带重试。 */
  registerRuntimeAliases() {
    const self = this;
    const attach = function () {
      try {
        const P = window.Prism;
        if (!P || !P.languages || self._prismAliased) return false;
        const L = P.languages;
        const set = function (alias, from) { if (!L[alias] && L[from]) L[alias] = L[from]; };
        set('cmd', 'batch'); set('bat', 'batch'); set('dos', 'batch');
        set('ps1', 'powershell'); set('pwsh', 'powershell');
        set('zsh', 'bash'); set('sh', 'bash');
        set('curl', 'bash'); set('console', 'bash'); set('terminal', 'bash');
        set('node', 'javascript'); set('mjs', 'javascript'); set('cjs', 'javascript');
        set('conf', 'ini'); set('cfg', 'ini'); set('env', 'ini'); set('dotenv', 'ini');
        set('rest', 'http');
        self._prismAliased = true;
        return true;
      } catch (e) { return false; }
    };
    if (attach()) return;
    let tries = 0;
    this._prismTimer = window.setInterval(function () {
      tries++;
      if (attach() || tries > 40) { clearInterval(self._prismTimer); self._prismTimer = 0; }
    }, 250);
  }

  paintSig() { return 'v' + (this._paintVer || 1); }
  bumpPaint() { this._paintVer = (this._paintVer || 1) + 1; this._dirty = true; this.schedule(); }

  /* ── 阅读视图上色 ──────────────────────────────────────────────────────
     要点：每块只刷一次；卡片/胶囊引用缓存在块上；只处理视口附近；
     配色靠 CSS 变量，不在 JS 里逐 span 写颜色。 */
  applyReadingTheme(view) {
    try {
      if (!this.settings.showInReading) return;
      const root = view.contentEl || view.containerEl;
      if (!root) return;
      const pres = root.querySelectorAll('pre');
      const rootSig = this.paintSig();
      const themedR = this.themeProvidesColors();   /* 主题自带配色 → 不写内联 */
      const followR = this.settings.theme === THEME_FOLLOW;
      const t = THEMES[this.settings.theme] || THEMES[DEFAULTS.theme];
      const hasOvR = Object.keys(this.settings.blockLineNumbers || {}).length > 0 || (this._lnSessionCount || 0) > 0;
      const vh = window.innerHeight;
      let pending = 0, miss = 0;
      for (let i = 0; i < pres.length; i++) {
        const pre = pres[i];
        /* 卡片节点：首次算出后缓存（element 复用），失效（被宿主重建）才重算 */
        let card = pre._cbsCard;
        if (!card || card.isConnected === false) card = pre._cbsCard = (this.cardWrapper(pre, root) || pre);
        /* 已刷过且胶囊还在 → 直接跳过（这是性能关键，不做任何 DOM 查询） */
        if (pre._cbsSig === rootSig && card._cbsFlair && card._cbsFlair.isConnected !== false) continue;
        miss++;
        /* 视口裁剪：远处的块留给滚动时补，不记签名 */
        try {
          const r0 = pre.getBoundingClientRect();
          if (r0.bottom < -2000 || r0.top > vh + 2000 || r0.height === 0) { pending++; continue; }
        } catch (e) { }
        const rcode = pre.querySelector('code') || pre;
        const raw = rcode._cbsText !== undefined ? rcode._cbsText : (rcode.textContent || '');
        const huge = this.isHugeCode(raw);   /* 超大块：跳行号重建 */
        /* 超大块（上千行、几万高亮 span）跳过末尾换行修正 —— TreeWalker 会遍历整块几万节点，
           只为改最后一个文本节点，纯浪费；跳过它省掉阅读态开大代码块时的一大笔开销。 */
        if (!huge) this._trimTrailingNL(pre);   /* 去掉末尾 \n，修「文字偏上」 */
        /* 没有「本块行号」覆盖时不必算哈希（要读整段文本，是每块的主要开销之一） */
        let rshow = (this.lnForFile(view) !== undefined) ? this.lnForFile(view) : !!this.settings.lineNumbers;
        if (hasOvR) {
          const lm = /language-([\w+#.-]+)/.exec(pre.className || '');
          const rid = this.blockHash(raw, lm ? normLang(lm[1]) : 'plaintext');
          const rlnMap = this.settings.blockLineNumbers || {};
          rshow = rlnMap[rid] !== undefined ? rlnMap[rid] : !!this.settings.lineNumbers;
        }
        /* 底色/颜色仍以 CSS 为主；这里再补一次**内联兜底**（每块只写一次，memo 保证不重复）：
           CSS 有可能被主题更高优先级规则压掉、或注入的样式表被宿主重建时丢掉，
           只靠 CSS 就会出现"阅读态啥样式都没有"。内联 !important 优先级最高，最稳。 */
        if (!followR && !themedR) this.paintCard(card, t);   /* 主题已提供配色时不写内联 */
        /* 行号开着时把左内边距收小，让数字列更贴近卡片左缘（不靠 16px 大留白）。
           数值与 styles.css 里 .cbs-rln::before 的「列宽 + 右间隔」是配套的：
           卡片 padding-left 从 8px 收到 4px（数字离左边缘更近），
           gutter 的「列宽 + 右间隔」之和相应加长 → **代码本身的位置一点没动**。 */
        if (rshow) card.style.setProperty('padding-left', '4px', 'important');
        else card.style.removeProperty('padding-left');
        /* 卡片内部零 padding/margin 由 styles.css 的 CSS 规则负责（不再逐后代写 inline） */
        if (card !== pre && !followR && !themedR) this.clearInner(pre, t);
        /* http/https：阅读态宿主（Prism）没有 http 语法、会 fallback 到 C 去高亮 →
           自己接管（fence 明确是 http 家族就无条件接管，否则按内容嗅探，见 httpHighlight）。 */
        let lang = null;
        try { const lm0 = /language-([\w+#.-]+)/.exec(pre.className || ''); if (lm0) lang = lm0[1]; } catch (e) { }
        this.httpHighlight(rcode, raw, lang);
        /* 自定义正则高亮：http 已接管就跳过；否则按内置/自定义规则给「Obsidian 不认识的语言」上色 */
        if (!rcode.getAttribute('data-cbs-http')) this.customHighlight(rcode, raw, lang);
        this.queueLN(rcode, huge ? false : rshow);      /* 行号：空闲分片应用，避免切换卡顿 */
        this._readingCopy(card, pre);                   /* 原生按钮隐藏 + 语言胶囊（内部缓存到 card._cbsFlair） */
        pre._cbsSig = rootSig;                          /* 标记已刷（配色由 CSS 负责） */
      }
      /* 供滚动回调判断"还需不需要跑这一趟"：都为 0 时可整趟跳过 */
      this._readPending = pending;
      this._readMiss = miss;
    } catch (e) { }
  }

  _directPreCount(node) { let c = 0; const ch = node.children || []; for (let k = 0; k < ch.length; k++) if (ch[k].tagName === 'PRE') c++; return c; }
  /* 从 pre 往上找「外层卡片容器」：已知包装容器（.el-pre / .cm-preview-code-block），
     或只包一个 pre 的小容器；找不到就返回 null（pre 自己当卡） */
  cardWrapper(pre, root) {
    let el = pre.parentElement;
    while (el && el !== root && el.tagName !== 'BODY' && el.tagName !== 'PRE') {
      const cls = el.className || '';
      if (/(^|\s)(el-pre|cm-preview-code-block)(\s|$)/.test(cls)) return el;
      if (el.children.length <= 2 && this._directPreCount(el) === 1) return el;
      el = el.parentElement;
    }
    return null;
  }

  /* Obsidian 的代码内容末尾自带 \n（它自己复制时都会 substr 切掉），渲染出来就是
     「文字下面多一整行空白」→ 文字偏上、上下不居中。这里把渲染 DOM 里末尾的换行去掉。
     （阅读/预览是静态 DOM，可以安全修改；实时预览的控件若被重建，下轮 refresh 会再修一次） */
  _trimTrailingNL(pre) {
    try {
      const code = pre.querySelector('code') || pre;
      const w = document.createTreeWalker(code, NodeFilter.SHOW_TEXT);
      let last = null, n;
      while ((n = w.nextNode())) last = n;
      if (last && /[\n\r]+$/.test(last.nodeValue || '')) {
        last.nodeValue = last.nodeValue.replace(/[\n\r]+$/, '');
      }
    } catch (e) { }
  }

  /* 实时预览里、没聚焦的代码块是预览控件（.cm-preview-code-block），单独上深色卡；
     它永远不是 CM6 编辑行，所以这个调用对编辑态零影响 */
  paintPreviewWidgets(t) {
    try {
      if (!this.settings.showInReading) return;
      const root = this.app.workspace.getActiveViewOfType(MarkdownView);
      const el = (root && (root.contentEl || root.containerEl)) || document;
      const wraps = el.querySelectorAll('.cm-preview-code-block');
      const themedR = this.themeProvidesColors();   /* 主题自带配色 → 不写内联 */
      const followR = this.settings.theme === THEME_FOLLOW;
      const rootSig = this.paintSig();
      const hasOvR = Object.keys(this.settings.blockLineNumbers || {}).length > 0 || (this._lnSessionCount || 0) > 0;
      const vh2 = window.innerHeight;
      for (let i = 0; i < wraps.length; i++) {
        const w = wraps[i];
        if (w._cbsSig === rootSig && w.querySelector && w.querySelector('.cbs-flair')) continue;   /* 已刷过 → 跳过（性能关键） */
        try { const r0 = w.getBoundingClientRect(); if (r0.bottom < -2000 || r0.top > vh2 + 2000 || r0.height === 0) continue; } catch (e) { }
        const pre = w.querySelector('pre');
        const pcode = pre ? (pre.querySelector('code') || pre) : (w.querySelector('code') || w);
        const raw = pcode._cbsText !== undefined ? pcode._cbsText : (pcode.textContent || '');
        const huge = this.isHugeCode(raw);
        let rshow = this.lnForFile(root);   /* 行号：每篇文件各自控制 */
        if (hasOvR) {
          const lm = /language-([\w+#.-]+)/.exec(pre ? (pre.className || '') : (w.className || ''));
          const rid = this.blockHash(raw, lm ? normLang(lm[1]) : 'plaintext');
          const rlnMap = this.settings.blockLineNumbers || {};
          rshow = rlnMap[rid] !== undefined ? rlnMap[rid] : !!this.settings.lineNumbers;
        }
        if (!followR && !themedR) this.paintCard(w, t);   /* 主题已提供配色时不写内联 */
        /* 行号开着时收小左内边距，让数字列贴近卡片左缘（与 styles.css 的 gutter 列宽配套） */
        if (rshow) w.style.setProperty('padding-left', '4px', 'important');
        if (pre) { if (!huge) this._trimTrailingNL(pre); if (!followR && !themedR) this.clearInner(pre, t); }
        let lang = null;
        try { const lm0 = /language-([\w+#.-]+)/.exec(pre ? (pre.className || '') : (w.className || '')); if (lm0) lang = lm0[1]; } catch (e) { }
        this.httpHighlight(pcode, raw, lang);           /* 实时预览同样接管 http（压掉 C fallback） */
        if (!pcode.getAttribute('data-cbs-http')) this.customHighlight(pcode, raw, lang);
        this.queueLN(pcode, huge ? false : rshow);      /* 空闲分片应用，避免切换卡顿 */
        /* 隐藏原生复制按钮 / 角标，挂我们自己的「语言标记 = 复制」角标 */
        this._readingCopy(w, pre);
        /* token 配色同样交给 CSS（applyTheme 的 PRISM_SLOTS） */
        w._cbsSig = rootSig;
      }
    } catch (e) { }
  }

  /* 外卡：底色 + 圆角 + **只在这里上一次**内边距（对齐语雀的细窄观感） */
  paintCard(el, t) {
    el.style.setProperty('background', t.bg, 'important');
    el.style.setProperty('color', t.fg, 'important');
    el.style.setProperty('border', 'none', 'important');
    el.style.setProperty('border-radius', '6px', 'important');
    el.style.setProperty('padding', '4px 16px', 'important');
    el.style.setProperty('box-shadow', 'none', 'important');
    el.style.setProperty('margin', '1em 0', 'important');
  }
  /* 内层 pre：透明 + 内边距清零（防止和外卡叠加 → 又高又宽） */
  clearInner(el, t) {
    el.style.setProperty('background', 'transparent', 'important');
    el.style.setProperty('color', t.fg, 'important');
    el.style.setProperty('padding', '0', 'important');
    el.style.setProperty('margin', '0', 'important');
    el.style.setProperty('min-height', '0', 'important');   /* Obsidian 的 .markdown-rendered pre 有 min-height:38px */
    el.style.setProperty('border-radius', '0', 'important');
    el.style.setProperty('box-shadow', 'none', 'important');
  }

  /* 阅读/预览视图的行号：阅读态没有 .cm-line，无法用 CSS 计数器，只能 JS 拆行。
     拆行时保留 token 颜色（span class）；多行 token 按行拆分但保留 class → 颜色不断。
     用 内部属性记录原始结构，关闭时还原，保证开关可逆且幂等。 */
  _splitCodeLines(code) {
    const segs = [];
    const rec = function (n, inh) {
      const ch = n.childNodes;
      for (let i = 0; i < ch.length; i++) {
        const c = ch[i];
        if (c.nodeType === 3) { if (c.nodeValue) segs.push({ cls: inh || null, text: c.nodeValue }); }
        else if (c.nodeType === 1) { rec(c, [inh, c.className].filter(Boolean).join(' ')); }
      }
    };
    rec(code, null);
    const lines = [[]];
    for (let s = 0; s < segs.length; s++) {
      const parts = segs[s].text.split('\n');
      for (let i = 0; i < parts.length; i++) {
        if (i > 0) lines.push([]);
        if (parts[i].length) lines[lines.length - 1].push({ cls: segs[s].cls, text: parts[i] });
      }
    }
    if (lines.length > 1 && lines[lines.length - 1].length === 0) lines.pop();  /* 去掉代码块末尾 \n 产生的空行 */
    return lines;
  }
  /* 阅读态行号：**分片**应用。
     拆行会把整块代码重建成"每行一个 span"，大文档一次全做会卡住 UI（尤其编辑→阅读切换时）；
     这里排队 + 每批带时间预算，先让页面渲染出来，行号随后补上。 */
  queueLN(code, on) {
    try {
      if (!code) return;
      if (on) { if (code._cbsWrapped === true) return; }        /* 已经包过 → 无事可做 */
      else { if (code._cbsWrapped !== true) return; }           /* 从没包过 → 也不用"还原"，直接省掉一次入队 */
      this._lnQueue = this._lnQueue || [];
      for (let i = 0; i < this._lnQueue.length; i++) if (this._lnQueue[i].code === code) return;
      this._lnQueue.push({ code: code, on: !!on });
      this._runLNQueue(true);
    } catch (e) { }
  }
  /* 调度：rAF + setTimeout。
     原因（用户反馈「编辑转阅读后行号不出现，要再切一次文件才出来」）：
     idle 回调在宿主正忙的时候（切模式那几秒）会被一直推到 timeout 才执行，而每片只做 4 个块
     → 一篇多代码的笔记要好几秒行号才陆续出现，体感就是"根本没出来"。
     rAF 是每帧必跑（渲染前），首批给 12ms / 16 块的宽预算让首屏立刻补齐，
     之后 6ms / 6 块分片，剩下的一直排队到做完 —— 既快又不长时间占主线程。 */
  _runLNQueue(first) {
    const self = this;
    if (this._lnScheduled) return;
    this._lnScheduled = true;
    const budget = first ? 12 : 6;
    const maxBlocks = first ? 16 : 6;
    const step = function () {
      self._lnScheduled = false;
      const q = self._lnQueue;
      if (!q || !q.length) return;
      const t0 = Date.now();
      let made = 0;
      while (q.length && Date.now() - t0 < budget && made < maxBlocks) {
        const it = q.shift();
        made++;
        try { if (it.code && it.code.isConnected !== false) self.applyReadingLN(it.code, it.on); } catch (e) { }
      }
      if (q.length) self._runLNQueue(false);
    };
    if (first && window.requestAnimationFrame) window.requestAnimationFrame(step);
    else window.setTimeout(step, 0);
  }
  /* 立刻把行号队列跑掉一段（模式切换 / 刚打开行号时用）。
     只给 8ms 预算：保证"切过来马上能看到行号"，又不至于像全量同步重建那样卡一下。 */
  flushLN(budgetMs) {
    try {
      const q = this._lnQueue;
      if (!q || !q.length) return;
      const t0 = Date.now(), limit = budgetMs || 8;
      while (q.length && Date.now() - t0 < limit) {
        const it = q.shift();
        try { if (it.code && it.code.isConnected !== false) this.applyReadingLN(it.code, it.on); } catch (e) { }
      }
      if (q.length) this._runLNQueue(false);
    } catch (e) { }
  }
  /* 模式切换（编辑 ↔ 阅读）时"整篇重来一遍"。
     宿主切模式会复用一部分 DOM 节点，块上的 `_cbsSig` 签名（= 上色版本号）会让它们被当成
     "已经刷过了"直接 continue → 行号、卡片样式都不补 → 表现为「切到阅读视图行号不出现，
     得再切一次文件才出来」。这里把版本号 +1 让所有 memo 失效，并标记需要立刻 flush 行号队列。 */
  _syncMode(view) {
    try {
      const m = (view && typeof view.getMode === 'function') ? view.getMode() : '?';
      if (this._lastMode === undefined) { this._lastMode = m; return; }
      if (m === this._lastMode) return;
      this._lastMode = m;
      this._paintVer = (this._paintVer || 1) + 1;   /* 等价 bumpPaint()，但不再 schedule（我们就在 refresh 里） */
      this._dirty = true;
      this._lnFlushOnce = (m === 'preview');        /* 切到阅读态时立刻跑一遍行号队列（见 refresh 的阅读分支） */
    } catch (e) { }
  }

  applyReadingLN(code, on) {
    if (!code) return;
    try {
      if (on) {
        if (code._cbsOrig === undefined) code._cbsOrig = code.innerHTML;
        if (code._cbsWrapped) return;
        const lines = this._splitCodeLines(code);
        code._cbsText = lines.map(function (segs) { return segs.map(function (x) { return x.text; }).join(''); }).join('\n');
        code.textContent = '';
        /* 每行只建 1 个 span：行号与竖线由 CSS 计数器 `.cbs-rln::before` 画（原来是
           row + gutter + 间隔条 3 个 span，每个还写 5 条 inline 样式 —— 阅读态重建整块 DOM 的开销）。 */
        const frag = document.createDocumentFragment();
        for (let i = 0; i < lines.length; i++) {
          const row = document.createElement('span');
          row.className = 'cbs-rln';
          for (let k = 0; k < lines[i].length; k++) {
            const seg = lines[i][k];
            const sp = document.createElement('span');
            if (seg.cls) sp.className = seg.cls;
            sp.textContent = seg.text;
            row.appendChild(sp);
          }
          frag.appendChild(row);
        }
        code.appendChild(frag);        /* 一次性挂载（逐行 append 会引发布局抖动） */
        try { code.classList.add('cbs-ln-wrapped'); } catch (e) { }
        code._cbsWrapped = true;
      } else {
        if (code._cbsOrig !== undefined) { code.innerHTML = code._cbsOrig; code._cbsOrig = undefined; code._cbsWrapped = false; code._cbsText = undefined; }
        try { code.classList.remove('cbs-ln-wrapped'); } catch (e) { }
      }
    } catch (e) { }
  }

  /* 阅读/预览态：右上角「语言名胶囊」，点它即复制。
     自建胶囊替代原生角标，避免重复；原生 `.code-block-flair` / 复制按钮 / 编辑铅笔继续隐藏。 */
  _readingCopy(card, pre) {
    try {
      if (!card) return;
      if (!card.style.position || card.style.position === 'static') card.style.setProperty('position', 'relative');
      /* 隐藏原生交互元素（复制按钮 / 编辑铅笔 / 实时预览的原生角标）；搜 card + pre 父层两层，防兄弟节点漏网 */
      const hideSels = 'button.copy-code-button, .edit-block-button, .code-block-flair';
      const scopes = [card];
      try { if (pre && pre.parentElement && pre.parentElement !== card) scopes.push(pre.parentElement); } catch (e) { }
      for (let s = 0; s < scopes.length; s++) {
        const btns = scopes[s].querySelectorAll(hideSels);
        for (let i = 0; i < btns.length; i++) btns[i].style.setProperty('display', 'none', 'important');
      }
      /* 移除遗留的左上角图标按钮 */
      const oldBtn = card.querySelectorAll('.cbs-copy');
      for (let i = 0; i < oldBtn.length; i++) oldBtn[i].remove();
      /* 右侧「语言名胶囊」：若不存在则创建（幂等：宿主重建后每轮刷新会重新找到/创建），点它即复制 */
      let flair = (card._cbsFlair && card._cbsFlair.isConnected !== false) ? card._cbsFlair : card.querySelector('.cbs-flair');
      if (!flair) {
        flair = document.createElement('span');
        flair.className = 'cbs-flair';
        card.appendChild(flair);
        card._cbsFlair = flair;   /* 缓存引用：每轮靠它判断已刷且胶囊在 */;
      }
      const lm = /language-([\w+#.-]+)/.exec(pre ? (pre.className || '') : (card.className || ''));
      const lang = lm ? lm[1] : '';
      flair.textContent = lang ? langName(lang) : 'TEXT';
      /* 阅读管线会把卡片后代 padding/margin 清零 —— 关键样式用内联 !important 保住 */
      flair.style.setProperty('padding', '1px 8px', 'important');
      flair.style.setProperty('border-radius', '999px', 'important');
      flair.style.setProperty('margin', '0', 'important');
      flair._cbsCode = pre ? (pre.querySelector('code') || pre) : (card.querySelector('code') || null);
    } catch (e) { }
  }

  tokenColor(cls, t) {
    const s = String(cls);
    if (!s) return null;
    if (/comment|quote/.test(s)) return t.com;
    if (/keyword|controlKeyword|modifier/.test(s)) return t.kw;
    if (/string|regexp|char/.test(s)) return t.str;
    if (/number|atom|bool|null|constant/.test(s)) return t.num;
    if (/def|function|title/.test(s)) return t.fn;
    if (/typeName|className|namespace|builtin|qualifier|class-name|built_in|type\b/.test(s)) return t.ty;
    if (/tagName|\btag\b|entity/.test(s)) return t.tag;
    if (/attributeName|attribute|attr-name|attr\b/.test(s)) return t.at;
    if (/propertyName|\bproperty\b/.test(s)) return t.pr;
    if (/meta|annotation/.test(s)) return t.mt;
    if (/operator|punctuation/.test(s)) return t.op;
    if (/variableName|variable|param|identifier/.test(s)) return t.vr;
    return null;
  }

  parseFenceLang(v) { const s = String(v || '').trim(); return normLang(s); }

  /* 语言以「文档内容」为准 —— 光标不在块里时 DOM 里的 fence 常常是空的/不完整的，
     所以从块首行的文档位置往上找最近的 ``` 行来判定语言。
     性能：直接用 run.begin（原来先遍历 run.els 找"高度>0 的可见行"，离屏块会读满整块每行的 rect）。 */
  langOfRun(view, run) {
    try {
      const ev = view && view.editor && view.editor.cm;
      if (ev && ev.posAtDOM && ev.state) {
        const doc = ev.state.doc;
        let ln = doc.lineAt(ev.posAtDOM(run.begin, 0));
        for (let k = 0; k < 3; k++) {
          const t = ln.text;
          if (/^\s*(?:```|~~~)/.test(t)) {
            const m = /^\s*(?:```|~~~)\s*([\w+#.-]*)/.exec(t);
            return (m && m[1]) ? m[1] : '';   /* 返回原始写法，保留 cmd / bat / bash 别名 */
          }
          if (ln.number <= 1) break;
          ln = doc.line(ln.number - 1);
        }
      }
    } catch (e) { }
    return run.disp || run.lang;
  }

  findRuns(content) {
    const runs = [];
    let nodes;
    try { nodes = content.querySelectorAll('.cm-line.HyperMD-codeblock'); } catch (e) { return runs; }
    let cur = null;
    for (let i = 0; i < nodes.length; i++) {
      const el = nodes[i], cls = el.classList;
      if (cls.contains('HyperMD-codeblock-begin')) { cur = { begin: el, end: null, els: [el], fence: (el.textContent || '').trim().slice(0, 24) }; runs.push(cur); continue; }
      if (cur && !cur.end) { cur.els.push(el); if (cls.contains('HyperMD-codeblock-end')) cur.end = el; continue; }
      cur = null;
    }
    for (let i = 0; i < runs.length; i++) {
      const r = runs[i];
      if (!r.end) r.end = r.els[r.els.length - 1];
      const m = /^(?:\s*)(?:```|~~~)\s*([\w+#.-]*)/.exec(r.fence);
      r.lang = this.parseFenceLang(m && m[1] ? m[1] : '');   /* 高亮 id（归一化） */
      r.disp = dispLang(m && m[1] ? m[1] : '');              /* 显示名（保留 bash/bat/cmd 等别名） */
      r.count = Math.max(0, r.els.length - 2);
    }
    return runs;
  }
  /* 代码块身份：取「代码前 200 字符 + 语言」做哈希，编辑态（codeOf）和阅读态（code 文本）用同一算法 → 跨模式一致 */
  blockHash(text, lang) {
    /* 只对前 1200 字做空白归一（哈希本来只用前 200 字）——原来的写法会对整段代码跑一遍 /\s+/g，
       遇到 60KB 的大代码块就是纯浪费（阅读态每块都会调一次）。 */
    const s = (lang || '') + '|' + String(text || '').slice(0, 1200).replace(/\s+/g, ' ').trim().slice(0, 200);
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return 'b' + (h >>> 0).toString(36);
  }
  /* 块身份 id —— 必须**只读文档**、不依赖 DOM 元素。
     之前用 codeOf()（内部靠 posAtDOM(run.begin) 定位，失败还会 fallback 到 DOM textContent），
     宿主重渲染时两条路径返回的内容可能不同 → id 漂移 → 「本块行号」写入的覆盖值匹配不上，
     表现为「全局开关实时生效、本块开关点了没反应」。这里改成：用文档行扫描出闭合栅栏，
     内容一律取 editor.getRange（文档数据），id 稳定。 */
  blockIdOf(view, run) {
    try {
      const ev = view.editor && view.editor.cm;
      if (!ev || !ev.state) return this.blockHash(this.codeOf(view, run), run.lang);
      const doc = ev.state.doc;
      const l1 = run.docBegin || doc.lineAt(ev.posAtDOM(run.begin, 0)).number;
      let l2 = -1;
      for (let n = l1 + 1; n <= doc.lines; n++) {
        if (/^\s*(?:```|~~~)/.test(doc.line(n).text)) { l2 = n; break; }
      }
      /* getRange 用 0-based：代码行 = 0-based [l1, l2-1) */
      if (l2 > 0 && l2 - 1 >= l1 + 1) {
        const t = view.editor.getRange({ line: l1, ch: 0 }, { line: l2 - 1, ch: 0 }).replace(/\n$/, '');
        return this.blockHash(t, run.lang);
      }
      return this.blockHash('', run.lang);
    } catch (e) {
      return this.blockHash(this.codeOf(view, run), run.lang);
    }
  }

  /* 「本块行号」当前生效值：会话级覆盖 → 持久化覆盖 → 全局开关。
     每次调用都重新读，不用菜单打开时捕获的旧值（这样连点两次也能正确来回切）。 */
  lnStateFor(run) {
    try {
      if (!run) return !!this.settings.lineNumbers;
      const sess = this._lnSession ? this._lnSession.get(run.begin) : undefined;
      if (sess !== undefined) return !!sess;
      const m = this.settings.blockLineNumbers || {};
      const id = run._lnId;
      if (id !== undefined && m[id] !== undefined) return !!m[id];
      return !!this.settings.lineNumbers;
    } catch (e) { return !!this.settings.lineNumbers; }
  }

  /* 代码块屏幕矩形：**只读首尾两行**。
     原来逐行 getBoundingClientRect（50 行的块 = 50 次，30 个块 = 1500 次/轮），
     读写交错还会触发强制同步布局 —— 这是滚动/打开长笔记卡顿的主因之一。
     代码块每行等宽，首行给 top/left/right，末行给 bottom，足够定位工具条。 */
  runRect(run) {
    try {
      const b = run.begin;
      const e = run.end || b;
      let rb = b.getBoundingClientRect();
      if (rb.height <= 0) { rb = e.getBoundingClientRect(); if (rb.height <= 0) return null; return { top: rb.top, bottom: rb.bottom, left: rb.left, right: rb.right, width: rb.width, height: rb.height }; }
      const re = (e === b) ? rb : e.getBoundingClientRect();
      const bottom = re.height > 0 ? re.bottom : rb.bottom;
      return { top: rb.top, bottom: bottom, left: Math.min(rb.left, re.left), right: Math.max(rb.right, re.right), width: Math.max(rb.right, re.right) - Math.min(rb.left, re.left), height: bottom - rb.top };
    } catch (e) { return null; }
  }

  /* -------------------------------------------------- 下拉选项（按需填充）
     为什么要"按需"：语言有 89 项、主题 17 项。若每个代码块工具栏都现场建它们，
     一屏 20 个块 = 2000+ 个 <option> 节点，打开带代码的文件就会明显卡。
     做法：工具栏只放"当前那一项"；用户真正展开下拉（pointerdown/focus）时才把完整列表
     克隆进去（模板片段只建一次，克隆比逐个建 option 快得多）。 */
  langOptionsFrag() {
    if (!this._langFrag) {
      const f = document.createDocumentFragment();
      for (let i = 0; i < LANGUAGES.length; i++) {
        const o = document.createElement('option');
        o.value = LANGUAGES[i][0]; o.textContent = LANGUAGES[i][1];
        f.appendChild(o);
      }
      this._langFrag = f;
    }
    return this._langFrag;
  }
  themeOptionsFrag() {
    if (!this._themeFrag) {
      const f = document.createDocumentFragment();
      Object.keys(THEMES).forEach(function (id) {
        const o = document.createElement('option');
        o.value = id; o.textContent = THEMES[id].name;
        f.appendChild(o);
      });
      this._themeFrag = f;
    }
    return this._themeFrag;
  }
  fillSelect(sel, frag, val) {
    try {
      while (sel.firstChild) sel.removeChild(sel.firstChild);
      sel.appendChild(frag.cloneNode(true));
      if (val !== undefined && val !== null) {
        /* 当前语言可能是个别名（sh / bat / ps1 / curl…），不在全量列表里：
           补一个当前项，避免下拉展开后变成空白或跳到第一项 */
        let hit = false;
        for (let i = 0; i < sel.options.length; i++) {
          if (sel.options[i].value === val) { hit = true; break; }
        }
        if (!hit) {
          const o = document.createElement('option');
          o.value = val; o.textContent = langName(val);
          sel.appendChild(o);
        }
        sel.value = val;
      }
    } catch (e) { }
  }
  /* 单选占位：只放当前项（未填充状态） */
  seedSelect(sel, val, label) {
    const o = document.createElement('option');
    o.value = val; o.textContent = label;
    sel.appendChild(o);
    return o;
  }

  /* -------------------------------------------------- 工具条 */
  buildBar(view, run) {
    const self = this;
    const H = this.settings.barHeight || 34;
    const bar = document.createElement('div');
    bar.className = 'cbs-bar';
    bar.setAttribute('data-theme', this.settings.theme);
    bar.style.height = H + 'px';
    bar.style.fontSize = (this.settings.barFont || 12.5) + 'px';
    bar.style.opacity = String(this.settings.barOpacity);

    /* 左侧：本代码块行数 */
    const lc = document.createElement('span');
    lc.className = 'cbs-lc';
    lc.textContent = (run.count || 0) + ' 行';
    bar.appendChild(lc);

    const right = document.createElement('div');
    right.className = 'cbs-right';
    bar.appendChild(right);

    /* 语言 */
    const langSel = document.createElement('select');
    langSel.className = 'cbs-sel cbs-lang';
    langSel.title = '选择语言';
    /* 显示名用 disp（保留 bash/bat/cmd 别名，分开显示）；高亮仍用归一化 run.lang */
    const dv = ((bar._run || run).disp || (bar._run || run).lang);
    this.seedSelect(langSel, dv, langName(dv));   /* 只放当前项，展开时再灌全量 */
    const fillLang = function () {
      if (langSel._cbsFilled) return;
      langSel._cbsFilled = true;
      self.fillSelect(langSel, self.langOptionsFrag(), ((bar._run || run).disp || (bar._run || run).lang));
    };
    langSel.addEventListener('pointerdown', fillLang);
    langSel.addEventListener('focus', fillLang);
    /* 关键：findRuns 每轮刷新都会新建 run 对象，闭包里的 run 会过期（begin 元素被 CM6 回收），
       导致 posAtDOM 失败/取错行 → setLang 静默失败（文章第一个代码块改语言无效就是它）。
       所以处理器一律用 bar._run（refresh() 每轮更新为最新 run），闭包 run 只作兜底。 */
    langSel.addEventListener('change', function () { try { self.setLang(view, bar._run || run, langSel.value); } catch (e) { } });
    right.appendChild(langSel);

    /* 主题 */
    const thSel = document.createElement('select');
    thSel.className = 'cbs-sel cbs-theme';
    thSel.title = '代码主题';
    this.seedSelect(thSel, self.settings.theme, self.themeName(self.settings.theme));
    const fillTheme = function () {
      if (thSel._cbsFilled) return;
      thSel._cbsFilled = true;
      self.fillSelect(thSel, self.themeOptionsFrag(), self.settings.theme);
    };
    thSel.addEventListener('pointerdown', fillTheme);
    thSel.addEventListener('focus', fillTheme);
    thSel.addEventListener('change', function () { self.setTheme(thSel.value); });
    right.appendChild(thSel);

    const sep = document.createElement('span'); sep.className = 'cbs-sep'; right.appendChild(sep);

    function mkBtn(icon, tip, fn, cls) {
      const b = document.createElement('button');
      b.className = 'cbs-btn' + (cls ? ' ' + cls : '');
      b.innerHTML = icon; b.title = tip;
      b.addEventListener('mousedown', stop);
      b.addEventListener('click', function (e) { stop(e); try { fn(b); } catch (err) { console.error(PREFIX, err); } });
      right.appendChild(b);
      return b;
    }
    /* 复制 */
    mkBtn(ICON.copy, '复制代码', function (b) {
      self.copyText(self.codeOf(view, bar._run || run));
      b.innerHTML = ICON.check; b.classList.add('cbs-ok');
      setTimeout(function () { b.innerHTML = ICON.copy; b.classList.remove('cbs-ok'); }, 1200);
    });
    /* ⋯ 更多 */
    mkBtn(ICON.more, '更多', function () { self.moreMenu(view, bar._run || run, bar); }, 'cbs-more');

    /* 每次刷新都同步「行数 / 语言 / 主题」—— 杜绝工具栏显示和实际不一致 */
    bar._sync = function (r) {
      try {
        /* 显示用 disp（保留 cmd / bat / bash 等别名）；高亮仍用归一化的 r.lang */
        const disp = r.disp || r.lang;
        if (langSel._cbsFilled) langSel.value = disp;
        else { const o = langSel.firstChild; if (o) { o.value = disp; o.textContent = langName(disp); } }
        if (thSel._cbsFilled) thSel.value = self.settings.theme;
        else { const o = thSel.firstChild; if (o) { o.value = self.settings.theme; o.textContent = (THEMES[self.settings.theme] || {}).name || self.settings.theme; } }
        lc.textContent = (r.count || 0) + ' 行';
      } catch (e) { }
    };

    bar.addEventListener('mousedown', function (e) { e.stopPropagation(); });
    return bar;
  }

  /* 移动端底部工具栏的 top（缓存元素，避免每帧 querySelector） */
  bottomBarTop(vh) {
    try {
      if (!document.body.classList.contains('is-mobile')) return 0;
      let bt = this._btEl;
      if (!bt || !bt.isConnected) {
        bt = this._btEl = document.querySelector('.mobile-toolbar, .mobile-navbar, .mobile-bottom-bar');
      }
      if (!bt) return 0;
      const r = bt.getBoundingClientRect();
      return (r.height > 0 && r.top > vh * 0.5) ? r.top : 0;
    } catch (e) { return 0; }
  }

  position() {
    try {
      if (!this.overlays || !this.overlays.size) return;
      const H = this.settings.barHeight || 34;
      const vh = window.innerHeight, vw = window.innerWidth;
      /* 移动端底部工具栏（.mobile-toolbar）会盖住屏幕底部：把可用底边抬到它上方 */
      let bottomLimit = vh - 6;
      const btTop = this.bottomBarTop(vh);
      if (btTop) bottomLimit = Math.min(bottomLimit, btTop - 6);
      this.overlays.forEach(function (ov) {
        const rect = ov._run ? this.runRect(ov._run) : null;
        /* 编辑器内容区的上边界：工具栏是 position:fixed，越过它就会盖住 tab 栏 / 面包屑 */
        let cTop = 0;
        try {
          const ce = ov._view && (ov._view.contentEl || ov._view.containerEl);
          if (ce) cTop = ce.getBoundingClientRect().top;
          /* 移动端顶栏浮在内容上：用顶栏底边兜底，避免工具栏被压在顶栏下面 */
          if (document.body.classList.contains('is-mobile')) {
            const hd = ov._view && (ov._view.headerEl || (ov._view.containerEl && ov._view.containerEl.querySelector('.view-header')));
            const hb = hd ? hd.getBoundingClientRect().bottom : 0;
            if (hb > cTop) cTop = hb;
          }
        } catch (e) { }
        if (!rect || rect.bottom < -40 || rect.top > vh + 40 || (cTop > 0 && rect.bottom < cTop + 4)) { ov.style.display = 'none'; return; }
        const w = Math.max(200, Math.min(rect.width, vw - 16));
        const left = Math.min(Math.max(6, rect.left), Math.max(6, vw - w - 6));
        let top = rect.top + 2;
        if (!this.settings.reserveSpace) top = rect.top - H - 3;   /* 没预留空间就浮到块上方 */
        /* 关键：工具栏一旦越过编辑器顶边就**直接隐藏**，绝不吸附钉在顶边。
           吸附会压在代码块前几行上，看起来像「代码块被切开」。 */
        if (cTop > 0 && top < cTop) { ov.style.display = 'none'; return; }
        ov.style.display = 'flex';
        if (top + H > bottomLimit) { ov.style.display = 'none'; return; }
        ov.style.left = left + 'px';
        ov.style.top = top + 'px';
        ov.style.width = w + 'px';
        ov.style.height = H + 'px';
      }, this);
    } catch (e) { }
  }

  hideAll() { try { this.overlays.forEach(function (ov) { ov.remove(); }); this.overlays.clear(); } catch (e) { } this.removeTableBar(); }

  /* ================================================== 表格工具栏（编辑态）
     光标落在 markdown 表格内时，在表格左上角浮出一条图标工具栏：
     上/下插行、删行、左/右插列、删列、本列对齐（左/中/右）、删除表格。
     所有操作 = 解析表格行 → 改数组 → 整块 replaceRange（一次撤销即可回退）。 */
  tblParse(view) {
    try {
      const cm = view.editor && view.editor.cm; if (!cm) return null;
      const st = cm.state, head = st.selection.main.head, doc = st.doc;
      const ln = doc.lineAt(head);
      if (ln.text.trim().charAt(0) !== '|') return null;
      let s = ln.number, e = ln.number;
      while (s > 1 && doc.line(s - 1).text.trim().charAt(0) === '|') s--;
      while (e < doc.lines && doc.line(e + 1).text.trim().charAt(0) === '|') e++;
      if (e - s < 1) return null;
      const delim = doc.line(s + 1).text.trim();
      if (!/^[|\s:-]+$/.test(delim) || delim.indexOf('-') < 0 || delim.indexOf('|') < 0) return null;
      /* 光标所在列：数本行 head 之前有几个 '|'（首格前的竖线算第 0 列起点） */
      const before = ln.text.slice(0, head - ln.from);
      let col = (before.match(/\|/g) || []).length; if (ln.text.trim().charAt(0) === '|') col -= 1;
      const rows = [];
      for (let i = s; i <= e; i++) rows.push(doc.line(i).text);
      return { view: view, s: s, e: e, col: Math.max(0, col), rel: ln.number - s, rows: rows, from: doc.line(s).from, to: doc.line(e).to };
    } catch (e) { return null; }
  }

  tblCells(raw) {
    let t = raw.trim();
    if (t.charAt(0) === '|') t = t.slice(1);
    if (t.charAt(t.length - 1) === '|') t = t.slice(0, -1);
    return t.split('|').map(function (x) { return x.trim(); });
  }
  tblJoin(cells) { return '| ' + cells.join(' | ') + ' |'; }

  tblOp(p, op) {
    try {
      const self = this;
      /* 复制表格 = **只读**操作，不改文档：直接把 markdown 源行拼起来
         （粘回 Obsidian / 任何 markdown 编辑器都还是表格；行数 = 数据行，不含表头与分隔行） */
      if (op === 'copyTable') {
        const txt = (p.rows || []).join('\n');
        this.copyText(txt);
        new Notice(PREFIX + '已复制表格（Markdown，' + Math.max(0, (p.rows || []).length - 2) + ' 行数据）');
        return;
      }
      const rows = p.rows.slice();
      const n = this.tblCells(rows[1]).length;
      let out = null;
      const emptyRow = function (k) { const a = []; for (let i = 0; i < k; i++) a.push(' '); return a; };
      /* 注意：必须走 self.tblJoin —— 裸 tblJoin 在运行时是 ReferenceError，
         会被外层 try/catch 吞掉 → 表现为「按钮点了没反应」（踩过）。 */
      const insRow = function (at) { rows.splice(at, 0, self.tblJoin(emptyRow(n))); };
      switch (op) {
        case 'rowAbove': if (p.rel <= 1) { new Notice(PREFIX + '表头/分隔行上方不插行（请用「下方插行」）'); return; } insRow(p.rel); break;
        case 'rowBelow': insRow(p.rel === 1 ? 3 : p.rel + 1); break;
        case 'rowDel':
          if (p.rel === 1) { new Notice(PREFIX + '不能单独删分隔行'); return; }
          if (p.rel === 0) { rows.splice(0, 2); }        /* 删表头连分隔行一起走，避免残表 */
          else rows.splice(p.rel, 1);
          break;
        case 'colLeft': case 'colRight': {
          const at = op === 'colLeft' ? p.col : p.col + 1;
          for (let i = 0; i < rows.length; i++) {
            const c = this.tblCells(rows[i]);
            c.splice(Math.min(at, c.length), 0, i === 1 ? '---' : ' ');
            rows[i] = i === 1 ? '| ' + c.join(' | ') + ' |' : this.tblJoin(c);
          }
          break;
        }
        case 'colDel': {
          if (n <= 1) { new Notice(PREFIX + '只剩一列，用「删除表格」吧'); return; }
          for (let i = 0; i < rows.length; i++) { const c = this.tblCells(rows[i]); c.splice(Math.min(p.col, c.length - 1), 1); rows[i] = this.tblJoin(c); }
          break;
        }
        case 'alignL': case 'alignC': case 'alignR': {
          const c = this.tblCells(rows[1]);
          const k = Math.min(p.col, c.length - 1);
          c[k] = op === 'alignL' ? ':---' : op === 'alignC' ? ':---:' : '---:';
          rows[1] = '| ' + c.join(' | ') + ' |';
          break;
        }
        case 'delTable': out = ''; break;
        default: return;
      }
      const text = out === null ? rows.join('\n') : '';
      const ed = p.view && p.view.editor;
      if (!ed) { new Notice(PREFIX + '取不到编辑器，表格未修改'); return; }
      const d = ed.cm.state.doc;
      const fl = d.lineAt(p.from), tl = d.lineAt(p.to);
      ed.replaceRange(text, { line: fl.number - 1, ch: 0 }, { line: tl.number - 1, ch: tl.text.length });
      new Notice(PREFIX + '表格已' + ({ rowAbove: '插入上边行', rowBelow: '插入下边行', rowDel: '删除本行', colLeft: '插入左列', colRight: '插入右列', colDel: '删除本列', alignL: '设为左对齐', alignC: '设为居中', alignR: '设为右对齐', delTable: '删除' })[op]);
    } catch (e) { console.error(PREFIX, 'tblOp', op, e); }
  }

  tbtn(bar, icon, title, op) {
    const self = this;
    const b = document.createElement('button');
    b.className = 'cbs-chev';
    b.title = title;
    b.setAttribute('aria-label', title);   /* Obsidian 原生悬停 tooltip（title 有 1 秒系统延迟，aria-label 即时弹出） */
    b.innerHTML = icon;
    b.addEventListener('mousedown', function (e) { e.preventDefault(); });   /* 保住编辑器焦点/选区 */
    b.addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation();
      const p = self.tblParse(self.app.workspace.getActiveViewOfType(MarkdownView));
      if (!p) { new Notice(PREFIX + '光标不在表格内'); return; }
      self.tblOp(p, op);
      self.schedule();
    });
    bar.appendChild(b);
    return b;
  }

  buildTableBar() {
    const bar = document.createElement('div');
    bar.className = 'cbs-bar cbs-tbar';
    bar.style.height = '30px';
    bar.style.fontSize = '12px';
    const sep = function () { const s = document.createElement('span'); s.style.cssText = 'width:1px;height:16px;background:currentColor;opacity:.25;margin:0 3px;flex:0 0 auto'; bar.appendChild(s); };
    this.tbtn(bar, ICON.copy, '复制表格（Markdown）', 'copyTable');
    sep();
    this.tbtn(bar, ICON.tRowPlus, '上方插行', 'rowAbove');
    this.tbtn(bar, ICON.tRowMinus, '删除本行', 'rowDel');
    this.tbtn(bar, ICON.tRowPlus, '下方插行', 'rowBelow');
    sep();
    this.tbtn(bar, ICON.tColPlus, '左侧插列', 'colLeft');
    this.tbtn(bar, ICON.tColMinus, '删除本列', 'colDel');
    this.tbtn(bar, ICON.tColPlus, '右侧插列', 'colRight');
    sep();
    this.tbtn(bar, ICON.tAlignL, '本列左对齐', 'alignL');
    this.tbtn(bar, ICON.tAlignC, '本列居中对齐', 'alignC');
    this.tbtn(bar, ICON.tAlignR, '本列右对齐', 'alignR');
    sep();
    this.tbtn(bar, ICON.tDel, '删除整个表格', 'delTable');
    document.body.appendChild(bar);
    this._tbar = bar;
    return bar;
  }

  positionTableBar() {
    try {
      if (!this.settings.tableBar) { this.removeTableBar(); return; }
      const view = this.app.workspace.getActiveViewOfType(MarkdownView);
      const cm = view && view.editor && view.editor.cm;
      if (!cm) { this.removeTableBar(); return; }
      /* 阅读模式 / 非编辑视图：不显示 */
      try { if (typeof view.getMode === 'function' && view.getMode() === 'preview') { this.removeTableBar(); return; } } catch (e) { }
      const p = this.tblParse(view);
      if (!p) { this.removeTableBar(); return; }
      if (!this._tbar) this.buildTableBar();
      /* 表格首行起点坐标：CM6 coordsAtPos（虚拟渲染下比 nth-child 可靠） */
      let pt = null;
      try { pt = cm.coordsAtPos(p.from); } catch (e) { }
      if (!pt) { this._tbar.style.display = 'none'; return; }
      const rect = { left: pt.left, top: pt.top };
      const H = 30, vw = window.innerWidth;
      const w = this._tbar.offsetWidth || 360;
      let left = rect.left;
      if (left + w > vw - 8) left = Math.max(8, vw - w - 8);
      let top2 = rect.top - H - 2;
      let cTop = 0;
      try {
        cTop = view.contentEl.getBoundingClientRect().top;
        /* 移动端顶栏浮在内容上：用顶栏底边兜底 */
        if (document.body.classList.contains('is-mobile')) {
          const hd = view.headerEl || (view.containerEl && view.containerEl.querySelector('.view-header'));
          const hb = hd ? hd.getBoundingClientRect().bottom : 0;
          if (hb > cTop) cTop = hb;
        }
      } catch (e) { }
      if (cTop > 0 && top2 < cTop) top2 = rect.top + 2;   /* 顶边空间不够就压到首行上沿内侧 */
      /* 移动端底部工具栏会盖住屏幕底部：把表格工具栏抬到它上方 */
      let bottomLimit2 = window.innerHeight - 8;
      const btTop2 = this.bottomBarTop(window.innerHeight);
      if (btTop2) bottomLimit2 = Math.min(bottomLimit2, btTop2 - 6);
      if (top2 + H > bottomLimit2) top2 = Math.max(8, bottomLimit2 - H);
      this._tbar.style.display = 'flex';
      this._tbar.style.left = left + 'px';
      this._tbar.style.top = top2 + 'px';
    } catch (e) { }
  }

  removeTableBar() { try { if (this._tbar) { this._tbar.remove(); this._tbar = null; } } catch (e) { } }

  /* ================================================== 表格列宽（每表独立记忆 + 拖拽调宽）
     只在「表格已渲染成 HTML」时可用：阅读视图，以及实时预览里光标不在表内的 widget。
     宽度按「表头文字指纹」存进 settings.tableWidths（与具体文件解耦，同表跨视图同一套宽度）。
     拖拽手柄 = 表头格右缘的 9px 热区；双击手柄还原该表为自适应。 */
  tblKeyOf(table) {
    try {
      const cells = this.tblColsOf(table);
      if (!cells.length) return null;
      const parts = [];
      for (let i = 0; i < cells.length; i++) parts.push(normHead(cells[i].textContent));
      if (!parts.join('')) return null;            /* 全空表头 → 不记忆宽度，避免误撞 */
      return 'c' + cells.length + ':' + parts.join('|');
    } catch (e) { return null; }
  }
  /* 取该表的记忆宽度：先精确命中；再归一化扫描（兼容旧版存下的带空白键） */
  lookupWidths(table) {
    try {
      const cells = this.tblColsOf(table);
      if (!cells.length) return null;
      const heads = [];
      for (let i = 0; i < cells.length; i++) heads.push(normHead(cells[i].textContent));
      const map = this.settings.tableWidths || {};
      const key = 'c' + cells.length + ':' + heads.join('|');
      if (map[key] && map[key].length) return map[key];
      const prefix = 'c' + cells.length + ':';
      const want = heads.join('|');
      const keys = Object.keys(map);
      for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        if (k.slice(0, prefix.length) !== prefix) continue;
        const got = k.slice(prefix.length).split('|').map(normHead).join('|');
        if (got === want && map[k] && map[k].length) return map[k];
      }
      return null;
    } catch (e) { return null; }
  }
  tblColsOf(table) { try { const r = table.querySelector('tr'); return r ? r.children : []; } catch (e) { return []; } }
  tableColgroup(table, n) {
    let cg = table.querySelector('colgroup.cbs-cols');
    if (!cg) { cg = document.createElement('colgroup'); cg.className = 'cbs-cols'; table.insertBefore(cg, table.firstChild); }
    if (cg.children.length !== n) {
      while (cg.firstChild) cg.removeChild(cg.firstChild);
      for (let i = 0; i < n; i++) cg.appendChild(document.createElement('col'));
    }
    return cg;
  }
  /* 应用已记忆的列宽（幂等；没记录就什么都不做，保持主题原样） */
  applyTableWidth(table) {
    try {
      if (!this.tblKeyOf(table)) return;               /* 无有效表头（空表除外）不处理 */
      const w = this.lookupWidths(table);
      if (!w || !w.length) return;
      const cells = this.tblColsOf(table);
      if (cells.length !== w.length) return;            /* 列数变了 → 旧宽度失效，不硬套 */
      const sig = w.join(',');
      /* 幂等：宽度没变过就不再写样式（这个函数每轮 refresh 都会对每张表调用一次） */
      if (table._cbsW === sig && table.classList.contains('cbs-tbl-sized')) return;
      const cg = this.tableColgroup(table, w.length);
      for (let i = 0; i < w.length; i++) cg.children[i].style.width = w[i] + 'px';
      table.style.setProperty('table-layout', 'fixed', 'important');
      table.style.setProperty('width', 'auto', 'important');
      table.classList.add('cbs-tbl-sized');
      table._cbsW = sig;
    } catch (e) { }
  }
  /* 给已渲染的真表格（有表头 th）挂拖拽手柄；幂等，每轮刷新调用 */
  decorateTables(root) {
    try {
      if (!root || !root.querySelectorAll) return;
      const tables = root.querySelectorAll('table');
      for (let i = 0; i < tables.length; i++) {
        const tb = tables[i];
        if (tb.closest('.cbs-tbar, .cbs-bar')) continue;
        /* 首行必须有格（th/td 都算）—— 不同视图对表头格的标签可能不同，
           原来只认 th 会导致阅读视图整表被跳过（踩过）。 */
        const firstRow = tb.querySelector('tr');
        if (!firstRow || !firstRow.children || !firstRow.children.length) continue;
        this.applyTableWidth(tb);
        const cells = this.tblColsOf(tb);
        for (let c = 0; c < cells.length; c++) {
          const cell = cells[c];
          if (!cell || cell.querySelector(':scope > .cbs-colgrip')) continue;
          cell.style.position = 'relative';
          const g = document.createElement('span');
          g.className = 'cbs-colgrip';
          g.setAttribute('data-col', String(c));
          g.setAttribute('aria-label', '拖动调整列宽（双击还原）');
          g._cbsTable = tb;
          cell.appendChild(g);
        }
      }
    } catch (e) { }
  }
  tblGripDown(e) {
    try {
      const g = e.target && e.target.closest && e.target.closest('.cbs-colgrip');
      if (!g) return;
      const table = g._cbsTable || (g.parentElement && g.parentElement.closest('table'));
      if (!table) return;
      const col = parseInt(g.getAttribute('data-col'), 10) || 0;
      const cells = this.tblColsOf(table);
      if (!cells.length || !cells[col]) return;
      e.preventDefault(); e.stopPropagation();                 /* 别触发选区/别让 CM6 进编辑 */
      const startX = e.clientX;
      const startW = cells[col].getBoundingClientRect().width;
      /* 首次拖动先把当前实际宽度固化，避免拖动时其他列跟着回流跳动 */
      const widths = [];
      for (let i = 0; i < cells.length; i++) widths.push(Math.round(cells[i].getBoundingClientRect().width));
      const cg = this.tableColgroup(table, cells.length);
      for (let i = 0; i < cells.length; i++) cg.children[i].style.width = widths[i] + 'px';
      table.style.setProperty('table-layout', 'fixed', 'important');
      table.style.setProperty('width', 'auto', 'important');
      const self = this;
      const move = function (ev) {
        const nw = Math.max(40, Math.min(1600, Math.round(startW + (ev.clientX - startX))));
        widths[col] = nw;
        try { cg.children[col].style.width = nw + 'px'; } catch (err) { }
      };
      const up = function () {
        document.removeEventListener('pointermove', move, true);
        document.removeEventListener('pointerup', up, true);
        try {
          const key = self.tblKeyOf(table);
          if (!key) return;
          self.settings.tableWidths = self.settings.tableWidths || {};
          self.settings.tableWidths[key] = widths.slice();
          self.saveSettings();
          table.classList.add('cbs-tbl-sized');
          new Notice(PREFIX + '第 ' + (col + 1) + ' 列宽 ' + widths[col] + 'px（已记住；双击列分隔线可还原）');
        } catch (err) { }
      };
      document.addEventListener('pointermove', move, true);
      document.addEventListener('pointerup', up, true);
    } catch (e) { }
  }
  /* 诊断：把「当前视图里每张表的键 / 是否命中记忆宽度」抄到剪贴板，便于排查跨视图不生效 */
  diagTableWidths() {
    try {
      const view = this.app.workspace.getActiveViewOfType(MarkdownView);
      const root = view && (view.contentEl || view.containerEl);
      const mode = (view && typeof view.getMode === 'function') ? view.getMode() : '?';
      const tables = root ? root.querySelectorAll('table') : [];
      const lines = ['视图模式: ' + mode, '视图内表格数: ' + tables.length, '已存宽度条目: ' + Object.keys(this.settings.tableWidths || {}).length];
      for (let i = 0; i < tables.length && i < 6; i++) {
        const k = this.tblKeyOf(tables[i]);
        lines.push('表' + (i + 1) + ' 列数=' + this.tblColsOf(tables[i]).length + ' ' + (this.lookupWidths(tables[i]) ? '✔命中' : '✘未命中') + ' 键=' + k);
      }
      Object.keys(this.settings.tableWidths || {}).slice(0, 6).forEach(function (k, i) { lines.push('存储' + (i + 1) + ': ' + k); });
      const txt = lines.join('\n');
      try { navigator.clipboard.writeText(txt); } catch (e) { }
      console.log(PREFIX + 'diag\n' + txt);
      new Notice(PREFIX + '诊断（已复制）：\n' + txt, 12000);
    } catch (e) { new Notice(PREFIX + '诊断失败：' + e.message); }
  }

  tblGripReset(e) {
    try {
      const g = e.target && e.target.closest && e.target.closest('.cbs-colgrip');
      if (!g) return;
      const table = g._cbsTable || (g.parentElement && g.parentElement.closest('table'));
      if (!table) return;
      e.preventDefault(); e.stopPropagation();
      /* 清记忆：精确键 + 归一化扫描命中的旧键一并清掉 */
      const map = this.settings.tableWidths || {};
      const key = this.tblKeyOf(table);
      let changed = false;
      if (key && map[key]) { delete map[key]; changed = true; }
      try {
        const cells = this.tblColsOf(table);
        const heads = [];
        for (let i = 0; i < cells.length; i++) heads.push(normHead(cells[i].textContent));
        const prefix = 'c' + cells.length + ':';
        const want = heads.join('|');
        Object.keys(map).forEach(function (k) {
          if (k.slice(0, prefix.length) !== prefix) return;
          if (k.slice(prefix.length).split('|').map(normHead).join('|') === want) { delete map[k]; changed = true; }
        });
      } catch (err) { }
      if (changed) this.saveSettings();
      const cg = table.querySelector('colgroup.cbs-cols');
      if (cg) cg.remove();
      table.style.removeProperty('table-layout');
      table.style.removeProperty('width');
      table.classList.remove('cbs-tbl-sized');
      new Notice(PREFIX + '该表格已还原为自适应列宽');
    } catch (e) { }
  }

  removeRestoreChip() { try { if (this._chip) { this._chip.remove(); this._chip = null; } } catch (e) { } }

  /* -------------------------------------------------- ⋯ 菜单 */
  moreMenu(view, run, bar) {
    const self = this;
    this.closeFloating();
    const menu = document.createElement('div');
    menu.className = 'cbs-menu';
    menu.setAttribute('data-theme', this.settings.theme);

    function row(icon, label, onClick, cls) {
      const r = document.createElement('div');
      r.className = 'cbs-mrow' + (cls ? ' ' + cls : '');
      r.innerHTML = '<span class="cbs-mi">' + (icon || '') + '</span><span class="cbs-mt">' + label + '</span>';
      if (onClick) { r.addEventListener('click', function (e) { e.stopPropagation(); try { onClick(); } catch (err) { } }); }
      menu.appendChild(r);
      return r;
    }
    function div() { const d = document.createElement('div'); d.className = 'cbs-mdiv'; menu.appendChild(d); }

    /* 对勾要立刻更新：菜单不会重建，所以点击后手动改这一行的文字（否则要重开菜单/切模式才看到） */
    const setLabel = function (r, label) { const t = r.querySelector('.cbs-mt'); if (t) t.textContent = label; };
    const lnAllLabel = function () { return (self.settings.lineNumbers ? '✓ ' : '') + '行号（全部）'; };

    /* ---- 全局：统一的调度开关。
       打开/关闭会**同时清空所有本块覆盖**（会话级 + 持久化），
       也就是「不管你本块设置啥，全局都会开或者关」。 */
    /* 行号（全部）：本篇文件的统一调度开关 —— 
       切换它时**清空所有本块覆盖**，所以「不管你本块设了什么，这一篇都会统一开/关」。
       本块行号则是它之上的覆盖（全局开了我可以关自己、全局关了我可以开自己）。 */
    const allLabel = function () { return (self.lnForFile(view) ? '✓ ' : '') + '行号（全部）'; };
    const rAll = row(ICON.lines, allLabel(), function () {
      const now = !self.lnForFile(view);
      self.settings.fileLineNumbers = self.settings.fileLineNumbers || {};
      self.settings.fileLineNumbers[view.file.path] = now;
      /* 完全控制：清空本块覆盖（会话级 + 持久化） */
      self.settings.blockLineNumbers = {};
      self._lnSession = new WeakMap();
      self._lnSessionCount = 0;
      self.saveSettings();
      self.applyLineNumbers();
      setLabel(rAll, allLabel());
      new Notice(PREFIX + '行号（本篇全部）：' + (now ? '开' : '关') + '（已清空本块的单独设置）');
    });


    /* ---- 本块：在全局之上的单独覆盖。
       全局开 → 我可以关掉自己；全局关 → 我可以给自己单独开。
       注意 1：状态每次点击都**重新读取**，不用菜单打开时捕获的旧值（否则点第二次就失效）。
       注意 2：run 也每次重新取（bar._run 是 refresh 每轮更新的最新 run），避免 CM6 回收行元素后引用过期。 */
    const curRun = function () { return (bar && bar._run) || run; };
    const oneLabel = function () { return (self.lnStateFor(curRun()) ? '✓ ' : '') + '本块行号'; };
    const rOne = row(ICON.lines, oneLabel(), function () {
      const r = curRun();
      const now = !self.lnStateFor(r);            /* 实时读当前生效值 */
      const id = (r && r._lnId) !== undefined ? r._lnId : self.blockIdOf(view, r);
      self.settings.blockLineNumbers = self.settings.blockLineNumbers || {};
      self.settings.blockLineNumbers[id] = now;   /* 持久化覆盖 */
      try { if (self._lnSession && r && r.begin) { self._lnSession.set(r.begin, now); self._lnSessionCount = (self._lnSessionCount || 0) + 1; } } catch (e) { }   /* 会话级覆盖：保证点了就变 */
      self.bumpPaint();                            /* 行号变化 → 阅读态需要重刷 */
      self.saveSettings();
      /* 立刻作用到当前块，不等下一轮 1.2s 刷新 */
      const els = (r && r.els) || [];
      for (let i = 0; i < els.length; i++) { try { els[i].classList.toggle('cbs-ln-show', !!now); } catch (e) { } }
      self.applyLineNumbers();
      setLabel(rOne, oneLabel());
      new Notice(PREFIX + '本块行号：' + (now ? '开' : '关'));
    });
    div();
    row(ICON.copy, '复制为 Markdown', function () {
      const r = (bar && bar._run) || run;
      self.copyText('```' + (r.disp || r.lang) + '\n' + self.codeOf(view, r) + '\n```');
    });
    row(ICON.down, '下载为文件', function () {
      const r = (bar && bar._run) || run;
      const txt = self.codeOf(view, r);
      const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = 'code.' + (EXT[normLang(r.disp || r.lang)] || 'txt');
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 3000);
    });
    div();
    /* 仅同步「语言」。样式本就是全局的（动一个全文都动），无需同步。
       关键修复：逐行扫描时用「开/合栅栏」状态机，只改写「开栅栏」（进入代码块的那个 ```），
       绝不碰「合栅栏」（``` 收尾），否则会把收尾栅栏误改成开栅栏 → 多个代码块被合并成一块。 */
    row(ICON.sync, '同步语言到全文', function () {
      try {
        const ev = view.editor.cm;
        if (ev) {
          /* 关键：从「文档」读当前块的真实语言，不能用 run.lang。
             下拉改语言后、下一次刷新前 run.lang 还是旧值（如 shell），
             若直接用它会把全文改回旧语言、还把刚改的当前块也打回原形。 */
          let target = self.langOfRun(view, run) || 'plaintext';
          if (target === 'plaintext') target = '';   /* 无语言 → 清空语言标记 */
          const doc = ev.state.doc;
          let inBlock = false, changed = 0;
          for (let n = 1; n <= doc.lines; n++) {
            const t = doc.line(n).text;
            const m = /^(\s*(?:```|~~~)\s*)([^\s`~]*)(\s*)$/.exec(t);
            if (!m) continue;
            if (!inBlock) {
              /* 开栅栏：把语言改成当前块的语言 */
              const newText = m[1] + target + m[3];
              if (newText !== t) { view.editor.setLine(n - 1, newText); changed++; }
              inBlock = true;
            } else {
              /* 合栅栏：原样保留，绝不改写 */
              inBlock = false;
            }
          }
          new Notice(PREFIX + '已同步语言到全文：' + langName(target || 'plaintext') + (changed ? '（' + changed + ' 个代码块）' : '（没有可改的代码块）'));
        }
      } catch (e) { new Notice(PREFIX + '同步失败'); }
    });

    div();
    row(ICON.eye, '隐藏全部代码块工具栏', function () {
      self.settings.showToolbar = false;
      self.saveSettings();
      self.applyBarCss();
      self.hideAll();
      self.removeRestoreChip();
      self.markDirty();
      self.closeFloating();
      new Notice(PREFIX + '代码块工具栏已全部隐藏 —— 可在「设置 → Hadesr Code → 代码主题与工具栏」重新打开', 8000);
    });

    document.body.appendChild(menu);
    const r = bar.getBoundingClientRect();
    menu.style.top = Math.min(window.innerHeight - menu.offsetHeight - 8, r.bottom + 4) + 'px';
    menu.style.left = Math.max(8, Math.min(r.right - menu.offsetWidth, window.innerWidth - menu.offsetWidth - 8)) + 'px';
    this._menu = menu;
    /* 关闭时机：点菜单以外的地方。
       坑：原来每开一次菜单就 addEventListener 一个闭包且只在触发时自摘 —— 旧菜单早被移除，
       但它那个 onDoc 仍挂在 document 捕获阶段，先于目标元素的 click 执行、并把**新菜单** remove 掉；
       元素一被移除，click 事件就不再派发 → 表现为「菜单里的选项点了没反应」（尤其「本块行号」）。
       现在改成：注册前先摘掉上一次的监听（全局只保留一个），并在 closeFloating 里一并摘除。 */
    const onDoc = function (e) {
      try {
        if (menu.contains(e.target)) return;
        if (e.target && e.target.closest && e.target.closest('.cbs-more')) return;   /* 点在「更多」按钮上，交给按钮 */
        self.closeFloating();
      } catch (err) { }
    };
    if (this._menuCloser) { try { document.removeEventListener('mousedown', this._menuCloser, true); } catch (e) { } }
    this._menuCloser = onDoc;
    document.addEventListener('mousedown', onDoc, true);
  }
  closeFloating() {
    try { if (this._menu) { this._menu.remove(); this._menu = null; } } catch (e) { }
    try { if (this._menuCloser) { document.removeEventListener('mousedown', this._menuCloser, true); this._menuCloser = null; } } catch (e) { }
  }

  /* -------------------------------------------------- 数据 */
  lineOf(view, el) {
    try { const ev = view.editor.cm; if (ev && ev.posAtDOM) return ev.state.doc.lineAt(ev.posAtDOM(el, 0)).number - 1; } catch (e) { }
    return 0;
  }
  codeOf(view, run) {
    try {
      const ev = view.editor && view.editor.cm;
      if (ev && ev.state && ev.posAtDOM) {
        const doc = ev.state.doc;
        const l1 = doc.lineAt(ev.posAtDOM(run.begin, 0)).number;
        const endEl = run.end || run.begin;
        const l2 = doc.lineAt(ev.posAtDOM(endEl, Math.max(0, (endEl.textContent || '').length - 1))).number;
        if (l2 - 1 >= l1 + 1) {
          const txt = view.editor.getRange({ line: l1, ch: 0 }, { line: l2 - 1, ch: 0 });
          if (txt && txt.length) return txt.replace(/\n$/, '');
        }
      }
    } catch (e) { }
    const parts = [];
    for (let i = 0; i < run.els.length; i++) { const el = run.els[i]; if (el === run.begin || el === run.end) continue; parts.push(el.textContent || ''); }
    return parts.join('\n').replace(/\n$/, '');
  }
  setLang(view, run, lang) {
    try {
      const ev = view.editor && view.editor.cm;
      if (!ev || !ev.state || !ev.posAtDOM) { new Notice(PREFIX + '当前环境不支持修改语言'); return; }
      const doc = ev.state.doc;
      const isFence = function (n) { return n >= 1 && n <= doc.lines && /^\s*(?:```|~~~)/.test(doc.line(n).text); };
      let lineNo = -1;
      try { lineNo = doc.lineAt(ev.posAtDOM(run.begin, 0)).number; } catch (e) { }
      /* 防御：run.begin 过期时 posAtDOM 可能取到非栅栏行 —— 向上就近找开栅栏行 */
      if (!isFence(lineNo)) {
        for (let d = 1; d <= 5 && lineNo > 0; d++) {
          if (isFence(lineNo - d)) { lineNo = lineNo - d; break; }
        }
      }
      /* 仍找不到：全文开/合状态机，找「包含该位置」的块的开栅栏 */
      if (!isFence(lineNo)) {
        let inBlock = false, curOpen = -1;
        const anchor = lineNo > 0 ? lineNo : doc.lines;
        for (let n = 1; n <= doc.lines; n++) {
          if (!isFence(n)) continue;
          if (!inBlock) { inBlock = true; curOpen = n; }
          else { inBlock = false; if (curOpen <= anchor && anchor <= n) { lineNo = curOpen; break; } }
        }
        if (!isFence(lineNo) && inBlock && curOpen <= anchor) lineNo = curOpen;  /* 未闭合的块 */
      }
      if (!isFence(lineNo)) { new Notice(PREFIX + '未找到代码块栅栏行，请手动修改'); return; }
      const line = doc.line(lineNo);
      const m = /^(\s*(?:```|~~~))([^\s`~]*)(.*)$/.exec(line.text);
      if (!m) { new Notice(PREFIX + '该行不是代码块开头，无法修改'); return; }
      view.editor.setLine(line.number - 1, m[1] + lang + m[3]);
      run.lang = normLang(lang);   /* 高亮 id（归一化，cmd→batch 之类） */
      run.disp = dispLang(lang);   /* 显示名（保留别名，bash/bat/cmd 分开显示） */
      new Notice(PREFIX + '语言已改为 ' + langName(lang));
    } catch (e) { new Notice(PREFIX + '切换语言失败'); }
  }
  copyText(txt) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(function () { new Notice(PREFIX + '已复制'); }, function () { new Notice(PREFIX + '复制失败'); });
      } else {
        const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); new Notice(PREFIX + '已复制'); ta.remove();
      }
    } catch (e) { new Notice(PREFIX + '复制失败'); }
  }

  /* -------------------------------------------------- 主题 CSS */
  applyTheme() {
    try {
      const t = THEMES[this.settings.theme] || THEMES[DEFAULTS.theme];
      /* 「跟随主题」：不注入任何配色（--code-* / CARD / INPRE / token 色），代码块外观完全交给
         Hadesr UI 主题 → 编辑态与阅读态必然一致（这就是"联动"）。字体/字号与行号样式仍注入。 */
      const follow = this.settings.theme === THEME_FOLLOW;
      /* 主题自带配色数据（Hadesr UI 定义了 --cbs-code-ct）→ 插件不注入任何配色 CSS，只切类名 */
      if (this.themeProvidesColors() || follow) {
        /* HL_STYLE 永远要注入 —— cbs-hl-* 是插件自定义高亮的专属类名，主题不可能预置 */
        const only = this.fontCss() + '\n' + HL_STYLE;
        if (this.styleEl) this.styleEl.textContent = only;
        return;
      }
      const E = '.markdown-source-view.mod-cm6 .cm-content .cm-line.HyperMD-codeblock';
      /* 阅读视图：.markdown-preview-view 与 .markdown-rendered 是同一个元素；
         代码块容器在不同版本可能是 pre 或 .el-pre，两者都覆盖 */
      /* 阅读态拆两层，避免内边距叠加：
         CARD  = 最外层那张卡（只在这里上一次 padding）
         INPRE = 卡里的 pre（清零 padding）
         之前把 pre 和 .el-pre 塞进同一组、都上 padding → 内边距翻倍 → 块又高又宽。
         .markdown-preview-view 与 .markdown-rendered 是同一个元素；
         实时预览没聚焦的块由 .cm-preview-code-block 渲染，容器是 .markdown-source-view。 */
      const CARD = ['.markdown-preview-view .el-pre', '.markdown-rendered .el-pre',
                    '.markdown-source-view .cm-preview-code-block', '.cm-preview-code-block',
                    '.markdown-preview-view pre', '.markdown-rendered pre'];
      const INPRE = ['.markdown-preview-view .el-pre pre', '.markdown-rendered .el-pre pre',
                     '.markdown-source-view .cm-preview-code-block pre', '.cm-preview-code-block pre'];
      const RC = ['.markdown-preview-view pre code', '.markdown-rendered pre code',
                  '.markdown-preview-view .el-pre code', '.markdown-rendered .el-pre code',
                  '.markdown-source-view .cm-preview-code-block code', '.cm-preview-code-block code',
                  '.cm-preview-code-block pre code'];
      const colors = [t.kw, t.str, t.num, t.com, t.fn, t.vr, t.ty, t.op, t.tag, t.at, t.pr, t.mt];
      const lists = [
        '.cm-keyword,.cm-controlKeyword,.cm-modifier',
        '.cm-string,.cm-string-2,.cm-regexp',
        '.cm-number,.cm-atom,.cm-bool',
        '.cm-comment,.cm-quote,.token.comment,.hljs-comment',
        '.cm-def,.cm-function,.token.function,.hljs-title,.hljs-function',
        '.cm-variableName,.cm-variable-2,.token.variable,.hljs-variable,.hljs-params',
        '.cm-typeName,.cm-className,.cm-builtin,.token.class-name,.hljs-type,.hljs-built_in',
        '.cm-operator,.token.operator,.hljs-operator',
        '.cm-tagName,.cm-tag,.token.tag,.hljs-tag',
        '.cm-attributeName,.token.attr-name,.hljs-attr,.hljs-attribute',
        '.cm-propertyName,.token.property,.hljs-property',
        '.cm-meta,.token.meta,.hljs-meta',
      ];
      const lines = [];
      const SEL = selColor(t.bg);
      const pushCol = function (r) { if (!follow) lines.push(r); };   /* 配色类规则：跟随主题时整条不注入 */
      /* 编辑态：只上色，绝不动 font-size / line-height / padding（否则 CM6 行高缓存错乱 → 错行） */
      pushCol(E + '{background:' + t.bg + ' !important;color:' + t.fg + ' !important;}');
      /* 光标所在行：强制用代码块背景色，别让 Obsidian 的浅色高亮盖住（深色块上白条很难看） */
      /* 代码块「底色层」：新版 Obsidian 用单独的 .HyperMD-codeblock-bg 画背景，
         只给 .HyperMD-codeblock 上色会出现「文字有底色、行间露白」的现象。 */
      lines.push('.markdown-source-view.mod-cm6 .cm-line.HyperMD-codeblock-bg{background:' + t.bg + ' !important;}');
      lines.push('.markdown-source-view.mod-cm6 .cm-line.HyperMD-codeblock-bg::before{background:transparent !important;}');
      pushCol(E + '.cm-active,' + E + '.cm-activeLine{background:' + t.bg + ' !important;}');
      pushCol('.markdown-source-view.mod-cm6 .cm-content .cm-activeLine .cm-line.HyperMD-codeblock{background:' + t.bg + ' !important;}');
      /* 选中高亮：按背景亮度自动挑不刺眼的颜色 */
      lines.push('.markdown-source-view.mod-cm6 .cm-content .cm-line.HyperMD-codeblock ::selection{background:' + SEL + ' !important;color:' + t.fg + ' !important;}');
      lines.push('.markdown-source-view.mod-cm6 .cm-content .cm-line.HyperMD-codeblock::selection{background:' + SEL + ' !important;color:' + t.fg + ' !important;}');
      for (let i = 0; i < lists.length; i++) {
        const extra = i === 3 ? ';font-style:italic' : '';
        pushCol(lists[i].split(',').map(function (c) { return E + ' ' + c; }).join(',') + '{color:' + colors[i] + extra + '}');
      }
      /* 阅读态：干净的深色圆角卡片，只读、无任何控件 */
      if (this.settings.showInReading && !follow) {
        /* 外卡：底色 + 圆角 + 单次内边距（细窄，对齐语雀） */
        lines.push(CARD.join(',') + '{background:' + t.bg + ' !important;color:' + t.fg + ' !important;border:none !important;border-radius:6px;padding:4px 16px !important;box-shadow:none;margin:1em 0;min-height:0 !important;}');
        /* 内层 pre：透明 + 内边距清零，杜绝叠加。
           min-height:0 是关键 —— Obsidian 给 .markdown-rendered pre 定死了 min-height:38px，
           一行代码只有 ~19px，多出的全堆在文字下面 → 文字偏上、永远不居中 */
        lines.push(INPRE.join(',') + '{background:transparent !important;color:' + t.fg + ' !important;padding:0 !important;margin:0 !important;border-radius:0 !important;box-shadow:none !important;min-height:0 !important;}');
        lines.push(CARD.join(',') + ' ::selection,' + CARD.join(',') + '::selection{background:' + SEL + ' !important;color:' + t.fg + ' !important;}');
        lines.push(RC.join(',') + '{background:transparent !important;color:' + t.fg + ' !important;}');
        /* 阅读态 token 配色**不再**用 RC × lists 的长后代选择器（约 480 条：
           12 色位 × 8 个前缀 × 每色位约 5 个类名）。它们等于把官方机制重复实现一遍，
           会让每次渲染都对全文档重匹配 → 表现为"滚回来先发白、再变亮"。
           配色统一走下面的官方 --code-* 变量 + 少量短 .token.X 补充。 */
      }
      /* 代码字体 / 字号：只作用于阅读态（静态 DOM，安全）。
         编辑态绝不改 font-size/font-family —— 会打乱 CM6 行高缓存 → 错行。
         字号设 0 表示跟随主题默认（不注入）。 */
      if (this.settings.codeFont || this.settings.codeFontSize) {
        const fontDecl = this.settings.codeFont ? ';font-family:' + this.settings.codeFont + ' !important' : '';
        const sizeDecl = this.settings.codeFontSize ? ';font-size:' + this.settings.codeFontSize + 'px !important' : '';
        lines.push(RC.join(',') + '{' + fontDecl.slice(1) + sizeDecl.slice(1) + '}');
      }
      /* ── 阅读视图配色：走**官方变量机制**（对照 obsidian.asar 实测）──
         Obsidian 自带这批规则：.token.keyword{color:var(--code-keyword)}、
         .token.comment/prolog/doctype/cdata{var(--code-comment)}、number/boolean{var(--code-value)}、
         string/attr-value/selector{var(--code-string)}、tag{var(--code-tag)}、
         function/class-name{var(--code-function)}、variable/property{var(--code-property)} 等。
         社区插件（Codeblock Customizer 之类）也是只改这些变量。
         我们先前自造 12 组超长选择器，等于把官方机制重复实现一遍：CSS 变肥、
         每条规则要和全文档 DOM 重匹配（新渲染的段落"白了再亮"），还漏类导致"颜色变少"。
         现在换成：设 12 个 --code-* 变量 + 少量官方没细分的补充，一条长选择器都不要。 */
      /* 变量必须挂在**真正渲染代码的容器**上：
         主题是用 `body.code-theme-*` 定义 --code-* 的，和我们一样挂在 body 上，
         同层就变成"谁在后面谁赢" → 实测出现"编辑态跟随、阅读态永远是主题默认色"。
         挂在容器上时，它是**最近的声明**，无论主题在 body/:root 上写什么都不影响。 */
      if (!follow) lines.push('body,.markdown-rendered,.markdown-preview-view,'
        + '.markdown-source-view.mod-cm6 .cm-content,.cm-preview-code-block{' +
        '--code-background:' + t.bg + ' !important;' +
        '--code-normal:' + t.fg + ' !important;' +
        '--code-keyword:' + t.kw + ' !important;' +
        '--code-string:' + t.str + ' !important;' +
        '--code-value:' + t.num + ' !important;' +
        '--code-comment:' + t.com + ' !important;' +
        '--code-function:' + t.fn + ' !important;' +
        '--code-property:' + t.vr + ' !important;' +
        '--code-tag:' + t.tag + ' !important;' +
        '--code-operator:' + t.op + ' !important;' +
        '--code-punctuation:' + t.op + ' !important;' +
        '--code-important:' + t.kw + ' !important;' +
        /* 主题自己也有一套变量：--background-code 是它给代码块上底色的来源。
           只改 --code-background 不够，浅色模式下会漏出浅底（表现为"浅底 + 浅色字"看不清）。 */
        '--background-code:' + t.bg + ' !important;' +
        '--code-block-background:' + t.bg + ' !important;' +
        '--background-code-block:' + t.bg + ' !important;}');
      /* 官方把 class-name 归 function、attr-name 归 string、property 归 property，
         我们的主题分得更细（ty/at/pr/mt），补四条**短**覆盖（特异度最低 + !important，稳）。 */
      lines.push('.token.class-name{color:' + t.ty + ' !important}');
      lines.push('.token.attr-name{color:' + t.at + ' !important}');
      lines.push('.token.property{color:' + t.pr + ' !important}');
      lines.push('.token.meta{color:' + t.mt + ' !important}');
      /* 官方变量没细分的 Prism 类：一律用**短选择器** `.token.X`（走 class 索引，匹配极快，
         不会像长后代选择器那样让全文档重匹配）。这是"官方机制 + 少量补充"的正确姿势。 */
      const SUP = [
        ['builtin,maybe-class-name,entity,namespace,type', t.ty],
        ['attribute', t.at],
        ['property-access,url,version', t.pr],
        ['request-line,directive,envvar,env-var,operator-head', t.kw],
        ['annotation,interpolation,directive', t.mt],
        ['atrule,rule,control,unit', t.kw],
        ['char,regex,inserted,template-string', t.str],
        ['boolean,constant,symbol,deleted', t.num],
        ['prolog,doctype,cdata', t.com],
        ['method,function-name', t.fn],
        ['parameter,argument,params', t.vr],
        ['punctuation', t.op],
        ['selector', t.tag],
      ];
      for (let i = 0; i < SUP.length; i++) {
        lines.push(SUP[i][0].split(',').map(function (c) { return '.token.' + c; }).join(',') + '{color:' + SUP[i][1] + ' !important}');
      }
      lines.push('.token.comment,.token.prolog,.token.doctype,.token.cdata{font-style:italic;}');
      lines.push(HL_STYLE);   /* 自定义高亮的类名颜色（插件专属类名，任何主题下都必须注入） */
      this.styleEl.textContent = lines.join('\n');
    } catch (e) { console.error(PREFIX, e); }
  }
  applyCustom() { try { this.customEl.textContent = this.settings.customCss || ''; } catch (e) { } }

  /* 外观变体（引用条颜色 / 表格样式）：常驻注入 + body 类门控，下拉只换类 */
  applyLook() {
    try {
      if (!this._lookEl) { this._lookEl = document.createElement('style'); this._lookEl.id = 'hadesr-code-look'; document.head.appendChild(this._lookEl); }
      this._lookEl.textContent = LOOK_CSS;
      const qb = LOOK_QUOTE[this.settings.quoteBar] ? this.settings.quoteBar : 'gold';
      const ts = LOOK_TABLE[this.settings.tableStyle] ? this.settings.tableStyle : 'none';
      Object.keys(LOOK_QUOTE).forEach(function (k) { document.body.classList.toggle('cs-qbar-' + k, k === qb); });
      Object.keys(LOOK_TABLE).forEach(function (k) { if (k !== 'none') document.body.classList.toggle('cs-table-' + k, k === ts); });
    } catch (e) { }
  }

  /* 工具条在代码块顶部预留的高度（纯 CSS，用相邻兄弟选择器命中「代码块首行」） */
  applyBarCss() {
    try {
      if (!this._barCss) { this._barCss = document.createElement('style'); this._barCss.id = 'hadesr-code-bar'; document.head.appendChild(this._barCss); }
      const out = [];
      /* 只有「工具栏显示 + 预留空间」都开时才留顶部空位；
         工具栏隐藏后不再预留，代码块直接和上下文拼接，避免上方多一条空白 */
      if (this.settings.reserveSpace && this.settings.showToolbar) {
        const H = (this.settings.barHeight || 34) + 4;
        out.push('.markdown-source-view.mod-cm6 .cm-content .cm-line:not(.HyperMD-codeblock) + .cm-line.HyperMD-codeblock{padding-top:' + H + 'px !important;border-radius:10px 10px 0 0;}');
      }
      /* 行号 CSS 必须**常驻**：它自身用 .cbs-ln-show 类门控，块上有类才出现。
         原来只在「全局开」时才注入 → 全局关、想单独给某个块开行号时，
         类加上了却没有对应 CSS → 表现为「本块行号点了没反应」。
         （全局/本块的正确关系见 refresh() 里的两级解析） */
      out.push(this.lineNumberCss());
      this._barCss.textContent = out.join('\n');
    } catch (e) { }
  }

  /* 代码块自己的行号：纯 CSS 计数器，每个块从 1 开始；不碰 DOM、不碰行高。
     默认不显示，仅在「需要显示」的块每行带 .cbs-ln-show 时才出现 —— 这样支持「全局开关 + 每块单独覆盖」 */
  lineNumberCss() {
    const S = '.markdown-source-view.mod-cm6 .cm-content ';
    return [
      S + '.cm-line:not(.HyperMD-codeblock) + .cm-line.HyperMD-codeblock.cbs-ln-show{counter-reset:cbsln;}',
      /* 行号列：列宽 1.6em + 右间隔 1em = 2.6em（与旧版 2em + .6em 之和相同）。
         收窄列宽 → 数字在自己的那一列里更靠左、更居中；总和不变 → **代码本身的位置一点没动**
         （不能影响代码块的边距，这是用户明确的要求）。 */
      S + '.cm-line.HyperMD-codeblock.cbs-ln-show:not(.HyperMD-codeblock-begin):not(.HyperMD-codeblock-end)::before{counter-increment:cbsln;content:counter(cbsln);display:inline-block;width:1.6em;margin-right:1em;text-align:center;color:currentColor;opacity:.35;user-select:none;-webkit-user-select:none;pointer-events:none;}',
    ].join('\n');
  }
  /* 行号开关：编辑态靠 .cbs-ln-show 类（applyBarCss 后类由 refresh 加）；
     阅读态的行号在上色流程里（queueLN），而阅读态靠 _paintVer 判断"是否已刷过" ——
     所以这里**必须 bumpPaint()**，否则已刷过的块会被跳过 → 表现为「编辑模式开了行号、阅读模式看不到」。 */
  applyLineNumbers() { this.applyBarCss(); this.bumpPaint(); }

  setTheme(id) {
    if (id !== THEME_FOLLOW && !THEMES[id]) return;
    this.settings.theme = id; this.saveSettings();
    this.applyCodeThemeClass();   /* 主题里配色 → 只切类名 */
    this.applyTheme();            /* 非主题兜底时才真的注入 */
    this.bumpPaint();             /* 换主题 → 阅读态必须整体重刷一次 */
    this.overlays.forEach(function (ov) { ov.setAttribute('data-theme', id); });
    if (this._menu) this._menu.setAttribute('data-theme', id);
  }
  cycleTheme() { const ids = Object.keys(THEMES); const i = ids.indexOf(this.settings.theme); this.setTheme(ids[(i + 1) % ids.length]); }
}

/* ------------------------------------------------------------ 设置 */
class CodeStudioSettingTab extends PluginSettingTab {
  constructor(app, plugin) { super(app, plugin); this.plugin = plugin; this._page = ''; }

  /* 一级目录 + 二级页：只切 UI，不改设置逻辑 */
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass('cbs-settings');
    if (!this._page) { this._renderHome(containerEl); return; }
    this._renderBack(containerEl, this._page);
    if (this._page === 'theme') this._pageTheme(containerEl);
    else if (this._page === 'table') this._pageTable(containerEl);
    else if (this._page === 'scheme') this._pageScheme(containerEl);
    else if (this._page === 'files') this._pageFiles(containerEl);
    else if (this._page === 'code') this._pageCode(containerEl);
    else if (this._page === 'font') this._pageFont(containerEl);
    else if (this._page === 'custom') this._pageCustom(containerEl);
    else this._pageAbout(containerEl);
  }

  _go(page) { this._page = page || ''; this.display(); try { this.containerEl.scrollTop = 0; } catch (e) { } }

  _renderHome(c) {
    const p = this.plugin;
    const ver = (p.manifest && p.manifest.version) ? p.manifest.version : '';
    const head = c.createDiv({ cls: 'cbs-head' });
    const logo = head.createDiv({ cls: 'cbs-logo', text: 'Hadesr Code' });
    logo.title = '关于 Hadesr Code';
    logo.setAttribute('role', 'button');
    logo.setAttribute('aria-label', '关于 Hadesr Code');
    logo.onclick = () => this._go('about');
    head.createDiv({ cls: 'cbs-meta', text: 'v' + ver + ' · 作者 Hadesr' });
    head.createDiv({ cls: 'cbs-hint', text: '代码块 / 表格 / 主题外观' });

    const s = p.settings;
    const themeName = (THEMES[s.theme] || {}).name || s.theme;
    const quoteName = (LOOK_QUOTE[s.quoteBar] || {}).name || '默认';
    const tableName = (LOOK_TABLE[s.tableStyle] || {}).name || '默认';
    const schemeName = COLOR_SCHEMES[s.appColorScheme] || '默认';
    const rows = [
      { id: 'scheme', icon: 'paint-bucket', name: '整体配色', desc: schemeName },
      { id: 'files', icon: 'folder-tree', name: '文件树外观', desc: (s.appFolderColor ? '彩色文件夹' : '默认文件夹') + (s.appFolderIcons ? ' · 文件图标' : '') },
      { id: 'theme', icon: 'palette', name: '代码主题与工具栏', desc: themeName + ' · 工具栏' + (s.showToolbar ? '开' : '关') + ' · ' + s.barHeight + 'px' },
      { id: 'code', icon: 'code-2', name: '代码块外观', desc: (s.appCodeWrapReading ? '阅读换行' : '阅读不换行') + (s.appCodeNoIndentLine ? ' · 无参考线' : '') },
      { id: 'table', icon: 'table', name: '表格与引用块', desc: '引用 ' + quoteName + ' · 表格 ' + tableName },
      { id: 'font', icon: 'type', name: '字体与字号', desc: '正文 ' + (s.fontBodySize || '跟随') + ' · 代码 ' + (s.codeFontSize || '跟随') },
      { id: 'custom', icon: 'braces', name: '自定义', desc: 'CSS ' + (s.customCss ? '已填' : '空') + ' · 高亮' + (s.customHighlight !== false ? '开' : '关') },
    ];

    const self = this;
    rows.forEach(function (r) {
      const row = c.createDiv({ cls: 'cbs-nav-row' });
      const ic = row.createDiv({ cls: 'cbs-nav-icon' });
      setIcon(ic, r.icon);
      const tx = row.createDiv({ cls: 'cbs-nav-text' });
      tx.createEl('div', { cls: 'cbs-nav-name', text: r.name });
      tx.createEl('div', { cls: 'cbs-nav-desc', text: r.desc });
      const ar = row.createDiv({ cls: 'cbs-nav-arrow' });
      setIcon(ar, 'chevron-right');
      row.onclick = function () { self._go(r.id); };
    });
  }

  _renderBack(c, page) {
    const title = { theme: '代码主题与工具栏', table: '表格与引用块', scheme: '整体配色', files: '文件树外观', code: '代码块外观', font: '字体与字号', custom: '自定义', about: '关于' }[page] || '设置';
    const back = c.createDiv({ cls: 'cbs-back' });
    const ic = back.createSpan({ cls: 'cbs-back-icon' });
    setIcon(ic, 'chevron-left');
    back.createSpan({ cls: 'cbs-back-title', text: title });
    back.onclick = () => this._go('');
  }

  _pageTheme(containerEl) {
    const c = containerEl, p = this.plugin;
    new Setting(c).setName('代码主题').addDropdown((d) => {
      Object.keys(THEMES).forEach((id) => d.addOption(id, THEMES[id].name));
      d.setValue(p.settings.theme); d.onChange((v) => p.setTheme(v));
    });
    new Setting(c).setName('阅读视图也套用主题').addToggle((t) => t.setValue(p.settings.showInReading)
      .onChange(async (v) => { p.settings.showInReading = v; await p.saveSettings(); p.applyTheme(); }));
    new Setting(c).setName('显示代码块工具栏').addToggle((t) => t.setValue(p.settings.showToolbar)
      .onChange(async (v) => { p.settings.showToolbar = v; await p.saveSettings(); p.applyBarCss(); p.hideAll(); p.markDirty(); }));
    new Setting(c).setName('工具栏高度 (px)').addSlider((sl) => sl.setLimits(28, 44, 1).setValue(p.settings.barHeight).setDynamicTooltip()
      .onChange(async (v) => { p.settings.barHeight = v; await p.saveSettings(); p.hideAll(); p.applyBarCss(); p.markDirty(); }));
    new Setting(c).setName('为标题栏预留空间').setDesc('让工具栏「嵌进」代码块顶部（像语雀）。若因此出现行错位，关掉它即可（工具栏会浮在块上方）').addToggle((t) => t.setValue(p.settings.reserveSpace)
      .onChange(async (v) => { p.settings.reserveSpace = v; await p.saveSettings(); p.applyBarCss(); p.position(); }));
    new Setting(c).setName('新文件默认行号').setDesc('行号是**每篇文件各自控制**的（⋯ 菜单：「行号（本文件全部）」+「本块行号」）；这里只是还没设置过的文件的默认值。每个代码块从 1 开始编号').addToggle((t) => t.setValue(p.settings.lineNumbers)
      .onChange(async (v) => { p.settings.lineNumbers = v; await p.saveSettings(); p.applyLineNumbers(); }));
    new Setting(c).setName('工具栏不透明度').addSlider((sl) => sl.setLimits(0.5, 1, 0.02).setValue(p.settings.barOpacity).setDynamicTooltip()
      .onChange(async (v) => { p.settings.barOpacity = v; await p.saveSettings(); p.overlays.forEach(function (ov) { ov.style.opacity = String(v); }); }));

  }

  _pageTable(containerEl) {
    const c = containerEl, p = this.plugin;
    new Setting(c).setName('引用块颜色').setDesc('⚠ 需配套主题「Hadesr UI」：竖条与粉底由主题提供，本项只负责整套换色。两件套请一起拷贝、联动使用（单装本插件时阅读视图不会有竖条）').addDropdown((d) => {
      Object.keys(LOOK_QUOTE).forEach((id) => d.addOption(id, LOOK_QUOTE[id].name));
      d.setValue(p.settings.quoteBar || 'gold');
      d.onChange(async (v) => { p.settings.quoteBar = v; await p.saveSettings(); p.applyLook(); });
    });
    new Setting(c).setName('表格样式').setDesc('阅读视图表格配色方案（编辑态表格不受影响）。本项不依赖主题，任何主题下都生效').addDropdown((d) => {
      Object.keys(LOOK_TABLE).forEach((id) => d.addOption(id, LOOK_TABLE[id].name));
      d.setValue(p.settings.tableStyle || 'blueB');
      d.onChange(async (v) => { p.settings.tableStyle = v; await p.saveSettings(); p.applyLook(); });
    });
    new Setting(c).setName('表格工具栏').setDesc('编辑视图里光标进入 markdown 表格时，左上角浮出操作条：复制表格、插/删行列、本列对齐、删除表格').addToggle((t) => t.setValue(p.settings.tableBar !== false)
      .onChange(async (v) => { p.settings.tableBar = v; await p.saveSettings(); if (!v) p.removeTableBar(); else p.schedule(); }));
    new Setting(c).setName('表格列宽拖拽').setDesc('阅读视图 / 实时预览（光标不在表内）里，把鼠标移到表头格右缘可拖动调整列宽，按表格单独记忆；双击分隔线还原该表').addButton((b) => b.setButtonText('清除所有表格列宽').onClick(async () => {
      p.settings.tableWidths = {};
      await p.saveSettings();
      document.querySelectorAll('.cbs-cols').forEach(function (cg) { cg.remove(); });
      document.querySelectorAll('.cbs-tbl-sized').forEach(function (tb) {
        tb.classList.remove('cbs-tbl-sized');
        try { tb.style.removeProperty('table-layout'); tb.style.removeProperty('width'); } catch (e) { }
      });
      new Notice(PREFIX + '已清除所有表格列宽记忆');
    }));

  }

  _pageScheme(containerEl) {
    const c = containerEl, p = this.plugin;
    c.createEl('p', { text: '换一整套配色（标题 / 正文 / 背景 / 侧栏）。颜色值全在主题里，插件只换一个类名；选了不满意随时切回「默认」。', cls: 'setting-item-description' });

    new Setting(c).setName('配色方案').setDesc('13 套可选')
      .addDropdown((d) => {
        Object.keys(COLOR_SCHEMES).forEach((v) => d.addOption(v, COLOR_SCHEMES[v]));
        d.setValue(p.settings.appColorScheme || '');
        d.onChange(async (v) => { p.settings.appColorScheme = v; await p.saveSettings(); p.applyAppearance(); });
      });

  }

  _pageFiles(containerEl) {
    const c = containerEl, p = this.plugin;
    c.createEl('p', { text: '只对主题「Hadesr UI」有效 —— 样式由主题提供，本插件只当开关（不新增 CSS，不会变卡，观感与原来一致）。原来的 Style Settings 可以卸掉了。', cls: 'setting-item-description' });

    new Setting(c).setName('彩色文件夹').setDesc('给左侧文件树的每个文件夹套一套配色')
      .addToggle((t) => t.setValue(!!p.settings.appFolderColor)
        .onChange(async (v) => { p.settings.appFolderColor = v; await p.saveSettings(); p.applyAppearance(); }));

    new Setting(c).setName('着色方式').setDesc('仅在「彩色文件夹」开启时生效')
      .addDropdown((d) => {
        FOLDER_COLOR_MODES.forEach((id) => d.addOption(id, FOLDER_COLOR_MODE_NAMES[id] || id));
        d.setValue(p.settings.appFolderColorMode || 'folder-style-change-options-colorful-border');
        d.onChange(async (v) => { p.settings.appFolderColorMode = v; await p.saveSettings(); p.applyAppearance(); });
      });

    new Setting(c).setName('配色套数').setDesc('6 套预设，挨个换一下看喜欢哪个')
      .addDropdown((d) => {
        FOLDER_PALETTES.forEach((id) => { if (FOLDER_PALETTE_NAMES[id]) d.addOption(id, FOLDER_PALETTE_NAMES[id]); });
        d.setValue(p.settings.appFolderColorPalette || 'folder-colorful-six');
        d.onChange(async (v) => { p.settings.appFolderColorPalette = v; await p.saveSettings(); p.applyAppearance(); });
      });

    new Setting(c).setName('文件夹图标').setDesc('文件夹名前显示图标')
      .addToggle((t) => t.setValue(!!p.settings.appFolderIcons)
        .onChange(async (v) => { p.settings.appFolderIcons = v; await p.saveSettings(); p.applyAppearance(); }));

    new Setting(c).setName('移除折叠箭头').setDesc('去掉文件夹左边那个三角')
      .addToggle((t) => t.setValue(!!p.settings.appNoArrow)
        .onChange(async (v) => { p.settings.appNoArrow = v; await p.saveSettings(); p.applyAppearance(); }));

    new Setting(c).setName('第一层文件夹不显示图标').setDesc('顶层文件夹只留文字，更清爽')
      .addToggle((t) => t.setValue(!!p.settings.appNoRootIcon)
        .onChange(async (v) => { p.settings.appNoRootIcon = v; await p.saveSettings(); p.applyAppearance(); }));

    new Setting(c).setName('移除文件前图标').setDesc('移除 .md 文件前的图标（文件夹的图标另由上面「文件夹图标」那一项管）')
      .addToggle((t) => t.setValue(!!p.settings.appNoFileIcons)
        .onChange(async (v) => { p.settings.appNoFileIcons = v; await p.saveSettings(); p.applyAppearance(); }));

    new Setting(c).setName('文件夹下划线').setDesc('⚠ 只对「已折叠」的文件夹生效 —— 展开的文件夹标题不会有下划线')
      .addToggle((t) => t.setValue(!!p.settings.appFolderUnderline)
        .onChange(async (v) => { p.settings.appFolderUnderline = v; await p.saveSettings(); p.applyAppearance(); }));

    new Setting(c).setName('文件夹后加圆点').setDesc('文件夹名后面跟一个小圆点')
      .addToggle((t) => t.setValue(!!p.settings.appFolderDot)
        .onChange(async (v) => { p.settings.appFolderDot = v; await p.saveSettings(); p.applyAppearance(); }));

    new Setting(c).setName('当前文件背景变深').setDesc('左侧列表里，当前打开的那篇笔记改用主题色底 + 白字标出（不是改正文背景）')
      .addToggle((t) => t.setValue(!!p.settings.appDarkFileBg)
        .onChange(async (v) => { p.settings.appDarkFileBg = v; await p.saveSettings(); p.applyAppearance(); }));

    new Setting(c).setName('取消标题栏渐变（仅手机端）').setDesc('手机上笔记页顶部那条标题栏有一层半透明渐变底色，开启后变纯色。⚠ 电脑端看不出区别 —— 主题里用到这个渐变的地方只有一条规则，且限定手机端')
      .addToggle((t) => t.setValue(!!p.settings.appPlainFileTitle)
        .onChange(async (v) => { p.settings.appPlainFileTitle = v; await p.saveSettings(); p.applyAppearance(); }));

    new Setting(c).setName('文件名样式').setDesc('长文件名放不下时怎么处理')
      .addDropdown((d) => {
        Object.keys(FILE_NAME_STYLES).forEach((v) => d.addOption(v, FILE_NAME_STYLES[v]));
        d.setValue(p.settings.appFileNameStyle || '');
        d.onChange(async (v) => { p.settings.appFileNameStyle = v; await p.saveSettings(); p.applyAppearance(); });
      });

    new Setting(c).setName('文件背景形状').setDesc('选中的文件是方角还是圆角')
      .addDropdown((d) => {
        Object.keys(FILE_BG_SHAPES).forEach((v) => d.addOption(v, FILE_BG_SHAPES[v]));
        d.setValue(p.settings.appFileBgShape || '');
        d.onChange(async (v) => { p.settings.appFileBgShape = v; await p.saveSettings(); p.applyAppearance(); });
      });

  }

  _pageCode(containerEl) {
    const c = containerEl, p = this.plugin;
    c.createEl('p', { text: '这几项只影响代码块的「行为/样式」，不影响配色 —— 配色仍由上面的「代码主题」管（9 套）。默认全关，开启后才生效。', cls: 'setting-item-description' });

    new Setting(c).setName('取消缩进参考线').setDesc('去掉代码块里那几条竖着的缩进参考线')
      .addToggle((t) => t.setValue(!!p.settings.appCodeNoIndentLine)
        .onChange(async (v) => { p.settings.appCodeNoIndentLine = v; await p.saveSettings(); p.applyAppearance(); }));

    new Setting(c).setName('阅读视图代码换行').setDesc('长行自动折行，不用横向滚动（这里默认关，按需打开）')
      .addToggle((t) => t.setValue(!!p.settings.appCodeWrapReading)
        .onChange(async (v) => { p.settings.appCodeWrapReading = v; await p.saveSettings(); p.applyAppearance(); }));

    new Setting(c).setName('编辑态不换行').setDesc('实时预览里代码一律不折行')
      .addToggle((t) => t.setValue(!!p.settings.appCodeNoWrapEdit)
        .onChange(async (v) => { p.settings.appCodeNoWrapEdit = v; await p.saveSettings(); p.applyAppearance(); }));

    new Setting(c).setName('取消当前行高亮').setDesc('光标所在行不要那条底色')
      .addToggle((t) => t.setValue(!!p.settings.appCodeNoActiveLine)
        .onChange(async (v) => { p.settings.appCodeNoActiveLine = v; await p.saveSettings(); p.applyAppearance(); }));

    new Setting(c).setName('代码字间距').setDesc('0 = 不调整（主题默认）。等宽字体挤的时候可以加一点')
      .addSlider((sl) => sl.setLimits(0, 2, 0.1).setValue(Number(p.settings.appCodeLetterSpace) || 0).setDynamicTooltip()
        .onChange(async (v) => { p.settings.appCodeLetterSpace = v; await p.saveSettings(); p.applyAppearance(); }));

    new Setting(c).setName('代码块外观').setDesc('选「毛玻璃」会给代码块加一层磨砂底（模糊程度用主题默认的 2，本插件暂不提供调节）')
      .addDropdown((d) => {
        Object.keys(CODEBOX_STYLES).forEach((v) => d.addOption(v, CODEBOX_STYLES[v]));
        d.setValue(p.settings.appCodeBoxStyle || '');
        d.onChange(async (v) => { p.settings.appCodeBoxStyle = v; await p.saveSettings(); p.applyAppearance(); });
      });

  }

  _pageFont(containerEl) {
    const c = containerEl, p = this.plugin;
    new Setting(c).setName('正文字体').setDesc('**只作用阅读视图**的正文（编辑态不动 —— 改编辑态正文字体会打乱 CodeMirror 行高缓存导致错行）')
      .addDropdown((d) => { d.addOption('', '跟随主题'); d.addOption('system-ui, -apple-system, "PingFang SC", sans-serif', '系统默认 sans-serif'); d.addOption('"Songti SC", "SimSun", serif', '宋体 / Songti'); d.addOption('"Source Han Sans SC", "Noto Sans CJK SC", sans-serif', '思源黑体 / Source Han Sans'); d.addOption('"LXGW WenKai", "霞鹜文楷", serif', '霞鹜文楷 / LXGW WenKai'); d.addOption('"Sarasa Gothic SC", "更纱黑体 SC", sans-serif', '更纱黑体 / Sarasa'); d.setValue(String(p.settings.fontBody || '')); d.onChange(async (v) => { p.settings.fontBody = v; await p.saveSettings(); p.applyTheme(); }); });
    new Setting(c).setName('正文字号').setDesc('阅读视图正文字号（编辑态跟随 Obsidian 设置）')
      .addDropdown((d) => { d.addOption('0', '跟随主题'); d.addOption('13', '13'); d.addOption('14', '14'); d.addOption('15', '15'); d.addOption('16', '16'); d.addOption('17', '17'); d.addOption('18', '18'); d.addOption('20', '20'); d.setValue(String(p.settings.fontBodySize || 0)); d.onChange(async (v) => { p.settings.fontBodySize = Number(v); await p.saveSettings(); p.applyTheme(); }); });
    new Setting(c).setName('代码块字体').setDesc('阅读视图代码块字体')
      .addDropdown((d) => { d.addOption('', '跟随主题'); d.addOption('"JetBrains Mono", monospace', 'JetBrains Mono'); d.addOption('"Fira Code", monospace', 'Fira Code'); d.addOption('"Cascadia Code", monospace', 'Cascadia Code'); d.addOption('"Source Code Pro", monospace', 'Source Code Pro'); d.addOption('Menlo, Monaco, monospace', 'Menlo / Monaco（macOS 自带）'); d.addOption('Consolas, monospace', 'Consolas（Windows 自带）'); d.addOption('"LXGW WenKai Mono", monospace', '霞鹜文楷等宽 / LXGW WenKai Mono'); d.setValue(String(p.settings.codeFont || '')); d.onChange(async (v) => { p.settings.codeFont = v; await p.saveSettings(); p.applyTheme(); }); });
    new Setting(c).setName('代码块字号').setDesc('阅读视图代码块字号（编辑态字号不动 —— 会错行）')
      .addDropdown((d) => { d.addOption('0', '跟随主题'); d.addOption('13', '13'); d.addOption('14', '14'); d.addOption('15', '15'); d.addOption('16', '16'); d.addOption('17', '17'); d.addOption('18', '18'); d.addOption('20', '20'); d.setValue(String(p.settings.codeFontSize || 0)); d.onChange(async (v) => { p.settings.codeFontSize = Number(v); await p.saveSettings(); p.applyTheme(); }); });

  }

  _pageCustom(containerEl) {
    const c = containerEl, p = this.plugin;
    new Setting(c).setName('附加样式').addTextArea((t) => {
      t.setPlaceholder('.cbs-bar { box-shadow: none; }').setValue(p.settings.customCss)
        .onChange(async (v) => { p.settings.customCss = v; await p.saveSettings(); p.applyCustom(); });
      t.inputEl.rows = 5; t.inputEl.style.width = '100%';
    });

    c.createEl('h3', { text: '自定义代码高亮（正则）' });
    new Setting(c)
      .setName('启用自定义高亮（内置规则包）')
      .setDesc('给 Obsidian 不认识的语言上色 —— cmd / bat / linux / switch / cisco / huawei 等。' +
        '内置规则覆盖：IP、MAC、端口、注释、字符串、命令行参数、变量、路径、网络命令、cmd 关键字、Linux 命令名、网络设备关键字。' +
        '只作用于**阅读视图**（以及实时预览里没聚焦的代码块）；编辑态由 Obsidian 自己渲染，插件不介入。')
      .addToggle((t) => t.setValue(p.settings.customHighlight !== false)
        .onChange(async (v) => { p.settings.customHighlight = v; await p.saveSettings(); p._hlVer = (p._hlVer || 1) + 1; p.bumpPaint(); }));
    new Setting(c)
      .setName('自定义规则')
      .setDesc('每行一条：语言 | token类型 | 正则（# 或 // 开头是注释）。语言可写多个（逗号分隔），* 表示通用。' +
        'token 类型：' + Object.keys(HL_CLASS).join(' / ') + '。' +
        '⚠ 写了某语言的规则后，插件会**接管**该语言（覆盖 Obsidian 的原生高亮）。')
      .addTextArea((t) => {
        t.setPlaceholder([
          '# 语言 | token类型 | 正则',
          'cmd    | keyword | \\b(?:if|else|for|goto|call|set)\\b',
          'cmd    | comment | ^\\s*(?:rem\\b|::).*',
          'switch | number  | \\b\\d+/\\d+\\b',
          'nginx  | keyword | \\b(?:server|location|proxy_pass|listen|upstream)\\b',
          'nginx  | string  | \\b(?:\\d{1,3}\\.){3}\\d{1,3}:\\d+\\b',
        ].join('\n')).setValue(p.settings.customRules)
          .onChange(async (v) => { p.settings.customRules = v; await p.saveSettings(); p._hlVer = (p._hlVer || 1) + 1; p.bumpPaint(); });
        t.inputEl.rows = 8; t.inputEl.style.width = '100%';
        try { t.inputEl.style.fontFamily = 'var(--font-monospace)'; } catch (e) { }
      });
  }

  _pageAbout(containerEl) {
    containerEl.createEl('p', { cls: 'setting-item-description', text: 'Hadesr Code · 作者 Hadesr · v' + ((this.plugin.manifest && this.plugin.manifest.version) || '') });
    containerEl.createEl('p', { cls: 'setting-item-description', text: '编辑/实时预览里，每个代码块顶部有一条工具栏；阅读视图套用同一套主题（只读、更美观）。零 CodeMirror 依赖。' });
  }
}

function stop(e) { try { e.preventDefault(); e.stopPropagation(); } catch (err) { } }

module.exports = CodeStudioPlugin;
