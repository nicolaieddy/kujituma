# Location Pin for Daily Check-Ins

## Overview

Add a location tagging feature to the daily check-in flow. When writing a check-in, the location of where this user is writing the update from should automatically show up (if they enable location as an option). capture their current GPS coordinates and city name. In the Analytics tab, a map visualizes all check-in locations, and the existing journal history table gains a "Location" column.

## User Experience

### Check-In Dialog

- Add a small **MapPin** icon button next to the journal/focus section in the check-in dialog
- Tapping it triggers the browser Geolocation API (`navigator.geolocation.getCurrentPosition`)
- While resolving, show a brief spinner on the button
- Once resolved, display a compact pill/badge showing the city/area name (e.g., "San Francisco, CA")
- Users can tap the pill to remove/change the location
- Reverse geocoding via a free API (OpenStreetMap Nominatim) converts lat/lng to a readable place name -- no API key needed

### Analytics - Map View

- New **CheckInLocationMap** component in the Analytics page, placed after the Mood/Energy Trends chart
- Uses an embedded map via **Leaflet** (free, open-source) with OpenStreetMap tiles
- Each check-in with location data renders as a marker on the map
- Marker popups show the date, mood emoji, and journal snippet
- Cluster nearby markers when zoomed out for cleanliness

### Analytics - Table Enhancement

- Add a "Location" column to the existing check-ins history table in `DailyCheckInsTab.tsx`
- Shows the city/location name for entries that have location data
- Location is also searchable via the existing search filter

## Technical Details

### 1. Database Migration

Add three nullable columns to `daily_check_ins`:

```sql
ALTER TABLE daily_check_ins
  ADD COLUMN location_lat DOUBLE PRECISION,
  ADD COLUMN location_lng DOUBLE PRECISION,
  ADD COLUMN location_name TEXT;
```

### 2. Type Updates

`**src/types/habits.ts**` -- add to `DailyCheckIn` and `CreateDailyCheckIn`:

- `location_lat?: number`
- `location_lng?: number`  
- `location_name?: string`

### 3. New Dependency

- **leaflet** + **react-leaflet** for the map component (free, no API key)

### 4. Check-In Dialog Changes (`DailyCheckInDialog.tsx`)

- Add state: `locationLat`, `locationLng`, `locationName`, `isLocating`
- Add a `MapPin` button in the journal section area
- On click: call `navigator.geolocation.getCurrentPosition`, then reverse geocode via `https://nominatim.openstreetmap.org/reverse?lat=...&lon=...&format=json`
- Display resolved location as a removable badge
- Pass location fields to `submitCheckIn()` call
- Persist location in draft (localStorage) so it survives dialog close/reopen
- Pre-populate from existing `todayCheckIn` if editing

### 5. Service Layer (`habitsService.ts`)

- No changes needed -- the `createOrUpdateCheckIn` method already spreads `standardFields` into the upsert, so new columns are included automatically as long as the type is updated.

### 6. New Map Component (`src/components/analytics/CheckInLocationMap.tsx`)

- Fetch all check-ins with location data
- Render a Leaflet map centered on the most recent location
- Place markers for each location-tagged check-in
- Marker popup: date, mood emoji, location name
- Responsive height (300px desktop, 250px mobile)
- Graceful empty state when no location data exists

### 7. Analytics Page (`Analytics.tsx`)

- Import and render `CheckInLocationMap` after `MoodEnergyTrendsChart`

### 8. Daily Check-Ins Table (`DailyCheckInsTab.tsx`)

- Add "Location" column with a `MapPin` icon and the `location_name` text
- Include `location_name` in the search filter logic

### Files to Create

- `src/components/analytics/CheckInLocationMap.tsx`

### Files to Modify

- `src/types/habits.ts` (add location fields)
- `src/components/habits/DailyCheckInDialog.tsx` (add location pin button + logic)
- `src/components/rituals/DailyCheckInsTab.tsx` (add Location column to table)
- `src/pages/Analytics.tsx` (add map component)
- Database migration (3 new columns)