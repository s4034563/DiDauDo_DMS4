# VibeMap - Quick Start Guide

## ⚡ 30-Second Setup

### 1️⃣ Open the app

Double-click `index.html` in Windows Explorer or drag it into your browser.

### 2️⃣ Explore the map

- Use the sidebar filters to narrow results
- Click a marker to open the custom location popup

---

## 🎯 Feature Quick Tour

| Feature | How to Use |
|---------|-----------|
| **Find Trends** | Use the search and filters in the sidebar to narrow results |
| **Filter by Area** | Use the proximity slider (1-50 km) and location filters |
| **Find Vibes** | Click the emoji chips: 🎊, 🛋️, 💎, etc. |
| **View Details** | Click any marker to see the popup |
| **Rate Place** | Click a star in the place details panel |
| **Browse Nearby** | Use proximity slider (1-50 km) |
| **Clear Everything** | Hit "Clear All Filters" button |

---

## 🗂️ File Structure

```
DMS4_A2/
├── index.html          ← Main app (open this!)
├── app.js              ← All the logic
├── README.md           ← Full documentation
└── QUICK_START.md      ← This file
```

---

## 🎨 What You're Getting

### ✨ Visual Features
- Dark mode interface with neon purple/cyan theme
- Glassmorphic floating sidebar
- Smooth animations and transitions
- OpenLayers map with OpenStreetMap tiles
   - Simple mention counts are shown where applicable

### 🔍 Smart Filtering
- **Proximity**: 1-50 km range slider
- **Venue Types**: Dining, Coffee, Entertainment, Sightseeing
- **Vibes**: 6 different mood categories
- **Social Momentum**: Removed in this version
- **Real-time**: All filters apply instantly

### 📍 Interactive Map
- Click markers to see details
- Click locations in sidebar to pan
- 8 pre-loaded locations
- Custom neon markers with glow effect

### 📊 Location Data
- 8 realistic location objects
- AI-tagged vibes
- Video URL links
- Curator's choice indicators

---

## 💡 Pro Tips

1. **Test Filters Individually**
   - Start with proximity slider
   - Then add venue type filter
   - Notice instant updates

2. **Realtime Trends** (deprecated)
   - Social-momentum based realtime filters were removed in this version

3. **Combine Vibes**
   - Click multiple vibe chips
   - See how results update dynamically

4. **Verify Locations**
   - Click the star rating in place details
   - Watch counter increment in same session

5. **Explore the Code**
   - `getSocialData()` generates mock locations
   - `applyFilters()` handles all filtering logic
   - `showInfoWindow()` creates detail overlays

---

## 🐛 Troubleshooting

### "The map isn't showing"
- ✅ Check that you have internet access for OpenStreetMap tiles and the OpenLayers CDN
- ✅ Open the browser console for errors (F12)
- ⚠️ Without tiles, the sidebar and filtering logic still work

### "Markers disappeared"
- This is normal! Markers update when:
  - You adjust filters
  - You interact with the map
  - You click a location in the sidebar

### "Popups not opening"
- Make sure you clicked directly on a marker
- Try scrolling the sidebar down first
- Check browser console for errors

### "Filters aren't working"
- Clear all filters first (reset state)
- Try refreshing the page
- Check that checkboxes are actually checked

---

## 📈 Customize the Experience

### Add More Locations
Edit `getSocialData()` in `app.js`:
```javascript
{
    id: 'loc_009',
    name: 'Your Location Name',
    type: 'Dining',
    lat: 40.7100,
    lng: -74.0100,
   caption: 'Your caption here',
   seedVibes: ['Industrial', 'Instagrammable'],
   videoURL: 'https://tiktok.com/...',
   address: 'Your address here'
    caption: 'Your caption here',
    seedVibes: ['Industrial', 'Instagrammable'],
    videoURL: 'https://tiktok.com/...',
    address: 'Your address here'
}
```

### Change Default Location
In `app.js`, find this line:
```javascript
let currentMapCenter = { lat: 40.7128, lng: -74.0060 }; // New York
```

Change to your city:
- **Los Angeles**: `{ lat: 34.0522, lng: -118.2437 }`
- **London**: `{ lat: 51.5074, lng: -0.1278 }`
- **Tokyo**: `{ lat: 35.6762, lng: 139.6503 }`

### Update Colors
In `index.html` `<style>` section:
```css
.neon-purple: '#c084fc'  /* Change purple */
.neon-cyan: '#06b6d4'    /* Change cyan */
```

---

## 🚀 Next Steps (Going Live)

1. **Add Real Data Backend**
   - Keep location data server-backed in Convex
   - Integrate social platform APIs only through a compliant backend pipeline
   - Add authenticated admin writes before production launch

2. **Add Persistence**
   - Use backend storage for favorites and admin edits
   - Add user authentication
   - Keep verification counts in the database

3. **Deploy**
   - Host on Vercel, Netlify, or GitHub Pages
   - Keep backend on Heroku or AWS
   - Use environment variables for API keys

4. **Optimize**
   - Add marker clustering for many locations
   - Lazy-load images
   - Implement PWA for offline access

---

## 📚 Resources

- **OpenLayers Docs**: https://openlayers.org/
- **OpenStreetMap**: https://www.openstreetmap.org/
- **Tailwind CSS**: https://tailwindcss.com/docs
- **MDN JavaScript**: https://developer.mozilla.org/en-US/docs/Web/JavaScript

---

## ✅ Checklist

- [ ] Downloaded files (index.html, app.js, README.md)
- [ ] Opened index.html in browser
- [ ] Can see the map
- [ ] Can click markers
- [ ] Can use filters
- [ ] Ready to customize!

---

**You're all set! Start exploring trending vibes! 🎉**

Have fun with VibeMap! If you need help, check the README.md for detailed documentation.
