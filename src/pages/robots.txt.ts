import type { APIRoute } from 'astro';
import { buildRobotsTxt } from '../lib/robots';
import { isStaging } from '../lib/site';

export const GET: APIRoute = ({ site }) =>
  new Response(buildRobotsTxt({ staging: isStaging, siteUrl: site!.toString() }), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
