import React, { useState, useEffect } from 'react';
import {
  X,
  Key,
  ShieldCheck,
  User,
  Plus,
  Trash2,
  ExternalLink,
  Loader2,
  Eye,
  EyeOff,
  Users,
  Bot,
  Sun,
  Moon,
  Globe,
  Palette,
  Check,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  HardDrive,
} from 'lucide-react';
import { DriveStatus, UserAccount } from '../types';
import { api } from '../services/api';
import { Translations, Theme, Language } from '../utils/translations';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedModel: string;
  onSelectModel: (model: string) => void;
  driveStatus: DriveStatus;
  onRefreshDrive: () => void;
  onOpenGoogleAuth: () => void;
  onLogoutGoogle: () => void;
  onAccountSwitched?: (account: UserAccount) => void;
  theme?: Theme;
  lang?: Language;
  onToggleTheme?: (theme: Theme) => void;
  onToggleLang?: (lang: Language) => void;
  t?: Translations;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  selectedModel,
  onSelectModel,
  driveStatus,
  onAccountSwitched,
  theme = 'dark',
  lang = 'ar',
  onToggleTheme,
  onToggleLang,
}) => {
  // Active Settings Tab ('api-keys' | 'accounts' | 'appearance')
  const [activeTab, setActiveTab] = useState<'api-keys' | 'accounts' | 'appearance'>('api-keys');

  // Google Gemini API Key State
  const [geminiKey, setGeminiKey] = useState('');
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [isVerifyingGemini, setIsVerifyingGemini] = useState(false);
  const [geminiStatus, setGeminiStatus] = useState<{
    success?: boolean;
    message?: string;
    model?: string;
  } | null>(null);

  // ChatGPT / OpenAI API Key State
  const [openaiKey, setOpenaiKey] = useState('');
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [isVerifyingOpenai, setIsVerifyingOpenai] = useState(false);
  const [openaiStatus, setOpenaiStatus] = useState<{
    success?: boolean;
    message?: string;
    model?: string;
  } | null>(null);

  // Backend Server URL State
  const [backendUrl, setBackendUrl] = useState(() => api.getBackendUrl());
  const [backendSaveStatus, setBackendSaveStatus] = useState<string | null>(null);

  // Accounts State
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [activeAccount, setActiveAccount] = useState<UserAccount | null>(null);
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [newAccName, setNewAccName] = useState('');
  const [newAccEmail, setNewAccEmail] = useState('');
  const [newAccKey, setNewAccKey] = useState('');
  const [accountActionLoading, setAccountActionLoading] = useState(false);

  // Load initial settings & accounts
  useEffect(() => {
    if (isOpen) {
      loadSettings();
      loadAccounts();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    try {
      const s = await api.getSettings();
      if (s.raw_key) {
        setGeminiKey(s.raw_key);
        setGeminiStatus({
          success: true,
          message: 'مفتاح Google Gemini محفوظ ومفعل حالياً',
        });
      }
      if (s.raw_openai_key) {
        setOpenaiKey(s.raw_openai_key);
        setOpenaiStatus({
          success: true,
          message: 'مفتاح ChatGPT (OpenAI) محفوظ ومفعل حالياً',
        });
      }
    } catch (e) {
      console.warn('Failed to load settings:', e);
    }
  };

  const loadAccounts = async () => {
    try {
      const res = await api.getAccounts();
      if (res && res.accounts) {
        setAccounts(res.accounts);
        setActiveAccount(res.active || res.accounts[0] || null);
      }
    } catch (e) {
      console.warn('Failed to load accounts:', e);
    }
  };

  // Verify Gemini API Key
  const handleVerifyGeminiKey = async () => {
    if (!geminiKey.trim()) {
      setGeminiStatus({
        success: false,
        message: 'يرجى إدخال مفتاح Gemini API أولاً',
      });
      return;
    }

    setIsVerifyingGemini(true);
    setGeminiStatus(null);

    try {
      const result = await api.verifyApiKey(geminiKey.trim());
      if (result.valid) {
        setGeminiStatus({
          success: true,
          message: result.message || 'تم التحقق من مفتاح Gemini وتفعيله فوراً!',
          model: result.detected_model,
        });
        loadAccounts();
      } else {
        setGeminiStatus({
          success: false,
          message: result.message || 'المفتاح غير صالح أو لم يتم تفعيل Gemini API له.',
        });
      }
    } catch (err: any) {
      setGeminiStatus({
        success: false,
        message: err.message || 'فشل التحقق من المفتاح. تأكد من اتصال الإنترنت.',
      });
    } finally {
      setIsVerifyingGemini(false);
    }
  };

  // Verify OpenAI API Key
  const handleVerifyOpenaiKey = async () => {
    if (!openaiKey.trim()) {
      setOpenaiStatus({
        success: false,
        message: 'يرجى إدخال مفتاح OpenAI API أولاً',
      });
      return;
    }

    setIsVerifyingOpenai(true);
    setOpenaiStatus(null);

    try {
      const result = await api.verifyOpenAIApiKey(openaiKey.trim());
      if (result.valid) {
        setOpenaiStatus({
          success: true,
          message: result.message || 'تم التحقق من مفتاح ChatGPT (OpenAI) بنجاح وتفعيله فوراً!',
          model: result.detected_model,
        });
        // Auto select ChatGPT model if currently not chosen
        if (!selectedModel.toLowerCase().includes('gpt')) {
          onSelectModel('ChatGPT 4o Mini (gpt-4o-mini)');
        }
      } else {
        setOpenaiStatus({
          success: false,
          message: result.message || 'المفتاح غير صالح أو ليس لديه رصيد كافٍ.',
        });
      }
    } catch (err: any) {
      setOpenaiStatus({
        success: false,
        message: err.message || 'فشل التحقق من مفتاح OpenAI.',
      });
    } finally {
      setIsVerifyingOpenai(false);
    }
  };

  // Switch Account
  const handleSwitchAccount = async (id: string) => {
    setAccountActionLoading(true);
    try {
      const res = await api.switchAccount(id);
      if (res.status === 'success') {
        setActiveAccount(res.active);
        setAccounts(res.accounts);
        if (onAccountSwitched && res.active) {
          onAccountSwitched(res.active);
        }
        loadSettings();
      }
    } catch (err) {
      console.error('Failed to switch account:', err);
    } finally {
      setAccountActionLoading(false);
    }
  };

  // Add Account
  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccEmail.trim()) return;

    setAccountActionLoading(true);
    try {
      const res = await api.addAccount({
        name: newAccName.trim() || 'Google User',
        email: newAccEmail.trim(),
        api_key: newAccKey.trim() || undefined,
      });

      if (res.status === 'success') {
        setAccounts(res.accounts);
        setActiveAccount(res.account);
        setIsAddingAccount(false);
        setNewAccName('');
        setNewAccEmail('');
        setNewAccKey('');
        if (onAccountSwitched && res.account) {
          onAccountSwitched(res.account);
        }
        loadSettings();
      }
    } catch (err) {
      console.error('Failed to add account:', err);
    } finally {
      setAccountActionLoading(false);
    }
  };

  // Delete Account
  const handleDeleteAccount = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (accounts.length <= 1) return;

    setAccountActionLoading(true);
    try {
      const res = await api.deleteAccount(id);
      if (res.status === 'success') {
        setAccounts(res.accounts);
        setActiveAccount(res.active);
        if (onAccountSwitched && res.active) {
          onAccountSwitched(res.active);
        }
        loadSettings();
      }
    } catch (err) {
      console.error('Failed to delete account:', err);
    } finally {
      setAccountActionLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 select-none animate-in fade-in duration-200">
      <div
        dir="rtl"
        className="bg-[#1e1f20] border border-gemini-border w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col text-xs text-gray-300 max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gemini-border flex items-center justify-between bg-[#171819]">
          <div className="flex items-center space-x-2.5 space-x-reverse">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span className="font-semibold text-sm text-white">إعدادات النماذج والذكاء الاصطناعي والحسابات</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation (API Keys vs Multi-Accounts vs Appearance) */}
        <div className="flex border-b border-gemini-border/60 bg-[#141517] px-6 pt-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('api-keys')}
            className={`pb-2.5 px-3 md:px-4 font-medium text-xs border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'api-keys'
                ? 'border-purple-500 text-purple-400 font-semibold'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'مفاتيح AI (Gemini & ChatGPT)' : 'AI Keys (Gemini & GPT)'}</span>
          </button>

          <button
            onClick={() => setActiveTab('accounts')}
            className={`pb-2.5 px-3 md:px-4 font-medium text-xs border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'accounts'
                ? 'border-blue-500 text-blue-400 font-semibold'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? `الحسابات والتبديل (${accounts.length})` : `Accounts (${accounts.length})`}</span>
          </button>

          <button
            onClick={() => setActiveTab('appearance')}
            className={`pb-2.5 px-3 md:px-4 font-medium text-xs border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'appearance'
                ? 'border-amber-500 text-amber-400 font-semibold'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'المظهر واللغة' : 'Theme & Language'}</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {activeTab === 'api-keys' && (
            <>
              {/* R3 Backend Server / Mode Configuration */}
              <div className="p-4 rounded-2xl bg-[#171819] border border-cyan-500/30 space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-200 text-xs flex items-center gap-1.5">
                    <HardDrive className="w-4 h-4 text-cyan-400" />
                    <span>{lang === 'ar' ? 'وضع التشغيل وخادم R3 المحلي (اختياري)' : 'R3 Backend Server & Mode (Optional)'}</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-medium">
                    {backendUrl.trim() ? (lang === 'ar' ? 'خادم مخصص' : 'Custom Server') : (lang === 'ar' ? 'وضع مستقل مباشر على الهاتف' : 'Direct Standalone')}
                  </span>
                </div>

                <p className="text-gray-400 text-[11px] leading-relaxed">
                  {lang === 'ar'
                    ? 'اتركه فارغاً للعمل بوضع الهاتف المستقل الكامل عبر مفاتيح API مباشرة. أو أدخل عنوان IP لحاسوبك (مثل: http://192.168.1.15:8000) للربط مع خادم R3 على الكمبيوتر واستخدام ميزات NotebookLM المتقدمة.'
                    : 'Leave empty for direct standalone mode using your API keys. Or enter your PC IP address (e.g. http://192.168.1.15:8000) to connect to R3 local backend.'}
                </p>

                <div className="flex gap-2">
                  <input
                    type="text"
                    dir="ltr"
                    value={backendUrl}
                    onChange={(e) => {
                      setBackendUrl(e.target.value);
                      setBackendSaveStatus(null);
                    }}
                    placeholder="http://192.168.1.x:8000"
                    className="flex-1 bg-[#131314] border border-gemini-border rounded-xl px-3 py-2 text-xs font-mono text-gray-100 placeholder-gray-600 outline-none focus:border-cyan-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      api.setBackendUrl(backendUrl);
                      setBackendSaveStatus(lang === 'ar' ? 'تم الحفظ!' : 'Saved!');
                      setTimeout(() => setBackendSaveStatus(null), 2500);
                    }}
                    className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs transition-all shadow-md active:scale-95 shrink-0"
                  >
                    {backendSaveStatus || (lang === 'ar' ? 'حفظ' : 'Save')}
                  </button>
                </div>
              </div>

              {/* 1. ChatGPT (OpenAI) API Key Section */}
              <div className="p-4 rounded-2xl bg-[#171819] border border-emerald-500/30 space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-200 text-xs flex items-center gap-1.5">
                    <Bot className="w-4 h-4 text-emerald-400" />
                    <span>مفتاح ChatGPT (OpenAI API)</span>
                  </span>
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium transition-colors"
                  >
                    <span>لوحة مفاتيح OpenAI</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <p className="text-gray-400 text-[11px] leading-relaxed">
                  أدخل مفتاحك السري (يبدأ بـ <code className="text-emerald-300">sk-...</code>) للتحدث مع نماذج ChatGPT 4o و 4o-mini و o3-mini.
                </p>

                {/* Input & Verify */}
                <div className="flex items-center gap-2 pt-1">
                  <div className="relative flex-1">
                    <input
                      type={showOpenaiKey ? 'text' : 'password'}
                      dir="ltr"
                      value={openaiKey}
                      onChange={(e) => {
                        setOpenaiKey(e.target.value);
                        setOpenaiStatus(null);
                      }}
                      placeholder="sk-proj-..."
                      className="w-full bg-[#131314] border border-gemini-border rounded-xl px-3 py-2 text-xs font-mono text-gray-100 placeholder-gray-600 outline-none focus:border-emerald-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                    >
                      {showOpenaiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleVerifyOpenaiKey}
                    disabled={isVerifyingOpenai || !openaiKey.trim()}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50 shrink-0"
                  >
                    {isVerifyingOpenai ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>جاري الفحص...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>تفعيل وتحقق فوري</span>
                      </>
                    )}
                  </button>
                </div>

                {openaiStatus && (
                  <div
                    className={`p-2.5 rounded-xl border text-[11px] flex items-center justify-between ${
                      openaiStatus.success
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-red-500/10 border-red-500/30 text-red-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {openaiStatus.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                      )}
                      <span>{openaiStatus.message}</span>
                    </div>
                    {openaiStatus.model && (
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-200">
                        {openaiStatus.model}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* 2. Google Gemini API Key Section */}
              <div className="p-4 rounded-2xl bg-[#171819] border border-purple-500/30 space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-200 text-xs flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span>مفتاح Google Gemini API</span>
                  </span>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1 font-medium transition-colors"
                  >
                    <span>Google AI Studio (مجاناً)</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <p className="text-gray-400 text-[11px] leading-relaxed">
                  أدخل مفتاح Gemini للتحدث وتحليل الصور والملفات عبر نماذج Gemini 3.5 Flash و Flash-Lite.
                </p>

                {/* Input & Verify */}
                <div className="flex items-center gap-2 pt-1">
                  <div className="relative flex-1">
                    <input
                      type={showGeminiKey ? 'text' : 'password'}
                      dir="ltr"
                      value={geminiKey}
                      onChange={(e) => {
                        setGeminiKey(e.target.value);
                        setGeminiStatus(null);
                      }}
                      placeholder="AIzaSy..."
                      className="w-full bg-[#131314] border border-gemini-border rounded-xl px-3 py-2 text-xs font-mono text-gray-100 placeholder-gray-600 outline-none focus:border-purple-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowGeminiKey(!showGeminiKey)}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                    >
                      {showGeminiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleVerifyGeminiKey}
                    disabled={isVerifyingGemini || !geminiKey.trim()}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50 shrink-0"
                  >
                    {isVerifyingGemini ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>جاري الفحص...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>تفعيل وتحقق فوري</span>
                      </>
                    )}
                  </button>
                </div>

                {geminiStatus && (
                  <div
                    className={`p-2.5 rounded-xl border text-[11px] flex items-center justify-between ${
                      geminiStatus.success
                        ? 'bg-purple-500/10 border-purple-500/30 text-purple-300'
                        : 'bg-red-500/10 border-red-500/30 text-red-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {geminiStatus.success ? (
                        <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                      )}
                      <span>{geminiStatus.message}</span>
                    </div>
                    {geminiStatus.model && (
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-200">
                        {geminiStatus.model}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'accounts' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-200 text-xs">الحسابات المسجلة للتبديل:</span>
                <button
                  type="button"
                  onClick={() => setIsAddingAccount(!isAddingAccount)}
                  className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة حساب جديد</span>
                </button>
              </div>

              {/* Add New Account Form */}
              {isAddingAccount && (
                <form
                  onSubmit={handleAddAccount}
                  className="p-3.5 rounded-xl bg-[#131314] border border-blue-500/40 space-y-3"
                >
                  <div className="text-xs font-semibold text-blue-300">إضافة حساب جديد إلى DOQ&amp;S</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1">اسم المستخدم / الحساب</label>
                      <input
                        type="text"
                        placeholder="مثال: Mohamed Shabaan (Work)"
                        value={newAccName}
                        onChange={(e) => setNewAccName(e.target.value)}
                        className="w-full bg-[#1c1d1f] border border-gemini-border rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1">البريد الإلكتروني *</label>
                      <input
                        type="email"
                        dir="ltr"
                        required
                        placeholder="user@example.com"
                        value={newAccEmail}
                        onChange={(e) => setNewAccEmail(e.target.value)}
                        className="w-full bg-[#1c1d1f] border border-gemini-border rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-400 mb-1">
                      مفتاح API اختياري مخصص لهذا الحساب
                    </label>
                    <input
                      type="password"
                      dir="ltr"
                      placeholder="مفتاح API اختياري..."
                      value={newAccKey}
                      onChange={(e) => setNewAccKey(e.target.value)}
                      className="w-full bg-[#1c1d1f] border border-gemini-border rounded-lg px-2.5 py-1.5 text-xs font-mono text-white outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddingAccount(false)}
                      className="px-3 py-1.5 rounded-lg text-gray-400 hover:text-white"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      disabled={accountActionLoading || !newAccEmail.trim()}
                      className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
                    >
                      {accountActionLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                      <span>حفظ الحساب</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Accounts List */}
              <div className="space-y-2">
                {accounts.map((acc) => {
                  const isActive = activeAccount?.id === acc.id || acc.is_active;

                  return (
                    <div
                      key={acc.id}
                      onClick={() => handleSwitchAccount(acc.id)}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        isActive
                          ? 'bg-blue-500/10 border-blue-500 text-white shadow-sm'
                          : 'bg-[#131314] border-gemini-border text-gray-300 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center space-x-3 space-x-reverse truncate">
                        {acc.picture ? (
                          <img
                            src={acc.picture}
                            alt={acc.name}
                            className="w-8 h-8 rounded-full border border-white/10 object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-blue-600/30 text-blue-300 flex items-center justify-center font-bold text-xs shrink-0">
                            <User className="w-4 h-4" />
                          </div>
                        )}

                        <div className="truncate">
                          <div className="font-semibold text-xs flex items-center gap-2 truncate">
                            <span>{acc.name}</span>
                            {isActive && (
                              <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-medium border border-blue-500/30">
                                الحالي
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-gray-400 truncate" dir="ltr">
                            {acc.email}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isActive ? (
                          <span className="text-emerald-400 flex items-center gap-1 text-[11px] font-medium">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>نشط ومفعل</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSwitchAccount(acc.id);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-200 text-[11px] transition-colors"
                          >
                            تبديل
                          </button>
                        )}

                        {accounts.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteAccount(acc.id, e)}
                            className="p-1.5 text-gray-500 hover:text-red-400 rounded-lg hover:bg-white/5 transition-colors"
                            title="حذف هذا الحساب"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-6">
              {/* Theme Settings */}
              <div className="p-4 rounded-2xl bg-[#171819] border border-amber-500/30 space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-200 text-xs flex items-center gap-1.5">
                    <Sun className="w-4 h-4 text-amber-400" />
                    <span>{lang === 'ar' ? 'المظهر (Theme)' : 'Theme Mode'}</span>
                  </span>
                  <span className="text-[11px] text-amber-300 font-medium">
                    {theme === 'dark' ? (lang === 'ar' ? 'الوضع الداكن' : 'Dark Mode') : (lang === 'ar' ? 'الوضع الفاتح' : 'Light Mode')}
                  </span>
                </div>

                <p className="text-gray-400 text-[11px] leading-relaxed">
                  {lang === 'ar'
                    ? 'اختر بين المظهر الداكن الهادئ والمريح للعين أو المظهر الفاتح الناصع عالي الوضوح.'
                    : 'Choose between the sleek dark mode or the bright crisp light theme.'}
                </p>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => onToggleTheme && onToggleTheme('dark')}
                    className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                      theme === 'dark'
                        ? 'bg-amber-500/15 border-amber-500 text-white font-medium shadow-md'
                        : 'bg-[#131314] border-gemini-border text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Moon className="w-4 h-4 text-purple-400" />
                      <div className="text-right">
                        <div className="font-medium text-xs">{lang === 'ar' ? 'داكن (Dark)' : 'Dark'}</div>
                        <div className="text-[10px] text-gray-500">{lang === 'ar' ? 'مريح للعينين' : 'Sleek Obsidian'}</div>
                      </div>
                    </div>
                    {theme === 'dark' && <Check className="w-4 h-4 text-amber-400 shrink-0" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => onToggleTheme && onToggleTheme('light')}
                    className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                      theme === 'light'
                        ? 'bg-amber-500/15 border-amber-500 text-white font-medium shadow-md'
                        : 'bg-[#131314] border-gemini-border text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Sun className="w-4 h-4 text-amber-400" />
                      <div className="text-right">
                        <div className="font-medium text-xs">{lang === 'ar' ? 'فاتح (Light)' : 'Light'}</div>
                        <div className="text-[10px] text-gray-500">{lang === 'ar' ? 'تباين ساطع' : 'Crisp White'}</div>
                      </div>
                    </div>
                    {theme === 'light' && <Check className="w-4 h-4 text-amber-400 shrink-0" />}
                  </button>
                </div>
              </div>

              {/* Language Settings */}
              <div className="p-4 rounded-2xl bg-[#171819] border border-blue-500/30 space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-200 text-xs flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-blue-400" />
                    <span>{lang === 'ar' ? 'لغة الواجهة (Language)' : 'Interface Language'}</span>
                  </span>
                  <span className="text-[11px] text-blue-300 font-medium">
                    {lang === 'ar' ? 'العربية' : 'English'}
                  </span>
                </div>

                <p className="text-gray-400 text-[11px] leading-relaxed">
                  {lang === 'ar'
                    ? 'اختر لغة عرض الواجهة بالكامل: إما العربية بالكامل أو الإنجليزية بالكامل.'
                    : 'Select the full interface language: either completely Arabic or English.'}
                </p>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => onToggleLang && onToggleLang('ar')}
                    className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                      lang === 'ar'
                        ? 'bg-blue-500/15 border-blue-500 text-white font-medium shadow-md'
                        : 'bg-[#131314] border-gemini-border text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-base font-bold">ع</span>
                      <div className="text-right">
                        <div className="font-medium text-xs">العربية (Arabic)</div>
                        <div className="text-[10px] text-gray-500">واجهة عربية متكاملة</div>
                      </div>
                    </div>
                    {lang === 'ar' && <Check className="w-4 h-4 text-blue-400 shrink-0" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => onToggleLang && onToggleLang('en')}
                    className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                      lang === 'en'
                        ? 'bg-blue-500/15 border-blue-500 text-white font-medium shadow-md'
                        : 'bg-[#131314] border-gemini-border text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-base font-bold font-mono">EN</span>
                      <div className="text-right">
                        <div className="font-medium text-xs">English (US)</div>
                        <div className="text-[10px] text-gray-500">Complete English UI</div>
                      </div>
                    </div>
                    {lang === 'en' && <Check className="w-4 h-4 text-blue-400 shrink-0" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Google Drive Status Bar */}
          <div className="p-3.5 bg-[#171819] rounded-2xl border border-gemini-border flex items-center justify-between text-xs">
            <div>
              <div className="font-semibold text-gray-200">Google Drive Cloud Status</div>
              <div className="text-[11px] text-gray-400 mt-0.5">
                {lang === 'ar' ? 'مزامنة مجلد MyHub_Automation/ متصل ومفعل للحساب النشط.' : 'Sync folder MyHub_Automation/ active for current account.'}
              </div>
            </div>
            <span
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                driveStatus.authenticated
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              }`}
            >
              {driveStatus.authenticated ? (lang === 'ar' ? 'متصل سحابياً' : 'Connected') : (lang === 'ar' ? 'جاهز للربط' : 'Ready to Connect')}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[#171819] border-t border-gemini-border flex items-center justify-between">
          <span className="text-[11px] text-gray-500">
            R3 AI Studio v1.0.0 · Google Gemini &amp; ChatGPT &amp; Media Vault
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs bg-white text-black font-semibold hover:bg-gray-200 transition-colors shadow-md"
          >
            {lang === 'ar' ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
