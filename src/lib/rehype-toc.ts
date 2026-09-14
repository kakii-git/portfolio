import type { RehypePlugin } from "@astrojs/markdown-remark";
import type { Element, Parent, Root } from "hast";
import { toString } from "hast-util-to-string";
import { visit } from "unist-util-visit";

/** 目次マーカー。本文の段落がこの文字列だけのとき、その段落を目次に置き換える。 */
const MARKER = "[:contents]";
const TOC_TITLE = "目次";
const TOC_CLASS = "toc";
const TOC_TITLE_CLASS = "toc-title";

interface Heading {
  id: string;
  text: string;
}

interface MarkerSite {
  parent: Parent;
  index: number;
}

/**
 * 段落 (p) が目次マーカーだけで構成されているかを判定する。
 * 子がすべてテキストノードであることを条件にする。remark が "[:contents]" を
 * 1つのテキストノードにするか複数に分けるかは実装依存なので、連結した文字列で
 * 比較する（hast-util-to-string）。装飾付き（<em>[:contents]</em> 等）は対象外。
 */
const isMarker = (node: Element): boolean =>
  node.tagName === "p" &&
  node.children.every((c) => c.type === "text") &&
  toString(node).trim() === MARKER;

/** 文書内の id 付き h2 を、文書順で収集する。 */
const collectHeadings = (tree: Root): Heading[] => {
  const headings: Heading[] = [];
  visit(tree, "element", (node: Element) => {
    if (node.tagName === "h2" && typeof node.properties.id === "string") {
      headings.push({ id: node.properties.id, text: toString(node) });
    }
  });
  return headings;
};

/** 文書内の目次マーカー段落を、親ノードと位置つきで収集する。 */
const findMarkers = (tree: Root): MarkerSite[] => {
  const markers: MarkerSite[] = [];
  visit(tree, "element", (node: Element, index, parent) => {
    if (isMarker(node) && parent != null && index != null) {
      markers.push({ parent: parent as Parent, index });
    }
  });
  return markers;
};

/** 見出し一覧から目次の hast ツリーを組み立てる。 */
const buildToc = (headings: readonly Heading[]): Element => ({
  type: "element",
  tagName: "nav",
  properties: { className: [TOC_CLASS], ariaLabel: TOC_TITLE },
  children: [
    {
      type: "element",
      tagName: "p",
      properties: { className: [TOC_TITLE_CLASS] },
      children: [{ type: "text", value: TOC_TITLE }],
    },
    {
      type: "element",
      tagName: "ul",
      properties: {},
      children: headings.map((h) => ({
        type: "element",
        tagName: "li",
        properties: {},
        children: [
          {
            type: "element",
            tagName: "a",
            properties: { href: `#${h.id}` },
            children: [{ type: "text", value: h.text }],
          },
        ],
      })),
    },
  ],
});

/**
 * [:contents] を h2 の目次に置き換える rehype プラグイン。
 * astro.config.mjs で rehypeHeadingIds の後ろに並べること（先に走ると h2 に id が無い）。
 * ビルド時にだけ動き、クライアント JS は増えない。
 */
export const rehypeTocMarker: RehypePlugin = () => (tree: Root) => {
  const markers = findMarkers(tree);
  if (markers.length === 0) return;
  if (markers.length > 1) {
    // markdown-remark が "Failed to parse Markdown file <path>" を前置してくれる（計画書 F1）
    throw new Error(`目次マーカー ${MARKER} は1記事に1つだけ書けます（${markers.length}箇所あります）`);
  }
  const [{ parent, index }] = markers;
  const headings = collectHeadings(tree);
  if (headings.length === 0) {
    parent.children.splice(index, 1);
    return;
  }
  parent.children[index] = buildToc(headings);
};
