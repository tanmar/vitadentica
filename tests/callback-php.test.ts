import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

/**
 * Endpoint formularza oddzwonienia (public/api/callback.php) we wbudowanym serwerze PHP; mail() zapisuje wiadomości
 * do pliku. Bez PHP w systemie (np. macOS bez Homebrew) cały blok jest pomijany. Kolejność testów ma znaczenie:
 * limit zgłoszeń liczy poprawne zgłoszenia z jednego IP (3 na 10 minut).
 */
const hasPhp = spawnSync('php', ['-v']).status === 0;
const PORT = 8790 + Math.floor(Math.random() * 200);
const BASE = `http://127.0.0.1:${PORT}`;
const URL_ = `${BASE}/api/callback.php`;

const valid = { lp: 'ortodoncja', name: 'Anna', phone: '600 100 200', email: '', audience: 'dzieci', consent: '1', website: '', elapsed: '12' };

describe.skipIf(!hasPhp)('public/api/callback.php', () => {
  let server: ChildProcess;
  let dir: string;
  const mails = () => {
    const file = join(dir, 'mail.txt');
    return existsSync(file) ? readFileSync(file, 'utf8').split('\n---\n').filter((m) => m.trim()) : [];
  };
  const post = (fields: Record<string, string>, { json = true, origin = BASE as string | null } = {}) =>
    fetch(URL_, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        ...(json ? { Accept: 'application/json' } : {}),
        ...(origin ? { Origin: origin } : {}),
      },
      body: new URLSearchParams(fields),
    });

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'vd-callback-'));
    // Atrapa sendmaila: dopisuje wiadomość do pliku i ignoruje argumenty (np. -f).
    const sendmail = join(dir, 'sendmail.sh');
    writeFileSync(sendmail, `#!/bin/sh\ncat >> "${join(dir, 'mail.txt')}"\nprintf '\\n---\\n' >> "${join(dir, 'mail.txt')}"\n`);
    chmodSync(sendmail, 0o755);
    server = spawn('php', ['-d', `sendmail_path=${sendmail}`, '-d', `sys_temp_dir=${dir}`, '-S', `127.0.0.1:${PORT}`, '-t', 'public'], {
      stdio: 'ignore',
    });
    for (let attempt = 0; attempt < 50; attempt += 1) {
      try {
        await fetch(URL_);
        return;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
    throw new Error('serwer PHP nie wystartował');
  });

  afterAll(() => {
    server?.kill();
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  test('przyjmuje tylko POST', async () => {
    const response = await fetch(URL_, { headers: { Accept: 'application/json' } });
    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('POST');
  });

  test('odrzuca zgłoszenia spoza witryny', async () => {
    expect((await post(valid, { origin: null })).status).toBe(403);
    expect((await post(valid, { origin: 'https://example.com' })).status).toBe(403);
    expect(mails()).toHaveLength(0);
  });

  test('sprawdza pola i zwraca listę błędów', async () => {
    const empty = await post({ lp: 'implanty', name: '', phone: '', email: '', consent: '' });
    expect(empty.status).toBe(422);
    expect((await empty.json()).fields).toEqual(['name', 'contact', 'consent']);
    expect((await (await post({ ...valid, phone: '123' })).json()).fields).toEqual(['phone']);
    expect((await (await post({ ...valid, phone: '', email: 'anna@' })).json()).fields).toEqual(['email']);
    // Próba wstrzyknięcia nagłówka przez pole e-mail.
    const injected = await post({ ...valid, phone: '', email: 'a@b.pl\r\nBcc: x@example.com' });
    expect((await injected.json()).fields).toEqual(['email']);
    expect(mails()).toHaveLength(0);
  });

  test('pułapki na boty: udaje sukces i nic nie wysyła', async () => {
    expect(await (await post({ ...valid, website: 'https://spam.example' })).json()).toEqual({ ok: true });
    expect(await (await post({ ...valid, elapsed: '1' })).json()).toEqual({ ok: true });
    expect(mails()).toHaveLength(0);
  });

  test('wysyła zgłoszenie z telefonem do gabinetu', async () => {
    const response = await post(valid);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    const [mail] = mails();
    expect(mail).toContain('To: vitadentica@vitadentica.pl');
    expect(mail).toContain('Telefon: 600 100 200');
    expect(mail).toContain('Dotyczy: ortodoncja, dziecko');
    expect(mail).not.toContain('Reply-To');
    const subject = /Subject: =\?UTF-8\?B\?([^?]+)\?=/.exec(mail)?.[1] ?? '';
    expect(Buffer.from(subject, 'base64').toString('utf8')).toBe('Prośba o kontakt: ortodoncja, dziecko');
  });

  test('z samym e-mailem ustawia Reply-To na adres pacjenta', async () => {
    const response = await post({ ...valid, lp: 'implanty', audience: '', phone: '', email: 'anna@example.com' });
    expect(await response.json()).toEqual({ ok: true });
    const mail = mails()[1];
    expect(mail).toContain('Reply-To: anna@example.com');
    expect(mail).toContain('Dotyczy: implanty');
  });

  test('bez JS odpowiada stroną HTML', async () => {
    const response = await post({ ...valid, lp: 'implanty' }, { json: false });
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/html');
    const html = await response.text();
    expect(html).toContain('Dziękujemy');
    expect(html).toContain('href="/lp/implanty"');
    expect(mails()).toHaveLength(3);
  });

  test('limit zgłoszeń z jednego adresu', async () => {
    const response = await post(valid);
    expect(response.status).toBe(429);
    expect(mails()).toHaveLength(3);
  });
});
