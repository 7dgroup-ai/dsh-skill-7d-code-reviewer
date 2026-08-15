# @7dgroup/dsh-skill-7d-code-reviewer

[English](README.md) | 中文

作者 7DGroup · MIT · [Gitee 仓库](https://gitee.com/zuozewei/dsh-skill-7d-code-reviewer)

可安装的组合包（bundle），向 `ctx.skills` 贡献 `7d-code-reviewer`。该 skill 提供 7DGroup 模板驱动的代码审查指令：五步审查流程、严重/中等/轻微三级问题分级、四维度评分标准，以及纯占位符的 HTML 报告模板。

## 从 Gitee 安装

`dsh plugin` 会把 bundle 追加进 profile 的 `dsh.profile.bundles`，本 bundle 自带的 patch 层在基础组合之上挂载 `skill-7d-code-reviewer` 行。环境要求 Node `^22.19.0 || >=24.0.0` 与 pnpm 10+：

```sh
dsh plugin --profile <name> add git+https://gitee.com/zuozewei/dsh-skill-7d-code-reviewer.git
```

任何 pnpm 可识别的 git 地址均可；若本仓库镜像到 GitHub，`github:<owner>/dsh-skill-7d-code-reviewer` 简写等价。

pnpm 在得到显式允许前会拒绝运行 git 依赖的构建脚本，所以第一次 `add` 会失败。把 pnpm 打印的确切包键复制进该 profile 的 `pnpm-workspace.yaml`，然后重新执行：

```yaml
allowBuilds:
  '@7dgroup/dsh-skill-7d-code-reviewer@git+https://gitee.com/zuozewei/dsh-skill-7d-code-reviewer.git#<sha>': true
```

允许构建意味着让该包的代码在安装时于你的机器上执行，且不在任何 agent 沙箱之内。建议锁定 commit（`git+https://gitee.com/zuozewei/dsh-skill-7d-code-reviewer.git#<sha>`），让后续推送无法悄悄改变实际运行的内容。

## 免构建授权的安装形式

以下两种形式携带预构建代码，无需任何构建授权：

```sh
dsh plugin --profile <name> add @7dgroup/dsh-skill-7d-code-reviewer        # npm（发布后）
dsh plugin --profile <name> add ./dsh-skill-7d-code-reviewer-0.1.0-rc.5.tgz    # pnpm pack 产出的 tarball
```

## 构建与测试

git 安装克隆本仓库时不含 `lib/`，随后运行 `prepare`（tsdown 读取专用配置）：只转译 `src/`，不用项目引用、不做类型检查，peer 依赖保持外部化。

```sh
pnpm install
pnpm test
```

provider 将包内 `assets/7d-code-reviewer/` 目录暴露为 skill 资源基目录：`references/` 存放按需加载的编码规范、安全检查清单与审查示例；`templates/report-template.html` 是纯占位符的 HTML 报告模板；`scripts/html-report-generation.md` 说明填充内容的 HTML 转义规则（本包不附带可执行脚本）。

提交消息遵循 [`.trae/rules/git-commit-message.md`](.trae/rules/git-commit-message.md) 的中文规范：`【类型】简短描述` 标题，类型从【新增】【修复】【优化】【调整】【删除】【文档】【测试】【回滚】【合并】中选用。

## 已知限制

- 该提供方只贡献一个固定 skill，不提供运行时自定义。
- 报告质量依赖模型遵循占位符填充与 HTML 转义规则；没有任何机制校验生成的报告。
- prepare 构建不附带类型声明；dsh Loader 只加载运行时入口。
