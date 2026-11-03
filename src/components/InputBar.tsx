import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowUp,
  Square,
  Paperclip,
  X,
  File,
  FileText,
  FileCode,
  Loader2,
  Mic,
  MicOff,
  Sparkles,
} from 'lucide-react';
import { AttachedFile } from '../types';
import { api } from '../services/api';
import { Translations, Theme, Language } from '../utils/translations';

interface InputBarProps {
  onSendMessage: (text: string, attachments?: AttachedFile[]) => void;
  onStop: () => void;
  isGenerating: boolean;
  selectedModel: string;
  t: Translations;
  theme: Theme;
  lang: Language;
}

export const InputBar: React.FC<InputBarProps> = ({
  onSendMessage,
  onStop,
  isGenerating,
  t,
  theme,
  lang,
}) => {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const isDark = theme === 'dark';

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        200
      )}px`;
    }
  }, [text]);

  // Speech Recognition (Web Speech API) Setup
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognizer = new SpeechRecognition();
      recognizer.continuous = false;
      recognizer.interimResults = true;
      recognizer.lang = lang === 'ar' ? 'ar-SA' : 'en-US';

      recognizer.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          setText((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };

      recognizer.onerror = (e: any) => {
        console.warn('Speech recognition notice:', e);
        setIsListening(false);
      };

      recognizer.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognizer;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, [lang]);

  const toggleVoiceRecording = () => {
    if (!recognitionRef.current) {
      alert(
        lang === 'ar'
          ? 'المتصفح الحالي لا يدعم الإدخال الصوتي المباشر. يرجى استخدام متصفح يدعم Web Speech API مثل Chrome أو Edge.'
          : 'Your browser does not support Speech Recognition. Please use Chrome or Edge.'
      );
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current.stop();
      } catch {}
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.lang = lang === 'ar' ? 'ar-SA' : 'en-US';
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.warn('Speech start error:', err);
        setIsListening(false);
      }
    }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const uploaded = await api.uploadFile(file);

        if (uploaded && uploaded.id) {
          setAttachments((prev) => [...prev, uploaded]);
        }
      }
    } catch (err) {
      console.error('File upload error:', err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSubmit = () => {
    if ((!text.trim() && attachments.length === 0) || isGenerating) return;

    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      setIsListening(false);
    }

    onSendMessage(text, attachments);
    setText('');
    setAttachments([]);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const renderAttachmentIcon = (att: AttachedFile) => {
    if (att.is_image || att.type.startsWith('image/')) {
      return (
        <img
          src={att.preview_url || '/app-icon.png'}
          alt={att.name}
          className="w-5 h-5 rounded object-cover"
        />
      );
    }
    if (
      att.name.endsWith('.ts') ||
      att.name.endsWith('.js') ||
      att.name.endsWith('.py') ||
      att.name.endsWith('.html') ||
      att.name.endsWith('.json')
    ) {
      return <FileCode className="w-4 h-4 text-emerald-400" />;
    }
    if (att.type.includes('pdf') || att.name.endsWith('.pdf')) {
      return <FileText className="w-4 h-4 text-red-400" />;
    }
    return <File className="w-4 h-4 text-blue-400" />;
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-4">
      {/* Input Outer Container with Liquid Glass and Drag State */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`relative rounded-3xl p-3 border transition-all duration-200 shadow-xl backdrop-blur-xl ${
          isDragging
            ? 'border-blue-500 bg-blue-500/10 ring-4 ring-blue-500/20'
            : isDark
            ? 'bg-[#18191c]/90 border-gemini-border focus-within:border-blue-500/50 hover:border-gray-600 shadow-black/40'
            : 'bg-white/95 border-slate-200 focus-within:border-blue-500 hover:border-slate-300 shadow-slate-200/50'
        }`}
      >
        {/* Render Attachments Chips */}
        {attachments.length > 0 && (
          <div
            className={`flex flex-wrap gap-2 p-2 border-b mb-2 ${
              isDark ? 'border-gemini-border/60' : 'border-slate-200'
            }`}
          >
            {attachments.map((att) => (
              <div
                key={att.id}
                className={`flex items-center space-x-2 rounded-xl px-2.5 py-1 text-xs shadow-sm animate-in fade-in zoom-in-95 duration-150 border ${
                  isDark
                    ? 'bg-[#202124] border-gray-700/60 text-gray-200'
                    : 'bg-slate-100 border-slate-200 text-slate-800'
                }`}
              >
                {renderAttachmentIcon(att)}
                <span className="font-medium truncate max-w-[150px]">{att.name}</span>
                <span className="text-[10px] opacity-60 font-mono">
                  ({(att.size / 1024).toFixed(1)} KB)
                </span>
                <button
                  type="button"
                  onClick={() => removeAttachment(att.id)}
                  className="text-gray-400 hover:text-red-400 transition-colors p-0.5 rounded-full hover:bg-black/10"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Upload Spinner indicator */}
        {isUploading && (
          <div className="flex items-center space-x-2 px-3 py-1 text-xs text-blue-400 animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>{lang === 'ar' ? 'جاري رفع الملف وتحليله...' : 'Uploading & processing file...'}</span>
          </div>
        )}

        {/* Voice Listening Bar Indicator */}
        {isListening && (
          <div className="flex items-center justify-between px-3 py-1.5 mb-1 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 animate-pulse">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
              </span>
              <span>{t.listening}</span>
            </div>
            <button
              onClick={toggleVoiceRecording}
              className="text-[11px] underline hover:text-red-300 font-medium"
            >
              {lang === 'ar' ? 'إنهاء التحدث' : 'Stop'}
            </button>
          </div>
        )}

        {/* Text Input Area */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          dir="auto"
          style={{ unicodeBidi: 'plaintext' }}
          placeholder={t.askPlaceholder}
          rows={1}
          className={`w-full bg-transparent text-sm md:text-base outline-none resize-none px-3 py-2 max-h-48 leading-relaxed font-sans ${
            isDark
              ? 'text-gray-100 placeholder-gray-500'
              : 'text-slate-900 placeholder-slate-400'
          }`}
        />

        <input
          ref={fileInputRef}
          type="file"
          onChange={(e) => handleFiles(e.target.files)}
          multiple
          className="hidden"
        />

        {/* Actions Bottom Bar */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center space-x-1.5">
            {/* Attachment Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`p-2 rounded-full transition-colors ${
                isDark ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title={lang === 'ar' ? 'إرفاق ملفات أو صور للتحليل' : 'Attach files or images for analysis'}
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Voice Input Button (Speech-to-Text) */}
            <button
              type="button"
              onClick={toggleVoiceRecording}
              className={`p-2 rounded-full transition-all ${
                isListening
                  ? 'bg-red-500 text-white animate-bounce shadow-lg shadow-red-500/30'
                  : isDark
                  ? 'text-gray-400 hover:text-purple-400 hover:bg-white/5'
                  : 'text-slate-500 hover:text-purple-600 hover:bg-slate-100'
              }`}
              title={t.voiceInput}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          </div>

          {/* Send / Stop Buttons */}
          <div className="flex items-center space-x-2">
            {isGenerating ? (
              <button
                onClick={onStop}
                className="w-8 h-8 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center transition-all shadow-md active:scale-95"
                title={t.stop}
              >
                <Square className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!text.trim() && attachments.length === 0}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  text.trim() || attachments.length > 0
                    ? 'bg-gradient-to-tr from-blue-600 to-purple-600 text-white hover:opacity-95 shadow-lg shadow-blue-500/20 cursor-pointer active:scale-95'
                    : isDark
                    ? 'bg-white/10 text-gray-500 cursor-not-allowed'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
                title={t.send}
              >
                <ArrowUp className="w-4 h-4 stroke-[2.5]" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Footer Info Pill */}
      <div className="text-center mt-2.5 text-[11px] opacity-60 flex items-center justify-center gap-1.5 font-medium">
        <Sparkles className="w-3 h-3 text-blue-400" />
        <span>
          {lang === 'ar'
            ? 'R3 AI Workstation · مدعوم بأحدث نماذج Gemini و ChatGPT وتوليد PDF الاحترافي'
            : 'R3 AI Workstation · Powered by Gemini, ChatGPT & Direct PDF Engine'}
        </span>
      </div>
    </div>
  );
};
