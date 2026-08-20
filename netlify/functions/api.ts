import serverless from 'serverless-http';
import type { Handler, HandlerEvent, HandlerContext, HandlerResponse } from '@netlify/functions';
import { createApiApp } from '../../src/server/apiApp';

type ServerlessHandler = (event: HandlerEvent, context: HandlerContext) => Promise<HandlerResponse>;

// Netlify Functions cold-start once per warm instance; caching the handler
// across invocations lets the RAM pet cache in createApiApp() actually pay off.
let handlerPromise: Promise<ServerlessHandler> | null = null;

async function buildHandler(): Promise<ServerlessHandler> {
  const app = await createApiApp();
  return serverless(app) as unknown as ServerlessHandler;
}

export const handler: Handler = async (event, context) => {
  if (!handlerPromise) {
    handlerPromise = buildHandler();
  }
  const wrapped = await handlerPromise;

  // The /api/* redirect forwards requests here as
  // "/.netlify/functions/api/<rest>". Express routes are defined as
  // "/api/<rest>", so rewrite the path back before dispatching.
  const normalizedEvent = {
    ...event,
    path: event.path.replace(/^\/\.netlify\/functions\/api/, '/api')
  };

  return wrapped(normalizedEvent, context);
};
