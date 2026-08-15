# DSH 插件开发实战：从零构建一个模板驱动的技能插件

本教程以本仓库的真实插件 `@7dgroup/dsh-skill-7d-code-reviewer` 为蓝本，逐步讲解 DSH（DeepSeek Harness）插件的核心开发流程：插件初始化、生命周期管理、功能模块实现、配置处理，以及贯穿始终的调试与部署实践。教程中的全部代码摘自本仓库可运行源码（`pnpm test` / `pnpm build` 均已验证通过），读者可以对照仓库跟随练习，也可以把这些代码作为自己插件的起点。后半部分（第 9–13 章）的进阶专题依据 [DeepSeek Harness 官方文档](https://github.com/deepseek-ai/deepseek-harness)（`docs/` 下的 Cordis 教程、能力面图谱、防御性模式与测试策略）编写。

与 [plugin-development-tutorial.md](plugin-development-tutorial.md) 的教学插件视角不同，本教程直接解剖"终点形态"的真实插件，按开发者的实际工作顺序组织：先理解模型，再搭结构，然后实现功能、处理配置，最后测试、调试、分发。

**读者要求**：熟悉 Node.js 与 TypeScript 基础语法（类型注解、`import type`）。不要求事先了解 Cordis——插件模型会在用到处讲解。

---

## 目录

1. [基础概念：DSH 与 Cordis 插件模型](#1-基础概念dsh-与-cordis-插件模型)
2. [项目结构总览](#2-项目结构总览)
3. [插件初始化与生命周期管理](#3-插件初始化与生命周期管理)
4. [功能模块实现：技能提供者与资产层](#4-功能模块实现技能提供者与资产层)
5. [配置处理：manifest、组合层与 Config schema](#5-配置处理manifest组合层与-config-schema)
6. [构建与自包含：git 安装为什么是关卡](#6-构建与自包含git-安装为什么是关卡)
7. [测试与调试](#7-测试与调试)
8. [部署与分发](#8-部署与分发)
9. [进阶：服务——在 ctx 上暴露与消费能力](#9-进阶服务在-ctx-上暴露与消费能力)
10. [进阶：事件——类型化通信与分发模式](#10-进阶事件类型化通信与分发模式)
11. [进阶：注册一个模型可调用的工具](#11-进阶注册一个模型可调用的工具)
12. [能力面全景：本插件的生态位置](#12-能力面全景本插件的生态位置)
13. [防御性模式与测试纪律](#13-防御性模式与测试纪律)
14. [扩展阅读](#14-扩展阅读)
15. [附录：从零复刻的最小清单](#15-附录从零复刻的最小清单)

---

## 1. 基础概念：DSH 与 Cordis 插件模型

### 1.1 插件是一个函数

DSH 的插件模型来自 Cordis。一个 Cordis 插件不是类、不是配置文件，而是一个导出了三个成员的 ES 模块：

```ts
export const name = 'skill-7d-code-reviewer'   // 诊断用显示名
export const inject = ['skills']               // 依赖的服务列表
export function apply(ctx: Context): void {    // 挂载时执行的函数
  ctx.skills.registerProvider(() => provider)
}
```

- **`name`**：标识插件的元数据，出现在错误信息与诊断输出里。
- **`inject`**：声明本插件依赖的服务。Cordis 是**依赖驱动加载**的：`inject` 列出的服务未就绪时，插件保持在 PENDING 状态；一旦服务的提供方挂载完毕，插件自动激活，`apply` 才会运行。因此在 `apply` 内部可以保证 `ctx.skills` 一定存在，与配置文件中的书写顺序无关。
- **`apply(ctx)`**：插件的全部副作用都在这里发生。惯例是只做"注册"——把插件的能力挂到某个服务上。

### 1.2 能力面：你把能力注册到哪

DSH 把可替换的能力组织成一个个**注册表服务**（capability seam）。插件开发的第一步是回答"我要贡献什么"，答案决定你注入哪个服务：

| 你要贡献           | 能力面              | 注册调用                                          | 本文位置             |
| -------------- | ---------------- | --------------------------------------------- | ---------------- |
| 技能（skill）      | `ctx.skills`     | `ctx.skills.registerProvider(() => provider)` | 第 3、4 章          |
| 不变量（invariant） | `ctx.invariants` | `ctx.invariants.register(pkg, install)`       | 第 4.4 节          |
| 工具（tool）       | `ctx.tools`      | `ctx.tools.register(defineTool({...}))`       | 第 11 章           |

本插件注册的是一个**技能**：随包携带的 Markdown 指令体（SKILL.md），模型或用户按名取用。注册调用全部是**注册式 effect**——返回的清理函数自动附着在插件实例上，插件卸载（含热重载）时自动撤销注册，你从不手写清理逻辑。

### 1.3 两种包身份：依赖包与组合包

一个独立仓库的 npm 包在 DSH 生态里有两种身份，由 `package.json` 中有无 `dsh` 键区分：

| 形态              | 声明                 | 用途                          |
| --------------- | ------------------ | --------------------------- |
| 普通依赖包           | 无 `dsh` 键          | 供其他插件 `import`，不被用户启用       |
| **组合包（bundle）** | `dsh.bundle.patch` | 用户执行 `dsh plugin add` 启用的插件 |

本插件是组合包：它除了代码，还自带一个**组合层**（`cordis.patch.yml`），声明自己应当以哪一行配置进入用户的 profile。第 5 章展开。

### 1.4 技能注册表的四个核心类型

`@deepseek-ai/dsh-skill` 包定义了技能能力面的全部契约（以下是简化摘要，完整定义见其类型声明）：

```ts
/** list() 返回的轻量元数据（"列表页"） */
interface SkillSummary {
  readonly name: string          // kebab-case 技能名
  readonly description: string   // 触发依据：模型据此判断何时调用
  readonly invocation: {         // 谁能触发
    modelInvocable: boolean      //   模型自主调用
    userInvocable: boolean       //   用户点名调用（如 /7d-code-reviewer）
  }
  readonly source: string        // 来源桶，随包捆绑为 'bundled'
  readonly provider: string      // 提供方名
  readonly resourceBase?: { ... } // 资源根（目录/URL/不透明描述）
}

/** provider 的目录条目（"收录页"），在 Summary 上扩展 */
interface SkillCandidate extends SkillSummary {
  readonly rank: number          // 排序档位，数字小者胜出同名冲突
  readonly locator: unknown      // 提供方私有句柄，get() 时原样传回
}

/** get() 返回的完整定义（"详情页"） */
interface SkillDefinition extends SkillSummary {
  readonly content: string       // Markdown 指令正文
}

/** 你要实现的提供者 */
interface SkillProvider {
  readonly name: string
  list(): Promise<SkillCandidate[]>
  get(candidate: SkillCandidate): Promise<SkillDefinition>
}
```

四个类型的关系是一条漏斗：`SkillCandidate`（provider 目录里的条目）→ 注册表合并、按 `rank` 决胜同名 → `ctx.skills.list()` 对外投影成 `SkillSummary` → `ctx.skills.get(name)` 向 provider 要回完整 `SkillDefinition`。

---

## 2. 项目结构总览

先看全局。以下是本仓库的完整布局（`lib/` 是构建产物，已 gitignore）：

```
dsh-skill-7d-code-reviewer/
├── package.json                 # manifest：exports/files/dsh 键/peer 依赖
├── tsdown.config.ts             # 自包含构建配置
├── cordis.patch.yml             # 组合层：本 bundle 的挂载行
├── src/
│   ├── index.ts                 # 主入口：注册技能提供者
│   └── invariant.ts             # 伴生入口：登记包所有权
├── assets/
│   └── 7d-code-reviewer/
│       ├── SKILL.md             # 技能正文：审查流程、评分标准、填充规则
│       ├── references/          # 按需加载的知识库
│       │   ├── coding-standards.md
│       │   ├── security-checklist.md
│       │   └── review-examples.md
│       ├── templates/
│       │   └── report-template.html   # 纯占位符 HTML 报告模板
│       └── scripts/
│           └── html-report-generation.md  # HTML 转义规则（纯文档）
├── tests/
│   └── skill-7d-code-reviewer.spec.ts   # 注册/资源完备性测试
├── lib/                         # tsdown 产物（index.js / invariant.js）
├── docs/                        # 教程与打包指南
└── .trae/rules/git-commit-message.md    # 提交信息规范
```

各文件的分工可以概括为**四层**：

| 层          | 文件                         | 职责                          |
| ---------- | -------------------------- | --------------------------- |
| manifest 层 | `package.json`             | 声明入口、发布内容、peer 契约、bundle 标识 |
| 代码层        | `src/*.ts` → `lib/*.js`    | 向能力面注册贡献，纯胶水，无业务逻辑          |
| 资产层        | `assets/7d-code-reviewer/` | 技能的全部"内容"：正文、知识库、模板         |
| 组合层        | `cordis.patch.yml`         | 声明"用户启用我时，往 profile 里插哪一行"  |

这个分层是本插件最重要的架构决策：**代码层极薄，内容全部资产化**。技能的行为（审什么、怎么评分、报告长什么样）全在 Markdown 与 HTML 模板里，改行为不需要改 TypeScript。

---

## 3. 插件初始化与生命周期管理

### 3.1 完整的插件入口

以下是 `src/index.ts` 的全部运行时逻辑（略去模块注释与查重标记）：

```ts
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import type { Context } from '@deepseek-ai/cordis'
import {
  BUNDLED_SKILL_RANK,
  type SkillCandidate,
  type SkillDefinition,
  type SkillProvider,
} from '@deepseek-ai/dsh-skill'

const PROVIDER_NAME = '7d-code-reviewer'
const SKILL_BODY_URL = new URL('../assets/7d-code-reviewer/SKILL.md', import.meta.url)
const RESOURCE_BASE = {
  kind: 'directory',
  path: fileURLToPath(new URL('../assets/7d-code-reviewer/', import.meta.url)),
} as const
const INVOCATION = { modelInvocable: true, userInvocable: true } as const
const DESCRIPTION = '7DGroup 模板驱动的代码审查：按命名、安全、性能、异常处理维度逐行审查代码，'
  + '问题分为严重/中等/轻微三级并评分，输出文本摘要与 HTML 审查报告。'
  + '当用户要求审查代码、评审改动、评估代码质量或生成代码审查报告时使用。'

const CANDIDATE: SkillCandidate = {
  name: PROVIDER_NAME,
  description: DESCRIPTION,
  invocation: INVOCATION,
  provider: PROVIDER_NAME,
  source: 'bundled',
  resourceBase: RESOURCE_BASE,
  rank: BUNDLED_SKILL_RANK,
  locator: SKILL_BODY_URL,
}

const provider: SkillProvider = {
  name: PROVIDER_NAME,
  list: () => Promise.resolve([CANDIDATE]),
  async get(_candidate): Promise<SkillDefinition> {
    return {
      name: CANDIDATE.name,
      description: CANDIDATE.description,
      invocation: CANDIDATE.invocation,
      provider: CANDIDATE.provider,
      source: CANDIDATE.source,
      resourceBase: RESOURCE_BASE,
      content: await readFile(SKILL_BODY_URL, 'utf8'),
    }
  },
}

export const name = 'skill-7d-code-reviewer'
export const inject = ['skills']

export function apply(ctx: Context): void {
  ctx.skills.registerProvider(() => provider)
}
```

只有 60 余行。把所有常量提到模块顶层、在 `apply` 里只留一个注册调用——这不是洁癖，而是让"插件做什么"一眼可读、让测试可以直接断言常量。

### 3.2 初始化时序：PENDING 状态机

把插件装载进 Cordis（`ctx.plugin(Plugin)` 或由 loader 按 profile 挂载）后，生命周期如下：

```
装载 ──► inject 中的服务已就绪？
          │否                │是
          ▼                  ▼
       PENDING ──────────► apply(ctx) 运行
       (等待提供方，          │
        不报错、               ├─ 注册成功 ──► ACTIVE（fiber 可用）
        不超时是合法状态)      └─ apply 抛错 ──► 加载失败
                                  │
                            dispose() ◄── 卸载/热重载
                                  │
                            依次执行全部 effect 的清理函数
                            （注销 provider、失效缓存）──► 完全卸载
```

三个实践要点：

1. **PENDING 不是错误。** `inject: ['skills']` 而 skills 注册表尚未挂载时，插件安静等待。这是依赖驱动加载的特性——它让配置文件里的书写顺序无关紧要，代价是拼写错误不会报错，只会让插件"永远等着"。
2. **`apply` 里只做注册。** 注册式 effect（如 `registerProvider`）的返回值是清理函数，Cordis 自动把它附着在插件实例（fiber）上。不要在 `apply` 里启动定时器、打开连接而不交还给框架管理——那会漏掉卸载时的清理。
3. **`registerProvider` 接收惰性工厂。** `ctx.skills.registerProvider(() => provider)` 的参数是 `() => provider` 而非 `provider`——注册表在需要时才调用工厂取用提供者，且工厂内抛出的错误发生在注册表的语境里，诊断信息更完整。

### 3.3 dispose：卸载的语义与验证

插件卸载时，全部 effect 的清理函数按注册的逆序执行。对技能插件而言，dispose 意味着 provider 从注册表注销、目录缓存失效。本仓库的测试最后两行就是对生命周期闭环的断言：

```ts
const fiber = await ctx.plugin(Skill7dCodeReviewer)   // 挂载
// …断言注册成功…
await fiber.dispose()                                  // 卸载
expect(await ctx.skills.list()).toEqual([])            // 注册表已清空
```

`ctx.plugin()` 返回 **fiber**——已加载插件实例的运行时句柄；`fiber.dispose()` 会等全部清理完成才 resolve。这两行测试是每个插件都该有的回归底线：**装得干净，卸得干净**。

### 3.4 动手实验：亲手触发一次 PENDING

在你自己的插件里把 `inject` 的服务名拼错：

```ts
export const inject = ['skillz']   // 拼错了
```

然后跑测试。预期结果不是**失败**，而是**超时**：`skillz` 服务没有提供方，插件停在 PENDING，`apply` 永远不运行，事件循环里也没有东西阻止进程退出——vitest 等到超时。这是新手最常见的"插件什么都没做"场景，排错方法见第 7.3 节。改回 `['skills']` 即恢复。

### 3.5 官方语义：fiber 状态机与 ctx.effect()

第 3.2 节的时序图是简化的。DeepSeek Harness 官方文档（Cordis 教程第 2 章）给出的完整 fiber 状态机是：

```
PENDING → LOADING → ACTIVE → UNLOADING → DISPOSED
                 ↘ FAILED
```

- **PENDING**：已声明，但 `inject` 的某个服务尚不可用；
- **LOADING / ACTIVE**：`apply` 正在运行／已经完成；
- **FAILED**：`apply` 抛出异常，或配置校验失败（见第 5.3 节）；
- **UNLOADING / DISPOSED**：disposer 正在运行／一切已拆除。

两个官方补充语义值得记住：

1. **`ctx.effect()` 是"非 Cordis 资源"的通用容器。** 第 3.2 节说"apply 里只做注册"，但有些资源（定时器、外部连接、文件 watcher）没有对应的注册表 API。此时把它们包进 `ctx.effect()`，返回 disposer：

```ts
export function apply(ctx: Context): void {
  ctx.effect(() => {
    const timer = setInterval(() => console.log('tick'), 200)
    return () => clearInterval(timer)   // 卸载时执行
  })
}
```

effect 主体在加载期间运行，它返回的 disposer 在卸载期间运行。这样热重载时也会正确清理，不会留下孤儿定时器或连接。

2. **disposer 按注册顺序的逆序启动，但异步 disposer 并发运行。** 如果拆除步骤有先后依赖，把它们放进同一个 disposer 里顺序 await。这条规则对任何多资源插件都成立。

顺带一提官方定义的"已经是 effect 的操作"清单，你几乎总是优先用它们而不是手写 `ctx.effect()`：`ctx.on(event, listener)`（监听器随插件移除）、`ctx.plugin(child)`（子插件随父插件 dispose）、服务注册（`ctx.skills.registerProvider` 等返回的 disposer 自动附着）。

---

## 4. 功能模块实现：技能提供者与资产层

### 4.1 provider 的两个方法：list 慢、get 快的懒加载设计

```ts
const provider: SkillProvider = {
  name: PROVIDER_NAME,
  list: () => Promise.resolve([CANDIDATE]),        // 只返回元数据
  async get(_candidate): Promise<SkillDefinition> {
    return { /* …元数据原样回传… */ }
  }
}
```

- **`list()` 是列表页**：注册表枚举所有技能、做同名合并排序时高频调用它，所以必须轻——只返回常量候选，不做任何 I/O。
- **`get()` 是详情页**：用 `readFile` 现读 SKILL.md 正文。正文读取只发生在用户/模型真正取用技能的那一刻，几 KB 的 I/O 留在最需要的地方。附带的好处：改正文只需重新构建，不需要改一行代码。

### 4.2 SkillCandidate 字段逐个讲

| 字段             | 本插件的值                                           | 说明                                                                              |
| -------------- | ----------------------------------------------- | ------------------------------------------------------------------------------- |
| `name`         | `'7d-code-reviewer'`                            | kebab-case 技能名，`ctx.skills.get(name)` 按它取技能；注册表用它做同名决胜                          |
| `description`  | 三句话中文描述                                         | **触发依据**：模型根据这段话判断何时调用技能。值得像写路由规则一样认真写——说明能力（做什么）、输出（交付什么）、时机（何时用）              |
| `invocation`   | `{ modelInvocable: true, userInvocable: true }` | 双通道开放：模型可自主调用，用户也可 `/7d-code-reviewer` 点名。只想让用户显式触发的技能设 `modelInvocable: false` |
| `provider`     | `'7d-code-reviewer'`                            | 与 `provider.name` 一致                                                            |
| `source`       | `'bundled'`                                     | 来源桶。这是模型可见的元数据，不参与优先级                                                           |
| `resourceBase` | 目录型资源根                                          | 正文里 `references/…`、`templates/…` 都基于它解析（4.3 节）                                  |
| `rank`         | `BUNDLED_SKILL_RANK`（=600）                      | 排序档位。**数字小者胜**；同名技能同层冲突时先比 rank                                                 |
| `locator`      | `SKILL_BODY_URL`                                | 提供方私有句柄，注册表加载时原样传回 `get()`——你现在明白 `get(_candidate)` 为什么带这个参数了                   |

一个容易踩的细节：**注册表的 `list()` 投影不含 `rank` 与 `locator`**。这两个字段在目录合并后就消费掉了，`ctx.skills.list()` 返回的每个条目只有 `name`、`description`、`invocation`、`provider`、`source`、`resourceBase` 六个键。写"注册了什么"的断言时照这个投影写，别把候选对象原样塞进期望值。

### 4.3 资源定位：`../assets` 的层级账

```ts
const SKILL_BODY_URL = new URL('../assets/7d-code-reviewer/SKILL.md', import.meta.url)
```

为什么是 `../` 而不是 `./`？因为 **`import.meta.url` 在运行时指向构建产物 `lib/index.js`，不是源码 `src/index.ts`**。从 `lib/` 出发，包根的 `assets/` 在上一级：

```
<包根>/
├── lib/index.js        ← import.meta.url 在这里
└── assets/7d-code-reviewer/   ← 所以是 ../assets
```

写成 `./assets` 运行时会去找 `lib/assets/`（不存在）；写成 `../../assets` 则跳出包外。**层级永远按产物布局算**——记住这一条，怎么改构建配置都不会错。

`resourceBase` 用 `fileURLToPath` 把 URL 转成绝对路径，因为 `kind: 'directory'` 型资源根约定给的是文件系统路径（另一种合法形态是 `{ kind: 'url', url }`）。

### 4.4 第二个功能模块：invariant 伴生入口

`src/invariant.ts` 是本包的第二个 Cordis 插件，接入 `ctx.invariants`：

```ts
import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@7dgroup/dsh-skill-7d-code-reviewer'

export const name = 'skill-7d-code-reviewer-invariant'
export const inject = ['invariants']

const install: InvariantInstaller = () => {}   // 空 installer

export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
```

注意它的 installer 是**空的**——源码注释就是解释：本包没有运行时不变量要声明，注册只为**预留包名的所有权**（防止其他包冒名注册这个包的不变量）；技能注册的唯一性与生命周期检查由 skill registry 自己负责。

如果你的包确实要携带不变量，把 `install` 写成实际检查即可；完全不需要的话，这个入口可以整体省掉。要让它随包发布，需要四处同步（本仓库都已就位）：`peerDependencies`/`devDependencies` 加 `@deepseek-ai/dsh-invariants`、`exports` 加 `"./invariant"`、`files` 加 `lib/invariant.js`、tsdown 的 `entry` 加 `src/invariant.ts`。

### 4.5 资产层：模板驱动模式

代码层薄到极致，是因为"业务逻辑"全部在 `assets/7d-code-reviewer/` 里。这个目录本身就是一个微型架构：

| 目录                                  | 角色                                                      | 加载时机              |
| ----------------------------------- | ------------------------------------------------------- | ----------------- |
| `SKILL.md`                          | 目录页 + 流程规则：五步审查流程、三级问题分级、四维评分标准、占位符填充规则                 | 技能被调用时常驻注入        |
| `references/`                       | 知识库：各语言编码规范、安全检查清单（注入/XSS/越权，带 ❌/✅ 对照示例）、审查意见正反例        | 审查进行到对应环节**按需**加载 |
| `templates/report-template.html`    | 输出模板：纯占位符（`{{report_title}}`、`{{total_score}}`…），严禁逻辑判断 | 生成 HTML 报告时读取     |
| `scripts/html-report-generation.md` | 执行规范：填充流程与 HTML 转义规则（`<`→`&lt;` 等，防 XSS）                | 生成报告前读取           |

设计原则有三条，值得迁移到任何"内容型"插件：

1. **职责分离**：SKILL.md 负责决策（审什么、多严重），templates 负责呈现（报告长什么样），两者独立变化。
2. **按需加载**：常驻注入的只有 SKILL.md 正文；重资料放 references，流程走到才取——常驻内容越克制，技能触发时消耗的上下文越少。
3. **模板纯占位符**：模板里没有 if/else，"没有严重问题时填什么"这类决策写在 SKILL.md 的"无内容填充规则"里。这保证了输出结构永远稳定，也保证了模板可以被独立改版。

本仓库的测试对资产完备性逐项把关（见 7.2 节），因为这类插件最典型的事故是：正文引用了模板，模板改名或漏进发布清单，CI 全绿、发布成功、用户触发技能时才发现资源缺失。

---

## 5. 配置处理：manifest、组合层与 Config schema

DSH 插件的"配置"分布在三个地方，各管一段：

```
cordis.patch.yml ──► 我以哪一行配置进入 profile（挂载配置）
package.json     ──► 我是什么、发布什么、依赖什么（manifest 配置）
Config schema    ──► 用户可以调我的哪些参数（运行时配置）
```

### 5.1 组合层：一行 YAML 的完整链路

`cordis.patch.yml` 全文：

```yaml
# This bundle's composition layer: mounted when a profile lists this bundle
# (dsh plugin --profile <name> add <this package>). The row references this
# package by name so Node module resolution finds the installed code.
- insert:
    - id: skill-7d-code-reviewer
      name: '@7dgroup/dsh-skill-7d-code-reviewer'
```

它与用户手写的 `--patch` overlay 是同一种语法，只有一处关键区别：**行按包名引用，而不是相对路径**。完整链路：

```
用户：dsh plugin --profile dev add <本包>
  └─► 本包追加进 profile 的 bundles
        └─► 启动时本 patch 层叠加在基础组合之上
              └─► 合成配置里出现 name: '@7dgroup/dsh-skill-7d-code-reviewer' 这一行
                    └─► Loader 按包名做 Node 模块解析，找到已安装代码并挂载
                          └─► 你的 apply(ctx) 运行
```

`insert` 行的 `id` 是这条配置项的稳定标识，自取即可，但要避开基础组合里已有的行 id。两条写层铁律：

1. **按 id 覆盖前层行时，必须重述整行的每个键。** patch 替换整个 config 值，**不做深度合并**——只写你想改的一个键，其余键会被清空。
2. **默认值只给用户大概率会保留的，其余交给 schema。** 行的 `config` 块在挂载前会经过插件声明的 `Config` schema 校验与补全（见 5.3 节），不要在组合层里堆一份将来没人记得改的默认值副本。

### 5.2 manifest：package.json 的关键字段

```jsonc
{
  "name": "@7dgroup/dsh-skill-7d-code-reviewer",
  "type": "module",                      // ESM 包，tsdown 只产 ESM 与之对应
  "main": "lib/index.js",
  "exports": {
    ".": { "default": "./lib/index.js" },        // 主入口
    "./invariant": { "default": "./lib/invariant.js" },  // 伴生入口
    "./cordis.patch.yml": "./cordis.patch.yml",  // 让 dsh plugin 能按 <包名>/cordis.patch.yml 读组合层
    "./package.json": "./package.json"           // 让工具不猜路径就能读 manifest
  },
  "files": ["lib/index.js", "lib/invariant.js", "cordis.patch.yml", "assets"],  // 发布白名单
  "dsh": {
    "bundle": { "patch": "./cordis.patch.yml" }  // 组合包身份的声明
  },
  "engines": { "node": "^22.19.0 || >=24.0.0" },
  "peerDependencies": {
    "@deepseek-ai/cordis": "^4.0.1",
    "@deepseek-ai/dsh-invariants": "^0.1.0-rc.5",
    "@deepseek-ai/dsh-skill": "^0.1.0-rc.5"
  },
  "devDependencies": { /* 同上三个包的镜像 + @types/node、tsdown、vitest */ }
}
```

四个容易问的问题：

- **为什么 peer 依赖在 devDependencies 里镜像一份？** peerDependencies 声明契约："运行时由安装方的 profile 提供 cordis 运行时与 skills 注册表"。独立插件**永远不该把 Cordis 打进自己的依赖**——安装方已经有一个，打进第二个会得到两个互不相识的注册表。devDependencies 镜像一份，让本仓库在没有 dsh profile 的情况下也能独立构建与测试，且测试对着 npm 上真实发布的 peer 跑，测的就是消费者将来拿到的组合。
- **为什么版本范围是 `^4.0.1` 而不是 `workspace:^`？** 铁律：**独立仓库一律真实版本范围，绝不能写 `workspace:`**。该协议只在 pnpm workspace 内可解析；git 安装时 pnpm 在 workspace 上下文之外解析依赖，`workspace:` 在那里直接报错（机制见第 6 章）。
- **`files` 少写一项会怎样？** 该文件不进 tarball，消费者拿到残缺的包。新增需要发布的资源（比如一个新的模板目录）时要同步更新 `files`——资源完备性测试（7.2 节）是这道防线的回归网。
- **`exports` 少了会怎样？** 测试里 `import * as Plugin from '@7dgroup/dsh-skill-7d-code-reviewer'` 这种**包名自引用**依赖 `exports` 字段；没有它，Node 找不到"包自己"，导入直接失败。自引用解析到 `lib/index.js`（产物），所以测试顺带验证了 manifest 声明与真实产物一致。

### 5.3 运行时配置：Config schema

本插件刻意**不声明**运行时配置：技能行为完全由资产层驱动，没有用户可调参数，组合层也就不写 `config` 块。这是"内容型插件"的合理选择。

当你的插件需要可配置项（比如开关、路径、阈值）时，Cordis 的机制是导出 `Config` schema。模式如下：

```ts
import Schema from '@deepseek-ai/schemastery'
import type { Context } from '@deepseek-ai/cordis'

export interface Config {
  reportDir: string
  strictMode: boolean
}

/** 声明配置 schema：挂载前 config 块经它校验与补全默认值 */
export const Config: Schema<Config> = Schema.object({
  reportDir: Schema.string().default('./').description('HTML 报告输出目录'),
  strictMode: Schema.boolean().default(false).description('严格模式：轻微问题也计入扣分'),
})

export function apply(ctx: Context, config: Config): void {
  // config 已经过 schema 校验：缺省项补全、类型错误在挂载前报出
  ctx.skills.registerProvider(() => makeProvider(config))
}
```

三个注意点：

1. `apply` 的第二个参数接收**经过 schema 处理后的配置**——你拿到的一定符合 `Config` 接口，不必再做空值检查。
2. `@deepseek-ai/schemastery` 是**运行时校验器**：官方仓库把这类 schema 库放进 `dependencies`（而非 peer），因为 schema 对象在运行时真的会被调用。要用 `Config`，就把它加进 `dependencies`。另一点：Cordis 接受任意 **Standard Schema** 验证器，所以导出的 `Config` 必须是 schema 对象，普通对象导出无法工作。
3. 组合层里给行加 `config` 块时，配合 schema 的默认值机制：**schema 负责补全，组合层只给非默认值**。

### 5.4 配置的两个补充机制

官方文档（Cordis 教程第 5 章）还给出两个本插件没用到、但常见插件会遇到的机制：

**① 校验失败会明确报错。** 传入类型不符的值时，插件 fiber 进入 FAILED 状态，启动器打印错误并以非零状态退出，例如：

```
ValidationError: invalid config:
  - $.targets expected array but got not-an-array (at targets)
```

这正是"插件绝不会在配置不完整时启动"的保证。

**② 计算得到的配置值。** Loader 支持 `!!js` 标签，在加载时求值：

```yaml
- name: '@myorg/dsh-skill-hello'
  config:
    reportDir: !!js process.env.REPORT_DIR ?? './reports'
```

`!!js` 只在 `config` 与条目 `disabled` 字段内有效；其余元数据（`name`、`id`、`inject`）保持静态字面值。

---

## 6. 构建与自包含：git 安装为什么是关卡

### 6.1 pnpm 的 git 安装流程

用户 `dsh plugin add git+https://…` 时，pnpm 对 git 依赖做四件事，每一步都推出一条构建纪律：

1. **克隆**仓库——拿到的是 git 工作目录内容，`lib/` 被 gitignore，不在其中；
2. 在 store 的克隆里**解析并安装依赖**——那里没有你的 workspace，只有 package.json 声明的真实版本范围；
3. 运行 **`prepare`**（即 `tsdown`）——此刻必须从零产出 `lib/`；
4. 把结果**打包缓存**，安装方 profile 统一从缓存解析。

| 流程事实                  | 推论                                              |
| --------------------- | ----------------------------------------------- |
| 克隆不含 `lib/`           | `prepare` 必须从零产出全部产物                            |
| 依赖在 workspace 之外解析    | 版本范围必须真实，`workspace:` 必炸                        |
| prepare 在 store 克隆里运行 | 不能引用 monorepo 上下文（项目引用、相邻 checkout、共享 tsconfig） |
| 结果按提交缓存               | 上游推新提交后消费者要重新安装（与第 8 章的 sha 授权互相呼应）             |

"自包含"的含义就在这里：**构建配置只假设"仓库自己 + npm 上的依赖"，别的什么都不假设**。这也是为什么本插件仓库必须是独立 git 仓库，不能活在任何 pnpm workspace 之内。

### 6.2 tsdown 配置逐项

```ts
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts', 'src/invariant.ts'],
  outDir: 'lib',
  format: ['esm'],        // 包是 type: module，只出 ESM
  platform: 'node',       // 运行在 Node，不是浏览器
  target: 'es2024',       // engines 要求的 Node 版本都支持
  dts: false,             // 不产类型声明（见下）
  fixedExtension: false,  // 锁定 .js 扩展名（见下，这是个真坑）
  unbundle: true,         // 不打包，peer 保持外部化（见下）
})
```

- **`dts: false`**：dsh Loader 只加载运行时入口，不消费类型声明。产 dts 需要类型检查，而类型检查会拖慢 prepare 并可能引用 workspace 里的 tsconfig——独立仓库两样都不想要。代价是构建只做转译，**类型错误只能在编辑器/IDE 中暴露**，本仓库因此没有类型检查脚本。
- **`fixedExtension: false`**：tsdown 在 `platform: 'node'` 时默认 `fixedExtension: true`，此时 ESM 产物扩展名为 `.mjs`——而 manifest 的 `main`/`exports` 声明的是 `lib/index.js`，加载时模块解析直接失败。实测验证：删掉这一行重新构建，`ls lib` 得到的是 `index.mjs` 与 `invariant.mjs`，`pnpm test` 在导入阶段就报模块找不到。`fixedExtension: false` 配合 `type: "module"` 才得到 `.js`。
- **`unbundle: true`**：每个 entry 一个产物文件，不做打包。关键是 **peer 保持外部化**——`@deepseek-ai/cordis` 不会被打进 `lib/index.js`，运行时从安装方 profile 解析。一旦打包进去，你的产物里就有一个私有的 Cordis 副本，与安装方的注册表互不相识。

### 6.3 构建纪律三条

```sh
rm -rf lib && pnpm build && ls lib   # 从零构建：模拟 git 安装拿到的环境
```

这条命令能过（预期输出 `index.js invariant.js`），git 安装就不会在构建上翻车。此外：

- **`lib/` 必须进 `.gitignore`。** 提交产物意味着克隆拿到"提交时刻的旧构建"：源码已前进、产物停在昨天。
- **`prepare` 与 `build` 指向同一配置**。`pnpm install` 末尾自动触发根包的 `prepare`（即 tsdown），开发者克隆后无需手动构建即可跑测试。

---

## 7. 测试与调试

### 7.1 测试自己当组合者

本仓库的测试不需要 dsh CLI、不需要 API 密钥、不真的调用模型——它用一个裸 `Context` 手动复现 loader 做的事：

```ts
import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it } from 'vitest'
import SkillRegistry from '@deepseek-ai/dsh-skill'
import * as Skill7dCodeReviewer from '@7dgroup/dsh-skill-7d-code-reviewer'

describe('dsh-skill-7d-code-reviewer', () => {
  it('registers and disposes the bundled code review skill', async () => {
    const ctx = new Context()
    await ctx.plugin(SkillRegistry)                    // ① 先挂载注册表（服务提供方也是插件）
    const fiber = await ctx.plugin(Skill7dCodeReviewer) // ② 再挂载被测插件

    expect(await ctx.skills.list()).toEqual([{
      name: '7d-code-reviewer',
      description: '7DGroup 模板驱动的代码审查：……（完整字符串）',
      invocation: { modelInvocable: true, userInvocable: true },
      provider: '7d-code-reviewer',
      source: 'bundled',
      resourceBase: { kind: 'directory', path: resourcePath },
    }])
    const loaded = await ctx.skills.get('7d-code-reviewer')
    expect(loaded?.content).toContain('## 评分标准')
    expect(loaded?.content).toContain('templates/report-template.html')
    expect(loaded?.resourceBase).toEqual({ kind: 'directory', path: resourcePath })

    await fiber.dispose()
    expect(await ctx.skills.list()).toEqual([])
  })
})
```

注意两个写法背后的门道：

- **`ctx.plugin(SkillRegistry)` 必须在先。** skills 注册表自己也是个插件；不挂载它，被测插件的 `inject: ['skills']` 就永远等不到（3.4 节的实验删掉这一行，得到的同样是 PENDING 超时）。
- **按包名导入被测插件**（`import * as Skill7dCodeReviewer from '@7dgroup/…'`）。这依赖 `exports` 字段的包名自引用，解析到的是 `lib/index.js` 产物——测试因此同时验证了 manifest 声明与真实产物一致。

### 7.2 三层断言与资源完备性

第一条测试是**三层断言**：

1. **注册了什么**：`list()` 投影与期望对象完整相等（`toEqual`，不是 `toMatchObject`）——名称、描述、触发策略、资源根，一个键都不能偏；
2. **取用时读到什么**：`get()` 的正文含关键小节（`## 评分标准`）且引用了模板路径——防止正文被误删关键内容；
3. **卸载后干净吗**：dispose 后列表为空——生命周期闭环（第 3 章的回归底线）。

第二条测试是**资源完备性**：

```ts
it('ships the review references, report template, and script notes beside the body', async () => {
  const base = new URL('../assets/7d-code-reviewer/', import.meta.url)
  for (const relative of [
    'references/coding-standards.md',
    'references/security-checklist.md',
    'references/review-examples.md',
    'templates/report-template.html',
    'scripts/html-report-generation.md',
  ]) {
    await expect(readFile(new URL(relative, base), 'utf8')).resolves.not.toBe('')
  }
  const template = await readFile(new URL('templates/report-template.html', base), 'utf8')
  expect(template).toContain('{{report_title}}')
})
```

它防的是"模板没进包"这类发布事故：给技能引用的每样资源留一条断言，成本一行，收益是一次本地红灯而不是一次线上事故。**修改 `src/index.ts` 中的常量或增删资源文件时，必须在同一次改动中更新测试**——这条约束写进了本仓库的 AGENTS.md。

### 7.3 调试：通用排错次序

日常开发循环记住一句话：**`pnpm test` 证代码，`pnpm build` 供 link，`--dump-config` 证组合，隔离 `DSH_HOME` 证安装。**

遇到问题时按"先组合、后运行时"的次序排查：

1. **`dsh --dump-config --profile <name>`**：打出各层叠加后的合成配置。先确认你的 bundle 层存在、行正确，再确认挂载行进了合成结果。组合层的错误（拼写、id 冲突、覆盖不完整）在这里一眼可见。
2. 组合正确但仍无行为 → 回到第 3.4 节：大概率是 fiber 停在 PENDING（inject 拼写错、服务提供方未挂载），对照 fiber 状态诊断。
3. 需要真实环境复现时，用隔离的 `DSH_HOME` 做全流程演练（第 8.3 节），不污染你的主环境。

### 7.4 常见坑速查表

每条按"症状 → 机制 → 解法"组织，前六条是本仓库开发过程中真实踩过的：

| # | 症状                                           | 机制                                                        | 解法                                     |
| - | -------------------------------------------- | --------------------------------------------------------- | -------------------------------------- |
| 1 | git 安装报错，提到 `workspace:`                     | pnpm 在 workspace 上下文之外解析依赖，该协议无处解析                        | 独立仓库一律真实版本范围；peer 在 devDependencies 镜像 |
| 2 | 找不到 `lib/index.js`，但 `ls lib` 里是 `index.mjs` | tsdown 在 node 平台默认 `fixedExtension: true`，与 manifest 声明不符 | `fixedExtension: false`                |
| 3 | prepare 在别的机器上炸（找不到项目引用/相邻包）                 | prepare 运行在 pnpm store 的克隆里，没有 monorepo 上下文               | 构建配置自包含，不假设任何邻居                        |
| 4 | 消费者装到陈旧产物                                    | `lib/` 被提交进 git                                           | `lib/` 进 `.gitignore`，产物由 `prepare` 现做 |
| 5 | add 后行为诡异                                    | 行 id 与基础组合冲突；或覆盖行只重述了部分键（patch 整行替换、不深度合并）                | id 取有辨识度的名字；覆盖时重述整行每个键                 |
| 6 | 测试报无法解析自己的包名                                 | 包名自引用依赖 `exports` 字段                                      | manifest 必须有 `exports`                 |
| 7 | 插件"什么都没做"，vitest 超时                          | `inject` 的服务无提供方，fiber 停在 PENDING——合法状态，不是错误              | 确认能力面提供方（如 SkillRegistry）已挂载           |
| 8 | 组合层改了包名后 add 无声无息                            | 配置项模块无法解析时 Cordis 经 logger 报告而不崩溃，早期报告可能丢失                | 先查拼写；用 `--dump-config` 看合成组合           |

---

## 8. 部署与分发

### 8.1 三种分发形式

| 形式      | 命令（消费者视角）                                                                                       | 消费者代价                                                                                     |
| ------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| git     | `dsh plugin --profile <name> add git+https://gitee.com/zuozewei/dsh-skill-7d-code-reviewer.git` | 首次失败 → 把 pnpm 打印的确切键写进 profile 的 `pnpm-workspace.yaml` `allowBuilds` → 重跑；建议 pin `#<sha>` |
| npm     | `dsh plugin --profile <name> add @7dgroup/dsh-skill-7d-code-reviewer`                           | 无——`pnpm publish` 时 `lib/` 已构建进包                                                          |
| tarball | `dsh plugin --profile <name> add ./7dgroup-dsh-skill-7d-code-reviewer-0.1.0-rc.5.tgz`           | 无——tarball 自带预构建产物，不触发构建脚本                                                                |

tarball 的产出与核对：

```sh
pnpm build                              # 显式构建
pnpm pack --pack-destination ~/Downloads  # 产出 tarball；tar -tzf <tarball> 核对清单
```

### 8.2 allowBuilds 是真实的安全边界

git 形式要求消费者在 profile 的 `pnpm-workspace.yaml` 里授权：

```yaml
allowBuilds:
  '@7dgroup/dsh-skill-7d-code-reviewer@git+https://gitee.com/zuozewei/dsh-skill-7d-code-reviewer.git#<sha>': true
```

要理解你在要求消费者批准什么：**允许构建 = 允许该包的代码在安装时于消费者机器上执行，且不在任何 agent 沙箱之内**。键里含 commit sha，上游推新提交就需要重新授权——这层摩擦是特性：消费者授权的始终是"某一次提交的代码"，而不是"这个仓库永远可以执行任意安装脚本"。所以分发文档应建议消费者 pin `#<sha>`，而不是浮动跟踪分支。

### 8.3 发布前演练：隔离环境全流程

```sh
# 用 git+file:// 走完整的 git 依赖路径，又不依赖远端：
DSH_HOME=/tmp/e2e dsh plugin --profile t add "git+file:///Users/you/dev/dsh-skill-7d-code-reviewer#main"

# 首次预期失败（pnpm 等待构建授权）→ 把打印的确切包键写进该 profile 的 allowBuilds → 重跑

DSH_HOME=/tmp/e2e dsh --dump-config --profile t   # 验证 bundle 层与挂载行
DSH_HOME=/tmp/e2e dsh --profile t                  # 验证真实启动
```

三步全过，你的包在陌生机器上就是这套流程。发布本身：

```sh
pnpm pack      # 本地检视：lib/ 齐不齐、assets 在不在、有没有多余文件
pnpm publish   # scoped 包需要 publishConfig.access: public（本仓库已配）
```

发版清单：bump `package.json` 的 `version`（tarball 文件名和升级安装都靠它区分）；涉及 provider 行为的改动，打包前先跑 `pnpm test`。

### 8.4 本地迭代：link 试装

```sh
dsh plugin --profile dev add ~/dev/dsh-skill-7d-code-reviewer
```

本地路径安装走 `link:` 协议，指向你的工作目录。**改完 `pnpm build` 即生效，无需重装**——profile 解析到的 `lib/index.js` 就是刚构建的那份。日常循环：

```sh
pnpm test    # 改源码 → 跑测试（对着真实 peer，绝大多数迭代不需要碰 dsh）
pnpm build   # 测试绿了 → 重新产出 lib/ 供 link 试装
```

---

## 9. 进阶：服务——在 ctx 上暴露与消费能力

前八章只用到「技能」这一个能力面。官方文档（Cordis 教程第 3 章）把能力面的底层机制叫**服务**，值得单独讲透，因为它是理解整个 harness 的钥匙。

### 9.1 服务是什么

**服务**是一个插件提供、其他插件通过 `ctx` 消费的具名能力。`ctx.skills`、`ctx.tools`、`ctx.llm`、`ctx.agents` 都是服务。消费方只声明 `'skills'` 这类能力名，不 import 其实现，因此配置可以替换提供方而无需改动消费方。

### 9.2 提供服务：Service 子类 + 声明合并

提供一个自定义服务需要两部分协作：

```ts
import { Service, type Context } from '@deepseek-ai/cordis'

declare module '@deepseek-ai/cordis' {
  interface Context {
    greeter: GreeterService
  }
}

export class GreeterService extends Service {
  constructor(ctx: Context) {
    super(ctx, 'greeter')
  }
  greet(who: string) {
    return `Hello, ${who}!`
  }
}

export const name = 'greeter'
export function apply(ctx: Context) {
  ctx.plugin(GreeterService)
}
```

- **运行时**：`super(ctx, 'greeter')` 以名称 `greeter` 注册实例，此后任何插件都能 `ctx.greeter` 访问。注册属于 effect，卸载提供方时移除服务。
- **编译时**：`declare module '@deepseek-ai/cordis'` 块用 TypeScript 声明合并把 `greeter` 加进 `Context` 接口，使 `ctx.greeter` 各处通过类型检查。它不生成代码；没有它，运行时照常工作，只是消费方失去类型安全。

`Service` 子类本身就是插件（类形态），`ctx.plugin(GreeterService)` 像挂载其他插件一样挂载它。

### 9.3 消费服务：硬依赖与可选依赖

```ts
export const name = 'consumer'
export const inject = ['greeter']          // 硬依赖
export function apply(ctx: Context) {
  console.log(ctx.greeter.greet('world'))  // apply 内保证已就绪
}
```

`inject` 是**硬性依赖**：缺失时插件保持 PENDING。如果某项功能缺失时插件仍能运行，跳过 `inject`，在使用处探测：

```ts ignore-check
export function apply(ctx: Context) {
  const greeter = ctx.get('greeter')       // 无提供方时为 undefined，插件照常运行
  console.log(greeter?.greet('maybe') ?? 'no greeter available')
}
```

### 9.4 两条官方纪律

1. **依赖在加载后仍被追踪。** `inject` 不是一次性的启动检查：如果运行期间所需服务消失（提供方被卸载或热替换），依赖它的插件也会卸载，服务恢复后重新加载。这防止运行中的消费方持有对不可用服务的引用——依赖消失时它自己的注册也撤销。这也是配置能替换服务的原因：卸载 `dsh-bash-local`、挂载另一个 `shell` 提供方，所有注入 `'shell'` 的插件都会重启并使用新实现。
2. **服务名共享扁平命名空间。** 每个应用里的服务名是扁平的，请加有辨识度的前缀或命名空间（harness 已占用 `tools`、`llm` 等普通名）。`namespace/action` 是推荐的命名约定。

---

## 10. 进阶：事件——类型化通信与分发模式

服务支持直接调用；**事件**让插件无需知道有谁在听，就能发出通知（官方 Cordis 教程第 4 章）。harness 用事件处理工具结果、模型请求、审批决定等交互。

### 10.1 声明、发出与监听

```ts
declare module '@deepseek-ai/cordis' {
  interface Events {
    'stats/report'(name: string, count: number): void
  }
}
// 发出：
this.ctx.emit('stats/report', name, next)
// 监听（属于 effect，随插件自动移除）：
ctx.on('stats/report', (name, count) => { /* ... */ })
```

### 10.2 五种分发模式

事件采用哪种模式是其公开约定的一部分：

| 模式 | 调用 | 语义 |
|---|---|---|
| `emit` | `ctx.emit(name, ...args)` | 同步广播；不等待、不收集返回值 |
| `parallel` | `await ctx.parallel(name, ...args)` | 所有监听器并发运行，一同等待 |
| `serial` | `await ctx.serial(name, ...args)` | 按序运行并等待；第一个非空返回值胜出并停止后续 |
| `bail` | `ctx.bail(name, ...args)` | serial 的同步版本 |
| `waterfall` | `ctx.waterfall(name, ...args, next)` | 环绕中间件（见下） |

### 10.3 waterfall：转换或短路

waterfall 是实现拦截的模式。每个监听器收到 `(...args, next)`，可以转换 `next()` 的返回值，也可以不调用 `next()` 直接返回从而短路（官方称为"否决"）：

```ts
ctx.on('demo/transform', async (input, next) => {
  const downstream = await next()
  return downstream.toUpperCase()          // 包装下游结果
})
ctx.on('demo/transform', async (input, next) => {
  if (input.includes('blocked')) return '** blocked **'  // 拥有决策权时短路
  return next()
})
```

一条必须记住的纪律：**只负责观察或标注的 waterfall 监听器必须调用 `next()`**。忘记调用会悄无声息地吞掉所有下游默认行为。harness 用 waterfall 处理协作插件可以包装或回答的决策，例如 `agent/request`（替换模型调用配置）和 `approval/request`（策略代替用户作答）。

---

## 11. 进阶：注册一个模型可调用的工具

技能是「内容型」贡献，工具是「能力型」贡献。官方文档（Cordis 教程第 7 章 + 工具编写参考）给出的最小工具插件形态如下：

```ts
import { readFile } from 'node:fs/promises'
import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'

export const name = 'my-tool'
export const inject = ['tools']

export function apply(ctx: Context) {
  ctx.tools.register(defineTool({
    name: 'read_file',
    description: 'Read a file from disk.',           // 模型看到的描述
    parameters: {
      path: { type: 'string', required: true, description: 'Absolute path' },
      limit: { type: 'number' },                      // 缺省即可选
    },
    output: {
      schema: { type: 'string' },                     // 规范返回值的 schema
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    async execute(args, exec) {
      // args 由 schema 推导类型并已在执行前校验
      return readFile(args.path, { encoding: 'utf8', signal: exec.signal })
    },
  }))
}
```

关键约定（摘自官方「工具编写参考」，逐条都是硬规则）：

- **参数已为你校验。** `defineTool` 在 `execute` 前根据 schema 校验模型生成的 `arguments`，`execute` 里的 `args` 匹配推导类型。schema 表达不了的约束（非空字符串、正数、跨字段规则）仍需手动检查。
- **返回规范 JSON 值。** `output.schema` 声明类型；`execute` 只返回推导值，工具主体不要返回内容块，不要迫使调用方从自然语言里解析 id。
- **抛异常或返回无效值意味着 `isError`。** 基础设施故障抛异常；成功的领域结果即使是不理想状态也写成规范值，由 `output.render` 解释。
- **遵守 `exec.signal`。** 信号触发时取消进行中的工作。`exec` 还携带不可变的身份与 token。
- **注册基于副作用。** dispose 插件 fiber 即注销工具；schema 自动流入系统提示词组装。

工具要跑起来，组合里还需挂 `@deepseek-ai/dsh-tools`（它注入 `systemPrompt`，因为工具要向系统提示词贡献 schema）与 `@deepseek-ai/dsh-system-prompt`。缺了前者，工具插件保持 PENDING。

---

## 12. 能力面全景：本插件的生态位置

官方文档 `capability-seams` 给出了每个能力面的「谁声明、谁实现、谁消费」关系。技能能力面（`ctx.skills`）的完整图谱是：

| 角色 | 包 | 说明 |
|---|---|---|
| Service Definition | `@deepseek-ai/dsh-skill` | 声明 `SkillProvider`/`SkillCandidate` 契约与注册表 |
| 已知实现（provider） | `skill-filesystem` | 从磁盘目录发现技能 |
| 已知实现（provider） | `skill-badge` | 另一内置提供方 |
| **本插件** | `@7dgroup/dsh-skill-7d-code-reviewer` | 第三方 provider：`bundled` 来源，随包捆绑一个技能 |
| 直接消费方 | `tool-skill` | 渲染会话前缀目录、加载完整技能正文，供模型调用 |

这张图解释了本插件的设计位置：它不实现整个技能注册表，也不消费技能，而是作为**provider 之一**往 `ctx.skills` 里贡献一个候选。`source: 'bundled'` 正是把这个候选与 `skill-filesystem`（`project-dsh` 等来源）区分开的元数据。

理解「seam / core / bundle」三档角色也有助于规划插件：

- **seam**：可替换的能力接口（`ctx.skills`、`ctx.fs`、`ctx.web`），有多个实现包可选；
- **core**：核心主干服务，没有可替换实现（`ctx.tools`、`ctx.sessions`、`ctx.systemPrompt`）；
- **bundle / 组合点**：把一组插件打包成可整体启用的配置（本插件属于此类）。

---

## 13. 防御性模式与测试纪律

官方文档有两篇「防坑」性质的指南，直接适用于插件开发。

### 13.1 防御性模式（defensive-patterns）

| 模式 | 一句话 |
|---|---|
| dispose 必须达到完全停稳 | 清理流程不能只发终止信号就返回，要等子进程真正退出、监听器静默，否则留下孤儿进程 |
| 在分发器中隔离回调异常 | 用户监听器抛异常不得 reject 所在 promise、不得饿死后续监听器，用 try/catch 包裹分发循环 |
| 绝不向不可信输出暴露环境变量 | 启动的命令要清掉 `*KEY*`/`*SECRET*`/`*TOKEN*`/`*PASSWORD*` 项，防止凭证经命令输出或 spill 文件泄漏 |
| 用 unlink 删除链接形态的路径 | 可能是符号链接/junction 的路径先 `lstatSync().isSymbolicLink()` 判断再用 `unlinkSync` 删，避免跟随链接进入目标 |
| 正交结果独立上报 | 超时、退出码、信号各自独立上报，别把一个标志嵌套在另一个的分支里 |

### 13.2 测试纪律（testing）

- **优先真实实现而非 mock。** 只 mock 开销高或不确定的边界（LLM 适配器、网络、时钟），下游保持真实。手写替身只能证明桥接层搬运字节。
- **验证外部世界，而非自我报告。** 断言外部可观察的结果（重新读文件、重跑命令），不要对 agent 自身输出做关键词探测——那会让作弊的实现通过。
- **测试真实入口路径。** 产品可见的插件要有一次通过 Loader/真实组合的测试；包的 `bin` 运行的是构建后的 `lib/bin.js`，用普通 `node` 执行会暴露 tsx 掩盖的失败。
- **资源自管。** 测试里创建的 harness 在 `afterEach` 中 dispose（即使失败/重试/超时也要释放）。

这些规则与第 7 章的三层断言互补：第 7 章保证「注册、取用、卸载」的正确性，本节保证「真实环境里真的能跑」。

---

## 14. 扩展阅读

- 官方 Cordis 教程（`deepseek-harness/docs/cordis-tutorial/`）：第 1–7 章逐一讲解插件、effect、服务、事件、配置、组合与 HMR、进入 harness。
- `cordis-primer.md`：五个核心概念与分发模式的精简参考。
- `capability-seams.md`：全部能力面的「谁声明、谁实现、谁消费」图谱与 `ctx` 键总表。
- `defensive-patterns.md` 与 `testing.md`：生命周期/并发/清理与测试的防御规则。
- `cookbook/adding-a-tool.md`：面向模型的工具完整约定；`cookbook/adding-a-package.md`：monorepo 内新增包的逐文件清单与命名规范。
- 本仓库的 `plugin-development-tutorial.md`（教学插件视角，8 章循序渐进）与 `dsh-plugin-guide-beginner.md`（零基础入门）。

---

## 15. 附录：从零复刻的最小清单

把本教程走一遍后，你自己的插件需要这些文件。逐项核对：

- [ ] **独立 git 仓库**（不在任何 pnpm workspace 之内），`.gitignore` 含 `lib/` 与 `node_modules/`
- [ ] **`package.json`**：`type: "module"`；`exports` 含主入口（+可选的 `./invariant`）、`./cordis.patch.yml`、`./package.json`；`files` 覆盖运行所需一切；peer 依赖写真实版本范围并在 devDependencies 镜像；需要用户启用的加 `dsh.bundle.patch` 键
- [ ] **`src/index.ts`**：`name` + `inject` + `apply`，apply 里只有一个 `ctx.skills.registerProvider(() => provider)`；provider 的 `list()` 零 I/O，`get()` 读正文
- [ ] **（可选）`src/invariant.ts`**：伴生入口；四处同步（peer/exports/files/tsdown entry）
- [ ] **（可选）Config schema**：`Schema.object` 声明 + `apply(ctx, config)`；`@deepseek-ai/schemastery` 作为运行时校验器放进 `dependencies`
- [ ] **`assets/<skill-name>/SKILL.md`**：正文克制、重资料放 `references/`、输出放 `templates/`
- [ ] **`tsdown.config.ts`**：`dts: false`、`fixedExtension: false`、`unbundle: true`
- [ ] **`cordis.patch.yml`**：一行 insert，按包名引用，id 避开基础组合已有行
- [ ] **`tests/`**：三层断言（注册/取用/卸载）+ 资源完备性；按包名自引用导入被测包
- [ ] **验证链**：`pnpm test` → `rm -rf lib && pnpm build` → `pnpm pack --dry-run` 检视清单 → 隔离 `DSH_HOME` 全流程演练

本仓库就是这份清单的完成态。开发自己的插件时，把它当对照样例；日常循环回到那句话：**`pnpm test` 证代码，`pnpm build` 供 link，`--dump-config` 证组合，隔离 `DSH_HOME` 证安装。**
