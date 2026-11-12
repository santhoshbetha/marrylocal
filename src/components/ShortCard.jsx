import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, X, CheckCircle, AlertTriangle, MapPin, Clock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useRemoveFromShortlist } from '@/hooks/useShortlist';
import secureLocalStorage from 'react-secure-storage';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

// Extend dayjs with relativeTime plugin
dayjs.extend(relativeTime);

const CDNURL = import.meta.env.VITE_MEDIA_BASE_URL || '';

function isObjEmpty(val) {
  return val == null ||
    val.length <= 0 ||
    (Object.keys(val).length === 0 && val.constructor === Object)
    ? true
    : false;
}

export function ShortCard({ loggedInUser, userprofile, profiledata, setProfiledata }) {
  const [removing, setRemoving] = useState(false);
  const removeFromShortlist = useRemoveFromShortlist();

  async function removeFromShortlistNow(shortidtoremove) {
    await removeFromShortlist.mutateAsync({
      userid: loggedInUser,
      shortidtoremove: shortidtoremove,
    });

    if (!removeFromShortlist.isError) {
      setRemoving(false);
    } else {
      setRemoving(false);
    }
    setRemoving(false);
  }

  const removeFromShortlistClick = async e => {
    e.preventDefault();
    e.stopPropagation();
    //remove user from shortlist data
    setRemoving(true);
    await removeFromShortlistNow(userprofile?.shortid);

    const shortlistarrayfromstorage = JSON.parse(localStorage.getItem('shortlistarray'));

    if (shortlistarrayfromstorage != null) {
      const slnew = shortlistarrayfromstorage.filter(item => item !== userprofile?.shortid);
      if (slnew.length == 0) {
        localStorage.removeItem('shortlistarray');
        setProfiledata({ ...profiledata, shortlist: null });
      } else {
        localStorage.setItem('shortlistarray', JSON.stringify(slnew));
        setProfiledata({ ...profiledata, shortlist: slnew });
      }
    }
  };

  return (
    <Card
      key={userprofile?.shortid}
      onClick={() => localStorage.setItem('activetab', 'shortlist')}
      className="bg-background rounded-2xl shadow-xl border border-border hover:shadow-2xl hover:border-primary/20 transition-all duration-300 hover:scale-[1.02] cursor-pointer overflow-hidden group w-[200px] relative"
    >
      {/* Remove Button */}
      <div className="absolute top-3 right-3 z-10">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 rounded-full bg-destructive/10 border-destructive/20 hover:bg-destructive hover:border-destructive text-destructive hover:text-destructive-foreground transition-all duration-200 p-0"
                onClick={e => {
                  removeFromShortlistClick(e);
                  secureLocalStorage.setItem('reloadshortlistdata', true);
                }}
                disabled={removing}
              >
                <X className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Remove from shortlist</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <CardContent className="p-3">
        <div className="flex flex-col items-center space-y-4">
          {/* Enhanced Profile Image */}
          <div className="relative">
            <div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 ring-2 ring-primary/10 group-hover:ring-primary/30 transition-all duration-300">
              {!isObjEmpty(userprofile?.images) ? (
                <img
                  src={`${CDNURL}/${userprofile?.shortid}/${userprofile?.images[0]}`}
                  alt={userprofile?.firstname}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                    <span className="text-white font-bold text-lg">
                      {userprofile?.firstname?.charAt(0)?.toUpperCase()}
                    </span>
                  </div>
                </div>
              )}
            </div>
            {/* Online indicator */}
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-background shadow-sm"></div>
          </div>

          {/* Profile Info */}
          <div className="text-center space-y-2 w-full">
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <h4 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                {userprofile?.firstname}, {userprofile?.age}
              </h4>
              <TooltipProvider>
                {userprofile?.aadharverified ||
                userprofile?.passportverified ||
                userprofile?.licenseverified ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Verified</p>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Not Verified</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </TooltipProvider>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">{userprofile?.educationlevel}</p>
              <p className="text-sm text-muted-foreground">{userprofile?.community}</p>
              <div className="flex items-center justify-center gap-1">
                <Badge variant="outline" className="text-xs px-2 py-0">
                  {userprofile?.economicstatus}
                </Badge>
              </div>
            </div>
          </div>

          {/* Activity Info */}
          <div className="w-full pt-1 border-t border-border/50">
            <div className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
              <Clock className="w-2.5 h-2.5" />
              {!isObjEmpty(userprofile?.timeoflogin) ? (
                <span className="text-green-600 dark:text-green-400 font-medium">
                  Active {dayjs(userprofile?.timeoflogin).fromNow()}
                </span>
              ) : (
                <span>Recently joined</span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
