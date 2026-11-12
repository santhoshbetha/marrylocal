import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Clock3, Loader2, MapPin, Navigation, RotateCcw, X } from 'lucide-react';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

function cityCenter(profile) {
  const cityCoords = coords.find(item => item.city === profile?.city)?.coords;

  return {
    lat: profile?.latitude ?? cityCoords?.lat ?? DELHI.lat,
    lng: profile?.longitude ?? cityCoords?.lng ?? DELHI.lng,
  };
}

function cityAnchor(profile) {
  return coords.find(item => item.city === profile?.city)?.coords ?? null;
}

function RecenterMap({ position }) {
  const map = useMap();

  useEffect(() => {
    if (!position) return;
    map.flyTo([position.lat, position.lng], Math.max(map.getZoom(), 13), {
      duration: 0.35,
    });
  }, [map, position.lat, position.lng]);

  return null;
}

function Location() {
  const { currentUser, updateProfile } = useAuthStore();
  const queryClient = useQueryClient();
  const [draftPosition, setDraftPosition] = useState(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [geoConfirmOpen, setGeoConfirmOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [manualDistance, setManualDistance] = useState(null);
  const [manualError, setManualError] = useState('');

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

  const profile =
    profileResponse?.data?.profile ??
    profileResponse?.profile ??
    profileResponse ??
    currentUser ??
    {};

  const center = useMemo(() => cityCenter(profile), [profile]);
  const markerPosition = draftPosition ?? center;
  const anchor = useMemo(() => cityAnchor(profile), [profile]);

  useEffect(() => {
    setManualLat(center.lat.toFixed(6));
    setManualLng(center.lng.toFixed(6));
    setManualDistance(null);
    setManualError('');
  }, [center.lat, center.lng]);

  const dateOfCoordinates = profile?.date_of_coordinates;
  const dateAllowed = !dateOfCoordinates || dayjs().diff(dayjs(dateOfCoordinates), 'day') >= 30;
  const serverLocked = profile?.coords_change_locked;
  const coordsLocked = typeof serverLocked === 'boolean' ? serverLocked : !dateAllowed;

  const nextAllowed = profile?.allow_coords_change_at
    ? dayjs(profile.allow_coords_change_at).format('MMM D, YYYY')
    : dateOfCoordinates
      ? dayjs(dateOfCoordinates).add(30, 'day').format('MMM D, YYYY')
      : null;

  const saveCoordsMutation = useMutation({
    mutationFn: async payload => apiClient.patch('/api/v1/profiles/me', payload),
    onSuccess: response => {
      const updatedProfile =
        response.data?.data?.profile ?? response.data?.profile ?? response.data;

      updateProfile(updatedProfile);
      queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });
      setDraftPosition(null);
      setGeoConfirmOpen(false);
      toast.success('GPS Coordinates locked successfully');
    },
    onError: error => {
      toast.error(
        error?.payload?.message ||
          error?.response?.data?.message ||
          error?.message ||
          'Unable to save coordinates.',
      );
    },
  });

  const resetCoordsMutation = useMutation({
    mutationFn: async payload => apiClient.patch('/api/v1/profiles/me', payload),
    onSuccess: response => {
      const updatedProfile =
        response.data?.data?.profile ?? response.data?.profile ?? response.data;

      updateProfile(updatedProfile);
      queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });
      setDraftPosition(null);
      setResetConfirmOpen(false);
      toast.success('Default city coordinates restored');
    },
    onError: error => {
      toast.error(
        error?.payload?.message ||
          error?.response?.data?.message ||
          error?.message ||
          'Unable to reset coordinates.',
      );
    },
  });

  const getCurrentLocation = () => {
    if (coordsLocked) {
      toast.error('Your coordinate cooldown is still active.');
      return;
    }

    if (!navigator.geolocation) {
      toast.error('Geolocation is not available in this browser.');
      return;
    }

    setIsGettingLocation(true);

    navigator.geolocation.getCurrentPosition(
      position => {
        const nextPosition = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        setDraftPosition(nextPosition);
        setManualLat(nextPosition.lat.toFixed(6));
        setManualLng(nextPosition.lng.toFixed(6));
        setManualDistance(null);
        setManualError('');
        setIsGettingLocation(false);
        setGeoConfirmOpen(true);
      },
      geoError => {
        const messages = {
          1: 'Location permission denied. Allow location access in browser settings.',
          2: 'Location unavailable. Check your GPS and try again.',
          3: 'Location request timed out. Please try again.',
        };

        toast.error(messages[geoError.code] || 'Unable to read your location.');
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
    );
  };

  const saveCoordinates = () => {
    if (coordsLocked) {
      toast.error('Your coordinate cooldown is still active.');
      return;
    }

    saveCoordsMutation.mutate({
      latitude: markerPosition.lat,
      longitude: markerPosition.lng,
    });
  };

  const resetCoordinates = () => {
    if (coordsLocked) {
      toast.error('Your coordinate cooldown is still active.');
      return;
    }

    resetCoordsMutation.mutate({
      latitude: center.lat,
      longitude: center.lng,
    });
  };

  const handleManualCoordinates = event => {
    event.preventDefault();

    if (coordsLocked) {
      toast.error('Your coordinate cooldown is still active.');
      return;
    }

    const latitude = Number.parseFloat(manualLat);
    const longitude = Number.parseFloat(manualLng);

    setManualError('');
    setManualDistance(null);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setManualError('Enter numeric latitude and longitude values.');
      toast.error('Enter numeric latitude and longitude values.');
      return;
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      setManualError('Latitude must be between -90 and 90, and longitude between -180 and 180.');
      toast.error('Coordinates are outside the valid geographic range.');
      return;
    }

    if (!anchor) {
      setManualError(
        'A city-center anchor is not available for your city. Update your city in Settings first.',
      );
      toast.error('City-center anchor is unavailable.');
      return;
    }

    const distance = haversineKm(anchor, { lat: latitude, lng: longitude });
    setManualDistance(distance);

    if (distance > MAX_MANUAL_DISTANCE_KM) {
      const message = `That point is ${distance.toFixed(1)} km from ${profile?.city} center. Choose a point within ${MAX_MANUAL_DISTANCE_KM} km.`;
      setManualError(message);
      toast.error(message);
      return;
    }

    saveCoordsMutation.mutate({ latitude, longitude });
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-background px-4">
        <div className="bg-card border border-border rounded-3xl p-8 shadow-xs flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
          <p className="text-sm font-medium text-muted-foreground">Loading your location...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-background px-4">
        <div className="bg-card border border-rose-100 rounded-3xl p-8 shadow-xs text-center max-w-md">
          <p className="text-lg font-bold text-rose-900">Location could not load</p>
          <p className="mt-2 text-sm text-rose-700">
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
        <div className="flex flex-col gap-4 bg-card border border-border rounded-3xl p-6 shadow-xs sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100">
              <MapPin className="h-6 w-6 text-amber-700" />
            </span>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-foreground">
                {profile?.user_coordinates_set ? 'Change GPS Location' : 'Set GPS Location'}
              </h1>
              <p className="text-sm text-muted-foreground">
                Pin your exact locale. PostGIS validation and the 30-day cooldown are server-owned.
              </p>
            </div>
          </div>

          {coordsLocked && (
            <span className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-bold text-amber-900">
              <Clock3 className="h-3.5 w-3.5" />
              Locked until {nextAllowed || 'cooldown ends'}
            </span>
          )}
        </div>

        {coordsLocked && (
          <div className="rounded-3xl border border-amber-100 bg-accent p-5 shadow-xs">
            <p className="font-bold text-amber-900">Coordinate cooldown active</p>
            <p className="mt-1 text-sm text-accent-foreground">
              Last pinned:{' '}
              {dateOfCoordinates ? dayjs(dateOfCoordinates).format('MMM D, YYYY') : 'recently'}. You
              can pin again on {nextAllowed || 'the next eligible date'}.
            </p>
          </div>
        )}

        <section className="bg-card border border-border rounded-3xl p-6 shadow-xs">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-foreground">Current pin</p>
              <p className="mt-1 font-mono text-sm text-muted-foreground">
                ({markerPosition.lat.toFixed(4)}, {markerPosition.lng.toFixed(4)})
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {profile?.city || 'City not set'}
                {profile?.state ? `, ${profile.state}` : ''}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                onClick={getCurrentLocation}
                disabled={isGettingLocation || coordsLocked}
                className="w-full bg-primary hover:bg-primary/90 text-slate-900 font-bold px-6 py-4 rounded-2xl shadow-md transition-all disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isGettingLocation ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Navigation className="mr-2 h-4 w-4" />
                )}
                Get My Coordinates
              </Button>

              {profile?.user_coordinates_set && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setResetConfirmOpen(true)}
                  disabled={coordsLocked || resetCoordsMutation.isPending}
                  className="rounded-xl border-orange-200 text-orange-700 hover:bg-orange-50"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset to Default
                </Button>
              )}
            </div>
          </div>

          <div className="mt-4 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-sm text-amber-800 dark:text-amber-300">
            ⚠️ Information Notice: Profile geographic parameters may only be modified once per
            month. Fine-tuning precise GPS coordinates is immediately unlocked and permitted
            following a valid City or Location update.
            <p className="mt-2">
              🔒 Privacy Guarantee: To guarantee absolute personal safety, MarryLocal applies a
              strict 5-kilometer server-side fuzzing mask to all GPS inputs. Your exact real-world
              street location is never saved or stored.
            </p>
          </div>
        </section>

        <section className="relative z-0 overflow-hidden rounded-3xl border border-border bg-card p-3 shadow-xs">
          <div className="relative z-0 h-[520px] w-full overflow-hidden rounded-2xl">
            <MapContainer
              center={[center.lat, center.lng]}
              zoom={13}
              scrollWheelZoom
              className="z-0 h-full w-full"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <RecenterMap position={markerPosition} />
              <Marker
                position={[markerPosition.lat, markerPosition.lng]}
                draggable
                autoPan
                eventHandlers={{
                  dragend: event => {
                    const next = event.target.getLatLng();
                    setDraftPosition({ lat: next.lat, lng: next.lng });
                    setManualLat(next.lat.toFixed(6));
                    setManualLng(next.lng.toFixed(6));
                    setManualDistance(null);
                    setManualError('');
                  },
                }}
              />
            </MapContainer>
          </div>
        </section>

        <section className="bg-card border border-border rounded-3xl p-5 shadow-xs">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-bold text-foreground">Manual coordinates</h2>
            <p className="text-sm text-muted-foreground">
              Fine-tune your pin without dragging the map. The point must stay within{' '}
              {MAX_MANUAL_DISTANCE_KM} km of the {profile?.city || 'your city'} center.
            </p>
          </div>

          <form onSubmit={handleManualCoordinates} className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <label
                htmlFor="manual-latitude"
                className="text-sm font-semibold text-muted-foreground"
              >
                Latitude
              </label>
              <Input
                id="manual-latitude"
                inputMode="decimal"
                autoComplete="off"
                value={manualLat}
                onChange={event => {
                  setManualLat(event.target.value);
                  setManualError('');
                  setManualDistance(null);
                }}
                placeholder="12.971600"
                disabled={coordsLocked}
                className="h-11 rounded-xl border-border/60 font-mono focus:border-primary"
              />
            </div>

            <div className="grid gap-2">
              <label
                htmlFor="manual-longitude"
                className="text-sm font-semibold text-muted-foreground"
              >
                Longitude
              </label>
              <Input
                id="manual-longitude"
                inputMode="decimal"
                autoComplete="off"
                value={manualLng}
                onChange={event => {
                  setManualLng(event.target.value);
                  setManualError('');
                  setManualDistance(null);
                }}
                placeholder="77.594600"
                disabled={coordsLocked}
                className="h-11 rounded-xl border-border/60 font-mono focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                City anchor:{' '}
                {anchor
                  ? `${anchor.lat.toFixed(4)}, ${anchor.lng.toFixed(4)}`
                  : 'Unavailable for this city'}
                {manualDistance !== null ? ` · ${manualDistance.toFixed(1)} km from center` : ''}
              </p>
              <Button
                type="submit"
                disabled={coordsLocked || saveCoordsMutation.isPending}
                className="rounded-xl bg-primary px-5 text-primary-foreground font-bold hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saveCoordsMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                Verify and Lock Coordinates
              </Button>
            </div>
          </form>

          {manualError ? (
            <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300">
              {manualError}
            </div>
          ) : null}
        </section>

        <section className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Drag the marker to refine your pin, then save it. Location changes are limited to once
            every 30 days.
          </p>
          <Button
            type="button"
            onClick={() => setGeoConfirmOpen(true)}
            disabled={coordsLocked || saveCoordsMutation.isPending}
            className="rounded-xl bg-amber-400 px-6 text-slate-900 dark:text-slate-900 font-bold shadow-xs hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
          >
            {saveCoordsMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <MapPin className="mr-2 h-4 w-4" />
            )}
            Save Coordinates
          </Button>
        </section>
      </div>

      <Dialog open={geoConfirmOpen} onOpenChange={setGeoConfirmOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-foreground">Confirm GPS coordinates</DialogTitle>
            <DialogDescription>
              Your location will be locked to (
              <span className="font-mono font-semibold text-muted-foreground">
                {markerPosition.lat.toFixed(4)}, {markerPosition.lng.toFixed(4)}
              </span>
              ).
            </DialogDescription>
          </DialogHeader>

          {coordsLocked ? (
            <div className="rounded-2xl border border-amber-100 bg-accent p-4 text-sm text-accent-foreground">
              Next coordinate change is available on {nextAllowed || 'the next eligible date'}.
            </div>
          ) : (
            <DialogFooter className="gap-3">
              <DialogClose asChild>
                <Button type="button" variant="outline" className="rounded-xl">
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type="button"
                onClick={saveCoordinates}
                disabled={saveCoordsMutation.isPending}
                className="rounded-xl bg-amber-400 px-5 text-slate-900 dark:text-slate-900 font-bold hover:bg-amber-300"
              >
                {saveCoordsMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                Lock Coordinates
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-foreground">Reset to city center?</DialogTitle>
            <DialogDescription>
              This restores the coordinates for {profile?.city || 'your city'} and starts the 30-day
              cooldown.
            </DialogDescription>
          </DialogHeader>

          {coordsLocked ? (
            <div className="rounded-2xl border border-amber-100 bg-accent p-4 text-sm text-accent-foreground">
              Coordinate changes are locked until {nextAllowed || 'the next eligible date'}.
            </div>
          ) : (
            <DialogFooter className="gap-3">
              <DialogClose asChild>
                <Button type="button" variant="outline" className="rounded-xl">
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type="button"
                onClick={resetCoordinates}
                disabled={resetCoordsMutation.isPending}
                className="rounded-xl bg-orange-400 px-5 text-foreground font-bold hover:bg-orange-300"
              >
                {resetCoordsMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="mr-2 h-4 w-4" />
                )}
                Reset Coordinates
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Location;
