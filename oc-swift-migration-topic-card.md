# iOS 深水主题卡：Objective-C 老项目怎么渐进重构

## 主题

Objective-C 老项目怎么渐进重构

## 面试官常问法

> 你们有 OC 老项目，怎么迁移到 Swift？怎么渐进重构？遇到过什么坑？

## 核心回答

我不会推翻重写，而是渐进式迁移。OC 和 Swift 可以长期混编，核心是**先建立桥接层，再按模块逐步替换，最后收敛到纯 Swift**。

迁移不是一次性任务，而是持续工程。每一步都要保证可编译、可测试、可回滚。新功能用 Swift 写，老模块按优先级逐步迁移，同时解决混编带来的头文件暴露、类型映射、空安全、命名风格等问题。

## 重构顺序

### 1. 先评估现状

- 代码规模：总行数、文件数、OC 占比。
- 模块边界：哪些模块是独立的，哪些强耦合。
- 测试覆盖：有没有单元测试，能不能安全改代码。
- 依赖关系：三方库是否支持 Swift，是否有 OC 专有依赖。
- 团队能力：团队 Swift 熟练度，是否需要培训。

### 2. 建立桥接层

**桥接头文件（Bridging Header）：**
- OC → Swift：在 Bridging Header 中 `#import` OC 头文件。
- Swift → OC：编译器自动生成 `ModuleName-Swift.h`，OC 文件中引入即可。

**命名规范统一：**
- OC 的 `NS_ENUM` → Swift 的 `enum`。
- OC 的 `NS_OPTIONS` → Swift 的 `OptionSet`。
- OC 的 `NSError` 指针参数 → Swift 的 `throws`。
- OC 的 nullable/nonnull → Swift 的 Optional。

**类型映射：**
```objc
// OC 端
typedef NS_ENUM(NSInteger, DownloadState) {
    DownloadStateIdle,
    DownloadStateDownloading,
    DownloadStatePaused,
    DownloadStateCompleted,
};
```
```swift
// Swift 端直接使用
switch state {
case .idle: break
case .downloading: break
case .paused: break
case .completed: break
}
```

### 3. 模块迁移策略

**优先级排序：**
1. 新功能模块：直接用 Swift 写，不增加 OC 债务。
2. 独立模块：边界清晰、依赖少的模块先迁。
3. 工具类/模型层：没有 UI 逻辑，迁移风险低。
4. 业务模块：按页面或功能逐步迁移。
5. 核心模块：最后迁移，风险最高。

**迁移步骤（每个模块）：**
1. 先写 Swift 接口，保持 OC 实现。
2. 新的调用方用 Swift，老的调用方继续用 OC。
3. 逐步把 OC 实现替换成 Swift。
4. 最后删除 OC 文件。

### 4. 解决混编问题

**头文件暴露问题：**
- Bridging Header 不能暴露太多 OC 头文件，否则编译慢。
- 用 `@objc` 显式标记需要暴露给 OC 的 Swift 接口。
- 用 `internal` 或 `private` 限制 Swift 接口的可见范围。

**空安全问题：**
- OC 的 `nullable`/`nonnull` 注解不完整时，Swift 端全是 ImplicitlyUnwrappedOptional。
- 逐步给 OC 头文件加 `NS_ASSUME_NONNULL_BEGIN`/`END`。
- 未标注的属性在 Swift 端用 `!` 访问，有崩溃风险。

**命名风格统一：**
- OC 的 `initWithName:` → Swift 的 `init(name:)`。
- OC 的 `doSomethingWithCompletion:` → Swift 的 `doSomething() async throws`。
- 用 `@objc(name)` 显式映射，避免自动生成的命名不优雅。

### 5. 持续保障

- 每次迁移后跑完整回归测试。
- 用 SwiftLint 统一代码风格。
- 建立迁移进度表，按模块跟踪。
- 代码审查时关注混编边界是否干净。

## 3 分钟面试回答版本

我们当时有一个 OC 老项目，大概 20 万行代码，要逐步迁移到 Swift。我的思路是渐进式迁移，不推翻重写。

第一步是建立桥接层，OC 和 Swift 通过 Bridging Header 和自动生成的 Swift.h 互调。同时给 OC 头文件补 nullable 注解，解决空安全问题。

第二步是按优先级迁移模块。新功能直接用 Swift 写；独立的工具类和模型层先迁，风险低；业务模块按页面逐步替换；核心模块最后动。

迁移过程中遇到几个坑：一是 Bridging Header 暴露太多头文件导致编译慢，我改成按模块拆分；二是 OC 的 NSError 指针参数在 Swift 端不好用，改成 throws；三是 OC 的宏在 Swift 端不可见，改成全局常量或方法。

最后我建立了迁移进度表，每次迁移后跑回归测试，确保不引入新问题。大概半年时间，核心模块迁完了 60%。

## 项目案例模板

我之前负责一个 OC 老项目的 Swift 迁移，项目大概 15 万行 OC 代码，没有单元测试。

我先从模型层开始迁移，因为模型层没有 UI 逻辑，依赖少，风险低。把 OC 的 `@property` 改成 Swift 的 struct，用 `Codable` 替代手动 JSON 解析。

然后迁移网络层，把 OC 的 `NSURLSession` 封装改成 Swift 的 `async/await`，同时加了单元测试。网络层迁移后，新功能的网络调用全部用 Swift，老功能通过桥接层继续用 OC。

遇到的最大坑是 OC 的单例在 Swift 端的初始化顺序问题，改成 Swift 的 `static let` 后解决了。迁移过程中每一步都有可编译的中间状态，随时可以暂停或回滚。

## 面试追问准备

### 1. 为什么不直接重写？

重写风险太高：功能对齐难、测试覆盖难、上线风险大、团队压力大。渐进迁移每一步都可回滚，风险可控。

### 2. 混编对编译速度有影响吗？

有。Bridging Header 越大编译越慢，Swift.h 每次都要重新生成。解决方法是按模块拆分桥接头文件，减少不必要的暴露。

### 3. OC 的 category 在 Swift 端怎么用？

OC 的 category 方法在 Swift 端自动变成 extension 方法。如果 category 在单独的 framework 里，需要在 Swift 端 `import` 对应模块。

### 4. OC 的宏在 Swift 端怎么办？

简单的常量宏改成 Swift 的 `let` 常量。带参数的宏改成函数。条件编译宏用 `#if` 或 Swift 的编译配置替代。

### 5. 怎么处理 OC 的 runtime 特性？

`method swizzling` 在 Swift 端也能用，但要加 `@objc dynamic`。关联对象用 `objc_setAssociatedObject`。如果依赖 runtime 太重，迁移时要考虑替代方案。

## 简历 bullet

负责 OC 老项目渐进式 Swift 迁移，建立桥接层和模块迁移策略，解决头文件暴露、空安全、命名风格等混编问题，按优先级逐步替换核心模块，迁移期间保证可编译、可测试、可回滚。

## 核心记忆句

不推翻重写，先建桥接层，按模块逐步替换，每一步都可回滚。

## 风险点

- 不要一上来就说"全部用 Swift 重写"，面试官会追问风险和成本。
- 不要忽略编译速度问题，Bridging Header 太大会严重影响开发体验。
- 不要忽略空安全问题，OC 的 nullable 注解不完整会导致 Swift 端崩溃。
- 不要承诺"多久迁移完"，除非你真实评估过代码规模和团队能力。
- 如果没有大规模迁移经验，就用"模块迁移思路 + 小规模实践"表达，别编数据。
