# リリース手順書 — 追いつけEnglish

`docs/sprints/sprint-5.md` の `5-B`（ユーザーが手作業で行う、Evaluatorの合否判定対象外の作業）を、
着手順・所要期間つきのチェックリストにしたもの。`docs/mobile-app-release-lessons.md`（前作「察してEnglish」の教訓集）の
該当項目を本作の文脈に落として記載している。**着手前に必ず教訓集本体も読むこと。**

公開URLの一元管理: このチェックリストに出てくるURLは、すべて `apps/mobile/lib/links.ts` および
`docs/store-listing.md` と同じ値を使うこと。3箇所のいずれかを更新したら、残り2箇所も必ず揃える。

---

## フェーズ0: 最優先で着手（他の作業と並行してすぐ始める）

このフェーズは他のどの作業より先に着手する。理由は所要期間が最長（14日間）のボトルネックだから。

- [ ] Google Play Console でアプリを新規作成する
- [ ] **クローズドテストのテスター12人を集め、14日間の連続テストを開始する。**
      新規デベロッパーアカウントが本番リリースするための必須条件。テスターは友人・家族・SNS等で早めに声をかけ始める
      （教訓: 開発着手前にやることの1項目目。これが最も時間のかかる工程）
- [ ] App Store Connect でアプリを新規作成し、`ascAppId`（数字のApp ID）を取得する
- [ ] 取得した `ascAppId` を `apps/mobile/eas.json` の `submit.production.ios.ascAppId` に設定する（現在は仮の `REPLACE_WITH_APP_STORE_CONNECT_APP_ID` が入っている）
- [ ] **iOS の Paid Applications Agreement（有料アプリ契約）を有効化する。**
      未有効のまま実機で購入を試すと、購入は必ず失敗する。前作ではこれに気づかずビルドを1回無駄にした（教訓: build 3で購入失敗）
- [ ] EU デジタルサービス法（DSA）の取引者情報が、Apple / Google 双方のアカウントレベルで既に登録済みか確認する。
      未登録の場合は入力するが、**入力内容は公開されることを理解した上で行う**（教訓8）。既存のアカウント設定で
      同じ内容が既に満たされていないか、入力前に必ず確認する

---

## フェーズ1: ホスティングの用意（公開URL確定の前提）

- [ ] GitHub リポジトリを作成し、`site/` を GitHub Pages（プロジェクトページ）で公開する
      （教訓: モバイルのみの構成では Vercel ではなく GitHub Pages を使う。追加のアカウント・ダッシュボードが不要）
- [ ] 公開後のURLが `apps/mobile/lib/links.ts` の `GITHUB_PAGES_BASE_URL`
      （現在の仮値: `https://kengoueno.github.io/english-fast-speach-game`）と一致するか確認する。
      リポジトリ名・GitHubユーザー名が異なる場合は、`lib/links.ts` ・ `docs/store-listing.md` ・
      このファイルの3箇所を実際のURLに揃えて更新する
- [ ] 公開後、実際のURLでプライバシーポリシー（`/privacy-policy/`）とサポートページ（`/support/`）が
      ブラウザで正しく表示されることを確認する（サブディレクトリ配下でもリンク・CSS・画像が壊れていないか）

---

## フェーズ2: RevenueCat と App内課金の登録

- [ ] RevenueCat（https://app.revenuecat.com）でプロジェクトを作成し、iOS / Android のアプリを紐付ける
- [ ] App Store Connect と Google Play Console の**両方**に、`docs/store-listing.md` の商品登録情報表のとおり
      4商品すべてを同一の商品ID（`travel_pack_1` / `business_pack_1` / `animals_pack_1` / `food_pack_1`）・
      非消耗型（Non-Consumable）・100円で登録する
- [ ] RevenueCat 側で Offering を作成し、4商品すべてを `availablePackages` に含める
      （本アプリの実装は `Purchases.purchasePackage()` を使う方式のため、Offering への登録が必須。
      `Purchases.purchaseProduct()` 直接指定はAndroidで `PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR` になることがある — 教訓集「技術的な補足」参照）
- [ ] RevenueCat の本番APIキー（iOS / Android）を取得する
- [ ] **本番APIキーを、最初の production ビルドを走らせる前に** EAS の環境変数として設定する
      （`EXPO_PUBLIC_REVENUECAT_IOS_KEY` / `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`。変数名は `.env.example` を参照）。
      **教訓3: EASの環境変数はビルド時にJSバンドルへ焼き込まれる。後から値を更新しても既存のバイナリには反映されないため、
      本番キーは必ず最初の production ビルドの前に確定させ、切り替えが必要になった場合は迷わずビルドを作り直す**

---

## フェーズ3: 素材の制作とストア掲載情報の入力

- [ ] `docs/store-listing.md` の「3. スクリーンショット要件表」に従い、iOS用（1320×2868px、3〜10枚）と
      Android用（1080×1920px、2〜8枚）のスクリーンショットをそれぞれ実機/シミュレータで撮影・作成する
      （**教訓7: 両ストアで素材は流用できない。指定ピクセルサイズちょうどで別々に用意する**）
- [ ] Google Play のフィーチャーグラフィック（1024×500px）を作成する
- [ ] Google Play のストア掲載用アプリアイコン（512×512px）を作成する
- [ ] 両ストアのコンソールに、`docs/store-listing.md` の原稿（アプリ名・サブタイトル・説明文・キーワード等）を
      そのままコピー&ペーストして掲載情報を埋める
- [ ] Google Play の「データ安全性」フォームに回答する（収集データ: 購入情報のみ／広告ID: 使用しない／
      マイク等の権限: なし。`docs/store-listing.md` の設定値表を参照）
- [ ] App Store Connect のプライバシー質問（App Privacy）に回答する（同上の内容に準拠）

---

## フェーズ4: ビルドと実機確認

Xcode / Android Studio のローカルインストールは不要。`eas build` がクラウド上でコンパイル・署名まで行う。

- [ ] `eas build --platform ios` で production ビルドを作成する
- [ ] `eas build --platform android` で production ビルドを作成する
- [ ] **実機でアプリアイコンとスプラッシュの見え方を確認する**
      （ホーム画面での視認性、Androidの円形・角丸マスクでの欠け、ダークな壁紙での埋没がないか）
- [ ] EAS 開発ビルド（`eas build --profile development` → `--dev-client` で起動）を実機に入れ、
      **RevenueCat の購入・復元を実際に動かして確認する**
      （**教訓2: Expo Go は `react-native-purchases` のようなカスタムネイティブモジュールを含むアプリを実行できない。
      課金の実機検証は必ずEAS開発ビルドか実際のストアの実機テストで行う**）
- [ ] 実機で共有コードの発行・入力を確認する（Web（Expo Web）で検証済みだが、キーボード・クリップボードの挙動は実機固有のため再確認する）
- [ ] ビルドが `Gradle build failed` 等で落ちた場合、まずログの実際のエラー箇所を見る。
      **教訓5: Maven Central の `429 Too Many Requests` のような外部要因であれば、設定をいじらず時間を置いて再試行する**

---

## フェーズ5: 審査提出（最も事故が起きやすい工程）

- [ ] **ストア画面に表示している4つの有料パック（旅行・ビジネス・動物・食べ物）すべてを、初回の審査提出に含める。**
      「1つだけ先に出して後から足す」は絶対に行わない
      （**教訓6: 前作はUIに5パック表示していたのに審査には1つしか含めず、
      "Guideline 2.1(b) - Performance: App Completeness" で却下された**）
- [ ] App Store Connect で4商品を1つの提出にまとめる（**教訓6bの手順**、本作の4商品向けに具体化）:
  1. 新しく作成したApp内購入商品（`travel_pack_1` 等）は、それぞれ自動的に個別の「提出物の下書き」を持つ。
     「アプリ内購入」一覧の「編集」チェックボックスは、既に個別の下書きに紐づいている商品はグレーアウトして選択できない
  2. まとめるには、`travel_pack_1` / `business_pack_1` / `animals_pack_1` / `food_pack_1` の各商品の詳細ページを開き、
     「項目を削除することは可能です」のリンク（または下書きパネル内の赤い「−」ボタン）から個別の下書きを削除する
     （商品自体は消えず、「どの提出物にも属さない自由な状態」に戻るだけ）
  3. 4商品すべてをこの「自由な状態」にしたら、「アプリ内購入」一覧のチェックボックスで4つ全部を選択し、
     「審査用に追加」をクリック → 1つの複数商品セットの下書きができる
  4. アプリバージョンのページで「審査用に追加」からこのセットを選んで紐付け、まとめて審査提出する
  5. 既にどれかの商品が却下済みのバージョンに紐づいている場合は、先に「App Review」→ 該当の提出物の詳細ページ →
     「提出をキャンセル」→「確認」で取り下げてから、1〜4をやり直す
- [ ] 動作確認済みのビルドを別トラックへ展開するときは、新規リリースの作成ではなく**「プロモート」**機能を使う
      （**教訓4: Google Playは同一アプリ内で versionCode の再利用を許可しない。新規作成が必要なのは中身を変える時だけ**）
- [ ] 審査提出後、却下された場合はメッセージのGuideline番号を確認し、`docs/mobile-app-release-lessons.md` に照らして原因を切り分ける

---

## フェーズ6: リリース後

- [ ] ストア評価ポップアップ（`expo-store-review` によるネイティブレビュー依頼）は**本番版でのみ動作する**。
      TestFlightやクローズドテストで表示されなくても実装ミスとは限らない
      （**教訓10: TestFlightのベータ版では意図的に無効化される。Androidも同様にGoogle Play側の非公開クォータがある**）。
      本番リリース後、3回プレイしてから挙動を確認する
- [ ] 本番リリース後、実決済（Sandboxではない実際の購入）で4パックすべての購入と復元を確認する
- [ ] 今回のリリースで新たに得た教訓を `docs/mobile-app-release-lessons.md` に追記する

---

## 参考: アプリ内リンク・公開URLの一元管理

| 定義箇所 | 内容 |
|---|---|
| `apps/mobile/lib/links.ts` | アプリ内から開くプライバシーポリシー／サポートのURL（唯一の定義箇所） |
| `docs/store-listing.md` | ストア掲載情報の原稿内のプライバシーポリシー／サポートURL |
| このファイル（フェーズ1） | GitHub Pages公開後のURL確定手順 |

3箇所は常に同じ値を指すこと。
