# Code-UI

> Obsidian 两件套：**代码块 / 表格增强插件** + **配套界面主题**。放这个仓库，方便多台电脑用 `git pull` 保持同步。

| 资产 | 名字 | 版本 | 干什么的 |
|---|---|---|---|
| 插件 | **Hadesr Code** | `v2.26.0` | 代码块工具栏（语言 / 主题 / 复制 / 下载 / 行号）、代码块配色与字体、**自定义正则高亮**、表格工具栏（含**复制表格**）、表格列宽拖拽、引用块换色档位、表格配色档位 |
| 主题 | **Hadesr UI** | `v1.5.0` | 代码块 / 表格 / 引用块的整套观感，**任务清单已完成项删除线**，**明暗双模式适配**，**基于 Blue Topaz 精简改造** |

---

## 为什么推荐它：代码块照着语雀做

**这套代码块的观感，是照着语雀做的 —— 甚至可以说几乎一样。**

![Code UI 实际观感：代码块工具栏 + 语法高亮 + 表格 + 引用块](docs/preview-overview.png)

| 语雀的代码块 | 这里的代码块 |
|---|---|
| 右上角**语言标签**（点开切语言） | ✅ 同款 |
| 右上角**复制按钮** | ✅ 同款（点一下，图标变 ✓） |
| **圆角卡片 + 深色底** | ✅ 同款 |
| **语法高亮配色** | ✅ 内置 **9 套**主题，也能跟随主题 |
| **表格**：浅蓝表头 + 细框线 | ✅ 同款（**6 档**配色） |
| **引用块**：左竖条 + 浅底 | ✅ 同款（**5 档**颜色） |

> 在 Obsidian 里拿到语雀那套观感，**还多出**：行号开关、下载为文件、表格列宽拖拽、自定义正则高亮。

### 内置 9 套代码主题

![9 套代码主题 + 跟随主题，同一段代码的配色对比](docs/preview-themes.png)

`One Dark Pro` · `Dracula` · `Night Owl` · `Monokai` · `Material` · `GitHub Dark` · `GitHub Light` · `Solarized Dark` · `Solarized Light`

外加 **「跟随主题」** 档 —— 不注入任何配色，直接用当前主题自己的代码块颜色。

### 深色模式：自动适配

- **代码块不跟随明暗** —— 它自带 9 套配色，永远是深色卡片，两种模式长得一样（刻意如此）。
- **引用块 / 表格 / 行内代码 / 分割线跟随明暗**：这些"画了背景色"的地方，深色下改用**半透明叠色**，跟着背景走，不会出现"暗界面上一块亮色"。
- 你选的是**色相**（浅蓝 / 暖金 / 青绿…），不是"浅色模式专用的浅蓝"。切到深色，它自动换成同一色相的深色版本，不用手动改设置。

---

## 新电脑安装（3 步）

### 1. 拿文件

```bash
git clone https://github.com/Hadesls/CodeUI-Ob.git
cd CodeUI-Ob
```

### 2. 拷进 vault

```bash
VAULT="/path/to/你的vault"
mkdir -p "$VAULT/.obsidian/plugins" "$VAULT/.obsidian/themes"
cp -R hadesr-code        "$VAULT/.obsidian/plugins/hadesr-code"
cp -R "Hadesr UI"        "$VAULT/.obsidian/themes/Hadesr UI"
```

> 就两条 `cp`，没有安装脚本 —— 插件和主题本来就是「文件夹放对位置」而已。

> **手机 / iOS 提示**：系统「文件」App 看不到 `.obsidian`（隐藏目录）。建议在电脑上拷好，再用同步工具（Syncthing / iCloud / WebDAV）把整个 vault 同步过去。

### 3. 在 Obsidian 里确认

1. 设置 → 第三方插件 → 启用 **Hadesr Code**
2. 设置 → 外观 → 主题 → 选 **Hadesr UI**
3. 随便打开一篇笔记，确认：代码块有工具栏、引用块有竖条、表格有配色、**勾选完成的任务有删除线**

---

## 功能一览

| 功能 | 说明 |
|---|---|
| **代码块工具栏** | 语言切换 / 主题切换 / 复制 / 下载 / 行号开关 / 更多菜单（同步语言到全文等） |
| **★ 自定义正则高亮** | 给 Obsidian 不认识的语言上色（详见下节） |
| **表格工具栏** | 复制表格（Markdown 格式，只读不改文档）/ 上方插行 / 删除本行 / 下方插行 / 左侧插列 / 删除本列 / 右侧插列 / 本列对齐 / 删除整表 |
| **表格列宽拖拽** | 拖表头分隔线调宽度，**按表记忆** |
| **引用块换色** | **5 档**：暖金 / 浅蓝 / 青绿 / 珊瑚红 / 暖灰 —— 换色 = 竖条 + 底色**整套换**；**浅色/深色各一套值** |
| **表格配色** | **6 档**：主题默认 / 雾蓝全框线 / 浅蓝强调 / 斑马蓝 / 深蓝表头 / 暖金；**浅色/深色各一套值** |
| **明暗适配** | 引用块 / 表格 / 行内代码 / 分割线**跟随明暗自动切**，不用手动管 |
| **代码主题** | **9 套** + 「跟随主题」 |
| **字体与字号** | 正文 / 代码块各两组下拉；**字号默认 16px，编辑态与阅读态一致** |
| **行号** | 三级控制：全局 / 按文件 / 按块 |

### ★ 自定义正则高亮（重点）

Obsidian 内置语言是**固定**的（阅读态 Prism 371 种 / 编辑态 CodeMirror 122 种），
`cmd` / `bat` / `linux` / 网络设备命令这些**都不在里面** —— fence 写出来一点颜色都没有。
本插件自带一套**轻量正则着色引擎**补这个缺口。

**内置规则包**（开箱即用，不用配）：

| 类别 | 认什么 |
|------|--------|
| 网络标识 | IP（含 CIDR `192.0.2.0/24`）、MAC（**六段 `00:1A:2B:3C:4D:5E` 与三段 `0011-2233-4455` 都认**）、端口（`:8080`、`80/tcp`、`port 8080`） |
| **网络命令名** | `ping` `tracert` `nslookup` `ipconfig` `ifconfig` `netstat` `netsh` `route` `arp` `ssh` `curl` `wget` `dig` `tcpdump` `nmap` … |
| **网络设备关键字** | `show` `display` `interface` `vlan` `switchport` `trunk` `ospf` `bgp` `acl` `nat` `ip address` `undo` `system-view` … |
| Windows 批处理 | `if` `for` `goto` `call` `set` `echo` `copy` `move` `del` `find` `taskkill` `net` `reg` … |
| Linux 命令名 | `ls` `grep` `sed` `awk` `chmod` `systemctl` `journalctl` `df` `tar` `docker` `kubectl` `apt` … |
| 通用 | 注释 / 字符串 / 命令行参数（`-ano`）/ 变量（`$VAR` `%VAR%` `!VAR!`）/ 路径 / 数字 |

**能触发它的语言名**（都在语言下拉里，直接选即可）：

`cmd` · `bat` · `linux` · `switch` · `cisco` · `huawei` · `h3c` · `ios` · `network` · `vrp`

**自定义规则**（设置 → 自定义代码高亮）：每行一条 `语言 | token类型 | 正则`

```text
nginx  | keyword | \b(?:server|location|proxy_pass|listen|upstream)\b
nginx  | string  | \b(?:\d{1,3}\.){3}\d{1,3}:\d+\b
mycmd  | keyword | \b(?:foo|bar)\b
```

- 语言可写多个（逗号分隔）；`*` = 通用（对所有被接管的语言生效）
- token 类型：`keyword / comment / string / number / cmd / option / variable / path / ip / mac / port / op`，颜色取自官方 `--code-*` 变量 → **换任何主题都有色**
- **只有你写了规则的语言才会被接管** —— `bash` / `js` / `python` 这些原生高亮不受影响

**边界（必读）**：

- ✅ 只作用于**阅读视图** + **实时预览里没聚焦的代码块**
- ❌ **编辑态（光标停在块内）不生效** —— 那块由 Obsidian 自己的 CodeMirror 渲染，插件不介入
- 超大块（>600 行 / 40KB）跳过，避免逐行正则拖慢

---

## 更新（另一台电脑 / 本机升级）

```bash
cd CodeUI-Ob
git pull
VAULT="/path/to/你的vault"
cp -R hadesr-code/.        "$VAULT/.obsidian/plugins/hadesr-code/"
cp -R "Hadesr UI/."        "$VAULT/.obsidian/themes/Hadesr UI/"
```

> **为什么是「覆盖」而不是「删了重拷」**：结尾那个 `/.` 表示"拷贝目录**内容**进目标目录"，
> 只覆盖同名文件，**不会动你本机的 `data.json`**（代码主题 / 引用块档位 / 表格档位 / 表格列宽记忆）
> —— 那个文件只存在于你机器上，仓库里根本没有。
> 反过来，**先 `rm -rf` 再拷就会把设置清空**，别那么干。

然后在 Obsidian 里**重载**：`Ctrl/Cmd + R`，或到设置里把插件关掉再打开。

> 插件版本会显示在 **设置 → Hadesr Code** 的标题上（例如 `Hadesr Code 设置 v2.26.0`）—— 一眼就能看出这台是不是旧的。

---

## 目录结构

```
Code-UI/
├─ README.md                  ← 本文件
├─ LICENSE                    ← MIT（含 Blue Topaz 署名）
├─ hadesr-code/               ← 插件本体（= Obsidian 插件目录里的内容）
│  ├─ main.js
│  ├─ styles.css
│  ├─ manifest.json
│  ├─ versions.json
│  └─ tools/
│     └─ static-check.js      ← 改完 main.js 跑一下：确认 this.* 调用的方法都有定义
├─ Hadesr UI/                 ← 主题（= Obsidian 主题目录里的内容）
│  ├─ manifest.json
│  ├─ theme.css               ← 成品（底子 + 覆盖层合并，约 1.29 MB）
│  └─ overlay.src.css         ← 覆盖层源码（改样式改这里）
├─ docs/                      ← README 里的配图
│  ├─ preview-overview.png
│  └─ preview-themes.png
└─ theme-src/                 ← 主题重建原料（只给"要改主题"的人用）
   ├─ base-Blue-Topaz.css     ← Blue Topaz 底子（原样留档，别再动它）
   └─ rebuild-theme.py        ← 一键重合并：底子 + overlay.src.css → theme.css
```

> **仓库一级的每个文件夹 = 拷进 vault 的一份东西**：
> `hadesr-code/` → `<vault>/.obsidian/plugins/hadesr-code/`；
> `Hadesr UI/` → `<vault>/.obsidian/themes/Hadesr UI/`。
> （`docs/` 与 `theme-src/` 是仓库自用，不往 vault 里拷。）

> **不进仓库的东西**：插件目录里的 `data.json` —— 那是每台机器各自的设置（代码主题选择、引用块档位、表格档位、列宽记忆），由 Obsidian 自动生成。

---

## 开发 / 维护

**同步方向永远是单向**：本地 vault 是「开发机」，本仓库是「发行版」。
不要反向改仓库再拷回 vault，否则两边内容会飘。

```
① 在 vault 里改插件 / 主题覆盖层（就地改，马上能看到效果）
② 升版本号（插件 manifest + 主题 manifest + overlay 抬头，另加 versions.json）
③ 重合并主题成品（改过 overlay.src.css 才需要）：python3 theme-src/rebuild-theme.py
④ 把改动同步到本仓库目录（vault → Code-UI，单向）
⑤ 推送：push-via-api-retry.js（见下方「怎么推」）
⑥ 别的电脑：git pull → 两条 cp 覆盖 → 重载 Obsidian
```

### 怎么推

沙箱 / 受限网络里 `github.com` 走不通（`git push` 必 502），但 `api.github.com` 通。
用 `gh` 拿 token，再走 REST API 推：

```bash
export PATH="$HOME/bin:$PATH"
SRC="/Users/hadesr/Desktop/Code-UI" \
MESSAGE="feat: xxx（v2.26.0）" \
GH_TOKEN=$(gh auth token) \
node "$HOME/bin/push-via-api-retry.js" Hadesls/CodeUI-Ob main
```

> `push-via-api-retry.js` 带指数退避重试（网络抖动会自动重试），
> 且**文本文件走 utf-8 直传**（省掉 base64 的 33% 体积）。

> 更细的说明（含主题"底子 + 覆盖层"的合并原理、重建步骤）见配套文档 **《Code-UI 打包与维护方案》**。

---

## 许可

**MIT License** —— 详见 [LICENSE](LICENSE)。

> 主题 `Hadesr UI` 基于 **Blue Topaz** 改造，按上游许可要求声明：
>
> *Partial style(s) is(are) sourced or adapted from Blue Topaz (https://github.com/PKM-er/Blue-Topaz_Obsidian-css), and I would like to express my appreciation to WhyI (https://github.com/whyt-byte) and pkmer.cn (https://pkmer.cn).*
