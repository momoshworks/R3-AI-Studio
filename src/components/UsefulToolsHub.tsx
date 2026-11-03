import React, { useState, useMemo } from 'react';
import {
  Search,
  ExternalLink,
  Plus,
  Star,
  X,
  Globe,
  Trash2,
  Copy,
  Check,
  LayoutGrid,
  List,
} from 'lucide-react';
import { USEFUL_WEBSITES, CATEGORIES, UsefulWebsite } from '../data/usefulWebsites';
import { Theme, Language } from '../utils/translations';

interface UsefulToolsHubProps {
  theme?: Theme;
  lang?: Language;
}

export const UsefulToolsHub: React.FC<UsefulToolsHubProps> = ({
  theme = 'dark',
  lang = 'ar',
}) => {
  const isDark = theme === 'dark';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [copiedSiteId, setCopiedSiteId] = useState<string | null>(null);

  const copySiteUrl = (url: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(url);
    setCopiedSiteId(id);
    setTimeout(() => setCopiedSiteId(null), 2000);
  };
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('NEXUSHUB_FAVORITE_SITES');
      return saved ? JSON.parse(saved) : ['ai-gemini', 'dev-github', 'des-figma', 'prod-notion'];
    } catch {
      return ['ai-gemini', 'dev-github', 'des-figma', 'prod-notion'];
    }
  });

  const [customSites, setCustomSites] = useState<UsefulWebsite[]>(() => {
    try {
      const saved = localStorage.getItem('NEXUSHUB_CUSTOM_SITES');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteUrl, setNewSiteUrl] = useState('');
  const [newSiteDesc, setNewSiteDesc] = useState('');
  const [newSiteCat, setNewSiteCat] = useState<'AI' | 'Dev' | 'Design' | 'Productivity' | 'Education' | 'Tools' | 'Data'>('Tools');

  // Toggle favorite
  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    let updated: string[];
    if (favorites.includes(id)) {
      updated = favorites.filter((f) => f !== id);
    } else {
      updated = [...favorites, id];
    }
    setFavorites(updated);
    localStorage.setItem('NEXUSHUB_FAVORITE_SITES', JSON.stringify(updated));
  };

  // Add custom site
  const handleAddCustomSite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSiteName.trim() || !newSiteUrl.trim()) return;

    let formattedUrl = newSiteUrl.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = 'https://' + formattedUrl;
    }

    const newSite: UsefulWebsite = {
      id: `custom-${Date.now()}`,
      name: newSiteName.trim(),
      url: formattedUrl,
      category: newSiteCat,
      description: newSiteDesc.trim() || 'موقع مخصص تم إضافته من قبل المستخدم.',
      icon: '🔗',
      badge: 'مخصص',
      tags: ['مخصص', newSiteCat],
    };

    const updated = [newSite, ...customSites];
    setCustomSites(updated);
    localStorage.setItem('NEXUSHUB_CUSTOM_SITES', JSON.stringify(updated));

    setNewSiteName('');
    setNewSiteUrl('');
    setNewSiteDesc('');
    setIsAddModalOpen(false);
  };

  const handleDeleteCustomSite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = customSites.filter((s) => s.id !== id);
    setCustomSites(updated);
    localStorage.setItem('NEXUSHUB_CUSTOM_SITES', JSON.stringify(updated));
  };

  // Combined websites list
  const allWebsites = useMemo(() => {
    return [...customSites, ...USEFUL_WEBSITES];
  }, [customSites]);

  // Filtered websites
  const filteredWebsites = useMemo(() => {
    return allWebsites.filter((site) => {
      const matchesCat =
        selectedCategory === 'all' ||
        (selectedCategory === 'favorites' ? favorites.includes(site.id) : site.category === selectedCategory);

      if (!matchesCat) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      const nameMatch = site.name.toLowerCase().includes(q);
      const descMatch = site.description.toLowerCase().includes(q);
      const tagMatch = site.tags.some((t) => t.toLowerCase().includes(q));
      const urlMatch = site.url.toLowerCase().includes(q);

      return nameMatch || descMatch || tagMatch || urlMatch;
    });
  }, [allWebsites, selectedCategory, searchQuery, favorites]);

  return (
    <div
      className={`flex-1 h-full overflow-y-auto p-4 md:p-8 space-y-6 transition-colors ${
        isDark ? 'bg-[#131314] text-gray-100' : 'bg-slate-50 text-slate-900'
      }`}
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* Hero Header */}
      <div className="max-w-6xl mx-auto space-y-4">
        <div
          className={`flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6 ${
            isDark ? 'border-gemini-border' : 'border-slate-200'
          }`}
        >
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-500 via-purple-500 to-amber-400 p-[1.5px] shadow-lg shadow-blue-500/10">
                <div
                  className={`w-full h-full rounded-[14px] flex items-center justify-center ${
                    isDark ? 'bg-[#1e1f20]' : 'bg-white'
                  }`}
                >
                  <Globe className="w-5 h-5 text-blue-500" />
                </div>
              </div>
              <div>
                <h1
                  className={`text-xl md:text-2xl font-bold tracking-tight flex items-center gap-2 ${
                    isDark ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  <span>{lang === 'ar' ? 'دليل ومستودع الأدوات والمواقع المفيدة' : 'Useful Tools & Websites Directory'}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 font-mono">
                    {allWebsites.length}+ {lang === 'ar' ? 'موقع' : 'Sites'}
                  </span>
                </h1>
                <p className={`text-xs md:text-sm ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                  {lang === 'ar'
                    ? 'أفضل المواقع والأدوات العالمية المختارة بعناية في الذكاء الاصطناعي، البرمجة، التصميم، الإنتاجية، والتعليم.'
                    : 'Curated global collection of leading AI, developer, design, and productivity platforms.'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs font-medium shadow-lg transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>{lang === 'ar' ? 'إضافة موقع جديد' : 'Add Website'}</span>
            </button>
          </div>
        </div>

        {/* Search Bar & Filters */}
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Search Input */}
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={lang === 'ar' ? 'ابحث عن أداة أو موقع بالاسم أو التخصص...' : 'Search tools or websites...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full border rounded-xl pl-10 pr-4 py-2 text-xs md:text-sm outline-none focus:border-blue-500 transition-colors shadow-inner ${
                isDark
                  ? 'bg-[#1b1c1e] border-gemini-border text-gray-200 placeholder-gray-500'
                  : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400'
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Count Badge & View Mode Toggle */}
          <div className="flex items-center gap-3">
            <div className="text-xs text-gray-400 font-medium">
              {lang === 'ar' ? 'عرض ' : 'Showing '}
              <span className="text-blue-400 font-bold">{filteredWebsites.length}</span>
              {lang === 'ar' ? ' موقع' : ' sites'}
            </div>

            <div className="flex items-center rounded-xl border p-0.5 border-gemini-border/60 bg-black/10">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
                title={lang === 'ar' ? 'عرض البطاقات الشبكي' : 'Grid View'}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'list'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
                title={lang === 'ar' ? 'عرض القائمة المدمجة' : 'List View'}
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Categories Bar */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-2 no-scrollbar text-xs">
          <button
            onClick={() => setSelectedCategory('favorites')}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 font-medium ${
              selectedCategory === 'favorites'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : isDark
                ? 'bg-[#1b1c1e] hover:bg-white/5 text-gray-400 border border-transparent'
                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>{lang === 'ar' ? `المفضلة (${favorites.length})` : `Favorites (${favorites.length})`}</span>
          </button>

          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 font-medium ${
                selectedCategory === cat.id
                  ? 'bg-blue-600 text-white shadow-md'
                  : isDark
                  ? 'bg-[#1b1c1e] hover:bg-white/5 text-gray-400 border border-transparent'
                  : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
            </button>
          ))}
        </div>

        {/* Websites Grid / List View */}
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-2'
              : 'space-y-2.5 pt-2'
          }
        >
          {filteredWebsites.map((site) => {
            const isFav = favorites.includes(site.id);
            const isCustom = site.id.startsWith('custom-');

            return (
              <div
                key={site.id}
                className={`group border transition-all duration-200 shadow-md relative overflow-hidden ${
                  viewMode === 'grid'
                    ? 'p-4 rounded-2xl flex flex-col justify-between'
                    : 'p-3 rounded-xl flex items-center justify-between gap-4'
                } ${
                  isDark
                    ? 'bg-[#1b1c1e] hover:bg-[#222427] border-gemini-border/70 hover:border-blue-500/50'
                    : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-blue-400'
                }`}
              >
                <div className={viewMode === 'grid' ? 'space-y-3' : 'flex items-center gap-3.5 flex-1 min-w-0'}>
                  {/* Top Card Bar / Icon & Title */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-2.5 space-x-reverse">
                      <div className="w-9 h-9 rounded-xl bg-[#26282b] border border-white/5 flex items-center justify-center text-lg shadow-inner shrink-0">
                        {site.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-semibold text-sm text-gray-100 group-hover:text-blue-300 transition-colors">
                            {site.name}
                          </h3>
                          {site.badge && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-medium">
                              {site.badge}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-500 font-mono truncate block max-w-[170px]" dir="ltr">
                          {site.url.replace(/^https?:\/\//, '')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={(e) => toggleFavorite(site.id, e)}
                        className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-amber-400 transition-colors"
                        title={isFav ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
                      >
                        <Star
                          className={`w-4 h-4 ${
                            isFav ? 'fill-amber-400 text-amber-400' : 'text-gray-500'
                          }`}
                        />
                      </button>
                      {isCustom && (
                        <button
                          onClick={(e) => handleDeleteCustomSite(site.id, e)}
                          className="p-1 rounded-lg hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-colors"
                          title="حذف الموقع"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                    {site.description}
                  </p>

                  {/* Tags */}
                  {viewMode === 'grid' && (
                    <div className="flex flex-wrap gap-1">
                      {site.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[9px] px-2 py-0.5 rounded-md bg-[#25272a] text-gray-400 border border-white/5"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer Action */}
                <div
                  className={`flex items-center justify-between ${
                    viewMode === 'grid' ? 'pt-4 mt-2 border-t border-white/5' : 'shrink-0 gap-2'
                  }`}
                >
                  <span className="text-[10px] text-gray-500 uppercase font-mono tracking-wider">
                    {site.category}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => copySiteUrl(site.url, site.id, e)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                      title={copiedSiteId === site.id ? 'تم النسخ!' : 'نسخ رابط الموقع'}
                    >
                      {copiedSiteId === site.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <a
                      href={site.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600/15 hover:bg-blue-600 text-blue-400 hover:text-white text-xs font-medium transition-all shadow-sm active:scale-95"
                    >
                      <span>{lang === 'ar' ? 'فتح الموقع' : 'Open'}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredWebsites.length === 0 && (
          <div className="py-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mx-auto text-gray-500">
              <Search className="w-6 h-6" />
            </div>
            <div className="text-sm font-medium text-gray-300">لم يتم العثور على أي مواقع مطابقة</div>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              جرب تغيير كلمة البحث أو اختيار تصنيف آخر مثل "الكل" أو إضافة الموقع يدوياً.
            </p>
          </div>
        )}
      </div>

      {/* Add Custom Site Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1b1c1e] border border-gemini-border rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gemini-border pb-3">
              <div className="flex items-center space-x-2">
                <Plus className="w-4 h-4 text-blue-400" />
                <h3 className="font-semibold text-sm text-white">إضافة موقع أو أداة مخصصة</h3>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCustomSite} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-gray-300 font-medium">اسم الموقع / الأداة</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: DeepL Translator"
                  value={newSiteName}
                  onChange={(e) => setNewSiteName(e.target.value)}
                  className="w-full bg-[#131314] border border-gemini-border rounded-xl px-3 py-2 text-white outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-gray-300 font-medium">الرابط (URL)</label>
                <input
                  type="url"
                  required
                  placeholder="https://example.com"
                  value={newSiteUrl}
                  onChange={(e) => setNewSiteUrl(e.target.value)}
                  className="w-full bg-[#131314] border border-gemini-border rounded-xl px-3 py-2 text-white font-mono outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-gray-300 font-medium">القسم / التصنيف</label>
                <select
                  value={newSiteCat}
                  onChange={(e: any) => setNewSiteCat(e.target.value)}
                  className="w-full bg-[#131314] border border-gemini-border rounded-xl px-3 py-2 text-gray-200 outline-none"
                >
                  <option value="AI">🤖 ذكاء اصطناعي (AI)</option>
                  <option value="Dev">💻 برمجة وتطوير (Dev)</option>
                  <option value="Design">🎨 تصميم وميديا (Design)</option>
                  <option value="Productivity">⚡ إنتاجية وعمل (Productivity)</option>
                  <option value="Education">📚 تعليم ومعرفة (Education)</option>
                  <option value="Tools">🛠️ أدوات ويب ومرافق (Tools)</option>
                  <option value="Data">📊 بيانات وأبحاث (Data)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-gray-300 font-medium">الوصف المختصر</label>
                <textarea
                  rows={2}
                  placeholder="وصف بسيط للموقع وكيفية الاستفادة منه..."
                  value={newSiteDesc}
                  onChange={(e) => setNewSiteDesc(e.target.value)}
                  className="w-full bg-[#131314] border border-gemini-border rounded-xl px-3 py-2 text-white outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-medium transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-md transition-colors"
                >
                  حفظ الموقع
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
