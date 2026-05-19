import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { ArrowRight, Paperclip, Send, Gem } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { createTrainingEntry } from '../services/trainingEntriesService';
import { useI18nLayout } from '../hooks/useI18nLayout';
import {
  entityForApi,
  entityKeyFromValue,
  tEntity,
  type EntityKey,
} from '../i18n/translations';
import {
  stripTrainingAttachmentFooter,
  scenarioTextMentionsAttachmentLine,
} from '../utils/trainingScenarioAttachment';

const PREFILL_KEY = 'teach-rafeeq-prefill';

type PrefillPayload = {
  entityType?: string;
  problemDetails?: string;
  correctInfo?: string;
  caseId?: string;
};

export function TeachRafeeqExperience() {
  const { t } = useI18nLayout();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [caseId, setCaseId] = useState('');
  /** مُعبّأ من مساعد المكالمات — للعرض فقط */
  const [caseIdLocked, setCaseIdLocked] = useState(false);
  /** مفتاح نوع الجهة — نفس خيارات مساعد المكالمات (يُعبّأ تلقائياً ولا يُعدَّل) */
  const [entityKey, setEntityKey] = useState<EntityKey | ''>('');
  const [problemDetails, setProblemDetails] = useState('');
  const [correctInfo, setCorrectInfo] = useState('');
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(PREFILL_KEY);
      if (!raw) return;
      const p = JSON.parse(raw) as PrefillPayload;
      if (typeof p.caseId === 'string' && p.caseId.trim()) {
        setCaseId(p.caseId.trim());
        setCaseIdLocked(true);
      }
      if (typeof p.entityType === 'string') {
        const key = entityKeyFromValue(p.entityType);
        if (key) setEntityKey(key);
      }
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
    const cat = entityKey ? entityForApi(entityKey) : '';
    const rawProblem = problemDetails.trim();
    const correct = correctInfo.trim();
    if (!cat || !rawProblem || !correct) {
      toast.error(t('teach.fillRequired'));
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
          relatedCaseId: caseId.trim() || undefined,
        },
        attachmentFile,
      );
      toast.success(t('teach.submitSuccess'));
      setCaseId('');
      setCaseIdLocked(false);
      setEntityKey('');
      setProblemDetails('');
      setCorrectInfo('');
      setAttachmentFile(null);
      window.dispatchEvent(
        new CustomEvent('app:navigate', {
          detail: { view: 'dashboard-service', serviceId: 'what-did-rafeeq-learn' },
        }),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('teach.submitFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const goBackToCallHelper = () => {
    window.dispatchEvent(
      new CustomEvent('app:navigate', {
        detail: { view: 'callhelper', problemSeed: '' },
      }),
    );
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex flex-col items-center py-8 px-4 fade-in">
      <div className="w-full max-w-lg space-y-6">
        <button
          type="button"
          onClick={goBackToCallHelper}
          className="flex w-full items-center justify-end gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <span>العودة لمساعد المكالمات</span>
          <ArrowRight className="size-4 shrink-0" aria-hidden />
        </button>
        <header className="w-full text-foreground">
          <h1 className="text-right text-xl font-bold tracking-tight sm:text-2xl font-display">
            {t('teach.title')}
          </h1>
        </header>

        <div className="panel-elevated p-6" dir="rtl">
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="erf-case-id" className="text-right text-sm font-medium">
                {t('teach.caseId')}
              </Label>
              <Input
                id="erf-case-id"
                value={caseId}
                onChange={
                  caseIdLocked ? undefined : (e) => setCaseId(e.target.value)
                }
                readOnly={caseIdLocked}
                disabled={caseIdLocked}
                aria-readonly={caseIdLocked}
                placeholder={caseIdLocked ? undefined : t('teach.caseIdPlaceholder')}
                className={`text-right h-11 rounded-xl font-mono text-sm ${
                  caseIdLocked
                    ? 'bg-muted/60 cursor-default opacity-100'
                    : ''
                }`}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="erf-entity" className="text-right text-sm font-medium">
                {t('teach.entityType')}
              </Label>
              <Input
                id="erf-entity"
                value={entityKey ? tEntity(t, entityKey) : ''}
                readOnly
                disabled
                aria-readonly
                className="text-right h-11 rounded-xl bg-muted/60 cursor-default opacity-100"
                placeholder={t('callHelper.form.entityPlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="erf-problem" className="text-right text-sm font-medium">
                تفاصيل المشكلة:
              </Label>
              <Textarea
                id="erf-problem"
                value={problemDetails}
                onChange={(e) => setProblemDetails(e.target.value)}
                rows={4}
                className="min-h-[100px] resize-y text-right rounded-xl"
                placeholder="أكتب لي وش صار باختصار، مثلاً: في أي خطوة واجه العميل صعوبة ؟ أو وش الرسالة اللي ظهرت له؟"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="erf-correct" className="text-right text-sm font-medium">
                الإفادة الصحيحة:
              </Label>
              <Textarea
                id="erf-correct"
                value={correctInfo}
                onChange={(e) => setCorrectInfo(e.target.value)}
                rows={5}
                className="min-h-[120px] resize-y text-right rounded-xl"
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
              className="flex w-full items-center justify-end gap-2 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              <Paperclip className="size-4 shrink-0" aria-hidden />
              <span>أرفق ملف توضيحي (اختياري)</span>
            </button>
            {attachmentFile ? (
              <p className="text-right text-xs text-muted-foreground">المختار: {attachmentFile.name}</p>
            ) : null}

            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="h-11 w-full rounded-xl text-base font-semibold"
            >
              <span className="inline-flex items-center justify-center gap-2">
                <span>أرسل لرفيق</span>
                <Send className="size-4 shrink-0" aria-hidden />
              </span>
            </Button>
          </div>

          <footer className="mt-6 flex items-center justify-center gap-2 border-t border-border pt-4 text-center text-xs text-muted-foreground">
            <Gem className="size-3.5 shrink-0 text-[var(--ai)]" aria-hidden />
            <span>رفيق يتطور منك، لا توقف</span>
          </footer>
        </div>
      </div>
    </div>
  );
}
