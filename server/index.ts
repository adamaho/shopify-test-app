import 'isomorphic-fetch';

import Koa from 'koa';
import Router from 'koa-router';
import session from 'koa-session';
import shopifyAuth, {verifyRequest} from '@shopify/koa-shopify-auth';
import next from 'next'

const port = parseInt(process.env.PORT || '3000', 10)
const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })

const {SHOPIFY_API_KEY, SHOPIFY_SECRET} = process.env;

app.prepare().then(() => {
  const server = new Koa();
  const clientRouter = new Router();
  const privateRouter = new Router();

  clientRouter.get('/auction', async (ctx: any) => {
    ctx.set('Content-Type', 'application/liquid');
    await app.render(ctx.req, ctx.res, '/auction', ctx.query)
    ctx.respond = false
  })

  privateRouter.get('/auction-data', async (ctx: any) => {
    ctx.body = 'Return some json here using the shopify token';
    ctx.statusCode = 200;
  });

  server.keys = [SHOPIFY_SECRET as string];

  server
    // sets up secure session data on each request
    .use(session({ secure: true, sameSite: 'none' }, server))
  
    // sets up shopify auth
    .use(
      shopifyAuth({
        apiKey: SHOPIFY_API_KEY as string,
        secret: SHOPIFY_SECRET as string,
        scopes: ['write_orders, write_products'],
        afterAuth(ctx) {
          const {accessToken} = ctx.session as any;
  
          console.log('We did it!', accessToken);
  
          ctx.redirect('/');
        },
      }),
    )
 
    // everything after this point will require authentication
    .use(clientRouter.routes())
    .use(verifyRequest())
    .use(privateRouter.routes())

  server.use(async (ctx: any, next: any) => {
    ctx.res.statusCode = 200
    await next()
  })

  server.listen(port, () => console.log(`listening at http://localhost:${port}`));
});
