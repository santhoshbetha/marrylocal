import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';

const DEFAULT_GRADIENT = 'from-blue-600 to-indigo-700';

const GRADIENTS = [
  { prefix: '/about', gradient: 'from-blue-600 to-purple-600' },
  { prefix: '/contact', gradient: 'from-green-600 to-blue-600' },
  { prefix: '/dashboard', gradient: DEFAULT_GRADIENT },
  { prefix: '/discovery', gradient: DEFAULT_GRADIENT },
  { prefix: '/profile', gradient: DEFAULT_GRADIENT },
  { prefix: '/settings', gradient: DEFAULT_GRADIENT },
  { prefix: '/referrals', gradient: DEFAULT_GRADIENT },
  { prefix: '/signup', gradient: DEFAULT_GRADIENT },
  { prefix: '/login', gradient: DEFAULT_GRADIENT },
  { prefix: '/onboarding', gradient: DEFAULT_GRADIENT },
  { prefix: '/photos', gradient: DEFAULT_GRADIENT },
  { prefix: '/location', gradient: DEFAULT_GRADIENT },
  { prefix: '/verify', gradient: DEFAULT_GRADIENT },
];

/**
 * Resolves the navigation gradient from the current route.
 *
 * Longest-prefix matching keeps nested routes stable without duplicating a
 * per-page theme state variable.
 */
export function usePageGradient() {
  const { pathname } = useLocation();

  return useMemo(() => {
    if (pathname === '/') return DEFAULT_GRADIENT;

    const match = GRADIENTS.filter(item => pathname.startsWith(item.prefix)).sort(
      (a, b) => b.prefix.length - a.prefix.length,
    )[0];

    return match?.gradient || DEFAULT_GRADIENT;
  }, [pathname]);
}

export default usePageGradient;
