import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Mail,
  Phone,
  RefreshCw,
  Edit3,
  Check,
  X,
  CheckCircle,
  AlertTriangle,
  Loader2,
  AtSign,
  Plus,
  ExternalLink,
  Info,
  Lock,
} from 'lucide-react';
import { FaFacebook, FaInstagram } from 'react-icons/fa';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ProfileAvatarUploader } from '@/components/ProfileAvatarUploader';
import { apiClient } from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { languages } from '@/lib/languages';
import { religions } from '@/lib/religions';
import { communities } from '@/lib/communities';

const EDUCATION_LEVELS = ['High School', 'Plus 2 level', 'Bachelors level', 'Masters level'];

const SELECT_CLASS =
  'h-10 w-full rounded-xl border border-border/60 bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground';

const CDN_HOST = String(import.meta.env.VITE_MEDIA_BASE_URL || 'https://r2.dev').replace(
  /\/+$/,
  '',
);

const bioSchema = Yup.object({
  bio: Yup.string().max(500, 'Bio must be 500 characters or fewer.'),
});

const GENERIC_COMMUNITY_OPTIONS = ['Do not wish to mention', 'Not Applicable (N/A)'];

// Non-Hindu religions get their matching communities suggested first. Every
// option stays available so a user is never blocked from picking their own.
const RELIGION_COMMUNITY_KEYWORDS = {
  Muslim: [
    'muslim',
    'islam',
    'sunni',
    'shia',
    'syed',
    'sheikh',
    'shaikh',
    'ansari',
    'siddiqui',
    'pathan',
    'khan',
    'qureshi',
    'memon',
    'bohra',
    'ismaili',
    'sufi',
    'mughal',
  ],
  Christian: [
    'christian',
    'catholic',
    'protestant',
    'anglican',
    'episcopal',
    'baptist',
    'methodist',
    'pentecostal',
    'evangelical',
    'orthodox',
    'syrian',
    'mangalorean',
    'assembly of god',
    'apostolic',
    'adventist',
    'born again',
    'lutheran',
    'presbyterian',
  ],
  Sikh: [
    'sikh',
    'jatt',
    'jat',
    'ramgarhia',
    'khatri',
    'arora',
    'ahluwalia',
    'mazhabi',
    'bhapa',
    'ramdasia',
    'tarkhan',
  ],
  Jain: [
    'jain',
    'digambar',
    'digambara',
    'shwetambar',
    'shvetambara',
    'terapanth',
    'bispanth',
    'oswal',
    'porwal',
    'khandelwal',
  ],
  Buddhist: ['buddhist', 'buddh', 'theravada', 'mahayana', 'vajrayana', 'ambedkar', 'neo-buddhist'],
  Parsi: ['parsi', 'parsee', 'zoroastrian', 'irani'],
  Jewish: ['jewish', 'jew', 'bene israel', 'cochin', 'baghdadi'],
};

function coreDetailsChanged(values, profile) {
  const initial = {
    first_name: String(profile?.first_name ?? profile?.firstname ?? '').trim(),
    last_name: String(profile?.last_name ?? profile?.lastname ?? '').trim(),
    language: String(profile?.language ?? ''),
    community: String(profile?.community ?? ''),
  };

  return (
    String(values.first_name ?? '').trim() !== initial.first_name ||
    String(values.last_name ?? '').trim() !== initial.last_name ||
    String(values.language ?? '') !== initial.language ||
    String(values.community ?? '') !== initial.community
  );
}

const coreProfileSchema = Yup.object({
  first_name: Yup.string().trim().required('First name is required'),
  last_name: Yup.string().trim().required('Last name is required'),
  education_level: Yup.string().nullable(),
  job_status: Yup.boolean(),
  language: Yup.string().nullable(),
  religion: Yup.string().nullable(),
  community: Yup.string().nullable(),
});

function socialUrl(value, network) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;

  if (/^(https?:\/\/|www\.)/i.test(raw)) {
    return raw.startsWith('http') ? raw : `https://${raw}`;
  }

  return `https://${network}.com/${raw.replace(/^@/, '')}`;
}

function isObjEmpty(value) {
  return (
    value == null ||
    value.length <= 0 ||
    (Object.keys(value).length === 0 && value.constructor === Object)
  );
}

function galleryImageUrl(profile) {
  const firstImage = profile?.images?.[0];
  if (!firstImage) return null;

  if (typeof firstImage === 'string') {
    if (firstImage.startsWith('http')) return firstImage;
    return `${CDN_HOST}/${profile?.shortid ?? ''}/${firstImage}`;
  }

  return firstImage.url ?? null;
}

function avatarImageUrl(profile) {
  const candidate = profile?.avatar_url ?? profile?.avatar;
  if (!candidate) return null;

  if (typeof candidate === 'string') return candidate;
  return candidate.url ?? null;
}

function primaryImageUrl(profile) {
  return galleryImageUrl(profile) || avatarImageUrl(profile);
}

function verificationLabels(profile) {
  return [
    { label: 'Aadhaar', value: profile?.aadhar_verified ?? profile?.aadharverified },
    { label: 'Passport', value: profile?.passport_verified ?? profile?.passportverified },
    { label: 'Driver License', value: profile?.license_verified ?? profile?.licenseverified },
  ]
    .filter(item => item.value)
    .map(item => item.label);
}

function Profile() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isOnline = useOnlineStatus();
  const { currentUser, updateProfile } = useAuthStore();
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [pendingCorePayload, setPendingCorePayload] = useState(null);

  const {
    data: profileResponse,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['profile', 'me'],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/profiles/me');
      return response.data;
    },
    staleTime: 30_000,
  });

  const profileData =
    profileResponse?.data?.profile ??
    profileResponse?.profile ??
    profileResponse ??
    currentUser ??
    {};

  const coreDetailsEdited = Boolean(profileData?.core_details_edited);

  const profileMutation = useMutation({
    mutationFn: async updatedFields => apiClient.patch('/api/v1/profiles/me', updatedFields),
    onSuccess: response => {
      const updatedProfile =
        response.data?.data?.profile ?? response.data?.profile ?? response.data;

      updateProfile(updatedProfile);
      queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });
    },
    onError: error => {
      alert(
        error?.response?.data?.message ||
          error?.payload?.message ||
          error?.message ||
          'Something went wrong. Try later',
      );
    },
  });

  const coreProfileMutation = useMutation({
    mutationFn: async payload => apiClient.patch('/api/v1/profiles/me', payload),
    onSuccess: response => {
      const updatedProfile =
        response.data?.data?.profile ?? response.data?.profile ?? response.data;

      if (updatedProfile) updateProfile(updatedProfile);
      queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });
      toast.success('Profile updated successfully!');
    },
    onError: error => {
      toast.error(
        error?.response?.data?.message ||
          error?.payload?.message ||
          error?.message ||
          'Could not update your profile',
      );
    },
  });

  const coreFormik = useFormik({
    initialValues: {
      first_name: profileData?.first_name ?? profileData?.firstname ?? '',
      last_name: profileData?.last_name ?? profileData?.lastname ?? '',
      education_level: profileData?.education_level ?? '',
      job_status: Boolean(profileData?.job_status),
      language: profileData?.language ?? '',
      religion: profileData?.religion ?? '',
      community: profileData?.community ?? '',
    },
    enableReinitialize: true,
    validationSchema: coreProfileSchema,
    onSubmit: (values, helpers) => {
      const payload = {
        first_name: values.first_name.trim(),
        last_name: values.last_name.trim(),
        education_level: values.education_level || null,
        job_status: Boolean(values.job_status),
        language: values.language || null,
        religion: values.religion || null,
        community: values.community || null,
      };

      if (!coreDetailsEdited && coreDetailsChanged(values, profileData)) {
        helpers.setSubmitting(false);
        setPendingCorePayload(payload);
        return;
      }

      coreProfileMutation.mutate(payload, {
        onSettled: () => helpers.setSubmitting(false),
      });
    },
  });

  const communityOptions = useMemo(() => {
    const selectedReligion = coreFormik.values.religion;
    const selectedCommunity = coreFormik.values.community;
    const keywords = RELIGION_COMMUNITY_KEYWORDS[selectedReligion];

    if (!keywords) {
      return { suggested: [], rest: communities };
    }

    const matches = community =>
      GENERIC_COMMUNITY_OPTIONS.includes(community) ||
      keywords.some(keyword => community.toLowerCase().includes(keyword));

    const suggested = communities.filter(matches);
    const suggestedSet = new Set(suggested);
    const rest = communities.filter(community => !suggestedSet.has(community));

    if (
      selectedCommunity &&
      !suggestedSet.has(selectedCommunity) &&
      !rest.includes(selectedCommunity)
    ) {
      suggested.unshift(selectedCommunity);
    }

    return { suggested, rest };
  }, [coreFormik.values.religion, coreFormik.values.community]);

  const handleConfirmCoreSave = event => {
    event.preventDefault();
    const payload = pendingCorePayload;
    if (!payload) return;

    setPendingCorePayload(null);
    coreProfileMutation.mutate(payload);
  };

  const bioFormik = useFormik({
    initialValues: {
      bio: profileData?.bio ?? '',
    },
    enableReinitialize: true,
    validationSchema: bioSchema,
    onSubmit: (values, { resetForm }) => {
      if (!isOnline) {
        alert('You are offline. Check your internet connection.');
        return;
      }

      const nextBio = values.bio.trim();

      profileMutation.mutate(
        { bio: nextBio },
        {
          onSuccess: () => {
            resetForm({ values: { bio: nextBio } });
            setIsEditingBio(false);
          },
        },
      );
    },
  });

  const handleCancelBio = () => {
    bioFormik.resetForm();
    setIsEditingBio(false);
  };

  const handleProfilePictureClick = () => navigate('/dashboard/photos');

  const avatarUrl = avatarImageUrl(profileData);
  const imageUrl = primaryImageUrl(profileData);
  const fallbackImage =
    profileData?.gender === 'Male' ? '/male-default-4.png' : '/female-default-2.png';

  const handleImageError = event => {
    event.currentTarget.onerror = null;
    event.currentTarget.src = fallbackImage;
  };

  const verified = verificationLabels(profileData);
  const isVerified = verified.length > 0;
  const displayName = profileData?.first_name ?? profileData?.firstname ?? 'Your profile';
  const initialsSource = currentUser || profileData;
  const userInitials =
    `${initialsSource?.firstname?.[0] ?? initialsSource?.first_name?.[0] ?? ''}${
      initialsSource?.lastname?.[0] ?? initialsSource?.last_name?.[0] ?? ''
    }`.toUpperCase() || 'ML';
  const displayHandle =
    profileData?.user_handle ?? profileData?.userhandle ?? profileData?.shortid ?? '';
  const shortid = profileData?.shortid ?? '';

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-background px-4">
        <div className="bg-card border border-border rounded-3xl p-8 shadow-xs flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 bg-card border border-border rounded-3xl p-6 shadow-xs sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
              Account shell
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
              Your Profile
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage your bio and trust signals here. Contact and social details are updated from
              Settings.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => refetch()}
            disabled={profileMutation.isPending}
            className="rounded-xl border-border/60 text-muted-foreground"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section className="bg-card border border-border rounded-3xl p-6 shadow-xs">
            <div
              data-testid="primary-photo-card"
              role="button"
              tabIndex={0}
              aria-label="Manage profile photos"
              className="group relative mx-auto aspect-square w-full max-w-[280px] cursor-pointer overflow-hidden rounded-3xl bg-gradient-to-br from-accent via-muted to-secondary ring-2 ring-border transition-opacity duration-300 hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring hover:ring-primary/40"
              onClick={handleProfilePictureClick}
              onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  handleProfilePictureClick();
                }
              }}
            >
              {imageUrl ? (
                <img
                  key={imageUrl}
                  src={imageUrl}
                  alt="Profile picture"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  onError={handleImageError}
                />
              ) : (
                <>
                  <div className="flex h-full w-full items-center justify-center">
                    <span className="text-6xl font-black tracking-tight text-primary/80">
                      {userInitials}
                    </span>
                  </div>
                  <div
                    data-testid="primary-photo-upload-cue"
                    className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/70 opacity-0 backdrop-blur-[1px] transition-opacity duration-300 group-hover:opacity-100"
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xs">
                      <Plus className="h-5 w-5" />
                    </span>
                    <span className="text-xs font-bold text-foreground">Click to upload photo</span>
                  </div>
                </>
              )}
            </div>

            <ProfileAvatarUploader initials={userInitials} avatarUrl={avatarUrl} />

            <p className="mt-4 text-center text-xs font-medium text-muted-foreground">
              Tap the photo to manage your gallery.
            </p>
          </section>

          <section className="relative bg-card border border-border rounded-3xl p-6 shadow-xs lg:col-span-2">
            {profileMutation.isPending && (
              <div className="absolute inset-0 z-20 flex items-center justify-center rounded-3xl bg-background/70 backdrop-blur-[1px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}

            <div className="space-y-2">
              <h2 className="text-2xl font-black tracking-tight text-foreground md:text-3xl lg:text-4xl">
                {displayName}
                {!isObjEmpty(profileData?.age) && (
                  <span className="ml-2 text-lg font-normal text-muted-foreground md:text-xl">
                    ({profileData.age})
                  </span>
                )}
              </h2>

              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground md:text-base">
                <div className="flex items-center gap-1">
                  <span className="font-medium text-muted-foreground">📍</span>
                  <span>{profileData?.city || 'Add your city'}</span>
                </div>

                {displayHandle && (
                  <>
                    <span className="text-muted-foreground/50">•</span>
                    <div className="flex items-center gap-1">
                      <span className="font-medium text-muted-foreground">@</span>
                      <span className="font-medium">{String(displayHandle).toLowerCase()}</span>
                    </div>
                  </>
                )}

                {profileData?.gender && (
                  <>
                    <span className="text-muted-foreground/50">•</span>
                    <div className="flex items-center gap-1">
                      <span className="font-medium text-muted-foreground">
                        {profileData.gender === 'Male' ? '👨' : '👩'}
                      </span>
                      <span>{profileData.gender}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="mt-5">
              {isVerified ? (
                <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 shadow-xs">
                  <div className="rounded-full bg-emerald-500/15 p-2">
                    <CheckCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-emerald-800 dark:text-emerald-300">
                      Verified Profile
                    </div>
                    <div className="text-sm text-emerald-700 dark:text-emerald-400">
                      Verified with {verified.join(', ')}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-2xl border border-accent bg-accent p-4 shadow-xs">
                  <div className="rounded-full bg-background/60 p-2">
                    <AlertTriangle className="h-6 w-6 text-accent-foreground" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-accent-foreground">
                      Profile Not Verified
                    </div>
                    <div className="text-sm text-accent-foreground/80">
                      Complete identity verification to build trust and increase visibility.
                    </div>
                  </div>
                </div>
              )}
            </div>

            <section className="mt-6 rounded-2xl border border-border/60 bg-muted/40 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Account &amp; Contact Info</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    These details are read-only here. Update them from Settings.
                  </p>
                </div>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-border/60 bg-card"
                >
                  <Link to="/settings">
                    Edit in Settings →
                    <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>

              <div className="mt-4 divide-y divide-border/60">
                <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Mail className="h-4 w-4 text-primary" />
                    Email
                  </span>
                  <span className="break-all text-sm font-semibold text-foreground">
                    {profileData?.email || 'Not set'}
                  </span>
                </div>

                <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Phone className="h-4 w-4 text-primary" />
                    Phone number
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    {profileData?.phone_number || 'Not set'}
                  </span>
                </div>

                <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <AtSign className="h-4 w-4 text-primary" />
                    User handle
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    {profileData?.user_handle ? `@${profileData.user_handle}` : 'Not set'}
                  </span>
                </div>

                <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <FaInstagram className="h-4 w-4 text-primary" />
                    Instagram
                  </span>
                  {profileData?.instagram ? (
                    <a
                      href={socialUrl(profileData.instagram, 'instagram')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-all text-sm font-semibold text-primary hover:underline"
                    >
                      {profileData.instagram}
                    </a>
                  ) : (
                    <span className="text-sm font-semibold text-foreground">Not set</span>
                  )}
                </div>

                <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <FaFacebook className="h-4 w-4 text-primary" />
                    Facebook
                  </span>
                  {profileData?.facebook ? (
                    <a
                      href={socialUrl(profileData.facebook, 'facebook')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-all text-sm font-semibold text-primary hover:underline"
                    >
                      {profileData.facebook}
                    </a>
                  ) : (
                    <span className="text-sm font-semibold text-foreground">Not set</span>
                  )}
                </div>
              </div>
            </section>

            <div className="mt-6 border-t border-border pt-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-foreground">About Me</label>
                  {!isEditingBio && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      data-testid="bio-edit"
                      onClick={() => setIsEditingBio(true)}
                      className="h-8 w-8 rounded-xl p-0 text-muted-foreground hover:bg-accent hover:text-primary"
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {isEditingBio ? (
                  <form onSubmit={bioFormik.handleSubmit} className="space-y-3">
                    <Textarea
                      name="bio"
                      data-testid="bio-input"
                      value={bioFormik.values.bio}
                      onChange={bioFormik.handleChange}
                      onBlur={bioFormik.handleBlur}
                      placeholder="Write about yourself here (optional)"
                      rows={5}
                      className="resize-none rounded-2xl border-border/60 focus:border-primary focus:ring-2 focus:ring-ring/30"
                    />
                    {bioFormik.touched.bio && bioFormik.errors.bio && (
                      <p className="text-sm font-medium text-destructive">{bioFormik.errors.bio}</p>
                    )}

                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleCancelBio}
                        disabled={profileMutation.isPending}
                        className="h-9 rounded-xl"
                      >
                        <X className="mr-1 h-4 w-4" />
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        data-testid="bio-save"
                        disabled={profileMutation.isPending}
                        className="h-9 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90"
                      >
                        {profileMutation.isPending ? (
                          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="mr-1 h-4 w-4" />
                        )}
                        Save
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="min-h-[120px] rounded-2xl border border-border bg-muted/40 p-4">
                    <p className="whitespace-pre-wrap leading-relaxed text-muted-foreground">
                      {!isObjEmpty(bioFormik.values.bio)
                        ? bioFormik.values.bio
                        : 'Write about yourself here (optional)'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 hidden flex-wrap gap-4 border-t border-border pt-4 text-sm text-muted-foreground md:flex">
              <span>ID: {shortid || '—'}</span>
              <span>Email: {profileData?.email || '—'}</span>
              <span>Phone: {profileData?.phone_number || '—'}</span>
            </div>
          </section>
        </div>

        <section className="bg-card border border-border rounded-3xl p-6 shadow-xs">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Edit3 className="h-5 w-5 text-primary" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-foreground">Matrimonial details</h2>
              <p className="text-sm text-muted-foreground">
                Update the core details shown to matches. Contact and social handles stay in
                Settings.
              </p>
            </div>
          </div>

          <div
            data-testid="profile-core-notice"
            className={
              coreDetailsEdited
                ? 'mb-5 flex gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-relaxed text-amber-900 dark:text-amber-200'
                : 'mb-5 flex gap-3 rounded-2xl border border-sky-500/30 bg-sky-500/10 p-4 text-sm leading-relaxed text-sky-900 dark:text-sky-200'
            }
          >
            {coreDetailsEdited ? (
              <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            ) : (
              <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            )}
            <p>
              {coreDetailsEdited
                ? '🔒 Your First Name, Last Name, Language, and Community/Caste have already been updated once and are now locked. You can still update your Education, Job Status, and Religion anytime.'
                : 'ℹ️ Note: Education, Job Status, and Religion can be updated anytime. First Name, Last Name, Language, and Community/Caste can only be changed ONCE to correct registration typos.'}
            </p>
          </div>

          <form
            onSubmit={coreFormik.handleSubmit}
            data-testid="profile-core-form"
            className="space-y-5"
            noValidate
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="first_name">First name</Label>
                <Input
                  id="first_name"
                  name="first_name"
                  value={coreFormik.values.first_name}
                  onChange={coreFormik.handleChange}
                  onBlur={coreFormik.handleBlur}
                  disabled={coreDetailsEdited}
                  aria-invalid={Boolean(
                    coreFormik.touched.first_name && coreFormik.errors.first_name,
                  )}
                  className="border-border/60 bg-background disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:opacity-70"
                />
                {coreFormik.touched.first_name && coreFormik.errors.first_name ? (
                  <p className="text-sm font-medium text-destructive">
                    {coreFormik.errors.first_name}
                  </p>
                ) : null}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="last_name">Last name</Label>
                <Input
                  id="last_name"
                  name="last_name"
                  value={coreFormik.values.last_name}
                  onChange={coreFormik.handleChange}
                  onBlur={coreFormik.handleBlur}
                  disabled={coreDetailsEdited}
                  aria-invalid={Boolean(
                    coreFormik.touched.last_name && coreFormik.errors.last_name,
                  )}
                  className="border-border/60 bg-background disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:opacity-70"
                />
                {coreFormik.touched.last_name && coreFormik.errors.last_name ? (
                  <p className="text-sm font-medium text-destructive">
                    {coreFormik.errors.last_name}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="education_level">Education level</Label>
                <select
                  id="education_level"
                  name="education_level"
                  value={coreFormik.values.education_level}
                  onChange={coreFormik.handleChange}
                  onBlur={coreFormik.handleBlur}
                  className={SELECT_CLASS}
                >
                  <option value="">Select education</option>
                  {EDUCATION_LEVELS.map(level => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="language">Language</Label>
                <select
                  id="language"
                  name="language"
                  value={coreFormik.values.language}
                  onChange={coreFormik.handleChange}
                  onBlur={coreFormik.handleBlur}
                  disabled={coreDetailsEdited}
                  className={SELECT_CLASS}
                >
                  <option value="">Select language</option>
                  {languages.map(language => (
                    <option key={language} value={language}>
                      {language}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="religion">Religion</Label>
                <select
                  id="religion"
                  name="religion"
                  value={coreFormik.values.religion}
                  onChange={coreFormik.handleChange}
                  onBlur={coreFormik.handleBlur}
                  className={SELECT_CLASS}
                >
                  <option value="">Select religion</option>
                  {religions.map(religion => (
                    <option key={religion} value={religion}>
                      {religion}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="community">Community / Caste</Label>
                <Select
                  value={coreFormik.values.community || undefined}
                  onValueChange={value => coreFormik.setFieldValue('community', value)}
                  disabled={coreDetailsEdited}
                >
                  <SelectTrigger
                    id="community"
                    data-testid="profile-community"
                    className="h-10 w-full rounded-xl border-border/60 bg-background text-sm text-foreground focus:border-primary disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:opacity-70"
                  >
                    <SelectValue placeholder="Select community / caste" />
                  </SelectTrigger>
                  <SelectContent className="max-h-80 border-border bg-popover text-popover-foreground">
                    {communityOptions.suggested.length > 0 ? (
                      <>
                        <SelectGroup>
                          <SelectLabel className="px-2 py-1.5 text-xs font-bold tracking-wide text-muted-foreground uppercase">
                            Suggested for {coreFormik.values.religion}
                          </SelectLabel>
                          {communityOptions.suggested.map(community => (
                            <SelectItem
                              key={`suggested-${community}`}
                              value={community}
                              className="text-foreground focus:bg-accent focus:text-accent-foreground"
                            >
                              {community}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                        {communityOptions.rest.length > 0 ? (
                          <>
                            <SelectSeparator />
                            <SelectGroup>
                              <SelectLabel className="px-2 py-1.5 text-xs font-bold tracking-wide text-muted-foreground uppercase">
                                All communities / castes
                              </SelectLabel>
                              {communityOptions.rest.map(community => (
                                <SelectItem
                                  key={community}
                                  value={community}
                                  className="text-foreground focus:bg-accent focus:text-accent-foreground"
                                >
                                  {community}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </>
                        ) : null}
                      </>
                    ) : (
                      <SelectGroup>
                        {communityOptions.rest.map(community => (
                          <SelectItem
                            key={community}
                            value={community}
                            className="text-foreground focus:bg-accent focus:text-accent-foreground"
                          >
                            {community}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )}
                  </SelectContent>
                </Select>
                {coreDetailsEdited ? (
                  <p className="text-xs font-medium text-muted-foreground">
                    Locked after your one-time correction.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-foreground">Job status</p>
                <p className="text-sm text-muted-foreground">
                  {coreFormik.values.job_status
                    ? 'Currently employed — shown on your profile.'
                    : 'Not currently employed — update this anytime.'}
                </p>
              </div>
              <Switch
                id="job_status"
                data-testid="profile-job-status"
                checked={Boolean(coreFormik.values.job_status)}
                onCheckedChange={checked =>
                  coreFormik.setFieldValue('job_status', checked === true)
                }
              />
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                data-testid="profile-core-save"
                disabled={coreProfileMutation.isPending}
                className="rounded-xl bg-primary px-6 font-bold text-primary-foreground hover:bg-primary/90"
              >
                {coreProfileMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Save profile
                  </>
                )}
              </Button>
            </div>
          </form>
        </section>

        <AlertDialog
          open={pendingCorePayload !== null}
          onOpenChange={open => {
            if (!open) setPendingCorePayload(null);
          }}
        >
          <AlertDialogContent
            data-testid="profile-core-confirm-dialog"
            className="border-border bg-card text-foreground"
          >
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm One-Time Profile Changes</AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                You are updating your Name, Language, or Community/Caste. Please note that these
                details can only be changed ONCE after registration (only Education, Job Status, and
                Religion can be changed multiple times). Are you sure you want to proceed?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                data-testid="profile-core-confirm-save"
                onClick={handleConfirmCoreSave}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Confirm &amp; Save
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

export default Profile;
