import { useCallback, useEffect, useRef, useState } from 'react';
import Cropper from 'react-easy-crop';
import { Check, ImageOff, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { validateProfileImage } from '@/lib/imageValidation';

const DEFAULT_ACCEPTED_TYPES = ['image/jpeg', 'image/png'];
const DEFAULT_MAX_SIZE = 5 * 1024 * 1024;
const JPEG_QUALITY = 0.85;
const MAX_OUTPUT_DIMENSION = 1600;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error('That image could not be read. Choose a PNG or JPG photo.'));
    image.src = src;
  });
}

/**
 * Controlled crop dialog for profile photos.
 *
 * The parent selects a file, sets it on the `file` prop, and flips `open` to
 * true. The dialog then mounts the Cropper canvas. Clicking "Apply" renders the
 * crop to an off-screen canvas and hands a real `Blob` (image/jpeg) to
 * `onImageCropped`, which is expected to feed it into a TanStack `useMutation`
 * wrapped in `FormData`.
 *
 * Nothing here talks to the network: upload ownership stays with the caller.
 */
export function ImageUploader({
  file = null,
  open,
  onOpenChange,
  aspectRatio = 1,
  maxSize = DEFAULT_MAX_SIZE,
  acceptedFileTypes = DEFAULT_ACCEPTED_TYPES,
  onImageCropped,
  onImageRemove,
  title = 'Crop your photo',
  description = 'Drag to reposition and zoom until your face fills the frame.',
  className,
  busy = false,
}) {
  const isControlled = typeof open === 'boolean';
  const [internalOpen, setInternalOpen] = useState(false);
  const dialogOpen = isControlled ? open : internalOpen;

  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [error, setError] = useState(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isCropping, setIsCropping] = useState(false);

  const objectUrlRef = useRef(null);

  const clearObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const setDialogOpen = useCallback(
    next => {
      if (!isControlled) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange],
  );

  const reset = useCallback(() => {
    clearObjectUrl();
    setImageSrc(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setError(null);
    setIsPreparing(false);
    setIsCropping(false);
  }, [clearObjectUrl]);

  const handleOpenChange = useCallback(
    next => {
      setDialogOpen(next);
      if (!next) reset();
    },
    [reset, setDialogOpen],
  );

  /**
   * Guardrail for every selected file, before any FileReader or canvas work.
   *
   * `validateProfileImage` throws on unsupported formats or oversized files.
   * We catch here so the cropper never mounts with a payload it cannot decode,
   * and mirror the message into both the dialog and the toast panel.
   */
  const handleFileSelect = useCallback(
    file => {
      try {
        validateProfileImage(file, {
          maxSize,
          allowedTypes: acceptedFileTypes,
        });

        setError(null);
        return true;
      } catch (validationError) {
        const message =
          validationError instanceof Error
            ? validationError.message
            : 'That image could not be validated.';

        setError(message);
        toast.error(message);
        setDialogOpen(true);
        return false;
      }
    },
    [acceptedFileTypes, maxSize, setDialogOpen],
  );

  // Load the selected file into an object URL and open the modal layer. This is
  // the hook that was previously missing: choosing a file must mount the crop
  // canvas immediately instead of silently doing nothing.
  useEffect(() => {
    if (!file) return undefined;

    if (!handleFileSelect(file)) {
      return undefined;
    }

    let cancelled = false;

    clearObjectUrl();
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;

    setImageSrc(null);
    setCroppedAreaPixels(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setIsPreparing(true);
    setDialogOpen(true);

    loadImage(url)
      .then(() => {
        if (cancelled) return;
        setImageSrc(url);
      })
      .catch(loadError => {
        if (!cancelled) {
          setImageSrc(null);
          setError(loadError.message);
        }
      })
      .finally(() => {
        if (!cancelled) setIsPreparing(false);
      });

    return () => {
      cancelled = true;
    };
    // `file` is the only value that should retrigger loading. Validation props
    // are intentionally read at selection time so a new array identity does not
    // reopen the dialog on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  // Release the last object URL when the component unmounts.
  useEffect(() => () => clearObjectUrl(), [clearObjectUrl]);

  const onCropComplete = useCallback((_croppedArea, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  /**
   * Render the selected crop to a canvas and resolve with a clean Blob.
   *
   * react-easy-crop reports `croppedAreaPixels` in natural image coordinates,
   * so the source rectangle is drawn directly. JPEG has no alpha channel, so the
   * canvas is filled white first to avoid transparent PNGs turning black.
   */
  const cropImage = useCallback(async () => {
    if (!imageSrc) {
      throw new Error('Select an image before applying the crop.');
    }

    const image = await loadImage(imageSrc);

    const naturalWidth = image.naturalWidth;
    const naturalHeight = image.naturalHeight;

    const area =
      croppedAreaPixels && croppedAreaPixels.width > 0 && croppedAreaPixels.height > 0
        ? croppedAreaPixels
        : { x: 0, y: 0, width: naturalWidth, height: naturalHeight };

    const sourceX = Math.max(0, Math.min(area.x, naturalWidth - 1));
    const sourceY = Math.max(0, Math.min(area.y, naturalHeight - 1));
    const sourceWidth = Math.max(1, Math.min(area.width, naturalWidth - sourceX));
    const sourceHeight = Math.max(1, Math.min(area.height, naturalHeight - sourceY));

    const scale = Math.min(
      1,
      MAX_OUTPUT_DIMENSION / Math.max(sourceWidth, sourceHeight),
    );

    const outputWidth = Math.max(1, Math.round(sourceWidth * scale));
    const outputHeight = Math.max(1, Math.round(sourceHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = outputWidth;
    canvas.height = outputHeight;

    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Your browser could not prepare the cropped image.');
    }

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.imageSmoothingQuality = 'high';
    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      canvas.width,
      canvas.height,
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        blob => {
          if (!blob) {
            reject(new Error('The cropped image could not be generated. Try another photo.'));
            return;
          }

          if (blob.size > 5 * 1024 * 1024) {
            reject(new Error('This crop is still too large. Zoom in or choose a smaller image.'));
            return;
          }

          resolve(blob);
        },
        'image/jpeg',
        JPEG_QUALITY,
      );
    });
  }, [croppedAreaPixels, imageSrc]);

  const handleApply = useCallback(async () => {
    if (isCropping || busy) return;

    if (typeof onImageCropped !== 'function') {
      setError('No upload handler was provided for this photo.');
      return;
    }

    setIsCropping(true);
    setError(null);

    try {
      const blob = await cropImage();
      await onImageCropped(blob);
      handleOpenChange(false);
    } catch (cropError) {
      setError(cropError?.message || 'The image could not be cropped. Try another photo.');
    } finally {
      setIsCropping(false);
    }
  }, [busy, cropImage, handleOpenChange, isCropping, onImageCropped]);

  const handleRemove = useCallback(async () => {
    if (typeof onImageRemove !== 'function') return;

    setIsCropping(true);

    try {
      await onImageRemove();
      handleOpenChange(false);
    } catch (removeError) {
      setError(removeError?.message || 'That photo could not be removed.');
    } finally {
      setIsCropping(false);
    }
  }, [handleOpenChange, onImageRemove]);

  const pending = isCropping || busy;

  return (
    <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
      <DialogContent className={cn('sm:max-w-lg', className)}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        {error ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
          >
            <ImageOff className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        {imageSrc ? (
          <>
            <div className="relative h-80 w-full overflow-hidden rounded-2xl bg-muted">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={aspectRatio}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
                showGrid
              />
            </div>

            <div className="flex items-center gap-4">
              <span className="text-xs font-bold text-muted-foreground">Zoom</span>
              <Slider
                value={[zoom]}
                min={1}
                max={3}
                step={0.05}
                aria-label="Zoom"
                onValueChange={value => setZoom(Array.isArray(value) ? value[0] : value)}
                disabled={pending}
              />
            </div>

            <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
              {typeof onImageRemove === 'function' ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleRemove}
                  disabled={pending}
                  className="justify-center rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove photo
                </Button>
              ) : (
                <span className="hidden sm:block" />
              )}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  disabled={pending}
                  className="rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleApply}
                  disabled={pending || !croppedAreaPixels}
                  className="rounded-xl bg-amber-400 px-5 font-bold text-slate-900 hover:bg-amber-300"
                >
                  {pending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-2 h-4 w-4" />
                  )}
                  Apply
                </Button>
              </div>
            </DialogFooter>
          </>
        ) : (
          <div className="flex h-72 w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border bg-muted/30 text-center">
            {isPreparing ? (
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            ) : (
              <ImageOff className="h-8 w-8 text-muted-foreground" />
            )}
            <p className="text-sm font-medium text-muted-foreground">
              {isPreparing ? 'Preparing your preview...' : 'Choose a photo to start cropping.'}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ImageUploader;
