import type { APIRoute } from "astro";

// robots.txt をビルド時に生成。Sitemap の URL は astro.config.mjs の `site` から導出するので、
// 独自ドメインに切り替えても `site` を更新するだけで Sitemap 行も自動で追従する。
export const GET: APIRoute = ({ site }) => {
  const sitemap = site ? new URL("sitemap-index.xml", site).href : "/sitemap-index.xml";
  const body = `# Nothing hidden here. Try: view-source:  (or: curl -sI)
# recon enjoyers — there are flags in the HTML head and the response headers. happy hunting.
User-agent: *
Allow: /

Sitemap: ${sitemap}
`;
  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
};
