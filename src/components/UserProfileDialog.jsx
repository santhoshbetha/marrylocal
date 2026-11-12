import {
  X,
  MapPin,
  Phone,
  Mail,
  Flag,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Heart,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { FaFacebook, FaInstagram } from 'react-icons/fa';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAddToShortlist } from '@/hooks/useShortlist';
import { useAuth } from '../store/authStore';
import secureLocalStorage from 'react-secure-storage';

function isObjEmpty(val) {
  return val == null ||
    val.length <= 0 ||
    (Object.keys(val).length === 0 && val.constructor === Object)
    ? true
    : false;
}

const CDNURL = import.meta.env.VITE_MEDIA_BASE_URL || '';

export function UserProfileDialog({ user, onClose }) {
  const { user: loggedInUser, profiledata, setProfiledata } = useAuth();
  let [shortlisttext, setShortListtext] = useState('ADD TO SHORTLIST');
  let [buttonvariant, setButtonvariant] = useState('contain');
  const shortlistarray = JSON.parse(localStorage.getItem('shortlistarray'));

  const addToShortlist = useAddToShortlist();

  //const { data: userinfo } = useGetUserProfile({
  //  shortid: user?.shortid
  //});

  const images = user?.images
    ? user.images.filter(image => image && image.trim() !== '')
    : [user?.image || '/professional-portrait-in-urban-setting.jpg'].filter(Boolean);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const nextImage = () => {
    setCurrentImageIndex(prev => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex(prev => (prev - 1 + images.length) % images.length);
  };

  const goToImage = index => {
    setCurrentImageIndex(index);
  };

  const reportUser = () => {
    const subject = encodeURIComponent('Report User');
    const body = encodeURIComponent(
      `Reporting user ID: ${user?.shortid || user?.id}\n\nPlease provide details about the issue:`,
    );
    const mailtoLink = `mailto:?subject=${subject}&body=${body}`;
    window.location.href = mailtoLink;
  };

  const openInNewTab = () => {
    console.log('user handle::', user?.shortid);
    const profileUrl = `/user/${user?.shortid}`;
    localStorage.setItem('userstate', JSON.stringify({ backbutton: false }));
    window.open(profileUrl, '_blank', 'noopener,noreferrer');
  };

  const shortlistClick = async e => {
    e.preventDefault();

    setShortListtext('ADDED TO SHORTLIST'); //ADDED TO SHORTLIST
    setButtonvariant('ghost');

    //add this user to shortlistdata
    //const res = await addToShortlist(user?.id, shortid);

    await addToShortlist.mutateAsync({
      userid: loggedInUser?.id,
      shortid: user?.shortid,
    });

    if (!addToShortlist.isError) {
      let shortlistarrayfromstorage = JSON.parse(localStorage.getItem('shortlistarray'));

      if (shortlistarrayfromstorage == null) {
        shortlistarrayfromstorage = new Array();
        shortlistarrayfromstorage.push(user?.shortid);
      } else {
        shortlistarrayfromstorage.push(user?.shortid);
      }
      localStorage.setItem('shortlistarray', JSON.stringify(shortlistarrayfromstorage));

      //
      // Add to Profile Data
      //
      if (isObjEmpty(profiledata.shortlist)) {
        profiledata.shortlist = new Array();
        profiledata.shortlist.push(user?.shortid);
      } else {
        profiledata.shortlist?.push(user?.shortid);
      }

      setProfiledata({ ...profiledata, shortlist: profiledata?.shortlist });
    } else {
      alert('Shortlist failed. Try again');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-background dark:border-3 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-foreground">
              {user.firstname} ({user.city})
            </h2>
            {user?.aadharverified || user?.passportverified || user?.licenseverified ? (
              <div className="flex items-center gap-1 bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm font-medium">
                <CheckCircle className="h-4 w-4" />
                <span>Verified</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-sm font-medium">
                <AlertTriangle className="h-4 w-4" />
                <span>Not Verified</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={reportUser}
              className="p-2 hover:bg-destructive/10 rounded-full transition-colors group"
              aria-label="Report user"
              title="Report this user"
            >
              <Flag
                fill="red"
                className="w-5 h-5 text-destructive group-hover:scale-110 transition-transform"
              />
            </button>
            <button
              onClick={openInNewTab}
              className="p-2 hover:bg-primary/10 rounded-full transition-colors group"
              aria-label="Open in new tab"
              title="Open in new tab"
            >
              <ExternalLink className="w-5 h-5 text-primary transition-colors group-hover:text-primary/70" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-full transition-colors"
              aria-label="Close profile"
            >
              <X className="w-5 h-5 text-primary hover:text-primary/70" />
            </button>
          </div>
        </div>

        {/* Profile Image */}
        <div className="px-6 pt-2 flex justify-center">
          {!isObjEmpty(user?.images) && (
            <div className="relative w-full lg:max-w-lg mx-auto aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-muted to-muted/50 shadow-2xl group border border-border/50">
              {/* Carousel Images */}
              <div className="relative w-full h-full">
                {images.map((image, index) => (
                  <div
                    key={index}
                    className={`absolute inset-0 transition-all duration-700 ease-in-out ${
                      index === currentImageIndex ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
                    }`}
                  >
                    <img
                      src={`${CDNURL}/${user.shortid}/${image}`}
                      alt={`${user.firstname} - Photo ${index + 1}`}
                      className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>

              {/* Navigation Arrows */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/40 hover:bg-black/60 text-white rounded-full transition-all duration-300 opacity-0 group-hover:opacity-100 hover:scale-110 shadow-lg backdrop-blur-sm"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/40 hover:bg-black/60 text-white rounded-full transition-all duration-300 opacity-0 group-hover:opacity-100 hover:scale-110 shadow-lg backdrop-blur-sm"
                    aria-label="Next image"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}

              {/* Dot Indicators */}
              {images.length > 1 && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3">
                  {images.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => goToImage(index)}
                      className={`w-3 h-3 rounded-full transition-all duration-300 shadow-lg backdrop-blur-sm ${
                        index === currentImageIndex
                          ? 'bg-card w-8 shadow-white/50'
                          : 'bg-background/50 hover:bg-background/75 hover:scale-110'
                      }`}
                      aria-label={`Go to image ${index + 1}`}
                    />
                  ))}
                </div>
              )}

              {/* Image Counter */}
              {images.length > 1 && (
                <div className="absolute top-6 right-6 px-4 py-2 bg-black/40 backdrop-blur-sm text-white text-sm rounded-full font-medium border border-white/20">
                  {currentImageIndex + 1} / {images.length}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Profile Details */}
        <div className="py-2 px-4 space-y-4">
          {/* Contact Information */}
          {!isObjEmpty(user) && user?.userstate == 'active' && (
            <div className="pb-4">
              <div className="mx-2 mt-2 p-6 rounded-3 bg-yellow-100 dark:bg-background border-3 rounded-lg border-[#FFD700]">
                <div className="py-2">
                  <div className="flex justify-between">
                    <div className="pb-3 flex flex-col md:flex-row">
                      <div className="font-bold text-blue-400 ms-2 capitalize inline-block text-2xl">
                        {user?.firstname}, {user?.age}
                      </div>
                    </div>
                    {profiledata?.shortid != user?.shortid ? (
                      <>
                        <div className="me-5 pb-2">
                          {shortlistarray?.includes(user?.shortid) ? (
                            <Button variant="ghost" disabled>
                              <span className="hidden sm:block">ADDED TO SHORTLIST</span>
                              <Heart className="" />
                            </Button>
                          ) : (
                            <Button
                              variant={`${buttonvariant}`}
                              className="bg-red-600 text-white font-bold"
                              onClick={async e => {
                                //setShortListtext("ADDED TO SHORTLIST")
                                //localStorage.setItem("reloadshortlistdata", true);
                                secureLocalStorage.setItem('reloadshortlistdata', true);
                                shortlistClick(e);
                              }}
                            >
                              <span className="hidden sm:block">{shortlisttext}</span>
                              <Heart className="" />
                            </Button>
                          )}
                        </div>
                      </>
                    ) : (
                      <></>
                    )}
                  </div>

                  <div className="flex flex-col md:flex-row justify-between space-y-8 mx-4 my-4">
                    <div className="flex flex-col space-y-1">
                      <div>{user?.language}</div>
                      <div>
                        {user?.showcommunity == true ? (
                          <>
                            {user?.community ? (
                              <>
                                {user?.community != 'Do not wish to mention' ? (
                                  <>{user?.community}</>
                                ) : (
                                  <></>
                                )}
                              </>
                            ) : (
                              <></>
                            )}
                          </>
                        ) : (
                          <></>
                        )}
                      </div>
                      <div>{user?.religion}</div>
                      <div className="text-green-700">{user?.economicstatus}</div>
                      <div>
                        <span className="font-bold">Education: </span>
                        {user?.educationlevel}
                      </div>
                      <div>
                        <span className="font-bold">Work: </span>
                        {user?.jobstatus ? 'True' : 'false'}
                      </div>
                    </div>

                    <div className="">
                      {/* Phone */}
                      <div className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors group">
                        <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                          <MapPin className="w-5 h-5 text-primary" />
                        </div>
                        <span className="text-lg font-medium">{user.city}</span>
                      </div>
                      {/* Phone */}
                      <div>
                        {user?.showphone ? (
                          <>
                            <div className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors group">
                              <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                                <Phone className="w-5 h-5 text-primary" />
                              </div>
                              <span className="text-sm font-medium">{user.phonenumber}</span>
                            </div>
                          </>
                        ) : (
                          <></>
                        )}
                      </div>

                      {/* Email */}
                      <div className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors group">
                        <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                          <Mail className="w-5 h-5 text-primary" />
                        </div>
                        <span className="text-sm font-medium break-all">{user.email}</span>
                      </div>

                      {/* Facebook */}
                      <div>
                        {user?.showfacebook == true ? (
                          <>
                            {user?.facebook ? (
                              <div className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors group">
                                <div className="p-2 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                                  <FaFacebook className="w-5 h-5 text-blue-500" />
                                </div>
                                <span className="text-sm font-medium">{user.facebook}</span>
                              </div>
                            ) : (
                              <></>
                            )}
                          </>
                        ) : (
                          <></>
                        )}
                      </div>

                      {/* Instagram */}
                      <div>
                        {user?.showinstagram == true ? (
                          <>
                            {user?.instagram ? (
                              <div className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors group">
                                <div className="p-2 bg-pink-500/10 rounded-lg group-hover:bg-pink-500/20 transition-colors">
                                  <FaInstagram className="w-5 h-5 text-pink-500" />
                                </div>
                                <span className="text-sm font-medium">{user.instagram}</span>
                              </div>
                            ) : (
                              <></>
                            )}
                          </>
                        ) : (
                          <></>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bio */}
                  <div className="pt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground leading-relaxed">{user.bio}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
