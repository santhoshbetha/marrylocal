import { Link, useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, UserPlus, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient, describeApiError } from '@/api/client';
import usePasswordToggle from '@/hooks/usePasswordToggle';

const GENDERS = ['Male', 'Female', 'Other'];
const MIN_AGE = 18;

function toDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateInput(value) {
  if (!value) return null;

  const [year, month, day] = String(value).split('-').map(Number);

  if (!year || !month || !day) return null;

  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isAtLeast18(value) {
  const birthDate = parseDateInput(value);
  if (!birthDate) return false;

  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setFullYear(cutoff.getFullYear() - MIN_AGE);

  return birthDate <= cutoff;
}

function latestAllowedBirthDate() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setFullYear(date.getFullYear() - MIN_AGE);
  return toDateInputValue(date);
}

const AdminRegisterSchema = Yup.object({
  firstname: Yup.string()
    .trim()
    .min(2, 'First name is too short')
    .required('First name is required'),
  lastname: Yup.string().trim().min(2, 'Last name is too short').required('Last name is required'),
  dateofbirth: Yup.string()
    .required('Date of birth is required')
    .test(
      'valid-date',
      'Enter a valid date of birth',
      value => Boolean(value) && Boolean(parseDateInput(value)),
    )
    .test(
      'is-adult',
      'You must be at least 18 years old',
      value => Boolean(value) && isAtLeast18(value),
    ),
  gender: Yup.string().oneOf(GENDERS, 'Select your gender').required('Gender is required'),
  email: Yup.string().trim().email('Enter a valid email address').required('Email is required'),
  phonenumber: Yup.string()
    .trim()
    .matches(/^\d{10}$/, 'Phone number must be exactly 10 digits')
    .required('Phone number is required'),
  password: Yup.string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password must be at most 72 characters')
    .required('Password is required'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password'), null], 'Passwords must match')
    .required('Please confirm your password'),
  inviteCode: Yup.string().trim().required('Invite code is required'),
});

function FieldError({ formik, name }) {
  if (!formik.touched[name] || !formik.errors[name]) return null;

  return <p className="text-sm text-destructive">{formik.errors[name]}</p>;
}

export default function AdminRegister() {
  const navigate = useNavigate();
  const [passwordType, PasswordToggleIcon] = usePasswordToggle();
  const [confirmPasswordType, ConfirmPasswordToggleIcon] = usePasswordToggle();

  const registerMutation = useMutation({
    mutationFn: payload => apiClient.post('/api/v1/auth/admin-register', payload),
    onSuccess: () => {
      toast.success(
        'Admin registration successful! Check your email to verify your account, then sign in.',
      );
      navigate('/login', { replace: true });
    },
  });

  const formik = useFormik({
    initialValues: {
      firstname: '',
      lastname: '',
      dateofbirth: '',
      gender: '',
      email: '',
      phonenumber: '',
      password: '',
      confirmPassword: '',
      inviteCode: '',
    },
    validationSchema: AdminRegisterSchema,
    onSubmit: (values, helpers) => {
      const payload = {
        first_name: values.firstname.trim(),
        last_name: values.lastname.trim(),
        birth_date: values.dateofbirth,
        gender: values.gender,
        email: values.email.trim().toLowerCase(),
        phone_number: values.phonenumber.trim(),
        password: values.password,
        invite_code: values.inviteCode.trim(),
      };

      registerMutation.mutate(payload, {
        onSettled: () => helpers.setSubmitting(false),
      });
    },
  });

  const clearApiError = () => {
    if (registerMutation.isError) registerMutation.reset();
  };

  const handleChange = event => {
    clearApiError();
    formik.handleChange(event);
  };

  const handleBlur = event => {
    formik.handleBlur(event);
  };

  const isSubmitting = registerMutation.isPending || formik.isSubmitting;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-xl border border-border/60 bg-card shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <UserPlus className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">Admin Registration</CardTitle>
          <p className="text-sm text-muted-foreground">
            Register an administrator account with a valid invite code.
          </p>
        </CardHeader>

        <form onSubmit={formik.handleSubmit} noValidate>
          <CardContent className="space-y-4">
            {registerMutation.isError ? (
              <Alert variant="destructive" role="alert">
                <AlertDescription>
                  {describeApiError(
                    registerMutation.error,
                    'Admin registration failed. Please try again.',
                  )}
                </AlertDescription>
              </Alert>
            ) : null}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="firstname">First name *</Label>
                <Input
                  id="firstname"
                  name="firstname"
                  autoComplete="given-name"
                  placeholder="John"
                  value={formik.values.firstname}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  aria-invalid={Boolean(formik.touched.firstname && formik.errors.firstname)}
                  className="border-border/60 bg-background"
                />
                <FieldError formik={formik} name="firstname" />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="lastname">Last name *</Label>
                <Input
                  id="lastname"
                  name="lastname"
                  autoComplete="family-name"
                  placeholder="Doe"
                  value={formik.values.lastname}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  aria-invalid={Boolean(formik.touched.lastname && formik.errors.lastname)}
                  className="border-border/60 bg-background"
                />
                <FieldError formik={formik} name="lastname" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="dateofbirth">Date of birth *</Label>
                <Input
                  id="dateofbirth"
                  name="dateofbirth"
                  type="date"
                  min="1900-01-01"
                  max={latestAllowedBirthDate()}
                  value={formik.values.dateofbirth}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  aria-invalid={Boolean(formik.touched.dateofbirth && formik.errors.dateofbirth)}
                  className="border-border/60 bg-background"
                />
                <FieldError formik={formik} name="dateofbirth" />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="gender">Gender *</Label>
                <Select
                  value={formik.values.gender}
                  onValueChange={value => {
                    clearApiError();
                    formik.setFieldValue('gender', value);
                    formik.setFieldTouched('gender', true, false);
                  }}
                >
                  <SelectTrigger
                    id="gender"
                    className="w-full border-border/60 bg-background"
                    aria-invalid={Boolean(formik.touched.gender && formik.errors.gender)}
                  >
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    {GENDERS.map(gender => (
                      <SelectItem key={gender} value={gender}>
                        {gender}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError formik={formik} name="gender" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="email">Email address *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="admin@example.com"
                  value={formik.values.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  aria-invalid={Boolean(formik.touched.email && formik.errors.email)}
                  className="border-border/60 bg-background"
                />
                <FieldError formik={formik} name="email" />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="phonenumber">Phone number *</Label>
                <Input
                  id="phonenumber"
                  name="phonenumber"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  placeholder="9876543210"
                  maxLength={10}
                  value={formik.values.phonenumber}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  aria-invalid={Boolean(formik.touched.phonenumber && formik.errors.phonenumber)}
                  className="border-border/60 bg-background"
                />
                <FieldError formik={formik} name="phonenumber" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="password">Password *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={passwordType}
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    value={formik.values.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    aria-invalid={Boolean(formik.touched.password && formik.errors.password)}
                    className="border-border/60 bg-background pr-10"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground [&_svg]:h-4 [&_svg]:w-4">
                    {PasswordToggleIcon}
                  </span>
                </div>
                <FieldError formik={formik} name="password" />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="confirmPassword">Confirm password *</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={confirmPasswordType}
                    autoComplete="new-password"
                    placeholder="Re-enter your password"
                    value={formik.values.confirmPassword}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    aria-invalid={Boolean(
                      formik.touched.confirmPassword && formik.errors.confirmPassword,
                    )}
                    className="border-border/60 bg-background pr-10"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground [&_svg]:h-4 [&_svg]:w-4">
                    {ConfirmPasswordToggleIcon}
                  </span>
                </div>
                <FieldError formik={formik} name="confirmPassword" />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="inviteCode">Invite code *</Label>
              <Input
                id="inviteCode"
                name="inviteCode"
                autoComplete="off"
                placeholder="Enter the admin invite code"
                value={formik.values.inviteCode}
                onChange={handleChange}
                onBlur={handleBlur}
                aria-invalid={Boolean(formik.touched.inviteCode && formik.errors.inviteCode)}
                className="border-border/60 bg-background"
              />
              <FieldError formik={formik} name="inviteCode" />
              <p className="text-xs text-muted-foreground">
                Invite codes are validated server-side against the configured admin secret.
              </p>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button
              type="submit"
              data-testid="admin-register-submit"
              className="w-full bg-primary font-bold text-primary-foreground hover:bg-primary/90"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registering…
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Register as Admin
                </>
              )}
            </Button>

            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-1 text-sm font-medium text-primary hover:text-primary/80"
            >
              <ArrowLeft className="h-3 w-3" />
              Back to Login
            </Link>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
