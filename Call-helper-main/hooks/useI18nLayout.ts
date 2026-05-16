import { useLanguage } from '../contexts/LanguageContext';

/** Translation + layout helpers that follow locale (RTL for AR, LTR for EN). */
export function useI18nLayout() {
  const { locale, dir, isRtl, t, setLocale, toggleLocale } = useLanguage();
  return {
    locale,
    dir,
    isRtl,
    t,
    setLocale,
    toggleLocale,
    textAlign: isRtl ? 'text-right' : 'text-left',
    textAlignBlock: isRtl ? 'text-right block' : 'text-left block',
    justifyEnd: isRtl ? 'justify-end' : 'justify-start',
    iconSide: isRtl ? 'right-3' : 'left-3',
    inputPad: isRtl ? 'pr-10' : 'pl-10',
    marginStart: isRtl ? 'ms-1' : 'me-1',
    marginEnd: isRtl ? 'me-1' : 'ms-1',
  };
}
