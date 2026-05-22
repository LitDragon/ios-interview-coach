# iOS 深水主题卡：一个下载/播放/直播模块怎么设计状态机

## 主题

一个下载/播放/直播模块怎么设计状态机

## 面试官常问法

> 如果让你设计一个下载模块的状态机，你会怎么设计？播放器呢？直播呢？

## 核心回答

我不会用一堆 `if-else` 或散落的 `BOOL` 标记来管理状态，而是用**有限状态机（FSM）**统一管理。核心是三件事：**定义状态**、**定义事件**、**定义转移规则**。

状态机让状态转换可预测、可追踪、可测试。每个状态该响应什么事件、转换到什么状态、执行什么副作用，全部显式定义，不靠隐式逻辑。

## 设计顺序

### 1. 先定义状态

**下载模块：**
| 状态 | 含义 |
|------|------|
| idle | 空闲，未开始 |
| waiting | 排队等待 |
| downloading | 下载中 |
| paused | 暂停 |
| completed | 完成 |
| failed | 失败 |
| cancelled | 已取消 |

**播放器模块：**
| 状态 | 含义 |
|------|------|
| idle | 未加载 |
| loading | 加载资源中 |
| ready | 准备就绪，可播放 |
| playing | 播放中 |
| paused | 暂停 |
| buffering | 缓冲中 |
| ended | 播放结束 |
| error | 出错 |

**直播模块：**
| 状态 | 含义 |
|------|------|
| idle | 未连接 |
| connecting | 连接中 |
| previewing | 预览中（推流前） |
| live | 直播中 |
| reconnecting | 重连中 |
| ended | 已结束 |
| error | 出错 |

### 2. 再定义事件

**下载事件：**
- `start` - 开始下载
- `pause` - 暂停
- `resume` - 恢复
- `cancel` - 取消
- `complete` - 完成
- `fail(Error)` - 失败
- `retry` - 重试

**播放器事件：**
- `load(URL)` - 加载资源
- `ready` - 资源就绪
- `play` - 播放
- `pause` - 暂停
- `seek(Time)` - 跳转
- `buffering` - 开始缓冲
- `buffered` - 缓冲完成
- `end` - 播放结束
- `fail(Error)` - 出错

### 3. 定义转移规则

```
下载状态机：

idle ──start──→ waiting
waiting ──start──→ downloading
downloading ──pause──→ paused
downloading ──complete──→ completed
downloading ──fail──→ failed
paused ──resume──→ downloading
failed ──retry──→ waiting
任何状态 ──cancel──→ cancelled
```

```
播放器状态机：

idle ──load──→ loading
loading ──ready──→ ready
ready ──play──→ playing
playing ──pause──→ paused
playing ──buffering──→ buffering
playing ──end──→ ended
playing ──fail──→ error
paused ──play──→ playing
buffering ──buffered──→ playing
buffering ──fail──→ error
ended ──load──→ loading
error ──load──→ loading
```

### 4. 代码实现

```swift
// 状态机核心
actor StateMachine<State: Hashable, Event> {
    private var state: State
    private let transitions: [State: [Event: Transition]]
    private var sideEffects: [(State, Event) -> Void] = []
    
    struct Transition {
        let toState: State
        let action: (() -> Void)?
    }
    
    init(initialState: State, transitions: [State: [Event: Transition]]) {
        self.state = initialState
        self.transitions = transitions
    }
    
    func send(_ event: Event) -> Bool {
        guard let transition = transitions[state]?[event] else {
            return false  // 非法事件，忽略
        }
        
        let oldState = state
        state = transition.toState
        transition.action?()
        sideEffects.forEach { $0(oldState, event) }
        return true
    }
    
    func currentState() -> State {
        return state
    }
}

// 下载状态机示例
enum DownloadState: Hashable {
    case idle, waiting, downloading, paused, completed, failed, cancelled
}

enum DownloadEvent: Hashable {
    case start, pause, resume, cancel, complete, retry
    case fail(String)
}

let downloadStateMachine = StateMachine<DownloadState, DownloadEvent>(
    initialState: .idle,
    transitions: [
        .idle: [
            .start: .init(toState: .downloading) { print("开始下载") }
        ],
        .downloading: [
            .pause: .init(toState: .paused) { print("暂停下载") },
            .complete: .init(toState: .completed) { print("下载完成") },
            .cancel: .init(toState: .cancelled) { print("取消下载") }
        ],
        .paused: [
            .resume: .init(toState: .downloading) { print("恢复下载") },
            .cancel: .init(toState: .cancelled) { print("取消下载") }
        ],
        .failed: [
            .retry: .init(toState: .waiting) { print("重试下载") },
            .cancel: .init(toState: .cancelled) { print("取消下载") }
        ]
    ]
)
```

### 5. 状态机的优势

**相比 if-else：**
- 状态转移显式定义，不会出现非法状态组合。
- 新增状态或事件只需改转移表，不改业务逻辑。
- 状态变更可追踪、可日志、可测试。

**相比散落的 BOOL 标记：**
- 不会出现 `isDownloading = true` 但 `isPaused = true` 的矛盾状态。
- 状态变更有统一入口，方便加锁或异步处理。
- UI 层只监听状态变化，不关心业务逻辑。

### 6. 边界处理

**非法事件：** 当前状态不支持的事件，直接忽略或报错。
**并发事件：** 用 `actor` 或串行队列保证状态转换的原子性。
**持久化：** 状态变更时持久化关键状态，App 重启后恢复。
**日志：** 每次状态变更记录日志，方便排查问题。

## 3 分钟面试回答版本

我设计下载模块会用有限状态机，而不是散落的 BOOL 标记。

首先定义状态：idle、waiting、downloading、paused、completed、failed、cancelled。然后定义事件：start、pause、resume、cancel、complete、fail、retry。最后定义转移规则，比如 downloading 收到 pause 转到 paused，收到 complete 转到 completed。

实现上我用一个泛型 StateMachine，状态和事件都是泛型参数，转移规则用字典定义。每次状态变更执行对应的副作用，同时通知 UI 层更新。

状态机的好处是状态转移显式定义，不会出现非法状态组合。新增状态或事件只改转移表，不改业务逻辑。状态变更有统一入口，方便加日志和单元测试。

播放器和直播模块也是同样的思路，只是状态和事件不同。播放器多了 buffering 和 seek，直播多了 connecting 和 reconnecting。

## 项目案例模板

我之前设计过一个下载模块，最初用 BOOL 标记管理状态，后来出现各种状态矛盾：`isDownloading = true` 但 `isPaused = true`，或者下载完成了但状态没更新。

我改用状态机重构，把所有状态和事件显式定义，转移规则用字典配置。状态变更时自动执行副作用（开始下载、暂停、取消），同时通过 Combine 发布状态变化，UI 层只订阅状态。

重构后状态管理变得清晰，新增下载队列功能时只加了 waiting 状态和对应转移规则，没有改已有逻辑。单元测试也方便了，只需要验证状态转移是否正确。

## 面试追问准备

### 1. 状态机和 Redux/MVI 有什么关系？

Redux/MVI 本质也是状态机：State 是状态，Action 是事件，Reducer 是转移函数。区别是 Redux 强调单向数据流和不可变状态，状态机更通用。

### 2. 怎么处理多个下载任务？

每个任务一个状态机实例，外层用队列管理。队列负责并发控制、优先级排序、任务调度，单个任务的状态由自己的状态机管理。

### 3. 状态机怎么和 UI 绑定？

用响应式框架（Combine/SwiftUI）发布状态变化，UI 层订阅并更新。状态机只管状态和副作用，不直接操作 UI。

### 4. 怎么处理异常恢复？

在状态机中加 `error` 状态，定义从 error 到其他状态的转移规则。比如下载失败后可以 retry 回到 waiting，或 cancel 回到 cancelled。关键是在 error 状态记录错误信息，方便 UI 展示和日志排查。

### 5. 直播重连逻辑怎么设计？

在 reconnecting 状态下启动重连定时器，指数退避，最多重试 N 次。重连成功转到 live，失败次数超限转到 error。重连期间用户可以手动 cancel 转到 ended。

## 简历 bullet

设计下载/播放/直播模块的有限状态机，用显式状态转移替代散落的 BOOL 标记，解决状态矛盾和并发问题，支持状态追踪、日志记录和单元测试，提升模块可维护性和可扩展性。

## 核心记忆句

定义状态、定义事件、定义转移规则，状态机让状态转换可预测、可追踪、可测试。

## 风险点

- 不要一上来就画状态图，先说清楚为什么要用状态机，解决什么问题。
- 不要忽略并发问题，状态转换要保证原子性。
- 不要只说理论，要能写出状态机的核心代码。
- 不要承诺"状态机解决所有问题"，简单场景用 if-else 更直接。
- 如果没有状态机实战经验，就用"模块状态管理思路 + 重构经验"表达，别编数据。
