import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

/**
 * Astro 5 の Content Layer API（glob ローダー）を採用。
 * 「YAMLファイルを1つ足して push すれば1項目増える」要件を満たすため、
 * 1ファイル = 1エントリ になる glob ({ pattern: "**\/*.yaml" }) 方式にしている。
 * （file ローダーは「1ファイルに配列でまとめる」方式で、追記型の要件に合わないため不採用）
 */

// 多言語テキスト（ja 必須 / en 任意）
const i18n = z.object({
  ja: z.string(),
  en: z.string().optional(),
});

const timeline = defineCollection({
  loader: glob({ pattern: "**/*.{yaml,yml}", base: "./src/content/timeline" }),
  schema: z.object({
    // 実日付で持つ（YAMLは YYYY-MM-DD）。表示は YYYY.MM に整形。
    // 文字列の "2026.05" ではなく Date にすることで、降順ソートと
    // 将来の記事RSSとの統合ソートを同じ比較で行える。
    date: z.coerce.date(),
    // 表示用の日付ラベル上書き（期間 "2022.07–12" などに使う）。未指定なら date から YYYY.MM を生成。
    dateLabel: z.string().optional(),
    title: i18n,
    category: z.enum([
      "ctf",
      "camp",
      "talk",
      "internship",
      "award",
      "event",
      "competition",
      "other",
    ]),
    description: i18n.partial().optional(), // タイムライン上の補足（サブ行）
    link: z.string().optional(), // 相対パスも許容するため url() ではなく string
    linkLabel: z.string().optional(),
  }),
});

const certifications = defineCollection({
  loader: glob({ pattern: "**/*.{yaml,yml}", base: "./src/content/certifications" }),
  schema: z.object({
    name: z.string(),
    date: z.coerce.date(), // 取得年月。表示は年のみ。
    issuer: z.string(),
  }),
});

const works = defineCollection({
  loader: glob({ pattern: "**/*.{yaml,yml}", base: "./src/content/works" }),
  schema: ({ image }) =>
    z.object({
      no: z.number(), // 通し番号（表示順 / No.01 表示にも使う）
      title: z.string(),
      year: z.coerce.number(),
      tech: z.array(z.string()),
      description: i18n.partial(), // ja/en（少なくとも片方）
      // スクリーンショット（任意）。YAMLからの相対パスで指定（例: image: ./syncle.png）。
      // ファイルは YAML と同じ src/content/works/ に置く。Astro が最適化して出力。
      image: image().optional(),
      // MD の link(optional) を、デザインの GitHub/Demo 複数リンクに合わせて配列へ拡張
      links: z.array(z.object({ label: z.string(), href: z.string() })).optional(),
    }),
});

const blog = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/blog" }),
  // timeline / works は { ja, en } の i18n を使うが、blog は踏襲しない。
  // あれは短いラベルだから両言語を併記できているのであって、本文が日本語のみの
  // 記事はタイトルだけ英訳しても読めず意味がないため、title は素の string にする。
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      // 日付の唯一の情報源。ファイル名には日付を付けない（URL に出てしまうため）。
      date: z.coerce.date(),
      // 本文ページの <meta name="description"> と og:description に使う。
      // 未指定ならサイト共通の説明文にフォールバックする（本文からの自動抜粋はしない）。
      description: z.string().optional(),
      // サムネイル兼 OGP 画像。Markdown と同階層に置く（works と同じ流儀）。
      image: image().optional(),
    }),
});

export const collections = { timeline, certifications, works, blog };
