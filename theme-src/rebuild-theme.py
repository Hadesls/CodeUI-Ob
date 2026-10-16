#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Hadesr UI —— theme.css 重合并工具（确定性重建版）

    theme.css = 文件头(template) + Blue Topaz 底子 + 分隔注释 + overlay.src.css

★ 为什么不"按标记切一刀再拼"：底子主题的第一行也是 `/* =====...`，
  按首行查找切点会命中 index 0 → 把 theme.css 截成只剩覆盖层（2026-10-16 真踩过）。
  所以这里改成**从底子原件完整重拼**：每一次输出都是同一套确定的输入算出来的，
  不存在"切错位置"的可能。

用法：
    python3 rebuild-theme.py                      # 用默认路径（自动按仓库位置推算）
    python3 rebuild-theme.py <主题目录> <底子theme.css> [主题版本] [插件版本]

★ 路径全部按「本脚本所在位置」推算 —— 仓库放哪、换台电脑 clone 到哪都能跑，
  不再依赖任何桌面备份目录。
"""
import io, os, sys, json

HERE = os.path.dirname(os.path.abspath(__file__))          # …/Code-UI/theme-src
ROOT = os.path.dirname(HERE)                               # …/Code-UI
DEF_THEME = os.path.join(ROOT, "themes", "Hadesr UI")      # 主题目录（含 overlay.src.css）
DEF_BASE = os.path.join(HERE, "base-Blue-Topaz.css")       # 底子（随仓库一起分发）
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
        "   Hadesr UI   v" + TV + "   ——  Obsidian 主题（成品，Obsidian 加载的就是本文件）\n"
        "   ----------------------------------------------------------------------------\n"
        "   组成：[1] 底子主题 Blue Topaz by WhyI & Pkmer（原样保留，占本文件绝大部分）\n"
        "         [2] Hadesr UI 覆盖层（追加在文件末尾，靠 !important 与后置顺序生效）\n"
        "   覆盖层源码单独存放于同目录 overlay.src.css（Obsidian 忽略该文件）；\n"
        "   改外观请改 overlay.src.css，改完按其中的命令重新合并本文件。\n"
        "   ----------------------------------------------------------------------------\n"
        "   ★ 需与插件 Hadesr Code（v" + PV + "+）配套使用，两件套一起拷贝、联动使用：\n"
        "     · 本主题提供引用块「结构」（4px 竖条 / 底色 / 强制换行）、行内代码、分割线、\n"
        "       任务清单已完成项删除线、去掉底子主题自带的代码块装饰。\n"
        "     · 本主题提供「明暗适配」：上述几项的颜色按 theme-light / theme-dark 切换。\n"
        "     · 插件提供引用块「换色」（5 档下拉，浅色/深色各一套值）、表格配色（6 档，同样双份）、\n"
        "       全部表格功能与代码块工具栏。\n"
        "     · 只装其一都会出现\"半个效果\"，详见同仓库 README。\n"
        "   ----------------------------------------------------------------------------\n"
        "   ⚠ 不要点 Obsidian 的「更新主题」：那会拉回一个原版 Blue Topaz，\n"
        "     本主题不会自动跟着变。底子上游更新后需手动重跑合并（见 overlay.src.css）。\n"
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

    # 安全闸门：底子必须是「原版 Blue Topaz」那么大，覆盖层必须带着自己的抬头。
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
