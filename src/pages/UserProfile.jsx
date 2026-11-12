import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  Ban,
  Bookmark,
  Briefcase,
  CalendarDays,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Flag,
  GraduationCap,
  Heart,
  Languages,
  Mail,
  MapPin,
  MoveLeft,
  Navigation,
  Phone,
  ShieldAlert,
  ShieldCheck,
  Users,
  VolumeX,
  Wallet,
  X,
} from 'lucide-react';
import { FaFacebook, FaInstagram } from 'react-icons/fa';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PresenceBadge } from '@/components/PresenceBadge';
import { ProfileSkeleton } from '@/components/ProfileSkeleton';
import { apiClient, describeApiError } from '@/api/client';
import { useModerationAction, useProfileInteraction } from '@/hooks/useDiscovery';
import { useAuthStore } from '@/store/authStore';
import { profilePathInNewTab } from '@/lib/profileNavigation';

dayjs.extend(relativeTime);

const CDN_HOST = String(import.meta.env.VITE_MEDIA_BASE_URL || 'https://r2.dev').replace(
  /\/+$/,
  '',
);

const TONES = {
  slate: 'bg-muted text-muted-foreground',
  emerald: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  blue: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  amber: 'bg-accent text-accent-foreground',
  rose: 'bg-rose-500/10 text-rose-700 dark:text-rose-400',
  violet: 'bg-violet-500/10 text-violet-700 dark:text-violet-400',
};

function detailValue(value, fallback = 'Not shared') {
  return value === null || value === undefined || value === '' ? fallback : value;
}

function SectionHeading({ eyebrow, title }) {
  return (
    <div className="mb-4">
      {eyebrow ? (
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
      ) : null}
      <h2 className="mt-1 text-2xl font-black tracking-tight text-foreground">{title}</h2>
    </div>
  );
}

function InfoTile({ icon, label, value, tone = 'slate' }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-muted/40 p-4">
      <div className="flex items-start gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${TONES[tone] || TONES.slate}`}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 break-words text-sm font-bold text-foreground">{value}</p>
        </div>
      </div>
    </div>
  );
}

function UserProfile() {
  const navigate = useNavigate();
  const { id, shortid } = useParams();
  const profileId = id ?? shortid;
  const currentUser = useAuthStore(state => state.currentUser);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isOpenedInNewTab, setIsOpenedInNewTab] = useState(() => {
    // Method A: If history length is 1, it's a fresh standalone tab session
    if (window.history.length <= 1) return true;

    // Method B: Check for a fallback query parameter flag as an absolute safeguard
    const params = new URLSearchParams(window.location.search);
    return params.get('newTab') === 'true';
  });
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setIsOpenedInNewTab(window.history.length <= 1 || params.get('newTab') === 'true');
  }, [profileId]);

  const {
    data: profileResponse,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['profile', profileId],
    queryFn: async ({ signal }) => {
      const response = await apiClient.get(`/api/v1/profiles/${profileId}`, { signal });
      return response.data;
    },
    enabled: Boolean(profileId),
    staleTime: 30_000,
  });

  const profile =
    profileResponse?.data?.profile ?? profileResponse?.profile ?? profileResponse ?? null;

  const initials =
    `${profile?.first_name?.[0] ?? ''}${profile?.last_name?.[0] ?? ''}`.toUpperCase() || 'ML';
  const profileDisplayName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Member';

  const images = useMemo(() => {
    const rawImages = [profile?.avatar_url, ...(profile?.images || [])].filter(Boolean);

    const resolved = rawImages
      .map(image => {
        if (String(image).startsWith('http')) return image;
        return `${CDN_HOST}/${profile?.shortid ?? ''}/${image}`;
      })
      .filter(Boolean);

    return [...new Set(resolved)];
  }, [profile?.avatar_url, profile?.images, profile?.shortid]);

  const imageIndex = images.length > 0 ? Math.min(currentImageIndex, images.length - 1) : 0;

  useEffect(() => {
    if (!isLightboxOpen) return undefined;

    const handleKeyDown = event => {
      if (event.key === 'Escape') setIsLightboxOpen(false);
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isLightboxOpen]);

  const interaction = useProfileInteraction();
  const moderation = useModerationAction();

  const isLiked = Boolean(profile?.is_liked);
  const isShortlisted = Boolean(profile?.is_shortlisted);
  const canInteract =
    profile && currentUser?.id !== profile?.id && currentUser?.gender !== profile?.gender;
  const canModerate = profile && currentUser?.id !== profile?.id;

  const isLikePending = interaction.isPending && interaction.variables?.kind === 'like';
  const isShortlistPending = interaction.isPending && interaction.variables?.kind === 'shortlist';

  const act = kind => {
    if (!profile?.id) return;
    if (kind === 'like' && isLiked) return;
    if (kind === 'shortlist' && isShortlisted) return;

    interaction.mutate(
      { kind, targetId: profile.id },
      {
        onSuccess: response => {
          if (response?.data?.is_match) toast.success("It's a match!");
          else if (kind === 'like') toast.success('Interaction saved successfully!');
          else toast.success('Profile shortlisted');
        },
        onError: actError => {
          toast.error(
            actError?.payload?.message ||
              actError?.response?.data?.message ||
              actError?.message ||
              'Unable to save this interaction.',
          );
        },
      },
    );
  };

  const nextImage = () => setCurrentImageIndex((imageIndex + 1) % images.length);
  const prevImage = () => setCurrentImageIndex((imageIndex - 1 + images.length) % images.length);

  const moderate = kind => {
    if (!profile?.id) return;

    moderation.mutate(
      { kind, targetId: profile.id },
      {
        onSuccess: () => {
          toast.success(kind === 'block' ? 'Profile blocked' : 'User muted');
          navigate('/dashboard/search', { replace: true });
        },
        onError: moderationError => {
          toast.error(
            describeApiError(
              moderationError,
              kind === 'block' ? 'Unable to block this profile.' : 'Unable to mute this user.',
            ),
          );
        },
      },
    );
  };

  const reportUser = () => {
    const subject = encodeURIComponent('Report User');
    const body = encodeURIComponent(
      `Reporting user ID: ${profile?.shortid || profile?.id}\n\nPlease provide details about the issue:`,
    );

    window.location.href = `mailto:support@marrylocal.in?subject=${subject}&body=${body}`;
  };

  const openInNewTab = () => {
    window.open(profilePathInNewTab(profile), '_blank', 'noopener,noreferrer');
  };

  if (isLoading) return <ProfileSkeleton />;

  if (error || !profile) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-background px-4">
        <div className="max-w-md rounded-3xl border border-destructive/20 bg-card p-8 text-center shadow-sm">
          <p className="text-lg font-bold text-destructive">Profile could not load</p>
          <p className="mt-2 text-sm text-destructive/90">
            {error?.message || 'This profile may be unavailable or private.'}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Button variant="outline" className="rounded-xl" onClick={() => refetch()}>
              Try again
            </Button>
            <Button
              className="rounded-xl bg-primary px-5 text-primary-foreground font-bold hover:bg-primary/90"
              onClick={() => navigate(-1)}
            >
              <MoveLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const verified = Boolean(profile?.verified);
  const publicSocial = profile?.social || {};
  const lastLoginAt = profile?.last_login_at || profile?.last_seen_at;
  const isOnline = Boolean(profile?.is_online);
  const lastSeenLabel = lastLoginAt
    ? `Last seen ${dayjs(lastLoginAt).fromNow()}`
    : 'Recently joined';
  const location = [profile?.city, profile?.state].filter(Boolean).join(', ') || 'Not shared';
  const distanceKm = Number(profile?.distance_km);
  const hasDistance =
    profile?.distance_km !== null &&
    profile?.distance_km !== undefined &&
    Number.isFinite(distanceKm);
  const bioText = profile?.bio?.trim();

  return (
    <div className="min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-start">
          <div className="contents lg:block lg:space-y-6">
            {images.length > 0 ? (
              <section className="order-1 h-fit rounded-3xl border border-border/60 bg-card p-3 shadow-sm">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setIsLightboxOpen(true)}
                  onKeyDown={event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setIsLightboxOpen(true);
                    }
                  }}
                  aria-label="Open full-screen photo viewer"
                  className="group relative aspect-[4/5] cursor-zoom-in overflow-hidden rounded-2xl bg-muted"
                >
                  <div className="absolute inset-0 flex items-center justify-center bg-background">
                    <span className="flex h-32 w-32 items-center justify-center rounded-full bg-primary/10 text-4xl font-black tracking-tight text-primary ring-1 ring-primary/20">
                      {initials}
                    </span>
                  </div>

                  {images.map((image, index) => (
                    <img
                      key={`${image}-${index}`}
                      src={image}
                      alt={`${profile?.first_name || 'Member'} photo ${index + 1}`}
                      loading={index === 0 ? 'eager' : 'lazy'}
                      className={`absolute inset-0 h-full w-full object-cover transition-all duration-500 ${
                        index === imageIndex ? 'scale-100 opacity-100' : 'scale-105 opacity-0'
                      }`}
                      onError={event => {
                        event.currentTarget.onerror = null;
                        event.currentTarget.style.display = 'none';
                      }}
                    />
                  ))}

                  {images.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={event => {
                          event.stopPropagation();
                          prevImage();
                        }}
                        className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2.5 text-white backdrop-blur-sm transition hover:bg-black/60"
                        aria-label="Previous photo"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={event => {
                          event.stopPropagation();
                          nextImage();
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2.5 text-white backdrop-blur-sm transition hover:bg-black/60"
                        aria-label="Next photo"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>

                      <span className="absolute right-4 top-4 rounded-full bg-black/40 px-3 py-1 text-xs font-bold text-white backdrop-blur-sm">
                        {imageIndex + 1} / {images.length}
                      </span>
                    </>
                  )}
                </div>

                {images.length > 1 && (
                  <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                    {images.map((image, index) => (
                      <button
                        key={`${image}-thumb`}
                        type="button"
                        onClick={() => setCurrentImageIndex(index)}
                        className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition ${
                          index === imageIndex
                            ? 'border-amber-400'
                            : 'border-transparent opacity-70 hover:opacity-100'
                        }`}
                        aria-label={`Show photo ${index + 1}`}
                      >
                        <img
                          src={image}
                          alt=""
                          className="h-full w-full object-cover"
                          onError={event => {
                            event.currentTarget.onerror = null;
                            event.currentTarget.style.display = 'none';
                          }}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </section>
            ) : (
              <section className="order-1 h-fit rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
                <div className="mx-auto flex aspect-square w-full max-w-[200px] items-center justify-center rounded-full bg-primary/10 text-5xl font-black tracking-tight text-primary ring-1 ring-primary/20">
                  {initials}
                </div>
                <p className="mt-4 text-center text-base font-bold text-foreground">
                  {profileDisplayName}
                </p>
                <p className="mt-1 text-center text-xs text-muted-foreground">
                  No photos uploaded yet
                </p>
              </section>
            )}
            <section className="order-3 rounded-3xl border border-border/60 bg-card p-6 text-foreground shadow-sm lg:order-none">
              <SectionHeading
                eyebrow="In their words"
                title={`About ${profile?.first_name || 'this member'}`}
              />
              <p
                className={
                  bioText
                    ? 'whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground'
                    : 'text-sm italic leading-relaxed text-muted-foreground'
                }
              >
                {bioText || 'No bio added yet.'}
              </p>
            </section>
          </div>

          <div className="contents lg:block lg:space-y-6">
            <section className="order-2 overflow-hidden rounded-3xl border border-border/60 bg-card text-foreground shadow-sm lg:order-none">
              <div className="h-24 bg-gradient-to-r from-accent via-muted to-secondary" />

              <div className="px-5 pb-6 sm:px-6">
                <div className="-mt-12 flex flex-col gap-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                    <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-4 border-card bg-muted shadow-lg">
                      <span className="absolute inset-0 flex items-center justify-center rounded-full bg-primary/10 text-3xl font-bold tracking-tight text-primary">
                        {initials}
                      </span>
                      {images[0] ? (
                        <img
                          src={images[0]}
                          alt={profile?.first_name || 'Member'}
                          className="absolute inset-0 h-full w-full object-cover"
                          onError={event => {
                            event.currentTarget.onerror = null;
                            event.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : null}
                      <span
                        className={`absolute bottom-2 right-2 h-4 w-4 rounded-full border-2 border-card ${
                          isOnline ? 'bg-emerald-500' : 'bg-muted-foreground/40'
                        }`}
                      />
                    </div>

                    <div className="min-w-0 pb-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-3xl font-black tracking-tight text-foreground">
                          {profileDisplayName}
                          {profile?.age ? (
                            <span className="font-semibold text-muted-foreground">
                              , {profile.age}
                            </span>
                          ) : null}
                        </h1>

                        {verified ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                            <CheckCircle className="h-3.5 w-3.5" />
                            Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-accent px-3 py-1 text-xs font-bold text-accent-foreground">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Unverified
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-sm font-semibold text-muted-foreground">
                        {profile?.user_handle ? `@${profile.user_handle}` : 'MarryLocal member'}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold">
                        <PresenceBadge profile={profile} />

                        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          {location}
                        </span>

                        {hasDistance ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-muted-foreground">
                            <Navigation className="h-3.5 w-3.5" />
                            {distanceKm.toFixed(1)} km away
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {!isOpenedInNewTab && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary font-medium shadow-sm"
                          onClick={() => navigate(-1)}
                        >
                          <MoveLeft className="w-4 h-4 mr-2" />
                          Back
                        </Button>

                        <button
                          type="button"
                          onClick={openInNewTab}
                          className="p-2 hover:bg-primary/10 rounded-full transition-all duration-200 group border border-transparent hover:border-primary/20"
                          title="Open profile in new tab"
                        >
                          <ExternalLink className="w-5 h-5 text-primary" />
                        </button>
                      </>
                    )}

                    <Button
                      type="button"
                      variant="outline"
                      onClick={reportUser}
                      className="rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10"
                      aria-label="Report profile"
                    >
                      <Flag className="h-4 w-4" />
                    </Button>

                    {canModerate && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className="rounded-xl"
                            aria-label="Moderation actions"
                            disabled={moderation.isPending}
                          >
                            <ShieldAlert className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-60">
                          <DropdownMenuItem
                            onSelect={() => moderate('mute')}
                            disabled={moderation.isPending}
                            className="cursor-pointer"
                          >
                            <VolumeX className="mr-2 h-4 w-4" />
                            Mute User Interactions
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onSelect={() => moderate('block')}
                            disabled={moderation.isPending}
                            className="cursor-pointer text-destructive focus:text-destructive"
                          >
                            <Ban className="mr-2 h-4 w-4" />
                            Block Profile Regionally
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}

                    {canInteract && (
                      <>
                        <Button
                          type="button"
                          disabled={isLiked || interaction.isPending}
                          onClick={() => act('like')}
                          title="Like this profile! If they like you back, you will achieve a 'Mutual Match' and be notified instantly of your connection."
                          className={
                            isLiked
                              ? 'rounded-xl bg-muted text-muted-foreground font-bold cursor-not-allowed'
                              : 'rounded-xl bg-amber-400 text-slate-900 dark:text-slate-900 font-bold shadow-xs hover:bg-amber-300'
                          }
                        >
                          {isLikePending ? (
                            <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-slate-900/30 border-t-slate-900" />
                          ) : (
                            <Heart
                              className="mr-2 h-4 w-4"
                              fill={isLiked ? 'currentColor' : 'none'}
                            />
                          )}
                          {isLiked ? 'Liked' : 'Like'}
                        </Button>

                        <Button
                          type="button"
                          disabled={isShortlisted || interaction.isPending}
                          onClick={() => act('shortlist')}
                          title="Bookmark this profile privately to your dashboard. The other user will not be notified."
                          className={
                            isShortlisted
                              ? 'rounded-xl bg-muted text-muted-foreground font-bold cursor-not-allowed'
                              : 'rounded-xl bg-primary text-primary-foreground font-bold shadow-xs hover:bg-primary/90'
                          }
                        >
                          {isShortlistPending ? (
                            <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground" />
                          ) : (
                            <Bookmark
                              className="mr-2 h-4 w-4"
                              fill={isShortlisted ? 'currentColor' : 'none'}
                            />
                          )}
                          {isShortlisted ? 'Shortlisted' : 'Shortlist'}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <div className="order-4 space-y-6 lg:order-none">
              <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
                <SectionHeading eyebrow="At a glance" title="Personal Metrics" />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <InfoTile
                    icon={<CalendarDays className="h-5 w-5" />}
                    label="Age"
                    value={detailValue(profile?.age, 'Not shared')}
                    tone="amber"
                  />
                  <InfoTile
                    icon={<GraduationCap className="h-5 w-5" />}
                    label="Education"
                    value={detailValue(profile?.education_level)}
                    tone="blue"
                  />
                  <InfoTile
                    icon={<Briefcase className="h-5 w-5" />}
                    label="Work status"
                    value={profile?.job_status ? 'Employed' : 'Not employed'}
                    tone="emerald"
                  />
                  <InfoTile
                    icon={<Wallet className="h-5 w-5" />}
                    label="Economic status"
                    value={detailValue(profile?.economic_status)}
                    tone="violet"
                  />
                  <InfoTile
                    icon={<MapPin className="h-5 w-5" />}
                    label="Location"
                    value={location}
                    tone="rose"
                  />
                  <InfoTile
                    icon={<Languages className="h-5 w-5" />}
                    label="Mother tongue"
                    value={detailValue(profile?.language)}
                    tone="slate"
                  />
                </div>
              </section>

              <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
                <SectionHeading eyebrow="Community" title="Cultural Alignment" />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <InfoTile
                    icon={<Users className="h-5 w-5" />}
                    label="Religion"
                    value={detailValue(profile?.religion)}
                    tone="amber"
                  />
                  <InfoTile
                    icon={<Users className="h-5 w-5" />}
                    label="Community"
                    value={detailValue(profile?.community)}
                    tone="rose"
                  />
                  <InfoTile
                    icon={<Users className="h-5 w-5" />}
                    label="Sub-caste / Clan"
                    value={detailValue(profile?.caste)}
                    tone="slate"
                  />
                  <InfoTile
                    icon={<Languages className="h-5 w-5" />}
                    label="Language"
                    value={detailValue(profile?.language)}
                    tone="blue"
                  />
                </div>
              </section>

              <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
                <SectionHeading eyebrow="Trust and contact" title="Social Verifications" />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <InfoTile
                    icon={<ShieldCheck className="h-5 w-5" />}
                    label="Identity"
                    value={verified ? 'Verified member' : 'Verification pending'}
                    tone={verified ? 'emerald' : 'amber'}
                  />
                  <InfoTile
                    icon={<Clock className="h-5 w-5" />}
                    label="Last active"
                    value={isOnline ? 'Online now' : lastSeenLabel}
                    tone="blue"
                  />

                  {profile?.phone && (
                    <InfoTile
                      icon={<Phone className="h-5 w-5" />}
                      label="Phone"
                      value={profile.phone}
                      tone="emerald"
                    />
                  )}

                  {profile?.email && (
                    <InfoTile
                      icon={<Mail className="h-5 w-5" />}
                      label="Email"
                      value={<span className="break-all">{profile.email}</span>}
                      tone="blue"
                    />
                  )}

                  {publicSocial?.facebook && (
                    <InfoTile
                      icon={<FaFacebook className="h-5 w-5" />}
                      label="Facebook"
                      value={<span className="break-all">{publicSocial.facebook}</span>}
                      tone="blue"
                    />
                  )}

                  {publicSocial?.instagram && (
                    <InfoTile
                      icon={<FaInstagram className="h-5 w-5" />}
                      label="Instagram"
                      value={<span className="break-all">{publicSocial.instagram}</span>}
                      tone="rose"
                    />
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
      {isLightboxOpen && images.length > 0 ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Full-screen profile photo viewer"
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xs flex flex-col items-center justify-center"
        >
          <button
            type="button"
            onClick={() => setIsLightboxOpen(false)}
            className="absolute right-6 top-6 z-10 p-3 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all duration-200 cursor-pointer"
            aria-label="Close photo viewer"
          >
            <X className="h-6 w-6" />
          </button>

          <div className="relative w-full max-w-4xl max-h-[80vh] aspect-square overflow-hidden rounded-2xl">
            <img
              src={images[imageIndex]}
              alt={`${profile?.first_name || 'Member'} photo ${imageIndex + 1}`}
              className="h-full w-full object-contain"
            />

            {images.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white backdrop-blur-sm transition hover:bg-black/70"
                  aria-label="Previous photo"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white backdrop-blur-sm transition hover:bg-black/70"
                  aria-label="Next photo"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
                <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-4 py-1.5 text-xs font-bold text-white backdrop-blur-sm">
                  {imageIndex + 1} / {images.length}
                </span>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default UserProfile;
