import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export function FAQSection() {
  return (
    <section className="py-8 sm:py-12 lg:py-20 bg-muted/30">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="text-center space-y-3 sm:space-y-4 mb-8 sm:mb-12 lg:mb-16">
          <h2 className="text-2xl sm:text-3xl lg:text-5xl font-serif font-bold">
            Frequently Asked Questions
          </h2>
          <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto px-2 sm:px-0">
            Get answers to common questions about our platform and services.
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger className="text-lg font-bold tracking-tight text-foreground/90 hover:text-primary transition-colors duration-200">
                How does GPS location matching work?
              </AccordionTrigger>
              <AccordionContent>
                <p className="text-muted-foreground text-sm sm:text-base lg:text-lg leading-relaxed px-3 sm:px-4">
                  Our GPS location matching uses your device's location services to find potential
                  matches within your specified radius. You can set your preferred distance range
                  (10-200 km) and we'll show you profiles of verified users in that area. Your exact
                  location is never shared with other users - only the approximate distance is
                  displayed.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2">
              <AccordionTrigger className="text-lg font-bold tracking-tight text-foreground/90 hover:text-primary transition-colors duration-200">
                What verification documents are required?
              </AccordionTrigger>
              <AccordionContent>
                <p className="text-muted-foreground text-sm sm:text-base lg:text-lg leading-relaxed px-3 sm:px-4">
                  To ensure authenticity and safety, we require one government-issued ID for
                  verification: <span hidden>Aadhaar Card, </span>Passport, or Driver's License. All
                  documents are securely processed and deleted after verification. Your personal
                  information is never shared with other users.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3">
              <AccordionTrigger className="text-lg font-bold tracking-tight text-foreground/90 hover:text-primary transition-colors duration-200">
                How do I search for matches in my city?
              </AccordionTrigger>
              <AccordionContent>
                <p className="text-muted-foreground text-base sm:text-lg leading-relaxed px-3 sm:px-4">
                  After creating your profile, use search filters to find matches by city, age
                  range, education etc.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4">
              <AccordionTrigger className="text-lg font-bold tracking-tight text-foreground/90 hover:text-primary transition-colors duration-200">
                Is MarryLocal free to use?
              </AccordionTrigger>
              <AccordionContent>
                <p className="text-muted-foreground text-base sm:text-lg leading-relaxed px-3 sm:px-4">
                  MarryLocal is curently free. You can create a profile, browse matches, and contact
                  matches.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5">
              <AccordionTrigger className="text-lg font-bold tracking-tight text-foreground/90 hover:text-primary transition-colors duration-200">
                How do you ensure user safety and privacy?
              </AccordionTrigger>
              <AccordionContent>
                <p className="text-muted-foreground text-base sm:text-lg leading-relaxed px-3 sm:px-4">
                  Safety is our top priority. All profiles are manually reviewed and verified. Your
                  personal contact information is never shared without your consent.{' '}
                </p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-6">
              <AccordionTrigger className="text-lg font-bold tracking-tight text-foreground/90 hover:text-primary transition-colors duration-200">
                How does MarryLocal handle my exact location and private birth details?
              </AccordionTrigger>
              <AccordionContent>
                <p className="text-muted-foreground text-sm sm:text-base lg:text-lg leading-relaxed px-3 sm:px-4">
                  Your privacy is our priority. We apply a 5km mathematical blur to all location
                  metrics, ensuring your exact street coordinates are never saved. Furthermore, your
                  exact birthday is handled strictly in transient memory to verify age boundaries
                  and is never written to database storage.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    </section>
  );
}
