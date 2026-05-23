# Swift高级面试题排序版

> 目标：按高级 iOS 面试中的重要性和区分度排序。答案采用面对面口语表达，每题建议控制在 60 到 90 秒。
>
> 筛选原则：删除单纯语法记忆、低阶 API 拼写、简易概念题；把必要基础合并到更高级的问题里回答。

---

## 题目分级

| 优先级 | 定位 | 题量 |
| --- | --- | --- |
| P0 | 必须讲清楚，决定 Swift 工程师基本面 | 8 题 |
| P1 | 高频进阶题，体现项目深度与并发安全 | 8 题 |
| P2 | 加分题，体现底层细节和实战工程判断 | 8 题 |

---

# P0：高级 Swift 必会题

## 01：struct 和 class 的核心区别是什么？为什么 Swift 推荐使用 struct？

**口语答案：**

> struct 是值类型，class 是引用类型。值类型在赋值或传递时会进行复制，而引用类型传递的是指向堆区内存的指针。在内存分配上，struct 优先在栈区分配，开销极小，而 class 在堆区分配，需要引用计数（ARC）来管理生命周期，开销更大。
>
> **Swift 推荐使用 struct 的核心原因有四点：**
> 1. **线程安全**：由于值语义的复制特性，每个线程拥有的都是独立的副本，天然避免了多线程读写下的共享状态竞争（Data Race）。
> 2. **无内存泄漏风险**：struct 没有引用计数，不可能发生循环引用（Retain Cycle）。
> 3. **性能高**：栈内存的分配与释放只需移动栈指针，比堆区垃圾回收/生命周期管理快几个数量级。
> 4. **符合函数式/声明式编程理念**：配合 SwiftUI，状态改变时直接通过值替换来驱动 UI 刷新，逻辑极具可预测性。

---

## 02：请解释 Swift 的 Copy-on-Write (COW) 机制及其实征意义

**口语答案：**

> COW（写时复制）是 Swift 针对值类型（如 Array、Dictionary、String）在大数据量下的内存优化机制。当值类型进行复制（如赋值给新变量或作为函数参数传递）时，系统并不会立即在内存中拷贝一份新数据，而是让它们**共享底层的同一个堆内存地址**。
>
> 只有当任意一个变量**发生写操作（修改）**时，系统才会检查引用计数。如果该底层存储存在多个引用（通过 `isKnownUniquelyReferenced` 检查），才会执行真正的内存拷贝，为修改变量创建独立的副本。
>
> **实征意义：**
> 它完美融合了“值类型的安全语义”与“引用类型的性能优势”。读操作零开销，写操作按需拷贝，避免了频繁拷贝大体积数组造成的 CPU 与内存开销。我们在自定义大体积 struct 数据结构时，也可以通过包裹一个私有 class 存储来手动实现 COW 优化。

---

## 03：如何向面试官解释 Swift 中 Optional 的本质？

**口语答案：**

> Swift 中的 `Optional` 本质上是一个普通的**泛型枚举（Enum）**。它的底层定义非常简单：
> ```swift
> enum Optional<Wrapped> {
>     case none
>     case some(Wrapped)
> }
> ```
> 这里的 `nil` 实际上是 `Optional.none` 的语法糖，而有值则是 `Optional.some(Wrapped)` 的关联值包裹。
>
> Swift 通过可选绑定（`guard let` / `if let`）、空合运算符（`??`）以及可选链（`?.`）等语法糖，在语法层面上强制开发者处理“值可能为空”的场景。
>
> 这种设计在**编译期**就消除了 Objective-C 中由于 `nil` 指针发送消息导致的隐式奔溃，将运行时的安全隐患提前在编译期以类型安全的形式强制解决。

---

## 04：什么是面向协议编程（POP）？相比传统 OOP 有什么优势？

**口语答案：**

> 面向协议编程（POP）是 Swift 的核心设计哲学。与传统面向对象编程（OOP）依赖类继承来复用代码不同，POP 强调通过**协议（Protocol）**、**协议扩展（Protocol Extension）**和**协议组合（Protocol Composition）**来解耦和复用逻辑。
>
> **相比 OOP 的优势：**
> 1. **支持值类型**：传统的类继承只能用于 class，而协议可以被 struct 和 enum 实现，从而使值类型也能享受多态和代码复用。
> 2. **避免多继承困境与菱形问题**：Swift 类是单继承的，而协议支持多实现与协议组合（如 `Codable` 就是 `Decodable & Encodable`），避免了继承带来的基类臃肿（Massive Base Class）和紧耦合。
> 3. **更灵活的横切面复用**：通过 `extension Protocol` 注入默认实现，可以实现跨越不同类继承树的非侵入式逻辑复用。

---

## 05：GCD 和 Swift Concurrency 的区别是什么？

**口语答案：**

> GCD 是底层的 C 语言多线程 API，基于队列和线程池调度，容易产生回调地狱，且无法在编译期保证线程安全。而 Swift Concurrency（`async/await`）是语言级的高级并发框架。
>
> **核心区别在于：**
> 1. **协作式线程池 vs 线程爆炸**：GCD 频繁派发异步阻塞任务会导致系统创建大量并发线程（线程爆炸），引发严重的上下文切换开销。Swift 并发底层采用协作式线程池，线程数与 CPU 核心数绑定，挂起任务时线程不会阻塞，而是去执行其他任务。
> 2. **编译期安全检查**：Swift 并发引入了 `Sendable` 检查，配合 `Actor`，能在编译阶段拦截跨线程的数据竞争（Data Race）。
> 3. **任务生命周期支持**：Swift 并发天然支持结构化并发（Structured Concurrency），子任务的取消、错误传播会随着作用域层级自动传递，而 GCD 的任务取消非常繁琐。

---

## 06：什么是 Actor？它如何解决多线程数据竞争？

**口语答案：**

> `Actor` 是 Swift 引入的一种全新的**引用类型**，与 class 类似，但它天然保证了内部可变状态的线程安全。
>
> **工作机制：**
> Actor 底层通过 **邮箱机制（Mailbox）** 和 **数据隔离（Data Isolation）** 来运作。它确保在同一时刻，**只能有一个任务**访问或修改其内部的 mutable 属性。
>
> 当外部去访问 Actor 的属性或调用其方法时，必须使用 `await` 关键字。如果此时有其他任务正在执行，当前访问任务会被挂起放入邮箱队列，等待 Actor 空闲后恢复执行。
>
> 另外，如果不涉及共享可变状态的方法，可以使用 `nonisolated` 标记，跳过隔离检查以提升性能。Actor 从根本上在语言层面干掉了传统的锁机制，避免了人为写错锁导致的死锁或竞态条件。

---

## 07：MainActor 的作用是什么？在 Swift 并发中如何正确更新 UI？

**口语答案：**

> `MainActor` 是一个全局唯一的 **全局 Actor（Global Actor）**，它底层绑定了系统的主线程（Main Queue）。它的作用是确保标记的方法或类型必定在主线程上执行，从而安全地进行 UI 更新。
>
> **正确更新 UI 的实践：**
> 1. **对 ViewModel 声明 `@MainActor`**：一旦将类标记为 `@MainActor`，其所有属性的修改和方法执行都会自动切回主线程，SwiftUI 观察这些 published 属性更新 UI 时便高枕无忧。
> 2. **局部临时切换**：在后台异步任务中，如果不希望整个类都绑定主线程，可以使用 `await MainActor.run { ... }` 闭包，将临时的 UI 刷新代码安全派发至主线程。
> 3. **编译器安全校验**：在 Swift 6 / 开启 Strict Concurrency 检查下，如果在非主线程直接修改 UI 属性，编译器会直接报错，在编译阶段就防范了非主线程刷新 UI 的经典 Crash。

---

## 08：SwiftUI 的声明式编程有什么优势？它是如何实现状态驱动 UI 的？

**口语答案：**

> SwiftUI 的核心是 `View = f(State)`，即 UI 是状态的函数。开发者只需描述 UI“是什么样子”以及绑定了哪些“状态数据”，而不需要像 UIKit 那样手动写代码去修改视图的 frame、添加/移除子视图。
>
> **优势与机制：**
> SwiftUI 通过强大的属性包装器（Property Wrappers）构建了单向数据流：
> - `@State` 用于 View 内部的私有简单状态。
> - `@Binding` 实现父子视图间的双向状态传递。
> - `@StateObject` / `@ObservedObject` 绑定外部遵循 `ObservableObject` 的数据模型。
> - `@EnvironmentObject` 实现全局环境的依赖注入。
>
> 当标记为这些包装器的状态发生改变时，SwiftUI 会自动比对虚拟视图树（Render Tree）的 Diff，仅对发生改变的局部视图节点进行高效重绘。这避免了 UIKit 中手动更新数据与视图不一致导致的各种奇葩 Bug。

---

# P1：高频 Swift 进阶题

## 09：泛型的本质是什么？什么是类型擦除？

**口语答案：**

> **泛型的本质是编译期的特化（Specialization）**。编译器在编译泛型代码时，如果能够推导确定具体类型，会为每个具体的类型生成一份专有的机器码，从而实现零运行时开销（Zero-cost abstraction）。如果无法特化，则会通过值类型目（Value Witness Table）在运行时动态处理。
>
> **类型擦除（Type Erasure）：**
> 在 Swift 中，含有关联类型（`associatedtype`）或 `Self` 的协议不能直接作为普通的变量类型来声明数组或参数（因为它们在编译期大小是不确定的，被称为关联协议）。
>
> 为了解决这个问题，我们需要引入“类型擦除”。传统的做法是编写一个包装结构体（如将 `Repository` 协议擦除为 `AnyRepository<T>`），在内部用闭包持有具体实现。而在现代 Swift 中，我们可以使用 `any` 关键字（如 `any Repository`）直接让编译器在运行时用存在容器（Existential Container）包装该协议，自动实现类型擦除。

---

## 10：协议中的 associated type 是什么？如何使用类型约束？

**口语答案：**

> `associatedtype` 是协议中的**占位关联类型**。它让协议在声明时不需要指定具体类型，而是把确定类型的职责留给实现该协议的具体结构。这在设计通用接口（如泛型数据仓库、泛型网络请求）时非常有用。
>
> **类型约束与使用：**
> 我们可以通过 `where` 子句对关联类型进行严格的类型约束。例如：
> ```swift
> protocol CacheRepository: Repository where Entity: Codable {
>     func cache(_ entity: Entity, forKey key: String)
> }
> ```
> 这里的 `Entity` 必须遵循 `Codable`。在具体类实现该协议时，可以通过 `typealias Entity = User` 明确指定，或者直接让编译器根据方法参数类型自动推导。通过类型约束，我们可以在保证接口通用性的同时，安全地调用特定类型的功能（如序列化）。

---

## 11：什么是 existential any（存在类型）？它与 some（不透明类型）有什么区别？

**口语答案：**

> 这是 Swift 5.6+ 强推的现代语法。
> - `any`（存在类型，Existential Type）：表示一个动态容器。它可以容纳任何实现该协议的类型。由于它在运行时才确定大小，系统必须开辟 **Existential Container（存在容器）** 并使用动态派发，存在一定的内存寻址和性能开销。
> - `some`（不透明类型，Opaque Type）：表示一个在**编译期就完全确定**的单一具体类型，只是对外部调用者隐藏了具体名字。它的底层采用静态派发，零运行时开销。
>
> **区别总结：**
> `some` 性能高，但缺乏灵活性，要求函数返回值必须是同一种具体类型（如 SwiftUI 里的 `some View`）。`any` 性能稍低，但极为灵活，允许数组里存放不同的具体实现（如 `[any Drawable]` 既能存 Circle 也能存 Rectangle）。大厂面试中应表达：**优先使用 some，必要时才使用 any 降级。**

---

## 12：Swift Concurrency 中有哪些高级坑点（如 Actor 重入与线程饥饿），如何防范？

**口语答案：**

> Swift Concurrency 极大简化了并发，但有两个大厂面试极具区分度的深水区坑点：
>
> 1. **Actor Reentrancy (Actor 重入问题)**：
>    当我们在 Actor 方法中调用带有 `await` 的异步函数时，当前 Task 会被挂起并释放 Actor 的锁。此时，其他任务可以趁机进入该 Actor 并修改其内部状态。当被挂起的 Task 恢复执行时，它之前读到的本地状态可能已经被篡改了。
>    *防范：* 避免在 `await` 前后假设状态未变。应该在 `await` 之后重新验证关键状态数据，或者把状态修改逻辑封装在不含 `await` 的同步方法中执行。
>
> 2. **Thread Starvation (线程饥饿)**：
>    协作式线程池的并发线程数与 CPU 核心数严格绑定，且不支持抢占式中断。如果在 Task 中执行了高耗时、同步阻塞的 CPU/IO 密集型操作（如大型解密或大文件同步 I/O），该核心线程会被无限期霸占，导致整个并发线程池被迅速耗尽，其他 async 任务彻底死锁。
>    *防范：* 不要将同步阻塞逻辑直接写在 Task 里。必须使用 `Task.detached` 或将其分派到专门的低优先级 GCD 队列中处理，保护并发主线程池。

---

## 13：Combine 的核心概念是什么？与 async/await 怎么选择？

**口语答案：**

> Combine 是 Apple 的函数响应式编程（FRP）框架，核心概念由三部分组成：
> - **Publisher（发布者）**：定义事件和数据的发送规则。
> - **Operator（操作符）**：对流过的数据进行函数式链式转换（如 `map`、`filter`、`debounce`）。
> - **Subscriber（订阅者）**：接收并处理最终产生的数据流或完成事件。
>
> **与 async/await 的选择取舍：**
> - **async/await 适合单次、线性的异步操作**：如单次网络请求、单次数据读取。它代码结构平铺直叙，极易阅读和维护。
> - **Combine 适合处理高频、多次、随时间变化的数据流**：如搜索框实时输入消抖（Debounce）、多路传感器数据流合并、复杂的实时消息长连接处理。
>
> 在现代开发中，两者经常配合：用 async/await 承担网络请求，用 Combine 的 `@Published` 做属性绑定和 UI 数据驱动。

---

## 14：Swift 方法调用的三种派发机制及底层实现？

**口语答案：**

> Swift 的方法派发机制分为三种，性能与动态性各不相同：
>
> 1. **直接派发（Direct/Static Dispatch）**：
>    直接调用内存地址中的函数指令，速度极快（O(1)），利于编译器进行 Inline 优化。适用于 struct/enum 的所有方法，以及用 `final`、`private`、或在 class `extension` 中声明的方法。
> 2. **函数表派发（Table/V-Table Dispatch）**：
>    在 class 的 metadata 中维护一个函数指针数组。调用时先在 Table 中查表，拿到地址再跳转。适用于普通的 class 方法。如果子类重写了方法，Table 中对应位置的指针会被替换。
> 3. **消息机制派发（Message Dispatch）**：
>    纯动态派发，调用 `objc_msgSend`，在运行时通过 isa 沿着类继承链和 Category 动态查找 IMP。适用于用 `@objc dynamic` 修饰的方法，常用于 KVO 和 Method Swizzling。
>
> 了解这个原理，能帮助我们合理运用 `final` 关键字来提高 Swift 代码的执行效率。

---

## 15：MVVM 架构在 Swift 与 SwiftUI 中如何优雅地设计与落地？

**口语答案：**

> 在现代 iOS 开发中，MVVM 必须适应 SwiftUI 的声明式渲染。
>
> **优雅的设计划分是：**
> - **View 层**：纯 SwiftUI `Struct`。通过 `@StateObject` 观察 ViewModel 的变更，完全不参与业务逻辑。
> - **ViewModel 层**：必须是声明为 `@MainActor` 的 class，并遵循 `ObservableObject` 协议（或在 iOS 17+ 中直接使用 `@Observable` 宏）。ViewModel 通过 `@Published` 属性向 View 暴露 UI 状态，并通过接收 View 的 Action 改变状态。
> - **Model / Service 层**：纯 Struct 存储实体数据，复杂的网络请求、数据存储下沉到独立的 Service 中。
>
> **避坑点：**
> 为防止双向绑定导致的状态碎片化，在大型页面中应提倡**单向数据流（UDF）**：View 派发事件 -> ViewModel 统一处理逻辑并修改状态 -> View 观察状态变更。这能够避免 ViewModel 过于臃肿，且非常便于进行单元测试。

---

## 16：什么是依赖注入（DI）？如何在 Swift 中优雅地实现？

**口语答案：**

> 依赖注入是指将一个对象所依赖的外部服务，通过构造函数或属性的方式传递进来，而不是在对象内部自己去 `init` 创建。这是实现 SOLID 架构中“控制反转（IoC）”和“依赖倒置”的核心手段。
>
> **在 Swift 中的优雅实现方案：**
> 1. **构造函数注入（Initializer Injection）**：最基本且安全的方式，通过 protocol 限制类型，强保证编译期安全。
> 2. **轻量级容器（DI Container）与属性包装器**：我们可以模仿 SwiftUI 的 `@Environment`，设计一个全局单例的组件注册容器。结合 Swift 的 Property Wrapper，实现类似如下调用：
> ```swift
> @Inject var networkService: NetworkServiceProtocol
> ```
> 这种方式能极大简化组件化架构下模块间的装配逻辑，在单元测试时，我们只需向容器注入一个 Mock 服务，即可实现完全的逻辑隔离测试。

---

# P2：加分 Swift 题

## 17：Swift 对象的内存布局是怎样的？值类型与引用类型在底层有什么不同？

**口语答案：**

> **引用类型（Class）对象的内存布局：**
> 在堆区中，每个 class 实例占用的前 16 个字节是固定的系统信息：前 8 字节是指向该类 Metadata（类元数据）的指针（类似于 OC 对象的 `isa`）；紧接着的 8 字节存储了对象的引用计数信息（Strong/Weak/Unowned 引用计数）。之后才依次存放该实例的具体属性值，并遵循 8 字节对齐规则。
>
> **值类型（Struct）的内存布局：**
> struct 的内存布局非常纯粹。它在内存中**没有** Metadata 指针，也**没有**引用计数占位。它的内存就是其所有属性字段按声明顺序连续拼接排布的字节空间。
>
> 也就是说，如果一个 struct 只有三个 Int 属性，它在栈上就只占用固定的 24 字节。这种精简的内存结构也是 struct 性能远超 class 的物理基础。

---

## 18：什么是 Swift Metadata？它的底层结构是怎样的？

**口语答案：**

> `Swift Metadata` 是 Swift 编译器在编译期为每种类型自动生成的**元数据结构**，它是 Swift 实现反射（Reflection）、运行时类型检查（如 `is` / `as?`）以及动态派发的基石。
>
> **底层结构：**
> 对于 Class 类型的 Metadata，它的底层布局兼容了 Objective-C 的 Class 结构。在前几个字节中，它包含一个指向父类元数据的指针，以及与 OC 兼容的 `cache` 和 `bits` 字段。
>
> 此外，它还独有如下信息：
> 1. **Nominal Type Descriptor**：描述该类型的基本信息（如名字、属性列表、泛型签名）。
> 2. **V-Table（函数表）**：按偏移量存放该类所有动态派发函数的指针地址。
>
> 对于值类型（Struct/Enum），虽然它们没有对象实例级别的 Metadata 指针，但在编译期仍然会生成各自的类型元数据，包含值 Witness 表（VWT），用于在泛型调用中指导系统如何对该值类型进行内存拷贝、销毁和移动。

---

## 19：Swift 中 ARC 的工作原理是什么？如何解决循环引用？

**口语答案：**

> Swift 的自动引用计数（ARC）在编译期自动帮我们在 class 对象生命周期的关键点插入 `swift_retain` 和 `swift_release` 调用。
>
> **解决循环引用的手段：**
> 我们主要通过强引用的修饰符来打断 Retain Cycle：
> 1. `weak`：声明指针为可选类型（Optional），不增加对象的引用计数。当指向的对象释放时，Runtime 弱引用表会自动将该指针置为 `nil`。
> 2. `unowned`：声明指针为非可选类型（必须有值），不增加引用计数。但当指向的对象释放后，该指针**不会**被置为 nil。
>
> **大厂高阶考点（unowned 的安全风险与底层）：**
> `unowned` 的底层包含两类：`unowned(safe)` 和 `unowned(unsafe)`。`safe` 模式下，Swift 内部会维护一个无主引用计数，当对象销毁而无主计数不为 0 时，内存并不会被彻底物理释放，只是标记为已析构。此时如果再次访问该指针，系统会安全地抛出 Runtime Crash，而不是像 `unsafe` 那样直接去读取野指针导致未知内存越界风险。

---

## 20：如何检测和治理 Swift 项目中的内存泄漏？

**口语答案：**

> 内存泄漏在 Swift 中主要源于：闭包捕获了 `self`（最常见）、`Timer` 的强持有、以及 delegate 声明为 strong。
>
> **我们的治理体系分为两层：**
> 1. **研发与 CI 阶段的自动化拦截**：
>    在开发阶段集成开源的 `MLeaksFinder`，并在运行时分析工具链中加入 `FBRetainCycleDetector`。在 CI/CD 流水中，可以通过编写脚本对编译产物进行静态代码扫描，或者在测试套件中编写针对特定 ViewController deinit 的断言测试，不释放直接跑出测试失败。
> 2. **手动深度排查**：
>    利用 Xcode 的 **Memory Graph**，定位那些退出页面后本应析构却依然存在于内存树中的控制器和 ViewModel，直接观察其引用闭环；或者用 Instruments 的 Leaks 和 Allocations 进行堆栈回溯。
>
> **修复手段：**
> 在闭包中使用捕获列表 `[weak self]` 或 `[unowned self]` 来打断闭环。但要注意，如果闭包是非逃逸的（`@noescape`，如标准库的 `map`、`filter`），闭包在函数执行完就销毁了，此时**不需要且不应该**使用 weak self。

---

## 21：什么是 autorelease pool？在 Swift 中什么场景下需要主动关注？

**口语答案：**

> `autoreleasepool` 是 Objective-C 遗留下来的内存延时释放池。在 ARC 下，如果一个对象被标记为 `autorelease`，它不会立刻被调用 release，而是会被加入到当前线程的自动释放池中，等当前 RunLoop 循环结束时再统一释放。
>
> 在纯 Swift 的值类型编程中，我们基本不需要考虑自动释放池。**但在以下两个场景下，我们必须主动关注并手动添加 `autoreleasepool { ... }` 闭包：**
>
> 1. **在循环中频繁创建大量的临时 Objective-C 对象**：
>    例如在 `for` 循环中循环处理大量图片（`UIImage` 底层是 CGImage 属于 ObjC 对象）、或者循环调用 `NSData` / `NSDictionary` 等系统 OC 库。如果不手动包裹池子，这些临时对象只能等到主线程 RunLoop 闲置时才释放，这会导致短时间内内存峰值暴涨，引发系统 Jetsam OOM 杀进程。
> 2. **后台并发子线程的长生命周期常驻任务**：
>    主线程的 RunLoop 会自动创建和管理自动释放池，但子线程的任务如果是一个死循环或者超长执行，不会自动触发 RunLoop 的池子释放，必须手动在核心任务段包裹池子。

---

## 22：【实战】如何用 Swift 设计并实现一个高性能且线程安全的缓存（Cache）？

**口语答案：**

> 要实现一个企业级的缓存，我们需要解决“数据淘汰策略”与“高并发读写安全”两个核心技术点。
>
> **设计方案：**
> 1. **数据存储与淘汰（LRU 策略）**：
>    底层使用哈希表（`Dictionary`）用于 O(1) 复杂度的快速查找，同时配合一个双向链表记录数据的访问时序。当缓存数量达到上限时，淘汰链表尾部的“最久未被访问”的数据。
> 2. **并发安全控制（读写锁）**：
>    在 Swift 中，如果使用 Actor，会因为挂起和重入产生不确定的调度时序，不适合高性能缓存。我推荐使用 **pthread_rwlock_t（读写锁）** 或利用自定义的 **并发 GCD 队列 + `dispatch_barrier_async`（栅栏函数）**。
>    - 所有的读操作使用并发读取（`queue.sync`），允许多个线程同时读缓存。
>    - 所有的写/清理操作使用栅栏写入（`queue.async(flags: .barrier)`），确保写入时排他，避免多线程写冲突与脏读。

---

## 23：【实战】如何用 Swift 实现一个支持取消与依赖关系的异步任务队列？

**口语答案：**

> 在 Swift 中，我们有两种高水准的方式来实现这一业务：
>
> **方案一：使用底层的 `NSOperation` 与 `NSOperationQueue`**：
> 这是最成熟的方案。我们自定义 `Operation` 子类，在内部管理异步任务的生命周期。
> - 通过重写 `isExecuting`、`isFinished` 等 KVO 属性，在任务完成时手动改变状态。
> - 利用 `operationA.addDependency(operationB)` 轻松实现依赖。
> - 在执行体内部，频繁检测 `self.isCancelled`，一旦为 true，立刻清理现场并退出。
>
> **方案二：使用现代 Swift 的结构化并发（TaskGroup 与 Task）**：
> - 每一个任务对应一个 `Task` 实例。我们可以将这些实例存储在线程安全的字典中。
> - 当需要取消特定任务时，直接调用 `task.cancel()`。在任务执行体内部，使用 `try Task.checkCancellation()` 抛出取消异常，或者通过 `Task.isCancelled` 进行清理退出。
> - 任务间的依赖关系，可以通过 async let 或任务组内的 await 等待直接串联，利用语言底层的挂起机制避免了写复杂的依赖图结构。

---

## 24：【实战】如何使用 Property Wrapper 实现一个轻量级的响应式数据绑定？

**口语答案：**

> 我们可以通过 Swift 的 **属性包装器（Property Wrapper）** 结合 **观察者模式** 来手动实现一个类似于 Combine 简易版的响应式数据绑定，让状态改变时能自动触发 UI 刷新。
>
> **核心实现代码：**
> ```swift
> @propertyWrapper
> class Observable<Value> {
>     private var value: Value
>     private var observers: [(Value) -> Void] = []
>     
>     var wrappedValue: Value {
>         get { value }
>         set {
>             value = newValue
>             observers.forEach { $0(value) } // 值改变，触发通知
>         }
>     }
>     
>     var projectedValue: Observable<Value> { self }
>     
>     init(wrappedValue: Value) {
>         self.value = wrappedValue
>     }
>     
>     func observe(_ observer: @escaping (Value) -> Void) {
>         observers.append(observer)
>         observer(value) // 订阅时立即回调当前值
>     }
> }
> ```
>
> **使用场景：**
> 在 ViewModel 中使用 `@Observable var name: String = ""` 来声明属性。在 View 层，通过 `$name.observe { [weak self] newName in self?.nameLabel.text = newName }` 直接订阅状态的变化。这不仅解耦了业务与 UI，而且在不依赖第三方框架（如 RxSwift）的情况下实现轻量级响应式绑定。

---

*参考资料：*
- [ChenYilong/iOSInterviewQuestions](https://github.com/ChenYilong/iOSInterviewQuestions)
- [Swift 官方文档](https://docs.swift.org/swift-book/)
- [Swift Evolution](https://github.com/apple/swift-evolution)
