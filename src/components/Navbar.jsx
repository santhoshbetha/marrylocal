import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';
import { applyActiveTheme, readThemeMode, toggleThemeMode } from '@/lib/theme';

export function NavbarBrand({ to = '/' }) {
  return (
    <Link to={to} className="group flex cursor-pointer items-center gap-1">
      <span className="relative flex h-9 shrink-0 items-center">
        <img
          src="/LogoTeal32.png"
          alt="MarryLocal Logo"
          className="h-9 w-auto object-contain transition-transform duration-300 group-hover:scale-105 dark:hidden"
        />
        <img
          src="/LogoYellow32.png"
          alt="MarryLocal Logo"
          className="hidden h-9 w-auto object-contain transition-transform duration-300 group-hover:scale-105 dark:block"
        />
      </span>
      <span className="font-custom text-3xl font-black tracking-wide text-foreground">
        <span className="text-orange-700 dark:text-slate-100">
          Marry<span className="font-black text-primary">Local</span>
        </span>
      </span>
    </Link>
  );
}

export function ThemeToggle({ className = '' }) {
  const [mode, setMode] = useState(readThemeMode);

  const handleToggle = () => {
    const nextMode = toggleThemeMode();
    setMode(nextMode);
  };

  const isDark = mode === 'dark';

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${className}`}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-pressed={isDark}
      title={isDark ? 'Light mode' : 'Dark mode'}
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-primary" />
      ) : (
        <Moon className="h-4 w-4 text-primary" />
      )}
    </button>
  );
}

export function Navbar({ navigation, actions, mobileMenu, brandTo = '/' }) {
  // Hydrate the master mode and dark flavor before the first paint of the shell.
  useEffect(() => {
    applyActiveTheme();
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-card/90 backdrop-blur-md">
      <div className="container mx-auto flex min-h-16 items-center justify-between gap-4 px-6 py-3">
        <NavbarBrand to={brandTo} />

        {navigation ? <nav className="hidden items-center gap-2 md:flex">{navigation}</nav> : null}

        <div className="flex items-center gap-2">
          {actions}
          <ThemeToggle />
          {mobileMenu}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
