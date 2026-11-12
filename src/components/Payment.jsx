import { useMutation } from '@tanstack/react-query';
import { CreditCard, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { apiClient, describeApiError } from '@/api/client';

/**
 * Server-priced PhonePe checkout trigger.
 *
 * The client never supplies an amount or checksum. The API creates the order,
 * stores a pending transaction, and returns PhonePe's redirect URL.
 */
export function Payment({ buttonname = 'Pay Service Fees', className = '' }) {
  const initializePhonePeOrder = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/api/v1/payments/phonepe/order');
      return response.data;
    },
    onSuccess: data => {
      const redirectUrl = data?.data?.redirect_url ?? data?.redirect_url;

      if (redirectUrl) {
        window.location.assign(redirectUrl);
        return;
      }

      toast.error('PhonePe did not return a checkout URL.');
    },
    onError: error => {
      toast.error(describeApiError(error, 'Could not start the PhonePe payment.'));
    },
  });

  return (
    <Button
      type="button"
      onClick={() => initializePhonePeOrder.mutate()}
      disabled={initializePhonePeOrder.isPending}
      className={`rounded-xl bg-amber-400 px-6 font-bold text-slate-900 shadow-xs hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {initializePhonePeOrder.isPending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <CreditCard className="mr-2 h-4 w-4" />
      )}
      {initializePhonePeOrder.isPending ? 'Opening PhonePe...' : buttonname}
    </Button>
  );
}

export default Payment;
