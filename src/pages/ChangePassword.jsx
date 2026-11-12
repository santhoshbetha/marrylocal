import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { api, describeApiError } from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import { PasswordStrengthIndicator } from '@/components/PasswordStrengthIndicator';

function ChangePassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const isResetMode = Boolean(token);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const login = useAuthStore(state => state.login);
  const clearSession = useAuthStore(state => state.clearSession);
  const [done, setDone] = useState(false);

  const formik = useFormik({
    initialValues: { current_password: '', password: '', confirmPassword: '' },
    validationSchema: Yup.object({
      ...(isResetMode
        ? {}
        : {
            current_password: Yup.string().required('Current password is required'),
          }),
      password: Yup.string()
        .min(12, 'Password must be at least 12 characters')
        .required('Password is required'),
      confirmPassword: Yup.string()
        .oneOf([Yup.ref('password'), null], 'Passwords must match')
        .required('Please confirm your password'),
    }),
    onSubmit: async (values, actions) => {
      try {
        if (isResetMode) {
          await api.put(`/api/v1/auth/reset-password/${encodeURIComponent(token)}`, {
            user: {
              password: values.password,
              password_confirmation: values.confirmPassword,
            },
          });

          clearSession();
          setDone(true);
          toast.success('Password updated. Please sign in again.');
          window.setTimeout(() => navigate('/login', { replace: true }), 1200);
        } else {
          const response = await api.put('/api/v1/auth/password', {
            user: {
              current_password: values.current_password,
              password: values.password,
              password_confirmation: values.confirmPassword,
            },
          });

          const payload = response.data?.data;

          if (payload?.token) {
            login(payload.token, payload.user);
          }

          toast.success('Password updated successfully.');
          actions.resetForm();
        }
      } catch (error) {
        toast.error(describeApiError(error, 'Could not update your password.'));
      } finally {
        actions.setSubmitting(false);
      }
    },
  });

  if (!isResetMode && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
        <Card className="w-full max-w-md rounded-3xl border shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl font-black">Change your password</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>Sign in first, then return to this page to change your password.</p>
            <Button
              asChild
              className="h-11 w-full rounded-xl bg-amber-400 text-slate-900 dark:text-slate-900 font-bold hover:bg-amber-300"
            >
              <Link to="/login">Go to sign in</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md rounded-3xl border shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-black">
            {isResetMode ? 'Choose a new password' : 'Change your password'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {done ? (
            <p className="text-sm text-muted-foreground">
              Password updated. Redirecting to sign in...
            </p>
          ) : (
            <form onSubmit={formik.handleSubmit} className="grid gap-4">
              {!isResetMode && (
                <div className="grid gap-2">
                  <Label htmlFor="current_password">Current password</Label>
                  <Input
                    id="current_password"
                    name="current_password"
                    type="password"
                    autoComplete="current-password"
                    value={formik.values.current_password}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                  />
                  {(formik.touched.current_password || formik.submitCount > 0) &&
                    formik.errors.current_password && (
                      <p className="text-sm text-red-700">{formik.errors.current_password}</p>
                    )}
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="password">New password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  value={formik.values.password}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
                <PasswordStrengthIndicator password={formik.values.password} />
                {(formik.touched.password || formik.submitCount > 0) && formik.errors.password && (
                  <p className="text-sm text-red-700">{formik.errors.password}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="confirmPassword">Confirm new password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={formik.values.confirmPassword}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
                {(formik.touched.confirmPassword || formik.submitCount > 0) &&
                  formik.errors.confirmPassword && (
                    <p className="text-sm text-red-700">{formik.errors.confirmPassword}</p>
                  )}
              </div>

              <Button
                type="submit"
                data-testid="change-password-submit"
                disabled={formik.isSubmitting}
                className="h-11 rounded-xl bg-amber-400 text-slate-900 dark:text-slate-900 font-bold hover:bg-amber-300"
              >
                {isResetMode ? 'Update password' : 'Save password'}
              </Button>

              {!isResetMode ? (
                <Link
                  to="/forgot-password"
                  className="text-center text-sm font-semibold text-amber-700 underline-offset-4 hover:underline"
                >
                  Forgot your current password?
                </Link>
              ) : null}
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default ChangePassword;
