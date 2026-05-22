# iOS Interview Coach

本地可打开的 iOS 面试复习 MVP。

## 功能

- 题目列表
- 搜索题目
- 分类筛选
- 错题模式
- 随机刷题
- 题目详情和答案展示/隐藏
- 浏览器朗读答案
- 选择朗读声音
- 收藏题目
- 标记已掌握
- `localStorage` 保存收藏和掌握状态

## 使用

直接打开 `index.html`。

如果浏览器禁止 `file://` 读取 `questions.json`，页面会使用 `app.js` 内置题库兜底。需要验证 JSON 加载时，可以在本目录运行：

```bash
python3 -m http.server 8000
```

然后打开：

```text
http://localhost:8000
```
