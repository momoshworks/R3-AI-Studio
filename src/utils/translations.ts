export type Language = 'ar' | 'en';
export type Theme = 'dark' | 'light';

export interface Translations {
  appName: string;
  appSubtitle: string;
  newChat: string;
  chat: string;
  tools: string;
  media: string;
  drive: string;
  settings: string;
  toggleSidebar: string;
  cpu: string;
  ram: string;
  diskFree: string;
  activeAccount: string;
  switchAccount: string;
  switchBtn: string;
  addAccount: string;
  manageAccounts: string;
  aiSettings: string;
  signOut: string;
  askPlaceholder: string;
  welcomeGreeting: string;
  welcomeDesc: string;
  feature1Title: string;
  feature1Desc: string;
  feature2Title: string;
  feature2Desc: string;
  downloadPdf: string;
  printPdf: string;
  copy: string;
  copied: string;
  stop: string;
  send: string;
  theme: string;
  dark: string;
  light: string;
  language: string;
  arabic: string;
  english: string;
  mediaVaultTitle: string;
  mediaVaultSub: string;
  importMedia: string;
  refresh: string;
  searchMedia: string;
  all: string;
  video: string;
  audio: string;
  images: string;
  totalStorage: string;
  emptyMedia: string;
  importNow: string;
  chatGptNotice: string;
  geminiNotice: string;
  addApiKey: string;
  geminiActive: string;
  chatGptActive: string;
  directDownload: string;
  quickTools: string;
  usefulSites: string;
  user: string;
  assistant: string;
  voiceInput: string;
  listening: string;
  readAloud: string;
  stopReading: string;
  commandPalette: string;
  searchCommands: string;
  searchChats: string;
  regenerate: string;
  exportMarkdown: string;
  exportTxt: string;
  speed: string;
  quickPromptsTitle: string;
  chipReport: string;
  chipCode: string;
  chipDesign: string;
  chipPdf: string;
  notebookStudio: string;
  notebooks: string;
  newNotebook: string;
  createNotebook: string;
  notebookTitle: string;
  notebookDesc: string;
  sources: string;
  addSources: string;
  dropSources: string;
  indexedLocally: string;
  indexing: string;
  pages: string;
  chunks: string;
  chatWithSources: string;
  studyTools: string;
  executiveSummary: string;
  flashcards: string;
  practiceQuiz: string;
  keyConcepts: string;
  generateSummary: string;
  generateFlashcards: string;
  generateQuiz: string;
  generateConcepts: string;
  citations: string;
  sourcePage: string;
  offlineReady: string;
  hybridSearch: string;
  noSourcesYet: string;
  noNotebooksYet: string;
  askNotebookPlaceholder: string;
  flipCard: string;
  showExplanation: string;
  correct: string;
  incorrect: string;
}

export const translations: Record<Language, Translations> = {
  ar: {
    appName: 'Nerdo',
    appSubtitle: 'AI Studio',
    newChat: 'ظ…ط­ط§ط¯ط«ط© ط¬ط¯ظٹط¯ط©',
    chat: 'ظ…ط­ط§ط¯ط«ط©',
    tools: 'ط£ط¯ظˆط§طھ ظˆظ…ظˆط§ظ‚ط¹',
    media: 'ظ…ط®ط²ظ† ط§ظ„ظˆط³ط§ط¦ط·',
    drive: 'Google Drive',
    notebookStudio: 'ط¯ظپط§طھط± ط§ظ„ظ…ظ„ط§ط­ط¸ط§طھ (NotebookLM)',
    notebooks: 'ط§ظ„ط¯ظپط§طھط± ظˆط§ظ„ظ…طµط§ط¯ط±',
    newNotebook: 'ط¯ظپطھط± ط£ط¨ط­ط§ط« ط¬ط¯ظٹط¯',
    createNotebook: 'ط¥ظ†ط´ط§ط، ط¯ظپطھط± ظ…ظ„ط§ط­ط¸ط§طھ',
    notebookTitle: 'ط¹ظ†ظˆط§ظ† ط§ظ„ط¯ظپطھط± (ظ…ط«ط§ظ„: ظپظٹط²ظٹط§ط، ط­ط¯ظٹط«ط©)',
    notebookDesc: 'ظˆطµظپ ظ‚طµظٹط± ظ„ظ„ط¯ظپطھط± ط£ظˆ ط§ظ„ظ…ط§ط¯ط©...',
    sources: 'ط§ظ„ظ…طµط§ط¯ط± ظˆط§ظ„ظƒطھط¨ ط§ظ„ظ…ط±ظپظˆط¹ط©',
    addSources: 'ط¥ط¶ط§ظپط© ظ…ط³طھظ†ط¯ط§طھ',
    dropSources: 'ط§ط³ط­ط¨ ظˆط£ظپظ„طھ ط§ظ„ظƒطھط¨ ظˆط§ظ„ظ…ظ„ط§ط²ظ… ظ‡ظ†ط§ ط£ظˆ ط§ظ†ظ‚ط± ظ„ظ„ط§ط®طھظٹط§ط±',
    indexedLocally: 'ظ…ظپظ‡ط±ط³ ظ…ط­ظ„ظٹط§ظ‹ âœ“',
    indexing: 'ط¬ط§ط±ظٹ ط§ظ„ظپظ‡ط±ط³ط© ظˆط§ظ„ط§ط³طھظٹط¹ط§ط¨...',
    pages: 'طµظپط­ط©',
    chunks: 'ظ…ظ‚ط·ط¹ ط¯ظ„ط§ظ„ظٹ',
    chatWithSources: 'ط§ظ„ظ…ط­ط§ط¯ط«ط© ظˆط§ظ„ط§ط³طھط´ظ‡ط§ط¯',
    studyTools: 'ط£ط¯ظˆط§طھ ط§ظ„ظ…ط°ط§ظƒط±ط©',
    executiveSummary: 'ط§ظ„ظ…ظ„ط®طµ ط§ظ„طھظ†ظپظٹط°ظٹ',
    flashcards: 'ط¨ط·ط§ظ‚ط§طھ ط§ظ„ظ…ط°ط§ظƒط±ط©',
    practiceQuiz: 'ط§ط®طھط¨ط§ط± طھط¯ط±ظٹط¨ظٹ',
    keyConcepts: 'ط§ظ„ظ…ظپط§ظ‡ظٹظ… ظˆط§ظ„ظ…طµط·ظ„ط­ط§طھ ط§ظ„ط£ط³ط§ط³ظٹط©',
    generateSummary: 'طھظˆظ„ظٹط¯ ظ…ظ„ط®طµ طھظ†ظپظٹط°ظٹ ظپظˆط±ظٹ',
    generateFlashcards: 'طھظˆظ„ظٹط¯ ط¨ط·ط§ظ‚ط§طھ ط§ظ„ظ…ط±ط§ط¬ط¹ط©',
    generateQuiz: 'طھظˆظ„ظٹط¯ ط£ط³ط¦ظ„ط© ط§ظ„ط§ط®طھط¨ط§ط±',
    generateConcepts: 'ط§ط³طھط®ط±ط§ط¬ ط§ظ„ظ…طµط·ظ„ط­ط§طھ ظˆط§ظ„ظ…ظپط§ظ‡ظٹظ…',
    citations: 'ط§ظ„ط§ط³طھط´ظ‡ط§ط¯ط§طھ ظˆط§ظ„ظ…طµط§ط¯ط± ط§ظ„ظ…ط¤ظƒط¯ط©',
    sourcePage: 'طµ',
    offlineReady: 'ط¬ط§ظ‡ط² ط£ظˆظپظ„ط§ظٹظ† 100%',
    hybridSearch: 'ط¨ط­ط« ط¯ظ„ط§ظ„ظٹ ظ‡ط¬ظٹظ† ظپط§ط¦ظ‚ ط§ظ„ط³ط±ط¹ط©',
    noSourcesYet: 'ظ„ظ… ظٹطھظ… ط±ظپط¹ ظ…ط³طھظ†ط¯ط§طھ ط¨ط¹ط¯ ظپظٹ ظ‡ط°ط§ ط§ظ„ط¯ظپطھط±.',
    noNotebooksYet: 'ظ„ط§ طھظˆط¬ط¯ ط¯ظپط§طھط± ظ…ظ„ط§ط­ط¸ط§طھ ط­طھظ‰ ط§ظ„ط¢ظ†. ط£ظ†ط´ط¦ ط£ظˆظ„ ط¯ظپطھط± ظ„ظ…ط§ط¯طھظƒ ط£ظˆ ط¨ط­ط«ظƒ!',
    askNotebookPlaceholder: 'ط§ط·ط±ط­ ط³ط¤ط§ظ„ط§ظ‹ ط­ظˆظ„ ط§ظ„ظ…ط³طھظ†ط¯ط§طھ ط§ظ„ظ…ط±ظپظˆط¹ط© ظˆط³ظٹطھظ… ط§ظ„ط¥ط¬ط§ط¨ط© ط¨ط±ظ‚ظ… ط§ظ„طµظپط­ط© ظˆط§ظ„ظ…ظ‚ط·ط¹...',
    flipCard: 'ط§ظ†ظ‚ط± ظ„ظ‚ظ„ط¨ ط§ظ„ط¨ط·ط§ظ‚ط© ظˆظ…ط¹ط±ظپط© ط§ظ„ط¥ط¬ط§ط¨ط©',
    showExplanation: 'ط¹ط±ط¶ ط§ظ„طھظپط³ظٹط± ظˆط§ظ„ظ…طµط¯ط±',
    correct: 'ط¥ط¬ط§ط¨ط© طµط­ظٹط­ط© âœ“',
    incorrect: 'ط¥ط¬ط§ط¨ط© ط؛ظٹط± طµط­ظٹط­ط© âœ—',
    settings: 'ط§ظ„ط¥ط¹ط¯ط§ط¯ط§طھ',
    toggleSidebar: 'ط·ظٹ / ظپطھط­ ط§ظ„ط´ط±ظٹط· ط§ظ„ط¬ط§ظ†ط¨ظٹ',
    cpu: 'ط§ظ„ظ…ط¹ط§ظ„ط¬',
    ram: 'ط§ظ„ط°ط§ظƒط±ط©',
    diskFree: 'ط§ظ„ظ…ط³ط§ط­ط© ط§ظ„ط­ط±ط©',
    activeAccount: 'ط§ظ„ط­ط³ط§ط¨ ط§ظ„ظ†ط´ط·',
    switchAccount: 'ط§ظ„طھط¨ط¯ظٹظ„ ظ„ط­ط³ط§ط¨ ط¢ط®ط±:',
    switchBtn: 'طھط¨ط¯ظٹظ„',
    addAccount: 'ط¥ط¶ط§ظپط© ط­ط³ط§ط¨ ط£ظˆ طھط¹ط¯ظٹظ„ ط§ظ„ط­ط³ط§ط¨ط§طھ',
    manageAccounts: 'ط¥ط¯ط§ط±ط© ط§ظ„ط­ط³ط§ط¨ط§طھ',
    aiSettings: 'ط¥ط¹ط¯ط§ط¯ط§طھ ظ…ظپط§طھظٹط­ AI (Gemini & ChatGPT)',
    signOut: 'طھط³ط¬ظٹظ„ ط§ظ„ط®ط±ظˆط¬',
    askPlaceholder: 'ط§ط³ط£ظ„ Nerdo ط£ظٹ ط´ظٹط،طŒ ط£ظˆ طھط­ط¯ط« طµظˆطھظٹط§ظ‹طŒ ط£ظˆ ط§ط±ظپط¹ ظ…ظ„ظپط§طھ ظˆطµظˆط± ظ„ظ„طھط­ظ„ظٹظ„...',
    welcomeGreeting: 'ظ…ط±ط­ط¨ط§ظ‹ ط¨ظƒ ظپظٹ Nerdo AI Studio',
    welcomeDesc: 'ظ…ط³ط§ط¹ط¯ظƒ ط§ظ„ط°ظƒظٹ ظپط§ط¦ظ‚ ط§ظ„طھط·ظˆط± ظˆط§ط³طھظˆط¯ظٹظˆ ط§ظ„ظˆط³ط§ط¦ط· ظ„ظ„طھط­ظ„ظٹظ„ ظˆط§ظ„طھط·ظˆظٹط± ظˆط§ظ„ط¥ظ†طھط§ط¬ظٹط© ط§ظ„ط¹ط§ظ„ظٹط©.',
    feature1Title: 'âœ¨ ط§ط³طھظپط³ط§ط±ط§طھ ظˆطھظˆظ„ظٹط¯ PDF ظپظˆط±ظٹ',
    feature1Desc: 'ط§ط·ط±ط­ ط£ظٹ ط³ط¤ط§ظ„ ط£ظˆ ط§ط·ظ„ط¨ طھظ‚ط±ظٹط±ط§ظ‹ ظ…ظپطµظ„ط§ظ‹ ظ…ط¹ ط¥ظ…ظƒط§ظ†ظٹط© ط­ظپط¸ ط§ظ„ط¥ط¬ط§ط¨ط© ط£ظˆ ط§ظ„ظ…ط­ط§ط¯ط«ط© ظƒظ…ظ„ظپ PDF ط£ظ†ظٹظ‚ ظپظˆط±ط§ظ‹.',
    feature2Title: 'ًں¤– ط¯ط¹ظ… ChatGPT & Gemini ظ…ط¹ط§ظ‹',
    feature2Desc: 'ط¨ط¯ظ‘ظ„ ط¨ظٹظ† ظ†ظ…ط§ط°ط¬ Google Gemini ظˆط³ظ„ط³ظ„ط© ChatGPT ط¨ظƒظ„ ط³ظ„ط§ط³ط© ظˆط³ط±ط¹ط© ظپط§ط¦ظ‚ط©.',
    downloadPdf: 'طھط­ظ…ظٹظ„ PDF',
    printPdf: 'ط·ط¨ط§ط¹ط©',
    copy: 'ظ†ط³ط® ط§ظ„ظ†طµ',
    copied: 'طھظ… ط§ظ„ظ†ط³ط®!',
    stop: 'ط¥ظٹظ‚ط§ظپ ط§ظ„طھظˆظ„ظٹط¯',
    send: 'ط¥ط±ط³ط§ظ„',
    theme: 'ط§ظ„ظ…ط¸ظ‡ط±',
    dark: 'ط¯ط§ظƒظ†',
    light: 'ظپط§طھط­',
    language: 'ط§ظ„ظ„ط؛ط©',
    arabic: 'ط§ظ„ط¹ط±ط¨ظٹط©',
    english: 'English',
    mediaVaultTitle: 'ظ…ط®ط²ظ† ظˆظ…ط´ط؛ظ„ ط§ظ„ظˆط³ط§ط¦ط·',
    mediaVaultSub: 'طھط´ط؛ظٹظ„ ظ…ط³طھظ…ط± ظپظٹ ط§ظ„ط®ظ„ظپظٹط© ظ„ظ„طµظˆطھظٹط§طھ ط­طھظ‰ ط£ط«ظ†ط§ط، طھطµظپط­ ط§ظ„ظ…ط­ط§ط¯ط«ط§طھ ظˆط¯ظ„ظٹظ„ ط§ظ„ط£ط¯ظˆط§طھ',
    importMedia: 'ط§ط³طھظٹط±ط§ط¯ ظˆط³ط§ط¦ط· ط¬ط¯ظٹط¯ط©',
    refresh: 'طھط­ط¯ظٹط«',
    searchMedia: 'ط¨ط­ط« ظپظٹ ط§ظ„ظˆط³ط§ط¦ط· ط¨ط§ط³ظ… ط§ظ„ظ…ظ„ظپ ط£ظˆ ط§ظ„طµظٹط؛ط©...',
    all: 'ط§ظ„ظƒظ„',
    video: 'ظپظٹط¯ظٹظˆ',
    audio: 'طµظˆطھظٹط§طھ',
    images: 'طµظˆط±',
    totalStorage: 'ط§ظ„ط³ط¹ط© ط§ظ„ط¥ط¬ظ…ط§ظ„ظٹط©',
    emptyMedia: 'ظ„ط§ طھظˆط¬ط¯ ظˆط³ط§ط¦ط· ظ…ط­ظپظˆط¸ط© ط­ط§ظ„ظٹط§ظ‹',
    importNow: 'ط§ط³طھظٹط±ط§ط¯ ظ…ظ„ظپط§طھ ط§ظ„ط¢ظ†',
    chatGptNotice: 'ChatGPT API ظ…ظپط¹ظ„',
    geminiNotice: 'Gemini API ظ…ظپط¹ظ„ (ظ…ط¬ط§ظ†ظٹ)',
    addApiKey: 'ط¥ط¶ط§ظپط© ظ…ظپطھط§ط­ API',
    geminiActive: 'Gemini ظ…ظپط¹ظ„',
    chatGptActive: 'ChatGPT ظ…ظپط¹ظ„',
    directDownload: 'طھط­ظ…ظٹظ„ ظ…ط¨ط§ط´ط±',
    quickTools: 'ظ…ظˆط§ظ‚ط¹ ظ…ظ…ظٹط²ط© ط³ط±ظٹط¹ط©',
    usefulSites: 'ط¯ظ„ظٹظ„ ظˆظ…ط³طھظˆط¯ط¹ ط§ظ„ط£ط¯ظˆط§طھ ظˆط§ظ„ظ…ظˆط§ظ‚ط¹ ط§ظ„ظ…ظپظٹط¯ط©',
    user: 'ط£ظ†طھ',
    assistant: 'Nerdo AI',
    voiceInput: 'ط¥ط¯ط®ط§ظ„ طµظˆطھظٹ (طھط­ط¯ط«)',
    listening: 'ط¬ط§ط±ظٹ ط§ظ„ط§ط³طھظ…ط§ط¹... طھط­ط¯ط« ط§ظ„ط¢ظ†',
    readAloud: 'ظ‚ط±ط§ط،ط© ط§ظ„ط¥ط¬ط§ط¨ط© طµظˆطھظٹط§ظ‹',
    stopReading: 'ط¥ظٹظ‚ط§ظپ ط§ظ„ظ‚ط±ط§ط،ط© ط§ظ„طµظˆطھظٹط©',
    commandPalette: 'ظ„ظˆط­ط© ط§ظ„ط£ظˆط§ظ…ط± ط§ظ„ط³ط±ظٹط¹ط©',
    searchCommands: 'ط§ط¨ط­ط« ط¹ظ† ط£ط¯ط§ط© ط£ظˆ ط£ظ…ط± ط£ظˆ ط§ط¶ط؛ط· Ctrl+K...',
    searchChats: 'ط¨ط­ط« ظپظٹ ط§ظ„ظ…ط­ط§ط¯ط«ط§طھ...',
    regenerate: 'ط¥ط¹ط§ط¯ط© ط§ظ„طھظˆظ„ظٹط¯',
    exportMarkdown: 'طھطµط¯ظٹط± ظƒظ€ Markdown (.md)',
    exportTxt: 'طھطµط¯ظٹط± ظƒظ€ ظ†طµ (.txt)',
    speed: 'ط§ظ„ط³ط±ط¹ط©',
    quickPromptsTitle: 'ط§ظ‚طھط±ط§ط­ط§طھ ط³ط±ظٹط¹ط© ظ„ظ„ط¨ط¯ط،:',
    chipReport: 'ًں“‌ ظƒطھط§ط¨ط© طھظ‚ط±ظٹط± طھط­ظ„ظٹظ„ظٹ ظˆطھظ†ط³ظٹظ‚ظ‡ ظƒظ€ PDF',
    chipCode: 'ًں’» ظپط­طµ ظˆطھطµط­ظٹط­ ظƒظˆط¯ ط¨ط±ظ…ط¬ظٹ ط¨ط§ط­طھط±ط§ظپظٹط©',
    chipDesign: 'ًںژ¨ طھظˆظ„ظٹط¯ ط£ظپظƒط§ط± ظ„طھطµظ…ظٹظ… ظˆط§ط¬ظ‡ط© ظ…ط³طھط®ط¯ظ… (UI/UX)',
    chipPdf: 'ًں“ٹ طھط­ظ„ظٹظ„ ظ…ط³طھظ†ط¯ ظˆطھظ„ط®ظٹطµظ‡ ط¨ظ†ظ‚ط§ط· ط±ط¦ظٹط³ظٹط©',
  },
  en: {
    appName: 'Nerdo',
    appSubtitle: 'AI Studio',
    newChat: 'New Chat',
    chat: 'Chat',
    tools: 'Tools & Hub',
    media: 'Media Vault',
    drive: 'Google Drive',
    settings: 'Settings',
    toggleSidebar: 'Toggle Sidebar',
    cpu: 'CPU',
    ram: 'RAM',
    diskFree: 'Disk Free',
    activeAccount: 'Active Account',
    switchAccount: 'Switch to another account:',
    switchBtn: 'Switch',
    addAccount: 'Add Account / Manage Accounts',
    manageAccounts: 'Manage Accounts',
    aiSettings: 'AI API Keys (Gemini & ChatGPT)',
    signOut: 'Sign Out',
    askPlaceholder: 'Ask Nerdo anything, use voice, or attach files & code...',
    welcomeGreeting: 'Welcome to Nerdo AI Studio',
    welcomeDesc: 'Your next-gen intelligent AI workstation & media studio for rapid productivity and creative analysis.',
    feature1Title: 'âœ¨ Instant Answers & PDF Export',
    feature1Desc: 'Ask any question or request detailed reports, then export to PDF with a single click.',
    feature2Title: 'ًں¤– Dual Gemini & ChatGPT Support',
    feature2Desc: 'Seamlessly switch between Google Gemini models and ChatGPT with instant responses.',
    downloadPdf: 'Download PDF',
    printPdf: 'Print',
    copy: 'Copy',
    copied: 'Copied!',
    stop: 'Stop Generation',
    send: 'Send',
    theme: 'Theme',
    dark: 'Dark',
    light: 'Light',
    language: 'Language',
    arabic: 'ط§ظ„ط¹ط±ط¨ظٹط©',
    english: 'English',
    mediaVaultTitle: 'Local Media Vault & Player',
    mediaVaultSub: 'Seamless background media playback while browsing chats and tools',
    importMedia: 'Import New Media',
    refresh: 'Refresh',
    searchMedia: 'Search media by name or extension...',
    all: 'All',
    video: 'Video',
    audio: 'Audio',
    images: 'Images',
    totalStorage: 'Total Storage',
    emptyMedia: 'No media files in vault yet',
    importNow: 'Import files now',
    chatGptNotice: 'ChatGPT API Active',
    geminiNotice: 'Gemini API Active (Free)',
    addApiKey: 'Add API Key',
    geminiActive: 'Gemini Active',
    chatGptActive: 'ChatGPT Active',
    directDownload: 'Direct Download',
    quickTools: 'Quick Shortcuts',
    usefulSites: 'Curated Software & Useful Tools Directory',
    user: 'You',
    assistant: 'Nerdo AI',
    voiceInput: 'Voice Input (Speak)',
    listening: 'Listening... Speak now',
    readAloud: 'Read aloud (TTS)',
    stopReading: 'Stop speech',
    commandPalette: 'Command Palette',
    searchCommands: 'Type a command or tool... (Ctrl+K)',
    searchChats: 'Search chats...',
    regenerate: 'Regenerate',
    exportMarkdown: 'Export Markdown (.md)',
    exportTxt: 'Export Text (.txt)',
    speed: 'Speed',
    quickPromptsTitle: 'Quick Starter Prompts:',
    chipReport: 'ًں“‌ Write an in-depth analytical report for PDF',
    chipCode: 'ًں’» Debug and review my code snippets',
    chipDesign: 'ًںژ¨ Brainstorm modern UI/UX design concepts',
    chipPdf: 'ًں“ٹ Summarize document and extract bullet points',
    notebookStudio: 'Notebook Studio (NotebookLM)',
    notebooks: 'Notebooks & Sources',
    newNotebook: 'New Research Notebook',
    createNotebook: 'Create Notebook',
    notebookTitle: 'Notebook Title (e.g., Quantum Physics)',
    notebookDesc: 'Short description of the course or project...',
    sources: 'Uploaded Documents & Sources',
    addSources: 'Upload Sources (PDF, DOCX, TXT, PY, CSV)',
    dropSources: 'Drag & drop research papers or books here or click to browse',
    indexedLocally: 'Locally Indexed âœ“',
    indexing: 'Indexing & Chunks Processing...',
    pages: 'Pages',
    chunks: 'Chunks',
    chatWithSources: 'Smart Chat',
    studyTools: 'Study Tools',
    executiveSummary: 'Executive Summary',
    flashcards: 'Flashcards',
    practiceQuiz: 'Practice Quiz & MCQs',
    keyConcepts: 'Key Concepts & Terms',
    generateSummary: 'Generate Executive Brief',
    generateFlashcards: 'Generate Review Flashcards',
    generateQuiz: 'Generate Practice Quiz',
    generateConcepts: 'Extract Key Terms & Formulas',
    citations: 'Grounding Citations',
    sourcePage: 'p.',
    offlineReady: '100% Offline Ready',
    hybridSearch: 'Ultra-Fast Hybrid Vector Search',
    noSourcesYet: 'No sources uploaded to this notebook yet.',
    noNotebooksYet: 'No notebooks created yet. Create your first notebook to begin research!',
    askNotebookPlaceholder: 'Ask a question about the uploaded sources, with exact page citations...',
    flipCard: 'Click to flip and reveal answer',
    showExplanation: 'Show Explanation & Source',
    correct: 'Correct Answer âœ“',
    incorrect: 'Incorrect âœ—',
  },
};
