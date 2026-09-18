/**
 * アプリ内から開く外部URLの定義（Sprint 5 成果物C）。
 *
 * 画面コードにURL文字列を直接書かず、ここ1箇所だけに定義する。
 * `docs/store-listing.md` と `docs/release-checklist.md` に記載する公開URLも、
 * 必ずこのファイルの値と同じものを使うこと。
 *
 * 値は `site/` を GitHub Pages（プロジェクトページ）で公開する想定のURL。
 * リポジトリ名・GitHubユーザー名は5-B（ユーザー作業）でリポジトリを作成した時点で確定する。
 * 実際に作成したリポジトリ名がこれと異なる場合は、このファイルの値を実URLに更新し、
 * 同時に docs/store-listing.md / docs/release-checklist.md の記載も揃えて更新すること。
 */

const GITHUB_PAGES_BASE_URL = 'https://KengoUeno.github.io/english-fast-speach-game';

/** プライバシーポリシーの公開URL */
export const PRIVACY_POLICY_URL = `${GITHUB_PAGES_BASE_URL}/privacy-policy/`;

/** サポート（お問い合わせ・FAQ）の公開URL */
export const SUPPORT_URL = `${GITHUB_PAGES_BASE_URL}/support/`;

/** ランディングページの公開URL */
export const LANDING_PAGE_URL = `${GITHUB_PAGES_BASE_URL}/`;

/** お問い合わせ先メールアドレス（サイト側の mailto: リンクとも一致させる） */
export const SUPPORT_EMAIL = 'kengo4756219@gmail.com';
