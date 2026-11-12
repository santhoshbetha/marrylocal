import { api } from '@/api/client';

function failure(error) {
  return { success: false, msg: error?.message || 'Request failed' };
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------
export const getProfileData = async () => {
  try {
    const response = await api.get('/api/v1/profiles/me');
    return { success: true, data: response.data?.data?.profile || null };
  } catch (error) {
    return failure(error);
  }
};

export const updateUserInfo = async (_userid, data) => {
  try {
    await api.patch('/api/v1/profiles/me', { profile: data });
    return { success: true };
  } catch (error) {
    return failure(error);
  }
};

export const updateProfile = async data => {
  const response = await api.patch('/api/v1/profiles/me', { profile: data });
  return response.data;
};

export const getUserProfile = async id => {
  try {
    const response = await api.get(`/api/v1/profiles/${encodeURIComponent(id)}`);
    return { success: true, data: response.data?.data?.profile || null };
  } catch (error) {
    return failure(error);
  }
};

export const getReferralsData = async () => {
  try {
    const response = await api.get('/api/v1/profiles/me');
    return { success: true, data: response.data?.data?.profile || null };
  } catch (error) {
    return failure(error);
  }
};

// ---------------------------------------------------------------------------
// Avatar / images
// ---------------------------------------------------------------------------
export const uploadAvatar = async file => {
  const form = new FormData();
  form.append('avatar', file);

  const response = await api.post('/api/v1/profiles/me/avatar', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return response.data;
};

export const deleteAvatar = async () => {
  const response = await api.delete('/api/v1/profiles/me/avatar');
  return response.data;
};

export const getImagesList = async () => {
  try {
    const response = await api.get('/api/v1/profiles/me');
    const profile = response.data?.data?.profile || {};
    const images = [...(profile.images || [])];

    if (profile.avatar_url) images.unshift(profile.avatar_url);

    return {
      success: true,
      data: images.filter(Boolean).map((url, index) => ({
        name: index === 0 ? 'face' : `image-${index}`,
        url,
      })),
    };
  } catch (error) {
    return failure(error);
  }
};

export const getImageUrl = filePath => {
  if (!filePath) return null;
  return { uri: filePath };
};

export const getSupabaseFileUrl = getImageUrl;

export const getImage = async (_shortid, _imagename) => {
  try {
    const response = await api.get('/api/v1/profiles/me');
    const profile = response.data?.data?.profile || {};
    return { success: true, data: getImageUrl(profile.avatar_url) };
  } catch (error) {
    return failure(error);
  }
};

export const uploadImage = async (_shortid, file, imageid = 0) => {
  // The dedicated avatar route owns the primary profile image. Additional
  // gallery slots are not enabled by this API revision.
  if (Number(imageid) !== 0) {
    return { success: false, msg: 'Only the primary profile image is supported.' };
  }

  try {
    const payload = await uploadAvatar(file);
    return { success: true, data: payload?.data };
  } catch (error) {
    return failure(error);
  }
};

export const uploadFaceImage = async (_shortid, file) => uploadImage(_shortid, file, 0);

export const deleteImage = async (_shortid, imageid = 0) => {
  if (Number(imageid) !== 0) {
    return { success: false, msg: 'Only the primary profile image is supported.' };
  }

  try {
    await deleteAvatar();
    return { success: true, data: true };
  } catch (error) {
    return failure(error);
  }
};

export const deleteImageByName = async () => deleteImage(null, 0);

export const copyImage = async () => ({
  success: false,
  msg: 'Image copy is not supported by this API.',
});

// ---------------------------------------------------------------------------
// Discovery/search compatibility
// ---------------------------------------------------------------------------
function toLegacyProfile(profile) {
  return {
    ...profile,
    userid: profile.id,
    firstname: profile.first_name,
    lastname: profile.last_name,
    educationlevel: profile.education_level,
    economicstatus: profile.economic_status,
    jobstatus: profile.job_status,
    distance: profile.distance_km ?? profile.distance_meters,
  };
}

export const searchUsers = async (searchinput = {}, signal, page = 1, limit = 20) => {
  try {
    const params = {
      page,
      per_page: limit,
      radius_km: searchinput?.searchdistance || searchinput?.radius_km || 100,
      age_from: searchinput?.agefrom,
      age_to: searchinput?.ageto,
      religion: searchinput?.religion,
      language: searchinput?.language,
      education_level: searchinput?.educationlevel,
      economic_status: searchinput?.economicstatus,
      job_status: searchinput?.jobstatus,
      community: searchinput?.community,
    };

    const response = await api.get('/api/v1/profiles/discovery', { params, signal });
    const data = response.data?.data || {};
    const pagination = data.pagination || {};

    return {
      success: true,
      data: (data.profiles || []).map(toLegacyProfile),
      pagination: {
        page: pagination.page || page,
        limit,
        totalItems: pagination.total || 0,
        totalPages: pagination.total_pages || 0,
        hasNextPage: Boolean(pagination.has_next_page),
        hasPrevPage: page > 1,
      },
    };
  } catch (error) {
    return failure(error);
  }
};

export const searchUser = async searchtext => {
  try {
    const response = await api.get('/api/v1/search/users', {
      params: { q: searchtext, per_page: 1 },
    });
    const users = response.data?.data?.users || response.data?.users || [];
    if (!users.length) return { success: false, msg: 'User not found.' };
    return { success: true, data: toLegacyProfile(users[0]) };
  } catch (error) {
    return failure(error);
  }
};

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------
export const adminSearchUser = async searchtext => {
  try {
    const response = await api.get('/api/v1/search/users', {
      params: { q: searchtext, per_page: 1 },
    });
    const data = response.data?.data?.users || response.data?.users || [];
    return { success: true, data: data[0] || null };
  } catch (error) {
    return failure(error);
  }
};

export const adminSearchUsers = async searchtext => {
  try {
    const response = await api.get('/api/v1/search/users', {
      params: { q: searchtext, per_page: 100 },
    });
    return { success: true, data: response.data?.data?.users || response.data?.users || [] };
  } catch (error) {
    return failure(error);
  }
};

export const adminGetUsersByLocation = async (state, city) => {
  try {
    const response = await api.get('/api/v1/search/users', {
      params: { state, city, per_page: 100 },
    });
    return { success: true, data: response.data?.data?.users || response.data?.users || [] };
  } catch (error) {
    return failure(error);
  }
};

export const adminGetUsersByState = async state => {
  try {
    const response = await api.get('/api/v1/search/users', {
      params: { state, per_page: 100 },
    });
    return { success: true, data: response.data?.data?.users || response.data?.users || [] };
  } catch (error) {
    return failure(error);
  }
};

export const adminGetUsersFromAllStates = async () => {
  try {
    const response = await api.get('/api/v1/search/users', { params: { per_page: 100 } });
    return { success: true, data: response.data?.data?.users || response.data?.users || [] };
  } catch (error) {
    return failure(error);
  }
};

// ---------------------------------------------------------------------------
// Account helpers
// ---------------------------------------------------------------------------
export const deleteUserAccount = async () => {
  try {
    await api.delete('/api/v1/me');
    return { success: true };
  } catch (error) {
    return failure(error);
  }
};

export const getCityUsercount = async () => {
  try {
    const response = await api.get('/api/v1/users/city-stats');
    return { success: true, userCount: response.data?.count ?? response.data?.data?.count ?? 0 };
  } catch (error) {
    return failure(error);
  }
};

export const getUsercountToday = async () => {
  try {
    const response = await api.get('/api/v1/users/stats/today');
    return { success: true, count: response.data?.count ?? response.data?.data?.count ?? 0 };
  } catch (error) {
    return failure(error);
  }
};

export const appendToRefereeEmails = async dataIn => {
  try {
    await api.post('/api/v1/users/referral/track', {
      referral_code: dataIn.referrer_code,
      email: dataIn.emailtoadd,
    });
    return { success: true };
  } catch (error) {
    return failure(error);
  }
};

export const checkIfUserExists = async userdata => {
  try {
    const response = await api.get('/api/v1/search/users', {
      params: { q: userdata.email, per_page: 1 },
    });
    const users = response.data?.data?.users || response.data?.users || [];
    return { success: true, userExists: users.length > 0 };
  } catch {
    return { success: true, userExists: false };
  }
};

export const getPasswordRetryCount = async () => ({ success: true, passwordretrycount: 0 });
export const updatePasswordRetryCount = async () => ({ success: true });

export const getShortlist = async () => {
  try {
    const response = await api.get('/api/v1/relationships');
    return { success: true, shortlist: response.data?.data?.relationships?.shortlists || [] };
  } catch (error) {
    return failure(error);
  }
};

export const getShortlistData = async () => {
  try {
    const response = await api.get('/api/v1/relationships/shortlisted');
    const users = response.data?.data?.users || [];
    return { success: true, data: users.length ? users : null };
  } catch (error) {
    return failure(error);
  }
};

export const addToShortlist = async (_userid, shortidtoadd) => {
  try {
    await api.post(`/api/v1/profiles/me/shortlist/${encodeURIComponent(shortidtoadd)}`);
    return { success: true };
  } catch (error) {
    return failure(error);
  }
};

export const removeFromShortlist = async (_userid, shortidtoremove) => {
  try {
    await api.delete(`/api/v1/relationships/shortlist/${encodeURIComponent(shortidtoremove)}`);
    return { success: true, data: { shortid: shortidtoremove } };
  } catch (error) {
    return failure(error);
  }
};
