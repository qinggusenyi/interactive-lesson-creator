# AI 场景互动课件 Skill

**interactive-lesson-creator**：从一篇课文和一个学习目标出发，制作百草园式**可环视、可点击、有学习任务**的网页课件。

**老师最终只拿一个 `index.html`，双击即可使用。** 生成课件不需要运行时后端、账号、CDN或大模型API。

## 能做什么

- 语文文学场景：固定机位360°环视、拖动转向、滚轮缩放、热点定位。
- 点击景物进入原文证据、观察问题、比较题与分层参考解读。
- 学生收集证据、归类、写解释；教师可控制参考解读的显示。
- 适配课堂投影；WebGL不可用时保留静态阅读与文字入口。
- 单文件打包：图片、可选音频、CSS和JS全部内嵌。

主要支持语文场景式教学。不是现成的全学科题库、真实3D自由行走、历史建筑复原或学生成绩平台。Skill指导Agent制作；它不会自动给没有代码执行/图片生成能力的Agent增加工具。

## 安装 / 导入

### Codex

把本仓库文件放入一个完整目录：`~/.codex/skills/interactive-lesson-creator/`，确保直接包含 `SKILL.md`。重新开启会话后确认技能可见。不要把源码仓库整个嵌套两层。

### Claude Code

项目级放到 `.claude/skills/interactive-lesson-creator/`；或用户级 `~/.claude/skills/interactive-lesson-creator/`。保留 `assets/`、`scripts/`、`references/` 相对结构。

### 豆包工作

下载发布资产中的 `interactive-lesson-creator.zip`，按 [豆包工作安装说明](docs/doubao-install.md) 导入。不同版本入口可能不同；本仓库不虚构统一安装命令，也不把“附件读到了”当作“技能安装成功”。本次未实际操作豆包客户端安装。

## 如何触发

显式：

> 使用 interactive-lesson-creator，把《春》做成七年级10分钟环视互动课件。学生比较词语并保存两条文本证据。最终只交付一个离线index.html，同时保留验证记录。

Codex可使用 `$interactive-lesson-creator`；Claude Code使用 `/interactive-lesson-creator`（[官方说明](https://code.claude.com/docs/en/skills)）。自然请求如“做一个百草园式可环视语文课件”应符合description，但自动匹配由宿主决定，需在安装环境实测。

## 制作流程

需求分析 → 学习目标与操作映射 → 场景/热点/视觉 → 原生网页实现 → 单文件打包 → 内容与浏览器验证。

不要照搬原百草园的章节和游戏。先看 [原项目分析](references/project-analysis.md)，再读 [环视实施](references/panorama.md)。两个不同任务见 [示例](examples/README.md)。

### 本地构建示例（仅制作端需要Python 3.9+）

```sh
python scripts/build.py examples/spring/lesson.json --out dist/spring/index.html
python scripts/build.py examples/baicao-evidence/lesson.json --out dist/baicao-evidence/index.html
python scripts/verify.py dist/spring/index.html
python tests/test_build.py
```

老师只复制生成的HTML即可。dist不进入Git源码；发布附件提供已构建课件。

### 如何验证生成结果

静态脚本只查包装和语法；实际运行需把HTML独立复制到空目录，浏览器以file://打开，禁用网络后点热点、做练习、写笔记、切场景、拖动缩放、切教师模式和重置。

开发端可安装 `puppeteer-core`，设置 `LESSON_BROWSER` 为本机Chrome或Edge可执行文件，然后运行 `node tests/browser-check.cjs`。可通过 `PUPPETEER_MODULE` 指向已经安装的模块，不要求重复安装。

```sh
python scripts/build.py tests/panorama/lesson.json --out dist/panorama/index.html
node tests/browser-check.cjs
```

详见 [验证清单](references/verification.md) 和 [实际测试记录](tests/RESULTS.md)。浏览器没跑过就写未验证。

## 限制

- 环视素材须另行制作/取得，不能把16:9图片拉伸后叫全景；新生成2:1样片也可能有接缝、极区失真。
- 没有图像生成能力时提供素材规格和缺口，不以平面图偷偷替代用户要求的环视。
- 课文只收录必要短句，教师需按教材核对；开放问题不承诺唯一解答。
- 学生笔记仅保存在当前页面内存，可复制；刷新/关闭后不保留，不上传。
- 英语点读可在制作阶段优先用edge-tts生成MP3再内嵌；第三方服务稳定性和输出使用条件另行核查。本示例未生成单词音频。
- 本次未实测Safari、Firefox、真实教室投影设备、豆包安装或自动Skill路由。

## 许可与隐私

新写代码、Skill文档、模板、原创SVG采用 [MIT](LICENSE)。课文短句、生成插画、第三方音频服务分别见 [素材说明](examples/ASSET-NOTICE.md) 和 [排除清单](references/rights.md)。原课件图片、真人素材、浏览器配置、密钥、私人文件及原16MB课件没有复制到公开仓库。
