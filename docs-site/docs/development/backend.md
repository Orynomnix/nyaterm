---
sidebar_position: 4
---

# 后端开发指南

后端代码位于 `src-tauri/src/`，使用 Rust 编写，是 Dragonfly 的运行时核心：会话管理、SSH/SFTP、录制、翻译、隧道、认证、配置持久化都在这里落地。

## 命令入口与模块组织

后端命令注册集中在 `src-tauri/src/lib.rs`：

- 在这里创建共享 manager 状态
- 在这里挂载 Tauri plugin
- 在这里通过 `tauri::generate_handler![]` 注册所有 commands

命令模块位于：

```text
src-tauri/src/cmd/
├── session.rs
├── sftp.rs
├── connection.rs
├── settings.rs
├── watcher.rs
├── translate.rs
├── stats.rs
├── tunnel.rs
├── proxy.rs
├── otp.rs
├── importer.rs
├── clipboard.rs
└── log.rs
```

如果你要新增一个 command，通常需要：

1. 在对应 `cmd/*.rs` 中定义 `#[tauri::command]`
2. 复用 `core/` 或 `config/` 层已有逻辑
3. 回到 `src-tauri/src/lib.rs` 注册它
4. 在前端通过 `src/lib/invoke.ts` 调用

## 共享运行时状态

`src-tauri/src/lib.rs` 会把这些共享对象注入 Tauri state：

- `SessionManager`
- `TunnelManager`
- `RecordingManager`
- `PendingAuthManager`

它们分别负责：

- 活动会话生命周期与命令历史
- SSH 隧道状态
- 录制状态
- keyboard-interactive / OTP 等待中的认证请求

## SessionManager

`src-tauri/src/core/session.rs` 中的 `SessionManager` 是会话中心：

- 注册 / 移除活动会话
- 向具体 session 的 I/O loop 发送 `Write` / `Resize` / `Close` / `Attach` 命令
- 管理命令历史与模糊搜索存储
- 发出 `sessions-changed`、`command-history-changed` 等事件

它暴露给前端的会话元信息中，还包含 `injection_active`，用于标识当前会话是否支持终端路径跟踪等增强能力。

## 会话实现

具体会话类型分布在 `src-tauri/src/core/`：

- `ssh/` — SSH 连接、认证、OSC/CWD、SFTP、隧道
- `pty.rs` — 本地终端
- `telnet.rs` — Telnet
- `serial.rs` — 串口
- `recording.rs` — 会话录制
- `watcher.rs` — 本地文件监听与自动上传
- `importer.rs` — 外部客户端会话导入

## SSH 模块

`src-tauri/src/core/ssh/` 是最核心的一组模块：

- `client.rs` — russh client、known_hosts 校验、代理感知连接
- `auth.rs` — 保存认证信息加载、keyboard-interactive / OTP 流程
- `io.rs` — 终端 I/O 与 cwd 更新事件
- `sftp.rs` — 远程文件操作与传输队列
- `tunnel.rs` — 本地 / 远程 / 动态隧道
- `session.rs` — SSH session 生命周期协作

典型 SSH 流程是：

1. 读取连接配置
2. 解密密码 / 私钥 / 凭据
3. 建立 TCP / 代理连接
4. 做 host key policy 校验
5. 完成认证（可能进入 OTP / interactive 流程）
6. 打开 PTY 通道并进入异步 I/O 循环
7. 在支持时注入 OSC/CWD 跟踪能力

## SFTP 与传输队列

`src-tauri/src/core/ssh/sftp.rs` 负责：

- 列目录
- 下载 / 上传单文件与目录
- 删除 / 重命名 / 新建文件夹 / 符号链接 / 属性读取
- 传输队列控制（pause / resume / cancel）
- 向前端发出 `transfer-event`

前端传输面板与 `TransferContext` 就是基于这些事件构建的。

## watcher 与自动上传

`src-tauri/src/core/watcher.rs` 负责本地文件监听。

典型流程：

1. 前端从远程文件浏览器中“打开”远程文件
2. 后端下载到本地临时目录并开始 watch
3. 本地文件保存后，发出 `file-modified` 事件
4. 前端决定弹出自动上传窗口，或按“始终上传”策略直接回传

这条链路涉及：

- `cmd/watcher.rs`
- `core/watcher.rs`
- 前端 `FileUploadPage.tsx`

## 配置与加密

配置文件保存在 `~/.dragonfly/`，主要由 `src-tauri/src/config/` 管理。

常见文件包括：

- `settings.json`
- `sessions.json`
- `keys.json`
- `passwords.json`
- `otp.json`
- `quick-command.json`
- `tunnels.json`
- `proxies.json`
- `history.json`
- `known_hosts`

敏感字段会在写盘前加密，因此新增配置时要确认是否属于敏感数据边界。

## 事件模型

后端大量依赖 Tauri 事件通知前端，典型事件包括：

| 事件 | 说明 |
|------|------|
| `terminal-output-{id}` | 终端输出 |
| `cwd-changed-{id}` | 工作目录变化 |
| `session-closed-{id}` | 会话关闭 |
| `sessions-changed` | 会话列表变化 |
| `connections-changed` | 已保存连接变化 |
| `transfer-event` | 传输进度 |
| `otp-request` | 触发 OTP / keyboard-interactive 认证 |

设计新后端能力时，优先考虑是否应该通过已有事件流对前端暴露，而不是额外引入新的轮询接口。
