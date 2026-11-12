import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/api/client';
import { useAuthStore } from '@/store/authStore';

function formatInr(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function TermsPopup() {
  const { currentUser, updateProfile, logout } = useAuthStore();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [agree, setAgree] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  const annualFee = Number(
    currentUser?.accepted_one_time_fees_amount ?? currentUser?.acceptedonetimefeesamount ?? 500,
  );
  const lockedAnnualFee = Number.isFinite(annualFee) && annualFee > 0 ? annualFee : 500;

  const acceptTermsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.patch('/api/v1/profiles/me', {
        terms_accepted: true,
      });

      return response.data?.data?.profile ?? response.data?.profile ?? response.data;
    },
    onSuccess: profile => {
      updateProfile({
        ...(profile && typeof profile === 'object' ? profile : {}),
        terms_accepted: true,
        termsaccepted: true,
      });
      queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });
      setAgree(false);
      toast.success('Terms accepted');
      navigate('/dashboard/search', { replace: true });
    },
    onError: error => {
      toast.error(
        error?.response?.data?.message ||
          error?.payload?.message ||
          error?.message ||
          'Could not save your acceptance. Please try again.',
      );
    },
  });

  const onDisagreeClick = () => {
    if (isLeaving) return;
    setIsLeaving(true);

    // Best-effort server revocation. Local teardown happens immediately so the
    // user cannot remain on an authenticated screen if the request is slow.
    try {
      apiClient.delete('/api/v1/auth/logout').catch(() => {});
    } catch {
      // Local teardown below is authoritative.
    }

    logout();
    queryClient.clear();
    window.localStorage.clear();
    window.location.assign('/');
  };

  const termsAccepted = currentUser?.terms_accepted ?? currentUser?.termsaccepted;
  const isAdmin = currentUser?.role === 'admin' || currentUser?.is_admin === true;
  const isOpen = Boolean(currentUser && !isAdmin && !termsAccepted);

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-2xl rounded-3xl border border-border/60 bg-card text-foreground"
        onEscapeKeyDown={event => event.preventDefault()}
        onInteractOutside={event => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl font-black tracking-tight text-foreground">
            Welcome to MarryLocal
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-72 space-y-4 overflow-auto rounded-2xl border border-border/60 bg-muted/40 p-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            MarryLocal is a local matchmaking service for India. Profiles are shown by geographic
            locale, lifestyle compatibility, and the cultural filters you choose. You can express
            interest through Likes, Mutual Matches, Shortlists, and profile views. Contact details
            are shared only when you choose to share them.
          </p>
          <p>
            Be respectful, keep your contact details private until you are comfortable, and report
            any profile that violates our community guidelines.
          </p>

          <div className="rounded-xl border border-border/60 bg-card/70 p-3">
            <p className="font-semibold text-foreground">Service fees</p>
            <p className="mt-1">
              Core platform access is free initially. Once the active opposite-gender member count
              in your city exceeds{' '}
              <span className="font-semibold text-foreground">250 members</span>, an annual service
              fee of{' '}
              <span className="font-semibold text-foreground">
                {formatInr(lockedAnnualFee)} INR
              </span>{' '}
              plus applicable GST applies. Each verified referral earns a{' '}
              <span className="font-semibold text-foreground">₹50</span> credit that is deducted
              from your annual fee. This is the rate locked in for your account at registration.
            </p>
          </div>

          <p>
            Annual fees are governed by the Terms and Conditions and Privacy Policy. Your bearer
            session is stored locally on this device. Signing out revokes it on the server.
          </p>
        </div>

        <label className="flex items-start gap-3 text-sm font-medium text-muted-foreground">
          <input
            type="checkbox"
            checked={agree}
            onChange={event => setAgree(event.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
          />
          I have read and agree to the Terms and Conditions and Privacy Policy.
        </label>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            className="rounded-xl border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            disabled={isLeaving || acceptTermsMutation.isPending}
            onClick={onDisagreeClick}
          >
            {isLeaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isLeaving ? 'Signing out...' : 'I DO NOT AGREE'}
          </Button>
          <Button
            disabled={!agree || acceptTermsMutation.isPending}
            onClick={() => acceptTermsMutation.mutate()}
            className="rounded-xl bg-primary font-bold text-primary-foreground hover:bg-primary/90"
          >
            {acceptTermsMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            I AGREE
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default TermsPopup;
