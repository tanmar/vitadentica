import type { APIRoute } from 'astro';
import { markdownResponse, priceMarkdown } from '../lib/page-markdown';

export const GET: APIRoute = async () => markdownResponse(await priceMarkdown());
