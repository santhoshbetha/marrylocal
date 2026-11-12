import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Shield, Users } from 'lucide-react';

export function FeaturesSection() {
  return (
    <section className="py-8 sm:py-12 lg:py-20 bg-muted/30">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="text-center space-y-3 sm:space-y-4 mb-8 sm:mb-12 lg:mb-16">
          <h2 className="text-xl sm:text-2xl lg:text-4xl font-serif font-bold text-foreground">
            Why Choose MarryLocal?
          </h2>
          <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto text-pretty px-2 sm:px-0">
            We've built a platform that prioritizes authentic connections, safety, and meaningful
            relationships in your local community.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="pb-4 sm:pb-6 lg:pb-0 text-center space-y-3 sm:space-y-4 px-3 sm:px-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto">
                <MapPin className="h-5 w-5 sm:h-6 sm:w-6 text-accent" />
              </div>
              <h3 className="text-base sm:text-lg lg:text-xl font-semibold">
                Location-Based Matching
              </h3>
              <p className="text-xs sm:text-sm lg:text-base text-muted-foreground text-pretty">
                Find matches in your immediate area using precise geo-location technology for
                meaningful local connections.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="pb-4 sm:pb-6 lg:pb-8 text-center space-y-3 sm:space-y-4 px-3 sm:px-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto">
                <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-accent" />
              </div>
              <h3 className="text-base sm:text-lg lg:text-xl font-semibold">Verified Profiles</h3>
              <p className="text-xs sm:text-sm lg:text-base text-muted-foreground text-pretty">
                All profiles are verified{' '}
                <span className="hidden">using Aadhaar card or passport</span> to ensure
                authenticity and prevent scammers and spammers.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow sm:col-span-2 lg:col-span-1">
            <CardContent className="pb-4 sm:pb-6 lg:pb-8 text-center space-y-3 sm:space-y-4 px-3 sm:px-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto">
                <Users className="h-5 w-5 sm:h-6 sm:w-6 text-accent" />
              </div>
              <h3 className="text-base sm:text-lg lg:text-xl font-semibold">Diverse Community</h3>
              <p className="text-sm sm:text-base text-muted-foreground text-pretty">
                Connect with people from all backgrounds and languages.it is designed for middle
                class and diverse populations across India.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
