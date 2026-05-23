# 📱 高级iOS精选面试题集

> **目标**：学完必备部分，能应对90%的高级iOS面试；学完加分部分，能冲击大厂offer
> 
> **更新时间**：2024年

---

## 📋 目录总览

| 分类 | 必备题 | 加分题 |
|------|--------|--------|
| 内存管理 | 3题 | 2题 |
| Block | 3题 | 2题 |
| 多线程 | 3题 | 2题 |
| 性能优化 | 3题 | 2题 |
| 架构设计 | 3题 | 2题 |
| Runtime | - | 3题 |
| KVO/KVC | - | 2题 |
| 离屏渲染 | - | 2题 |

---

# 📌 第一部分：必备题目（必会）

## 一、内存管理（3题）

### 题目1：ARC和MRC的区别是什么？ARC是垃圾回收吗？

**口语答案：**

> "ARC不是垃圾回收，它是**编译期**的内存管理机制。
>
> MRC需要我们手动写retain、release、autorelease来管理引用计数，容易写错导致内存泄漏或野指针。
>
> ARC是LLVM编译器在**编译时**自动帮我们在合适的位置插入retain和release，本质上还是引用计数，只是编译器帮我们算了。
>
> 两者的区别：
> 1. MRC手动管理，ARC自动插入
> 2. ARC禁止调用retain/release/retainCount
> 3. ARC下我们只需要用strong、weak、copy这些属性关键字来声明所有权语义
>
> 所以ARC是编译器特性，不是运行时的垃圾回收，不会像Java那样有STW（Stop The World）的问题。"

---

### 题目2：strong、weak、copy、assign有什么区别？各自使用场景是什么？

**口语答案：**

> "这四个是属性修饰符，用来声明对象的所有权关系：
>
> **strong**：
> - 默认修饰符，持有对象，会让引用计数+1
> - 场景：大部分对象属性都用strong，比如VC持有View、Model
>
> **weak**：
> - 不持有对象，引用计数不变，对象释放后自动置nil
> - 场景：delegate、IBOutlets、避免循环引用的地方
>
> **copy**：
> - 会拷贝一份新对象，常用于NSString、NSArray、Block
> - 场景：防止外部修改影响内部，比如NSString属性用copy，别人传NSMutableString进来不会影响你
>
> **assign**：
> - 直接赋值，不涉及引用计数，用于基本数据类型
> - 场景：NSInteger、CGFloat、BOOL这些，或者不希望持有对象的地方（但现在基本用weak代替了）
>
> 举个例子：
> ```objc
> @property (nonatomic, strong) NSArray *dataList;
> @property (nonatomic, weak) id<MyDelegate> delegate;
> @property (nonatomic, copy) NSString *name;
> @property (nonatomic, assign) NSInteger age;
> ```"

---

### 题目3：什么是循环引用？你在项目中怎么排查和解决的？

**口语答案：**

> "循环引用就是A持有B，B又持有A，两者互相强引用，导致引用计数永远无法归零，内存无法释放。
>
> 常见场景：
> 1. **Block持有self**：VC持有Block，Block里又用了self
> 2. **delegate用strong**：A.delegate = B，B又强持有A
> 3. **Timer**：VC持有Timer，Timer的target又是VC
>
> 解决方案：
> 1. **Block循环引用**：用__weak typeof(self) weakSelf = self; 或者 __weak __typeof(self)weakSelf = self;
> 2. **delegate**：声明为weak
> 3. **Timer**：在dealloc里调用invalidate，或者用GCD Timer
>
> 排查工具：
> 1. **Xcode Memory Graph**：运行时查看对象引用关系图，能直观看到循环
> 2. **Instruments的Leaks**：能检测到泄漏的内存块
> 3. **Debug Memory Graph**：暂停后查看当前内存中的对象
>
> 我平时的流程是：发现内存持续增长 -> 用Memory Graph定位泄漏对象 -> 查看谁持有了它 -> 打断循环引用。"

---

## 二、Block（3题）

### 题目1：Block的底层数据结构是什么？它捕获变量的原理是什么？

**口语答案：**

> "Block本质上是一个OC对象，底层是`__block_impl`结构体，里面有一个isa指针，所以它能响应消息。
>
> 它捕获变量的原理是：
> - **局部变量**：Block创建时会**拷贝**一份到Block自己的内存空间，是值传递，所以在Block里修改不影响外部
> - **对象类型**：会对对象发送retain，增加引用计数（ARC下由编译器处理）
> - **全局变量**：不捕获，直接访问
> - **静态变量**：捕获的是指针，所以能在Block里修改
>
> 如果想在Block里修改局部变量，需要用`__block`修饰，这样编译器会把这个变量包装成一个对象，Block捕获的是这个对象的指针。
>
> 举个例子：
> ```objc
> int a = 10;
> __block int b = 20;
> void (^block)(void) = ^{
>     // a = 100; // 报错
>     b = 200;    // 可以修改
> };
> block();
> // 此时b = 200
> ```"

---

### 题目2：__block的作用是什么？它底层是怎么实现的？

**口语答案：**

> "`__block`的作用是让Block能捕获并修改外部的局部变量。
>
> 底层实现原理：
> 编译器会把`__block`变量包装成一个`__Block_byref_xxx`结构体，这个结构体里包含：
> 1. 变量的值
> 2. 一个forwarding指针（指向自己，用于处理拷贝）
> 3. 引用计数
>
> Block捕获的不是变量本身，而是这个结构体的**指针**，所以能在Block内部修改。
>
> 另外，`__block`变量在MRC下不会被自动retain，但在ARC下会被retain，所以ARC下用`__block`并不能避免循环引用，要用`__weak`。
>
> 简单说：`__block` = 把变量升级成堆上的对象 + 捕获指针"

---

### 题目3：Block的内存区域在哪里？什么情况下Block会从栈拷贝到堆？

**口语答案：**

> "Block的内存分配有三种情况：
>
> 1. **栈Block**（Stack Block）：
>    - 没有捕获变量的Block，或者在MRC下创建的Block
>    - 生命周期随栈帧结束而销毁
>
> 2. **堆Block**（Heap Block）：
>    - 经过copy操作后的Block
>    - 生命周期由引用计数管理
>
> 3. **全局Block**（Global Block）：
>    - 没有捕获任何外部变量的Block
>    - 存在数据段，不会被销毁
>
> **什么情况下会从栈拷贝到堆？**
>
> 1. 调用Block的copy方法
> 2. Block作为函数返回值
> 3. Block赋值给strong/retain属性
> 4. 在Block里捕获了__block变量（ARC下会自动copy）
>
> 为什么要copy到堆？因为栈上的Block在作用域结束就销毁了，如果后续还要用这个Block，必须copy到堆上延长生命周期。
>
> 所以在ARC下，我们通常用strong来持有Block，编译器会自动帮我们copy。"

---

## 三、多线程（3题）

### 题目1：iOS中有哪些多线程方案？你平时用哪种？为什么？

**口语答案：**

> "iOS的多线程方案主要有：
>
> 1. **Pthreads**：
>    - POSIX标准，C语言API，跨平台
>    - 太底层，日常开发基本不用
>
> 2. **NSThread**：
>    - 轻量级，面向对象
>    - 需要自己管理线程生命周期，用的不多
>
> 3. **GCD**：
>    - C语言API，自动管理线程生命周期
>    - 有队列和任务的概念，使用最广泛
>    - 我平时主要用GCD
>
> 4. **NSOperationQueue**：
>    - OC封装，基于GCD
>    - 支持依赖关系、最大并发数、取消任务
>    - 适合复杂任务调度
>
> **我平时主要用GCD**，因为：
> 1. 性能最好，直接系统调度
> 2. API简洁，一个dispatch_async搞定
> 3. 支持串行/并发队列，读写锁，dispatch_group等
>
> 只有在需要任务依赖、取消、优先级这些高级功能时才用NSOperationQueue。"

---

### 题目2：GCD中串行队列、并发队列、主队列、全局队列有什么区别？

**口语答案：**

> "这四个概念要分清：
>
> **串行队列（Serial Queue）**：
> - 任务一个接一个执行，前一个完成才执行下一个
> - 适合同步操作，比如数据库读写、文件写入
>
> **并发队列（Concurrent Queue）**：
> - 多个任务可以同时执行
> - 适合不需要顺序的任务
>
> **主队列（Main Queue）**：
> - 特殊的串行队列，任务在主线程执行
> - 用于UI操作
>
> **全局队列（Global Queue）**：
> - 系统提供的并发队列，有四个优先级
> - 平时最常用的`dispatch_get_global_queue(QOS_CLASS_DEFAULT, 0)`
>
> 区别总结：
>
> | 队列类型 | 串行/并发 | 执行线程 |
> |---------|----------|---------|
> | 自己创建的串行队列 | 串行 | 子线程 |
> | 自己创建的并发队列 | 并发 | 子线程 |
> | 主队列 | 串行 | 主线程 |
> | 全局队列 | 并发 | 子线程 |
>
> 使用建议：
> - 耗时操作：全局队列 + async
> - UI操作：主队列 + async（或直接performSelectorOnMainThread）
> - 线程同步：自定义串行队列"

---

### 题目3：dispatch_once的原理是什么？为什么能保证线程安全？

**口语答案：**

> "dispatch_once用来保证某个代码块在程序运行期间只执行一次，常用于单例。
>
> 底层原理：
>
> 1. **使用原子操作**：
>    - 内部用`dispatch_once_t`（本质是long类型）作为标记
>    - 用原子操作（Atomic）来读写这个标记，保证多线程安全
>
> 2. **三个状态**：
>    - 0：未执行
>    - 1：正在执行
>    - -1：已执行完成
>
> 3. **执行流程**：
>    - 先用原子操作读取标记
>    - 如果是0（未执行），用原子操作CAS改成1（正在执行）
>    - 执行Block
>    - 执行完改成-1
>    - 如果其他线程进来发现是1，会等待（用信号量）
>    - 如果是-1，直接跳过
>
> 为什么线程安全？
> - 用的是**原子操作**，不是锁
> - 原子操作是CPU指令级别的，不会被打断
> - 比加锁性能更好
>
> ```objc
> + (instancetype)sharedInstance {
>     static MyClass *instance = nil;
>     static dispatch_once_t onceToken;
>     dispatch_once(&onceToken, ^{
>         instance = [[MyClass alloc] init];
>     });
>     return instance;
> }
> ```"

---

## 四、性能优化（3题）

### 题目1：你平时做性能优化主要从哪几个方面入手？

**口语答案：**

> "我平时做性能优化主要关注这几个方面：
>
> **1. 启动优化**：
> - main()之前：减少+load方法、减少动态库
> - main()之后：把非必要任务延后，用异步加载
>
> **2. 卡顿优化**：
> - 主线程耗时操作移到子线程
> - 减少离屏渲染
> - Cell高度预计算和缓存
>
> **3. 内存优化**：
> - 及时处理循环引用
> - 大图用缩略图，避免全尺寸加载
> - 监控内存警告，及时释放缓存
>
> **4. 包体积优化**：
> - 图片用WebP格式
> - 删除无用代码、资源
> - 编译优化选项
>
> **5. 网络优化**：
> - 数据压缩
> - 缓存策略
> - 减少请求次数
>
> 我的流程是：
> 1. 用Instruments定位瓶颈（Time Profiler、Core Animation）
> 2. 分析具体原因
> 3. 针对性优化
> 4. 验证效果"

---

### 题目2：tableView的优化你做了哪些？

**口语答案：**

> "tableView优化我做了这些：
>
> **1. Cell复用**：
> - 正确使用reuseIdentifier
> - 注册Cell用registerClass
>
> **2. 高度缓存**：
> - 提前计算好Cell高度，存到字典或Model里
> - 避免每次 heightForRowAtIndexPath 都重新计算
>
> **3. 异步绘制**：
> - 图片下载用SDWebImage，异步+缓存
> - 复杂UI用异步绘制（drawRect在子线程）
>
> **4. 减少层级**：
> - 尽量扁平化，减少subview嵌套
> - 不要透明视图叠加（会导致离屏渲染）
>
> **5. 预加载**：
> - 用prefetchDataSource预加载下一页数据
> - 图片预加载
>
> **6. 按需加载**：
> - 滚动时不加载图片，停止时再加载
>
> **7. 减少动画**：
> - 尽量用transform，不要改frame
> - 动画用CABasicAnimation，性能更好
>
> 效果：之前有个列表页滑动帧率只有40fps，优化后稳定在58-60fps。"

---

### 题目3：什么是卡顿？你怎么监控和排查卡顿问题？

**口语答案：**

> "卡顿就是主线程在1/60秒（16.67ms）内没有完成渲染，导致掉帧。
>
> **监控卡顿的方法：**
>
> 1. **CADisplayLink**：
>    - 创建一个和屏幕刷新率同步的定时器
>    - 如果某次回调间隔超过16.67ms，说明掉帧了
>
> 2. **子线程监控**：
>    - 在子线程定时向主线程发消息
>    - 如果主线程超过一定时间没响应，说明卡顿了
>    - 可以记录当时的堆栈信息
>
> 3. **RunLoop监控**：
>    - 监听RunLoop的状态变化
>    - 如果长时间停留在某个状态，说明卡顿
>
> **排查卡顿的方法：**
>
> 1. **Instruments的Time Profiler**：
>    - 看哪个函数耗时最长
>    - 能看到调用栈和耗时占比
>
> 2. **主线程检查**：
>    - 打印主线程堆栈，看卡在哪里
>
> 3. **常见原因**：
>    - 同步网络请求
>    - 大量数据处理
>    - 复杂计算
>    - 频繁IO操作
>    - 布局计算过多
>
> 我之前遇到一个卡顿是：Cell里同步下载图片，改成异步+缓存后就好了。"

---

## 五、架构设计（3题）

### 题目1：你了解哪些iOS架构模式？它们各自优缺点是什么？

**口语答案：**

> "我了解这几种架构：
>
> **MVC**：
> - Apple推荐，Controller负责协调View和Model
> - 优点：简单，上手快
> - 缺点：Controller容易臃肿（Massive View Controller）
>
> **MVP**：
> - 引入Presenter层，Controller只负责转发
> - 优点：逻辑清晰，便于测试
> - 缺点：代码量增加，Presenter容易变大
>
> **MVVM**：
> - 引入ViewModel，负责业务逻辑和数据转换
> - 优点：
>   - Controller瘦身
>   - 数据绑定（RAC/Combine）
>   - 便于单元测试
> - 缺点：
>   - 数据绑定有学习成本
>   - 小项目可能过度设计
>
> **VIPER**：
> - View、Interactor、Presenter、Entity、Router
> - 优点：职责单一，适合大型项目
> - 缺点：代码量大，小团队维护成本高
>
> **我平时主要用MVVM**，因为：
> 1. 能有效瘦身Controller
> 2. 配合RAC/Combine数据绑定很方便
> 3. 便于写单元测试
> 4. 团队熟悉度高"

---

### 题目2：你在项目中用MVVM是怎么划分的？有什么踩坑经验？

**口语答案：**

> "我们项目MVVM的划分：
>
> **View层**：
> - UIView/UITableViewCell的子类
> - 只负责UI显示，不处理业务逻辑
> - 通过绑定或代理把事件传给ViewModel
>
> **ViewModel层**：
> - 负责业务逻辑处理
> - 数据转换（Model转成View能直接显示的数据）
> - 网络请求
> - 持有Model
>
> **Model层**：
> - 纯数据模型
> - 只有属性，没有业务逻辑
>
> **举个例子**：
> ```objc
> // UserViewModel
> @interface UserViewModel : NSObject
> @property (nonatomic, strong) User *user;
> @property (nonatomic, copy) NSString *displayName; // 转换后的显示名
> @property (nonatomic, strong) RACCommand *fetchUserCommand;
> @end
>
> // 在Controller里
> self.nameLabel.text = self.viewModel.displayName;
> [self.viewModel.fetchUserCommand execute:nil];
> ```
>
> **踩坑经验**：
>
> 1. **ViewModel太大**：
>    - 解决：拆分成多个小ViewModel，或用Service层处理网络
>
> 2. **循环引用**：
>    - ViewModel里用Block回调容易循环引用
>    - 解决：用weak-strong dance
>
> 3. **数据绑定难调试**：
>    - RAC绑定出问题难排查
>    - 解决：加日志，用RAC的debug方法
>
> 4. **团队规范不统一**：
>    - 有人把逻辑写在Controller，有人写在ViewModel
>    - 解决：制定规范，Code Review"

---

### 题目3：你是怎么做组件化的？路由方案怎么设计的？

**口语答案：**

> "我们项目的组件化是这样做的：
>
> **组件化的目的**：
> - 解耦，模块独立开发
> - 编译速度提升（不用全量编译）
> - 便于多人协作
>
> **路由方案设计**：
>
> 我们用的是**URL路由 + Protocol**的方案：
>
> 1. **URL路由**：
>    ```objc
>    [MGJRouter registerURLPattern:@"mgj://detail" toHandler:^(NSDictionary *routerParamters) {
>        // 打开详情页
>    }];
>
>    [MGJRouter openURL:@"mgj://detail?id=123"];
>    ```
>
> 2. **Protocol方案**：
>    - 定义Protocol，各模块实现
>    - 通过服务发现获取实现类
>    ```objc
>    // 定义
>    @protocol UserServiceProtocol <NSObject>
>    - (UIViewController *)userDetailVCWithId:(NSString *)userId;
>    @end
>
>    // 使用
>    id<UserServiceProtocol> service = [[ModuleManager sharedInstance] serviceForProtocol:@protocol(UserServiceProtocol)];
>    UIViewController *vc = [service userDetailVCWithId:@"123"];
>    ```
>
> **踩坑经验**：
> 1. URL硬编码容易出错：用常量管理
> 2. 参数传递复杂：用字典封装
> 3. 循环依赖：用中间件解耦"

---

# ⭐ 第二部分：加分题目（冲击大厂）

## 六、Runtime（3题）

### 题目1：Runtime的消息发送机制是什么？objc_msgSend做了什么？

**口语答案：**

> "OC的方法调用最终都会转换成`objc_msgSend`，它的工作流程是：
>
> 1. **消息发送阶段**：
>    - 根据selector去查找IMP（方法实现）
>    - 先在当前类的**方法缓存**（cache）里找
>    - 找到了就直接调用，很快（O(1)）
>    - 没找到就去**方法列表**（method_list）里找
>
> 2. **方法解析阶段**：
>    - 如果本类找不到，沿着**继承链**（父类->NSObject）一直找
>    - 找到就调用
>    - 找不到就进入**动态方法解析**
>
> 3. **动态方法解析**：
>    - 调用`+resolveInstanceMethod:`或`+resolveClassMethod:`
>    - 你有机会在这里动态添加方法
>
> 4. **消息转发**：
>    - 如果还是没处理，调用`-forwardingTargetForSelector:`，可以把消息转发给其他对象
>    - 最后调用`-forwardInvocation:`，这是最后的机会
>
> 5. **报错**：
>    - 如果都没处理，抛出`unrecognized selector`异常
>
> 所以OC的方法调用是**动态**的，可以在运行时添加、替换、转发，这是它和C++静态绑定的最大区别。"

---

### 题目2：Method Swizzling是什么？你用过吗？有什么坑？

**口语答案：**

> "Method Swizzling是Runtime提供的一种方法交换技术，可以在运行时替换方法的实现。
>
> **原理**：
> - 每个类有一个方法列表，方法由SEL（方法名）和IMP（实现指针）组成
> - Swizzling就是交换两个SEL对应的IMP
>
> **使用场景**：
> 1. 埋点统计：交换viewDidLoad、viewWillAppear，无侵入添加统计
> 2. 修复系统Bug：比如iOS 10的UIDatePicker崩溃
> 3. 全局配置：比如统一修改UIAppearance
>
> **代码示例**：
> ```objc
> + (void)load {
>     Method original = class_getInstanceMethod(self, @selector(viewDidLoad));
>     Method swizzled = class_getInstanceMethod(self, @selector(my_viewDidLoad));
>     method_exchangeImplementations(original, swizzled);
> }
>
> - (void)my_viewDidLoad {
>     [self my_viewDidLoad]; // 这里看起来是递归，实际调用的是原来的viewDidLoad
>     // 添加自定义代码
>     NSLog(@"viewDidLoad called");
> }
> ```
>
> **坑**：
>
> 1. **+load里执行**：
>    - 必须在+load里，不能在+initialize，因为+initialize可能不调用
>
> 2. **交换父类方法**：
>    - 如果子类没实现，会交换到父类的方法，影响所有子类
>    - 解决：用class_addMethod先添加再交换
>
> 3. **多次交换**：
>    - 如果多个地方交换同一个方法，结果会乱
>    - 解决：统一管理，或者用dispatch_once保证只执行一次
>
> 4. **死循环**：
>    - 如果写成`[self viewDidLoad]`而不是`[self my_viewDidLoad]`，会死循环
>    - 因为交换后my_viewDidLoad的IMP已经是原来的viewDidLoad了"

---

### 题目3：Category的实现原理是什么？为什么Category不能添加属性？

**口语答案：**

> "Category的实现原理：
>
> **1. 编译时**：
> - Category会被编译成`category_t`结构体
> - 里面有方法列表、协议列表、属性列表
>
> **2. 运行时加载**：
> - Runtime会把Category的方法、协议、属性**合并**到主类的方法列表里
> - 合并到列表的**最前面**，所以会覆盖主类同名方法（不是替换，是顺序在前）
>
> **为什么Category不能添加属性？**
>
> 准确说：**可以声明属性，但不会自动生成实例变量和getter/setter**。
>
> 原因：
> 1. 主类的实例变量布局在**编译时**就确定了
> 2. Category是**运行时**才合并的
> 3. 如果Category能添加实例变量，会改变对象的内存布局，导致所有子类和已有实例都出问题
>
> **怎么解决？**
>
> 用**关联对象（Associated Object）**：
> ```objc
> - (void)setName:(NSString *)name {
>     objc_setAssociatedObject(self, "name", name, OBJC_ASSOCIATION_COPY_NONATOMIC);
> }
>
> - (NSString *)name {
>     return objc_getAssociatedObject(self, "name");
> }
> ```
>
> 这样就能在Category里"添加属性"了，本质是用Runtime的关联对象能力。"

---

## 七、KVO/KVC（2题）

### 题目1：KVO的实现原理是什么？它是怎么做到自动通知的？

**口语答案：**

> "KVO（Key-Value Observing）的实现原理是**ISA Swizzling**（isa指针交换）：
>
> **当给对象添加观察者时（addObserver）**：
>
> 1. Runtime会动态创建一个**中间类**，命名是`NSKVONotifying_原类名`
> 2. 把这个中间类的**isa指针**指向它（isa swizzling）
> 3. 这个中间类继承自原类
> 4. 重写了被观察属性的**setter方法**
>
> **当属性值改变时**：
>
> 1. 调用setter
> 2. 实际调用的是中间类重写的setter
> 3. 里面会调用`willChangeValueForKey:`
> 4. 调用原来的setter
> 5. 调用`didChangeValueForKey:`
> 6. 在didChange里通知所有观察者
>
> **验证方法**：
> ```objc
> Person *p = [[Person alloc] init];
> [p addObserver:self forKeyPath:@"name" options:... context:...];
>
> // 打印isa
> NSLog(@"%@", object_getClass(p));
> // 输出：NSKVONotifying_Person（中间类）
>
> // 打印方法
> NSLog(@"%@", class_getMethodImplementation(object_getClass(p), @selector(setName:)));
> ```
>
> **这也是为什么KVO只能用setter触发，直接改实例变量不会触发通知**。"

---

### 题目2：KVO的坑有哪些？你是怎么处理的？

**口语答案：**

> "KVO有几个常见的坑：
>
> **1. 必须手动移除观察者，否则会崩溃**：
> - 原因：对象销毁后，通知还会发送，找不到观察者就crash
> - 解决：在dealloc里removeObserver
> - iOS 11后系统优化了，不移除也不会crash，但还是建议移除
>
> **2. 重复添加会通知多次**：
> - 添加几次，通知就触发几次
> - 解决：用标记保证只添加一次
>
> **3. 直接改成员变量不触发**：
> - KVO只监听setter，`_name = @"xxx"`不会触发
> - 解决：用setter或者手动调用will/didChangeValueForKey
>
> **4. 监听可变数组不触发**：
> - NSMutableArray的addObject不触发KVO
> - 解决：用mutableArrayValueForKey，或者手动触发
>    ```objc
>    [self willChangeValueForKey:@"list"];
>    [self.list addObject:item];
>    [self didChangeValueForKey:@"list"];
>    ```
>
> **5. 性能问题**：
> - 大量对象同时KVO会影响性能
> - 解决：评估是否真的需要KVO，可以用通知或Block替代
>
> **我项目中的做法**：
> - 封装一个KVO工具类，自动管理addObserver/removeObserver
> - 用Block回调，不用delegate那种方式
> - 或者直接用RAC的RACObserve，更安全"

---

## 八、离屏渲染（2题）

### 题目1：什么是离屏渲染？哪些操作会触发离屏渲染？

**口语答案：**

> "离屏渲染是指GPU在当前屏幕缓冲区之外，**额外开辟一个缓冲区**来渲染，然后再合成到屏幕。
>
> **为什么会离屏渲染？**
>
> 有些效果需要对同一像素多次处理，比如：
> - 先画阴影
> - 再画圆角
> - 最后合成
>
> 这种多Pass渲染需要一个临时缓冲区。
>
> **触发离屏渲染的操作**：
>
> 1. **cornerRadius + masksToBounds**：
>    - 设置圆角+裁剪，最常见
>    - 注意：只有这两个同时设置才会触发
>
> 2. **shadow**：
>    - 设置阴影，系统不知道阴影的形状，需要先渲染一遍获取形状
>
> 3. **mask（蒙版）**：
>    - 设置maskView，需要两层混合
>
> 4. **allowsGroupOpacity**：
>    - 设置透明度，子视图需要混合
>
> 5. **shouldRasterize（光栅化）**：
>    - 主动开启离屏渲染，把结果缓存起来
>
> **怎么检测？**
>
> - 模拟器：Debug -> Color Off-screen Rendered（黄色就是离屏渲染）
> - 真机：Instruments的Core Animation，勾选Color Offscreen-Rendered"

---

### 题目2：圆角优化有哪些方案？

**口语答案：**

> "圆角优化主要有这几种方案：
>
> **方案1：不触发离屏渲染的组合**：
> ```objc
> // 只设置圆角，不裁剪，不触发离屏渲染
> view.layer.cornerRadius = 10;
> // 不设置 masksToBounds = YES
> ```
> - 适用：背景是纯色，不需要裁剪
>
> **方案2：CAShapeLayer + UIBezierPath**：
> ```objc
> CAShapeLayer *maskLayer = [CAShapeLayer layer];
> maskLayer.path = [UIBezierPath bezierPathWithRoundedRect:view.bounds
>                                         cornerRadius:10].CGPath;
> view.layer.mask = maskLayer;
> ```
> - 不触发离屏渲染
> - 性能比方案1好
>
> **方案3：图片叠加遮罩**：
> - 用一张带圆角的图片覆盖在上面
> - 视觉上是圆角，但没有实际裁剪
>
> **方案4：Core Graphics绘制**：
> ```objc
> - (UIImage *)roundedImage {
>     UIGraphicsBeginImageContextWithOptions(self.size, NO, 0);
>     [[UIBezierPath bezierPathWithRoundedRect:CGRectMake(0, 0, self.size.width, self.size.height)
>                                  cornerRadius:10] addClip];
>     [self drawInRect:CGRectMake(0, 0, self.size.width, self.size.height)];
>     UIImage *image = UIGraphicsGetImageFromCurrentImageContext();
>     UIGraphicsEndImageContext();
>     return image;
> }
> ```
> - 用CPU绘制圆角图片，图片下载后处理一次就行
>
> **方案5：iOS 13+的continuousCorners**：
> ```objc
> view.layer.cornerCurve = kCACornerCurveContinuous;
> ```
> - 系统级优化，性能更好
>
> **我项目中的做法**：
> - 图片圆角：方案4，下载后绘制一次
> - View圆角：方案2或方案5
> - Cell头像：方案4，提前缓存圆角图片"

---

# 📊 学习建议

## 第一阶段：必备题目（1-2周）

| 优先级 | 内容 | 时间 |
|--------|------|------|
| ⭐⭐⭐ | 内存管理（3题） | 2天 |
| ⭐⭐⭐ | Block（3题） | 2天 |
| ⭐⭐⭐ | 多线程（3题） | 2天 |
| ⭐⭐ | 性能优化（3题） | 2天 |
| ⭐⭐ | 架构设计（3题） | 2天 |

## 第二阶段：加分题目（1-2周）

| 优先级 | 内容 | 时间 |
|--------|------|------|
| ⭐⭐⭐ | Runtime（3题） | 3天 |
| ⭐⭐ | KVO/KVC（2题） | 2天 |
| ⭐⭐ | 离屏渲染（2题） | 2天 |

---

# 🎯 面试技巧

1. **先说结论**：一句话概括，再展开细节
2. **举例子**：结合项目经验，不是背书
3. **会就是会，不会就说不会**：诚实比瞎编好
4. **主动延伸**：答完可以补充"我在项目中遇到过..."
5. **注意时间**：每题控制在1-2分钟
