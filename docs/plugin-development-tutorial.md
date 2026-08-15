# 独立仓库 dsh 插件开发实战教程

本教程讲解如何把一个 Cordis 插件做成**独立仓库的 dsh 组合包（bundle）**：用户执行一条 `dsh plugin add`，你的插件连同它自带的组合层一起进入他的 profile。Cordis 教程已经讲过插件本体——插件是函数、由 loader 挂载、经 `inject` 依赖服务、在 `ctx` 上注册自己的贡献（它的第 7 章在 `ctx.tools` 上注册了一个工具）。本教程是同一模式的延续：把一个 skill 经 `ctx.skills.registerProvider` 注册，并解决插件本体之外的一整圈工程问题——manifest 怎么写、组合层怎么挂、构建如何自包含、如何试装与分发。

每一章都给出可以照抄的文件内容、确切命令与预期结果。全程以本仓库 `@7dgroup/dsh-skill-7d-code-reviewer` 为可运行样例：它就是本教程走到终点时的样子。你在各章中构建的是一个更小的教学插件 `@myorg/dsh-skill-hello`，把它换成你自己的技能即可。

本教程面向要开发自己 dsh 插件的工程师。阅读前建议先过一遍 Cordis 教程的第 1、3、6、7 章（插件是函数、服务与 inject、诊断 PENDING、进入 harness）；缺的概念会在用到处给出一句话回顾与指引。如果要阅读精简的概念参考而非逐步实践，请参阅 Cordis 入门；可注入、可监听的所有服务与事件见各子系统页面上生成的 cordis-surface 区块。

## 准备工作

前置条件：

- Node `^22.19.0 || >=24.0.0`
- pnpm 10+
- dsh CLI（第 6、7 章试装与安装演练时使用；第 1–5 章只需要 Node 与 pnpm）

创建本教程的工作目录。注意它必须是一个**独立的 git 仓库**，不能活在任何 pnpm workspace 之内——第 5 章会看到，git 安装时 pnpm 把仓库克隆进 store、在 workspace 上下文之外解析依赖，"恰好旁边有个 monorepo"这个假设在那里不成立：

```sh
mkdir -p ~/dev/dsh-skill-hello && cd ~/dev/dsh-skill-hello
git init
```

第 1–5 章在这个目录里循环运行同一条命令：

```sh
pnpm test
```

本教程不需要 API 密钥，也不会真的调用模型。

### TypeScript 说明

示例使用了普通现代 JavaScript 之外的三项 TypeScript 功能：

- **类型注解**描述值，但不改变运行时行为：`ctx: Context` 表示 ctx 具备 Cordis 上下文 API，`string[]` 表示字符串数组。
- **`import type`** 只导入类型信息，运行时消失。仅为类型注解使用 `Context` 的插件文件不会因此增加运行时依赖。
- **声明合并**（`declare module '@deepseek-ai/cordis' { ... }`）为 Cordis 已声明的接口追加条目（本教程只用消费方一侧：`ctx.skills` 的类型来自 `@deepseek-ai/dsh-skill` 的声明合并，`import type {} from ...` 即可让它可见）。

本教程的插件不声明配置 schema——组合层直接给出整行配置（见第 2 章）；如果你的插件需要可配置项，照 Cordis 教程第 5 章导出 `Config` schema 即可，两者不冲突。

## 章节

1. 你的第一个插件包：独立仓库起骨架，向 `ctx.skills` 注册一个最小 skill。
2. manifest 与组合层：加上 `dsh` 键，从"依赖包"变成"插件"。
3. 插件代码与能力面：provider、候选与"注册即 effect"。
4. 资源与不变量入口：assets 布局、产物相对层级，以及第二个能力面。
5. 自包含构建：git 安装为什么是关卡，tsdown 配置逐项讲透。
6. 本地试装与迭代：link 安装、dump-config 两层验证、隔离环境演练。
7. 分发与消费者授权：git / npm / tarball 三种形式与 allowBuilds 的安全边界。
8. 常见坑与排错：症状、机制、解法。

## 1. 你的第一个插件包

目标：一个 `pnpm install && pnpm test` 就能跑绿的独立插件包。它向 skills 注册表注册一个名为 `hello` 的技能，技能正文只有一行。

### 写下六个文件

**`package.json`**：

```jsonc
{
  "name": "@myorg/dsh-skill-hello",
  "type": "module",
  "main": "lib/index.js",
  "exports": {
    ".": { "default": "./lib/index.js" },
    "./package.json": "./package.json"
  },
  "files": ["lib/index.js", "assets"],
  "scripts": {
    "prepare": "tsdown",
    "build": "tsdown",
    "test": "vitest run"
  },
  "engines": { "node": "^22.19.0 || >=24.0.0" },
  "peerDependencies": {
    "@deepseek-ai/cordis": "^4.0.1",
    "@deepseek-ai/dsh-skill": "^0.1.0-rc.5"
  },
  "devDependencies": {
    "@deepseek-ai/cordis": "^4.0.1",
    "@deepseek-ai/dsh-skill": "^0.1.0-rc.5",
    "@types/node": "^22.20.0",
    "tsdown": "^0.22.2",
    "vitest": "^4.1.8"
  }
}
```

三个包在两个地方各出现一次，这不是重复：

- **peerDependencies 声明契约**："运行时由安装方提供 cordis 运行时与 skills 注册表"。独立插件永远不该把 Cordis 打进自己的依赖——安装方的 profile 里已经有一个，打进第二个会得到两个互不相识的注册表。
- **devDependencies 镜像一份**，让本仓库在没有 dsh profile 的情况下也能独立测试与构建。测试对着 npm 上真实发布的 peer 跑，测的就是消费者将来拿到的组合。

还有一条铁律现在就要立下：**依赖一律写真实版本范围（`^4.0.1`），绝不能写 `workspace:^`**。`workspace:` 协议只在 pnpm workspace 内可解析；git 安装时 pnpm 在 workspace 上下文之外解析你的依赖，`workspace:` 在那里直接报错。这是独立仓库与 monorepo 包的本质区别，机制在第 5 章。

**`tsdown.config.ts`**（第 5 章逐项展开，现在照抄即可）：

```ts
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'lib',
  format: ['esm'],
  platform: 'node',
  target: 'es2024',
  dts: false,
  fixedExtension: false,
  unbundle: true,
})
```

**`assets/hello/SKILL.md`**（技能正文，先放一行）：

```markdown
# hello

向用户问好。这是 skill 的最小正文。
```

**`src/index.ts`**——这就是 Cordis 教程第 1 章的函数插件，长成了第 7 章的样子：

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

const SKILL_BODY_URL = new URL('../assets/hello/SKILL.md', import.meta.url)
const RESOURCE_BASE = {
  kind: 'directory',
  path: fileURLToPath(new URL('../assets/hello/', import.meta.url)),
} as const

const CANDIDATE: SkillCandidate = {
  name: 'hello',
  description: '向用户问好。',
  invocation: { modelInvocable: true, userInvocable: true },
  provider: 'hello',
  source: 'bundled',
  resourceBase: RESOURCE_BASE,
  rank: BUNDLED_SKILL_RANK,
  locator: SKILL_BODY_URL,
}

const provider: SkillProvider = {
  name: 'hello',
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

export const name = 'skill-hello'
export const inject = ['skills']

export function apply(ctx: Context): void {
  ctx.skills.registerProvider(() => provider)
}
```

逐件套对照 Cordis 教程：

- `name` 是诊断用的显示元数据，在错误信息里标识插件。
- `inject = ['skills']` 声明所需服务。Cordis 会让插件保持 PENDING，直到 skills 注册表存在；因此在 `apply` 内可以保证 `ctx.skills` 已就绪，与配置文件里的加载顺序无关。
- `apply` 里的 `ctx.skills.registerProvider(() => provider)` 是**注册式 effect**：返回的 disposer 附着在本插件上，插件卸载时自动注销，无需手动清理。参数是一个惰性工厂（`() => provider`），注册表在需要时才取用。

`SkillCandidate` 的每个字段第 3 章逐个讲；`new URL('../assets/…', import.meta.url)` 为什么是 `../` 而不是 `./`，第 4 章讲——这是本教程最容易踩的一个层级坑。

**`tests/hello.spec.ts`**：

```ts
import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it } from 'vitest'
import SkillRegistry from '@deepseek-ai/dsh-skill'
import * as HelloSkill from '@myorg/dsh-skill-hello'

describe('dsh-skill-hello', () => {
  it('registers and disposes the hello skill', async () => {
    const ctx = new Context()
    await ctx.plugin(SkillRegistry)
    const fiber = await ctx.plugin(HelloSkill)

    const names = (await ctx.skills.list()).map((skill) => skill.name)
    expect(names).toEqual(['hello'])

    const loaded = await ctx.skills.get('hello')
    expect(loaded?.content).toContain('向用户问好')

    await fiber.dispose()
    expect(await ctx.skills.list()).toEqual([])
  })
})
```

这个测试就是 Cordis 教程第 7 章的组合思想的翻版，只是不用 YAML：测试自己当组合者，`ctx.plugin(SkillRegistry)` 先挂载注册表（服务的提供方也是一个插件），再挂载被测插件。`ctx.plugin()` 返回 fiber——已加载插件实例的运行时句柄，`fiber.dispose()` 会等全部清理完成后才结束。

注意导入写法：`import * as HelloSkill from '@myorg/dsh-skill-hello'`——测试**按包名导入被测包自身**。这依赖 `exports` 字段（Node 的包名自引用），也意味着导入解析到 `lib/index.js`（构建产物）而不是 `src/`。测试因此顺带验证了 manifest 声明与真实产物一致。没有 `exports` 字段时这种写法直接失败（第 8 章坑 6）。

**`.gitignore`**：

```
lib/
node_modules/
```

### 运行

```sh
pnpm install
```

install 的末尾会触发根包的 `prepare`（也就是 tsdown），工作目录里出现 `lib/`。验证：

```sh
ls lib
```

预期输出：

```
index.js
```

然后：

```sh
pnpm test
```

预期输出：

```
 ✓ tests/hello.spec.ts (1)
   ✓ dsh-skill-hello > registers and disposes the hello skill

 Test Files  1 passed (1)
      Tests  1 passed (1)
```

### 尝试制造错误

把 `inject = ['skills']` 改成 `inject = ['skillz']` 再跑 `pnpm test`。预期：测试**不是**失败，而是**超时**。拼写错误的服务名没有提供方，插件停在 PENDING（Cordis 教程第 6 章的 fiber 状态机），不报错、不输出、也不让事件循环保持活跃。这就是依赖驱动加载的另一面。排错手段见第 8 章；现在把拼写改回来。

再删掉测试里的 `await ctx.plugin(SkillRegistry)` 一行。同样是 PENDING 超时——skills 注册表也是个插件，你不挂载它，`inject: ['skills']` 就永远等不到。

下一章：[manifest 与组合层](#2-manifest-与组合层从依赖包变成插件)。

## 2. manifest 与组合层：从依赖包变成插件

第 1 章的包已经能在测试里运行，但 `dsh plugin add` 它，只会得到一个警告。为什么？

### 两种包的身份

独立仓库的 npm 包有两种身份，都由 package.json 描述，差别在 `dsh` 键下的 manifest：

| 形态 | 声明 | 回答的问题 | 用途 |
|---|---|---|---|
| 普通依赖包 | 无 `dsh` 键 | "这个库导出什么" | 供其他插件 `import`，不被用户启用 |
| **组合包（bundle）** | `dsh.bundle.patch` | "这个包贡献什么配置层" | 用户 `dsh plugin add` 启用的插件 |

`dsh plugin` 检测到 `dsh.bundle` 才会把你追加进 profile 的 layers；否则只装成普通依赖并警告。面向用户的插件选 bundle。

### 加上组合层声明

在 `package.json` 中加入 `dsh` 键，并在 `exports` 与 `files` 里补上组合层文件：

```jsonc
{
  // …第 1 章的字段保持不变…
  "exports": {
    ".": { "default": "./lib/index.js" },
    "./cordis.patch.yml": "./cordis.patch.yml",
    "./package.json": "./package.json"
  },
  "files": ["lib/index.js", "cordis.patch.yml", "assets"],
  "dsh": {
    "bundle": {
      "patch": "./cordis.patch.yml"
    }
  }
}
```

然后创建 **`cordis.patch.yml`**——本 bundle 的组合层：

```yaml
- insert:
    - id: skill-hello
      name: '@myorg/dsh-skill-hello'
```

它与 `--patch` overlay 是同一种语法（patch 条目的 YAML 数组），区别只有一处：**行按包名引用，而不是相对路径**。Loader 挂载这一行时要靠 Node 模块解析找到已安装代码；相对路径在安装方的 profile 里没有意义。

本仓库的真实组合层就是这个形状，只是换成真实的包名：

```yaml
# This bundle's composition layer: mounted when a profile lists this bundle
# (dsh plugin --profile <name> add <this package>). The row references this
# package by name so Node module resolution finds the installed code.
- insert:
    - id: skill-7d-code-reviewer
      name: '@7dgroup/dsh-skill-7d-code-reviewer'
```

串起来看一次完整链路：用户执行 `dsh plugin --profile dev add <本包>` → 本包被追加进 profile 的 bundles → 启动时本 patch 层叠加在基础组合之上 → 合成后的组合里出现了 `name: '@myorg/dsh-skill-hello'` 这一行 → Loader 按包名解析并挂载 → 你的 `apply(ctx)` 运行。`insert` 行的 `id` 是这条 Cordis 配置项的稳定标识，自取即可，但要避开基础组合里已有的行 id（第 8 章坑 5）。

### 两个写层原则

1. **按 id 覆盖前层行时，必须重述整行的每个键。** patch 替换整个 config 值，不做深度合并——只写你想改的一个键，其余键会被清空。
2. **默认值只给用户大概率会保留的，其余交给 schema。** 行的 `config` 块在挂载前会经过插件声明的 `Config` schema 校验（Cordis 教程第 5 章），默认值该由 schema 补全，而不是在组合层里堆一份将来没人记得改的副本。

### 验证打包内容

```sh
pnpm pack --dry-run
```

预期输出（清单以实际为准）：

```
npm notice === Tarball Contents ===
npm notice 519.0B assets/hello/SKILL.md
npm notice 312.0B cordis.patch.yml
npm notice 1.1kB lib/index.js
npm notice 678.0B package.json
```

这份清单就是消费者拿到的一切。`files` 白名单 + npm 默认包含项（package.json、README、LICENSE）决定了 tarball 内容；发布前值得跑一次 `pnpm pack`（不带 `--dry-run`）并解开 tarball 亲眼确认——"模板没进包"这类事故应该死在本地（第 4 章的资源完备性测试也是为此）。

顺带解释 `exports` 里两个"给工具链的子路径"：`./cordis.patch.yml` 让 `dsh plugin` 能按 `<包名>/cordis.patch.yml` 读到组合层；`./package.json` 让工具不猜路径就能读 manifest。

下一章：[插件代码与能力面](#3-插件代码与能力面provider候选与注册即-effect)。

## 3. 插件代码与能力面

现在把第 1 章照抄的 `src/index.ts` 讲透。以下是本仓库的真实版本（略去了文件头的模块注释与用于复制检测的 `/* jscpd:ignore-* */` 标记，其余逐字一致）：

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
const DESCRIPTION = '7DGroup 模板驱动的代码审查：按命名、安全、性能、异常处理维度逐行审查代码，问题分为严重/中等/轻微三级并评分，输出文本摘要与 HTML 审查报告。当用户要求审查代码、评审改动、评估代码质量或生成代码审查报告时使用。'

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

/** Cordis plugin name. */
export const name = 'skill-7d-code-reviewer'
/** Service required by the bundled provider. */
export const inject = ['skills']

/** Register the bundled `7d-code-reviewer` provider on `ctx.skills`. */
export function apply(ctx: Context): void {
  ctx.skills.registerProvider(() => provider)
}
```

### 能力面决定你注册到哪

**能力面（capability seam）**是你接入 harness 的那个注册表服务。选对了能力面，剩下的代码形态几乎是一样的：

| 你要贡献 | 能力面 | 注册调用 | 对照 |
|---|---|---|---|
| 技能（skill） | `ctx.skills` | `ctx.skills.registerProvider(() => provider)` | 本章 |
| 工具（tool） | `ctx.tools` | `ctx.tools.register(defineTool({...}))` | Cordis 教程第 7 章 |
| 不变量（invariant） | `ctx.invariants` | `ctx.invariants.register(pkg, install)` | 第 4 章 |

每个注册调用都是第 2 章讲过的注册式 effect：disposer 自动附着在插件上，插件卸载（含热重载）时撤销注册。你从不手写清理逻辑。

### SkillCandidate 的字段

| 字段 | 含义 |
|---|---|
| `name` | 技能名，用户与模型用它在 `ctx.skills.get(name)` 取技能 |
| `description` | 触发依据——模型据它判断何时调用这个技能，值得认真写 |
| `invocation` | 谁能触发：`modelInvocable`（模型自主）/ `userInvocable`（用户点名） |
| `provider` | 提供方名，与 provider.name 一致 |
| `source` | `'bundled'` 表示随包捆绑的技能 |
| `resourceBase` | 技能的资源根目录（第 4 章） |
| `rank` | 排序档位，捆绑技能用 `BUNDLED_SKILL_RANK` 常量 |
| `locator` | 正文源的位置元数据 |

一个值得注意的细节：注册表的 `list()` 投影**不含** `rank` 与 `locator`。本仓库的测试第一条断言就是证据——列出结果恰好只有 `name`、`description`、`invocation`、`provider`、`source`、`resourceBase` 六个键（`rank` 供排序、`locator` 供加载，消费后不再出现在投影里）。写测试断言完整对象时照这个投影来，别把候选原样塞进期望值。

### provider 的两个方法

`list()` 返回轻量元数据（浏览器里相当于列表页），`get()` 才读取正文（详情页）。`get` 用 `readFile` 现读 SKILL.md，意味着正文改动只需重新构建，不需要改代码。懒加载是有意义的：`list()` 在枚举所有技能时被调用，把几 KB 的正文读取留在 `get()` 里。

### 测试升级

本仓库第一条测试比第 1 章的教学版更严格，值得看它断言了什么：

```ts
expect(await ctx.skills.list()).toEqual([{
  name: '7d-code-reviewer',
  description: '…完整描述…',
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
```

三层断言：**注册了什么**（list 投影完整相等）、**取用时读到什么**（正文含关键小节与对模板的引用）、**卸载后干净吗**（dispose 后列表为空）。最后一步就是 Cordis 教程第 2 章的 effect 语义在能力面上的直接体现——这也是每个插件都该有的回归底线。

下一章：[资源与不变量入口](#4-资源与不变量入口assets-布局产物层级与第二个能力面)。

## 4. 资源与不变量入口

### 产物相对层级：`../assets` 的由来

第 1 章埋下的问题：为什么是 `new URL('../assets/hello/SKILL.md', import.meta.url)`？

因为 `import.meta.url` 在**运行时**指向的是构建产物 `lib/index.js`，不是源码 `src/index.ts`。从 `lib/` 出发，包根的 `assets/` 在上一级——`../assets`。写成 `./assets` 运行时会去找 `lib/assets/`，那里什么都没有；写成 `../../assets` 则跳出包外。层级按**产物布局**算，记住这一点，怎么改构建配置都不会错。

### resourceBase：技能的资源根

```ts
const RESOURCE_BASE = {
  kind: 'directory',
  path: fileURLToPath(new URL('../assets/7d-code-reviewer/', import.meta.url)),
} as const
```

它把整个目录暴露为技能的按需资源根：SKILL.md 正文里引用的 `references/…`、`templates/…` 都基于这个目录解析。正文是常驻注入的，重资料不该塞进正文——那是 references 的事。

### assets 的组织

本仓库的完整布局：

```
assets/7d-code-reviewer/
├── SKILL.md                        # 正文：五步审查流程、评分标准、模板填充规则
├── references/                     # 按需加载的知识库
│   ├── coding-standards.md         #   各语言命名规范
│   ├── security-checklist.md       #   安全检查清单（注入/XSS/越权，带 ❌/✅ 示例）
│   └── review-examples.md          #   审查意见的正反示例
├── scripts/
│   └── html-report-generation.md   # 报告生成流程与 HTML 转义规则（纯文档，无可执行脚本）
└── templates/
    └── report-template.html        # 纯占位符模板（{{report_title}}、{{total_score}}…）
```

组织原则：**SKILL.md 是目录页与流程规则，references 是按需展开的细节，templates 是输出产物**。模型先读正文，按流程在需要时再取 references——常驻注入的内容越克制，技能触发时消耗的上下文越少。

### 资源完备性测试

本仓库第二条测试逐个断言关键资源存在且非空：

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

它防的是一类发布事故：正文引用了某个模板，模板改名或漏进 `files` 清单， CI 全绿、发布成功、用户触发技能时才发现资源缺失。给技能引用的每样资源都留一条断言，成本一行，收益是一次本地红灯。

### 第二个能力面：不变量入口

本仓库还有一个入口 `src/invariant.ts`，接的是 `ctx.invariants`：

```ts
import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@7dgroup/dsh-skill-7d-code-reviewer'

/** Cordis companion plugin name. */
export const name = 'skill-7d-code-reviewer-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/**
 * No runtime invariant: the package owns one immutable provider registration,
 * while the skill registry owns registration uniqueness and lifecycle checks.
 */
const install: InvariantInstaller = () => {}

export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
```

（同样略去了文件头的模块注释与 `/* jscpd:ignore-* */` 标记。）它的 installer 是空的——注释就是解释：本包没有运行时不变量要声明，注册只为预留包的所有权；注册唯一性与生命周期检查由 skill registry 自己负责。`apply` 返回注册的 disposer promise，把清理责任交回框架，与第 3 章的原则一致。

如果你的包确实要携带不变量，把 `install` 写成实际检查即可；不需要的话，这个入口可以整体省掉。要让它随包发布，还有三处同步：`peerDependencies` 增加 `@deepseek-ai/dsh-invariants`（devDependencies 镜像）、`exports` 增加 `"./invariant"`、tsdown 的 `entry` 增加 `src/invariant.ts`，以及 `files` 补上 `lib/invariant.js`。

### 长成后的 manifest

把第 2 章的最小 manifest 加上这些，就是本仓库的最终 package.json：

```jsonc
{
  "name": "@7dgroup/dsh-skill-7d-code-reviewer",
  "description": "Installable composition bundle contributing the 7DGroup template-driven code review skill to DeepSeek Harness",
  "version": "0.1.0-rc.5",
  "publishConfig": {
    "access": "public"
  },
  "type": "module",
  "main": "lib/index.js",
  "exports": {
    ".": {
      "default": "./lib/index.js"
    },
    "./invariant": {
      "default": "./lib/invariant.js"
    },
    "./cordis.patch.yml": "./cordis.patch.yml",
    "./package.json": "./package.json"
  },
  "files": [
    "lib/index.js",
    "lib/invariant.js",
    "cordis.patch.yml",
    "assets"
  ],
  "scripts": {
    "prepare": "tsdown",
    "build": "tsdown",
    "test": "vitest run"
  },
  "author": "7DGroup",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "git+https://gitee.com/zuozewei/dsh-skill-7d-code-reviewer.git"
  },
  "homepage": "https://gitee.com/zuozewei/dsh-skill-7d-code-reviewer#readme",
  "bugs": {
    "url": "https://gitee.com/zuozewei/dsh-skill-7d-code-reviewer/issues"
  },
  "engines": {
    "node": "^22.19.0 || >=24.0.0"
  },
  "dsh": {
    "bundle": {
      "patch": "./cordis.patch.yml"
    }
  },
  "peerDependencies": {
    "@deepseek-ai/cordis": "^4.0.1",
    "@deepseek-ai/dsh-invariants": "^0.1.0-rc.5",
    "@deepseek-ai/dsh-skill": "^0.1.0-rc.5"
  },
  "devDependencies": {
    "@deepseek-ai/cordis": "^4.0.1",
    "@deepseek-ai/dsh-invariants": "^0.1.0-rc.5",
    "@deepseek-ai/dsh-skill": "^0.1.0-rc.5",
    "@types/node": "^22.20.0",
    "tsdown": "^0.22.2",
    "vitest": "^4.1.8"
  }
}
```

对应的最终 tsdown 配置只是 entry 多了一项：

```ts
export default defineConfig({
  entry: ['src/index.ts', 'src/invariant.ts'],
  outDir: 'lib',
  format: ['esm'],
  platform: 'node',
  target: 'es2024',
  dts: false,
  fixedExtension: false,
  unbundle: true,
})
```

下一章：[自包含构建](#5-自包含构建git-安装为什么是关卡)。

## 5. 自包含构建：git 安装为什么是关卡

### pnpm 的 git 安装流程

用户 `dsh plugin add git+https://…` 时，pnpm 对一个 git 依赖做四件事：

1. **克隆**仓库——拿到的是 git 工作目录的内容，`lib/` 被 gitignore，不在其中；
2. 在 store 的克隆里**解析并安装依赖**——注意，这里没有你的 workspace，只有 package.json 声明的真实版本范围；
3. 运行 **`prepare`**——此刻必须产出 `lib/`；
4. 把结果**打包缓存**，之后安装方 profile 统一从缓存解析。

每一步都推出一条构建纪律：

| 流程事实 | 推论 |
|---|---|
| 克隆不含 `lib/` | `prepare` 必须从零产出全部产物 |
| 依赖在 workspace 之外解析 | 版本范围必须真实，`workspace:` 必炸 |
| prepare 在 store 克隆里运行 | 不能引用 monorepo 上下文（项目引用、相邻 checkout、共享 tsconfig） |
| 结果按提交缓存 | 上游推新提交后消费者要重新安装（与第 7 章的 sha 授权互相呼应） |

这就是"自包含（turtle-ui 模式）"的含义：构建配置只假设"仓库自己 + npm 上的依赖"，别的什么都不假设。

### tsdown 配置逐项

```ts
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts', 'src/invariant.ts'],
  outDir: 'lib',          // 产物目录，与 manifest 的 lib/… 对应
  format: ['esm'],        // 包是 type: module，只出 ESM
  platform: 'node',       // 运行在 Node，不是浏览器
  target: 'es2024',       // engines 要求的 Node 版本都支持
  dts: false,             // 不产类型声明（见下）
  fixedExtension: false,  // 锁定 .js 扩展名（见下，这是个真坑）
  unbundle: true,         // 不打包，peer 保持外部化（见下）
})
```

- **`dts: false`**：dsh Loader 只加载运行时入口，不消费类型声明。产 dts 需要类型检查，而类型检查会拖慢 prepare 并可能引用 workspace 里的 tsconfig——独立仓库两样都不想要。消费者要类型，让他们看源码或等你有余力再开。
- **`fixedExtension: false`**：tsdown 在 `platform: 'node'` 时默认 `fixedExtension: true`，此时 ESM 产物扩展名解析为 `.mjs`。而 manifest 的 `main`/`exports` 声明的是 `lib/index.js`——两边对不上，加载时模块解析直接失败。`fixedExtension: false` 加上包声明 `type: "module"`，才得到 `.js`。
- **`unbundle: true`**：每个 entry 一个产物文件，不做打包。关键是**peer 保持外部化**——`@deepseek-ai/cordis` 不会被打进 `lib/index.js`，运行时从安装方 profile 解析。一旦打包进去，你的产物里就有一个私有的 Cordis 副本，与安装方的注册表互不相识，这正是第 1 章说"永远不把 Cordis 打进依赖"要防的事故。

### 尝试制造错误

删掉 `fixedExtension: false` 这一行，重新构建：

```sh
rm -rf lib && pnpm build && ls lib
```

预期输出：

```
index.mjs    invariant.mjs
```

`index.js` 消失了——manifest 里 `main`/`exports` 声明的入口文件不存在。此刻 `pnpm test` 的包名自引用解析到 `./lib/index.js`，文件不存在，测试在导入阶段就报模块找不到。把配置改回来，重新 `pnpm build`，`ls lib` 恢复为 `index.js` 与 `invariant.js`。

再模拟一次"git 安装拿到的环境"：`lib/` 清空后只靠 `prepare` 重建——

```sh
rm -rf lib && pnpm prepare && ls lib
```

预期输出与 `pnpm build` 相同。这条命令能过，第 6 章的 git 安装演练就不会在构建上翻车。

### lib/ 必须进 .gitignore

如果 `lib/` 被提交进 git，克隆拿到的是**提交时刻的旧产物**：源码已前进、产物停在昨天，而且 install 缓存里躺着一份谁也不再看的大文件。构建产物不入库，让 `prepare` 每次现做——这也是第 1 章 `.gitignore` 第一行就是 `lib/` 的原因。

下一章：[本地试装与迭代](#6-本地试装与迭代link-dump-config-与隔离演练)。

## 6. 本地试装与迭代

### 开发循环

```sh
pnpm test      # 改源码 → 跑测试
pnpm build     # 测试绿了 → 重新产出 lib/
```

测试对着真实 peer 跑（第 1 章的镜像模式），所以绝大多数迭代不需要碰 dsh。需要真实环境时，用本地试装。

### link: 试装

```sh
dsh plugin --profile dev add ~/dev/dsh-skill-hello
```

本地路径安装走 link: 协议，指向你的工作目录。**改完 `pnpm build` 即生效，无需重装**——profile 解析到的 `lib/index.js` 就是刚构建的那份。

### 两层验证：先看组合，再启动

```sh
dsh --dump-config --profile dev
```

预期看到两样东西（示意）：

```yaml
# == @myorg/dsh-skill-hello          ← 你的 bundle 层
- insert:
    - id: skill-hello
      name: '@myorg/dsh-skill-hello'
# …基础组合 + 各 bundle 层合成的完整组合，其中出现：
    - id: skill-hello
      name: '@myorg/dsh-skill-hello'   ← 挂载行
```

`--dump-config` 把各层叠加后的合成配置打出来：先确认你的层存在、行正确，再确认挂载行进了合成结果。组合对了再启动：

```sh
dsh --profile dev
```

### 隔离环境演练（不污染你的 DSH_HOME）

发布前用一次真实 git 安装做全流程演练。`git+file://` 让 pnpm 走完整的 git 依赖路径，又不依赖远端：

```sh
DSH_HOME=/tmp/e2e dsh plugin --profile t add "git+file:///Users/you/dev/dsh-skill-hello#main"
```

第一次预期**失败**：pnpm 在得到显式允许前拒绝运行 git 依赖的构建脚本。把 pnpm 打印的确切包键复制进该 profile 的 `pnpm-workspace.yaml`：

```yaml
allowBuilds:
  '@myorg/dsh-skill-hello@git+file:///Users/you/dev/dsh-skill-hello#<sha>': true
```

重新执行 add → `DSH_HOME=/tmp/e2e dsh --dump-config --profile t` → `DSH_HOME=/tmp/e2e dsh --profile t`。三步全过，你发布的包在陌生机器上就是这套流程。

下一章：[分发与消费者授权](#7-分发与消费者授权gitnpm-tarball-与-allowbuilds)。

## 7. 分发与消费者授权

### 三种形式

| 形式 | 命令 | 消费者代价 |
|---|---|---|
| git | `add git+https://…<repo>.git`（或 `github:<owner>/<repo>` 简写） | 首次失败 → 把 pnpm 打印的确切键写进 profile 的 `pnpm-workspace.yaml` `allowBuilds` → 重跑；建议 pin `#<sha>` |
| npm | `add <包名>` | 无——`pnpm publish` 时 `lib/` 已构建进包 |
| tarball | `add ./pkg-x.y.z.tgz` | 无——`pnpm pack` 产物自带预构建代码 |

本仓库的真实安装命令（消费者视角）：

```sh
# git（首次需 allowBuilds）
dsh plugin --profile <name> add git+https://gitee.com/zuozewei/dsh-skill-7d-code-reviewer.git

# npm（发布后）
dsh plugin --profile <name> add @7dgroup/dsh-skill-7d-code-reviewer

# tarball（pnpm pack 产出）
dsh plugin --profile <name> add ./dsh-skill-7d-code-reviewer-0.1.0-rc.5.tgz
```

### allowBuilds 是真实的安全边界

要理解你在要求消费者批准什么：**允许构建 = 允许该包的代码在安装时于你的机器上执行，且不在任何 agent 沙箱之内**。这不是确认对话框式的走过场——键里含 commit sha：

```yaml
allowBuilds:
  '@7dgroup/dsh-skill-7d-code-reviewer@git+https://gitee.com/zuozewei/dsh-skill-7d-code-reviewer.git#<sha>': true
```

上游推了新提交，键就变了，需要重新授权。这层摩擦是特性不是缺陷：消费者授权的始终是"某一次提交的代码"，而不是"这个仓库永远可以在我的机器上执行任意安装脚本"。所以分发文档里建议消费者 pin `#<sha>`，而不是浮动跟踪分支。

### 发布流程

```sh
pnpm pack      # 本地检视 tarball：lib/ 齐不齐、assets 在不在、有没有多余文件
pnpm publish   # scoped 包需要 publishConfig.access: public
```

发布前核对三件事：`lib/` 是刚构建的（`rm -rf lib && pnpm build` 一次最稳）、`files` 清单覆盖运行所需的一切、版本号已更新。发布 npm 形式后，消费者就获得了零授权安装的路径——这是对内部工具最友好的分发方式；git 形式则把授权权留给消费者，适合开源或跨组织场景。

## 8. 常见坑与排错

每条按"症状 → 机制 → 解法"组织。前六条是本仓库开发过程中真实踩过的。

| # | 症状 | 机制 | 解法 |
|---|---|---|---|
| 1 | git 安装直接报错，提到 `workspace:` | pnpm 把仓库克隆进 store、在 workspace 上下文之外解析依赖，`workspace:` 协议无处解析 | 独立仓库一律真实版本范围；peer 在 devDependencies 镜像一份 |
| 2 | 加载时找不到 `lib/index.js`，但 `ls lib` 里有 `index.mjs` | tsdown 在 `platform: 'node'` 下默认 `fixedExtension: true`，ESM 产物扩展名为 `.mjs`，与 manifest 声明不符 | `fixedExtension: false`（配合 `type: "module"` 得到 `.js`） |
| 3 | prepare 在别的机器上炸，报找不到项目引用/相邻包 | prepare 运行在 pnpm store 的克隆里，那里没有 monorepo checkout、没有项目引用、没有共享 tsconfig | 构建配置自包含：只用本仓库源码 + npm 依赖；不假设任何邻居 |
| 4 | 消费者装到的是陈旧产物 | `lib/` 被提交进 git，克隆拿到提交时刻的旧构建 | `lib/` 进 .gitignore，产物由 `prepare` 每次现做 |
| 5 | add 后行为诡异：行覆盖了不该覆盖的东西 | 组合层行 id 与基础组合已有行冲突；或覆盖行只重述了部分键——patch 替换整个 config 值，不深度合并，缺的键被清空 | id 取有辨识度的名字；覆盖时重述整行每个键 |
| 6 | 测试报无法解析自己的包名 | Node 的包名自引用依赖 `exports` 字段；没有它，`import '@myorg/dsh-skill-hello'` 找不到自己 | manifest 必须有 `exports`（顺带：自引用解析到构建产物，测试因此同时验证了产物存在） |
| 7 | 插件"什么都没做"：不报错、不输出，vitest 超时 | `inject` 声明的服务无提供方，fiber 停在 PENDING——这是合法状态，不是错误 | 对照 Cordis 教程第 6 章诊断 fiber 状态；确认能力面提供方（如 SkillRegistry）已挂载 |
| 8 | 组合层改了包名后 `add` 无声无息没效果 | 配置项模块无法解析时 Cordis 经 logger 报告而不崩溃，启动早期该报告可能早于 console 导出器就位而丢失 | 先查拼写；用 `--dump-config` 看合成组合里行是否正确 |

排错的通用次序就是第 6 章的两层验证：先 `--dump-config` 确认组合层与挂载行，再启动看 fiber 状态。组合层的错误（拼写、id 冲突、覆盖不完整）在 dump 里一眼可见；运行时的错误（PENDING、注册失败）回到 Cordis 教程第 6 章的工具箱。

## 从这里走向完整插件

- **本仓库就是终点形态**：本教程各章的片段在 [`@7dgroup/dsh-skill-7d-code-reviewer`](https://gitee.com/zuozewei/dsh-skill-7d-code-reviewer) 里全部就位——manifest、组合层、双入口、资源完备性测试、自包含构建。开发你自己的插件时，把它当对照样例，按第 6 章的循环迭代。
- **回到 Cordis 教程**继续读：构建工具（`defineTool` 的完整能力）、三层能力设计（harness 如何组织可替换能力）、各子系统页面的 cordis-surface 区块（可注入与可监听的全部清单）、`examples/headless-agent`（真实 agent 的完整组合——你现在能读懂其中每个配置项了）。
- 日常循环记住一句话就够：**`pnpm test` 证代码，`pnpm build` 供 link，`--dump-config` 证组合，隔离 DSH_HOME 证安装。**
