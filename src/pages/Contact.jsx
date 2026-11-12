import { useEffect } from 'react';
import { Footer } from '../components/Footer';
import { useAuth } from '../store/authStore';
import { Button } from '@/components/ui/button';
import { Mail, MessageSquare, Users, Heart, Clock, CheckCircle } from 'lucide-react';

function Contact() {
  const { user } = useAuth();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <div className="flex min-h-screen flex-col bg-background">
        <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
          <section className="rounded-3xl border border-border bg-card p-8 shadow-xs dark:border-border">
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <MessageSquare className="h-6 w-6" />
              </span>
              <h1 className="mt-4 text-3xl font-black tracking-tight text-foreground">
                Get in touch
              </h1>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                Have a question, suggestion, or need help with your account? Send us a message and
                we will get back to you.
              </p>
            </div>
          </section>

          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <article className="rounded-3xl border border-border bg-card p-8 shadow-xs dark:border-border">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Mail className="h-5 w-5" />
              </span>
              <h2 className="mt-4 text-xl font-black tracking-tight text-foreground">
                General inquiries
              </h2>
              <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                Questions, suggestions, or feedback about MarryLocal.
              </p>
              <a
                href="mailto:contact@marrylocal.in"
                className="mt-4 inline-flex text-sm font-bold text-foreground underline-offset-4 hover:underline"
              >
                contact@marrylocal.in
              </a>
            </article>

            <article className="rounded-3xl border border-border bg-card p-8 shadow-xs dark:border-border">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Users className="h-5 w-5" />
              </span>
              <h2 className="mt-4 text-xl font-black tracking-tight text-foreground">
                Developer support
              </h2>
              <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                For developers interested in contributing to the platform.
              </p>
              <a
                href="mailto:developers@marrylocal.in"
                className="mt-4 inline-flex text-sm font-bold text-foreground underline-offset-4 hover:underline"
              >
                developers@marrylocal.in
              </a>
            </article>

            <article className="rounded-3xl border border-border bg-card p-8 shadow-xs dark:border-border">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Clock className="h-5 w-5" />
              </span>
              <h2 className="mt-4 text-xl font-black tracking-tight text-foreground">
                Response time
              </h2>
              <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                We usually respond within 24 to 48 hours.
              </p>
              <p className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-foreground">
                <CheckCircle className="h-4 w-4 text-primary" />
                Support is monitored daily
              </p>
            </article>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <section className="rounded-3xl border border-border bg-card p-8 shadow-xs dark:border-border">
              <h2 className="text-3xl font-black tracking-tight text-foreground">
                Contact us directly
              </h2>
              <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                The fastest way to reach the team is by email. Include your account email and a
                short description of the issue.
              </p>
              <Button
                asChild
                className="mt-6 h-11 rounded-xl bg-primary px-6 text-primary-foreground font-bold shadow-xs hover:bg-primary/90"
              >
                <a href="mailto:contact@marrylocal.in">
                  <Mail className="mr-2 h-4 w-4" />
                  contact@marrylocal.in
                </a>
              </Button>
            </section>

            <div className="space-y-6">
              <section className="rounded-3xl border border-border bg-card p-8 shadow-xs dark:border-border">
                <h2 className="text-xl font-black tracking-tight text-foreground">
                  Common questions
                </h2>
                <div className="mt-5 space-y-5">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">
                      How do I report a suspicious profile?
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      Use the report action on the profile or email us with the profile details.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">
                      Can I change my location settings?
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      Yes. Update your location preferences from the account settings area.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Is my data secure?</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      We limit public contact exposure and keep private account data behind
                      authenticated endpoints.
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-border bg-card p-8 shadow-xs dark:border-border">
                <h2 className="text-xl font-black tracking-tight text-foreground">Follow us</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Stay connected and share MarryLocal with people you trust.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button variant="outline" size="sm" className="rounded-xl font-bold">
                    WhatsApp
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-xl font-bold">
                    Instagram
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-xl font-bold">
                    Facebook
                  </Button>
                </div>
              </section>

              <section className="rounded-3xl border border-border bg-card p-8 shadow-xs dark:border-border">
                <Heart className="h-6 w-6 text-primary" />
                <h2 className="mt-3 text-xl font-black tracking-tight text-foreground">
                  Our commitment
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  We are building a safe, inclusive space for genuine connections. Your trust and
                  comfort remain the priority.
                </p>
              </section>
            </div>
          </div>
        </div>

        {!user ? <Footer /> : null}
      </div>
    </>
  );
}

export default Contact;
