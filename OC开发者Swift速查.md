# OC 开发者 Swift 速查

> 写给 10 年 OC 老兵的 Swift 面试速查。
> 每个语法都给你 OC 对照，不讲废话，只讲面试会问到的。

---

## 一、变量和常量

**OC：**
```objc
NSString *name = @"Tom";     // 变量
NSString *const kKey = @"id"; // 常量
```

**Swift：**
```swift
var name = "Tom"        // 变量，类型自动推断为 String
let kKey = "id"         // 常量，编译器保证不会改
```

**面试要点：**
- `let` 是编译期常量，`var` 是变量
- Swift 推荐优先用 `let`，只有确实要改的时候才用 `var`
- 类型可以自动推断，也可以显式标注：`var age: Int = 25`

---

## 二、Optional（可选类型）

这是 Swift 和 OC 最大的区别。

**OC：**
```objc
NSString *name = nil;    // nil，给它发消息静默返回零值
NSString *name2 = @"Tom";
```

**Swift：**
```swift
var name: String? = nil      // Optional，可能没值
var name2: String = "Tom"    // 非 Optional，一定有值

// 解包方式
if let name = name {         // if let 解包
    print(name)
}

guard let name = name else { // guard let 解包，提前退出
    return
}

let n = name ?? "default"    // 空合并，没值就用默认值
let count = name?.count      // 可选链，nil 就返回 nil
```

**面试要点：**
- `String?` 等于 OC 的 `NSString * _Nullable`
- `String` 等于 OC 的 `NSString * _Nonnull`
- `!` 强制解包 = 崩溃，和 OC 的 `unrecognized selector` 一样致命
- `if let` / `guard let` 是安全解包，解包后变量自动变成非 Optional

**追问：if let 和 guard let 区别？**
> `if let` 解包后变量只在 if 块内有效；`guard let` 解包后变量在当前作用域内都有效。guard 更适合提前退出的场景。

---

## 三、集合类型

**OC：**
```objc
NSArray *arr = @[@"a", @"b"];
NSDictionary *dict = @{@"key": @"value"};
NSMutableArray *marr = [NSMutableArray array];
[marr addObject:@"c"];
```

**Swift：**
```swift
let arr = ["a", "b"]                    // Array<String>，值类型
let dict = ["key": "value"]             // Dictionary<String, String>
var marr = ["a", "b"]                   // 可变靠 var/let，不需要 NSMutableArray
marr.append("c")

// 常用操作
let first = arr.first                   // Optional，数组可能为空
arr.filter { $0 == "a" }                // 过滤
arr.map { $0.uppercased() }             // 映射
arr.compactMap { Int($0) }              // 映射并过滤 nil
```

**面试要点：**
- Swift 的 Array、Dictionary 是值类型，有 Copy-on-Write
- 不需要 NSMutableArray/NSMutableDictionary，`var` 就是可变的
- `map`、`filter`、`compactMap` 是高频面试考点

---

## 四、闭包 vs Block

**OC：**
```objc
void (^completion)(BOOL success) = ^(BOOL success) {
    NSLog(@"done: %d", success);
};
completion(YES);
```

**Swift：**
```swift
let completion: (Bool) -> Void = { success in
    print("done: \(success)")
}
completion(true)

// 尾随闭包语法（最常见写法）
UIView.animate(withDuration: 0.3) {
    view.alpha = 0
}

// 简写参数名
let doubled = [1, 2, 3].map { $0 * 2 }  // $0 是第一个参数
```

**面试要点：**
- Swift 闭包 = OC Block，都是匿名函数 + 捕获变量
- `$0`、`$1` 是简写参数名，面试经常考
- 闭包捕获 `self` 和 OC Block 一样会造成循环引用

**追问：Swift 闭包和 OC Block 的内存管理有什么区别？**
> 原理一样，都是引用计数。Swift 用 `[weak self]`，OC 用 `__weak typeof(self) weakSelf = self`。非逃逸闭包（同步执行）不需要 weak，逃逸闭包（异步保存）需要 weak。

---

## 五、struct vs class

**OC：** 只有 class，全是引用语义。

**Swift：**
```swift
// struct - 值类型
struct User {
    var name: String
    var age: Int
}

var a = User(name: "Tom", age: 25)
var b = a           // b 是 a 的拷贝，修改 b 不影响 a
b.name = "Jerry"
print(a.name)       // "Tom"，没变

// class - 引用类型
class Dog {
    var name: String
    init(name: String) { self.name = name }
}

let dog1 = Dog(name: "Buddy")
let dog2 = dog1     // dog2 和 dog1 指向同一个对象
dog2.name = "Max"
print(dog1.name)    // "Max"，跟着变了
```

**面试要点：**
- struct 是值语义，赋值即拷贝（有 COW 优化）
- class 是引用语义，赋值只传引用
- Swift 推荐优先用 struct，除非需要继承、deinit、引用语义

---

## 六、枚举（比 OC 强大很多）

**OC：**
```objc
typedef NS_ENUM(NSInteger, Direction) {
    DirectionUp,
    DirectionDown,
};
```

**Swift：**
```swift
enum Direction {
    case up
    case down
    case left
    case right
}

// 关联值（OC 没有的能力）
enum NetworkResult {
    case success(data: Data)
    case failure(error: Error)
}

switch result {
case .success(let data):
    print(data)
case .failure(let error):
    print(error)
}
```

**面试要点：**
- Swift 枚举可以有关联值，每个 case 可以携带不同类型的数据
- switch 必须穷举所有 case，否则编译不过
- 枚举可以有方法、计算属性、遵循协议

---

## 七、协议（Protocol）

**OC：**
```objc
@protocol Drawable <NSObject>
- (void)draw;
@end

@interface Circle : NSObject <Drawable>
@end
```

**Swift：**
```swift
protocol Drawable {
    func draw()
}

// 协议扩展可以提供默认实现（OC 没有的能力）
extension Drawable {
    func draw() {
        print("default draw")
    }
}

struct Circle: Drawable {
    // 不实现 draw 也行，用默认的
    // 如果要自定义，直接覆盖
    func draw() {
        print("drawing circle")
    }
}
```

**面试要点：**
- Swift 协议可以有默认实现，OC 不行
- 协议可以被 struct、enum、class 遵循（OC 只能 class）
- 协议组合：`Drawable & Serializable`

---

## 八、错误处理

**OC：**
```objc
NSError *error = nil;
BOOL success = [manager save:&error];
if (!success) {
    NSLog(@"%@", error.localizedDescription);
}
// 调用方可以传 nil 直接忽略错误：save:nil
```

**Swift：**
```swift
// 声明
func save() throws -> Bool {
    // 可能抛出错误
    throw SaveError.diskFull
    return true
}

// 调用方必须处理
do {
    let success = try save()
} catch {
    print(error)
}

// 简写（丢弃错误信息）
let success = try? save()  // 失败返回 nil
let success = try! save()  // 失败直接崩溃
```

**面试要点：**
- OC 的错误处理是可选的（传 nil 就忽略）
- Swift 的 `throws` 强制调用方用 `try` 处理
- `try?` 会丢掉错误信息，核心链路不要用

---

## 九、泛型

**OC：**
```objc
NSArray<NSString *> *names = @[@"Tom"];  // 轻量泛型，只做类型提示
```

**Swift：**
```swift
// 泛型函数
func first<T>(of array: [T]) -> T? {
    return array.first
}

let name = first(of: ["Tom", "Jerry"])  // 推断为 String?

// 泛型类型
struct Stack<Element> {
    var items: [Element] = []
    mutating func push(_ item: Element) {
        items.append(item)
    }
}

var intStack = Stack<Int>()
intStack.push(1)
```

**面试要点：**
- OC 的泛型是轻量的，编译器只提示不检查
- Swift 的泛型是真正的类型安全，编译器完整检查
- 泛型是 `any` 和 `some` 的基础

---

## 十、async/await（Swift Concurrency）

**OC：**
```objc
[api fetchUser:^(User *user, NSError *error) {
    [api fetchOrders:user.id completion:^(NSArray *orders, NSError *error) {
        // 回调地狱
    }];
}];
```

**Swift：**
```swift
func loadData() async throws {
    let user = try await api.fetchUser()      // 等待，但不阻塞线程
    let orders = try await api.fetchOrders(userId: user.id)
    // 代码是线性的，和同步代码一样好读
}
```

**面试要点：**
- `async/await` 把回调地狱变成线性代码
- `await` 不是阻塞线程，是挂起任务，线程可以去做别的事
- `try await` 同时处理异步和错误
- 和 GCD 的区别：GCD 是队列调度，async/await 是语言级并发模型

**追问：什么时候用 GCD，什么时候用 async/await？**
> 新代码优先 async/await，代码更线性、错误处理更好。老模块、OC 代码、需要指定队列、barrier 等场景，GCD 仍然有用。

---

## 十一、Property Wrapper（属性包装器）

**OC：** 没有这个概念，最接近的是自定义 getter/setter。

**Swift：**
```swift
@propertyWrapper
struct Capitalized {
    private var value: String = ""
    var wrappedValue: String {
        get { value }
        set { value = newValue.capitalized }
    }
}

struct User {
    @Capitalized var name: String
}

var user = User()
user.name = "tom"       // 自动变成 "Tom"
```

**面试常考的 Property Wrapper：**
| 包装器 | 作用 | OC 类比 |
|--------|------|---------|
| `@State` | View 内部状态 | UIView 自己管自己的属性 |
| `@Binding` | 父子 View 双向绑定 | delegate 回调 |
| `@ObservedObject` | 外部可观察对象 | KVO 观察 |
| `@StateObject` | 拥有所有权的观察对象 | 自己创建并持有的 ViewModel |
| `@EnvironmentObject` | 全局环境对象 | 单例 / AppDelegate |

---

## 十二、guard vs if

```swift
// if - 条件成立才执行
if let user = currentUser {
    print(user.name)
}
// user 在这不可用

// guard - 条件不成立就退出
guard let user = currentUser else {
    return
}
// user 在这可用
```

**面试要点：**
- `guard` 适合前置条件检查，减少嵌套
- `if let` 适合条件分支逻辑

---

## 十三、字符串插值

**OC：**
```objc
NSString *msg = [NSString stringWithFormat:@"Hello, %@, age: %d", name, age];
```

**Swift：**
```swift
let msg = "Hello, \(name), age: \(age)"
```

---

## 十四、初始化器（init）

**OC：**
```objc
- (instancetype)initWithName:(NSString *)name {
    if (self = [super init]) {
        _name = name;
    }
    return self;
}
```

**Swift：**
```swift
class User {
    let name: String

    init(name: String) {
        self.name = name   // 所有存储属性必须在 init 中初始化
    }
}

// struct 自动生成 memberwise init
struct Point {
    var x: Int
    var y: Int
}
let p = Point(x: 1, y: 2)  // 自动生成的
```

---

## 十五、访问控制

| Swift | OC 类比 | 作用 |
|-------|---------|------|
| `open` | - | 可被外部模块继承和重写 |
| `public` | - | 可被外部模块访问，不可继承 |
| `internal` | 不写（默认） | 同一模块内访问 |
| `fileprivate` | - | 同一文件内访问 |
| `private` | - | 同一作用域内访问 |

**面试要点：**
- Swift 默认是 `internal`，OC 默认是 `public`（在头文件声明的）
- Swift 的访问控制更细粒度

---

## 学习建议

1. **先背 OC 那 16 道题**，建立信心
2. **看这份速查**，把 OC 知识映射到 Swift
3. **再背 Swift 高级题**，现在应该能看懂了
4. **每天花 20 分钟**，先看速查 + 1 道高级题，不要贪多

你不是从零开始，你有 10 年 OC 基础，Swift 的很多概念你已经懂了，只是语法不同。
