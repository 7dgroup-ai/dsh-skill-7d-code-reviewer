# AGENTS.md

## 仓库用途

可安装的 dsh（DeepSeek Harness）组合层插件包 `@7dgroup/dsh-skill-7d-code-reviewer`。它向 `ctx.skills` 注册 `7d-code-reviewer` 技能提供者——即 7DGroup 模板驱动的代码审查技能：五步审查流程、严重/中等/轻微三级问题分级、四维度评分标准，以及占位符驱动的 HTML 报告模板。仓库托管在 Gitee，MIT 许可证，由 7DGroup 维护。

## 目录结构

- `src/index.ts` —— Cordis 插件（`skill-7d-code-reviewer`）；注入 `skills` 服务并注册内置提供者。技能名称、中文描述和资源路径都以常量形式定义在此文件中。
- `src/invariant.ts` —— 不变量伴生插件，在 `ctx.invariants` 上登记包所有权；不安装任何运行时不变量。
- `assets/7d-code-reviewer/` —— 随包发布的技能资源根目录：`SKILL.md`（审查逻辑与模板选择）、`references/`（编码规范、安全检查清单、审查示例——按需加载）、`templates/report-template.html`（纯占位符 HTML 报告模板）、`scripts/html-report-generation.md`（HTML 转义规则）。
- `cordis.patch.yml` —— 插件包组合层；当 profile 列出本包时插入 `skill-7d-code-reviewer` 一行。
- `lib/` —— tsdown 构建产物；已被 gitignore，由 `prepare`/`build` 生成。
- `tests/skill-7d-code-reviewer.spec.ts` —— vitest 测试用例。


## 常用命令

```sh
pnpm install
pnpm build        # tsdown；git 安装时也会以 `prepare` 钩子运行
pnpm test         # vitest run
```

本仓库没有 lint 或类型检查脚本。构建只做转译（`dts: false`）——不会进行类型检查，类型错误只能在编辑器/IDE 中暴露。

## 构建与打包规则

- 构建必须对 git 安装保持自包含：pnpm 会在其 store 克隆中运行 `prepare`（tsdown，使用 `tsdown.config.ts`），那里没有 monorepo 检出，也没有项目引用。只转译 `src/`；peer 依赖（`@deepseek-ai/cordis`、`@deepseek-ai/dsh-skill`、`@deepseek-ai/dsh-invariants`）保持 external，由安装方 profile 负责解析。
- 不发布类型声明；dsh Loader 只加载运行时入口。
- `package.json` 的 `files` 字段控制发布内容（`lib/index.js`、`lib/invariant.js`、`cordis.patch.yml`、`assets`）——新增需要发布的文件时要同步更新该字段。
- 要求 Node `^22.19.0 || >=24.0.0`，pnpm 10+。

## 修改注意事项

- `tests/skill-7d-code-reviewer.spec.ts` 断言了完整的技能注册列表——名称、完整的中文 `DESCRIPTION` 字符串、invocation 标志、`resourceBase` 路径——并要求 `references/`、`templates/`、`scripts/` 下的每个资源文件非空，且报告模板包含 `{{report_title}}`。修改 `src/index.ts` 中的常量或增删资源文件时，必须在同一次改动中更新测试。
- 资源路径通过 `new URL('../assets/7d-code-reviewer/', import.meta.url)` 从 `lib/` 解析；调整构建产物布局时要保持 `../assets` 的相对层级。
- 保留 `src/` 中包裹提供者/插件样板代码的 `/* jscpd:ignore-start */ … /* jscpd:ignore-end */` 标记。
- 除提供者入口外，本技能不随包发布任何可执行代码；HTML 报告模板必须保持纯占位符，填充内容的转义规则记录在 `assets/7d-code-reviewer/scripts/html-report-generation.md` 中。
- 面向用户的字符串（技能描述、SKILL.md、README）为简体中文；`README.md` 为英文、`README.zh.md` 为中文对应版本——两者需保持同步。

## 提交规范

提交标题使用简体中文，格式为 `【类型】简短描述`，类型必须是九个固定标签之一——【新增】【修复】【优化】【调整】【删除】【文档】【测试】【回滚】【合并】——标题不超过 50 个字符且末尾不加标点；复杂改动在标题后空一行，再用数字序号逐条补充详情（每行不超过 70 个字符）。无关改动必须拆分为多次提交。
