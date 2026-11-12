import { useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Shield, Clock, CreditCard, RefreshCw } from 'lucide-react';

function Cancellation() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <Card className="bg-card text-foreground border border-border/50 rounded-3xl overflow-hidden shadow-sm">
        <CardHeader className="bg-card px-6 py-8 border-b border-border/60 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl text-foreground">Cancellation Policy</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Our commitment to fair and transparent refund practices
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-8">
          {/* Last Updated */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/40 border border-border/60 px-4 py-2 rounded-xl">
            <Clock className="w-4 h-4" />
            <span>Last updated on 27-10-2025 08:27:00</span>
          </div>

          {/* Main Policy Statement */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 text-primary rounded-xl flex-shrink-0">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-foreground">
                  Liberal Cancellation Policy
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  MARRYLOCAL believes in helping its users as far as possible, and has therefore a
                  liberal cancellation policy.
                </p>
              </div>
            </div>
          </div>

          {/* Policy Details */}
          <div className="space-y-6">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 text-primary rounded-xl flex-shrink-0">
                <CreditCard className="w-5 h-5 text-primary" />
              </div>
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-foreground">Current Payment Model</h3>
                <div className="bg-muted/40 border border-border/80 p-5 rounded-2xl space-y-2 text-muted-foreground text-base leading-relaxed">
                  <p className="text-muted-foreground leading-relaxed">
                    Currently there is no monthly subscription payment model in MARRYLOCAL. We will
                    implement low cost payment model in the future if required to run this app.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 text-primary rounded-xl flex-shrink-0">
                <RefreshCw className="w-5 h-5 text-primary" />
              </div>
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-foreground">Service Fee Refunds</h3>
                <div className="bg-muted/40 border border-border/80 p-5 rounded-2xl space-y-2 text-muted-foreground text-base leading-relaxed">
                  <p className="text-muted-foreground leading-relaxed">
                    Currently we charge service fees when there are more than 300 matches in your
                    area (city). The amount can be refunded if the payment has been made by mistake
                    and contacted immediately after paying via email not more than 1 day.
                  </p>
                  <div className="flex items-center gap-2 text-sm text-primary font-medium">
                    <Clock className="w-4 h-4" />
                    <span>
                      It'll take 3-5 days for the refund to be processed to the end customer.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-muted/40 border border-border/80 p-5 rounded-2xl space-y-2 text-muted-foreground text-base leading-relaxed">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-primary/10 text-primary rounded-xl">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-primary">Need Help?</h3>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about our cancellation policy or need to request a refund,
              please contact us immediately via email within 1 day of payment.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default Cancellation;
