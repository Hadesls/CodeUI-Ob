#!/usr/bin/env bash
# 把 Code UI 两件套装进目标 vault
# 用法: ./install.sh "/path/to/vault"
#
# 覆盖式安装：替换 vault 里的插件与主题，但**保留你的插件设置 data.json**
# （代码主题 / 引用块档位 / 表格档位 / 表格列宽都在里面，删了就得重配）。
set -e
VAULT="$1"
[ -z "$VAULT" ] && { echo "用法: $0 \"/path/to/vault\""; exit 1; }
[ -d "$VAULT/.obsidian" ] || { echo "不是 Obsidian vault: $VAULT"; exit 1; }
HERE="$(cd "$(dirname "$0")" && pwd)"

PLUGIN_DIR="$VAULT/.obsidian/plugins/hadesr-code"
THEME_DIR="$VAULT/.obsidian/themes/Hadesr UI"
mkdir -p "$VAULT/.obsidian/plugins" "$VAULT/.obsidian/themes"

# ── 先把用户设置挪出来 ────────────────────────────────────────────
# data.json 是每台机器各自的设置（Obsidian 自动生成，不在仓库里）。
# 下面要 rm -rf 整个插件目录，所以必须先备份，装完再放回去。
DATA_BAK=""
if [ -f "$PLUGIN_DIR/data.json" ]; then
  DATA_BAK="$(mktemp)"
  cp "$PLUGIN_DIR/data.json" "$DATA_BAK"
  echo "已备份你的插件设置 data.json，装完自动放回"
fi

rm -rf "$PLUGIN_DIR" "$THEME_DIR"
cp -R "$HERE/hadesr-code" "$PLUGIN_DIR"
cp -R "$HERE/themes/Hadesr UI" "$THEME_DIR"

# ── 放回用户设置 ────────────────────────────────────────────────
if [ -n "$DATA_BAK" ]; then
  cp "$DATA_BAK" "$PLUGIN_DIR/data.json"
  rm -f "$DATA_BAK"
  echo "已恢复你的插件设置"
fi

python3 - "$VAULT" <<'PYX'
import json, sys, os
v = sys.argv[1] + "/.obsidian"
p = os.path.join(v, "community-plugins.json")
lst = json.load(open(p, encoding="utf-8")) if os.path.exists(p) else []
if "hadesr-code" not in lst:
    lst.append("hadesr-code")
json.dump(lst, open(p, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
a = os.path.join(v, "appearance.json")
d = json.load(open(a, encoding="utf-8")) if os.path.exists(a) else {}
d["cssTheme"] = "Hadesr UI"
json.dump(d, open(a, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print("已写入启用登记：插件 hadesr-code、主题 Hadesr UI")
PYX
chmod +x "$PLUGIN_DIR/main.js" 2>/dev/null || true
echo "OK: 装好了，重载 Obsidian 即可。"
