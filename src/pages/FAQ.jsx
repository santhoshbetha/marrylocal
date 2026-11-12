import { FAQSection } from '@/components/FAQSection';

export function FAQ() {
  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl border border-border/40 bg-card shadow-xs">
        <FAQSection />
      </div>
    </div>
  );
}

export default FAQ;
