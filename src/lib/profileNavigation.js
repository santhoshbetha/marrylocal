export function profilePath(profile) {
  const identifier = profile?.shortid ?? profile?.id;
  return identifier ? `/user/${identifier}` : '/dashboard/search';
}

export function profilePathInNewTab(profile) {
  const path = profilePath(profile);
  if (path === '/dashboard/search') return path;

  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}newTab=true`;
}

export function openProfileInNewTab(profile) {
  if (typeof window === 'undefined') return;

  const path = profilePathInNewTab(profile);
  window.open(path, '_blank', 'noopener,noreferrer');
}
