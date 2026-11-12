import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, ShieldCheck, Sparkles } from 'lucide-react';

export function HeroSection({ celebration = null }) {
  const navigate = useNavigate();

  return (
    <section className="bg-background px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl border border-border bg-card shadow-xs dark:border-border">
        {celebration}

        <div className="relative z-10 grid items-center gap-8 p-6 sm:p-10 lg:grid-cols-2 lg:gap-12">
          <div className="space-y-6">
            <Badge
              variant="secondary"
              className="border border-border bg-muted text-xs font-semibold text-foreground hover:bg-muted sm:text-sm"
            >
              <Sparkles className="mr-2 h-3.5 w-3.5" />
              Search with confidence
            </Badge>

            <div className="space-y-3">
              <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl lg:text-6xl">
                Find matches in your locality
              </h1>
              <p className="max-w-xl text-base leading-relaxed text-muted-foreground">
                MarryLocal helps you discover compatible people nearby with local context, clear
                privacy controls, and a calm, focused matchmaking experience.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                onClick={() => navigate('/login')}
                size="lg"
                className="h-11 bg-primary px-6 text-sm font-bold text-primary-foreground hover:bg-primary/90 sm:text-base"
              >
                Login
              </Button>
              <Button
                size="lg"
                onClick={() => navigate('/register')}
                className="h-11 bg-secondary px-6 text-sm font-bold text-secondary-foreground shadow-xs hover:bg-secondary/80 sm:text-base"
              >
                Register
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-3">
              <div className="rounded-2xl border border-border bg-muted/40 p-3">
                <MapPin className="h-4 w-4 text-primary" />
                <p className="mt-2 text-sm font-bold text-foreground">Local by design</p>
                <p className="text-xs text-muted-foreground">Radius-based discovery</p>
              </div>
              <div className="rounded-2xl border border-border bg-muted/40 p-3">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <p className="mt-2 text-sm font-bold text-foreground">Privacy first</p>
                <p className="text-xs text-muted-foreground">You control visibility</p>
              </div>
              <div className="rounded-2xl border border-border bg-muted/40 p-3">
                <Sparkles className="h-4 w-4 text-primary" />
                <p className="mt-2 text-sm font-bold text-foreground">Meaningful matches</p>
                <p className="text-xs text-muted-foreground">Values over noise</p>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="flex items-center justify-center">
              <img
                src="/LocalCouple.png?v=2"
                alt="Happy couple illustration"
                draggable={false}
                className="mx-auto w-full max-w-md select-none object-contain lg:max-w-none"
              />
            </div>
            <div className="mx-auto mt-4 w-[92%] rounded-2xl border border-border bg-card p-4 shadow-sm sm:mt-5 sm:w-3/4">
              <p className="text-sm font-bold text-foreground">Built for your local community</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Discover people nearby without losing the cultural context that matters to you.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
