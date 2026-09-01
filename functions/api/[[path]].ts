const WORKER = 'https://reda-virtual-gallery.tankerchu.workers.dev';

export async function onRequest(context: EventContext<unknown, string, unknown>) {
  const url = new URL(context.request.url);
  const target = `${WORKER}${url.pathname}${url.search}`;
  return fetch(target, {
    method: context.request.method,
    headers: context.request.headers,
    body: ['GET', 'HEAD'].includes(context.request.method) ? undefined : context.request.body,
    redirect: 'manual',
  });
}
