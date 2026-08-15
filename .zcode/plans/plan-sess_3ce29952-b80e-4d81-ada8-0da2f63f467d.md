# 更新插件使用文档（README 双语 + package.json 元信息）

仓库：`/Users/zuozewei/Downloads/gitlab/deepseek/dsh-skill-7d-code-reviewer`（remote：`gitee.com/zuozewei/dsh-skill-7d-code-reviewer`）

已核实 `dsh plugin add` 的 git 参数识别规则（deepseek-harness `apps/cli/src/plugin.ts:150`：`/^git\+|^github:|\.git(#|$)/`），`git+https://gitee.com/...` 形式可直接安装，allowBuilds 授权流程不变。

## 1. README.md（英文）

- **元信息行**：语言切换行下加一行 `By 7DGroup · MIT · [Gitee](https://gitee.com/zuozewei/dsh-skill-7d-code-reviewer)`。
- **「Install from GitHub」→「Install from Gitee」**：
  - 主命令改为真实地址：`dsh plugin --profile <name> add git+https://gitee.com/zuozewei/dsh-skill-7d-code-reviewer.git`
  - 附一句：任何 pnpm 可识别的 git spec 均可；若镜像到 GitHub，`github:<owner>/dsh-skill-7d-code-reviewer` 简写等价。
  - allowBuilds 示例键同步为真实形式：`'@deepseek-ai/dsh-skill-7d-code-reviewer@git+https://gitee.com/zuozewei/dsh-skill-7d-code-reviewer.git#<sha>': true`
  - 锁定 commit 建议改为 `git+https://gitee.com/zuozewei/dsh-skill-7d-code-reviewer.git#<sha>`（键含 sha，新提交需重新授权）。
  - 增加环境要求一行：Node `^22.19.0 || >=24.0.0` + pnpm 10+。
- **「Build and test」节末尾**加提交规范说明：提交消息遵循 `.trae/rules/git-commit-message.md` 的中文规范（`【类型】简短描述`，9 个固定类型标签）。

## 2. README.zh.md（中文，与英文逐节镜像）

- 同步以上全部改动（标题区元信息行、安装节改为 Gitee 真实地址 + github: 简写备注、allowBuilds 键、#<sha> 锁定建议、Node/pnpm 环境要求、提交规范说明）。
- 修复错别字：`HTML 抔告模板` → `HTML 报告模板`。

## 3. package.json 元信息字段

在 `author` 附近补：

```json
"repository": { "type": "git", "url": "git+https://gitee.com/zuozewei/dsh-skill-7d-code-reviewer.git" },
"homepage": "https://gitee.com/zuozewei/dsh-skill-7d-code-reviewer#readme",
"bugs": { "url": "https://gitee.com/zuozewei/dsh-skill-7d-code-reviewer/issues" }
```

不改 name/依赖/files —— 元信息字段不影响 lockfile，也不改变 git 安装构建行为。包名保持 `@deepseek-ai/*` scope（沿用已记录的决策）。

## 4. 验证与提交

- `pnpm test`（确认 package.json 编辑未破坏 provider spec，2 个测试）。
- 双语 README 交叉检查：安装命令、allowBuilds 键、#<sha> 建议逐字一致。
- 提交（遵循 `.trae/rules/git-commit-message.md` 规范）：`【文档】更新插件使用文档：安装地址改为Gitee并补充元信息`