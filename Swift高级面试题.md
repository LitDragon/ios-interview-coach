# Swift 高级面试题核心精简版

> 目标：只保留高级 Swift/iOS 面试里最核心、最高频、最值得背的题。
>
> 答题原则：先用 **30 秒结论**回答，再按“关键机制、项目用法、风险与取舍”展开到 90 秒。不要背语法清单，也不要在没有项目证据时陷入源码细节。

---

## 题目分级

| 优先级 | 定位 | 题量 |
| --- | --- | --- |
| P0 | 必背核心题，最容易被问 | 12 题 |
| P1 | 高频加分题，能体现项目深度 | 9 题 |

---

# P0：必背核心题

## 01：Swift 的值语义和引用语义怎么理解？struct 和 class 怎么选？

**口语答案：**

> Swift 里 `struct` 更偏值语义，`class` 更偏引用语义。值语义强调每个变量像是有自己独立的一份值，修改一个不会影响另一个；引用语义强调多个变量可能指向同一个对象，修改会被共享看到。
>
> Swift 推荐优先用 struct，不是因为 struct 一定在栈上，也不是因为 class 一定慢，而是因为值语义更容易推理，少了共享可变状态，也不会产生对象之间的循环引用。
>
> 项目里我一般让 Model、配置、状态快照用 struct；需要身份、继承、共享生命周期、和 UIKit/OC 体系交互的对象用 class。核心是看它有没有"身份"和"共享可变状态"。

> **OC 对照记忆：** OC 对象通常是 class 和引用语义，例如多个变量指向同一个 `NSMutableArray` 时会共享修改；但 C struct、标量等仍是值语义。迁移 OC Model 时不能机械改成 struct，仍要根据身份、共享状态和桥接边界判断。

> **追问：** struct 一定在栈上吗？
>
> 答：不一定。Swift 编译器会做逃逸分析，如果 struct 被闭包捕获、跨函数传递或太大，可能分配在堆上。但这是编译器优化细节，不影响值语义的本质——每个变量有独立副本。

> **追问：** 什么时候必须用 class？
>
> 答：需要继承、需要共享生命周期（多个地方引用同一个实例）、需要 deinit 做资源清理、需要和 OC/NSObject 体系交互时。

---

## 02：Copy-on-Write 是什么？它解决了什么问题？

**口语答案：**

> Copy-on-Write 就是写时复制。值在传递和读取时先共享底层存储，只有真正修改，并且发现底层存储不是唯一引用时，才复制一份。
>
> 它解决的是**值语义和性能**之间的矛盾。比如 `Array`、`Dictionary`、`String` 看起来是值类型，如果每次赋值都深拷贝会很慢，所以 Swift 用 COW 让读操作很轻，写的时候再保证互不影响。
>
> 但 COW 不等于线程安全。多个线程同时读写同一个变量或同一份共享状态，仍然可能数据竞争。自定义 COW 类型时，也要保证唯一引用判断和写入复制逻辑正确。

> **OC 对照记忆：** OC 的 `copy` 会向对象发送 `copyWithZone:`，具体是返回自身、浅拷贝还是深拷贝取决于类型实现；Swift 标准集合的 COW 则是在修改时检查底层存储是否唯一，不唯一才复制。

**自定义 COW 类型代码：**

```swift
struct MyBuffer<Element> {
    private var storage: Storage

    private class Storage {
        var elements: [Element]
        init(_ elements: [Element]) { self.elements = elements }
    }

    init(_ elements: [Element] = []) {
        storage = Storage(elements)
    }

    var count: Int { storage.elements.count }

    mutating func append(_ element: Element) {
        if !isKnownUniquelyReferenced(&storage) {
            storage = Storage(storage.elements) // 写时复制
        }
        storage.elements.append(element)
    }
}
```

> **追问：** `isKnownUniquelyReferenced` 对 class 有什么要求？
>
> 答：参数必须是 class 类型（不能是 protocol 或 `@objc` 桥接类型）。如果是 `let` 常量或非唯一引用，返回 `false`，触发复制。

> **追问：** COW 在多线程下安全吗？
>
> 答：不安全。COW 只解决值语义的独立性，不解决并发读写。多线程同时修改同一个变量仍会数据竞争，需要加锁或用 Actor。

---

## 03：Optional 体现了 Swift 什么类型安全思想？

**口语答案：**

> Optional 的核心是把"值可能不存在"放进类型系统里，而不是等运行时才发现空值问题。
>
> 一个值如果是 Optional，调用方就必须明确处理有值和没值两种情况，比如用 `if let`、`guard let`、空合并或者可选链。这样失败路径和兜底逻辑会更清楚。
>
> 但 Optional 不是绝对安全。强制解包会崩，隐式解包如果生命周期假设错了也会崩。项目里我会让 Optional 多出现在边界层，比如接口返回、配置缺失、弱引用，而不是让核心业务状态到处不确定。

> **OC 对照记忆：** OC 里给 nil 发消息，静默返回零值（数字 0、BOOL NO、对象 nil），不崩但藏隐患。Swift 把"可能为 nil"变成了类型系统的一部分，编译器逼你处理。用 `!` 强制解包才会崩。本质区别：OC 的 nil 是"静默失败"，Swift 的 Optional 是"强制面对"。

> **追问：** `if let` 和 `guard let` 怎么选？
>
> 答：`guard let` 适合提前退出，解包后的变量在后续代码都可用；`if let` 适合只在局部使用。核心是看解包值的作用域。

> **追问：** Optional 的 `map` 和 `flatMap` 区别？
>
> 答：`map` 对有值的情况做变换，返回新的 Optional；`flatMap` 用于变换闭包本身也返回 Optional 时，避免产生 `Optional<Optional<T>>` 嵌套。

---

## 04：Swift 的 ARC 和闭包捕获有哪些高频坑？

**口语答案：**

> Swift 的 ARC 主要管理 class 实例，值类型本身不靠引用计数。最常见的泄漏是对象持有闭包，闭包又强持有对象，比如控制器、ViewModel、Timer、通知、异步任务里的 `self`。
>
> 我不会无脑写 `weak self`，会先看闭包生命周期。非逃逸闭包一般不需要 weak；会被长期保存的闭包，通常要用 weak 打断循环引用。`unowned` 只适合能严格保证被捕获对象活得更久的场景，否则访问已释放对象会直接崩。
>
> 面试里重点说清楚：内存问题不是语法问题，而是所有权问题。谁持有任务、任务什么时候结束、回调回来时对象是否还存在，这些才是关键。

> **OC 对照记忆：** 和 OC 的 Block 循环引用原理完全一样。OC 用 `__weak typeof(self) weakSelf = self`，Swift 用 `[weak self]`。OC 的 `__unsafe_unretained` 对应 Swift 的 `unowned`。你做了 10 年 OC 内存管理，这套逻辑直接平移过来就行，只是语法不同。

**weak vs unowned 代码对比：**

```swift
class ViewController: UIViewController {
    var closure: (() -> Void)?

    func setup() {
        // weak：self 可能已释放，需解包
        closure = { [weak self] in
            guard let self else { return }
            self.updateUI()
        }

        // unowned：self 生命周期一定比闭包长，已释放则崩溃
        closure = { [unowned self] in
            self.updateUI()
        }
    }
}
```

> **追问：** 什么时候用 `unowned` 比 `weak` 好？
>
> 答：能严格保证被捕获对象生命周期更长时，比如闭包是对象内部私有且不会逃逸到对象销毁之后。`unowned` 省去解包开销，但访问已释放对象会崩。

> **追问：** 非逃逸闭包需要 `weak self` 吗？
>
> 答：通常不需要。非逃逸闭包执行完就释放，不会长期持有 `self`，不存在循环引用。

---

## 05：Swift 的协议导向和面向对象有什么区别？

**口语答案：**

> 协议导向的核心是**定义能力，不关心类型身份**。协议说"你能做什么"，类说"你是什么"。协议可以组合（一个类型同时遵循多个协议），类只能单继承。
>
> 协议扩展可以提供默认实现，这样遵循协议的类型不用每个都重复写一遍。比起传统的基类继承，协议更轻量，也不会引入继承层级过深、父类状态被子类意外修改这些问题。
>
> 项目里我会用协议定义模块间的接口边界，方便测试时替换 Mock。但需要共享可变状态、管理生命周期、或者和 UIKit/OC 体系交互时，仍然用 class。不要为了"面向协议"把简单代码过度抽象。

> **OC 对照记忆：** OC 也有 protocol，但没有默认实现，每个遵循者都得手写所有方法。Swift 的协议扩展可以给默认实现，等于把 category 的能力安全地融入了协议。OC 里想给 protocol 加默认实现只能靠 category 给 NSObject 扩展，容易命名冲突。Swift 的协议导向本质上是"更安全的 category + 更灵活的多继承"。

> **追问：** 协议扩展的默认实现怎么派发？
>
> 答：如果方法是协议 requirement，通过协议类型调用会走 witness table；如果方法只定义在 extension、没有出现在协议 requirement 中，则按静态类型选择实现，通过协议类型和具体类型调用可能得到不同结果。

> **追问：** 协议和泛型怎么选？
>
> 答：编译期已知具体类型用泛型（性能好）；需要运行时多态、异构集合用协议。Swift 5.7 的 `some`/`any` 让这个边界更清晰。

---

## 06：any 和 some 怎么理解？什么时候用哪个？

**口语答案：**

> 返回位置的 `some` 是不透明类型：调用方看不到具体类型，但实现方必须始终返回同一种具体类型。参数位置的 `some P` 更接近泛型参数的简写。两者都保留静态类型信息，SwiftUI 的 `some View` 是典型场景。
>
> `any` 是存在类型，可以在运行时装不同的实现进去，更灵活，但有包装成本和动态派发开销。需要异构集合（比如一个数组里放不同类型的协议遵循者）时，必须用 `any`。
>
> 简单原则：能用 `some` 就用 `some`，它性能好、类型安全；需要运行时灵活性时再用 `any`。不要无脑把所有协议参数都标 `any`，也不要为了用 `some` 把本来需要多态的场景强行写死。

> **OC 对照记忆：** OC 里用 `id` 类型，什么都能传，编译器不管你传的是啥。`some` 就是编译器帮你锁定一个具体类型（编译期多态），`any` 就是 OC 的 `id` 那样运行时才确定（运行时多态）。理解这个，`some` 和 `any` 的区别就清楚了。

**any 和 some 代码对比：**

```swift
protocol Drawable { func draw() }

// some：编译器知道具体类型，性能好
func render(shape: some Drawable) {
    shape.draw()
}

// any：运行时擦除类型，支持异构集合
let shapes: [any Drawable] = [Circle(), Square()]
shapes.forEach { $0.draw() }
```

> **追问：** `some` 能用在函数参数以外的地方吗？
>
> 答：可以用于返回值、部分属性声明和函数参数；其中参数位置的 opaque parameter syntax 是 Swift 5.7 引入的。返回位置的 `some` 要求每条返回路径对应同一种具体类型。

> **追问：** `any` 的性能开销在哪？
>
> 答：存在类型通过 existential container 保存值和 witness table，调用通常需要间接派发；较大的值或特定布局可能发生堆装箱，但不是所有 `any` 都会堆分配。只有在性能热点并经测量确认后才需要针对性优化。

---

## 07：Swift 的错误处理模型怎么设计才健壮？

**口语答案：**

> Swift 的错误处理核心是把失败路径显式化。`throwing` 函数声明了"这个操作可能失败"，调用方必须用 `try` 处理，不能假装看不见。
>
> 项目里我会分层处理：底层库用 `throwing` 抛具体错误；业务层用 `do-catch` 统一兜底，转换成用户可感知的状态；异步场景用 `Result` 或者 `async throws` 传递。关键是错误要在合适的层级被捕获和转换，不要到处 `try?` 吞掉错误，也不要让底层错误直接弹给用户。
>
> 坑点是 `try?` 会把错误信息丢掉，调试时完全不知道为什么失败。核心链路上的错误一定要明确处理，不能图省事全用 `try?`。

> **OC 对照记忆：** OC 用 NSError 指针参数，调用方可以传 nil 直接忽略错误，编译器不管你。很多 OC 代码 `error:nil` 一路传，错误被默默吞掉。Swift 的 `throws` 强制你用 `try` 处理，编译不过就跑不起来。本质区别：OC 的错误处理是"可选的"，Swift 是"强制的"。

> **追问：** `Result` 和 `throws` 怎么选？
>
> 答：`throws` 适合同步或 `async` 场景，代码更简洁；`Result` 适合需要存储或传递错误结果、配合 Combine 等场景。两者可互转。

> **追问：** 自定义 Error 用 enum 还是 struct？
>
> 答：enum 更适合有穷错误集合（网络错误、解析错误）；struct 适合需要携带动态上下文信息的场景。项目里 enum 更常见。

---

## 08：GCD 和 Swift Concurrency 怎么取舍？

**口语答案：**

> GCD 是基于队列的底层调度工具，Swift Concurrency 是语言级并发模型，用 `async/await`、`Task`、`TaskGroup`、`Actor` 来表达异步、取消、错误和状态隔离。
>
> 新 Swift 业务里，我会优先用 `async/await` 写单次异步流程，因为代码更线性，错误和取消也更好传递。老模块、OC 代码、指定队列、barrier、底层 C API 这些场景，GCD 仍然有价值。
>
> 真正要避免的是混用失控。比如在 Task 里塞大量同步阻塞任务，或者在 GCD 回调里直接乱改 MainActor 状态。并发边界要统一，UI 状态要回到主线程语义。

> **OC 对照记忆：** OC 常用 GCD 和 NSOperation 组织异步任务；Swift Concurrency 在语言层增加了任务层级、取消、错误传播和 Actor 隔离。Actor 可以类比受保护的串行状态入口，但存在重入语义，不能简单等同于 GCD 串行队列。

**GCD vs async/await 代码对比：**

```swift
// GCD 回调风格
func fetchUser(completion: @escaping (Result<User, Error>) -> Void) {
    URLSession.shared.dataTask(with: url) { data, _, error in
        do {
            if let error { throw error }
            guard let data else { throw URLError(.badServerResponse) }
            let user = try JSONDecoder().decode(User.self, from: data)
            DispatchQueue.main.async { completion(.success(user)) }
        } catch {
            DispatchQueue.main.async { completion(.failure(error)) }
        }
    }.resume()
}

// async/await 风格
func fetchUser() async throws -> User {
    let (data, _) = try await URLSession.shared.data(from: url)
    return try JSONDecoder().decode(User.self, from: data)
}
```

> **追问：** `Task` 和 `DispatchQueue.global().async` 有什么区别？
>
> 答：`Task {}` 创建的是非结构化任务，但会继承当前 Actor 上下文、优先级和 Task Local；它有取消句柄和错误结果。GCD 是队列调度原语，本身不提供同等级的任务层级和错误传播模型。

> **追问：** 旧项目全用 GCD，要迁移到 async/await 吗？
>
> 答：不需要一次性迁移。新功能用 async/await，旧代码通过 `withCheckedContinuation` 桥接。逐步迁移，别大改。

---

## 09：Combine 和 async/await 应该怎么选择？

**口语答案：**

> `async/await` 更适合一次性的异步流程，比如请求接口、读文件、提交表单。它像同步代码一样表达顺序，错误处理也更直接。
>
> Combine 更适合持续变化的数据流，比如搜索防抖、多个状态组合、表单校验、实时消息、视图状态绑定。它处理"随时间变化的事件流"更自然，但调试和生命周期管理成本更高。
>
> 项目里我不会强行统一成一种。单次请求用 `async/await`，持续状态流用 Combine 或 SwiftUI 观察机制。关键是边界清楚，不要让 Publisher、Task、回调互相套到看不懂。

> **OC 对照记忆：** OC 没有原生响应式框架，想做事件流得引入 RAC 或 RxSwift。Combine 是 Apple 官方的声明式事件流框架。OC 里你用 RAC 的 `RACSignal` 做信号绑定，Swift 里用 Combine 的 `Publisher` 做同样的事。`async/await` 则替代了 OC 里回调式的网络请求写法。

> **追问：** Combine 和 async/await 能混用吗？
>
> 答：能。`Publisher.values` 把 Publisher 转为 AsyncSequence，可在 `for await` 里使用；`Future` 桥接 async 函数到 Combine。关键是边界清楚，别嵌套太深。

> **追问：** SwiftUI 里还用 Combine 吗？
>
> 答：iOS 17+ 推荐用 `@Observable`，底层不再依赖 Combine。但 `@Published`、`CurrentValueSubject` 在非 SwiftUI 场景仍有价值。

---

## 10：SwiftUI 的声明式 UI 和状态驱动怎么落地？

**口语答案：**

> SwiftUI 的核心是 UI 是状态的结果。开发者维护状态，状态变化后框架重新计算视图描述，再做差异更新。
>
> 真正落地时，关键是状态归属清楚。页面临时状态放在 View 内部；复杂业务状态放到 ViewModel 或 Store；父子视图之间只传必要状态和事件，避免多个地方同时维护同一份数据。
>
> SwiftUI 常见问题不是不会背属性包装器，而是状态散乱、重复数据源、异步任务和视图生命周期绑得太死。高级实践更强调单向数据流：View 发出意图，状态层处理副作用并产出新状态，View 只负责渲染。

> **OC 对照记忆：** OC 用 UIKit 是命令式的——你手动 `addSubview`、`removeFromSuperview`、改 `label.text`。SwiftUI 是声明式的——你只描述"UI 应该长什么样"，状态变了框架自动更新。思维转变：从"我要怎么操作 UI"变成"我要怎么描述状态"。

> **追问：** `@State` 和 `@StateObject` 怎么选？
>
> 答：`@State` 用于值类型（struct、enum）的简单状态；`@StateObject` 用于 class 类型的引用对象，保证 View 重建时对象不被销毁。iOS 17+ 推荐 `@State` + `@Observable`。

> **追问：** 状态放 View 还是 ViewModel？
>
> 答：页面级临时状态（输入框、动画）放 View；跨 View 共享、业务逻辑复杂的状态放 ViewModel。核心是单一数据源，避免重复。

---

## 11：Swift 内存泄漏怎么检测和治理？

**口语答案：**

> Swift 泄漏高发点主要是闭包捕获 `self`、Timer、Notification、异步 Task、Combine 订阅、delegate 或缓存生命周期不清。
>
> 我会先看页面退出后 `deinit` 有没有执行，再用 Xcode Memory Graph 看引用链。复杂场景配合 Instruments 的 Leaks 和 Allocations，看对象是否持续增长、是谁在持有。
>
> 治理重点是生命周期清楚：订阅要取消，Task 要随页面释放或消失取消，闭包按生命周期选择 weak 或 unowned，缓存要有上限和淘汰。只靠全局搜索 `weak self` 不够。

> **OC 对照记忆：** 和 OC 内存泄漏原理完全一样。OC 里 Block 强引用 self 导致 VC 不释放，Swift 闭包一样会。OC delegate 用 weak，Swift 也一样。Timer 要 invalidate，通知要 removeObserver，这些你做了 10 年的东西直接平移。区别只是 Swift 多了 Task 和 Combine 订阅这两个新的泄漏点。

> **追问：** `deinit` 不调用怎么排查？
>
> 答：先用 Memory Graph 看谁持有对象；再检查闭包、Timer、NotificationCenter、Combine 订阅、delegate 循环；最后确认 Task 是否随页面取消。

> **追问：** Instruments 的 Leaks 和 Memory Graph 哪个好用？
>
> 答：Memory Graph 适合快速查看当前引用关系；Leaks 适合持续监测泄漏增长。排查时先 Memory Graph 定位，再 Instruments 确认。

---

## 12：Swift 和 Objective-C 混编时要注意什么？

**口语答案：**

> 混编最先要注意类型边界。Swift 的 Optional、泛型、enum、struct 不是都能无损暴露给 Objective-C；OC 的 nullable 标注不准，也会影响 Swift 侧的类型安全。
>
> 其次是动态能力。Swift 默认更静态，如果方法要给 OC 调用、支持 selector、KVO 或 Swizzling，需要明确暴露成 `@objc` 或 `dynamic`，但这也会牺牲一部分静态优化。
>
> 大型项目里我会把混编边界集中在 adapter 层，处理好 NSError/Swift Error、集合可变性、线程回调和 Core Foundation 桥接，避免 Swift 业务代码到处被 OC 约束污染。

> **OC 对照记忆：** 这题本身就是 OC 和 Swift 的对照。核心三件事：① Bridging Header 让 Swift 调 OC；② 自动生成的 `ModuleName-Swift.h` 让 OC 调 Swift；③ OC 的 `NS_ENUM`、`NSError`、`nullable` 要映射成 Swift 的 `enum`、`throws`、`Optional`。你项目里已经有混编经验，把坑讲清楚就行。

> **追问：** Swift 的 `struct` 能暴露给 OC 吗？
>
> 答：不能。OC 不支持 Swift 的 struct、enum（非 `@objc`）、泛型。混编边界要用 `@objc` 协议或 class 包装。

> **追问：** `@objc` 和 `dynamic` 什么关系？
>
> 答：`@objc` 让兼容声明暴露给 Objective-C Runtime；`dynamic` 强制使用动态消息派发，并在可暴露的声明上隐含 Objective-C Runtime 入口，不必机械地同时手写两个标记。是否支持 KVO 还要满足对象、属性和观察方式等条件。

---

# P1：高频加分题

## 13：Swift 的方法派发机制有什么实际意义？

**口语答案：**

> Swift 方法调用大致有静态派发、函数表派发和消息派发三种。`struct`、`enum`、`final`、`private` 更容易被编译器静态优化；普通 class 方法通过函数表支持重写；标记 `@objc dynamic` 后走 OC 的消息派发，能支持 KVO、selector、Swizzling。
>
> 项目里不用为了微优化到处加 `final`，但确定不需要继承时加 `final` 可以表达设计意图，也给编译器优化空间。需要暴露给 OC Runtime 时，再明确选择动态能力。
>
> 坑点是要区分协议 requirement 和 extension-only 方法：requirement 的实现通过 witness table 派发；只存在于 extension 的方法按静态类型选择，因此通过协议类型和具体类型调用可能不同。

> **OC 对照记忆：** OC 里所有方法调用都是消息派发（`objc_msgSend`），你最熟的 Runtime 就是干这个的。Swift 有三种派发：struct/final 走静态派发（最快）、class 走函数表派发（类似 C++ 虚表）、`@objc dynamic` 走消息派发（和 OC 一样）。面试时说"OC 全是消息派发，Swift 多了静态和函数表两种优化路径"就够了。

> **追问：** 协议方法走哪种派发？
>
> 答：协议 requirement 通过协议类型调用时走 witness table；extension-only 方法按静态类型派发。默认实现是否进入 witness table，取决于该方法是不是协议 requirement。

> **追问：** `final` 真的能提升性能吗？
>
> 答：能，但微乎其微。`final` 让编译器做去虚化和内联，真正价值是表达设计意图——"这个方法不该被重写"。

---

## 14：Actor 解决了什么问题？重入是什么坑？

**口语答案：**

> Actor 主要解决共享可变状态的数据竞争问题。它把内部状态隔离起来，外部跨隔离访问通常需要 `await`；同一时刻只执行一段 Actor 隔离代码，但任务在 `await` 挂起后，其他任务可以进入，这就是重入。
>
> 但 Actor 不是"自动无 bug 的锁"。最容易忽略的是重入：Actor 方法里一旦遇到 `await`，当前任务会挂起，其他任务可能进来改状态，恢复后之前读到的状态可能已经过期。
>
> 所以我会用 Actor 管状态一致性，但避免在里面做长时间阻塞。关键状态在 `await` 后要重新校验，网络、IO、纯计算和状态提交最好拆清楚。

> **OC 对照记忆：** OC 常用串行队列、锁或 `@synchronized` 保护共享状态。Actor 把隔离规则加入类型系统，但它允许在 `await` 处重入，因此不能照搬“串行队列中的一个任务会连续执行到底”的假设。

**Actor 使用代码：**

```swift
actor BankAccount {
    var balance: Double

    init(balance: Double) { self.balance = balance }

    func transfer(_ amount: Double, to other: BankAccount) async {
        guard balance >= amount else { return }
        balance -= amount
        await other.deposit(amount) // await 后可能被其他任务插入
    }

    func deposit(_ amount: Double) {
        balance += amount
    }
}
```

**重入问题代码：**

```swift
actor Cache {
    var items: [String: Data] = [:]

    func load(key: String) async -> Data {
        if let cached = items[key] { return cached }
        let data = await fetchFromNetwork(key) // 挂起点
        // 其他任务可能已在此期间写入 items[key]
        items[key] = data // 可能覆盖并发任务写入的值
        return data
    }
}
```

> **追问：** Actor 和 `NSLock` 比有什么优势？
>
> 答：Actor 由编译器检查隔离边界，适合保护具有明确所有权的异步状态；锁适合短小、同步的临界区。Actor 方法可以挂起并发生重入，锁则不能跨 `await` 持有，两者不能只按性能简单替换。

> **追问：** 怎么解决 Actor 重入问题？
>
> 答：关键状态在 `await` 后重新读取；用 `withTaskCancellationHandler` 处理取消；把网络/IO 和状态提交拆成独立操作。

---

## 15：MainActor 的作用是什么？怎么保证 UI 安全？

**口语答案：**

> MainActor 可以理解为主线程语义的全局 Actor，它把"UI 要在主线程更新"从人为约定变成编译器能检查的隔离规则。
>
> 项目里，如果 ViewModel 直接驱动页面状态，我通常会把它标记为 `@MainActor`。网络请求、解析、缓存可以在后台做，最后只把展示结果提交回 MainActor。
>
> 需要注意，MainActor 不等于所有代码永远同步跑在主线程上。跨 Actor 调用会有挂起点，顺序、取消和对象生命周期仍然要考虑。

> **OC 对照记忆：** OC 里通常手动派发到主队列更新 UI。`@MainActor` 把声明隔离到主 Actor，跨隔离访问由编译器检查并通过 `await` 切换执行器；它增强了主线程语义，但仍要注意旧 OC 回调、同步入口和具体编译模式的边界。

> **追问：** `@MainActor` 和 `DispatchQueue.main.async` 有什么区别？
>
> 答：`@MainActor` 是编译期隔离检查，违规直接编译失败；`DispatchQueue.main.async` 是运行时调度，调错线程只警告不报错。`@MainActor` 更安全。

> **追问：** 后台任务怎么更新 UI？
>
> 答：在 `@MainActor` 标记的方法或属性里更新；或用 `await MainActor.run { }` 显式切换。不要直接在后台 Task 里改 UI 状态。

---

## 16：Swift Concurrency 里的结构化并发、取消和错误传播怎么理解？

**口语答案：**

> 结构化并发的核心是任务有层级和作用域。父任务创建子任务后，子任务的生命周期、取消和错误可以跟着作用域管理，比散落的回调和 GCD 任务更好推理。
>
> Swift 的取消是协作式的，不是系统强行杀任务。任务要在合适位置检查取消状态，取消后停止后续工作，避免再更新 UI 或继续占资源。
>
> 项目里我会把页面请求、并发加载、批量任务放进清晰的任务作用域里。页面消失时取消任务，子任务失败时明确是整体失败，还是收集部分结果继续降级。

> **OC 对照记忆：** GCD block 本身没有统一的取消和错误传播模型，NSOperation 的取消同样需要任务协作。Swift 中由 `async let` 或 TaskGroup 创建的结构化子任务才具有明确的父子生命周期与错误传播；普通 `Task {}` 仍是非结构化任务，需要自行管理句柄。

> **追问：** `TaskGroup` 和多次创建 `Task {}` 有什么区别？
>
> 答：`TaskGroup` 是结构化并发，作用域结束前会等待子任务完成；需要提前停止剩余任务时要显式调用 `cancelAll()`，错误路径会按相应 API 传播和清理。`Task {}` 创建非结构化任务，需要持有句柄并管理取消和结果。

> **追问：** 协作式取消要手动检查吗？
>
> 答：是的。系统不会强行终止任务，需在关键节点调用 `Task.checkCancellation()` 或 `Task.isCancelled`，然后提前返回或清理资源。

---

## 17：Property Wrapper 的价值是什么？什么时候不该用？

**口语答案：**

> Property Wrapper 的价值是把属性读写时的重复逻辑封装起来，比如状态存储、UserDefaults 映射、依赖注入、数据校验或线程隔离。
>
> 它让使用方看起来像普通属性，但背后有统一行为。SwiftUI 里的 `@State`、`@Binding`、`@ObservedObject` 也是在表达不同的状态归属和数据流关系。
>
> 不该用的场景是业务语义太复杂、隐藏副作用太多、调试成本太高。比如属性一读写就偷偷发网络请求或改全局状态，会让代码很难维护。

> **OC 对照记忆：** OC 没有 Property Wrapper 这个概念。最接近的是自定义 getter/setter 或者宏。比如 OC 里你写 `@property (nonatomic, copy) NSString *name;` 的 `copy` 语义，Swift 里可以封装成 `@CopyOnSet var name: String`。SwiftUI 的 `@State`、`@Binding` 本质也是 Property Wrapper，只是框架帮你写好了。

> **追问：** 自定义 Property Wrapper 的典型场景？
>
> 答：UserDefaults 映射（`@UserDefault("key") var name: String`）、线程隔离（`@Atomic var count: Int`）、数据校验（`@Clamped(0...100) var score: Int`）。关键是封装的逻辑要通用且可复用。

> **追问：** Property Wrapper 和计算属性怎么选？
>
> 答：计算属性是单个属性的自定义逻辑；Property Wrapper 是可复用的封装模式，多个属性可共享同一套行为。需要复用时选 Property Wrapper。

---

## 18：Swift 或 SwiftUI 项目的性能优化你会关注哪些方向？

**口语答案：**

> Swift 性能优化先看编译器能帮你多少。`final`、`private`、`whole module optimization` 能让编译器做更多静态内联和去虚化，但这些是锦上添花，不是主要矛盾。
>
> 真正影响大的是算法、内存分配、引用计数、桥接和数据布局。大值类型可能产生复制成本，但只有采用共享引用存储并实现唯一性检查的类型才属于 COW；泛型通常可以特化，存在类型才更容易引入间接派发或装箱。优化前应先用 Instruments 和基准测试确认热点。
>
> SwiftUI 里要区分 body 重新计算、视图更新和实际渲染。应保持 body 轻量、缩小状态依赖范围并稳定视图身份；`EquatableView` 只适合能够证明比较成本更低的局部场景，不能作为通用的“精准 diff”开关。

> **OC 对照记忆：** OC 对象以引用语义为主，Swift 还需要关注值类型复制、泛型特化和存在类型开销；但两者都应先用 Instruments、MetricKit 或基准测试定位瓶颈，不能仅凭语言特性推断性能问题。

> **追问：** SwiftUI 里怎么减少 body 重算？
>
> 答：缩小每个子视图读取的状态范围，保持身份稳定，避免在 body 中做重计算，并使用懒加载容器处理长列表。只有测量确认有收益时，再考虑 `EquatableView` 等局部优化。

> **追问：** `@inlinable` 什么时候用？
>
> 答：跨模块调用的热点泛型函数，标记 `@inlinable` 让编译器在调用方内联优化。不要滥用，会增加编译时间和二进制体积。

---

## 19：Swift 6 有哪些重要变化？

**口语答案：**

> Swift 6 语言模式最重要的变化是**完整严格并发检查成为语言规则的一部分**。编译器可以发现大量跨隔离域访问和非 `Sendable` 传递问题，但不能证明程序不存在所有数据竞争。
>
> 面试重点应放在 Actor isolation、`Sendable`、`@Sendable`、全局与静态状态隔离、region-based isolation，以及 `sending` 参数和结果表达的所有权转移。`nonisolated(unsafe)` 只是绕过部分隔离检查的逃生口，不是常规迁移方案。
>
> 迁移策略：先在 Swift 5 语言模式下把 `SWIFT_STRICT_CONCURRENCY` 提升到 `complete`，逐模块修复警告并梳理隔离边界，再切换 Swift 6 语言模式。混编边界要特别核对回调线程、`@Sendable`、`@MainActor` 和旧 SDK 标注。

> **OC 对照记忆：** OC 的线程安全主要依靠队列、锁和运行时工具。Swift 6 严格并发检查能在编译期发现一部分隔离和跨域传递问题，Thread Sanitizer 仍用于发现编译器无法证明或来自底层代码的运行时数据竞争，两者不能互相替代。

> **追问：** Region Isolation 是什么？
>
> 答：编译器追踪值在并发域间的流动，确保传递的值是 `Sendable` 或已脱离原并发域。防止值类型内部引用的可变状态被跨域共享。

> **追问：** Swift 5 项目要立刻升级到 Swift 6 吗？
>
> 答：不需要。先在 Swift 5 模式下开启 `StrictConcurrency=complete`，修复所有警告后再升级。大项目建议逐模块迁移，别一次性改。

---

## 20：@Observable 和 ObservableObject 怎么选？

**口语答案：**

> `@Observable`（iOS 17+）是新框架，用宏自动生成观察代码，性能更好、粒度更细。`ObservableObject`（iOS 13+）基于 Combine 的 `@Published`，兼容性更广。
>
> `@Observable` 的优势：只追踪实际被 body 读取的属性，属性改了没被用到就不会触发重算；不需要 `@ObservedObject` 包装；支持 `withObservationTracking` 做细粒度订阅。
>
> 选择原则：新项目、最低支持 iOS 17 用 `@Observable`；需要支持 iOS 16 及以下用 `ObservableObject`；两者不要混用在同一个 ViewModel 上。

> **OC 对照记忆：** OC 用 KVO 观察属性变化，需要手动 `addObserver`/`removeObserver`，容易忘记移除导致崩溃。SwiftUI 的 `@Observable` 是声明式的——你只管用属性，框架自动追踪依赖、自动触发更新。从"手动订阅"进化到"自动追踪"。

**@Observable vs ObservableObject 代码对比：**

```swift
import Observation
import SwiftUI

// iOS 17+：@Observable
@Observable
final class ObservableUserViewModel {
    var name: String = ""
    var age: Int = 0
}

struct ObservableUserView: View {
    @State private var viewModel = ObservableUserViewModel()

    var body: some View {
        Text(viewModel.name) // 只追踪 name，age 变了不重算
    }
}

// iOS 13+：ObservableObject
final class LegacyUserViewModel: ObservableObject {
    @Published var name: String = ""
    @Published var age: Int = 0
}

struct LegacyUserView: View {
    @ObservedObject var viewModel: LegacyUserViewModel

    var body: some View {
        Text(viewModel.name) // 任一 @Published 变了都重算
    }
}
```

> **追问：** `@Observable` 为什么性能更好？
>
> 答：它用 Observation 框架的细粒度追踪，只在 body 实际读取的属性变化时才触发重算。`ObservableObject` 的任何 `@Published` 变化都会触发整个 body 重跑。

> **追问：** `@StateObject` 和 `@State` + `@Observable` 怎么选？
>
> 答：iOS 17+ 可以使用 `@State private var viewModel = ObservableUserViewModel()` 管理由 View 创建的 `@Observable` 对象；iOS 16 及以下使用 `@StateObject` 管理 `ObservableObject`。

---

## 21：Sendable 协议解决了什么问题？

**口语答案：**

> `Sendable` 是 Swift Concurrency 的类型安全标记，表示"这个值可以安全地跨并发域传递"。值类型（struct、enum）通常自动满足；class 需要手动保证线程安全（final、不可变、或用 Actor 隔离）。
>
> 它解决的是**编译期防止数据竞争**。如果一个类型不是 `Sendable`，编译器会阻止你把它传给其他 Actor 或并发任务，从源头拦截共享可变状态。
>
> 常见坑：`@Sendable` 是对闭包类型的并发契约，它会限制闭包捕获非 Sendable 或可变状态；来自 Objective-C 和旧 SDK 的类型要以当前 SDK 标注为准，必要时通过值类型快照、Actor 隔离或经过审计的 `@unchecked Sendable` 包装处理，不能统一使用 `nonisolated(unsafe)` 绕过。

> **OC 对照记忆：** OC 没有任何编译期类型安全标记来检查跨线程传递。你把 NSMutableArray 丢给后台线程改，编译器一声不吭，运行时才崩。Swift 的 `Sendable` 让编译器在编译期就拦住这种行为——"这个类型不是线程安全的，不能跨域传递"。

> **追问：** 值类型一定是 `Sendable` 吗？
>
> 答：struct 和 enum 的所有存储属性都是 `Sendable` 时，自动满足。但如果 struct 包含闭包或非 Sendable 引用，就不自动满足。

> **追问：** `@unchecked Sendable` 什么时候用？
>
> 答：你手动保证了线程安全但编译器无法推断时（比如用锁保护的 class）。这是逃生舱口，慎用，绕过检查后出问题自己负责。

---

# 背诵建议

1. P0 十二题必须能稳定讲出来，P1 九题根据自己项目经历补强。
2. 每题只记三个关键词，不背长段落。
3. Swift 题不要只背语法，要主动补充所有权、并发安全、状态归属和工程取舍。
4. 面试官追问时，再展开具体 API、源码名词或项目细节。
