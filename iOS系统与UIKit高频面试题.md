# iOS 系统与 UIKit 高频面试题

> 这份题库补齐原 OC/Swift 文档缺少的 UIKit、系统生命周期、网络、存储和架构题。P0 优先于 SwiftUI、Combine、Swift 6 细节。

---

# P0：必须能讲清

## 01：UIViewController 生命周期怎么理解？

**30 秒答案：**

`loadView/viewDidLoad` 负责视图创建和一次性初始化；`viewWillAppear/viewDidAppear` 处理每次展示；`viewWillDisappear/viewDidDisappear` 处理离页边界。异步任务、通知、Timer 和播放器不能只看 `dealloc`，要根据页面是否仍可见决定启动、暂停、取消和拒绝晚到回调。

**追问重点：** `viewDidLoad` 可能只调用一次，页面返回后 `viewWillAppear` 会重复调用；不要在重复生命周期里无条件注册观察者或重建播放器。

## 02：App/Scene 前后台切换时要处理什么？

区分 inactive、background、foreground 和 active。进入后台应暂停不允许继续的媒体和 Timer、保存必要状态、结束后台任务；回前台不能盲目恢复，必须确认当前页面、会话 owner 和之前是否由后台事件暂停。

## 03：事件传递和响应链是什么？

触摸先经过 hit-testing 找到最合适的 View，再沿 responder chain 传递。`UIView → UIViewController → UIWindow → UIApplication` 是常见链路。手势冲突要看 recognizer delegate、失败依赖和是否允许同时识别，不能只通过扩大点击区域硬修。

## 04：UIView 和 CALayer 的关系是什么？

UIView 管事件、布局和 UIKit 语义，CALayer 管几何、内容与合成。多数属性修改最终作用于 layer。性能问题要区分 CPU 布局/绘制、图片解码、GPU 合成和离屏渲染，不要把所有卡顿都归因于“图层太多”。

## 05：一次布局和绘制流程怎么走？

约束变化后系统在合适时机执行 `updateConstraints` 和 `layoutSubviews`；需要立即得到布局结果时才调用 `layoutIfNeeded`。`drawRect:` 用于自定义绘制，不应承担普通子视图布局。频繁同步 layout、复杂约束和滚动中创建视图都会增加主线程成本。

## 06：Auto Layout 冲突怎么排查？

先读控制台冲突日志和符号断点 `UIViewAlertForUnsatisfiableConstraints`，找到参与冲突的约束、priority 和视图层级。修复应明确哪个约束可以让步，不要把所有 priority 随意调低。列表中还要避免每帧反复创建约束。

## 07：UITableView/UICollectionView 如何保证滚动性能？

核心是复用和减少滚动期间主线程工作：稳定 reuse identifier、避免 Cell 中重复注册/布局、图片异步下载与解码、请求与 indexPath 解耦、控制图层和离屏效果。异步返回后应按稳定 ID 找当前模型，不能继续使用旧 indexPath。

## 08：为什么 UI 必须在主线程更新？

UIKit 的对象和渲染事务以主线程语义为主，后台修改会产生竞态、告警或不稳定行为。正确做法是在最早明确的回调边界切回主线程或 MainActor，同时确保页面仍可见、请求仍属于当前 owner。

## 09：URLSession 请求成功需要检查什么？

同时检查 transport error、HTTP 状态码、MIME/响应类型、数据完整性、解码错误和取消状态。GET 通常可安全重试，写操作要考虑幂等键或服务端语义；重试需要退避和上限，不能无限循环。

## 10：HTTP 缓存和业务缓存有什么区别？

HTTP 缓存遵循 `Cache-Control`、ETag、Last-Modified 等协议；业务缓存由 App 决定 key、有效期和 owner。多设备 App 的业务缓存必须带设备身份，不能只因为“缓存不为空”就认为属于当前页面或当前设备。

## 11：Delegate、Block、Notification、KVO 怎么选？

- Delegate：一对一、有明确协议和 owner。
- Block：局部异步结果，注意捕获和取消。
- Notification：一对多广播，但类型和来源较弱。
- KVO：观察属性变化，适合既有动态体系；新业务避免滥用字符串依赖。

选择标准是通信方向、订阅数量、生命周期和类型安全，不是个人偏好。

## 12：UserDefaults、Keychain、文件、SQLite/Core Data 怎么选？

UserDefaults 只存小型偏好；Keychain 存凭证和敏感小数据；文件适合图片、媒体和可独立管理的 blob；SQLite/Core Data 适合结构化、查询和关系数据。无论哪种都要考虑加密、迁移、并发访问和容量上限。

## 13：MVC、MVVM、VIPER 怎么取舍？

小页面优先简单结构；状态与展示逻辑变复杂时用 MVVM 分离；大型多人项目、路由和测试边界严格时 VIPER 更清晰但成本更高。高级答案要说明依赖方向、测试边界和团队维护成本，不能只比较文件数量。

## 14：Crash、OOM 和 Hang 的证据有什么不同？

Crash 先看符号化堆栈和异常类型；OOM 往往没有普通崩溃堆栈，要结合内存峰值、缓存、大图和页面路径；Hang/卡顿看主线程堆栈、RunLoop、Time Profiler 和线上采样。三者不能使用同一套结论。

## 15：静态库、动态库和 XCFramework 有什么区别？

静态库在链接期进入最终 Mach-O，通常不 Embed；动态 Framework 作为独立二进制随 App 打包和签名。XCFramework 只是多平台/多架构容器，每个 slice 仍要判断是静态 library、静态 framework 还是动态 framework。

---

# P1：根据岗位补充

## 16：启动优化如何分阶段？

区分 pre-main 与 post-main，使用 App Launch、Organizer、MetricKit 或 signpost 测量。减少 `+load` 和非必要初始化，首屏只同步执行必要工作，其余按依赖延后；不能用“全部异步”代替测量和依赖管理。

## 17：iOS 安全需要关注什么？

凭证使用 Keychain；敏感文件考虑 Data Protection；网络使用 TLS 并正确处理证书策略；日志、剪贴板、截图和埋点避免泄露隐私。证书 Pinning 会增加证书轮换和灾备成本，必须结合威胁模型决定。

## 18：如何设计可取消的页面请求？

请求开始时记录 attempt/generation、业务 owner 和预期值；取消、离页、成功、失败和超时统一清理。回调返回时同时检查 attempt、owner、页面状态和业务值，再更新模型或 UI。只保存一个 `isLoading` 不足以隔离旧请求。

---

# 练习方式

1. P0 每题先录一遍 30 秒粤语答案。
2. 每题绑定一个真实项目例子，没有例子时只讲机制，不编造经历。
3. 每天随机抽 5 题，答完后继续追问“为什么”“失败时怎样”“如何验证”。
