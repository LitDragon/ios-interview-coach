# iOS 深水主题卡：网络失败、重试、缓存怎么设计

## 主题

网络失败、重试、缓存怎么设计

## 面试官常问法

> 你们 App 的网络层怎么设计的？失败了怎么处理？重试策略是什么？缓存怎么做？

## 核心回答

我不会把网络层当工具方法用，而是把它当成一个有状态的服务来设计。核心是三件事：**失败分类**、**重试策略**、**缓存分层**。

失败不是一种，超时、无网络、服务端错误、业务错误要分开处理。重试不是无脑重试，要看错误类型、请求幂等性、退避策略。缓存不是一层，要分内存缓存、磁盘缓存、CDN 缓存，不同场景用不同策略。

## 设计顺序

### 1. 失败分类

| 类型 | 示例 | 处理方式 |
|------|------|----------|
| 网络不可用 | 无 Wi-Fi、无蜂窝 | 提示用户，不重试 |
| 超时 | 请求超过阈值 | 可重试，指数退避 |
| DNS 失败 | 解析失败 | 可重试，切换 DNS |
| 服务端错误 | 500、502、503 | 可重试，有限次数 |
| 业务错误 | token 过期、参数错误 | 不重试，走业务逻辑 |
| 证书错误 | HTTPS 握手失败 | 不重试，提示安全风险 |

### 2. 重试策略

**基本规则：**
- 只对**幂等请求**重试（GET、PUT、DELETE），非幂等请求（POST）要确认不会重复提交。
- 有限次数，通常 3 次。
- 指数退避 + 随机抖动，避免雪崩。
- 重试间隔：`min(baseInterval * 2^attempt + random jitter, maxInterval)`。

**实现示例：**
```swift
struct RetryPolicy {
    let maxRetries: Int = 3
    let baseInterval: TimeInterval = 1.0
    let maxInterval: TimeInterval = 30.0
    let jitter: TimeInterval = 0.5
    
    func nextInterval(for attempt: Int) -> TimeInterval {
        let exponential = baseInterval * pow(2.0, Double(attempt))
        let randomJitter = Double.random(in: -jitter...jitter)
        return min(exponential + randomJitter, maxInterval)
    }
}
```

**特殊场景：**
- Token 过期：先刷新 Token，再重试原请求。
- 网络切换：检测网络恢复后自动重试。
- 并发请求失败：批量重试时要去重，避免重复请求。

### 3. 缓存分层

| 层级 | 存储 | 生命周期 | 适用场景 |
|------|------|----------|----------|
| 内存缓存 | `NSCache` | 进程存活期间 | 高频读取、小数据 |
| 磁盘缓存 | SQLite / 文件 | 持久化 | 离线数据、大图片 |
| CDN 缓存 | 服务端 | 按策略 | 静态资源、图片 |

**缓存策略：**
- **Cache-Control**：遵循服务端 `max-age`、`no-cache`、`no-store`。
- **ETag / Last-Modified**：条件请求，减少无效传输。
- **本地优先**：先展示缓存，后台更新，更新后刷新 UI。
- **过期清理**：LRU 策略，按大小或时间淘汰。

**实现示例：**
```swift
actor NetworkCache {
    private var memoryCache: [String: CacheEntry] = [:]
    private let diskCache: DiskCache
    private let maxMemoryCount: Int = 200
    
    func get(_ key: String) -> Data? {
        // 1. 内存缓存
        if let entry = memoryCache[key], !entry.isExpired {
            return entry.data
        }
        // 2. 磁盘缓存
        if let data = diskCache.get(key) {
            memoryCache[key] = CacheEntry(data: data)
            return data
        }
        return nil
    }
    
    func set(_ key: String, data: Data, maxAge: TimeInterval) {
        let entry = CacheEntry(data: data, expiresAt: Date().addingTimeInterval(maxAge))
        memoryCache[key] = entry
        diskCache.set(key, data: data, maxAge: maxAge)
        
        // LRU 清理
        if memoryCache.count > maxMemoryCount {
            evictOldest()
        }
    }
}
```

### 4. 离线策略

- 检测网络状态（`NWPathMonitor`）。
- 离线时展示缓存数据，提示用户当前为离线模式。
- 网络恢复后自动刷新关键数据。
- 写操作离线时排队，网络恢复后按顺序提交。

### 5. 取消与去重

- 用户快速滑动列表时，取消之前的请求（`Task.cancel()` 或 `URLSessionTask.cancel()`）。
- 相同请求短时间内不重复发起，用请求签名去重。
- 页面退出时取消所有关联请求。

## 3 分钟面试回答版本

我设计网络层会从三个维度考虑：失败处理、重试策略、缓存分层。

失败处理上，我会先分类：网络不可用提示用户，超时和服务端错误可重试，业务错误走业务逻辑不重试，证书错误直接拦截。

重试策略上，只对幂等请求重试，非幂等请求不重试避免重复提交。重试用指数退避加随机抖动，最多 3 次。Token 过期的场景单独处理，先刷新 Token 再重试原请求。

缓存上，我分内存缓存和磁盘缓存两层。内存缓存用 NSCache，高频读取；磁盘缓存用 SQLite，支持离线。遵循服务端 Cache-Control 和 ETag，先展示缓存再后台更新。

另外还会处理请求去重和取消，用户快速操作时取消之前的请求，相同请求短时间内不重复发起。

## 项目案例模板

我之前处理过一个网络层问题，现象是弱网环境下用户反馈页面数据加载失败率很高。

排查后发现当时的重试逻辑是无脑重试 3 次，没有区分错误类型，也没有退避策略，导致弱网下连续超时，用户体验很差。

我重新设计了重试策略：只对超时和服务端 5xx 错误重试，用指数退避（1s、2s、4s），加上随机抖动避免并发请求同时重试。同时加了本地缓存，先展示上次成功数据，后台静默刷新。

改完后弱网环境下的数据加载成功率从 60% 提升到 85%，用户反馈明显减少。

## 面试追问准备

### 1. POST 请求能重试吗？

不能无脑重试，POST 通常不是幂等的。如果要重试，需要服务端支持幂等键（Idempotency Key），客户端带上唯一标识，服务端去重。

### 2. 缓存和数据库有什么区别？

缓存是临时的，可能被淘汰，用于加速读取；数据库是持久的，用于存储结构化业务数据。实际项目中常把缓存和数据库配合使用：缓存热数据，数据库存全量。

### 3. 怎么处理证书锁定（Certificate Pinning）？

在 `URLSessionDelegate` 的 `didReceiveChallenge` 中校验证书，对比本地预埋的证书或公钥。证书锁定失败时不降级，直接拒绝连接，防止中间人攻击。

### 4. 多个请求并发，怎么统一处理 Token 刷新？

用一个 TokenManager 管理刷新状态，第一个请求发现 Token 过期时触发刷新，其他请求等待刷新完成后再重试。可以用 `AsyncStream` 或 `Continuation` 实现等待机制。

### 5. 图片加载怎么设计缓存？

三级缓存：内存（NSCache）→ 磁盘（文件或 SQLite）→ 网络。优先从内存取，没有则从磁盘取，最后才请求网络。下载完成后同时写入内存和磁盘。用 URL 做 key，支持 ETag 条件请求。

## 简历 bullet

设计网络层失败处理、重试策略和缓存分层机制，对不同错误类型采用差异化处理，对幂等请求实现指数退避重试，配合内存和磁盘二级缓存，提升弱网环境下的数据加载成功率和用户体验。

## 核心记忆句

失败分类、幂等重试、缓存分层，三个维度缺一不可。

## 风险点

- 不要一上来就说"重试 3 次"，面试官会追问幂等性和退避策略。
- 不要忽略 POST 请求的幂等性问题，盲目重试会导致重复下单。
- 不要只说"加缓存"，要能解释缓存过期策略、淘汰机制、一致性问题。
- 不要忽略取消机制，用户快速操作时不做请求取消会浪费资源。
- 如果没有网络层架构经验，就用"封装 URLSession + 缓存策略"表达思路，别编线上数据。
