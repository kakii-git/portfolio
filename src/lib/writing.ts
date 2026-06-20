import { XMLParser } from "fast-xml-parser";
import { FEEDS } from "../consts";

export interface Article {
  title: string;
  url: string;
  date: Date;
  source: string;
  image?: string; // OGP og:image（ビルド時に各記事ページから取得）
}

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

/** 記事ページの HTML から og:image を取得（失敗時は undefined＝プレースホルダ表示）。 */
async function fetchOgImage(url: string): Promise<string | undefined> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return undefined;
    const html = await res.text();
    const m =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ??
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    return m?.[1];
  } catch {
    return undefined;
  }
}

function pick<T>(v: T | T[]): T[] {
  return v == null ? [] : Array.isArray(v) ? v : [v];
}

/**
 * 各フィード（Qiita 等）の RSS/Atom をビルド時に取得し、日付降順で統合。
 * 失敗してもビルドを落とさない（そのフィードを空としてスキップ）。
 * ※ Qiita は Atom 形式（feed.entry[]）。
 */
export async function getWriting(): Promise<Article[]> {
  const out: Article[] = [];

  for (const feed of FEEDS) {
    try {
      const res = await fetch(feed.url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) {
        console.warn(`[writing] ${feed.source}: HTTP ${res.status}`);
        continue;
      }
      const data = parser.parse(await res.text());

      // Atom（Qiita / Zenn）
      for (const e of pick<any>(data?.feed?.entry)) {
        const links = pick<any>(e.link);
        const alt = links.find((l) => l["@_rel"] === "alternate") ?? links[0];
        const href = alt?.["@_href"] ?? "";
        const title = typeof e.title === "object" ? (e.title["#text"] ?? "") : (e.title ?? "");
        const when = e.published ?? e.updated;
        if (href && title && when) {
          out.push({ title: String(title), url: String(href), date: new Date(when), source: feed.source });
        }
      }

      // RSS 2.0 フォールバック（channel.item[]）
      for (const it of pick<any>(data?.rss?.channel?.item)) {
        const href = it.link ?? "";
        const title = it.title ?? "";
        const when = it.pubDate ?? it.date;
        if (href && title && when) {
          out.push({ title: String(title), url: String(href), date: new Date(when), source: feed.source });
        }
      }
    } catch (err) {
      // ネットワーク不通・タイムアウト・パース失敗など → そのフィードはスキップ
      console.warn(`[writing] ${feed.source}: fetch failed —`, (err as Error)?.message ?? err);
    }
  }

  // 各記事の OGP画像をビルド時に並行取得（失敗した記事はプレースホルダにフォールバック）
  await Promise.all(
    out.map(async (a) => {
      a.image = await fetchOgImage(a.url);
    }),
  );

  return out.sort((a, b) => b.date.getTime() - a.date.getTime());
}
