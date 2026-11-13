import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, ImagePlus, Loader2, Plus, ShieldCheck, Sparkles, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, describeApiError } from '@/api/client';
import { buildAvatarFormData } from '@/lib/imageUpload';
import { mediaUrl } from '@/lib/media';
import { useAuthStore } from '@/store/authStore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ImageUploader } from '@/components/ImageUploader';
import { cn } from '@/lib/utils';

const MAX_PHOTOS = 10;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/png', 'image/jpeg'];
const ACCEPTED_LABEL = 'PNG or JPG';

function resolveSlotImage(profile, rawImage) {
  if (!rawImage) return null;

  if (typeof rawImage === 'string') {
    return mediaUrl(profile?.shortid, rawImage) || null;
  }

  return rawImage.url ?? null;
}

function withCacheBuster(url, cacheBuster) {
  if (!url) return null;
  if (!cacheBuster) return url;

  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}${cacheBuster.slice(1)}`;
}

function firstEmptySlotIndex(profile, images) {
  for (let index = 0; index < MAX_PHOTOS; index += 1) {
    if (!resolveSlotImage(profile, images[index])) return index;
  }

  return null;
}

function Photos() {
  const queryClient = useQueryClient();
  const authProfile = useAuthStore(state => state.profiledata);
  const currentUser = useAuthStore(state => state.currentUser);

  const {
    data: profileResponse,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['profile', 'me'],
    queryFn: async () => {
      const response = await api.get('/api/v1/profiles/me');
      return response.data?.data?.profile ?? response.data?.profile ?? null;
    },
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
    staleTime: 0,
  });

  // The query is the fresh source of truth, while the Zustand profile prevents
  // an empty grid during the first paint after login.
  const profile = profileResponse ?? authProfile ?? {};

  const images = useMemo(
    () => (Array.isArray(profile?.images) ? profile.images : []),
    [profile?.images],
  );

  const inputRef = useRef(null);
  const dragDepth = useRef(0);
  const [activeSlotIndex, setActiveSlotIndex] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const updatedAtMs = profile?.updated_at ? new Date(profile.updated_at).getTime() : NaN;
  const cacheBuster = Number.isFinite(updatedAtMs) ? `?t=${updatedAtMs}` : '';
  const primaryDiscoveryImage = withCacheBuster(resolveSlotImage(profile, images[0]), cacheBuster);

  const initialsSource = currentUser || profile || {};
  const userInitials =
    `${initialsSource?.firstname?.[0] ?? initialsSource?.first_name?.[0] ?? ''}${
      initialsSource?.lastname?.[0] ?? initialsSource?.last_name?.[0] ?? ''
    }`.toUpperCase() || 'ML';

  const filledSlots = images.reduce(
    (count, rawImage) => (resolveSlotImage(profile, rawImage) ? count + 1 : count),
    0,
  );

  const uploadMutation = useMutation({
    mutationFn: async ({ fileBlob, slotIndex }) => {
      if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= MAX_PHOTOS) {
        throw new Error('Choose a valid photo slot before uploading.');
      }

      // `fileBlob` is the JPEG Blob emitted by ImageUploader. The browser sets
      // the multipart boundary; do not hard-code Content-Type here.
      const form = buildAvatarFormData(fileBlob);
      form.append('slot_index', String(slotIndex));

      const response = await api.post('/api/v1/profiles/me/avatar', form, {
        timeout: 60_000,
      });

      return response.data?.data ?? null;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['profiles', 'discovery'] });
      setSelectedFile(null);
      setIsUploaderOpen(false);
      toast.success(`Photo uploaded to slot ${variables.slotIndex + 1}.`);
    },
    onError: error => {
      // Keep the crop dialog mounted so the user can retry with the same
      // selection after a storage outage.
      toast.error(describeApiError(error, 'Could not upload that photo.'));
    },
    onSettled: () => {
      setActiveSlotIndex(null);
      if (inputRef.current) inputRef.current.value = '';
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ slotIndex }) => {
      const response = await api.delete(`/api/v1/profiles/me/photos/${slotIndex}`);
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['profiles', 'discovery'] });
      toast.success(`Photo removed from slot ${variables.slotIndex + 1}.`);
    },
    onError: error => {
      toast.error(describeApiError(error, 'Could not remove that photo.'));
    },
  });

  const handleFile = file => {
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error(`Only ${ACCEPTED_LABEL} files are supported.`);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error('Photos must be 5 MB or smaller.');
      return;
    }

    setSelectedFile(file);
    setIsUploaderOpen(true);
  };

  const openPicker = (slotIndex = firstEmptySlotIndex(profile, images)) => {
    if (slotIndex === null || slotIndex === undefined) {
      toast.error('All 10 photo slots are filled. Remove a photo to free a slot.');
      return;
    }

    if (uploadMutation.isPending) return;

    setActiveSlotIndex(slotIndex);
    inputRef.current?.click();
  };

  const handleFileInputChange = event => {
    const file = event.target.files?.[0];

    if (file && activeSlotIndex === null) {
      // Files can also arrive from the shared input without a slot click (for
      // example, drag-and-drop fallbacks or assistive pickers). Default to the
      // first empty slot so the upload is still slot-aware.
      const slotIndex = firstEmptySlotIndex(profile, images);

      if (slotIndex === null) {
        toast.error('All 10 photo slots are filled. Remove a photo to free a slot.');
        event.target.value = '';
        return;
      }

      setActiveSlotIndex(slotIndex);
    }

    handleFile(file);
    // Reset the input so selecting the same file twice still fires `change`.
    event.target.value = '';
  };

  const handleUploaderOpenChange = nextOpen => {
    setIsUploaderOpen(nextOpen);

    if (!nextOpen) {
      setSelectedFile(null);
      setActiveSlotIndex(null);
    }
  };

  const handleCropped = blob => {
    if (!Number.isInteger(activeSlotIndex)) {
      throw new Error('Select a photo slot before uploading.');
    }

    return uploadMutation.mutateAsync({ fileBlob: blob, slotIndex: activeSlotIndex });
  };

  const handleDragEnter = event => {
    event.preventDefault();
    event.stopPropagation();
    dragDepth.current += 1;
    setIsDragging(true);
  };

  const handleDragLeave = event => {
    event.preventDefault();
    event.stopPropagation();
    dragDepth.current -= 1;
    if (dragDepth.current <= 0) setIsDragging(false);
  };

  const handleDragOver = event => {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = event => {
    event.preventDefault();
    event.stopPropagation();
    dragDepth.current = 0;
    setIsDragging(false);

    const file = event.dataTransfer.files?.[0];
    const slotIndex = firstEmptySlotIndex(profile, images);

    if (slotIndex === null) {
      toast.error('All 10 photo slots are filled. Remove a photo to free a slot.');
      return;
    }

    setActiveSlotIndex(slotIndex);
    handleFile(file);
  };

  const deletingSlot = deleteMutation.isPending ? deleteMutation.variables?.slotIndex : null;
  const uploadingSlot = uploadMutation.isPending ? uploadMutation.variables?.slotIndex : null;

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-4xl">
        <div
          className="relative w-full overflow-hidden rounded-3xl border border-border/40 bg-card p-8 shadow-xs"
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <div className="flex flex-col gap-6 border-b border-border/40 pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Photo studio
              </span>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-foreground">
                Your photo gallery
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                Ten fixed slots. Tap any empty cell to upload into that exact position, or replace
                an existing photo without disturbing the others.
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs font-bold">
                {filledSlots} / {MAX_PHOTOS} photos
              </Badge>
              <Button
                type="button"
                onClick={() => openPicker()}
                disabled={uploadMutation.isPending || filledSlots >= MAX_PHOTOS}
                className="rounded-xl bg-primary px-4 font-bold text-primary-foreground hover:bg-primary/90"
              >
                {uploadMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ImagePlus className="mr-2 h-4 w-4" />
                )}
                {uploadMutation.isPending ? 'Uploading...' : 'Add photo'}
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="mt-4 flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              Refreshing your latest gallery...
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl border border-border/40 bg-muted/20 p-4">
            {primaryDiscoveryImage ? (
              <img
                data-testid="primary-discovery-photo"
                src={primaryDiscoveryImage}
                alt="Primary discovery photo"
                className="h-16 w-16 rounded-full object-cover ring-1 ring-border"
              />
            ) : (
              <div
                data-testid="primary-discovery-initials"
                className="w-16 h-16 bg-primary/10 text-primary border border-primary/20 rounded-full flex items-center justify-center text-xl font-black tracking-tight shadow-inner"
              >
                {userInitials}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-foreground">Primary discovery photo</p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Used on discovery cards, likes, and shortlists. Update it from your Profile page.
              </p>
            </div>

            <Link
              to="/profile"
              className="inline-flex h-9 items-center rounded-xl border border-border/60 bg-background px-3 text-xs font-bold text-foreground transition-colors hover:bg-muted"
            >
              Manage
            </Link>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(',')}
            className="hidden"
            data-testid="photo-file-input"
            onChange={handleFileInputChange}
          />

          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {Array.from({ length: MAX_PHOTOS }).map((_, slotIndex) => {
              const imageSrc = withCacheBuster(
                resolveSlotImage(profile, images[slotIndex]),
                cacheBuster,
              );
              const isUploading = uploadingSlot === slotIndex;
              const isDeleting = deletingSlot === slotIndex;

              if (imageSrc) {
                return (
                  <figure
                    key={`slot-${slotIndex}`}
                    className="group relative aspect-square overflow-hidden rounded-2xl border border-border/40 bg-muted"
                    data-testid={`photo-slot-${slotIndex}`}
                  >
                    <img
                      src={imageSrc}
                      alt={`Gallery photo ${slotIndex + 1}`}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full rounded-2xl object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    />

                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                    <Badge className="absolute left-3 top-3 rounded-full bg-primary text-primary-foreground shadow-xs">
                      Slot {slotIndex + 1}
                    </Badge>

                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100 focus-within:opacity-100">
                      <span className="truncate text-xs font-bold text-white">
                        Photo {slotIndex + 1}
                      </span>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openPicker(slotIndex)}
                          disabled={uploadMutation.isPending}
                          aria-label={`Replace gallery photo ${slotIndex + 1}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-background/90 text-foreground shadow-xs transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <ImagePlus className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteMutation.mutate({ slotIndex })}
                          disabled={deleteMutation.isPending}
                          aria-label={`Delete gallery photo ${slotIndex + 1}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-background/90 text-destructive shadow-xs transition-colors hover:bg-destructive hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isDeleting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {isUploading ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-[1px]">
                        <Loader2 className="h-7 w-7 animate-spin text-primary" />
                      </div>
                    ) : null}

                    {isDeleting ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-[1px]">
                        <Loader2 className="h-7 w-7 animate-spin text-primary" />
                      </div>
                    ) : null}
                  </figure>
                );
              }

              return (
                <button
                  key={`empty-${slotIndex}`}
                  type="button"
                  onClick={() => openPicker(slotIndex)}
                  disabled={uploadMutation.isPending}
                  data-testid={`photo-slot-${slotIndex}`}
                  className={cn(
                    'flex aspect-square cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-muted-foreground/20 bg-muted/10 p-4 text-center transition-colors hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-70',
                    isUploading && 'border-primary/50',
                  )}
                >
                  {isUploading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  ) : (
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-background text-muted-foreground shadow-xs">
                      <Plus className="h-5 w-5" />
                    </span>
                  )}
                  <span className="mt-3 text-xs font-bold text-foreground">
                    {isUploading ? 'Uploading...' : 'Add photo'}
                  </span>
                  <span className="mt-1 text-[11px] text-muted-foreground">
                    Slot {slotIndex + 1} · {ACCEPTED_LABEL}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-8 grid gap-4 border-t border-border/40 pt-6 sm:grid-cols-3">
            <div className="rounded-2xl bg-muted/40 p-4">
              <Camera className="h-5 w-5 text-primary" />
              <p className="mt-2 text-sm font-bold text-foreground">Clear and bright</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Use natural light and a recent photo where your face is easy to see.
              </p>
            </div>
            <div className="rounded-2xl bg-muted/40 p-4">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <p className="mt-2 text-sm font-bold text-foreground">Safe and respectful</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Keep photos appropriate. Reports are reviewed by the moderation team.
              </p>
            </div>
            <div className="rounded-2xl bg-muted/40 p-4">
              <ImagePlus className="h-5 w-5 text-primary" />
              <p className="mt-2 text-sm font-bold text-foreground">Slot-based gallery</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Every upload fills only the slot you choose. Slot 1 is the primary discovery photo.
              </p>
            </div>
          </div>

          {isDragging ? (
            <div className="pointer-events-none absolute inset-3 z-30 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-primary/50 bg-background/85 backdrop-blur-sm">
              <ImagePlus className="h-10 w-10 text-primary" />
              <p className="mt-3 text-sm font-bold text-foreground">Drop to upload</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Fills the first empty slot · {ACCEPTED_LABEL}, up to 5 MB
              </p>
            </div>
          ) : null}
        </div>

        <ImageUploader
          file={selectedFile}
          open={isUploaderOpen}
          onOpenChange={handleUploaderOpenChange}
          onImageCropped={handleCropped}
          busy={uploadMutation.isPending}
          title={
            Number.isInteger(activeSlotIndex)
              ? `Crop photo for slot ${activeSlotIndex + 1}`
              : 'Crop your photo'
          }
          description="Drag to reposition and zoom until your face fills the frame. This photo fills the selected gallery slot only."
        />

        {isError ? (
          <div className="mt-4 flex items-center justify-between gap-4 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <span>We could not refresh your gallery. Check your connection and try again.</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="shrink-0 rounded-xl border-destructive/30 bg-background text-destructive hover:bg-destructive/10"
            >
              Retry
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default Photos;
