# Release Checklist (Chrome Extension)

## Assets
- [ ] 截图：选中文本后浮动按钮
- [ ] 截图：翻译/解释弹窗（含公式渲染）
- [ ] 截图：对话模式（流式输出）
- [ ] 截图：设置页（模型管理/参数/Prompt）
- [ ] 图标与品牌图（可选）

## QA
- [ ] 安装加载：`chrome://extensions/` 开发者模式可正常加载
- [ ] 选中文本触发按钮
- [ ] 翻译模式请求与流式输出正常
- [ ] 对话模式请求与流式输出正常
- [ ] 停止按钮可中断输出
- [ ] Markdown 渲染正常（代码块/列表/引用）
- [ ] KaTeX 公式渲染（行内/块级）
- [ ] 模型配置导入/导出正常

## 配置
- [ ] 默认模型与提示词可用
- [ ] API Key 未设置时提示友好
- [ ] 配置保存到 `chrome.storage.sync`

## 发布
- [ ] README 完整（安装/使用/配置/License）
- [ ] 版本号更新（`manifest.json`）
- [ ] License 已包含
- [ ] 打包 `zip` 供发布
