# SelectAI Assistant

`SelectAI Assistant` 是一个以“选中文本即调用 AI”为核心交互的 Chrome 扩展。它把翻译、解释与追问对话放在同一个轻量浮层里，并支持 Markdown + KaTeX 数学公式渲染。

## 核心能力

- 选中任意网页文本后，显示两个悬浮动作按钮：`翻译/解释` 与 `AI 对话`。
- 对话与翻译均支持流式输出，响应过程可中断（`停止生成`）。
- 支持弹窗拖拽与“固定/跟随”切换，减少遮挡。
- 结果支持 Markdown 渲染，并内置 KaTeX 本地资源（含字体），可离线渲染公式。
- 配置页支持多模型管理、连通性测试、参数调优、主题与语言切换。

## 功能细节

### 1) 页面侧交互（Content Script）

- 注入 Shadow DOM，隔离页面样式污染。
- 自动定位浮动按钮与弹窗，包含边界避让与高度自适应。
- 两种模式：
  - 翻译模式：针对选中文本单轮生成。
  - 对话模式：基于选中文本 + 最近上下文（最多 10 条）多轮追问。
- 支持异常可视化反馈（加载中、完成、错误）。

### 2) 渲染能力

- Markdown：`marked`。
- 安全净化：`DOMPurify`。
- 公式：`KaTeX` + 本地 `lib/katex.min.css` 与 `lib/fonts/*`。

### 3) 模型能力（Background Service Worker）

- 支持两类 Provider：
  - `openai`：OpenAI 兼容 Chat Completions SSE 流。
  - `google`：Gemini `streamGenerateContent` 流。
- 支持请求中止（AbortController），并处理端口断连、扩展重载等场景。
- 内置模型连通性测试（15 秒超时，失败返回详细错误）。

## 配置页能力

- 模型管理：新增、编辑、删除、切换当前模型。
- 单模型连通性测试：保存前先测通。
- 批量并发测试：一次性测试全部模型并显示结果。
- 推理参数：
  - `transTemperature`（0-2）
  - `chatTemperature`（0-2）
  - `maxTokens`（最小 128，导入时上限校验到 65536）
- Prompt 模板：
  - `translatePrompt`
  - `chatPrompt`
  - 支持 `{text}` 占位符；若未写 `{text}`，会自动把选中文本追加到提示词末尾。
- 配置导出/导入（JSON），包含结构校验与兜底修正。
- 界面主题：`system / light / dark`。
- 界面语言：`auto / zh / en`。

## 安装

1. 打开 `chrome://extensions`。
2. 开启右上角“开发者模式”。
3. 点击“加载已解压的扩展程序”，选择本项目目录。
4. 打开扩展“选项页”，先配置模型 API。

## 使用

1. 在网页中选中文本。
2. 点击 `翻译/解释` 或 `AI 对话`。
3. 在弹窗中查看流式结果，必要时点击 `停止生成`。
4. 对话模式可继续输入追问。

## Provider 配置说明

### OpenAI 兼容

- `type`: `openai`
- `url`: Chat Completions 端点（例如 `/chat/completions`）
- `model`: 模型名
- `key`: API Key（Bearer）

### Google Gemini

- `type`: `google`
- `key`: API Key
- `url` 支持两种写法：
  - 完整流式端点（包含 `:streamGenerateContent`）
  - 基础地址（插件会结合 `model` 自动拼接为 `/models/{model}:streamGenerateContent`）

## 架构概览

```text
Web Page
  -> content.js (selection UI + popup + rendering)
  -> chrome.runtime Port (ai-stream)
  -> background.js (provider routing + stream parsing)
  -> AI Provider API (OpenAI-compatible / Google Gemini)
```

核心文件：

- `manifest.json`: 扩展声明、脚本注入、资源暴露。
- `content.js`: 页面交互、弹窗逻辑、渲染与端口通信。
- `content.css`: 弹窗与消息样式。
- `background.js`: 请求组装、流式解析、中止控制、连通性测试。
- `options.html`: 设置页结构与样式。
- `options.js`: 设置管理、校验、i18n、导入导出与测试逻辑。
- `lib/*`: 第三方前端库与 KaTeX 本地资源。

## 权限与数据

- `storage`: 存储模型配置、参数、主题和语言偏好。
- `activeTab`: 当前标签页能力（扩展声明权限）。
- `content_scripts` 匹配 `<all_urls>`，用于在网页中提供选中文本交互。

数据流说明：

- 模型配置保存在 `chrome.storage.sync`，API Key 单独保存在 `chrome.storage.local`。
- 选中文本与对话内容仅在你配置的模型接口请求中发送。
- 渲染前经过净化/转义，降低页面注入风险。
- 导出配置时默认不包含 API Key（可选手动包含）。

## 常见问题

### 1) 选中文本后没有出现按钮

- 先确认扩展已启用。
- 如果你刚在 `chrome://extensions` 里点过“重新加载”，请刷新目标网页（旧页面的 content script 不会自动更新）。
- 某些页面（如浏览器内置页）不支持内容脚本注入。

### 2) 连通性测试失败

- 检查 `type / url / model / key` 是否匹配。
- 检查服务端是否支持流式或对应接口格式。
- 查看错误信息中的 HTTP 状态码与返回体。

### 3) 有返回但内容为空

- 降低温度、调整 Prompt。
- 检查模型是否限制输出长度，适当增大 `maxTokens`。

## 开发说明

- 纯前端 Chrome MV3 扩展，无构建步骤。
- 直接修改源码后，在扩展管理页点击“重新加载”即可。

