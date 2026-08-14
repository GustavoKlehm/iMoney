import type { IncomingMessage, ServerResponse } from 'node:http';

type ExpressApp = (req: IncomingMessage, res: ServerResponse) => void;

let app: ExpressApp | undefined;

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  if (!app) {
    const mod = await import('../backend/src/app.js');
    app = mod.default as ExpressApp;
  }
  app(req, res);
}
