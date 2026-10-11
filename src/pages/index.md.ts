import type { APIRoute } from 'astro';
import { homeMarkdown, markdownResponse } from '../lib/page-markdown';

export const GET: APIRoute = async () => markdownResponse(await homeMarkdown());
