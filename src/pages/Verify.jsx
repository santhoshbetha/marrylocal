import { useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  FileCheck2,
  FileText,
  Loader2,
  Mail,
  Phone,
  QrCode,
  ScanLine,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiClient, API_BASE_URL, describeApiError } from '@/api/client';
import { useProfileQuery } from '@/hooks/useProfile';
import { usePeerVerificationChannel } from '@/hooks/usePeerVerificationChannel';
import { compressImage } from '@/lib/imageCompression';
import { cn } from '@/lib/utils';
import { RequestVouchToken } from '@/components/RequestVouchToken';
import { VerifyPeerScanner } from '@/components/VerifyPeerScanner';
import { VerificationBadges } from '@/components/VerificationBadges';

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const ACCEPTED_LABEL = 'PNG, JPG or WebP';
const PEER_VOUCH_TARGET = 3;
const PEER_VERIFIER_CREDITS = 5;

const DOCUMENT_TYPES = [
  { value: 'passport', label: 'Indian Passport' },
  { value: 'license', label: 'Driver License' },
];

const validationSchema = Yup.object({
  document_type: Yup.string()
    .oneOf(
      DOCUMENT_TYPES.map(type => type.value),
      'Select a supported document type.',
    )
    .required('Select a document type.'),
  document_number: Yup.string()
    .trim()
    .required('Enter the document ID number.')
    .min(6, 'Enter at least 6 characters.')
    .max(30, 'Document number is too long.'),
});

function formatFileSize(bytes) {
  if (!bytes) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ProgressSegment({ filled }) {
  return (
    <div
      className={cn(
        'h-2 flex-1 rounded-full transition-all duration-300',
        filled ? 'bg-emerald-500' : 'bg-muted',
      )}
    />
  );
}

function MilestoneCard({ testId, title, description, unlocked, filled, total, footer }) {
  return (
    <div
      data-testid={testId}
      className={cn(
        'rounded-2xl border p-4 transition-colors',
        unlocked ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-border/60 bg-muted/20',
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-black text-foreground">{title}</p>
        {unlocked ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-black text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Unlocked
          </span>
        ) : (
          <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold text-muted-foreground">
            Locked
          </span>
        )}
      </div>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>

      <div className="mt-3 flex items-center gap-1.5">
        {Array.from({ length: total }, (_, index) => (
          <ProgressSegment key={index} filled={filled > index} />
        ))}
      </div>

      {footer ? <p className="mt-2 text-xs font-semibold text-muted-foreground">{footer}</p> : null}
    </div>
  );
}

function PeerVouchProgress({ profile }) {
  const count = Number(profile?.peer_vouches_received ?? 0);
  const credits = Number(profile?.vouch_credits_remaining ?? 0);
  const peerVerified = Boolean(profile?.peer_verified);
  const isVerifier = Boolean(profile?.is_peer_verifier);

  return (
    <div
      data-testid="peer-vouch-progress"
      className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            P2P verification
          </span>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-foreground">
            <span data-testid="peer-vouch-count">
              {count} / {PEER_VOUCH_TARGET}
            </span>{' '}
            Peer Vouches
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            One vouch unlocks full app access. Three vouches turn you into a Peer Verifier so you
            can verify up to five other members in your city.
          </p>
        </div>

        <div className="flex flex-col items-start gap-2 sm:items-end">
          {peerVerified ? (
            <span
              data-testid="peer-verified-status"
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-xs font-black text-emerald-700 dark:text-emerald-400"
            >
              <ShieldCheck className="h-4 w-4" />
              Peer Verified
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-3 py-1.5 text-xs font-bold text-muted-foreground">
              <Users className="h-4 w-4" />
              Not yet verified
            </span>
          )}

          {isVerifier ? (
            <p data-testid="vouch-credits" className="text-sm font-semibold text-muted-foreground">
              {credits} / 5 Credits Left to Verify Others
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <MilestoneCard
          testId="milestone-access"
          title="1 vouch · Full app access"
          description="A single local verifier confirms you in person or over a live video call, and discovery, search, and messaging unlock immediately."
          unlocked={peerVerified}
          filled={Math.min(count, 1)}
          total={1}
          footer={
            peerVerified
              ? 'Your Peer Verified badge is active.'
              : 'Show your QR code to any local verifier.'
          }
        />
        <MilestoneCard
          testId="milestone-verifier"
          title="3 vouches · Verify up to 5 others"
          description="Once three verifiers confirm you, you can vouch for up to five other members in your city."
          unlocked={isVerifier}
          filled={Math.min(count, PEER_VOUCH_TARGET)}
          total={PEER_VOUCH_TARGET}
          footer={
            isVerifier
              ? `${credits} of 5 credits remaining.`
              : `${Math.max(0, PEER_VOUCH_TARGET - count)} more vouch(es) to unlock the scanner.`
          }
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <VerificationBadges user={profile} />
        {!peerVerified ? (
          <span className="text-xs font-semibold text-muted-foreground">
            Government-ID verification remains available as a fallback below.
          </span>
        ) : null}
      </div>
    </div>
  );
}

function NearestVerifiers({ query }) {
  const verifiers = Array.isArray(query.data) ? query.data : [];

  return (
    <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Users className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-lg font-black tracking-tight text-foreground">
            Nearest peer verifiers in {verifiers[0]?.city || 'your city'}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Contact one of the nearest verifiers below to meet in person (recommended) or verify
            live over WhatsApp or Zoom (MarryLocal does not include built-in video chat). You do not
            need to know them beforehand — they will check your government ID and scan your rotating
            QR code once connected.
          </p>
        </div>
      </div>

      <div data-testid="nearest-verifiers" className="mt-5 grid gap-3 sm:grid-cols-2">
        {query.isLoading ? (
          <p className="text-sm font-semibold text-muted-foreground">Finding nearby verifiers…</p>
        ) : query.isError ? (
          <p className="text-sm font-semibold text-destructive">
            Could not load nearest verifiers. Please try again.
          </p>
        ) : verifiers.length === 0 ? (
          <p className="text-sm font-semibold text-muted-foreground">
            No peer verifiers with credits are available in your city yet.
          </p>
        ) : (
          verifiers.slice(0, 5).map(verifier => (
            <article
              key={verifier.id}
              data-testid={`nearest-verifier-${verifier.id}`}
              className="rounded-2xl border border-border/60 bg-muted/20 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-foreground">
                    {[verifier.first_name, verifier.last_name].filter(Boolean).join(' ') ||
                      'Verified member'}
                  </p>
                  <p className="mt-0.5 truncate text-xs font-semibold text-muted-foreground">
                    {verifier.handle || verifier.user_handle || 'MarryLocal member'}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-black text-emerald-700 dark:text-emerald-400">
                  {verifier.vouch_credits_remaining} credits
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-muted-foreground">
                <span>{verifier.city}</span>
                {typeof verifier.distance_km === 'number' ? (
                  <span>~{verifier.distance_km.toFixed(1)} km away</span>
                ) : null}
              </div>

              {verifier.phone_number ? (
                <a
                  href={`tel:${verifier.phone_number}`}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
                >
                  <Phone className="h-3.5 w-3.5" />
                  {verifier.phone_number}
                </a>
              ) : null}
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function formatVerificationDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function SeedVerifierBanner({ profile, onUpdated }) {
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const refreshProfile = async () => {
    await queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });
    onUpdated?.();
  };

  const optInMutation = useMutation({
    mutationFn: async () => apiClient.post('/api/v1/vouch/seed-opt-in'),
    onSuccess: async () => {
      toast.success(
        'You joined the seed verifier list. Email your government ID to verify@marrylocal.in.',
      );
      await refreshProfile();
    },
    onError: error => {
      toast.error(describeApiError(error, 'Could not opt in as a seed verifier.'));
    },
  });

  const optOutMutation = useMutation({
    mutationFn: async () => apiClient.post('/api/v1/vouch/seed-opt-out'),
    onSuccess: async () => {
      setConfirmOpen(false);
      toast.success('You will not be invited as a seed verifier.');
      await refreshProfile();
    },
    onError: error => {
      setConfirmOpen(false);
      toast.error(describeApiError(error, 'Could not opt out right now.'));
    },
  });

  return (
    <>
      <section
        data-testid="seed-verifier-banner"
        className="rounded-3xl border border-primary/30 bg-primary/5 p-6 shadow-sm"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Mail className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
              Seed verifier invitation
            </p>
            <h2 className="mt-1 text-xl font-black tracking-tight text-foreground">
              Become one of the first 10 seed verifiers in {profile?.city || 'your city'}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Seed verifiers are the trusted members who start the peer-vouching chain. You do not
              need to know anyone in advance: meet a local member in person (or verify live over
              WhatsApp/Zoom), check their government ID, and scan their rotating QR code. When a
              city crosses 50 opposite-gender members, verification becomes required, so seed
              verifiers keep the community moving.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              To join, email a photo of your government ID to{' '}
              <a className="font-bold text-primary underline" href="mailto:verify@marrylocal.in">
                verify@marrylocal.in
              </a>
              . Our team reviews it and activates your verifier credits.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                data-testid="seed-opt-in"
                onClick={() => optInMutation.mutate()}
                disabled={optInMutation.isPending || optOutMutation.isPending}
                className="rounded-xl font-bold"
              >
                {optInMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="mr-2 h-4 w-4" />
                )}
                Opt In as Seed Verifier
              </Button>
              <Button
                type="button"
                data-testid="seed-opt-out"
                variant="outline"
                onClick={() => setConfirmOpen(true)}
                disabled={optInMutation.isPending || optOutMutation.isPending}
                className="rounded-xl font-bold"
              >
                No Thanks, Opt Out
              </Button>
            </div>
          </div>
        </div>
      </section>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Opt out of seed verification?</AlertDialogTitle>
            <AlertDialogDescription>
              You will stop seeing this invitation and another member in your city will be invited
              instead. You can still get verified later with a normal peer vouch or a government ID.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep invitation</AlertDialogCancel>
            <AlertDialogAction
              data-testid="seed-opt-out-confirm"
              disabled={optOutMutation.isPending}
              onClick={event => {
                event.preventDefault();
                optOutMutation.mutate();
              }}
            >
              {optOutMutation.isPending ? 'Opting out…' : 'Yes, opt me out'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function VerificationActiveCard({ profile }) {
  const verifiedOn = formatVerificationDate(profile?.verified_at);
  const renewal = formatVerificationDate(profile?.verification_expires_at);

  return (
    <section
      data-testid="verification-active-card"
      className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center shadow-sm"
    >
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
        <ShieldCheck className="h-7 w-7" />
      </span>
      <h2 className="mt-4 text-2xl font-black tracking-tight text-foreground">
        Verification Active
      </h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
        Your identity is verified. Discovery, search, and messaging stay available, and you do not
        need to verify again until your renewal date.
      </p>

      <div className="mt-5 flex flex-col items-center justify-center gap-2 text-sm font-semibold text-muted-foreground sm:flex-row sm:gap-6">
        {verifiedOn ? (
          <span className="inline-flex items-center gap-2">
            <CalendarClock className="h-4 w-4" />
            Verified on {verifiedOn}
          </span>
        ) : null}
        {renewal ? <span>Renews on {renewal}</span> : null}
      </div>
    </section>
  );
}

function PeerVerificationPanel({ mode }) {
  const queryClient = useQueryClient();
  const profileQuery = useProfileQuery(mode === 'peer');
  const profile = profileQuery.data || {};
  const [searchParams] = useSearchParams();
  const [activePanel, setActivePanel] = useState(
    searchParams.get('tab') === 'scanner' ? 'scan' : 'qr',
  );
  const isPeerVerifier = Boolean(profile.is_peer_verifier);
  const credits = Number(profile.vouch_credits_remaining ?? 0);
  const canScan = isPeerVerifier && credits > 0;
  const shownPanel = canScan ? activePanel : 'qr';
  const seedInvited = profile.seed_verifier_status === 'invited';
  const refetchProfile = profileQuery.refetch;

  const nearestQuery = useQuery({
    queryKey: ['vouch', 'nearest-verifiers'],
    queryFn: async () => {
      const { data } = await apiClient.get('/api/v1/vouch/nearest-verifiers');
      return data?.data?.verifiers ?? [];
    },
    enabled: mode === 'peer',
    staleTime: 30_000,
  });

  // Live updates replace the old 10-second profile poll. A vouch recorded on a
  // verifier's device (or an admin grant) is pushed over the authenticated
  // Phoenix channel.
  usePeerVerificationChannel({ enabled: mode === 'peer' });

  const handleVouchSuccess = async () => {
    await refetchProfile();
    await queryClient.invalidateQueries({ queryKey: ['vouch', 'nearest-verifiers'] });
  };

  return (
    <div className="space-y-5">
      {seedInvited ? <SeedVerifierBanner profile={profile} onUpdated={refetchProfile} /> : null}

      <PeerVouchProgress profile={profile} />

      <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-black tracking-tight text-foreground">
              Get verified by a local member
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              You do not need to know the verifier beforehand. Meet a local verified member in
              person, or do a live video call over WhatsApp or Zoom, show your government ID, and
              let them scan your rotating code. One vouch unlocks full access; three make you a Peer
              Verifier for up to five others.
            </p>
          </div>
          <VerificationBadges user={profile} />
        </div>

        <div className="mt-5 grid gap-2 rounded-2xl border border-border/60 bg-muted/20 p-1 sm:grid-cols-2">
          <button
            type="button"
            data-testid="vouch-subtab-qr"
            onClick={() => setActivePanel('qr')}
            className={cn(
              'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-colors',
              shownPanel === 'qr'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <QrCode className="h-4 w-4" />
            Get Vouch QR
          </button>
          <button
            type="button"
            data-testid="vouch-subtab-scan"
            onClick={() => setActivePanel('scan')}
            disabled={!canScan}
            title={
              canScan
                ? 'Scan another member’s rotating QR code.'
                : 'Three vouches unlock the scanner plus at least one remaining credit.'
            }
            className={cn(
              'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
              shownPanel === 'scan'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <ScanLine className="h-4 w-4" />
            Scan Peer Code
          </button>
        </div>

        <div className="mt-6 rounded-2xl border border-border/60 bg-muted/10 p-4 sm:p-6">
          {shownPanel === 'qr' ? (
            <RequestVouchToken />
          ) : (
            <VerifyPeerScanner enabled={canScan} onVouchSuccess={handleVouchSuccess} />
          )}
        </div>
      </section>

      <div
        data-testid="peer-vouch-guidance"
        className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm font-semibold leading-relaxed text-amber-900 dark:text-amber-200"
      >
        🤝 How to get verified: pick one of the nearest verifiers in your city below. Contact them
        to meet in person (recommended) or verify live over WhatsApp or Zoom — MarryLocal does not
        include built-in video chat. They will ask to see your government ID, then scan your
        rotating QR code. One vouch unlocks the app; three vouches let you verify up to five others.
      </div>

      <NearestVerifiers query={nearestQuery} />
    </div>
  );
}

function DocumentVerificationPanel() {
  const queryClient = useQueryClient();
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const { data: verification = null } = useQuery({
    queryKey: ['verifications', 'me'],
    queryFn: async () => {
      const token = window.localStorage.getItem('marrylocal.auth.token');
      const response = await window.fetch(`${API_BASE_URL}/api/v1/verifications/me`, {
        headers: token ? { authorization: `Bearer ${token}` } : {},
        cache: 'no-store',
      });

      if (!response.ok) return null;
      const payload = await response.json();
      return payload?.data?.verification ?? null;
    },
    staleTime: 15_000,
  });

  const verified = verification?.status === 'verified';
  const pending = verification?.status === 'pending_admin_review';

  const submitMutation = useMutation({
    mutationFn: async formData =>
      apiClient.post('/api/v1/verifications/submit', formData, {
        timeout: 90_000,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['verifications', 'me'] });
      setFile(null);
      setFileError('');
      formik.resetForm();
      if (inputRef.current) inputRef.current.value = '';
    },
    onError: error => {
      toast.error(describeApiError(error, 'Could not upload your verification document.'));
    },
  });

  const formik = useFormik({
    initialValues: {
      document_type: '',
      document_number: '',
    },
    validationSchema,
    onSubmit: async (values, { setSubmitting }) => {
      setFileError('');

      if (!file) {
        setFileError(`Attach a ${ACCEPTED_LABEL} image of your document.`);
        setSubmitting(false);
        return;
      }

      try {
        const prepared = await compressImage(file, {
          maxDimension: 2000,
          quality: 0.88,
          maxBytes: 7 * 1024 * 1024,
        });

        const formData = new FormData();
        formData.append('document_type', values.document_type);
        formData.append('document_number', values.document_number.trim());
        formData.append('document_image', prepared, prepared.name);

        submitMutation.mutate(formData, {
          onSettled: () => setSubmitting(false),
        });
      } catch (error) {
        setFileError(error?.message || 'The document image could not be prepared.');
        setSubmitting(false);
      }
    },
  });

  const documentTypeLabel = DOCUMENT_TYPES.find(
    type => type.value === formik.values.document_type,
  )?.label;

  const validateAndSetFile = nextFile => {
    if (!nextFile) return;

    if (!ACCEPTED_TYPES.includes(nextFile.type)) {
      setFileError(`Only ${ACCEPTED_LABEL} documents are supported.`);
      return;
    }

    if (nextFile.size > MAX_FILE_SIZE) {
      setFileError('Document images must be 8 MB or smaller.');
      return;
    }

    setFileError('');
    setFile(nextFile);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleDrop = event => {
    event.preventDefault();
    setIsDragging(false);
    validateAndSetFile(event.dataTransfer.files?.[0]);
  };

  return (
    <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm sm:p-10">
      <div className="flex items-start gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <FileText className="h-6 w-6" />
        </span>
        <div>
          <h2 className="text-2xl font-black tracking-tight text-foreground">
            Government document review
          </h2>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Prefer an admin-reviewed ID? Upload a passport or driving licence. Your raw document
            image is removed from Cloudflare R2 immediately after the review decision.
          </p>
        </div>
      </div>

      {submitMutation.isSuccess ? (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4 text-sm text-blue-800 dark:text-blue-300">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="font-semibold leading-relaxed">
            Verification document uploaded successfully. Your profile is currently under review.
          </p>
        </div>
      ) : null}

      {verified ? (
        <div
          data-testid="kyc-status-banner"
          className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-400"
        >
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="font-semibold leading-relaxed">
            Your identity is verified. Your trust badge is active.
          </p>
        </div>
      ) : pending ? (
        <div
          data-testid="kyc-status-banner"
          className="mt-6 flex items-start gap-3 rounded-2xl border border-accent bg-accent p-4 text-sm text-accent-foreground"
        >
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="font-semibold leading-relaxed">
            Your document is under review. You will be notified within 24 hours.
          </p>
        </div>
      ) : null}

      <form onSubmit={formik.handleSubmit} className="mt-8 space-y-6">
        <div className="grid gap-2">
          <Label htmlFor="document_type">Document type</Label>
          <Select
            value={formik.values.document_type}
            onValueChange={value => formik.setFieldValue('document_type', value)}
          >
            <SelectTrigger
              id="document_type"
              className="h-11 w-full rounded-xl border-border/60 bg-background text-sm font-semibold text-foreground"
            >
              <SelectValue placeholder="Select document type" />
            </SelectTrigger>
            <SelectContent>
              {DOCUMENT_TYPES.map(type => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {formik.touched.document_type && formik.errors.document_type ? (
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-destructive">
              <AlertCircle className="h-3.5 w-3.5" />
              {formik.errors.document_type}
            </p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="document_number">Document ID number</Label>
          <Input
            id="document_number"
            name="document_number"
            autoComplete="off"
            value={formik.values.document_number}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            placeholder={
              formik.values.document_type === 'aadhaar' ? '1234 5678 9012' : 'Document number'
            }
            className="h-11 rounded-xl border-border/60 bg-background font-mono text-sm focus:border-primary"
          />
          {formik.touched.document_number && formik.errors.document_number ? (
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-destructive">
              <AlertCircle className="h-3.5 w-3.5" />
              {formik.errors.document_number}
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            The number is stored securely and only visible to the review team.
          </p>
        </div>

        <div className="grid gap-2">
          <Label>Document image</Label>
          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={event => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                inputRef.current?.click();
              }
            }}
            onDragOver={event => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={event => {
              event.preventDefault();
              setIsDragging(false);
            }}
            onDrop={handleDrop}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
              isDragging
                ? 'border-primary/60 bg-primary/5'
                : 'border-muted-foreground/20 bg-muted/10 hover:border-primary/40'
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED_TYPES.join(',')}
              className="hidden"
              data-testid="verification-file-input"
              onChange={event => validateAndSetFile(event.target.files?.[0])}
            />

            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <UploadCloud className="h-6 w-6" />
            </span>

            {file ? (
              <div className="mt-4 flex max-w-full items-center gap-2 rounded-xl border border-border/60 bg-background px-3 py-2 text-left">
                <FileCheck2 className="h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-foreground">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={event => {
                    event.stopPropagation();
                    setFile(null);
                  }}
                  className="ml-1 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Remove selected document"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <p className="mt-4 text-sm font-bold text-foreground">
                  Drag and drop your document image
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  or click to browse · {ACCEPTED_LABEL} · max 8 MB
                </p>
              </>
            )}
          </div>

          {fileError ? (
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-destructive">
              <AlertCircle className="h-3.5 w-3.5" />
              {fileError}
            </p>
          ) : null}
        </div>

        <Button
          type="submit"
          disabled={submitMutation.isPending || formik.isSubmitting}
          className="h-11 w-full rounded-xl bg-primary font-bold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitMutation.isPending || formik.isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ShieldCheck className="mr-2 h-4 w-4" />
          )}
          {submitMutation.isPending ? 'Uploading securely…' : 'Submit for verification'}
        </Button>

        <p className="text-center text-xs leading-relaxed text-muted-foreground">
          {documentTypeLabel
            ? `Selected document: ${documentTypeLabel}.`
            : 'Select Passport or Driver License to begin.'}{' '}
          The document image is purged from storage after approval or rejection.
        </p>
      </form>
    </div>
  );
}

export function Verification() {
  const [mode, setMode] = useState('peer');
  const profileQuery = useProfileQuery();
  const profile = profileQuery.data || {};
  const idVerified = Boolean(
    profile.id_verified ??
      profile.aadhaar_verified ??
      profile.aadhar_verified ??
      profile.passport_verified ??
      profile.license_verified,
  );
  const verified = Boolean(profile.peer_verified) || idVerified;
  const activeVerifier =
    Boolean(profile.is_peer_verifier) && Number(profile.vouch_credits_remaining ?? 0) > 0;
  const needsMoreVouches =
    Boolean(profile.peer_verified) &&
    !profile.is_peer_verifier &&
    Number(profile.peer_vouches_received ?? 0) < 3;
  const locked = verified && !activeVerifier && !needsMoreVouches;

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="flex flex-col items-center text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ShieldCheck className="h-7 w-7" />
          </span>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-foreground">
            Identity verification
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {locked
              ? 'Your verification is active. Nothing else is required right now.'
              : 'One local vouch unlocks full access. Three vouches make you a Peer Verifier. A government-document review remains available as a fallback.'}
          </p>
        </div>

        {locked ? (
          <VerificationActiveCard profile={profile} />
        ) : (
          <>
            <div className="grid gap-2 rounded-2xl border border-border/60 bg-muted/20 p-1 sm:grid-cols-2">
              <button
                type="button"
                data-testid="verify-mode-peer"
                onClick={() => setMode('peer')}
                className={cn(
                  'rounded-xl px-4 py-3 text-sm font-black transition-colors',
                  mode === 'peer'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                Peer-to-Peer Verification (Recommended)
              </button>
              <button
                type="button"
                data-testid="verify-mode-document"
                onClick={() => setMode('document')}
                className={cn(
                  'rounded-xl px-4 py-3 text-sm font-black transition-colors',
                  mode === 'document'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                Government Document Upload
              </button>
            </div>

            {mode === 'peer' ? (
              <PeerVerificationPanel mode={mode} />
            ) : (
              <DocumentVerificationPanel />
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default Verification;
