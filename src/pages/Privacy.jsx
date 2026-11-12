import { useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Shield,
  Clock,
  Eye,
  Database,
  Users,
  Lock,
  Mail,
  AlertTriangle,
  MapPin,
  CalendarDays,
  CreditCard,
  HeartHandshake,
} from 'lucide-react';

function Privacy() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <Card className="bg-card text-foreground border border-border/60 rounded-3xl overflow-hidden shadow-sm">
        <CardHeader className="bg-card px-6 py-8 border-b border-border/60 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl text-foreground">Privacy Policy</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                How we protect and handle your personal information
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/40 border border-border/60 px-4 py-2 rounded-xl">
            <Clock className="w-4 h-4" />
            <span>Last updated on 11-11-2026</span>
          </div>

          {/* Introduction */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 text-primary rounded-xl flex-shrink-0">
                <Eye className="w-5 h-5 text-primary" />
              </div>
              <div className="space-y-3">
                <p className="text-muted-foreground leading-relaxed">
                  This Privacy Policy ("Policy") describes how MarryLocal.in collects, uses, stores,
                  and shares the information you provide when you use our website and matchmaking
                  services. By using the website or availing our services, you agree to this Policy
                  and consent to the handling of your information as described here.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  We are committed to protecting your privacy in accordance with applicable Indian
                  laws. Please read this Policy together with our Terms and Conditions.
                </p>
              </div>
            </div>
          </div>

          {/* Data Collection */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 text-primary rounded-xl flex-shrink-0">
                <Database className="w-5 h-5 text-primary" />
              </div>
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-foreground">
                  What data is being collected
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  We may collect the following information from you:
                </p>
                <div className="bg-muted/40 border border-border/60 p-5 rounded-2xl space-y-2 text-muted-foreground text-base leading-relaxed">
                  <div className="text-muted-foreground leading-relaxed">
                    Name, email address, phone number, and account credentials.
                  </div>
                  <div className="text-muted-foreground leading-relaxed">
                    Profile details such as gender, community, languages, lifestyle preferences,
                    education, occupation, and the partner preferences you choose to share.
                  </div>
                  <div className="text-muted-foreground leading-relaxed">
                    Age derived from the date of birth you provide. We persist only your integer
                    age, not your raw birth date.
                  </div>
                  <div className="text-muted-foreground leading-relaxed">
                    Approximate location derived from the city and coordinates you provide, fuzzed
                    within approximately 5 km before storage.
                  </div>
                  <div className="text-muted-foreground leading-relaxed">
                    Photos and verification documents you choose to upload.
                  </div>
                  <div className="text-muted-foreground leading-relaxed">
                    Payment references and service-fee transaction records. We do not store card,
                    debit card, or similar payment credentials.
                  </div>
                  <div className="text-muted-foreground leading-relaxed">
                    Activity needed to operate matchmaking features, such as Likes, Mutual Matches,
                    Shortlists, profile views, and moderation records.
                  </div>
                </div>
                <div className="bg-muted/40 border border-border/60 p-5 rounded-2xl space-y-2 text-muted-foreground text-base leading-relaxed">
                  <div className="flex items-center gap-2 text-foreground font-medium">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Important Note</span>
                  </div>
                  <p className="text-muted-foreground mt-2 leading-relaxed">
                    Notwithstanding anything under this Policy or applicable Indian laws, we do not
                    store credit card, debit card, or other similar card data. All data collection
                    is carried out in accordance with applicable laws and guidelines.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Location privacy */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 text-primary rounded-xl flex-shrink-0">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-foreground">
                  Location privacy and approximate coordinates
                </h3>
                <div className="bg-muted/40 border border-border/60 p-5 rounded-2xl space-y-2 text-muted-foreground text-base leading-relaxed">
                  <p className="text-muted-foreground leading-relaxed">
                    MarryLocal uses your location to place you in the correct city and local
                    discovery area. Coordinates are fuzzed by up to approximately 5 km before they
                    are stored. Exact GPS coordinates are never stored, and we do not expose a
                    precise home location to other members.
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    The fuzzed coordinate is used for local matchmaking and distance filters. It is
                    not intended to identify your home, workplace, or any other precise location.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Age privacy */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 text-primary rounded-xl flex-shrink-0">
                <CalendarDays className="w-5 h-5 text-primary" />
              </div>
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-foreground">
                  Age and birth-date handling
                </h3>
                <div className="bg-muted/40 border border-border/60 p-5 rounded-2xl space-y-2 text-muted-foreground text-base leading-relaxed">
                  <p className="text-muted-foreground leading-relaxed">
                    When you provide a date of birth, we calculate your age and persist only the
                    integer age. The raw birth date is discarded. Any birth date displayed in the
                    app is a virtual, derived value for display purposes and is not a stored
                    birthday record.
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    We use age to enforce the minimum age requirement, apply age preferences, and
                    show relevant matches. We do not publish your exact date of birth.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Data Usage */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 text-primary rounded-xl flex-shrink-0">
                <Eye className="w-5 h-5 text-primary" />
              </div>
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-foreground">
                  What we do with the data we gather
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  We require this data to provide the goods and services offered by us, including
                  but not limited to:
                </p>
                <div className="bg-muted/40 border border-border/60 p-5 rounded-2xl space-y-2 text-muted-foreground text-base leading-relaxed">
                  <div className="text-muted-foreground leading-relaxed">
                    Creating and maintaining your account and profile.
                  </div>
                  <div className="text-muted-foreground leading-relaxed">
                    Showing compatible profiles, local discovery results, and matchmaking
                    suggestions.
                  </div>
                  <div className="text-muted-foreground leading-relaxed">
                    Operating Likes, Mutual Matches, Shortlists, profile views, notifications, and
                    moderation features.
                  </div>
                  <div className="text-muted-foreground leading-relaxed">
                    Processing verification reviews, service-fee payments, referrals, invoices, and
                    renewals.
                  </div>
                  <div className="text-muted-foreground leading-relaxed">
                    Improving our products and services and communicating updates, including
                    service-related notices and special offers.
                  </div>
                  <div className="text-muted-foreground leading-relaxed">
                    Internal record keeping, fraud prevention, safety, and legal compliance.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Matchmaking interactions */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 text-primary rounded-xl flex-shrink-0">
                <HeartHandshake className="w-5 h-5 text-primary" />
              </div>
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-foreground">Matchmaking interactions</h3>
                <div className="bg-muted/40 border border-border/60 p-5 rounded-2xl space-y-2 text-muted-foreground text-base leading-relaxed">
                  <p className="text-muted-foreground leading-relaxed">
                    Matchmaking currently focuses on Likes, Mutual Matches, Shortlists, and profile
                    views. We do not automatically share your phone number, email address, or other
                    contact details with other members; you decide when and whether to share them.
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    Likes, matches, shortlist activity, and profile views may be visible to the
                    relevant members as part of the service. Moderation records are used to keep the
                    platform safe and are handled under this Policy.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Payments */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 text-primary rounded-xl flex-shrink-0">
                <CreditCard className="w-5 h-5 text-primary" />
              </div>
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-foreground">
                  Service fees and payment data
                </h3>
                <div className="bg-muted/40 border border-border/60 p-5 rounded-2xl space-y-2 text-muted-foreground text-base leading-relaxed">
                  <p className="text-muted-foreground leading-relaxed">
                    Core platform access is free initially. Once the active opposite-gender member
                    count in your city exceeds 250 members, an annual service fee of ₹500 INR (plus
                    applicable GST, minus ₹50 per verified referral) applies. The rate locked in for
                    your account at registration is shown on the Service Fees page.
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    Payments are processed through the payment provider shown at checkout. We store
                    transaction references, amounts, invoice records, and payment status. We do not
                    store your card, debit card, or similar payment credentials.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Data Sharing */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 text-primary rounded-xl flex-shrink-0">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-foreground">
                  Who do we share your data with
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  We may share your information or data with:
                </p>
                <div className="bg-muted/40 border border-border/60 p-5 rounded-2xl space-y-2 text-muted-foreground text-base leading-relaxed">
                  <div className="text-muted-foreground leading-relaxed">
                    Governmental bodies, regulatory authorities, and law enforcement authorities
                    where required by law or for compliance.
                  </div>
                  <div className="text-muted-foreground leading-relaxed">
                    Service providers that help us operate the platform, such as hosting, media
                    storage, payment processing, verification review, and communication providers,
                    under appropriate confidentiality obligations.
                  </div>
                  <div className="text-muted-foreground leading-relaxed">
                    Other members only to the extent needed to provide matchmaking features, using
                    the approximate location and profile information described in this Policy.
                  </div>
                  <div className="text-muted-foreground leading-relaxed">
                    A successor entity in connection with a merger, acquisition, restructuring, or
                    sale of assets, subject to this Policy.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* User Rights */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 text-primary rounded-xl flex-shrink-0">
                <Lock className="w-5 h-5 text-primary" />
              </div>
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-foreground">
                  Your rights relating to your data
                </h3>
                <div className="bg-muted/40 border border-border/60 p-5 rounded-2xl space-y-4 text-muted-foreground text-base leading-relaxed">
                  <div className="space-y-2">
                    <div className="font-medium text-foreground">Right to Review</div>
                    <p className="text-muted-foreground leading-relaxed">
                      You can review the data provided by you and request that we correct or amend
                      it, to the extent feasible as determined by us. We are not responsible for the
                      authenticity of the data or information you provide.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="font-medium text-foreground">Withdrawal of your consent</div>
                    <p className="text-muted-foreground leading-relaxed">
                      You can choose not to provide your data at any time, or withdraw consent
                      previously provided, by writing to contact@marrylocal.in. If you choose not to
                      provide data or later withdraw consent, we may not be able to provide our
                      services. These rights are subject to our compliance with applicable laws.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="font-medium text-foreground">Account deletion</div>
                    <p className="text-muted-foreground leading-relaxed">
                      You may request deletion of your account through the deletion controls in the
                      app or by contacting us. We may retain records where required for legal,
                      fraud-prevention, payment, or compliance purposes.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Data Retention */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 text-primary rounded-xl flex-shrink-0">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-foreground">
                  How long will we retain your information or data?
                </h3>
                <div className="bg-muted/40 border border-border/60 p-5 rounded-2xl space-y-2 text-muted-foreground text-base leading-relaxed">
                  <p className="text-muted-foreground leading-relaxed">
                    We may retain your information or data (i) for as long as we provide goods and
                    services to you, and (ii) as permitted under applicable law, even after you
                    terminate your relationship with us. We process retained information in
                    accordance with applicable laws and this Policy.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Data Security */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 text-primary rounded-xl flex-shrink-0">
                <Lock className="w-5 h-5 text-primary" />
              </div>
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-foreground">Data Security</h3>
                <div className="bg-muted/40 border border-border/60 p-5 rounded-2xl space-y-2 text-muted-foreground text-base leading-relaxed">
                  <p className="text-muted-foreground leading-relaxed">
                    We use commercially reasonable and legally required precautions, including
                    physical, technical, and administrative safeguards, to preserve the integrity
                    and security of your information and data against foreseeable risks such as
                    unauthorized access.
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    Please be aware that the website and data storage run on software, hardware, and
                    networks that may require maintenance or experience problems or security
                    breaches beyond our control. We cannot guarantee the absolute security of
                    information on or sent from the website.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 text-primary rounded-xl flex-shrink-0">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-foreground">
                  Queries / Grievance Officer
                </h3>
                <div className="bg-muted/40 border border-border/60 p-5 rounded-2xl space-y-2 text-muted-foreground text-base leading-relaxed">
                  <p className="text-muted-foreground leading-relaxed">
                    For queries, questions, or grievances about this Policy, contact us at{' '}
                    <span className="font-semibold text-foreground">contact@marrylocal.in</span>.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Acceptance and Additional Information */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 text-primary rounded-xl flex-shrink-0">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-foreground">
                  Acceptance of Privacy Policy
                </h3>
                <div className="bg-muted/40 border border-border/60 p-5 rounded-2xl space-y-4 text-muted-foreground text-base leading-relaxed">
                  <p className="text-muted-foreground leading-relaxed">
                    Each time you access, use, upload information or photos, or browse profiles on
                    the site, you signify your acceptance of the then-current Privacy Policy. If you
                    do not accept this Privacy Policy, you are not authorized to use the site and
                    must discontinue use immediately.
                  </p>
                  <div className="bg-card/70 border border-border/60 p-5 rounded-2xl space-y-2">
                    <div className="flex items-center gap-2 text-foreground font-medium">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Age Restriction</span>
                    </div>
                    <p className="text-muted-foreground mt-2 leading-relaxed">
                      The site is not for anyone under the age of 18 and does not knowingly collect
                      personal information from individuals under 18.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Policy Changes */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 text-primary rounded-xl flex-shrink-0">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-foreground">
                  Policy Changes and Acceptance
                </h3>
                <div className="bg-muted/40 border border-border/60 p-5 rounded-2xl space-y-2 text-muted-foreground text-base leading-relaxed">
                  <p className="text-muted-foreground leading-relaxed">
                    This Privacy Policy may be revised from time to time as we add new features and
                    services or as privacy and security best practices evolve. We display an
                    effective date so you can see when changes take effect. Please review this
                    Policy regularly. Each time you access, use, or browse the site, you signify
                    your acceptance of the then-current changes applying to your personal
                    information from the effective date of those changes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default Privacy;
