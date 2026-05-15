import { Bot } from 'lucide-react';

/**
 * IconLogo - نسخة الأيقونة (للمساحات الصغيرة)
 * أيقونة رفيق - مثل زر "اسأل رفيق"
 */
export function IconLogo({ className = "size-10" }: { className?: string }) {
  return (
    <div className={`relative ${className} group`}>
      {/* Glow Effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-2xl blur-md opacity-40 group-hover:opacity-70 transition-opacity duration-300" />
      
      {/* Icon Container */}
      <div className="relative w-full h-full bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl shadow-lg flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
        <Bot className="w-[60%] h-[60%] text-white drop-shadow-lg" strokeWidth={2.5} />
      </div>
    </div>
  );
}

/**
 * Logo - اللوقو الكامل
 * الأيقونة + النص
 */
export function Logo({ size = 'default' }: { size?: 'default' | 'large' }) {
  const iconSize = size === 'large' ? 'size-16' : 'size-11';
  const textSize = size === 'large' ? 'text-[32px]' : 'text-[22px]';
  const taglineSize = size === 'large' ? 'text-[14px]' : 'text-[10px]';

  return (
    <div className="flex items-center gap-3 group" dir="rtl">
      {/* Robot Icon */}
      <IconLogo className={iconSize} />
      
      {/* Brand Text */}
      <div className="flex flex-col gap-1">
        {/* اسم التطبيق */}
        <h1 className={`${textSize} font-black leading-tight bg-gradient-to-l from-cyan-600 via-blue-600 to-teal-700 dark:from-cyan-400 dark:via-blue-400 dark:to-teal-300 bg-clip-text text-transparent`}>
          رفيق
        </h1>
        
        {/* Tagline */}
        <p className={`${taglineSize} text-muted-foreground font-semibold tracking-wide leading-none`}>
          Smart Call Helper
        </p>
      </div>
    </div>
  );
}