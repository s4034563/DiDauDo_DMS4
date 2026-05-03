// ========================================
// GLOBAL STATE & INITIALIZATION
// ========================================

let map;
let baseTileLayer;
let vectorSource;
let clusterSource;
let vectorLayer;
let userLocationSource;
let userLocationLayer;
let userLocation = null;
let geolocationPermissionGranted = null; // null=not asked, true=granted, false=denied
let rightInfoPanelElement;
let rightInfoPanelContentElement;
let rightInfoPanelCloseElement;
let mobileSearchInputElement;
let mobileSidebarTouchStart = null;
let activePopupLocationId = null;
let activeSelectedLocationId = null;
let allLocations = [];
let currentMapCenter = { lat: 10.729229862661654, lng: 106.69573512876413 }; // Default: Ho Chi Minh City area
const ratingSummaryByLocation = {}; // Track aggregate ratings per location
let ratingSessionId = null;
let currentLanguage = 'en';
const appConfig = window.VIBEMAP_CONFIG || {};
const locationFeatureMap = new Map(); // Map locationId to ol.Feature for diff updates
const markerStyleCache = new Map();

function normalizeConvexBaseUrl(url) {
    if (!url || typeof url !== 'string') {
        return '';
    }

    return url.replace(/\/$/, '');
}

const convexBaseUrl = normalizeConvexBaseUrl(appConfig.convexBaseUrl || '');
const useConvexBackend = Boolean(appConfig.useConvex && convexBaseUrl);

function convexUrl(path) {
    return `${convexBaseUrl}${path}`;
}

const translations = {
    en: {
        subtitle: 'Discover interesting locations near you',
        proximity: 'Proximity',
        activityCategory: 'Activity Category',
        sportsRecreation: '🏀 Sports & Recreation',
        sports: '⚽ Sports',
        fitness: '💪 Fitness',
        musicNightlife: '🎵 Music & Nightlife',
        music: '🎵 Music',
        nightlife: '🍺 Nightlife',
        artCulture: '🎨 Art & Culture',
        art: '🎨 Art',
        photography: '📸 Photography',
        shoppingSocial: '🛍️ Shopping & Social',
        shopping: '🛍️ Shopping',
        markets: '🎪 Markets',
        diningSocial: '🍽️ Dining & Social',
        dining: '🍽️ Dining',
        cafes: '☕ Cafes',
        outdoorNature: '🌳 Outdoor & Nature',
        hiking: '🥾 Hiking',
        parks: '🌳 Parks',
        eventsFestivals: '🎪 Events & Festivals',
        events: '🎫 Events',
        festivals: '🎆 Festivals',
        gamingEsports: '🎮 Gaming & Esports',
        gaming: '🎮 Gaming',
        arcades: '🕹️ Arcades',
        theVibe: 'The Vibe',
        vibeCozy: '🛋️ Cozy',
        vibeIndustrial: '🏭 Industrial',
        vibeLoudParty: '🎊 Loud/Party',
        vibeMinimalist: '✨ Minimalist',
        vibeHiddenGem: '💎 Hidden Gem',
        vibeInstagrammable: '📸 Instagrammable',
        normal: 'Normal',
        trending: 'Trending',
        useMyLocation: 'Use My Location',
        locatingUser: 'Locating...',
        filters: 'Filters',
        active: 'active',
        clearFilters: 'Clear All Filters',
        locationDetails: 'Location Details',
        closeDetails: 'Close details',
        clickMarkerHint: 'Click a marker to view details.',
        
        viewViralVideo: 'View Location',
        rating: 'Rate this place',
        ratingAverage: 'Average rating',
        ratingNotAvailable: 'No ratings yet',
        ratings: 'ratings',
        ratingUpdated: 'Rating saved',
        
        search: 'Search Places',
        searchPlaceholder: 'Type a location name...',
        noResults: 'No locations found',
        permissionTitle: 'Share Your Location',
        permissionMessage: 'Allow access to your location to show nearby places more accurately.',
        permissionAllow: 'Allow',
        permissionDeny: 'Not Now'
    },
    vi: {
        subtitle: 'Khám phá các địa điểm thú vị xung quanh bạn',
        proximity: 'Khoảng cách',
        activityCategory: 'Danh mục hoạt động',
        sportsRecreation: '🏀 Thể thao & Giải trí',
        sports: '⚽ Thể thao',
        fitness: '💪 Gym & Fitness',
        musicNightlife: '🎵 Âm nhạc & Giải trí đêm',
        music: '🎵 Âm nhạc',
        nightlife: '🍺 Giải trí đêm',
        artCulture: '🎨 Nghệ thuật & Văn hóa',
        art: '🎨 Nghệ thuật',
        photography: '📸 Điểm chụp ảnh',
        shoppingSocial: '🛍️ Mua sắm & Giao lưu',
        shopping: '🛍️ Mua sắm',
        markets: '🎪 Chợ & Hội chợ',
        diningSocial: '🍽️ Ăn uống & Giao lưu',
        dining: '🍽️ Ăn uống',
        cafes: '☕ Quán cà phê',
        outdoorNature: '🌳 Ngoại trời & Thiên nhiên',
        hiking: '🥾 Đi bộ/Leo núi',
        parks: '🌳 Công viên',
        eventsFestivals: '🎪 Sự kiện & Lễ hội',
        events: '🎫 Sự kiện',
        festivals: '🎆 Lễ hội',
        gamingEsports: '🎮 Game & Esports',
        gaming: '🎮 Game',
        arcades: '🕹️ Máy chơi/Arcade',
        theVibe: 'Phong cách',
        vibeCozy: '🛋️ Ấm cúng',
        vibeIndustrial: '🏭 Công nghiệp',
        vibeLoudParty: '🎊 Sôi động/Tiệc tùng',
        vibeMinimalist: '✨ Tối giản',
        vibeHiddenGem: '💎 Bí mật',
        vibeInstagrammable: '📸 Lên hình đẹp',
        normal: 'Bình thường',
        trending: 'Đang xu hướng',
        useMyLocation: 'Sử dụng vị trí của tôi',
        locatingUser: 'Đang định vị...',
        filters: 'Bộ lọc',
        active: 'đang bật',
        clearFilters: 'Xóa tất cả bộ lọc',
        locationDetails: 'Chi tiết địa điểm',
        closeDetails: 'Đóng chi tiết',
        clickMarkerHint: 'Nhấn vào ghim để xem chi tiết.',
        
        viewViralVideo: 'Xem địa điểm',
        rating: 'Đánh giá địa điểm này',
        ratingAverage: 'Điểm trung bình',
        ratingNotAvailable: 'Chưa có đánh giá',
        ratings: 'lượt đánh giá',
        ratingUpdated: 'Đã lưu đánh giá',
        
        search: 'Tìm địa điểm',
        searchPlaceholder: 'Gõ tên địa điểm...',
        noResults: 'Không tìm thấy địa điểm',
        permissionTitle: 'Chia sẻ vị trí của bạn',
        permissionMessage: 'Cho phép truy cập vị trí để hiển thị các địa điểm gần đó chính xác hơn.',
        permissionAllow: 'Cho phép',
        permissionDeny: 'Không'
    }
};

const locationsApiUrl = convexUrl('/api/locations');

function mapServerLocationToAppLocation(location) {
    const tags = Array.isArray(location.tags) ? location.tags : [];
    const visibleTags = tags.filter(tag => !String(tag || '').toLowerCase().startsWith('activity:'));
    const caption = location.caption || visibleTags.join(' ');
    const seedVibes = visibleTags.map(tag => {
        const normalized = String(tag || '').toLowerCase();
        if (normalized.includes('cozy')) return 'Cozy';
        if (normalized.includes('industrial')) return 'Industrial';
        if (normalized.includes('party') || normalized.includes('night')) return 'Loud/Party';
        if (normalized.includes('minimal')) return 'Minimalist';
        if (normalized.includes('hidden') || normalized.includes('gem')) return 'Hidden Gem';
        if (normalized.includes('photo') || normalized.includes('instagram')) return 'Instagrammable';
        return null;
    }).filter(Boolean);

    const types = Array.isArray(location.types) && location.types.length > 0
        ? location.types.map(value => String(value).trim()).filter(Boolean)
        : [location.type || 'Cafes'];

    return {
        id: String(location.id),
        name: location.name || 'Untitled',
        type: types[0] || 'Cafes',
        types,
        lat: Number(location.lat) || currentMapCenter.lat,
        lng: Number(location.lng) || currentMapCenter.lng,
        caption,
        seedVibes,
        mediaURL: location.mediaURL || location.videoURL || '',
        mediaType: location.mediaType || (location.mediaURL ? 'image' : 'video'),
        thumbnailUrl: location.thumbnailUrl || '',
        externalUrl: location.externalUrl || '',
        videoURL: location.externalUrl || location.videoURL || '',
        address: location.address || '',
        vibes: assignAIVibes(caption, seedVibes),
        curatorChoice: Boolean(location.curatorChoice)
    };
}

function getLocationPreviewImageUrl(location) {
    const thumbnailUrl = String(location.thumbnailUrl || '').trim();
    if (thumbnailUrl) {
        return thumbnailUrl;
    }

    const mediaURL = String(location.mediaURL || '').trim();
    if (!mediaURL) {
        return '';
    }

    const mediaType = String(location.mediaType || '').toLowerCase();
    const looksLikeImage = /\.(png|jpe?g|gif|webp|avif|bmp|svg)(\?.*)?$/i.test(mediaURL) || mediaURL.startsWith('data:image/');

    if (mediaType === 'image' || looksLikeImage) {
        return mediaURL;
    }

    return '';
}

function getLocationActionUrl(location) {
    const externalUrl = String(location.externalUrl || '').trim();
    if (externalUrl) {
        return externalUrl;
    }

    const mediaType = String(location.mediaType || '').toLowerCase();
    if (mediaType === 'video') {
        return String(location.videoURL || location.mediaURL || '').trim();
    }

    return '';
}

async function loadServerLocations() {
    if (!useConvexBackend) {
        return [];
    }

    try {
        const response = await fetch(locationsApiUrl);
        if (!response.ok) {
            return [];
        }

        const payload = await response.json();
        const remoteLocations = Array.isArray(payload) ? payload : (payload.locations || []);
        return remoteLocations.map(mapServerLocationToAppLocation);
    } catch (error) {
        console.warn('Failed reading server locations', error);
        return [];
    }
}

// Filter state
const filterState = {
    proximity: 5,
    venueTypes: [],
    vibes: [],
    searchQuery: ''
};

function t(key) {
    const dictionary = translations[currentLanguage] || translations.en;
    return dictionary[key] || translations.en[key] || key;
}

function getLocalizedActivityType(type) {
    const mapType = {
        'Sports': t('sports').replace('⚽ ', ''),
        'Fitness': t('fitness').replace('💪 ', '')
    };
    return mapType[type] || type;
}

function getLocationActivities(location) {
    if (Array.isArray(location.types) && location.types.length > 0) {
        return location.types;
    }

    return [location.type || 'Cafes'];
}

function setSelectedLocation(locationId) {
    activeSelectedLocationId = locationId;
}

function getLocalizedVibe(vibe) {
    const vibeMap = {
        Cozy: t('vibeCozy').replace('🛋️ ', ''),
        Industrial: t('vibeIndustrial').replace('🏭 ', ''),
        'Loud/Party': t('vibeLoudParty').replace('🎊 ', ''),
        Minimalist: t('vibeMinimalist').replace('✨ ', ''),
        'Hidden Gem': t('vibeHiddenGem').replace('💎 ', ''),
        Instagrammable: t('vibeInstagrammable').replace('📸 ', '')
    };
    return vibeMap[vibe] || vibe;
}

function applyLanguageToStaticText() {
    document.documentElement.lang = currentLanguage === 'vi' ? 'vi' : 'en';

    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        element.textContent = t(key);
    });

    document.querySelectorAll('[data-i18n-aria-label]').forEach(element => {
        const key = element.getAttribute('data-i18n-aria-label');
        element.setAttribute('aria-label', t(key));
    });
}

function applyLanguage() {
    applyLanguageToStaticText();

    document.getElementById('proximityValue').textContent = `${filterState.proximity} km`;
    updateLocationsList(getFilteredLocations());

    if (activePopupLocationId) {
        const activeLocation = allLocations.find(location => location.id === activePopupLocationId);
        if (activeLocation) {
            showInfoWindow(activeLocation);
        }
    }
}

async function isGeolocationEnabled() {
    // Check actual browser permission status
    if (!navigator.permissions) {
        return geolocationPermissionGranted === true;
    }
    
    try {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        return result.state === 'granted';
    } catch (e) {
        return geolocationPermissionGranted === true;
    }
}

function getFilteredLocations() {
    let filtered = [...allLocations];

    // Search filter - check name and address
    if (filterState.searchQuery.trim()) {
        const query = filterState.searchQuery.toLowerCase().trim();
        filtered = filtered.filter(loc => 
            loc.name.toLowerCase().includes(query) || 
            loc.address.toLowerCase().includes(query)
        );
    }

    // Proximity filter - only apply if geolocation permission status is granted
    if (geolocationPermissionGranted === true && userLocation) {
        filtered = filtered.filter(loc => {
            const distance = getDistance(userLocation, { lat: loc.lat, lng: loc.lng });
            return distance <= filterState.proximity;
        });
    }

    // Activity type filter logic:
    // Each checked category contributes either its selected sub-categories,
    // or all of its sub-categories when none are selected.
    const selectedActivities = [];
    document.querySelectorAll('input[data-category]:checked').forEach(categoryCheckbox => {
        const subId = categoryCheckbox.dataset.subid;
        const subContainer = subId ? document.getElementById(subId) : null;
        const checkedSubcategories = subContainer
            ? Array.from(subContainer.querySelectorAll('input[type="checkbox"]:checked')).map(input => input.value)
            : [];

        if (checkedSubcategories.length > 0) {
            selectedActivities.push(...checkedSubcategories);
            return;
        }

        if (subContainer) {
            selectedActivities.push(...Array.from(subContainer.querySelectorAll('input[type="checkbox"]')).map(input => input.value));
        }
    });

    if (selectedActivities.length > 0) {
        const allowedActivities = [...new Set(selectedActivities)];
        filtered = filtered.filter(loc => getLocationActivities(loc).some(activity => allowedActivities.includes(activity)));
    }

    if (filterState.vibes.length > 0) {
        filtered = filtered.filter(loc =>
            loc.vibes.some(vibe => filterState.vibes.includes(vibe))
        );
    }

    return filtered;
}

function assignAIVibes(caption, seedVibes) {
    const vibeRules = [
        { vibe: 'Cozy', keywords: ['cozy', 'warm', 'calm', 'quiet', 'soft', 'candle', 'journaling'] },
        { vibe: 'Industrial', keywords: ['industrial', 'brick', 'steel', 'concrete', 'warehouse', 'beams'] },
        { vibe: 'Loud/Party', keywords: ['dj', 'dance', 'bass', 'party', 'crowd', 'night-market', 'packed'] },
        { vibe: 'Minimalist', keywords: ['minimal', 'clean', 'sleek', 'white', 'simple'] },
        { vibe: 'Hidden Gem', keywords: ['hidden', 'underrated', 'secret', 'gem', 'unpopular', 'off the beaten'] },
        { vibe: 'Instagrammable', keywords: ['neon', 'camera', 'photo', 'story', 'aesthetic', 'colorful', 'camera-ready'] }
    ];

    const text = caption.toLowerCase();
    const matches = vibeRules
        .filter(rule => rule.keywords.some(keyword => text.includes(keyword)))
        .map(rule => rule.vibe);

    const merged = [...new Set([...matches, ...seedVibes])];
    if (merged.length >= 2) {
        return merged.slice(0, 3);
    }

    return seedVibes.slice(0, 3);
}

// ========================================
// GEOLOCATION & USER LOCATION
// ========================================

function createUserLocationStyle() {
    return new ol.style.Style({
        image: new ol.style.Circle({
            radius: 12,
            fill: new ol.style.Fill({
                color: 'rgba(59, 130, 246, 0.9)' // Bright blue
            }),
            stroke: new ol.style.Stroke({
                color: '#ffffff',
                width: 3
            })
        }),
        // Inner circle
        zIndex: 1000
    });
}

function addOrUpdateUserMarker(lat, lng) {
    userLocationSource.clear();
    userLocation = { lat, lng };
    
    const userFeature = new ol.Feature({
        geometry: new ol.geom.Point(ol.proj.fromLonLat([lng, lat]))
    });
    userFeature.setId('user-location');
    userLocationSource.addFeature(userFeature);
}

function initializeUserLocation() {
    if (!navigator.geolocation) {
        console.error('Geolocation not supported');
        return;
    }

    const btn = document.getElementById('useLocationBtn');
    btn.textContent = t('locatingUser');
    btn.disabled = true;

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            centerMapOnUser(latitude, longitude);
            addOrUpdateUserMarker(latitude, longitude);
            btn.textContent = t('useMyLocation');
            btn.disabled = false;
        },
        (error) => {
            console.warn('Geolocation error:', error.message);
            btn.textContent = t('useMyLocation');
            btn.disabled = false;
            // Optionally show error to user
        },
        { enableHighAccuracy: false, timeout: 10000 }
    );
}

function centerMapOnUser(lat, lng) {
    currentMapCenter = { lat, lng };
    map.getView().animate({
        center: ol.proj.fromLonLat([lng, lat]),
        zoom: 14,
        duration: 500
    });
    applyFilters();
}

function checkAndShowPermissionModal() {
    // Check if we already have a stored permission state
    const storedPermission = localStorage.getItem('geolocationPermission');
    if (storedPermission !== null) {
        geolocationPermissionGranted = storedPermission === 'true';
        updateProximityFilterState().catch(() => {});
        return;
    }

    // If no stored permission, show modal (only if geolocationPermissionGranted is still null)
    if (geolocationPermissionGranted === null) {
        const modal = document.getElementById('permissionModal');
        modal.classList.remove('hidden');
    }
}

function setupPermissionModalHandlers() {
    const permissionAllowBtn = document.getElementById('permissionAllowBtn');
    const permissionDenyBtn = document.getElementById('permissionDenyBtn');
    const permissionModal = document.getElementById('permissionModal');

    permissionAllowBtn.addEventListener('click', () => {
        geolocationPermissionGranted = true;
        localStorage.setItem('geolocationPermission', 'true');
        permissionModal.classList.add('hidden');
        updateProximityFilterState().catch(() => {});
        // Optional: Auto-trigger geolocation after permission granted
        initializeUserLocation();
    });

    permissionDenyBtn.addEventListener('click', () => {
        geolocationPermissionGranted = false;
        localStorage.setItem('geolocationPermission', 'false');
        permissionModal.classList.add('hidden');
        updateProximityFilterState().catch(() => {});
    });
}

async function updateProximityFilterState() {
    const proximitySection = document.getElementById('proximitySection');
    const proximitySlider = document.getElementById('proximitySlider');
    
    // Check actual browser geolocation permission status
    const isEnabled = await isGeolocationEnabled();

    if (!isEnabled) {
        // Disable proximity filter if permission not granted
        proximitySlider.disabled = true;
        proximitySection.style.opacity = '0.5';
        proximitySection.style.pointerEvents = 'none';
    } else {
        // Enable proximity filter if permission granted and location available
        proximitySlider.disabled = false;
        proximitySection.style.opacity = '1';
        proximitySection.style.pointerEvents = 'auto';
    }
    applyFilters();
}

function escapeXml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function truncateLabel(text, maxLength) {
    const value = String(text || '').trim();
    if (value.length <= maxLength) {
        return value;
    }

    return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function getDistance(from, to) {
    const R = 6371; // Earth's radius in km
    const dLat = (to.lat - from.lat) * Math.PI / 180;
    const dLng = (to.lng - from.lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(from.lat * Math.PI / 180) * Math.cos(to.lat * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function getMarkerDistance(location) {
    if (!userLocation) {
        return null;
    }

    return getDistance(userLocation, { lat: location.lat, lng: location.lng });
}

function formatMarkerDistance(location) {
    const distance = getMarkerDistance(location);
    return distance === null ? '' : `${distance.toFixed(2)} km`;
}

function createMarkerLabelImage(location, isSelected) {
    const displayName = truncateLabel(location.name, 22);
    const distanceText = (geolocationPermissionGranted === true && userLocation)
        ? formatMarkerDistance(location)
        : '';
    const hasDistance = Boolean(distanceText);
    const width = Math.max(210, Math.min(320, Math.round(Math.max(displayName.length * 10, distanceText.length * 11) + 56)));
    const height = hasDistance ? (isSelected ? 92 : 86) : (isSelected ? 68 : 62);
    const borderColor = isSelected ? '#22c55e' : '#e2e8f0';
    const accentColor = isSelected ? '#16a34a' : '#c084fc';
    const shadowOpacity = isSelected ? 0.28 : 0.18;

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
            <defs>
                <filter id="shadow" x="-20%" y="-20%" width="140%" height="160%">
                    <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#0f172a" flood-opacity="${shadowOpacity}" />
                </filter>
            </defs>
            <g filter="url(#shadow)">
                <rect x="2" y="2" width="${width - 4}" height="${height - 4}" rx="${Math.round(height / 2)}" ry="${Math.round(height / 2)}" fill="#ffffff" fill-opacity="0.98" stroke="${borderColor}" stroke-width="2.5" />
                <rect x="14" y="17" width="6" height="${height - 34}" rx="3" ry="3" fill="${accentColor}" />
                <text x="30" y="36" font-family="Segoe UI, Arial, sans-serif" font-size="22" font-weight="700" fill="#111827">${escapeXml(displayName)}</text>
                ${hasDistance ? `<text x="30" y="63" font-family="Segoe UI, Arial, sans-serif" font-size="16" font-weight="500" fill="#6b7280">${escapeXml(distanceText)}</text>` : ''}
            </g>
        </svg>
    `)}`;
}

function getRatingSessionId() {
    if (ratingSessionId) {
        return ratingSessionId;
    }

    const storageKey = 'diedaudo.ratingSessionId';
    const existing = localStorage.getItem(storageKey);

    if (existing) {
        ratingSessionId = existing;
        return ratingSessionId;
    }

    ratingSessionId = (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function')
        ? globalThis.crypto.randomUUID()
        : `rating-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(storageKey, ratingSessionId);
    return ratingSessionId;
}

function updateRatingSummaryElements(locationId) {
    const summary = ratingSummaryByLocation[locationId];
    const summaryElement = document.getElementById(`ratingSummary-${locationId}`);
    const userRatingElement = document.getElementById(`userRating-${locationId}`);
    const starsElement = document.getElementById(`ratingStars-${locationId}`);

    if (!summary || !summaryElement || !userRatingElement || !starsElement) {
        return;
    }

    const averageLabel = summary.ratingCount > 0
        ? `${summary.averageRating.toFixed(1)} / 5`
        : t('ratingNotAvailable');
    summaryElement.textContent = summary.ratingCount > 0
        ? `${t('ratingAverage')}: ${averageLabel} • ${summary.ratingCount} ${t('ratings')}`
        : `${t('ratingAverage')}: ${averageLabel}`;
    userRatingElement.textContent = summary.userRating > 0
        ? `${summary.userRating} / 5`
        : t('rating');

    const buttons = Array.from(starsElement.querySelectorAll('[data-rating]'));
    buttons.forEach((button) => {
        const rating = Number(button.dataset.rating);
        const selected = rating <= summary.userRating;
        button.textContent = selected ? '★' : '☆';
        button.classList.toggle('text-amber-400', selected);
        button.classList.toggle('text-slate-500', !selected);
        button.setAttribute('aria-pressed', selected ? 'true' : 'false');
    });
}

function renderRatingControls(locationId) {
    const starsElement = document.getElementById(`ratingStars-${locationId}`);
    if (!starsElement) {
        return;
    }

    starsElement.innerHTML = Array.from({ length: 5 }, (_, index) => {
        const rating = index + 1;
        return `<button type="button" data-rating="${rating}" class="text-2xl leading-none text-slate-500 transition-transform duration-150 hover:scale-110 hover:text-amber-400 focus:outline-none" aria-label="Rate ${rating} star${rating === 1 ? '' : 's'}">☆</button>`;
    }).join('');

    starsElement.querySelectorAll('[data-rating]').forEach((button) => {
        button.addEventListener('click', async () => {
            await submitLocationRating(locationId, Number(button.dataset.rating));
        });
    });
}

async function loadLocationRatingSummaryFromBackend(locationId) {
    const sessionId = getRatingSessionId();

    if (!useConvexBackend) {
        ratingSummaryByLocation[locationId] = ratingSummaryByLocation[locationId] || {
            ratingCount: 0,
            ratingSum: 0,
            averageRating: 0,
            userRating: 0,
        };
        renderRatingControls(locationId);
        updateRatingSummaryElements(locationId);
        return;
    }

    try {
        const response = await fetch(convexUrl(`/api/ratings?locationId=${encodeURIComponent(locationId)}&sessionId=${encodeURIComponent(sessionId)}`));
        if (!response.ok) {
            return;
        }

        const payload = await response.json();
        ratingSummaryByLocation[locationId] = {
            ratingCount: typeof payload.ratingCount === 'number' ? payload.ratingCount : 0,
            ratingSum: typeof payload.ratingSum === 'number' ? payload.ratingSum : 0,
            averageRating: typeof payload.averageRating === 'number' ? payload.averageRating : 0,
            userRating: typeof payload.userRating === 'number' ? payload.userRating : 0,
        };

        renderRatingControls(locationId);
        updateRatingSummaryElements(locationId);
    } catch (error) {
        console.warn('Could not load rating summary from Convex backend.', error);
    }
}

async function submitLocationRating(locationId, rating) {
    const sessionId = getRatingSessionId();
    const nextRating = Math.min(5, Math.max(1, Math.round(Number(rating) || 0)));

    if (nextRating < 1) {
        return;
    }

    if (!useConvexBackend) {
        const summary = ratingSummaryByLocation[locationId] || {
            ratingCount: 0,
            ratingSum: 0,
            averageRating: 0,
            userRating: 0,
        };

        const existing = summary.userRating || 0;
        summary.ratingSum += nextRating - existing;
        summary.ratingCount += existing ? 0 : 1;
        summary.userRating = nextRating;
        summary.averageRating = summary.ratingCount > 0 ? summary.ratingSum / summary.ratingCount : 0;
        ratingSummaryByLocation[locationId] = summary;
        updateRatingSummaryElements(locationId);
        return;
    }

    try {
        const response = await fetch(convexUrl('/api/ratings'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ locationId, sessionId, rating: nextRating })
        });

        if (!response.ok) {
            throw new Error(`Convex ratings endpoint failed with status ${response.status}`);
        }

        const payload = await response.json();
        ratingSummaryByLocation[locationId] = {
            ratingCount: typeof payload.ratingCount === 'number' ? payload.ratingCount : 0,
            ratingSum: typeof payload.ratingSum === 'number' ? payload.ratingSum : 0,
            averageRating: typeof payload.averageRating === 'number' ? payload.averageRating : 0,
            userRating: typeof payload.userRating === 'number' ? payload.userRating : nextRating,
        };

        updateRatingSummaryElements(locationId);
    } catch (error) {
        console.warn('Falling back to local rating update because Convex is unavailable.', error);
        const summary = ratingSummaryByLocation[locationId] || {
            ratingCount: 0,
            ratingSum: 0,
            averageRating: 0,
            userRating: 0,
        };

        const existing = summary.userRating || 0;
        summary.ratingSum += nextRating - existing;
        summary.ratingCount += existing ? 0 : 1;
        summary.userRating = nextRating;
        summary.averageRating = summary.ratingCount > 0 ? summary.ratingSum / summary.ratingCount : 0;
        ratingSummaryByLocation[locationId] = summary;
        updateRatingSummaryElements(locationId);
    }
}

// ========================================
// OPENLAYERS INITIALIZATION & MARKERS
// ========================================

function styleClusterOrMarker(feature, resolution) {
    const size = feature.get('features').length;

    const selectedLocationId = activeSelectedLocationId;
    
    // If cluster has only one feature, style as individual marker
    if (size === 1) {
        const location = feature.get('features')[0].get('location');
        const isSelected = selectedLocationId === location.id;
        const cacheKey = `${location.id}|${Math.round(getMarkerDistance(location) * 100) / 100}|${isSelected ? 'selected' : 'normal'}|${Math.round(resolution * 1000)}`;
        const cachedStyle = markerStyleCache.get(cacheKey);

        if (cachedStyle) {
            return cachedStyle;
        }
        
        const style = new ol.style.Style({
            image: new ol.style.Icon({
                src: createMarkerLabelImage(location, isSelected),
                anchor: [0.5, 1],
                anchorXUnits: 'fraction',
                anchorYUnits: 'fraction',
                scale: 1,
                crossOrigin: 'anonymous'
            })
        });

        markerStyleCache.set(cacheKey, style);
        return style;
    }
    
    // Style clustered markers
    let clusterColor = '#6366F1';
    let clusterRadius = 20;
    
    if (size > 20) {
        clusterColor = '#DC2626';
        clusterRadius = 30;
    } else if (size > 10) {
        clusterColor = '#F97316';
        clusterRadius = 26;
    }
    
    return new ol.style.Style({
        image: new ol.style.Circle({
            radius: clusterRadius,
            fill: new ol.style.Fill({ color: clusterColor }),
            stroke: new ol.style.Stroke({ color: '#fff', width: 2 })
        }),
        text: new ol.style.Text({
            text: size.toString(),
            font: 'bold 13px Arial',
            fill: new ol.style.Fill({ color: '#fff' })
        })
    });
}

function handleMapClick(event) {
    let featureFound = false;
    map.forEachFeatureAtPixel(event.pixel, (feature) => {
        const cluster = feature.get('features');
        if (cluster && cluster.length === 1) {
            const location = cluster[0].get('location');
            if (location) {
                showInfoWindow(location, null);
                featureFound = true;
                return false; // Stop iteration
            }
        }
    });
    
    if (!featureFound) {
        hidePopup();
    }
}

function createFeatureFromLocation(location) {
    const coordinate = ol.proj.fromLonLat([location.lng, location.lat]);
    const feature = new ol.Feature({
        geometry: new ol.geom.Point(coordinate),
        location: location
    });
    feature.setId(location.id);
    return feature;
}

function updateVectorFeatures(locations) {
    // Build a new map of location IDs to features
    const newFeatureMap = new Map();
    const featuresToAdd = [];
    
    locations.forEach(location => {
        newFeatureMap.set(location.id, location);
        
        if (!locationFeatureMap.has(location.id)) {
            // New location: add feature
            const feature = createFeatureFromLocation(location);
            featuresToAdd.push(feature);
        } else {
            // Existing location: check if position changed
            const oldLocation = locationFeatureMap.get(location.id);
            if (oldLocation.lat !== location.lat || oldLocation.lng !== location.lng || 
                oldLocation.curatorChoice !== location.curatorChoice) {
                // Position or status changed: update feature
                const feature = createFeatureFromLocation(location);
                const existingFeature = vectorSource.getFeatureById(location.id);
                if (existingFeature) {
                    vectorSource.removeFeature(existingFeature);
                }
                featuresToAdd.push(feature);
            }
        }
    });
    
    // Remove features for locations no longer in the filtered list
    locationFeatureMap.forEach((location, id) => {
        if (!newFeatureMap.has(id)) {
            const feature = vectorSource.getFeatureById(id);
            if (feature) {
                vectorSource.removeFeature(feature);
            }
        }
    });
    
    // Add new/updated features
    vectorSource.addFeatures(featuresToAdd);
    
    // Update feature map
    locationFeatureMap.clear();
    newFeatureMap.forEach((location, id) => {
        locationFeatureMap.set(id, location);
    });

    markerStyleCache.clear();
    
    updateLocationsList(locations);
}

function initMap() {
    const rasterLayer = new ol.layer.Tile({
        source: new ol.source.XYZ({
            url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            attributions: '© OpenStreetMap contributors'
        })
    });

    // Initialize vector source for location markers
    vectorSource = new ol.source.Vector();
    
    // Create cluster source for automatic marker clustering
    clusterSource = new ol.source.Cluster({
        distance: 100,
        minDistance: 0,
        source: vectorSource
    });

    // Create vector layer with cluster styling
    vectorLayer = new ol.layer.Vector({
        source: clusterSource,
        style: styleClusterOrMarker
    });

    // User location layer
    userLocationSource = new ol.source.Vector();
    userLocationLayer = new ol.layer.Vector({
        source: userLocationSource,
        style: createUserLocationStyle()
    });

    rightInfoPanelElement = document.getElementById('rightInfoPanel');
    rightInfoPanelContentElement = document.getElementById('rightInfoPanelContent');
    rightInfoPanelCloseElement = document.getElementById('rightInfoPanelClose');

    map = new ol.Map({
        target: 'map',
        layers: [rasterLayer, vectorLayer, userLocationLayer],
        view: new ol.View({
            center: ol.proj.fromLonLat([currentMapCenter.lng, currentMapCenter.lat]),
            zoom: 13,
            minZoom: 3,
            maxZoom: 19
        })
    });

    rightInfoPanelCloseElement.addEventListener('click', (event) => {
        event.preventDefault();
        hidePopup();
    });

    map.on('moveend', () => {
        const center = ol.proj.toLonLat(map.getView().getCenter());
        currentMapCenter = { lat: center[1], lng: center[0] };
        if (vectorLayer) {
            markerStyleCache.clear();
            vectorLayer.changed();
        }
    });

    map.on('singleclick', (event) => {
        handleMapClick(event);
    });

    void loadMapMarkers();
}

async function loadMapMarkers() {
    const viewCenter = map.getView().getCenter();
    const centerLonLat = ol.proj.toLonLat(viewCenter);
    currentMapCenter = { lat: centerLonLat[1], lng: centerLonLat[0] };
    const remoteLocations = await loadServerLocations();
    allLocations = remoteLocations;

    applyFilters();
}

let locationRefreshTimer = null;



function showInfoWindow(location, markerElement) {
    activePopupLocationId = location.id;
    setSelectedLocation(location.id);
    closeMobileOverlays();

    ratingSummaryByLocation[location.id] = ratingSummaryByLocation[location.id] || {
        ratingCount: 0,
        ratingSum: 0,
        averageRating: 0,
        userRating: 0,
    };

    rightInfoPanelContentElement.innerHTML = `
        <div class="space-y-3">
            <div>
                <h3 class="text-base font-bold text-slate-50">${location.name}</h3>
            </div>

            ${location.address ? `
            <div class="rounded-xl border border-white/10 bg-slate-950/40 p-3">
                <p class="text-[11px] uppercase tracking-[0.16em] text-slate-400">Address</p>
                <p class="mt-1 text-sm text-slate-200">${location.address}</p>
            </div>
            ` : ''}

            ${getLocationPreviewImageUrl(location) ? `
            <div class="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/40">
                <img src="${getLocationPreviewImageUrl(location)}" alt="${location.name} preview" class="h-48 w-full object-cover" />
            </div>
            ` : ''}

            <div class="flex flex-wrap gap-2">
                ${getLocationActivities(location).map(activity => `<span class="location-activity">${getLocalizedActivityType(activity)}</span>`).join('')}
            </div>

            <div class="flex flex-wrap gap-2">
                ${location.vibes.map(vibe => `<span class="location-vibe">${getLocalizedVibe(vibe)}</span>`).join('')}
            </div>

            <div class="rounded-xl border border-white/10 bg-slate-950/40 p-3 space-y-2">
                <div class="flex items-center justify-between gap-3">
                    <div>
                        <p class="text-xs uppercase tracking-[0.18em] text-slate-400" data-rating-label>${t('rating')}</p>
                        <p id="userRating-${location.id}" class="text-sm font-semibold text-slate-100">${t('rating')}</p>
                    </div>
                    <div id="ratingStars-${location.id}" class="flex items-center gap-1"></div>
                </div>
                <p id="ratingSummary-${location.id}" class="text-[11px] text-slate-400"></p>
            </div>

            ${getLocationActionUrl(location) ? `
            <div class="flex gap-2 pt-1">
                <a href="${getLocationActionUrl(location)}" target="_blank" rel="noreferrer" class="button-primary flex-1 text-center text-xs no-underline">${t('viewViralVideo')}</a>
            </div>
            ` : ''}
        </div>
    `;
    rightInfoPanelElement.classList.add('visible');
    rightInfoPanelElement.setAttribute('aria-hidden', 'false');

    renderRatingControls(location.id);
    updateRatingSummaryElements(location.id);
    loadLocationRatingSummaryFromBackend(location.id);
}

function updateLocationsList(locations) {
    const mobileMode = isMobileViewport();
    const container = mobileMode
        ? document.getElementById('mobileLocationsContainer')
        : document.getElementById('locationsContainer');

    const desktopContainer = document.getElementById('locationsContainer');
    const mobileContainer = document.getElementById('mobileLocationsContainer');

    if (!container) {
        return;
    }

    container.innerHTML = '';

    if (desktopContainer && desktopContainer !== container) {
        desktopContainer.innerHTML = '';
    }

    if (mobileContainer && mobileContainer !== container) {
        mobileContainer.innerHTML = '';
    }

    locations.forEach(location => {
        const card = document.createElement('div');
        const isSelected = activeSelectedLocationId === location.id;
        card.className = mobileMode
            ? `location-card mobile-location-card${isSelected ? ' selected' : ''}`
            : `location-card${isSelected ? ' selected' : ''}`;
        
        const thumbnailUrl = location.thumbnailUrl || getLocationPreviewImageUrl(location);
        const thumbnailHtml = thumbnailUrl ? `
            <div style="width: 100%; height: 120px; overflow: hidden; border-radius: 8px; margin-bottom: 8px; background: rgba(0,0,0,0.2);">
                <img src="${thumbnailUrl}" alt="${location.name} thumbnail" style="width: 100%; height: 100%; object-fit: cover;" loading="lazy" decoding="async" />
            </div>
        ` : '';
        
        card.innerHTML = `
            ${thumbnailHtml}
            <div class="location-title">${location.name}</div>
            <div style="margin-bottom: 6px; display: flex; flex-wrap: wrap; gap: 4px;">
                ${getLocationActivities(location).map(activity => `<span class="location-activity">${getLocalizedActivityType(activity)}</span>`).join('')}
            </div>
            
            <div style="display: flex; flex-wrap: wrap; gap: 2px; margin-top: 6px;">
                ${location.vibes.map(vibe => `<span class="location-vibe">${getLocalizedVibe(vibe)}</span>`).join('')}
            </div>
        `;

        card.addEventListener('click', () => {
            if (mobileMode) {
                setSelectedLocation(location.id);
                updateLocationsList(getFilteredLocations());
            } else {
                setSelectedLocation(location.id);
                updateLocationsList(getFilteredLocations());
            }

            map.getView().animate({
                center: ol.proj.fromLonLat([location.lng, location.lat]),
                zoom: 15,
                duration: 450
            });
        });

        container.appendChild(card);
    });
}

// ========================================
// FILTER CONTROLS EVENT LISTENERS
// ========================================

// Proximity slider
document.getElementById('proximitySlider').addEventListener('input', (e) => {
    filterState.proximity = parseInt(e.target.value);
    document.getElementById('proximityValue').textContent = `${filterState.proximity} km`;
    applyFilters();
    updateFilterCount();
});

// Search input
document.getElementById('searchInput').addEventListener('input', (e) => {
    handleSearchInputChange(e.target.value);
});

// Mobile search input
document.getElementById('mobileSearchInput').addEventListener('input', (e) => {
    handleSearchInputChange(e.target.value);
});

// Subcategory toggles (all inputs with data-parent)
document.querySelectorAll('input[data-parent]').forEach(cb => {
    cb.addEventListener('change', (e) => {
        const val = e.target.value;
        if (e.target.checked) {
            filterState.venueTypes.push(val);
        } else {
            filterState.venueTypes = filterState.venueTypes.filter(v => v !== val);
        }
        applyFilters();
        updateFilterCount();
    });
});

// Category toggles (show/hide their subcategory lists)
document.querySelectorAll('input[data-category]').forEach(catCb => {
    catCb.addEventListener('change', (e) => {
        const subId = e.target.dataset.subid;
        const subDiv = subId ? document.getElementById(subId) : null;
        if (e.target.checked) {
            if (subDiv) subDiv.classList.remove('hidden');
        } else {
            if (subDiv) {
                subDiv.classList.add('hidden');
                subDiv.querySelectorAll('input[type="checkbox"]').forEach(s => {
                    s.checked = false;
                    filterState.venueTypes = filterState.venueTypes.filter(v => v !== s.value);
                });
            }
        }
        applyFilters();
        updateFilterCount();
    });
});

// Vibe chips
document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
        const vibe = chip.dataset.vibe;
        chip.classList.toggle('active');

        if (chip.classList.contains('active')) {
            filterState.vibes.push(vibe);
        } else {
            filterState.vibes = filterState.vibes.filter(v => v !== vibe);
        }

        applyFilters();
        updateFilterCount();
    });
});

// Social momentum controls removed

// Clear filters
document.getElementById('clearFilters').addEventListener('click', () => {
    filterState.proximity = 5;
    filterState.venueTypes = [];
    filterState.vibes = [];
    filterState.searchQuery = '';
    syncSearchInputs('');

    // Reset UI
    document.getElementById('proximitySlider').value = 5;
    document.getElementById('proximityValue').textContent = '5 km';
    document.getElementById('searchInput').value = '';
    filterState.venueTypes = [];
    // Uncheck all category and subcategory inputs and hide subcategory lists
    document.querySelectorAll('input[data-category], input[data-parent]').forEach(cb => cb.checked = false);
    document.querySelectorAll('[id$="Subcategories"]').forEach(div => div.classList.add('hidden'));
    document.querySelectorAll('.chip').forEach(chip => chip.classList.remove('active'));
    // segmented momentum controls removed

    applyFilters();
    updateFilterCount();
});

// ========================================
// INTERACTIVE FEATURES
// ========================================

function updateFilterCount() {
    let count = 0;
    if (filterState.searchQuery.trim()) count++;
    if (filterState.proximity < 5) count++;
    if (filterState.venueTypes.length > 0) {
        const uniqueTypes = [...new Set(filterState.venueTypes)];
        count += uniqueTypes.length;
    }
    if (filterState.vibes.length > 0) count += filterState.vibes.length;

    document.getElementById('filterCount').textContent = count;
}

function closeMobileOverlays() {
    setMobileOverlayState({ searchOpen: false, filtersOpen: false });
}

function setMobileOverlayState({ searchOpen = false, filtersOpen = false } = {}) {
    if (!isMobileViewport()) {
        searchOpen = false;
        filtersOpen = false;
    }

    document.body.classList.toggle('mobile-search-open', Boolean(searchOpen));
    document.body.classList.toggle('mobile-filters-open', Boolean(filtersOpen));

    const sidebarBackdrop = document.getElementById('sidebarBackdrop');
    if (sidebarBackdrop) {
        sidebarBackdrop.classList.toggle('visible', Boolean(searchOpen || filtersOpen));
    }
}

function isMobileViewport() {
    return window.matchMedia('(max-width: 768px)').matches;
}

function hidePopup() {
    activePopupLocationId = null;

    if (rightInfoPanelElement) {
        rightInfoPanelElement.classList.remove('visible');
        rightInfoPanelElement.setAttribute('aria-hidden', 'true');
    }

    setSelectedLocation(null);
    closeMobileOverlays();
}

function syncSearchInputs(value) {
    const normalizedValue = String(value || '');
    const desktopInput = document.getElementById('searchInput');
    const mobileInput = document.getElementById('mobileSearchInput');

    if (desktopInput && desktopInput.value !== normalizedValue) {
        desktopInput.value = normalizedValue;
    }

    if (mobileInput && mobileInput.value !== normalizedValue) {
        mobileInput.value = normalizedValue;
    }
}

function setupMobileSidebarSwipeClose() {
    const sidebar = document.querySelector('.app-sidebar');
    if (!sidebar) {
        return;
    }

    let startX = 0;
    let startY = 0;

    sidebar.addEventListener('touchstart', (event) => {
        const touch = event.touches && event.touches[0];
        if (!touch) {
            return;
        }

        startX = touch.clientX;
        startY = touch.clientY;
    }, { passive: true });

    sidebar.addEventListener('touchend', (event) => {
        const touch = event.changedTouches && event.changedTouches[0];
        if (!touch) {
            return;
        }

        const deltaX = touch.clientX - startX;
        const deltaY = Math.abs(touch.clientY - startY);

        if (deltaX < -60 && deltaY < 80) {
            closeMobileOverlays();
        }
    });
}

function applyFilters() {
    const filteredLocations = getFilteredLocations();
    updateLocationsList(filteredLocations);

    if (vectorSource) {
        vectorSource.clear();
        vectorSource.addFeatures(filteredLocations.map(createFeatureFromLocation));
    }

    if (activeSelectedLocationId && !filteredLocations.some(location => location.id === activeSelectedLocationId)) {
        activeSelectedLocationId = null;
        hidePopup();
    }
}

function handleSearchInputChange(value) {
    filterState.searchQuery = String(value || '');
    syncSearchInputs(filterState.searchQuery);
    applyFilters();
    updateFilterCount();
}

// ========================================
// INITIALIZATION
// ========================================

// Initialize map when page loads
window.addEventListener('load', () => {
    if (typeof ol === 'undefined') {
        console.error('OpenLayers failed to load. Check the CDN script tag.');
        return;
    }

    const languageSelect = document.getElementById('languageSelect');
    currentLanguage = languageSelect.value;
    languageSelect.addEventListener('change', (event) => {
        currentLanguage = event.target.value;
        applyLanguage();
    });

    applyLanguageToStaticText();

    initMap();

    mobileSearchInputElement = document.getElementById('mobileSearchInput');
    syncSearchInputs(filterState.searchQuery);

    const mobileSearchBtn = document.getElementById('mobileSearchBtn');
    const mobileFiltersBtn = document.getElementById('mobileFiltersBtn');
    const mobileSearchCloseBtn = document.getElementById('mobileSearchCloseBtn');
    const sidebarBackdrop = document.getElementById('sidebarBackdrop');

    setupMobileSidebarSwipeClose();

    if (mobileSearchBtn) {
        mobileSearchBtn.addEventListener('click', () => {
            const searchOpen = !document.body.classList.contains('mobile-search-open');
            setMobileOverlayState({ searchOpen, filtersOpen: false });
            if (searchOpen && mobileSearchInputElement) {
                mobileSearchInputElement.focus();
            }
        });
    }

    if (mobileFiltersBtn) {
        mobileFiltersBtn.addEventListener('click', () => {
            const filtersOpen = !document.body.classList.contains('mobile-filters-open');
            setMobileOverlayState({ searchOpen: false, filtersOpen });
        });
    }

    if (mobileSearchCloseBtn) {
        mobileSearchCloseBtn.addEventListener('click', () => {
            setMobileOverlayState({ searchOpen: false, filtersOpen: false });
        });
    }

    if (sidebarBackdrop) {
        sidebarBackdrop.addEventListener('click', () => {
            setMobileOverlayState({ searchOpen: false, filtersOpen: false });
        });
    }

    window.addEventListener('resize', () => {
        updateLocationsList(getFilteredLocations());
        if (!isMobileViewport()) {
            closeMobileOverlays();
        }
    });

    // Setup geolocation permission modal handlers
    setupPermissionModalHandlers();

    // Check and show permission modal if needed
    checkAndShowPermissionModal();

    // Use My Location button
    document.getElementById('useLocationBtn').addEventListener('click', initializeUserLocation);

    // Refresh locations button
    const refreshBtn = document.getElementById('refreshLocationsBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            refreshBtn.disabled = true;
            refreshBtn.textContent = '🔄 Loading...';
            try {
                await loadMapMarkers();
            } catch (error) {
                console.error('Refresh failed:', error);
            } finally {
                refreshBtn.disabled = false;
                refreshBtn.textContent = '🔄 Refresh';
            }
        });
    }

    if (!locationRefreshTimer) {
        locationRefreshTimer = window.setInterval(() => {
            if (map) {
                void loadMapMarkers();
            }
        }, 15000);
    }
});
