#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Hadesr UI —— theme.css 重合并工具（确定性重建版）

    theme.css = 文件头(template) + 底子 + 分隔注释 + overlay.src.css

★ 为什么不"按标记切一刀再拼"：底子主题的第一行也是 `/* =====...`，
  按首行查找切点会命中 index 0，导致 theme.css 被截断。
  所以这里改成**从底子原件完整重拼**：每一次输出都是同一套确定的输入算出来的，
  不存在"切错位置"的可能。

用法：
    python3 rebuild-theme.py                      # 用默认路径（自动按仓库位置推算）
    python3 rebuild-theme.py <主题目录> <底子theme.css> [主题版本] [插件版本]

★ 路径全部按「本脚本所在位置」推算 —— 仓库放哪、换台电脑 clone 到哪都能跑，
  不再依赖任何桌面备份目录。
"""
import io, os, sys, json

HERE = os.path.dirname(os.path.abspath(__file__))          # …/CodeUI-Ob/theme-src
ROOT = os.path.dirname(HERE)                               # …/CodeUI-Ob
DEF_THEME = os.path.join(ROOT, "Hadesr UI")                # 主题目录（含 overlay.src.css）
# ↑ 主题目录放在仓库一级，与 hadesr-code/ 对称。
DEF_BASE = os.path.join(HERE, "base-theme.css")       # 底子（随仓库一起分发）
# ↑ 仓库一级的两个文件夹名 = 「拷进 vault 后的文件夹名」，也就是插件 manifest 的 id：
#     hadesr-code/  →  plugins/hadesr-code
#     Hadesr UI/    →  themes/Hadesr UI
#   ⚠ 插件那个**必须是小写带横杠 `hadesr-code`**（= manifest 的 id）——
#     Obsidian 拿文件夹名去匹配 id，改成 `Hadesr Code` 就加载不了。
#     显示名「Hadesr Code」来自 manifest 的 name 字段，跟文件夹名无关。
DEF_PLUGIN_MANIFEST = os.path.join(ROOT, "hadesr-code", "manifest.json")
SEP = "/* ↓↓↓ Hadesr UI 覆盖层 开始 ↓↓↓ */"


def rd(p):
    # newline='' —— 关掉换行翻译，底子里的 CRLF / 单独 CR 原样保留，
    # 保证重建结果与手工合并时逐字节一致（用默认 newline=None 会悄悄改行尾）。
    with io.open(p, encoding="utf-8", newline="") as f:
        return f.read()


def wr(p, s):
    with io.open(p, "w", encoding="utf-8", newline="") as f:
        f.write(s)


def head_template(TV, PV):
    return (
        "/* ============================================================================\n"
        "   Hadesr UI   v" + TV + "   ——  Obsidian 主题\n"
        "   作者: Hadesr\n"
        "   ----------------------------------------------------------------------------\n"
        "   本文件含第三方主题底子；其原始版权与 MIT 许可声明保留在下方。\n"
        "   ============================================================================ */\n\n"
    )


def main():
    a = sys.argv[1:]
    T = a[0] if len(a) > 0 else DEF_THEME
    base_path = a[1] if len(a) > 1 else DEF_BASE
    pm = DEF_PLUGIN_MANIFEST

    for p in (os.path.join(T, "overlay.src.css"), os.path.join(T, "manifest.json"), base_path, pm):
        if not os.path.exists(p):
            print("✗ 缺文件：%s" % p)
            return 1

    TV = a[2] if len(a) > 2 else json.load(io.open(os.path.join(T, "manifest.json"), encoding="utf-8"))["version"]
    PV = a[3] if len(a) > 3 else json.load(io.open(pm, encoding="utf-8"))["version"]

    base = rd(base_path)
    ov = rd(os.path.join(T, "overlay.src.css"))

    # 安全闸门：底子必须足够大，覆盖层必须带着自己的抬头。
    if len(base) < 1000000:
        print("✗ 底子文件看着不对（只有 %d 字符），已中止" % len(base))
        return 1
    if "覆盖层源码" not in ov:
        print("✗ overlay.src.css 看着不对（找不到抬头），已中止")
        return 1

    out = head_template(TV, PV) + base + "\n\n" + SEP + "\n\n" + ov

    # 二次确认：文件头 + 底子 + 分隔 + 覆盖层 必须首尾对得上
    assert out.startswith("/* ======"), "文件头异常"
    assert out.endswith(ov[-200:]), "覆盖层没有落在文件末尾"
    assert out.count("{") == out.count("}"), "花括号不配平"

    dst = os.path.join(T, "theme.css")
    wr(dst, out)
    print("主题版本 %s | 配套插件 %s" % (TV, PV))
    print("文件头  : %6d 字符" % len(head_template(TV, PV)))
    print("底子    : %6d 字符" % len(base))
    print("覆盖层  : %6d 字符" % len(ov))
    print("theme.css: %5d 字符 / %d 字节" % (len(out), os.path.getsize(dst)))
    print("花括号  : %d / %d  ✅ 配平" % (out.count("{"), out.count("}")))
    return 0


if __name__ == "__main__":
    sys.exit(main())
