export interface UsefulWebsite {
  id: string;
  name: string;
  url: string;
  category: 'AI' | 'Dev' | 'Design' | 'Productivity' | 'Education' | 'Tools' | 'Data';
  description: string;
  icon: string;
  badge?: string;
  tags: string[];
}

export const CATEGORIES = [
  { id: 'all', name: 'الكل (All)', icon: '🌟' },
  { id: 'AI', name: 'ذكاء اصطناعي (AI)', icon: '🤖' },
  { id: 'Dev', name: 'برمجة وتطوير (Dev)', icon: '💻' },
  { id: 'Design', name: 'تصميم وميديا (Design)', icon: '🎨' },
  { id: 'Productivity', name: 'إنتاجية وعمل (Productivity)', icon: '⚡' },
  { id: 'Education', name: 'تعليم ومعرفة (Education)', icon: '📚' },
  { id: 'Tools', name: 'أدوات ومرافق ويب (Web Tools)', icon: '🛠️' },
  { id: 'Data', name: 'بيانات وأبحاث (Data & APIs)', icon: '📊' },
];

export const USEFUL_WEBSITES: UsefulWebsite[] = [
  // ==================== 1. AI & Machine Learning ====================
  {
    id: 'ai-gemini',
    name: 'Google Gemini',
    url: 'https://gemini.google.com',
    category: 'AI',
    description: 'الذكاء الاصطناعي المتطور من جوجل لتحليل النصوص والصور والملفات.',
    icon: '✨',
    badge: 'Popular',
    tags: ['Google', 'Chatbot', 'Multimodal']
  },
  {
    id: 'ai-chatgpt',
    name: 'ChatGPT',
    url: 'https://chat.openai.com',
    category: 'AI',
    description: 'المنصة الرائدة في المحادثات وتوليد المحتوى والبرمجة من OpenAI.',
    icon: '🧠',
    badge: 'Popular',
    tags: ['OpenAI', 'Chat', 'GPT-4o']
  },
  {
    id: 'ai-claude',
    name: 'Claude AI',
    url: 'https://claude.ai',
    category: 'AI',
    description: 'نموذج الذكاء الاصطناعي من Anthropic المتفوق في البرمجة والتحليل الدقيق.',
    icon: '🎭',
    badge: 'Top Pick',
    tags: ['Anthropic', 'Coding', 'Analysis']
  },
  {
    id: 'ai-perplexity',
    name: 'Perplexity AI',
    url: 'https://www.perplexity.ai',
    category: 'AI',
    description: 'محرك بحث فائق الذكاء يقدم إجابات موثقة بالمصادر وروابط الويب.',
    icon: '🔍',
    tags: ['Search', 'Research', 'Citations']
  },
  {
    id: 'ai-huggingface',
    name: 'Hugging Face',
    url: 'https://huggingface.co',
    category: 'AI',
    description: 'المجتمع العالمي الأول لنماذج ومكتبات ومجموعات بيانات الذكاء الاصطناعي.',
    icon: '🤗',
    tags: ['Open Source', 'Models', 'Datasets']
  },
  {
    id: 'ai-aistudio',
    name: 'Google AI Studio',
    url: 'https://aistudio.google.com',
    category: 'AI',
    description: 'منصة اختبار وتطوير مفاتيح وتطبيقات Gemini API مباشرة من جوجل.',
    icon: '🚀',
    badge: 'API Hub',
    tags: ['Gemini', 'Developer', 'API']
  },
  {
    id: 'ai-midjourney',
    name: 'Midjourney',
    url: 'https://www.midjourney.com',
    category: 'AI',
    description: 'أقوى أداة في العالم لتوليد الصور والأعمال الفنية بجودة سينمائية فائقة.',
    icon: '🎨',
    tags: ['Images', 'Art', 'Generative']
  },
  {
    id: 'ai-leonardo',
    name: 'Leonardo.ai',
    url: 'https://leonardo.ai',
    category: 'AI',
    description: 'منصة احترافية لتوليد وتعديل الصور وتصميم الشخصيات والأصول ثلاثية الأبعاد.',
    icon: '🦁',
    tags: ['Images', 'Assets', 'Design']
  },
  {
    id: 'ai-elevenlabs',
    name: 'ElevenLabs',
    url: 'https://elevenlabs.io',
    category: 'AI',
    description: 'توليد أصوات بشرية طبيعية واقعية واستنساخ الأصوات بعدة لغات.',
    icon: '🎙️',
    tags: ['Voice', 'TTS', 'Audio']
  },
  {
    id: 'ai-runway',
    name: 'RunwayML',
    url: 'https://runwayml.com',
    category: 'AI',
    description: 'إنشاء وتعديل الفيديوهات ومؤثرات الفيديو باستخدام الذكاء الاصطناعي التوليدي.',
    icon: '🎬',
    tags: ['Video', 'Gen-2', 'Effects']
  },
  {
    id: 'ai-suno',
    name: 'Suno AI',
    url: 'https://suno.com',
    category: 'AI',
    description: 'توليد أغاني ومقاطع موسيقية كاملة بالكلمات والألحان بضغطة زر واحدة.',
    icon: '🎵',
    tags: ['Music', 'Audio', 'Creative']
  },
  {
    id: 'ai-deepseek',
    name: 'DeepSeek',
    url: 'https://chat.deepseek.com',
    category: 'AI',
    description: 'نماذج استدلال وبرمجة متقدمة مفتوحة ومنافسة قوية في حل المسائل المعقدة.',
    icon: '🐋',
    tags: ['Reasoning', 'Code', 'Open']
  },
  {
    id: 'ai-v0',
    name: 'v0 by Vercel',
    url: 'https://v0.dev',
    category: 'AI',
    description: 'توليد واجهات مستخدم React و Tailwind CSS عبر الأوامر النصية فوراً.',
    icon: '⚡',
    tags: ['UI', 'React', 'Frontend']
  },
  {
    id: 'ai-cursor',
    name: 'Cursor IDE',
    url: 'https://www.cursor.com',
    category: 'AI',
    description: 'محرر الأكواد الذكي المبني على VS Code والمزود بأقوى ميزات الـ AI.',
    icon: '🖱️',
    tags: ['Editor', 'Coding', 'Productivity']
  },
  {
    id: 'ai-replicate',
    name: 'Replicate',
    url: 'https://replicate.com',
    category: 'AI',
    description: 'تشغيل آلاف نماذج الذكاء الاصطناعي المفتوحة المصدر عبر سحابة API سريعة.',
    icon: '📦',
    tags: ['Cloud', 'API', 'OpenSource']
  },
  {
    id: 'ai-phind',
    name: 'Phind',
    url: 'https://www.phind.com',
    category: 'AI',
    description: 'محرك بحث وإجابة مخصص للمطورين والمبرمجين مع شروحات أكواد دقيقة.',
    icon: '🧭',
    tags: ['Coding', 'Search', 'Developers']
  },
  {
    id: 'ai-poe',
    name: 'Poe by Quora',
    url: 'https://poe.com',
    category: 'AI',
    description: 'منصة موحدة تتيح لك الوصول لكافة بوتات ونماذج الذكاء الاصطناعي في مكان واحد.',
    icon: '🐦',
    tags: ['Multi-model', 'Bots', 'Chat']
  },
  {
    id: 'ai-civitai',
    name: 'Civitai',
    url: 'https://civitai.com',
    category: 'AI',
    description: 'مستودع ضخم لنماذج و LoRA الخاصة بـ Stable Diffusion لتوليد الصور.',
    icon: '🔮',
    tags: ['Stable Diffusion', 'Models', 'LoRA']
  },

  // ==================== 2. Development & Coding ====================
  {
    id: 'dev-github',
    name: 'GitHub',
    url: 'https://github.com',
    category: 'Dev',
    description: 'أكبر منصة عالمية لاستضافة وإدارة مستودعات الأكواد والتعاون البرمجي.',
    icon: '🐙',
    badge: 'Essential',
    tags: ['Git', 'Repositories', 'OpenSource']
  },
  {
    id: 'dev-stackoverflow',
    name: 'Stack Overflow',
    url: 'https://stackoverflow.com',
    category: 'Dev',
    description: 'مجتمع الأسئلة والأجوبة البرمجية الأكبر لحل المشاكل والأخطاء.',
    icon: '🥞',
    tags: ['Q&A', 'Debugging', 'Community']
  },
  {
    id: 'dev-vscode-web',
    name: 'VS Code for Web',
    url: 'https://vscode.dev',
    category: 'Dev',
    description: 'محرر Visual Studio Code كامل يعمل في المتصفح مباشرة دون تثبيت.',
    icon: '💻',
    tags: ['Editor', 'Web', 'Microsoft']
  },
  {
    id: 'dev-codepen',
    name: 'CodePen',
    url: 'https://codepen.io',
    category: 'Dev',
    description: 'بيئة تفاعلية لتجربة ومشاركة أكواد HTML و CSS و JavaScript الحية.',
    icon: '🖋️',
    tags: ['Frontend', 'Playground', 'CSS']
  },
  {
    id: 'dev-replit',
    name: 'Replit',
    url: 'https://replit.com',
    category: 'Dev',
    description: 'بيئة تطوير برمجية سحابية متكاملة تدعم جميع لغات البرمجة مع استضافة سريعة.',
    icon: '🌀',
    tags: ['Cloud IDE', 'Python', 'Fullstack']
  },
  {
    id: 'dev-roadmap',
    name: 'Roadmap.sh',
    url: 'https://roadmap.sh',
    category: 'Dev',
    description: 'خرائط طريق ومسارات تعليمية تفاعلية لاحتراف جميع مجالات البرمجة والتقنية.',
    icon: '🗺️',
    badge: 'Top Pick',
    tags: ['Learning', 'Careers', 'Guides']
  },
  {
    id: 'dev-mdn',
    name: 'MDN Web Docs',
    url: 'https://developer.mozilla.org',
    category: 'Dev',
    description: 'المرجع الرسمي والأشمل لتوثيق تقنيات الويب: HTML و CSS و JavaScript.',
    icon: '📖',
    tags: ['Docs', 'Mozilla', 'Standards']
  },
  {
    id: 'dev-devdocs',
    name: 'DevDocs.io',
    url: 'https://devdocs.io',
    category: 'Dev',
    description: 'توثيق سريع وشامل لأكثر من 100 لغة ومكتبة برمجية في واجهة موحدة بلا إنترنت.',
    icon: '📑',
    tags: ['Documentation', 'Offline', 'Search']
  },
  {
    id: 'dev-leetcode',
    name: 'LeetCode',
    url: 'https://leetcode.com',
    category: 'Dev',
    description: 'أشهر منصة لحل التحديات البرمجية والتحضير للمقابلات التقنية للخوارزميات.',
    icon: '🧩',
    tags: ['Algorithms', 'Interview', 'Practice']
  },
  {
    id: 'dev-regex101',
    name: 'Regex101',
    url: 'https://regex101.com',
    category: 'Dev',
    description: 'أفضل أداة لاختبار وتحليل وشرح التعابير النمطية (Regular Expressions).',
    icon: '🎯',
    tags: ['Regex', 'Tool', 'Testing']
  },
  {
    id: 'dev-rayso',
    name: 'Ray.so',
    url: 'https://ray.so',
    category: 'Dev',
    description: 'تحويل مقتطفات الأكواد البرمجية إلى لقطات صور جميلة للمشاركة.',
    icon: '📸',
    tags: ['Code Snippets', 'Images', 'Sharing']
  },
  {
    id: 'dev-bundlephobia',
    name: 'Bundlephobia',
    url: 'https://bundlephobia.com',
    category: 'Dev',
    description: 'فحص حجم وتأثير أي حزمة npm على أداء وسرعة تطبيقك قبل تثبيتها.',
    icon: '📦',
    tags: ['npm', 'Performance', 'JavaScript']
  },
  {
    id: 'dev-w3schools',
    name: 'W3Schools',
    url: 'https://www.w3schools.com',
    category: 'Dev',
    description: 'دروس وتمارين عملية مبسطة لتعلم أساسيات لغات البرمجة وتطوير الويب.',
    icon: '🏫',
    tags: ['Tutorials', 'Beginners', 'Web']
  },
  {
    id: 'dev-dockerhub',
    name: 'Docker Hub',
    url: 'https://hub.docker.com',
    category: 'Dev',
    description: 'المكتبة المركزية الرسمية للبحث عن وتحميل صور وحاويات Docker.',
    icon: '🐳',
    tags: ['Containers', 'DevOps', 'Cloud']
  },
  {
    id: 'dev-carbon',
    name: 'Carbon',
    url: 'https://carbon.now.sh',
    category: 'Dev',
    description: 'إنشاء صور أنيقة واحترافية لشفراتك البرمجية مع خيارات تخصيص متعددة.',
    icon: '💎',
    tags: ['Code', 'Screenshots', 'Design']
  },
  {
    id: 'dev-glitch',
    name: 'Glitch',
    url: 'https://glitch.com',
    category: 'Dev',
    description: 'بناء ونشر تطبيقات الويب وتجربتها بشكل جماعي فوري وسلس.',
    icon: '🎏',
    tags: ['NodeJS', 'Web', 'Hosting']
  },

  // ==================== 3. Design & Creative ====================
  {
    id: 'des-figma',
    name: 'Figma',
    url: 'https://www.figma.com',
    category: 'Design',
    description: 'المنصة العالمية الأولى لتصميم واجهات وتجارب المستخدم (UI/UX) والتعاون الحي.',
    icon: '📐',
    badge: 'Essential',
    tags: ['UI/UX', 'Vector', 'Prototyping']
  },
  {
    id: 'des-canva',
    name: 'Canva',
    url: 'https://www.canva.com',
    category: 'Design',
    description: 'أسهل منصة لتصميم المنشورات والشعارات والعروض التقديمية بقوالب جاهزة.',
    icon: '🎨',
    badge: 'Popular',
    tags: ['Graphics', 'Social Media', 'Easy']
  },
  {
    id: 'des-dribbble',
    name: 'Dribbble',
    url: 'https://dribbble.com',
    category: 'Design',
    description: 'مجتمع عالمي لاستلهام أرقى وأحدث تصاميم الجرافيك وواجهات التطبيقات.',
    icon: '🏀',
    tags: ['Inspiration', 'UI/UX', 'Portfolio']
  },
  {
    id: 'des-behance',
    name: 'Behance',
    url: 'https://www.behance.net',
    category: 'Design',
    description: 'شبكة أدوبي العالمية لعرض ومشاركة الأعمال الإبداعية والمشاريع الكاملة.',
    icon: '💼',
    tags: ['Adobe', 'Portfolio', 'Art']
  },
  {
    id: 'des-unsplash',
    name: 'Unsplash',
    url: 'https://unsplash.com',
    category: 'Design',
    description: 'مكتبة ضخمة لملايين الصور عالية الدقة مجانية تماماً للاستخدام التجاري والشخصي.',
    icon: '📷',
    tags: ['Stock Photos', 'Free', 'High Quality']
  },
  {
    id: 'des-pexels',
    name: 'Pexels',
    url: 'https://www.pexels.com',
    category: 'Design',
    description: 'مكتبة ممتازة للصور ومقاطع الفيديو المجانية عالية الدقة وبدون حقوق ملكية.',
    icon: '🎥',
    tags: ['Videos', 'Photos', 'Free']
  },
  {
    id: 'des-coolors',
    name: 'Coolors',
    url: 'https://coolors.co',
    category: 'Design',
    description: 'مولد لوحات ألوان فائق السرعة لتنسيق ألوان متناسقة وتصديرها بجميع الصيغ.',
    icon: '🎨',
    tags: ['Palette', 'Colors', 'Generator']
  },
  {
    id: 'des-flaticon',
    name: 'Flaticon',
    url: 'https://www.flaticon.com',
    category: 'Design',
    description: 'أكبر قاعدة بيانات للأيقونات والرسومات التوضيحية بصيغ SVG و PNG.',
    icon: '🏷️',
    tags: ['Icons', 'SVG', 'Vector']
  },
  {
    id: 'des-photopea',
    name: 'Photopea',
    url: 'https://www.photopea.com',
    category: 'Design',
    description: 'محرر صور متقدم مجاني يعمل بالمتصفح ويدعم ملفات Photoshop (PSD) بالكامل.',
    icon: '🖌️',
    badge: 'Top Pick',
    tags: ['Photoshop', 'PSD', 'Editor']
  },
  {
    id: 'des-removebg',
    name: 'Remove.bg',
    url: 'https://www.remove.bg',
    category: 'Design',
    description: 'إزالة خلفية أي صورة بذكاء ودقة خلال 3 ثوانٍ بضغطة زر واحدة.',
    icon: '✂️',
    tags: ['Background', 'AI', 'Images']
  },
  {
    id: 'des-googlefonts',
    name: 'Google Fonts',
    url: 'https://fonts.google.com',
    category: 'Design',
    description: 'مكتبة خطوط مجانية مفتوحة المصدر تضم مئات الخطوط العربية والإنجليزية.',
    icon: '🔤',
    tags: ['Typography', 'Fonts', 'Arabic']
  },
  {
    id: 'des-svgrepo',
    name: 'SVG Repo',
    url: 'https://www.svgrepo.com',
    category: 'Design',
    description: 'أكثر من 500,000 ناقل (SVG) وأيقونة مجانية قابلة للتعديل والتحميل المباشر.',
    icon: '⚡',
    tags: ['SVG', 'Vector', 'Free']
  },
  {
    id: 'des-mobbin',
    name: 'Mobbin',
    url: 'https://mobbin.com',
    category: 'Design',
    description: 'أكبر مرجع لأنماط وشاشات واجهات أشهر تطبيقات iOS و Android الواقعية.',
    icon: '📱',
    tags: ['UI Patterns', 'Mobile', 'Inspiration']
  },
  {
    id: 'des-spline',
    name: 'Spline 3D',
    url: 'https://spline.design',
    category: 'Design',
    description: 'أداة تصميم تفاعلية لتصميم العناصر ثلاثية الأبعاد (3D) للويب بسهولة.',
    icon: '🧊',
    tags: ['3D', 'Interactive', 'Web']
  },
  {
    id: 'des-lottiefiles',
    name: 'LottieFiles',
    url: 'https://lottiefiles.com',
    category: 'Design',
    description: 'رسوم متحركة تفاعلية خفيفة الوزن للمواقع وتطبيقات الهاتف بصيغة Lottie JSON.',
    icon: '✨',
    tags: ['Animations', 'Lottie', 'UI']
  },

  // ==================== 4. Productivity & Office ====================
  {
    id: 'prod-notion',
    name: 'Notion',
    url: 'https://www.notion.so',
    category: 'Productivity',
    description: 'مساحة العمل المتكاملة لإدارة المشاريع والمهام وتدوين الملاحظات وقواعد البيانات.',
    icon: '📓',
    badge: 'Essential',
    tags: ['Notes', 'Workspace', 'Wiki']
  },
  {
    id: 'prod-trello',
    name: 'Trello',
    url: 'https://trello.com',
    category: 'Productivity',
    description: 'لوحات كانبان بصرية سهلة وممتعة لإدارة وتنظيم المهام والمشاريع الجماعية.',
    icon: '📋',
    tags: ['Kanban', 'Agile', 'Tasks']
  },
  {
    id: 'prod-obsidian',
    name: 'Obsidian',
    url: 'https://obsidian.md',
    category: 'Productivity',
    description: 'تطبيق إدارة المعرفة والملاحظات المرتبطة بنظام ملفات Markdown المحلي.',
    icon: '💎',
    tags: ['Knowledge', 'Markdown', 'Local']
  },
  {
    id: 'prod-miro',
    name: 'Miro',
    url: 'https://miro.com',
    category: 'Productivity',
    description: 'سبورة بيضاء بصرية تفاعلية للتخطيط الذهني والعصف الذهني والتعاون الجماعي.',
    icon: '🟡',
    tags: ['Whiteboard', 'Brainstorming', 'Collab']
  },
  {
    id: 'prod-linear',
    name: 'Linear',
    url: 'https://linear.app',
    category: 'Productivity',
    description: 'أسرع وأرقى منصة لإدارة وتتبع دورة حياة وتطوير البرمجيات للفرق الحديثة.',
    icon: '📐',
    badge: 'Top Pick',
    tags: ['Issues', 'Sprints', 'Dev Teams']
  },
  {
    id: 'prod-clickup',
    name: 'ClickUp',
    url: 'https://clickup.com',
    category: 'Productivity',
    description: 'منصة إدارة إنتاجية شاملة تجمع المهام والوثائق والدردشة وتتبع الوقت.',
    icon: '⚡',
    tags: ['Tasks', 'Docs', 'Time Tracking']
  },
  {
    id: 'prod-clockify',
    name: 'Clockify',
    url: 'https://clockify.me',
    category: 'Productivity',
    description: 'أداة مجانية لتتبع ساعات العمل وإدارة الإنتاجية والتقارير للفرق والمستقلين.',
    icon: '⏱️',
    tags: ['Time Tracker', 'Billing', 'Productivity']
  },
  {
    id: 'prod-loom',
    name: 'Loom',
    url: 'https://www.loom.com',
    category: 'Productivity',
    description: 'تسجيل ومشاركة فيديوهات سريعة للشاشة وصوتك للتواصل العملي الفعال.',
    icon: '📹',
    tags: ['Screen Recording', 'Video', 'Async']
  },
  {
    id: 'prod-calendly',
    name: 'Calendly',
    url: 'https://calendly.com',
    category: 'Productivity',
    description: 'جدولة الاجتماعات والمواعيد تلقائياً دون إرسال رسائل بريد متبادلة.',
    icon: '📅',
    tags: ['Scheduling', 'Calendar', 'Meetings']
  },
  {
    id: 'prod-excalidraw',
    name: 'Excalidraw',
    url: 'https://excalidraw.com',
    category: 'Productivity',
    description: 'سبورة رسم تخطيطي حرة بنمط الرسم اليدوي لتوضيح الأفكار والمعماريات.',
    icon: '✏️',
    badge: 'Favorite',
    tags: ['Diagrams', 'Hand-drawn', 'Architecture']
  },
  {
    id: 'prod-ilovepdf',
    name: 'I Love PDF',
    url: 'https://www.ilovepdf.com',
    category: 'Productivity',
    description: 'أدوات مجانية كاملة لدمج وضغط وتحويل وفك تشفير ملفات الـ PDF بسهولة.',
    icon: '📑',
    tags: ['PDF', 'Convert', 'Tools']
  },
  {
    id: 'prod-wetransfer',
    name: 'WeTransfer',
    url: 'https://wetransfer.com',
    category: 'Productivity',
    description: 'إرسال ونقل الملفات الكبيرة حتى 2 جيجابايت مجاناً لأي بريد إلكتروني.',
    icon: '📦',
    tags: ['File Transfer', 'Sharing', 'Cloud']
  },
  {
    id: 'prod-deepl',
    name: 'DeepL Translate',
    url: 'https://www.deepl.com/translator',
    category: 'Productivity',
    description: 'أدق وأفضل مترجم نصوص ومستندات بالذكاء الاصطناعي مع الحفاظ على السياق.',
    icon: '🌐',
    tags: ['Translation', 'AI', 'Documents']
  },
  {
    id: 'prod-todoist',
    name: 'Todoist',
    url: 'https://todoist.com',
    category: 'Productivity',
    description: 'منظم المهام اليومية وقوائم الإنجاز الأبسط والأكثر شهرة عبر جميع الأجهزة.',
    icon: '✅',
    tags: ['To-Do', 'Habits', 'Organization']
  },

  // ==================== 5. Learning & Knowledge ====================
  {
    id: 'edu-coursera',
    name: 'Coursera',
    url: 'https://www.coursera.org',
    category: 'Education',
    description: 'دورات وشهادات احترافية معتمدة من كبرى جامعات وشركات العالم (Google, IBM).',
    icon: '🎓',
    badge: 'Accredited',
    tags: ['Courses', 'Degrees', 'Certificates']
  },
  {
    id: 'edu-edx',
    name: 'edX',
    url: 'https://www.edx.org',
    category: 'Education',
    description: 'منصة مساقات جامعية مفتوحة تأسست من Harvard و MIT في شتى التخصصات.',
    icon: '🏛️',
    tags: ['Universities', 'Free', 'Harvard']
  },
  {
    id: 'edu-freecodecamp',
    name: 'freeCodeCamp',
    url: 'https://www.freecodecamp.org',
    category: 'Education',
    description: 'أفضل منهج مجاني تفاعلي لتعلم تطوير البرمجيات والحصول على شهادات معتمدة.',
    icon: '🔥',
    badge: '100% Free',
    tags: ['Coding', 'Certifications', 'Web']
  },
  {
    id: 'edu-khan',
    name: 'Khan Academy',
    url: 'https://www.khanacademy.org',
    category: 'Education',
    description: 'تعليم مجاني متاح للجميع في الرياضيات والعلوم والبرمجة من الصفر للاحتراف.',
    icon: '🌱',
    tags: ['Math', 'Science', 'Beginners']
  },
  {
    id: 'edu-mit',
    name: 'MIT OpenCourseWare',
    url: 'https://ocw.mit.edu',
    category: 'Education',
    description: 'مقررات ومحاضرات معهد ماساتشوستس للتقنية (MIT) كاملة ومجانية للعامة.',
    icon: '🔬',
    tags: ['MIT', 'Lectures', 'Engineering']
  },
  {
    id: 'edu-arxiv',
    name: 'arXiv',
    url: 'https://arxiv.org',
    category: 'Education',
    description: 'أرشيف الأوراق البحثية الأكاديمية الأول في الذكاء الاصطناعي والفيزياء والرياضيات.',
    icon: '📜',
    tags: ['Research', 'Papers', 'AI']
  },
  {
    id: 'edu-wolfram',
    name: 'Wolfram Alpha',
    url: 'https://www.wolframalpha.com',
    category: 'Education',
    description: 'محرك المعرفة الحاسوبية القادر على حل أصعب المسائل الرياضية والمعادلات.',
    icon: '🧮',
    badge: 'Math Power',
    tags: ['Math', 'Computation', 'Science']
  },
  {
    id: 'edu-duolingo',
    name: 'Duolingo',
    url: 'https://www.duolingo.com',
    category: 'Education',
    description: 'تعلم لغات جديدة بطريقة تفاعلية ممتعة تعتمد على الألعاب والتحفيز المستمر.',
    icon: '🦉',
    tags: ['Languages', 'Gamified', 'Learning']
  },
  {
    id: 'edu-scholar',
    name: 'Google Scholar',
    url: 'https://scholar.google.com',
    category: 'Education',
    description: 'محرك بحث متقدم للأبحاث العلمية والرسائل والكتب والمقالات المحكّمة.',
    icon: '📚',
    tags: ['Academic', 'Citations', 'Papers']
  },
  {
    id: 'edu-archive',
    name: 'Internet Archive',
    url: 'https://archive.org',
    category: 'Education',
    description: 'المكتبة الرقمية العالمية المجانية لملايين الكتب والمواقع والبرامج القديمة.',
    icon: '🏛️',
    tags: ['Library', 'History', 'Wayback']
  },

  // ==================== 6. Web Tools & Utilities ====================
  {
    id: 'tool-caniuse',
    name: 'Can I Use',
    url: 'https://caniuse.com',
    category: 'Tools',
    description: 'جداول توافق وتطابق ميزات وتقنيات HTML و CSS و JS عبر جميع المتصفحات.',
    icon: '🌐',
    badge: 'Essential',
    tags: ['Compatibility', 'Browsers', 'Web']
  },
  {
    id: 'tool-virustotal',
    name: 'VirusTotal',
    url: 'https://www.virustotal.com',
    category: 'Tools',
    description: 'فحص الملفات والروابط المشبوهة بأكثر من 70 محرك مكافحة فيروسات فوراً.',
    icon: '🛡️',
    badge: 'Security',
    tags: ['Security', 'Antivirus', 'Scanner']
  },
  {
    id: 'tool-speedtest',
    name: 'Speedtest by Ookla',
    url: 'https://www.speedtest.net',
    category: 'Tools',
    description: 'قياس سرعة اتصال الإنترنت وسرعة التنزيل والرفع وزمن الاستجابة (Ping).',
    icon: '⚡',
    tags: ['Internet', 'Speed', 'Network']
  },
  {
    id: 'tool-cyberchef',
    name: 'CyberChef',
    url: 'https://gchq.github.io/CyberChef',
    category: 'Tools',
    description: 'المطواة السويسرية للتحويلات الرقمية وفك وتشفير البيانات والـ Base64 والهاش.',
    icon: '👨‍🍳',
    tags: ['Crypto', 'Encoding', 'Analysis']
  },
  {
    id: 'tool-jsonformatter',
    name: 'JSON Formatter & Validator',
    url: 'https://jsonformatter.org',
    category: 'Tools',
    description: 'تنسيق والتحقق من صحة ملفات وبيانات JSON وتصحيح الأخطاء وتحويلها.',
    icon: '🧱',
    tags: ['JSON', 'Format', 'Validator']
  },
  {
    id: 'tool-convertio',
    name: 'Convertio',
    url: 'https://convertio.co',
    category: 'Tools',
    description: 'محول صيغ شامل يدعم أكثر من 300 صيغة للملفات والمستندات والصوت والفيديو.',
    icon: '🔄',
    tags: ['Converter', 'Formats', 'Files']
  },
  {
    id: 'tool-tinypng',
    name: 'TinyPNG',
    url: 'https://tinypng.com',
    category: 'Tools',
    description: 'ضغط صور WebP و PNG و JPEG بذكاء فائق دون أي فقدان ملحوظ في الجودة.',
    icon: '🐼',
    tags: ['Compression', 'Images', 'Web Optimization']
  },
  {
    id: 'tool-squoosh',
    name: 'Squoosh by Google',
    url: 'https://squoosh.app',
    category: 'Tools',
    description: 'أداة جوجل لضغط وتحويل الصور في المتصفح مع مقارنة فورية بين قبل وبعد.',
    icon: '🥑',
    tags: ['Google', 'Image Compression', 'WebP']
  },
  {
    id: 'tool-10minutemail',
    name: '10 Minute Mail',
    url: 'https://10minutemail.com',
    category: 'Tools',
    description: 'بريد إلكتروني مؤقت وصالح لمدة 10 دقائق لتجنب الرسائل المزعجة وتفعيل الحسابات.',
    icon: '⏳',
    tags: ['Temp Mail', 'Privacy', 'Spam']
  },
  {
    id: 'tool-haveibeenpwned',
    name: 'Have I Been Pwned',
    url: 'https://haveibeenpwned.com',
    category: 'Tools',
    description: 'تحقق مما إذا كان بريدك الإلكتروني أو كلمة مرورك قد تسربت في اختراقات البيانات.',
    icon: '🔓',
    tags: ['Breach', 'Security', 'Privacy']
  },
  {
    id: 'tool-alternativeto',
    name: 'AlternativeTo',
    url: 'https://alternativeto.net',
    category: 'Tools',
    description: 'العثور على بدائل مجانية ومفتوحة المصدر لأي برنامج أو تطبيق شهير.',
    icon: '🔀',
    tags: ['Software', 'Alternatives', 'OpenSource']
  },
  {
    id: 'tool-producthunt',
    name: 'Product Hunt',
    url: 'https://www.producthunt.com',
    category: 'Tools',
    description: 'المنصة العالمية لاكتشاف أحدث المنتجات والتطبيقات والأدوات التقنية يومياً.',
    icon: '🚀',
    tags: ['Startups', 'Launches', 'Discovery']
  },
  {
    id: 'tool-whatismyip',
    name: 'WhatIsMyIP',
    url: 'https://www.whatismyip.com',
    category: 'Tools',
    description: 'معرفة عنوان الـ IP العام وموقعك الجغرافي وتفاصيل شبكتك بسرعة.',
    icon: '📍',
    tags: ['IP', 'Network', 'Info']
  },

  // ==================== 7. Data, APIs & Research ====================
  {
    id: 'data-kaggle',
    name: 'Kaggle',
    url: 'https://www.kaggle.com',
    category: 'Data',
    description: 'أكبر مجتمع لعلماء البيانات ومكتبة ضخمة لمجموعات البيانات والمسابقات.',
    icon: '📊',
    badge: 'Essential',
    tags: ['Datasets', 'Competitions', 'Data Science']
  },
  {
    id: 'data-colab',
    name: 'Google Colab',
    url: 'https://colab.research.google.com',
    category: 'Data',
    description: 'دفاتر بايثون تفاعلية مع وحدات معالجة رسومية (GPU) مجانية من جوجل.',
    icon: '⚡',
    badge: 'Google',
    tags: ['Python', 'GPU', 'Jupyter']
  },
  {
    id: 'data-publicapis',
    name: 'Public APIs',
    url: 'https://publicapis.io',
    category: 'Data',
    description: 'دليل مجمع لمئات الـ APIs العامة والمجانية للمطورين في مختلف المجالات.',
    icon: '🔌',
    tags: ['APIs', 'Free', 'Backend']
  },
  {
    id: 'data-rapidapi',
    name: 'RapidAPI Hub',
    url: 'https://rapidapi.com/hub',
    category: 'Data',
    description: 'أكبر سوق للـ APIs العالمية مع واجهة اختبار وإدارة مفاتيح موحدة.',
    icon: '⚡',
    tags: ['API Marketplace', 'Testing', 'SDK']
  },
  {
    id: 'data-ourworldindata',
    name: 'Our World in Data',
    url: 'https://ourworldindata.org',
    category: 'Data',
    description: 'أبحاث وبيانات وإحصائيات موثقة حول التحديات العالمية الكبرى والصحة والبيئة.',
    icon: '🌍',
    tags: ['Statistics', 'Global', 'Research']
  },
  {
    id: 'data-statista',
    name: 'Statista',
    url: 'https://www.statista.com',
    category: 'Data',
    description: 'بوابة رائدة للإحصائيات ودراسات السوق وبيانات الصناعة العالمية.',
    icon: '📈',
    tags: ['Market Research', 'Charts', 'Data']
  },
  {
    id: 'data-tradingview',
    name: 'TradingView',
    url: 'https://www.tradingview.com',
    category: 'Data',
    description: 'أقوى منصة لمتابعة وتحليل الرسوم البيانية للأسواق المالية والعملات الرقمية.',
    icon: '💹',
    tags: ['Finance', 'Stocks', 'Crypto']
  },
  {
    id: 'data-coinmarketcap',
    name: 'CoinMarketCap',
    url: 'https://coinmarketcap.com',
    category: 'Data',
    description: 'المصدر الأكثر موثوقية لمتابعة أسعار وأحجام تداول العملات الرقمية والمشفرة.',
    icon: '🪙',
    tags: ['Crypto', 'Prices', 'Markets']
  },
  {
    id: 'data-worldometer',
    name: 'Worldometer',
    url: 'https://www.worldometers.info',
    category: 'Data',
    description: 'عدادات وإحصاءات حية فورية لسكان العالم والولادات والوفيات والاقتصاد.',
    icon: '🌐',
    tags: ['Live Stats', 'Demographics', 'World']
  }
];
