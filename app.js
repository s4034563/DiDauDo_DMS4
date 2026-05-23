// Community reviews are loaded via `/api/user-ratings` and displayed directly.
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
let hoverPreviewElement;
let hoverPreviewInnerElement;
let activeHoverLocationId = null;
let mobileSearchInputElement;
let mobileSidebarTouchStart = null;
let activePopupLocationId = null;
let activeSelectedLocationId = null;
let allLocations = [];
let currentMapCenter = { lat: 10.729229862661654, lng: 106.69573512876413 }; // Default: Ho Chi Minh City area
let ratingSessionId = null;
let currentLanguage = 'en';
let currentTheme = 'dark';
let desktopNavCollapsed = false;
const appConfig = window.VIBEMAP_CONFIG || {};
const locationFeatureMap = new Map(); // Map locationId to ol.Feature for diff updates
const markerStyleCache = new Map();
const markerLabelZoomThreshold = 15;
const markerClusterDistance = 20;
const hoursClosingSoonThresholdMinutes = 60;
const themeStorageKey = 'didaudo_theme';
const desktopNavStorageKey = 'didaudo_desktop_nav_collapsed';
const languageStorageKey = 'didaudo_language';

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
        profile: 'Profile',
        map: 'Map',
        friends: 'Friends',
        preferences: 'Preferences',
        account: 'Account',
        login: 'Login',
        logout: 'Logout',
        theme: 'Theme',
        darkMode: 'Dark mode',
        lightMode: 'Light mode',
        signInContinue: 'Sign in to continue',
        guest: 'Guest',
        proximity: 'Proximity',
        activityCategory: 'Activity Category',
        sportsRecreation: 'Sports & Recreation',
        sports: 'Sports',
        fitness: 'Fitness',
        musicNightlife: 'Music & Nightlife',
        music: 'Music',
        nightlife: 'Nightlife',
        musicBox: 'Music Box',
        homestay: 'Homestay',
        artCulture: 'Art & Culture',
        art: 'Art',
        photography: 'Museum',
        shoppingSocial: 'Shopping & Social',
        shopping: 'Shopping',
        markets: 'Markets',
        diningSocial: 'Dining & Social',
        dining: 'Dining',
        cafes: 'Cafes',
        outdoorNature: 'Outdoor & Nature',
        hiking: 'Hiking',
        parks: 'Parks',
        eventsFestivals: 'Events & Festivals',
        events: 'Events',
        festivals: 'Festivals',
        gamingEsports: 'Gaming & Esports',
        gaming: 'Gaming',
        arcades: 'Arcades',
        workspace: 'Workspace',
        theVibe: 'The Vibe',
        vibeCozy: 'Cozy',
        vibeIndustrial: 'Industrial',
        vibeLoudParty: 'Loud/Party',
        vibeMinimalist: 'Minimalist',
        vibeHiddenGem: 'Hidden Gem',
        vibeInstagrammable: 'Instagrammable',
        vibeQuiet: 'Quiet',
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
        overallRating: 'Overall rating',
        openNow: 'Open',
        closedNow: 'Closed',
        alwaysOpen: 'Always open',
        closingSoon: 'Closing soon',
        tags: 'Tags',
        
        search: 'Search Places',
        searchPlaceholder: 'Type a location name...',
        noResults: 'No locations found',
        permissionTitle: 'Share Your Location',
        permissionMessage: 'Allow access to your location to show nearby places more accurately.',
        permissionAllow: 'Allow',
        permissionDeny: 'Not Now',
        openGoogleMaps: 'Open in Google Maps',
        copyAddress: 'Copy address',
        copied: 'Copied!',
        friends: 'Friends',
        friendRequests: 'Friend Requests',
        noAcceptedFriends: 'No accepted friends yet.',
        favoriteLocations: 'Favorite Locations',
        ratingsTitle: 'Ratings',
        noFavorites: 'No favorite locations yet.',
        noRatings: 'No ratings yet.',
        accept: 'Accept',
        decline: 'Decline',
        enterEmail: 'Enter an email address.'
    },
    vi: {
        subtitle: 'Khám phá các địa điểm thú vị xung quanh bạn',
        profile: 'Hồ sơ',
        map: 'Bản đồ',
        friends: 'Bạn bè',
        preferences: 'Tùy chọn',
        account: 'Tài khoản',
        login: 'Đăng nhập',
        logout: 'Đăng xuất',
        theme: 'Giao diện',
        darkMode: 'Chế độ tối',
        lightMode: 'Chế độ sáng',
        signInContinue: 'Đăng nhập để tiếp tục',
        guest: 'Khách',
        proximity: 'Khoảng cách',
        activityCategory: 'Danh mục hoạt động',
        sportsRecreation: 'Thể thao & Giải trí',
        sports: 'Thể thao',
        fitness: 'Gym & Fitness',
        musicNightlife: 'Âm nhạc & Giải trí đêm',
        music: 'Âm nhạc',
        nightlife: 'Giải trí đêm',
        musicBox: 'Music Box',
        homestay: 'Homestay',
        artCulture: 'Nghệ thuật & Văn hóa',
        art: 'Nghệ thuật',
        photography: 'Bảo tàng',
        shoppingSocial: 'Mua sắm & Giao lưu',
        shopping: 'Mua sắm',
        markets: 'Chợ & Hội chợ',
        diningSocial: 'Ăn uống & Giao lưu',
        dining: 'Ăn uống',
        cafes: 'Quán cà phê',
        outdoorNature: 'Ngoại trời & Thiên nhiên',
        hiking: 'Đi bộ/Leo núi',
        parks: 'Công viên',
        eventsFestivals: 'Sự kiện & Lễ hội',
        events: 'Sự kiện',
        festivals: 'Lễ hội',
        gamingEsports: 'Game & Esports',
        gaming: 'Game',
        arcades: 'Máy chơi/Arcade',
        workspace: 'Không gian làm việc',
        theVibe: 'Phong cách',
        vibeCozy: 'Ấm cúng',
        vibeIndustrial: 'Công nghiệp',
        vibeLoudParty: 'Sôi động/Tiệc tùng',
        vibeMinimalist: 'Tối giản',
        vibeHiddenGem: 'Bí mật',
        vibeInstagrammable: 'Lên hình đẹp',
        vibeQuiet: 'Yên tĩnh',
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
        overallRating: 'Đánh giá chung',
        openNow: 'Mở',
        closedNow: 'Đóng',
        alwaysOpen: 'Luôn mở cửa',
        closingSoon: 'Sắp đóng cửa',
        tags: 'Thẻ',
        
        search: 'Tìm địa điểm',
        searchPlaceholder: 'Gõ tên địa điểm...',
        noResults: 'Không tìm thấy địa điểm',
        permissionTitle: 'Chia sẻ vị trí của bạn',
        permissionMessage: 'Cho phép truy cập vị trí để hiển thị các địa điểm gần đó chính xác hơn.',
        permissionAllow: 'Cho phép',
        permissionDeny: 'Không',
        openGoogleMaps: 'Mở trên Google Maps',
        copyAddress: 'Sao chép địa chỉ',
        copied: 'Đã sao chép!',
        friends: 'Bạn bè',
        friendRequests: 'Yêu cầu kết bạn',
        noAcceptedFriends: 'Chưa có bạn bè được chấp nhận.',
        favoriteLocations: 'Địa điểm yêu thích',
        ratingsTitle: 'Đánh giá',
        noFavorites: 'Chưa có địa điểm yêu thích.',
        noRatings: 'Chưa có đánh giá.',
        accept: 'Chấp nhận',
        decline: 'Từ chối',
        enterEmail: 'Nhập địa chỉ email.'
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

    // Preserve explicit visible vibe tags (like 'Quiet') by mapping known tag texts
    const visibleVibes = visibleTags.map(tag => {
        const t = String(tag || '').toLowerCase().trim();
        if (t.includes('cozy')) return 'Cozy';
        if (t.includes('industrial')) return 'Industrial';
        if (t.includes('party') || t.includes('night')) return 'Loud/Party';
        if (t.includes('minimal')) return 'Minimalist';
        if (t.includes('hidden') || t.includes('gem')) return 'Hidden Gem';
        if (t.includes('photo') || t.includes('instagram')) return 'Instagrammable';
        if (t === 'quiet' || t.includes('quiet')) return 'Quiet';
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
        tags,
        lat: Number(location.lat) || currentMapCenter.lat,
        lng: Number(location.lng) || currentMapCenter.lng,
        caption,
        seedVibes,
        mediaURL: location.mediaURL || location.videoURL || '',
        mediaType: location.mediaType || (location.mediaURL ? 'image' : 'video'),
        thumbnailUrl: location.thumbnailUrl || '',
        externalUrl: location.externalUrl || '',
        googleMapsUrl: location.googleMapsUrl || '',
        videoURL: location.externalUrl || location.videoURL || '',
        address: location.address || '',
        vibes: assignAIVibes(caption, [...seedVibes, ...visibleVibes]),
        detailedTags: location.detailedTags || [],
        hours: location.hours || undefined,
        alwaysOpen: Boolean(location.alwaysOpen),
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

function getGoogleMapsUrl(location) {
    const explicitUrl = String(location.googleMapsUrl || '').trim();
    if (explicitUrl) {
        return explicitUrl;
    }

    if (Number.isFinite(location.lat) && Number.isFinite(location.lng)) {
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${location.lat},${location.lng}`)}`;
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
    curatorChoice: false,
    searchQuery: ''
};

function t(key) {
    const dictionary = translations[currentLanguage] || translations.en;
    return dictionary[key] || translations.en[key] || key;
}

function getLocalizedActivityType(type) {
    const mapType = {
        'Sports': t('sports'),
        'Fitness': t('fitness')
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
    refreshSelectedMarkerStyles();
}

function refreshSelectedMarkerStyles() {
    if (!vectorLayer) {
        return;
    }

    markerStyleCache.clear();
    vectorLayer.changed();
}

function getLocalizedVibe(vibe) {
    const vibeMap = {
        Cozy: t('vibeCozy'),
        Industrial: t('vibeIndustrial'),
        'Loud/Party': t('vibeLoudParty'),
        Minimalist: t('vibeMinimalist'),
        'Hidden Gem': t('vibeHiddenGem'),
        Instagrammable: t('vibeInstagrammable')
    };
    return vibeMap[vibe] || vibe;
}

const locationPinCategoryDefinitions = [
    { name: 'Sports & Recreation', activities: ['Sports', 'Fitness'], color: '#3b82f6', icons: ['sports_soccer', 'fitness_center'] },
    { name: 'Music & Nightlife', activities: ['Music', 'Nightlife', 'Music Box'], color: '#a855f7', icons: ['music_note', 'sports_bar', 'radio'] },
    { name: 'Homestay', activities: ['Homestay'], color: '#f59e0b', icons: ['cottage', 'home'] },
    { name: 'Art & Culture', activities: ['Art', 'Photography'], color: '#ec4899', icons: ['palette', 'photo_camera'] },
    { name: 'Shopping & Social', activities: ['Shopping', 'Markets'], color: '#f97316', icons: ['shopping_bag', 'storefront'] },
    { name: 'Dining & Social', activities: ['Dining', 'Cafes'], color: '#ef4444', icons: ['restaurant', 'local_cafe'] },
    { name: 'Outdoor & Nature', activities: ['Hiking', 'Parks'], color: '#22c55e', icons: ['park', 'hiking'] },
    { name: 'Events & Festivals', activities: ['Events', 'Festivals'], color: '#eab308', icons: ['event', 'festival'] },
    { name: 'Gaming & Esports', activities: ['Gaming', 'Arcades'], color: '#14b8a6', icons: ['sports_esports', 'stadia_controller'] },
    { name: 'Workspace', activities: ['Workspace'], color: '#6366f1', icons: ['computer'] },
];

const locationActivityIconMap = {
    Sports: ['sports_soccer'],
    Fitness: ['fitness_center'],
    Music: ['music_note'],
    Nightlife: ['sports_bar'],
    'Music Box': ['radio'],
    Art: ['palette'],
    Photography: ['photo_camera'],
    Shopping: ['shopping_bag'],
    Markets: ['storefront'],
    Dining: ['restaurant'],
    Cafes: ['local_cafe'],
    Hiking: ['hiking'],
    Parks: ['park'],
    Events: ['event'],
    Festivals: ['festival'],
    Gaming: ['sports_esports'],
    Arcades: ['stadia_controller'],
    Homestay: ['cottage'],
    Workspace: ['computer'],
};

function stableHash(text) {
    const value = String(text || '');
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
        hash = ((hash << 5) - hash) + value.charCodeAt(index);
        hash |= 0;
    }
    return Math.abs(hash);
}

function getLocationActivitiesForPins(location) {
    return getLocationActivities(location)
        .map(activity => String(activity || '').trim())
        .filter(Boolean);
}

function getLocationPinCategory(location) {
    const activities = getLocationActivitiesForPins(location);
    for (const definition of locationPinCategoryDefinitions) {
        if (activities.some(activity => definition.activities.includes(activity))) {
            return definition;
        }
    }

    return locationPinCategoryDefinitions[0];
}

function getLocationPinIcon(location) {
    const activities = getLocationActivitiesForPins(location);
    const icons = activities.flatMap(activity => locationActivityIconMap[activity] || []);
    const uniqueIcons = [...new Set(icons)];

    if (uniqueIcons.length > 0) {
        return uniqueIcons[stableHash(location.id) % uniqueIcons.length];
    }

    const category = getLocationPinCategory(location);
    return category.icons[stableHash(location.id) % category.icons.length] || 'place';
}

function getFeatureLocation(feature) {
    const cluster = feature && typeof feature.get === 'function' ? feature.get('features') : null;
    if (cluster && cluster.length > 0) {
        return cluster[0].get('location') || null;
    }

    return feature && typeof feature.get === 'function' ? feature.get('location') || null : null;
}

function getFeatureClusterSize(feature) {
    const cluster = feature && typeof feature.get === 'function' ? feature.get('features') : null;
    return cluster && cluster.length > 0 ? cluster.length : 1;
}

function getLocationLabelSide(location, displayName) {
    if (!map || typeof map.getSize !== 'function') {
        return 'right';
    }

    const size = map.getSize();
    if (!size || size[0] === 0) {
        return 'right';
    }

    const coordinate = ol.proj.fromLonLat([location.lng, location.lat]);
    const pixel = map.getPixelFromCoordinate(coordinate);
    if (!pixel) {
        return 'right';
    }

    const labelWidth = Math.max(110, Math.min(200, Math.round((String(displayName || '').length * 7.4) + 34)));
    const leftSpace = pixel[0] - 24;
    const rightSpace = size[0] - pixel[0] - 24;
    const overlapThreshold = 26;
    const features = vectorSource ? vectorSource.getFeatures() : [];

    const hasCollisionOnSide = (side) => {
        if (!features.length) {
            return false;
        }

        return features.some((feature) => {
            const otherLocation = feature.get('location');
            if (!otherLocation || otherLocation.id === location.id) {
                return false;
            }

            const otherPixel = map.getPixelFromCoordinate(feature.getGeometry().getCoordinates());
            if (!otherPixel) {
                return false;
            }

            const verticalDistance = Math.abs(otherPixel[1] - pixel[1]);
            if (verticalDistance > overlapThreshold) {
                return false;
            }

            const horizontalDistance = side === 'right'
                ? otherPixel[0] - pixel[0]
                : pixel[0] - otherPixel[0];

            return horizontalDistance > 0 && horizontalDistance < (labelWidth + 34);
        });
    };

    if (rightSpace >= labelWidth + 24 && !hasCollisionOnSide('right')) {
        return 'right';
    }

    if (leftSpace >= labelWidth + 24 && !hasCollisionOnSide('left')) {
        return 'left';
    }

    return rightSpace >= leftSpace ? 'right' : 'left';
}

function createPinStyles(location, isSelected, resolution) {
    const category = getLocationPinCategory(location);
    const isCuratorChoice = Boolean(location?.curatorChoice);
    const label = truncateLabel(location.name, 24);
    const labelSide = getLocationLabelSide(location, label);
    const iconName = getLocationPinIcon(location);
    const zoom = map && map.getView && typeof map.getView().getZoomForResolution === 'function'
        ? map.getView().getZoomForResolution(resolution)
        : (map && map.getView && typeof map.getView().getZoom === 'function' ? map.getView().getZoom() : 0);
    const shouldShowLabel = zoom >= markerLabelZoomThreshold;
    const radius = isSelected ? 16 : 14;
    const strokeWidth = isSelected ? 3 : 2;
    const labelOffset = labelSide === 'right' ? 28 : -28;
    const labelAlign = labelSide === 'right' ? 'left' : 'right';
    const labelPadding = [6, 10, 6, 10];
    const goldFill = '#fbbf24';
    const iconFill = isCuratorChoice ? '#0f172a' : '#ffffff';
    const strokeColor = isCuratorChoice
        ? (isSelected ? '#fef3c7' : '#7c5c00')
        : (isSelected ? '#ffffff' : 'rgba(255,255,255,0.9)');
    const labelFill = isCuratorChoice ? goldFill : category.color;

    const pinStyle = new ol.style.Style({
        image: new ol.style.Circle({
            radius,
            fill: new ol.style.Fill({ color: isCuratorChoice ? goldFill : category.color }),
            stroke: new ol.style.Stroke({ color: strokeColor, width: strokeWidth })
        })
    });

    const iconStyle = new ol.style.Style({
        text: new ol.style.Text({
            text: iconName,
            font: '400 17px "Material Symbols Rounded"',
            fill: new ol.style.Fill({ color: iconFill }),
            textAlign: 'center',
            textBaseline: 'middle',
            offsetY: 0,
            overflow: true,
        })
    });

    const styles = [pinStyle, iconStyle];

    if (shouldShowLabel) {
        styles.push(new ol.style.Style({
            text: new ol.style.Text({
                text: label,
                font: '600 13px "Segoe UI", sans-serif',
                fill: new ol.style.Fill({ color: labelFill }),
                stroke: new ol.style.Stroke({ color: '#ffffff', width: 3 }),
                padding: labelPadding,
                offsetX: labelOffset,
                textAlign: labelAlign,
                textBaseline: 'middle',
                placement: 'point',
                overflow: true,
            })
        }));
    }

    return styles;
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

    // placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const key = element.getAttribute('data-i18n-placeholder');
        element.placeholder = t(key);
    });
}

function applyLanguage() {
    applyLanguageToStaticText();

    document.getElementById('proximityValue').textContent = `${filterState.proximity} km`;
    updateLocationsList(getFilteredLocations());
    updateAuthUI();
    updateLanguageToggleLabel();
    updateThemeToggleLabel();

    // Update nav tooltips to match language
    try { setupNavTooltips(); } catch (e) { /* ignore */ }

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

function getStoredTheme() {
    const storedTheme = localStorage.getItem(themeStorageKey);
    return storedTheme === 'light' ? 'light' : 'dark';
}

function updateThemeToggleLabel() {
    const themeToggleText = document.getElementById('themeToggleText');
    const themeToggleButton = document.getElementById('themeToggleBtn');

    if (themeToggleText) {
        themeToggleText.textContent = currentTheme === 'light' ? t('darkMode') : t('lightMode');
    }

    if (themeToggleButton) {
        themeToggleButton.setAttribute('data-icon', currentTheme === 'light' ? 'dark_mode' : 'light_mode');
    }
}

function getStoredLanguage() {
    const storedLanguage = localStorage.getItem(languageStorageKey);
    return storedLanguage === 'vi' ? 'vi' : 'en';
}

function updateLanguageToggleLabel() {
    const languageToggleText = document.getElementById('desktopLanguageToggleText');

    if (languageToggleText) {
        languageToggleText.textContent = currentLanguage === 'vi' ? 'VN' : 'EN';
    }
}

function setupNavTooltips() {
    const mapBtn = document.getElementById('mapNavBtn');
    const friendsBtn = document.getElementById('friendsNavBtn');
    const langBtn = document.getElementById('desktopLanguageToggleBtn');
    const themeBtn = document.getElementById('themeToggleBtn');
    const loginBtn = document.getElementById('desktopLoginBtn');
    const logoutBtn = document.getElementById('desktopLogoutBtn');
    const profileBtn = document.getElementById('desktopProfileButton');
    const navToggle = document.getElementById('desktopNavToggle');

    if (mapBtn) mapBtn.title = t('map');
    if (friendsBtn) friendsBtn.title = t('friends');
    if (langBtn) langBtn.title = t('preferences');
    if (themeBtn) themeBtn.title = t('theme');
    if (loginBtn) loginBtn.title = t('login');
    if (logoutBtn) logoutBtn.title = t('logout');
    if (profileBtn) profileBtn.title = t('profile');
    if (navToggle) navToggle.title = document.body.classList.contains('desktop-nav-collapsed') ? 'Expand navigation' : 'Collapse navigation';
}

function applyLanguageChoice(language) {
    currentLanguage = language === 'vi' ? 'vi' : 'en';
    localStorage.setItem(languageStorageKey, currentLanguage);
    applyLanguage();
}

function toggleLanguage() {
    applyLanguageChoice(currentLanguage === 'vi' ? 'en' : 'vi');
}

function applyTheme(theme) {
    currentTheme = theme === 'light' ? 'light' : 'dark';
    document.body.classList.toggle('theme-light', currentTheme === 'light');
    document.documentElement.dataset.theme = currentTheme;
    localStorage.setItem(themeStorageKey, currentTheme);
    updateThemeToggleLabel();
}

function toggleTheme() {
    applyTheme(currentTheme === 'light' ? 'dark' : 'light');
}

function getStoredDesktopNavState() {
    return localStorage.getItem(desktopNavStorageKey) === 'true';
}

function applyDesktopNavState(collapsed) {
    desktopNavCollapsed = Boolean(collapsed);
    document.body.classList.toggle('desktop-nav-collapsed', desktopNavCollapsed);

    const navToggle = document.getElementById('desktopNavToggle');
    if (navToggle) {
        navToggle.textContent = desktopNavCollapsed ? '›' : '‹';
        navToggle.setAttribute('aria-label', desktopNavCollapsed ? 'Expand navigation' : 'Collapse navigation');
    }

    localStorage.setItem(desktopNavStorageKey, String(desktopNavCollapsed));

    // Refresh tooltips after state change
    try { setupNavTooltips(); } catch (e) { /* ignore */ }
}

function toggleDesktopNav() {
    applyDesktopNavState(!desktopNavCollapsed);
}

function setDesktopNavActive(section) {
    const mapNavBtn = document.getElementById('mapNavBtn');
    const friendsNavBtn = document.getElementById('friendsNavBtn');

    if (mapNavBtn) {
        mapNavBtn.classList.toggle('active', section === 'map');
    }

    if (friendsNavBtn) {
        friendsNavBtn.classList.toggle('active', section === 'friends');
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

    // Curator's choice filter
    if (filterState.curatorChoice) {
        filtered = filtered.filter(loc => loc.curatorChoice);
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

        if (!subContainer) {
            selectedActivities.push(categoryCheckbox.value);
            return;
        }

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
    const curatorGold = '#fbbf24';
    const borderColor = location.curatorChoice ? curatorGold : (isSelected ? '#22c55e' : '#e2e8f0');
    const accentColor = location.curatorChoice ? curatorGold : (isSelected ? '#16a34a' : '#c084fc');
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

// Removed aggregate rating helpers; community reviews are shown via `loadExistingUserRatings`.

// Per-user rating controls removed: hover and info panel now show community ratings only.

// Aggregate/session-based ratings removed. Use community reviews endpoint instead.

// submitLocationRating removed — community reviews use `/api/user-ratings` (see below).

// ========================================
// OPENLAYERS INITIALIZATION & MARKERS
// ========================================

function styleClusterOrMarker(feature, resolution) {
    const size = getFeatureClusterSize(feature);

    const selectedLocationId = activeSelectedLocationId;
    
    // If cluster has only one feature, style as individual marker
    if (size === 1) {
        const location = getFeatureLocation(feature);
        const isSelected = selectedLocationId === location.id;
        const cacheKey = `${location.id}|${isSelected ? 'selected' : 'normal'}|${Math.round(resolution * 1000)}|${getLocationPinIcon(location)}`;
        const cachedStyle = markerStyleCache.get(cacheKey);

        if (cachedStyle) {
            return cachedStyle;
        }

        const style = createPinStyles(location, isSelected, resolution);

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
        const location = getFeatureLocation(feature);
        if (location) {
            if (location) {
                hideHoverPreview();
                showInfoWindow(location, null);
                featureFound = true;
                return false; // Stop iteration
            }
        }
    });
    
    if (!featureFound) {
        hideHoverPreview();
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
            url: 'https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
            attributions: '© OpenStreetMap contributors, © CARTO'
        })
    });

    // Initialize vector source for location markers
    vectorSource = new ol.source.Vector();
    clusterSource = new ol.source.Cluster({
        distance: markerClusterDistance,
        source: vectorSource,
    });
    
    // Create vector layer with direct per-location styling
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
    hoverPreviewElement = document.getElementById('hoverPreview');
    hoverPreviewInnerElement = document.getElementById('hoverPreviewInner');

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
        refreshSelectedMarkerStyles();
        hideHoverPreview();
    });

    map.on('singleclick', (event) => {
        handleMapClick(event);
    });

    map.on('pointermove', (event) => {
        if (event.dragging) {
            hideHoverPreview();
            return;
        }

        let hoveredLocation = null;
        let hoveredPixel = null;

        map.forEachFeatureAtPixel(event.pixel, (feature) => {
            const location = getFeatureLocation(feature);
            if (location) {
                hoveredLocation = location;
                hoveredPixel = event.pixel;
                return true;
            }
            return false;
        });

        if (hoveredLocation) {
            showHoverPreview(hoveredLocation, hoveredPixel);
        } else {
            hideHoverPreview();
        }
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
    openLocationFromUrlIfPresent();
}

let locationRefreshTimer = null;



function showInfoWindow(location, markerElement) {
    activePopupLocationId = location.id;
    activeSelectedLocationId = location.id;
    setSelectedLocation(location.id);
    closeMobileOverlays();

    // Prepare info window for location

    const hoursStatus = getHoursStatusData(location);
    const hoursDisplay = hoursStatus.summaryText || '';
    // Build detailed weekly hours HTML and interactive summary
    const detailedTagsHtml = location.detailedTags && location.detailedTags.length > 0 ? `
        <div class="theme-surface-card rounded-xl border border-white/10 bg-slate-950/40 p-3">
            <p class="theme-surface-subtitle text-[11px] uppercase tracking-[0.16em] text-slate-400 mb-2">Details</p>
            <div class="flex flex-wrap gap-2">
                ${location.detailedTags.map(tag => {
                    const color = detailedTagColors[location.type] || '#c084fc';
                    return `<span style="background: ${color}20; border: 1px solid ${color}; color: ${color}; padding: 4px 8px; border-radius: 6px; font-size: 12px; white-space: nowrap;">${tag}</span>`;
                }).join('')}
            </div>
        </div>
    ` : '';

    // Weekly hours panel (click to expand)
    let hoursHtml = '';
    if (location.alwaysOpen || (location.hours && hasConfiguredHours(location.hours))) {
        const weeklyHtml = (() => {
            if (location.alwaysOpen) {
                return `
                    <div style="display:flex;flex-direction:column;gap:6px;">
                        <div style="display:flex;justify-content:space-between;font-size:13px;color:#cbd5e1"><span>${t('alwaysOpen')}</span><span>24/7</span></div>
                    </div>
                `;
            }
            const days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
            const dayLabels = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
            return `
                <div style="display:flex;flex-direction:column;gap:6px;">
                    ${days.map((day, idx) => {
                        const h = location.hours[day];
                        const line = h && h.open && h.close ? `${formatTimeTo12Hour(h.open)} - ${formatTimeTo12Hour(h.close)}` : 'Closed';
                        return `<div style="display:flex;justify-content:space-between;font-size:13px;color:#cbd5e1"><span>${dayLabels[idx]}</span><span>${line}</span></div>`;
                    }).join('')}
                </div>
            `;
        })();

        const nextOpening = hoursStatus.nextOpening
            ? `<div style="font-size:12px;color:#94a3b8;margin-top:6px">${hoursStatus.nextOpening}</div>`
            : '';

        hoursHtml = `
            <div class="theme-surface-card rounded-xl border border-white/10 bg-slate-950/40 p-3" id="hoursBlock-${location.id}">
                <div id="hoursSummary-${location.id}" style="cursor:pointer;display:flex;justify-content:space-between;align-items:center;">
                    <div>
                        <p class="text-[11px] uppercase tracking-[0.16em] text-slate-400">Hours</p>
                        <p class="mt-1 text-sm text-slate-200">${hoursDisplay}</p>
                        ${nextOpening}
                    </div>
                    <div id="hoursChevron-${location.id}" style="transform:rotate(0deg);transition:transform 160ms;">▶</div>
                </div>
                <div id="hoursFull-${location.id}" style="display:none;margin-top:8px;">${weeklyHtml}</div>
            </div>
        `;
    }

    const ratingsSection = `
        <div class="theme-surface-card rounded-xl border border-white/10 bg-slate-950/40 p-3 space-y-3">
            <div class="space-y-2">
                <p class="theme-surface-subtitle text-[11px] uppercase tracking-[0.16em] text-slate-400">Community Ratings</p>
                <div id="ratingsSummary-${location.id}" class="theme-surface-body text-sm text-slate-300">
                    <p style="font-size: 13px; color: #cbd5e1;">Loading ratings...</p>
                </div>
            </div>

            <div class="space-y-2">
                <p class="theme-surface-subtitle text-[11px] uppercase tracking-[0.16em] text-slate-400">Recent Reviews</p>
                <div id="existingRatings-${location.id}" class="theme-surface-body text-sm text-slate-300"></div>
            </div>
            ${currentUser ? `
            <div style="height: 1px; background: linear-gradient(to right, transparent, rgba(255,255,255,0.1), transparent);"></div>
            <div class="space-y-2">
                <p class="theme-surface-subtitle text-[11px] uppercase tracking-[0.16em] text-slate-400">Your Rating</p>
                <div id="userRatingStars-${location.id}" class="flex gap-2"></div>
                <textarea id="userComment-${location.id}" class="theme-surface-card w-full px-2 py-2 rounded bg-slate-800 text-white text-xs placeholder-slate-500 border border-slate-600 focus:outline-none focus:border-neon-purple" placeholder="Share your experience..." rows="2"></textarea>
                <button onclick="submitUserRatingHandler('${location.id}')" class="theme-surface-action w-full py-2 bg-neon-purple text-slate-900 text-xs font-semibold rounded hover:bg-purple-600 transition">Submit Rating</button>
            </div>
            ` : ``}
        </div>
    `;

    const favoriteButtonHtml = currentUser
        ? `<button id="favoriteBtn-${location.id}" type="button" class="favorite-btn" aria-pressed="false" title="Save to favorites" aria-label="Save to favorites"><span class="material-symbols-rounded ui-icon ui-icon-large">favorite_border</span></button>`
        : `<button id="favoriteBtn-${location.id}" type="button" class="favorite-btn text-slate-500" title="Sign in to save favorites" aria-label="Sign in to save favorites"><span class="material-symbols-rounded ui-icon ui-icon-large">favorite_border</span></button>`;

    rightInfoPanelContentElement.innerHTML = `
        <div class="space-y-3">
            <div>
                <div class="flex items-center justify-between gap-3">
                    <h3 class="theme-surface-title text-base font-bold">${location.name}</h3>
                    ${favoriteButtonHtml}
                </div>
            </div>

            ${location.address ? `
            <div class="theme-surface-card rounded-xl border border-white/10 bg-slate-950/40 p-3" id="addressBlock-${location.id}">
                <p class="theme-surface-subtitle text-[11px] uppercase tracking-[0.16em] text-slate-400">Address</p>
                <div class="flex items-start justify-between gap-3">
                    <p class="theme-surface-title mt-1 text-sm text-slate-200" id="addressText-${location.id}">${location.address}</p>
                    <button id="copyAddressBtn-${location.id}" type="button" class="ml-3 p-2 rounded hover:bg-white/5" aria-label="${t('copyAddress')}" title="${t('copyAddress')}">
                        <span class="material-symbols-rounded ui-icon">content_copy</span>
                    </button>
                </div>
                <div id="copyAddressFeedback-${location.id}" class="text-xs text-slate-400 mt-1" style="display:none">${t('copied')}</div>
            </div>
            ` : ''}

            ${hoursHtml}

            ${getLocationPreviewImageUrl(location) ? `
            <div class="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/40">
                <img src="${getLocationPreviewImageUrl(location)}" alt="${location.name} preview" class="h-48 w-full object-cover" />
            </div>
            ` : ''}

            <div class="flex flex-wrap gap-2">
                ${getLocationActivities(location).map(activity => `<span class="theme-surface-chip location-activity">${getLocalizedActivityType(activity)}</span>`).join('')}
            </div>

            <div class="flex flex-wrap gap-2">
                ${location.vibes.map(vibe => `<span class="theme-surface-chip location-vibe">${getLocalizedVibe(vibe)}</span>`).join('')}
            </div>

            ${detailedTagsHtml}

            ${location.curatorChoice ? `
            <div class="theme-surface-card rounded-xl border border-yellow-500/40 bg-yellow-950/20 p-3 flex items-center gap-2">
                <span class="material-symbols-rounded ui-icon ui-icon-filled ui-icon-small text-yellow-300" aria-hidden="true">star</span>
                <p class="theme-surface-title text-sm font-semibold text-yellow-200">Curator's Choice</p>
            </div>
            ` : ''}

            

            ${ratingsSection}

            ${(getLocationActionUrl(location) || getGoogleMapsUrl(location)) ? `
            <div class="flex gap-2 pt-1">
                ${getLocationActionUrl(location) ? `<a href="${getLocationActionUrl(location)}" target="_blank" rel="noreferrer" class="button-primary flex-1 text-center text-xs no-underline">${t('viewViralVideo')}</a>` : ''}
                ${getGoogleMapsUrl(location) ? `<a href="${getGoogleMapsUrl(location)}" target="_blank" rel="noreferrer" class="button-primary text-center text-xs no-underline" style="width:auto;flex:0 0 auto;padding-left:12px;padding-right:12px;" title="${t('openGoogleMaps')}" aria-label="${t('openGoogleMaps')}">${t('openGoogleMaps')}</a>` : ''}
            </div>
            ` : ''}
        </div>
    `;
    rightInfoPanelElement.classList.add('visible');
    rightInfoPanelElement.setAttribute('aria-hidden', 'false');

    const favoriteBtn = document.getElementById(`favoriteBtn-${location.id}`);
    if (favoriteBtn) {
        if (currentUser) {
            void checkIsFavorite(location.id).then((isFavorite) => {
                const icon = favoriteBtn.querySelector('.material-symbols-rounded');
                favoriteBtn.setAttribute('aria-pressed', isFavorite ? 'true' : 'false');
                favoriteBtn.classList.toggle('favorited', isFavorite);
                if (icon) {
                    icon.textContent = isFavorite ? 'favorite' : 'favorite_border';
                    icon.classList.toggle('ui-icon-filled', isFavorite);
                }
            });
            favoriteBtn.addEventListener('click', async () => {
                await toggleFavorite(location.id);
                // refresh UI state after toggle
                const isFav = await checkIsFavorite(location.id);
                const icon = favoriteBtn.querySelector('.material-symbols-rounded');
                favoriteBtn.setAttribute('aria-pressed', isFav ? 'true' : 'false');
                favoriteBtn.classList.toggle('favorited', isFav);
                if (icon) {
                    icon.textContent = isFav ? 'favorite' : 'favorite_border';
                    icon.classList.toggle('ui-icon-filled', isFav);
                }
            });
        } else {
            favoriteBtn.addEventListener('click', () => {
                openLoginModal('You need to be signed in to save favorites.');
            });
        }
    }

    // Wire up hours toggle
        // Wire up copy-to-clipboard for address
        const copyBtn = document.getElementById(`copyAddressBtn-${location.id}`);
        if (copyBtn) {
            copyBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const text = location.address || '';
                if (!text) return;
                try {
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        await navigator.clipboard.writeText(text);
                    } else {
                        const ta = document.createElement('textarea');
                        ta.value = text;
                        ta.style.position = 'fixed';
                        ta.style.left = '-9999px';
                        document.body.appendChild(ta);
                        ta.select();
                        document.execCommand('copy');
                        document.body.removeChild(ta);
                    }
                    const feedback = document.getElementById(`copyAddressFeedback-${location.id}`);
                    if (feedback) {
                        feedback.textContent = t('copied');
                        feedback.style.display = 'block';
                        setTimeout(() => { feedback.style.display = 'none'; }, 1600);
                    }
                } catch (err) {
                    console.warn('Copy failed', err);
                }
            });
        }
    if (location.hours && hasConfiguredHours(location.hours)) {
        console.log('🕐 Setting up hours toggle for location:', location.id);
        const summary = document.getElementById(`hoursSummary-${location.id}`);
        const full = document.getElementById(`hoursFull-${location.id}`);
        const chevron = document.getElementById(`hoursChevron-${location.id}`);
        console.log('  summary:', summary ? '✓' : '✗', 'full:', full ? '✓' : '✗', 'chevron:', chevron ? '✓' : '✗');
        if (summary && full && chevron) {
            summary.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log('🕐 Hours toggle clicked!');
                const isHidden = full.style.display === 'none' || full.style.display === '';
                full.style.display = isHidden ? 'block' : 'none';
                chevron.style.transform = isHidden ? 'rotate(90deg)' : 'rotate(0deg)';
                console.log('🕐 Hours now:', isHidden ? 'EXPANDED' : 'COLLAPSED');
            });
        } else {
            console.warn('🕐 Could not find all hours elements:', {
                summaryId: `hoursSummary-${location.id}`,
                fullId: `hoursFull-${location.id}`,
                chevronId: `hoursChevron-${location.id}`
            });
        }
    }

    // Render star rating picker for logged-in users and load community reviews
    if (currentUser) {
        const starContainer = document.getElementById(`userRatingStars-${location.id}`);
        if (starContainer) {
            starContainer.innerHTML = '';
            for (let i = 1; i <= 5; i++) {
                const star = document.createElement('button');
                star.className = 'star';
                star.dataset.rating = i;
                star.textContent = '⭐';
                star.style.fontSize = '20px';
                star.style.border = 'none';
                star.style.background = 'transparent';
                star.style.cursor = 'pointer';
                star.style.opacity = '0.4';
                star.style.transition = 'opacity 0.2s';
                star.addEventListener('click', (e) => {
                    e.preventDefault();
                    document.querySelectorAll(`#userRatingStars-${location.id} .star`).forEach((s, idx) => {
                        s.classList.toggle('active', idx < i);
                        s.style.opacity = idx < i ? '1' : '0.4';
                    });
                });
                starContainer.appendChild(star);
            }
        }
    }

    // Load community reviews and summary
    void loadExistingUserRatings(location.id);
}

function openLocationFromUrlIfPresent() {
    const url = new URL(window.location.href);
    const locationId = url.searchParams.get('locationId');
    if (!locationId) {
        return;
    }

    const location = allLocations.find(entry => entry.id === locationId);
    if (!location) {
        return;
    }

    if (map && location.lat != null && location.lng != null) {
        map.getView().animate({
            center: ol.proj.fromLonLat([location.lng, location.lat]),
            zoom: 15,
            duration: 450,
        });
    }

    showInfoWindow(location);
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
        const thumbnailHeight = mobileMode ? 96 : 120;
        card.className = mobileMode
            ? `location-card mobile-location-card${isSelected ? ' selected' : ''}`
            : `location-card carousel-location-card${isSelected ? ' selected' : ''}`;
        
        const thumbnailUrl = location.thumbnailUrl || getLocationPreviewImageUrl(location);
        const thumbnailHtml = thumbnailUrl ? `
            <div style="width: 100%; height: ${thumbnailHeight}px; overflow: hidden; border-radius: 8px; margin-bottom: 8px; background: rgba(0,0,0,0.2);">
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

function setupCarouselDragScroll(container) {
    if (!container) {
        return;
    }

    let pointerDown = false;
    let pointerId = null;
    let startX = 0;
    let startScrollLeft = 0;
    let isDragging = false;

    container.addEventListener('pointerdown', (event) => {
        if (event.button !== 0) {
            return;
        }

        pointerDown = true;
        pointerId = event.pointerId;
        startX = event.clientX;
        startScrollLeft = container.scrollLeft;
        isDragging = false;
        container.classList.add('is-dragging');
        container.setPointerCapture(pointerId);
    });

    container.addEventListener('pointermove', (event) => {
        if (!pointerDown || pointerId !== event.pointerId) {
            return;
        }

        const deltaX = event.clientX - startX;
        if (Math.abs(deltaX) > 4) {
            isDragging = true;
        }

        if (!isDragging) {
            return;
        }

        event.preventDefault();
        container.scrollLeft = startScrollLeft - deltaX;
    });

    const finishDrag = (event) => {
        if (!pointerDown || pointerId !== event.pointerId) {
            return;
        }

        pointerDown = false;
        pointerId = null;
        container.classList.remove('is-dragging');

        window.setTimeout(() => {
            isDragging = false;
        }, 0);

        if (container.hasPointerCapture(event.pointerId)) {
            container.releasePointerCapture(event.pointerId);
        }
    };

    container.addEventListener('pointerup', finishDrag);
    container.addEventListener('pointercancel', finishDrag);
    container.addEventListener('pointerleave', finishDrag);

    container.addEventListener('click', (event) => {
        if (!isDragging) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
    }, true);
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

// Curator's choice filter
const curatorChoiceCheckbox = document.getElementById('curatorChoiceCheckbox');
if (curatorChoiceCheckbox) {
    curatorChoiceCheckbox.addEventListener('change', () => {
        filterState.curatorChoice = curatorChoiceCheckbox.checked;
        applyFilters();
        updateFilterCount();
    });
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

// Social momentum controls removed

// Clear filters
document.getElementById('clearFilters').addEventListener('click', () => {
    filterState.proximity = 5;
    filterState.venueTypes = [];
    filterState.vibes = [];
    filterState.curatorChoice = false;
    filterState.searchQuery = '';
    syncSearchInputs('');

    // Reset UI
    document.getElementById('proximitySlider').value = 5;
    document.getElementById('proximityValue').textContent = '5 km';
    document.getElementById('searchInput').value = '';
    document.getElementById('curatorChoiceCheckbox').checked = false;
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
    if (filterState.curatorChoice) count++;
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

function setInfoPanelVisibility(isVisible) {
    if (!rightInfoPanelElement) {
        return;
    }

    rightInfoPanelElement.classList.toggle('visible', Boolean(isVisible));
    rightInfoPanelElement.setAttribute('aria-hidden', isVisible ? 'false' : 'true');
}

function getLocationPreviewTags(location) {
    const rawTags = Array.isArray(location.detailedTags) && location.detailedTags.length > 0
        ? location.detailedTags
        : (Array.isArray(location.tags) ? location.tags : []);

    return rawTags
        .map(tag => String(tag || '').replace(/^activity:/i, '').trim())
        .filter(Boolean)
        .slice(0, 4);
}

function renderHoverPreview(location, summary) {
    if (!hoverPreviewInnerElement) {
        return;
    }

    const previewImageUrl = getLocationPreviewImageUrl(location);
    const ratingValue = summary && typeof summary.averageRating === 'number' ? summary.averageRating.toFixed(1) : '0.0';
    const ratingCount = summary && typeof summary.ratingCount === 'number' ? summary.ratingCount : 0;
    const ratingText = ratingCount > 0
        ? `${t('overallRating')}: ${ratingValue} / 5 • ${ratingCount} ${t('ratings')}`
        : `${t('overallRating')}: ${t('ratingNotAvailable')}`;
    const statusText = getOpenCloseStatusLabel(location);
    const statusClass = statusText === t('closingSoon') ? 'closing-soon' : (statusText === t('openNow') || statusText === t('alwaysOpen') ? 'open' : 'closed');
    const tags = getLocationPreviewTags(location);

    hoverPreviewInnerElement.innerHTML = `
        ${previewImageUrl ? `<img src="${previewImageUrl}" alt="${location.name} preview" class="map-hover-preview-image" />` : ''}
        <div class="map-hover-preview-body">
            <div class="map-hover-preview-title">${escapeXml(location.name)}</div>
            <div class="map-hover-preview-rating">${escapeXml(ratingText)}</div>
            <div class="map-hover-preview-status ${statusClass}">${escapeXml(statusText || t('closedNow'))}</div>
            ${tags.length > 0 ? `
                <div class="map-hover-preview-tags">
                    ${tags.map(tag => `<span class="map-hover-preview-tag">${escapeXml(tag)}</span>`).join('')}
                </div>
            ` : ''}
        </div>
    `;
}

function placeHoverPreview(pixel) {
    if (!hoverPreviewElement || !pixel || !map) {
        return;
    }

    const size = map.getSize();
    const mapWidth = size ? size[0] : 0;
    const side = pixel[0] > mapWidth * 0.58 ? 'left' : 'right';
    hoverPreviewElement.classList.toggle('card-left', side === 'left');
    hoverPreviewElement.classList.toggle('card-right', side !== 'left');
    hoverPreviewElement.style.left = `${Math.round(pixel[0])}px`;
    hoverPreviewElement.style.top = `${Math.round(pixel[1])}px`;
}

function showHoverPreview(location, pixel) {
    if (!hoverPreviewElement) {
        return;
    }

    activeHoverLocationId = location.id;
    // Initial placeholder render
    renderHoverPreview(location, { ratingCount: 0, averageRating: 0 });
    placeHoverPreview(pixel);
    hoverPreviewElement.classList.add('visible');
    hoverPreviewElement.setAttribute('aria-hidden', 'false');

    // Load community review summary and update preview when available
    void loadExistingUserRatings(location.id).then((loadedSummary) => {
        if (activeHoverLocationId === location.id && loadedSummary) {
            renderHoverPreview(location, loadedSummary);
            placeHoverPreview(pixel);
        }
    }).catch(() => {});
}

function hideHoverPreview() {
    activeHoverLocationId = null;
    if (!hoverPreviewElement) {
        return;
    }

    hoverPreviewElement.classList.remove('visible');
    hoverPreviewElement.setAttribute('aria-hidden', 'true');
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

    setInfoPanelVisibility(false);

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
// AUTHENTICATION & USER FEATURES
// ========================================

// Global auth state
let currentUser = null;
let activeProfileUserId = null;

function getProfileAvatarUrl(user) {
    const seed = String(user?.avatarSeed || user?.name || user?.email || user?.userId || 'guest').trim().toLowerCase() || 'guest';
    return `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(seed)}&backgroundColor=06b6d4,c084fc,22c55e,f97316,ef4444&textColor=ffffff&radius=50`;
}

function normalizeUserSession(user) {
    if (!user) {
        return null;
    }

    return {
        ...user,
        avatarUrl: user.avatarUrl || getProfileAvatarUrl(user),
    };
}

function requireSignedIn(featureLabel) {
    if (currentUser) {
        return true;
    }

    openLoginModal(`You need to be signed in to use ${featureLabel}.`);
    switchAuthTab(false);
    return false;
}

// Load user from localStorage on startup
function loadUserSession() {
    const stored = localStorage.getItem('didaudo_user_session');
    if (stored) {
        try {
            currentUser = normalizeUserSession(JSON.parse(stored));
            saveUserSession();
        } catch (e) {
            console.error('Failed to load user session:', e);
            currentUser = null;
        }
    }

    updateAuthUI();
}

// Save user to localStorage
function saveUserSession() {
    if (currentUser) {
        localStorage.setItem('didaudo_user_session', JSON.stringify(currentUser));
    } else {
        localStorage.removeItem('didaudo_user_session');
    }
}

// Update UI based on auth state
function updateAuthUI() {
    const loginBtn = document.getElementById('desktopLoginBtn');
    const logoutBtn = document.getElementById('desktopLogoutBtn');
    const profileButton = document.getElementById('desktopProfileButton');
    const userAvatar = document.getElementById('desktopUserAvatar');
    const userName = document.getElementById('desktopUserName');
    const userStatus = document.getElementById('desktopUserStatus');

    if (currentUser) {
        if (loginBtn) loginBtn.style.display = 'none';
        if (logoutBtn) {
            logoutBtn.style.display = 'inline-flex';
            logoutBtn.classList.add('logout-active');
        }
        if (profileButton) {
            profileButton.title = currentUser.name || currentUser.email || t('profile');
            profileButton.setAttribute('aria-label', `${t('profile')}: ${currentUser.name || currentUser.email || t('profile')}`);
        }
        if (userAvatar) {
            userAvatar.src = currentUser.avatarUrl || getProfileAvatarUrl(currentUser);
            userAvatar.alt = `${currentUser.name || currentUser.email || 'User'} profile picture`;
        }
        if (userName) {
            userName.textContent = currentUser.name || currentUser.email || t('guest');
        }
        if (userStatus) {
            userStatus.textContent = currentUser.email || t('profile');
        }
    } else {
        if (loginBtn) loginBtn.style.display = 'inline-flex';
        if (logoutBtn) {
            logoutBtn.style.display = 'none';
            logoutBtn.classList.remove('logout-active');
        }
        if (profileButton) {
            profileButton.title = t('signInContinue');
            profileButton.setAttribute('aria-label', t('signInContinue'));
        }
        if (userAvatar) {
            const defaultGuestAvatar = 'https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png';
            userAvatar.src = defaultGuestAvatar;
            userAvatar.alt = `${t('guest')} profile picture`;
        }
        if (userName) {
            userName.textContent = t('guest');
        }
        if (userStatus) {
            userStatus.textContent = t('signInContinue');
        }
    }
    // Refresh tooltip texts (language may have changed)
    try { setupNavTooltips(); } catch (e) { /* ignore */ }
}

// Open login modal
function openLoginModal(promptText = '') {
    const modal = document.getElementById('loginModal');
    const prompt = document.getElementById('loginPrompt');
    if (modal) modal.style.display = 'flex';
    if (prompt) {
        const safePromptText = typeof promptText === 'string' ? promptText : '';
        const hasPrompt = Boolean(String(safePromptText || '').trim());
        prompt.textContent = hasPrompt ? safePromptText : '';
        prompt.classList.toggle('hidden', !hasPrompt);
    }
}

// Close login modal
function closeLoginModal() {
    const modal = document.getElementById('loginModal');
    const prompt = document.getElementById('loginPrompt');
    if (modal) modal.style.display = 'none';
    if (prompt) {
        prompt.textContent = '';
        prompt.classList.add('hidden');
    }
}

function openProfileModal(userId = currentUser?.userId) {
    if (!requireSignedIn('profiles and friends')) {
        return;
    }

    const targetUserId = userId || currentUser.userId;
    window.location.href = `./profile.html?userId=${encodeURIComponent(targetUserId)}`;
}

function closeProfileModal() {
    return;
}

// Switch between login/signup tabs
function switchAuthTab(isSignup) {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const loginTabBtn = document.getElementById('loginTabBtn');
    const signupTabBtn = document.getElementById('signupTabBtn');

    if (isSignup) {
        if (loginForm) loginForm.style.display = 'none';
        if (signupForm) signupForm.style.display = 'block';
        if (loginTabBtn) {
            loginTabBtn.classList.remove('text-neon-purple', 'border-neon-purple');
            loginTabBtn.classList.add('text-slate-400', 'border-transparent');
        }
        if (signupTabBtn) {
            signupTabBtn.classList.remove('text-slate-400', 'border-transparent');
            signupTabBtn.classList.add('text-neon-purple', 'border-neon-purple');
        }
    } else {
        if (loginForm) loginForm.style.display = 'block';
        if (signupForm) signupForm.style.display = 'none';
        if (loginTabBtn) {
            loginTabBtn.classList.remove('text-slate-400', 'border-transparent');
            loginTabBtn.classList.add('text-neon-purple', 'border-neon-purple');
        }
        if (signupTabBtn) {
            signupTabBtn.classList.remove('text-neon-purple', 'border-neon-purple');
            signupTabBtn.classList.add('text-slate-400', 'border-transparent');
        }
    }
}

// Handle login
async function handleLogin(email, password) {
    const loginError = document.getElementById('loginError');
    if (loginError) loginError.classList.add('hidden');

    try {
        const response = await fetch(convexUrl('/api/auth/login'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (!response.ok || !data.ok) {
            if (loginError) {
                loginError.textContent = data.error || 'Login failed';
                loginError.classList.remove('hidden');
            }
            return;
        }

        currentUser = normalizeUserSession({
            userId: data.userId,
            email: data.email,
            name: data.name,
        });
        saveUserSession();
        updateAuthUI();
        closeLoginModal();

        // Reset form
        const form = document.getElementById('loginForm');
        if (form) form.reset();
    } catch (error) {
        console.error('Login error:', error);
        if (loginError) {
            loginError.textContent = 'Network error. Please try again.';
            loginError.classList.remove('hidden');
        }
    }
}

// Handle signup
async function handleSignup(email, password, passwordConfirm, name) {
    const signupError = document.getElementById('signupError');
    if (signupError) signupError.classList.add('hidden');

    if (password !== passwordConfirm) {
        if (signupError) {
            signupError.textContent = 'Passwords do not match';
            signupError.classList.remove('hidden');
        }
        return;
    }

    try {
        const response = await fetch(convexUrl('/api/auth/signup'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, name }),
        });

        const data = await response.json();

        if (!response.ok || !data.ok) {
            if (signupError) {
                signupError.textContent = data.error || 'Signup failed';
                signupError.classList.remove('hidden');
            }
            return;
        }

        currentUser = normalizeUserSession({
            userId: data.userId,
            email: data.email,
            name: data.name,
        });
        saveUserSession();
        updateAuthUI();
        closeLoginModal();

        // Reset forms
        const loginForm = document.getElementById('loginForm');
        const signupForm = document.getElementById('signupForm');
        if (loginForm) loginForm.reset();
        if (signupForm) signupForm.reset();
        switchAuthTab(false);
    } catch (error) {
        console.error('Signup error:', error);
        if (signupError) {
            signupError.textContent = 'Network error. Please try again.';
            signupError.classList.remove('hidden');
        }
    }
}

// Handle logout
function handleLogout() {
    currentUser = null;
    saveUserSession();
    updateAuthUI();
    // Close info panel if open
    setInfoPanelVisibility(false);
    closeProfileModal();
}

async function loadProfileModalData(userId) {
    const content = document.getElementById('profileModalContent');
    const title = document.getElementById('profileModalTitle');
    if (!content || !userId) return;

    content.innerHTML = '<p class="text-slate-400">Loading profile...</p>';

    try {
        const response = await fetch(convexUrl(`/api/profile?userId=${userId}`));
        const profile = await response.json();
        if (!response.ok || !profile || profile.error) {
            throw new Error(profile?.error || 'Could not load profile');
        }

        if (title) {
            title.textContent = profile.user?.name || profile.user?.email || 'Profile';
        }

        renderProfileModal(profile);
    } catch (error) {
        console.error('Error loading profile:', error);
        content.innerHTML = `<p class="text-red-300">${String(error?.message || 'Could not load profile')}</p>`;
    }
}

function renderProfileModal(profile) {
    const content = document.getElementById('profileModalContent');
    if (!content) return;

    const isOwnProfile = profile?.user?._id === currentUser?.userId;
    const friendRequests = profile?.requests?.incoming || [];
    const friends = profile?.friends || [];
    const favorites = profile?.favoriteLocations || [];
    const ratings = profile?.ratings || [];

    content.innerHTML = `
        <div class="space-y-4">
            <div class="rounded-xl border border-white/10 bg-slate-950/50 p-4">
                <p class="text-xs uppercase tracking-[0.18em] text-slate-400">User</p>
                <p class="mt-1 text-lg font-bold text-white">${profile.user?.name || profile.user?.email || 'Profile'}</p>
                <p class="text-sm text-slate-400">${profile.user?.email || ''}</p>
            </div>

            ${isOwnProfile ? `
            <div class="rounded-xl border border-white/10 bg-slate-950/50 p-4 space-y-3">
                <p class="text-xs uppercase tracking-[0.18em] text-slate-400">Add Friend</p>
                <div class="flex gap-2">
                    <input id="friendEmailInput" type="email" class="flex-1 rounded bg-slate-800 border border-slate-600 px-3 py-2 text-white" placeholder="friend@email.com" />
                    <button id="sendFriendRequestBtn" class="rounded bg-cyan-500 px-3 py-2 font-semibold text-slate-900">Send</button>
                </div>
                <div id="friendRequestStatus" class="text-xs text-slate-400"></div>
            </div>
            ` : ''}

            <div class="rounded-xl border border-white/10 bg-slate-950/50 p-4 space-y-3">
                <div class="flex items-center justify-between gap-3">
                    <p class="text-xs uppercase tracking-[0.18em] text-slate-400">Compare favorites</p>
                    <span class="text-xs text-slate-500">Up to 3 friends</span>
                </div>
                <div class="space-y-2">
                    ${friends.length > 0 ? friends.slice(0, 3).map(friend => `
                        <label class="flex items-center gap-2 text-sm text-slate-200">
                            <input type="checkbox" class="friend-compare-checkbox ui-checkbox-input" value="${friend._id}" onchange="this.nextElementSibling?.classList.toggle('checked', this.checked)" />
                            <span class="ui-checkbox" aria-hidden="true"></span>
                            <span>${friend.name || friend.email}</span>
                        </label>
                    `).join('') : '<p class="text-sm text-slate-400">No friends yet.</p>'}
                </div>
                <div class="flex gap-2">
                    <button id="compareFavoritesBtn" class="rounded bg-neon-purple px-3 py-2 font-semibold text-slate-900">Compare</button>
                    ${!isOwnProfile && currentUser ? `<button id="compareWithMeBtn" class="rounded border border-cyan-400 px-3 py-2 font-semibold text-cyan-300">Compare with me</button>` : ''}
                </div>
                <div id="compareFavoritesResult" class="text-sm text-slate-300"></div>
            </div>
        </div>

        <div class="space-y-4">
            <div class="rounded-xl border border-white/10 bg-slate-950/50 p-4">
                <p class="text-xs uppercase tracking-[0.18em] text-slate-400">${t('friends')}</p>
                <div class="mt-3 space-y-2">
                    ${friends.length > 0 ? friends.map(friend => `
                        <div class="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2">
                            <div>
                                <p class="font-semibold text-white">${friend.name || friend.email}</p>
                                <p class="text-xs text-slate-400">${friend.email}</p>
                            </div>
                            <button class="view-friend-btn rounded border border-cyan-400 px-3 py-1 text-xs font-semibold text-cyan-300" data-user-id="${friend._id}">${t('view')}</button>
                        </div>
                    `).join('') : '<p class="text-sm text-slate-400">No accepted friends yet.</p>'}
                </div>
            </div>

            ${isOwnProfile && friendRequests.length > 0 ? `
            <div class="rounded-xl border border-white/10 bg-slate-950/50 p-4">
                <p class="text-xs uppercase tracking-[0.18em] text-slate-400">${t('friendRequests')}</p>
                <div class="mt-3 space-y-2">
                    ${friendRequests.map(request => `
                        <div class="rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2">
                            <p class="font-semibold text-white">${request.senderEmail}</p>
                            <div class="mt-2 flex gap-2">
                                <button class="respond-friend-btn rounded bg-emerald-500 px-3 py-1 text-xs font-semibold text-slate-900" data-request-id="${request._id}" data-action="accept">${t('accept')}</button>
                                <button class="respond-friend-btn rounded bg-slate-700 px-3 py-1 text-xs font-semibold text-slate-200" data-request-id="${request._id}" data-action="decline">${t('decline')}</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}

            <div class="rounded-xl border border-white/10 bg-slate-950/50 p-4">
                <p class="text-xs uppercase tracking-[0.18em] text-slate-400">${t('favoriteLocations')}</p>
                <div class="mt-3 space-y-2">
                    ${favorites.length > 0 ? favorites.map(location => `
                        <button class="w-full text-left rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 hover:border-cyan-400" data-location-id="${location.id}">
                            <p class="font-semibold text-white">${location.name}</p>
                            <p class="text-xs text-slate-400">${location.address || ''}</p>
                        </button>
                    `).join('') : `<p class="text-sm text-slate-400">${t('noFavorites')}</p>`}
                </div>
            </div>

            <div class="rounded-xl border border-white/10 bg-slate-950/50 p-4">
                <p class="text-xs uppercase tracking-[0.18em] text-slate-400">${t('ratingsTitle')}</p>
                <div class="mt-3 space-y-2">
                    ${ratings.length > 0 ? ratings.map(rating => `
                        <div class="rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2">
                            <p class="font-semibold text-white">${rating.locationId}</p>
                            <p class="text-xs text-slate-300">${'⭐'.repeat(Math.max(1, Math.min(5, rating.rating)))}</p>
                            ${rating.comment ? `<p class="mt-1 text-sm text-slate-400">${rating.comment}</p>` : ''}
                        </div>
                    `).join('') : `<p class="text-sm text-slate-400">${t('noRatings')}</p>`}
                </div>
            </div>
        </div>
    `;

    const sendBtn = document.getElementById('sendFriendRequestBtn');
    if (sendBtn) {
        sendBtn.addEventListener('click', async () => {
            const input = document.getElementById('friendEmailInput');
            const status = document.getElementById('friendRequestStatus');
            const receiverEmail = String(input?.value || '').trim();
            if (!receiverEmail) {
                if (status) status.textContent = 'Enter an email address.';
                return;
            }
            try {
                const response = await fetch(convexUrl('/api/friends/request'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ senderId: currentUser.userId, receiverEmail }),
                });
                const data = await response.json();
                if (!response.ok || !data.ok) throw new Error(data.error || 'Friend request failed');
                if (status) status.textContent = 'Friend request sent.';
                if (input) input.value = '';
                void loadProfileModalData(activeProfileUserId || currentUser.userId);
            } catch (error) {
                if (status) status.textContent = String(error?.message || 'Friend request failed');
            }
        });
    }

    document.querySelectorAll('.respond-friend-btn').forEach(button => {
        button.addEventListener('click', async () => {
            try {
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
                if (!response.ok || !data.ok) throw new Error(data.error || 'Could not respond to request');
                void loadProfileModalData(activeProfileUserId || currentUser.userId);
            } catch (error) {
                alert(String(error?.message || 'Could not respond to request'));
            }
        });
    });

    document.querySelectorAll('.view-friend-btn').forEach(button => {
        button.addEventListener('click', () => {
            activeProfileUserId = button.dataset.userId;
            void loadProfileModalData(activeProfileUserId);
        });
    });

    const compareBtn = document.getElementById('compareFavoritesBtn');
    if (compareBtn) {
        compareBtn.addEventListener('click', async () => {
            const selectedIds = Array.from(document.querySelectorAll('.friend-compare-checkbox:checked')).map(input => input.value).slice(0, 3);
            if (selectedIds.length === 0) {
                const result = document.getElementById('compareFavoritesResult');
                if (result) result.textContent = 'Pick at least one friend.';
                return;
            }

            await renderFavoriteComparison(selectedIds);
        });
    }

    const compareWithMeBtn = document.getElementById('compareWithMeBtn');
    if (compareWithMeBtn) {
        compareWithMeBtn.addEventListener('click', async () => {
            await renderFavoriteComparison([activeProfileUserId || currentUser.userId]);
        });
    }

    document.querySelectorAll('[data-location-id]').forEach(button => {
        button.addEventListener('click', () => {
            const location = allLocations.find(loc => loc.id === button.dataset.locationId);
            if (location) {
                setInfoPanelVisibility(true);
                showInfoWindow(location);
            }
        });
    });
}

async function renderFavoriteComparison(friendIds) {
    const result = document.getElementById('compareFavoritesResult');
    if (!result || !currentUser) return;

    try {
        const params = new URLSearchParams();
        params.set('userId', currentUser.userId);
        friendIds.forEach(id => params.append('friendId', id));
        const response = await fetch(convexUrl(`/api/favorites/compare?${params.toString()}`));
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Comparison failed');

        const sharedNames = (data.sharedLocations || []).map(location => location.name).join(', ');
        result.innerHTML = sharedNames
            ? `<p class="text-slate-200">Shared favorites: ${sharedNames}</p>`
            : '<p class="text-slate-400">No shared favorites found.</p>';
    } catch (error) {
        result.textContent = String(error?.message || 'Comparison failed');
    }
}

// Detailed tags by category
const detailedTagsByCategory = {
    'Sports': ['Football', 'Basketball', 'Volleyball', 'Badminton', 'Tennis'],
    'Fitness': ['Gym', 'Yoga', 'Pilates', 'CrossFit', 'Swimming'],
    'Music': ['Live Band', 'DJ', 'Karaoke', 'Acoustic', 'Jazz'],
    'Nightlife': ['Bar', 'Club', 'Pub', 'Lounge', 'Brewery'],
    'Art': ['Gallery', 'Studio', 'Street Art', 'Installation', 'Sculpture'],
    'Photography': ['History', 'Modern Art', 'Science', 'Design'],
    'Shopping': ['Fashion', 'Electronics', 'Books', 'Antiques', 'Vintage'],
    'Markets': ['Night Market', 'Flower Market', 'Art Market', 'Food Market'],
    'Dining': ['Vietnamese', 'Italian', 'Japanese', 'Thai', 'Korean', 'Vegan'],
    'Cafes': ['Coffee', 'Tea', 'Dessert', 'Brunch', 'Bakery'],
    'Hiking': ['Easy Trail', 'Medium Trail', 'Mountain', 'Forest', 'Waterfall'],
    'Parks': ['City Park', 'Botanical Garden', 'Beach', 'Lake'],
    'Events': ['Concert', 'Conference', 'Workshop', 'Meetup', 'Expo'],
    'Festivals': ['Music Festival', 'Street Festival', 'Cultural Festival', 'Food Festival'],
    'Gaming': ['Arcade', 'Video Game', 'Board Game', 'VR'],
    'Arcades': ['Classic Arcade', 'Racing', 'Fighting', 'Prize Games'],
};

const detailedTagColors = {
    'Sports': '#3b82f6',
    'Fitness': '#3b82f6',
    'Music': '#a855f7',
    'Nightlife': '#a855f7',
    'Art': '#ec4899',
    'Photography': '#ec4899',
    'Shopping': '#f97316',
    'Markets': '#f97316',
    'Dining': '#ef4444',
    'Cafes': '#ef4444',
    'Hiking': '#22c55e',
    'Parks': '#22c55e',
    'Events': '#eab308',
    'Festivals': '#eab308',
    'Gaming': '#14b8a6',
    'Arcades': '#14b8a6',
};

function parseTimeToMinutes(timeText) {
    const match = String(timeText || '').match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        return null;
    }
    return (hour * 60) + minute;
}

function formatTimeTo12Hour(timeText) {
    const minutes = parseTimeToMinutes(timeText);
    if (minutes === null) return '';
    const hour24 = Math.floor(minutes / 60);
    const minute = minutes % 60;
    const meridiem = hour24 >= 12 ? 'PM' : 'AM';
    const hour12 = hour24 % 12 || 12;
    return `${hour12}:${String(minute).padStart(2, '0')} ${meridiem}`;
}

function getVietnamNowParts() {
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Ho_Chi_Minh',
        weekday: 'long',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
    const parts = formatter.formatToParts(new Date());
    const weekday = (parts.find(part => part.type === 'weekday')?.value || '').toLowerCase();
    const hour = Number(parts.find(part => part.type === 'hour')?.value || '0');
    const minute = Number(parts.find(part => part.type === 'minute')?.value || '0');
    return {
        weekday,
        currentMinutes: (hour * 60) + minute
    };
}

function hasConfiguredHours(hoursObj) {
    if (!hoursObj || typeof hoursObj !== 'object') return false;
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    return days.some(day => {
        const dayHours = hoursObj[day];
        if (!dayHours) return false;
        return parseTimeToMinutes(dayHours.open) !== null && parseTimeToMinutes(dayHours.close) !== null;
    });
}

// Format hours for display using Vietnam local time.
function normalizeHoursSource(source) {
    if (source && typeof source === 'object' && ('hours' in source || 'alwaysOpen' in source)) {
        return source;
    }

    return { hours: source };
}

function getMinutesUntilClose(openMinutes, closeMinutes, currentMinutes) {
    if (!isCurrentlyOpen(openMinutes, closeMinutes, currentMinutes)) return null;
    if (openMinutes === closeMinutes) return null;

    if (openMinutes < closeMinutes) {
        return closeMinutes - currentMinutes;
    }

    if (currentMinutes >= openMinutes) {
        return (24 * 60 - currentMinutes) + closeMinutes;
    }

    return closeMinutes - currentMinutes;
}

function getHoursStatusData(source) {
    const location = normalizeHoursSource(source);

    if (location.alwaysOpen) {
        return {
            summaryText: `🟢 ${t('alwaysOpen')}`,
            statusLabel: t('alwaysOpen'),
            statusClass: 'open',
            nextOpening: ''
        };
    }

    const hoursObj = location.hours;
    if (!hasConfiguredHours(hoursObj)) {
        return {
            summaryText: '',
            statusLabel: '',
            statusClass: 'closed',
            nextOpening: ''
        };
    }

    const { weekday, currentMinutes } = getVietnamNowParts();
    const dayKey = {
        monday: 'monday',
        tuesday: 'tuesday',
        wednesday: 'wednesday',
        thursday: 'thursday',
        friday: 'friday',
        saturday: 'saturday',
        sunday: 'sunday'
    }[weekday];

    if (!dayKey) {
        return {
            summaryText: '',
            statusLabel: '',
            statusClass: 'closed',
            nextOpening: ''
        };
    }

    const todayHours = hoursObj[dayKey];
    if (!todayHours) {
        const nextOpening = getNextOpening(hoursObj);
        return {
            summaryText: `🔴 ${t('closedNow')} • Closed today`,
            statusLabel: t('closedNow'),
            statusClass: 'closed',
            nextOpening: nextOpening ? `Opens ${nextOpening}` : ''
        };
    }

    const openMinutes = parseTimeToMinutes(todayHours.open);
    const closeMinutes = parseTimeToMinutes(todayHours.close);
    if (openMinutes === null || closeMinutes === null) {
        return {
            summaryText: '',
            statusLabel: '',
            statusClass: 'closed',
            nextOpening: ''
        };
    }

    const isOpen = isCurrentlyOpen(openMinutes, closeMinutes, currentMinutes);
    const minutesUntilClose = isOpen ? getMinutesUntilClose(openMinutes, closeMinutes, currentMinutes) : null;
    const isClosingSoon = isOpen && minutesUntilClose !== null && minutesUntilClose <= hoursClosingSoonThresholdMinutes;
    const openDisplay = formatTimeTo12Hour(todayHours.open);
    const closeDisplay = formatTimeTo12Hour(todayHours.close);
    const rangeText = `${openDisplay} - ${closeDisplay}`;

    if (isClosingSoon) {
        return {
            summaryText: `🟠 ${t('closingSoon')} • ${rangeText}`,
            statusLabel: t('closingSoon'),
            statusClass: 'closing-soon',
            nextOpening: ''
        };
    }

    if (isOpen) {
        return {
            summaryText: `🟢 ${t('openNow')} • ${rangeText}`,
            statusLabel: t('openNow'),
            statusClass: 'open',
            nextOpening: ''
        };
    }

    const nextOpening = getNextOpening(hoursObj);
    return {
        summaryText: `🔴 ${t('closedNow')} • ${rangeText}`,
        statusLabel: t('closedNow'),
        statusClass: 'closed',
        nextOpening: nextOpening ? `Opens ${nextOpening}` : ''
    };
}

function formatHours(hoursObj) {
    return getHoursStatusData({ hours: hoursObj }).summaryText || '';
}

function getOpenCloseStatusLabel(source) {
    return getHoursStatusData(source).statusLabel || '';
}

// Supports same-day and overnight ranges (e.g., 8:30 PM-4:30 AM).
function isCurrentlyOpen(openMinutes, closeMinutes, currentMinutes) {
    if (openMinutes === closeMinutes) return true;
    if (openMinutes < closeMinutes) {
        return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
    }
    return currentMinutes >= openMinutes || currentMinutes <= closeMinutes;
}

// Return next opening in human readable form (e.g., "Tue 8:30 PM") or null if none
function getNextOpening(hoursObj) {
    if (!hasConfiguredHours(hoursObj)) return null;
    const days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
    const dayLabels = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    const nowParts = getVietnamNowParts();
    const startIndex = days.indexOf(nowParts.weekday);
    const currentMinutes = nowParts.currentMinutes;

    for (let i = 0; i < 7; i++) {
        const idx = (startIndex + i) % 7;
        const dayKey = days[idx];
        const h = hoursObj[dayKey];
        if (!h || !h.open || !h.close) continue;
        const openMin = parseTimeToMinutes(h.open);
        const closeMin = parseTimeToMinutes(h.close);
        if (openMin === null || closeMin === null) continue;
        if (i === 0) {
            // Today: only consider openings later today if currently closed
            if (!isCurrentlyOpen(openMin, closeMin, currentMinutes)) {
                if (currentMinutes < openMin) {
                    return `${dayLabels[idx]} ${formatTimeTo12Hour(h.open)}`;
                }
                // otherwise continue to next day
            } else {
                return null; // already open
            }
        } else {
            return `${dayLabels[idx]} ${formatTimeTo12Hour(h.open)}`;
        }
    }
    return null;
}

// Per-user reviews and submission removed: user-review endpoints/UI are no longer used.

// Helper function to format time ago
function getTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'just now';
}

// Submit handler for logged-in users (community reviews)
function submitUserRatingHandler(locationId) {
    const starContainer = document.getElementById(`userRatingStars-${locationId}`);
    const activeStars = starContainer?.querySelectorAll('.star.active');
    const rating = activeStars?.length || 0;
    const commentEl = document.getElementById(`userComment-${locationId}`);
    const comment = commentEl ? String(commentEl.value || '').trim() : '';
    void submitUserRating(locationId, rating, comment);
}

async function submitUserRating(locationId, rating, comment) {
    if (!requireSignedIn('rating this place')) {
        return;
    }

    const ratingNum = Number(rating);
    if (!ratingNum || ratingNum < 1 || ratingNum > 5) {
        alert('Please select a star rating (1-5)');
        return;
    }

    try {
        const response = await fetch(convexUrl('/api/user-ratings'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ locationId, rating: ratingNum, comment: comment || '' })
        });

        const data = await response.json();
        if (response.ok) {
            alert('Rating submitted successfully!');
            // Refresh ratings display
            await loadExistingUserRatings(locationId);
            if (activeSelectedLocationId === locationId) {
                showInfoWindow(allLocations.find(loc => loc.id === locationId));
            }
        } else {
            alert(`Error submitting rating: ${data.error || 'Unknown error'}`);
            console.error('Error response:', data);
        }
    } catch (error) {
        console.error('Error submitting rating:', error);
        alert('Failed to submit rating. Please try again.');
    }
}

// Load community reviews and populate ratings summary + recent reviews. Returns { ratingCount, averageRating }
async function loadExistingUserRatings(locationId) {
    try {
        const response = await fetch(convexUrl(`/api/user-ratings?locationId=${encodeURIComponent(locationId)}`));
        if (!response.ok) {
            return { ratingCount: 0, averageRating: 0 };
        }

        const data = await response.json();
        const existingContainer = document.getElementById(`existingRatings-${locationId}`);
        const summaryContainer = document.getElementById(`ratingsSummary-${locationId}`);

        if (summaryContainer) {
            if (!data.ratings || data.ratings.length === 0) {
                summaryContainer.innerHTML = '<p class="text-slate-500 text-xs">No ratings yet. Be the first to rate!</p>';
            } else {
                const totalRating = data.ratings.reduce((sum, r) => sum + (Number(r.rating) || 0), 0);
                const avgRating = (totalRating / data.ratings.length).toFixed(1);
                const ratingCount = data.ratings.length;
                const fullStars = Math.round(avgRating);
                const stars = '⭐'.repeat(fullStars) + '☆'.repeat(5 - fullStars);
                summaryContainer.innerHTML = `
                    <div style="display:flex;align-items:center;gap:8px;">
                        <span style="font-size:18px;">${stars}</span>
                        <span style="font-size:13px;color:#cbd5e1;"><strong>${avgRating}</strong>/5 • <span style="color:#94a3b8;">${ratingCount} ${ratingCount === 1 ? 'rating' : 'ratings'}</span></span>
                    </div>
                `;
            }
        }

        if (existingContainer) {
            if (!data.ratings || data.ratings.length === 0) {
                existingContainer.innerHTML = '';
            } else {
                const ratingsHtml = data.ratings.slice(0, 5).map(r => {
                    const ratingStars = '⭐'.repeat(Math.max(0, Math.min(5, Number(r.rating) || 0))) + '☆'.repeat(5 - Math.max(0, Math.min(5, Number(r.rating) || 0)));
                    const userName = r.userName || 'Anonymous';
                    const comment = r.comment ? `<p class="text-xs text-slate-400 mt-1">"${escapeXml(r.comment)}"</p>` : '';
                    const timeAgo = getTimeAgo(r.createdAt);
                    return `
                        <div style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                            <div style="display: flex; justify-content: space-between; align-items: start;">
                                <div>
                                    <p style="font-weight: 500; font-size: 13px; color: #e2e8f0;">${ratingStars} ${Number(r.rating) || 0}/5</p>
                                    <p style="font-size: 12px; color: #94a3b8;">${escapeXml(userName)} • ${timeAgo}</p>
                                </div>
                            </div>
                            ${comment}
                        </div>
                    `;
                }).join('');

                existingContainer.innerHTML = ratingsHtml;
                if (data.ratings.length > 5) {
                    existingContainer.innerHTML += `<p style="text-xs; color: #7c3aed; margin-top: 8px; cursor: pointer;" onclick="alert('Showing ${data.ratings.length} total ratings')">View all ${data.ratings.length} ratings →</p>`;
                }
            }
        }

        return {
            ratingCount: Array.isArray(data.ratings) ? data.ratings.length : 0,
            averageRating: Array.isArray(data.ratings) && data.ratings.length > 0
                ? data.ratings.reduce((s, r) => s + (Number(r.rating) || 0), 0) / data.ratings.length
                : 0
        };
    } catch (error) {
        console.error('Error loading ratings:', error);
        return { ratingCount: 0, averageRating: 0 };
    }
}

// Handle favorite toggle
async function toggleFavorite(locationId) {
    if (!requireSignedIn('favorite locations')) {
        return;
    }

    try {
        const response = await fetch(convexUrl('/api/favorites'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                locationId,
                userId: currentUser.userId,
            }),
        });

        const data = await response.json();
        if (response.ok && data.ok) {
            // Refresh if needed
            if (activeSelectedLocationId) {
                showInfoWindow(allLocations.find(loc => loc.id === activeSelectedLocationId));
            }
        }
    } catch (error) {
        console.error('Error toggling favorite:', error);
    }
}

// Check if location is favorite
async function checkIsFavorite(locationId) {
    if (!currentUser) return false;

    try {
        const response = await fetch(
            convexUrl(`/api/favorites?locationId=${locationId}&userId=${currentUser.userId}`)
        );
        const data = await response.json();
        return data.isFavorite || false;
    } catch (error) {
        console.error('Error checking favorite:', error);
        return false;
    }
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

    // Load user session
    loadUserSession();

    applyTheme(getStoredTheme());
    applyDesktopNavState(getStoredDesktopNavState());
    currentLanguage = getStoredLanguage();
    applyLanguageChoice(currentLanguage);

    const navToggle = document.getElementById('desktopNavToggle');
    const profileButton = document.getElementById('desktopProfileButton');
    const mapNavBtn = document.getElementById('mapNavBtn');
    const friendsNavBtn = document.getElementById('friendsNavBtn');
    const languageToggleBtn = document.getElementById('desktopLanguageToggleBtn');
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const loginBtn = document.getElementById('desktopLoginBtn');
    const logoutBtn = document.getElementById('desktopLogoutBtn');

    if (navToggle) navToggle.addEventListener('click', toggleDesktopNav);
    if (languageToggleBtn) languageToggleBtn.addEventListener('click', toggleLanguage);
    if (themeToggleBtn) themeToggleBtn.addEventListener('click', toggleTheme);
    if (mapNavBtn) {
        mapNavBtn.addEventListener('click', () => {
            setDesktopNavActive('map');
            hidePopup();
        });
    }
    if (friendsNavBtn) {
        friendsNavBtn.addEventListener('click', () => {
            setDesktopNavActive('friends');
            if (!currentUser) {
                openLoginModal('Sign in to view your friends.');
                return;
            }
            window.location.href = './profile.html';
        });
    }
    if (profileButton) {
        profileButton.addEventListener('click', () => {
            if (currentUser) {
                openProfileModal();
                return;
            }
            openLoginModal('Sign in to view your profile.');
        });
    }
    if (loginBtn) loginBtn.addEventListener('click', () => openLoginModal());
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    setDesktopNavActive('map');

    // Setup auth modal and buttons
    const loginModalClose = document.getElementById('loginModalClose');
    const profileModalClose = document.getElementById('profileModalClose');
    const loginTabBtn = document.getElementById('loginTabBtn');
    const signupTabBtn = document.getElementById('signupTabBtn');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    if (loginModalClose) loginModalClose.addEventListener('click', closeLoginModal);
    if (profileModalClose) profileModalClose.addEventListener('click', closeProfileModal);

    if (loginTabBtn) loginTabBtn.addEventListener('click', () => switchAuthTab(false));
    if (signupTabBtn) signupTabBtn.addEventListener('click', () => switchAuthTab(true));

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            await handleLogin(email, password);
        });
    }

    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('signupEmail').value;
            const password = document.getElementById('signupPassword').value;
            const passwordConfirm = document.getElementById('signupPasswordConfirm').value;
            const name = document.getElementById('signupName').value;
            await handleSignup(email, password, passwordConfirm, name);
        });
    }

    // Close modal when clicking outside
    const loginModal = document.getElementById('loginModal');
    if (loginModal) {
        loginModal.addEventListener('click', (e) => {
            if (e.target === loginModal) closeLoginModal();
        });
    }

    const profileModal = document.getElementById('profileModal');
    if (profileModal) {
        profileModal.addEventListener('click', (e) => {
            if (e.target === profileModal) closeProfileModal();
        });
    }

    applyLanguage();

    initMap();

    setupCarouselDragScroll(document.getElementById('locationsContainer'));
    setupCarouselDragScroll(document.getElementById('mobileLocationsContainer'));

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

    // Use My Location button
    document.getElementById('useLocationBtn').addEventListener('click', initializeUserLocation);

    // Refresh locations button
    const refreshBtn = document.getElementById('refreshLocationsBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            refreshBtn.disabled = true;
            refreshBtn.textContent = 'Loading...';
            try {
                await loadMapMarkers();
            } catch (error) {
                console.error('Refresh failed:', error);
            } finally {
                refreshBtn.disabled = false;
                refreshBtn.textContent = 'Refresh';
            }
        });
    }

    // Auto-refresh disabled: prefer manual refresh via the Refresh button to avoid
    // unexpected list changes while the user is interacting with filters.
    // To re-enable automatic refresh, uncomment and adjust the interval below.
    // if (!locationRefreshTimer) {
    //     locationRefreshTimer = window.setInterval(() => {
    //         if (map) {
    //             void loadMapMarkers();
    //         }
    //     }, 15000);
    // }
});
