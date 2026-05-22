# iOS 深水主题卡：列表卡顿怎么优化

## 主题

列表卡顿怎么优化

## 面试官常问法

> 你们 App 列表滑动卡顿，你会怎么排查和优化？

## 核心回答

我不会先猜原因，而是先确认卡顿发生在哪一帧、哪一段。列表卡顿本质是主线程某一帧的工作量超过了 16.67ms（60fps）或 8.33ms（120fps ProMotion），导致丢帧。

我会先用 Instruments 的 Core Animation、Time Profiler、System Trace 定位是 CPU 问题还是 GPU 问题，再决定是优化布局计算、减少离屏渲染、异步解码图片、优化 Cell 复用，还是减少主线程 I/O。

## 排查顺序

### 1. 先确认卡顿类型

- 是滑动时持续卡顿，还是滑到某个位置突然卡一下。
- 是所有设备都卡，还是只在低端机卡。
- 是首次加载卡，还是反复滑动都卡。

### 2. 先分层

- **CPU 层**：布局计算、文本排版、图片解码、数据处理、JSON 解析。
- **GPU 层**：离屏渲染、图层混合、阴影、圆角、透明度。
- **主线程 I/O**：读文件、读数据库、缓存写入。
- **主线程同步等待**：锁竞争、信号量、同步网络。

### 3. 再找阻塞点

- `cellForRowAt` 做了重计算或同步 I/O。
- `heightForRowAt` 每次都重新计算高度，没有缓存。
- Cell 布局层级过深，Auto Layout 约束复杂。
- 图片在主线程解码（UIImage 直接赋值）。
- 大量离屏渲染：`cornerRadius + masksToBounds`、`shadow`、`shouldRasterize`。
- 文本排版慢：富文本、多行文本、自定义排版引擎。
- 数据源刷新方式不对：`reloadData` 整表刷新而不是局部更新。

### 4. 最后选优化策略

**CPU 优化：**
- 预计算并缓存 Cell 高度，避免每次重新计算。
- 异步预加载数据和图片，主线程只做展示。
- 简化 Cell 层级，减少 Auto Layout 嵌套。
- 将文本排版、图片解码移到后台线程。
- 使用 `diffable data source` 替代手动 `reloadData`。

**GPU 优化：**
- 圆角用 `cornerRadius` 仅对 `layer` 生效，或用 `CAShapeLayer` 裁剪。
- 阴影用 `shadowPath` 避免实时计算。
- 避免不必要的 `shouldRasterize`，缓存光栅化结果。
- 减少透明视图叠加，避免图层混合。

**复用优化：**
- 正确使用 Cell 复用池，避免重复创建。
- 预注册 Cell，使用 `dequeueReusableCell`。
- 屏幕外 Cell 预加载。

## 3 分钟面试回答版本

我处理列表卡顿会先避免凭直觉改代码。第一步是用 Instruments 确认卡顿发生在 CPU 还是 GPU。

CPU 方向，最常见的问题是 `cellForRowAt` 和 `heightForRowAt` 做了重计算。比如图片在主线程解码、富文本排版、高度没有缓存、Cell 布局层级太深。这些问题我会通过异步解码、预计算高度、简化 Cell 结构来解决。

GPU 方向，主要看离屏渲染。圆角加 masksToBounds、阴影没有 shadowPath、shouldRasterize 用错地方，这些都会导致 GPU 耗时增加。

另外数据源刷新方式也很关键。全局 reloadData 在大数据量下一定卡，我会用 diffable data source 做局部更新，或者用 performBatchUpdates 精确插入删除。

最后我会在真机上反复验证，尤其是低端机和 ProMotion 设备，因为表现差异很大。

## 项目案例模板

我之前遇到过一个列表卡顿，现象是滑动时每隔几帧就掉一次帧。用 Time Profiler 抓到主要耗时在 `heightForRowAt`，每次调用都重新用 Auto Layout 计算高度。

我的做法是把高度预计算好存到 Model 里，Cell 布局改用 Frame 手动计算，减少 Auto Layout 的约束求解开销。同时图片加载改成异步解码，主线程只展示已解码的图片。

改完后在 Instruments 里看到主线程每帧耗时从 20ms+ 降到 8ms 左右，滑动基本稳定 60fps。

## 面试追问准备

### 1. Cell 高度缓存会不会有内存问题？

会，如果数据量很大，可以做 LRU 缓存或只缓存屏幕可见范围附近的高度。也可以用估算高度 `estimatedRowHeight` 先占位，实际高度按需计算。

### 2. 异步解码图片怎么做？

用 `UIGraphicsImageRenderer` 或 `CGImage` 在后台线程解码，解码后的图片放到内存缓存，主线程直接使用。SDWebImage 和 Kingfisher 都内置了这个能力。

### 3. 什么时候用 UITableView，什么时候用 UICollectionView？

简单列表用 UITableView；瀑布流、网格、自定义布局用 UICollectionView。UICollectionViewCompositionalLayout 出来后，很多场景都可以用 UICollectionView 统一处理。

### 4. SwiftUI 的 List 性能怎么样？

SwiftUI 的 List 底层是 UITableView，LazyVStack/LazyHStack 才是真正的懒加载。大数据量推荐用 LazyVStack，性能更好且更灵活。

## 简历 bullet

优化列表滑动性能，通过预计算 Cell 高度、异步图片解码、简化视图层级、消除离屏渲染、采用局部刷新策略，解决主线程丢帧问题，实现 60fps 稳定滑动。

## 核心记忆句

先分清 CPU 还是 GPU 瓶颈，再把非展示必需的计算移出主线程。

## 风险点

- 不要一上来就说"减少 Cell 层级"，面试官会追问你怎么确认是层级问题。
- 不要只说"用 SDWebImage"，要能解释异步解码的原理。
- 不要忽略 `heightForRowAt` 的性能影响，这往往是最大的隐藏瓶颈。
- 不要承诺"优化到 60fps"，除非你真测过，不同设备表现差异很大。
- 如果没有列表优化经历，就用"排查思路 + Instruments 使用经验"表达，别编具体数据。
