import { useCallback, useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Camera, CheckCircle2, Loader2, ScanLine } from 'lucide-react';
import { apiClient, describeApiError } from '@/api/client';

export function VerifyPeerScanner({ enabled = false, onVouchSuccess }) {
  const [status, setStatus] = useState('Ready to scan');
  const [error, setError] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scannerRef = useRef(null);

  const clearScanner = useCallback(async () => {
    if (!scannerRef.current) return;

    try {
      await scannerRef.current.clear();
    } catch {
      // The scanner may already be stopped when the camera stream ends.
    } finally {
      scannerRef.current = null;
    }
  }, []);

  const startScanning = useCallback(() => {
    if (!enabled || isScanning || isSubmitting) return;

    setError('');
    setStatus('Requesting camera access…');

    try {
      const scanner = new Html5QrcodeScanner(
        'peer-vouch-reader',
        {
          fps: 15,
          qrbox: { width: 220, height: 220 },
          aspectRatio: 1,
        },
        false,
      );

      scannerRef.current = scanner;
      setIsScanning(true);

      scanner.render(
        async decodedText => {
          await clearScanner();
          setIsScanning(false);
          setIsSubmitting(true);
          setStatus('Recording vouch…');

          try {
            const { data } = await apiClient.post(
              '/api/v1/vouch/verify-peer',
              { secure_token: decodedText },
              { timeout: 15_000 },
            );

            const result = data?.data || data;
            setStatus(`Vouch recorded — ${result?.current_vouches ?? 0} / 3 peer vouches.`);
            onVouchSuccess?.(result);
          } catch (requestError) {
            setStatus('Ready to scan');
            setError(describeApiError(requestError, 'This vouch could not be recorded.'));
          } finally {
            setIsSubmitting(false);
          }
        },
        () => {
          // Ignore per-frame decode misses.
        },
      );
    } catch (cameraError) {
      console.error('Peer scanner camera setup failed', cameraError);
      setStatus('Ready to scan');
      setError('The camera could not be started. Check browser camera permissions and try again.');
      setIsScanning(false);
    }
  }, [clearScanner, enabled, isScanning, isSubmitting, onVouchSuccess]);

  useEffect(
    () => () => {
      void clearScanner();
    },
    [clearScanner],
  );

  // If a successful vouch or a credit change disables scanning while the
  // camera is live, release the device instead of leaving the stream open.
  useEffect(() => {
    if (enabled) return;

    void clearScanner().then(() => {
      setIsScanning(false);
      setStatus('Ready to scan');
    });
  }, [enabled, clearScanner]);

  if (!enabled) {
    return (
      <div
        data-testid="peer-scanner-disabled"
        className="flex w-full flex-col items-center rounded-2xl border border-dashed border-border/60 bg-muted/20 px-6 py-10 text-center"
      >
        <ScanLine className="h-8 w-8 text-muted-foreground" />
        <p className="mt-3 text-sm font-bold text-foreground">
          Scanning unlocks after verification
        </p>
        <p className="mt-1 max-w-md text-sm leading-relaxed text-muted-foreground">
          Once three local verifiers vouch for you, you become a Peer Verifier with five credits to
          verify other members in your city.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex flex-col items-center text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Camera className="h-6 w-6" />
        </span>
        <h3 className="mt-3 text-lg font-black tracking-tight text-foreground">
          Verify a local peer
        </h3>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          Only scan a member's code after you have met them in person or completed an external video
          call and confirmed they are in your city.
        </p>
      </div>

      <div
        id="peer-vouch-reader"
        data-testid="peer-scanner-reader"
        className="mx-auto mt-5 w-full max-w-md overflow-hidden rounded-2xl border border-border/60 bg-muted/20"
      />

      <div className="mt-4 flex flex-col items-center gap-3">
        {!isScanning ? (
          <button
            type="button"
            onClick={startScanning}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ScanLine className="h-4 w-4" />
            )}
            {isSubmitting ? 'Recording…' : 'Start camera'}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              void clearScanner().then(() => setIsScanning(false));
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-card px-5 py-2.5 text-sm font-bold text-foreground transition-colors hover:bg-muted"
          >
            Stop camera
          </button>
        )}

        <p className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-4 py-2 text-sm font-semibold text-muted-foreground">
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          )}
          {status}
        </p>

        {error ? (
          <div className="w-full rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
            {error}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default VerifyPeerScanner;
