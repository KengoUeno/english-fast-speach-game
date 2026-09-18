import { PACKS } from './packs.ts';

/**
 * パックの一時共有（Sprint 4 機能A/B/C/D）。
 *
 * --- 改訂（UXフィードバックによる仕様変更） ---
 * 当初は「パックを1つ選んでコードを発行し、ゲストはそのパックだけを一時解放する」方式だったが、
 * パックごとに個別のコード発行・入力を求めるのはUXが悪いというユーザー判断により、
 * **「共有コードを発行」という単一の操作で、発行時点でホストが購入済みの全パックを
 * まとめて表すコードを1つ生成する**方式に変更した。ペイロードは単一パックのIDではなく、
 * 「パック集合」を表せる形（パックごとに1ビットを割り当てたビットマスク）にする。
 *
 * 完全オフラインで生成・検証できる8文字程度の英数字コードに、
 *   - 共有対象パックの集合（ビットマスク）
 *   - 有効期限（絶対時刻。発行時刻から3時間後を粗い粒度で量子化して埋め込む）
 *   - 改ざん検知用の署名（アプリ埋め込みの鍵から導出し、一部ビットに切り詰めたもの）
 * の3つを詰め込む。生成・検証ともにネット接続を必要としない。
 *
 * --- 8文字という予算内での桁配分（設計判断。コード長を伸ばして安全側に倒すことはしない） ---
 * 文字集合は紛らわしい文字（0/O、1/I、L）を除いた31文字（`ALPHABET`）。
 * 31^8 ≈ 8.53×10^11（log2 ≈ 39.6bit）が理論上使える上限。ここから:
 *
 *   - パック集合ビットマスク : 6bit  （最大2^6=64通り＝最大6パックまでを1コードで表現できる。
 *                                    spec.md が想定テーマとして挙げる「旅行・ビジネス・日常会話・
 *                                    動物・スポーツ・食べ物」の6本を上限に選んだ。現状は有料4パック
 *                                    なので4bitで足りるが、今後2パック追加されるところまでは
 *                                    コード長を変えずに耐えられるようにする）
 *   - 有効期限ticks         : 18bit （10分刻み。EPOCHから約4.99年ぶんを表現できる。
 *                                    本作の想定運用期間に対して十分な長さと判断した）
 *   - 署名                  : 15bit （HMAC相当のkeyed-hashをトランケートしたもの。旧設計から据え置き）
 *
 * 合計 6+18+15 = 39bit = 2^39 = 549,755,813,888 通り（31^8の約64%。安全マージン込み。
 * 旧設計（パックインデックス4bit+期限20bit+署名15bit=39bit）と合計ビット数は同一であり、
 * 偽造耐性（署名15bitに由来する 1/32768 の偶然一致確率）も変わっていない）。
 * 有効期限の粒度を10分にしているため、実際にゲストへ通知される有効期限は
 * 「発行時刻+3時間」を10分単位に切り上げた値になる（最大10分弱、ゲスト有利側に丸まる）。
 * これは「3時間で自動失効する一時性」と「パーティーゲームというリスクの低さ」を踏まえた
 * ユーザー承認済みのトレードオフであり、桁数を増やして安全側に倒す判断はしない。
 *
 * パック集合を「1つのコードに複数パックのIDを直接列挙する」形にせず、ビットマスクにしたのは、
 * (1) 全パックの集合を固定長のビット列1つで表現でき、パック数が増減しても桁配分の再設計が
 * 「マスクのビット数」という1箇所の定数変更で済むこと、(2) IDの文字列や可変長リストを
 * エンコードするより遥かに少ないビット数で済み、8文字という厳しい予算に収まりやすいこと、
 * の2点による。
 */

/** 0/O, 1/I, L を除いた31文字。手入力での読み違い・打ち間違いを減らす */
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const CODE_LENGTH = 8;

const PACK_MASK_BITS = 6;
const EXPIRY_BITS = 18;
const SIG_BITS = 15;

const PACK_MASK_RANGE = 2 ** PACK_MASK_BITS; // 64
const EXPIRY_RANGE = 2 ** EXPIRY_BITS; // 262,144
const SIG_RANGE = 2 ** SIG_BITS; // 32,768

/** 有効期限を量子化する粒度（10分）。3時間という期間に対して十分細かい */
const TICK_MS = 10 * 60 * 1000;
/** 有効期限ticksの基準時刻（2025-01-01T00:00:00Z）。ここから約4.99年ぶんを表現できる */
const EPOCH_MS = Date.UTC(2025, 0, 1, 0, 0, 0, 0);

/** 発行から一時解放が有効な時間 = 3時間（spec.md / sprint-4.md） */
export const SHARE_CODE_DURATION_MS = 3 * 60 * 60 * 1000;

/**
 * アプリに埋め込む検証用の鍵。サーバーを持たないオフライン方式である以上、
 * この鍵はアプリバイナリ内に平文で存在し、原理的には解析され得る。
 * 決済情報等の機密は一切扱わないうえ、コードは3時間で自動失効するため、
 * 「その場・その時間帯限り」の共有という目的に対しては許容できるリスクと判断している。
 */
const SIGNING_SECRET = 'oitsuke-english-share-v1-4f2b9c7a';

/**
 * 共有の対象になり得るパック（＝有料パック）の一覧。無料スターターパックはそもそも
 * ロックされていないため共有の意味がなく、ビットマスクの桁も消費させない
 * （spec.md「無料スターターパックの共有」を対象外とする決定を踏まえる）。
 * ビット位置はこの配列内でのインデックスに対応する。
 */
const SHAREABLE_PACKS = PACKS.filter((pack) => !pack.isFree);

if (SHAREABLE_PACKS.length > PACK_MASK_BITS) {
  // 桁配分を決めた時点(6bit=最大6パック)を超えてパックが増えた場合、ビット不足に気づかず
  // 一部パックが共有コードに含められなくなるのを防ぐためのフェイルファスト。
  throw new Error(
    `sharing.ts: PACK_MASK_BITS(${PACK_MASK_BITS}) is too small for ${SHAREABLE_PACKS.length} shareable packs. ` +
      'Increase PACK_MASK_BITS (and shrink EXPIRY_BITS/SIG_BITS accordingly to keep the 8-character budget).'
  );
}

export type ShareCodeVerifyFailureReason = 'invalid-format' | 'invalid-signature' | 'expired';

export interface ShareCodeVerifyFailure {
  ok: false;
  reason: ShareCodeVerifyFailureReason;
  /** APP- で始まる短いエラーコード（sprint-4.md 指針6） */
  errorCode: string;
}

export interface ShareCodeVerifySuccess {
  ok: true;
  /** コードに含まれていた（＝解放対象の）全パックID。PACKS配列の順序で返す */
  packIds: string[];
  /** 絶対時刻(ms)として復元された有効期限 */
  expiresAtMs: number;
}

export type ShareCodeVerifyResult = ShareCodeVerifySuccess | ShareCodeVerifyFailure;

export interface GeneratedShareCode {
  code: string;
  /** 絶対時刻(ms)として復元できる有効期限（10分刻みに量子化済み） */
  expiresAtMs: number;
  /** このコードに実際に含まれた（マスクに立った）パックID。PACKS配列の順序 */
  packIds: string[];
}

/**
 * 大文字小文字の違い・前後の空白・区切りのハイフンの揺れを吸収して正規化する
 * （sprint-4.md 契約: 「いずれかの揺れを含めて入力しても正しく解放される」）。
 */
export function normalizeShareCode(input: string): string {
  return input.toUpperCase().replace(/[\s-]/g, '');
}

/** 購入済みパックIDの集合から、共有対象（有料）パックだけを抜き出してビットマスク化する */
function maskFromPackIds(packIds: Iterable<string>): number {
  const idSet = new Set(packIds);
  let mask = 0;
  SHAREABLE_PACKS.forEach((pack, index) => {
    if (idSet.has(pack.id)) mask |= 1 << index;
  });
  return mask;
}

/** ビットマスクから、実在する共有対象パックのIDへ復元する（未知の上位ビットは無視する） */
function packIdsFromMask(mask: number): string[] {
  const ids: string[] = [];
  SHAREABLE_PACKS.forEach((pack, index) => {
    if ((mask & (1 << index)) !== 0) ids.push(pack.id);
  });
  return ids;
}

/**
 * node:crypto 等のネイティブ/プラットフォーム依存を持たない、純粋なJSのkeyed-hash。
 * Expo(iOS/Android/Web) のいずれのJS実行環境でも同一の結果になることを優先しており、
 * 暗号学的な強度は高くない。ただし「3時間で自動失効する一時共有コード」の改ざん検知
 * という用途（署名は15bitに切り詰めて使う）には十分な設計判断とする。
 */
function keyedHash(input: string): number {
  const keyed = `${SIGNING_SECRET}:${input}:${SIGNING_SECRET}`;
  let h = 0x811c9dc5; // FNV-1a offset basis

  for (let i = 0; i < keyed.length; i++) {
    h ^= keyed.charCodeAt(i);
    h = Math.imul(h, 0x01000193); // FNV prime
    h >>>= 0;
  }

  // 追加の撹拌ラウンド（雪崩効果を高め、入力の1文字違いが出力全体に伝播しやすくする）
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;

  return h >>> 0; // 常に非負の32bit整数
}

function computeSignature(mask: number, expiryTicks: number): number {
  return keyedHash(`${mask}.${expiryTicks}`) % SIG_RANGE;
}

/** combined値（0 〜 31^8-1 の整数）を8文字のALPHABET表記にエンコードする */
function encodeCombined(value: number): string {
  let remaining = value;
  const chars: string[] = [];
  for (let i = 0; i < CODE_LENGTH; i++) {
    const digit = remaining % ALPHABET.length;
    chars.unshift(ALPHABET[digit]);
    remaining = Math.floor(remaining / ALPHABET.length);
  }
  return chars.join('');
}

/** 8文字のALPHABET表記をcombined値にデコードする。未知の文字が含まれる場合はnull */
function decodeCombined(code: string): number | null {
  let value = 0;
  for (const ch of code) {
    const digit = ALPHABET.indexOf(ch);
    if (digit < 0) return null;
    value = value * ALPHABET.length + digit;
  }
  return value;
}

function isAlphabetOnly(input: string): boolean {
  for (const ch of input) {
    if (ALPHABET.indexOf(ch) < 0) return false;
  }
  return true;
}

/**
 * 共有コードを生成する（ホスト側。機能A）。
 * `purchasedPackIds` は呼び出し時点でホストが購入済みの全パックID（無料パックが混ざっていても
 * 無視する）。`issuedAtMs` は呼び出し側が渡す（本関数もDate.now()を内部で直接読まない）。
 * 有効期限は `issuedAtMs + SHARE_CODE_DURATION_MS` を10分単位に切り上げて量子化する
 * （切り上げにすることで、量子化誤差によってゲストの実利用時間が3時間を下回らないようにする）。
 *
 * パックを1つも購入していない状態で呼び出すのは呼び出し側のバグ（UIは発行導線自体を
 * 出さないこと）とみなし、エラーを投げる。この関数自体は「購入済みパックからコードを
 * 組み立てる」エンコードの純粋なロジックのみを担う。
 */
export function generateShareCode(purchasedPackIds: Iterable<string>, issuedAtMs: number): GeneratedShareCode {
  const mask = maskFromPackIds(purchasedPackIds);
  if (mask === 0) {
    throw new Error(
      'generateShareCode: no shareable (paid, purchased) packs were given. ' +
        'The UI must hide/disable the issue action when the host owns nothing.'
    );
  }

  const rawExpiresAtMs = issuedAtMs + SHARE_CODE_DURATION_MS;
  const ticksSinceEpoch = Math.ceil((rawExpiresAtMs - EPOCH_MS) / TICK_MS);
  const expiryTicks = Math.min(Math.max(ticksSinceEpoch, 0), EXPIRY_RANGE - 1);
  const signature = computeSignature(mask, expiryTicks);

  const combined = mask * (EXPIRY_RANGE * SIG_RANGE) + expiryTicks * SIG_RANGE + signature;

  return {
    code: encodeCombined(combined),
    expiresAtMs: EPOCH_MS + expiryTicks * TICK_MS,
    packIds: packIdsFromMask(mask),
  };
}

/**
 * 共有コードを検証する（ゲスト側。機能B/C/D）。
 * 現在時刻(nowMs)を引数で受け取る純粋関数であり、Date.now()を内部で直接読まない
 * （sprint-4.md 指針4）。これにより単体テストで「期限内は有効／期限後は無効」の
 * 両方を、実時間を待たずに検証できる。
 *
 * 戻り値は単一の packId ではなく、コードに含まれていた全パックIDの配列
 * （`ShareCodeVerifySuccess.packIds`）にする。呼び出し側はこの配列すべてを
 * 1回のredemptionで一時解放すること。
 */
export function verifyShareCode(rawInput: string, nowMs: number): ShareCodeVerifyResult {
  const normalized = normalizeShareCode(rawInput);

  if (normalized.length !== CODE_LENGTH || !isAlphabetOnly(normalized)) {
    return { ok: false, reason: 'invalid-format', errorCode: 'APP-30' };
  }

  const combined = decodeCombined(normalized);
  if (combined === null || combined >= PACK_MASK_RANGE * EXPIRY_RANGE * SIG_RANGE) {
    return { ok: false, reason: 'invalid-format', errorCode: 'APP-30' };
  }

  const signature = combined % SIG_RANGE;
  const rest = Math.floor(combined / SIG_RANGE);
  const expiryTicks = rest % EXPIRY_RANGE;
  const mask = Math.floor(rest / EXPIRY_RANGE);

  const expectedSignature = computeSignature(mask, expiryTicks);
  if (expectedSignature !== signature) {
    return { ok: false, reason: 'invalid-signature', errorCode: 'APP-31' };
  }

  const packIds = packIdsFromMask(mask);
  if (packIds.length === 0) {
    // 署名は一致したが解放対象パックが1つも無い＝正規に発行されたコードではあり得ない
    // （generateShareCodeはmask===0のとき例外を投げるため）。でたらめな入力が
    // たまたま署名まで一致した極端なケースへの保険として無効扱いにする。
    return { ok: false, reason: 'invalid-signature', errorCode: 'APP-31' };
  }

  const expiresAtMs = EPOCH_MS + expiryTicks * TICK_MS;
  if (nowMs >= expiresAtMs) {
    return { ok: false, reason: 'expired', errorCode: 'APP-32' };
  }

  return { ok: true, packIds, expiresAtMs };
}

/** 残り時間(ms)を "2時間58分" / "45分" のような日本語表記にする（表示用の純粋関数） */
export function formatRemainingDuration(remainingMs: number): string {
  const totalMinutes = Math.max(0, Math.ceil(remainingMs / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) return `${minutes}分`;
  if (minutes === 0) return `${hours}時間`;
  return `${hours}時間${minutes}分`;
}
