import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle, LogIn, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';

function RegistrationSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = useAuthStore(state => state.currentUser);
  const email = location.state?.email || currentUser?.email || '';

  const continueToVerification = () => {
    navigate('/verify-email', { state: { email } });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-sm sm:p-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <CheckCircle className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">
            Registration successful
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Welcome to MarryLocal. Your account has been created and is ready for verification.
          </p>
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-muted/40 px-4 py-3 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Verification email sent to
          </p>
          <p className="mt-1 break-all text-sm font-bold text-foreground">
            {email || 'your registered email address'}
          </p>
        </div>

        <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
          <div className="flex items-start gap-3">
            <Mail className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
            <div>
              <h2 className="text-sm font-bold text-blue-900">Next step: verify your email</h2>
              <p className="mt-1 text-sm leading-relaxed text-blue-700">
                Open the verification link in your inbox to activate your account, then finish your
                profile setup.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-3">
          <Button
            type="button"
            onClick={continueToVerification}
            className="h-11 w-full rounded-xl bg-amber-400 text-slate-900 dark:text-slate-900 font-bold hover:bg-amber-300"
          >
            Continue to Email Verification
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>

          <Button
            asChild
            variant="outline"
            className="h-11 w-full rounded-xl text-foreground font-bold"
          >
            <Link to="/login">
              <LogIn className="mr-2 h-4 w-4" />
              Go to Login
            </Link>
          </Button>
        </div>

        <p className="mt-5 text-center text-xs leading-relaxed text-muted-foreground">
          Did not receive the email? Check your spam folder, then resend it from the verification
          screen.
        </p>
      </div>
    </div>
  );
}

export default RegistrationSuccess;
