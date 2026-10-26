import { GET, POST, PUT } from './api';
export default {
 async fetch(request: Request, env: any): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname.startsWith('/api/')) {
   if (request.method === 'POST') return POST(request);
   if (request.method === 'PUT') return PUT(request);
   if (request.method === 'GET') return GET(request);
   return new Response('Method not allowed', {status: 405});
  }
  if (url.pathname === '/') return Response.redirect(url.origin + '/demo/index.html', 302);
  return env.ASSETS.fetch(request);
 }
};
