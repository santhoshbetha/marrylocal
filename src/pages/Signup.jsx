import { useMemo } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, ShieldCheck, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { api, describeApiError } from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import { languages } from '../lib/languages';
import { states } from '../lib/states';
import { cities } from '../lib/cities';
import { communities } from '../lib/communities';
import { religions } from '../lib/religions';
import { Switch } from '@/components/ui/switch';

const EDUCATION_LEVELS = ['High School', 'Plus 2 level', 'Bachelors level', 'Masters level'];
const ECONOMIC_STATUSES = ['Below Middleclass', 'Middleclass', 'Above Middleclass'];

const SELECT_CLASS =
  'h-10 w-full rounded-xl border border-border/60 bg-card px-3 text-sm text-foreground outline-none transition focus:border-amber-400 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground';
const OPTION_CLASS = 'text-foreground bg-popover';

const SignupSchema = Yup.object({
  first_name: Yup.string()
    .trim()
    .min(2, 'First name is too short')
    .required('First name is required'),
  last_name: Yup.string().trim().min(2, 'Last name is too short').required('Last name is required'),
  email: Yup.string().trim().email('Enter a valid email address').required('Email is required'),
  phone_number: Yup.string()
    .trim()
    .matches(/^\+?[0-9]{10,15}$/, 'Enter a valid phone number')
    .required('Phone number is required'),
  password: Yup.string()
    .min(12, 'Password must be at least 12 characters')
    .required('Password is required'),
  password_confirmation: Yup.string()
    .oneOf([Yup.ref('password'), null], 'Passwords must match')
    .required('Please confirm your password'),
  gender: Yup.string()
    .oneOf(['Male', 'Female'], 'Select your gender')
    .required('Gender is required'),
  date_of_birth: Yup.date()
    .max(new Date(Date.now() - 18 * 365.25 * 24 * 60 * 60 * 1000), 'You must be at least 18')
    .required('Date of birth is required'),
  religion: Yup.string().required('Religion is required'),
  community: Yup.string().required('Please select your community/caste'),
  caste: Yup.string(),
  language: Yup.string().required('Please select your language'),
  state: Yup.string().required('Please select your state'),
  city: Yup.string().required('Please select your city'),
  education_level: Yup.string(),
  economic_status: Yup.string(),
  referred_by_code: Yup.string().nullable().max(8, 'Invalid code string format'),
  bio: Yup.string().max(500, 'Bio must be 500 characters or fewer'),
});

const initialValues = {
  first_name: '',
  last_name: '',
  email: '',
  phone_number: '',
  password: '',
  password_confirmation: '',
  gender: '',
  date_of_birth: '',
  religion: '',
  community: '',
  caste: '',
  language: '',
  state: '',
  city: '',
  latitude: null,
  longitude: null,
  education_level: '',
  economic_status: '',
  job_status: false,
  referred_by_code: '',
  bio: '',
};

function FieldError({ name, formik }) {
  const show = (formik.touched[name] || formik.submitCount > 0) && formik.errors[name];
  if (!show) return null;
  return (
    <p data-testid={`error-${name}`} className="text-sm font-medium text-red-700" role="alert">
      {formik.errors[name]}
    </p>
  );
}

export function Signup() {
  const navigate = useNavigate();
  const loginToStore = useAuthStore(state => state.login);
  const setOnboardingComplete = useAuthStore(state => state.setOnboardingComplete);

  const submitRegistration = async (values, actions) => {
    try {
      const payload = {
        email: values.email.trim().toLowerCase(),
        password: values.password,
        password_confirmation: values.password_confirmation,
        first_name: values.first_name.trim(),
        last_name: values.last_name.trim(),
        phone_number: values.phone_number.trim(),
        gender: values.gender,
        date_of_birth: values.date_of_birth,
        religion: values.religion,
        community: values.community,
        caste: values.caste || null,
        language: values.language,
        city: values.city,
        state: values.state,
        education_level: values.education_level || null,
        economic_status: values.economic_status || null,
        job_status: Boolean(values.job_status),
        referred_by_code: values.referred_by_code?.trim().toUpperCase() || null,
      };

      const response = await api.post('/api/v1/auth/register', payload);
      const data = response.data?.data || {};
      const token = data.token;

      if (!token) throw new Error('Registration did not return a session token');

      loginToStore(token, data.user);
      setOnboardingComplete(false);

      if (values.latitude != null && values.longitude != null) {
        try {
          await api.patch('/api/v1/profiles/me', {
            profile: {
              city: values.city,
              state: values.state,
              religion: values.religion,
              community: values.community,
              caste: values.caste || null,
              language: values.language,
              education_level: values.education_level || null,
              economic_status: values.economic_status || null,
              job_status: Boolean(values.job_status),
              bio: values.bio,
            },
            latitude: values.latitude,
            longitude: values.longitude,
          });
        } catch {
          // Location can be repaired from the onboarding location step.
        }
      }

      toast.success('Account created. Let us tune your local matches.');
      navigate('/onboarding/lifestyle');
    } catch (error) {
      toast.error(describeApiError(error, 'Signup failed. Please try again.'));
      if (error?.errors) {
        actions.setErrors(
          Object.fromEntries(
            Object.entries(error.errors).map(([field, messages]) => [
              field,
              Array.isArray(messages) ? messages[0] : messages,
            ]),
          ),
        );
      }
    } finally {
      actions.setSubmitting(false);
    }
  };

  const formik = useFormik({
    initialValues,
    validationSchema: SignupSchema,
    validateOnBlur: true,
    validateOnChange: false,
    onSubmit: submitRegistration,
  });

  const availableCities = useMemo(
    () =>
      cities
        .filter(city => city.state === formik.values.state)
        .sort((left, right) => left.name.localeCompare(right.name)),
    [formik.values.state],
  );

  const handleStateChange = event => {
    formik.setFieldValue('state', event.target.value);
    formik.setFieldValue('city', '');
    formik.setFieldValue('latitude', null);
    formik.setFieldValue('longitude', null);
    formik.setFieldTouched('city', false, false);
  };

  const handleCityChange = event => {
    const cityName = event.target.value;
    const selectedCity = cities.find(
      city => city.name === cityName && city.state === formik.values.state,
    );

    formik.setFieldValue('city', cityName);
    formik.setFieldValue('latitude', selectedCity?.latitude ?? null);
    formik.setFieldValue('longitude', selectedCity?.longitude ?? null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-2xl bg-card p-10 rounded-3xl border shadow-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-accent-foreground">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">
            Create your MarryLocal account
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Local matchmaking for India. Already registered?{' '}
            <Link
              to="/login"
              className="font-semibold text-amber-700 underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>

        <form
          noValidate
          onSubmit={formik.handleSubmit}
          className="grid grid-cols-1 sm:grid-cols-2 gap-6"
        >
          <div className="grid gap-2">
            <Label htmlFor="first_name">First name</Label>
            <Input
              id="first_name"
              name="first_name"
              value={formik.values.first_name}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            />
            <FieldError name="first_name" formik={formik} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="last_name">Last name</Label>
            <Input
              id="last_name"
              name="last_name"
              value={formik.values.last_name}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            />
            <FieldError name="last_name" formik={formik} />
          </div>

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
            <FieldError name="email" formik={formik} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="phone_number">Phone number</Label>
            <Input
              id="phone_number"
              name="phone_number"
              inputMode="tel"
              value={formik.values.phone_number}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            />
            <FieldError name="phone_number" formik={formik} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              value={formik.values.password}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            />
            <FieldError name="password" formik={formik} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="password_confirmation">Confirm password</Label>
            <Input
              id="password_confirmation"
              name="password_confirmation"
              type="password"
              value={formik.values.password_confirmation}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            />
            <FieldError name="password_confirmation" formik={formik} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="gender">Gender</Label>
            <select
              id="gender"
              name="gender"
              value={formik.values.gender}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className={SELECT_CLASS}
            >
              <option value="" className={OPTION_CLASS}>
                Select gender
              </option>
              <option value="Female" className={OPTION_CLASS}>
                Female
              </option>
              <option value="Male" className={OPTION_CLASS}>
                Male
              </option>
            </select>
            <FieldError name="gender" formik={formik} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="date_of_birth">Date of birth</Label>
            <Input
              id="date_of_birth"
              name="date_of_birth"
              type="date"
              value={formik.values.date_of_birth}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            />
            <FieldError name="date_of_birth" formik={formik} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="religion">Religion</Label>
            <select
              id="religion"
              name="religion"
              value={formik.values.religion}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className={SELECT_CLASS}
            >
              <option value="" className={OPTION_CLASS}>
                Select religion
              </option>
              {religions.map(religion => (
                <option key={religion} value={religion} className={OPTION_CLASS}>
                  {religion}
                </option>
              ))}
            </select>
            <FieldError name="religion" formik={formik} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="community">Community / Caste</Label>
            <select
              id="community"
              name="community"
              value={formik.values.community}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className={SELECT_CLASS}
            >
              <option value="" className={OPTION_CLASS}>
                Select community / caste
              </option>
              {communities.map(community => (
                <option key={community} value={community} className={OPTION_CLASS}>
                  {community}
                </option>
              ))}
            </select>
            <FieldError name="community" formik={formik} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="caste">Sub-caste / Clan (optional)</Label>
            <Input
              id="caste"
              name="caste"
              value={formik.values.caste}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            />
            <FieldError name="caste" formik={formik} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="language">Mother tongue</Label>
            <select
              id="language"
              name="language"
              value={formik.values.language}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className={SELECT_CLASS}
            >
              <option value="" className={OPTION_CLASS}>
                Select language
              </option>
              {languages.map(language => (
                <option key={language} value={language} className={OPTION_CLASS}>
                  {language}
                </option>
              ))}
            </select>
            <FieldError name="language" formik={formik} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="state">State</Label>
            <select
              id="state"
              name="state"
              data-testid="state-select"
              value={formik.values.state}
              onChange={handleStateChange}
              onBlur={formik.handleBlur}
              className={SELECT_CLASS}
            >
              <option value="" className={OPTION_CLASS}>
                Select state
              </option>
              {states.map(state => (
                <option key={state} value={state} className={OPTION_CLASS}>
                  {state}
                </option>
              ))}
            </select>
            <FieldError name="state" formik={formik} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="city">City</Label>
            <select
              id="city"
              name="city"
              data-testid="city-select"
              value={formik.values.city}
              onChange={handleCityChange}
              onBlur={formik.handleBlur}
              disabled={!formik.values.state}
              className={SELECT_CLASS}
            >
              <option value="" className={OPTION_CLASS}>
                {formik.values.state ? 'Select city' : 'Select your state first'}
              </option>
              {availableCities.map((city, index) => (
                <option
                  key={`${city.name}-${city.state}-${index}`}
                  value={city.name}
                  className={OPTION_CLASS}
                >
                  {city.name}
                </option>
              ))}
            </select>
            <FieldError name="city" formik={formik} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="education_level">Education</Label>
            <select
              id="education_level"
              name="education_level"
              value={formik.values.education_level}
              onChange={formik.handleChange}
              className={SELECT_CLASS}
            >
              <option value="" className={OPTION_CLASS}>
                Select education
              </option>
              {EDUCATION_LEVELS.map(level => (
                <option key={level} value={level} className={OPTION_CLASS}>
                  {level}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="economic_status">Economic background</Label>
            <select
              id="economic_status"
              name="economic_status"
              value={formik.values.economic_status}
              onChange={formik.handleChange}
              className={SELECT_CLASS}
            >
              <option value="" className={OPTION_CLASS}>
                Select background
              </option>
              {ECONOMIC_STATUSES.map(status => (
                <option key={status} value={status} className={OPTION_CLASS}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="job_status">Job Status</Label>
            <div className="flex h-10 items-center gap-3 rounded-xl border border-border/60 bg-card px-3">
              <Switch
                id="job_status"
                data-testid="signup-job-status"
                checked={Boolean(formik.values.job_status)}
                onCheckedChange={checked => formik.setFieldValue('job_status', Boolean(checked))}
              />
              <span className="text-sm text-muted-foreground">
                {formik.values.job_status ? 'Currently employed' : 'Not currently employed'}
              </span>
            </div>
          </div>

          <div className="col-span-1 grid gap-2 sm:col-span-2">
            <Label htmlFor="referred_by_code">
              Referral Code (Optional) - Get 50 INR credit when subscription models open later
            </Label>
            <Input
              id="referred_by_code"
              name="referred_by_code"
              value={formik.values.referred_by_code}
              onChange={event =>
                formik.setFieldValue(
                  'referred_by_code',
                  event.target.value
                    .replace(/[^a-zA-Z0-9]/g, '')
                    .toUpperCase()
                    .slice(0, 8),
                )
              }
              onBlur={formik.handleBlur}
              placeholder="ML72FADB"
              maxLength={8}
              autoCapitalize="characters"
              className="uppercase"
            />
            <FieldError name="referred_by_code" formik={formik} />
          </div>

          <div className="col-span-1 grid gap-2 sm:col-span-2">
            <Label htmlFor="bio">A little about you</Label>
            <textarea
              id="bio"
              name="bio"
              rows={3}
              value={formik.values.bio}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              placeholder="Family values, work, hobbies, what a good local match looks like..."
              className="rounded-2xl border border-border/60 bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-amber-400"
            />
            <FieldError name="bio" formik={formik} />
          </div>

          <div className="col-span-1 sm:col-span-2">
            <Button
              type="submit"
              data-testid="signup-submit"
              disabled={formik.isSubmitting}
              className="h-12 w-full rounded-2xl bg-amber-400 text-slate-900 dark:text-slate-900 font-bold shadow-xs transition-all duration-300 hover:bg-amber-300"
            >
              {formik.isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="mr-2 h-4 w-4" />
              )}
              Create Account
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Signup;
