# ka.kii Portfolio

「静かな個展 / quiet solo exhibition」をコンセプトにした、セキュリティ専攻の学生エンジニア ka.kii のポートフォリオ。
Astro + TypeScript の **データ駆動・追記型**。Cloudflare Pages へのデプロイを想定。
**2ページ構成**（Home = Hero / About / Timeline / Contact、Works = 制作物 / 記事）。

> **現在のステータス**: Home / Works 両ページ実装済み。Works ページの記事（Writing）は
> Qiita の RSS をビルド時に取得して表示（失敗時は空表示でフォールバック）。
> 定期再ビルドの GitHub Actions（`.github/workflows/rebuild.yml`）も用意済み。
> デプロイ前の残作業は本README末尾「デプロイ前チェックリスト」を参照。

---

## 開発

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # dist/ に静的出力
npm run preview    # ビルド結果をローカル確認
npm run check      # astro check（型チェック）
```

Node.js 18.20.8 / 20.3.0 / 22 以上（Astro 5 の要件）。

---

## ディレクトリ構成

```
src/
  consts.ts            … フラグ・サイトメタ・プロフィール文言・SNSリンク（文言はここを編集）
  types.ts             … 共有型（NavItem）
  content.config.ts    … Content Collections スキーマ定義
  content/
    timeline/*.yaml        … 活動1件 = 1ファイル（追記型）
    certifications/*.yaml   … 資格1件 = 1ファイル
  layouts/Base.astro   … <head>/メタ/OGP/favicon/フォント/軽量スクリプト
  components/*.astro   … Header / PageIndex / Hero / About / Timeline / Works / Writing / Contact / Footer / ExtLink
  lib/writing.ts       … 記事フィード（RSS/Atom）の取得・統合
  pages/
    index.astro        … Home（Hero / About / Timeline / Contact）
    works.astro        … Works（制作物 / 記事）→ /works
  styles/global.css    … デザイン仕様（モックの style.css をそのまま採用）
  assets/icon.jpg      … プロフィール画像（Astro Image で最適化）
public/
  og-image.png         … OGP画像（静的1枚）
  favicon.svg / robots.txt / _headers
```

---

## よくある編集

### ① Timeline に活動を1件足す

`src/content/timeline/` に YAML を1つ置いて push するだけで1項目増える。
ファイル名は任意（`YYYY-MM-内容.yaml` 推奨）。年ごとのグルーピング・並び順は自動。

```yaml
# src/content/timeline/2026-07-ctf.yaml
date: 2026-07-20            # 実日付（YYYY-MM-DD）。表示は YYYY.MM に自動整形
category: ctf              # ctf | camp | talk | internship | award | other
title:
  ja: ◯◯ CTF 2026 出場
  en: Played ◯◯ CTF 2026   # en は任意
description:               # 任意。タイムライン上の補足（サブ行）
  ja: チーム◯◯ — 国内5位
link: "https://example.com" # 任意
linkLabel: write-up         # 任意（link がある時の表示名）
```

資格は `src/content/certifications/` に同様に YAML を足す（`name` / `date` / `issuer`）。

制作物は `src/content/works/` に YAML を足す（`no` の昇順で表示）。

```yaml
# src/content/works/05-something.yaml
no: 5
title: something
year: 2026
tech: [Astro, TypeScript]
description:
  ja: 説明文
links:                      # 任意。GitHub / Demo など複数可
  - { label: GitHub, href: "https://github.com/..." }
```

> スクリーンショットは現状プレースホルダ表示。画像を用意したら `Works.astro` の
> `.work-media--placeholder` を `<Image>`（`src/assets/` に置いた画像）に差し替える。

### ② 記事フィードのユーザー名を変える

Works ページの「記事（Writing）」は `src/consts.ts` の `FEEDS` を見て、各 RSS/Atom を
ビルド時に取得・日付降順で統合表示する（実装: `src/lib/writing.ts`）。
ユーザー名やフィードの追加はここ1箇所で完結する。

```ts
// src/consts.ts
export const FEEDS = [
  { source: "Qiita", url: "https://qiita.com/ka-kii/feed" },
  // Zenn はアカウント作成後に下行を足すだけで統合される:
  // { source: "Zenn", url: "https://zenn.dev/<username>/feed" },
];
```

- フィード取得に失敗してもビルドは落ちない（そのフィードを空としてスキップ）。
- 記事のサムネ（OGP画像）の自動取得は将来課題。現状は枠のみのプレースホルダ。

### ③ イースターエッグのフラグを差し替える

フラグは2種類あり、どちらも `src/consts.ts` の定数を書き換えるだけ。

```ts
export const FLAG = "kakii{...}";       // view-source（HTML <head> のコメント）
export const CURL_FLAG = "kakii{...}";  // curl -I（レスポンスヘッダ X-Recon）
```

- `FLAG` … `<head>` 内コメントに展開（`view-source:` で見つかる）。
- `CURL_FLAG` … ビルド時に `astro.config.mjs` が Cloudflare Pages の `_headers` を生成し、
  全パスに `X-Recon: <CURL_FLAG>` を付与する。`curl -sI https://サイト/` で見つかる。
  併せて `X-Kakii: hello` も付与。`_headers` は**生成物**なので直接編集しない。

`robots.txt`（`public/robots.txt`）に view-source と `curl -sI` を促すコメントを設置済み。

---

## デプロイ（Cloudflare Pages）

1. このリポジトリを GitHub に push
2. Cloudflare Pages で「Connect to Git」→ 該当リポジトリを選択
3. ビルド設定:
   - Framework preset: **Astro**
   - Build command: `npm run build`
   - Build output directory: `dist`
4. `main` ブランチへの push で自動デプロイ
5. 当面のURLは `*.pages.dev`（独自ドメインは未取得）。
   ドメイン取得後は `astro.config.mjs` の `site` を更新する（sitemap / canonical / OGP の絶対URLに使われる）。
6. **記事の自動更新**: Cloudflare Pages の Deploy Hook を作成し（Settings → Builds & deployments → Deploy hooks）、
   その URL を GitHub リポジトリの Secrets に `CF_DEPLOY_HOOK_URL` として登録する。
   `.github/workflows/rebuild.yml` が毎日1回その Hook を叩き、Qiita の新着記事を反映する。

---

## デプロイ前チェックリスト

### 必須（実データ差し替え）
- [ ] `src/consts.ts` の SNS リンク（GitHub / X / Qiita）を実URLに、`tentative: false` に
- [ ] `src/consts.ts` のメール `PROFILE.email` を実アドレスに（`tentative: false`）
- [ ] `src/consts.ts` のプロフィール文言（所属・興味分野・リード文・about）を実データに
- [ ] `src/content/timeline/*.yaml` を実際の活動に差し替え
- [ ] `src/content/certifications/*.yaml` を実際の資格に差し替え
- [ ] `src/content/works/*.yaml` を実際の制作物に差し替え
- [ ] 各データの `（仮）`（`.kari` / `tentative`）を解消
- [ ] `FEEDS` の Qiita ユーザー名が正しいか確認（現状 `ka-kii`）

### 設定・インフラ
- [ ] GitHub にリポジトリ作成し push
- [ ] Cloudflare Pages で連携（preset: Astro / build: `npm run build` / output: `dist`）
- [ ] Deploy Hook 作成 → GitHub Secrets に `CF_DEPLOY_HOOK_URL` 登録（自動更新用）
- [ ] 独自ドメイン取得後に `astro.config.mjs` の `site` を更新

### 品質・任意
- [ ] 本番URLで Lighthouse 計測（Performance / A11y / Best Practices / SEO 各90+ 目標）
- [ ] `src/consts.ts` の `FLAG` を最終版に（現状 `kakii{good_eye_you_found_it}`）
- [ ] `public/og-image.png` を最終版に（現状はブランドのみの静的1枚）
- [ ] Works のサムネ画像を用意（現状プレースホルダ）
- [ ] Zenn アカウント作成後、`FEEDS` に1行追加

---

## 設計判断（採用理由と却下した代替案）

- **スタイリング: Tailwind ではなく素の CSS（モックの `style.css` を流用）。**
  デザインは `clamp()` / `color-mix()` / `font-feature-settings:"palt"` / 独自グリッドなど
  高度に作り込まれた最終仕様。Tailwind に移すと全値を arbitrary value 化することになり、
  可読性の利点が消え、ピクセル精度を崩すリスクが高い。`<style>` スコープより
  グローバル1枚の方が元仕様と差分ゼロで再現できる。→ Tailwind は不採用。

- **Content Collections: `glob()` ローダー（1ファイル=1エントリ）。**
  要件「YAMLを1つ足して push すれば1項目増える」に直結。
  `file()` ローダー（1ファイルに配列でまとめる）は追記のたびに同一ファイルを編集する形になり、
  追記型の思想と差分の見やすさで劣るため不採用。

- **日付は文字列 `"2026.05"` ではなく実 `Date`（`z.coerce.date()`）。**
  降順ソートと年グルーピングを正しく行え、次ステップの記事RSSとの統合ソートも
  同じ日付比較で実装できる。表示時に `YYYY.MM` へ整形。

- **クライアントJS: フェードイン/スクロールスパイ/ハンバーガーのみ、`<script>` 1本。**
  Islands を使うほどの状態を持たない純粋な進行的拡張。`html.js` ゲートで JSオフでも
  全要素が表示されたまま崩れない。要件「JS原則ゼロ／必要時のみ最小限」に合致。

---

## 品質・メタ

- OGP / Twitter Card / canonical / `<html lang="ja">` 設定済み
- `favicon.svg`、`@astrojs/sitemap` による sitemap 自動生成
- 画像は Astro の `<Image>` で最適化（WebP + 2x densities）

### 将来課題（TODO）

- **og:image の自動生成**（現状は静的1枚 `public/og-image.png`）。
  将来 `@vercel/og` 相当 or Satori でページ別自動生成に拡張可能。
- Works / Writing セクションと記事RSS自動集約、GitHub Actions（cron → Deploy Hook）
- 独自ドメイン取得後の `site` 更新
- 本名併記の有無の確定（現状はプレースホルダ運用）

---

## 確定した方針

- **Zenn**: アカウント未作成のため、今回は記事フィードに含めない（Qiita のみ）。
- **イースターエッグのフラグ**: `kakii{good_eye_you_found_it}`（「よく見つけたね」のニュアンス）。
- **本名**: 併記しない。
- **背景**: ラスターPNGをやめ、**インラインSVG**（`Base.astro` の `.bg-wash`）で実装。
  feTurbulence + feDisplacementMap で塗りの縁を有機的に歪ませており、ベクターなので
  解像度非依存・追加リクエストなし・`preserveAspectRatio="...slice"` でレスポンシブ（cover相当）。
  ローズ #E2A491 / ゴールド #DDBC72 を `fill-opacity` で薄く、`.bg-wash { opacity: 0.6 }` でさらに抑える。
  形・配色を変えたいときは `Base.astro` のSVG（ellipse/circle の座標・色）を直接編集する。

## 未確定事項

- 独自ドメイン（当面 `*.pages.dev`）
