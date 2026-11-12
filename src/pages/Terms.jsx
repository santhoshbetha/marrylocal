import { useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { FileText, Clock, Shield, AlertTriangle, Mail, CreditCard } from 'lucide-react';

function Terms() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <Card className="bg-card text-foreground border border-border/50 rounded-3xl overflow-hidden shadow-sm">
        <CardHeader className="bg-card px-6 py-8 border-b border-border/60 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl text-foreground">Terms and Conditions</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Legal terms governing your use of MarryLocal services
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Last Updated */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/40 border border-border/60 px-4 py-2 rounded-xl">
            <Clock className="w-4 h-4" />
            <span>Last updated on 11-11-2026</span>
          </div>

          {/* Introduction */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 text-primary rounded-xl flex-shrink-0">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div className="space-y-3">
                <p className="text-muted-foreground leading-relaxed">
                  These Terms and Conditions, along with the Privacy Policy or other terms
                  ("Terms"), constitute a binding agreement between MarryLocal.in and you and relate
                  to your use of our website.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  By using our website and availing the Services, you agree that you have read and
                  accepted these Terms (including the Privacy Policy). We reserve the right to
                  modify these Terms at any time and without assigning any reason. It is your
                  responsibility to periodically review these Terms to stay informed of updates.
                </p>
                <div className="bg-muted/40 border border-border/60 p-5 rounded-2xl space-y-2 text-muted-foreground text-base leading-relaxed">
                  <div className="flex items-center gap-2 text-foreground font-medium">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Age Restriction</span>
                  </div>
                  <p className="text-muted-foreground mt-2">
                    This site is not for anyone under the age of 18 years.
                  </p>
                </div>
              </div>
            </div>
          </div>
          {/* Terms of Use */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 text-primary rounded-xl flex-shrink-0">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-foreground">Terms of Use</h3>
                <p className="text-muted-foreground leading-relaxed">
                  The use of this website or availing of our Services is subject to the following
                  terms of use:
                </p>
                <div className="bg-muted/40 border border-border/60 p-5 rounded-2xl space-y-2 text-muted-foreground text-base leading-relaxed">
                  <div className="text-muted-foreground leading-relaxed">
                    To access and use the Services, you agree to provide true, accurate and complete
                    information to us during and after registration, and you shall be responsible
                    for all acts done through the use of your registered account.
                  </div>
                  <div className="text-muted-foreground leading-relaxed">
                    Your use of our Services and the website is solely at your own risk and
                    discretion. You are required to independently assess and ensure that the
                    Services meet your requirements.
                  </div>
                  <div className="text-muted-foreground leading-relaxed">
                    The contents of the Website and the Services are proprietary to Us and you will
                    not have any authority to claim any intellectual property rights, title, or
                    interest in its contents.
                  </div>
                  <div className="text-muted-foreground leading-relaxed">
                    You agree to pay us the charges associated with availing the Services.
                  </div>
                  <div className="text-muted-foreground leading-relaxed">
                    You acknowledge that unauthorized use of the Website or the Services may lead to
                    action against you as per these Terms or applicable laws.
                  </div>
                  <div className="text-muted-foreground leading-relaxed">
                    You understand that upon initiating a transaction for availing the Services you
                    are entering into a legally binding and enforceable contract with us for the
                    Services.
                  </div>
                  <div className="text-muted-foreground leading-relaxed">
                    You shall be entitled to claim a refund of the payment made by you in case we
                    are not able to provide the Service. The timelines for such return and refund
                    will be according to the specific Service you have availed or within the time
                    period provided in our policies (as applicable). In case you do not raise a
                    refund claim within the stipulated time, then this would make you ineligible for
                    a refund.
                  </div>
                  <div className="text-muted-foreground leading-relaxed">
                    All concerns or communications relating to these Terms must be communicated to
                    us using the contact information provided on this website.
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Service Fees */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 text-primary rounded-xl flex-shrink-0">
                <CreditCard className="w-5 h-5 text-primary" />
              </div>
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-foreground">Service Fees</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Users enjoy free platform access initially. Once the active opposite-gender member
                  count in your city exceeds 250 members, an annual service fee of ₹500 INR (plus
                  applicable GST, minus ₹50 per verified referral) applies to continue using the
                  matchmaking Services.
                </p>
                <div className="bg-muted/40 border border-border/60 p-5 rounded-2xl space-y-2 text-muted-foreground text-base leading-relaxed">
                  <div className="text-muted-foreground leading-relaxed">
                    The base annual fee is ₹500 INR. Applicable GST is added at checkout, and each
                    verified referral credit reduces the fee by ₹50.
                  </div>
                  <div className="text-muted-foreground leading-relaxed">
                    The fee rate shown at registration is locked to your account and is displayed on
                    the Service Fees page and in the Terms acceptance dialog.
                  </div>
                  <div className="text-muted-foreground leading-relaxed">
                    Annual fees are payable through the payment methods made available on the
                    Service Fees page. We do not store your card, debit card, or similar payment
                    credentials.
                  </div>
                  <div className="text-muted-foreground leading-relaxed">
                    If a payment is not completed, paid access is limited or suspended until the
                    annual fee is paid. Paid access is valid for one year from the payment date and
                    must be renewed to continue using the Services.
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* User Conduct */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 text-primary rounded-xl flex-shrink-0">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-foreground">User Conduct</h3>
                <p className="text-muted-foreground leading-relaxed">
                  All users of the Site shall refrain from any and all conduct that is:
                </p>
                <div className="bg-muted/40 border border-border/60 p-5 rounded-2xl space-y-2 text-muted-foreground text-base leading-relaxed">
                  <div className="text-muted-foreground leading-relaxed">
                    Unlawful, threatening, abusive, harassing, defamatory, libelous, deceptive,
                    fraudulent, invasive of another person's privacy, tortious, contains explicit or
                    graphic depictions or accounts of sexual acts, or otherwise violates our rules
                    or policies.
                  </div>
                  <div className="text-muted-foreground leading-relaxed">
                    Posting inappropriate content like adult content or explicit adult material in
                    your profile.
                  </div>
                  <div className="text-muted-foreground leading-relaxed">
                    Posting any ad for products or services in the bio, use or sale of which is
                    prohibited by any law or regulation.
                  </div>
                  <div className="text-muted-foreground leading-relaxed">
                    Using any automated device, spider, robot, crawler, data mining tool, software
                    or routine to access, copy, or download any part of the Site.
                  </div>
                  <div className="text-muted-foreground leading-relaxed">
                    Taking any action creating a disproportionately large usage load on the Site.
                  </div>
                  <div className="text-muted-foreground leading-relaxed">
                    Posting any employment ads in the bio, violating the anti-discrimination
                    provisions of the Immigration and Nationality Act or messages which violate any
                    law or regulation.
                  </div>
                  <div className="text-muted-foreground leading-relaxed">
                    Using the Site to engage in or assist another individual or entity to engage in
                    fraudulent, abusive, manipulative or illegal activity.
                  </div>
                  <div className="text-muted-foreground leading-relaxed">
                    Posting free ads promoting links to commercial services or web sites except in
                    areas of the Site where such ads are expressly permitted.
                  </div>
                  <div className="text-muted-foreground leading-relaxed">
                    Posting any material advertising weapons the use, carrying, or advertising of
                    which is prohibited by law in the bio info.
                  </div>
                </div>
                <div className="bg-muted/40 border border-border/60 p-5 rounded-2xl space-y-2 text-muted-foreground text-base leading-relaxed">
                  <div className="flex items-center gap-2 text-foreground font-medium">
                    <Mail className="w-4 h-4" />
                    <span>Report Violations</span>
                  </div>
                  <p className="text-muted-foreground mt-2">
                    Please report any violations of these Terms to:{' '}
                    <span className="font-semibold">contact@marrylocal.in</span>
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

export default Terms;
