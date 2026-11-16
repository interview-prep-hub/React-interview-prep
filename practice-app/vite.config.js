import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'

/**
 * When you run `npm run test:solutions`, every non-test file that a test
 * imports from `exercises/...` is swapped for the file with the same path
 * under `solutions/...` (if it exists). That way the SAME test file checks
 * both your starter code and the reference solution.
 */
function useSolutions() {
  return {
    name: 'use-solutions',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      if (process.env.TARGET !== 'solutions') return null
      if (!importer || !source.startsWith('.')) return null
      const from = importer.replaceAll('\\', '/')
      if (!from.includes('/exercises/')) return null
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true })
      if (!resolved) return null
      const id = resolved.id.replaceAll('\\', '/')
      if (!id.includes('/exercises/') || /\.test\.[jt]sx?$/.test(id)) return null
      const mapped = id.replace('/exercises/', '/solutions/')
      return fs.existsSync(mapped) ? mapped : null
    },
  }
}

export default defineConfig({
  plugins: [useSolutions(), react()],
  test: {
    // Do not reuse transformed modules between runs: a cached "starter" run
    // must never be reused for a "solutions" run (and the other way round).
    fsModuleCache: false,
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.js'],
    include: ['exercises/**/*.test.{js,jsx}', 'scratch/**/*.test.{js,jsx}'],
    css: false,
  },
})
