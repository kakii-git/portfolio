import { createMarkdownProcessor, rehypeHeadingIds } from "@astrojs/markdown-remark";
import { describe, expect, it } from "vitest";
import { rehypeTocMarker } from "./rehype-toc";

const render = async (md: string): Promise<string> => {
  const p = await createMarkdownProcessor({ rehypePlugins: [rehypeHeadingIds, rehypeTocMarker] });
  return (await p.render(md)).code;
};

const renderWithoutTocMarker = async (md: string): Promise<string> => {
  const p = await createMarkdownProcessor({ rehypePlugins: [rehypeHeadingIds] });
  return (await p.render(md)).code;
};

/** ブロック要素間の改行を除いて比較しやすくする。 */
const normalize = (html: string): string => html.replace(/\n/g, "");

describe("rehypeTocMarker", () => {
  it("マーカーが無ければ何も変えない", async () => {
    const md = "## a\n\n本文\n\n## b\n";
    const withPlugin = await render(md);
    expect(withPlugin).not.toContain('class="toc"');
    expect(withPlugin).toBe(await renderWithoutTocMarker(md));
  });

  it("マーカーの位置に h2 の目次を出す", async () => {
    const md = "導入\n\n[:contents]\n\n## a\n\n## b\n";
    const html = normalize(await render(md));
    expect(html).toContain(
      '<nav class="toc" aria-label="目次"><p class="toc-title">目次</p><ul><li><a href="#a">a</a></li><li><a href="#b">b</a></li></ul></nav>',
    );
    expect(html).not.toContain("[:contents]");
  });

  it("マーカーより前の h2 も含める", async () => {
    const md = "## a\n\n[:contents]\n\n## b\n";
    const html = normalize(await render(md));
    const ids = [...html.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
    expect(ids).toEqual(["a", "b"]);
  });

  it("h3 は含めない", async () => {
    const md = "[:contents]\n\n## a\n\n### b\n";
    const html = normalize(await render(md));
    expect(html).toContain('href="#a"');
    expect(html).not.toContain('href="#b"');
  });

  it("引用とリストの中の h2 も含める", async () => {
    const md = "[:contents]\n\n> ## a\n\n- ## b\n\n## c\n";
    const html = normalize(await render(md));
    const ids = [...html.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
    expect(ids).toEqual(["a", "b", "c"]);
  });

  it("見出しの装飾はプレーンテキストにする", async () => {
    const md = "[:contents]\n\n## `fetch` の**罠**\n";
    const html = normalize(await render(md));
    expect(html).toContain('<a href="#fetch-の罠">fetch の罠</a>');
  });

  it("日本語の id はそのまま href に出す", async () => {
    const md = "[:contents]\n\n## はじめに\n";
    const html = normalize(await render(md));
    expect(html).toContain('href="#はじめに"');
    expect(html).not.toContain("%E3");
  });

  it("重複見出しの id に追随する", async () => {
    const md = "[:contents]\n\n## はじめに\n\n## はじめに\n";
    const html = normalize(await render(md));
    expect(html).toContain('href="#はじめに"');
    expect(html).toContain('href="#はじめに-1"');
  });

  it("前後の空白は許容する", async () => {
    const md = "  [:contents]  \n\n## a\n";
    const html = normalize(await render(md));
    expect(html).toContain('class="toc"');
  });

  it("段落の一部のマーカーは残す", async () => {
    const md = "あとがき [:contents] インライン\n\n## a\n";
    const html = await render(md);
    expect(html).toContain("<p>あとがき [:contents] インライン</p>");
    expect(html).not.toContain('class="toc"');
  });

  it("コードブロック内のマーカーは残す", async () => {
    const md = "```\n[:contents]\n```\n\n## a\n";
    const html = await render(md);
    expect(html).toMatch(/<pre[^>]*>[\s\S]*\[:contents\][\s\S]*<\/pre>/);
    expect(html).not.toContain('class="toc"');
  });

  it("装飾付きの段落はマーカーにしない", async () => {
    const md = "*[:contents]*\n\n## a\n";
    const html = await render(md);
    expect(html).toContain("<p><em>[:contents]</em></p>");
    expect(html).not.toContain('class="toc"');
  });

  it("h2 が無ければマーカーごと消す（マーカーのみ）", async () => {
    const html = await render("[:contents]\n");
    expect(html).not.toContain("[:contents]");
    expect(html).not.toContain('class="toc"');
  });

  it("h2 が無ければマーカーごと消す（h3 のみ）", async () => {
    const html = await render("### x\n\n[:contents]\n");
    expect(html).not.toContain("[:contents]");
    expect(html).not.toContain('class="toc"');
    expect(html).toContain('<h3 id="x">x</h3>');
  });

  it("マーカーが2つ以上ならエラーにする", async () => {
    await expect(render("[:contents]\n\n[:contents]\n\n## a\n")).rejects.toThrow(/1記事に1つ/);
  });

  it("rehypeHeadingIds より前に置かれると目次が空になる", async () => {
    const p = await createMarkdownProcessor({ rehypePlugins: [rehypeTocMarker] });
    const html = normalize((await p.render("[:contents]\n\n## a\n")).code);
    // h2 に id が付くのは Astro が内部で rehypeTocMarker の後に実行するため（計画書 F5）。
    // その時点では収集対象の id 付き h2 が無いので、マーカーは消えるだけになる。
    expect(html).not.toContain("[:contents]");
    expect(html).not.toContain('class="toc"');
    expect(html).toContain('<h2 id="a">a</h2>');
  });

  it("引用の中のマーカーも置換する", async () => {
    const md = "> [:contents]\n\n## a\n";
    const html = normalize(await render(md));
    expect(html).toContain('<blockquote><nav class="toc"');
  });
});
