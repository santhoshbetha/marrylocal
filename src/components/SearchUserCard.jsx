import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, MapPin } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MEDIA_BASE_URL } from '@/lib/media';

const CDNURL = MEDIA_BASE_URL;

export function SearchUserCard({
  images,
  shortid,
  firstname,
  age,
  gender,
  setUserdata,
  educationlevel,
  community,
  economicstatus,
  distance,
}) {
  const [removing, setRemoving] = useState(false);

  const removeClick = async e => {
    e.preventDefault();
    e.stopPropagation();
    setRemoving(true);
    setUserdata(null);
    setRemoving(false);
  };

  return (
    <>
      <Card className="bg-background rounded-xl shadow-lg border border-border hover:shadow-xl hover:border-primary/30 transition-all duration-200 hover:scale-[1.01] overflow-hidden group w-[220px] relative">
        {/* Action Buttons Overlay */}
        <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 rounded-full bg-destructive/10 border-destructive/20 hover:bg-destructive hover:border-destructive text-destructive hover:text-destructive-foreground"
                  onClick={removeClick}
                  disabled={removing}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Remove from search</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <CardContent className="p-4">
          <div className="flex flex-col items-center space-y-3">
            {/* Enhanced Profile Image */}
            <div className="relative">
              <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-primary/10 via-primary/5 to-primary/10 ring-1 ring-primary/20 group-hover:ring-primary/40 transition-all duration-300">
                {images && images.length > 0 ? (
                  <img
                    src={`${CDNURL}/${shortid}/first`}
                    alt={firstname}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {gender === 'Male' ? (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                        <span className="text-white font-bold text-lg">
                          {firstname?.charAt(0)?.toUpperCase()}
                        </span>
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center">
                        <span className="text-white font-bold text-lg">
                          {firstname?.charAt(0)?.toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {/* Gender indicator */}
              <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full border-2 border-background shadow-sm flex items-center justify-center">
                {gender === 'Male' ? (
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                ) : (
                  <div className="w-3 h-3 rounded-full bg-pink-500"></div>
                )}
              </div>
            </div>

            {/* Profile Info */}
            <div className="text-center space-y-2 w-full">
              <div className="flex items-center justify-center gap-2">
                <h4 className="font-semibold text-base text-foreground group-hover:text-primary transition-colors">
                  {firstname}, {age}
                </h4>
              </div>

              <div className="space-y-1">
                {educationlevel && (
                  <p className="text-xs font-medium text-foreground">{educationlevel}</p>
                )}
                {community && <p className="text-xs text-muted-foreground">{community}</p>}
                <div className="flex items-center justify-center gap-1 flex-wrap">
                  {economicstatus && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                      {economicstatus}
                    </Badge>
                  )}
                  {distance && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                      <MapPin className="w-2.5 h-2.5 mr-1" />
                      {Math.round(distance)}km
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
