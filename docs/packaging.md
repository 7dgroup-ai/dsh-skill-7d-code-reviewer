# 本地打包与 tarball 安装

本文说明如何在本仓库产出可分发的预构建 tarball，以及它与 git 安装的区别。前置背景见[插件开发实战教程](plugin-development-tutorial.md)第 5 节「自包含构建：git 安装为什么是关卡」。

git 安装必须先在 profile 的 `pnpm-workspace.yaml` 里加 `allowBuilds` 授权，因为 pnpm 在得到显式允许前会拒绝运行 git 依赖的构建脚本（首次 `add` 会失败）。tarball 安装没有这一步：tarball 携带预构建产物，安装时不触发任何构建脚本。

## 打包方法

在插件仓库内执行：

```sh
pnpm build                                 # 显式构建 lib/（pack 也会自动触发 prepare）
pnpm pack --pack-destination ~/Downloads   # 产出 tarball；省略参数则输出到仓库根
```

- `prepare` 即 `tsdown`，读取仓库根的 `tsdown.config.ts`：只转译 `src/`，peer 依赖保持 external，不产出类型声明（`dts: false`）。
- 产物文件名由 scope、name、version 拼接而成：`@` 去掉、`/` 替换为 `-`，即 `7dgroup-dsh-skill-7d-code-reviewer-<version>.tgz`（当前版本为 `0.1.0-rc.5`）。
- `lib/` 在仓库中被 gitignore，但构建后会被打入 tarball——这正是「预构建」的含义。

## 产物内容

tarball 只含 `package.json` 的 `files` 字段声明的内容，外加打包工具固定打入的 `package.json`、`README.md`、`LICENSE`：

- `lib/index.js`、`lib/invariant.js` —— 两个运行时入口
- `cordis.patch.yml` —— 组合层（挂载 `skill-7d-code-reviewer` 行）
- `assets/` —— 全套 skill 资源（`SKILL.md`、`references/`、`templates/`、`scripts/`）

manifest 里是真实的版本范围，无需任何协议改写。打包后可用 `tar -tzf <tarball>` 核对清单。

## 安装 tarball

```sh
dsh plugin --profile <name> add ./7dgroup-dsh-skill-7d-code-reviewer-<version>.tgz
```

一步完成，无需 `allowBuilds`。安装后用 `--dump-config` 验证：配置里应出现 `# == @7dgroup/dsh-skill-7d-code-reviewer` 层和挂载行。

## 开发迭代：link: 指向本地仓库

自己迭代开发时，profile 的依赖可用 `link:` 指向本仓库的本地路径；修改源码后执行 `pnpm build` 再重启 profile 即生效。分发给别人则用上面的 tarball。

## 发版清单

- 发新版本前 bump `package.json` 的 `version`：tarball 文件名和升级安装都靠它区分。
- 涉及 provider 行为的改动，打包前先跑 `pnpm test`。
- 打包后建议在一个隔离环境里安装 tarball 并用 `--dump-config` 验证 bundle 层正确挂载。
