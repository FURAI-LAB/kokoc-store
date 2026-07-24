import { jsonResponse } from "../../lib/response.js";
import { getPendingReviews, moderateReview } from "../../lib/reviews.js";

/** GET /admin/api/reviews?status=pending|approved|rejected (default: pending) */
export async function listReviews(env, url) {
  const status = url.searchParams.get("status") || "pending";

  if (status === "pending") {
    const reviews = await getPendingReviews(env, { limit: 200 });
    return jsonResponse({ ok: true, reviews });
  }

  if (!["approved", "rejected"].includes(status)) {
    return jsonResponse({ ok: false, error: "Invalid status filter" }, { status: 400 });
  }

  const { results } = await env.DB.prepare(`
    SELECT pr.id, pr.product_id, p.title AS product_title, p.slug AS product_slug,
           pr.author_name, pr.rating, pr.title, pr.body, pr.created_at
    FROM product_reviews pr
    JOIN products p ON p.id = pr.product_id
    WHERE pr.status = ?
    ORDER BY pr.created_at DESC
    LIMIT 200
  `).bind(status).all();

  return jsonResponse({ ok: true, reviews: results });
}

/** PATCH /admin/api/reviews/:id — body: { approve: boolean } */
export async function moderateReviewRoute(env, reviewId, body) {
  if (typeof body?.approve !== "boolean") {
    return jsonResponse({ ok: false, error: "Body must include { approve: boolean }" }, { status: 400 });
  }

  const result = await moderateReview(env, reviewId, body.approve);
  if (!result) return jsonResponse({ ok: false, error: "Not found" }, { status: 404 });

  return jsonResponse({ ok: true, ...result });
}
