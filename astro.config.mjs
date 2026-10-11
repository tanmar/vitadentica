// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import rehypeContent from './src/plugins/rehype-content.mjs';

const isStaging = process.env.SITE_ENV === 'staging';

// Staging siedzi na *.pages.dev; produkcja na docelowej domenie.
// Ta sama logika jest w src/lib/site.ts (używa jej clinic.url): zmieniaj oba miejsca razem.
const site = isStaging
  ? (process.env.STAGING_URL ?? 'https://vitadentica.pages.dev')
  : 'https://vitadentica.pl';

export default defineConfig({
  site,
  // Czyste URL-e bez ukośnika: /implanty (plik implanty.html serwowany przez Cloudflare Pages)
  trailingSlash: 'never',
  build: { format: 'file', inlineStylesheets: 'always' },
  integrations: [sitemap()],
  markdown: { rehypePlugins: [rehypeContent] },
  vite: { plugins: [tailwindcss()] },
});
