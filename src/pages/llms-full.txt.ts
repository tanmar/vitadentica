import type { APIRoute } from 'astro';
import { clinic } from '../lib/clinic';
import { buildLlmsFullTxt } from '../lib/llms';
import { allMarkdownPages } from '../lib/page-markdown';

export const GET: APIRoute = async () =>
  new Response(buildLlmsFullTxt(clinic, await allMarkdownPages()), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
