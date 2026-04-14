import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

// ─────────────────────────────────────────────────────────────────
// lastModPlugin
//
// Rewrites every occurrence of {{LAST_MOD}} in the shipped text
// assets (sitemap.xml, llms.txt, llms-full.txt) with the current
// ISO date at build time. Keeps `lastmod` entries fresh for Google
// Search Console and LLM crawlers without needing anyone to bump
// dates by hand.
//
// The source files in public/ keep the placeholder verbatim so the
// git history doesn't churn on every build; only the dist/ output
// gets the real date baked in.
// ─────────────────────────────────────────────────────────────────
function lastModPlugin() {
  const TARGETS = ['sitemap.xml', 'llms.txt', 'llms-full.txt']
  return {
    name: 'last-mod-substitute',
    apply: 'build',
    closeBundle() {
      const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
      const distDir = path.resolve('dist')
      for (const file of TARGETS) {
        const p = path.join(distDir, file)
        if (!fs.existsSync(p)) continue
        const content = fs.readFileSync(p, 'utf8')
        if (content.includes('{{LAST_MOD}}')) {
          fs.writeFileSync(p, content.replaceAll('{{LAST_MOD}}', today))
          console.log(`  last-mod → ${file}: ${today}`)
        }
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), lastModPlugin()],
})
