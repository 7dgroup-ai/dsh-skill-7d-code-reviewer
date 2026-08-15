## 目标

将插件作者信息统一为 **7DGroup**。

代码库中目前没有任何 author 字段（探索已确认），需要新增/修正以下两处：

## 改动内容

### 1. `package.json` — 添加 author 字段

在 `"license": "MIT",`（第 31 行）之前添加：

```json
"author": "7DGroup",
```

### 2. `LICENSE` — 更换版权持有者

第 3 行：

```
Copyright (c) 2026 DeepSeek
```

改为：

```
Copyright (c) 2026 7DGroup
```

（第 18 行的 "AUTHORS OR COPYRIGHT HOLDERS" 是 MIT 许可证固定模板文本，不动。）

## 不改动的部分

- `README.md` / `README.zh.md`：文中已有 "7DGroup 模板驱动" 描述，无作者署名，无需改动（用户选择不加）
- `package.json` 中的 `@deepseek-ai` scope 包名：这是 npm 包名而非作者，保持不变
- Git 提交历史中的 zuozewei 身份：不改写历史

## 验证与收尾

1. 运行 `pnpm test`（vitest）确认无回归
2. 提交改动（如 `chore: set plugin author to 7DGroup`）并推送到 Gitee 的 `origin/main`