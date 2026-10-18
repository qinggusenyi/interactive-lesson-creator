# AI 场景互动课件 Skill

从课文出发制作满屏封面、探索地图、固定机位 360° 环视、贴合原文的热点与局部细节卡。交付给老师的是一个可离线双击的 `index.html`。

## 效果与使用

- 场景可拖动环视、滚轮缩放；热点随视角定位。
- 点击热点可看对应局部图、原文、观察问题和分层参考解读。
- 热点卡片展示对应插画、原文、观察提示和问题；可显示解读或切教师模式。WebGL 不可用时有静态入口。
- 单文件内嵌所有图片、CSS、JS；不需要服务器、CDN 或登录。

请不要沿用样例的文章、热点数量或构图。Skill 要求 Agent 逐篇分析课文，自行找出值得操作的细节，并逐一校对图文。

## 安装

把本仓库的 `SKILL.md`、`assets/`、`scripts/`、`references/` 一起放入 `~/.codex/skills/interactive-lesson-creator/`。重新开启会话后使用 `$interactive-lesson-creator`。其他兼容 Skill 的宿主可按其目录规则导入。

豆包工作可按 [导入说明](docs/doubao-install.md) 导入技能文件夹或本项目打包的 ZIP。仓库样例通过本机构建和静态验证；豆包客户端的实际导入与新课文生成效果需在客户端再做一次验收。

## 构建新课件

`examples/xiaoshitan/lesson.json` 只是字段范例；配图是本次独立制作的《小石潭记》文学情境图。新文章需要新内容和新素材。

```sh
python scripts/build.py examples/xiaoshitan/lesson.json --out dist/xiaoshitan/index.html
python scripts/verify.py dist/xiaoshitan/index.html
python tests/test_build.py
```

输出文件可独立复制给老师。真正交付前仍须在浏览器以 `file://` 打开，逐一点击热点、转向、缩放、显示解读，并检查图片和课文是否对应；静态检查不能替代体验验收。详见 [验证清单](references/verification.md)。

## 边界

固定机位环视不是自由行走。2:1 图片可能有接缝或投影失真，须目测验收。课文摘句请按学校教材核对版本。生成插画用于想象，不作历史原貌。素材信息见 [说明](examples/ASSET-NOTICE.md)。
