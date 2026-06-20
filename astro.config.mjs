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
  integrations: [sitemap(), icon(), reconHeaders()],
  // クライアントJSは原則ゼロ。fade-in / scrollspy / ハンバーガーのみ
  // Base.astro 内の <script> で進行的拡張として読み込む（JSオフでも崩れない）。
  image: {
    // ローカル画像の最適化（sharp）。リモート画像は使わない。
    responsiveStyles: true,
  },
  build: { inlineStylesheets: "auto" },
});
