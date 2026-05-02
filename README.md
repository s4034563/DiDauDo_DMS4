# VibeMap - Social-Driven Location Explorer

A sophisticated single-page web application that integrates OpenLayers to discover interesting locations. Built with HTML5, Vanilla JavaScript (ES6+), Tailwind CSS, and OpenLayers.

## 🌟 Features

### UI & Visual Design
- **Full-Screen Glassmorphic Interface**: Dark mode theme with neon purple/cyan accents
- **Interactive OpenLayers Map**: Real-time map visualization with custom markers
- **Glassmorphic Sidebar**: Floating, frosted-glass effect sidebar with filter controls
- **Custom Info Windows**: Beautiful overlays for location details
- **Responsive Layout**: Mobile-optimized design

### Advanced Filtering System

#### Proximity (Range Slider)
- Adjust detection radius from 1km to 50km
- Real-time marker updates based on distance

#### Venue Type Toggles
- 🍔 Dining
- ☕ Coffee Hangout
- 🎉 Entertainment
- 🏞️ Sightseeing

#### The Vibe (Multi-Select Chips)
- 🛋️ Cozy
- 🏭 Industrial
- 🎊 Loud/Party
- ✨ Minimalist
- 💎 Hidden Gem
- 📸 Instagrammable

#### Activity Filters
- **Normal**: Show all locations
- **Trending / Viral**: (Deprecated) Previously used social metrics; removed in this version

### Interactive Features

#### Notes
- The prior "Hype Meter" and social momentum UI have been removed to simplify filtering and improve performance.

#### Community Verification
- **Star Ratings**: Per-location community rating system
- Session-based verification counter
- Encourages user engagement

#### Quick Location Access
- Clickable location cards in sidebar
- Auto-centers map on selection
- Full location details display

## 🛠️ Technical Stack

### Frontend
- **HTML5**: Semantic markup structure
- **CSS3**: Custom animations, gradients, and glassmorphism effects
- **Tailwind CSS**: Utility-first styling via CDN
- **Vanilla JavaScript ES6+**: No framework dependencies

### Backend & APIs
- **OpenLayers**: Interactive mapping with OpenStreetMap tiles
- **HTML Overlays**: Custom marker styling with HTML content
- **Convex HTTP API**: Server-backed locations, search, and ratings endpoints

### Data Structure
Each location object includes:
```javascript
{
    id: string,                    // Unique identifier
    name: string,                  // Location name
    type: string,                  // Venue type
    lat: number, lng: number,     // Coordinates
   vibes: string[],              // AI-tagged categories
   videoURL: string,              // Link to post
   address: string,              // Physical address
}
```

## 🚀 Getting Started

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet access for OpenStreetMap tiles and the OpenLayers CDN

### Installation

1. **Clone/Download the project**
   ```bash
   # Files included:
   - index.html      (Main HTML file)
   - app.js          (JavaScript logic)
   - README.md       (This file)
   ```

2. **Open in Browser**
   - Simply open `index.html` in your web browser
   - No build process required
   - No dependencies to install

### Development Notes
The app uses OpenStreetMap tiles through OpenLayers. If you are offline, the sidebar and filter logic still work, but the map tiles will not load.

## 🌐 Deploy On Namecheap cPanel + Convex

### 1. Deploy Convex backend
1. Install dependencies locally:
   ```bash
   npm install
   ```
2. Login and initialize/deploy Convex:
   ```bash
   npx convex dev
   ```
   This command creates Convex generated files and prompts you to create/select a project.
3. Deploy production backend:
   ```bash
   npx convex deploy
   ```
4. Copy your Convex deployment URL (example: `https://your-project-name.convex.cloud`).

### 2. Configure frontend to use Convex
1. Open `config.js`.
2. Set:
   ```javascript
   window.VIBEMAP_CONFIG = {
       useConvex: true,
       convexBaseUrl: 'https://your-project-name.convex.cloud'
   };
   ```

### 3. Upload frontend to Namecheap cPanel
1. In Namecheap cPanel, open **File Manager**.
2. Go to `public_html` (or your addon domain document root).
3. Upload these files/folders:
   - `index.html`
   - `app.js`
   - `config.js`
4. If your site is under a subfolder, keep relative paths unchanged.

### 4. Verify production
1. Open your domain.
2. Click a marker, then rate the place with the stars in the details panel.
3. Refresh and click the same marker again.
4. Confirm the rating average persists (now served from Convex).

### Notes
- cPanel only hosts the static frontend in this setup.
- Convex hosts your backend functions and database.
- CORS headers are already configured in `convex/http.ts` for cross-origin requests.

## 📊 Server-Backed Data

Locations are loaded from Convex and edited through the admin panel. Social-momentum filtering and the visual "hype meter" have been removed from the UI and data model in this version.

### AI-Tagged Vibes
Each location is assigned 2-3 vibes from the available categories, simulating AI categorization of social media captions.

## 🎮 User Guide

### Finding Trending Locations

1. **Adjust Proximity**
   - Use the range slider to set your search radius
   - Values: 1km to 50km

2. **Filter by Venue Type**
   - Toggle the venue types you're interested in
   - Multiple selections create an OR filter

3. **Select Vibes**
   - Click chip buttons to select multiple vibes
   - Locations matching ANY selected vibe appear

4. **View Location Details**
   - Click any marker on the map
   - Info window shows associated vibes and the star rating widget for community feedback

### Tips & Tricks

- **Combine Filters**: Create powerful searches with multiple active filters
- **Real-Time Updates**: Filters apply instantly without page reload
- **Quick Pan**: Click location cards in sidebar to jump to that location
- **Viral Indicators**: 🔥 emoji markers indicate recently viral locations
- **Filter Count**: Check active filter count in sidebar
- **Clear All**: Use "Clear All Filters" to reset everything at once

## 🎨 Customization

### Color Theme (in index.html `<style>` section)
```css
/* Neon Purple */ #c084fc
/* Neon Cyan */   #06b6d4
/* Dark Background */ #0f172a
```

### Adding New Vibes
1. Add chip in HTML:
   ```html
   <div class="chip" data-vibe="Your Vibe">🎯 Your Vibe</div>
   ```

2. Update the location records in Convex so they include the vibes you want:
   ```javascript
   vibes: ['Your Vibe', 'Another Vibe']
   ```

### Updating Locations
Use the admin panel or Convex data model to:
- Add or remove locations
- Change coordinates
- Modify vibes
- Update media URLs

## 🔧 Code Architecture

### Core Functions

#### `initMap()`
- Initializes the OpenLayers map with a dark theme
- Sets up event listeners
- Loads initial markers

#### `applyFilters()`
- Applies all active filters to location data
- Runs real-time without reload
- Updates visible markers and list

#### `loadMapMarkers()`
- Fetches data for current map center
- Loads locations from the server and renders them on the map
- Calls `applyFilters()` to update display

#### `showInfoWindow(location, marker)`
- Creates custom HTML info window
- Includes all location details
- Manages verification toggle

#### `submitLocationRating(locationId, rating)`
- Upserts the current session rating for a place
- Updates the cached average rating
- Stores one rating per session in Convex

## 📱 Browser Compatibility

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

## 🚫 Known Limitations

1. **Empty Backend**: If Convex has no locations yet, the map will appear empty
   - Add data through the admin panel or seed your Convex database once before launch

2. **Session-Based Verification**: Resets on page reload
   - To persist: Keep it in Convex or another backend store only

3. **Placeholder Video URLs**: Some entries still link to search queries instead of canonical media URLs
   - Replace them with owned or curated video URLs for production use

4. **Admin Access Is Not Authenticated Yet**: Write endpoints are public right now
   - Add proper auth before exposing the admin panel outside trusted environments

## 🔐 API Key Security

⚠️ **Important**: In production:
- Never commit API keys to version control
- Use environment variables
- Implement API key restrictions in Google Cloud Console
- Use backend proxy for API calls

## 🚀 Future Enhancement Ideas

1. **Backend Integration**
   - Server-side location storage and moderation
   - User authentication for admin writes
   - Data persistence in Convex

2. **Advanced Features**
   - User-generated reviews
   - Photo gallery for locations
   - Route planning
   - Saved favorites
   - Real-time notification system
   - Social sharing integration

3. **Performance**
   - Clustering for many markers
   - Lazy loading of location data
   - PWA capabilities
   - Service workers for offline access

4. **Analytics**
   - Track popular filters
   - User engagement metrics
   - Location visit tracking

## 📄 License

Free to use and modify for personal/educational projects.

## 💬 Support

For issues or questions about the implementation, review the inline code comments in `app.js` and `index.html`.

---

**Built with ❤️ - Enjoy discovering trending vibes! 🎉**
