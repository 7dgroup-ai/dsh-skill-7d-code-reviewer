/**
 * Bundled `7d-code-reviewer` skill provider.
 *
 * @module @7dgroup/dsh-skill-7d-code-reviewer
 */

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

/* jscpd:ignore-start */
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
/* jscpd:ignore-end */
