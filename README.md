# ka.kii — portfolio

余白を生かした個人ポートフォリオサイト。Astro + TypeScript で構築し、Cloudflare Pages にデプロイ。

- **3ページ構成**: Home（Hero / 自己紹介 / 技術スタック / これまでの活動 / 連絡先）、Works（制作物）、Blog（記事一覧 + 本文）
- **データ駆動・追記型**: YAML（活動・資格・制作物）や Markdown（記事）を1つ足して push すれば項目が増える
- **クライアントJSは最小**（フェードイン・スクロールスパイ・メニュー開閉のみ）

## 開発

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # dist/ へ静的出力
npm run preview  # ビルド結果を確認
npm run check    # 型チェック（astro check）
npm test         # 単体テスト（vitest）
```

Node は `.nvmrc`（20）に固定。Astro 5 の要件は Node 18.20.8 / 20.3.0 / 22 以上。

## 構成

```
src/
  consts.ts          サイトメタ・プロフィール文言・SNSリンク・フィード設定
  content.config.ts  Content Collections スキーマ
  content/
    timeline/*.yaml        活動 1件 = 1ファイル
    certifications/*.yaml  資格 1件 = 1ファイル
    works/*.yaml           制作物 1件 = 1ファイル（スクショ画像も同階層に）
    blog/*.md              自サイト記事 1本 = 1ファイル（画像も同階層に）
  data/techStack.ts  技術スタック（ジャンル別）
  lib/
    writing.ts         外部記事の取得（RSS/Atom ＋ OGP画像）
    blog.ts            外部記事と自サイト記事を1本のリストに統合
    mergeArticles.ts   日付降順マージ（純粋関数・単体テストあり）
    date.ts            日付整形（UTC基準・単体テストあり）
    rehype-toc.ts      [:contents] を h2 の目次に置き換える rehype プラグイン（単体テストあり）
  layouts/Base.astro <head>・メタ・背景・軽量スクリプト
  components/*.astro  各セクション
  pages/
    index.astro           Home
    works.astro           /works
    blog/index.astro      /blog（統合一覧）
    blog/[...slug].astro  /blog/<slug>（記事本文）
    robots.txt.ts         robots.txt を site 設定から生成
  styles/global.css  デザイン仕様
public/              favicon / og-image などの静的アセット
astro.config.mjs     site 設定・ビルド時のヘッダ生成
```

## よくある編集

### 活動・資格・制作物を足す

`src/content/<collection>/` に YAML を1つ置くだけ。並び順・年グルーピングは自動。

```yaml
# timeline 例
date: 2026-07-20          # 表示は YYYY.MM。期間表示は dateLabel で上書き可
category: ctf             # ctf | camp | talk | internship | award | event | competition | other
title:
  ja: ◯◯ CTF 2026 出場
description:              # 任意（サブ行）
  ja: チーム◯◯ — 国内5位
link: "https://..."       # 任意（linkLabel で表示名）
```

```yaml
# works 例（スクショは同じ src/content/works/ に置く）
no: 5
title: something
year: 2026
tech: [Astro, TypeScript]
description:
  ja: 説明文
image: ./something.png    # 任意。Astro が WebP に最適化
links:
  - { label: GitHub, href: "https://github.com/..." }
```

### 記事を書く（自サイト記事）

`src/content/blog/` に `.md` を1つ置くだけ。`/blog/` の一覧と `/blog/<slug>/` の本文ページが生成され、Qiita の記事と日付降順で混ざる。

```markdown
---
title: 記事のタイトル
date: 2026-09-11          # 日付の唯一の情報源。ファイル名には日付を付けない
description: 一覧には出ず、meta description と og:description に使う  # 任意
image: ./cover.png        # 任意。サムネイルと OGP 画像を兼ねる
---

本文。見出しは `##` と `###` まで（`#` は記事タイトル用）。

[:contents]

![図](./cover.png)
```

決まりごと:

- **`[:contents]` と1行書くと、その位置に h2 の目次が入る**。1記事に1つまで（2つ以上あるとコンソールにエラーが出るが、ビルド自体は失敗しない。該当記事の本文だけが空になるので、複数書いていないか目視で確認する）。h2 が無い記事では何も出ない
- **URL は拡張子を除いたファイル名から決まる**。大文字・空白は slugify されて変わってしまうので、**小文字ケバブケース**で命名する（`why-i-picked-astro.md` → `/blog/why-i-picked-astro/`）
- **frontmatter に `slug` を書かない**。書くと URL がそれで上書きされる
- **`index.md` は使わない**（`/blog/index/` という紛らわしい URL になる）
- サブディレクトリに置いてもよい。その場合 URL も入れ子になる（`nested/deep-post.md` → `/blog/nested/deep-post/`）
- **下書きの仕組みは無い**。`src/content/blog/` 配下の `.md` は、ファイル名に関わらず（`_` 始まりでも）すべて公開される。公開したくないものはこのディレクトリに置かない
- 画像は `.md` と同じ階層に置けば、frontmatter からも本文の `![](./foo.png)` からも Astro が最適化する
- コードブロックは Shiki の `github-light` テーマでハイライトされる（`astro.config.mjs`）
- 記事が0件のときはビルドが `The collection "blog" does not exist or is empty.` と警告するが、ビルドは成功し `/blog/` は「記事はまだありません。」を表示する
- **記事を削除・リネームしたらビルド前に `rm -rf .astro node_modules/.astro` する**。Content Layer のキャッシュ（実体は `node_modules/.astro`）に消したはずの記事が残り、それをビルドしようとして `LocalImageUsedWrongly` で失敗することがある

### 記事フィードを変える（外部記事）

`src/consts.ts` の `FEEDS` を編集。各フィードをビルド時に取得し、自サイト記事と合わせて日付降順で統合、サムネ（OGP画像）も自動取得する。取得に失敗してもビルドは落ちない（そのフィードを空としてスキップ）。一覧では `badge` の出典名（`Qiita` / `kakii.dev`）で見分けられ、外部記事だけが別タブで開く。

```ts
export const FEEDS = [
  { source: "Qiita", url: "https://qiita.com/ka-kii/feed" },
  // { source: "Zenn", url: "https://zenn.dev/<username>/feed" },
];
```

## デプロイ（Cloudflare Pages）

1. GitHub に push
2. Cloudflare Pages → Connect to Git → リポジトリを選択
3. ビルド設定: preset **Astro** / build `npm run build` / output `dist`
4. `main` への push で自動デプロイ
5. Custom domains で独自ドメインを追加
6. 記事の自動更新: Deploy Hook を作成し、その URL を GitHub の Secrets `CF_DEPLOY_HOOK_URL` に登録。`.github/workflows/rebuild.yml` が毎日1回叩いて新着記事を反映する。

canonical / OGP / sitemap / robots は `astro.config.mjs` の `site` から導出される。ドメインを変える場合はここ1箇所を更新するだけでよい。

## 設計メモ

- スタイリングは素の CSS（デザイン仕様をピクセル単位で再現するため Tailwind は不採用）
- Content Collections は glob ローダー（1ファイル = 1エントリ＝追記型）
- 日付は実 `Date` 型で保持し、表示時に `YYYY.MM` へ整形
- 背景はインラインSVG（feTurbulence）でベクター・追加リクエストなし。画面比率で表示方式を出し分け
- 画像は Astro の `<Image>` で最適化（WebP）。記事の OGP だけは PNG で出す（WebP は X のカードで表示されない環境があるため）
- 記事の統合ロジックは `astro:*` に依存しない純粋関数（`mergeArticles.ts` / `date.ts`）に切り出し、vitest で単体テストしている
- 日付整形は UTC 基準。frontmatter の `2026-09-11` は UTC 0時として解釈されるため、ローカル getter を使うと UTC より西の環境で前日に化ける
