// Initialize the map
const map = L.map('map').setView([23.475723, 120.900065], 13);

// Add OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

let currentTrack = null;
let trackLayer = null;

// DOM elements
const fileInput = document.getElementById('gpxFile');
const sampleBtn = document.getElementById('sampleBtn');
const trackDetails = document.getElementById('trackDetails');

// Event listeners
fileInput.addEventListener('change', handleFileUpload);
sampleBtn.addEventListener('click', loadSampleFile);

// Handle file upload
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const gpxContent = e.target.result;
        parseAndDisplayGPX(gpxContent);
    };
    reader.readAsText(file);
}

// Load sample file
function loadSampleFile() {
    fetch('yushan.gpx')
        .then(response => response.text())
        .then(gpxContent => {
            parseAndDisplayGPX(gpxContent);
        })
        .catch(error => {
            console.error('Error loading sample file:', error);
            alert('Error loading sample file. Please try uploading your own GPX file.');
        });
}

// Parse and display GPX data
function parseAndDisplayGPX(gpxContent) {
    try {
        // Clear previous track
        if (trackLayer) {
            map.removeLayer(trackLayer);
        }
        
        // Parse GPX using DOMParser
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(gpxContent, "text/xml");
        
        // Extract track points
        const trackPoints = [];
        const trkpts = xmlDoc.querySelectorAll('trkpt');
        
        trkpts.forEach(trkpt => {
            const lat = parseFloat(trkpt.getAttribute('lat'));
            const lon = parseFloat(trkpt.getAttribute('lon'));
            const ele = trkpt.querySelector('ele') ? parseFloat(trkpt.querySelector('ele').textContent) : null;
            const time = trkpt.querySelector('time') ? trkpt.querySelector('time').textContent : null;
            
            trackPoints.push({
                lat: lat,
                lng: lon,
                ele: ele,
                time: time
            });
        });
        
        if (trackPoints.length === 0) {
            throw new Error('No track points found in GPX file');
        }
        
        // Create polyline for the track
        trackLayer = L.polyline(trackPoints, {
            color: '#E834EC',
            weight: 4,
            opacity: 0.8
        }).addTo(map);
        
        // Fit map to track bounds
        map.fitBounds(trackLayer.getBounds());
        
        // Store current track data
        currentTrack = {
            name: xmlDoc.querySelector('name') ? xmlDoc.querySelector('name').textContent : 'Unnamed Track',
            points: trackPoints,
            length: trackPoints.length
        };
        
        // Display track information
        displayTrackInfo();
        
    } catch (error) {
        console.error('Error parsing GPX:', error);
        alert('Error parsing GPX file. Please make sure it is a valid GPX file.');
    }
}

// Display track information
function displayTrackInfo() {
    if (!currentTrack) return;
    
    // Calculate track statistics
    const stats = calculateTrackStats(currentTrack.points);
    
    trackDetails.innerHTML = `
        <div class="track-details">
            <div class="detail-item">
                <h4>Track Name</h4>
                <p>${currentTrack.name}</p>
            </div>
            <div class="detail-item">
                <h4>Points</h4>
                <p>${currentTrack.length}</p>
            </div>
            <div class="detail-item">
                <h4>Distance</h4>
                <p>${stats.distance.toFixed(2)} km</p>
            </div>
            <div class="detail-item">
                <h4>Elevation Gain</h4>
                <p>${stats.elevationGain.toFixed(0)} m</p>
            </div>
            <div class="detail-item">
                <h4>Max Elevation</h4>
                <p>${stats.maxElevation.toFixed(0)} m</p>
            </div>
            <div class="detail-item">
                <h4>Min Elevation</h4>
                <p>${stats.minElevation.toFixed(0)} m</p>
            </div>
        </div>
    `;
}

// Calculate track statistics
function calculateTrackStats(points) {
    let distance = 0;
    let elevationGain = 0;
    let maxElevation = -Infinity;
    let minElevation = Infinity;
    
    for (let i = 0; i < points.length; i++) {
        // Update elevation stats
        if (points[i].ele !== null) {
            maxElevation = Math.max(maxElevation, points[i].ele);
            minElevation = Math.min(minElevation, points[i].ele);
            
            // Calculate elevation gain
            if (i > 0 && points[i-1].ele !== null) {
                const elevationDiff = points[i].ele - points[i-1].ele;
                if (elevationDiff > 0) {
                    elevationGain += elevationDiff;
                }
            }
        }
        
        // Calculate distance
        if (i > 0) {
            distance += calculateDistance(
                points[i-1].lat, points[i-1].lng,
                points[i].lat, points[i].lng
            );
        }
    }
    
    return {
        distance: distance,
        elevationGain: elevationGain,
        maxElevation: maxElevation === -Infinity ? 0 : maxElevation,
        minElevation: minElevation === Infinity ? 0 : minElevation
    };
}

// Calculate distance between two points (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Load sample file on page load
window.addEventListener('DOMContentLoaded', () => {
    // Add a small delay to ensure the map is fully initialized
    setTimeout(() => {
        loadSampleFile();
    }, 500);
});