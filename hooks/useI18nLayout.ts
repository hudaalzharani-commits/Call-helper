import { useLanguage } from '../contexts/LanguageContext';

/** Translation + fixed RTL layout (matches pre–i18n styling). */
export function useI18nLayout() {
  const { locale, dir, isRtl, t, setLocale, toggleLocale } = useLanguage();
  return {
    locale,
    dir,
    isRtl,
    t,
    setLocale,
    toggleLocale,
    textAlign: 'text-right',
    textAlignBlock: 'text-right block',
    justifyEnd: 'justify-end',
    iconSide: 'right-3',
    inputPad: 'pr-10',
    marginStart: 'ms-1',
    marginEnd: 'me-1',
  };
}
