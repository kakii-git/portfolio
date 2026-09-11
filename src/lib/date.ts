/**
 * 記事の日付整形。
 *
 * すべて UTC getter を使う。z.coerce.date() は frontmatter の "2026-09-04" を
 * UTC 0時として解釈するため、ローカル getter だと UTC より西のタイムゾーンで
 * 前日に化ける。Cloudflare Pages のビルドは UTC なので現状は顕在化しないが、
 * ローカルの dev サーバーで見たときにずれないよう塞いでおく。
 */

/** 一覧カード用（例: "2026.09"） */
export const formatYearMonth = (d: Date) =>
  `${d.getUTCFullYear()}.${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

/** 本文ページ用（例: "2026.09.04"） */
export const formatDate = (d: Date) =>
  `${formatYearMonth(d)}.${String(d.getUTCDate()).padStart(2, "0")}`;

/** <time datetime> 属性用（例: "2026-09-04"） */
export const toIsoDate = (d: Date) => d.toISOString().slice(0, 10);
