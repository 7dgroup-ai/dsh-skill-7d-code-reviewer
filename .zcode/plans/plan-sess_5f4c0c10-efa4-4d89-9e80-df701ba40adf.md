Create a new `AGENTS.md` at the workspace root (`/Users/zuozewei/Downloads/gitlab/deepseek/dsh-skill-7d-code-reviewer/AGENTS.md`). No existing `.zcode/AGENTS.md`, `.agents/AGENTS.md`, or root `AGENTS.md` was found, so this is a fresh file.

## Planned content (outline)

**Repository purpose** — Installable dsh (DeepSeek Harness) composition bundle `@7dgroup/dsh-skill-7d-code-reviewer` that registers the `7d-code-reviewer` template-driven code review skill on `ctx.skills`.

**Layout** — One line each for `src/index.ts` (Cordis plugin registering the provider), `src/invariant.ts` (invariant companion), `assets/7d-code-reviewer/` (skill resource base: SKILL.md, references/, templates/, scripts/), `cordis.patch.yml` (bundle composition layer), `lib/` (gitignored build output), `tests/`, `docs/plugin-development-tutorial.md`, and `.trae/rules/git-commit-message.md`.

**Commands** — `pnpm install`, `pnpm build` (tsdown via `prepare`), `pnpm test` (vitest run); note there is no lint/typecheck script and the build transpiles only (`dts: false`).

**Build/packaging rules** — Build must stay self-contained for git installs (pnpm runs `prepare` in its store clone): transpile `src/` only, peer deps external, no project references. The `files` field controls what ships; update it when adding shipped files. Node `^22.19.0 || >=24.0.0`, pnpm 10+.

**Edit gotchas** — The vitest spec asserts the exact skill listing (including the Chinese `DESCRIPTION` string) and that all asset files are non-empty, so constants in `src/index.ts` and asset files are coupled to the test; resource paths resolve via `new URL('../assets/...', import.meta.url)` relative to `lib/`, so keep that depth; keep the `/* jscpd:ignore-start/end */` markers; the HTML report template must stay pure placeholders (no executable scripts); user-facing strings are Simplified Chinese.

**Commits** — Follow `.trae/rules/git-commit-message.md`: Simplified Chinese, `【类型】简短描述` title with one of the nine fixed type tags, ≤50-char title, numbered body lines ≤70 chars.

## Steps

1. Write `AGENTS.md` at the workspace root with the sections above (~60 lines, English with Chinese specifics preserved where they are facts like the commit tags).
2. Verify with a quick read.
3. Summarize the sections written and report the file path.