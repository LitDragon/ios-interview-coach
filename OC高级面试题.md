# OC 高级面试题核心精简版

> 目标：只保留高级 OC/iOS 面试里最核心、最高频、最值得背的题。
>
> 答题原则：先用 **30 秒结论**回答，再按“关键机制、项目用法、风险与取舍”展开到 90 秒。不要背源码细节，重点是能用真实项目案例支撑。

---

## 题目分级

| 优先级 | 定位 | 题量 |
| --- | --- | --- |
| P0 | 必背核心题，最容易被问 | 10 题 |
| P1 | 高频加分题，能体现深度 | 9 题 |

---

# P0：必背核心题

## 01：你怎么理解 OC 的内存管理？ARC 解决了什么，没有解决什么？

**口语答案：**

> OC 的内存管理本质还是**引用计数**，ARC 不是垃圾回收。它只是让编译器自动帮我们插入 `retain`、`release`、`autorelease` 这些代码，减少手写内存管理出错。
>
> ARC 解决了大部分普通 OC 对象的生命周期问题，但解决不了所有问题。比如循环引用、NSTimer 强持有 target、缓存无限增长导致 OOM、Core Foundation 或 C 指针对象，这些仍然需要开发者自己处理。
>
> 所以我理解 ARC 的重点不是"不用管内存"，而是要清楚**谁持有谁、什么时候释放、哪里需要打断引用链**。

> **追问：** ARC 下 `autorelease` 对象什么时候释放？
>
> 答：对象会在它所在的 autorelease pool 被 drain 时收到 `release`；主线程通常由 RunLoop 周边的系统池管理，但不能把它绝对理解成“每个对象都在当前迭代结束释放”。手动 `@autoreleasepool` 会在作用域结束时 drain 该池。

> **追问：** `weak` 和 `assign` 修饰对象有什么区别？
>
> 答：`weak` 对象释放后自动置 nil，安全；`assign` 不置 nil，对象释放后变成野指针，访问会崩。

---

## 02：属性修饰符 strong、copy、weak、assign、atomic 怎么选？

**口语答案：**

> 属性修饰符主要是在表达**所有权和线程语义**。
>
> `strong` 表示强持有，常用于普通对象；`copy` 常用于 `NSString`、`NSArray`、`NSDictionary` 和 Block，防止外部传入可变对象后被改掉；`weak` 常用于 delegate 和反向引用，避免循环引用；`assign` 只用于基本类型，不能修饰 OC 对象，否则对象释放后容易野指针。
>
> `atomic` 只能保证 getter/setter 本身读写完整，不等于线程安全，而且有性能成本。实际项目里大多数属性都用 `nonatomic`，真正的线程安全要靠锁、串行队列或状态隔离来做。

> **追问：** `NSString` 用 `copy` 还是 `strong`？有什么区别？
>
> 答：用 `copy`。因为外部可能传入 `NSMutableString`，如果用 `strong`，属性会指向同一个可变对象，外部修改会影响内部；`copy` 会生成不可变副本，保证安全。

> **追问：** Block 属性为什么推荐用 `copy`？
>
> 答：Block 是否位于栈、全局区或堆上取决于捕获和逃逸方式。ARC 会在需要时自动把逃逸 Block 移到堆上，属性仍推荐声明为 `copy`，用于明确保存独立 Block 值的语义并兼容既有约定；不要再简单背成“所有 Block 默认都在栈上”。

---

## 03：Block 捕获变量和循环引用怎么讲？

**口语答案：**

> Block 本质也是 OC 对象。它逃逸到作用域外时，一般会被拷贝到堆上，并持有它捕获到的对象。
>
> 捕获规则可以简单记：普通局部变量捕获的是值；对象变量默认会被强引用；`__block` 变量会被包装起来，所以 Block 内部可以修改它。
>
> 循环引用最常见的是控制器持有一个 Block，Block 里又直接使用 `self`。处理方式是在外面用 `__weak typeof(self) weakSelf = self`，Block 里需要保证执行期间对象不释放时，再临时转成 `strongSelf`。

**代码示例：**

```objc
// 循环引用场景：self -> block -> self
@property (nonatomic, copy) void (^myBlock)(void);

// 错误写法：循环引用
self.myBlock = ^{
    [self doSomething]; // self 持有 block，block 持有 self
};

// 正确写法：weakSelf + strongSelf
__weak typeof(self) weakSelf = self;
self.myBlock = ^{
    __strong typeof(weakSelf) strongSelf = weakSelf;
    if (!strongSelf) return;
    [strongSelf doSomething];
};
```

> **追问：** 什么情况下 Block 内不需要用 `weakSelf`？
>
> 答：Block 不被 self 持有时，比如局部临时 Block、GCD 延迟执行（执行完自动释放），不需要 weak。

> **追问：** `__block` 和 `__weak` 有什么区别？
>
> 答：`__block` 让变量在 Block 内可修改，且会被 Block 强引用；`__weak` 是弱引用，不阻止对象释放。

---

## 04：项目里出现内存泄漏，你怎么定位和修复？

**口语答案：**

> 我排查内存泄漏，核心看一个页面退出后，相关对象有没有释放。
>
> 开发阶段可以用 `MLeaksFinder`、`FBRetainCycleDetector` 这类工具提前发现问题；复杂场景用 Xcode 的 `Memory Graph` 看引用链，或者用 Instruments 的 `Leaks` 辅助定位。
>
> 修复时不是简单把所有地方改成 weak，而是先理清所有权。该强持有的继续强持有，只在反向引用、回调 Block、Timer、通知等容易形成闭环的位置打断引用。

> **追问：** `MLeaksFinder` 的原理是什么？
>
> 答：它会利用页面和容器生命周期 Hook，在对象按预期应该释放后延迟检查其存活状态，并继续沿视图层级提示可疑对象。页面暂时消失不一定代表应该销毁，所以结果仍需结合导航栈和业务生命周期确认。

> **追问：** `dealloc` 里需要做什么？
>
> 答：释放由当前对象持有的非 ARC 资源，并停止仍可能回调该对象的 Timer、任务或 block observer。旧式 KVO 和通知注册要按 API 契约解除；iOS 9+ selector 通知观察者通常会自动注销，block observer 仍要管理 token。ARC 下不能调用 `[super dealloc]`。

---

## 05：Runtime 的消息发送和消息转发流程是什么？

**口语答案：**

> OC 调方法本质是发消息，也就是 `objc_msgSend`。
>
> 查找方法时，会先查当前类的方法缓存，找不到再查方法列表，再沿着父类链继续找。还找不到时，Runtime 会给三次补救机会：第一步是动态方法解析 `resolveInstanceMethod:`；第二步是快速转发 `forwardingTargetForSelector:`；第三步是完整转发，先返回方法签名 `methodSignatureForSelector:`，再走 `forwardInvocation:`。
>
> 如果这些都处理不了，最后才会触发 `doesNotRecognizeSelector:` 崩溃。KVO、Swizzling、组件路由、消息转发代理，很多高级能力都基于这套机制。

**代码示例：消息转发三步**

```objc
// 第一步：动态方法解析
+ (BOOL)resolveInstanceMethod:(SEL)sel {
    if (sel == @selector(dynamicMethod)) {
        // 动态添加一个 C 函数作为方法实现
        class_addMethod(self, sel, (IMP)dynamicMethodIMP, "v@:");
        return YES;
    }
    return [super resolveInstanceMethod:sel];
}

void dynamicMethodIMP(id self, SEL _cmd) {
    NSLog(@"动态解析的方法被调用");
}

// 第二步：快速转发
- (id)forwardingTargetForSelector:(SEL)aSelector {
    if (aSelector == @selector(dynamicMethod)) {
        return self.helper; // 转发给其他对象
    }
    return [super forwardingTargetForSelector:aSelector];
}

// 第三步：完整转发
- (NSMethodSignature *)methodSignatureForSelector:(SEL)aSelector {
    if (aSelector == @selector(dynamicMethod)) {
        return [NSMethodSignature signatureWithObjCTypes:"v@:"];
    }
    return [super methodSignatureForSelector:aSelector];
}

- (void)forwardInvocation:(NSInvocation *)anInvocation {
    [anInvocation invokeWithTarget:self.helper];
}
```

> **追问：** 消息转发的性能开销大吗？
>
> 答：常规 `objc_msgSend` 有缓存，很快；但走到转发流程会有额外开销，高频调用路径不建议依赖转发。

> **追问：** `methodSignatureForSelector:` 返回 nil 会怎样？
>
> 答：直接触发 `doesNotRecognizeSelector:` 崩溃，不会进入 `forwardInvocation:`。

---

## 06：OC 对象的内存结构是什么？isa 指针有什么用？

**口语答案：**

> OC 对象在内存里可以简单理解为：前面是 `isa` 指针，后面是自己的成员变量数据。
>
> 实例对象的 `isa` 指向类对象，类对象里有实例方法、属性、协议等信息；类对象本身也是对象，它的 `isa` 指向元类，元类里主要存类方法。消息发送时，Runtime 就是通过 `isa` 找到类，再沿着类和父类链查找方法实现。
>
> 面试时不用死背所有源码结构，重点说清楚：`isa` 决定"这个对象属于哪个类"，`superclass` 决定"找不到方法时往哪一层父类找"。

> **追问：** `class` 和 `object_getClass` 有什么区别？
>
> 答：`[obj class]` 可能被重写返回假信息；`object_getClass(obj)` 直接取 `isa`，返回真实的类对象。

> **追问：** 元类的根元类是谁？
>
> 答：所有元类最终继承到 `NSObject` 的元类，它的 `isa` 指向自己，形成闭环。

---

## 07：Category 的原理是什么？为什么不能直接加成员变量？

**口语答案：**

> Category 是 Runtime 在加载阶段，把分类里的方法、协议、属性声明合并到原类上。
>
> 它不能真正新增成员变量，因为对象的内存布局在编译期就确定了，运行时不能随便改变每个对象占多大内存。所以分类里想"加属性"，本质是用关联对象 `objc_setAssociatedObject` 在对象外面挂一份数据。
>
> 分类里如果写了和原类同名的方法，表现上可能覆盖原方法，但加载顺序不适合作为业务依赖。实际项目里要尽量避免分类同名方法，否则排查问题很痛苦。

**代码示例：Category 添加属性**

```objc
// UIView+Frame.h
@interface UIView (Frame)
@property (nonatomic, assign) CGFloat x;
@property (nonatomic, copy, nullable) NSString *customTag;
@end

// UIView+Frame.m
#import <objc/runtime.h>

@implementation UIView (Frame)

- (void)setX:(CGFloat)x {
    CGRect frame = self.frame;
    frame.origin.x = x;
    self.frame = frame;
}

- (CGFloat)x {
    return self.frame.origin.x;
}

// 关联对象方式存储自定义属性
- (void)setCustomTag:(NSString *)customTag {
    objc_setAssociatedObject(self, @selector(customTag), customTag, OBJC_ASSOCIATION_COPY_NONATOMIC);
}

- (NSString *)customTag {
    return objc_getAssociatedObject(self, @selector(customTag));
}

@end
```

> **追问：** 关联对象的 key 用什么比较好？
>
> 答：推荐用 `@selector(xxx)` 或 `static char` 常量作为 key，避免字符串冲突；不要用局部变量指针。

> **追问：** 关联对象什么时候释放？
>
> 答：宿主对象 dealloc 时，Runtime 会自动清理该对象的所有关联对象。

---

## 08：+load 和 +initialize 有什么区别？

**口语答案：**

> `+load` 是类或分类被加载到 Runtime 时调用，发生在 main 函数前，调用很早，而且不走普通消息发送。
>
> `+initialize` 是类第一次收到消息时懒加载调用，走正常消息发送。如果子类没有实现，可能会触发父类的实现，所以通常要加 `if (self == [当前类 class])` 防止逻辑重复执行。
>
> 项目里我的原则是：`+load` 尽量少做事，尤其不要做耗时初始化；能放到业务启动流程里的，就不要塞进 `+load`。

> **追问：** `+load` 的调用顺序是什么？
>
> 答：父类的 `+load` 先于子类，类本身的 `+load` 先于附加到它的分类。不同镜像、不同分类之间的具体顺序不应作为业务契约，也不要依赖工程文件中的排列顺序。

> **追问：** `+initialize` 被子类继承会怎样？
>
> 答：子类没有实现 `+initialize` 时，会调用父类的实现，可能导致父类逻辑重复执行。需要加 `if (self == [XXX class])` 判断。

---

## 09：KVO 和 KVC 的原理、风险是什么？

**口语答案：**

> KVO 的核心是 Runtime 动态生成子类，并把被观察对象的 `isa` 指向这个子类。子类重写 setter，在赋值前后插入通知逻辑，所以通过 setter 改属性时，观察者能收到回调。
>
> 风险主要有三个：旧式字符串 API 重复移除或观察关系管理错误可能崩溃；直接修改成员变量通常不会触发自动 KVO；回调和观察者生命周期复杂时容易产生竞态。新代码优先使用返回观察 token 的 API 管理生命周期。
>
> KVC 是通过字符串 key 读写属性或成员变量，灵活但不安全。key 写错、类型不匹配、给非对象设 nil，都可能崩溃。所以业务里能用明确方法和属性访问时，不会优先用 KVC。

> **追问：** KVO 的自动触发和手动触发有什么区别？
>
> 答：自动触发由 Runtime 子类 setter 自动调用；手动触发需要重写 `automaticallyNotifiesObserversForKey:` 返回 NO，然后手动调 `willChangeValueForKey:` 和 `didChangeValueForKey:`。

> **追问：** KVC 取值时的查找顺序是什么？
>
> 答：普通 getter 先查找 `getKey`、`key`、`isKey`、`_getKey`；之后还可能检查集合访问器。如果允许直接访问成员变量，再按 `_key`、`_isKey`、`key`、`isKey` 查找，最终才进入 `valueForUndefinedKey:`。面试时应先说明 getter、集合和 ivar 是不同阶段。

---

## 10：GCD、锁、OperationQueue 怎么取舍？

**口语答案：**

> 线程安全先分清两件事：耗时任务要不要异步，以及共享数据会不会被并发读写。
>
> GCD 适合简单异步、回主线程、用串行队列保护单个资源；OperationQueue 适合任务之间有依赖、需要取消、需要控制最大并发数的场景；锁适合保护很小的临界区，比如 `os_unfair_lock`、`NSLock`、`NSRecursiveLock`。
>
> 常见坑是主队列同步派发会死锁；不要把大段耗时任务放在锁里；UI 更新必须回主线程。

**代码示例：经典 GCD 死锁**

```objc
// 死锁示例：在主队列同步派发到主队列
dispatch_sync(dispatch_get_main_queue(), ^{
    NSLog(@"这行永远不会执行");
});
// 原因：主队列是串行队列，当前任务还没执行完，又同步派发新任务，互相等待

// 安全写法：派发到其他队列
dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
    // 耗时任务
    dispatch_async(dispatch_get_main_queue(), ^{
        // 回主线程更新 UI
    });
});
```

> **追问：** `dispatch_barrier_async` 的作用是什么？
>
> 答：在自己创建的并发队列上，barrier 会等待之前提交的任务完成，再独占执行，之后的任务继续并发，常用于读多写少的状态保护。提交到系统全局并发队列时不能依赖同样的屏障语义。

> **追问：** `dispatch_once` 的原理是什么？
>
> 答：底层用原子操作 + `dispatch_once_t` 标记位保证 block 只执行一次，且线程安全。常用于单例。

---

# P1：高频加分题

## 11：__weak 的底层原理是什么？

**口语答案：**

> `weak` 的核心能力是：对象释放时，所有指向它的 weak 指针会自动变成 nil。
>
> Runtime 底层维护了一张弱引用表，可以简单理解为"对象地址 -> weak 指针地址列表"。当声明 weak 时，Runtime 把这个 weak 指针登记进去；对象 dealloc 时，再通过这张表找到所有 weak 指针并置空。
>
> 所以 weak 比普通指针更安全，但也不是零成本。高频使用 weak 时，通常会先转成 strong 临时变量，既避免对象中途释放，也减少重复 weak 访问。

> **追问：** weak 的性能开销体现在哪里？
>
> 答：读取 weak 需要通过 Runtime 的安全加载流程，在对象释放和置 nil 之间做同步，成本高于普通 strong 读取。一个作用域内需要多次使用时，可先安全提升为 strong 临时变量，同时保证本次使用期间对象存活。

---

## 12：AutoreleasePool 在什么场景需要主动关注？

**口语答案：**

> AutoreleasePool 解决的是“对象延迟释放”的问题，不是对象不释放。
>
> 主线程每轮 RunLoop 通常都会自动处理池子，所以日常 UI 代码不用手动写。但如果在一个循环里创建大量临时对象，比如批量解析数据、处理图片、读写文件，就应该在循环内部加 `@autoreleasepool`，避免临时对象堆到一轮 RunLoop 结束才释放，造成内存峰值过高。
>
> 后台长生命周期任务也要注意，如果没有合适的释放时机，就需要自己包一层 autoreleasepool。

---

## 13：RunLoop 的本质是什么？项目里什么时候会用到？

**口语答案：**

> RunLoop 本质是线程里的事件循环：有事件就处理，没事件就休眠，避免线程一直空转。
>
> 项目里常见关注点有三个：第一，Timer 加在默认模式时，列表滚动会切到 tracking 模式，Timer 可能暂停；第二，卡顿监控可以通过观察主线程 RunLoop 状态，发现长时间不进入休眠或不处理事件；第三，主线程自动释放池的释放时机也和 RunLoop 周期有关。
>
> 所以 RunLoop 不需要天天手写，但理解它能解释 Timer、卡顿、自动释放池这些问题。

---

## 14：Method Swizzling 的原理和风险是什么？

**口语答案：**

> Swizzling 本质是运行时交换两个方法的 IMP，也就是把 selector 对应的函数实现换掉。
>
> 它常用于埋点、Hook 生命周期、修复系统行为等场景，但风险很高。比如多个模块同时交换同一个方法，执行顺序不可控；子类没有实现方法时直接交换，可能误伤父类方法，影响其他子类。
>
> 真要用的话，要控制范围、保证只交换一次，并用 `class_addMethod` 处理子类未实现方法的情况。能用组合、代理、显式调用解决的，不优先用 Swizzling。

**代码示例：安全的 Method Swizzling**

```objc
@implementation UIViewController (Tracking)

+ (void)load {
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        Class class = [self class];
        SEL originalSel = @selector(viewDidLoad);
        SEL swizzledSel = @selector(sw_viewDidLoad);
        
        Method originalMethod = class_getInstanceMethod(class, originalSel);
        Method swizzledMethod = class_getInstanceMethod(class, swizzledSel);
        
        // 先尝试添加方法，防止子类没有实现时交换父类方法
        BOOL didAdd = class_addMethod(class,
                                       originalSel,
                                       method_getImplementation(swizzledMethod),
                                       method_getTypeEncoding(swizzledMethod));
        if (didAdd) {
            class_replaceMethod(class,
                                swizzledSel,
                                method_getImplementation(originalMethod),
                                method_getTypeEncoding(originalMethod));
        } else {
            method_exchangeImplementations(originalMethod, swizzledMethod);
        }
    });
}

- (void)sw_viewDidLoad {
    NSLog(@"viewDidLoad 被调用: %@", NSStringFromClass([self class]));
    [self sw_viewDidLoad]; // 此时已交换，实际调用原 viewDidLoad
}

@end
```

> **追问：** 为什么 Swizzling 要放在 `+load` 里？
>
> 答：`+load` 在 main 前执行，保证在业务代码运行前完成方法替换；放在 `+initialize` 里可能因为懒加载导致时序问题。

> **追问：** 多个 Category 都 Swizzling 同一个方法会怎样？
>
> 答：执行顺序取决于 Category 加载顺序，结果不可控，容易出现逻辑覆盖。应该尽量避免。

---

## 15：线上 Crash 和 OOM 你怎么排查？

**口语答案：**

> Crash 排查的核心是先拿到**符号化后的完整堆栈**，再结合用户路径、关键日志和版本信息判断是不是集中问题。
>
> 常规 Crash，比如数组越界、字典插 nil、unrecognized selector，通常可以直接从堆栈定位。野指针问题更麻烦，可以线下用 Zombie、Malloc Scribble、Address Sanitizer 辅助复现。
>
> OOM 一般没有普通崩溃堆栈，不能只靠 Crash 日志判断。需要看内存峰值、页面路径、大图加载、缓存增长和后台状态，重点治理图片、缓存、批量临时对象和大列表。

---

## 16：卡顿、列表、启动这些性能问题，你怎么优化？

**口语答案：**

> 性能优化先分阶段定位，不要一上来凭感觉改。
>
> 卡顿主要看主线程有没有在一帧时间内完成任务。线下用 Time Profiler、Core Animation 看 CPU 和渲染问题；线上可以用 FPS 或 RunLoop 卡顿监控抓主线程堆栈。列表优化重点是减少滚动时主线程工作，比如提前计算布局和高度、复用 Cell、异步解码图片、控制图层层级和离屏渲染。
>
> 启动优化分 pre-main 和 post-main。pre-main 少做动态库和 `+load` 耗时逻辑；post-main 把非首屏必须的 SDK、网络和业务初始化延后或异步，先保证首屏能尽快展示。

---

## 17：离屏渲染的原理和优化

**口语答案：**

> 离屏渲染是指 GPU 在当前屏幕缓冲区之外，额外开辟一块离屏缓冲区来渲染图层，然后再合成回屏幕缓冲区。这比普通渲染多了创建缓冲区和上下文切换的开销，容易导致帧率下降。
>
> 可能触发离屏渲染的场景包括复杂 mask、无法确定路径的动态阴影、组透明以及部分裁剪组合。现代系统会优化常见圆角，`cornerRadius + masksToBounds` 不能再绝对判断为一定离屏，必须结合系统版本、图层内容和实际检测结果确认。
>
> 优化方式：阴影优先提供 `shadowPath`，避免每帧推导阴影轮廓；复杂静态效果可以预渲染；列表中减少不必要的 mask、透明叠加和图层数量。`CAShapeLayer` 作为 mask 本身也可能产生额外合成，不能把它当作通用解法。

> **追问：** `clipsToBounds` 和 `masksToBounds` 有什么区别？
>
> 答：`clipsToBounds` 是 UIView 层的接口，底层对应 layer 的 `masksToBounds`，都表示裁剪超出边界的内容；是否产生离屏渲染取决于图层组合和系统优化，不能只凭这两个属性下结论。

> **追问：** 如何检测离屏渲染？
>
> 答：模拟器 Debug -> Color Off-screen Rendered，黄色标记的就是离屏渲染图层；也可以用 Instruments 的 Core Animation 工具。

---

## 18：App 包体积优化

**口语答案：**

> 包体积优化主要从三个方向入手：资源、代码、编译选项。
>
> 资源方面：用 Asset Catalog 管理图片并利用 App Thinning，清理未使用和重复资源，音视频按业务需要下载；PDF 矢量资源仍要关注编译后的实际产物。代码方面：开启 Strip 与 Dead Code Stripping，分析重复三方库、静态库和 Swift 泛型膨胀。编译选项可以评估 `-Osize`，Bitcode 已不再是当前 iOS 提交流程的优化项。
>
> 重点是先分析再优化，用 `LinkMap` 文件分析各模块占用体积，找到大头再针对性处理。

> **追问：** Asset Catalog 相比直接放图片有什么优势？
>
> 答：可以统一管理倍率、设备和外观变体，并配合 App Thinning 生成目标设备需要的资源。On-Demand Resources 需要单独配置资源标签和下载策略，不是把图片放进 Asset Catalog 就自动按需下载。

> **追问：** `LinkMap` 文件是什么？怎么用？
>
> 答：编译后生成的链接映射文件，记录每个 .o 文件和符号占用的体积。开启 `Write Link Map File` 后在 DerivedData 目录下找到，分析大模块和未使用符号。

---

## 19：启动优化（pre-main 和 post-main）

**口语答案：**

> 启动优化要先分清两个阶段。
>
> **pre-main 阶段**（从进程创建到 `main()` 调用）：
> - 加载镜像：动态库和初始化工作越多，启动成本通常越高。优化应以实际启动测量为依据，减少非必要动态库和启动期初始化。
> - Rebase & Bind：修复指针和符号引用。优化：减少 ObjC 类和分类数量，清理无用类。
> - ObjC Setup：注册类和分类并执行 `+load`。优化重点是移除 `+load` 中的重活，改为显式、可测量的启动任务或真正按需初始化；不能笼统改成 `+initialize`，否则可能把耗时转移到首次消息路径。
>
> **post-main 阶段**（从 `main()` 到首屏展示）：
> - 首屏必须的初始化同步做，非首屏的延后或异步。
> - SDK 初始化按优先级分批：Crash 监控同步初始化，网络、推送等异步初始化。
> - 首页数据请求提前到启动时，用缓存先展示再刷新。
> - 避免首屏加载大图、复杂布局计算。
>
> 测量优先使用 Instruments 的 App Launch、Xcode Organizer 启动指标、`os_signpost` 和 MetricKit。`DYLD_PRINT_STATISTICS` 可作为特定环境下的辅助信息，但不能替代真机与线上启动数据。

**pre-main 关键阶段示意图：**

```
dylib loading (加载动态库)
    ↓
rebase & bind (修复指针)
    ↓
ObjC setup (注册类/分类，执行 +load)
    ↓
initializer (C++ 静态构造函数)
    ↓
main()
```

> **追问：** 怎么知道 pre-main 阶段哪些 `+load` 耗时？
>
> 答：`OBJC_PRINT_LOAD_METHODS=YES` 可以帮助确认哪些类和分类执行了 `+load`，但不会直接给出每个方法的可靠耗时。耗时定位应结合 Instruments、符号化采样或受控埋点，并避免为了测量大范围 Swizzle `+load`。

> **追问：** 首页数据请求怎么提前到启动时？
>
> 答：先确认请求是否真的阻塞首屏数据，再决定在启动流程的哪个阶段预加载。网络请求可以尽早异步发起，但不能增加主线程同步工作；首屏优先读取缓存，请求返回后增量更新，并用启动指标验证收益。

---

# 背诵建议

1. P0 十题必须能稳定讲出来，P1 根据自己项目经历补强。
2. 每题只记三个关键词，不背长段落。
3. 不确定源码细节时，不要硬讲；把“机制、项目用法、风险”说清楚即可。
4. 面试官追问时，再展开具体工具或源码名词。
