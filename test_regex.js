const URL_TLDS = new Set([
    'com', 'net', 'org', 'io', 'dev', 'app', 'co', 'me', 'tv', 'ai', 'xyz', 'tr', 'de', 'fr',
    'uk', 'us', 'ru', 'jp', 'cn', 'kr', 'br', 'in', 'edu', 'gov', 'info', 'biz', 'pro', 'tech',
    'online', 'store', 'site', 'cloud', 'gg', 'cc', 'im', 'to', 'ly', 'it', 'es', 'nl', 'be',
    'at', 'ch', 'pl', 'cz', 'se', 'no', 'fi', 'dk', 'pt', 'ro', 'hu', 'bg', 'hr', 'sk', 'lt',
    'lv', 'ee', 'is', 'ie', 'il', 'za', 'mx', 'ar', 'cl', 'pe', 've', 'ec', 'uy', 'bo', 'py',
    'cr', 'pa', 'do', 'gt', 'hn', 'sv', 'ni', 'cu', 'mil', 'museum', 'aero', 'coop', 'name',
    'cat', 'asia', 'tel', 'mobi', 'jobs', 'travel', 'academy', 'agency', 'blog', 'business',
    'cafe', 'center', 'city', 'click', 'club', 'company', 'cool', 'design', 'digital',
    'email', 'events', 'exchange', 'expert', 'farm', 'fun', 'gallery', 'games', 'global',
    'group', 'guide', 'guru', 'health', 'help', 'host', 'house', 'icu', 'land', 'life',
    'link', 'live', 'lol', 'market', 'media', 'money', 'network', 'news', 'one', 'page',
    'party', 'photos', 'plus', 'press', 'pub', 'red', 'review', 'run', 'sale', 'school',
    'services', 'shop', 'social', 'solutions', 'space', 'studio', 'style', 'support',
    'systems', 'team', 'today', 'top', 'tube', 'video', 'vip', 'wang', 'watch', 'website',
    'wiki', 'work', 'world', 'wtf', 'zone'
]);
const URL_COMPOUND_TLDS = new Set([
    'com.tr', 'co.uk', 'co.jp', 'com.br', 'com.au', 'co.kr', 'co.in',
    'com.mx', 'com.ar', 'org.tr', 'co.za', 'com.cn', 'co.nz', 'com.sg',
    'com.hk', 'com.tw', 'co.id', 'com.pk', 'com.eg', 'com.sa', 'com.ng',
    'com.co', 'com.pe', 'com.uy', 'com.ec', 'com.ve', 'com.bo', 'com.py',
    'com.gt', 'com.sv', 'com.hn', 'com.ni', 'com.do', 'com.pa', 'com.cr',
    'com.cu', 'org.uk', 'net.tr', 'gov.tr', 'edu.tr', 'org.au', 'net.au'
]);

function isUrlInput(query) {
    const trimmed = query.trim();
    if (!trimmed || trimmed.includes(' ')) return false;
    let domain = trimmed.replace(/^https?:\/\//i, '');
    domain = domain.replace(/^www\./i, '');
    domain = domain.split('/')[0];
    domain = domain.split(':')[0];
    if (!domain.includes('.')) return false;
    if (domain.startsWith('.') || domain.endsWith('.')) return false;
    if (!/^[a-zA-Z0-9.-]+$/.test(domain)) return false;
    const parts = domain.toLowerCase().split('.');
    if (parts.length >= 3) {
        const compoundTld = parts.slice(-2).join('.');
        if (URL_COMPOUND_TLDS.has(compoundTld)) return true;
    }
    const tld = parts[parts.length - 1];
    if (parts.length >= 2 && URL_TLDS.has(tld)) return true;
    return false;
}

const tests = [
    ['google.com', true],
    ['www.google.com', true],
    ['https://google.com', true],
    ['https://www.google.com', true],
    ['http://example.com', true],
    ['github.com/user/repo', true],
    ['google.com.tr', true],
    ['bbc.co.uk', true],
    ['dev.to', true],
    ['3.14', false],
    ['10 dolar', false],
    ['hello world', false],
    ['w: turkey', false],
    ['y: test', false],
    ['f: inception', false],
    ['100+200', false],
    ['test.qqqq', false],
    ['youtube.com', true],
    ['https://www.youtube.com/watch?v=abc', true],
];

let passed = 0; let failed = 0;
tests.forEach(([input, expected]) => {
    const result = isUrlInput(input);
    const status = result === expected ? 'PASS' : 'FAIL';
    if (status === 'FAIL') failed++;
    else passed++;
    console.log(`${status}: "${input}" => ${result} (expected: ${expected})`);
});
console.log(`\nResults: ${passed} passed, ${failed} failed`);
