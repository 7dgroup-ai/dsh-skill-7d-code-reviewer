增加本地打包与 tarball 安装文档。已完成探索：两个 README 的「免构建授权安装」一节里 tarball 示例文件名仍为改名前的 `dsh-skill-7d-code-reviewer-0.1.0-rc.5.tgz`（缺 `7dgroup-` 前缀，与实际产物 `7dgroup-dsh-skill-7d-code-reviewer-0.1.0-rc.5.tgz` 不一致），一并修正。

## 改动清单（4 个文件）

### 1. 新建 `docs/packaging.md`（中文，与教程同语言）

章节：
- **开头**：tarball 安装与 git 安装的区别——git 安装需 `allowBuilds` 授权（pnpm 拦截 git 依赖构建脚本、首次 add 失败），tarball 携带预构建产物、不触发构建脚本；并链接教程第 5 节作前置背景。
- **打包方法**：`pnpm build` + `pnpm pack --pack-destination <目录>`（pack 自动触发 `prepare`/tsdown）；说明 `tsdown.config.ts` 约束（只转译 src/、peer 依赖 external、`dts: false`）、tarball 文件名规则（`@` 去掉、`/` 变 `-`，即 `7dgroup-dsh-skill-7d-code-reviewer-<version>.tgz`）、`lib/` 被 gitignore 但构建后入包。
- **产物内容**：`files` 字段声明的 `lib/index.js`、`lib/invariant.js`、`cordis.patch.yml`、`assets/` + 固定打入的 package.json/README/LICENSE；`tar -tzf` 核对清单。
- **安装 tarball**：`dsh plugin --profile <name> add ./7dgroup-...-<version>.tgz`，无需 allowBuilds，`--dump-config` 验证出现 `# == @7dgroup/dsh-skill-7d-code-reviewer` 层与挂载行。
- **开发迭代**：profile 依赖用 `link:` 指向本地仓库路径，改源码后 `pnpm build` + 重启 profile 生效；分发用 tarball。
- **发版清单**：发版前 bump version；涉及 provider 行为先跑 `pnpm test`；打包后在隔离环境安装验证。

（不写会话细节如 PID、实测秒数，保持文档常青。）

### 2. 编辑 `README.md`（英文）

- 修正 tarball 示例文件名为 `./7dgroup-dsh-skill-7d-code-reviewer-0.1.0-rc.5.tgz`。
- 在该代码块后补一句：本地用 `pnpm build` + `pnpm pack --pack-destination <dir>` 产出 tarball，完整流程（产物内容、安装验证、link: 迭代、发版清单）见 `docs/packaging.md`（中文）。

### 3. 编辑 `README.zh.md`（中文）

- 与 README.md 镜像：同样修正文件名 + 在「免构建授权的安装形式」代码块后加一句打包入口说明并链接 `docs/packaging.md`。

### 4. 编辑 `AGENTS.md`

- 在「目录结构」的 `docs/plugin-development-tutorial.md` 一行后新增一行登记 `docs/packaging.md`（本地打包与 tarball 安装指南）。

## 不做的事

- 不改 `docs/plugin-development-tutorial.md`（教程自成体系，打包文档独立成篇并由 README 链接）。
- 不提交 git（如需提交请另行说明，将按 `【文档】` 规范撰写提交信息）。