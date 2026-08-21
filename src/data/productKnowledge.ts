/**
 * Curated FreBob product identity for Ask Bob.
 * Source: FreBob Master PRD (§§2, 12, 28, 44.7). Not open-web knowledge.
 */
export const PRODUCT_KNOWLEDGE = {
  identity: {
    name: 'FreBob',
    alsoCalled: 'Bob',
    category: 'Generative AI SME Operations Assistant for Nigerian SMEs and informal businesses',
    oneLiner: 'Run your business normally. FreBob remembers, organises and explains it for you.',
    whatItIs:
      'FreBob turns everyday business conversations, SMS-style messages, scanned documents, voice notes and manual entries into approved business records, business memory, inventory updates and simple operational insights.',
    whatItIsNot:
      'FreBob is not a bank, wallet, escrow service, payment processor, or live WhatsApp Business API. It does not replace your bank account or move money for you.',
  },
  howItWorks:
    'You capture a sale or conversation (simulated WhatsApp/SMS, scanner, voice, or manual) → FreBob extracts a draft → you review and approve → FreBob updates orders, stock, customers and memory → Ask Bob answers questions from that approved data.',
  capabilities: [
    'Track sales, payments, customer balances, orders and stock in one place',
    'Ask Bob grounded questions about your business (text or voice notes)',
    'Work in English, Nigerian Pidgin, Yoruba, Hausa and Igbo (text); voice reply where YarnGPT supports the language',
    'Explore Demo with sample data, or sign in and replace samples with your live approvals',
    'Optional WhatsApp-consent sample seed on onboarding to explore with realistic-looking records',
  ],
  trustAndMoney: {
    holdsMoney: false,
    summary:
      'FreBob does not keep, hold, escrow, or automatically move your money. Banks and wallets stay yours. FreBob only records sales, payments and balances after you (or your team) approve them.',
    moneyInApp:
      'Amounts you see in FreBob (sales today, money in, balances owed) are bookkeeping from approved records — not cash FreBob is holding for you.',
  },
  privacy: {
    summary:
      'Ask Bob answers from this business’s FreBob data only. Other merchants’ data is never mixed in. Product questions can also use FreBob’s own productKnowledge pack.',
    ownership: 'Your business records stay tied to your FreBob account and business.',
  },
  faq: [
    {
      q: 'What is FreBob?',
      a: 'FreBob (Bob) is your smart business assistant for Nigerian SMEs. It remembers and organises sales, stock and customers from what you capture and approve, then answers questions about your business.',
    },
    {
      q: 'Does FreBob keep or hold my money?',
      a: 'No. FreBob never holds or moves your money. It only records transactions and balances after you approve them. Your bank and wallet remain yours.',
    },
    {
      q: 'Who sees my data?',
      a: 'Ask Bob only uses this business’s FreBob records. It does not answer from other businesses or the open internet for your merchant facts.',
    },
    {
      q: 'How do I add a sale?',
      a: 'Use Capture (conversation, SMS-style, scanner, voice or manual), review the draft, then approve. Approved sales update orders, stock and memory so Bob can explain them later.',
    },
    {
      q: 'What languages does FreBob support?',
      a: 'English, Nigerian Pidgin, Yoruba, Hausa and Igbo for text. YarnGPT can speak replies in supported languages; Pidgin stays text-only for voice output.',
    },
    {
      q: 'What do I benefit as a user?',
      a: 'You keep running the business your way while FreBob turns approved chats and entries into organised records, stock awareness, customer balances and Ask Bob answers personalised to your numbers.',
    },
  ],
} as const;

export type ProductKnowledge = typeof PRODUCT_KNOWLEDGE;
