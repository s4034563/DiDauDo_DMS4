const appConfig = window.VIBEMAP_CONFIG || {};
const convexBaseUrl = String(appConfig.convexBaseUrl || '').replace(/\/$/, '');

function convexUrl(path) {
  return `${convexBaseUrl}${path}`;
}

let currentUser = null;
let activeProfile = null;
let friendProfileCache = new Map();
let friendProfileCacheLoad = Promise.resolve();
let currentLanguage = 'en';

const desktopNavStorageKey = 'didaudo_desktop_nav_collapsed';

function getProfileAvatarUrl(user) {
  const seed = String(user?.avatarSeed || user?.name || user?.email || user?._id || 'guest').trim().toLowerCase() || 'guest';
  return `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(seed)}&backgroundColor=06b6d4,c084fc,22c55e,f97316,ef4444&textColor=ffffff&radius=50`;
}

// Theme & language helpers (keeps behavior similar to main page)
const languageStorageKey = 'didaudo_language';
const themeStorageKey = 'didaudo_theme';

// --- Translations (minimal locale map copied from main app) ---
const translations = {
  en: {
    main: 'Main',
    profile: 'Profile',
    map: 'Map',
    friends: 'Friends',
    requests: 'Requests',
    preferences: 'Preferences',
    login: 'Login',
    logout: 'Logout',
    theme: 'Theme',
    language: 'Language',
    openNavigation: 'Open navigation',
    closeNavigation: 'Close navigation',
    signInContinue: 'Sign in to continue',
    search: 'Search Places',
    searchPlaceholder: 'Type a location name...',
    noResults: 'No locations found'
    ,
    account: 'Account',
    signInRequired: 'Sign in required',
    friendsSignInMessage: 'You need to sign in to send requests, respond to invitations, and compare favorite locations.',
    signInButton: 'Sign in',
    addFriend: 'Add Friend',
    send: 'Send',
    connections: 'Connections',
    incomingOutgoing: 'Incoming and outgoing',
    compareLocations: 'Compare locations',
    sharedFavoritePlaces: 'Shared favorite places',
    compareSelected: 'Compare selected',
    compareResult: 'Compare result',
    noPendingRequests: 'No pending requests.',
    addFriendsToCompare: 'Add friends to compare favorites.',
    viewing: 'Viewing',
    favorites: 'favorites',
    friendsLabel: 'friends',
    ratings: 'ratings',
    noFriends: 'No friends yet.',
    incomingRequest: 'Incoming request',
    outgoingRequest: 'Outgoing request',
    accept: 'Accept',
    decline: 'Decline',
    loadProfileError: 'Could not load profile',
    loadFriendsError: 'Could not load friends data',
    compareLoading: 'Comparing favorites...',
    comparePickOneFriend: 'Pick at least one friend.',
    compareNoShared: 'No shared favorites found.',
    compareLoadingProfiles: 'Friend profiles are still loading. Try again in a moment.'
  },
  vi: {
    main: 'Chính',
    profile: 'Hồ sơ',
    map: 'Bản đồ',
    friends: 'Bạn bè',
    requests: 'Yêu cầu',
    preferences: 'Tùy chọn',
    login: 'Đăng nhập',
    logout: 'Đăng xuất',
    theme: 'Giao diện',
    language: 'Ngôn ngữ',
    openNavigation: 'Mở điều hướng',
    closeNavigation: 'Đóng điều hướng',
    signInContinue: 'Đăng nhập để tiếp tục',
    search: 'Tìm địa điểm',
    searchPlaceholder: 'Gõ tên địa điểm...',
    noResults: 'Không tìm thấy địa điểm',
    account: 'Tài khoản',
    signInRequired: 'Cần đăng nhập',
    friendsSignInMessage: 'Bạn cần đăng nhập để gửi yêu cầu, phản hồi lời mời và so sánh địa điểm yêu thích.',
    signInButton: 'Đăng nhập',
    addFriend: 'Thêm bạn bè',
    send: 'Gửi',
    connections: 'Kết nối',
    incomingOutgoing: 'Đến và đi',
    compareLocations: 'So sánh địa điểm',
    sharedFavoritePlaces: 'Các địa điểm yêu thích chung',
    compareSelected: 'So sánh mục đã chọn',
    compareResult: 'Kết quả so sánh',
    noPendingRequests: 'Không có yêu cầu chờ xử lý.',
    addFriendsToCompare: 'Thêm bạn bè để so sánh địa điểm yêu thích.',
    viewing: 'Đang xem',
    favorites: 'yêu thích',
    friendsLabel: 'bạn bè',
    ratings: 'đánh giá',
    noFriends: 'Chưa có bạn bè.',
    incomingRequest: 'Yêu cầu đến',
    outgoingRequest: 'Yêu cầu gửi đi',
    accept: 'Chấp nhận',
    decline: 'Từ chối',
    loadProfileError: 'Không thể tải hồ sơ',
    loadFriendsError: 'Không thể tải dữ liệu bạn bè',
    enterEmailAddress: 'Nhập địa chỉ email.',
    friendRequestSent: 'Đã gửi lời mời kết bạn.',
    friendRequestFailed: 'Không thể gửi lời mời kết bạn.',
    compareLoading: 'Đang so sánh địa điểm yêu thích...',
    comparePickOneFriend: 'Chọn ít nhất một người bạn.',
    compareNoShared: 'Không tìm thấy địa điểm yêu thích chung.',
    compareLoadingProfiles: 'Hồ sơ bạn bè vẫn đang tải. Hãy thử lại sau ít phút.'
  }
};
translations.en.view = 'View';
translations.en.open = 'Open';
translations.en.enterEmailAddress = 'Enter an email address.';
translations.en.friendRequestSent = 'Friend request sent.';
translations.en.friendRequestFailed = 'Friend request failed.';
translations.vi.view = 'Xem';
translations.vi.open = 'Mở';

function t(key) {
  const dictionary = translations[currentLanguage] || translations.en;
  return dictionary[key] || translations.en[key] || key;
}

function applyLanguageToStaticText() {
  document.documentElement.lang = currentLanguage === 'vi' ? 'vi' : 'en';
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    el.placeholder = t(key);
  });
  document.querySelectorAll('[data-i18n-aria-label]').forEach(el => {
    const key = el.getAttribute('data-i18n-aria-label');
    el.setAttribute('aria-label', t(key));
  });
}

function translateFriendsPageText() {
  const signedOutNotice = document.getElementById('signedOutNotice');
  const signedOutHeading = signedOutNotice?.querySelector('h2');
  const signedOutMessage = signedOutNotice?.querySelector('p.mt-2.max-w-2xl');
  const signedOutLoginBtn = document.getElementById('signedOutLoginBtn');
  const addFriendLabel = document.querySelector('#friendsShell > section:first-child > p');
  const sendBtn = document.getElementById('sendFriendRequestBtn');
  const friendsLabel = document.querySelector('#friendsShell > section:nth-child(2) > div:nth-child(1) > p');
  const friendsTitle = document.querySelector('#friendsShell > section:nth-child(2) > div:nth-child(1) > h3');
  const requestsLabel = document.querySelector('#friendsShell > section:nth-child(2) > div:nth-child(2) > p');
  const requestsTitle = document.querySelector('#friendsShell > section:nth-child(2) > div:nth-child(2) > h3');
  const compareLabel = document.querySelector('#friendsShell > section:nth-child(3) > div > div > p');
  const compareTitle = document.querySelector('#friendsShell > section:nth-child(3) > div > div > h3');
  const compareBtn = document.getElementById('compareFavoritesBtn');
  const compareResultLabel = document.getElementById('compareResult');

  if (signedOutNotice) signedOutNotice.querySelector('p')?.setAttribute('data-i18n', 'signInRequired');
  if (signedOutHeading) signedOutHeading.textContent = t('signInRequired');
  if (signedOutMessage) signedOutMessage.textContent = t('friendsSignInMessage');
  if (signedOutLoginBtn) signedOutLoginBtn.textContent = t('signInButton');
  if (addFriendLabel) {
    addFriendLabel.setAttribute('data-i18n', 'addFriend');
    addFriendLabel.textContent = t('addFriend');
  }
  if (sendBtn) sendBtn.textContent = t('send');
  if (friendsLabel) {
    friendsLabel.setAttribute('data-i18n', 'friends');
    friendsLabel.textContent = t('friends');
  }
  if (friendsTitle) {
    friendsTitle.setAttribute('data-i18n', 'connections');
    friendsTitle.textContent = t('connections');
  }
  if (requestsLabel) {
    requestsLabel.setAttribute('data-i18n', 'requests');
    requestsLabel.textContent = t('requests');
  }
  if (requestsTitle) {
    requestsTitle.setAttribute('data-i18n', 'incomingOutgoing');
    requestsTitle.textContent = t('incomingOutgoing');
  }
  if (compareLabel) {
    compareLabel.setAttribute('data-i18n', 'compareLocations');
    compareLabel.textContent = t('compareLocations');
  }
  if (compareTitle) {
    compareTitle.setAttribute('data-i18n', 'sharedFavoritePlaces');
    compareTitle.textContent = t('sharedFavoritePlaces');
  }
  if (compareBtn) compareBtn.textContent = t('compareSelected');
  if (compareResultLabel) compareResultLabel.textContent = t('compareResult');
}

function applyLanguageFromStorage() {
  const lang = localStorage.getItem(languageStorageKey) || 'en';
  const el = document.getElementById('desktopLanguageToggleText');
  const mobileEl = document.getElementById('mobileLanguageToggleText');
  if (el) el.textContent = (String(lang || 'en').toUpperCase() === 'VI' || lang === 'vi') ? 'VN' : 'EN';
  if (mobileEl) mobileEl.textContent = (String(lang || 'en').toUpperCase() === 'VI' || lang === 'vi') ? 'VN' : 'EN';
  // Apply translations to static text
  currentLanguage = (lang === 'vi' ? 'vi' : 'en');
  applyLanguageToStaticText();
  if (activeProfile) {
    try { renderFriendsData(activeProfile); } catch (e) { /* ignore */ }
  }
  updateMobileNavUI();
}

function applyThemeFromStorage() {
  const theme = localStorage.getItem(themeStorageKey) || 'dark';
  if (theme === 'light') document.body.classList.add('theme-light');
  else document.body.classList.remove('theme-light');
  const el = document.getElementById('themeToggleText');
  const mobileEl = document.getElementById('mobileThemeToggleText');
  if (el) el.textContent = theme === 'light' ? 'Light mode' : 'Dark mode';
  if (mobileEl) mobileEl.textContent = theme === 'light' ? 'Light mode' : 'Dark mode';
  updateMobileNavUI();
}

function setFriendsNavActive() {
  const mapNavBtn = document.getElementById('mapNavBtn');
  const friendsNavBtn = document.getElementById('friendsNavBtn');
  const mobileMapNavBtn = document.getElementById('mobileMapNavBtn');
  const mobileFriendsNavBtn = document.getElementById('mobileFriendsNavBtn');

  mapNavBtn?.classList.remove('active');
  mobileMapNavBtn?.classList.remove('active');
  friendsNavBtn?.classList.add('active');
  mobileFriendsNavBtn?.classList.add('active');

  friendsNavBtn?.setAttribute('aria-current', 'page');
  mobileFriendsNavBtn?.setAttribute('aria-current', 'page');
  mapNavBtn?.removeAttribute('aria-current');
  mobileMapNavBtn?.removeAttribute('aria-current');
}

function normalizeUserSession(user) {
  if (!user) return null;
  return { ...user, avatarUrl: user.avatarUrl || getProfileAvatarUrl(user) };
}

function syncUiCheckboxes(root = document) {
  root.querySelectorAll('.ui-checkbox-input').forEach(input => {
    const box = input.nextElementSibling;
    if (!box || !box.classList.contains('ui-checkbox')) return;

    const apply = () => box.classList.toggle('checked', input.checked);
    apply();

    if (!input.dataset.uiCheckboxSyncBound) {
      input.addEventListener('change', apply);
      input.dataset.uiCheckboxSyncBound = '1';
    }
  });
}

const uiCheckboxObserver = new MutationObserver(() => syncUiCheckboxes());
uiCheckboxObserver.observe(document.body, { childList: true, subtree: true });
syncUiCheckboxes();
setInterval(syncUiCheckboxes, 250);

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

function setMobileNavState(isOpen = false) {
  document.body.classList.toggle('mobile-nav-open', Boolean(isOpen));
  const tray = document.getElementById('mobileNavTray');
  const backdrop = document.getElementById('mobileNavBackdrop');
  if (tray) {
    tray.style.setProperty('top', 'calc(env(safe-area-inset-top, 0px) + 132px)', 'important');
    tray.style.setProperty('max-height', 'calc(100dvh - 154px)', 'important');
    tray.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
  }
  if (backdrop) {
    backdrop.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
  }
}

function updateMobileNavUI() {
  const mobileProfileButton = document.getElementById('mobileProfileButton');
  const mobileUserAvatar = document.getElementById('mobileUserAvatar');
  const mobileUserName = document.getElementById('mobileUserName');
  const mobileUserStatus = document.getElementById('mobileUserStatus');
  const mobileAuthBtn = document.getElementById('mobileAuthBtn');
  const mobileNavBtn = document.getElementById('mobileNavBtn');
  const mobileNavCloseBtn = document.getElementById('mobileNavCloseBtn');
  const mobileLanguageText = document.getElementById('mobileLanguageToggleText');
  const mobileThemeText = document.getElementById('mobileThemeToggleText');

  if (mobileNavBtn) mobileNavBtn.title = t('openNavigation');
  if (mobileNavCloseBtn) mobileNavCloseBtn.title = t('closeNavigation');
  if (mobileLanguageText) mobileLanguageText.textContent = localStorage.getItem(languageStorageKey) === 'vi' ? 'VN' : 'EN';
  if (mobileThemeText) mobileThemeText.textContent = localStorage.getItem(themeStorageKey) === 'light' ? 'Light mode' : 'Dark mode';

  if (currentUser) {
    if (mobileProfileButton) {
      mobileProfileButton.setAttribute('aria-label', `${t('profile')}: ${currentUser.name || currentUser.email || t('profile')}`);
      mobileProfileButton.title = currentUser.name || currentUser.email || t('profile');
    }
    if (mobileUserAvatar) mobileUserAvatar.src = currentUser.avatarUrl || getProfileAvatarUrl(currentUser);
    if (mobileUserName) mobileUserName.textContent = currentUser.name || currentUser.email || 'Guest';
    if (mobileUserStatus) mobileUserStatus.textContent = currentUser.email || 'Signed in';
    if (mobileAuthBtn) {
      mobileAuthBtn.classList.remove('login');
      mobileAuthBtn.classList.add('logout');
      mobileAuthBtn.textContent = t('logout');
      mobileAuthBtn.setAttribute('aria-label', t('logout'));
      mobileAuthBtn.style.setProperty('border-color', 'rgba(248, 113, 113, 0.55)', 'important');
      mobileAuthBtn.style.setProperty('background-color', 'rgba(127, 29, 29, 0.22)', 'important');
      mobileAuthBtn.style.setProperty('color', '#f87171', 'important');
    }
  } else {
    if (mobileProfileButton) {
      mobileProfileButton.setAttribute('aria-label', t('signInContinue'));
      mobileProfileButton.title = t('signInContinue');
    }
    if (mobileUserAvatar) mobileUserAvatar.src = 'https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png';
    if (mobileUserName) mobileUserName.textContent = 'Guest';
    if (mobileUserStatus) mobileUserStatus.textContent = 'Sign in to continue';
    if (mobileAuthBtn) {
      mobileAuthBtn.classList.remove('logout');
      mobileAuthBtn.classList.add('login');
      mobileAuthBtn.textContent = t('login');
      mobileAuthBtn.setAttribute('aria-label', t('login'));
      mobileAuthBtn.style.setProperty('border-color', 'rgba(192, 132, 252, 0.35)', 'important');
      mobileAuthBtn.style.setProperty('background-color', 'rgba(15, 23, 42, 0.6)', 'important');
      mobileAuthBtn.style.setProperty('color', '#c084fc', 'important');
    }
  }
}

function toggleDesktopNav() {
  applyDesktopNavState(!document.body.classList.contains('desktop-nav-collapsed'));
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

function updateAuthUI() {
  const loginBtn = document.getElementById('desktopLoginBtn');
  const logoutBtn = document.getElementById('desktopLogoutBtn');
  const notice = document.getElementById('signedOutNotice');
  const shell = document.getElementById('friendsShell');
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
  updateMobileNavUI();
}

function handleLogout() {
  currentUser = null;
  saveUserSession();
  updateAuthUI();
  renderSignedOutState();
}

function renderSignedOutState() {
  const friendsList = document.getElementById('friendsList');
  const requestsList = document.getElementById('requestsList');
  const compareFriendPicker = document.getElementById('compareFriendPicker');
  const compareResult = document.getElementById('compareResult');
  const friendRequestStatus = document.getElementById('friendRequestStatus');

  if (friendsList) friendsList.innerHTML = '';
  if (requestsList) requestsList.innerHTML = '';
  if (compareFriendPicker) compareFriendPicker.innerHTML = '';
  if (compareResult) compareResult.innerHTML = '';
  if (friendRequestStatus) friendRequestStatus.textContent = '';
}

async function loadFriendsData() {
  if (!currentUser) return;

  const response = await fetch(convexUrl(`/api/profile?userId=${encodeURIComponent(currentUser.userId)}`));
  const profile = await response.json();
  if (!response.ok || !profile || profile.error) {
    throw new Error(t('loadFriendsError'));
  }

  activeProfile = profile;
  friendProfileCache = new Map();
  friendProfileCacheLoad = preloadFriendProfiles(profile.friends || []);
  renderFriendsData(profile);
}

function openLocationOnMap(locationId) {
  const nextLocationId = String(locationId || '').trim();
  if (!nextLocationId) return;
  window.location.href = `./index.html?locationId=${encodeURIComponent(nextLocationId)}`;
}

async function preloadFriendProfiles(friends) {
  await Promise.allSettled((friends || []).map(async (friend) => {
    const friendId = String(friend?._id || '').trim();
    if (!friendId || friendProfileCache.has(friendId)) {
      return;
    }

    const response = await fetch(convexUrl(`/api/profile?userId=${encodeURIComponent(friendId)}`));
    const data = await response.json();
    if (!response.ok || !data || data.error) {
      throw new Error(data?.error || `Could not load profile for ${friendId}`);
    }

    friendProfileCache.set(friendId, data);
  }));
}

function renderFriendsData(profile) {
  const friends = profile.friends || [];
  const incoming = profile.requests?.incoming || [];
  const outgoing = profile.requests?.outgoing || [];

  const friendsList = document.getElementById('friendsList');
  const requestsList = document.getElementById('requestsList');
  const compareFriendPicker = document.getElementById('compareFriendPicker');

  if (friendsList) {
    friendsList.innerHTML = friends.length > 0 ? friends.map(friend => `
      <div class="theme-surface-card rounded-xl border border-white/10 bg-slate-900/60 p-3">
        <div class="flex items-start justify-between gap-3">
          <div class="flex min-w-0 items-center gap-3">
            <img src="${getProfileAvatarUrl(friend)}" alt="${friend.name || friend.email || 'Friend'} picture" class="h-10 w-10 rounded-full border border-white/10 object-cover" />
            <div class="min-w-0">
              <p class="theme-surface-title truncate font-semibold text-white">${friend.name || friend.email}</p>
              <p class="theme-surface-subtitle truncate text-xs text-slate-400">${friend.email}</p>
              <p class="theme-surface-meta mt-1 text-[11px] text-slate-500">ID: ${friend._id}</p>
            </div>
          </div>
          <button class="friend-view-btn theme-surface-action rounded-xl border border-cyan-400 px-3 py-2 text-xs font-semibold text-cyan-200" data-user-id="${friend._id}">${t('view')} ${t('profile')}</button>
        </div>
      </div>
    `).join('') : `<p class="theme-surface-muted text-slate-400">${t('noFriends')}</p>`;
  }

  if (requestsList) {
    const incomingHtml = incoming.map(request => `
      <div class="theme-surface-card rounded-xl border border-white/10 bg-slate-900/60 p-3">
        <p class="theme-surface-title font-semibold text-white">${request.senderEmail}</p>
        <p class="theme-surface-subtitle text-xs text-slate-400">${t('incomingRequest')}</p>
        <div class="mt-3 flex gap-2">
          <button class="request-action-btn rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-900" data-request-id="${request._id}" data-action="accept">${t('accept')}</button>
          <button class="request-action-btn theme-surface-action rounded-xl bg-slate-700 px-3 py-2 text-xs font-semibold text-slate-200" data-request-id="${request._id}" data-action="decline">${t('decline')}</button>
        </div>
      </div>
    `).join('');

    const outgoingHtml = outgoing.map(request => `
      <div class="theme-surface-card rounded-xl border border-white/10 bg-slate-900/60 p-3">
        <p class="theme-surface-title font-semibold text-white">${request.receiverEmail}</p>
        <p class="theme-surface-subtitle text-xs text-slate-400">${t('outgoingRequest')}</p>
      </div>
    `).join('');

    requestsList.innerHTML = (incomingHtml + outgoingHtml) || `<p class="theme-surface-muted text-slate-400">${t('noPendingRequests')}</p>`;
  }

  if (compareFriendPicker) {
    compareFriendPicker.innerHTML = friends.length > 0 ? friends.slice(0, 12).map(friend => `
      <label class="theme-surface-card flex items-center gap-2 rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-slate-200">
        <input type="checkbox" class="compare-friend-checkbox ui-checkbox-input" value="${friend._id}" onchange="this.nextElementSibling?.classList.toggle('checked', this.checked)" />
        <span class="ui-checkbox" aria-hidden="true"></span>
        <span class="theme-surface-title">${friend.name || friend.email}</span>
      </label>
    `).join('') : `<p class="theme-surface-muted text-slate-400">${t('addFriendsToCompare')}</p>`;
  }

  document.querySelectorAll('.friend-view-btn').forEach(button => {
    button.addEventListener('click', async () => {
      const userId = String(button.dataset.userId || '').trim();
      if (!userId) return;
      try {
        const response = await fetch(convexUrl(`/api/profile?userId=${encodeURIComponent(userId)}`));
        const profile = await response.json();
        if (!response.ok || !profile || profile.error) {
          throw new Error(profile?.error || t('loadProfileError'));
        }

        const modal = document.getElementById('friendProfileModal');
        const content = document.getElementById('friendProfileContent');
        const closeBtn = document.getElementById('friendProfileClose');
        if (content && profile) {
          content.innerHTML = `
            <div class="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
              <p class="text-xs uppercase tracking-[0.24em] text-slate-400">${t('viewing')}</p>
              <div class="mt-3 flex items-center gap-3">
                <img src="${getProfileAvatarUrl(profile.user)}" alt="${profile.user?.name || profile.user?.email || 'Profile'} picture" class="h-14 w-14 rounded-full border border-white/10 object-cover" />
                <div class="min-w-0">
                  <h2 class="text-2xl font-black text-white">${profile.user?.name || profile.user?.email || 'Profile'}</h2>
                  <p class="mt-1 truncate text-sm text-slate-400">${profile.user?.email || ''}</p>
                </div>
              </div>
              <div class="mt-4 flex flex-wrap gap-2 text-xs text-slate-200">
                <span class="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1">${(profile.friends||[]).length} ${t('friendsLabel')}</span>
                <span class="rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1">${(profile.favoriteLocations||[]).length} ${t('favorites')}</span>
                <span class="rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1">${(profile.ratingsWithLocations||[]).length} ${t('ratings')}</span>
              </div>
            </div>
            <div class="mt-4">
              <h3 class="text-lg font-bold text-white">${t('favorites')}</h3>
              <div class="mt-3 space-y-2">
                ${(profile.favoriteLocations||[]).map(loc => `
                  <div class="rounded-xl border border-white/10 bg-slate-900/60 p-3">
                    <div class="flex items-start justify-between gap-3">
                      <div class="min-w-0">
                        <p class="font-semibold text-white">${loc.name}</p>
                        <p class="text-xs text-slate-400">${loc.address||''}</p>
                      </div>
                      <button class="open-friend-location-btn rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-200" data-location-id="${loc.id}">${t('open')}</button>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          `;

          // wire close and open actions
          if (closeBtn) {
            closeBtn.onclick = () => {
              if (modal) {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
              }
            };
          }

          if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
          }

          document.querySelectorAll('.open-friend-location-btn').forEach(btn => {
            btn.addEventListener('click', () => {
              const locId = btn.dataset.locationId;
              if (!locId) return;
              window.location.href = `./index.html?locationId=${encodeURIComponent(locId)}`;
            });
          });
        }
      } catch (error) {
        alert(String(error?.message || t('loadProfileError')));
      }
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
        alert(data.error || t('friendRequestFailed'));
        return;
      }
      await loadFriendsData();
    });
  });
}

async function compareFavorites(friendIds) {
  const result = document.getElementById('compareResult');
  if (!result || !currentUser) return;

  try {
    result.textContent = t('compareLoading');
    await friendProfileCacheLoad;

    const activeFavorites = Array.isArray(activeProfile?.favoriteLocations) ? activeProfile.favoriteLocations : [];
    const activeIds = new Set(activeFavorites.map(location => String(location.id)));

    const friendProfiles = friendIds.map((friendId) => {
      const profile = friendProfileCache.get(friendId);
      if (!profile) {
        throw new Error(t('compareLoadingProfiles'));
      }
      return { friendId, profile };
    });

    const sharedIds = friendProfiles.reduce((shared, entry) => {
      const favoriteIds = new Set((entry.profile.favoriteLocations || []).map(location => String(location.id)));
      if (shared === null) {
        return new Set([...activeIds].filter(id => favoriteIds.has(id)));
      }
      return new Set([...shared].filter(id => favoriteIds.has(id)));
    }, null);

    const sharedLocations = (activeFavorites || []).filter(location => sharedIds?.has(String(location.id)));
    const sharedLocationsHtml = sharedLocations.length > 0 ? sharedLocations.map(location => `
      <div class="theme-surface-panel rounded-2xl border border-white/10 bg-slate-950/60 p-4">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="theme-surface-title font-semibold text-white">${location.name}</p>
            <p class="theme-surface-subtitle text-xs text-slate-400">${location.address || ''}</p>
          </div>
          <button class="compare-location-open-btn theme-surface-action rounded-xl border border-cyan-400 px-3 py-2 text-xs font-semibold text-cyan-200" data-location-id="${location.id}">${t('open')}</button>
        </div>
      </div>
    `).join('') : `<p class="theme-surface-muted text-slate-400">${t('compareNoShared')}</p>`;
    result.innerHTML = `
      <div class="space-y-3">
        <div>
          <p class="theme-surface-meta text-xs uppercase tracking-[0.18em] text-slate-500">${t('sharedFavoritePlaces')}</p>
          <div class="mt-2 space-y-2">${sharedLocationsHtml}</div>
        </div>
      </div>
    `;

    document.querySelectorAll('.compare-location-open-btn').forEach(button => {
      button.addEventListener('click', () => openLocationOnMap(button.dataset.locationId));
    });
  } catch (error) {
    console.error('compareFavorites failed', error);
    result.textContent = String(error?.message || error?.stack || error || t('friendRequestFailed'));
  }
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
  const mapNavBtn = document.getElementById('mapNavBtn');
  const profileNavBtn = document.getElementById('profileNavBtn');
  const desktopProfileButton = document.getElementById('desktopProfileButton');
  const desktopNavToggle = document.getElementById('desktopNavToggle');
  const sendFriendRequestBtn = document.getElementById('sendFriendRequestBtn');
  const compareFavoritesBtn = document.getElementById('compareFavoritesBtn');

  desktopLoginBtn?.addEventListener('click', () => openLoginModal('Sign in to manage your friends.'));
  signedOutLoginBtn?.addEventListener('click', () => openLoginModal('Sign in to manage your friends.'));
  desktopLogoutBtn?.addEventListener('click', handleLogout);
  loginModalClose?.addEventListener('click', closeLoginModal);
  loginTabBtn?.addEventListener('click', () => switchAuthTab(false));
  signupTabBtn?.addEventListener('click', () => switchAuthTab(true));
  desktopProfileButton?.addEventListener('click', () => {
    if (!currentUser) {
      openLoginModal('Sign in to view your profile.');
      return;
    }
    window.location.href = './profile.html';
  });
  mapNavBtn?.addEventListener('click', () => {
    window.location.href = './index.html';
  });
  profileNavBtn?.addEventListener('click', () => {
    window.location.href = './profile.html';
  });
  document.getElementById('mobileNavBtn')?.addEventListener('click', () => setMobileNavState(!document.body.classList.contains('mobile-nav-open')));
  document.getElementById('mobileNavCloseBtn')?.addEventListener('click', () => setMobileNavState(false));
  document.getElementById('mobileNavBackdrop')?.addEventListener('click', () => setMobileNavState(false));
  document.getElementById('mobileProfileButton')?.addEventListener('click', () => {
    setMobileNavState(false);
    if (!currentUser) {
      openLoginModal('Sign in to view your profile.');
      return;
    }
    window.location.href = './profile.html';
  });
  document.getElementById('mobileMapNavBtn')?.addEventListener('click', () => {
    setMobileNavState(false);
    window.location.href = './index.html';
  });
  document.getElementById('mobileFriendsNavBtn')?.addEventListener('click', () => {
    setMobileNavState(false);
    window.location.href = './friends.html';
  });
  document.getElementById('mobileThemeToggleBtn')?.addEventListener('click', () => {
    const key = 'didaudo_theme';
    const current = localStorage.getItem(key) || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    localStorage.setItem(key, next);
    applyThemeFromStorage();
  });
  document.getElementById('mobileLanguageToggleBtn')?.addEventListener('click', () => {
    const key = 'didaudo_language';
    const current = localStorage.getItem(key) || 'en';
    const next = current === 'en' ? 'vi' : 'en';
    localStorage.setItem(key, next);
    applyLanguageFromStorage();
  });
  document.getElementById('mobileAuthBtn')?.addEventListener('click', () => {
    if (currentUser) {
      handleLogout();
      setMobileNavState(false);
      return;
    }
    setMobileNavState(false);
    openLoginModal('Sign in to manage your friends.');
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

  sendFriendRequestBtn?.addEventListener('click', async () => {
    const input = document.getElementById('friendEmailInput');
    const status = document.getElementById('friendRequestStatus');
    const receiverEmail = String(input?.value || '').trim();
    if (!receiverEmail || !currentUser) {
      if (status) status.textContent = t('enterEmailAddress');
      return;
    }
    try {
      const response = await fetch(convexUrl('/api/friends/request'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderId: currentUser.userId, receiverEmail }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || t('friendRequestFailed'));
      if (status) status.textContent = t('friendRequestSent');
      if (input) input.value = '';
      await loadFriendsData();
    } catch (error) {
      if (status) status.textContent = String(error?.message || t('friendRequestFailed'));
    }
  });

  compareFavoritesBtn?.addEventListener('click', async () => {
    if (!currentUser) {
      openLoginModal('Sign in to compare favorites.');
      return;
    }

    const selected = Array.from(document.querySelectorAll('.compare-friend-checkbox:checked'))
      .map(input => input.value)
      .slice(0, 3);

    if (selected.length === 0) {
      const compareResult = document.getElementById('compareResult');
      if (compareResult) compareResult.textContent = t('comparePickOneFriend');
      return;
    }

    await compareFavorites(selected);
  });

  loginForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    try {
      await handleLogin(email, password);
      await loadFriendsData();
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
      await loadFriendsData();
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
  setFriendsNavActive();
  applyLanguageFromStorage();
  applyThemeFromStorage();

  if (!currentUser) {
    renderSignedOutState();
    return;
  }

  try {
    await loadFriendsData();
  } catch (error) {
    const status = document.getElementById('friendRequestStatus');
    if (status) {
      status.textContent = String(error?.message || t('loadFriendsError'));
    }
  }
});
