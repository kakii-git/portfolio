import type { Article } from "../types";

/**
 * 複数の記事リスト（外部記事・自サイト記事）を日付降順で1本にまとめる。
 *
 * 引数の配列は変更しない。同じ日付の記事は入力順を保つ
 * （Array.prototype.sort は ES2019 以降で安定ソートが保証されている）。
 */
export function mergeArticles(...lists: readonly (readonly Article[])[]): Article[] {
  return lists.flat().sort((a, b) => b.date.getTime() - a.date.getTime());
}
