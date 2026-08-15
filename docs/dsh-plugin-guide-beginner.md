# DSH 代码审查插件：零基础入门指南

> 这份指南写给没有开发经验的读者。前半部分用生活化的类比讲清楚这个插件是怎么做出来的，中间手把手带你开发一个，最后教你怎么把它装进项目用起来。
>
> 想要更完整的讲解，看 [dsh-plugin-development-guide.md](dsh-plugin-development-guide.md)。

---

## 目录

1. [第一部分：快速认识（这个插件是什么）](#第一部分快速认识这个插件是什么)
2. [第二部分：亲手开发一个插件](#第二部分亲手开发一个插件)
3. [第三部分：插件导入与使用指南](#第三部分插件导入与使用指南)

---

## 第一部分：快速认识（这个插件是什么）

这个插件给 DSH 智能助手装了一个"代码体检医生"。

把代码交给它，它会像医生做体检一样：逐项检查命名规不规范、有没有安全漏洞、性能好不好；给问题分等级（🔴 严重、🟡 中等、🟢 轻微）；打个总分；最后出两份报告，一份简短的文字总结，一份网页版（HTML）详细报告。

开发这个插件，可以比作开一家连锁餐厅再让商场收下它：先设计菜单，再租店面、写操作手册、带齐工具，最后去商场登记上架。这条思路画成图：

```
想清楚做什么 ──► 建独立仓库 ──► 写操作手册(SKILL.md) ──► 带齐附件
      │                                                    │
      ▼                                                    ▼
  上架分发 ◄── 自查打包 ◄── 写名片和入场券 ◄── 写报名表(60行代码)
```

这类"技能型"插件，真正花力气的地方是手册和附件，不是代码。代码只有 60 行，就是一张报名表。第二部分带你亲手把这条思路走一遍。

---

## 第二部分：亲手开发一个插件

> 电脑上需要先装好 Node.js（22.19 以上）和 pnpm（10 以上）。整个过程不用付费、不用 API 密钥，也不会真的调用模型。

### 第 0 步：准备工作目录

先建一个独立的文件夹（git 仓库）。它必须独立，不能放在别的项目里，原因第 5 步会讲。

```sh
mkdir -p ~/dev/dsh-skill-7d-code-reviewer && cd ~/dev/dsh-skill-7d-code-reviewer
git init
```

### 第 1 步：写名片 package.json

每个插件包都带一张"名片"，告诉系统自己叫什么、入口在哪、发布时带哪些文件、依赖什么。

新建 `package.json`，照抄：

```jsonc
{
  "name": "@7dgroup/dsh-skill-7d-code-reviewer",
  "version": "0.1.0",
  "type": "module",
  "main": "lib/index.js",
  "exports": {
    ".": { "default": "./lib/index.js" },
    "./cordis.patch.yml": "./cordis.patch.yml",
    "./package.json": "./package.json"
  },
  "files": ["lib/index.js", "cordis.patch.yml", "assets"],
  "scripts": {
    "prepare": "tsdown",
    "build": "tsdown",
    "test": "vitest run"
  },
  "engines": { "node": "^22.19.0 || >=24.0.0" },
  "dsh": {
    "bundle": { "patch": "./cordis.patch.yml" }
  },
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

几条说明：

- `main` 和 `exports` 告诉别人代码入口在哪。`exports` 里多列的两个子路径，是让系统工具能按固定地址读到你的名片和入场券。
- `files` 是发布白名单，打包时只带这里列的东西。漏写一个文件，用户装到的就是残缺的包。
- `scripts.prepare` 是别人安装你时自动跑的命令，作用是现场"翻译"代码（见第 5 步）。
- `dsh.bundle.patch` 声明"我是可被启用的插件"，并指向入场券文件。没有它，系统只把你当普通代码库，不会排进用户的启动名单。
- `peerDependencies` 和 `devDependencies` 各列一遍同样的依赖。前者声明"运行时由用户的 profile 提供"，后者让本仓库没有 dsh 环境也能独立构建测试。两处都必须写真实版本号，不能写 `workspace:`（那是 monorepo 专属写法，独立仓库用了会报错）。

### 第 2 步：写操作手册 SKILL.md

这是插件的大脑。智能助手被调用时，就"读"这份手册照着做。先写一个最简版（真实插件的手册约 260 行，这里精简到 40 行说明结构）：

新建 `assets/7d-code-reviewer/SKILL.md`：

```markdown
# 代码审查专家

## 审查流程（5 步）
1. 接收审查任务：确定代码语言和业务场景
2. 快速浏览：判断改动性质（新功能/修 bug/重构）
3. 逐行审查：检查命名、安全、性能、异常处理
4. 问题分级：🔴 严重 / 🟡 中等 / 🟢 轻微
5. 生成报告：先文字摘要，再 HTML 报告

## 问题分级标准
| 级别 | 标识 | 定义 |
|------|------|------|
| 严重 | 🔴 | 安全漏洞、崩溃风险 |
| 中等 | 🟡 | 性能隐患、逻辑缺陷 |
| 轻微 | 🟢 | 命名优化、注释补充 |

## 评分标准
- 9-10 分：优秀；7-8 分：良好；5-6 分：中等；
- 3-4 分：较差；1-2 分：很差

## 报告输出
先输出文字摘要，再填充 HTML 模板并保存为
`code-review-report-{时间戳}.html`。
```

为什么把逻辑写进手册，而不是代码？因为手册随时能改，不用重新编译。想调评分标准，改手册那一行就行。这就是改菜单不用重新装修厨房。

### 第 3 步：带齐附件

手册里会引用两类附件（真实插件还有第三类 `scripts/`，这里先略）：

1. 知识库 `assets/7d-code-reviewer/references/security-checklist.md`，一份"怎么算不安全"的清单，审查到安全环节时才翻：

```markdown
# 安全检查清单
- SQL 注入：不要用字符串拼接 SQL，应使用参数化查询
- XSS：输出到网页的内容必须转义 < > & 等字符
- 敏感信息：密钥、密码不要硬编码在代码里
```

2. 报告模板 `assets/7d-code-reviewer/templates/report-template.html`，一张"空白体检表"，只有填空位、没有逻辑：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><title>{{report_title}}</title></head>
<body>
  <h1>{{report_title}}</h1>
  <p>审查时间：{{review_timestamp}}</p>
  <p>总体评分：{{total_score}} / 10</p>
  <div>{{critical_issues}}</div>
  <div>{{good_points}}</div>
</body>
</html>
```

`{{...}}` 叫占位符，就是填空题的空格。模板里不许出现 if/else，所有"没有内容时填什么"的规则都写在手册里，模板只负责展示。

想给报告换个配色，改模板就行，审查逻辑一行不动。这就是手册管判断、模板管长相。

### 第 4 步：写报名表 src/index.ts（唯一的代码，60 行）

前面的都是内容，这一步才写代码。代码只干一件事：去系统的"技能登记处"报名。

新建 `src/index.ts`：

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

const CANDIDATE: SkillCandidate = {
  name: PROVIDER_NAME,
  description: '审查代码、评审改动、评估代码质量，输出文字摘要与 HTML 审查报告。当用户要求审查代码或生成代码审查报告时使用。',
  invocation: { modelInvocable: true, userInvocable: true },
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

拆开看这份报名表：

- `name`、`inject`、`apply` 是 Cordis 插件必备的三件套。`name` 是标识；`inject: ['skills']` 声明"我要用技能登记处这个服务"；`apply` 是登记处就绪后系统调用的函数，里面只做一件事，就是 `registerProvider` 报名。
- `description` 是给模型看的自我介绍，决定助手什么时候叫你上场。
- `invocation` 决定谁能叫：`modelInvocable` 是助手自己判断着叫，`userInvocable` 是用户点名叫 `/7d-code-reviewer`。
- `provider` 的 `list()` 和 `get()` 有分工：前者只返回报名信息，轻，调用频繁；后者才真的读手册正文，重，只在被点名时读。这叫懒加载。
- 报名是"注册式 effect"：`registerProvider` 的返回值会被系统自动挂在插件上，插件卸载时自动注销，不用手写清理。

有一个坑要留意：资源地址是 `../assets/…`（上一级）。因为代码发布前会先"翻译"到 `lib/` 文件夹里，从 `lib/` 的位置看，附件夹确实在上一级。位置永远按"翻译后站在哪里"来算。

### 第 5 步：写翻译机配置 tsdown.config.ts

TypeScript 代码不能直接跑，需要一台"翻译机"把它转成 JavaScript（产出 `lib/` 文件夹）。这台翻译机叫 tsdown，给它写个配置：

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

三条设置别乱动：

- `dts: false` 不生成类型声明文件。dsh 加载时用不到，还能让翻译更快。
- `fixedExtension: false` 这里有个坑：不加它，翻译结果的文件名会变成 `index.mjs`，而名片里写的是 `index.js`，对不上号，加载时找不到入口。
- `unbundle: true` 不把 `@deepseek-ai/cordis` 这些依赖打包进去。这些依赖由用户的 profile 提供，一旦打包进去，你的插件里就多了一个"私有的登记处副本"，和用户的登记处互不相识，全乱套了。

新建 `.gitignore`，告诉 git 不要提交翻译产物和依赖：

```
lib/
node_modules/
```

这里也回答了第 0 步"为什么要独立仓库"：别人安装你时，系统会把整个文件夹复制到它自己的地方再翻译。如果你依赖隔壁项目的东西，复制过去就缺了。所以独立仓库加真实版本号，是两条不能破的规矩。

### 第 6 步：写入场券 cordis.patch.yml

只有一行，意思是"当用户启用我时，请在他的配置里挂载这个包"：

```yaml
- insert:
    - id: skill-7d-code-reviewer
      name: '@7dgroup/dsh-skill-7d-code-reviewer'
```

有了它，用户只需要一条安装命令，不用手动改任何配置文件。`id` 是这一行的名字，取个有辨识度的就行。

### 第 7 步：写验收测试 tests/skill-7d-code-reviewer.spec.ts

发布前先自己验收。测试模拟报名、查询、注销的完整流程：

```ts
import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it } from 'vitest'
import SkillRegistry from '@deepseek-ai/dsh-skill'
import * as Skill7dCodeReviewer from '@7dgroup/dsh-skill-7d-code-reviewer'

describe('dsh-skill-7d-code-reviewer', () => {
  it('registers and disposes the bundled code review skill', async () => {
    const ctx = new Context()
    await ctx.plugin(SkillRegistry)                     // 先挂载"登记处"
    const fiber = await ctx.plugin(Skill7dCodeReviewer)  // 再挂载被测插件

    const names = (await ctx.skills.list()).map((s) => s.name)
    expect(names).toEqual(['7d-code-reviewer'])          // ① 报上名了

    const loaded = await ctx.skills.get('7d-code-reviewer')
    expect(loaded?.content).toContain('审查流程')          // ② 手册能读到

    await fiber.dispose()                                 // 卸载
    expect(await ctx.skills.list()).toEqual([])           // ③ 卸得干净
  })
})
```

几个要点：

- 测试自己当"组合者"：先 `ctx.plugin(SkillRegistry)` 挂登记处，再挂被测插件。顺序反了或漏了登记处，插件会一直等，测试就超时。
- 用 `import * as … from '@7dgroup/…'` 按包名导入自己，验证的是"名片声明的入口和真实产物一致"。
- 三层断言：报上名了（①）、手册能读到（②）、卸得干净（③）。最后一步就是"注册式 effect 自动清理"的直接证据。

### 第 8 步：跑起来

```sh
pnpm install     # 装依赖；结尾会自动触发 prepare（翻译代码），生成 lib/
pnpm test        # 跑验收测试，预期 1 个测试通过
pnpm build       # 手动重新翻译（改代码后要再跑）
pnpm pack --dry-run   # 预览安装包里装了哪些文件，核对附件齐不齐
```

预期测试输出：

```
 ✓ tests/skill-7d-code-reviewer.spec.ts (1)
   ✓ dsh-skill-7d-code-reviewer > registers and disposes the bundled code review skill

 Test Files  1 passed (1)
      Tests  1 passed (1)
```

到这里，一个能用的插件就开发完了。想让它更完整（五步审查流程、四维评分、真实 HTML 模板、不变量入口、npm 发布），对照本仓库真实源码补全即可，专业版教程里每一步都有讲。

---

## 第三部分：插件导入与使用指南

### 一、获取方式（三选一）

| 方式 | 命令 | 适合谁 | 类比 |
|---|---|---|---|
| npm 安装（最简单） | `dsh plugin --profile dev add @7dgroup/dsh-skill-7d-code-reviewer` | 已正式发布的版本 | 应用商店一键安装 |
| git 安装 | `dsh plugin --profile dev add git+https://gitee.com/zuozewei/dsh-skill-7d-code-reviewer.git` | 想用最新代码 | 从厂家官网下载 |
| 离线安装包 | `dsh plugin --profile dev add ./7dgroup-dsh-skill-7d-code-reviewer-0.1.0-rc.5.tgz` | 内网/无外网环境 | 拿 U 盘拷安装包 |

> 电脑上要先装好 Node.js（22.19 以上）、pnpm（10 以上）和 dsh 命令行工具。
> `--profile dev` 里的 `dev` 是环境名字（profile），可以理解成手机里的"使用模式"：工作模式装一批插件，实验模式装另一批，互不干扰，名字随你取。

### 二、导入步骤（以最常用的 git 方式为例）

第 1 步，执行安装命令：

```sh
dsh plugin --profile dev add git+https://gitee.com/zuozewei/dsh-skill-7d-code-reviewer.git
```

第 2 步，首次会"失败"，这是正常的，不是出错。系统会提示：不允许直接运行来自 git 的安装脚本，并打印一串很长的"包钥匙"。这是一道安全门禁，因为允许安装等于允许这段代码在你的电脑上执行，系统要你亲自点头。

把打印出来的那串完整钥匙，复制到该 profile 的 `pnpm-workspace.yaml` 文件里：

```yaml
allowBuilds:
  '@7dgroup/dsh-skill-7d-code-reviewer@git+https://gitee.com/zuozewei/dsh-skill-7d-code-reviewer.git#<一长串编号>': true
```

钥匙末尾的编号（`#` 后面）对应代码的某个版本。建议固定用这个编号，别改成跟随最新，这样你授权的永远是"我看过的那一版"，而不是"以后随便谁改过的版本"。

第 3 步，重新执行安装命令，这次会顺利装完。用 npm 或离线安装包就没有第 2 步，一条命令直接装好。

### 三、基本配置与初始化

这个插件不用配置，装好就能用。它没有需要用户调节的参数，行为全由自带的操作手册决定。

装好后做两个检查：

```sh
dsh --dump-config --profile dev
```

输出的配置里应该能看到两样东西：一行以 `# == @7dgroup/dsh-skill-7d-code-reviewer` 开头的层（入场券生效了），一条 `name: '@7dgroup/dsh-skill-7d-code-reviewer'` 的挂载记录（系统已把它排进启动名单）。

```sh
dsh --profile dev
```

正常启动后，技能 `7d-code-reviewer` 就在"技能登记处"挂上号了。

### 四、常见使用场景示例

#### 场景 1：审查一段贴出来的代码

直接对智能助手说：

> 帮我审查这段 Python 代码：
> ```python
> def get_user(uid):
>     cursor.execute(f"SELECT * FROM users WHERE id={uid}")
>     return cursor.fetchone()
> ```

助手会自动识别这是代码审查需求（靠的就是技能简介里的那三句话），调用本技能，然后给你：

文字摘要：

```
✅ 优点
- 函数意图明确，返回用户数据

⚠️ 问题
🔴 严重：SQL 注入风险
  位置：get_user() 第 2 行
  描述：直接拼接用户输入到 SQL 语句
  建议修复：使用参数化查询

📊 总体评分：3/10
   代码质量: 5/10 | 安全性: 1/10 | 性能: 7/10 | 可维护性: 4/10
```

还有一份 HTML 详细报告，自动保存成网页文件（形如 `code-review-report-20260815120000.html`），用浏览器打开就能看到评分圆环和问题分级卡片。

#### 场景 2：审查项目改动

> 帮我评审一下这次 git 改动的代码质量。

技能按五步流程走：先浏览改动性质（新功能、修 bug、重构），再逐行检查安全和性能，最后分级出报告。

#### 场景 3：点名调用

助手没自动识别时，直接点名：

> /7d-code-reviewer 审查 src/index.ts

#### 场景 4：团队代码质量把关

把"贴代码让助手审查"放进提交流程：提交前把关键改动发给它，拿到评分和 🔴 问题清单，修掉严重问题再合入。相当于给每个提交配了一位随叫随到的评审。

### 五、遇到问题怎么办？

| 现象 | 可能原因 | 解决办法 |
|---|---|---|
| 安装命令首次"失败" | 正常的安全门禁 | 按第二节第 2 步授权后重试 |
| 装完没反应 | 挂载配置有问题 | 跑 `dsh --dump-config --profile dev`，确认能看到挂载记录 |
| 开发时测试超时 | `inject` 服务没挂载（登记处没先装，或服务名拼错） | 确认先 `ctx.plugin(SkillRegistry)`，检查 `inject` 拼写 |
| 加载找不到 `lib/index.js` | 翻译产物是 `.mjs`，与名片对不上 | 确认 tsdown 配置有 `fixedExtension: false` |
| 想更新到新版本 | git 安装按代码版本缓存 | 重新执行一次 add 命令，记得更新 allowBuilds 钥匙 |
| 想卸载 | — | 用 dsh 的插件管理命令从 profile 移除即可 |

---

## 附：两种读者路线

- 只想用：看第三部分就够。一条安装命令（首次需授权），然后对助手说"帮我审查这段代码"。
- 想开发：跟着第二部分亲手做一遍，做出自己的插件后，再进 [dsh-plugin-development-guide.md](dsh-plugin-development-guide.md) 看完整 API 讲解、生命周期管理、配置处理和更多踩坑记录。
