export const onRequest = async ({ request, params }) => {
    const apiUrl = 'https://zksend.com/api';
    const apiPath = params.path.join('/');
    const targetUrl = `${apiUrl}/${apiPath}`;

    const init: RequestInit = {
        method: request.method,
        headers: new Headers(request.headers),
    };

    if (request.method === 'POST') {
        init.body = await request.text();
    }

    const resp = await fetch(targetUrl, init);

    const newResp = new Response(resp.body, resp);
    newResp.headers.set('Access-Control-Allow-Origin', '*');
    newResp.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    newResp.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    newResp.headers.set('Access-Control-Max-Age', '3600');

    return newResp;
};
