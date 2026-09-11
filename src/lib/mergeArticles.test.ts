import { describe, expect, it } from "vitest";
import { mergeArticles } from "./mergeArticles";
import type { Article } from "../types";

const article = (title: string, date: string, external = true): Article => ({
  title,
  url: external ? `https://example.com/${title}` : `/blog/${title}/`,
  date: new Date(date),
  source: external ? "Qiita" : "kakii.dev",
  external,
});

describe("mergeArticles", () => {
  it("引数なしなら空配列を返す", () => {
    expect(mergeArticles()).toEqual([]);
  });

  it("空リストだけを渡しても空配列を返す", () => {
    expect(mergeArticles([], [])).toEqual([]);
  });

  it("1本のリストを日付降順に並べ替える", () => {
    const list = [article("old", "2024-01-01"), article("new", "2026-01-01")];
    expect(mergeArticles(list).map((a) => a.title)).toEqual(["new", "old"]);
  });

  it("複数リストを混ぜて日付降順に並べる", () => {
    const external = [article("ext-2026", "2026-05-01"), article("ext-2024", "2024-05-01")];
    const own = [article("own-2025", "2025-05-01", false), article("own-2023", "2023-05-01", false)];
    expect(mergeArticles(external, own).map((a) => a.title)).toEqual([
      "ext-2026",
      "own-2025",
      "ext-2024",
      "own-2023",
    ]);
  });

  it("同じ日付なら入力順を保つ（安定ソート）", () => {
    const first = [article("a", "2026-01-01"), article("b", "2026-01-01")];
    const second = [article("c", "2026-01-01")];
    expect(mergeArticles(first, second).map((a) => a.title)).toEqual(["a", "b", "c"]);
  });

  it("引数の配列を変更しない", () => {
    const list = [article("old", "2024-01-01"), article("new", "2026-01-01")];
    const snapshot = [...list];
    mergeArticles(list);
    expect(list).toEqual(snapshot);
  });

  it("返り値は入力とは別の配列である", () => {
    const list = [article("a", "2026-01-01")];
    expect(mergeArticles(list)).not.toBe(list);
  });

  it("要素は複製せず同じ参照を保つ（画像パス等をそのまま使えるように）", () => {
    const a = article("a", "2026-01-01");
    expect(mergeArticles([a])[0]).toBe(a);
  });
});
