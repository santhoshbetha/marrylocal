import { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/store/authStore';
import { useAvatarUpload } from '@/hooks/useProfile';
import { describeApiError } from '@/api/client';
import { ImageUploader } from '@/components/ImageUploader';

const ACCEPTED_TYPES = ['image/png', 'image/jpeg'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Primary avatar upload control.
 *
 * The profile page renders the initials badge itself, so this component no
 * longer duplicates the uploaded image in a second avatar circle. It owns the
 * file picker, crop dialog, and R2 upload mutation only.
 */
export function ProfileAvatarUploader({ initials = '', avatarUrl = '' }) {
  const { profiledata, updateProfile } = useAuth();
  const inputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [cropperOpen, setCropperOpen] = useState(false);
  const upload = useAvatarUpload();

  const fallbackInitials =
    `${profiledata?.firstname?.[0] ?? profiledata?.first_name?.[0] ?? ''}${
      profiledata?.lastname?.[0] ?? profiledata?.last_name?.[0] ?? ''
    }`.toUpperCase() || 'ML';
  const displayInitials = (initials || fallbackInitials).toUpperCase();
  const displayAvatar = avatarUrl || profiledata?.avatar_url || '';

  const handleFile = file => {
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Only PNG and JPEG avatars are supported.');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error('Avatar must be 5 MB or smaller.');
      return;
    }

    setSelectedFile(file);
    setCropperOpen(true);
  };

  const handleCropped = async blob => {
    try {
      const data = await upload.mutateAsync(blob);

      if (data?.avatar_url) {
        updateProfile({ avatar_url: data.avatar_url });
      }

      setSelectedFile(null);
      toast.success('Avatar updated.');
    } catch (error) {
      toast.error(describeApiError(error, 'Could not upload your avatar.'));
      // Rethrow so the crop dialog stays open and shows the failure inline.
      throw error;
    }
  };

  const handleCropperOpenChange = nextOpen => {
    setCropperOpen(nextOpen);
    if (!nextOpen) setSelectedFile(null);
  };

  return (
    <div className="mt-4 flex flex-col items-center gap-3">
      {displayAvatar ? (
        <img
          src={displayAvatar}
          alt="Avatar"
          className="h-20 w-20 rounded-full border border-primary/20 object-cover shadow-inner"
        />
      ) : (
        <div
          data-testid="profile-initials"
          className="w-20 h-20 bg-primary/10 text-primary border border-primary/20 rounded-full flex items-center justify-center text-xl font-black tracking-tight shadow-inner"
        >
          {displayInitials}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        className="hidden"
        data-testid="avatar-input"
        onChange={event => {
          handleFile(event.target.files?.[0]);
          event.target.value = '';
        }}
      />

      <button
        type="button"
        data-testid="avatar-upload-button"
        onClick={() => inputRef.current?.click()}
        disabled={upload.isPending}
        className="inline-flex items-center gap-2 rounded-2xl bg-amber-400 px-4 py-2 text-sm font-bold text-slate-900 shadow-xs transition-all duration-300 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-900"
      >
        {upload.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Camera className="h-4 w-4" />
        )}
        {upload.isPending ? 'Uploading...' : 'Change avatar'}
      </button>

      <ImageUploader
        file={selectedFile}
        open={cropperOpen}
        onOpenChange={handleCropperOpenChange}
        onImageCropped={handleCropped}
        busy={upload.isPending}
        title="Crop your avatar"
        description="Drag to reposition and zoom until your face fills the frame."
      />
    </div>
  );
}

export default ProfileAvatarUploader;
