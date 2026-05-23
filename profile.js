const appConfig = window.VIBEMAP_CONFIG || {};
const convexBaseUrl = String(appConfig.convexBaseUrl || '').replace(/\/$/, '');

function convexUrl(path) {
  return `${convexBaseUrl}${path}`;
}

let currentUser = null;
let profileUserId = null;
let activeProfile = null;
let locationNameById = new Map();

const desktopNavStorageKey = 'didaudo_desktop_nav_collapsed';

function getProfileAvatarUrl(user) {
  const seed = String(user?.avatarSeed || user?.name || user?.email || user?._id || 'guest').trim().toLowerCase() || 'guest';
  return `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(seed)}&backgroundColor=06b6d4,c084fc,22c55e,f97316,ef4444&textColor=ffffff&radius=50`;
}

function normalizeUserSession(user) {
  if (!user) return null;
  return { ...user, avatarUrl: user.avatarUrl || getProfileAvatarUrl(user) };
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

function getStoredDesktopNavState() {
  return localStorage.getItem(desktopNavStorageKey) === 'true';
}

function applyDesktopNavState(collapsed) {
  document.body.classList.toggle('desktop-nav-collapsed', Boolean(collapsed));
  const navToggle = document.getElementById('desktopNavToggle');
  if (navToggle) {
    navToggle.textContent = collapsed ? '›' : '‹';
    navToggle.setAttribute('aria-label', collapsed ? 'Expand navigation' : 'Collapse navigation');
  }
  localStorage.setItem(desktopNavStorageKey, String(Boolean(collapsed)));
}

function toggleDesktopNav() {
  applyDesktopNavState(!document.body.classList.contains('desktop-nav-collapsed'));
}

function updateAuthUI() {
  const loginBtn = document.getElementById('desktopLoginBtn');
  const logoutBtn = document.getElementById('desktopLogoutBtn');
  const notice = document.getElementById('signedOutNotice');
  const shell = document.getElementById('profileShell');
  const userAvatar = document.getElementById('desktopUserAvatar');
  const userName = document.getElementById('desktopUserName');
  const userStatus = document.getElementById('desktopUserStatus');

  if (currentUser) {
    if (loginBtn) loginBtn.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'inline-flex';
    if (notice) notice.classList.add('hidden');
    if (shell) shell.classList.remove('opacity-40', 'pointer-events-none');
    if (userAvatar) userAvatar.src = currentUser.avatarUrl || getProfileAvatarUrl(currentUser);
    if (userName) userName.textContent = currentUser.name || currentUser.email || 'Guest';
    if (userStatus) userStatus.textContent = currentUser.email || 'Signed in';
  } else {
    if (loginBtn) loginBtn.style.display = 'inline-flex';
    if (logoutBtn) logoutBtn.style.display = 'none';
    if (notice) notice.classList.remove('hidden');
    if (shell) shell.classList.add('opacity-40', 'pointer-events-none');
    if (userAvatar) userAvatar.src = 'https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png';
    if (userName) userName.textContent = 'Guest';
    if (userStatus) userStatus.textContent = 'Sign in to continue';
  }
}

function openLoginModal(promptText = '') {
  const modal = document.getElementById('loginModal');
  const prompt = document.getElementById('loginPrompt');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
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

// Theme & language helpers (keeps behavior similar to main page)
const languageStorageKey = 'didaudo_language';
const themeStorageKey = 'didaudo_theme';

function applyLanguageFromStorage() {
  const lang = localStorage.getItem(languageStorageKey) || 'en';
  const el = document.getElementById('desktopLanguageToggleText');
  if (el) el.textContent = (String(lang || 'en').toUpperCase() === 'VI' || lang === 'vi') ? 'VN' : 'EN';
}

function applyThemeFromStorage() {
  const theme = localStorage.getItem(themeStorageKey) || 'dark';
  if (theme === 'light') document.body.classList.add('theme-light');
  else document.body.classList.remove('theme-light');
  const el = document.getElementById('themeToggleText');
  if (el) el.textContent = theme === 'light' ? 'Light mode' : 'Dark mode';
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

function renderEmptyState() {
  const summary = document.getElementById('profileSummary');
  const favoritesList = document.getElementById('favoritesList');
  const ratingsList = document.getElementById('ratingsList');

  if (summary) summary.innerHTML = '<p class="text-slate-400">Sign in to load your profile.</p>';
  if (favoritesList) favoritesList.innerHTML = '';
  if (ratingsList) ratingsList.innerHTML = '';
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

function renderProfile(profile) {
  const summary = document.getElementById('profileSummary');
  const favoritesList = document.getElementById('favoritesList');
  const ratingsList = document.getElementById('ratingsList');

  const favoriteLocations = profile.favoriteLocations || [];
  const ratings = profile.ratingsWithLocations || profile.ratings || [];
  const friends = profile.friends || [];

  if (summary) {
    summary.innerHTML = `
      <div class="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
        <p class="text-xs uppercase tracking-[0.24em] text-slate-400">Viewing</p>
        <div class="mt-3 flex items-center gap-3">
          <img src="${currentUser?.avatarUrl || getProfileAvatarUrl(profile.user)}" alt="${profile.user?.name || profile.user?.email || 'Profile'} picture" class="h-14 w-14 rounded-full border border-white/10 object-cover" />
          <div class="min-w-0">
            <h2 class="text-2xl font-black text-white">${profile.user?.name || profile.user?.email || 'Profile'}</h2>
            <p class="mt-1 truncate text-sm text-slate-400">${profile.user?.email || ''}</p>
          </div>
        </div>
        <div class="mt-4 flex flex-wrap gap-2 text-xs text-slate-200">
          <span class="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1">${friends.length} friends</span>
          <span class="rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1">${favoriteLocations.length} favorites</span>
          <span class="rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1">${ratings.length} ratings</span>
        </div>
      </div>
    `;
  }

  if (favoritesList) {
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
  }

  if (ratingsList) {
    ratingsList.innerHTML = ratings.length > 0 ? ratings.map(rating => `
      <div class="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
        <div class="flex items-start justify-between gap-2">
          <div>
            <p class="font-semibold text-white">${rating.locationName || locationNameById.get(String(rating.locationId)) || rating.locationId}</p>
            <p class="text-xs text-slate-400">${rating.locationAddress || ''}</p>
          </div>
          <div class="flex flex-col items-end gap-2">
            <span class="text-xs text-cyan-200">${'⭐'.repeat(Math.max(1, Math.min(5, rating.rating || 0)))}</span>
            <button class="rated-place-open-btn rounded-xl border border-cyan-400 px-3 py-2 text-xs font-semibold text-cyan-200" data-location-id="${rating.locationId}">Open</button>
          </div>
        </div>
        ${rating.comment ? `<p class="mt-2 text-sm text-slate-300">${rating.comment}</p>` : ''}
        <p class="mt-2 text-[11px] text-slate-500">${formatTimeAgo(rating.createdAt)}</p>
      </div>
    `).join('') : '<p class="text-slate-400">No ratings yet.</p>';
  }

  document.querySelectorAll('.favorite-open-btn').forEach(button => {
    button.addEventListener('click', () => openLocationOnMap(button.dataset.locationId || ''));
  });

  document.querySelectorAll('.rated-place-open-btn').forEach(button => {
    button.addEventListener('click', () => openLocationOnMap(button.dataset.locationId || ''));
  });
}

function bindEvents() {
  const desktopLoginBtn = document.getElementById('desktopLoginBtn');
  const signedOutLoginBtn = document.getElementById('signedOutLoginBtn');
  const desktopLogoutBtn = document.getElementById('desktopLogoutBtn');
  const loginModalClose = document.getElementById('loginModalClose');
  const loginTabBtn = document.getElementById('loginTabBtn');
  const signupTabBtn = document.getElementById('signupTabBtn');
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const desktopProfileButton = document.getElementById('desktopProfileButton');
  const mapNavBtn = document.getElementById('mapNavBtn');
  const friendsNavBtn = document.getElementById('friendsNavBtn');
  const desktopNavToggle = document.getElementById('desktopNavToggle');

  desktopLoginBtn?.addEventListener('click', () => openLoginModal('Sign in to manage your profile.'));
  signedOutLoginBtn?.addEventListener('click', () => openLoginModal('Sign in to manage your profile.'));
  desktopLogoutBtn?.addEventListener('click', handleLogout);
  loginModalClose?.addEventListener('click', closeLoginModal);
  loginTabBtn?.addEventListener('click', () => switchAuthTab(false));
  signupTabBtn?.addEventListener('click', () => switchAuthTab(true));
  desktopProfileButton?.addEventListener('click', () => {
    if (!currentUser) {
      openLoginModal('Sign in to view your profile.');
      return;
    }
    setProfileUserId(currentUser.userId);
    void loadProfile(currentUser.userId);
  });
  mapNavBtn?.addEventListener('click', () => {
    window.location.href = './index.html';
  });
  friendsNavBtn?.addEventListener('click', () => {
    window.location.href = './friends.html';
  });
  desktopNavToggle?.addEventListener('click', toggleDesktopNav);

  const desktopLanguageToggleBtn = document.getElementById('desktopLanguageToggleBtn');
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  desktopLanguageToggleBtn?.addEventListener('click', () => {
    const key = 'didaudo_language';
    const current = localStorage.getItem(key) || 'en';
    const next = current === 'en' ? 'vi' : 'en';
    localStorage.setItem(key, next);
    applyLanguageFromStorage();
  });

  themeToggleBtn?.addEventListener('click', () => {
    const key = 'didaudo_theme';
    const current = localStorage.getItem(key) || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    localStorage.setItem(key, next);
    applyThemeFromStorage();
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
  applyDesktopNavState(getStoredDesktopNavState());
  applyLanguageFromStorage();
  applyThemeFromStorage();
  await loadLocationDirectory();

  profileUserId = getProfileUserId();
  const initialTarget = profileUserId || currentUser?.userId || '';

  if (!currentUser) {
    renderEmptyState();
    openLoginModal('You need to be signed in to use profile and favorites.');
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
