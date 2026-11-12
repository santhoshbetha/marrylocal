import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Clock3, Loader2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/api/client';
import { useAuthStore } from '@/store/authStore';

function ServiceFeesPhonePePaymentStatus() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const updateProfile = useAuthStore(state => state.updateProfile);
  const [searchParams] = useSearchParams();
  const handledRef = useRef(false);

  const orderId = searchParams.get('orderid') || searchParams.get('order_id');
  const statusParam = searchParams.get('status');

  const statusQuery = useQuery({
    queryKey: ['payments', 'status', orderId],
    queryFn: async () => {
      const response = await apiClient.get(`/api/v1/payments/status/${orderId}`);
      return response.data;
    },
    enabled: Boolean(orderId),
    retry: 1,
    refetchInterval: query => {
      const status = query.state.data?.data?.status;
      return status === 'pending' ? 3000 : false;
    },
  });

  const payment = statusQuery.data?.data;
  const paymentStatus =
    payment?.status?.toLowerCase() ||
    (statusParam === 'SUCCESS' ? 'pending' : statusParam === 'FAILED' ? 'failed' : 'pending');

  useEffect(() => {
    if (paymentStatus !== 'success' || handledRef.current) return undefined;

    handledRef.current = true;
    updateProfile({
      onetime_fees_paid: true,
      onetimefeespaid: true,
      date_of_last_payment: payment?.paid_at,
    });
    queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });
    queryClient.invalidateQueries({ queryKey: ['payments', 'transactions'] });
    toast.success('Payment successful! Your discovery feeds are unlocked.');

    const timer = window.setTimeout(() => {
      navigate('/dashboard/search', { replace: true });
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [navigate, payment?.paid_at, paymentStatus, queryClient, updateProfile]);

  const failed = paymentStatus === 'failed' || statusQuery.isError;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md rounded-3xl border border-border/60 bg-card shadow-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-xl font-black tracking-tight text-foreground">
            Payment Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {paymentStatus === 'success' ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-9 w-9" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground">Payment Successful</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Your annual service fee is paid. Discovery and search are unlocked, and your
                  invoice is being generated.
                </p>
              </div>
              <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Returning to discovery...</p>
            </div>
          ) : failed ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <XCircle className="h-9 w-9" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground">Payment Failed</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  The payment could not be verified. Try again or contact support if the amount was
                  debited.
                </p>
              </div>
              <div className="space-y-3">
                <Button
                  className="w-full rounded-xl bg-amber-400 font-bold text-slate-900 hover:bg-amber-300"
                  onClick={() => navigate('/dashboard/servicefees')}
                >
                  Try Again
                </Button>
                <Button
                  variant="outline"
                  className="w-full rounded-xl border-border/60"
                  onClick={() => navigate('/contact')}
                >
                  Contact Support
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Clock3 className="h-9 w-9" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground">Verifying Payment</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  We are checking PhonePe's server-side transaction record. Keep this page open.
                </p>
              </div>
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
              {orderId ? (
                <p className="text-xs font-medium text-muted-foreground">Order: {orderId}</p>
              ) : (
                <p className="text-xs font-medium text-destructive">No order reference found.</p>
              )}
            </div>
          )}

          <div className="border-t border-border/60 pt-4">
            <Button
              variant="ghost"
              className="w-full rounded-xl text-muted-foreground"
              onClick={() => navigate('/dashboard/search')}
            >
              Go to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ServiceFeesPhonePePaymentStatus;
