# iOS Interview Coach

本地可打开的 iOS 面试复习 MVP。

## 功能

- 题目列表
- 搜索题目
- 分类筛选
- 错题模式
- 随机刷题
- 题目详情和答案展示/隐藏
- 预生成音频优先播放
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

## Voicebox 音频

手机通过 GitHub Pages 打开时，页面不能直接访问你电脑上的 Voicebox 服务。要获得 Voicebox 的声音效果，需要先在本地用 Voicebox 把答案生成成音频文件，再随页面一起发布。

当前题库已经为每道题配置了 `audio` 字段，文件放在 `audio/` 目录：

```json
{
  "id": "ios-runtime-001",
  "audio": "audio/ios-runtime-001.mp3"
}
```

音频文件存在时，点击播放会优先播放该文件；文件不存在或播放失败时，会自动退回浏览器朗读。
