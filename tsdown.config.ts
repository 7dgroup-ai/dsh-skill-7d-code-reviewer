import { defineConfig } from 'tsdown'

/**
 * Self-contained build for git installs: pnpm runs `prepare` (which invokes
 * this config) inside its store clone, where no monorepo checkout, project
 * references, or type checking exist. Transpiles src/ only; peer dependencies
 * stay external so the runtime resolves them from the installing profile.
 */
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
