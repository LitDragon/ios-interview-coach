# Swift + UIKit 练习项目任务书

## 项目目标

用 7–10 天完成一个可运行、可解释、可以空白重写核心模块的 `InterviewCards` App。项目只用于恢复手写能力和支撑 Swift 面试，不追求产品完整度。

## 技术范围

- Swift
- UIKit，纯代码或 Storyboard 二选一
- `UITableViewController` 或普通 `UIViewController + UITableView`
- `URLSession + Codable`
- `async/await`
- `@MainActor`
- Loading、空数据、错误、重试
- 简单文件缓存或 `UserDefaults` 收藏
- XCTest 2–3 个用例

明确不做：SwiftUI、Combine、登录、后端、复杂动画、第三方架构框架。

## 页面

1. **列表页**：请求并展示卡片标题，支持下拉刷新。
2. **详情页**：展示完整内容，可收藏。
3. **收藏页**：读取本地收藏，支持取消收藏。
4. **错误状态**：断网或解析失败时展示错误和重试按钮。

练习数据可先使用公开 JSON API；面试前替换为本地固定 JSON，保证演示不依赖网络。

## 最小结构

```text
InterviewCards/
├── App/
├── Models/
│   └── InterviewCard.swift
├── Networking/
│   ├── APIClient.swift
│   └── APIError.swift
├── Storage/
│   └── FavoritesStore.swift
├── Features/
│   ├── CardList/
│   ├── CardDetail/
│   └── Favorites/
└── Tests/
```

不要为了面试强行套 VIPER。一个清晰的 MVC 或轻量 MVVM 足够，重点是状态和依赖边界。

## 7 天节奏

### Day 1：Swift 基础和模型

- 手写 struct、Optional、enum Error、Codable。
- 完成 `InterviewCard` 和一段 JSON 解码。
- 能解释 struct/class、Optional、`throws`。

### Day 2：网络层

- 手写 `APIClient`。
- 检查 HTTP 状态码、数据和解码错误。
- 能解释 `async throws`、`URLSession.data(from:)`。

### Day 3：UIKit 列表

- 完成 Cell 注册、复用和列表展示。
- Loading 与错误 UI 只在主线程更新。
- 能解释生命周期和列表复用。

### Day 4：任务取消与晚到结果

- 页面持有 `Task` 句柄。
- 新请求覆盖旧请求前先取消。
- 提交 UI 前检查取消或请求代次。
- 能解释 `Task`、`@MainActor` 和协作式取消。

### Day 5：详情与收藏

- 通过稳定 ID 传递 Card。
- 收藏存本地，不依赖旧 indexPath。
- 能解释值语义、依赖注入和存储选择。

### Day 6：测试

- 解码成功测试。
- HTTP 非 2xx/解码失败测试。
- 收藏增删测试。
- 使用 protocol 注入 mock client/store，不接真实网络。

### Day 7：空白重写和口述

- 不看旧代码重写 Model、APIClient 核心方法和列表加载流程。
- 录制 5 分钟项目介绍。
- 回答：为什么这样分层、失败怎样处理、页面退出会怎样、如果扩展搜索怎么做。

## AI 使用边界

1. 每个模块第一版先独立写 25–45 分钟。
2. 卡住时只允许让 AI 解释错误或给提示，不直接生成整个文件。
3. AI 审查后必须自己重新输入关键修改。
4. 不能逐行解释或空白重写的代码，不算掌握，也不能在面试中作为经验使用。

## 完成标准

- App 可以离线展示固定数据。
- 网络失败和取消不会更新错误页面或旧页面。
- 核心文件没有无法解释的代码。
- 10 分钟内可重写模型解码和网络请求。
- 能用粤语完成 30 秒与 90 秒项目说明。
