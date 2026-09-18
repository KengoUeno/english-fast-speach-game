import type { Card } from '../types/card.ts';

/**
 * 有料パック「TOEIC動詞」（100問）。
 * spec.md「英語レベル別パック」の第1弾。TOEIC 500点程度の受験者が頻出語として学ぶ
 * 動詞を中心に収録する（お題の英単語自体をTOEIC500レベルの頻出語にすることを優先し、
 * 説明文側もできるだけ平易なビジネス英語の語彙で書く）。
 *
 * 既存4パック（cardBuilder.ts の3種の定型文テンプレート）は名詞向けの
 * "This X is known for ~" 型で、動詞の動作説明には不自然になるため使わない。
 * この100問は1問ずつ手書きし、"You do this when ~" / "This means to ~" /
 * "When someone does this, they ~" / "People do this when ~" /
 * "This is what you do when ~" / "If you do this, ~" /
 * "A company/manager/store/business does this when ~" / "Two ~ do this when ~"
 * など複数の文型を使い分けて単調な反復を避けている。
 *
 * 各行は [日本語, English動詞, 説明文]。説明文は8〜20語、対象の英単語（単純な活用形含む）を
 * 含めない（packs.test.ts が全パック横断で検証する）。
 */
const ROWS: [string, string, string][] = [
  ['提出する', 'Submit', 'This means to hand in a form, report, or request by a deadline.'],
  ['出席する', 'Attend', 'People do this when they show up at a meeting, class, or event in person.'],
  [
    '延期する',
    'Postpone',
    'When someone does this, they move a plan to a later date because it is too early.',
  ],
  [
    '確認する',
    'Confirm',
    'This is what you do when you make sure a booking, plan, or fact is correct.',
  ],
  ['交渉する', 'Negotiate', 'Two sides do this when they talk back and forth to reach a fair deal.'],
  ['配達する', 'Deliver', 'A driver does this when they bring a package right to your door.'],
  ['登録する', 'Register', 'You do this to officially add your name to a list before an event.'],
  ['承認する', 'Approve', 'A manager does this when they officially say yes to a request or plan.'],
  [
    '更新する',
    'Renew',
    'If you do this, a contract, license, or subscription keeps working past its end date.',
  ],
  ['通知する', 'Notify', 'A company does this to let customers know about a change through a message.'],
  [
    '予定を入れる',
    'Schedule',
    'You do this when you pick a specific date and time for something to happen.',
  ],
  ['依頼する', 'Request', 'People do this when they politely ask someone for information, help, or a favor.'],
  [
    '完了する',
    'Complete',
    'This is what you do when you finish every step of a task with nothing left undone.',
  ],
  ['連絡する', 'Contact', 'You do this when you reach out to someone by phone, email, or message.'],
  [
    '手配する',
    'Arrange',
    'If you do this, you organize the details of a trip, meeting, or event in advance.',
  ],
  [
    '参加する',
    'Participate',
    'People do this when they take an active part in a class, project, or activity.',
  ],
  ['推薦する', 'Recommend', 'This means to tell someone that a product, place, or person is worth trying.'],
  [
    '取り替える',
    'Replace',
    'When someone does this, they take out an old or broken item and put in a new one.',
  ],
  ['予約する', 'Reserve', 'You do this when you book a table, room, or seat ahead of time.'],
  [
    '返答する',
    'Respond',
    'This is what you do when you reply to a question, message, or invitation you received.',
  ],
  ['購入する', 'Purchase', 'If you do this, you pay money in order to own a product or service.'],
  ['中止する', 'Cancel', 'People do this when they decide an event or order will no longer happen.'],
  [
    '延長する',
    'Extend',
    'A manager does this when they make a deadline or contract last longer than planned.',
  ],
  ['見直す', 'Review', 'You do this when you look over something carefully before making a final decision.'],
  ['知らせる', 'Inform', 'This means to give someone important facts they did not already know.'],
  [
    '発表する',
    'Announce',
    'A company does this when it shares big news with the public for the first time.',
  ],
  ['添付する', 'Attach', 'You do this when you add a file or document to an email before sending it.'],
  [
    '配布する',
    'Distribute',
    'People do this when they hand out copies of something to many people at once.',
  ],
  ['雇う', 'Hire', 'A company does this when it chooses someone and gives them a paid job.'],
  [
    '辞職する',
    'Resign',
    'This is what you do when you formally give up your job and leave the company.',
  ],
  ['退職する', 'Retire', 'If you do this, you permanently stop working, usually because of your age.'],
  [
    '昇進させる',
    'Promote',
    'When someone does this, a company moves an employee up to a higher position.',
  ],
  ['評価する', 'Evaluate', 'You do this when you carefully judge how good or effective something is.'],
  [
    '監督する',
    'Supervise',
    'A manager does this when they watch over workers to make sure a task goes well.',
  ],
  [
    '訓練する',
    'Train',
    'A company does this when it teaches new workers the skills they need for a job.',
  ],
  [
    '採用する',
    'Recruit',
    'A company does this when it looks for and brings in new people to work there.',
  ],
  [
    '面接する',
    'Interview',
    'A manager does this when they ask a candidate questions to decide whether to hire them.',
  ],
  ['署名する', 'Sign', 'You do this when you write your name on a document to make it official.'],
  [
    '発行する',
    'Issue',
    'A company does this when it officially produces and gives out something like a ticket or permit.',
  ],
  [
    '許可する',
    'Authorize',
    'People in charge do this when they give official permission for something to happen.',
  ],
  [
    '検証する',
    'Verify',
    'If you do this, you check that information is true and accurate before you trust it.',
  ],
  [
    '検査する',
    'Examine',
    'You do this when you look at something very closely to understand or check it.',
  ],
  [
    '点検する',
    'Inspect',
    'This is what you do when you look closely at equipment or a site to find problems.',
  ],
  ['修理する', 'Repair', 'This means to fix something that is broken so it works again.'],
  [
    '維持する',
    'Maintain',
    'You do this when you keep something working well through regular care over time.',
  ],
  [
    '設置する',
    'Install',
    'When someone does this, they set up new equipment or software so it is ready to use.',
  ],
  [
    '組み立てる',
    'Assemble',
    'If you do this, you put separate parts together to build one finished product.',
  ],
  [
    '改良する',
    'Upgrade',
    'People do this when they replace an older version of something with a better one.',
  ],
  [
    '開始する',
    'Launch',
    'A company does this when it makes a new product available to the public for the first time.',
  ],
  [
    '発売する',
    'Release',
    'A company does this when it makes something new, like a movie, available to everyone.',
  ],
  [
    '宣伝する',
    'Advertise',
    'A company does this when it pays to tell the public about a product or service.',
  ],
  [
    '売り込む',
    'Market',
    'A company does this when it plans and promotes how a product is sold to buyers.',
  ],
  [
    '後援する',
    'Sponsor',
    'A company does this when it gives money to support an event in exchange for publicity.',
  ],
  [
    '寄付する',
    'Donate',
    'You do this when you give money or goods to help a cause without expecting anything back.',
  ],
  ['投資する', 'Invest', 'If you do this, you put money into a business hoping to earn more later.'],
  ['資金を出す', 'Fund', 'An organization does this when it provides the money needed to pay for a project.'],
  [
    '予算を組む',
    'Budget',
    'You do this when you plan ahead exactly how much money you can spend on something.',
  ],
  [
    '計算する',
    'Calculate',
    'People do this when they use numbers to work out an exact total or answer.',
  ],
  [
    '見積もる',
    'Estimate',
    'This means to guess a rough cost or amount without knowing the exact number.',
  ],
  [
    '予測する',
    'Forecast',
    'This is what you do when you use current facts to guess what will happen later.',
  ],
  ['分析する', 'Analyze', 'You do this when you study information closely to understand what it really means.'],
  [
    '要約する',
    'Summarize',
    'When someone does this, they explain the main points of something in just a few sentences.',
  ],
  [
    'まとめる',
    'Compile',
    'If you do this, you gather information from many sources and put it in one place.',
  ],
  ['下書きする', 'Draft', 'You do this when you write an early, rough version of a letter or document.'],
  [
    '編集する',
    'Edit',
    'People do this when they change and improve a piece of writing before it is finished.',
  ],
  [
    '校正する',
    'Proofread',
    'You do this when you carefully check a document for spelling and grammar mistakes.',
  ],
  [
    '翻訳する',
    'Translate',
    'This is what you do when you turn words from one language into another language.',
  ],
  [
    '出版する',
    'Publish',
    'A company does this when it makes a book, article, or report available for others to read.',
  ],
  ['印刷する', 'Print', 'You do this when you use a machine to put words or images onto paper.'],
  ['コピーする', 'Copy', 'This means to make an exact duplicate of a document or file.'],
  [
    '申請する',
    'File',
    'People do this when they officially send in paperwork, such as a complaint or claim.',
  ],
  [
    '保存する',
    'Archive',
    'If you do this, you keep old records safely so you can find them again later.',
  ],
  ['保管する', 'Store', 'You do this when you keep items in a safe place until they are needed.'],
  ['発送する', 'Ship', "A company does this when it sends a purchased item to the customer's address."],
  [
    '梱包する',
    'Pack',
    'This is what you do when you put items carefully into a box or bag for a trip.',
  ],
  ['積み込む', 'Load', 'You do this when you put goods onto a truck, ship, or plane for transport.'],
  [
    '荷下ろしする',
    'Unload',
    'When someone does this, they take goods off a truck, ship, or plane after arrival.',
  ],
  ['輸送する', 'Transport', 'This means to move goods or people from one place to another.'],
  [
    '輸入する',
    'Import',
    'A company does this when it brings goods into the country from somewhere else to sell them.',
  ],
  [
    '輸出する',
    'Export',
    'A company does this when it sends goods made in one country to be sold in another.',
  ],
  ['供給する', 'Supply', 'People do this when they provide the goods or materials another business needs.'],
  [
    '仕入れる',
    'Stock',
    'A store does this when it keeps a good amount of certain items ready to sell.',
  ],
  ['販売する', 'Sell', 'You do this when you give a product to someone in exchange for money.'],
  ['返金する', 'Refund', 'A store does this when it gives your money back for a returned item.'],
  [
    '割引する',
    'Discount',
    'A store does this when it lowers the normal price of an item for a while.',
  ],
  [
    '請求する',
    'Charge',
    'A business does this when it asks a customer to pay a certain amount of money.',
  ],
  [
    '請求書を送る',
    'Bill',
    'A company does this when it sends a customer a written request for payment.',
  ],
  ['支払う', 'Pay', 'You do this when you give money to someone in exchange for goods or services.'],
  ['預け入れる', 'Deposit', 'If you do this, you put money into a bank account to keep it safe.'],
  [
    '引き出す',
    'Withdraw',
    'People do this when they take money out of their bank account to use it.',
  ],
  [
    '異動させる',
    'Transfer',
    'This is what a company does when it moves an employee or funds from one place to another.',
  ],
  [
    '交換する',
    'Exchange',
    'You do this when you give one thing and receive a different thing in return.',
  ],
  [
    '借りる',
    'Borrow',
    'If you do this, you take something from someone with a plan to give it back.',
  ],
  [
    '貸す',
    'Lend',
    'When someone does this, they let another person use their money or item for a while.',
  ],
  [
    'リース契約を結ぶ',
    'Lease',
    'A company does this when it signs a long contract to use property owned by someone else.',
  ],
  ['賃借りする', 'Rent', 'People do this when they pay money regularly to use a place they do not own.'],
  [
    '占有する',
    'Occupy',
    'You do this when you live or work in a space and fill it with your presence.',
  ],
  [
    '明け渡す',
    'Vacate',
    'This means to leave a room or building completely, taking your belongings with you.',
  ],
  ['移転する', 'Relocate', 'A company does this when it moves its entire office to a different location.'],
  ['合併する', 'Merge', 'Two companies do this when they join together to become a single organization.'],
];

export const toeicVerbsCards: Card[] = ROWS.map(([ja, en, description], index) => ({
  id: index + 1,
  targetWord: `${ja} / ${en}`,
  description,
}));
