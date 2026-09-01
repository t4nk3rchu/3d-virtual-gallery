const WORKER = 'https://reda-virtual-gallery.tankerchu.workers.dev';

export async function onRequest(context: EventContext<unknown, string, unknown>) {
  const req = context.request;
  const url = new URL(req.url);
  const target = `${WORKER}${url.pathname}${url.search}`;
  const headers = new Headers(req.headers);
  // Tell the Worker the public origin so OAuth redirect_uri stays on this domain.
  headers.set('X-Forwarded-Host', url.host);
  return fetch(target, {
    method: req.method,
    headers,
    body: ['GET', 'HEAD'].includes(req.method) ? undefined : req.body,
    redirect: 'manual',
  });
}
