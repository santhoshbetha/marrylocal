import { useRef, useState, useEffect, useMemo } from 'react';
import { UserCard } from './UserCard';
import { UserProfileDialog } from './UserProfileDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LayoutGrid, Search } from 'lucide-react';

function isObjEmpty(val) {
  return val == null ||
    val.length <= 0 ||
    (Object.keys(val).length === 0 && val.constructor === Object)
    ? true
    : false;
}

function roundToTwo(num) {
  return +(Math.round(num + 'e+2') + 'e-2');
}

var toKilometers = function (miles) {
  return roundToTwo(miles * 1.609344);
};

var deg2rad = function (value) {
  return value * 0.017453292519943295;
};

function haversine(latIn1, lonIn1, latIn2, lonIn2) {
  // Retuns the great circle distance between two coordinate points in miles
  var dLat = deg2rad(latIn2 - latIn1);
  var dLon = deg2rad(lonIn2 - lonIn1);
  var lat1 = deg2rad(latIn1);
  var lat2 = deg2rad(latIn2);

  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return toKilometers(3960 * c);
}

export function SearchList({
  profiledata,
  searchProfiles,
  shortlist,
  searchresultszero,
  cityNum,
  loading,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
}) {
  const [sortmsg, setSortmsg] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const resultsRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentSort, setCurrentSort] = useState(''); // Track current sort type

  // Function to apply sorting to profiles
  const applySorting = (profiles, sortType) => {
    if (!sortType || isObjEmpty(profiles)) return profiles;

    const sortedProfiles = structuredClone(profiles);

    switch (sortType) {
      case 'login_time':
        sortedProfiles.sort((a, b) => new Date(b.last_login || 0) - new Date(a.last_login || 0));
        break;
      case 'age_asc':
        sortedProfiles.sort((a, b) => (a.age || 0) - (b.age || 0));
        break;
      case 'age_desc':
        sortedProfiles.sort((a, b) => (b.age || 0) - (a.age || 0));
        break;
      case 'distance':
        sortedProfiles.sort((a, b) => (a.distance || 0) - (b.distance || 0));
        break;
      default:
        return sortedProfiles;
    }

    return sortedProfiles;
  };

  // Memoize shortlist as a Set for efficient lookups
  const shortlistSet = useMemo(() => new Set(shortlist || []), [shortlist]);

  let [dataclone, setDataclone] = useState(searchProfiles);
  let datasort = structuredClone(searchProfiles);

  // Use all searchProfiles for infinite scroll (no local pagination)
  const currentProfiles = isObjEmpty(dataclone) ? [] : dataclone;

  useEffect(() => {
    if (!isObjEmpty(searchProfiles)) {
      // Apply current sort to new data
      const sortedData = applySorting(searchProfiles, currentSort);
      setDataclone(sortedData);
    }
  }, [searchProfiles, currentSort]);

  useEffect(() => {
    let lat;
    let lng;

    if (cityNum == 1) {
      lat = profiledata?.latitude;
      lng = profiledata?.longitude;
    } else if (cityNum == 2) {
      lat = profiledata?.addons?.location2?.lat;
      lng = profiledata?.addons?.location2?.lng;
    } else if (cityNum == 3) {
      lat = profiledata?.addons?.location3?.lat;
      lng = profiledata?.addons?.location3?.lng;
    } else {
      lat = profiledata?.latitude;
      lng = profiledata?.longitude;
    }

    if (!isObjEmpty(searchProfiles) && !isObjEmpty(dataclone)) {
      for (const eachuser of dataclone) {
        if (
          eachuser &&
          typeof eachuser.latitude === 'number' &&
          typeof eachuser.longitude === 'number'
        ) {
          const distance = haversine(lat, lng, eachuser.latitude, eachuser.longitude);
          eachuser.distance = distance;
        }
      }
    }
  }, [
    dataclone,
    cityNum,
    profiledata?.latitude,
    profiledata?.longitude,
    profiledata?.addons?.location2?.lat,
    profiledata?.addons?.location2?.lng,
    profiledata?.addons?.location3?.lat,
    profiledata?.addons?.location3?.lng,
    searchProfiles,
  ]);

  useEffect(() => {
    setIsLoading(loading);
  }, [loading]);

  if (!isObjEmpty(shortlist)) {
    localStorage.setItem('shortlistarray', JSON.stringify(shortlist));
  }

  const sortClick = e => {
    e.preventDefault();
    // Create a copy of all search profiles for sorting
    const allProfiles = structuredClone(searchProfiles || []);

    if (sortmsg == '' || sortmsg == 'Sorted by distance') {
      // Client-side sorting by login time (most recent first)
      const sortedProfiles = applySorting(allProfiles, 'login_time');
      setDataclone(sortedProfiles);
      setCurrentSort('login_time');
      setSortmsg('Sorted by login time');
    } else if (sortmsg == 'Sorted by login time') {
      // Client-side sorting by age ascending (youngest first)
      const sortedProfiles = applySorting(allProfiles, 'age_asc');
      setDataclone(sortedProfiles);
      setCurrentSort('age_asc');
      setSortmsg('Sorted by age - ascending');
    } else if (sortmsg == 'Sorted by age - ascending') {
      // Client-side sorting by age descending (oldest first)
      const sortedProfiles = applySorting(allProfiles, 'age_desc');
      setDataclone(sortedProfiles);
      setCurrentSort('age_desc');
      setSortmsg('Sorted by age - descending');
    } else if (sortmsg == 'Sorted by age - descending') {
      // Client-side sorting by distance (closest first)
      const sortedProfiles = applySorting(allProfiles, 'distance');
      setDataclone(sortedProfiles);
      setCurrentSort('distance');
      setSortmsg('Sorted by distance');
    }
  };

  return (
    <div className="container mx-auto px-4 pb-6 max-w-7xl">
      {/* Loading Progress Bar */}
      <div className="mb-6 relative h-2 bg-muted/30 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r from-primary via-primary/80 to-primary rounded-full transition-all duration-500 ${
            isLoading ? 'w-full animate-pulse' : 'w-0'
          }`}
          style={{
            animation: isLoading ? 'progress 1s ease-in-out infinite' : 'none',
          }}
        />
      </div>

      {/* No Results - Initial State */}
      {currentProfiles?.length == 0 && searchresultszero != true && (
        <Card className="bg-background rounded-2xl shadow-xl border border-border">
          <CardContent className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-muted rounded-full mb-6">
              <LayoutGrid className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Ready to Search</h3>
            <p className="text-muted-foreground">
              Your search results will appear here once you submit your preferences.
            </p>
          </CardContent>
        </Card>
      )}

      {/* No Results Found */}
      {currentProfiles?.length == 0 && searchresultszero == true && (
        <Card className="bg-background rounded-2xl shadow-xl border border-border">
          <CardContent className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 dark:bg-orange-900/20 rounded-full mb-6">
              <Search className="w-8 h-8 text-orange-600 dark:text-orange-400" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No Matches Found</h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your search criteria to find more potential matches.
            </p>
            <Button
              variant="outline"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="border-orange-200 text-orange-700 hover:bg-orange-100 hover:text-orange-800 hover:border-orange-300 dark:border-orange-800 dark:text-orange-400 dark:hover:bg-orange-900/40 dark:hover:text-orange-300 dark:hover:border-orange-700"
            >
              Adjust Search Criteria
            </Button>
          </CardContent>
        </Card>
      )}

      {currentProfiles?.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 mb-4 mx-2 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
              <span className="text-sm font-semibold text-primary">
                {currentProfiles?.length} {currentProfiles?.length === 1 ? 'Profile' : 'Profiles'}{' '}
                Found
              </span>
            </div>
            {sortmsg != '' && (
              <span className="text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded-md border">
                {sortmsg}
              </span>
            )}
          </div>
          <button
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-all duration-200 border border-border hover:border-primary/30"
            title="Sort by login date/age"
            onClick={e => {
              sortClick(e);
            }}
          >
            <LayoutGrid size={16} />
            <span className="hidden sm:inline">Sort</span>
          </button>
        </div>
      )}

      {/* User Profiles Grid */}
      <div ref={resultsRef} className="px-4">
        <div
          className={`col-span-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-2 transition-opacity duration-300 ${
            isLoading ? 'opacity-50' : 'opacity-100'
          }`}
        >
          {currentProfiles?.map(profile => (
            <UserCard
              key={profile?.shortid || profile?.id}
              setSelectedUser={setSelectedUser}
              profile={profile}
              shortlisted={shortlistSet.has(profile?.shortid)}
            />
          ))}
        </div>
      </div>

      {/* Load More Button for Infinite Scroll */}
      {hasNextPage && (
        <div className="flex justify-center mt-8">
          <Button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="px-8 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            {isFetchingNextPage ? 'Loading...' : 'Load More Profiles'}
          </Button>
        </div>
      )}

      {/* Results Summary */}
      {currentProfiles?.length > 0 && (
        <div className="text-center text-sm text-muted-foreground mt-6 pb-6">
          Showing {currentProfiles?.length} profiles
          {hasNextPage && ' (more available)'}
        </div>
      )}

      {/* User Profile Dialog */}
      {selectedUser && (
        <UserProfileDialog user={selectedUser} onClose={() => setSelectedUser(null)} />
      )}
    </div>
  );
}
