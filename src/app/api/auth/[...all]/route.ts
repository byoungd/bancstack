import { nextJsHandler } from '@convex-dev/better-auth/nextjs';

// Wrap the default handler so we can capture useful debugging info in production.
const { GET: baseGET, POST: basePOST } = nextJsHandler();

const withLogging =
  (handler: (req: Request) => Promise<Response> | Response) =>
  async (req: Request) => {
    const url = new URL(req.url);
    const start = Date.now();
    const envSnapshot = {
      NEXT_PUBLIC_CONVEX_SITE_URL: process.env.NEXT_PUBLIC_CONVEX_SITE_URL ?? '<missing>',
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? '<missing>',
      SITE_URL: process.env.SITE_URL ?? '<missing>',
      BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? '<missing>',
      NODE_ENV: process.env.NODE_ENV,
    };

    console.log('[auth route] incoming', {
      method: req.method,
      pathname: url.pathname,
      search: url.search,
      host: req.headers.get('host'),
      origin: req.headers.get('origin'),
      referer: req.headers.get('referer'),
      userAgent: req.headers.get('user-agent'),
      provider: url.searchParams.get('provider'), // social provider name when present
      env: envSnapshot,
    });

    try {
      const res = await handler(req);
      const durationMs = Date.now() - start;
      const isError = res.status >= 400;
      const logBody =
        isError && res.body
          ? await res.clone().text().catch(() => '<unreadable>')
          : undefined;

      console.log('[auth route] response', {
        method: req.method,
        pathname: url.pathname,
        status: res.status,
        durationMs,
        body: logBody,
      });
      return res;
    } catch (error) {
      const durationMs = Date.now() - start;
      console.error('[auth route] error', {
        method: req.method,
        pathname: url.pathname,
        durationMs,
        error,
      });
      throw error;
    }
  };

export const GET = withLogging(baseGET);
export const POST = withLogging(basePOST);
