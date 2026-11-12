import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Mail, RefreshCw, Send, Users } from 'lucide-react';
import { describeApiError } from '@/api/client';
import { adminKeys, previewAdminEmailRecipients, queueAdminBulkEmail } from '@/api/admin';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { states } from '@/lib/states';
import { cities } from '@/lib/cities';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GENDERS = ['All', 'Male', 'Female'];

const TEMPLATE_PRESETS = [
  {
    label: 'Welcome & Profile Tips',
    subject: 'Welcome to MarryLocal',
    content:
      '<p>Welcome to MarryLocal!</p><p>Complete your profile, add a clear photo, and set your search distance to start meeting compatible matches.</p>',
  },
  {
    label: 'City Matchmaking Milestone',
    subject: 'New matches are joining near you',
    content:
      '<p>Your city just reached a new matchmaking milestone.</p><p>Open discovery today to see the newest members near you.</p>',
  },
  {
    label: 'Maintenance Notice',
    subject: 'Scheduled maintenance notice',
    content:
      '<p>We will perform scheduled maintenance tonight.</p><p>Some features may be briefly unavailable. Thank you for your patience.</p>',
  },
];

function parseEmails(value) {
  const emails = [
    ...new Set(
      String(value ?? '')
        .split(';')
        .map(email => email.trim())
        .filter(Boolean),
    ),
  ];

  return {
    emails,
    invalidEmails: emails.filter(email => !EMAIL_REGEX.test(email)),
  };
}

export default function AdminEmailTemplates() {
  const queryClient = useQueryClient();
  const isOnline = useOnlineStatus();

  const [activeTab, setActiveTab] = useState('manual-emails');
  const [manualEmails, setManualEmails] = useState('');
  const [previewEmails, setPreviewEmails] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [availableCities, setAvailableCities] = useState([]);
  const [gender, setGender] = useState('All');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailContent, setEmailContent] = useState('');

  useEffect(() => {
    if (!selectedState) {
      setAvailableCities([]);
      setSelectedCity('');
      return;
    }

    if (selectedState === 'All') {
      setAvailableCities(['All Cities']);
      setSelectedCity('All Cities');
      return;
    }

    const names = cities
      .filter(city => city.state === selectedState)
      .map(city => city.name)
      .sort();

    setAvailableCities(['All', ...names]);
    setSelectedCity(previous =>
      previous && previous !== 'All' && !names.includes(previous) ? '' : previous,
    );
  }, [selectedState]);

  useEffect(() => {
    const timer = window.setTimeout(() => setPreviewEmails(manualEmails), 400);
    return () => window.clearTimeout(timer);
  }, [manualEmails]);

  const manualPreview = parseEmails(previewEmails);

  const manualPreviewQuery = useQuery({
    queryKey: ['admin', 'emails', 'preview', 'manual', previewEmails, gender],
    queryFn: ({ signal }) =>
      previewAdminEmailRecipients(
        {
          mode: 'manual',
          emails: manualPreview.emails.join(';'),
          gender,
        },
        { signal },
      ),
    enabled: manualPreview.emails.length > 0 && manualPreview.invalidEmails.length === 0,
    staleTime: 10_000,
  });

  const locationFilters =
    selectedState && selectedCity ? { state: selectedState, city: selectedCity } : null;

  const locationPreviewQuery = useQuery({
    queryKey: ['admin', 'emails', 'preview', 'location', locationFilters, gender],
    queryFn: ({ signal }) =>
      previewAdminEmailRecipients(
        {
          mode: 'location',
          state: locationFilters.state,
          city: locationFilters.city,
          gender,
        },
        { signal },
      ),
    enabled: Boolean(locationFilters),
    staleTime: 10_000,
  });

  const manualRecipientCount = manualPreviewQuery.data ?? manualPreview.emails.length;
  const locationRecipientCount = locationPreviewQuery.data ?? 0;
  const recipientCount =
    activeTab === 'manual-emails' ? manualRecipientCount : locationRecipientCount;

  const sendMutation = useMutation({
    mutationFn: payload => queueAdminBulkEmail(payload),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.all });
      const count = result?.queued_count ?? 0;
      toast.success(
        `Queued ${count} recipient${count === 1 ? '' : 's'} from the ${variables.mode} audience.`,
      );
    },
    onError: error => {
      toast.error(describeApiError(error, 'Could not queue the email broadcast'));
    },
  });

  const requireTemplate = () => {
    if (!emailSubject.trim() || !emailContent.trim()) {
      toast.error('Please provide both subject and content');
      return false;
    }

    if (!isOnline) {
      toast.error('You are offline');
      return false;
    }

    return true;
  };

  const handleSendManualEmails = () => {
    if (!requireTemplate()) return;

    const { emails, invalidEmails } = parseEmails(manualEmails);

    if (invalidEmails.length > 0) {
      toast.error(`Invalid email addresses: ${invalidEmails.join(', ')}`);
      return;
    }

    if (emails.length === 0) {
      toast.error('No valid email addresses found');
      return;
    }

    sendMutation.mutate({
      mode: 'manual',
      emails,
      gender,
      subject: emailSubject.trim(),
      content: emailContent.trim(),
    });
  };

  const handleSendLocationEmails = () => {
    if (!requireTemplate()) return;

    if (!selectedState || !selectedCity) {
      toast.error('Please select both state and city');
      return;
    }

    sendMutation.mutate({
      mode: 'location',
      state: selectedState,
      city: selectedCity,
      gender,
      subject: emailSubject.trim(),
      content: emailContent.trim(),
    });
  };

  const handleRefreshLocationCount = async () => {
    if (!selectedState || !selectedCity) {
      toast.error('Please select both state and city');
      return;
    }

    const result = await locationPreviewQuery.refetch();

    if (result.error) {
      toast.error(describeApiError(result.error, 'Could not load the recipient count'));
      return;
    }

    toast.success(`Found ${result.data ?? 0} recipient${(result.data ?? 0) === 1 ? '' : 's'}`);
  };

  const handleClear = () => {
    setActiveTab('manual-emails');
    setManualEmails('');
    setPreviewEmails('');
    setSelectedState('');
    setSelectedCity('');
    setAvailableCities([]);
    setGender('All');
    setEmailSubject('');
    setEmailContent('');
    toast.success('All data cleared');
  };

  const applyPreset = preset => {
    setEmailSubject(preset.subject);
    setEmailContent(preset.content);
  };

  const isSending = sendMutation.isPending;
  const isTemplateReady = Boolean(emailSubject.trim() && emailContent.trim());

  const manualInvalid = manualPreview.invalidEmails;

  return (
    <div className="container mx-auto max-w-6xl p-4">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <Mail className="h-6 w-6 text-primary" />
            Email Templates &amp; Bulk Sending
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Broadcasts are queued in Oban and delivered by the Resend-backed worker, so this request
            returns immediately.
          </p>
        </div>
        <Badge
          variant="outline"
          className={
            isOnline
              ? 'border-primary/30 bg-primary/15 text-primary'
              : 'border-destructive/30 bg-destructive/10 text-destructive'
          }
        >
          {isOnline ? 'Online' : 'Offline'}
        </Badge>
      </div>

      <Card className="mb-6 border-border/60 bg-card">
        <CardHeader>
          <CardTitle>Email template</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {TEMPLATE_PRESETS.map(preset => (
              <Button
                key={preset.label}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyPreset(preset)}
                className="rounded-xl border-border/60"
              >
                {preset.label}
              </Button>
            ))}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="email-subject">Subject</Label>
            <Input
              id="email-subject"
              placeholder="Enter email subject"
              value={emailSubject}
              onChange={event => setEmailSubject(event.target.value)}
              className="border-border/60 bg-background"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email-content">Content (HTML supported)</Label>
            <Textarea
              id="email-content"
              placeholder="Enter the email body. HTML is rendered by the recipient's mail client."
              value={emailContent}
              onChange={event => setEmailContent(event.target.value)}
              rows={8}
              className="border-border/60 bg-background"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6 border-border/60 bg-card">
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Recipients
            <Badge variant="secondary" data-testid="email-recipient-count">
              {recipientCount}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid gap-2 sm:max-w-xs">
            <Label htmlFor="email-gender">Gender filter</Label>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger
                id="email-gender"
                data-testid="email-gender"
                className="border-border/60 bg-background"
              >
                <SelectValue placeholder="All genders" />
              </SelectTrigger>
              <SelectContent>
                {GENDERS.map(option => (
                  <SelectItem key={option} value={option}>
                    {option === 'All' ? 'All genders' : option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="manual-emails">Manual Emails</TabsTrigger>
              <TabsTrigger value="location-based">Location Based</TabsTrigger>
            </TabsList>

            <TabsContent value="manual-emails" className="space-y-4 pt-4">
              <div className="grid gap-2">
                <Label htmlFor="manual-emails">Email addresses</Label>
                <Textarea
                  id="manual-emails"
                  placeholder="user1@example.com; user2@example.com"
                  value={manualEmails}
                  onChange={event => setManualEmails(event.target.value)}
                  rows={4}
                  className="border-border/60 bg-background"
                />
                <p className="text-xs text-muted-foreground">
                  Separate addresses with semicolons. Invalid addresses are rejected before the
                  request is queued.
                </p>
                {manualInvalid.length > 0 ? (
                  <p className="text-xs font-medium text-destructive">
                    Invalid: {manualInvalid.join(', ')}
                  </p>
                ) : null}
              </div>
              <Button
                onClick={handleSendManualEmails}
                disabled={isSending || !isOnline || !isTemplateReady}
                className="w-full bg-primary font-bold text-primary-foreground hover:bg-primary/90 sm:w-auto"
              >
                <Send className="mr-2 h-4 w-4" />
                {isSending
                  ? 'Queueing…'
                  : `Send to ${manualRecipientCount} recipient${
                      manualRecipientCount === 1 ? '' : 's'
                    }`}
              </Button>
            </TabsContent>

            <TabsContent value="location-based" className="space-y-4 pt-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="state-select">State</Label>
                  <Select value={selectedState} onValueChange={setSelectedState}>
                    <SelectTrigger id="state-select" className="border-border/60 bg-background">
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All States</SelectItem>
                      {states.map(state => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="city-select">City</Label>
                  <Select
                    value={selectedCity}
                    onValueChange={setSelectedCity}
                    disabled={!selectedState}
                  >
                    <SelectTrigger id="city-select" className="border-border/60 bg-background">
                      <SelectValue placeholder="Select city" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCities.map(city => (
                        <SelectItem key={city} value={city}>
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="border-border/60 bg-muted/40 text-muted-foreground"
                  data-testid="email-location-count"
                >
                  {locationPreviewQuery.isFetching
                    ? 'Loading recipients…'
                    : `${locationRecipientCount} recipient${
                        locationRecipientCount === 1 ? '' : 's'
                      } matched`}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefreshLocationCount}
                  disabled={locationPreviewQuery.isFetching || !selectedState || !selectedCity}
                  className="border-border/60"
                >
                  <RefreshCw
                    className={`mr-2 h-4 w-4 ${
                      locationPreviewQuery.isFetching ? 'animate-spin' : ''
                    }`}
                  />
                  Get Recipients Count
                </Button>
              </div>

              <p className="rounded-2xl border border-border/60 bg-muted/40 p-4 text-sm text-muted-foreground">
                The server resolves verified active users for this location and gender, then queues
                batches of 25 addresses for Resend.
              </p>

              <Button
                onClick={handleSendLocationEmails}
                disabled={
                  isSending ||
                  !isOnline ||
                  !isTemplateReady ||
                  !selectedState ||
                  !selectedCity ||
                  locationRecipientCount === 0
                }
                className="w-full bg-primary font-bold text-primary-foreground hover:bg-primary/90 sm:w-auto"
              >
                <Send className="mr-2 h-4 w-4" />
                {isSending
                  ? 'Queueing…'
                  : `Send to ${locationRecipientCount} recipient${
                      locationRecipientCount === 1 ? '' : 's'
                    }`}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button variant="outline" onClick={handleClear} className="border-border/60">
          Clear all
        </Button>
      </div>
    </div>
  );
}
