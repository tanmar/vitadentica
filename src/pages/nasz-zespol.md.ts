import type { APIRoute } from 'astro';
import { markdownResponse, teamMarkdown } from '../lib/page-markdown';

export const GET: APIRoute = async () => markdownResponse(await teamMarkdown());
