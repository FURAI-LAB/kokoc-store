/**
 * reviews.js — Product reviews: fetch approved reviews, submit new ones,
 * and keep products.rating_avg / products.rating_count in sync.
 *
 * Reviews are moderated: new submissions land as status='pending' and
 * only count toward the public rating / JSON-LD once an admin approves
 * them (see routes/admin — approval wiring lives there, not here).
 * This keeps aggregateRating honest and stops drive-by spam from
 * instantly moving the needle on a product's rating.
 */

import { makeid } from "./ids.js";

/**
 * Approved reviews for a product, newest first.
 * Returns [] if there are none — callers (product.js, seo.js) treat an
 * empty array as "no review data available" and omit JSON-LD fields.
 */
export async function getApprovedReviews(env, productId, { limit = 20 } = {}) {
  const { results } = await env.DB.prepare(`
    SELECT id, author_name, rating, title, body, created_at
    FROM product_reviews
    WHERE product_id = ? AND status = 'approved'
    ORDER BY created_at DESC
    LIMIT ?
  `).bind(productId, limit).all();

  return results.map(r => ({
    id: r.id,
    authorName: r.author_name,
    rating: r.rating,
    title: r.title || null,
    body: r.body,
    createdAt: r.created_at,
  }));
}

/**
 * Submit a new review. Always created as 'pending' — never directly
 * affects rating_avg / rating_count until approved.
 */
export async function submitReview(env, productId, { authorName, rating, title, body }) {
  const id = makeid();
  await env.DB.prepare(`
    INSERT INTO product_reviews (id, product_id, author_name, rating, title, body, status)
    VALUES (?, ?, ?, ?, ?, ?, 'pending')
  `).bind(id, productId, authorName.trim(), rating, title?.trim() || null, body.trim()).run();

  return { id, status: "pending" };
}

/**
 * Recompute and persist products.rating_avg / rating_count from
 * approved reviews only. Call after any approve / reject / delete.
 */
export async function recalculateProductRating(env, productId) {
  const agg = await env.DB.prepare(`
    SELECT COUNT(*) AS count, AVG(rating) AS avg
    FROM product_reviews
    WHERE product_id = ? AND status = 'approved'
  `).bind(productId).first();

  const count = agg?.count || 0;
  const avg = count > 0 ? Math.round(agg.avg * 10) / 10 : null;

  await env.DB.prepare(`
    UPDATE products SET rating_avg = ?, rating_count = ? WHERE id = ?
  `).bind(avg, count, productId).run();

  return { ratingAvg: avg, ratingCount: count };
}

/** List pending reviews across all products, for the admin queue. */
export async function getPendingReviews(env, { limit = 50 } = {}) {
  const { results } = await env.DB.prepare(`
    SELECT pr.id, pr.product_id, p.title AS product_title, p.slug AS product_slug,
           pr.author_name, pr.rating, pr.title, pr.body, pr.created_at
    FROM product_reviews pr
    JOIN products p ON p.id = pr.product_id
    WHERE pr.status = 'pending'
    ORDER BY pr.created_at ASC
    LIMIT ?
  `).bind(limit).all();

  return results;
}

/** Approve or reject a review, then refresh the product's cached aggregates. */
export async function moderateReview(env, reviewId, approve) {
  const review = await env.DB.prepare(
    `SELECT product_id FROM product_reviews WHERE id = ?`
  ).bind(reviewId).first();

  if (!review) return null;

  await env.DB.prepare(
    `UPDATE product_reviews SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
  ).bind(approve ? "approved" : "rejected", reviewId).run();

  return recalculateProductRating(env, review.product_id);
}
