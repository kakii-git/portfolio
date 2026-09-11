# Issue #1 ブログ機能 実装計画

| 項目 | 内容 |
|---|---|
| 対象 Issue | [kakii-git/portfolio#1 feat: ブログ機能の追加（自サイト記事 + Qiita 集約の統合一覧）](https://github.com/kakii-git/portfolio/issues/1) |
| 前提文書 | `CONTEXT.md`（用語集）/ `docs/adr/0001-blog-as-separate-page.md`（`/blog` 切り出しの判断） |
| 作成日 | 2026-09-04 |
| 作成ブランチ | `plan/issue-1-blog-feature` |
| 実装ブランチ | `feat/issue-1-blog`（`main` から作成済み） |
| 状態 | **Implemented**（2026-09-11）。計画書は PR #2 で `main` にマージ済み。実装は PR #3（`feat/issue-1-blog` → `main`）でレビュー待ち。受け入れ条件12項目は §6.4 の方法で確認済み。実装中に判明した計画の不備4件は §10「実装時の逸脱」に記録した |

この文書は「Issue #1 を実装する人（人間・AI どちらでも）が、Issue と本書だけを読めば迷わず着手できる」ことを目的にする。Issue に書いてある決定事項は繰り返さず参照に留め、**Issue に書かれていない実装者裁量の決定と、コードを読んで確認した事実**を中心に書く。

用語は `CONTEXT.md` に従う。本書でも **ブログ / 記事 / 自サイト記事 / 外部記事 / フィード集約** を使い、UI 文言に「Writing」「投稿」「ポスト」は使わない（既存のファイル名・CSS クラス名 `writing-*` は §3.9 の理由で据え置く）。

### 着手手順の要約（詳細は §4）

0. この計画書を `plan/issue-1-blog-feature` でコミットし、PR で `main` へマージする（§9。現時点で未追跡）
1. `main` で `npm run build` し `dist/` を退避（回帰 diff の before）
2. `feat/issue-1-blog` を切り、`vitest` を導入
3. `Article` に `external` を足し、`blog` コレクションを定義、`writing.ts` に `external: true` を付与
4. `mergeArticles` / `date` をテスト先行で書き、`blog.ts` で統合
5. `Base.astro` に `ogImage` / `ogType`、`/blog/` と `/blog/[slug]/` を追加、本文スタイルと Shiki テーマ
6. `/works` から記事セクションを外し、`Header` に Blog を足し、`Writing.astro` を削除
7. §6.2 / §6.3 / §6.5 で検証（意図した差分は §6.3 の表と一致すること）
8. AI 生成の検証用記事で受け入れ条件を確認し削除、README を整えて PR（Issue 参照は `関連: #1`。自動クローズキーワードは書かない、§9）

---

## 1. ゴールと完了の定義

**ゴール**: `src/content/blog/*.md` を1ファイル足して `main` に push すると、`/blog/` の統合一覧と `/blog/<slug>/` の本文ページが公開される。`/works` は制作物のみのページになる。

**完了の定義**: Issue の受け入れ条件12項目がすべて、§6 の検証手順で確認できていること。各条件と検証方法の対応表を §6.4 に置く。

---

## 2. 現状分析（コードを読んで確認した事実）

Issue の「前提」節は正確だった。加えて、実装に影響する以下を確認した。

| # | 事実 | 実装への影響 |
|---|---|---|
| F1 | Astro **5.18.2**。`render()` は `astro:content` から import する Content Layer API 世代 | `[slug].astro` は `import { render } from "astro:content"` で `<Content />` を得る |
| F2 | glob ローダーの既定 ID は「拡張子を除いたファイル名」を **`github-slugger` で slugify したもの**（`glob.js` の `generateIdDefault` → `utils.js` の `getContentEntryIdAndSlug`）。`Why I Picked Astro.md` → `why-i-picked-astro`。サブディレクトリの `foo/index.md` は `foo` になる。さらに frontmatter に `slug` があればそれが ID を上書きする | ファイル名は最初から小文字ケバブケースで書く運用にする。frontmatter に `slug` を書かない（スキーマ外だが ID 決定はスキーマ検証より前に走る）。`index.md` という名前は `/blog/index/` になり紛らわしいので使わない。README の記事追加手順に明記 |
| F17 | Content Layer の `glob()` ローダーは **先頭が `_` のファイルを無視しない**。`glob.js:169-172` は渡された `pattern` をそのまま `tinyglobby` に渡しており、`globWithUnderscoresIgnored`（`utils.js:612`）が使われるのはレガシーの `src/content/<name>/` 自動検出経路と `vite-plugin-content-virtual-mod.js` だけ。`_draft.md` を置くと slugify でも `_` は残り `/blog/_draft/` として公開される | 「下書き機能は持たない」という Issue の決定はそのまま。README には「`src/content/blog/` 配下の `.md` はファイル名に関わらずすべて公開される（下書きの仕組みは無い）」と書く。`pattern: "**/[^_]*.md"` で `_` を除外する案は Issue のスキーマからの逸脱になるので採らない（§8） |
| F3 | `dist/works/index.html` の `<link rel="canonical">` は `https://kakii.dev/works/`（末尾スラッシュあり）。`Astro.url.pathname` は build 時 `/works/` を返す | `Header.astro` の正規化（末尾スラッシュ除去）は現状維持で `/blog/` 配下判定に流用できる |
| F4 | `global.css` は `inlineStylesheets: "auto"` でも実際は **外部 `<link rel="stylesheet" href="/_astro/index.<hash>.css">`** として出力されている（`dist/works/index.html` で確認） | CSS を1行でも変えると全ページの `<link>` のハッシュが変わる。§6.3 の HTML 回帰 diff ではこの行を正規化して比較する |
| F5 | `Header.astro` は `nav=[]` でも `.menu-btn` と空の `.menu-panel` を出力する。`Base.astro` のスクリプトは `if (btn && panel)` で守られている | Issue どおり `nav.length === 0` で両方を出さなくしてもスクリプトは壊れない |
| F6 | `Base.astro` の `og:image` / `twitter:image` は `SITE.ogImage` 固定。`og:type` は `"website"` 固定 | Issue どおり prop 化する。既定値を現状と同じにすれば既存2ページの出力は変わらない |
| F7 | `Writing.astro` の日付整形 `ym()` は `Timeline.astro` にも同名で重複定義されている | 新規コードは `src/lib/date.ts` に切り出した関数を使う。`Timeline.astro` は触らない（スコープ外、§8） |
| F8 | `src/lib/writing.ts` の `getWriting()` は `out.push({ title, url, date, source })` を2箇所（Atom / RSS）で行う | `external: true` の付与はこの2箇所のオブジェクトリテラルに1プロパティ足すだけで済む。ロジック本体は無変更 |
| F9 | Shiki のバンドルテーマに `github-light` が同梱されている（`node_modules/@shikijs/themes/dist/github-light.mjs`） | `astro.config.mjs` の `markdown.shikiConfig.theme: "github-light"` で追加依存なし |
| F10 | テストランナーは未導入（`vitest` / `tsx` なし）。`package.json` の scripts は dev/build/preview/astro/check のみ | §6.1 で `vitest` を devDependency として追加する（Issue のファイル一覧にない追加。理由は §3.2） |
| F11 | `works.astro` の `<Base description>` は「ka.kii の制作物と記事の一覧。」 | 記事セクションを外すので「ka.kii の制作物の一覧。」に直す。これは受け入れ条件7「記事セクションの削除を除いて HTML が変わらない」の文面からの逸脱だが、旧文言が事実と食い違うため変更する（ユーザー承認済み、§10 U-3）。`/works` の HTML 差分として §6.3 で **意図した差分**に数え、PR 本文にも条件7の例外として明記する |
| F12 | `README.md` 冒頭が「2ページ構成」、構成ツリーに `lib/writing.ts`、「よくある編集」に記事フィードの項がある | 3ページ構成へ書き換え、`content/blog/` `lib/blog.ts` `pages/blog/` を追記、記事追加手順を新設 |
| F13 | `.gitignore` に `dist/` が入っている | 回帰 diff 用のビルド成果物はスクラッチ領域へ退避する（§6.3） |
| F14 | クライアント JS は `Base.astro` の1本だけで、build 後は各 HTML に **インラインの `<script type="module">` が1つ**入る。`dist/_astro/` に `.js` は無い | 「クライアント JS が増えていない」は `<script` の出現数が全ページで1、かつ `dist/_astro/*.js` が0件、で機械確認できる（§6.2） |
| F15 | `.fade` の非表示は `@media (prefers-reduced-motion: no-preference)` かつ `html.js` 配下でのみ効く（`global.css:820-830`） | 本文ページに `.fade` を付けても JS オフ・reduced-motion では最初から表示される。追加対応不要 |
| F16 | Content Layer の Markdown 本文中で相対パス参照した画像（`![](./foo.png)`）は Astro が最適化して出力する | frontmatter の `image` と本文中の画像を同じ階層に置けばよい。README の記事追加手順に一言添える |

---

## 3. 設計判断（Issue に書かれていない実装者裁量分）

Issue の「決定事項」「スキーマ」「ファイル別の変更内容」はそのまま採用する。ここでは Issue が「実装者の裁量」としたもの、または Issue に書かれていないが決めないと着手できないものを決める。

### 3.1 `Article` 型の最終形

```ts
// src/types.ts
export interface Article {
  title: string;
  url: string;          // 外部記事: 絶対 URL / 自サイト記事: "/blog/<slug>/"
  date: Date;
  source: string;       // 外部記事: FEEDS[].source / 自サイト記事: POST_SOURCE
  image?: string;       // 外部記事: og:image の URL / 自サイト記事: 最適化後の画像パス
  external: boolean;    // true なら target="_blank" rel="noopener" と ↗ を付ける
}
```

- `image` は**両者とも `string`（URL / パス）に揃える**。自サイト記事の `ImageMetadata` は `src/lib/blog.ts` の中で `getImage()` に通してパス文字列へ変換する。一覧カードが既存の `<img src>` をそのまま使えるようにするため。
- `source` の自サイト記事側の値 `"kakii.dev"` は `src/consts.ts` に `POST_SOURCE` として置く（文言は consts に集約する既存方針）。
- **`description` は `Article` に持たせず、一覧カードにも出さない。** Issue のスキーマ表は `description` の用途に「一覧カードの補足」も挙げているが、外部記事側に対応するフィールドが無く（フィードの summary は取り込んでいない）、カードに出すと自サイト記事だけ段が増えて `.writing-*` の CSS 変更が必要になる。`description` の用途は本文ページの `<meta name="description">` と `og:description` に限定する（§3.5）。カード表示は §8 のスコープ外に置く。

### 3.2 `src/lib/blog.ts` の責務分割とテスト方針

`astro:content` / `astro:assets` に依存するコードは Vite の仮想モジュール越しでしか動かないため、**マージとソートの純粋関数を別ファイルに切り出し、そこだけを単体テストする**。

| ファイル | 責務 | テスト |
|---|---|---|
| `src/lib/mergeArticles.ts` | `mergeArticles(...lists: readonly (readonly Article[])[]): Article[]`。引数を変更せず、日付降順の新しい配列を返す。同日付の順序は入力順を保つ（`Array.prototype.sort` は安定） | `vitest` で単体テスト（§6.1） |
| `src/lib/blog.ts` | `getBlogArticles(): Promise<Article[]>`。`getWriting()` と `getCollection("blog")` を並行取得し、自サイト記事を `Article` に変換して `mergeArticles` に渡す | ビルド検証で担保（§6.2） |

グローバル開発ルール（TDD・80% カバレッジ）に従うための最小構成として `vitest` を devDependency に加える。クライアント JS には影響しない。Issue の受け入れ条件「クライアント JS が増えていない」に抵触しない。

- テスト対象は `astro:*` を import しない純粋関数だけなので、**`vitest.config.ts` は作らない**（既定で `**/*.test.ts` を拾う）。将来 `astro:content` を使うテストが必要になったときに初めて `astro/config` の `getViteConfig()` でラップする。
- `tsconfig.json` の `include` は `**/*` なので `*.test.ts` も `astro check` の型検査対象になる。`vitest` が devDependency にあれば型は解決する。
- カバレッジ計測（`@vitest/coverage-v8`）は任意。対象2ファイルは分岐がほぼ無く、ケース列挙で 100% になる。

### 3.3 日付整形

`src/lib/date.ts` を新設する。

```ts
export const formatYearMonth = (d: Date) =>
  `${d.getUTCFullYear()}.${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
export const formatDate = (d: Date) =>
  `${formatYearMonth(d)}.${String(d.getUTCDate()).padStart(2, "0")}`;
export const toIsoDate = (d: Date) => d.toISOString().slice(0, 10); // <time datetime> 用
```

- **UTC getter を使う**。`z.coerce.date()` は `2026-09-04` を UTC 0時として解釈するため、ローカル getter だと UTC より西のタイムゾーンで前日に化ける。Cloudflare Pages のビルドは UTC なので現状は顕在化していないが、新規コードでは塞いでおく。テストは `TZ=America/Los_Angeles npm test` でも通ることを一度確認する。
- 同じ日の外部記事と自サイト記事が並ぶ場合、外部記事は時刻付き、自サイト記事は UTC 0時なので**自サイト記事が後ろ（古い側）**に並ぶ。日単位の精度で運用する以上これは許容する（Issue の「日付降順」を満たす）。
- 本文ページの日付は **`YYYY.MM.DD`** まで出す（Issue が裁量とした部分）。一覧は既存どおり `YYYY.MM`。
- `Timeline.astro` の `ym()` はこの関数に置き換えない（スコープ外）。

### 3.4 OGP 画像の URL 生成（`/blog/<slug>/`）

```ts
// [slug].astro frontmatter
const ogImage = post.data.image
  ? (await getImage({ src: post.data.image, width: 1200, format: "png" })).src
  : undefined;
```

- `format: "png"` を明示する。既定の WebP は X（Twitter）カードで表示されない環境がある。
- `getImage().src` は build 時 `/_astro/<name>.<hash>.png`、dev 時 `/_image?href=...` のサイト相対パスになる。絶対 URL 化は `Base.astro` 側で `new URL(ogImage ?? SITE.ogImage, Astro.site)` として一箇所で行う。

### 3.5 `Base.astro` の prop

```ts
interface Props {
  title?: string;
  description?: string;
  ogImage?: string;                 // サイト相対パス or 絶対 URL。未指定なら SITE.ogImage
  ogType?: "website" | "article";   // 未指定なら "website"
}
```

`description` が未指定のときは従来どおり `SITE.description` にフォールバックする。自サイト記事で `description` を省略した場合、`<meta name="description">` はサイト説明文になる。本文からの自動抜粋は行わない（それを望むなら frontmatter に書く、という運用にする）。

`[slug].astro` は画像のない記事で `ogImage={undefined}` を**明示的に渡す**形になるが、分割代入の既定値は `undefined` に対して適用されるので `SITE.ogImage` に落ちる。`null` を渡すと既定値が効かないので、`blog.ts` / `[slug].astro` では `undefined` に統一する。

### 3.6 `Header.astro` のアクティブ判定

```ts
const path = Astro.url.pathname.replace(/\/+$/, "") || "/";
const siteNav = [
  { label: "Home",  href: "/",      current: path === "/" },
  { label: "Works", href: "/works", current: path === "/works" },
  { label: "Blog",  href: "/blog",  current: path === "/blog" || path.startsWith("/blog/") },
];
```

`/works/interference/` は `public/` 素通しの生 HTML で `Header` を使わないため、Works 側の判定は完全一致のままでよい。

### 3.7 `/blog/` 一覧ページのレイアウト

- `Works` ページと同じ **`.section` スキャフォールド**（`sec-num` 列 + `sec-head`）を使い、番号は `00` を置く。`PageIndex` は置かず `Header` に `nav={[]}` を渡す（Issue どおり）。
- 見出しは `CONTEXT.md` に従い **「ブログ」+ 英字 `Blog`**（既存の「記事 / Writing」は使わない）。
- カードのマークアップは `Writing.astro` のものを移設し、リンク部分だけ `external` で出し分ける:

```astro
<a class="writing-title" href={a.url}
   {...a.external ? { target: "_blank", rel: "noopener" } : {}}>
  {a.title}
  {a.external && <span class="arrow">↗</span>}
</a>
```

- 0件文言: 「記事はまだありません。」（Qiita の新着はビルド時に反映される旨は README に書き、UI には出さない。自サイト記事がある以上「Qiita に投稿すると〜」は説明として不正確になるため）。

### 3.8 `/blog/<slug>/` 本文ページのレイアウト

```
<main class="container">
  <article class="post fade">
    <header class="post-head">
      <time class="post-date" datetime="2026-09-04">2026.09.04</time>
      <h1 class="post-title">…</h1>
    </header>
    <div class="prose"><Content /></div>
    <a class="post-back" href="/blog/">← ブログ一覧へ</a>
  </article>
</main>
```

- `.section` スキャフォールドは使わない（`sec-num` 列が本文の横幅を食う）。本文の最大幅は `--maxw` より狭い読みやすい幅（目安 720px）を `.post` に設ける。中央寄せはせず `.container` の左端に揃える（既存ページはすべて左揃えの構図）。
- 本文スタイルは `.prose` 配下にスコープする。Shiki は `<pre class="astro-code github-light" style="background-color:#fff;color:#24292e">` のようにインラインで色を出すので、`.prose pre` では **色を上書きせず**、余白・罫線・`overflow-x: auto` のみ指定する。
- 見出しは `h2` / `h3` まで（Issue の指定）。`h1` は記事タイトルのみ。

### 3.9 `writing` という名前の据え置き

`CONTEXT.md` は「Writing」を避ける語としているが、`src/lib/writing.ts` と `.writing-*` クラスは Issue が明示的に「作り直さない」「そのまま使う」としているため据え置く。**UI 文言と新規ファイル名にだけ `CONTEXT.md` の語彙を適用**する。リネームは別 Issue（§8）。

### 3.10 `src/content/blog/` が空のときの扱い

ディレクトリ自体が無いと glob ローダーが警告を出すため、`src/content/blog/.gitkeep` を置く。記事が0件でも `getCollection("blog")` は空配列を返し、`/blog/` は0件文言、`/blog/<slug>/` はパスを生成しない（`getStaticPaths` が空配列）。ビルドは成功する。

### 3.11 初回記事の扱い（ユーザー指示により確定）

受け入れ条件1・2・3・6・10・11 は自サイト記事が1本ないと確認できない。**AI が生成する検証用の仮記事**（例: `src/content/blog/verify-post.md`）を使い、確認後に削除する方針を採る。

1. Phase 6 で短い仮記事を1本生成する。コードブロックを1つ含め、受け入れ条件11（明るいテーマでハイライト）も同時に確認できるようにする
2. §6.2 のビルド検証で対象の受け入れ条件を確認する
3. 確認後、仮記事（画像を添えていれば画像も）を削除し、`npm run build` が0件でも成功することを再確認する
4. 仮記事は **commit しない**。作業ツリー上で作成・確認・削除まで完結させる

この方針により、`main` にマージされる時点の `/blog/` は自サイト記事0件（外部記事のみ、または外部記事も0件なら空一覧）になる。ユーザーが実際に書く最初の記事は、この Issue の対応後に別途 push する。

---

## 4. 実装フェーズ

依存順に並べる。各フェーズは単独でコミットでき、`npm run check` と `npm run build` が通る状態を保つ。

### Phase 0: ベースライン確保

0. **計画書を `main` に入れる**（完了済み: PR #2）。着手時点で `design-docs-for-ai/` は未追跡だった。`plan/issue-1-blog-feature` 上で `git add design-docs-for-ai/` → `docs: Issue #1 ブログ機能の実装計画を追加` でコミット → push → PR → `main` へマージする。置き場所は `design-docs-for-ai/` のまま（AI 向け設計文書の置き場として新設。人間向けの `docs/adr/` とは分ける）
1. `main` を pull し `npm run build` して、`dist/` をスクラッチ領域へ `before/` として退避（§6.3）
2. `main` から `feat/issue-1-blog` を切る
3. `npm i -D vitest` と `package.json` に `"test": "vitest run"` を追加（設定ファイルは作らない、§3.2）

**完了条件**: `git log main -- design-docs-for-ai/` に計画書のコミットがある。`npm test` が成功する（テスト0件のときは `--passWithNoTests` を付けて確認）。`npm run check` が通る。

### Phase 1: 型・スキーマ・既存ローダーの最小変更

| 順 | ファイル | 変更 |
|---|---|---|
| 1 | `src/types.ts` | `Article` を移設し `external: boolean` を追加（§3.1） |
| 2 | `src/consts.ts` | `POST_SOURCE = "kakii.dev"` を追加 |
| 3 | `src/lib/writing.ts` | `Article` を `../types` から import。2箇所の `out.push({...})` に `external: true` を追加。`export interface Article` を削除 |
| 4 | `src/content.config.ts` | `blog` コレクションを追加し `collections` に登録。i18n を踏襲しない理由をコメントに明記（Issue の指示） |
| 5 | `src/content/blog/.gitkeep` | 追加（§3.10） |

**完了条件**: `npm run check` が通る。`Writing.astro` はこの時点ではまだ存在し、`external` を無視して動く。

### Phase 2: 統合ロジック（TDD）

| 順 | ファイル | 変更 |
|---|---|---|
| 1 | `src/lib/mergeArticles.test.ts` | **先に書く**（RED）。ケース: 日付降順 / 複数リストの混在 / 同日付は入力順 / 空リスト / 引数配列を変更しない |
| 2 | `src/lib/mergeArticles.ts` | 実装（GREEN） |
| 3 | `src/lib/date.ts` + `src/lib/date.test.ts` | `formatYearMonth` / `formatDate` / `toIsoDate`。UTC 境界のケースを含める |
| 4 | `src/lib/blog.ts` | `getBlogArticles()`（§3.2）。自サイト記事の `image` は `getImage({ src, width: 800 })` でパス化 |

**完了条件**: `npm test` が通る。`npm run check` が通る。

### Phase 3: 新規ページとレイアウト

| 順 | ファイル | 変更 |
|---|---|---|
| 1 | `src/layouts/Base.astro` | `ogImage` / `ogType` prop（§3.5）。既定値は現状の出力と同じ |
| 2 | `src/pages/blog/index.astro` | 統合一覧（§3.7）。カードのマークアップを `Writing.astro` から移設 |
| 3 | `src/pages/blog/[slug].astro` | `getStaticPaths` + `render()`（§3.8, §3.4） |
| 4 | `src/styles/global.css` | `.post-*` と `.prose` の本文スタイルを追加。`.writing-*` は**変更しない**（↗ は `<span class="arrow">` 自体を条件描画するので、Issue が言う「出し分け調整」はマークアップ側で完結し CSS は不要） |
| 5 | `astro.config.mjs` | `markdown: { shikiConfig: { theme: "github-light" } }` |

この時点で `/works` にはまだ旧 `Writing` セクションが残っている（同じ記事一覧が2箇所に出る状態）。次フェーズで解消する。

**完了条件**: `npm run build` で `dist/blog/index.html` が生成される（記事0件でも）。`npm run check` が通る。

### Phase 4: 既存ページの整理

| 順 | ファイル | 変更 |
|---|---|---|
| 1 | `src/pages/works.astro` | `Writing` の import と描画を削除。`sections` から `writing` を削除。`description` を「ka.kii の制作物の一覧。」に変更（F11） |
| 2 | `src/components/Header.astro` | `Blog` を `siteNav` に追加（§3.6）。`nav.length === 0` なら `.menu-btn` と `.menu-panel` を出さない。`/` と `/works` は非空の `nav` を渡しているので、この条件分岐で両ページの出力は変わらない |
| 3 | `src/components/Writing.astro` | 削除 |

**完了条件**: `npm run build` と `npm run check` が通る。`grep -r "Writing.astro" src` が0件。

### Phase 5: 検証

1. §6.2 のビルド検証スクリプトを実行する
2. §6.3 の HTML 回帰 diff を取り、差分が「意図した差分一覧」と一致することを確認する
3. §6.5 の障害シミュレーション3ケースを実行し、`src/consts.ts` を元に戻す

**完了条件**: 上記3つがすべて期待どおり。`git status` に `consts.ts` の一時変更が残っていない。

### Phase 6: 検証用記事での確認と README

| 順 | ファイル | 変更 |
|---|---|---|
| 1 | `src/content/blog/verify-post.md` | AI が生成する検証用の仮記事（§3.11）。コードブロックを1つ含める |
| 2 | §6.2 を実行 | 記事あり状態で受け入れ条件1・2・3・6・10・11 を確認 |
| 3 | `src/content/blog/verify-post.md` | 確認後に削除する。`npm run build` が0件でも成功することを再確認（受け入れ条件8） |
| 4 | `README.md` | 3ページ構成 / 構成ツリー / 「記事を書く」手順（frontmatter 例、slug の決まり方、`slug` frontmatter を書かない注意、`src/content/blog/` の `.md` はファイル名に関わらずすべて公開される（F17）、画像は `.md` と同階層に置けば frontmatter・本文どちらからも最適化される（F16）） |

**検証用記事は commit しない。** 作業ツリー上で作成 → §6.2 確認 → 削除、まで完結させてからコミットする。

**完了条件**: `git status` に `verify-post.md` が残っていない。`npm run build` が記事0件のまま成功する。README が更新されている。

---

## 5. ファイル別の変更詳細

Issue の「ファイル別の変更内容」に対する差分（本計画で増えたもの）を先に示す。

| ファイル | 種別 | Issue との関係 |
|---|---|---|
| `src/lib/mergeArticles.ts` `.test.ts` | 新規 | Issue にない。§3.2（テスト可能にするための分割） |
| `src/lib/date.ts` `.test.ts` | 新規 | Issue にない。§3.3 |
| `src/content/blog/.gitkeep` | 新規 | Issue にない。§3.10 |
| `package.json` | 変更 | Issue にない。`vitest` の追加と `test` スクリプトのみ。設定ファイル（`vitest.config.ts`）は作らない（§3.2） |
| `src/consts.ts` | 変更 | Issue にない。`POST_SOURCE` のみ |

以下、主要ファイルのスケッチ。

### 5.1 `src/content.config.ts`

```ts
const blog = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/blog" }),
  // 既存の timeline / works は { ja, en } の i18n を使うが、blog は踏襲しない。
  // あれは短いラベルだから併記できているのであって、本文が日本語のみのブログは
  // タイトルだけ英訳しても記事が読めず意味がないため、title は素の string にする。
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      date: z.coerce.date(),           // 日付の唯一の情報源。ファイル名に日付は付けない
      description: z.string().optional(),
      image: image().optional(),       // Markdown と同階層に置く（works と同じ流儀）
    }),
});

export const collections = { timeline, certifications, works, blog };
```

### 5.2 `src/lib/mergeArticles.ts`

```ts
import type { Article } from "../types";

/** 複数の記事リストを日付降順で1本にまとめる。引数は変更しない。同日付は入力順。 */
export function mergeArticles(...lists: readonly (readonly Article[])[]): Article[] {
  return lists.flat().sort((a, b) => b.date.getTime() - a.date.getTime());
}
```

### 5.3 `src/lib/blog.ts`

```ts
import { getCollection, type CollectionEntry } from "astro:content";
import { getImage } from "astro:assets";
import { getWriting } from "./writing";
import { mergeArticles } from "./mergeArticles";
import { POST_SOURCE } from "../consts";
import type { Article } from "../types";

export const postPath = (id: string) => `/blog/${id}/`;

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
```

### 5.4 `src/pages/blog/index.astro`

```astro
---
import Base from "../../layouts/Base.astro";
import Header from "../../components/Header.astro";
import Footer from "../../components/Footer.astro";
import { getBlogArticles } from "../../lib/blog";
import { formatYearMonth } from "../../lib/date";

const articles = await getBlogArticles();
---
<Base title="Blog — ka.kii" description="ka.kii が書いた記事の一覧。自サイトの記事と Qiita の記事を日付順に並べる。">
  <Header nav={[]} />
  <main class="container">
    <section class="section fade" id="blog">
      <div class="sec-num">00</div>
      <div>
        <header class="sec-head">
          <h2 class="sec-title">ブログ<span class="sec-title-en">Blog</span></h2>
        </header>
        {articles.length === 0 ? (
          <p class="contact-note">記事はまだありません。</p>
        ) : (
          <div class="writing-grid">
            {articles.map((a) => (
              <article class="writing-card">
                <div class="writing-thumb">{a.image && <img src={a.image} loading="lazy" alt="" />}</div>
                <div class="writing-meta">
                  <span class="writing-date">{formatYearMonth(a.date)}</span>
                  <span class="badge">{a.source}</span>
                </div>
                <a class="writing-title" href={a.url} {...(a.external ? { target: "_blank", rel: "noopener" } : {})}>
                  {a.title}
                  {a.external && <span class="arrow">↗</span>}
                </a>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  </main>
  <Footer />
</Base>
```

0件文言に `.contact-note` を流用するのは旧 `Writing.astro` と同じ。

### 5.5 `src/pages/blog/[slug].astro`

```astro
---
import { getCollection, render } from "astro:content";
import { getImage } from "astro:assets";
import type { InferGetStaticPropsType } from "astro";
import Base from "../../layouts/Base.astro";
import Header from "../../components/Header.astro";
import Footer from "../../components/Footer.astro";
import { formatDate, toIsoDate } from "../../lib/date";

export async function getStaticPaths() {
  const posts = await getCollection("blog");
  return posts.map((post) => ({ params: { slug: post.id }, props: { post } }));
}
type Props = InferGetStaticPropsType<typeof getStaticPaths>;

const { post } = Astro.props;
const { Content } = await render(post);
const ogImage = post.data.image
  ? (await getImage({ src: post.data.image, width: 1200, format: "png" })).src
  : undefined;
---
<Base title={`${post.data.title} — ka.kii`} description={post.data.description}
      ogImage={ogImage} ogType="article">
  <Header nav={[]} />
  <main class="container">
    <article class="post fade">
      <header class="post-head">
        <time class="post-date" datetime={toIsoDate(post.data.date)}>{formatDate(post.data.date)}</time>
        <h1 class="post-title">{post.data.title}</h1>
      </header>
      <div class="prose"><Content /></div>
      <a class="post-back" href="/blog/">← ブログ一覧へ</a>
    </article>
  </main>
  <Footer />
</Base>
```

### 5.6 `src/layouts/Base.astro`（差分のみ）

```ts
interface Props {
  title?: string;
  description?: string;
  ogImage?: string;
  ogType?: "website" | "article";
}
const {
  title = SITE.title,
  description = SITE.description,
  ogImage: ogImagePath = SITE.ogImage,
  ogType = "website",
} = Astro.props;
const ogImage = new URL(ogImagePath, Astro.site).href;
```

テンプレート側は `<meta property="og:type" content={ogType} />` に置き換えるだけ。他の行は触らない。

### 5.7 `src/styles/global.css`（追加ブロックの見出しのみ）

```
/* ───────────────────────── Blog post ───────────────────────── */
.post { max-width: 720px; padding: 88px 0 104px; }
.post-head, .post-date, .post-title, .post-back
/* ───────────────────────── Prose ───────────────────────── */
.prose h2, .prose h3, .prose p, .prose ul, .prose ol, .prose li,
.prose a (下線 + hover で --blue),
.prose pre (padding / border: 1px solid var(--hairline) / overflow-x: auto / 色は Shiki のインラインに任せる),
.prose :not(pre) > code (インライン: 背景 --hairline 薄め / font-size 0.9em),
.prose blockquote (左罫線 --hairline / color --ink-2),
.prose img (max-width: 100%; height: auto),
.prose hr (border-top: 1px solid var(--hairline)),
.prose table { display: block; overflow-x: auto; }（tr/td は匿名テーブルボックスとして描画されるので崩れない。remark でラッパーを足す方法は依存が増えるので採らない）
```

既存トークン（`--bg` `--ink*` `--blue` `--hairline`）のみ使い、新しい色は導入しない。`@media (max-width: 480px)` で `.post` の上下余白を詰める。

---

## 6. テスト・検証計画

### 6.1 単体テスト（vitest）

- 対象: `src/lib/mergeArticles.ts` / `src/lib/date.ts`（純粋関数）
- 実行: `npm test`
- ケース一覧は Phase 2 参照。カバレッジはこの2ファイルで 100% を目標とする（分岐がほぼないため）

### 6.2 ビルド検証（受け入れ条件の機械確認）

`npm run build` 後に以下を確認するシェルスクリプトをスクラッチ領域に置いて実行する（リポジトリには入れない）。

```bash
set -eu
shopt -s nullglob  # 記事0件のとき `$D/blog/*/index.html` がグロブ未展開のまま渡って落ちるのを防ぐ（bash 前提）
D=dist
test -f $D/blog/index.html                                        # 1: 一覧が生成される
for p in $D/index.html $D/works/index.html $D/blog/index.html; do
  grep -q 'href="/blog"' "$p"                                     # 5: 全ページのヘッダーに Blog
done
grep -q 'href="/blog" aria-current="page"' $D/blog/index.html     # 5: /blog でアクティブ
# 4: /works に記事セクションなし。`! grep` は set -e の対象外で失敗しても止まらないので明示的に落とす
if grep -q 'id="writing"' $D/works/index.html; then echo "NG: /works に記事セクションが残っている"; exit 1; fi
grep -q '<loc>https://kakii.dev/blog/</loc>' $D/sitemap-0.xml     # 10: sitemap に /blog/
# 12: クライアント JS が増えていない（F14）。public/ 素通しの生 HTML は対象外
for p in $(find $D -name index.html -not -path '*/works/interference/*'); do
  [ "$(grep -c '<script' "$p")" = 1 ] || echo "NG: $p の <script> が1つでない"
done
[ -z "$(ls $D/_astro/*.js 2>/dev/null)" ]                         # 外部 JS が出ていない
# 記事ありのときのみ
for p in $D/blog/*/index.html; do
  grep -q 'href="/blog" aria-current="page"' "$p"                 # 5: 記事ページでもアクティブ
  grep -q 'property="og:type" content="article"' "$p"             # 6
  grep -q 'property="og:image" content="https://kakii.dev/' "$p"  # 6: 絶対 URL になっている
  slug=$(basename "$(dirname "$p")")
  grep -q "<loc>https://kakii.dev/blog/$slug/</loc>" $D/sitemap-0.xml   # 10
  grep -q 'class="astro-code github-light"' "$p" || echo "note: $p にコードブロックなし"  # 11
done
```

`public/works/interference/index.html` は Astro を通らない生 HTML で `<script>` を複数持つため、12 の確認から除外している。

手動確認:
- 自サイト記事のカードに `target="_blank"` と `↗` が無い / 外部記事にはある（`dist/blog/index.html` で `href="/blog/` を含む `<a>` に `target` が無いこと）
- `og:image` が記事固有（`https://kakii.dev/_astro/...png`）または既定（`https://kakii.dev/og-image.png`）
- コードブロックが明るい背景で描画される（`npm run preview` で目視）

### 6.3 HTML 回帰 diff（`/` と `/works` が変わっていないこと）

```bash
S=<scratchpad>
# before: main で build → $S/before  / after: 実装ブランチで build → $S/after
norm() { sed -E 's#/_astro/index\.[A-Za-z0-9_-]+\.css#/_astro/index.HASH.css#g' "$1"; }
diff <(norm $S/before/index.html)       <(norm $S/after/index.html)
diff <(norm $S/before/works/index.html) <(norm $S/after/works/index.html)
```

**意図した差分一覧**（これ以外が出たら調査する）:

| ページ | 差分 |
|---|---|
| `/` `/works` 共通 | `<nav class="site-nav">` に `<a href="/blog">Blog</a>` が増える |
| `/works` | `<section id="writing">…</section>` が消える |
| `/works` | `.page-index` と `.menu-panel` から「01 記事」が消える |
| `/works` | `<meta name="description">` `og:description` `twitter:description` が「ka.kii の制作物の一覧。」になる（受け入れ条件7の文面からの逸脱。F11・§10 U-3） |

外部記事の `og:image` はビルドごとに変わり得るが、`/works` の after 側に記事セクションが無いので diff に影響しない。`Footer` の年は同日中の比較なら一致する。

### 6.4 受け入れ条件と検証方法の対応

| # | 受け入れ条件（Issue） | 検証 |
|---|---|---|
| 1 | Markdown 1つで `/blog/` と `/blog/<slug>/` が生成 | 6.2 `test -f` |
| 2 | 外部記事と自サイト記事が日付降順で混在、badge で識別 | 6.1（順序）+ 6.2 手動 |
| 3 | 自サイト記事は新タブで開かず ↗ なし | 6.2 手動 |
| 4 | `/works` は制作物のみ | 6.2 `id="writing"` が無いことの `if grep` 判定 |
| 5 | ヘッダー3項目、`/blog` 配下でアクティブ | 6.2 grep |
| 6 | `og:image` が記事固有 / 既定 | 6.2 手動 |
| 7 | `/` `/works` の HTML が変わらない | 6.3。差分が「意図した差分一覧」と一致すれば合格。`/works` の description 変更は Issue にない逸脱として PR 本文に明記する（U-3） |
| 8 | 記事0件 / Qiita 停止でもビルド成功 | §6.5 |
| 9 | `astro check` | `npm run check` |
| 10 | sitemap に `/blog/` と記事 URL | 6.2 grep |
| 11 | コードブロックが明るいテーマ | 6.2 grep + 目視 |
| 12 | クライアント JS が増えていない | 6.2 `<script>` 数比較（`Base.astro` のみ = 1） |

※1・2・3・6・10・11 は Phase 6 の検証用仮記事（AI 生成、確認後に削除）で確認する。`main` にマージされた時点のリポジトリには残らない（§3.11）。

### 6.5 障害シミュレーション

| ケース | 方法 | 期待 |
|---|---|---|
| 自サイト記事0件 | `src/content/blog/` を `.gitkeep` のみにして build | 成功。`/blog/` に0件文言（Qiita が生きていれば外部記事のみ表示） |
| Qiita 停止 | `src/consts.ts` の `FEEDS[0].url` を一時的に `https://127.0.0.1:9/` に変えて build | 成功。`[writing] Qiita: fetch failed` の警告のみ。`/blog/` に自サイト記事のみ |
| 両方ゼロ | 上記2つを同時に | 成功。`/blog/` に0件文言 |

`consts.ts` の変更は確認後に必ず戻す（`git diff src/consts.ts` が `POST_SOURCE` の追加だけであること）。

---

## 7. リスクと対策

| リスク | 影響 | 対策 |
|---|---|---|
| `getImage()` を `.ts` モジュールから呼ぶと dev と build で `src` の形が違う | OGP の URL が dev で `/_image?...` になる | 絶対 URL 化を `Base.astro` に集約（§3.4）。本番の確認は `npm run build && npm run preview` で行う |
| ファイル名に大文字・空白を使うと slugify で URL が変わる（F2） | 想定 URL と一致しない | README で「小文字ケバブケースで命名」を明記 |
| frontmatter に `slug` を書くと ID が上書きされる（F2） | 意図しない URL | README で禁止を明記。将来的に `generateId` で無効化する選択肢を残す |
| Shiki のインライン色と `.prose` の指定が衝突 | コードが読めない配色 | `.prose pre` では色を指定しない（§3.8） |
| `.fade` を本文ページに付けると JS オフで表示されない懸念 | — | F15 で確認済み。`html.js .fade` でのみ非表示なので JS オフでは表示される。変更不要 |
| CSS のハッシュ変動で回帰 diff がノイズだらけになる（F4） | 差分の見落とし | §6.3 の正規化 |
| `works.astro` の description 変更が「HTML が変わらない」条件に反して見える | レビュー時の混乱 | §6.3 の意図した差分一覧に明記済み |

---

## 8. スコープ外（Issue に加えて本計画で外したもの）

Issue の「やらないこと」に加えて:

- `Timeline.astro` の `ym()` を `src/lib/date.ts` に置き換えるリファクタ
- `src/lib/writing.ts` / `.writing-*` クラスの `CONTEXT.md` 語彙へのリネーム（§3.9）
- `writing.ts` 内の `a.image = ...` という既存のミューテーション修正（Issue が「作り直さない」と明示）
- `description` 未指定時の本文からの自動抜粋（§3.5）
- frontmatter `slug` の `generateId` による無効化（README の注意書きで代替）
- 一覧カードへの `description` 表示（§3.1。外部記事に対応する値が無く、カードの CSS 変更も要るため）
- `pattern: "**/[^_]*.md"` による `_` 始まりファイルの除外（F17。Issue のスキーマからの逸脱になり、下書き機能を持たない方針とも噛み合わない）

---

## 9. コミットとPR

コミットは Phase 単位。メッセージは既存履歴に合わせて `type: 日本語の説明`。

```
chore: vitest を導入
feat: Article 型に external を追加し blog コレクションを定義
feat: 記事の統合ロジック src/lib/blog.ts を追加
feat: /blog/ 一覧と /blog/[slug]/ 本文ページを追加
refactor: /works から記事セクションを外し Header に Blog を追加
docs: README にブログの構成と記事の追加手順を追記
```

Phase 6 の検証用記事（`verify-post.md`）は確認後に削除するため、コミットログには残らない。

PR は `feat/issue-1-blog` → `main`。本文に §6.3 の diff 結果と §6.4 の表をチェックリストとして貼る。

**Issue への参照は `関連: #1（この PR ではクローズしない）` と書く。`Closes` / `Fixes` / `Resolves` などの自動クローズキーワードは使わない。** GitHub はこれらを検出するとマージ時に Issue を自動クローズするため、レビューの結果を待たずに Issue が閉じてしまう。Issue のクローズはレビュー通過後に手動で行う。この運用は PR #2 で意図しない自動クローズが起きた際に確定した。

本計画書は PR #2 で `main` にマージ済み（実装中に計画書と実装が同じブランチで混ざらないようにするため、先に入れた）。実装中に計画から逸脱した点は、実装ブランチ側でこの文書の §10 に「実装時の逸脱」として追記する — 実際に4件あり、記録済み。

PR 本文には、受け入れ条件7の例外として `/works` の description 変更（U-3）を明記する。

---

## 10. レビュー履歴

自己レビューを3回実施し、各回の指摘と反映を記録する。

### レビュー1: Astro API とコードベースに対する正確性

| # | 指摘 | 反映 |
|---|---|---|
| R1-1 | §6.2 の `grep -q A B` は「いずれかに一致」で成功してしまい、`/` と `/works` の両方にヘッダーが出たことを確認できない | ファイルごとにループする形へ書き換え。受け入れ条件番号をコメントに付けた |
| R1-2 | 「クライアント JS が増えていない」の確認方法が曖昧だった | `dist/index.html` を確認し、インライン `<script type="module">` が1つ・外部 `.js` が0件であることを F14 として記録。§6.2 に機械確認を追加。`public/works/interference/` の生 HTML は除外 |
| R1-3 | `.fade` の JS オフ時の挙動を未検証のまま「変更不要」と書いていた | `global.css:820-830` を確認し F15 として記録。リスク表を「確認済み」に修正 |
| R1-4 | `vitest.config.ts` を `getViteConfig()` でラップする案は、テスト対象が純粋関数だけなのに Astro 設定（sitemap / icon / reconHeaders）をテスト起動のたびに読み込むことになり過剰 | 設定ファイルを作らない方針に変更（§3.2, Phase 0）。`astro check` がテストファイルも型検査する点を追記 |
| R1-5 | `src/pages/blog/index.astro` のスケッチが無く、`external` の出し分けと0件文言の置き場所が §3.7 の断片からしか読めなかった | §5.4 に全体スケッチを追加。以降の節番号を繰り下げ |
| R1-6 | Markdown 本文中の相対パス画像が最適化される点が README 手順に落ちていなかった | F16 として記録し、Phase 6 の README 項目に反映 |

### レビュー2: 受け入れ条件の網羅性・手順の順序・リスク

| # | 指摘 | 反映 |
|---|---|---|
| R2-1 | F2 の「slugify される」を根拠なしに断定していた | `utils.js:283-297` を確認。`github-slugger` 使用、`foo/index.md` → `foo`、`index.md` → `index` を F2 に追記。先頭 `_` のファイルが無視される「事実」を F17 に追加（この記述は誤りで、後に外部レビュー E1-1 で訂正した） |
| R2-2 | Phase 3 で「`.writing-title` の ↗ 出し分けに必要な CSS 調整」と書いていたが、`<span class="arrow">` を条件描画するなら CSS 変更は不要。Issue の文面を読み替えずに書き写していた | CSS は `.writing-*` を触らないと明記。触らないほうが F4 の回帰リスクも減る |
| R2-3 | 受け入れ条件7に対して、`Header` の「`nav` が空ならハンバーガーを出さない」変更が `/` `/works` に影響しないことを明言していなかった | Phase 4 の表に追記 |
| R2-4 | `[slug].astro` が `ogImage={undefined}` を明示的に渡すケースで既定値が効くかは、分割代入の仕様に依存する。`null` を渡すと壊れる | §3.5 に「`undefined` に統一、`null` 禁止」を追記 |
| R2-5 | 同日の外部記事と自サイト記事の並び順（時刻あり vs UTC 0時）に触れていなかった | §3.3 に挙動と許容理由を追記 |
| R2-6 | 受け入れ条件6の `og:image` が**絶対 URL**であることを機械確認していなかった | §6.2 に grep を追加。手動確認の期待値も絶対 URL に修正 |
| R2-7 | `date.ts` の UTC 対応をテストで証明する手順が無かった | `TZ=America/Los_Angeles npm test` を §3.3 に追記 |
| R2-8 | 計画書の置き場所（plan ブランチ）と実装ブランチの関係、実装中の逸脱の記録先が未定だった | §9 に追記 |

### レビュー3: 読みやすさ・着手しやすさ・用語の整合

| # | 指摘 | 反映 |
|---|---|---|
| R3-1 | 冒頭から §4 まで読まないと着手順が分からない。AI エージェントが読む前提なら、最初に全体の順序が要る | 冒頭に「着手手順の要約」8行を追加 |
| R3-2 | `mergeArticles` のシグネチャが §3.2（`readonly Article[][]`）と §5.2（`readonly (readonly Article[])[]`）で食い違っていた | §5.2 の形に統一 |
| R3-3 | §6.2 の「`works/interference` を除外する」が文章での注意に留まり、スクリプトをそのまま実行すると NG が出る | `find -not -path` で除外をスクリプトに組み込んだ |
| R3-4 | Phase 5 が §6.5 の障害シミュレーションを含んでおらず、`consts.ts` の一時変更を戻す確認が手順に無かった | Phase 5 を3手順に分け、完了条件に `git status` の確認を追加 |
| R3-5 | 本文ページの横位置（中央寄せか左揃えか）が未決で、実装者が迷う | §3.8 に「左揃え」を明記（既存ページの構図に合わせる） |
| R3-6 | `.prose table` の横スクロール方式が一行で書かれ、なぜその方式かが無かった | §5.7 に理由（remark ラッパーは依存が増える）を追記 |
| R3-7 | `CONTEXT.md` の Avoid 語（投稿・ポスト・エントリ・作品・イベント 等）を全文検索。ヒットは旧 UI 文言の引用と「横スクロール」「レビュー履歴」の誤検知のみで、違反なし | 変更なし（記録のみ） |
| R3-8 | 冒頭の「状態」が Draft のままだった | Reviewed に更新し、着手前に必要なユーザー判断（§3.11）を併記 |

### ユーザー指示による確定事項（2026-09-04）

自己レビューでは判断を保留していた2点について、ユーザーから直接指示があり確定した。

| # | 指示 | 反映 |
|---|---|---|
| U-1 | 初回記事は AI が生成した検証用の仮記事を使い、受け入れ条件確認後に削除する方針で進める（§3.11 の選択肢 (B) を採用） | §3.11・Phase 6・§9・§6.4 を書き換え。`main` にマージされた時点の `/blog/` は自サイト記事0件になる。あわせて §6.2 のビルド検証スクリプトに `shopt -s nullglob` を追加（記事0件で実行する Phase 5 の時点でグロブが未展開のまま渡り `set -eu` に落ちるのを防ぐため） |
| U-2 | `vitest.config.ts` は不要という判断（§3.2・レビュー1 R1-4）は正しい | §5「ファイル別の変更詳細」の一覧表に残っていた `vitest.config.ts` の記載を削除（前回のレビューでの更新漏れ。前回の解説ページでも Q-02 として指摘済み） |
| U-3 | `/works` の `description` 変更は受け入れ条件7の文面からの逸脱だが、旧文言が不正確になるので変更してよい（2026-09-07、外部レビュー Round 1 の F-04 に対する判断） | F11・§6.3・§6.4・§9 に「条件7の例外」として明記 |

### 外部レビュー Round 1（独立した Claude Code セッションによるレビュー、2026-09-07）

自己レビューとは別に、Issue と既存実装を `gh` / `node_modules` で裏取りする独立レビュアーに計画書を渡した。指摘5件をすべて反映した。

| # | 指摘 | 反映 |
|---|---|---|
| E1-1 | F17「glob ローダーは先頭 `_` を無視する」は Content Layer の `glob()` には当てはまらない。`glob.js:169-172` は `pattern` をそのまま `tinyglobby` に渡しており、`globWithUnderscoresIgnored` はレガシー経路専用。README に誤った事実を書くことになる | `glob.js` を確認して事実を訂正。README には「すべて公開される」と書く方針に変更。`**/[^_]*.md` は採らず §8 に置く |
| E1-2 | §6.2 の `! grep -q` は `set -e` の対象外で、記事セクションが残っていてもスクリプトが止まらない | `if grep -q …; then …; exit 1; fi` に書き換え |
| E1-3 | Issue のスキーマ表は `description` の用途に「一覧カードの補足」を挙げているが、計画は採否を決めていない | §3.1 に「カードには出さない」と理由を明記し §8 に追加 |
| E1-4 | `/works` の description 変更は受け入れ条件7の文面に反するが、逸脱として扱われていない | U-3 としてユーザー承認を記録。F11・§6.3・§6.4・§9 に明記 |
| E1-5 | 計画書が未追跡で、§9「`main` へマージしてから実装ブランチを切る」が実行できない | Phase 0 に手順0（コミット → PR → マージ）を追加。着手手順の要約と §9 も更新 |

### 実装時の逸脱（2026-09-11、実装ブランチ `feat/issue-1-blog`）

§9 の指示に従い、実装中に計画から逸脱した点を記録する。いずれも**計画側の不備を実装時に見つけて直したもの**で、Issue の決定事項は変更していない。

| # | 逸脱 | 計画の記載 | 実際にしたこと | 根拠 |
|---|---|---|---|---|
| D-1 | 本文ページのファイル名を `[slug].astro` → `[...slug].astro` に変更 | §5.5・Phase 3 は `src/pages/blog/[slug].astro` | rest パラメータに変更 | コレクションの glob は `**/*.md` なのでサブディレクトリの記事も読み込まれるが、`[slug]` では id に `/` を含むエントリで `Missing parameter: slug` になりビルドが落ちる。`nested/deep-post.md` を置いて再現を確認した。フラットな記事の URL は `/blog/<slug>/` のままで不変（両方同時に置いて確認済み） |
| D-2 | `global.css` の `@media (max-width: 480px)` に `.site-nav { gap: 16px }` と `.header-right { gap: 14px }` を追加 | §5.7 は `.post-*` と `.prose` の追加のみを想定し、ナビには触れない前提 | 狭い画面用の間隔調整を追加 | ヘッダーのナビが Home / Works / Blog の3項目になった結果、**360px 幅でブランド名が2行に折り返す**回帰が出た。iframe を 320/360/375/390/430px で実測し、Blog リンクを外して再測定することで原因を特定。修正後は 360px 以上で1行に収まる。320px では依然折り返すが横スクロールは発生しない |
| D-3 | §6.2 の検証スクリプトの外部JS判定を `ls` から `find` に変更 | §6.2 は `[ -z "$(ls $D/_astro/*.js 2>/dev/null)" ]` | `js=$(find $D/_astro -name '*.js')` に置き換え | U-1 で追加された `shopt -s nullglob` と噛み合っていない。マッチが無いとグロブが消えて `ls` が引数なしでカレントディレクトリを列挙するため、**外部JSが無くても NG になる**。スクリプト自体はリポジトリに入れないので、計画書側の記載のみの問題 |
| D-4 | README に「記事を削除・リネームしたら `rm -rf .astro node_modules/.astro`」を追記 | 計画に記載なし | 手順として明記 | 検証用記事を削除した後のビルドが `LocalImageUsedWrongly` で落ちた。Content Layer のキャッシュに消したはずの記事が残るため。**`.astro` だけ消しても効かず、実体は `node_modules/.astro`** であることを実測で確認 |

#### 受け入れ条件7に対する想定外の差分

§6.3 の「意図した差分一覧」に無い差分が1件出た（U-3 の description 変更とは別）。

- **事象**: `/` と `/works` で、Astro のレスポンシブ画像用CSS（`:where([data-astro-image]){…}`）が、外部バンドルからインラインの `<style>` へ移動した
- **原因**: ページが3つになったことで Vite の CSS チャンク構成が変わり、分離された小さいチャンクを `build.inlineStylesheets: "auto"` がインライン化したため
- **影響なしの根拠**: before / after のCSSルールを集合比較したところ、**失われたルールは0件**、増えたルールは28件ですべて `.post` / `.prose` と D-2 のナビ間隔。描画結果は変わらない
- **扱い**: 計画の想定外だが、ページ追加に伴う不可避なバンドル挙動であり、条件7の趣旨（`/` と `/works` の見た目・内容が変わらない）は満たしていると判断した

#### 確認できていないこと

| 項目 | 状況 |
|---|---|
| テストカバレッジの計測値 | **未計測**。`@vitest/coverage-v8` が npm のエラー（`Cannot read properties of null (reading 'edgesOut')`）で導入できなかった。§3.2 で計測は任意としているため深追いしていない。16件のテストは対象2ファイルの全関数・全分岐を通っているが、これは目視であって計測値ではない |
| 320px 幅でのヘッダー | D-2 の修正後も `/` と `/works` ではブランド名が2行になる（変更前は1行）。横スクロールは出ず操作にも影響しないが、その幅に限れば変更前との差異が残る |

#### 判断を保留した点

- `/works` のページ内目次が**1項目だけ**（「00 制作物」）になった。計画どおりだが、1項目の目次は冗長かもしれない。外すと `/works` の HTML が承認範囲を超えて変わるため手を付けていない
