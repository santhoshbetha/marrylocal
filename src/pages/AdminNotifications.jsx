import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
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
import { AtSign, BellRing, MapPin, Send, Users } from 'lucide-react';
import { describeApiError } from '@/api/client';
import { queueSystemNotification } from '@/api/admin';
import { states } from '@/lib/states';
import { cities } from '@/lib/cities';

const GENDERS = ['All', 'Male', 'Female'];

function parseIdentifiers(value) {
  return [
    ...new Set(
      String(value ?? '')
        .split(';')
        .map(identifier => identifier.trim())
        .filter(Boolean),
    ),
  ];
}

export default function AdminNotifications() {
  const [mode, setMode] = useState('all');
  const [gender, setGender] = useState('All');
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [availableCities, setAvailableCities] = useState([]);
  const [identifiers, setIdentifiers] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [lastQueued, setLastQueued] = useState(null);

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

  const notificationMutation = useMutation({
    mutationFn: payload => queueSystemNotification(payload),
    onSuccess: result => {
      const count = result?.estimated_recipients ?? 0;
      setLastQueued(count);
      toast.success(`Notification queued for ${count} recipient${count === 1 ? '' : 's'}.`);
    },
    onError: error => {
      toast.error(describeApiError(error, 'Could not queue the notification'));
    },
  });

  const handleSubmit = event => {
    event.preventDefault();

    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();

    if (!trimmedTitle || !trimmedBody) {
      toast.error('Title and body are required');
      return;
    }

    if (mode === 'location' && (!selectedState || !selectedCity)) {
      toast.error('Select both state and city');
      return;
    }

    const parsedIdentifiers = mode === 'individual' ? parseIdentifiers(identifiers) : [];

    if (mode === 'individual' && parsedIdentifiers.length === 0) {
      toast.error('Enter at least one email or @handle');
      return;
    }

    notificationMutation.mutate({
      target_type: mode,
      state: mode === 'location' ? selectedState : undefined,
      city: mode === 'location' ? selectedCity : undefined,
      gender,
      identifiers: parsedIdentifiers,
      title: trimmedTitle,
      body: trimmedBody,
    });
  };

  const clearForm = () => {
    setTitle('');
    setBody('');
    setIdentifiers('');
    setSelectedState('');
    setSelectedCity('');
    setGender('All');
    setLastQueued(null);
  };

  return (
    <div className="container mx-auto max-w-4xl p-4">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <BellRing className="h-6 w-6 text-primary" />
            System Notifications
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Broadcast an in-app alert to all users, a location, or specific individuals.
          </p>
        </div>
        {lastQueued !== null ? (
          <Badge variant="outline" className="border-primary/30 bg-primary/15 text-primary">
            Last queued: {lastQueued}
          </Badge>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="border-border/60 bg-card">
          <CardHeader>
            <CardTitle>Notification content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="notification-title">Title</Label>
              <Input
                id="notification-title"
                data-testid="notification-title"
                value={title}
                onChange={event => setTitle(event.target.value)}
                placeholder="Bangalore Meetup Alert"
                maxLength={200}
                className="border-border/60 bg-background"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notification-body">Body</Label>
              <Textarea
                id="notification-body"
                data-testid="notification-body"
                value={body}
                onChange={event => setBody(event.target.value)}
                placeholder="Tell users what they need to know."
                rows={4}
                maxLength={5000}
                className="border-border/60 bg-background"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card">
          <CardHeader>
            <CardTitle>Audience</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 sm:max-w-xs">
              <Label htmlFor="notification-gender">Gender filter</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger
                  id="notification-gender"
                  data-testid="notification-gender"
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

            <Tabs value={mode} onValueChange={setMode}>
              <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3">
                <TabsTrigger value="all">
                  <Users className="mr-2 h-4 w-4" />
                  All Users
                </TabsTrigger>
                <TabsTrigger value="location">
                  <MapPin className="mr-2 h-4 w-4" />
                  By Location
                </TabsTrigger>
                <TabsTrigger value="individual">
                  <AtSign className="mr-2 h-4 w-4" />
                  Specific Individuals
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="pt-4">
                <p className="rounded-2xl border border-border/60 bg-muted/40 p-4 text-sm text-muted-foreground">
                  Sends to every active user. Use the gender filter above to narrow the audience.
                </p>
              </TabsContent>

              <TabsContent value="location" className="space-y-4 pt-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="notification-state">State</Label>
                    <Select value={selectedState} onValueChange={setSelectedState}>
                      <SelectTrigger
                        id="notification-state"
                        className="border-border/60 bg-background"
                      >
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
                    <Label htmlFor="notification-city">City</Label>
                    <Select
                      value={selectedCity}
                      onValueChange={setSelectedCity}
                      disabled={!selectedState}
                    >
                      <SelectTrigger
                        id="notification-city"
                        className="border-border/60 bg-background"
                      >
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
              </TabsContent>

              <TabsContent value="individual" className="space-y-4 pt-4">
                <div className="grid gap-2">
                  <Label htmlFor="notification-identifiers">Emails or @handles</Label>
                  <Textarea
                    id="notification-identifiers"
                    data-testid="notification-identifiers"
                    value={identifiers}
                    onChange={event => setIdentifiers(event.target.value)}
                    placeholder="@priya; bangalore.demo.priya@marrylocal.test"
                    rows={3}
                    className="border-border/60 bg-background"
                  />
                  <p className="text-xs text-muted-foreground">
                    Separate multiple recipients with semicolons.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Delivery is queued in Oban and pushed live to online users.
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={clearForm}>
              Clear
            </Button>
            <Button
              type="submit"
              data-testid="notification-send"
              disabled={notificationMutation.isPending}
              className="bg-primary font-bold text-primary-foreground hover:bg-primary/90"
            >
              <Send className="mr-2 h-4 w-4" />
              {notificationMutation.isPending ? 'Queueing…' : 'Send notification'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
