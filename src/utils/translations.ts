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
}

export const translations: Record<Language, Translations> = {
  ar: {
    appName: 'R3',
    appSubtitle: 'AI Studio',
    newChat: 'محادثة جديدة',
    chat: 'محادثة',
    tools: 'أدوات ومواقع',
    media: 'مخزن الوسائط',
    drive: 'Google Drive',
    settings: 'الإعدادات',
    toggleSidebar: 'طي / فتح الشريط الجانبي',
    cpu: 'المعالج',
    ram: 'الذاكرة',
    diskFree: 'المساحة الحرة',
    activeAccount: 'الحساب النشط',
    switchAccount: 'التبديل لحساب آخر:',
    switchBtn: 'تبديل',
    addAccount: 'إضافة حساب أو تعديل الحسابات',
    manageAccounts: 'إدارة الحسابات',
    aiSettings: 'إعدادات مفاتيح AI (Gemini & ChatGPT)',
    signOut: 'تسجيل الخروج',
    askPlaceholder: 'اسأل R3 أي شيء، أو تحدث صوتياً، أو ارفع ملفات وصور للتحليل...',
    welcomeGreeting: 'مرحباً بك في R3 AI Studio',
    welcomeDesc: 'مساعدك الذكي فائق التطور واستوديو الوسائط للتحليل والتطوير والإنتاجية العالية.',
    feature1Title: '✨ استفسارات وتوليد PDF فوري',
    feature1Desc: 'اطرح أي سؤال أو اطلب تقريراً مفصلاً مع إمكانية حفظ الإجابة أو المحادثة كملف PDF أنيق فوراً.',
    feature2Title: '🤖 دعم ChatGPT & Gemini معاً',
    feature2Desc: 'بدّل بين نماذج Google Gemini وسلسلة ChatGPT بكل سلاسة وسرعة فائقة.',
    downloadPdf: 'تحميل PDF',
    printPdf: 'طباعة',
    copy: 'نسخ النص',
    copied: 'تم النسخ!',
    stop: 'إيقاف التوليد',
    send: 'إرسال',
    theme: 'المظهر',
    dark: 'داكن',
    light: 'فاتح',
    language: 'اللغة',
    arabic: 'العربية',
    english: 'English',
    mediaVaultTitle: 'مخزن ومشغل الوسائط',
    mediaVaultSub: 'تشغيل مستمر في الخلفية للصوتيات حتى أثناء تصفح المحادثات ودليل الأدوات',
    importMedia: 'استيراد وسائط جديدة',
    refresh: 'تحديث',
    searchMedia: 'بحث في الوسائط باسم الملف أو الصيغة...',
    all: 'الكل',
    video: 'فيديو',
    audio: 'صوتيات',
    images: 'صور',
    totalStorage: 'السعة الإجمالية',
    emptyMedia: 'لا توجد وسائط محفوظة حالياً',
    importNow: 'استيراد ملفات الآن',
    chatGptNotice: 'ChatGPT API مفعل',
    geminiNotice: 'Gemini API مفعل (مجاني)',
    addApiKey: 'إضافة مفتاح API',
    geminiActive: 'Gemini مفعل',
    chatGptActive: 'ChatGPT مفعل',
    directDownload: 'تحميل مباشر',
    quickTools: 'مواقع مميزة سريعة',
    usefulSites: 'دليل ومستودع الأدوات والمواقع المفيدة',
    user: 'أنت',
    assistant: 'R3 AI',
    voiceInput: 'إدخال صوتي (تحدث)',
    listening: 'جاري الاستماع... تحدث الآن',
    readAloud: 'قراءة الإجابة صوتياً',
    stopReading: 'إيقاف القراءة الصوتية',
    commandPalette: 'لوحة الأوامر السريعة',
    searchCommands: 'ابحث عن أداة أو أمر أو اضغط Ctrl+K...',
    searchChats: 'بحث في المحادثات...',
    regenerate: 'إعادة التوليد',
    exportMarkdown: 'تصدير كـ Markdown (.md)',
    exportTxt: 'تصدير كـ نص (.txt)',
    speed: 'السرعة',
    quickPromptsTitle: 'اقتراحات سريعة للبدء:',
    chipReport: '📝 كتابة تقرير تحليلي وتنسيقه كـ PDF',
    chipCode: '💻 فحص وتصحيح كود برمجي باحترافية',
    chipDesign: '🎨 توليد أفكار لتصميم واجهة مستخدم (UI/UX)',
    chipPdf: '📊 تحليل مستند وتلخيصه بنقاط رئيسية',
  },
  en: {
    appName: 'R3',
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
    askPlaceholder: 'Ask R3 anything, use voice, or attach files & code...',
    welcomeGreeting: 'Welcome to R3 AI Studio',
    welcomeDesc: 'Your next-gen intelligent AI workstation & media studio for rapid productivity and creative analysis.',
    feature1Title: '✨ Instant Answers & PDF Export',
    feature1Desc: 'Ask any question or request detailed reports, then export to PDF with a single click.',
    feature2Title: '🤖 Dual Gemini & ChatGPT Support',
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
    arabic: 'العربية',
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
    assistant: 'R3 AI',
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
    chipReport: '📝 Write an in-depth analytical report for PDF',
    chipCode: '💻 Debug and review my code snippets',
    chipDesign: '🎨 Brainstorm modern UI/UX design concepts',
    chipPdf: '📊 Summarize document and extract bullet points',
  },
};
