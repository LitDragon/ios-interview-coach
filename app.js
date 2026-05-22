const STORAGE_KEY = "iosInterviewCoachState";

const fallbackQuestions = [
  {
    "id": "ios-runtime-001",
    "category": "Runtime",
    "level": "medium",
    "question": "Objective-C 的消息发送流程是什么？",
    "audio": "audio/ios-runtime-001.mp3",
    "answer": "Objective-C 调用方法时会编译成 objc_msgSend(receiver, selector, ...)。运行时先根据对象的 isa 找到类，再从方法缓存查找 IMP；缓存未命中时沿类的方法列表和父类链查找。找到后会把 IMP 写入缓存并调用。找不到时进入动态方法解析、消息转发快速流程和完整转发流程，最后仍无法处理才触发 doesNotRecognizeSelector。"
  },
  {
    "id": "ios-runtime-002",
    "category": "Runtime",
    "level": "medium",
    "question": "Category 为什么不能直接添加实例变量？",
    "audio": "audio/ios-runtime-002.mp3",
    "answer": "Category 在运行时会把方法、协议、属性声明等附加到已有类上，但类的实例内存布局在编译期已经确定，不能再安全插入实例变量。Category 的属性默认只生成声明，不会自动生成存储。需要保存额外状态时，通常使用 Associated Objects，把 key 和 value 关联到对象上。"
  },
  {
    "id": "ios-runloop-001",
    "category": "RunLoop",
    "level": "medium",
    "question": "RunLoop 的作用是什么？",
    "audio": "audio/ios-runloop-001.mp3",
    "answer": "RunLoop 是线程的事件循环机制，用来让线程在有事件时处理事件、无事件时休眠。它管理 Source、Timer、Observer，并通过 Mode 隔离不同场景的输入源。主线程 RunLoop 默认启动，所以 App 能持续响应触摸、定时器、端口消息和界面刷新。子线程如果需要常驻，也要手动配置输入源并启动 RunLoop。"
  },
  {
    "id": "ios-runloop-002",
    "category": "RunLoop",
    "level": "easy",
    "question": "为什么滑动列表时 NSTimer 可能不触发？",
    "audio": "audio/ios-runloop-002.mp3",
    "answer": "列表滑动时主线程 RunLoop 会切到 UITrackingRunLoopMode。如果 Timer 只注册在默认模式，当前模式不包含它，就会暂停触发。常见处理方式是把 Timer 加到 common modes，或者根据业务改用 GCD timer，避免被 RunLoop mode 影响。"
  },
  {
    "id": "ios-memory-001",
    "category": "内存",
    "level": "medium",
    "question": "weak 和 assign 的区别是什么？",
    "audio": "audio/ios-memory-001.mp3",
    "answer": "weak 用于对象引用，不持有对象；对象释放后 weak 指针会自动置为 nil，避免野指针。assign 只是普通赋值，不管理生命周期，也不会自动置空，适合基本数据类型。对象引用如果用 assign，目标释放后继续访问可能崩溃。"
  },
  {
    "id": "ios-memory-002",
    "category": "内存",
    "level": "hard",
    "question": "如何排查循环引用？",
    "audio": "audio/ios-memory-002.mp3",
    "answer": "先从现象确认对象没有释放，例如 dealloc 不打印或内存持续增长。再检查常见强引用环：block 捕获 self、delegate 使用 strong、timer 或 display link 持有 target、通知和 KVO 未释放。可以用 Xcode Memory Graph 找引用链，结合 Instruments Leaks/Allocations 验证。修复时不要机械使用 weak，要根据所有权选择 weak、拆分生命周期或显式 invalidate。"
  },
  {
    "id": "ios-concurrency-001",
    "category": "并发",
    "level": "medium",
    "question": "GCD 串行队列和并发队列有什么区别？",
    "audio": "audio/ios-concurrency-001.mp3",
    "answer": "串行队列一次只执行一个任务，保证提交到同一队列的任务按顺序执行。并发队列可以同时执行多个任务，但开始顺序仍和提交顺序相关，完成顺序不保证。同步或异步决定当前线程是否等待任务完成，队列类型决定任务之间能否并行。"
  },
  {
    "id": "ios-concurrency-002",
    "category": "并发",
    "level": "hard",
    "question": "在主队列同步派发为什么会死锁？",
    "audio": "audio/ios-concurrency-002.mp3",
    "answer": "如果当前已经在主线程，又调用 DispatchQueue.main.sync，当前任务会等待同步派发的任务执行完成；但主队列是串行队列，新的任务必须等当前任务结束后才能执行。双方互相等待，就产生死锁。解决方式是避免在主线程 sync 到主队列，必要时判断线程或改用 async。"
  },
  {
    "id": "ios-network-001",
    "category": "网络",
    "level": "medium",
    "question": "HTTPS 握手大致做了什么？",
    "audio": "audio/ios-network-001.mp3",
    "answer": "HTTPS 在 TCP 连接后进行 TLS 握手。客户端和服务端协商协议版本、加密套件，服务端下发证书，客户端校验证书链和域名。随后双方通过密钥交换生成会话密钥，用对称加密保护后续 HTTP 数据。TLS 1.3 简化了握手流程，减少往返次数。"
  },
  {
    "id": "ios-network-002",
    "category": "网络",
    "level": "easy",
    "question": "URLSession 的 dataTask 回调在哪个线程？",
    "audio": "audio/ios-network-002.mp3",
    "answer": "URLSession 的 completion handler 不保证在主线程执行，通常在后台队列回调。涉及 UI 更新时必须切回主线程。创建 URLSession 时也可以通过 delegateQueue 控制 delegate 回调队列，但仍要明确区分网络处理和 UI 更新的线程边界。"
  },
  {
    "id": "ios-runtime-003",
    "category": "Runtime",
    "level": "hard",
    "question": "方法交换 method swizzling 有哪些风险？",
    "answer": "Method swizzling 是在运行时替换 selector 对应的 IMP，常用于埋点、兼容补丁或调试。风险是影响全局行为，容易和系统实现、分类加载顺序、第三方库产生冲突。实践中要放在明确的一次性初始化路径里，保留原实现，避免交换系统未公开行为，并为异常路径准备回退。"
  },
  {
    "id": "ios-runtime-004",
    "category": "Runtime",
    "level": "medium",
    "question": "objc_msgSend 找不到方法时会经历哪些补救流程？",
    "answer": "消息查找失败后，运行时会先尝试动态方法解析，让类通过 resolveInstanceMethod 或 resolveClassMethod 添加实现。仍失败时进入快速转发，允许 forwardingTargetForSelector 返回备用接收者。再失败会进入完整消息转发，需要 methodSignatureForSelector 提供签名，再通过 forwardInvocation 处理，最后才是 doesNotRecognizeSelector。"
  },
  {
    "id": "ios-runloop-003",
    "category": "RunLoop",
    "level": "medium",
    "question": "RunLoop 的 Source、Timer、Observer 分别做什么？",
    "answer": "Source 表示输入事件来源，例如端口、触摸或自定义唤醒事件。Timer 负责定时回调，但只会在它注册的 mode 下触发。Observer 用来观察 RunLoop 状态切换，例如进入循环、准备处理 Timer、准备休眠、退出循环，常用于性能监控和自动释放池管理。"
  },
  {
    "id": "ios-runloop-004",
    "category": "RunLoop",
    "level": "hard",
    "question": "autoreleasepool 和 RunLoop 有什么关系？",
    "answer": "主线程 RunLoop 每轮循环中，系统会在合适时机创建和释放自动释放池，用来回收 autorelease 对象。大量临时对象如果集中产生，会等到池 drain 时才释放。循环处理图片、JSON 或大批对象时，可以手动包一层 autoreleasepool，缩短临时对象生命周期，降低峰值内存。"
  },
  {
    "id": "ios-memory-003",
    "category": "内存",
    "level": "easy",
    "question": "strong、weak、copy、assign 分别适合什么场景？",
    "answer": "strong 持有对象，适合普通对象属性。weak 不持有对象，目标释放后自动置 nil，常用于 delegate 或避免循环引用。copy 会复制对象，常用于 NSString、NSArray、NSDictionary 和 block，避免外部可变对象被改动。assign 不管理生命周期，适合基本类型。"
  },
  {
    "id": "ios-memory-004",
    "category": "内存",
    "level": "medium",
    "question": "为什么 block 捕获 self 可能造成循环引用？",
    "answer": "对象强持有 block，而 block 默认强捕获 self 时，会形成 object -> block -> self 的强引用环。常见场景是属性 block、异步回调、定时器回调和动画 completion。修复时通常用 weak self 打破环，但进入回调后可按需要转成 strong self，保证执行期间对象不被提前释放。"
  },
  {
    "id": "ios-memory-005",
    "category": "内存",
    "level": "medium",
    "question": "autoreleasepool 什么时候需要手动使用？",
    "answer": "普通 UIKit 代码通常不需要手动管理 autoreleasepool，因为主线程事件循环会处理。需要手动使用的典型场景是后台线程入口、for 循环中创建大量临时对象、批量图片处理或文件解析。它不能解决真正的强引用泄漏，只是更早释放自动释放对象，降低内存峰值。"
  },
  {
    "id": "ios-swift-001",
    "category": "Swift",
    "level": "easy",
    "question": "Swift 中 struct 和 class 的核心区别是什么？",
    "answer": "struct 是值类型，赋值和传参语义上会产生独立值；class 是引用类型，多个变量可以指向同一个实例。class 支持继承、deinit 和引用身份比较，struct 更适合不可变数据、模型值和组合式设计。选择时优先看是否需要共享可变状态和对象身份。"
  },
  {
    "id": "ios-swift-002",
    "category": "Swift",
    "level": "easy",
    "question": "Optional 解决了什么问题？",
    "answer": "Optional 用类型系统表达一个值可能不存在，避免把 nil 混在普通值里。使用时通过 if let、guard let、switch、可选链或 nil coalescing 解包。强制解包只适合非常确定不为 nil 的边界，否则会导致运行时崩溃。"
  },
  {
    "id": "ios-swift-003",
    "category": "Swift",
    "level": "medium",
    "question": "@escaping 和非逃逸闭包有什么区别？",
    "answer": "非逃逸闭包只在函数调用期间执行，不能被保存到函数外部。@escaping 表示闭包可能在函数返回后才执行，例如网络回调、异步队列或保存到属性。逃逸闭包更容易产生生命周期问题，捕获 self 时要明确强弱引用关系。"
  },
  {
    "id": "ios-swift-004",
    "category": "Swift",
    "level": "hard",
    "question": "associatedtype 和泛型有什么区别？",
    "answer": "泛型把类型参数放在函数或类型使用方，由调用方决定具体类型。associatedtype 是协议内部的占位类型，由遵守协议的具体类型来确定。协议需要表达“这个协议内部还有相关类型”时用 associatedtype，需要一个算法或容器对外接受任意类型参数时通常用泛型。"
  },
  {
    "id": "ios-swift-005",
    "category": "Swift",
    "level": "medium",
    "question": "什么是 Copy-on-Write？",
    "answer": "Copy-on-Write 是值类型常见的性能优化：多个值可以先共享同一份底层存储，只有某一方发生写入且存储不唯一时才真正复制。Swift 的 Array、Dictionary、Set 等标准集合采用这种思路。它既保持值语义，又避免每次赋值都立刻深拷贝。"
  },
  {
    "id": "ios-uikit-001",
    "category": "UIKit",
    "level": "easy",
    "question": "viewDidLoad、viewWillAppear、viewDidAppear 分别适合做什么？",
    "answer": "viewDidLoad 在视图加载完成后调用，适合一次性创建 UI、绑定数据源和做初始配置。viewWillAppear 每次即将显示都会调用，适合同步导航栏、刷新轻量状态或恢复观察。viewDidAppear 表示已经显示到屏幕，适合启动动画、曝光统计或需要真实可见后的操作。"
  },
  {
    "id": "ios-uikit-002",
    "category": "UIKit",
    "level": "medium",
    "question": "UIView 和 CALayer 的关系是什么？",
    "answer": "UIView 负责事件响应、布局、视图层级和与 UIKit 生命周期协作。CALayer 负责内容显示、几何属性、合成和动画。每个 UIView 通常有一个 backing layer，真正提交给渲染系统的是 layer 树；但触摸事件和控制器协作仍主要由 UIView 体系处理。"
  },
  {
    "id": "ios-uikit-003",
    "category": "UIKit",
    "level": "easy",
    "question": "frame、bounds、center 有什么区别？",
    "answer": "frame 是视图在父视图坐标系中的位置和尺寸。bounds 是视图自身坐标系中的原点和尺寸，改变 bounds.origin 会影响子视图内容的显示区域。center 是视图中心点在父视图坐标系中的位置。Auto Layout 下通常不要直接依赖 frame 做最终布局。"
  },
  {
    "id": "ios-uikit-004",
    "category": "UIKit",
    "level": "medium",
    "question": "setNeedsLayout、layoutIfNeeded、layoutSubviews 有什么区别？",
    "answer": "setNeedsLayout 标记视图需要重新布局，系统会在之后的布局周期处理。layoutIfNeeded 会在当前调用链中立即触发布局，常用于约束变化后配合动画。layoutSubviews 是实际布局子视图的回调，子类可以重写，但要避免在里面反复触发布局导致循环。"
  },
  {
    "id": "ios-uikit-005",
    "category": "UIKit",
    "level": "medium",
    "question": "Auto Layout 中 hugging 和 compression resistance 是什么？",
    "answer": "Content hugging 表示视图不愿意被拉大的优先级，值越高越倾向保持 intrinsic content size。Compression resistance 表示视图不愿意被压小的优先级，值越高越不容易被压缩。两个属性常用于 label、button、image view 等自带内容尺寸的视图，解决谁扩展、谁压缩的问题。"
  },
  {
    "id": "ios-uikit-006",
    "category": "UIKit",
    "level": "medium",
    "question": "UITableViewCell 复用时要注意什么？",
    "answer": "复用的核心是同一个 cell 实例会展示不同 indexPath 的数据，所以 cellForRowAt 必须完整配置所有内容状态。prepareForReuse 适合重置非内容状态，比如选中、透明度、取消旧图片请求或清理临时状态。异步加载图片时要校验当前模型标识，避免旧请求回调写到新 cell 上。"
  },
  {
    "id": "ios-uikit-007",
    "category": "UIKit",
    "level": "medium",
    "question": "Diffable Data Source 解决了什么问题？",
    "answer": "Diffable Data Source 用稳定的 section 和 item identifier 描述列表状态，再通过 snapshot 表达新增、删除、移动和更新。它减少手写 batch updates 时 indexPath 不一致导致的崩溃。关键点是 identifier 要稳定且唯一，数据变化后由业务生成新的 snapshot 并 apply。"
  },
  {
    "id": "ios-concurrency-003",
    "category": "并发",
    "level": "easy",
    "question": "async 和 sync 派发的区别是什么？",
    "answer": "async 把任务提交到队列后立即返回，当前线程不等待任务执行完成。sync 会阻塞当前线程，直到提交的任务执行完成。队列决定任务执行位置和并发关系，sync 或 async 决定调用方是否等待；在当前串行队列上 sync 到同一队列通常会死锁。"
  },
  {
    "id": "ios-concurrency-004",
    "category": "并发",
    "level": "medium",
    "question": "DispatchGroup 和 barrier 分别适合什么场景？",
    "answer": "DispatchGroup 适合等待一组异步任务全部完成，例如多个接口都回来后刷新页面。barrier 适合在自定义并发队列上隔离写操作，让之前提交的读任务先完成，再独占执行写任务，然后继续后续任务。barrier 对全局并发队列不适合作为业务同步手段，通常要配合自建并发队列。"
  },
  {
    "id": "ios-concurrency-005",
    "category": "并发",
    "level": "medium",
    "question": "OperationQueue 和 GCD 怎么选择？",
    "answer": "GCD 更轻量，适合简单异步派发、串行隔离、延迟执行和一次性任务编排。OperationQueue 更面向任务对象，支持依赖、取消、优先级、最大并发数和 KVO 观察。复杂下载队列、可取消任务和多步骤依赖通常更适合 OperationQueue。"
  },
  {
    "id": "ios-concurrency-006",
    "category": "并发",
    "level": "hard",
    "question": "Swift async/await 和 GCD 的思路有什么不同？",
    "answer": "GCD 主要是把闭包提交到队列，靠回调组合异步流程。async/await 把异步流程写成顺序代码，通过 suspension point 暂停和恢复任务，并配合结构化并发管理生命周期。它不等于自动并行；多个异步操作是否并行，取决于是否使用 async let、TaskGroup 或显式创建任务。"
  },
  {
    "id": "ios-concurrency-007",
    "category": "并发",
    "level": "medium",
    "question": "@MainActor 的作用是什么？",
    "answer": "@MainActor 把代码隔离到主 actor，常用于 UI 相关类型、方法或属性，保证访问发生在主线程语义下。它比到处手写 DispatchQueue.main.async 更能表达并发边界。需要注意的是，调用 MainActor 隔离的方法通常要在异步上下文中 await，不能把耗时工作也塞进主 actor。"
  },
  {
    "id": "ios-network-003",
    "category": "网络",
    "level": "medium",
    "question": "URLSession 的 default、ephemeral、background 配置有什么区别？",
    "answer": "default session 使用磁盘缓存、cookie 和凭证等常规持久化行为，适合大多数请求。ephemeral session 类似默认会话，但不把缓存、cookie、凭证写入磁盘，适合临时或隐私敏感请求。background session 支持应用挂起或不运行时继续上传下载，完成后通过系统唤醒应用处理结果。"
  },
  {
    "id": "ios-network-004",
    "category": "网络",
    "level": "medium",
    "question": "App Transport Security 是什么？",
    "answer": "ATS 是 Apple 平台默认的网络安全策略，要求 URL Loading System 中的连接优先使用符合要求的 HTTPS/TLS。它提升隐私和数据完整性，阻止不满足最低安全要求的连接。确实需要例外时应按域名做最小范围配置，并准备 App Store 审核理由，而不是全局放开。"
  },
  {
    "id": "ios-network-005",
    "category": "网络",
    "level": "hard",
    "question": "移动端网络层通常要处理哪些边界？",
    "answer": "除了发请求和解析 JSON，还要处理超时、取消、重试、鉴权刷新、错误码映射、缓存策略、弱网和并发请求合并。UI 层不应该直接依赖底层错误，需要把错误转换成业务可理解的状态。涉及 UI 更新时还要明确回到主线程或主 actor。"
  },
  {
    "id": "ios-architecture-001",
    "category": "架构",
    "level": "medium",
    "question": "MVC 和 MVVM 的核心区别是什么？",
    "answer": "MVC 中 ViewController 往往同时处理视图、交互和部分业务状态，容易变重。MVVM 把展示状态和交互逻辑收敛到 ViewModel，ViewController 更关注绑定和生命周期。MVVM 不是简单多建一层文件，关键是让输入、输出、状态变更和副作用边界更清楚。"
  },
  {
    "id": "ios-architecture-002",
    "category": "架构",
    "level": "medium",
    "question": "delegate、closure、notification、KVO 怎么选择？",
    "answer": "delegate 适合一对一、需要明确协议和生命周期的反向通信。closure 适合轻量回调，但要注意捕获关系。notification 适合一对多广播，不适合强业务链路。KVO 适合观察属性变化，尤其是系统对象属性，但要谨慎管理观察生命周期和线程回调。"
  },
  {
    "id": "ios-storage-001",
    "category": "存储",
    "level": "easy",
    "question": "UserDefaults 和 Keychain 分别适合存什么？",
    "answer": "UserDefaults 适合存轻量、非敏感、偏配置类的数据，例如开关、排序方式、上次选择项。它不是安全存储，不适合保存 token、密码、身份证明等敏感信息。Keychain 用于保存小块敏感数据，例如密码、访问令牌、密钥或证书相关材料。"
  },
  {
    "id": "ios-storage-002",
    "category": "存储",
    "level": "medium",
    "question": "Core Data stack 主要包含哪些对象？",
    "answer": "Core Data stack 通常包含 NSManagedObjectModel、NSManagedObjectContext 和 NSPersistentStoreCoordinator，也常由 NSPersistentContainer 统一创建和持有。Model 描述实体、属性和关系；Context 跟踪对象图变化；Coordinator 连接 context 和底层 persistent store，负责保存和读取协调。"
  },
  {
    "id": "ios-app-001",
    "category": "生命周期",
    "level": "medium",
    "question": "AppDelegate 和 SceneDelegate 的职责有什么区别？",
    "answer": "AppDelegate 管理应用级共享行为，例如启动初始化、推送注册、后台事件和 scene 配置。iOS 13 以后，SceneDelegate 管理某个 UI 场景的生命周期，例如 scene 连接、进入前后台、激活和断开。支持多窗口时，一个 App 可以有多个 scene，每个 scene 有自己的生命周期。"
  },
  {
    "id": "ios-app-002",
    "category": "生命周期",
    "level": "medium",
    "question": "iOS App 进入后台后还能一直运行吗？",
    "answer": "通常不能。大多数 App 进入后台后只有很短时间完成收尾，之后会被挂起。只有音频、定位、蓝牙、VoIP、后台 URLSession、BackgroundTasks 等少数明确模式可以在受限条件下继续执行。后台能力要按真实业务最小开启，否则会影响性能、电量和审核风险。"
  },
  {
    "id": "ios-security-001",
    "category": "安全",
    "level": "hard",
    "question": "证书校验和证书固定有什么区别？",
    "answer": "默认 HTTPS 会做系统信任链、域名和有效期等证书校验。证书固定是在默认校验基础上，再要求服务端证书或公钥匹配 App 内置的预期值，用来降低中间人风险。固定策略要考虑证书轮换、备用 key、过期更新和失败降级，不能简单硬编码后长期不维护。"
  },
  {
    "id": "ios-debug-001",
    "category": "调试",
    "level": "medium",
    "question": "线上偶现卡顿通常怎么排查？",
    "answer": "先区分是主线程阻塞、锁竞争、布局绘制过重、IO、JSON 解析、图片解码还是网络回调堆积。可以用 Instruments Time Profiler、Main Thread Checker、MetricKit 或自建卡顿监控采集证据。修复时优先减少主线程同步工作，把可延迟、可缓存、可异步的任务移出关键交互路径。"
  }
];

const state = {
  questions: [],
  selectedId: null,
  activeCategory: "all",
  searchQuery: "",
  mistakeMode: false,
  preferredVoiceURI: "",
  answerVisible: false,
  favoriteIds: new Set(),
  masteredIds: new Set(),
  speakingId: null,
  audioPlayer: null
};

const elements = {
  searchInput: document.getElementById("searchInput"),
  categoryFilter: document.getElementById("categoryFilter"),
  voiceSelect: document.getElementById("voiceSelect"),
  mistakeModeButton: document.getElementById("mistakeModeButton"),
  randomButton: document.getElementById("randomButton"),
  questionCount: document.getElementById("questionCount"),
  questionList: document.getElementById("questionList"),
  metaLine: document.getElementById("metaLine"),
  questionTitle: document.getElementById("questionTitle"),
  favoriteButton: document.getElementById("favoriteButton"),
  masteredButton: document.getElementById("masteredButton"),
  toggleAnswerButton: document.getElementById("toggleAnswerButton"),
  speakButton: document.getElementById("speakButton"),
  answerBox: document.getElementById("answerBox"),
  answerText: document.getElementById("answerText")
};

init();

async function init() {
  loadSavedState();
  state.questions = await loadQuestions();
  state.selectedId = state.questions[0]?.id ?? null;
  bindEvents();
  renderCategories();
  renderVoices();
  render();
}

async function loadQuestions() {
  try {
    const response = await fetch("questions.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const questions = await response.json();
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error("Invalid question data");
    }
    return questions;
  } catch (error) {
    console.info("Using embedded questions because questions.json could not be loaded.", error);
    return fallbackQuestions;
  }
}

function bindEvents() {
  elements.searchInput.addEventListener("input", () => {
    state.searchQuery = elements.searchInput.value.trim().toLowerCase();
    updateSelectionForFilteredQuestions();
    render();
  });

  elements.categoryFilter.addEventListener("change", () => {
    state.activeCategory = elements.categoryFilter.value;
    updateSelectionForFilteredQuestions();
    render();
  });

  elements.voiceSelect.addEventListener("change", () => {
    state.preferredVoiceURI = elements.voiceSelect.value;
    saveState();
    stopSpeaking();
  });

  if ("speechSynthesis" in window) {
    window.speechSynthesis.addEventListener("voiceschanged", renderVoices);
  }

  elements.randomButton.addEventListener("click", () => {
    selectRandomQuestion();
  });

  elements.mistakeModeButton.addEventListener("click", () => {
    state.mistakeMode = !state.mistakeMode;
    updateSelectionForFilteredQuestions();
    render();
  });

  elements.toggleAnswerButton.addEventListener("click", () => {
    state.answerVisible = !state.answerVisible;
    renderDetail();
  });

  elements.speakButton.addEventListener("click", () => {
    const question = getSelectedQuestion();
    if (!question) {
      return;
    }
    speakAnswer(question);
  });

  elements.favoriteButton.addEventListener("click", () => {
    toggleId(state.favoriteIds, state.selectedId);
    saveState();
    render();
  });

  elements.masteredButton.addEventListener("click", () => {
    toggleId(state.masteredIds, state.selectedId);
    saveState();
    updateSelectionForFilteredQuestions();
    render();
  });
}

function loadSavedState() {
  try {
    const rawValue = localStorage.getItem(STORAGE_KEY);
    if (!rawValue) {
      return;
    }
    const savedState = JSON.parse(rawValue);
    state.favoriteIds = new Set(savedState.favoriteIds ?? []);
    state.masteredIds = new Set(savedState.masteredIds ?? []);
    state.preferredVoiceURI = savedState.preferredVoiceURI ?? "";
  } catch (error) {
    console.warn("Ignoring invalid saved interview coach state.", error);
  }
}

function saveState() {
  const value = {
    favoriteIds: Array.from(state.favoriteIds),
    masteredIds: Array.from(state.masteredIds),
    preferredVoiceURI: state.preferredVoiceURI
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

function renderCategories() {
  const categories = Array.from(new Set(state.questions.map((question) => question.category))).sort();
  const options = [
    '<option value="all">全部</option>',
    ...categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`)
  ];
  elements.categoryFilter.innerHTML = options.join("");
}

function renderVoices() {
  if (!("speechSynthesis" in window)) {
    elements.voiceSelect.innerHTML = '<option value="">当前浏览器不支持</option>';
    elements.voiceSelect.disabled = true;
    return;
  }

  const voices = getAnswerVoices();
  if (voices.length === 0) {
    elements.voiceSelect.innerHTML = '<option value="">加载声音中</option>';
    elements.voiceSelect.disabled = true;
    return;
  }

  const bestVoice = getBestVoice(voices);
  const autoLabel = bestVoice ? `自动推荐：${voiceLabel(bestVoice)}` : "自动推荐";
  const options = [
    `<option value="">${escapeHtml(autoLabel)}</option>`,
    ...voices.map((voice) => {
      const selected = voice.voiceURI === state.preferredVoiceURI ? " selected" : "";
      return `<option value="${escapeHtml(voice.voiceURI)}"${selected}>${escapeHtml(voiceLabel(voice))}</option>`;
    })
  ];

  elements.voiceSelect.innerHTML = options.join("");
  elements.voiceSelect.disabled = false;
}

function render() {
  renderList();
  renderDetail();
}

function renderList() {
  const questions = getFilteredQuestions();
  elements.questionCount.textContent = `${questions.length} 道`;
  elements.mistakeModeButton.setAttribute("aria-pressed", String(state.mistakeMode));
  elements.randomButton.disabled = questions.length === 0;

  if (questions.length === 0) {
    elements.questionList.innerHTML = '<p class="empty-state">当前分类没有题目。</p>';
    return;
  }

  elements.questionList.innerHTML = questions.map((question) => {
    const isActive = question.id === state.selectedId;
    const tags = [
      `<span class="tag">${escapeHtml(question.category)}</span>`,
      `<span class="tag">${formatLevel(question.level)}</span>`,
      state.favoriteIds.has(question.id) ? '<span class="tag favorite">收藏</span>' : "",
      state.masteredIds.has(question.id) ? '<span class="tag mastered">已掌握</span>' : ""
    ].filter(Boolean).join("");

    return `
      <button type="button" class="question-item${isActive ? " is-active" : ""}" data-id="${escapeHtml(question.id)}">
        <span class="question-title">${escapeHtml(question.question)}</span>
        <span class="question-meta">${tags}</span>
      </button>
    `;
  }).join("");

  elements.questionList.querySelectorAll(".question-item").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedId = button.dataset.id;
      state.answerVisible = false;
      stopSpeaking();
      render();
    });
  });
}

function renderDetail() {
  const question = getSelectedQuestion();
  const hasQuestion = Boolean(question);

  elements.favoriteButton.disabled = !hasQuestion;
  elements.masteredButton.disabled = !hasQuestion;
  elements.toggleAnswerButton.disabled = !hasQuestion;
  elements.speakButton.disabled = !canPlayAnswer(question);

  if (!question) {
    elements.metaLine.textContent = "";
    elements.questionTitle.textContent = "请选择题目";
    elements.answerText.textContent = "";
    elements.answerBox.classList.add("is-hidden");
    elements.toggleAnswerButton.textContent = "显示答案";
    elements.speakButton.textContent = "朗读答案";
    elements.favoriteButton.setAttribute("aria-pressed", "false");
    elements.masteredButton.setAttribute("aria-pressed", "false");
    return;
  }

  elements.metaLine.innerHTML = `
    <span class="tag">${escapeHtml(question.category)}</span>
    <span class="tag">${formatLevel(question.level)}</span>
  `;
  elements.questionTitle.textContent = question.question;
  elements.answerText.textContent = question.answer;
  elements.answerBox.classList.toggle("is-hidden", !state.answerVisible);
  elements.toggleAnswerButton.textContent = state.answerVisible ? "隐藏答案" : "显示答案";
  elements.speakButton.textContent = state.speakingId === question.id
    ? getSpeakActiveText(question)
    : getSpeakIdleText(question);

  const isFavorite = state.favoriteIds.has(question.id);
  const isMastered = state.masteredIds.has(question.id);
  elements.favoriteButton.textContent = isFavorite ? "★" : "☆";
  elements.favoriteButton.setAttribute("aria-pressed", String(isFavorite));
  elements.masteredButton.setAttribute("aria-pressed", String(isMastered));
}

function getFilteredQuestions() {
  return state.questions.filter((question) => {
    const matchesCategory = state.activeCategory === "all" || question.category === state.activeCategory;
    if (!matchesCategory) {
      return false;
    }
    if (state.mistakeMode && state.masteredIds.has(question.id)) {
      return false;
    }
    if (!state.searchQuery) {
      return true;
    }
    return getQuestionSearchText(question).includes(state.searchQuery);
  });
}

function getSelectedQuestion() {
  return state.questions.find((question) => question.id === state.selectedId) ?? null;
}

function updateSelectionForFilteredQuestions() {
  const filteredQuestions = getFilteredQuestions();
  const hasSelectedQuestion = filteredQuestions.some((question) => question.id === state.selectedId);
  if (hasSelectedQuestion) {
    return;
  }
  state.selectedId = filteredQuestions[0]?.id ?? null;
  state.answerVisible = false;
  stopSpeaking();
}

function selectRandomQuestion() {
  const filteredQuestions = getFilteredQuestions();
  if (filteredQuestions.length === 0) {
    return;
  }

  let candidates = filteredQuestions;
  if (filteredQuestions.length > 1) {
    candidates = filteredQuestions.filter((question) => question.id !== state.selectedId);
  }

  const randomIndex = Math.floor(Math.random() * candidates.length);
  state.selectedId = candidates[randomIndex].id;
  state.answerVisible = false;
  stopSpeaking();
  render();
}

function getAnswerVoices() {
  const voices = window.speechSynthesis.getVoices();
  const chineseVoices = voices.filter((voice) => {
    const lang = voice.lang.toLowerCase();
    const name = voice.name.toLowerCase();
    return lang.startsWith("zh") || name.includes("chinese") || name.includes("mandarin");
  });

  return (chineseVoices.length > 0 ? chineseVoices : voices)
    .slice()
    .sort((left, right) => scoreVoice(right) - scoreVoice(left) || voiceLabel(left).localeCompare(voiceLabel(right)));
}

function getSpeechVoice() {
  const voices = getAnswerVoices();
  if (state.preferredVoiceURI) {
    return voices.find((voice) => voice.voiceURI === state.preferredVoiceURI) ?? getBestVoice(voices);
  }
  return getBestVoice(voices);
}

function getBestVoice(voices) {
  return voices.reduce((bestVoice, voice) => {
    if (!bestVoice || scoreVoice(voice) > scoreVoice(bestVoice)) {
      return voice;
    }
    return bestVoice;
  }, null);
}

function scoreVoice(voice) {
  const lang = voice.lang.toLowerCase();
  const name = voice.name.toLowerCase();
  let score = 0;

  if (lang === "zh-cn" || lang === "cmn-cn") {
    score += 80;
  } else if (lang.startsWith("zh") || lang.startsWith("cmn")) {
    score += 60;
  }

  if (name.includes("natural") || name.includes("neural") || name.includes("online")) {
    score += 35;
  }
  if (name.includes("premium") || name.includes("enhanced")) {
    score += 20;
  }
  if (["xiaoxiao", "yunxi", "yunyang", "xiaoyi", "xiaobei"].some((hint) => name.includes(hint))) {
    score += 25;
  }
  if (["tingting", "mei-jia", "meijia", "sin-ji", "yu-shu", "shelley"].some((hint) => name.includes(hint))) {
    score += 18;
  }
  if (voice.localService) {
    score += 5;
  }

  return score;
}

function voiceLabel(voice) {
  return `${voice.name} (${voice.lang || "未知"})`;
}

function canPlayAnswer(question) {
  return Boolean(question?.audio) || "speechSynthesis" in window;
}

function getSpeakIdleText(question) {
  return question?.audio ? "播放音频" : "朗读答案";
}

function getSpeakActiveText(question) {
  return state.audioPlayer ? "停止播放" : "停止朗读";
}

function resetSpeakingState() {
  state.speakingId = null;
  state.audioPlayer = null;
  elements.speakButton.textContent = getSpeakIdleText(getSelectedQuestion());
}

function getQuestionSearchText(question) {
  return [
    question.question,
    question.answer,
    question.category,
    question.level,
    formatLevel(question.level)
  ].join(" ").toLowerCase();
}

function toggleId(set, id) {
  if (!id) {
    return;
  }
  if (set.has(id)) {
    set.delete(id);
  } else {
    set.add(id);
  }
}

function speakAnswer(question) {
  if (state.speakingId === question.id) {
    stopSpeaking();
    return;
  }

  stopSpeaking();
  if (question.audio) {
    playAudioAnswer(question);
    return;
  }

  speakTextAnswer(question);
}

function playAudioAnswer(question) {
  const audio = new Audio(question.audio);
  state.audioPlayer = audio;
  state.speakingId = question.id;
  elements.speakButton.textContent = "停止播放";

  const fallbackToText = () => {
    if (state.audioPlayer !== audio) {
      return;
    }
    state.audioPlayer = null;
    state.speakingId = null;
    speakTextAnswer(question);
  };

  audio.addEventListener("ended", () => {
    if (state.audioPlayer === audio) {
      resetSpeakingState();
    }
  }, { once: true });
  audio.addEventListener("error", fallbackToText, { once: true });
  audio.play().catch(fallbackToText);
}

function speakTextAnswer(question) {
  if (!("speechSynthesis" in window)) {
    resetSpeakingState();
    return;
  }

  const utterance = new SpeechSynthesisUtterance(question.answer);
  const voice = getSpeechVoice();
  if (voice) {
    utterance.voice = voice;
  }
  utterance.lang = voice?.lang || "zh-CN";
  utterance.rate = 0.9;
  utterance.pitch = 1;
  utterance.onend = () => {
    resetSpeakingState();
  };
  utterance.onerror = utterance.onend;
  state.speakingId = question.id;
  elements.speakButton.textContent = "停止朗读";
  window.speechSynthesis.speak(utterance);
}

function stopSpeaking() {
  if (state.audioPlayer) {
    state.audioPlayer.pause();
    state.audioPlayer.currentTime = 0;
    state.audioPlayer = null;
  }
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
  resetSpeakingState();
}

function formatLevel(level) {
  const levelMap = {
    easy: "简单",
    medium: "中等",
    hard: "困难"
  };
  return levelMap[level] ?? level;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
