import { handleRequest } from "./server.js";

export default {
  async fetch(request, env, ctx) {
    return handleRequest(request, env, ctx);
  },

  async scheduled(event, env) {
    if (!env.DB) return;
    try {
      const { meta } = await env.DB.prepare(
        `DELETE FROM carts
         WHERE status = 'open'
           AND expires_at < datetime('now')`
      ).run();
      console.log(`[cron] expired carts deleted: ${meta?.changes ?? 0}`);
    } catch (err) {
      console.error("[cron] cart cleanup failed:", err);
    }
  },
};
