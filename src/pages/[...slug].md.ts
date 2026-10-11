import type { APIRoute, GetStaticPaths } from 'astro';
import { getGenericMarkdownPages } from '../lib/content';
import { entryMarkdown, markdownResponse } from '../lib/page-markdown';

export const getStaticPaths = (async () => {
  const pages = await getGenericMarkdownPages();
  return pages.map((page) => ({ params: { slug: page.id }, props: { page } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) => {
  const { page } = props as Awaited<ReturnType<typeof getStaticPaths>>[number]['props'];
  return markdownResponse(entryMarkdown(page));
};
