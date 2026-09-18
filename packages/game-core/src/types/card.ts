export interface Card {
  id: number;
  /** お題単語。表記は「日本語 / English」の形式（例: "ゾウ / Elephant"） */
  targetWord: string;
  /**
   * 読み手が声に出して読む英語の説明文（8語〜20語）。
   * targetWordの英単語そのもの（単純な複数形・活用形を含む）は含めないこと。
   */
  description: string;
}
