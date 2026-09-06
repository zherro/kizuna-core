import { getAuthHeaderFromCookies } from '../auth';
const PGRST = process.env.POSTGREST_URL || 'http://127.0.0.1:3000';
function shellEscape(value) {
    return `'${value.replace(/'/g, `'"'"'`)}'`;
}
function buildCurlCommand(url, method, headers, body) {
    const parts = ['curl', '-i', '-X', method, shellEscape(url)];
    headers.forEach((value, key) => {
        parts.push('-H', shellEscape(`${key}: ${value}`));
    });
    if (body) {
        parts.push('--data-raw', shellEscape(body));
    }
    return parts.join(' ');
}
function logCurl(url, method, headers, body) {
    if (process.env.DEBUG_HTTP !== '1')
        return;
    console.info('[postgrest.curl]', buildCurlCommand(url, method, headers, body));
}
function resolveAuthOverride(opts) {
    if (!opts)
        return { hasOverride: false, value: undefined };
    if (Object.prototype.hasOwnProperty.call(opts, 'auth')) {
        return { hasOverride: true, value: opts.auth };
    }
    return { hasOverride: false, value: undefined };
}
export async function buildPgHeaders(init, opts, prefer) {
    const { hasOverride, value } = resolveAuthOverride(opts);
    const auth = hasOverride ? value : await getAuthHeaderFromCookies();
    const headers = new Headers(init?.headers);
    const method = (init?.method || 'GET').toUpperCase();
    headers.set('Accept', 'application/json');
    headers.set('Content-Type', 'application/json');
    if (prefer)
        headers.set('Prefer', prefer);
    if ((method === 'POST' || method === 'PUT') && !headers.has('Prefer') && !prefer) {
        headers.set('Prefer', 'return=representation');
    }
    if (auth)
        headers.set('Authorization', auth);
    return headers;
}
export async function pgrstRpc(name, body, opts) {
    const { hasOverride, value } = resolveAuthOverride(opts);
    const auth = hasOverride ? value : await getAuthHeaderFromCookies();
    const url = `${PGRST}/rpc/${encodeURIComponent(name)}`;
    const payload = JSON.stringify(body ?? {});
    const headersData = {
        'Content-Type': 'application/json',
        ...(auth ? { Authorization: auth } : {}),
    };
    if (opts?.schema) {
        headersData['Accept-Profile'] = opts.schema;
        headersData['Content-Profile'] = opts.schema;
    }
    const headers = new Headers(headersData);
    logCurl(url, 'POST', headers, payload);
    return fetch(url, {
        method: 'POST',
        headers,
        body: payload,
        cache: 'no-store',
    });
}
export async function pgrstTable(path, init, opts) {
    const headers = await buildPgHeaders(init, opts);
    const url = `${PGRST}${path}`;
    const method = (init?.method || 'GET').toUpperCase();
    const body = typeof init?.body === 'string' ? init.body : undefined;
    logCurl(url, method, headers, body);
    return fetch(url, {
        ...(init || {}),
        headers,
        cache: 'no-store',
    });
}
//# sourceMappingURL=conn.js.map