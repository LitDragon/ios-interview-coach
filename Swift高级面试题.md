# Swift 高级 iOS 面试题

> 目标岗位：高级/资深 iOS 开发工程师
> 整理时间：2026年5月

---

## 目录

1. [语言基础与类型系统](#1-语言基础与类型系统)
2. [内存管理与性能优化](#2-内存管理与性能优化)
3. [面向协议编程](#3-面向协议编程)
4. [并发编程](#4-并发编程)
5. [SwiftUI 与 Combine](#5-swiftui-与-combine)
6. [Runtime 与底层原理](#6-runtime-与底层原理)
7. [架构设计](#7-架构设计)
8. [实战代码题](#8-实战代码题)

---

## 1. 语言基础与类型系统

### Q1: struct 和 class 的核心区别是什么？为什么 Swift 推荐使用 struct？

**答案：**

| 特性 | struct | class |
|------|--------|-------|
| 类型 | 值类型 | 引用类型 |
| 内存分配 | 栈区 | 堆区 |
| 继承 | 不支持 | 支持 |
| 线程安全 | 天然安全（Copy-on-Write） | 需要额外处理 |
| 析构器 | 无 deinit | 有 deinit |
| 引用计数 | 无 | 有 ARC |

**Swift 推荐 struct 的原因：**
1. **性能优势**：栈区操作比堆区更快，无需引用计数
2. **线程安全**：值语义避免数据竞争
3. **可预测性**：独立副本，修改不会影响其他引用
4. **Swift 标准库实践**：Array、Dictionary、String 都是 struct 实现

```swift
// 值类型示例
struct Point {
    var x: Double
    var y: Double
}

var p1 = Point(x: 1, y: 2)
var p2 = p1  // 创建独立副本
p2.x = 10
print(p1.x)  // 1，不受影响
print(p2.x)  // 10
```

---

### Q2: 解释 Swift 的 Copy-on-Write (COW) 机制

**答案：**

Copy-on-Write 是一种延迟复制的优化策略：只有在**修改**值类型时才创建真正的副本。

**实现原理：**
```swift
struct COWArray<T> {
    private var storage: Storage<T>
    
    var elements: [T] {
        get { return storage.elements }
        set {
            // 检查是否唯一引用
            if !isKnownUniquelyReferenced(&storage) {
                // 不唯一，需要复制
                storage = storage.copy()
            }
            storage.elements = newValue
        }
    }
}

private class Storage<T> {
    var elements: [T]
    init(_ elements: [T]) { self.elements = elements }
    func copy() -> Storage<T> { return Storage(elements) }
}
```

**关键点：**
- `isKnownUniquelyReferenced` 检查引用计数是否为 1
- 读操作零开销，写操作才触发复制
- 标准库的 Array、Dictionary、String 都支持 COW

---

### Q3: 泛型的本质是什么？什么是类型擦除？

**答案：**

**泛型本质：** 编译期的代码生成，编译器为每个具体类型生成特化版本。

**类型擦除：** 运行时丢失具体类型信息，用协议或基类统一处理。

```swift
// 类型擦除示例：AnySequence
struct AnySequence<Element>: Sequence {
    private let _makeIterator: () -> AnyIterator<Element>
    
    init<S: Sequence>(_ sequence: S) where S.Element == Element {
        _makeIterator = { AnyIterator(sequence.makeIterator()) }
    }
    
    func makeIterator() -> AnyIterator<Element> {
        return _makeIterator()
    }
}

// 使用场景：隐藏具体类型
func makeSequence() -> some Sequence<Int> {  // Opaque Type
    return [1, 2, 3]
}
```

**some vs Any：**
- `some Protocol`：不透明类型，编译期确定，性能好
- `Any Protocol`：类型擦除，运行时确定，更灵活

---

### Q4: 解释 Swift 中的 Optional 本质

**答案：**

Optional 是一个枚举：
```swift
enum Optional<Wrapped> {
    case none
    case some(Wrapped)
}
```

**解包方式对比：**

| 方式 | 语法 | 使用场景 |
|------|------|----------|
| if let | `if let x = opt` | 需要使用解包值 |
| guard let | `guard let x = opt else { return }` | 提前退出 |
| ?? | `opt ?? defaultValue` | 提供默认值 |
| try? | `try? throwingFunc()` | 错误转可选 |
| 强制解包 | `opt!` | 确定不为 nil（危险） |

**Optional Chaining 实现：**
```swift
// 编译器将链式调用转换为嵌套 Optional.map
user?.address?.city
// 等价于
user.flatMap { $0.address }.flatMap { $0.city }
```

---

## 2. 内存管理与性能优化

### Q5: ARC 的工作原理是什么？什么是循环引用？

**答案：**

**ARC 原理：**
- 每个对象维护引用计数
- 引用 +1（strong）、释放 -1
- 计数归零时自动释放

**循环引用：**
```swift
class ViewController {
    var closure: (() -> Void)?
    
    func setup() {
        // 循环引用：self -> closure -> self
        closure = {
            self.doSomething()  // 强引用 self
        }
    }
}

// 解决方案：使用 weak 或 unowned
closure = { [weak self] in
    self?.doSomething()
}
```

**weak vs unowned：**

| 特性 | weak | unowned |
|------|------|---------|
| 生命周期 | 可能先于 self 释放 | 与 self 同生命周期 |
| 类型 | Optional | 非 Optional |
| 置 nil | 自动置 nil | 不置 nil，访问会崩溃 |
| 使用场景 | delegate、闭包捕获 | 闭包和捕获对象同时销毁 |

---

### Q6: 如何检测和解决内存泄漏？

**答案：**

**检测工具：**
1. **Xcode Memory Graph Debugger**：可视化对象引用关系
2. **Instruments - Leaks**：实时检测泄漏
3. **Instruments - Allocations**：追踪内存分配

**常见泄漏场景及解决：**
```swift
// 1. 闭包循环引用
viewModel.onUpdate = { [weak self] data in
    self?.updateUI(data)
}

// 2. Delegate 强引用
protocol DataManagerDelegate: AnyObject { }  // AnyObject 限制类协议
class DataManager {
    weak var delegate: DataManagerDelegate?  // 必须 weak
}

// 3. Timer 循环引用
class TimerManager {
    var timer: Timer?
    
    func start() {
        // Timer 会强引用 target
        timer = Timer.scheduledTimer(
            timeInterval: 1,
            target: self,
            selector: #selector(tick),
            userInfo: nil,
            repeats: true
        )
    }
    
    // 解决方案：使用闭包形式
    func startSafe() {
        timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in
            self?.tick()
        }
    }
}
```

---

### Q7: 什么是 autorelease pool？在 Swift 中如何使用？

**答案：**

**作用：** 延迟对象释放，在 pool drain 时批量释放。

**Swift 中使用：**
```swift
// 大量临时对象创建时使用
func processLargeData() {
    autoreleasepool {
        for i in 0..<1000000 {
            let temp = createTemporaryObject()
            // 处理后立即释放
        }
    }
}

// 实际应用场景：
// 1. 图片处理
// 2. 大数据解析
// 3. 循环中创建大量临时对象
```

---

## 3. 面向协议编程

### Q8: 什么是面向协议编程（POP）？相比 OOP 有什么优势？

**答案：**

**POP 核心思想：** 使用协议定义行为，通过协议扩展提供默认实现。

```swift
// 定义协议
protocol Drawable {
    func draw()
}

// 协议扩展提供默认实现
extension Drawable {
    func draw() {
        print("Default drawing")
    }
}

// 协议组合
protocol Resizable: Drawable {
    var size: CGSize { get set }
}

// 使用协议而不是继承
struct Circle: Drawable, Resizable {
    var size: CGSize
    func draw() {
        print("Drawing circle with size \(size)")
    }
}
```

**POP vs OOP：**

| 特性 | POP | OOP |
|------|-----|-----|
| 复用方式 | 协议扩展 | 继承 |
| 灵活性 | 协议组合，更灵活 | 单一继承，受限 |
| 值类型支持 | 支持 struct、enum | 仅 class |
| 菱形问题 | 无 | 有 |

---

### Q9: 协议中的 associated type 是什么？如何使用类型约束？

**答案：**

```swift
// 定义带关联类型的协议
protocol Repository {
    associatedtype Entity
    func fetch(id: String) -> Entity?
    func save(_ entity: Entity)
}

// 类型约束
protocol CacheRepository: Repository where Entity: Codable {
    func cache(_ entity: Entity, forKey key: String)
}

// 具体实现
struct UserCacheRepository: CacheRepository {
    typealias Entity = User  // 显式指定（可省略）
    
    func fetch(id: String) -> User? { /* ... */ }
    func save(_ entity: User) { /* ... */ }
    func cache(_ entity: User, forKey key: String) { /* ... */ }
}

// 使用泛型约束
func process<R: Repository>(repository: R, id: String) -> R.Entity? {
    return repository.fetch(id: id)
}
```

---

### Q10: 什么是 existential any？解决什么问题？

**答案：**

**问题：** 协议作为类型使用时存在性能开销（Existential Container）。

```swift
// Swift 5.6+ 引入 any 关键字
func draw(_ shape: any Drawable) {  // 显式标记存在类型
    shape.draw()
}

// 对比 some（不透明类型）
func createShape() -> some Drawable {  // 编译期确定具体类型
    return Circle()
}
```

**any vs some：**

| 特性 | any | some |
|------|-----|------|
| 类型确定时机 | 运行时 | 编译期 |
| 性能 | 有开销（Existential Container） | 零开销 |
| 灵活性 | 可存储不同类型 | 必须同一类型 |

---

## 4. 并发编程

### Q11: GCD 和 Swift Concurrency 的区别是什么？

**答案：**

| 特性 | GCD | Swift Concurrency |
|------|-----|-------------------|
| 抽象层级 | 低级 API | 高级语言支持 |
| 内存管理 | 手动管理闭包 | 自动处理 |
| 取消任务 | 困难 | 内置支持 |
| 数据竞争 | 需手动同步 | Actor 提供保护 |
| 学习曲线 | 较低 | 较高 |

**Swift Concurrency 核心概念：**
```swift
// async/await
func fetchUser() async throws -> User {
    let data = try await URLSession.shared.data(from: url)
    return try JSONDecoder().decode(User.self, from: data.0)
}

// Task
Task {
    do {
        let user = try await fetchUser()
        await MainActor.run {
            updateUserUI(user)
        }
    } catch {
        print(error)
    }
}

// Actor - 保护共享状态
actor BankAccount {
    var balance: Double
    
    func deposit(_ amount: Double) {
        balance += amount
    }
    
    func withdraw(_ amount: Double) -> Bool {
        guard balance >= amount else { return false }
        balance -= amount
        return true
    }
}
```

---

### Q12: 什么是 Actor？如何解决数据竞争问题？

**答案：**

**Actor：** 引用类型，保证内部状态的线程安全。

```swift
actor ImageDownloader {
    private var cache: [URL: UIImage] = [:]
    
    func download(url: URL) async throws -> UIImage {
        // 检查缓存
        if let cached = cache[url] {
            return cached
        }
        
        // 下载并缓存
        let image = try await downloadImage(from: url)
        cache[url] = image
        return image
    }
}

// 使用
let downloader = ImageDownloader()
let image = try await downloader.download(url: imageURL)

// nonisolated - 不需要 Actor 隔离
actor UserData {
    var name: String
    
    nonisolated var identifier: String {  // 只读，无需隔离
        return name
    }
}
```

---

### Q13: MainActor 的作用是什么？如何正确更新 UI？

**答案：**

```swift
// MainActor 确保在主线程执行
@MainActor
class ViewModel: ObservableObject {
    @Published var items: [Item] = []
    
    func loadData() async {
        // 自动在主线程
        items = try await fetchItems()
    }
}

// 非主线程调用
func backgroundWork() async {
    let data = await processData()  // 后台执行
    
    await MainActor.run {
        // 主线程更新 UI
        self.updateUI(data)
    }
}

// SwiftUI 中自动处理
struct ContentView: View {
    @StateObject var viewModel = ViewModel()
    
    var body: some View {
        List(viewModel.items) { item in
            Text(item.name)
        }
        .task {
            await viewModel.loadData()  // 自动处理线程
        }
    }
}
```

---

## 5. SwiftUI 与 Combine

### Q14: SwiftUI 的声明式编程有什么优势？

**答案：**

**核心优势：**
1. **状态驱动**：UI 是状态的函数 `View = f(State)`
2. **单向数据流**：状态变化自动更新 UI
3. **声明式语法**：描述"是什么"而非"怎么做"

```swift
// 状态管理
struct CounterView: View {
    @State private var count = 0
    
    var body: some View {
        VStack {
            Text("Count: \(count)")
            Button("Increment") {
                count += 1  // 状态改变，UI 自动更新
            }
        }
    }
}

// 数据流方向
// @State: View 私有状态
// @Binding: 子 View 绑定父 View 状态
// @ObservedObject: 外部 ObservableObject
// @StateObject: View 拥有的 ObservableObject
// @EnvironmentObject: 环境注入
```

---

### Q15: Combine 的核心概念是什么？与 async/await 的关系？

**答案：**

**Combine 三大核心：**
```swift
// 1. Publisher - 发布者
let publisher = [1, 2, 3].publisher

// 2. Subscriber - 订阅者
let subscriber = Subscribers.Sink<Int, Never>(
    receiveCompletion: { _ in },
    receiveValue: { print($0) }
)

// 3. Operator - 操作符
let cancellable = publisher
    .map { $0 * 2 }
    .filter { $0 > 2 }
    .sink { print($0) }
```

**Combine vs async/await：**

| 特性 | Combine | async/await |
|------|---------|-------------|
| 编程范式 | 响应式 | 命令式 |
| 复杂度 | 较高 | 较低 |
| 适用场景 | 多次值事件流 | 单次异步操作 |
| 取消支持 | 内置（AnyCancellable） | Task.cancel() |

**混用示例：**
```swift
// Combine 转 async
func values() async throws -> [Int] {
    var results: [Int] = []
    let stream = [1, 2, 3].publisher.values
    
    for try await value in stream {
        results.append(value)
    }
    return results
}
```

---

## 6. Runtime 与底层原理

### Q16: Swift 对象的内存布局是怎样的？

**答案：**

```swift
// Swift 对象内存结构
class MyClass {
    var x: Int = 1
    var y: String = "hello"
}

// 内存布局：
// | isa 指针 (8 bytes) |
// | 引用计数 (8 bytes) |
// | x: Int (8 bytes)  |
// | y: String (16 bytes) |

// 查看内存布局
MemoryLayout<MyClass>.size      // 总大小
MemoryLayout<MyClass>.alignment // 对齐方式
MemoryLayout<MyClass>.stride    // 步长

// 值类型 vs 引用类型
MemoryLayout<Int>.size          // 8
MemoryLayout<String>.size       // 16 (栈上)
MemoryLayout<Array<Int>>.size   // 8 (栈上，数据在堆上)
```

---

### Q17: Swift 方法调用的底层实现是什么？

**答案：**

**Swift 方法调度：**

| 调度方式 | 使用场景 | 性能 |
|----------|----------|------|
| 静态调度 | struct、final、private | 最快 |
| 表调度 | class、protocol | 中等 |
| 消息发送 | @objc、dynamic | 最慢（支持 runtime）**

```swift
class Animal {
    func speak() { print("...") }        // 表调度
    final func run() { print("running") } // 静态调度
    @objc func eat() { print("eating") }  // 消息发送
}

// 查看调度方式
swiftc -emit-sil MyClass.swift | grep -A 5 "speak"
```

---

### Q18: 什么是 Swift Metadata？有哪些类型？

**答案：**

Swift Metadata 是描述类型信息的底层结构：

```swift
// Metadata 类型
// 1. Class Metadata - 类信息
// 2. Struct Metadata - 结构体信息
// 3. Enum Metadata - 枚举信息
// 4. Protocol Metadata - 协议信息

// 使用 Mirror 反射
struct User {
    let name: String
    let age: Int
}

let user = User(name: "John", age: 30)
let mirror = Mirror(reflecting: user)

for child in mirror.children {
    print("\(child.label!): \(child.value)")
}
// name: John
// age: 30
```

---

## 7. 架构设计

### Q19: MVVM 在 iOS 中如何实现？与 MVC 的区别？

**答案：**

```swift
// MVVM 实现
struct UserModel {
    let name: String
    let email: String
}

class UserViewModel: ObservableObject {
    @Published var userName: String = ""
    @Published var userEmail: String = ""
    
    private let user: UserModel
    
    init(user: UserModel) {
        self.user = user
        self.userName = user.name
        self.userEmail = user.email
    }
    
    func save() {
        // 业务逻辑
    }
}

struct UserView: View {
    @StateObject var viewModel: UserViewModel
    
    var body: some View {
        VStack {
            Text(viewModel.userName)
            Text(viewModel.userEmail)
            Button("Save") { viewModel.save() }
        }
    }
}
```

**MVC vs MVVM：**

| 特性 | MVC | MVVM |
|------|-----|------|
| 职责分离 | Controller 膨胀 | ViewModel 分担逻辑 |
| 可测试性 | 较差 | 较好 |
| 数据绑定 | 手动更新 | 自动绑定 |
| 代码量 | 较少 | 较多 |

---

### Q20: 什么是依赖注入？如何在 Swift 中实现？

**答案：**

```swift
// 协议定义
protocol NetworkService {
    func fetch<T: Decodable>(url: URL) async throws -> T
}

// 具体实现
class APIService: NetworkService {
    func fetch<T: Decodable>(url: URL) async throws -> T {
        let (data, _) = try await URLSession.shared.data(from: url)
        return try JSONDecoder().decode(T.self, from: data)
    }
}

// 依赖注入
class UserViewModel {
    private let networkService: NetworkService
    
    init(networkService: NetworkService = APIService()) {  // 默认值
        self.networkService = networkService
    }
}

// 测试时注入 Mock
class MockService: NetworkService {
    var mockData: Any?
    
    func fetch<T: Decodable>(url: URL) async throws -> T {
        return mockData as! T
    }
}

// 测试
func testUserViewModel() async {
    let mock = MockService()
    mock.mockData = User(name: "Test")
    let viewModel = UserViewModel(networkService: mock)
    // 测试逻辑
}
```

---

## 8. 实战代码题

### Q21: 实现一个线程安全的缓存

**答案：**

```swift
actor ThreadSafeCache<Key: Hashable, Value> {
    private var storage: [Key: Value] = [:]
    private var accessTimes: [Key: Date] = [:]
    private let maxCount: Int
    
    init(maxCount: Int = 100) {
        self.maxCount = maxCount
    }
    
    func get(_ key: Key) -> Value? {
        accessTimes[key] = Date()
        return storage[key]
    }
    
    func set(_ key: Key, value: Value) {
        // 超出容量，移除最久未访问的
        if storage.count >= maxCount {
            evictOldest()
        }
        
        storage[key] = value
        accessTimes[key] = Date()
    }
    
    func remove(_ key: Key) {
        storage.removeValue(forKey: key)
        accessTimes.removeValue(forKey: key)
    }
    
    private mutating func evictOldest() {
        guard let oldestKey = accessTimes.min(by: { $0.value < $1.value })?.key else {
            return
        }
        remove(oldestKey)
    }
}

// 使用
let cache = ThreadSafeCache<String, UIImage>()
await cache.set("logo", value: logoImage)
let image = await cache.get("logo")
```

---

### Q22: 实现一个支持取消的异步任务队列

**答案：**

```swift
class TaskQueue {
    private var tasks: [UUID: Task<Void, Never>] = [:]
    private let queue = DispatchQueue(label: "com.taskqueue", attributes: .concurrent)
    
    @discardableResult
    func enqueue(priority: TaskPriority = .medium, operation: @escaping () async -> Void) -> UUID {
        let id = UUID()
        
        let task = Task(priority: priority) {
            await operation()
        }
        
        queue.async(flags: .barrier) {
            self.tasks[id] = task
        }
        
        // 完成后清理
        Task {
            await task.value
            queue.async(flags: .barrier) {
                self.tasks.removeValue(forKey: id)
            }
        }
        
        return id
    }
    
    func cancel(id: UUID) {
        queue.async {
            self.tasks[id]?.cancel()
            self.tasks.removeValue(forKey: id)
        }
    }
    
    func cancelAll() {
        queue.async(flags: .barrier) {
            self.tasks.values.forEach { $0.cancel() }
            self.tasks.removeAll()
        }
    }
}

// 使用
let queue = TaskQueue()
let taskId = queue.enqueue {
    try? await Task.sleep(nanoseconds: 2_000_000_000)
    print("Task completed")
}

// 取消任务
queue.cancel(id: taskId)
```

---

### Q23: 实现一个简单的响应式数据绑定

**答案：**

```swift
@propertyWrapper
class Observable<Value> {
    private var value: Value
    private var observers: [(Value) -> Void] = []
    
    var wrappedValue: Value {
        get { value }
        set {
            value = newValue
            notifyObservers()
        }
    }
    
    var projectedValue: Observable<Value> { self }
    
    init(wrappedValue: Value) {
        self.value = wrappedValue
    }
    
    func observe(_ observer: @escaping (Value) -> Void) {
        observers.append(observer)
        observer(value)  // 立即触发一次
    }
    
    private func notifyObservers() {
        observers.forEach { $0(value) }
    }
}

// 使用
class UserViewModel {
    @Observable var name: String = ""
    @Observable var age: Int = 0
    
    init() {
        $name.observe { print("Name changed: \($0)") }
        $age.observe { print("Age changed: \($0)") }
    }
}

let viewModel = UserViewModel()
viewModel.name = "John"  // 输出: Name changed: John
viewModel.age = 25       // 输出: Age changed: 25
```

---

## 附录：常见陷阱与最佳实践

### 常见陷阱

```swift
// 1. struct 中的闭包捕获
struct Counter {
    var count = 0
    var increment: () -> Void = { }
    
    mutating func setup() {
        // 错误：闭包捕获的是值，不是引用
        increment = { count += 1 }
        
        // 正确：使用 mutating
        increment = { [self] in
            var mutableSelf = self
            mutableSelf.count += 1
        }
    }
}

// 2. 泛型类型擦除
protocol Animal {
    associatedtype Food
    func eat(_ food: Food)
}

// 错误：不能直接用作类型
// let animals: [Animal] = []

// 正确：使用类型擦除
struct AnyAnimal<Food>: Animal {
    private let _eat: (Food) -> Void
    
    init<A: Animal>(_ animal: A) where A.Food == Food {
        _eat = animal.eat
    }
    
    func eat(_ food: Food) { _eat(food) }
}
```

### 最佳实践

1. **优先使用 struct**，除非需要继承或引用语义
2. **使用协议而非继承**实现多态
3. **避免强制解包**，使用 guard let 或 ?? 处理可选值
4. **使用 async/await** 替代回调地狱
5. **使用 Actor** 保护共享可变状态

---

*参考资料：*
- [ChenYilong/iOSInterviewQuestions](https://github.com/ChenYilong/iOSInterviewQuestions)
- [Swift 官方文档](https://docs.swift.org/swift-book/)
- [Swift Evolution](https://github.com/apple/swift-evolution)
