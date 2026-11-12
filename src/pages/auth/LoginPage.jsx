import { useState } from 'react';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Eye, EyeOff, Loader2, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { apiClient, describeApiError } from '@/api/client';
import { useAuthStore } from '@/store/authStore';

const LoginSchema = Yup.object({
  email: Yup.string().trim().email('Invalid email format').required('Email address is required'),
  password: Yup.string()
    .min(8, 'Password must be at least 8 characters')
    .required('Password is required'),
});

function LoginPage() {
  const navigate = useNavigate();
  const setAuthSession = useAuthStore(state => state.login);
  const [showPassword, setShowPassword] = useState(false);

  const loginMutation = useMutation({
    mutationFn: async credentials => {
      const response = await apiClient.post('/api/v1/auth/login', {
        user: {
          email: credentials.email.trim().toLowerCase(),
          password: credentials.password,
        },
      });

      const payload = response.data?.data ?? response.data;

      if (!payload?.token) {
        throw new Error('Login did not return a session token.');
      }

      return payload;
    },
    onSuccess: payload => {
      setAuthSession(payload.token, payload.user);
      toast.success('Welcome back!');

      const isAdmin = String(payload.user?.role ?? '').toLowerCase() === 'admin';
      navigate(isAdmin ? '/admin' : '/dashboard/search', { replace: true });
    },
    onError: error => {
      toast.error(describeApiError(error, 'Invalid email or password.'));
    },
  });

  const submitLogin = (values, actions) => {
    loginMutation.mutate(values, {
      onSettled: () => actions.setSubmitting(false),
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-sm sm:p-8">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-accent-foreground">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">Welcome back</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to continue to your local matchmaking dashboard.
          </p>
        </div>

        <Formik
          initialValues={{ email: '', password: '' }}
          validationSchema={LoginSchema}
          onSubmit={submitLogin}
        >
          {({ values, errors, touched, handleChange, handleBlur, handleSubmit, isSubmitting }) => (
            <form noValidate onSubmit={handleSubmit} className="grid gap-5">
              <div className="grid gap-2">
                <Label htmlFor="login-email">Email address</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
                  <Input
                    id="login-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    className="h-11 rounded-xl pl-9"
                    value={values.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    aria-invalid={Boolean(touched.email && errors.email)}
                  />
                </div>
                {touched.email && errors.email && (
                  <p className="text-sm font-medium text-red-700" role="alert">
                    {errors.email}
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="login-password">Password</Label>
                  <Link
                    to="/forgot-password"
                    className="text-sm font-semibold text-amber-700 underline-offset-4 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>

                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
                  <Input
                    id="login-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    className="h-11 rounded-xl px-9"
                    value={values.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    aria-invalid={Boolean(touched.password && errors.password)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(visible => !visible)}
                    className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {touched.password && errors.password && (
                  <p className="text-sm font-medium text-red-700" role="alert">
                    {errors.password}
                  </p>
                )}
              </div>

              {loginMutation.isError && (
                <div
                  className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700"
                  role="alert"
                >
                  {describeApiError(loginMutation.error, 'Invalid email or password.')}
                </div>
              )}

              <Button
                type="submit"
                disabled={isSubmitting || loginMutation.isPending}
                className="h-12 w-full rounded-2xl bg-amber-400 text-slate-900 dark:text-slate-900 font-bold shadow-xs transition-all duration-300 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loginMutation.isPending || isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="mr-2 h-4 w-4" />
                )}
                Sign In
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                New to MarryLocal?{' '}
                <Link
                  to="/signup"
                  className="font-semibold text-amber-700 underline-offset-4 hover:underline"
                >
                  Create an account
                </Link>
              </p>
            </form>
          )}
        </Formik>
      </div>
    </div>
  );
}

export default LoginPage;
