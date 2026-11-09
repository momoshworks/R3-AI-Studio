import React from 'react';
import { Palette, Check, X } from 'lucide-react';
import { Language } from '../utils/translations';

export interface AntigravityThemeDefinition {
  id: string;
  name: string;
  nameAr: string;
  desc: string;
  descAr: string;
  accent: string;
  bgPreview: string;
  borderPreview: string;
  tag: string;
}

export const ANTIGRAVITY_THEMES: AntigravityThemeDefinition[] = [
  {
    id: 'antigravity-dark',
    name: 'Antigravity Dark',
    nameAr: 'أنتيجرافيتي داكن (الافتراضي)',
    desc: 'Google DeepMind Antigravity IDE deep matte canvas & electric indigo accents.',
    descAr: 'مظهر Google DeepMind Antigravity المظلم الاحترافي بمساحات مطفية ودرجات نيلية.',
    accent: '#8ab4f8',
    bgPreview: '#0e0f12',
    borderPreview: '#262930',
    tag: 'IDE Core',
  },
  {
    id: 'phantom',
    name: 'Phantom (Persona 5)',
    nameAr: 'فانتوم (بيرسونا 5)',
    desc: 'High-contrast Persona 5 bold pop-art, sharp hazard lines, and crimson obsidian.',
    descAr: 'فن البوب الحاد المستوحى من Persona 5، خطوط حمراء داكنة وقواطع حركية مائلة.',
    accent: '#D81124',
    bgPreview: '#0D0D10',
    borderPreview: '#D81124',
    tag: 'Pop-Art',
  },
  {
    id: 'matcha',
    name: 'Matcha Diary',
    nameAr: 'ماتشا دياري (مذكرة يابانية)',
    desc: 'Calm Japanese stationery journal, washi paper textures, and serene bamboo greens.',
    descAr: 'أجواء الدفاتر اليابانية الهادئة، ورق الواشي، ودرجات الماتشا وخيزران البامبو المريحة للعين.',
    accent: '#5B8A68',
    bgPreview: '#F6F8F3',
    borderPreview: '#5B8A68',
    tag: 'Zen Journal',
  },
  {
    id: 'doodle',
    name: 'Doodle Manga',
    nameAr: 'دودل مانجا (حبر وورق)',
    desc: 'Comic manga storyboard lines, G-Pen charcoal ink, and highlighter pink stamps.',
    descAr: 'رسم المانجا والقصص المصورة، خطوط حبر G-Pen الدقيقة، وأختام الفلورسنت الوردي.',
    accent: '#FF2E93',
    bgPreview: '#FDFCF7',
    borderPreview: '#18181B',
    tag: 'Manga Ink',
  },
  {
    id: 'pixel',
    name: 'Pixel Retro 8-Bit',
    nameAr: 'بيكسل ريترو 8-بت',
    desc: 'Arcade computing sweetie-16 palette, midnight navy, and CRT phosphor cyan.',
    descAr: 'عصر ألعاب الأركيد الكلاسيكية، شاشات CRT، وألوان 8-Bit الفسفورية الساطعة.',
    accent: '#73EFF7',
    bgPreview: '#1A1C2C',
    borderPreview: '#73EFF7',
    tag: 'Sweetie-16',
  },
  {
    id: 'glass',
    name: 'Liquid Glass Aurora',
    nameAr: 'الزجاج السائل والأورورا',
    desc: 'Next-gen translucent frosted glass, liquid refractive mesh, and specular rim reflections.',
    descAr: 'مظهر الزجاج السائل المتقدم، تمويه خلفي ناعم، وانعكاسات زجاجية ثلاثية الأبعاد.',
    accent: '#70D6FF',
    bgPreview: '#0B0F19',
    borderPreview: 'rgba(255, 255, 255, 0.2)',
    tag: 'iOS 26 Liquid',
  },
];

interface AntigravityThemePickerProps {
  isOpen: boolean;
  onClose: () => void;
  currentThemeId: string;
  onSelectTheme: (themeId: string) => void;
  lang: Language;
}

export const AntigravityThemePicker: React.FC<AntigravityThemePickerProps> = ({
  isOpen,
  onClose,
  currentThemeId,
  onSelectTheme,
  lang,
}) => {
  if (!isOpen) return null;
  const isAr = lang === 'ar';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      dir={isAr ? 'rtl' : 'ltr'}
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-3xl bg-[#16181d] border border-[#2a2d36] text-[#EDEDED] shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#262930] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-[#1e2026] border border-[#2a2d36] text-[#8ab4f8]">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">
                {isAr ? 'ثيمات Antigravity الرسمية' : 'Official Antigravity Themes'}
              </h3>
              <p className="text-xs text-[#8F95A0]">
                {isAr ? 'اختر نمط التصميم المفضل لتطبيق Nerdo AI Workstation' : 'Customize your IDE aesthetic & UI visual theme'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#8F95A0] hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Theme Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pe-1">
          {ANTIGRAVITY_THEMES.map((th) => {
            const isSelected = currentThemeId === th.id;
            return (
              <div
                key={th.id}
                onClick={() => {
                  onSelectTheme(th.id);
                  onClose();
                }}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative group flex flex-col justify-between ${
                  isSelected
                    ? 'border-[#8ab4f8] bg-[#1e2026] shadow-md shadow-[#8ab4f8]/10'
                    : 'border-[#262930] bg-[#16181d] hover:bg-[#1a1d24] hover:border-[#8ab4f8]/40'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold border"
                      style={{
                        color: th.accent,
                        borderColor: `${th.accent}40`,
                        backgroundColor: `${th.accent}15`,
                      }}
                    >
                      {th.tag}
                    </span>
                    {isSelected && (
                      <span className="p-1 rounded-full bg-[#8ab4f8] text-black">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </div>

                  {/* Theme Preview Dot Box */}
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-5 h-5 rounded-lg border shadow-inner shrink-0"
                      style={{
                        backgroundColor: th.bgPreview,
                        borderColor: th.borderPreview,
                      }}
                    />
                    <h4 className="text-xs font-bold text-[#EDEDED]">{isAr ? th.nameAr : th.name}</h4>
                  </div>

                  <p className="text-[11px] text-[#8F95A0] leading-relaxed line-clamp-2">
                    {isAr ? th.descAr : th.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-[#262930] text-[11px] font-mono text-[#8F95A0]">
          <span>Antigravity Theme Engine • C:\Users\momos\.gemini\antigravity-themes</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#1e2026] hover:bg-[#252830] border border-[#2a2d36] text-white font-medium"
          >
            {isAr ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
