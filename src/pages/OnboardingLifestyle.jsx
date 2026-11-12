import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Loader2, SlidersHorizontal, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';

const TRAITS = [
  { max: 15, label: 'Strongly lean left' },
  { max: 35, label: 'Lean left' },
  { max: 55, label: 'Balanced' },
  { max: 74, label: 'Lean right' },
  { max: 100, label: 'Strongly lean right' },
];

function onboardingTraitLabel(value) {
  return TRAITS.find(trait => value <= trait.max)?.label ?? 'Balanced';
}

/**
 * Lifestyle questionnaire step.
 *
 * The UI deliberately exposes only the qualitative phrase. Numeric values stay
 * inside component state and the slider thumb position; no score badge or
 * numeric readout is rendered into the DOM.
 */
export function OnboardingLifestyle() {
  const navigate = useNavigate();
  const token = useAuthStore(state => state.token);
  const setLifestyleAlignment = useAuthStore(state => state.setLifestyleAlignment);
  const setOnboardingComplete = useAuthStore(state => state.setOnboardingComplete);
  const [value, setValue] = useState(50);
  const [saving, setSaving] = useState(false);

  const traitLabel = useMemo(() => onboardingTraitLabel(value), [value]);

  const complete = async () => {
    if (!token) {
      navigate('/signup', { replace: true });
      return;
    }

    setSaving(true);
    try {
      await api.patch('/api/v1/profiles/me', {
        profile: {},
        lifestyle_alignment: traitLabel,
      });
    } catch (error) {
      // The answer is stored locally even if the optional profile sync fails;
      // the user can still enter discovery with their persisted bearer token.
      if (error?.status === 401) {
        toast.error('Your session expired. Please sign in again.');
        navigate('/login', { replace: true });
        return;
      }
    } finally {
      setSaving(false);
    }

    setLifestyleAlignment(traitLabel);
    setOnboardingComplete(true);
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-2xl bg-card p-10 rounded-3xl border shadow-sm">
        <div className="mb-8">
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-amber-700">
            <Sparkles className="h-3.5 w-3.5" />
            Step 2 of 2
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-foreground">
            Tune your lifestyle fit
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Move the slider to describe the values you want to build a home around. We only show a
            qualitative alignment, never a public score.
          </p>
        </div>

        <div className="rounded-3xl border border-border bg-muted/40 p-6">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 text-sm font-bold text-foreground">
              <SlidersHorizontal className="h-4 w-4 text-amber-700" />
              Lifestyle alignment
            </div>
            <span
              data-testid="lifestyle-label"
              className="rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-900"
            >
              {traitLabel}
            </span>
          </div>

          <input
            data-testid="lifestyle-slider"
            aria-label="Lifestyle alignment"
            aria-valuetext={traitLabel}
            type="range"
            min="0"
            max="100"
            step="1"
            value={value}
            onChange={event => setValue(Number(event.target.value))}
            className="h-3 w-full cursor-pointer appearance-none rounded-full bg-gradient-to-r from-sky-200 via-amber-200 to-rose-300 accent-amber-500"
          />

          <div className="mt-4 flex justify-between text-xs font-semibold text-muted-foreground">
            <span>Community-first</span>
            <span>Balanced</span>
            <span>Tradition-first</span>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            Skip for now
          </button>

          <Button
            type="button"
            data-testid="onboarding-complete"
            onClick={complete}
            disabled={saving}
            className="h-12 rounded-2xl bg-amber-400 px-8 text-slate-900 dark:text-slate-900 font-bold shadow-xs transition-all duration-300 hover:bg-amber-300"
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="mr-2 h-4 w-4" />
            )}
            Complete
          </Button>
        </div>
      </div>
    </div>
  );
}

export default OnboardingLifestyle;
