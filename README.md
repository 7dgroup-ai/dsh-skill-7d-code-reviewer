# @7dgroup/dsh-skill-7d-code-reviewer

English | [中文](README.zh.md)

By 7DGroup · MIT · [Gitee](https://gitee.com/zuozewei/dsh-skill-7d-code-reviewer)

Development tutorial (Chinese): [docs/plugin-development-tutorial.md](docs/plugin-development-tutorial.md) — build your own standalone dsh skill plugin step by step, using this repository as the reference sample.

Installable composition bundle that contributes `7d-code-reviewer` to `ctx.skills`. The skill carries the 7DGroup template-driven code review instructions: a five-step review flow, severity grading into critical/medium/minor, a four-dimension scoring rubric, and a placeholder-driven HTML report template.

## Install from Gitee

`dsh plugin` appends the bundle to the profile's `dsh.profile.bundles`, and the bundle's own patch layer mounts the `skill-7d-code-reviewer` row over the base composition. Requires Node `^22.19.0 || >=24.0.0` with pnpm 10+:

```sh
dsh plugin --profile <name> add git+https://gitee.com/zuozewei/dsh-skill-7d-code-reviewer.git
```

Any git spec pnpm understands works; if this repository is mirrored to GitHub, the `github:<owner>/dsh-skill-7d-code-reviewer` shorthand is equivalent.

pnpm blocks a git dependency's build scripts until allowed, so the first `add` fails. Copy the exact package key pnpm printed into the profile's `pnpm-workspace.yaml`, then re-run:

```yaml
allowBuilds:
  '@7dgroup/dsh-skill-7d-code-reviewer@git+https://gitee.com/zuozewei/dsh-skill-7d-code-reviewer.git#<sha>': true
```

Allowing a build means letting that package's code run on your machine at install time, outside any agent sandbox. Prefer pinning a commit (`git+https://gitee.com/zuozewei/dsh-skill-7d-code-reviewer.git#<sha>`) so later pushes cannot silently change what runs.

## Install without build approval

Two forms ship prebuilt code and need no allowance:

```sh
dsh plugin --profile <name> add @7dgroup/dsh-skill-7d-code-reviewer        # npm (once published)
dsh plugin --profile <name> add ./7dgroup-dsh-skill-7d-code-reviewer-0.1.0-rc.5.tgz    # tarball from pnpm pack
```

Build the tarball locally with `pnpm build` followed by `pnpm pack --pack-destination <dir>`. [docs/packaging.md](docs/packaging.md) (Chinese) covers the artifact contents, tarball install verification, local `link:` iteration, and the release checklist.

## Build and test

The git install clones this repository without `lib/` and runs `prepare` (tsdown with the dedicated config): it transpiles `src/` only, without project references or type checking, keeping peer dependencies external.

```sh
pnpm install
pnpm test
```

The provider exposes its packaged `assets/7d-code-reviewer/` directory as the skill resource base. `references/` holds the coding standards, security checklist, and review examples loaded on demand; `templates/report-template.html` is the pure-placeholder HTML report template; `scripts/html-report-generation.md` documents the HTML escaping rules for filled content (no executable scripts ship with the skill).

Commit messages follow the Simplified Chinese convention in [`.trae/rules/git-commit-message.md`](.trae/rules/git-commit-message.md): a `【类型】简短描述` title using one of the nine fixed type tags (【新增】【修复】【优化】【调整】【删除】【文档】【测试】【回滚】【合并】).

## Known Limitations

- The provider contributes one fixed skill and has no runtime customization.
- Report quality depends on the model following the placeholder-filling and HTML-escaping rules; nothing validates the generated report.
- The prepared build ships no type declarations; the dsh Loader loads the runtime entry only.
