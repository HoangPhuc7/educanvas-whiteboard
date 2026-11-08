/**
 * Selection transforms for EduCanvas.
 * All values are persisted in board_items.payload instead of Konva's transient
 * node scale, so a resize survives reloads and Supabase Realtime updates.
 */
import { clamp } from './boardGeometry.js';
import { readTextStyle } from './textFormatting.js';

const numeric = (v, fallback = 1) => Number.isFinite(Number(v)) ? Number(v) : fallback;
const rounded = n => Math.round(n * 10) / 10;

/** New board object owned by the current account (addItem writes the owner). */
export function duplicatePayload(payload = {}, offset = 28) {
  const copy = JSON.parse(JSON.stringify(payload));
  copy.x = rounded(numeric(copy.x, 0) + offset);
  copy.y = rounded(numeric(copy.y, 0) + offset);
  return copy;
}

/** Used by both drag handles and the contextual scale controls. */
export function resizePayload(item, { scaleX = 1, scaleY = 1, x, y, textWidth } = {}) {
  const p = item.payload || {};
  // Flip is disabled in the UI. Reject nonsensical scales from gestures.
  const sx = clamp(Math.abs(numeric(scaleX)), .1, 8);
  const sy = clamp(Math.abs(numeric(scaleY)), .1, 8);
  const avg = Math.sqrt(sx * sy);
  const next = {
    ...p,
    x: rounded(numeric(x, numeric(p.x, 0))),
    y: rounded(numeric(y, numeric(p.y, 0))),
  };
  const size = (value, factor, min = 1, max = 10000) => rounded(clamp(numeric(value) * factor, min, max));
  if (item.kind === 'rect') {
    next.width = size(p.width || 1, sx);
    next.height = size(p.height || 1, sy);
    if (p.strokeWidth != null) next.strokeWidth = size(p.strokeWidth, avg, .5, 80);
    if (p.cornerRadius != null) next.cornerRadius = size(p.cornerRadius, avg, 0, 200);
  } else if (item.kind === 'ellipse') {
    next.radiusX = size(p.radiusX || 1, sx);
    next.radiusY = size(p.radiusY || 1, sy);
    if (p.strokeWidth != null) next.strokeWidth = size(p.strokeWidth, avg, .5, 80);
  } else if (item.kind === 'line') {
    next.points = Array.isArray(p.points) ? p.points.map((n,i)=>rounded(n*(i%2 ? sy : sx))) : [0,0,1,1];
    if (p.width != null) next.width = size(p.width, avg, .5, 80);
  } else if (item.kind === 'pen' || item.kind === 'highlighter') {
    const stretch = pts => pts.map((n,i)=>rounded(n*(i%2 ? sy : sx)));
    if (Array.isArray(p.points)) next.points = stretch(p.points);
    if (Array.isArray(p.segments)) next.segments = p.segments.map(stretch);
    if (p.width != null) next.width = size(p.width, avg, .5, 80);
  } else if (item.kind === 'text') {
    const style = readTextStyle(p);
    next.fontSize = size(style.fontSize, avg, 8, 160);
    // Legacy objects can be naturally-sized, not the 360px fallback.
    const baseWidth = numeric(textWidth, p.width == null ? style.width : p.width);
    next.width = size(baseWidth, sx, 120, 1000);
    if (p.letterSpacing != null) next.letterSpacing = size(style.letterSpacing, avg, 0, 12);
  }
  return next;
}

/** Keep each DB item safely below 64 KB after transformations or duplication. */
export function isPayloadTooLarge(payload) {
  return new TextEncoder().encode(JSON.stringify(payload)).length > 62000;
}
