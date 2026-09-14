# Issue #4 `[:contents]` 記法による記事内目次 実装計画

| 項目 | 内容 |
|---|---|
| 対象 Issue | [kakii-git/portfolio#4 feat: [:contents] 記法によるブログ記事内目次機能](https://github.com/kakii-git/portfolio/issues/4) |
| 前提文書 | `CONTEXT.md`（用語集。「目次」「目次マーカー」を本 Issue で追加） / `design-docs-for-ai/issue1-blog-feature-implementation-plan.md`（ブログ機能の実装計画。本文ページと `.prose` の成り立ち） |
| 作成日 | 2026-09-11 |
| 作成ブランチ | `plan/issue-4-blog-toc-contents` |
| 実装ブランチ | `feat/issue-4-blog-toc`（`main` から作成する） |
| 状態 | **Draft**。Issue #4 の決定事項（2026-09-11 の設計レビューで確定）をもとに作成。レビュー前 |

この文書は「Issue #4 を実装する人（人間・AI どちらでも）が、Issue と本書だけを読めば迷わず着手できる」ことを目的にする。Issue に書いてある決定事項は繰り返さず参照に留め、**Issue に書かれていない実装者裁量の決定と、コードを読んで確認した事実**を中心に書く。

用語は `CONTEXT.md` に従う。本書でも **目次 / 目次マーカー / 自サイト記事** を使い、「TOC」はコード上の識別子（`.toc`、`rehype-toc.ts`）にのみ使う。「プレースホルダ」は使わない。

### 着手手順の要約（詳細は §4）

0. この計画書と `CONTEXT.md` の追記を `plan/issue-4-blog-toc-contents` でコミットし、Draft PR で `main` へマージする（§9）
1. `main` で `npm run build` し `dist/` を退避（§6.3 の before。ただし記事0件なので比較対象は §6.3 の検証用記事で作る）
2. `feat/issue-4-blog-toc` を切り、依存 4 パッケージを追加（§3.7）
3. `src/lib/rehype-toc.test.ts` を先に書き（RED）、`src/lib/rehype-toc.ts` を実装（GREEN）
4. `astro.config.mjs` に `rehypePlugins` を追加し、`global.css` に `.toc` スタイルを足す
5. 検証用記事 2 本で §6.2 / §6.3 / §6.5 を確認し、**記事を削除**する
6. README に目次マーカーの書き方を追記し、PR（Issue 参照は `関連: #4`。自動クローズキーワードは書かない、§9）

---

## 1. ゴールと完了の定義

**ゴール**: 自サイト記事の Markdown 本文に `[:contents]` と 1 行書くと、その位置に記事内の h2 への目次が静的 HTML として出る。書いていない記事の出力は変わらない。

**完了の定義**: Issue の受け入れ条件 15 項目がすべて、§6 の検証手順で確認できていること。各条件と検証方法の対応表を §6.4 に置く。検証用記事は削除済みで、`src/content/blog/` が空であること。

---

## 2. 現状分析（コードを読んで確認した事実）

Issue の「前提」節は実測に基づいており正確だった。加えて、実装に影響する以下を確認した。

- **F1**: `@astrojs/markdown-remark` の `render()` は `VFile` を `path: renderOpts?.fileURL` で作り、パイプラインが throw すると **`Failed to parse Markdown file "<path>"` を先頭に付けて再 throw する**（`node_modules/@astrojs/markdown-remark/dist/index.js` 104〜113 行）。Content Collections の Markdown は `node_modules/astro/dist/vite-plugin-markdown/content-entry-type.js` 23〜26 行で `fileURL: pathToFileURL(entry.filePath)` を渡して `render()` されている。**つまり自作プラグインが `Error` を throw するだけで、エラーメッセージに記事のファイルパスが付く。** Issue の「実装時の確認事項」はこれで解消（プラグイン側で `file.path` を組み立てる必要はない）
- **F2**: `@astrojs/markdown-remark` は `RehypePlugin` 型（`unified.Plugin<any[], hast.Root>`）をエクスポートしている（`dist/types.d.ts` 21 行）。`unified` を直接 import しなくてもプラグインに型が付けられる
- **F3**: `@types/hast` 3.0.4 が推移的依存として `node_modules` にある（`Element` / `Root` / `Text` 型の取得元）。Issue が明示追加を決めた 3 パッケージには含まれていない → §3.7 で devDependencies に加える
- **F4**: `tsconfig.json` は `astro/tsconfigs/strict` を継承し、`moduleResolution: "Bundler"` / `allowImportingTsExtensions: true`。`astro.config.mjs` から `./src/lib/rehype-toc.ts` を直接 import できる（Astro は設定ファイルを Vite でバンドルして読む）。既存の `astro.config.mjs` は `consts.ts` を `fs.readFileSync` で読んでいるが、これは「`.ts` を import すると型解決の依存ができる」ことを避けたコメント付きの判断であり、Vite が解決できないという意味ではない。本 Issue ではプラグインの実体が TypeScript である必要（vitest から import する）があるので import する（§3.8）
- **F5**: `rehypeHeadingIds` は `createMarkdownProcessor` 内で `parser.use(rehypeHeadingIds, { experimentalHeadingIdCompat })` として **ユーザーの `rehypePlugins` の後に**登録されている（`dist/index.js` 96〜98 行）。Issue の実測「明示配置しないと id が見えない」の根拠はこれ。明示配置しても二重実行で id が重複しないのは、Astro 側の `rehypeHeadingIds` が既に `id` を持つ見出しをスキップするため
- **F6**: `.prose a` の `border-bottom: 1px solid var(--hairline)` は `.prose` 直下の全 `<a>` に当たる（`global.css` 857 行）。目次リンクにも当たるので `.toc a` で打ち消す（Issue の決定どおり）
- **F7**: サイトの配色方針は `global.css` 冒頭のコメント「Blue is rationed: section numbers, links/hover, one hero element, caption rules」。`.caption .cap-rule` は 22px × 1px の Klein Blue の短い罫線（269〜274 行）。Issue の「Klein Blue 細罫線」はこの `cap-rule` と同じ語彙で作るのが自然（§3.6）
- **F8**: `vitest.config.*` は存在しない。`npm test` = `vitest run` が `**/*.test.ts` を既定で拾う。テストは `astro:*` 仮想モジュールを import しない限りそのまま動く。`createMarkdownProcessor` は `@astrojs/markdown-remark` の通常の ESM エクスポートなので vitest から直接呼べる（§3.9）
- **F9**: 既存テスト（`src/lib/mergeArticles.test.ts`）は `describe` / `it` を日本語のケース名で書いている。本 Issue のテストも同じ流儀にする
- **F10**: README の「記事を書く（自サイト記事）」節（80〜110 行）に、frontmatter 例と「決まりごと」の箇条書きがある。目次マーカーの説明はここに足す（§3.11）
- **F11**: `src/content/blog/` は空（git 管理下の `.gitkeep` だけがある。計画作成時は「`.gitkeep` も無い」と書いていたが、PR レビュー時に誤りと判明し訂正。ビルドは `The collection "blog" does not exist or is empty.` の警告付きで成功する）。検証用記事を置いて確認したあとに削除すると元の状態に戻る

---

## 3. 設計判断（Issue に書かれていない実装者裁量分）

Issue の「決定事項」「影響範囲」「テスト方針」「受け入れ条件」はそのまま採用する。ここでは Issue が決めていない、しかし決めないと着手できないものを決める。

### 3.1 プラグインの名前・ファイル・シグネチャ

| 項目 | 決定 |
|---|---|
| ファイル | `src/lib/rehype-toc.ts`（Issue のとおり） |
| エクスポート名 | `rehypeTocMarker`（設計レビューで「目次マーカー」を用語に決めたのに合わせる。Issue 初稿の `rehypeTocPlaceholder` は使わない） |
| 型 | `RehypePlugin`（`@astrojs/markdown-remark`、F2）。引数なし・オプションなし |
| 定数 | `MARKER = "[:contents]"`、`TOC_TITLE = "目次"`、`TOC_CLASS = "toc"`、`TOC_TITLE_CLASS = "toc-title"` をファイル先頭に置く。文言・記法をコードの中に散らさない |

### 3.2 走査アルゴリズム（2 パス）

hast の変換は unified の慣例どおり**ツリーをその場で書き換える**（`parent.children[index] = nav`）。グローバルルールの「ミュータブル禁止」は言語・ライブラリの慣例で上書きしてよい旨が明記されており、rehype プラグインで新しいツリーを組み直すのは慣例に反し可読性も落ちるため、ここでは書き換えを採る。ただし**書き換えは走査が終わってから**行う（走査中に `children` を触ると `unist-util-visit` のインデックスがずれる）。

```
1. h2 収集:   visit(tree, "element", n => n.tagName === "h2" && typeof n.properties.id === "string")
              → { id, text: toString(n) }[]   （文書順。深さは問わない）
2. マーカー収集: visit(tree, "element", (n, index, parent) => isMarker(n))
              → { index, parent }[]
3. 判定:
   - 0 件      → return（何もしない。既存記事に影響なし）
   - 2 件以上  → throw new Error(`目次マーカー ${MARKER} は1記事に1つだけ書けます（${n}箇所あります）`)
   - 1 件 かつ h2 が 0 件 → parent.children.splice(index, 1)（マーカーごと削除）
   - 1 件 かつ h2 あり    → parent.children[index] = buildToc(headings)
```

- **h2 の収集を先に、全ツリーに対して行う**ので、マーカーの前後どちらの h2 も入る（Issue「記事全体の h2」）。`blockquote` / `li` の中の h2 も `visit` が拾う（Issue「Astro の `headings` と同じ範囲」）
- 生成した `<nav>` の中に h2 は無いので、目次自身が目次に載ることはない
- `id` が無い h2（`rehypeHeadingIds` が走っていない場合）は収集対象から外す。これは「明示配置を忘れた」状態の検出にもなる（§6.1 のテストで担保）

### 3.3 目次マーカーの判定

```ts
const isMarker = (node: Element): boolean =>
  node.tagName === "p" &&
  node.children.every((c) => c.type === "text") &&
  toString(node).trim() === MARKER;
```

- **子がすべてテキストノード**であることを条件にする。remark が `[:contents]` を 1 つのテキストノードにするか `[` `:contents` `]` に分けるかは実装依存なので、連結した文字列で比較する（`hast-util-to-string`）。`<p><em>[:contents]</em></p>` のような装飾付きは対象外（子に要素があるため）
- `trim()` で前後の空白・改行のみ許容（Issue のとおり）
- 深さは問わない（`> [:contents]` のように引用の中に書いても置換する）。h2 の規則と揃える
- 段落の一部（`あとがき [:contents] インライン`）は `toString` が一致しないので対象外。文字列のまま残る（Issue のとおり）

### 3.4 複数マーカーのエラー

F1 のとおり、プラグインが throw した `Error` には `@astrojs/markdown-remark` が `Failed to parse Markdown file "file:///.../src/content/blog/foo.md"` を前置してくれる。プラグインは**メッセージだけ**を書く。`file` 引数は使わない（使わなくてもパスが出る）。

エラー文（固定）: `目次マーカー [:contents] は1記事に1つだけ書けます（N箇所あります）`

**§6.5 で実装後に実測して判明した訂正（Issue 受け入れ条件10の前提が誤り）**: `npm run build` はこの throw で**失敗しない**。Astro 5 の Content Layer の `glob` ローダーは記事ごとのレンダリングを `try/catch` しており（`node_modules/astro/dist/content/loaders/glob.js` 113〜125行）、プラグインが throw すると `logger.error("Error rendering <entry>: <message>")` をコンソールに出すだけで、そのエントリの `rendered` を `undefined` のまま `store` に積んで処理を続行する。`astro build` プロセス自体は正常終了（終了コード0）し、他のページも通常どおり生成される。この挙動を変える設定は `GlobOptions`（`glob.d.ts`）に無く、Astro 側の固定仕様。

**実際に起きること**: 複数マーカーの記事は、エラーメッセージ（`Failed to parse Markdown file "<path>"` 前置つき）が**コンソールにだけ**出て、ページ自体は生成される。その記事の `<div class="prose">` は空になる（frontmatter 由来のタイトル・description・一覧表示は正常）。Cloudflare Pages のビルドログにエラー行は残るが、デプロイは止まらない。**「壊れた記事が静かに公開される」を防ぐ、という受け入れ条件10の本来の意図は、rehype プラグインが throw するだけの設計では達成できない。**

**方針**: 本 Issue のスコープでは、ビルド停止の仕組みを別途作り込まない（rehype プラグイン単体で完結させる設計を維持する）。受け入れ条件10 の検証は「エラーメッセージにファイルパスと1記事1つの文言が出ること」に限定し、「ビルドが落ちる」は満たさないことを明記する（§6.4）。ビルドを実際に止めたい場合は、`src/content/blog/*.md` を事前スキャンする別の検証ステップの追加が必要になるが、それは本計画のスコープ外（§8 に追記）。

### 3.5 生成する hast の形

```ts
const buildToc = (headings: readonly Heading[]): Element => ({
  type: "element",
  tagName: "nav",
  properties: { className: [TOC_CLASS], ariaLabel: TOC_TITLE },
  children: [
    { type: "element", tagName: "p", properties: { className: [TOC_TITLE_CLASS] },
      children: [{ type: "text", value: TOC_TITLE }] },
    { type: "element", tagName: "ul", properties: {},
      children: headings.map((h) => ({
        type: "element", tagName: "li", properties: {},
        children: [{ type: "element", tagName: "a", properties: { href: `#${h.id}` },
                     children: [{ type: "text", value: h.text }] }],
      })) },
  ],
});
```

- `className` は hast の慣例どおり配列。`ariaLabel` は `hast-util-to-html`（`rehype-stringify`）が `aria-label` に変換する（property-information の既知プロパティ）
- `href` は `#${h.id}` をそのまま。日本語 id はエンコードしない（Issue のとおり）。`rehype-stringify` は属性値の `"` `&` 等をエスケープするので XSS の懸念は無い（id は Astro の slugger 由来で、`text` は `toString` の結果をテキストノードに入れる）
- 見出しテキストが空（`## ` のみ）の h2 は Astro が id を付けないので収集対象から自然に外れる

### 3.6 スタイル

Issue の決定（Klein Blue 細罫線 + 余白のみ、`.toc a` は下線なし）を、既存の `.caption .cap-rule`（F7）と同じ語彙で具体化する。

```css
/* ── 目次（[:contents] から src/lib/rehype-toc.ts が生成する <nav class="toc">） ──
   箱は hairline、ラベルの上に cap-rule と同じ 22px の青い短罫を置く（Blue is rationed）。
   .prose a の下線は縦に並ぶと罫線が二重に見えるので目次内では消し、hover の青だけ残す。 */
.prose .toc {
  margin: 32px 0;
  padding: 18px 22px 16px;
  border: 1px solid var(--hairline);
}

.prose .toc-title {
  margin: 0 0 10px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--ink-3);
}

.prose .toc-title::before {
  content: "";
  display: block;
  width: 22px;
  height: 1px;
  background: var(--blue);
  margin-bottom: 12px;
}

.prose .toc ul { margin: 0; padding-left: 1.2em; font-size: 14px; }
.prose .toc li { margin: 4px 0; }
.prose .toc a { border-bottom: none; }
```

- 置き場所は `.prose table` のブロックの直後、`/* ── Footer ── */` の前（`global.css` 915 行付近）
- `.prose p { margin: 20px 0 }` が `.toc-title` にも当たるので `margin: 0 0 10px` で上書きする。`.prose ul { margin: 20px 0 }` も同様に `margin: 0`
- 新しい色は導入しない（`--blue` / `--ink-3` / `--hairline` のみ。`.prose` ブロック冒頭のコメント「色は既存トークンのみ」に従う）
- 数値は実装時に `npm run preview` で目視して微調整してよい。**変えてはいけないのは「青は短罫 1 本だけ」「下線なし」の 2 点**

### 3.7 依存追加

Issue の 3 パッケージに `@types/hast` を足して 4 つ。版は現在 `node_modules` にあるもの（`npm view` で確認した最新）に合わせる。

```bash
npm i @astrojs/markdown-remark@^6.3.11 unist-util-visit@^5.1.0 hast-util-to-string@^3.0.1
npm i -D @types/hast@^3.0.4
```

- 前 3 つは `astro` と同じく `dependencies`。ビルド時にしか使わないので `devDependencies` でも動くが、「Astro のビルドに必要なもの」を `dependencies` 側に置く既存の流儀（`astro` `@astrojs/sitemap` `astro-icon` がそこにある）に揃える
- `@types/hast` は型だけなので `devDependencies`。Issue の決定「3 つ」からの追加であり、理由は F3（`Element` 型の取得元が推移的依存のままになるため）。PR 本文に明記する
- `hast-util-to-string` は新規インストール。`unist-util-visit` `@astrojs/markdown-remark` は既に同じ版が `node_modules` にあるので lockfile の差分は `package.json` 側の参照追加のみになるはず。`npm i` 後に `git diff package-lock.json` で予期しない版の変動が無いことを確認する

### 3.8 `astro.config.mjs` からの import

```js
import { rehypeHeadingIds } from "@astrojs/markdown-remark";
import { rehypeTocMarker } from "./src/lib/rehype-toc.ts";
```

- `.ts` 拡張子を付けて import する（F4、`allowImportingTsExtensions: true`。`@ts-check` の下でも通る）
- `rehypeHeadingIds` を先に並べる理由をコメントで残す（Issue「ADR は起こさない、コードコメントで残す」）:

```js
  markdown: {
    shikiConfig: { theme: "github-light" },
    // rehypeHeadingIds は Astro が内部で常に実行するが、その順番はユーザー指定の
    // rehypePlugins より後。自作プラグインから見出しの id を参照するために先に並べる。
    // 二重に実行されても、Astro 側は id 付きの見出しをスキップするので重複しない。
    rehypePlugins: [rehypeHeadingIds, rehypeTocMarker],
  },
```

### 3.9 テストの構成

Issue の決定どおり `createMarkdownProcessor` で Markdown → HTML を検証する。

```ts
// src/lib/rehype-toc.test.ts
import { createMarkdownProcessor, rehypeHeadingIds } from "@astrojs/markdown-remark";
import { describe, expect, it } from "vitest";
import { rehypeTocMarker } from "./rehype-toc";

const render = async (md: string) => {
  const p = await createMarkdownProcessor({ rehypePlugins: [rehypeHeadingIds, rehypeTocMarker] });
  return (await p.render(md)).code;
};
```

- Shiki は既定で有効だが、テストで使うコードブロックは `plaintext` なのでテーマ指定は不要（既定の `github-dark` でも `[:contents]` が `<pre>` に入ることの確認には影響しない）
- 出力 HTML は改行を含むので、`toContain` で部分一致するか、`replace(/\n/g, "")` で正規化してから `toBe` する。目次の構造を丸ごと見たいケースは正規化して比較、それ以外は `toContain` / `not.toContain`
- ケース一覧は §6.1

### 3.10 検証用記事（2 本、確認後に削除）

Issue の決定「マーカーなし＝回帰用、マーカーあり＝機能確認用の 2 本。終了後に削除」の中身を決める。どちらも AI が生成し、**commit しない**。

| ファイル | 内容 |
|---|---|
| `src/content/blog/verify-plain.md` | 目次マーカーなし。h2 × 3、h3 × 1、コードブロック × 1、リンク × 1。§6.3 で「プラグイン有無で `dist/blog/verify-plain/index.html` が一致」を見る |
| `src/content/blog/verify-toc.md` | 導入段落 → `[:contents]` → h2 × 3（うち 1 つは日本語で重複させて `-1` を出す、1 つは `` `code` `` を含む）→ h3 × 1 → `> ## 引用内の見出し` → コードブロック内に `[:contents]` → 段落途中に `[:contents]`。§6.2 の grep と `npm run preview` の目視・クリック確認に使う |

削除は `rm src/content/blog/verify-*.md && rm -rf .astro node_modules/.astro`（README の注記どおり Content Layer のキャッシュも消す）。`git status` に `src/content/blog/` が現れないことを確認する。

### 3.11 README の追記

「記事を書く（自サイト記事）」の「決まりごと」に 1 項目、frontmatter 例の本文に 1 行足す。

- 本文例: `本文。見出しは ...` の次の行に `[:contents]  <!-- ここに h2 の目次が入る（任意・1 記事に 1 つ） -->` 相当の 1 行（HTML コメントは Markdown 出力に残るので、例の中では書かず、説明は箇条書き側に置く）
- 決まりごと: 「**`[:contents]` と 1 行書くと、その位置に h2 の目次が入る**。1 記事に 1 つまで（2 つ以上あるとビルドが落ちる）。h2 が無い記事では何も出ない」

「構成」ツリーの `lib/` に `rehype-toc.ts` を足す。

---

## 4. 実装フェーズ

依存順に並べる。各フェーズは単独でコミットでき、`npm run check` と `npm run build` が通る状態を保つ。

### Phase 0: 計画書と用語のマージ、ベースライン確保

0. `plan/issue-4-blog-toc-contents` に本計画書と `CONTEXT.md` の追記（「目次」「目次マーカー」）をコミット → Draft PR → `main` へマージ（§9）
1. `main` を pull し `npm run build` して `dist/` をスクラッチ領域へ `before/` として退避（`/` `/works` `/blog/` の回帰確認用。§6.3）
2. `main` から `feat/issue-4-blog-toc` を切る
3. §3.7 の 4 パッケージを追加。`git diff package-lock.json` で予期しない変動が無いことを確認

**完了条件**: `npm run check` / `npm run build` / `npm test` が通る（この時点で挙動は何も変わらない）。

### Phase 1: プラグイン（TDD）

| 順 | ファイル | 変更 |
|---|---|---|
| 1 | `src/lib/rehype-toc.test.ts` | **先に書く**（RED）。§6.1 の全ケース。`rehype-toc.ts` が無いので import で落ちる |
| 2 | `src/lib/rehype-toc.ts` | §3.1〜3.5 の実装（GREEN） |
| 3 | 同上 | リファクタ。関数は `isMarker` / `collectHeadings` / `findMarkers` / `buildToc` / `rehypeTocMarker` に分け、各 20 行以内（目安。下記） |

- 手順 1 の前に、T6 / T7 / T8 の期待 id を §6.1 末尾の手順で実測しておく（テストに固定値として書くため）
- 「各 20 行以内」はこの計画での**目安**で、上限はグローバルルールの「関数は 50 行未満」のまま。20 行にした理由は、5 つの関数が §3.1〜3.5 の関心事（マーカー判定 / 見出し収集 / マーカー探索 / 目次構築 / 結合）に 1 対 1 で対応しており、1 関数がその関心事だけを扱っていれば 20 行に収まる見込みだから。超えるなら関心事が混ざっていないかを疑う、という使い方をする。20 行を超えても分割が不自然なら 50 行未満で通す

**完了条件**: `npm test` が通る。`npm run check` が通る（`*.test.ts` も型検査対象、F8）。

### Phase 2: 配線とスタイル

| 順 | ファイル | 変更 |
|---|---|---|
| 1 | `astro.config.mjs` | §3.8 の import と `rehypePlugins`、コメント |
| 2 | `src/styles/global.css` | §3.6 の `.toc` ブロックを `.prose table` の後に追加 |

**完了条件**: `npm run build` が通る（記事0件のまま）。`dist/index.html` `dist/works/index.html` `dist/blog/index.html` が Phase 0 の `before/` と一致する（§6.3 の正規化つき diff。`rehypePlugins` の追加はこれらのページに影響しないはず）。

### Phase 3: 検証用記事での確認

1. §3.10 の 2 本を置き、`npm run build`
2. §6.2 のスクリプトを実行
3. §6.3 の「プラグイン有無」diff を取る（`verify-plain` が一致すること）
4. `npm run preview` で `verify-toc` を開き、目次の見た目・クリックで飛べること・日本語見出し・重複見出しの `-1` を目視
5. §6.5 の障害シミュレーション（複数マーカーでビルド失敗、h2 なしで消える）
6. **2 本を削除**し、キャッシュも消す（§3.10）。`npm run build` が記事0件で成功することを再確認

**完了条件**: `git status` に `src/content/blog/` が現れない。§6.4 の表がすべて埋まっている。

### Phase 4: README と PR

| 順 | ファイル | 変更 |
|---|---|---|
| 1 | `README.md` | §3.11 |
| 2 | PR 作成 | §9 |

---

## 5. ファイル別の変更詳細

### 5.1 `src/lib/rehype-toc.ts`（全体像）

```ts
import type { RehypePlugin } from "@astrojs/markdown-remark";
import type { Element, Parent, Root } from "hast";
import { toString } from "hast-util-to-string";
import { visit } from "unist-util-visit";

/** 目次マーカー。本文の段落がこの文字列だけのとき、その段落を目次に置き換える。 */
const MARKER = "[:contents]";
const TOC_TITLE = "目次";
const TOC_CLASS = "toc";
const TOC_TITLE_CLASS = "toc-title";

interface Heading { id: string; text: string }
interface MarkerSite { parent: Parent; index: number }

const isMarker = (node: Element): boolean => /* §3.3 */;
const collectHeadings = (tree: Root): Heading[] => /* §3.2 手順1 */;
const findMarkers = (tree: Root): MarkerSite[] => /* §3.2 手順2 */;
const buildToc = (headings: readonly Heading[]): Element => /* §3.5 */;

/**
 * [:contents] を h2 の目次に置き換える rehype プラグイン。
 * astro.config.mjs で rehypeHeadingIds の後ろに並べること（先に走ると h2 に id が無い）。
 * ビルド時にだけ動き、クライアント JS は増えない。
 */
export const rehypeTocMarker: RehypePlugin = () => (tree) => {
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
```

`Parent` 型は `hast` の `Parent`（`Root | Element` の親）。`visit` のコールバックで受け取る `parent` は `Root | Element | null`、`index` は `number | null` なので、null を除外してから `MarkerSite` に詰める。

### 5.2 `astro.config.mjs`（差分のみ）

§3.8 のとおり。既存の `shikiConfig` の下に `rehypePlugins` を足す。他は変更しない。

### 5.3 `src/styles/global.css`（追加ブロックのみ）

§3.6 のとおり。既存の `.prose *` は変更しない。

### 5.4 `package.json`（差分のみ）

§3.7 のとおり。`scripts` は変更しない。

### 5.5 `README.md`（差分のみ）

§3.11 のとおり。

---

## 6. テスト・検証計画

### 6.1 単体テスト（vitest、`src/lib/rehype-toc.test.ts`）

| # | ケース名（`it`） | 入力の要点 | 期待 |
|---|---|---|---|
| T1 | マーカーが無ければ何も変えない | h2 × 2、マーカーなし | 出力に `class="toc"` が無い。`rehypeHeadingIds` のみで render した結果と一致 |
| T2 | マーカーの位置に h2 の目次を出す | 段落 → `[:contents]` → h2 × 2 | `<nav class="toc" aria-label="目次"><p class="toc-title">目次</p><ul><li><a href="#a">a</a></li>…</ul></nav>` が元の `<p>` の位置に出る |
| T3 | マーカーより前の h2 も含める | h2 → `[:contents]` → h2 | 目次に 2 件 |
| T4 | h3 は含めない | h2、h3 | 目次に h2 のみ |
| T5 | 引用とリストの中の h2 も含める | `> ## a`、`- ## b`、`## c` | 目次に 3 件、順序は文書順 |
| T6 | 見出しの装飾はプレーンテキストにする | `` ## `fetch` の**罠** `` | `<a href="#fetch-の罠">fetch の罠</a>`（id は Astro 生成のものを実測して固定） |
| T7 | 日本語の id はそのまま href に出す | `## はじめに` | `href="#はじめに"`（`%E3` が含まれない） |
| T8 | 重複見出しの id に追随する | `## はじめに` × 2 | `href="#はじめに"` と `href="#はじめに-1"` |
| T9 | 前後の空白は許容する | `  [:contents]  ` | 置換される |
| T10 | 段落の一部のマーカーは残す | `あとがき [:contents] インライン` | `<p>あとがき [:contents] インライン</p>` のまま、`class="toc"` なし |
| T11 | コードブロック内のマーカーは残す | ```` ```\n[:contents]\n``` ```` | `<pre>` 内に残る、`class="toc"` なし |
| T12 | 装飾付きの段落はマーカーにしない | `*[:contents]*` | `<p><em>[:contents]</em></p>` のまま |
| T13 | h2 が無ければマーカーごと消す | `[:contents]` のみ、または h3 のみ | `[:contents]` も `class="toc"` も出力に無い |
| T14 | マーカーが 2 つ以上ならエラーにする | `[:contents]` × 2 | `rejects.toThrow(/1記事に1つ/)`。メッセージに `Failed to parse Markdown file` が前置される（F1） |
| T15 | rehypeHeadingIds より前に置かれると目次が空になる | `rehypePlugins: [rehypeTocMarker]` のみで render | h2 に id が無いため収集 0 件 → マーカーが消えるだけ。**この挙動を固定しておくことで、順序の前提が壊れたときにテストで気づける** |
| T16 | 引用の中のマーカーも置換する | `> [:contents]` と h2 | `<blockquote><nav class="toc">…` |

T6 / T7 / T8 の期待 id は、テスト作成時に `rehypeHeadingIds` 単体の出力から取って固定する（実装が id を「生成」しないことの担保。自前生成していたら Astro の版が上がったときにずれてテストが落ちる、という方向に働く）。

**期待 id の確定手順（Phase 1 の手順 1 より前、RED の時点で行う）**: `rehypeHeadingIds` は Phase 0 で入る `@astrojs/markdown-remark` に含まれるので、`rehype-toc.ts` が無くても動かせる。次の使い捨てスクリプトをスクラッチ領域に置いて実行し、出力の `<h2 id="...">` から id を読み取ってテストの固定値にする。スクリプトは commit しない。

```ts
// scratch/heading-ids.mts（使い捨て。npx tsx で実行）
import { createMarkdownProcessor, rehypeHeadingIds } from "@astrojs/markdown-remark";
const p = await createMarkdownProcessor({ rehypePlugins: [rehypeHeadingIds] });
for (const md of ["## `fetch` の**罠**", "## はじめに", "## はじめに\n\n## はじめに"]) {
  console.log((await p.render(md)).code);
}
```

- 計画作成時点の見込みは T6 = `fetch-の罠`、T7 = `はじめに`、T8 = `はじめに` と `はじめに-1` だが、**見込みではなく実測値を書く**。実測が見込みと違った場合は §6.1 の表の期待も実測に合わせて直す
- 実測値をテストに書いた後は、この手順を再実行する必要はない。Astro の版を上げて T6〜T8 が落ちたら、それは「id の規則が変わった」合図なので、そのときに同じ手順で取り直す

カバレッジ: `rehype-toc.ts` は分岐が少ないので上記で 100% を目標にする。

### 6.2 ビルド検証（受け入れ条件の機械確認）

`verify-toc.md` を置いて `npm run build` 後、スクラッチ領域のスクリプトで確認する（リポジトリには入れない）。

```bash
set -eu
D=dist; P=$D/blog/verify-toc/index.html
test -f "$P"
grep -q '<nav class="toc" aria-label="目次">' "$P"                    # 1, 11: 構造
grep -q '<p class="toc-title">目次</p>' "$P"                          # 11
grep -q 'href="#はじめに"' "$P" && grep -q 'href="#はじめに-1"' "$P"   # 2, 3: 日本語 id と重複サフィックス
grep -q 'href="#引用内の見出し"' "$P"                                  # 5: 引用内 h2
if grep -q 'href="#小見出し"' "$P"; then echo "NG: h3 が目次に入っている"; exit 1; fi   # 4
[ "$(grep -o '\[:contents\]' "$P" | wc -l)" = 2 ]                    # 7, 8: コードブロック内 + 段落途中の 2 箇所だけ残る
[ "$(grep -c 'class="toc"' "$P")" = 1 ]                              # 目次は 1 つ
# 13: クライアント JS が増えていない（Base.astro の <script> 1 つのみ）
for p in $(find $D -name index.html -not -path '*/works/interference/*'); do
  [ "$(grep -c '<script' "$p")" = 1 ] || echo "NG: $p の <script> が1つでない"
done
[ -z "$(ls $D/_astro/*.js 2>/dev/null)" ]
```

手動確認（`npm run preview`）:
- 目次の各リンクをクリックして対応する見出しへ飛ぶ（日本語・重複・引用内の 3 種）
- 目次内のリンクに下線が無く、hover で青くなる
- 青い短罫が「目次」ラベルの上に 1 本だけ出ている
- `` `code` `` を含む見出しが目次ではプレーンテキストになっている（受け入れ条件 6）

### 6.3 HTML 回帰 diff

2 種類取る。

**(a) 既存 3 ページが変わっていないこと**（Phase 2 完了条件）。`before/` は Phase 0 で `main` から取ったもの。

```bash
S=<scratchpad>
norm() { sed -E 's#/_astro/index\.[A-Za-z0-9_-]+\.css#/_astro/index.HASH.css#g' "$1"; }
for p in index.html works/index.html blog/index.html; do
  diff <(norm $S/before/$p) <(norm $S/after/$p)
done
```

**意図した差分**: なし。`global.css` に `.toc` を足すので CSS ハッシュは変わるが `norm` で吸収する。それ以外が出たら調査する。

**(b) 目次マーカーを含まない記事がプラグインの有無で変わらないこと**（受け入れ条件 12）。`verify-plain.md` を置いた状態で、`astro.config.mjs` の `rehypePlugins` を一時的にコメントアウトして build → `plain-off/`、戻して build → `plain-on/`。

```bash
diff <(norm $S/plain-off/blog/verify-plain/index.html) <(norm $S/plain-on/blog/verify-plain/index.html)
```

**意図した差分**: なし。`rehypeHeadingIds` の明示配置で id が変わらないこと（Issue の実測）を記事レベルで確認する。`astro.config.mjs` の一時変更は確認後に必ず戻す（`git diff astro.config.mjs` が §3.8 の追加だけであること）。

### 6.4 受け入れ条件と検証方法の対応

| # | 受け入れ条件（Issue） | 検証 |
|---|---|---|
| 1 | `[:contents]` の位置に h2 の目次が出る | T2 + 6.2 grep |
| 2 | 各項目が h2 へのリンクで、クリックで飛べる（日本語含む） | T7 + 6.2 手動 |
| 3 | id が Astro 生成のものと一致（`-1` 追随） | T8 + 6.2 grep |
| 4 | h3 以下は含まれない | T4 + 6.2 `if grep` |
| 5 | `blockquote` / `li` 内の h2 も含まれる | T5 + 6.2 grep |
| 6 | 見出し内の装飾はプレーンテキスト | T6 + 6.2 手動 |
| 7 | コードブロック内は置換されない | T11 + 6.2 個数比較 |
| 8 | 行の一部は文字列のまま残る | T10 + 6.2 個数比較 |
| 9 | h2 が 0 件ならマーカーごと消える | T13 + 6.5 |
| 10 | 2 つ以上ならビルドが落ち、ファイルパスが出る | T14 + 6.5。**訂正（§3.4）**: ファイルパス付きのエラーメッセージがコンソールに出ることは確認できるが、`npm run build` 自体は失敗しない（Astro 5 の Content Layer の仕様、変更不可）。「ビルドが落ちる」は満たさない |
| 11 | `<nav class="toc" aria-label="目次">` / `<p class="toc-title">` の構造 | T2 + 6.2 grep |
| 12 | マーカーなし記事がプラグイン有無で一致 | 6.3 (b) |
| 13 | ランタイム JS が増えていない | 6.2 `<script>` 数比較 |
| 14 | `build` / `check` / `test` が通る | 各 Phase の完了条件 |
| 15 | 検証用記事を削除し `src/content/blog/` が空 | Phase 3 完了条件（`git status`） |

### 6.5 障害シミュレーション

| ケース | 方法 | 期待 |
|---|---|---|
| 複数マーカー | `verify-toc.md` の末尾に `[:contents]` をもう 1 行足して build | `npm run build` は**成功する（終了コード0）**。コンソールに `[ERROR] [glob-loader] Error rendering verify-toc.md: Failed to parse Markdown file "/…/verify-toc.md":`\n`目次マーカー [:contents] は1記事に1つだけ書けます（2箇所あります）` が出る。生成された `dist/blog/verify-toc/index.html` は `<div class="prose"></div>` が空になり、他のページは影響を受けない（§3.4 の訂正） |
| h2 なし | `verify-toc.md` の h2 をすべて h3 に変えて build | 成功。ページに `[:contents]` も `class="toc"` も無い（コードブロック内と段落途中の 2 箇所は残る） |
| プラグイン順序の誤り | `rehypePlugins: [rehypeTocMarker, rehypeHeadingIds]` にして build | 成功するが目次が出ない（T15 と同じ）。**これは「静かに壊れる」ケース**なので、順序を守る理由をコメントに残している（§3.8）。戻す |

---

## 7. リスクと対策

| リスク | 影響 | 対策 |
|---|---|---|
| `rehypePlugins` の順序を後から誰かが入れ替える | 目次が静かに消える | §3.8 のコメント + T15 で順序の前提をテストに固定 |
| Astro の更新で `rehypeHeadingIds` の id 生成（slugger）が変わる | 目次のリンク先が変わる | プラグインは id を生成せず参照するだけなので、見出しと目次は常に一致する。T6〜T8 の固定値は更新時に追随させる |
| Astro の更新で内部の `rehypeHeadingIds` が「id 付きをスキップ」しなくなる | 二重実行で id が `-1` にずれる | 6.3 (b) と T8 で検出できる。起きたら明示配置をやめ、代替（`experimentalHeadingIdCompat` 相当の設定や Astro の `headings` 利用）を再検討 |
| `hast-util-to-string` の版差で `toString` の空白処理が変わる | マーカー判定や見出しテキストが変わる | `trim()` で吸収。版は `^3.0.1` に固定 |
| `.prose p` / `.prose ul` の余白が `.toc` 内に当たる | 箱の中が間延びする | §3.6 で `margin: 0` を明示 |
| 検証用記事の消し忘れ | 意図しない記事が公開される | Phase 3 完了条件と受け入れ条件 15。PR 作成前に `git status` と `ls src/content/blog/` |
| Content Layer のキャッシュに削除した記事が残る（README 既知） | `LocalImageUsedWrongly` でビルド失敗 | 削除後に `rm -rf .astro node_modules/.astro`（§3.10） |
| 複数マーカーの記事があっても `npm run build` が成功してしまう（Astro 5 の Content Layer の仕様。§3.4） | 本文が空の記事が気づかれずに公開される | コンソールにエラーが残ることと、レビュー時に `npm run preview` で目視することが最後の砦。恒久対策（事前スキャン等）は §8 でスコープ外にした |

---

## 8. スコープ外（Issue に加えて本計画で外したもの）

- h3 以下を含む階層目次（Issue「h2 のみ」）
- 目次ラベルの frontmatter 差し替え（Issue「固定」）
- 現在位置の追従（scrollspy）や折りたたみ。クライアント JS を増やすので方針に反する
- `[:contents]` 以外の記法（`[[toc]]` 等）の受け付け
- 複数マーカーの記事で `npm run build` 自体を失敗させるための、Content Collections 外の事前検証ステップ（§3.4）。Astro 5 の Content Layer は記事ごとのレンダリングエラーを内部で吸収し、`astro build` を正常終了させる仕様であることが実装時に判明した。本 Issue では rehype プラグイン単体で完結させる設計を維持し、この恒久対策は別 Issue とする
- 目次マーカーが段落の一部にあるときの警告ログ（Issue「警告も出さない」）
- `src/lib/writing.ts` 等、本 Issue と無関係なファイルの変更

---

## 9. コミットと PR

コミットは Phase 単位。メッセージは既存履歴に合わせて `type: 日本語の説明`。

```
docs: Issue #4 目次機能の実装計画と用語を追加          ← plan/ ブランチ（Phase 0-0）
chore: rehype プラグイン用の依存を追加                  ← 以下 feat/ ブランチ
feat: [:contents] を h2 の目次に置き換える rehype プラグインを追加
feat: 記事本文に目次マーカーを配線し .toc のスタイルを追加
docs: README に目次マーカーの書き方を追記
```

検証用記事（`verify-plain.md` / `verify-toc.md`）は確認後に削除するため、コミットログには残らない。

**計画書の PR**: `plan/issue-4-blog-toc-contents` → `main`。Draft PR。タイトル `[Plan] [:contents]記法によるブログ記事内目次機能`。`CONTEXT.md` の追記を同じ PR に含める。

**実装の PR**: `feat/issue-4-blog-toc` → `main`。本文に §6.3 の diff 結果と §6.4 の表をチェックリストとして貼る。`@types/hast` の追加（Issue の「3 つ」からの追加、§3.7）を明記する。

**Issue への参照は `関連: #4（この PR ではクローズしない）` と書く。`Closes` / `Fixes` / `Resolves` などの自動クローズキーワードは使わない。** Issue のクローズはレビュー通過後に手動で行う（PR #2 での経験から確定した運用）。

実装中に計画から逸脱した点は、実装ブランチ側でこの文書の §10 に「実装時の逸脱」として追記する。

---

## 10. レビュー履歴

### 設計レビュー（grilling、2026-09-11）

Issue #4 の初稿にあった「未確定・要レビュー事項」6 件を、17 問の設計質問で決定事項に置き換えた。決定内容は Issue #4 本文に反映済み。本計画書はその決定を前提に書いている。レビューで実測した事実（`[:contents]` のパース結果、プラグイン順序、日本語 id、引用内 h2、`headings` メタデータ）は Issue の「前提」節に記載。

### 本計画書の作成時に新たに確認した事実（2026-09-11）

- F1: プラグインが throw すると `@astrojs/markdown-remark` がファイルパスを前置する。Issue の「実装時の確認事項」はこれで解消
- F3: `@types/hast` が推移的依存。Issue の 3 パッケージに加えて devDependencies に追加する（§3.7）
- F5: `rehypeHeadingIds` が内部でユーザープラグインの後に登録されているコード上の根拠

### 実装時の逸脱（2026-09-14）

- **ブランチ運用**: §0/§4 Phase 0 は「計画書を `plan/issue-4-blog-toc-contents` で `main` にマージしてから `feat/issue-4-blog-toc` を切る」としていたが、実装は `plan/issue-4-blog-toc-contents`（PR #5）のブランチ上でそのまま行った。`feat/issue-4-blog-toc` は作成していない。理由: ユーザーの明示的な指示。§9 の「実装の PR」は PR #5 への追加コミットに読み替える
- **T6/T7/T8 の期待 id 実測**: `npx tsx` が使えなかったため、計画の `.mts` ではなく素の `.mjs` をプロジェクトルートに一時配置して `node` で直接実行した（スクラッチ領域からは `@astrojs/markdown-remark` の解決に失敗したため）。実測値は計画の見込みと完全に一致（`fetch-の罠` / `はじめに` / `はじめに-1`）。使い捨てスクリプトは commit していない
- **§6.3(a) の正規化パターンの誤り**: 計画の `norm()` は CSS ファイル名を `index\.[hash]\.css` と想定していたが、実際のビルド出力は `_slug_.[hash].css`（ブログ記事ページの entry chunk 名に由来）。正規化パターンをファイル名非依存の形（`_astro/[名前].[hash].css`）に直して diff を取り直し、CSSハッシュ以外の差分が無いことを確認した
- **受け入れ条件10・§3.4・§6.5 の前提の誤り（重要）**: 「複数マーカーで `npm run build` が失敗する」という前提は誤りだった。Astro 5 の Content Layer `glob` ローダー（`node_modules/astro/dist/content/loaders/glob.js` 113〜125行）は記事ごとのレンダリング時の例外を内部で `try/catch` し、`logger.error()` でコンソールに出すだけで `store` への登録・ビルド続行を許す。`GlobOptions`（`glob.d.ts`）にこの挙動を変える設定は無い。実測では `npm run build` は終了コード0で成功し、該当記事の `<div class="prose">` だけが空になる。ユーザーに実装時点で報告し、「文書のみ修正」の方針で合意を得た。恒久対策（ビルドを実際に失敗させる事前検証ステップの追加）は本 Issue のスコープ外とし、§7・§8 に記録した
- 上記以外は計画どおりに実装できた（依存追加、プラグイン実装、テスト16ケース、配線、CSS、検証用記事）
