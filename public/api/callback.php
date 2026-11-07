<?php
/**
 * „Zostaw kontakt, oddzwonimy”: formularz ze stron lądowania (/lp/*), decyzja 29 w docs/DECISIONS.md.
 *
 * Przyjmuje POST z formularza. Z JS (fetch z nagłówkiem Accept: application/json) odpowiada JSON-em, bez JS zwraca
 * prostą stronę HTML. Zgłoszenie idzie e-mailem do gabinetu; na serwerze zostaje tylko krótkotrwały licznik zgłoszeń
 * z jednego adresu IP (skrót SHA-256, bez samego adresu) w katalogu tymczasowym.
 *
 * Zasady pól są te same co w src/scripts/callback-form.ts (zmieniając jedne, zmień drugie). Adres odbiorcy musi być
 * równy `clinic.email` z src/lib/clinic.ts (pilnuje tego tests/callback-form.test.ts).
 * Wymaga PHP 7.4+ i działającej funkcji mail() (hosting LH.pl). Na Cloudflare Pages (podglądy) PHP nie działa.
 */

declare(strict_types=1);

const RECIPIENT = 'vitadentica@vitadentica.pl';
const PHONE_DISPLAY = '(+48) 22 370 25 10';
const SITE_HOSTS = ['vitadentica.pl', 'www.vitadentica.pl'];
const LANDINGS = ['implanty' => 'implanty', 'ortodoncja' => 'ortodoncja'];
const AUDIENCES = ['dorosli' => 'dorosły', 'dzieci' => 'dziecko'];
const PHONE_MIN_DIGITS = 9;
const PHONE_MAX_DIGITS = 15;
/** Wersja treści zgody i klauzuli w formularzu (LpCallback.astro); zmieniając treść, zmień datę. */
const CONSENT_VERSION = '2026-11-06';
/** Krócej niż tyle sekund od wczytania strony wypełnia tylko bot. */
const MIN_SECONDS = 3;
/** Limit zgłoszeń z jednego IP: [okno w sekundach, maksymalna liczba zgłoszeń]. */
const RATE_LIMITS = [[600, 3], [86400, 10]];

const MESSAGES = [
    'name' => 'Podaj imię.',
    'contact' => 'Podaj telefon albo e-mail, żebyśmy mogli się odezwać.',
    'phone' => 'Sprawdź numer telefonu (co najmniej 9 cyfr).',
    'email' => 'Sprawdź adres e-mail.',
    'consent' => 'Zaznacz zgodę na kontakt, bez niej nie możemy się odezwać.',
];

function wants_json(): bool
{
    return stripos((string) ($_SERVER['HTTP_ACCEPT'] ?? ''), 'application/json') !== false;
}

function h(string $text): string
{
    return htmlspecialchars($text, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

/** Odpowiedź i koniec skryptu: JSON dla fetch, strona HTML dla zwykłego wysłania formularza. */
function respond(int $status, array $data, string $lp = ''): void
{
    http_response_code($status);
    header('Cache-Control: no-store');
    header('X-Robots-Tag: noindex, nofollow');
    if ($status === 405) {
        header('Allow: POST');
    }
    if (wants_json()) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_UNESCAPED_UNICODE);
        exit;
    }
    $ok = !empty($data['ok']);
    $title = $ok ? 'Dziękujemy, odezwiemy się' : 'Nie udało się wysłać zgłoszenia';
    $text = $ok
        ? 'Oddzwonimy lub odpiszemy w godzinach pracy rejestracji.'
        : (string) ($data['message'] ?? 'Spróbuj ponownie.');
    $back = array_key_exists($lp, LANDINGS) ? '/lp/' . LANDINGS[$lp] : '/';
    header('Content-Type: text/html; charset=utf-8');
    echo '<!doctype html><html lang="pl"><head><meta charset="utf-8">'
        . '<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow">'
        . '<title>' . h($title) . ' | Vitadentica</title>'
        . '<style>body{margin:0;font:17px/1.6 system-ui,sans-serif;color:#1a1a2e;background:#f7f5f8}'
        . 'main{max-width:560px;margin:12vh auto;padding:32px 24px}h1{font-size:1.6rem;line-height:1.25}'
        . 'a{color:#8a0c24}</style></head><body><main>'
        . '<h1>' . h($title) . '</h1><p>' . h($text) . '</p>'
        . '<p>Rejestracja telefoniczna: <a href="tel:+48223702510">' . h(PHONE_DISPLAY) . '</a>, e-mail: '
        . '<a href="mailto:' . h(RECIPIENT) . '">' . h(RECIPIENT) . '</a></p>'
        . '<p><a href="' . h($back) . '">Wróć na stronę</a></p></main></body></html>';
    exit;
}

/** Jedna linia tekstu z formularza: bez znaków sterujących, pojedyncze spacje, przycięta do $max znaków. */
function clean_line($value, int $max): string
{
    if (!is_string($value) || !mb_check_encoding($value, 'UTF-8')) {
        return '';
    }
    $value = trim((string) preg_replace('/\s+/u', ' ', (string) preg_replace('/[\x00-\x1F\x7F]/u', ' ', $value)));
    return mb_substr($value, 0, $max);
}

function valid_phone(string $phone): bool
{
    $digits = strlen((string) preg_replace('/\D/', '', $phone));
    return preg_match('/^[0-9 +()\-]+$/', $phone) === 1 && $digits >= PHONE_MIN_DIGITS && $digits <= PHONE_MAX_DIGITS;
}

function host_of(string $url): string
{
    $host = parse_url($url, PHP_URL_HOST);
    return is_string($host) ? strtolower($host) : '';
}

/** Zgłoszenie musi przyjść z tej witryny (Origin, a gdy go brak: Referer). */
function same_site(): bool
{
    $own = strtolower((string) preg_replace('/:\d+$/', '', (string) ($_SERVER['HTTP_HOST'] ?? '')));
    $allowed = $own === '' ? SITE_HOSTS : array_merge(SITE_HOSTS, [$own]);
    $source = (string) ($_SERVER['HTTP_ORIGIN'] ?? '');
    if ($source === '' || $source === 'null') {
        $source = (string) ($_SERVER['HTTP_REFERER'] ?? '');
    }
    return $source !== '' && in_array(host_of($source), $allowed, true);
}

/** Licznik zgłoszeń z jednego IP. Gdy katalog tymczasowy nie jest zapisywalny, formularz działa bez limitu. */
function rate_limited(): bool
{
    $ip = (string) ($_SERVER['REMOTE_ADDR'] ?? '');
    if ($ip === '') {
        return false;
    }
    $file = rtrim(sys_get_temp_dir(), '/\\') . '/vd-callback-' . hash('sha256', 'vitadentica-callback|' . $ip) . '.json';
    $handle = @fopen($file, 'c+');
    if ($handle === false) {
        return false;
    }
    flock($handle, LOCK_EX);
    $now = time();
    $longest = max(array_column(RATE_LIMITS, 0));
    $stamps = json_decode((string) stream_get_contents($handle), true);
    $stamps = array_values(array_filter(is_array($stamps) ? $stamps : [], function ($t) use ($now, $longest) {
        return is_int($t) && $t > $now - $longest;
    }));
    $limited = false;
    foreach (RATE_LIMITS as [$window, $max]) {
        $recent = array_filter($stamps, function ($t) use ($now, $window) {
            return $t > $now - $window;
        });
        if (count($recent) >= $max) {
            $limited = true;
            break;
        }
    }
    if (!$limited) {
        $stamps[] = $now;
    }
    ftruncate($handle, 0);
    rewind($handle);
    fwrite($handle, (string) json_encode($stamps));
    flock($handle, LOCK_UN);
    fclose($handle);
    return $limited;
}

function mime_header(string $text): string
{
    return '=?UTF-8?B?' . base64_encode($text) . '?=';
}

// ── Żądanie ──────────────────────────────────────────────────────────────────────────────────────────────────────

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(405, ['ok' => false, 'error' => 'method', 'message' => 'Formularz wysyła się przyciskiem na stronie.']);
}

$lp = clean_line($_POST['lp'] ?? '', 20);
if (!array_key_exists($lp, LANDINGS)) {
    $lp = '';
}

if (!same_site()) {
    respond(403, ['ok' => false, 'error' => 'origin', 'message' => 'Zgłoszenie odrzucone. Zadzwoń: ' . PHONE_DISPLAY . '.'], $lp);
}

// Pułapki na boty (ukryte pole, zbyt szybkie wysłanie): udajemy sukces i niczego nie wysyłamy.
$honeypot = clean_line($_POST['website'] ?? '', 200);
$elapsed = $_POST['elapsed'] ?? '';
$tooFast = $elapsed !== '' && (!is_string($elapsed) || !ctype_digit($elapsed) || (int) $elapsed < MIN_SECONDS);
if ($honeypot !== '' || $tooFast) {
    respond(200, ['ok' => true], $lp);
}

$name = clean_line($_POST['name'] ?? '', 80);
$phone = clean_line($_POST['phone'] ?? '', 20);
$email = clean_line($_POST['email'] ?? '', 120);
$audience = clean_line($_POST['audience'] ?? '', 20);
if (!array_key_exists($audience, AUDIENCES)) {
    $audience = '';
}
$consent = ($_POST['consent'] ?? '') === '1';

$errors = [];
if ($name === '') {
    $errors[] = 'name';
}
if ($phone === '' && $email === '') {
    $errors[] = 'contact';
}
if ($phone !== '' && !valid_phone($phone)) {
    $errors[] = 'phone';
}
if ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
    $errors[] = 'email';
}
if (!$consent) {
    $errors[] = 'consent';
}
if ($errors) {
    $message = implode(' ', array_map(function ($field) {
        return MESSAGES[$field];
    }, $errors));
    respond(422, ['ok' => false, 'error' => 'invalid', 'fields' => $errors, 'message' => $message], $lp);
}

if (rate_limited()) {
    respond(429, [
        'ok' => false,
        'error' => 'limit',
        'message' => 'Z tego połączenia wysłano już kilka zgłoszeń. Zadzwoń: ' . PHONE_DISPLAY . '.',
    ], $lp);
}

// ── Wiadomość do gabinetu ────────────────────────────────────────────────────────────────────────────────────────

$topic = $lp !== '' ? LANDINGS[$lp] : 'konsultacja';
$about = $topic . ($audience !== '' ? ', ' . AUDIENCES[$audience] : '');
$when = (new DateTimeImmutable('now', new DateTimeZone('Europe/Warsaw')))->format('Y-m-d H:i');
$body = implode("\r\n", [
    'Nowa prośba o kontakt z formularza „Zostaw kontakt, oddzwonimy”.',
    '',
    'Imię: ' . $name,
    'Telefon: ' . ($phone !== '' ? $phone : '–'),
    'E-mail: ' . ($email !== '' ? $email : '–'),
    'Dotyczy: ' . $about,
    'Strona: https://vitadentica.pl' . ($lp !== '' ? '/lp/' . $lp : ''),
    'Wysłano: ' . $when . ' (czas warszawski)',
    '',
    'Zgoda na przetwarzanie danych w celu kontaktu: tak (treść z ' . CONSENT_VERSION . ').',
    'Dane służą tylko do kontaktu w sprawie konsultacji. Usuń tę wiadomość po zakończeniu sprawy, najpóźniej po 30 dniach.',
]);
$headers = [
    'From: ' . mime_header('Strona vitadentica.pl') . ' <' . RECIPIENT . '>',
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
];
if ($email !== '') {
    // Adres przeszedł FILTER_VALIDATE_EMAIL, więc nie zawiera znaków nowej linii (brak wstrzyknięcia nagłówków).
    $headers[] = 'Reply-To: ' . $email;
}

$sent = @mail(RECIPIENT, mime_header('Prośba o kontakt: ' . $about), $body, implode("\r\n", $headers), '-f' . RECIPIENT);
if (!$sent) {
    respond(500, [
        'ok' => false,
        'error' => 'send',
        'message' => 'Nie udało się wysłać zgłoszenia. Zadzwoń: ' . PHONE_DISPLAY . ' albo napisz: ' . RECIPIENT . '.',
    ], $lp);
}

respond(200, ['ok' => true], $lp);
