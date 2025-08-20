# GPX Visualizer

A simple web application to visualize GPX track files on an interactive map using Leaflet.js.

## Features

- Upload and visualize GPX files
- Automatic loading of a sample file (Yushan.gpx)
- Track statistics display (distance, elevation gain, max/min elevation)
- Responsive design that works on desktop and mobile devices

## Deployment to Cloudflare Pages

To deploy this application to Cloudflare Pages:

1. Push this repository to GitHub
2. Log in to your Cloudflare dashboard
3. Navigate to Workers & Pages > Create Application > Pages > Connect to Git
4. Select this repository
5. Configure the build settings:
   - Build command: `npm run build` (or leave empty as this is a static site)
   - Build output directory: `/`
   - Root directory: `/`
6. Click "Save and Deploy"

The application will automatically deploy and be available at your Cloudflare Pages URL.

## How it works

The application uses:
- Leaflet.js for map rendering
- OpenStreetMap as the map tile provider
- Client-side JavaScript to parse GPX files
- Automatically loads `yushan.gpx` on page load

## Files

- `index.html` - Main HTML structure
- `styles.css` - Styling for the application
- `app.js` - JavaScript logic for GPX parsing and map visualization
- `yushan.gpx` - Sample GPX file that loads automatically