import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Clock3, Loader2, MapPin, Navigation, RotateCcw } from 'lucide-react';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiClient } from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import { coords } from '@/lib/defaultcoords';

import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const DELHI = { lat: 28.6139, lng: 77.209 };
const EARTH_RADIUS_KM = 6371;
const MAX_MANUAL_DISTANCE_KM = 150;

function haversineKm(from, to) {
  const toRadians = value => (value * Math.PI) / 180;
  const deltaLat = toRadians(to.lat - from.lat);
  const deltaLng = toRadians(to.lng - from.lng);
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);

  const a =
    Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

function cityCoords(city) {
  return coords.find(item => item.city === city)?.coords ?? null;
}

function fallbackCenter(city) {
  const anchor = cityCoords(city);
  return { lat: anchor?.lat ?? DELHI.lat, lng: anchor?.lng ?? DELHI.lng };
}

function RecenterMap({ position }) {
  const map = useMap();

  useEffect(() => {
    if (!position) return;
    map.flyTo([position.lat, position.lng], Math.max(map.getZoom(), 12), { duration: 0.35 });
  }, [map, position]);

  return null;
}

function slotFromProfile(profile, key) {
  if (key === 'location_2') {
    return {
      key,
      label: 'Location 2',
      city: profile?.location_2_city,
      state: profile?.location_2_state,
      latitude: profile?.location_2_latitude,
      longitude: profile?.location_2_longitude,
      active: Boolean(profile?.location_2_active),
      expiresAt: profile?.location_2_expires_at,
      locked: Boolean(profile?.location_2_change_locked),
      allowChangeAt: profile?.location_2_allow_change_at,
      lastChangedAt: profile?.location_2_last_changed_at,
    };
  }

  if (key === 'location_3') {
    return {
      key,
      label: 'Location 3',
      city: profile?.location_3_city,
      state: profile?.location_3_state,
      latitude: profile?.location_3_latitude,
      longitude: profile?.location_3_longitude,
      active: Boolean(profile?.location_3_active),
      expiresAt: profile?.location_3_expires_at,
      locked: Boolean(profile?.location_3_change_locked),
      allowChangeAt: profile?.location_3_allow_change_at,
      lastChangedAt: profile?.location_3_last_changed_at,
    };
  }

  return {
    key: 'primary',
    label: 'Primary Location',
    city: profile?.city,
    state: profile?.state,
    latitude: profile?.latitude,
    longitude: profile?.longitude,
    active: true,
    expiresAt: null,
    locked: Boolean(profile?.location_change_locked),
    allowChangeAt: profile?.allow_location_change_at,
    lastChangedAt: profile?.date_of_location,
  };
}

function LocationSlotPanel({ profile, slot, onSaved }) {
  const queryClient = useQueryClient();
  const { updateProfile } = useAuthStore();
  const initial = useMemo(() => {
    if (Number.isFinite(Number(slot.latitude)) && Number.isFinite(Number(slot.longitude))) {
      return { lat: Number(slot.latitude), lng: Number(slot.longitude) };
    }
    return fallbackCenter(slot.city || profile?.city);
  }, [profile?.city, slot.city, slot.latitude, slot.longitude]);

  const [position, setPosition] = useState(initial);
  const [manualLat, setManualLat] = useState(initial.lat.toFixed(6));
  const [manualLng, setManualLng] = useState(initial.lng.toFixed(6));
  const [manualError, setManualError] = useState('');
  const anchor = cityCoords(slot.city || profile?.city);

  useEffect(() => {
    setPosition(initial);
    setManualLat(initial.lat.toFixed(6));
    setManualLng(initial.lng.toFixed(6));
    setManualError('');
  }, [initial]);

  const saveMutation = useMutation({
    mutationFn: payload => apiClient.patch('/api/v1/profiles/me/location', payload),
    onSuccess: response => {
      const updated = response.data?.data?.profile ?? response.data?.profile;
      if (updated) updateProfile(updated);
      queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });
      toast.success(`${slot.label} updated`);
      onSaved?.();
    },
    onError: error => {
      toast.error(
        error?.response?.data?.message ||
          error?.payload?.message ||
          error?.message ||
          'Unable to save this location.',
      );
    },
  });

  const nextAllowed = slot.allowChangeAt
    ? dayjs(slot.allowChangeAt).format('MMM D, YYYY')
    : slot.lastChangedAt
      ? dayjs(slot.lastChangedAt).add(30, 'day').format('MMM D, YYYY')
      : null;

  const save = nextPosition => {
    if (slot.locked) {
      toast.error('This location can only be changed once every 30 days.');
      return;
    }

    if (!slot.city || !slot.state) {
      toast.error('Add a city and state to this location first.');
      return;
    }

    saveMutation.mutate({
      slot: slot.key,
      state: slot.state,
      city: slot.city,
      latitude: nextPosition.lat,
      longitude: nextPosition.lng,
    });
  };

  const handleManualCoordinates = event => {
    event.preventDefault();
    setManualError('');

    const latitude = Number.parseFloat(manualLat);
    const longitude = Number.parseFloat(manualLng);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setManualError('Enter numeric latitude and longitude values.');
      return;
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      setManualError('Latitude must be between -90 and 90 and longitude between -180 and 180.');
      return;
    }

    if (!anchor) {
      setManualError('A city-center anchor is not available for this location.');
      return;
    }

    const distance = haversineKm(anchor, { lat: latitude, lng: longitude });

    if (distance > MAX_MANUAL_DISTANCE_KM) {
      setManualError(
        `That point is ${distance.toFixed(1)} km from ${slot.city} center. Choose a point within ${MAX_MANUAL_DISTANCE_KM} km.`,
      );
      return;
    }

    setPosition({ lat: latitude, lng: longitude });
    save({ lat: latitude, lng: longitude });
  };

  if (!slot.active) {
    return (
      <div className="rounded-3xl border border-border/60 bg-card p-8 text-center shadow-sm">
        <p className="text-sm font-bold text-foreground">{slot.label} is not active</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Purchase the monthly addon from Addons to pin this location.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-foreground">{slot.label} pin</p>
            <p className="mt-1 font-mono text-sm text-muted-foreground">
              ({position.lat.toFixed(4)}, {position.lng.toFixed(4)})
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {slot.city || 'City not set'}
              {slot.state ? `, ${slot.state}` : ''}
            </p>
            {slot.expiresAt ? (
              <p className="mt-1 text-xs font-semibold text-muted-foreground">
                Subscription expires {dayjs(slot.expiresAt).format('MMM D, YYYY')}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-3">
            {slot.locked ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground">
                <Clock3 className="h-3.5 w-3.5" />
                Locked until {nextAllowed || 'cooldown ends'}
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                <Check className="h-3.5 w-3.5" />
                Eligible to change
              </span>
            )}

            <Button
              type="button"
              variant="outline"
              onClick={() => setPosition(initial)}
              className="rounded-xl border-border/60"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset Pin
            </Button>
          </div>
        </div>
      </section>

      <section className="relative z-0 overflow-hidden rounded-3xl border border-border/60 bg-card p-3 shadow-sm">
        <div className="relative z-0 h-[460px] w-full overflow-hidden rounded-2xl">
          <MapContainer
            center={[position.lat, position.lng]}
            zoom={12}
            scrollWheelZoom
            className="z-0 h-full w-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <RecenterMap position={position} />
            <Marker
              position={[position.lat, position.lng]}
              draggable
              autoPan
              eventHandlers={{
                dragend: event => {
                  const next = event.target.getLatLng();
                  const nextPosition = { lat: next.lat, lng: next.lng };
                  setPosition(nextPosition);
                  setManualLat(next.lat.toFixed(6));
                  setManualLng(next.lng.toFixed(6));
                  setManualError('');
                },
              }}
            />
          </MapContainer>
        </div>
      </section>

      <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
        <h2 className="text-lg font-bold text-foreground">Manual coordinates</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Fine-tune the pin. Coordinates are fuzzed within 5 km by the server.
        </p>

        <form onSubmit={handleManualCoordinates} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <label htmlFor={`${slot.key}-latitude`} className="text-sm font-semibold">
              Latitude
            </label>
            <Input
              id={`${slot.key}-latitude`}
              value={manualLat}
              inputMode="decimal"
              onChange={event => setManualLat(event.target.value)}
              disabled={slot.locked}
              className="h-11 rounded-xl border-border/60 font-mono"
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor={`${slot.key}-longitude`} className="text-sm font-semibold">
              Longitude
            </label>
            <Input
              id={`${slot.key}-longitude`}
              value={manualLng}
              inputMode="decimal"
              onChange={event => setManualLng(event.target.value)}
              disabled={slot.locked}
              className="h-11 rounded-xl border-border/60 font-mono"
            />
          </div>

          {manualError ? (
            <p className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-800 sm:col-span-2 dark:text-amber-300">
              {manualError}
            </p>
          ) : null}

          <div className="flex flex-wrap justify-end gap-3 sm:col-span-2">
            <Button
              type="button"
              onClick={() => save(position)}
              disabled={slot.locked || saveMutation.isPending}
              className="rounded-xl bg-amber-400 px-6 font-bold text-slate-900 hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
            >
              {saveMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <MapPin className="mr-2 h-4 w-4" />
              )}
              Save {slot.label}
            </Button>

            <Button
              type="submit"
              disabled={slot.locked || saveMutation.isPending}
              className="rounded-xl bg-primary px-6 font-bold text-primary-foreground hover:bg-primary/90"
            >
              <Navigation className="mr-2 h-4 w-4" />
              Use Manual Coordinates
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}

function Location() {
  const { currentUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState('primary');

  const {
    data: profileResponse,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['profile', 'me'],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/profiles/me');
      return response.data;
    },
    staleTime: 30_000,
  });

  const profile = useMemo(
    () =>
      profileResponse?.data?.profile ??
      profileResponse?.profile ??
      profileResponse ??
      currentUser ??
      {},
    [profileResponse, currentUser],
  );

  const slots = useMemo(
    () => [
      slotFromProfile(profile, 'primary'),
      slotFromProfile(profile, 'location_2'),
      slotFromProfile(profile, 'location_3'),
    ],
    [profile],
  );

  const tabs = slots.filter(slot => slot.active);
  const activeSlot = tabs.find(slot => slot.key === activeTab) ?? tabs[0];

  useEffect(() => {
    if (!tabs.some(slot => slot.key === activeTab)) setActiveTab('primary');
  }, [activeTab, tabs]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-background px-4">
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-border/60 bg-card p-8 shadow-sm">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">Loading your location...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-background px-4">
        <div className="max-w-md rounded-3xl border border-destructive/20 bg-card p-8 text-center shadow-sm">
          <p className="text-lg font-bold text-destructive">Location could not load</p>
          <p className="mt-2 text-sm text-destructive/90">
            {error?.message || 'Please try again in a moment.'}
          </p>
          <Button className="mt-5 rounded-xl" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 rounded-3xl border border-border/60 bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <MapPin className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-foreground">
                Discovery locations
              </h1>
              <p className="text-sm text-muted-foreground">
                Each purchased location has its own map and independent 30-day cooldown.
              </p>
            </div>
          </div>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">
            {tabs.length} active location{tabs.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="flex gap-2 overflow-x-auto rounded-2xl border border-border/60 bg-card p-2 shadow-sm">
          {tabs.map(slot => {
            const selected = activeSlot?.key === slot.key;
            return (
              <button
                key={slot.key}
                type="button"
                data-testid={`location-tab-${slot.key}`}
                onClick={() => setActiveTab(slot.key)}
                className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                  selected
                    ? 'bg-amber-400 text-slate-900'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {slot.label}
                {slot.city ? `: ${slot.city}` : ''}
              </button>
            );
          })}
        </div>

        {activeSlot ? (
          <LocationSlotPanel
            key={activeSlot.key}
            profile={profile}
            slot={activeSlot}
            onSaved={() => refetch()}
          />
        ) : null}

        <section className="rounded-3xl border border-border/60 bg-card p-5 text-sm text-muted-foreground shadow-sm">
          <p className="font-bold text-foreground">Privacy guarantee</p>
          <p className="mt-2">
            MarryLocal fuzzes every saved coordinate by up to 5 km. Exact GPS coordinates and street
            addresses are never stored.
          </p>
        </section>
      </div>
    </div>
  );
}

export default Location;
