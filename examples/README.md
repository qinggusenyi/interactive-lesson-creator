# 案例：《小石潭记》

本案例独立验证新模板，不是新课文的固定结构。学习目标是从鱼、水、石和竹树中寻找证据，解释感受如何由乐转为凄清。场景里设置“水中的鱼”“潭底与石岸”“环合的竹树”三个观察点；每个点都有对应的局部图、原文、问题和解读。实际教学时请按所用教材核对文字。

```sh
python scripts/build.py examples/xiaoshitan/lesson.json --out dist/xiaoshitan/index.html
python scripts/verify.py dist/xiaoshitan/index.html
```

交付只需 `index.html`。下一篇文章应重新分析空间细节、选热点并制作素材，不能直接替换标题和摘句。
