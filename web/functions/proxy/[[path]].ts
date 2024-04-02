import { PagesFunction, RequestInit, /* Response, fetch */ } from '@cloudflare/workers-types';

// @ts-expect-error importing Response solves this, but then Cloudflare complains: No matching export for import "Response"
export const onRequest: PagesFunction = async ({ request, params }) => {
    const apiUrl = 'https://zksend.com/api';
    const apiPath = typeof params.path === 'string' ? params.path : params.path.join('/');
    const targetUrl = `${apiUrl}/${apiPath}`;

    const init: RequestInit = {
        method: request.method,
        headers: request.headers,
    };

    if (request.method === 'POST') {
        init.body = await request.text();
    }

    // @ts-expect-error importing fetch solves this, but then Cloudflare complains: No matching export for import "fetch"
    const resp = await fetch(targetUrl, init);

    const newResp = new Response(resp.body, resp);
    newResp.headers.set('Access-Control-Allow-Origin', '*');
    newResp.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    newResp.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    newResp.headers.set('Access-Control-Max-Age', '3600');

    return newResp;
};
