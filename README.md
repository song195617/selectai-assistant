# SelectAI Assistant

一个基于“选中文本”的 Chrome AI 助手扩展，支持翻译/对话、流式输出、Markdown/KaTeX 渲染，并可配置多模型（OpenAI 兼容与 Gemini）。

## 功能特性

- 选中文本后弹出快捷按钮：翻译/解释 与 AI 对话
- 流式响应，实时更新结果
- Markdown 渲染 + KaTeX 公式支持（含行内/块级）
- 多模型配置：OpenAI 兼容接口与 Google Gemini
- 自定义提示词与推理参数（翻译/对话温度、最大输出）
- 模型配置一键导入/导出

## 安装

1. 打开 Chrome 扩展管理页 `chrome://extensions/`
2. 右上角打开“开发者模式”
3. 点击“加载已解压的扩展程序”，选择本项目目录

## 使用

1. 在网页中选中文本，弹出悬浮按钮
2. 点击“翻译/解释”或“AI 对话”
3. 首次使用请在扩展选项页配置模型与 API Key

## 配置说明

打开扩展的“选项”页进行设置：

- 模型管理：添加/编辑/删除模型（支持 OpenAI 兼容与 Gemini）
- 活动模型：选择当前默认模型
- 推理参数：翻译温度、对话温度、最大输出长度
- 提示词模板：分别设置翻译与对话系统提示词
- 配置导入/导出：JSON 一键迁移

## 支持的模型类型

- OpenAI 兼容接口（如 DeepSeek、豆包等）
- Google Gemini（如 gemini-flash-latest）

## 项目结构

- `content.js` / `content.css`：选中交互、弹窗 UI、渲染与交互逻辑
- `background.js`：模型请求与流式响应处理
- `options.html` / `options.js`：模型与参数配置页面
- `lib/`：第三方依赖（marked、DOMPurify、KaTeX）

## 说明

- API Key 存储于 `chrome.storage.sync`，请注意账号与配额安全
- 本项目为浏览器扩展，需在本地“加载已解压的扩展程序”使用

## License

MIT License, see `LICENSE`.
