import type { APIRoute } from 'astro';
import { clinic } from '../lib/clinic';
import { getPublishedPages, pathFor } from '../lib/content';
import { buildLlmsTxt, type LlmsLink } from '../lib/llms';
import { mainNav, specialties } from '../data/specialties';

const OFFER_PATHS: ReadonlySet<string> = new Set(specialties.map((s) => s.path));

export const GET: APIRoute = async () => {
  const pages = await getPublishedPages();
  const byPath = new Map(pages.map((page) => [pathFor(page), page]));
  const link = (path: string): LlmsLink | undefined => {
    const page = byPath.get(path);
    return page && { title: page.data.h1 ?? page.data.title, path, description: page.data.description };
  };

  // Kolejność jak w menu: najpierw oferta, potem informacje praktyczne; strony spoza menu na końcu.
  const navPaths: string[] = mainNav.map((item) => item.path);
  const extraPaths = [...byPath.keys()].filter((path) => path !== '/' && !navPaths.includes(path));
  const links = [...navPaths, ...extraPaths].map(link).filter((l): l is LlmsLink => l !== undefined);

  const sections = [
    { title: 'Oferta', links: links.filter((l) => OFFER_PATHS.has(l.path)) },
    {
      title: 'Informacje o gabinecie',
      links: [
        { title: 'Strona główna', path: '/', description: 'przegląd oferty i spis stron serwisu' },
        ...links.filter((l) => !OFFER_PATHS.has(l.path)),
      ],
    },
  ];

  return new Response(buildLlmsTxt(clinic, sections), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
