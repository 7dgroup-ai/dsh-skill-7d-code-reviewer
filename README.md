<p align="center">
  <img alt="npm version" src="https://img.shields.io/npm/v/@7dgroup/dsh-skill-7d-code-reviewer?style=flat-square&color=4b6fff">
  <img alt="license MIT" src="https://img.shields.io/badge/license-MIT-263146?style=flat-square">
  <img alt="node" src="https://img.shields.io/badge/node-%5E22.19%20%7C%7C%20%3E%3D24-339933?style=flat-square">
  <img alt="by 7DGroup" src="https://img.shields.io/badge/by-7DGroup-7da1de?style=flat-square">
</p>

<p align="center">
  <strong>English</strong> | <a href="README.zh.md">中文</a>
</p>

# @7dgroup/dsh-skill-7d-code-reviewer

**Author: 7DGroup**

A professional, template-driven code review skill plugin for DeepSeek Harness (DSH), developed by the 7DGroup team for AI-assisted code review in any dsh session. Built on TypeScript + Cordis, it installs as a composable bundle and registers the `7d-code-reviewer` skill with `ctx.skills`: a five-step review flow, critical/medium/minor severity grading, four-dimension scoring, and dual text + HTML report output. Zero core changes — install to enable, remove the bundle row to uninstall.

---
## 📌 Project Info

| Field | Value |
|---|---|
| Author | 7DGroup |
| Version | 0.1.0-rc.5 |
| Runtime | Node `^22.19.0 || >=24.0.0` · pnpm 10+ · dsh CLI |
| Peer dependencies | `@deepseek-ai/cordis` · `@deepseek-ai/dsh-skill` · `@deepseek-ai/dsh-invariants` |
| Skill name | `7d-code-reviewer` |
| Repository | [github.com/7dgroup-ai/dsh-skill-7d-code-reviewer](https://github.com/7dgroup-ai/dsh-skill-7d-code-reviewer) |
| License | MIT |

## 🖼️ Plugin Effect

Skill invocation in a dsh session:

![Invoking the 7d-code-reviewer skill for a code review](screenshots/skills.png)

Sample HTML report generated from the pure-placeholder template:

![Sample code review HTML report](screenshots/report-preview.png)

**Core Capabilities**:

- **Template-driven mode** — separation of concerns: `SKILL.md` decides what to review and how severe it is, `templates/` only presents. The HTML report template stays pure placeholders; all placeholders must be filled, and every dynamic value is HTML-escaped.
- **Five-step review flow** — accept the task → quick scan → line-by-line review (loading `references/` on demand) → severity grading → report generation.
- **Three-level severity grading** — 🔴 critical (must fix) / 🟡 medium (should fix) / 🟢 minor (optional polish).
- **Four-dimension scoring** — code quality / security / performance / maintainability, each on a 1–10 scale, plus an overall score and an auto-generated summary.
- **Dual output** — a text summary for quick reading, plus a full HTML report saved as `code-review-report-{timestamp}.html`.
- **Built-in knowledge base** — coding standards, security checklist (SQL injection, XSS, authentication/authorization, sensitive-data leaks) and worked review examples, loaded on demand instead of bloating the prompt.
- **Zero core changes** — pure composable bundle; no patches to the DSH core, safe to install and remove.

**Use Cases**:

- Code review before commit / merge request
- Security audit of existing code
- Quality assessment before refactoring
- Enforcing team coding standards
- Any code quality question inside a dsh conversation

## ✅ Features

- ✅ Five-step template-driven review flow
- ✅ Three-level severity grading with fix suggestions
- ✅ Four-dimension scoring rubric (code quality / security / performance / maintainability)
- ✅ Text summary + HTML report dual output
- ✅ Pure-placeholder HTML report template with mandatory filling rules
- ✅ Documented HTML escaping rules for all filled content
- ✅ On-demand knowledge base (coding standards / security checklist / review examples)
- ✅ No executable scripts ship with the skill
- ✅ Installable from GitHub (`github:` shorthand), npm or tarball
- ✅ Git-install build is self-contained (`prepare` hook, transpile-only)

## 📂 Project Structure

```
dsh-skill-7d-code-reviewer/
├── src/                                # source code
│   ├── index.ts                        # Cordis plugin: registers the skill provider
│   └── invariant.ts                    # companion plugin: package ownership invariant
├── assets/7d-code-reviewer/            # skill resources shipped with the package
│   ├── SKILL.md                        # review logic + template selection
│   ├── references/                     # knowledge base, loaded on demand
│   │   ├── coding-standards.md         # naming rules, code complexity
│   │   ├── security-checklist.md       # SQL injection, XSS, auth, leaks
│   │   └── review-examples.md          # worked review examples
│   ├── templates/
│   │   └── report-template.html        # pure-placeholder HTML report
│   └── scripts/
│       └── html-report-generation.md   # HTML escaping rules for filled content
├── tests/                              # vitest suite
│   └── skill-7d-code-reviewer.spec.ts
├── screenshots/                        # README screenshots
│   ├── skills.png                      # skill invocation
│   └── report-preview.png              # sample HTML report
├── cordis.patch.yml                    # composition patch layer
├── tsdown.config.ts                    # build config (transpile-only)
├── 7dgroup-dsh-skill-7d-code-reviewer-0.1.0-rc.5.tgz   # prebuilt tarball
├── package.json
└── README.md
```

## 🚀 Quick Start

Prerequisites: `dsh` CLI, Node `^22.19.0 || >=24.0.0`, pnpm 10+.

### Install directly in dsh (recommended)

Run one command directly in dsh — the `github:` shorthand is the fastest way:

```sh
dsh plugin --profile <name> add github:7dgroup-ai/dsh-skill-7d-code-reviewer
```

The full URL form is equivalent:

```sh
dsh plugin --profile <name> add git+https://github.com/7dgroup-ai/dsh-skill-7d-code-reviewer.git
```

`dsh plugin` appends the bundle to the profile's `dsh.profile.bundles`, and the bundle's own patch layer mounts the `skill-7d-code-reviewer` row over the base composition.

pnpm blocks a git dependency's build scripts until explicitly allowed, so the first `add` fails. Copy the exact package key pnpm printed into the profile's `pnpm-workspace.yaml`, then re-run:

```yaml
allowBuilds:
  '@7dgroup/dsh-skill-7d-code-reviewer@git+https://github.com/7dgroup-ai/dsh-skill-7d-code-reviewer.git#<sha>': true
```

(With the `github:` shorthand the key reads `@7dgroup/dsh-skill-7d-code-reviewer@github:7dgroup-ai/dsh-skill-7d-code-reviewer#<sha>` — always copy the exact key pnpm prints.)

Allowing a build means letting that package's code run on your machine at install time, outside any agent sandbox. Prefer pinning a commit (`...#<sha>`) so later pushes cannot silently change what runs.

### Install from tarball (no build approval)

A prebuilt tarball is committed at the repository root — download it and install directly:

```sh
dsh plugin --profile <name> add ./7dgroup-dsh-skill-7d-code-reviewer-0.1.0-rc.5.tgz
```

Or once published on npm:

```sh
dsh plugin --profile <name> add @7dgroup/dsh-skill-7d-code-reviewer
```

Both forms ship prebuilt code and need no `allowBuilds` allowance.

### Build and test

```sh
pnpm install
pnpm build   # tsdown; also runs as the `prepare` hook on git installs
pnpm test    # vitest
```

## 💡 Usage

The skill activates whenever you ask for a code review — either with the slash command or in natural language:

> /7d-code-reviewer Review this module: ...

The five-step review flow:

| Step | What happens |
|---|---|
| 1. Accept the task | Take the submitted code or file paths; determine the language and business context |
| 2. Quick scan | Classify the change (new feature / bugfix / refactor); locate the core files and key logic |
| 3. Line-by-line review | Load the matching references on demand; check naming, security, performance and error handling |
| 4. Severity grading | 🔴 critical — must fix · 🟡 medium — should fix · 🟢 minor — optional improvement |
| 5. Report generation | Fill the placeholder HTML template; output the text summary plus `code-review-report-{timestamp}.html` |

### Output example (text summary)

```
✅ 优点
- 函数意图明确，返回用户数据

⚠️ 问题
🔴 严重：SQL 注入风险
  位置：get_user() 第 2 行
  描述：直接使用 f-string 拼接用户输入到 SQL 语句
  建议修复：使用参数化查询，如 cursor.execute("SELECT * FROM users WHERE id=?", [uid])

📊 总体评分：3/10
   代码质量: 5/10 | 安全性: 1/10 | 性能: 7/10 | 可维护性: 4/10
```

The full HTML report is saved to `code-review-report-{timestamp}.html` and the file path is reported back to you.

## 📊 Grading & Scoring Standards

Severity levels:

| Level | Marker | Definition | Handling |
|---|---|---|---|
| Critical | 🔴 | security vulnerability, crash risk | must fix |
| Medium | 🟡 | performance hazard, logic flaw | should fix |
| Minor | 🟢 | naming, comments | optional improvement |

Dimension scoring (each on a 1–10 scale):

| Dimension | Excellent (8–10) | Good (6–7) | Needs work (4–5) | Poor (1–3) |
|---|---|---|---|---|
| Code quality | clear naming, clean structure, no duplication | mostly compliant, minor issues | confusing naming or high complexity | violates coding standards |
| Security | no risk, parameterized queries, full validation | basically safe, small flaws | security hazards | severe vulnerabilities |
| Performance | efficient algorithms, caching, no N+1 | acceptable | obvious problems | severe defects |
| Maintainability | documented, modular, high test coverage | maintainable | missing comments/tests | hard to maintain |

Overall score bands: 9–10 excellent · 7–8 good · 5–6 fair · 3–4 poor · 1–2 very poor (fix immediately).

## 📈 HTML Report

- **Score circle** — overall score (1–10) with an auto-generated summary
- **Issue statistics bar** — critical / medium / minor counts and good points
- **Dimension score cards** — code quality / security / performance / maintainability
- **Issues grouped by severity** — location, description and fix suggestion (with code sample)
- **Good points & improvement suggestions** sections
- Pure-placeholder template — all placeholders must be filled; every dynamic value is HTML-escaped per `scripts/html-report-generation.md`
- Empty sections follow the no-content rule (e.g. "🎉 未发现严重问题！")

## ⚠️ Notes

1. The provider contributes one fixed skill; no runtime customization.
2. Report quality depends on the model following the placeholder-filling and HTML-escaping rules; nothing validates the generated report.
3. The prepared build ships no type declarations; the dsh Loader loads the runtime entry only.
4. The build is transpile-only (`dts: false`) with no lint or typecheck scripts — type errors surface in the editor/IDE.
5. Commit messages in this repository follow the Simplified Chinese convention: `【类型】简短描述` (nine fixed type tags).

## ❓ FAQ

**Q: Why does the first `dsh plugin add` fail?**
A: pnpm refuses to run build scripts of git dependencies until explicitly allowed. Copy the exact package key pnpm printed into the profile's `pnpm-workspace.yaml` → `allowBuilds`, then re-run.

**Q: How do I pin a specific commit?**
A: Append `#<sha>` to the spec, e.g. `git+https://github.com/7dgroup-ai/dsh-skill-7d-code-reviewer.git#<sha>` — later pushes cannot silently change what runs.

**Q: How do I uninstall?**
A: Remove the bundle row from the profile's `dsh.profile.bundles`; no core patches are left behind.

**Q: Can I install without approving builds?**
A: Yes — use the prebuilt tarball (committed at the repository root) or the npm package (once published); neither needs `allowBuilds`.

## 📄 License

[MIT](LICENSE) · Copyright (c) 2026 7DGroup
