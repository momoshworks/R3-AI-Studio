import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Zap,
  Play,
  Pause,
  Plus,
  Trash2,
  FolderSync,
  FileText,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  RefreshCw,
  X,
  Sliders,
  History,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { api } from '../services/api';
import { AutomationTask, AutomationTemplate, AutomationLog } from '../types';
import { Theme, Language, Translations } from '../utils/translations';

interface AutomationsHubProps {
  theme: Theme;
  lang: Language;
  t?: Translations;
}

const DEFAULT_FALLBACK_TEMPLATES: AutomationTemplate[] = [
  {
    id: 'auto_delta_lms',
    name: 'مراقب إعلانات وكويزات جامعة الدلتا (Delta LMS Monitor)',
    description: 'تسجيل دخول دوري تلقائي لبوابة جامعة الدلتا (42510314) واستخراج أحدث الإعلانات ومواعيد الكويزات وتحليلها وتنبيهك بها فوراً.',
    type: 'interval',
    interval_minutes: 60,
    prompt: 'أنت المساعد الأكاديمي الذكي لطالب جامعة الدلتا. حلل أحدث إعلانات وتكليفات نظام إدارة التعلم (Delta LMS) المسحوبة للتو، واستخرج أهم المواعيد والتنبيهات العاجلة (الكويزات، التكليفات، ومحاضرات الأونلاين)، مع تحديد الموعد والإجراء المطلوب لكل إعلان.',
    model: 'Google Gemini (gemini-2.5-flash)',
    enabled: true,
    action_type: 'notify_and_vault'
  },
  {
    id: 'tpl_code_reviewer',
    name: 'مراقب ومراجع الأكواد الذكي (Code Reviewer)',
    description: 'يرصد أي تعديل أو إضافة في ملفات الكود بمجلد المشروع، ويراجع الأكواد لاكتشاف الثغرات وتحسين الأداء فوراً.',
    type: 'folder_watch',
    prompt: 'أنت مدقق جودة وكود خبير. راجع الملفات البرمجية التالية بدقة: اكتشف أي ثغرات أمنية (Security vulnerabilities)، مشاكل في الأداء (Performance bottlenecks)، أو عدم توافق مع أفضل الممارسات، واقترح التحسينات البرمجية المباشرة فوراً.',
    model: 'Google Gemini (gemini-2.5-flash)',
    enabled: false,
    interval_minutes: 10,
    watch_folder: 'C:\\Users\\momos\\Desktop\\Nerdo_Watch',
    file_extensions: ['.py', '.js', '.ts', '.tsx', '.html', '.css', '.json', '.sql'],
    action_type: 'notify_and_vault'
  },
  {
    id: 'tpl_morning_brief',
    name: 'الملخص الصباحي وأولويات العمل (Daily Briefing)',
    description: 'يولد تقريراً صباحياً يومياً في ساعة محددة يشمل أهم النصائح الإنتاجية، ملخص أخبار التقنية، وأولويات التطوير اليومية.',
    type: 'daily',
    daily_time: '09:00',
    prompt: 'اكتب لي تقريراً صباحياً ذكياً وموجزاً: أهم 3 نصائح إنتاجية وتطويرية لمهندس البرمجيات، ملخص سريع لأهم اتجاهات الذكاء الاصطناعي وتقنيات الويب اليوم، وخطة تركيز سريعة لليوم.',
    model: 'Google Gemini (gemini-2.5-flash)',
    enabled: false,
    interval_minutes: 1440,
    action_type: 'notify_and_vault'
  },
  {
    id: 'tpl_pdf_summarizer',
    name: 'ملخص المستندات والأبحاث (PDF & Doc Analyzer)',
    description: 'يراقب مجلد التنزيلات أو المستندات، ويستخرج الأفكار الجوهرية والقرارات من أي ملف PDF أو مستند جديد يُضاف.',
    type: 'folder_watch',
    prompt: 'لخص المستندات الجديدة الملتقطة بشكل مباشر: استخرج النقاط الجوهرية، الإحصائيات أو القرارات المهمة، والخطوات العملية في نقاط محددة.',
    model: 'Google Gemini (gemini-2.5-flash)',
    enabled: false,
    interval_minutes: 15,
    watch_folder: 'C:\\Users\\momos\\Downloads',
    file_extensions: ['.pdf', '.txt', '.md'],
    action_type: 'notify_and_vault'
  },
  {
    id: 'tpl_system_health',
    name: 'فاحص صحة وأمان النظام (System Health Check)',
    description: 'فحص دوري كل عدة ساعات لحالة المعالج والذاكرة والمساحة وإصدار توصيات للصيانة والأمان.',
    type: 'interval',
    interval_minutes: 180,
    prompt: 'حلل حالة النظام التالية: استهلاك المعالج {cpu}%، استهلاك الذاكرة {memory}%، المساحة المتبقية على القرص {disk_free} GB. أعطِ تقييماً سريعاً ونصائح للصيانة إذا لزم الأمر.',
    model: 'Google Gemini (gemini-2.5-flash)',
    enabled: false,
    action_type: 'notify_and_vault'
  }
];

export const AutomationsHub: React.FC<AutomationsHubProps> = ({ theme, lang }) => {
  const isDark = theme === 'dark';
  const isAr = lang === 'ar';

  const [tasks, setTasks] = useState<AutomationTask[]>(() => {
    try {
      const cached = localStorage.getItem('NERDO_AUTOMATIONS_CACHE');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });
  const [templates, setTemplates] = useState<AutomationTemplate[]>(DEFAULT_FALLBACK_TEMPLATES);
  const [isLoading, setIsLoading] = useState(true);
  const [runningTaskId, setRunningTaskId] = useState<string | null>(null);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<AutomationTask | null>(null);
  const [viewingOutputTask, setViewingOutputTask] = useState<AutomationTask | null>(null);
  const [historyTask, setHistoryTask] = useState<AutomationTask | null>(null);
  const [taskLogs, setTaskLogs] = useState<AutomationLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [copiedOutput, setCopiedOutput] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<AutomationTask>>({
    name: '',
    description: '',
    type: 'interval',
    prompt: '',
    model: 'Google Gemini (gemini-2.5-flash)',
    enabled: true,
    interval_minutes: 60,
    daily_time: '09:00',
    watch_folder: '',
    file_extensions: ['.py', '.js', '.ts', '.tsx', '.md', '.txt', '.json', '.pdf'],
    action_type: 'notify_and_vault'
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [automationsRes, templatesRes] = await Promise.all([
        api.getAutomations(),
        api.getAutomationTemplates()
      ]);
      if (automationsRes?.tasks && automationsRes.tasks.length > 0) {
        setTasks(automationsRes.tasks);
        try {
          localStorage.setItem('NERDO_AUTOMATIONS_CACHE', JSON.stringify(automationsRes.tasks));
        } catch {}
      } else {
        const cached = localStorage.getItem('NERDO_AUTOMATIONS_CACHE');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) setTasks(parsed);
        }
      }

      if (templatesRes?.templates && templatesRes.templates.length > 0) {
        setTemplates(templatesRes.templates);
      }
    } catch (err) {
      console.error('Failed to load automations:', err);
      try {
        const cached = localStorage.getItem('NERDO_AUTOMATIONS_CACHE');
        if (cached) setTasks(JSON.parse(cached));
      } catch {}
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Request desktop notification permission if supported
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  const handleToggleTask = async (task: AutomationTask) => {
    const newStatus = !task.enabled;
    try {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, enabled: newStatus } : t));
      await api.updateAutomation(task.id, { enabled: newStatus });
    } catch (err) {
      console.error('Failed to toggle task:', err);
      loadData();
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm(isAr ? 'هل أنت متأكد من حذف هذه الأتمتة؟' : 'Are you sure you want to delete this automation?')) return;
    try {
      setTasks(prev => prev.filter(t => t.id !== taskId));
      await api.deleteAutomation(taskId);
    } catch (err) {
      console.error('Failed to delete task:', err);
      loadData();
    }
  };

  const handleRunNow = async (task: AutomationTask) => {
    setRunningTaskId(task.id);
    try {
      const res = await api.runAutomationNow(task.id);
      if (res && res.output) {
        // Trigger browser notification if allowed
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(isAr ? `Nerdo AI: اكتملت مهمة ${task.name}` : `Nerdo AI: Completed ${task.name}`, {
            body: res.output.slice(0, 150) + '...',
            icon: '/app-icon.png'
          });
        }
      }
      await loadData();
      const updated = await api.getAutomations();
      const current = (updated.tasks || []).find(t => t.id === task.id);
      if (current) setViewingOutputTask(current);
    } catch (err: any) {
      alert((isAr ? 'حدث خطأ أثناء تشغيل الأتمتة: ' : 'Error executing automation: ') + (err.message || err));
    } finally {
      setRunningTaskId(null);
    }
  };

  const handleApplyTemplate = (tpl: AutomationTemplate) => {
    setFormData({
      name: tpl.name,
      description: tpl.description,
      type: tpl.type,
      prompt: tpl.prompt,
      model: tpl.model,
      enabled: true,
      interval_minutes: tpl.interval_minutes || 60,
      daily_time: tpl.daily_time || '09:00',
      watch_folder: tpl.watch_folder || '',
      file_extensions: tpl.file_extensions || ['.py', '.js', '.ts', '.tsx', '.md', '.txt', '.json', '.pdf'],
      action_type: tpl.action_type || 'notify_and_vault'
    });
    setEditingTask(null);
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (task: AutomationTask) => {
    setEditingTask(task);
    setFormData({
      name: task.name,
      description: task.description || '',
      type: task.type,
      prompt: task.prompt,
      model: task.model,
      enabled: task.enabled,
      interval_minutes: task.interval_minutes || 60,
      daily_time: task.daily_time || '09:00',
      watch_folder: task.watch_folder || '',
      file_extensions: task.file_extensions || ['.py', '.js', '.ts', '.tsx', '.md', '.txt', '.json', '.pdf'],
      action_type: task.action_type || 'notify_and_vault'
    });
    setIsCreateModalOpen(true);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim() || !formData.prompt?.trim()) {
      alert(isAr ? 'يرجى إدخال اسم المهمة والبرومبت' : 'Please provide task name and prompt');
      return;
    }

    try {
      if (editingTask) {
        await api.updateAutomation(editingTask.id, formData);
      } else {
        await api.createAutomation(formData);
      }
      setIsCreateModalOpen(false);
      setEditingTask(null);
      await loadData();
    } catch (err: any) {
      alert((isAr ? 'فشل حفظ المهمة: ' : 'Failed to save task: ') + (err.message || err));
    }
  };

  const handleViewLogs = async (task: AutomationTask) => {
    setHistoryTask(task);
    setIsLoadingLogs(true);
    try {
      const res = await api.getAutomationLogs(task.id);
      setTaskLogs(res.logs || []);
    } catch (err) {
      console.error('Failed to load logs:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedOutput(true);
    setTimeout(() => setCopiedOutput(false), 2000);
  };

  const formatRelativeTime = (timestamp?: number) => {
    if (!timestamp) return isAr ? 'لم تنفذ بعد' : 'Never';
    const diff = Math.floor((Date.now() - timestamp * 1000) / 1000);
    if (diff < 60) return isAr ? 'منذ لحظات' : 'Just now';
    if (diff < 3600) return isAr ? `منذ ${Math.floor(diff / 60)} دقيقة` : `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return isAr ? `منذ ${Math.floor(diff / 3600)} ساعة` : `${Math.floor(diff / 3600)}h ago`;
    return new Date(timestamp * 1000).toLocaleDateString(isAr ? 'ar-EG' : 'en-US');
  };

  return (
    <div
      className={`flex-1 flex flex-col h-full overflow-y-auto ${
        isDark ? 'bg-[#0e0f12] text-[#EDEDED]' : 'bg-slate-50 text-slate-800'
      }`}
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* Top Banner / Header */}
      <div
        className={`px-6 py-6 border-b shrink-0 ${
          isDark ? 'border-[#262930] bg-[#16181d]/50' : 'border-slate-200 bg-white'
        }`}
      >
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-[#1e2026] border border-[#2a2d36] text-[#8ab4f8] shadow-sm">
                <Zap className="w-5 h-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                {isAr ? 'الأتمتة والمهام الذكية' : 'AI Automations & Workflows'}
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#8ab4f8]/10 text-[#8ab4f8] border border-[#8ab4f8]/20 font-semibold">
                Autonomous
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#8F95A0] mt-1 max-w-xl">
              {isAr
                ? 'جدولة دورية، مراقبة مجلدات المشروعات، وفحص تلقائي للكود والمستندات مدعوم بنماذج Gemini و OpenAI.'
                : 'Scheduled background jobs, project folder watchers, and automated code audits powered by your active models.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              className={`p-2.5 rounded-xl border transition-colors ${
                isDark
                  ? 'border-[#262930] bg-[#16181d] hover:bg-[#1e2026] text-[#8F95A0] hover:text-white'
                  : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-600'
              }`}
              title={isAr ? 'تحديث' : 'Refresh'}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#8ab4f8]' : ''}`} />
            </button>

            <button
              onClick={() => {
                setEditingTask(null);
                setFormData({
                  name: '',
                  description: '',
                  type: 'interval',
                  prompt: '',
                  model: 'Google Gemini (gemini-2.5-flash)',
                  enabled: true,
                  interval_minutes: 60,
                  daily_time: '09:00',
                  watch_folder: '',
                  file_extensions: ['.py', '.js', '.ts', '.tsx', '.md', '.txt', '.json', '.pdf'],
                  action_type: 'notify_and_vault'
                });
                setIsCreateModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>{isAr ? 'إنشاء أتمتة جديدة' : 'New Automation'}</span>
            </button>
          </div>
        </div>

        {/* Quick Starter Templates */}
        {templates.length > 0 && (
          <div className="max-w-6xl mx-auto mt-6 pt-5 border-t border-[#262930]/40">
            <div className="text-[11px] font-semibold text-[#8F95A0] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#8ab4f8]" />
              <span>{isAr ? 'نماذج أتمتة سريعة جاهزة للتفعيل' : 'Quick Starter Templates'}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {templates.map(tpl => (
                <div
                  key={tpl.id}
                  onClick={() => handleApplyTemplate(tpl)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer group flex flex-col justify-between ${
                    isDark
                      ? 'bg-[#16181d] hover:bg-[#1a1d24] border-[#262930] hover:border-[#8ab4f8]/50 shadow-sm'
                      : 'bg-white hover:bg-blue-50/50 border-slate-200 hover:border-blue-400'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/30 text-[#8ab4f8] border border-white/5 font-semibold">
                        {tpl.type === 'folder_watch' ? (isAr ? 'راصد مجلد' : 'Folder Watch') : tpl.type === 'daily' ? (isAr ? 'يومي' : 'Daily') : (isAr ? 'دوري' : 'Interval')}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#8F95A0] group-hover:text-[#8ab4f8] group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <h3 className="font-semibold text-xs text-[#EDEDED] line-clamp-1">{tpl.name}</h3>
                    <p className="text-[11px] text-[#8F95A0] mt-1 line-clamp-2 leading-relaxed">
                      {tpl.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 max-w-6xl mx-auto w-full px-6 py-6 space-y-4">
        {isLoading && tasks.length === 0 ? (
          <div className="min-h-[40vh] flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-7 h-7 text-[#8ab4f8] animate-spin" />
            <p className="text-xs text-[#8F95A0] font-mono">{isAr ? 'جاري تحميل الأتمتة...' : 'Loading automations...'}</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="min-h-[40vh] flex flex-col items-center justify-center text-center p-8 rounded-3xl border border-dashed border-[#262930] space-y-4">
            <div className="p-4 rounded-2xl bg-[#16181d] border border-[#262930]">
              <Zap className="w-8 h-8 text-[#8ab4f8]" />
            </div>
            <div>
              <h3 className="text-base font-semibold">{isAr ? 'لا توجد أتمتة مضافة بعد' : 'No automations yet'}</h3>
              <p className="text-xs text-[#8F95A0] max-w-sm mt-1">
                {isAr
                  ? 'اختر أحد النماذج الجاهزة أعلاه أو اضغط على "إنشاء أتمتة جديدة" لتشغيل أول مهمة ذكية.'
                  : 'Select one of the starter templates above or click New Automation to build your first autonomous AI workflow.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-[#8F95A0] font-medium px-1">
              <span>{isAr ? `إجمالي المهام (${tasks.length})` : `All Tasks (${tasks.length})`}</span>
              <span className="font-mono text-[11px] text-emerald-400">
                {isAr ? `المهام النشطة: ${tasks.filter(t => t.enabled).length}` : `Active: ${tasks.filter(t => t.enabled).length}`}
              </span>
            </div>

            {tasks.map(task => {
              const isRunning = runningTaskId === task.id || task.last_status === 'running';
              const isError = task.last_status === 'error';

              return (
                <div
                  key={task.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isDark
                      ? 'bg-[#16181d] border-[#262930] hover:border-[#353942]'
                      : 'bg-white border-slate-200 shadow-sm'
                  } ${!task.enabled ? 'opacity-65' : ''}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Left: Info */}
                    <div className="flex items-start gap-3 min-w-0">
                      <button
                        onClick={() => handleToggleTask(task)}
                        className={`mt-0.5 p-2 rounded-xl transition-colors ${
                          task.enabled
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-white/5 text-gray-500 border border-white/10'
                        }`}
                        title={task.enabled ? (isAr ? 'إيقاف مؤقت' : 'Pause') : (isAr ? 'تفعيل' : 'Enable')}
                      >
                        {task.enabled ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4" />}
                      </button>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-sm text-[#EDEDED] truncate">{task.name}</h3>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-[#8ab4f8] border border-white/10">
                            {task.type === 'folder_watch'
                              ? isAr ? 'راصد مجلد' : 'Folder Watch'
                              : task.type === 'daily'
                              ? isAr ? `يومياً (${task.daily_time})` : `Daily (${task.daily_time})`
                              : isAr ? `كل ${task.interval_minutes} دقيقة` : `Every ${task.interval_minutes}m`}
                          </span>

                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#1e2026] text-[#8F95A0] border border-[#2a2d36]">
                            {task.model.replace(/^Google\s+/i, '').replace(/^OpenAI\s+/i, '').replace(/\(.*\)/, '').trim()}
                          </span>
                        </div>

                        {task.description && (
                          <p className="text-xs text-[#8F95A0] mt-1 line-clamp-1">{task.description}</p>
                        )}

                        {task.type === 'folder_watch' && task.watch_folder && (
                          <div className="flex items-center gap-1.5 text-[11px] text-gray-400 font-mono mt-1.5">
                            <FolderSync className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span className="truncate max-w-md">{task.watch_folder}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-3 text-[11px] text-[#8F95A0] mt-2 font-mono">
                          <span>
                            {isAr ? 'آخر تشغيل: ' : 'Last Run: '}
                            <strong className="text-gray-300 font-normal">{formatRelativeTime(task.last_run)}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            {isAr ? 'التكرار: ' : 'Runs: '}
                            <strong className="text-gray-300 font-normal">{task.run_count || 0}</strong>
                          </span>
                          {isError && (
                            <>
                              <span>•</span>
                              <span className="text-red-400 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                {isAr ? 'خطأ في التنفيذ' : 'Failed'}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                      {task.last_output && (
                        <button
                          onClick={() => setViewingOutputTask(task)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors flex items-center gap-1.5 border border-white/10"
                        >
                          <FileText className="w-3.5 h-3.5 text-[#8ab4f8]" />
                          <span>{isAr ? 'عرض النتيجة' : 'View Result'}</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleViewLogs(task)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors border border-white/10"
                        title={isAr ? 'سجل التشغيل' : 'Execution Logs'}
                      >
                        <History className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleOpenEdit(task)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors border border-white/10"
                        title={isAr ? 'تعديل المهمة' : 'Edit Task'}
                      >
                        <Sliders className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="p-1.5 rounded-lg text-red-400/80 hover:text-red-400 hover:bg-red-500/10 transition-colors border border-red-500/20"
                        title={isAr ? 'حذف' : 'Delete'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleRunNow(task)}
                        disabled={isRunning}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
                          isRunning
                            ? 'bg-blue-600/40 text-blue-300 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-500 text-white active:scale-95'
                        }`}
                      >
                        {isRunning ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>{isAr ? 'جاري المعالجة...' : 'Running...'}</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>{isAr ? 'تشغيل الآن' : 'Run Now'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className={`w-full max-w-xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200 ${
              isDark ? 'bg-[#16181d] border-[#262930] text-[#EDEDED]' : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            <div className="px-6 py-4 border-b border-[#262930] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#8ab4f8]" />
                <h2 className="font-bold text-sm sm:text-base">
                  {editingTask
                    ? isAr ? 'تعديل الأتمتة' : 'Edit Automation'
                    : isAr ? 'إنشاء أتمتة جديدة' : 'Create New Automation'}
                </h2>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-lg text-[#8F95A0] hover:text-white hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-medium text-[#8F95A0] mb-1.5">
                  {isAr ? 'اسم الأتمتة' : 'Automation Name'} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder={isAr ? 'مثال: مراجع الأكواد الذكي' : 'e.g., Code Reviewer'}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm border transition-colors outline-none ${
                    isDark
                      ? 'bg-[#1e2026] border-[#2a2d36] focus:border-[#8ab4f8] text-white'
                      : 'bg-slate-50 border-slate-300 focus:border-blue-500 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#8F95A0] mb-1.5">
                  {isAr ? 'الوصف' : 'Description'}
                </label>
                <input
                  type="text"
                  value={formData.description || ''}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder={isAr ? 'وصف مختصر لوظيفة المهمة' : 'Brief explanation'}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm border transition-colors outline-none ${
                    isDark
                      ? 'bg-[#1e2026] border-[#2a2d36] focus:border-[#8ab4f8] text-white'
                      : 'bg-slate-50 border-slate-300 focus:border-blue-500 text-slate-900'
                  }`}
                />
              </div>

              {/* Type Selector */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'interval', label: isAr ? 'تكرار دوري' : 'Interval', desc: isAr ? 'كل X دقائق' : 'Every X mins' },
                  { id: 'daily', label: isAr ? 'يومي' : 'Daily', desc: isAr ? 'في ساعة محددة' : 'At specific time' },
                  { id: 'folder_watch', label: isAr ? 'راصد مجلد' : 'Folder Watch', desc: isAr ? 'عند تعديل الملفات' : 'On file change' },
                ].map(typeItem => (
                  <button
                    key={typeItem.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, type: typeItem.id as any })}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      formData.type === typeItem.id
                        ? 'border-[#8ab4f8] bg-[#8ab4f8]/10 text-[#8ab4f8] font-semibold'
                        : isDark
                        ? 'border-[#262930] bg-[#1e2026] text-[#8F95A0] hover:text-white'
                        : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div className="text-xs">{typeItem.label}</div>
                    <div className="text-[10px] opacity-70 mt-0.5 font-normal">{typeItem.desc}</div>
                  </button>
                ))}
              </div>

              {/* Conditional Inputs Based on Type */}
              {formData.type === 'interval' && (
                <div>
                  <label className="block text-xs font-medium text-[#8F95A0] mb-1.5">
                    {isAr ? 'التكرار الزمني (بالدقائق)' : 'Interval (Minutes)'}
                  </label>
                  <input
                    type="number"
                    min="5"
                    step="5"
                    value={formData.interval_minutes || 60}
                    onChange={e => setFormData({ ...formData, interval_minutes: parseInt(e.target.value) || 60 })}
                    className={`w-full px-3.5 py-2 rounded-xl text-xs sm:text-sm border transition-colors outline-none ${
                      isDark ? 'bg-[#1e2026] border-[#2a2d36] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              )}

              {formData.type === 'daily' && (
                <div>
                  <label className="block text-xs font-medium text-[#8F95A0] mb-1.5">
                    {isAr ? 'وقت التشغيل اليومي (24 ساعة)' : 'Daily Time (24h format)'}
                  </label>
                  <input
                    type="time"
                    value={formData.daily_time || '09:00'}
                    onChange={e => setFormData({ ...formData, daily_time: e.target.value })}
                    className={`w-full px-3.5 py-2 rounded-xl text-xs sm:text-sm border transition-colors outline-none ${
                      isDark ? 'bg-[#1e2026] border-[#2a2d36] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              )}

              {formData.type === 'folder_watch' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-[#8F95A0] mb-1.5">
                      {isAr ? 'مسار المجلد المرصود' : 'Watch Folder Path'}
                    </label>
                    <input
                      type="text"
                      value={formData.watch_folder || ''}
                      onChange={e => setFormData({ ...formData, watch_folder: e.target.value })}
                      placeholder={isAr ? 'مثال: C:\\Users\\Name\\Desktop\\Project' : 'e.g., C:\\MyProject'}
                      className={`w-full px-3.5 py-2 rounded-xl text-xs sm:text-sm border font-mono transition-colors outline-none ${
                        isDark ? 'bg-[#1e2026] border-[#2a2d36] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                    <span className="text-[10px] text-[#8F95A0] mt-1 block">
                      {isAr ? 'سيتم مراقبة أي ملف جديد أو معدل تلقائياً وإرساله للنموذج.' : 'Any new or modified files will be automatically parsed.'}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#8F95A0] mb-1.5">
                      {isAr ? 'فحص دوري كل (دقائق)' : 'Poll Interval (Minutes)'}
                    </label>
                    <input
                      type="number"
                      min="5"
                      step="5"
                      value={formData.interval_minutes || 10}
                      onChange={e => setFormData({ ...formData, interval_minutes: parseInt(e.target.value) || 10 })}
                      className={`w-full px-3.5 py-2 rounded-xl text-xs sm:text-sm border transition-colors outline-none ${
                        isDark ? 'bg-[#1e2026] border-[#2a2d36] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                </div>
              )}

              {/* Model Selector */}
              <div>
                <label className="block text-xs font-medium text-[#8F95A0] mb-1.5">
                  {isAr ? 'النموذج المستخدم' : 'AI Model'}
                </label>
                <select
                  value={formData.model || 'Google Gemini (gemini-2.5-flash)'}
                  onChange={e => setFormData({ ...formData, model: e.target.value })}
                  className={`w-full px-3.5 py-2 rounded-xl text-xs sm:text-sm border transition-colors outline-none ${
                    isDark ? 'bg-[#1e2026] border-[#2a2d36] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="Google Gemini (gemini-2.5-flash)">Google Gemini (gemini-2.5-flash)</option>
                  <option value="Google Gemini (gemini-3.5-flash-lite)">Google Gemini (gemini-3.5-flash-lite)</option>
                  <option value="ChatGPT (gpt-4o-mini)">ChatGPT (gpt-4o-mini)</option>
                  <option value="ChatGPT (gpt-4o)">ChatGPT (gpt-4o)</option>
                </select>
              </div>

              {/* Prompt Textarea */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-[#8F95A0]">
                    {isAr ? 'برومبت الأتمتة (التعليمات للموديل)' : 'Automation Prompt'} *
                  </label>
                  <div className="flex items-center gap-1 text-[10px] text-[#8F95A0]">
                    <span>متغيرات:</span>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, prompt: (formData.prompt || '') + ' {date} ' })}
                      className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 font-mono text-[#8ab4f8]"
                    >
                      {'{date}'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, prompt: (formData.prompt || '') + ' {cpu}% {memory}% ' })}
                      className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 font-mono text-[#8ab4f8]"
                    >
                      {'{cpu}'}
                    </button>
                  </div>
                </div>
                <textarea
                  required
                  rows={4}
                  value={formData.prompt || ''}
                  onChange={e => setFormData({ ...formData, prompt: e.target.value })}
                  placeholder={isAr ? 'اكتب التعليمات التي سينفذها النموذج عند تشغيل هذه الأتمتة...' : 'Enter prompt instructions...'}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm border transition-colors outline-none leading-relaxed ${
                    isDark
                      ? 'bg-[#1e2026] border-[#2a2d36] focus:border-[#8ab4f8] text-white'
                      : 'bg-slate-50 border-slate-300 focus:border-blue-500 text-slate-900'
                  }`}
                />
              </div>

              {/* Actions Footer */}
              <div className="pt-3 border-t border-[#262930] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-[#8F95A0] hover:text-white transition-colors"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md active:scale-95 transition-all"
                >
                  {editingTask ? (isAr ? 'حفظ التعديلات' : 'Save Changes') : (isAr ? 'إنشاء المهمة' : 'Create Task')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW LAST RESULT MODAL */}
      {viewingOutputTask && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className={`w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200 ${
              isDark ? 'bg-[#16181d] border-[#262930] text-[#EDEDED]' : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            <div className="px-6 py-4 border-b border-[#262930] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#8ab4f8]" />
                <h2 className="font-bold text-sm sm:text-base">
                  {isAr ? `نتيجة: ${viewingOutputTask.name}` : `Result: ${viewingOutputTask.name}`}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => copyToClipboard(viewingOutputTask.last_output || '')}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors flex items-center gap-1 border border-white/10"
                >
                  {copiedOutput ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedOutput ? (isAr ? 'تم النسخ' : 'Copied') : (isAr ? 'نسخ' : 'Copy')}</span>
                </button>
                <button
                  onClick={() => setViewingOutputTask(null)}
                  className="p-1.5 rounded-lg text-[#8F95A0] hover:text-white hover:bg-white/5 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1 select-text">
              <div className="text-xs text-[#8F95A0] font-mono mb-3 pb-2 border-b border-[#262930]">
                {isAr ? 'تاريخ التوليد: ' : 'Generated: '}
                {viewingOutputTask.last_run ? new Date(viewingOutputTask.last_run * 1000).toLocaleString(isAr ? 'ar-EG' : 'en-US') : ''}
              </div>

              <div className="text-sm leading-relaxed prose prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {viewingOutputTask.last_output || (isAr ? 'لا توجد مخرجات مسجلة' : 'No output recorded')}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW HISTORY LOGS MODAL */}
      {historyTask && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className={`w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200 ${
              isDark ? 'bg-[#16181d] border-[#262930] text-[#EDEDED]' : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            <div className="px-6 py-4 border-b border-[#262930] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-[#8ab4f8]" />
                <h2 className="font-bold text-sm sm:text-base">
                  {isAr ? `سجل التشغيل: ${historyTask.name}` : `Run History: ${historyTask.name}`}
                </h2>
              </div>
              <button
                onClick={() => setHistoryTask(null)}
                className="p-1.5 rounded-lg text-[#8F95A0] hover:text-white hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-3">
              {isLoadingLogs ? (
                <div className="py-10 flex flex-col items-center justify-center space-y-2">
                  <Loader2 className="w-6 h-6 text-[#8ab4f8] animate-spin" />
                  <span className="text-xs text-[#8F95A0]">{isAr ? 'جاري تحميل السجلات...' : 'Loading history...'}</span>
                </div>
              ) : taskLogs.length === 0 ? (
                <div className="text-center py-12 text-[#8F95A0] text-xs">
                  {isAr ? 'لا توجد سجلات تشغيل سابقة لهذه المهمة' : 'No execution logs recorded yet.'}
                </div>
              ) : (
                taskLogs.map(log => (
                  <div
                    key={log.id}
                    className={`p-3.5 rounded-2xl border ${
                      isDark ? 'bg-[#1e2026] border-[#2a2d36]' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="font-mono text-[#8ab4f8]">{log.date_str || new Date(log.timestamp * 1000).toLocaleString()}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/15 text-emerald-400 font-semibold">
                        {log.status === 'success' ? 'Success' : 'Error'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-300 max-h-36 overflow-y-auto line-clamp-4 leading-relaxed font-sans">
                      {log.output}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
