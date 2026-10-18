# 两个不同教学任务

先阅读仓库 `SKILL.md`，按需求→教学→视觉→代码→验证流程执行。以下输入用于真实构建测试，不是全学科能力承诺。

## A：《春》——比较表达

> 使用 interactive-lesson-creator，为七年级《春》设计10分钟场景互动。学生拖动360°环视，找到小草和花树；比较原句和朴素改写，说明动词/比喻带来的变化。先回答再显示参考解读，收集两条证据。交付一个可离线双击的index.html。

文件：`spring/lesson.json`、新生成 `spring/panorama.jpg`。一个环视场景、两个热点、两组表达比较题、证据笔记。

```sh
python scripts/build.py examples/spring/lesson.json --out dist/spring/index.html
python scripts/verify.py dist/spring/index.html
```

## B：百草园——给“乐园”找证据

> 使用 interactive-lesson-creator，但不复制旧百草园课件的游览章节。只用一个可环视园景，让学生从菜畦、井栏、虫声的原文短句中区分视觉/触觉/听觉，再用自己的话解释童趣。学生可以把自己的分类和解释写入证据板。交付一个可离线双击的index.html。

文件：`baicao-evidence/lesson.json`、新生成 `baicao-evidence/panorama.jpg`。一个环视场景、三个热点、三组判断与解释、学生自主归类与证据笔记。

```sh
python scripts/build.py examples/baicao-evidence/lesson.json --out dist/baicao-evidence/index.html
python scripts/verify.py dist/baicao-evidence/index.html
```

## 可观察的变化

A 根据目标设计“原句与改写的比较”；B 根据目标设计“感官分类与证据解释”。二者共用查看器、单文件打包和验证工具，不共用百草园章节/传说/冬景/捕鸟流程。学生产物不是点完按钮，而是带原文的解释笔记。

参考 `../tests/RESULTS.md` 的真实运行记录。原文摘句需要教师按当地教材版本核对；生成插画不当历史、植物鉴定依据，未做真实学生学习效果实验。
