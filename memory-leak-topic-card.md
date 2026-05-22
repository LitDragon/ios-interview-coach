# iOS 深水主题卡：内存上涨/泄漏怎么定位

## 主题

内存上涨/泄漏怎么定位

## 面试官常问法

> 线上用户反馈 App 越用越卡，怀疑内存泄漏，你怎么排查？

## 核心回答

我不会直接猜哪里泄漏，而是先区分是**内存泄漏**还是**内存上涨**。泄漏是对象该释放没释放，通常是循环引用或未移除监听；上涨是对象存活但不该这么多，通常是缓存没清理或重复创建。

我会先用 Instruments 的 Leaks 和 Allocations 看有没有未释放的对象，再用 Memory Graph Debugger 看引用关系图，找到循环引用或意外的强引用链。

## 排查顺序

### 1. 先区分类型

- **内存泄漏**：对象生命周期结束但仍被引用，不会释放。
- **内存上涨**：对象本身合理，但数量过多或体积过大。
- **内存峰值**：某个瞬间内存暴涨，通常是图片、视频、大文件。

### 2. 再找工具

- **Xcode Memory Graph Debugger**：实时查看所有存活对象和引用关系。
- **Instruments - Leaks**：检测泄漏对象，自动标记。
- **Instruments - Allocations**：追踪内存分配，查看增长趋势。
- **Instruments - VM Tracker**：查看虚拟内存分布，区分堆、栈、映射。
- **Memory Warning**：模拟系统内存压力，观察 App 响应。

### 3. 找引用链

- 打开 Memory Graph，找到可疑对象。
- 查看它的 incoming references，谁持有了它。
- 追踪引用链，找到根因。
- 常见引用链：`self → closure → self`、`self → timer → self`、`self → delegate → self`。

### 4. 分类处理

**循环引用：**
- 闭包捕获 `self` 没用 `[weak self]`。
- `Timer` 强引用 `target`。
- `delegate` 用 `strong` 而不是 `weak`。
- `NotificationCenter` 没有移除观察者（iOS 9 之后系统自动移除，但自定义中心不会）。

**缓存未清理：**
- `NSCache` 没设 `countLimit` 或 `totalCostLimit`。
- 图片缓存没有内存上限。
- 数据源累积，只增不删。

**重复创建：**
- 每次进入页面都创建新对象，没有复用。
- 每次请求都创建新 Session，没有复用。
- Cell 中每次 `layoutSubviews` 都创建子视图。

**系统资源未释放：**
- `CGImage`、`CGBitmapContext` 没有释放。
- `AudioQueue`、`AudioUnit` 没有销毁。
- `CADisplayLink` 没有 invalidate。

## 3 分钟面试回答版本

我排查内存问题会先区分是泄漏还是上涨。泄漏是对象该释放没释放，上涨是对象本身合理但数量太多。

泄漏最常见的原因是循环引用，比如闭包捕获 self、Timer 强引用 target、delegate 用 strong。我会用 Xcode 的 Memory Graph 看引用关系图，找到谁持有了不该持有的对象，然后顺着引用链找到根因。

内存上涨通常看缓存和数据源。比如图片缓存没有上限、数据源只增不删、每次进入页面都重复创建对象。这类问题用 Allocations 看增长曲线，配合代码审查缓存策略。

实际处理上，闭包加 `[weak self]`，Timer 用闭包形式或 `invalidate`，delegate 用 `weak`，缓存加 `countLimit`，数据源做分页和清理。最后我会在真机上反复进出页面，用 Memory Graph 确认对象数量稳定。

## 项目案例模板

我之前遇到过一个内存上涨，现象是用户反复进出某个页面后内存持续增长，不会回落。用 Memory Graph 看到每次进出页面都会多出一组 ViewController 和 ViewModel，没有被释放。

排查后发现是 ViewModel 里的一个网络回调闭包捕获了 `self`，而 ViewController 持有 ViewModel，形成循环引用。修复方式是闭包改成 `[weak self]`，同时在 `deinit` 加日志验证对象确实释放了。

改完后用 Instruments 跑了 50 次进出页面，内存曲线稳定在一定范围，没有持续增长。

## 面试追问准备

### 1. weak 和 unowned 什么时候用哪个？

`weak` 用于对象可能先于闭包释放的场景，自动置 nil；`unowned` 用于闭包和对象同时销毁的场景，访问已释放对象会崩溃。大多数情况用 `weak` 更安全。

### 2. NSCache 和 NSDictionar y 做缓存有什么区别？

`NSCache` 是线程安全的，支持自动清理（收到内存警告时），可以设 `countLimit` 和 `totalCostLimit`；`NSDictionary` 不是线程安全的，不会自动清理。做内存缓存优先用 `NSCache`。

### 3. 怎么检测图片内存占用？

`UIImage` 的内存占用 = 宽 × 高 × 4 字节（RGBA）。一张 1000×1000 的图片占用约 4MB。可以用 `CGImage` 的属性计算实际像素尺寸，而不是 `UIImageView` 的尺寸。

### 4. iOS 的内存警告机制是怎样的？

系统通过 `didReceiveMemoryWarning` 通知 App，App 应该释放可重建的缓存。如果 App 内存持续超限，系统会直接杀掉进程（OOM），没有 Crash 堆栈，只能通过 `jetsamEvent` 日志判断。

### 5. 子线程创建的对象在子线程释放，会影响主线程吗？

ARC 的引用计数操作是原子的，子线程释放对象不会直接阻塞主线程。但如果多个线程同时操作同一对象的引用计数，会有性能开销，所以尽量减少跨线程共享。

## 简历 bullet

定位并修复多类内存问题，包括闭包循环引用、Timer 强引用、缓存未清理、对象重复创建，通过 Memory Graph 和 Instruments 建立排查流程，将核心页面内存占用降低 30%，消除用户反馈的越用越卡问题。

## 核心记忆句

先区分泄漏还是上涨，再顺着引用链找根因，不要凭感觉猜。

## 风险点

- 不要一上来就说"加 `[weak self]`"，面试官会追问你怎么确认是闭包循环引用。
- 不要忽略 `deinit` 验证，加了 `weak` 之后一定要确认对象确实释放了。
- 不要只看 Instruments 截图，要能解释引用链怎么追踪。
- 不要承诺"内存降到多少 MB"，除非你真实测过。
- 如果没有线上内存优化经历，就用"本地 Instruments 排查 + 代码审查"表达思路，别编数据。
