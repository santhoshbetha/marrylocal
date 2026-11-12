import { FaFacebook, FaInstagram, FaTwitter } from 'react-icons/fa';
import { Mail, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';

const linkClass =
  'text-sm text-muted-foreground/80 dark:text-muted-foreground/70 hover:text-primary transition-colors duration-200';

const headingClass = 'text-sm font-bold text-foreground';

export function Footer() {
  return (
    <footer className="w-full bg-card border-t border-border/40 px-6 py-8 mt-auto dark:bg-card/40">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4 sm:col-span-2 lg:col-span-1">
            <Link to="/" className="flex items-center gap-1">
              <span className="relative flex h-7 shrink-0 items-center">
                <img
                  src="/LogoTeal32.png"
                  alt="MarryLocal Logo"
                  className="h-7 w-auto object-contain dark:hidden"
                />
                <img
                  src="/LogoYellow32.png"
                  alt="MarryLocal Logo"
                  className="hidden h-7 w-auto object-contain dark:block"
                />
              </span>
              <span className="font-custom text-2xl font-black tracking-wide text-foreground">
                <span className="text-orange-700 dark:text-slate-100">
                  Marry<span className="text-primary">Local</span>
                </span>
              </span>
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground/80 dark:text-muted-foreground/70">
              Find meaningful connections in your locality with freedom and choice.
            </p>
            <div className="flex items-center gap-4">
              <FaInstagram
                className="h-4 w-4 text-primary transition-colors duration-200 hover:text-primary/70 dark:text-primary"
                aria-label="Instagram"
              />
              <FaFacebook
                className="h-4 w-4 text-primary transition-colors duration-200 hover:text-primary/70 dark:text-primary"
                aria-label="Facebook"
              />
              <FaTwitter
                className="h-4 w-4 text-primary transition-colors duration-200 hover:text-primary/70 dark:text-primary"
                aria-label="Twitter"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className={headingClass}>Useful Links</h4>
            <div className="flex flex-col gap-2">
              <Link to="/" className={linkClass}>
                Home
              </Link>
              <Link to="/about" className={linkClass}>
                About us
              </Link>
              <Link to="/contact" className={linkClass}>
                Contact
              </Link>
              <Link to="/terms" className={linkClass}>
                Terms of service
              </Link>
              <Link to="/privacy" className={linkClass}>
                Privacy policy
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className={headingClass}>Support</h4>
            <div className="flex flex-col gap-2">
              <Link to="/contact" className={linkClass}>
                Help Center
              </Link>
              <Link to="/contact" className={linkClass}>
                Report Issues
              </Link>
              <Link to="/cancellation" className={linkClass}>
                Cancellation
              </Link>
            </div>
          </div>

          <div className="space-y-4" id="contact">
            <h4 className={headingClass}>Contact Us</h4>
            <div className="flex flex-col gap-3 text-sm">
              <span className="flex items-center gap-2 text-muted-foreground/80 dark:text-muted-foreground/70">
                <Mail className="h-4 w-4 text-primary" />
                contact@marrylocal.in
              </span>
              <span className="flex items-center gap-2 text-muted-foreground/80 dark:text-muted-foreground/70">
                <Phone className="h-4 w-4 text-primary" />
                +91 98765 43210
              </span>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-border/40 pt-6 text-center">
          <p className="text-sm text-muted-foreground/80 dark:text-muted-foreground/70">
            &copy; {new Date().getFullYear()} Copyright MarryLocal (MEERA APPS). All Rights Reserved
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
