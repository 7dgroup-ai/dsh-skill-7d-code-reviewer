# @7dgroup/dsh-skill-7d-code-reviewer

English | [中文](README.zh.md)

Installable composition bundle that contributes `7d-code-reviewer` to `ctx.skills`. The skill carries the 7DGroup template-driven code review instructions: a five-step review flow, severity grading into critical/medium/minor, a four-dimension scoring rubric, and a placeholder-driven HTML report template.

## Install from GitHub

`dsh plugin` appends the bundle to the profile's `dsh.profile.bundles`, and the bundle's own patch layer mounts the `skill-7d-code-reviewer` row over the base composition:

```sh
dsh plugin --profile <name> add github:<owner>/dsh-skill-7d-code-reviewer
```

pnpm blocks a git dependency's build scripts until allowed, so the first `add` fails. Copy the exact package key pnpm printed into the profile's `pnpm-workspace.yaml`, then re-run:

```yaml
allowBuilds:
  '@7dgroup/dsh-skill-7d-code-reviewer@git+...': true
```

Allowing a build means letting that package's code run on your machine at install time, outside any agent sandbox. Prefer pinning a commit (`github:<owner>/dsh-skill-7d-code-reviewer#<sha>`) so later pushes cannot silently change what runs.

## Install without build approval

Two forms ship prebuilt code and need no allowance:

```sh
dsh plugin --profile <name> add @7dgroup/dsh-skill-7d-code-reviewer        # npm (once published)
dsh plugin --profile <name> add ./dsh-skill-7d-code-reviewer-0.1.0-rc.5.tgz    # tarball from pnpm pack
```

## Build and test

The git install clones this repository without `lib/` and runs `prepare` (tsdown with the dedicated config): it transpiles `src/` only, without project references or type checking, keeping peer dependencies external.

```sh
pnpm install
pnpm test
```

The provider exposes its packaged `assets/7d-code-reviewer/` directory as the skill resource base. `references/` holds the coding standards, security checklist, and review examples loaded on demand; `templates/report-template.html` is the pure-placeholder HTML report template; `scripts/html-report-generation.md` documents the HTML escaping rules for filled content (no executable scripts ship with the skill).

## Known Limitations

- The provider contributes one fixed skill and has no runtime customization.
- Report quality depends on the model following the placeholder-filling and HTML-escaping rules; nothing validates the generated report.
- The prepared build ships no type declarations; the dsh Loader loads the runtime entry only.
