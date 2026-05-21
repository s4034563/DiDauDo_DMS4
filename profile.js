const appConfig = window.VIBEMAP_CONFIG || {};
const convexBaseUrl = String(appConfig.convexBaseUrl || '').replace(/\/$/, '');

function convexUrl(path) {
  return `${convexBaseUrl}${path}`;
}

let currentUser = null;
let profileUserId = null;
let activeProfile = null;
let locationNameById = new Map();
let avatarMenuDismissBound = false;

function getProfileAvatarUrl(user) {
  const seed = String(user?.avatarSeed || user?.name || user?.email || user?._id || 'guest').trim().toLowerCase() || 'guest';
  return `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(seed)}&backgroundColor=06b6d4,c084fc,22c55e,f97316,ef4444&textColor=ffffff&radius=50`;
}

function normalizeUserSession(user) {
  if (!user) return null;
  return { ...user, avatarUrl: user.avatarUrl || getProfileAvatarUrl(user) };
}

function getDisplayedProfileAvatar(profileUser) {
  if (currentUser && profileUser?._id === currentUser.userId && currentUser.avatarUrl) {
    return currentUser.avatarUrl;
  }

  if (profileUser?.avatarUrl) {
    return profileUser.avatarUrl;
  }

  return getProfileAvatarUrl(profileUser || currentUser);
}

function closeAvatarMenu() {
  const menu = document.getElementById('avatarMenu');
  if (menu) {
    menu.classList.add('hidden');
  }
}

function toggleAvatarMenu() {
  const menu = document.getElementById('avatarMenu');
  if (!menu) return;
  menu.classList.toggle('hidden');
}

function setCustomAvatar(dataUrl) {
  if (!currentUser) return;

  currentUser = normalizeUserSession({
    ...currentUser,
    avatarUrl: dataUrl,
  });
  saveUserSession();
  updateAuthUI();
}

function removeCustomAvatar() {
  if (!currentUser) return;

  currentUser = normalizeUserSession({
    ...currentUser,
    avatarUrl: undefined,
  });
  saveUserSession();
  updateAuthUI();
}

function bindAvatarControls() {
  const avatarButton = document.getElementById('profileAvatarButton');
  const changeAvatarBtn = document.getElementById('changeAvatarBtn');
  const removeAvatarBtn = document.getElementById('removeAvatarBtn');
  const avatarFileInput = document.getElementById('avatarFileInput');

  avatarButton?.addEventListener('click', (event) => {
    event.stopPropagation();
    if (currentUser && activeProfile?.user?._id === currentUser.userId) {
      toggleAvatarMenu();
    }
  });

  changeAvatarBtn?.addEventListener('click', () => {
    avatarFileInput?.click();
  });

  removeAvatarBtn?.addEventListener('click', () => {
    removeCustomAvatar();
    closeAvatarMenu();
    renderProfile(activeProfile);
  });

  avatarFileInput?.addEventListener('change', () => {
    const file = avatarFileInput.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please choose an image file.');
      avatarFileInput.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      if (!dataUrl) return;
      setCustomAvatar(dataUrl);
      closeAvatarMenu();
      renderProfile(activeProfile);
      avatarFileInput.value = '';
    };
    reader.readAsDataURL(file);
  });

  if (!avatarMenuDismissBound) {
    document.addEventListener('click', (event) => {
      const menu = document.getElementById('avatarMenu');
      const avatarButtonElement = document.getElementById('profileAvatarButton');
      if (!menu || menu.classList.contains('hidden')) return;
      if (menu.contains(event.target) || avatarButtonElement?.contains(event.target)) return;
      closeAvatarMenu();
    });
    avatarMenuDismissBound = true;
  }
}

function loadUserSession() {
  const stored = localStorage.getItem('didaudo_user_session');
  if (!stored) return;

  try {
    currentUser = normalizeUserSession(JSON.parse(stored));
    saveUserSession();
  } catch {
    currentUser = null;
  }
}

function saveUserSession() {
  if (currentUser) {
    localStorage.setItem('didaudo_user_session', JSON.stringify(currentUser));
  } else {
    localStorage.removeItem('didaudo_user_session');
  }
}

function openLoginModal(promptText = '') {
  const modal = document.getElementById('loginModal');
  const prompt = document.getElementById('loginPrompt');
  if (modal) modal.classList.remove('hidden');
  if (modal) modal.classList.add('flex');
  if (prompt) {
    const hasPrompt = Boolean(String(promptText || '').trim());
    prompt.textContent = hasPrompt ? promptText : '';
    prompt.classList.toggle('hidden', !hasPrompt);
  }
}

function closeLoginModal() {
  const modal = document.getElementById('loginModal');
  const prompt = document.getElementById('loginPrompt');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  if (prompt) {
    prompt.textContent = '';
    prompt.classList.add('hidden');
  }
}

function switchAuthTab(isSignup) {
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const loginTabBtn = document.getElementById('loginTabBtn');
  const signupTabBtn = document.getElementById('signupTabBtn');

  if (loginForm) loginForm.classList.toggle('hidden', isSignup);
  if (signupForm) signupForm.classList.toggle('hidden', !isSignup);
  if (loginTabBtn) {
    loginTabBtn.classList.toggle('bg-cyan-400', !isSignup);
    loginTabBtn.classList.toggle('text-slate-900', !isSignup);
    loginTabBtn.classList.toggle('text-slate-400', isSignup);
  }
  if (signupTabBtn) {
    signupTabBtn.classList.toggle('bg-cyan-400', isSignup);
    signupTabBtn.classList.toggle('text-slate-900', isSignup);
    signupTabBtn.classList.toggle('text-slate-400', !isSignup);
  }
}

function updateAuthUI() {
  const loginBtn = document.getElementById('profileLoginBtn');
  const logoutBtn = document.getElementById('profileLogoutBtn');
  const notice = document.getElementById('signedOutNotice');
  const shell = document.getElementById('profileShell');

  if (currentUser) {
    if (loginBtn) loginBtn.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'inline-flex';
    if (notice) notice.classList.add('hidden');
    if (shell) shell.classList.remove('opacity-40', 'pointer-events-none');
  } else {
    if (loginBtn) loginBtn.style.display = 'inline-flex';
    if (logoutBtn) logoutBtn.style.display = 'none';
    if (notice) notice.classList.remove('hidden');
    if (shell) shell.classList.add('opacity-40', 'pointer-events-none');
  }
}

async function handleLogin(email, password) {
  const loginError = document.getElementById('loginError');
  if (loginError) loginError.classList.add('hidden');

  const response = await fetch(convexUrl('/api/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error(data.error || 'Login failed');
  }

  currentUser = normalizeUserSession({ userId: data.userId, email: data.email, name: data.name });
  saveUserSession();
  updateAuthUI();
  closeLoginModal();
}

async function handleSignup(email, password, passwordConfirm, name) {
  const signupError = document.getElementById('signupError');
  if (signupError) signupError.classList.add('hidden');

  if (password !== passwordConfirm) {
    throw new Error('Passwords do not match');
  }

  const response = await fetch(convexUrl('/api/auth/signup'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name }),
  });

  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error(data.error || 'Signup failed');
  }

  currentUser = normalizeUserSession({ userId: data.userId, email: data.email, name: data.name });
  saveUserSession();
  updateAuthUI();
  closeLoginModal();
  switchAuthTab(false);
}

function handleLogout() {
  currentUser = null;
  saveUserSession();
  updateAuthUI();
  activeProfile = null;
  profileUserId = null;
  renderEmptyState();
}

function getProfileUserId() {
  const url = new URL(window.location.href);
  return url.searchParams.get('userId') || '';
}

function setProfileUserId(nextUserId) {
  const url = new URL(window.location.href);
  if (nextUserId) {
    url.searchParams.set('userId', nextUserId);
  } else {
    url.searchParams.delete('userId');
  }
  window.history.replaceState({}, '', url);
  profileUserId = nextUserId;
}

function renderEmptyState() {
  const summary = document.getElementById('profileSummary');
  const friendsList = document.getElementById('friendsList');
  const requestsList = document.getElementById('requestsList');
  const favoritesList = document.getElementById('favoritesList');
  const compareFriendPicker = document.getElementById('compareFriendPicker');
  const compareResult = document.getElementById('compareResult');
  const ratingsList = document.getElementById('ratingsList');

  if (summary) summary.innerHTML = '<p class="text-slate-400">Sign in to load your profile.</p>';
  if (friendsList) friendsList.innerHTML = '';
  if (requestsList) requestsList.innerHTML = '';
  if (favoritesList) favoritesList.innerHTML = '';
  if (compareFriendPicker) compareFriendPicker.innerHTML = '';
  if (compareResult) compareResult.innerHTML = '';
  if (ratingsList) ratingsList.innerHTML = '';
  closeAvatarMenu();
}

function formatTimeAgo(timestamp) {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}

async function loadProfile(userId) {
  if (!userId) return;

  const summary = document.getElementById('profileSummary');
  if (summary) summary.innerHTML = '<p class="text-slate-400">Loading profile...</p>';

  const response = await fetch(convexUrl(`/api/profile?userId=${encodeURIComponent(userId)}`));
  const profile = await response.json();
  if (!response.ok || !profile || profile.error) {
    throw new Error(profile?.error || 'Could not load profile');
  }

  activeProfile = profile;
  profileUserId = userId;
  renderProfile(profile);
}

async function loadLocationDirectory() {
  try {
    const response = await fetch(convexUrl('/api/locations'));
    const data = await response.json();
    const locations = Array.isArray(data) ? data : (data.locations || []);
    locationNameById = new Map(locations.map(location => [String(location.id), location.name || String(location.id)]));
  } catch {
    locationNameById = new Map();
  }
}

function openLocationOnMap(locationId) {
  if (!locationId) return;
  window.location.href = `./index.html?locationId=${encodeURIComponent(locationId)}`;
}

function renderProfile(profile) {
  const summary = document.getElementById('profileSummary');
  const friendsList = document.getElementById('friendsList');
  const requestsList = document.getElementById('requestsList');
  const favoritesList = document.getElementById('favoritesList');
  const compareFriendPicker = document.getElementById('compareFriendPicker');
  const compareResult = document.getElementById('compareResult');
  const ratingsList = document.getElementById('ratingsList');

  const isOwnProfile = currentUser && profile.user?._id === currentUser.userId;
  const friends = profile.friends || [];
  const incoming = profile.requests?.incoming || [];
  const outgoing = profile.requests?.outgoing || [];
  const favoriteLocations = profile.favoriteLocations || [];
  const ratings = [];

  if (summary) {
    summary.innerHTML = `
      <div class="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
        <p class="text-xs uppercase tracking-[0.24em] text-slate-400">Viewing</p>
        <div class="mt-3 flex items-center gap-3">
          <div class="relative shrink-0">
            <button id="profileAvatarButton" type="button" class="block rounded-full outline-none ${isOwnProfile ? 'cursor-pointer' : 'cursor-default'}" ${isOwnProfile ? 'aria-label="Profile image options"' : 'aria-hidden="true" tabindex="-1"'}>
              <img id="profileAvatarImage" src="${getDisplayedProfileAvatar(profile.user)}" alt="${profile.user?.name || profile.user?.email || 'Profile'} picture" class="h-14 w-14 rounded-full border border-white/10 object-cover shadow-lg transition ${isOwnProfile ? 'hover:ring-2 hover:ring-cyan-400/60' : ''}" />
            </button>
            ${isOwnProfile ? `
            <div id="avatarMenu" class="absolute left-0 top-[calc(100%+8px)] hidden min-w-52 rounded-2xl border border-white/10 bg-slate-950/95 p-2 shadow-2xl backdrop-blur-xl z-20">
              <button id="changeAvatarBtn" type="button" class="w-full rounded-xl px-3 py-2 text-left text-sm text-slate-100 hover:bg-slate-800">Change profile image</button>
              <button id="removeAvatarBtn" type="button" class="mt-1 w-full rounded-xl px-3 py-2 text-left text-sm text-red-300 hover:bg-red-500/10">Remove profile image</button>
            </div>
            <input id="avatarFileInput" type="file" accept="image/*" class="hidden" />
            ` : ''}
          </div>
          <div class="min-w-0">
            <h2 class="text-2xl font-black text-white">${profile.user?.name || profile.user?.email || 'Profile'}</h2>
            <p class="mt-1 truncate text-sm text-slate-400">${profile.user?.email || ''}</p>
          </div>
        </div>
        <div class="mt-4 flex flex-wrap gap-2">
          <span class="badge friend">${friends.length} friends</span>
          <span class="badge pending">${favoriteLocations.length} favorites</span>
          
        </div>
      </div>
    `;
  }

  if (friendsList) {
    friendsList.innerHTML = friends.length > 0 ? friends.map(friend => `
      <div class="rounded-xl border border-white/10 bg-slate-900/60 p-3">
        <div class="flex items-start justify-between gap-3">
          <div class="flex min-w-0 items-center gap-3">
            <img src="${getProfileAvatarUrl(friend)}" alt="${friend.name || friend.email || 'Friend'} picture" class="h-10 w-10 rounded-full border border-white/10 object-cover" />
            <div class="min-w-0">
              <p class="truncate font-semibold text-white">${friend.name || friend.email}</p>
              <p class="truncate text-xs text-slate-400">${friend.email}</p>
            </div>
            <p class="mt-1 text-[11px] text-slate-500">ID: ${friend._id}</p>
          </div>
          <div class="flex flex-col gap-2">
            <button class="friend-view-btn rounded-xl border border-cyan-400 px-3 py-2 text-xs font-semibold text-cyan-200" data-user-id="${friend._id}">View</button>
            <button class="friend-compare-btn rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-200" data-user-id="${friend._id}">Compare</button>
          </div>
        </div>
      </div>
    `).join('') : '<p class="text-slate-400">No friends yet.</p>';
  }

  if (requestsList) {
    const requestsHtml = isOwnProfile ? incoming.map(request => `
      <div class="rounded-xl border border-white/10 bg-slate-900/60 p-3">
        <div class="flex items-center gap-3">
          <img src="${getProfileAvatarUrl({ email: request.senderEmail })}" alt="${request.senderEmail} picture" class="h-9 w-9 rounded-full border border-white/10 object-cover" />
          <div>
            <p class="font-semibold text-white">${request.senderEmail}</p>
            <p class="text-xs text-slate-400">Wants to connect with you</p>
          </div>
        </div>
        <div class="mt-3 flex gap-2">
          <button class="request-action-btn rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-900" data-request-id="${request._id}" data-action="accept">Accept</button>
          <button class="request-action-btn rounded-xl bg-slate-700 px-3 py-2 text-xs font-semibold text-slate-200" data-request-id="${request._id}" data-action="decline">Decline</button>
        </div>
      </div>
    `).join('') : outgoing.map(request => `
      <div class="rounded-xl border border-white/10 bg-slate-900/60 p-3">
        <div class="flex items-center gap-3">
          <img src="${getProfileAvatarUrl({ email: request.receiverEmail })}" alt="${request.receiverEmail} picture" class="h-9 w-9 rounded-full border border-white/10 object-cover" />
          <div>
            <p class="font-semibold text-white">${request.receiverEmail}</p>
            <p class="text-xs text-slate-400">Pending request</p>
          </div>
        </div>
      </div>
    `).join('');

    requestsList.innerHTML = requestsHtml || '<p class="text-slate-400">No pending requests.</p>';
  }

  if (favoritesList) {
    const compareCurrent = !isOwnProfile && currentUser;
    favoritesList.innerHTML = favoriteLocations.length > 0 ? favoriteLocations.map(location => `
      <div class="rounded-xl border border-white/10 bg-slate-900/60 p-3">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="font-semibold text-white">${location.name}</p>
            <p class="text-xs text-slate-400">${location.address || ''}</p>
          </div>
          <button class="favorite-open-btn rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-200" data-location-id="${location.id}">Open</button>
        </div>
      </div>
    `).join('') : '<p class="text-slate-400">No favorite locations yet.</p>';

    if (compareFriendPicker) {
      compareFriendPicker.innerHTML = isOwnProfile
        ? friends.slice(0, 3).map(friend => `
          <label class="flex items-center gap-2 rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2">
            <input type="checkbox" class="compare-friend-checkbox h-4 w-4" value="${friend._id}" />
            <span>${friend.name || friend.email}</span>
          </label>
        `).join('')
        : compareCurrent
          ? `<button id="compareWithMeBtn" class="w-full rounded-xl bg-cyan-400 px-3 py-3 text-sm font-bold text-slate-900">Compare you + this profile</button>`
          : '<p class="text-slate-400">Sign in to compare favorites.</p>';

      const compareFavoritesBtn = document.getElementById('compareFavoritesBtn');
      if (compareFavoritesBtn) {
        compareFavoritesBtn.classList.toggle('hidden', !isOwnProfile);
      }
    }
  }

  if (ratingsList) {
    ratingsList.innerHTML = '<p class="text-slate-400">Ratings are no longer supported in this view.</p>';
  }

  document.querySelectorAll('.friend-view-btn').forEach(button => {
    button.addEventListener('click', () => {
      setProfileUserId(button.dataset.userId || '');
      void loadProfile(profileUserId);
    });
  });

  document.querySelectorAll('.friend-compare-btn').forEach(button => {
    button.addEventListener('click', async () => {
      if (!currentUser) {
        openLoginModal('You need to be signed in to compare favorites.');
        return;
      }
      await compareFavorites([button.dataset.userId]);
    });
  });

  document.querySelectorAll('.request-action-btn').forEach(button => {
    button.addEventListener('click', async () => {
      if (!currentUser) return;
      const response = await fetch(convexUrl('/api/friends/respond'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: button.dataset.requestId,
          userId: currentUser.userId,
          action: button.dataset.action,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        alert(data.error || 'Could not update friend request');
        return;
      }
      await loadProfile(profileUserId || currentUser.userId);
    });
  });

  document.querySelectorAll('.favorite-open-btn').forEach(button => {
    button.addEventListener('click', () => {
      openLocationOnMap(button.dataset.locationId || '');
    });
  });

  document.querySelectorAll('.rated-place-open-btn').forEach(button => {
    button.addEventListener('click', () => {
      openLocationOnMap(button.dataset.locationId || '');
    });
  });

  bindAvatarControls();

  const compareBtn = document.getElementById('compareFavoritesBtn');
  if (compareBtn) {
    compareBtn.addEventListener('click', async () => {
      if (!currentUser) {
        openLoginModal('You need to be signed in to compare favorites.');
        return;
      }

      const selected = Array.from(document.querySelectorAll('.compare-friend-checkbox:checked'))
        .map(input => input.value)
        .slice(0, 3);

      if (selected.length === 0) {
        const compareResult = document.getElementById('compareResult');
        if (compareResult) compareResult.textContent = 'Pick at least one friend.';
        return;
      }

      await compareFavorites(selected);
    });
  }

  const compareWithMeBtn = document.getElementById('compareWithMeBtn');
  if (compareWithMeBtn) {
    compareWithMeBtn.addEventListener('click', async () => {
      if (!currentUser || !profileUserId) return;
      await compareFavorites([profileUserId]);
    });
  }
}

async function compareFavorites(friendIds) {
  const result = document.getElementById('compareResult');
  if (!result || !currentUser) return;

  try {
    const params = new URLSearchParams();
    params.set('userId', currentUser.userId);
    friendIds.forEach(friendId => params.append('friendId', friendId));
    const response = await fetch(convexUrl(`/api/favorites/compare?${params.toString()}`));
    const data = await response.json();
    if (!response.ok || data.error) {
      throw new Error(data.error || 'Comparison failed');
    }

    const names = (data.sharedLocations || []).map(location => location.name);
    const perFriend = (data.perFriend || []).map(row => `${row.friendId}: ${row.sharedLocationIds.length}`);
    result.innerHTML = `
      <div class="space-y-3">
        <div>
          <p class="text-xs uppercase tracking-[0.18em] text-slate-500">Shared by all selected</p>
          <p class="mt-1 text-slate-200">${names.length > 0 ? names.join(', ') : 'No shared favorites found.'}</p>
        </div>
        ${perFriend.length > 0 ? `<div><p class="text-xs uppercase tracking-[0.18em] text-slate-500">Per friend</p><p class="mt-1 text-slate-300">${perFriend.join('<br>')}</p></div>` : ''}
      </div>
    `;
  } catch (error) {
    result.textContent = String(error?.message || 'Comparison failed');
  }
}

function bindEvents() {
  const loginBtn = document.getElementById('profileLoginBtn');
  const signedOutLoginBtn = document.getElementById('signedOutLoginBtn');
  const logoutBtn = document.getElementById('profileLogoutBtn');
  const loginModalClose = document.getElementById('loginModalClose');
  const loginTabBtn = document.getElementById('loginTabBtn');
  const signupTabBtn = document.getElementById('signupTabBtn');
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const profileLookupBtn = document.getElementById('profileLookupBtn');

  loginBtn?.addEventListener('click', () => openLoginModal('Sign in to manage profiles and friends.'));
  signedOutLoginBtn?.addEventListener('click', () => openLoginModal('Sign in to manage profiles and friends.'));
  logoutBtn?.addEventListener('click', handleLogout);
  loginModalClose?.addEventListener('click', closeLoginModal);
  loginTabBtn?.addEventListener('click', () => switchAuthTab(false));
  signupTabBtn?.addEventListener('click', () => switchAuthTab(true));
  profileLookupBtn?.addEventListener('click', () => {
    const input = document.getElementById('profileLookupInput');
    const value = String(input?.value || '').trim();
    if (!value) return;
    setProfileUserId(value);
    void loadProfile(profileUserId);
  });

  loginForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    try {
      await handleLogin(email, password);
      await loadProfile(profileUserId || currentUser.userId);
    } catch (error) {
      const loginError = document.getElementById('loginError');
      if (loginError) {
        loginError.textContent = String(error?.message || 'Login failed');
        loginError.classList.remove('hidden');
      }
    }
  });

  signupForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = document.getElementById('signupEmail').value;
    const name = document.getElementById('signupName').value;
    const password = document.getElementById('signupPassword').value;
    const passwordConfirm = document.getElementById('signupPasswordConfirm').value;
    try {
      await handleSignup(email, password, passwordConfirm, name);
      await loadProfile(profileUserId || currentUser.userId);
    } catch (error) {
      const signupError = document.getElementById('signupError');
      if (signupError) {
        signupError.textContent = String(error?.message || 'Signup failed');
        signupError.classList.remove('hidden');
      }
    }
  });

  const loginModal = document.getElementById('loginModal');
  loginModal?.addEventListener('click', (event) => {
    if (event.target === loginModal) closeLoginModal();
  });
}

window.addEventListener('load', async () => {
  loadUserSession();
  updateAuthUI();
  bindEvents();
  await loadLocationDirectory();

  profileUserId = getProfileUserId();
  const initialTarget = profileUserId || currentUser?.userId || '';

  if (!currentUser) {
    renderEmptyState();
    openLoginModal('You need to be signed in to use profiles, friends, favorites, and comparison.');
    switchAuthTab(false);
    return;
  }

  try {
    await loadProfile(initialTarget || currentUser.userId);
  } catch (error) {
    const summary = document.getElementById('profileSummary');
    if (summary) {
      summary.innerHTML = `<p class="text-red-300">${String(error?.message || 'Could not load profile')}</p>`;
    }
  }
});
