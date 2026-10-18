# 数据结构与单文件打包

制作端需要 Python 3.9+；老师运行课件只需浏览器。见 `examples/xiaoshitan/lesson.json` 的完整实例。

顶层字段：`title`、`grade`、`goal`、`task`、`source.label`、`scenes`。每个场景含 `id`、`title`、`mode:"panorama"`、`image`、`alt`、`note`、可选 `startYaw/startPitch` 和非空 `hotspots`。每个热点含 `id`、`label`、`yaw/pitch`、`art`、`artAlt`、`quote`、`question`、`analysis`。`art` 是该热点的独立局部图，不能复用场景图或其他热点的图；打包器检查重复素材，但画面内容是否对应仍须人工逐点验收。

只有课文需要揭示动作时，为热点加可选 `reveal`：`{"button":"翻开断砖","art":"砖下细节.png","artAlt":"断砖翻开后露出蜈蚣","text":"发现蜈蚣；请回到原文解释这一细节。"}`。热点原有 `art` 是动作前图，`reveal.art` 是动作后图；点击按钮切换，必须分别制作并核对。普通热点不加 `reveal`。

素材路径相对于 JSON 所在目录。构建器拒绝目录越界、远端 URL 与脚本式 SVG，内嵌图片、样式、脚本，并转义 JSON 中的 `<`。输出超过 40MB 时先优化素材。当前模板没有音频播放器；不要加入音频字段或承诺点读。

```sh
python scripts/build.py examples/xiaoshitan/lesson.json --out dist/xiaoshitan/index.html
python scripts/verify.py dist/xiaoshitan/index.html
```

全景 `yaw` 范围为 −180° 至 180°，`pitch` 为 −85° 至 85°，需与场景中的物体位置校准。本模板提供静态阅读降级；没有云端成绩存储。
