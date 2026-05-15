import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Brain, Lightbulb, Paperclip, Send, Gem } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { createTrainingEntry } from '../services/trainingEntriesService';
import {
  stripTrainingAttachmentFooter,
  scenarioTextMentionsAttachmentLine,
} from '../utils/trainingScenarioAttachment';

const PREFILL_KEY = 'teach-rafeeq-prefill';

type PrefillPayload = {
  entityType?: string;
  problemDetails?: string;
  correctInfo?: string;
};

export function TeachRafeeqExperience() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [entityType, setEntityType] = useState('');
  const [problemDetails, setProblemDetails] = useState('');
  const [correctInfo, setCorrectInfo] = useState('');
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(PREFILL_KEY);
      if (!raw) return;
      const p = JSON.parse(raw) as PrefillPayload;
      if (typeof p.entityType === 'string') setEntityType(p.entityType);
      if (typeof p.problemDetails === 'string') setProblemDetails(p.problemDetails);
      if (typeof p.correctInfo === 'string') setCorrectInfo(p.correctInfo);
      sessionStorage.removeItem(PREFILL_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const handlePickFile = () => fileInputRef.current?.click();

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setAttachmentFile(f ?? null);
    e.target.value = '';
  };

  const handleSubmit = async () => {
    const cat = entityType.trim();
    const rawProblem = problemDetails.trim();
    const correct = correctInfo.trim();
    if (!cat || !rawProblem || !correct) {
      toast.error('يرجى تعبئة نوع الجهة وتفاصيل المشكلة والإفادة الصحيحة.');
      return;
    }
    if (!attachmentFile && scenarioTextMentionsAttachmentLine(rawProblem)) {
      toast.error(
        'النص فيه سطر يشبه «مرفق توضيحي (اسم الملف): …» من دون أن تختار ملفاً. اضغط «أرفق ملف توضيحي» واختر الملف، أو احذف هذا السطر من النص.',
      );
      return;
    }
    const scenario = stripTrainingAttachmentFooter(rawProblem);
    setIsSubmitting(true);
    try {
      await createTrainingEntry(
        {
          category: cat,
          scenario,
          correctResponse: correct,
          alternativeResponses: [],
        },
        attachmentFile,
      );
      toast.success('تم الإرسال. سيظهر المثال في «وش تعلم رفيق؟» قيد المراجعة.');
      setEntityType('');
      setProblemDetails('');
      setCorrectInfo('');
      setAttachmentFile(null);
      window.dispatchEvent(
        new CustomEvent('app:navigate', {
          detail: { view: 'dashboard-service', serviceId: 'what-did-rafeeq-learn' },
        }),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'تعذّر الإرسال');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex flex-col items-center py-8 px-4 bg-zinc-100 dark:bg-zinc-950/80">
      <div className="w-full max-w-lg space-y-6">
        <header className="flex items-center justify-center gap-3 text-zinc-900 dark:text-zinc-50">
          <div className="relative flex size-11 shrink-0 items-center justify-center">
            <Lightbulb className="size-11 text-amber-400 drop-shadow-sm" strokeWidth={1.5} />
            <Brain className="absolute size-[1.35rem] text-violet-700 dark:text-violet-300" strokeWidth={2} />
          </div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">علّم رفيق من تجربتك</h1>
        </header>

        <div
          className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-950"
          dir="rtl"
        >
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="erf-entity" className="text-right text-sm font-medium text-zinc-800 dark:text-zinc-100">
                نوع الجهة:
              </Label>
              <Input
                id="erf-entity"
                value={entityType}
                onChange={e => setEntityType(e.target.value)}
                className="text-right border-zinc-300 bg-white text-zinc-900 placeholder:text-zinc-400 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500"
                placeholder="أدخل الجهة اللي كانت عندها المشكلة أو الاستفسار، عشان أربط المعلومة بسياقها الصحيح."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="erf-problem" className="text-right text-sm font-medium text-zinc-800 dark:text-zinc-100">
                تفاصيل المشكلة:
              </Label>
              <Textarea
                id="erf-problem"
                value={problemDetails}
                onChange={e => setProblemDetails(e.target.value)}
                rows={4}
                className="min-h-[100px] resize-y text-right border-zinc-300 bg-white text-zinc-900 placeholder:text-zinc-400 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500"
                placeholder="أكتب لي وش صار باختصار، مثلاً: في أي خطوة واجه العميل صعوبة ؟ أو وش الرسالة اللي ظهرت له؟"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="erf-correct" className="text-right text-sm font-medium text-zinc-800 dark:text-zinc-100">
                الإفادة الصحيحة:
              </Label>
              <Textarea
                id="erf-correct"
                value={correctInfo}
                onChange={e => setCorrectInfo(e.target.value)}
                rows={5}
                className="min-h-[120px] resize-y text-right border-zinc-300 bg-white text-zinc-900 placeholder:text-zinc-400 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500"
                placeholder="شاركي الرد اللي استخدمته مع العميل أو الحل اللي فعلاً نفع العميل، عشان أتعلمه منك وأحفظه"
              />
            </div>

            <input
              ref={fileInputRef}
              type="file"
              className="sr-only"
              accept="image/*,.pdf,.doc,.docx,.txt"
              aria-hidden
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={handlePickFile}
              className="flex w-full items-center justify-end gap-2 text-sm text-zinc-600 underline-offset-4 transition-colors hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              <Paperclip className="size-4 shrink-0" aria-hidden />
              <span>أرفق ملف توضيحي (اختياري)</span>
            </button>
            {attachmentFile ? (
              <p className="text-right text-xs text-zinc-500 dark:text-zinc-400">المختار: {attachmentFile.name}</p>
            ) : null}

            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="h-11 w-full rounded-md bg-zinc-700 text-base font-semibold text-white shadow-sm hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-600 dark:hover:bg-zinc-500"
            >
              <span className="inline-flex items-center justify-center gap-2">
                <span>أرسل لرفيق</span>
                <Send className="size-4 shrink-0" aria-hidden />
              </span>
            </Button>
          </div>

          <footer className="mt-6 flex items-center justify-center gap-2 border-t border-zinc-100 pt-4 text-center text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            <Gem className="size-3.5 shrink-0 text-amber-600/80 dark:text-amber-400/90" aria-hidden />
            <span>رفيق يتطور منك، لا توقف</span>
          </footer>
        </div>
      </div>
    </div>
  );
}
