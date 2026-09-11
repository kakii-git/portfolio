import { getCollection, type CollectionEntry } from "astro:content";
import { getImage } from "astro:assets";
import { getWriting } from "./writing";
import { mergeArticles } from "./mergeArticles";
import { POST_SOURCE } from "../consts";
import type { Article } from "../types";

/** 自サイト記事の公開URL。slug は glob ローダーが決める entry.id。 */
export const postPath = (id: string) => `/blog/${id}/`;

/**
 * 自サイト記事を Article に揃える。
 * image は ImageMetadata のままだと一覧カードの <img src> に渡せないため、
 * ここで getImage() に通してパス文字列へ変換する（外部記事の og:image URL と同じ形）。
 */
async function toArticle(post: CollectionEntry<"blog">): Promise<Article> {
  const image = post.data.image
    ? (await getImage({ src: post.data.image, width: 800 })).src
    : undefined;
  return {
    title: post.data.title,
    url: postPath(post.id),
    date: post.data.date,
    source: POST_SOURCE,
    image,
    external: false,
  };
}

/** 外部記事（フィード集約）と自サイト記事を Article[] に統一し、日付降順で返す。 */
export async function getBlogArticles(): Promise<Article[]> {
  const [external, posts] = await Promise.all([getWriting(), getCollection("blog")]);
  const own = await Promise.all(posts.map(toArticle));
  return mergeArticles(external, own);
}
