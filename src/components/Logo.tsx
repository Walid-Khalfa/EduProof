import React from 'react';

type LogoProps = {
  variant?: 'full' | 'icon';
  mode?: 'auto' | 'light' | 'dark';
  className?: string;
  withTagline?: boolean;
};

export default function Logo({ 
  variant = 'full', 
  mode = 'auto', 
  className = 'h-8 w-auto',
  withTagline = false 
}: LogoProps) {
  const [theme, setTheme] = React.useState<'light' | 'dark'>('light');

  React.useEffect(() => {
    if (mode !== 'auto') {
      setTheme(mode);
      return;
    }

    // Detect theme from data-theme attribute or class
    const detectTheme = () => {
      const htmlEl = document.documentElement;
      const isDark = 
        htmlEl.getAttribute('data-theme') === 'dark' || 
        htmlEl.classList.contains('dark');
      setTheme(isDark ? 'dark' : 'light');
    };

    detectTheme();

    // Watch for theme changes
    const observer = new MutationObserver(detectTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class']
    });

    return () => observer.disconnect();
  }, [mode]);

  const getLogoSrc = () => {
    if (variant === 'icon') {
      return theme === 'dark' 
        ? '/brand/eduproof-icon-mono.svg'
        : '/brand/eduproof-icon.svg';
    }
    
    return theme === 'dark'
      ? '/brand/eduproof-logo-dark.svg'
      : '/brand/eduproof-logo.svg';
  };

  return (
    <div className="flex items-center gap-3">
      <img 
        src={getLogoSrc()} 
        alt="EduProof" 
        className={className}
        fetchPriority="high"
      />
      {withTagline && variant === 'full' && (
        <span className="text-sm text-muted-foreground hidden md:inline">
          Smart learning. Verified.
        </span>
      )}
      <span className="sr-only">EduProof</span>
    </div>
  );
}
