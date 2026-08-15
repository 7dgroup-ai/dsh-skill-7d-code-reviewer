# 任务概述：DSH 插件开发实战教程

## 完成内容
基于本仓库 `@7dgroup/dsh-skill-7d-code-reviewer` 的真实代码，撰写了面向开发者的 DSH 插件开发实战技术教程：`docs/dsh-plugin-development-guide.md`。

## 关键工作
- 通读 src/index.ts、src/invariant.ts、package.json、cordis.patch.yml、tsdown.config.ts、tests/、assets/ 全部资源与 dsh-skill 类型定义（node_modules 内 .d.ts），确保教程与真实 API 一致。
- 验证了 `pnpm test`（2 passed）与 `rm -rf lib && pnpm build`（产出 index.js/invariant.js）真实可运行，教程中命令均为实测结果。
- 核实 cordis 运行时不导出 Schema、`@deepseek-ai/schemastery` 为传递依赖未被提升——Config schema 章节据此给出准确依赖提示。

## 教程结构（9 章）
基础概念（Cordis 插件模型/能力面/四类型）→ 项目结构 → 初始化与生命周期（PENDING/apply/dispose）→ 功能模块（provider 懒加载/资源定位/资产层）→ 配置处理（组合层/manifest/Config schema）→ 自包含构建 → 测试与调试（三层断言/8 坑速查）→ 部署分发（git/npm/tarball/allowBuilds）→ 从零复刻清单。

## 备注
仓库中原有 docs/plugin-development-tutorial.md（教学插件 hello 视角）；新教程以真实插件为主线并在前言互相引用，二者互补、不冲突。

## 追加（同日）
- 应用户要求新增零基础版指南 `docs/dsh-plugin-guide-beginner.md`：用类比（餐厅/体检/门禁）通俗讲解开发思路（8 步），并提供插件获取（npm/git/tarball）、导入（含 allowBuilds 授权）、零配置说明、4 个使用场景与排错表。与专业版教程互为进阶路线。
- 参考官方文档 `deepseek-harness/docs/`（cordis-tutorial 第 2–5、7 章、cordis-primer、capability-seams、defensive-patterns、testing、cookbook/adding-a-tool、adding-a-package）补充专业版 `dsh-plugin-development-guide.md`：新增第 3.5 节（fiber 状态机 + ctx.effect）、第 5.4 节（Standard Schema + !!js + ValidationError）、第 9–14 章（服务/事件/工具/能力面全景/防御模式/扩展阅读），附录重编为第 15 章；并修正 schemastery 应为 dependencies（运行时校验器）而非传递依赖。
