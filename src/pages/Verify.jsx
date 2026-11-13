import { useRef, useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  CheckCircle2,
  FileCheck2,
  FileText,
  Loader2,
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

function PeerVouchProgress({ profile }) {
  const count = Number(profile?.peer_vouches_received ?? 0);
  const credits = Number(profile?.vouch_credits_remaining ?? 0);
  const verified = Boolean(profile?.peer_verified);
  const filled = Math.min(count, PEER_VOUCH_TARGET);

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
            Three local members must confirm they know you before peer verification activates.
          </p>
        </div>

        <div className="flex flex-col items-start gap-2 sm:items-end">
          {verified ? (
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
              In progress
            </span>
          )}

          {verified ? (
            <p data-testid="vouch-credits" className="text-sm font-semibold text-muted-foreground">
              {credits} / 5 Credits Left to Verify Others
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2">
        {[1, 2, 3].map(step => (
          <ProgressSegment key={step} filled={filled >= step} />
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <VerificationBadges user={profile} />
        {!verified ? (
          <span className="text-xs font-semibold text-muted-foreground">
            Your ID verification is separate and remains available below.
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
            Contact one of the nearest verified members in your city below to meet in person (highly
            recommended) or verify over an external video call via WhatsApp or Zoom (MarryLocal does
            not include built-in video chat). Show them your rotating QR code once connected!
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

function PeerVerificationPanel({ mode }) {
  const queryClient = useQueryClient();
  const profileQuery = useProfileQuery(mode === 'peer');
  const profile = profileQuery.data || {};
  const [activePanel, setActivePanel] = useState('qr');
  const peerVerified = Boolean(profile.peer_verified);
  const credits = Number(profile.vouch_credits_remaining ?? 0);
  const canScan = peerVerified && credits > 0;
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
      <PeerVouchProgress profile={profile} />

      <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-black tracking-tight text-foreground">
              Get verified by your community
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Show a rotating code to a verified member. Once three members confirm you, you can
              start vouching for others.
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
              activePanel === 'qr'
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
                : 'You need peer verification and at least one vouch credit to scan others.'
            }
            className={cn(
              'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
              activePanel === 'scan' && canScan
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <ScanLine className="h-4 w-4" />
            Scan Peer Code
          </button>
        </div>

        <div className="mt-6 rounded-2xl border border-border/60 bg-muted/10 p-4 sm:p-6">
          {activePanel === 'qr' ? (
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
        🤝 How to get verified: Contact one of the nearest verified members in your city below to
        meet in person (highly recommended) or verify over an external video call via WhatsApp or
        Zoom (MarryLocal does not include built-in video chat). Show them your rotating QR code once
        connected!
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
            The fastest path is peer-to-peer verification with three local members. A
            government-document review remains available as a fallback.
          </p>
        </div>

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

        {mode === 'peer' ? <PeerVerificationPanel mode={mode} /> : <DocumentVerificationPanel />}
      </div>
    </div>
  );
}

export default Verification;
