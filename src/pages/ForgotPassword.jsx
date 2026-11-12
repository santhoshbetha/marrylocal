import { useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { api, describeApiError } from '@/api/client';

export default function ForgotPassword() {
  const [sent, setSent] = useState(false);

  const formik = useFormik({
    initialValues: { email: '' },
    validationSchema: Yup.object({
      email: Yup.string().trim().email('Enter a valid email').required('Email is required'),
    }),
    onSubmit: async (values, actions) => {
      try {
        await api.post('/api/v1/auth/forgot-password', {
          email: values.email.trim().toLowerCase(),
        });
        setSent(true);
        toast.success('If an account exists, a reset link has been sent.');
      } catch (error) {
        toast.error(describeApiError(error, 'Could not request a reset link.'));
      } finally {
        actions.setSubmitting(false);
      }
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md rounded-3xl border shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-black">Reset your password</CardTitle>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>Check your inbox for the secure reset link. It expires in one hour.</p>
              <Link
                to="/login"
                className="font-semibold text-amber-700 underline-offset-4 hover:underline"
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={formik.handleSubmit} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formik.values.email}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
                {formik.touched.email && formik.errors.email && (
                  <p className="text-sm text-red-700">{formik.errors.email}</p>
                )}
              </div>
              <Button
                type="submit"
                disabled={formik.isSubmitting}
                className="h-11 rounded-xl bg-amber-400 text-slate-900 dark:text-slate-900 font-bold hover:bg-amber-300"
              >
                Send reset link
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
