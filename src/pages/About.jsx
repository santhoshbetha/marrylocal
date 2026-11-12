import { useEffect } from 'react';
import { useAuth } from '../store/authStore';
import { Footer } from '../components/Footer';
import ScrollToTop from 'react-scroll-to-top';
import { Heart, MapPin, Shield, Users, Share2, Globe, Lock, Sparkles } from 'lucide-react';

const FEATURES = [
  {
    icon: MapPin,
    title: 'Location-Based Matching',
    description:
      'Find matches within your preferred radius. We use location context to show compatible people from your city and nearby areas.',
  },
  {
    icon: Lock,
    title: 'Privacy Control',
    description:
      'You decide which contact details are visible. Set preferences for phone, Instagram, and Facebook while keeping communication comfortable.',
  },
  {
    icon: Shield,
    title: 'Verified & Safe',
    description:
      'Every profile is designed around one real person. Verification helps reduce duplicates, fake profiles, and matchmaking agents.',
  },
  {
    icon: Globe,
    title: 'Inclusive Platform',
    description:
      'Language, community, and background should not block a meaningful connection. We focus on compatibility, values, and proximity.',
  },
  {
    icon: Heart,
    title: 'Built with Care',
    description:
      'MarryLocal is built to help people find long-term relationships with intention, respect, and a calm experience.',
  },
  {
    icon: Share2,
    title: 'Community Driven',
    description:
      'Share MarryLocal with people you trust. Thoughtful recommendations help more members find the right local match.',
  },
];

function About() {
  const { user } = useAuth();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <div className="flex min-h-screen flex-col bg-background">
        <ScrollToTop smooth />

        <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
          <section className="rounded-3xl border border-border bg-card p-8 shadow-xs dark:border-border">
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Sparkles className="h-6 w-6" />
              </span>
              <h1 className="mt-4 text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                About MarryLocal
              </h1>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                MarryLocal connects people who want meaningful local relationships. We combine
                proximity, shared values, and clear privacy controls so members can explore matches
                with confidence.
              </p>
            </div>
          </section>

          <section className="mt-8 rounded-3xl border border-border bg-card p-8 shadow-xs dark:border-border">
            <h2 className="text-3xl font-black tracking-tight text-foreground">Our Mission</h2>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground">
              We believe lasting relationships start with shared context. Language, community, and
              background can matter, but so do values, respect, and the practical reality of living
              near one another. MarryLocal brings those pieces together in one focused experience.
            </p>
          </section>

          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(feature => {
              const Icon = feature.icon;

              return (
                <article
                  key={feature.title}
                  className="rounded-3xl border border-border bg-card p-8 shadow-xs dark:border-border"
                >
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-xl font-black tracking-tight text-foreground">
                    {feature.title}
                  </h3>
                  <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </article>
              );
            })}
          </div>

          <section className="mt-8 rounded-3xl border border-border bg-card p-8 shadow-xs dark:border-border">
            <h2 className="text-3xl font-black tracking-tight text-foreground">
              Our Vision for the Future
            </h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-border bg-muted/40 p-5">
                <Users className="h-5 w-5 text-primary" />
                <p className="mt-3 text-sm font-bold text-foreground">Modern local matching</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Make nearby discovery feel natural, clear, and respectful.
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-muted/40 p-5">
                <Shield className="h-5 w-5 text-primary" />
                <p className="mt-3 text-sm font-bold text-foreground">Trust through verification</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Keep safety and accountability at the center of every interaction.
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-muted/40 p-5">
                <Heart className="h-5 w-5 text-primary" />
                <p className="mt-3 text-sm font-bold text-foreground">Connections that last</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Help members build long-term relationships with shared values.
                </p>
              </div>
            </div>
          </section>
        </div>

        {!user ? <Footer /> : null}
      </div>
    </>
  );
}

export default About;
