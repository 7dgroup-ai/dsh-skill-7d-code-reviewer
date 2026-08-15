import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it } from 'vitest'
import SkillRegistry from '@deepseek-ai/dsh-skill'
import * as Skill7dCodeReviewer from '@deepseek-ai/dsh-skill-7d-code-reviewer'

describe('dsh-skill-7d-code-reviewer', () => {
  it('registers and disposes the bundled code review skill', async () => {
    const ctx = new Context()
    await ctx.plugin(SkillRegistry)
    const fiber = await ctx.plugin(Skill7dCodeReviewer)
    const resourcePath = fileURLToPath(new URL('../assets/7d-code-reviewer/', import.meta.url))

    expect(await ctx.skills.list()).toEqual([{
      name: '7d-code-reviewer',
      description: '7DGroup 模板驱动的代码审查：按命名、安全、性能、异常处理维度逐行审查代码，问题分为严重/中等/轻微三级并评分，输出文本摘要与 HTML 审查报告。当用户要求审查代码、评审改动、评估代码质量或生成代码审查报告时使用。',
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
})
