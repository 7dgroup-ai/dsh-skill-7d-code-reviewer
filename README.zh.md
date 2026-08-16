<p align="center">
  <img alt="npm version" src="https://img.shields.io/npm/v/@7dgroup/dsh-skill-7d-code-reviewer?style=flat-square&color=4b6fff">
  <img alt="license MIT" src="https://img.shields.io/badge/license-MIT-263146?style=flat-square">
  <img alt="node" src="https://img.shields.io/badge/node-%5E22.19%20%7C%7C%20%3E%3D24-339933?style=flat-square">
  <img alt="by 7DGroup" src="https://img.shields.io/badge/by-7DGroup-7da1de?style=flat-square">
</p>

<p align="center">
  <a href="README.md">English</a> | <strong>中文</strong>
</p>

# @7dgroup/dsh-skill-7d-code-reviewer

> 模板驱动的 DSH 代码审查技能插件：五步审查流程、严重/中等/轻微三级问题分级、四维度评分标准，文本摘要与 HTML 报告双输出。
> 纯组合包挂载，零核心改动。安装即启用，移除 bundle 行即卸载。
> 作者 7DGroup · MIT · [GitHub 仓库](https://github.com/7dgroup-ai/dsh-skill-7d-code-reviewer)

## ✨ 核心能力

- **模板驱动模式**——职责分离：`SKILL.md` 决定审什么、多严重，`templates/` 只负责呈现。HTML 报告模板保持纯占位符，所有占位符必须填充，动态内容一律 HTML 转义。
- **五步审查流程**——接收任务 → 快速浏览 → 逐行审查（按需加载 `references/`）→ 问题分级 → 生成报告。
- **三级问题分级**——🔴 严重（必须修复）/ 🟡 中等（建议修复）/ 🟢 轻微（可选改进）。
- **四维度评分标准**——代码质量 / 安全性 / 性能 / 可维护性，各维度 1–10 分，另有总体评分与自动生成的摘要描述。
- **双格式输出**——文本摘要供快速浏览，完整 HTML 报告另存为 `code-review-report-{时间戳}.html`。
- **内置知识库**——编码规范、安全检查清单（SQL 注入、XSS、认证授权、敏感信息泄露）与审查示例，按需加载而不撑大提示词。

## 插件效果

以下为对一个小型 Python 模块审查时，由纯占位符模板（`templates/report-template.html`）填充生成的 HTML 报告示例——严重级别徽标、四维度评分与修复建议均由模型填充：

<p align="center">
  <img src="screenshots/report-preview.png" alt="代码审查HTML报告示例" width="720">
</p>

## 🔍 审查流程

| 步骤 | 做什么 |
|---|---|
| 1. 接收审查任务 | 接收用户提交的代码或文件路径；确定语言与业务场景 |
| 2. 快速浏览 | 判断改动性质（新业务 / 修 bug / 重构）；识别核心文件与关键逻辑 |
| 3. 逐行审查 | 按需加载对应 references；逐项检查命名、安全、性能与异常处理 |
| 4. 问题分级 | 🔴 严重——必须修复 · 🟡 中等——建议修复 · 🟢 轻微——可选改进 |
| 5. 生成报告 | 填充占位符 HTML 模板；输出文本摘要与 `code-review-report-{时间戳}.html` |

## 🚀 快速开始

前置条件：`dsh` CLI、Node `^22.19.0 || >=24.0.0`、pnpm 10+。

### 从 GitHub 安装（git）

`dsh plugin` 会把 bundle 追加进 profile 的 `dsh.profile.bundles`，本 bundle 自带的 patch 层在基础组合之上挂载 `skill-7d-code-reviewer` 行：

```sh
dsh plugin --profile <name> add git+https://github.com/7dgroup-ai/dsh-skill-7d-code-reviewer.git
```

任何 pnpm 可识别的 git 地址均可；`github:7dgroup-ai/dsh-skill-7d-code-reviewer` 简写等价。

pnpm 在得到显式允许前会拒绝运行 git 依赖的构建脚本，所以第一次 `add` 会失败。把 pnpm 打印的确切包键复制进该 profile 的 `pnpm-workspace.yaml`，然后重新执行：

```yaml
allowBuilds:
  '@7dgroup/dsh-skill-7d-code-reviewer@git+https://github.com/7dgroup-ai/dsh-skill-7d-code-reviewer.git#<sha>': true
```

允许构建意味着让该包的代码在安装时于你的机器上执行，且不在任何 agent 沙箱之内。建议锁定 commit（`...#<sha>`），让后续推送无法悄悄改变实际运行的内容。

### 免构建授权的安装形式

以下两种形式携带预构建代码，无需任何构建授权：

```sh
dsh plugin --profile <name> add @7dgroup/dsh-skill-7d-code-reviewer     # npm（发布后）
dsh plugin --profile <name> add ./7dgroup-dsh-skill-7d-code-reviewer-0.1.0-rc.5.tgz   # pnpm pack 产出的 tarball
```

本地执行 `pnpm build` 后 `pnpm pack --pack-destination <目录>` 即可产出 tarball；产物内含 `lib/`、`cordis.patch.yml`、`assets/` 与包元信息。

## 💡 使用方式

安装后，技能以 `7d-code-reviewer` 名称注册，当你提出代码审查需求时自动生效，例如：

> 审查这段代码：……

随后输出两份结果：

1. **文本摘要**——✅ 优点、⚠️ 按严重级别分组的问题（含位置、描述与修复建议）、📊 总体评分与四个维度评分。
2. **HTML 报告**——填充占位符模板，保存为 `code-review-report-{时间戳}.html`，并告知你报告文件路径。

## 🧩 技能资源

```
assets/7d-code-reviewer/
├── SKILL.md                         # 审查逻辑 + 模板选择决策
├── references/                      # 知识库（按需加载）
│   ├── coding-standards.md          # 命名规范、代码复杂度
│   ├── security-checklist.md        # SQL注入、XSS、认证授权、泄露检查
│   └── review-examples.md           # 审查示例参考
├── templates/
│   └── report-template.html         # 纯占位符 HTML 报告模板
└── scripts/
    └── html-report-generation.md    # 填充内容的 HTML 转义规则
```

本包不附带可执行脚本；报告模板保持纯占位符，转义规则记录在 `scripts/html-report-generation.md`。

## 📚 文档

| 主题 | 内容 |
|---|---|
| [AGENTS.md](AGENTS.md) | 仓库用途、目录结构、构建打包规则与开发规范 |

## 🛠️ 开发

```sh
pnpm install
pnpm build   # tsdown；git 安装时也会以 prepare 钩子运行
pnpm test    # vitest
```

git 安装克隆本仓库时不含 `lib/`，随后运行 `prepare`（tsdown 读取专用配置）：只转译 `src/`，不用项目引用、不做类型检查，peer 依赖保持外部化。本仓库没有 lint 或类型检查脚本——构建只做转译（`dts: false`），类型错误只能在编辑器/IDE 中暴露。

提交消息遵循简体中文规范：`【类型】简短描述` 标题（不超过 50 个字符、末尾不加标点），类型从【新增】【修复】【优化】【调整】【删除】【文档】【测试】【回滚】【合并】中选用；复杂改动在标题后空一行，用数字序号逐条补充详情。

## ⚠️ 已知限制

- 该提供方只贡献一个固定 skill，不提供运行时自定义。
- 报告质量依赖模型遵循占位符填充与 HTML 转义规则；没有任何机制校验生成的报告。
- prepare 构建不附带类型声明；dsh Loader 只加载运行时入口。
- 构建不做类型检查，类型错误只能在编辑器/IDE 中暴露。

## 📄 许可证

[MIT](LICENSE) · Copyright (c) 2026 7DGroup
