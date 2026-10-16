#!/usr/bin/env bash
# 把 Code UI 两件套装进目标 vault
# 用法: ./install.sh "/path/to/vault"
set -e
VAULT="$1"
[ -z "$VAULT" ] && { echo "用法: $0 \"/path/to/vault\""; exit 1; }
[ -d "$VAULT/.obsidian" ] || { echo "不是 Obsidian vault: $VAULT"; exit 1; }
HERE="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$VAULT/.obsidian/plugins" "$VAULT/.obsidian/themes"
rm -rf "$VAULT/.obsidian/plugins/hadesr-code" "$VAULT/.obsidian/themes/Hadesr UI"
cp -R "$HERE/hadesr-code" "$VAULT/.obsidian/plugins/hadesr-code"
cp -R "$HERE/themes/Hadesr UI" "$VAULT/.obsidian/themes/Hadesr UI"
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
chmod +x "$VAULT/.obsidian/plugins/hadesr-code/main.js" 2>/dev/null || true
echo "OK: 装好了，重载 Obsidian 即可。"
