import { useRef, useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  CheckCircle2,
  FileCheck2,
  Loader2,
  ShieldCheck,
  UploadCloud,
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
import { apiClient, describeApiError } from '@/api/client';

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const ACCEPTED_LABEL = 'PNG, JPG or WebP';

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

export function Verification() {
  const queryClient = useQueryClient();
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const { data: verification = null } = useQuery({
    queryKey: ['verifications', 'me'],
    queryFn: async () => {
      const token = window.localStorage.getItem('marrylocal.auth.token');
      const response = await window.fetch('/api/v1/verifications/me', {
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
        headers: { 'Content-Type': 'multipart/form-data' },
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
    onSubmit: (values, { setSubmitting }) => {
      setFileError('');

      if (!file) {
        setFileError(`Attach a ${ACCEPTED_LABEL} image of your document.`);
        setSubmitting(false);
        return;
      }

      const formData = new FormData();
      formData.append('document_type', values.document_type);
      formData.append('document_number', values.document_number.trim());
      formData.append('document_image', file);

      submitMutation.mutate(formData, {
        onSettled: () => setSubmitting(false),
      });
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
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-2xl">
        <div className="w-full mx-auto rounded-3xl border border-border/40 bg-card p-10 shadow-sm">
          <div className="flex flex-col items-center text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ShieldCheck className="h-7 w-7" />
            </span>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-foreground">
              Identity verification
            </h1>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
              Submit one government-issued document for manual review. Your raw document image is
              removed from Cloudflare R2 immediately after the review decision.
            </p>
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
              {submitMutation.isPending ? 'Uploading securely...' : 'Submit for verification'}
            </Button>

            <p className="text-center text-xs leading-relaxed text-muted-foreground">
              {documentTypeLabel
                ? `Selected document: ${documentTypeLabel}.`
                : 'Select Aadhaar, Passport, or Driver License to begin.'}{' '}
              The document image is purged from storage after approval or rejection.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Verification;
