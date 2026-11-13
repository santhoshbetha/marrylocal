import { useCallback, useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { RefreshCw, ShieldCheck } from 'lucide-react';
import { apiClient, describeApiError } from '@/api/client';

const TOKEN_LIFETIME_SECONDS = 60;

export function RequestVouchToken() {
  const [secureToken, setSecureToken] = useState('');
  const [secondsRemaining, setSecondsRemaining] = useState(TOKEN_LIFETIME_SECONDS);
  const [error, setError] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const generatingRef = useRef(false);

  const generateToken = useCallback(async () => {
    if (generatingRef.current) return;
    generatingRef.current = true;
    setIsGenerating(true);

    try {
      const { data } = await apiClient.post(
        '/api/v1/vouch/generate-token',
        {},
        { timeout: 10_000 },
      );

      const token = data?.data?.secure_token || data?.secure_token;

      if (!token) {
        throw new Error('The server did not return a vouch token.');
      }

      setSecureToken(token);
      setSecondsRemaining(data?.data?.expires_in || data?.expires_in || TOKEN_LIFETIME_SECONDS);
      setError('');
    } catch (requestError) {
      setError(describeApiError(requestError, 'Could not generate a vouch code.'));
    } finally {
      generatingRef.current = false;
      setIsGenerating(false);
    }
  }, []);

  // Fetch the first code as soon as the panel opens.
  useEffect(() => {
    void generateToken();
  }, [generateToken]);

  // Count down without triggering network calls inside a state updater. React
  // may invoke updaters more than once (StrictMode), which would double-fetch.
  useEffect(() => {
    const interval = window.setInterval(() => {
      setSecondsRemaining(current => (current <= 1 ? 0 : current - 1));
    }, 1_000);

    return () => window.clearInterval(interval);
  }, []);

  // Once the code expires, rotate exactly once. A failed rotation leaves the
  // counter at zero instead of retrying in a tight loop; the manual refresh
  // button remains available.
  useEffect(() => {
    if (secondsRemaining !== 0) return;
    void generateToken();
  }, [secondsRemaining, generateToken]);

  return (
    <div className="flex w-full flex-col items-center text-center">
      <div className="flex items-center gap-2 text-sm font-bold text-foreground">
        <ShieldCheck className="h-4 w-4 text-emerald-600" />
        Show this code to a local verifier
      </div>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        You do not need to know the verifier beforehand. Meet them in person, or verify live over
        WhatsApp or Zoom, show your government ID, and let them scan this code. One vouch unlocks
        full app access; three vouches let you verify up to five other members.
      </p>
      <p className="mt-2 max-w-md text-xs leading-relaxed text-muted-foreground">
        The code rotates every 60 seconds and can be scanned only once. Keep it visible only while
        the verifier is with you.
      </p>

      <div
        data-testid="vouch-qr"
        className="mt-6 inline-flex min-h-[236px] min-w-[236px] items-center justify-center rounded-2xl border border-border/60 bg-white p-3 shadow-sm"
      >
        {secureToken ? (
          <QRCodeSVG
            value={secureToken}
            size={220}
            level="M"
            bgColor="#ffffff"
            fgColor="#0f172a"
            includeMargin={false}
          />
        ) : (
          <div className="flex h-[220px] w-[220px] items-center justify-center text-xs font-semibold text-slate-500">
            {isGenerating ? 'Generating secure code…' : 'Waiting for a secure code…'}
          </div>
        )}
      </div>

      <div
        data-testid="vouch-countdown"
        className="mt-4 inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-4 py-2 text-sm font-bold text-foreground"
      >
        Rotating in {secondsRemaining}s
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
          {error}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => void generateToken()}
        disabled={isGenerating}
        className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border/60 bg-card px-4 py-2 text-sm font-bold text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
      >
        <RefreshCw className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
        Refresh code
      </button>
    </div>
  );
}

export default RequestVouchToken;
