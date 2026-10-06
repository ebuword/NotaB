// ==========================================================================
// NotaB Launcher — Application Renderer Logic
// ==========================================================================

// ===== State =====
let activeIndex = -1;
let resultItems = [];
let debounceTimer = null;
let cachedRates = null;
let ratesFetchTime = 0;
let currentAbortController = null;
let toastTimer = null;
let iftarCountdownInterval = null;

// Result cache (LRU-style, max 20 entries)
const resultCache = new Map();
const CACHE_MAX = 20;

// DOM Elements
const searchInput = document.getElementById('searchInput');
const resultsContainer = document.getElementById('results');
const footer = document.getElementById('footer');
const quickShelf = document.getElementById('quickShelf');
const clearBtn = document.getElementById('clearBtn');
const modeBadge = document.getElementById('modeBadge');
const modeBadgeIcon = document.getElementById('modeBadgeIcon');
const modeBadgeText = document.getElementById('modeBadgeText');
const loadingLine = document.getElementById('loadingLine');
const toast = document.getElementById('toast');
const toastMsg = document.getElementById('toastMsg');

// ===== Patterns =====
const CURRENCY_PATTERN = /^(\d+(?:[.,]\d+)?)\s*(d|dolar|dollar|usd|\$|e|euro|eur|€|£|gbp|pound|sterlin)$/i;
const WIKI_PATTERN = /^w:\s*(.+)$/i;
const YOUTUBE_PATTERN = /^y:\s*(.+)$/i;
const MATH_PATTERN = /^[\d\s+\-*/().,%^²³√πexX×÷]+$|^.*(?:sin|cos|tan|log|ln|sqrt|abs|pow|ceil|floor|round|kök|üs|karekök|pi|mod)[\s(]/i;
const TMDB_PATTERN = /^f:\s*(.+)$/i;
const TMDB_API_KEY = '63fd1ed0aa746bf66c0513b79c7b2b8f';
const TMDB_IMG_BASE = 'https://image.tmdb.org/t/p/w185';
const IFTAR_PATTERN = /^(iftar|iftar vakti|iftara ne kadar kald[ıi]|sahur|sahur vakti|namaz|namaz vakti|namaz vakitleri)/i;

// URL Detection — supports domain.com, www.domain.com, http(s)://domain.com, with any TLD
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

// ===== Currency Mapping =====
const CURRENCY_MAP = {
    'd': 'usd', 'dolar': 'usd', 'dollar': 'usd', 'usd': 'usd', '$': 'usd',
    'e': 'eur', 'euro': 'eur', 'eur': 'eur', '€': 'eur',
    '£': 'gbp', 'gbp': 'gbp', 'pound': 'gbp', 'sterlin': 'gbp',
};

const CURRENCY_LABELS = {
    'usd': { name: 'ABD Doları', symbol: '$', icon: '$' },
    'eur': { name: 'Euro', symbol: '€', icon: '€' },
    'gbp': { name: 'İngiliz Sterlini', symbol: '£', icon: '£' },
};

// Pre-cache exchange rates on startup
(async function preCacheRates() {
    try {
        await getExchangeRate('usd', 'try');
        await getExchangeRate('eur', 'try');
        await getExchangeRate('gbp', 'try');
    } catch (e) {
        // Retry on demand
    }
})();

// ===== Abort Helper =====
function createAbortController() {
    if (currentAbortController) {
        currentAbortController.abort();
    }
    currentAbortController = new AbortController();
    return currentAbortController.signal;
}

// ===== Highlight Helper =====
function highlightMatch(text, query) {
    if (!query || query.length < 2) return text;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    return text.replace(regex, '<span class="highlight-match">$1</span>');
}

// ===== Toast Notification =====
function showToast(message) {
    if (!toast || !toastMsg) return;
    toastMsg.textContent = message;
    toast.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.classList.add('hidden');
    }, 1800);
}

// ===== Mode Badge Manager =====
function updateModeBadge(query) {
    if (!modeBadge) return;

    if (!query) {
        modeBadge.className = 'mode-badge hidden';
        return;
    }

    if (TMDB_PATTERN.test(query)) {
        modeBadge.className = 'mode-badge mode-tmdb';
        modeBadgeIcon.textContent = '🎬';
        modeBadgeText.textContent = 'Film';
    } else if (WIKI_PATTERN.test(query)) {
        modeBadge.className = 'mode-badge mode-wiki';
        modeBadgeIcon.textContent = '📖';
        modeBadgeText.textContent = 'Wiki';
    } else if (YOUTUBE_PATTERN.test(query)) {
        modeBadge.className = 'mode-badge mode-yt';
        modeBadgeIcon.textContent = '▶️';
        modeBadgeText.textContent = 'YouTube';
    } else if (CURRENCY_PATTERN.test(query)) {
        modeBadge.className = 'mode-badge mode-currency';
        modeBadgeIcon.textContent = '💱';
        modeBadgeText.textContent = 'Döviz';
    } else if (IFTAR_PATTERN.test(query)) {
        modeBadge.className = 'mode-badge mode-iftar';
        modeBadgeIcon.textContent = '🌙';
        modeBadgeText.textContent = 'Vakit';
    } else if (isUrlInput(query)) {
        modeBadge.className = 'mode-badge mode-url';
        modeBadgeIcon.textContent = '🌐';
        modeBadgeText.textContent = 'Web';
    } else if (tryEvaluateMath(query) !== null) {
        modeBadge.className = 'mode-badge mode-math';
        modeBadgeIcon.textContent = '🧮';
        modeBadgeText.textContent = 'Hesap';
    } else {
        modeBadge.className = 'mode-badge hidden';
    }
}

// ===== Clear Button =====
if (clearBtn) {
    clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        handleInput('');
        searchInput.focus();
    });
}

// ===== Event Listeners =====
searchInput.addEventListener('input', () => {
    const val = searchInput.value.trim();
    if (clearBtn) {
        clearBtn.classList.toggle('hidden', val.length === 0);
    }
    updateModeBadge(val);

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        handleInput(val);
    }, 180);
});

searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        e.preventDefault();
        if (searchInput.value.length > 0) {
            searchInput.value = '';
            handleInput('');
        } else {
            window.notab.hideWindow();
        }
        return;
    }

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        navigateResults(1);
        return;
    }

    if (e.key === 'ArrowUp') {
        e.preventDefault();
        navigateResults(-1);
        return;
    }

    if (e.key === 'Enter') {
        e.preventDefault();
        activateResult();
        return;
    }
});

// Window events from main process
window.notab.onWindowShown(() => {
    searchInput.value = '';
    searchInput.focus();
    hideResults();
    activeIndex = -1;
    resultItems = [];
});

window.notab.onWindowHidden(() => {
    searchInput.value = '';
    hideResults();
});

// ===== Input Handler =====
async function handleInput(query) {
    if (!query) {
        hideResults();
        return;
    }

    // Check result cache for instant results
    if (resultCache.has(query)) {
        const cached = resultCache.get(query);
        showResults(cached);
        return;
    }

    // Check URL pattern
    if (isUrlInput(query)) {
        await handleUrlPreview(query);
        return;
    }

    // Check currency pattern
    const currencyMatch = query.match(CURRENCY_PATTERN);
    if (currencyMatch) {
        const amount = parseFloat(currencyMatch[1].replace(',', '.'));
        const currKey = currencyMatch[2].toLowerCase();
        const currency = CURRENCY_MAP[currKey];
        if (currency) {
            await handleCurrency(amount, currency);
            return;
        }
    }

    // Check wiki pattern
    const wikiMatch = query.match(WIKI_PATTERN);
    if (wikiMatch) {
        await handleWikiSearch(wikiMatch[1].trim());
        return;
    }

    // Check youtube pattern
    const ytMatch = query.match(YOUTUBE_PATTERN);
    if (ytMatch) {
        handleYouTubeSearch(ytMatch[1].trim());
        return;
    }

    // Check TMDB pattern
    const tmdbMatch = query.match(TMDB_PATTERN);
    if (tmdbMatch) {
        await handleTMDBSearch(tmdbMatch[1].trim());
        return;
    }

    // Check Iftar pattern
    if (IFTAR_PATTERN.test(query)) {
        handleIftar(query);
        return;
    }

    // Check math expression
    const mathResult = tryEvaluateMath(query);
    if (mathResult !== null) {
        handleMath(query, mathResult);
        return;
    }

    // General search
    await handleGeneralSearch(query);
}

// ===== Currency Conversion =====
async function handleCurrency(amount, currency) {
    showLoading();
    const signal = createAbortController();

    try {
        const rate = await getExchangeRate(currency, 'try', signal);
        if (signal.aborted) return;

        const converted = amount * rate;
        const info = CURRENCY_LABELS[currency];
        const formattedConverted = formatNumber(converted);

        const html = `
            <div class="currency-card result-card" data-selectable data-copy="${formattedConverted} ₺" data-url="">
                <div class="currency-icon-badge ${currency}">
                    <span class="currency-glyph">${info.icon}</span>
                </div>
                <div class="currency-body">
                    <div class="currency-value-row">
                        <span class="currency-value">${formattedConverted}</span>
                        <span class="currency-symbol">₺</span>
                    </div>
                    <div class="currency-meta">
                        <span class="live-dot"></span>
                        <span class="currency-desc">${formatNumber(amount)} ${info.symbol} ${info.name} → Türk Lirası</span>
                    </div>
                </div>
                <div class="currency-side">
                    <div class="currency-rate-pill">
                        1 ${info.symbol} = ${rate.toFixed(4)} ₺
                    </div>
                    <div class="card-actions">
                        <button class="action-btn copy-btn" title="Kopyala" data-copy="${formattedConverted} ₺">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                            <span>Kopyala</span>
                        </button>
                        <span class="action-hint"><kbd>↵</kbd> Kopyala</span>
                    </div>
                </div>
            </div>
        `;

        showResults(html);
    } catch (err) {
        if (err.name === 'AbortError') return;
        showError('Döviz kuru alınamadı. İnternet bağlantınızı kontrol edin.');
    }
}

async function getExchangeRate(from, to, signal) {
    const pair = `${from.toUpperCase()}${to.toUpperCase()}`;
    const now = Date.now();

    if (cachedRates && cachedRates[pair] && (now - cachedRates[pair].time) < 60000) {
        return cachedRates[pair].rate;
    }

    const fetchOptions = signal ? { signal } : {};

    try {
        const resp = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${pair}=X`, fetchOptions);
        if (resp.ok) {
            const data = await resp.json();
            const rate = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
            if (rate) {
                if (!cachedRates) cachedRates = {};
                cachedRates[pair] = { rate, time: now };
                return rate;
            }
        }
    } catch (e) {
        if (e.name === 'AbortError') throw e;
    }

    const resp = await fetch(`https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${from}.json`, fetchOptions);
    const data = await resp.json();
    const rate = data[from][to];

    if (!cachedRates) cachedRates = {};
    cachedRates[pair] = { rate, time: now };
    return rate;
}

function formatNumber(num) {
    return num.toLocaleString('tr-TR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

// ===== Math Evaluation =====
function tryEvaluateMath(query) {
    if (!MATH_PATTERN.test(query)) return null;
    if (!/\d/.test(query)) return null;
    if (/^\d+([.,]\d+)?$/.test(query.trim())) return null;

    try {
        let expr = query
            .replace(/,/g, '.')
            .replace(/×/g, '*')
            .replace(/÷/g, '/')
            .replace(/(\d)\s*[xX]\s*(\d)/g, '$1*$2')
            .replace(/\^/g, '**')
            .replace(/²/g, '**2')
            .replace(/³/g, '**3')
            .replace(/√(\d+)/g, 'Math.sqrt($1)')
            .replace(/π/g, 'Math.PI')
            .replace(/\bpi\b/gi, 'Math.PI')
            .replace(/\be\b/g, 'Math.E')
            .replace(/\bsqrt\s*\(/gi, 'Math.sqrt(')
            .replace(/\bkarekök\s*\(/gi, 'Math.sqrt(')
            .replace(/\bkök\s*\(/gi, 'Math.sqrt(')
            .replace(/\bsin\s*\(/gi, 'Math.sin(')
            .replace(/\bcos\s*\(/gi, 'Math.cos(')
            .replace(/\btan\s*\(/gi, 'Math.tan(')
            .replace(/\blog\s*\(/gi, 'Math.log10(')
            .replace(/\bln\s*\(/gi, 'Math.log(')
            .replace(/\babs\s*\(/gi, 'Math.abs(')
            .replace(/\bpow\s*\(/gi, 'Math.pow(')
            .replace(/\büs\s*\(/gi, 'Math.pow(')
            .replace(/\bceil\s*\(/gi, 'Math.ceil(')
            .replace(/\bfloor\s*\(/gi, 'Math.floor(')
            .replace(/\bround\s*\(/gi, 'Math.round(')
            .replace(/%/g, '/100*')
            .replace(/mod/gi, '%');

        if (/[a-zA-Z]/.test(expr.replace(/Math\.(sqrt|sin|cos|tan|log10|log|abs|pow|ceil|floor|round|PI|E)/g, ''))) {
            return null;
        }

        const result = new Function(`"use strict"; return (${expr});`)();
        if (typeof result !== 'number' || !isFinite(result)) return null;

        return result;
    } catch (e) {
        return null;
    }
}

function handleMath(expression, result) {
    const formatted = Number.isInteger(result)
        ? result.toLocaleString('tr-TR')
        : result.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 8 });

    const html = `
        <div class="math-card result-card" data-selectable data-copy="${formatted}" data-url="">
            <div class="math-icon-badge">
                <span>=</span>
            </div>
            <div class="math-body">
                <div class="math-answer">${formatted}</div>
                <div class="math-expr-row">
                    <span class="math-expr-prefix">İşlem:</span>
                    <span class="math-expression">${expression}</span>
                </div>
            </div>
            <div class="math-side">
                <button class="action-btn copy-btn" title="Kopyala" data-copy="${formatted}">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    <span>Kopyala</span>
                </button>
                <span class="action-hint"><kbd>↵</kbd> Kopyala</span>
            </div>
        </div>
    `;

    showResults(html);
}

// ===== URL Preview =====
async function handleUrlPreview(input) {
    showLoading();
    const signal = createAbortController();

    let url = input.trim();
    if (!/^https?:\/\//i.test(url)) {
        url = 'https://' + url;
    }

    try {
        const meta = await window.notab.fetchUrlMeta(url);
        if (signal.aborted) return;

        const displayDomain = meta.domain.replace(/^www\./, '');
        const truncDesc = meta.description
            ? (meta.description.length > 160 ? meta.description.substring(0, 160) + '…' : meta.description)
            : '';

        const ogImageHtml = meta.image
            ? `<img class="url-preview-og" src="${meta.image}" alt="" onerror="this.style.display='none'" />`
            : '';

        const faviconHtml = meta.favicon
            ? `<img class="url-preview-favicon" src="${meta.favicon}" alt="" onerror="this.parentElement.innerHTML='<svg width=\'18\' height=\'18\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'><circle cx=\'12\' cy=\'12\' r=\'10\'></circle><line x1=\'2\' y1=\'12\' x2=\'22\' y2=\'12\'></line><path d=\'M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z\'></path></svg>'" />`
            : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`;

        const html = `
            <div class="url-preview-card ${meta.image ? 'has-og' : ''}" data-selectable data-url="${url}">
                ${ogImageHtml}
                <div class="url-preview-body">
                    <div class="url-preview-header">
                        <div class="url-favicon-wrap">${faviconHtml}</div>
                        <div class="url-domain">${displayDomain}</div>
                        <span class="result-tag tag-url">${meta.success ? 'Önizleme' : 'Bağlantı'}</span>
                    </div>
                    <div class="url-title">${meta.title}</div>
                    ${truncDesc ? `<div class="url-desc">${truncDesc}</div>` : ''}
                    <div class="url-address">${url}</div>
                </div>
                <div class="result-actions" style="padding: 0 16px 12px; justify-content: flex-end;">
                    <span class="action-hint"><kbd>↵</kbd> Tarayıcıda Aç</span>
                </div>
            </div>
            <div class="result-item search-action-item" data-selectable data-url="https://www.google.com/search?q=${encodeURIComponent(input)}">
                <div class="action-icon-wrap icon-google">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z"/></svg>
                </div>
                <div class="result-content">
                    <div class="result-title">Google'da "${input}" ara</div>
                    <div class="result-subtitle">google.com — web araması</div>
                </div>
                <div class="result-actions">
                    <span class="result-tag tag-google">Google</span>
                    <span class="action-hint"><kbd>↵</kbd> Ara</span>
                </div>
            </div>
        `;

        cacheResult(input, html);
        showResults(html);
        activeIndex = 0;
        updateActiveState();
    } catch (err) {
        if (err.name === 'AbortError') return;
        const html = `
            <div class="result-item active" data-selectable data-url="${url}">
                <div class="action-icon-wrap" style="background: rgba(99,102,241,0.15); color: var(--accent-light);">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                </div>
                <div class="result-content">
                    <div class="result-title">${url} sayfasına git</div>
                    <div class="result-subtitle">Varsayılan tarayıcıda aç</div>
                </div>
                <div class="result-actions">
                    <span class="result-tag tag-url">Web</span>
                    <span class="action-hint"><kbd>↵</kbd> Aç</span>
                </div>
            </div>
        `;
        showResults(html);
        activeIndex = 0;
        updateActiveState();
    }
}

// ===== Wikipedia Search =====
async function handleWikiSearch(query) {
    showLoading();
    const signal = createAbortController();

    try {
        const searchResp = await fetch(
            `https://tr.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json&srlimit=5&origin=*`,
            { signal }
        );
        const searchData = await searchResp.json();
        const results = searchData.query?.search || [];

        if (results.length === 0) {
            showError(`"${query}" için Wikipedia sonucu bulunamadı.`);
            return;
        }

        const topTitle = results[0].title;
        let summaryHtml = '';

        try {
            const summResp = await fetch(
                `https://tr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topTitle)}`,
                { signal }
            );
            const summData = await summResp.json();

            const thumb = summData.thumbnail
                ? `<div class="wiki-thumb-wrap"><img class="wiki-thumb" src="${summData.thumbnail.source}" alt="" /></div>`
                : '';

            summaryHtml = `
                <div class="wiki-card result-card" data-selectable data-url="${summData.content_urls?.desktop?.page || ''}">
                    ${thumb}
                    <div class="wiki-body">
                        <div class="wiki-title-row">
                            <span class="wiki-title">${summData.title}</span>
                            <span class="result-tag tag-wiki">Wikipedia</span>
                        </div>
                        <div class="wiki-extract">${summData.extract || ''}</div>
                    </div>
                    <div class="result-actions">
                        <span class="action-hint"><kbd>↵</kbd> Oku</span>
                    </div>
                </div>
            `;
        } catch (e) {
            if (e.name === 'AbortError') return;
        }

        const listHtml = results.slice(summaryHtml ? 1 : 0).map(r => {
            const snippet = r.snippet.replace(/<[^>]+>/g, '');
            const url = `https://tr.wikipedia.org/wiki/${encodeURIComponent(r.title)}`;
            return `
                <div class="result-item" data-selectable data-url="${url}">
                    <div class="action-icon-wrap icon-wiki">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 4 16 20 12 10 8 20 2 4"></polyline></svg>
                    </div>
                    <div class="result-content">
                        <div class="result-title">${highlightMatch(r.title, query)}</div>
                        <div class="result-subtitle">${snippet}</div>
                    </div>
                    <div class="result-actions">
                        <span class="result-tag tag-wiki">Wiki</span>
                        <span class="action-hint"><kbd>↵</kbd> Aç</span>
                    </div>
                </div>
            `;
        }).join('');

        if (signal.aborted) return;
        const finalHtml = summaryHtml + listHtml;
        cacheResult(query, finalHtml);
        showResults(finalHtml);
    } catch (err) {
        if (err.name === 'AbortError') return;
        showError('Wikipedia araması başarısız oldu.');
    }
}

// ===== YouTube Search =====
function handleYouTubeSearch(query) {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;

    const html = `
        <div class="result-item active" data-selectable data-url="${url}">
            <div class="action-icon-wrap icon-youtube">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/><path d="m10 15 5-3-5-3z"/></svg>
            </div>
            <div class="result-content">
                <div class="result-title">YouTube'da "${query}" ara</div>
                <div class="result-subtitle">Tarayıcıda açılacak</div>
            </div>
            <div class="result-actions">
                <span class="result-tag tag-yt">YouTube</span>
                <span class="action-hint"><kbd>↵</kbd> İzle</span>
            </div>
        </div>
    `;

    showResults(html);
    activeIndex = 0;
    updateActiveState();
}

// ===== Iftar / Prayer Times =====
async function handleIftar(query) {
    showLoading();
    const signal = createAbortController();

    if (iftarCountdownInterval) {
        clearInterval(iftarCountdownInterval);
        iftarCountdownInterval = null;
    }

    try {
        let city = "Istanbul";
        let country = "Turkey";
        try {
            const ipRes = await fetch("https://get.geojs.io/v1/ip/geo.json", { signal });
            if (ipRes.ok) {
                const ipData = await ipRes.json();
                if (ipData.city && ipData.country) {
                    city = ipData.city;
                    country = ipData.country;
                }
            }
        } catch (e) {
            // Default to Istanbul
        }

        const url = `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=13`;
        const res = await fetch(url, { signal });
        const data = await res.json();

        if (!data || !data.data || !data.data.timings) throw new Error("API Error");

        const timings = data.data.timings;
        const imsakTimeStr = timings.Fajr;
        const gunesTimeStr = timings.Sunrise;
        const ogleTimeStr = timings.Dhuhr;
        const ikindiTimeStr = timings.Asr;
        const aksamTimeStr = timings.Maghrib;
        const yatsiTimeStr = timings.Isha;

        const now = new Date();

        const getPrayerDate = (timeStr) => {
            const [hours, minutes] = timeStr.split(':').map(Number);
            const d = new Date();
            d.setHours(hours, minutes, 0, 0);
            return d;
        };

        const timesObj = [
            { name: "İmsak", date: getPrayerDate(imsakTimeStr), str: imsakTimeStr },
            { name: "Güneş", date: getPrayerDate(gunesTimeStr), str: gunesTimeStr },
            { name: "Öğle", date: getPrayerDate(ogleTimeStr), str: ogleTimeStr },
            { name: "İkindi", date: getPrayerDate(ikindiTimeStr), str: ikindiTimeStr },
            { name: "Akşam", date: getPrayerDate(aksamTimeStr), str: aksamTimeStr },
            { name: "Yatsı", date: getPrayerDate(yatsiTimeStr), str: yatsiTimeStr }
        ];

        let targetName = "";
        let targetDate = null;
        let activeIndexRow = -1;

        const isNamazQuery = query.toLowerCase().includes("namaz");

        if (isNamazQuery) {
            let found = false;
            for (let i = 0; i < timesObj.length; i++) {
                if (now < timesObj[i].date) {
                    targetName = timesObj[i].name;
                    targetDate = timesObj[i].date;
                    activeIndexRow = i;
                    found = true;
                    break;
                }
            }
            if (!found) {
                targetName = "İmsak";
                targetDate = new Date(timesObj[0].date);
                targetDate.setDate(targetDate.getDate() + 1);
                activeIndexRow = 0;
            }
        } else {
            const imsakDate = timesObj[0].date;
            const aksamDate = timesObj[4].date;

            if (now < imsakDate) {
                targetName = "Sahur";
                targetDate = imsakDate;
                activeIndexRow = 0;
            } else if (now < aksamDate) {
                targetName = "İftar";
                targetDate = aksamDate;
                activeIndexRow = 4;
            } else {
                targetName = "Sahur";
                targetDate = new Date(imsakDate);
                targetDate.setDate(targetDate.getDate() + 1);
                activeIndexRow = 0;
            }
        }

        const renderHtml = () => {
            return `
            <div class="iftar-item-wrapper active" data-selectable>
                <div class="iftar-widget">
                    <div class="iftar-header">
                        <div class="iftar-location">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                            <span>${city}, ${country}</span>
                        </div>
                        <div class="iftar-badge">
                            <span>🌙</span>
                            <span>Diyanet Vakitleri</span>
                        </div>
                    </div>

                    <div class="iftar-hero">
                        <div class="iftar-target-title">
                            <span>${targetName}</span> vaktine kalan süre
                        </div>
                        <div class="iftar-countdown-grid" id="iftarCountdownBox">
                            <div class="countdown-card">
                                <div class="countdown-num" id="iftarHour">00</div>
                                <div class="countdown-unit">SAAT</div>
                            </div>
                            <span class="countdown-sep">:</span>
                            <div class="countdown-card">
                                <div class="countdown-num" id="iftarMin">00</div>
                                <div class="countdown-unit">DAKİKA</div>
                            </div>
                            <span class="countdown-sep">:</span>
                            <div class="countdown-card">
                                <div class="countdown-num" id="iftarSec">00</div>
                                <div class="countdown-unit">SANİYE</div>
                            </div>
                        </div>
                    </div>

                    <div class="prayer-timeline">
                        <div class="timeline-slot ${activeIndexRow === 0 ? 'active' : ''}">
                            <span class="slot-name">İmsak</span>
                            <span class="slot-time">${imsakTimeStr}</span>
                        </div>
                        <div class="timeline-slot ${activeIndexRow === 1 ? 'active' : ''}">
                            <span class="slot-name">Güneş</span>
                            <span class="slot-time">${gunesTimeStr}</span>
                        </div>
                        <div class="timeline-slot ${activeIndexRow === 2 ? 'active' : ''}">
                            <span class="slot-name">Öğle</span>
                            <span class="slot-time">${ogleTimeStr}</span>
                        </div>
                        <div class="timeline-slot ${activeIndexRow === 3 ? 'active' : ''}">
                            <span class="slot-name">İkindi</span>
                            <span class="slot-time">${ikindiTimeStr}</span>
                        </div>
                        <div class="timeline-slot ${activeIndexRow === 4 ? 'active' : ''}">
                            <span class="slot-name">Akşam</span>
                            <span class="slot-time">${aksamTimeStr}</span>
                        </div>
                        <div class="timeline-slot ${activeIndexRow === 5 ? 'active' : ''}">
                            <span class="slot-name">Yatsı</span>
                            <span class="slot-time">${yatsiTimeStr}</span>
                        </div>
                    </div>
                </div>
            </div>
            `;
        };

        showResults(renderHtml());

        const updateCountdown = () => {
            const hEl = document.getElementById('iftarHour');
            const mEl = document.getElementById('iftarMin');
            const sEl = document.getElementById('iftarSec');

            if (!hEl || !mEl || !sEl) return;

            const currentTime = new Date();
            let diffMs = targetDate - currentTime;

            if (diffMs <= 0) {
                clearInterval(iftarCountdownInterval);
                handleIftar(query);
                return;
            }

            const h = Math.floor(diffMs / (1000 * 60 * 60));
            diffMs -= h * (1000 * 60 * 60);
            const m = Math.floor(diffMs / (1000 * 60));
            diffMs -= m * (1000 * 60);
            const s = Math.floor(diffMs / 1000);

            hEl.innerText = h.toString().padStart(2, '0');
            mEl.innerText = m.toString().padStart(2, '0');
            sEl.innerText = s.toString().padStart(2, '0');
        };

        updateCountdown();
        iftarCountdownInterval = setInterval(updateCountdown, 1000);

        activeIndex = 0;
        updateActiveState();
    } catch (err) {
        if (err.name === 'AbortError') return;
        showError('Vakitler alınamadı. İnternet bağlantınızı kontrol edin.');
    }
}

// ===== TMDB Search =====
async function handleTMDBSearch(query) {
    showLoading();
    const signal = createAbortController();

    try {
        const url = `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&language=tr-TR&query=${encodeURIComponent(query)}&page=1`;
        const res = await fetch(url, { signal });
        const data = await res.json();

        const results = (data.results || [])
            .filter(r => r.media_type === 'movie' || r.media_type === 'tv')
            .slice(0, 5);

        if (results.length === 0) {
            showResults(`
                <div class="result-item">
                    <div class="action-icon-wrap" style="background: rgba(245, 158, 11, 0.15); color: #fbbf24;">🎬</div>
                    <div class="result-content">
                        <div class="result-title">"${query}" için sonuç bulunamadı</div>
                        <div class="result-subtitle">Farklı bir arama terimi dene</div>
                    </div>
                </div>
            `);
            return;
        }

        let html = '';
        results.forEach((item, i) => {
            const isMovie = item.media_type === 'movie';
            const title = isMovie ? item.title : item.name;
            const date = isMovie ? item.release_date : item.first_air_date;
            const year = date ? date.substring(0, 4) : '';
            const rating = item.vote_average ? item.vote_average.toFixed(1) : '—';
            const overview = item.overview
                ? (item.overview.length > 120 ? item.overview.substring(0, 120) + '…' : item.overview)
                : 'Açıklama bulunmuyor.';
            const poster = item.poster_path
                ? `${TMDB_IMG_BASE}${item.poster_path}`
                : '';
            const tmdbUrl = isMovie
                ? `https://www.themoviedb.org/movie/${item.id}`
                : `https://www.themoviedb.org/tv/${item.id}`;
            const tag = isMovie ? 'Film' : 'Dizi';
            const tagClass = isMovie ? 'tmdb-film-tag' : 'tmdb-dizi-tag';

            html += `
                <div class="result-item tmdb-card ${i === 0 ? 'active' : ''}" data-selectable data-url="${tmdbUrl}">
                    <div class="tmdb-poster-wrap">
                        ${poster ? `<img src="${poster}" alt="${title}" class="tmdb-poster-img" />` : `<div class="tmdb-poster-placeholder">🎬</div>`}
                    </div>
                    <div class="result-content">
                        <div class="tmdb-header-row">
                            <span class="result-title">${highlightMatch(title, query)}</span>
                            ${year ? `<span class="tmdb-year-badge">${year}</span>` : ''}
                            <span class="tmdb-rating-badge">★ ${rating}</span>
                        </div>
                        <div class="tmdb-overview">${overview}</div>
                    </div>
                    <div class="result-actions">
                        <span class="result-tag ${tagClass}">${tag}</span>
                        <span class="action-hint"><kbd>↵</kbd> İncele</span>
                    </div>
                </div>
            `;
        });

        if (signal.aborted) return;
        cacheResult(`f: ${query}`, html);
        showResults(html);
        activeIndex = 0;
        updateActiveState();
    } catch (err) {
        if (err.name === 'AbortError') return;
        showError('TMDB film araması başarısız oldu.');
    }
}

// ===== General Search =====
async function handleGeneralSearch(query) {
    showLoading();
    const signal = createAbortController();

    const [appsResult, wikiResult] = await Promise.allSettled([
        (async () => {
            const apps = await window.notab.searchApps(query);
            if (!apps || apps.length === 0) return '';

            return apps.map((app) => `
                <div class="result-item app-item" data-selectable data-action="app" data-url="${app.path}">
                    <div class="app-icon-wrap">
                        ${app.icon ? `<img src="${app.icon}" class="app-icon-img" alt="${app.name}" />` : `<div class="app-icon-fallback"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg></div>`}
                    </div>
                    <div class="result-content">
                        <div class="result-title">${highlightMatch(app.name, query)}</div>
                        <div class="result-subtitle">Masaüstü Uygulaması</div>
                    </div>
                    <div class="result-actions">
                        <span class="result-tag tag-app">Uygulama</span>
                        <span class="action-hint"><kbd>↵</kbd> Başlat</span>
                    </div>
                </div>
            `).join('');
        })(),

        (async () => {
            try {
                const summResp = await fetch(
                    `https://tr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`,
                    { signal }
                );
                if (!summResp.ok) return '';

                const summData = await summResp.json();
                if (summData.type === 'disambiguation' || !summData.extract) return '';

                const thumb = summData.thumbnail
                    ? `<div class="wiki-thumb-wrap"><img class="wiki-thumb" src="${summData.thumbnail.source}" alt="" /></div>`
                    : '';

                return `
                    <div class="wiki-card result-card" data-selectable data-url="${summData.content_urls?.desktop?.page || ''}">
                        ${thumb}
                        <div class="wiki-body">
                            <div class="wiki-title-row">
                                <span class="wiki-title">${summData.title}</span>
                                <span class="result-tag tag-wiki">Wikipedia</span>
                            </div>
                            <div class="wiki-extract">${summData.extract}</div>
                        </div>
                        <div class="result-actions">
                            <span class="action-hint"><kbd>↵</kbd> Oku</span>
                        </div>
                    </div>
                `;
            } catch (e) {
                if (e.name === 'AbortError') throw e;
                return '';
            }
        })()
    ]);

    if (signal.aborted) return;

    const appsHtml = appsResult.status === 'fulfilled' ? appsResult.value : '';
    const wikiHtml = wikiResult.status === 'fulfilled' ? wikiResult.value : '';

    const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const wikiSearchUrl = `https://tr.wikipedia.org/w/index.php?search=${encodeURIComponent(query)}`;

    const searchLinksHtml = `
        <div class="result-item search-action-item" data-selectable data-url="${googleUrl}">
            <div class="action-icon-wrap icon-google">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z"/></svg>
            </div>
            <div class="result-content">
                <div class="result-title">Google'da "<strong>${highlightMatch(query, query)}</strong>" ara</div>
                <div class="result-subtitle">google.com — web araması</div>
            </div>
            <div class="result-actions">
                <span class="result-tag tag-google">Google</span>
                <span class="action-hint"><kbd>↵</kbd> Ara</span>
            </div>
        </div>
        <div class="result-item search-action-item" data-selectable data-url="${ytUrl}">
            <div class="action-icon-wrap icon-youtube">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/><path d="m10 15 5-3-5-3z"/></svg>
            </div>
            <div class="result-content">
                <div class="result-title">YouTube'da "<strong>${highlightMatch(query, query)}</strong>" ara</div>
                <div class="result-subtitle">youtube.com — video araması</div>
            </div>
            <div class="result-actions">
                <span class="result-tag tag-yt">YouTube</span>
                <span class="action-hint"><kbd>↵</kbd> İzle</span>
            </div>
        </div>
        <div class="result-item search-action-item" data-selectable data-action="web" data-url="${wikiSearchUrl}">
            <div class="action-icon-wrap icon-wiki">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 4 16 20 12 10 8 20 2 4"></polyline></svg>
            </div>
            <div class="result-content">
                <div class="result-title">Wikipedia'da "<strong>${highlightMatch(query, query)}</strong>" ara</div>
                <div class="result-subtitle">tr.wikipedia.org — ansiklopedi</div>
            </div>
            <div class="result-actions">
                <span class="result-tag tag-wiki">Wiki</span>
                <span class="action-hint"><kbd>↵</kbd> Oku</span>
            </div>
        </div>
    `;

    const finalHtml = appsHtml + wikiHtml + searchLinksHtml;
    cacheResult(query, finalHtml);
    showResults(finalHtml);
}

// ===== Cache Helpers =====
function cacheResult(query, html) {
    if (resultCache.size >= CACHE_MAX) {
        const firstKey = resultCache.keys().next().value;
        resultCache.delete(firstKey);
    }
    resultCache.set(query, html);
}

// ===== UI Helpers =====
function showLoading() {
    if (loadingLine) loadingLine.classList.remove('hidden');
    resultsContainer.innerHTML = `
        <div class="loading-box">
            <div class="loading-dots">
                <span></span><span></span><span></span>
            </div>
            <div class="loading-text">Sonuçlar aranıyor...</div>
        </div>
    `;
    resultsContainer.classList.remove('hidden');
    if (footer) footer.classList.add('hidden');
    activeIndex = -1;
    resultItems = [];
}

function showResults(html) {
    if (loadingLine) loadingLine.classList.add('hidden');
    resultsContainer.innerHTML = html;
    resultsContainer.classList.remove('hidden');
    if (footer) footer.classList.remove('hidden');

    resultItems = Array.from(resultsContainer.querySelectorAll('[data-selectable]'));
    activeIndex = resultItems.length > 0 ? 0 : -1;
    updateActiveState();

    // Staggered animation
    resultItems.forEach((item, index) => {
        item.style.animationDelay = `${index * 0.035}s`;
        item.classList.add('result-enter');
    });

    // Item click & hover handlers
    resultItems.forEach((item, index) => {
        item.addEventListener('click', () => {
            activeIndex = index;
            activateResult();
        });

        item.addEventListener('mouseenter', () => {
            activeIndex = index;
            updateActiveState();
        });
    });

    // Copy button handlers
    const copyBtns = resultsContainer.querySelectorAll('.copy-btn');
    copyBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const text = btn.getAttribute('data-copy');
            if (text) {
                window.notab.copyToClipboard(text);
                showToast(`Kopyalandı: ${text}`);

                btn.classList.add('copied');
                setTimeout(() => btn.classList.remove('copied'), 1200);
            }
        });
    });
}

function showError(message) {
    if (loadingLine) loadingLine.classList.add('hidden');
    resultsContainer.innerHTML = `
        <div class="error-card">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>${message}</span>
        </div>
    `;
    resultsContainer.classList.remove('hidden');
    if (footer) footer.classList.add('hidden');
    activeIndex = -1;
    resultItems = [];
}

function hideResults() {
    resultsContainer.classList.add('hidden');
    resultsContainer.innerHTML = '';
    if (footer) footer.classList.add('hidden');
    if (loadingLine) loadingLine.classList.add('hidden');
    if (modeBadge) modeBadge.className = 'mode-badge hidden';
    if (clearBtn) clearBtn.classList.add('hidden');
    activeIndex = -1;
    resultItems = [];
}

function navigateResults(direction) {
    if (resultItems.length === 0) return;
    activeIndex = (activeIndex + direction + resultItems.length) % resultItems.length;
    updateActiveState();

    const activeEl = resultItems[activeIndex];
    if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
}

function updateActiveState() {
    resultItems.forEach((item, index) => {
        item.classList.toggle('active', index === activeIndex);
    });
}

function activateResult() {
    if (activeIndex < 0 || activeIndex >= resultItems.length) return;

    const item = resultItems[activeIndex];
    const url = item.getAttribute('data-url');
    const action = item.getAttribute('data-action');
    const copyText = item.getAttribute('data-copy');

    if (action === 'app' && url) {
        window.notab.openApp(url);
    } else if (copyText && (!url || url === '')) {
        window.notab.copyToClipboard(copyText);
        showToast(`Kopyalandı: ${copyText}`);
        setTimeout(() => {
            window.notab.hideWindow();
        }, 350);
    } else if (url) {
        window.notab.openExternal(url);
    }
}
