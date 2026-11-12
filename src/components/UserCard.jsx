import { Card, CardContent } from '@/components/ui/card';
import { Heart, CheckCircle, AlertTriangle, MapPin, Clock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

// Extend dayjs with relativeTime plugin
dayjs.extend(relativeTime);

function isObjEmpty(val) {
  return val == null ||
    val.length <= 0 ||
    (Object.keys(val).length === 0 && val.constructor === Object)
    ? true
    : false;
}

const CDNURL = import.meta.env.VITE_MEDIA_BASE_URL || '';
export function UserCard({ setSelectedUser, profile, shortlisted }) {
  return (
    <Card
      key={profile?.userid}
      onClick={() => setSelectedUser(profile)}
      className="relative bg-background rounded-2xl shadow-xl border border-border hover:shadow-2xl hover:border-primary/20 transition-all duration-300 hover:scale-[1.02] cursor-pointer overflow-hidden group"
    >
      {shortlisted && (
        <div className="absolute top-4 right-4 z-20 opacity-100">
          <div className="rounded-full p-2 shadow-lg bg-red-500">
            <Heart className="w-4 h-4 text-white" fill="white" />
          </div>
        </div>
      )}

      <div className="absolute top-4 right-4" hidden>
        {/* Inner Heart (Filled) */}
        <Heart
          size={30}
          strokeWidth={0} // No stroke for the filled part
          fill="currentColor" // Uses parent's text color (red in this case)
          className="text-red-500"
        />
      </div>

      <CardContent className="p-4 sm:p-6 flex flex-col h-full">
        <div className="flex flex-col sm:flex-row gap-4 mb-4 flex-grow">
          {/* Enhanced Profile Image */}
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-primary/30 via-primary/15 via-primary/10 to-primary/5 ring-2 ring-primary/20 group-hover:ring-primary/40 shadow-lg group-hover:shadow-xl transition-all duration-500 mx-auto sm:mx-0 backdrop-blur-sm">
            {profile?.images ? (
              <img
                src={`${CDNURL}/${profile?.shortid}/${profile?.images[0]}`}
                alt={profile?.firstname}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">
                    {typeof profile?.firstname === 'string'
                      ? profile.firstname.charAt(0).toUpperCase()
                      : '?'}
                  </span>
                </div>
              </div>
            )}
            {/* Online indicator */}
            <div className="absolute -bottom-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-green-500 rounded-full border-2 border-background shadow-sm"></div>
          </div>

          {/* Enhanced Profile Info */}
          <div className="flex-1 min-w-0 space-y-2 sm:space-y-3 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2 flex-wrap justify-center sm:justify-start">
              <h3 className="font-bold text-base sm:text-lg text-foreground group-hover:text-primary transition-colors break-words">
                {profile?.firstname || 'Unknown'}, {profile?.age || 'N/A'}
              </h3>
              <TooltipProvider>
                {profile?.aadharverified ||
                profile?.passportverified ||
                profile?.licenseverified ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="secondary"
                        className="bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 px-2 py-1 text-xs"
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Verified
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Identity Verified</p>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="secondary"
                        className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400 px-2 py-1 text-xs"
                      >
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Unverified
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Identity Not Verified</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </TooltipProvider>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground break-words">
                {profile?.educationlevel || 'Not specified'}
              </p>
              <p className="text-sm text-muted-foreground break-words">
                {profile?.community || 'Not specified'}
              </p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <Badge variant="outline" className="text-xs break-words">
                  {profile?.economicstatus || 'Not specified'}
                </Badge>
                <Badge variant="outline" className="text-xs break-words">
                  {profile?.language || 'Not specified'}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Footer with Last Login and Distance */}
        <div className="pt-3 sm:pt-4 border-t border-border/50 mt-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 text-xs text-muted-foreground">
            <div className="flex items-center gap-1 justify-center sm:justify-start">
              <Clock className="w-3 h-3 flex-shrink-0" />
              {!isObjEmpty(profile?.timeoflogin) ? (
                <span className="text-green-600 dark:text-green-400 font-medium break-words">
                  Active {dayjs(profile?.timeoflogin).fromNow()}
                </span>
              ) : (
                <span className="break-words">Recently joined</span>
              )}
            </div>
            {!isObjEmpty(profile?.distance) &&
            typeof profile?.distance === 'number' &&
            profile?.distance > 5 ? (
              <div className="flex items-center gap-1 justify-center sm:justify-end">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span className="font-medium break-words">
                  {Math.round(profile?.distance)} km away
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1 justify-center sm:justify-end">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span className="font-medium break-words">Nearby</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
