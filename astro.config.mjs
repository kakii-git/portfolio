// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import icon from "astro-icon";
import fs from "node:fs";

// 本番ドメイン。canonical / OGP / sitemap / robots はすべてここから導出される。
const SITE = "https://kakii.dev";

// curl 用フラグは consts.ts に集約。ここではソースから値だけ読み出して _headers に展開する
// （.ts を import せず読み取ることで型解決の依存を避ける）。
const CURL_FLAG =
  fs
    .readFileSync(new URL("./src/consts.ts", import.meta.url), "utf-8")
    .match(/CURL_FLAG\s*=\s*["'`]([^"'`]+)["'`]/)?.[1] ?? "";

/**
 * Cloudflare Pages の _headers をビルド時に生成。
 * 全パスに X-Kakii: hello と、curl -I で見つかるフラグ（X-Recon）を付与する。
 * @returns {import('astro').AstroIntegration}
 */
function reconHeaders() {
  return {
    name: "recon-headers",
    hooks: {
      "astro:build:done": ({ dir }) => {
        const body = `/*\n  X-Kakii: hello\n  X-Recon: ${CURL_FLAG}\n`;
        fs.writeFileSync(new URL("_headers", dir), body);
      },
    },
  };
}

export default defineConfig({
  site: SITE,
  // public/ 素通しの生HTML（/works/interference/）は Astro が把握できず sitemap に
  // 載らないため、customPages で明示的に追加する。
  integrations: [
    sitemap({ customPages: [`${SITE}/works/interference/`] }),
    icon(),
    reconHeaders(),
  ],
  // クライアントJSは原則ゼロ。fade-in / scrollspy / ハンバーガーのみ
  // Base.astro 内の <script> で進行的拡張として読み込む（JSオフでも崩れない）。
  // 記事本文のコードハイライト。サイトが白基調なので明るいテーマを指定する
  // （既定の github-dark だと本文の中で黒い塊が浮く）。Shiki のバンドル済みテーマ
  // なので追加依存は要らない。色は <pre> にインラインで出るため CSS では触らない。
  markdown: {
    shikiConfig: { theme: "github-light" },
  },
  image: {
    // ローカル画像の最適化（sharp）。リモート画像は使わない。
    responsiveStyles: true,
  },
  build: { inlineStylesheets: "auto" },
});
