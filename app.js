// Initialize the map
const map = L.map('map').setView([23.475723, 120.900065], 13);

// Add OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Initialize 3D scene
let scene, camera, renderer, controls;
let track3D = null;
let terrain3D = null;

// DOM elements
const fileInput = document.getElementById('gpxFile');
const sampleBtn = document.getElementById('sampleBtn');
const trackDetails = document.getElementById('trackDetails');
const mapViewBtn = document.getElementById('mapViewBtn');
const map3dViewBtn = document.getElementById('map3dViewBtn');
const mapContainer = document.getElementById('map');
const map3dContainer = document.getElementById('map3d');

let currentTrack = null;
let trackLayer = null;

// Initialize 3D view
function init3D() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    
    // Create camera
    camera = new THREE.PerspectiveCamera(75, map3dContainer.clientWidth / map3dContainer.clientHeight, 0.1, 10000);
    camera.position.set(0, 1000, 1500);
    
    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(map3dContainer.clientWidth, map3dContainer.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    map3dContainer.appendChild(renderer.domElement);
    
    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
    
    // Add orbit controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 100;
    controls.maxDistance = 5000;
    
    // Add grid helper
    const gridHelper = new THREE.GridHelper(2000, 20, 0x444444, 0x222222);
    scene.add(gridHelper);
    
    // Add axes helper
    const axesHelper = new THREE.AxesHelper(500);
    scene.add(axesHelper);
    
    // Handle window resize
    window.addEventListener('resize', onWindowResize);
    
    // Start animation loop
    animate();
}

// Handle window resize
function onWindowResize() {
    if (renderer) {
        camera.aspect = map3dContainer.clientWidth / map3dContainer.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(map3dContainer.clientWidth, map3dContainer.clientHeight);
    }
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    if (controls) {
        controls.update();
    }
    
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

// Toggle between map and 3D view
mapViewBtn.addEventListener('click', () => {
    mapContainer.classList.remove('hidden');
    map3dContainer.classList.add('hidden');
    mapViewBtn.classList.add('active');
    map3dViewBtn.classList.remove('active');
});

map3dViewBtn.addEventListener('click', () => {
    mapContainer.classList.add('hidden');
    map3dContainer.classList.remove('hidden');
    mapViewBtn.classList.remove('active');
    map3dViewBtn.classList.add('active');
    
    // Initialize 3D view if not already done
    if (!scene) {
        init3D();
    }
    
    // Update 3D view with current track if available
    if (currentTrack) {
        update3DView();
    }
});

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
        
        // Clear previous markers
        if (window.trackMarkers) {
            window.trackMarkers.forEach(marker => map.removeLayer(marker));
        }
        window.trackMarkers = [];
        
        // Parse GPX using DOMParser
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(gpxContent, "text/xml");
        
        // Extract track points
        const trackPoints = [];
        const trkpts = xmlDoc.querySelectorAll('trkpt');
        
        // Get start time for elapsed time calculation
        let startTime = null;
        if (trkpts.length > 0 && trkpts[0].querySelector('time')) {
            startTime = new Date(trkpts[0].querySelector('time').textContent);
        }
        
        trkpts.forEach(trkpt => {
            const lat = parseFloat(trkpt.getAttribute('lat'));
            const lon = parseFloat(trkpt.getAttribute('lon'));
            const ele = trkpt.querySelector('ele') ? parseFloat(trkpt.querySelector('ele').textContent) : null;
            const time = trkpt.querySelector('time') ? trkpt.querySelector('time').textContent : null;
            
            // Calculate elapsed time in minutes
            let elapsedMinutes = null;
            if (time && startTime) {
                const pointTime = new Date(time);
                elapsedMinutes = Math.round((pointTime - startTime) / 60000); // Convert milliseconds to minutes
            }
            
            trackPoints.push({
                lat: lat,
                lng: lon,
                ele: ele,
                time: time,
                elapsed: elapsedMinutes
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
        
        // Add markers at regular intervals for mouseover interaction
        const markerInterval = Math.max(1, Math.floor(trackPoints.length / 50)); // Show ~50 markers
        for (let i = 0; i < trackPoints.length; i += markerInterval) {
            const point = trackPoints[i];
            if (point.time) {
                const marker = L.circleMarker([point.lat, point.lng], {
                    radius: 0,
                    opacity: 0,
                    fillOpacity: 0
                }).addTo(map);
                
                // Format time for display
                const timeStr = new Date(point.time).toLocaleString();
                const elapsedStr = point.elapsed !== null ? `${point.elapsed} min` : 'N/A';
                
                marker.bindTooltip(`
                    <div class="time-tooltip">
                        <div><strong>Time:</strong> ${timeStr}</div>
                        <div><strong>Elapsed:</strong> ${elapsedStr}</div>
                    </div>
                `, {
                    direction: 'top',
                    permanent: false,
                    sticky: true,
                    opacity: 0.9
                });
                
                window.trackMarkers.push(marker);
            }
        }
        
        // Fit map to track bounds
        map.fitBounds(trackLayer.getBounds());
        
        // Store current track data
        currentTrack = {
            name: xmlDoc.querySelector('name') ? xmlDoc.querySelector('name').textContent : 'Unnamed Track',
            points: trackPoints,
            length: trackPoints.length,
            startTime: startTime
        };
        
        // Display track information
        displayTrackInfo();
        
        // Update 3D view if it's currently active
        if (!map3dContainer.classList.contains('hidden')) {
            update3DView();
        }
        
    } catch (error) {
        console.error('Error parsing GPX:', error);
        alert('Error parsing GPX file. Please make sure it is a valid GPX file.');
    }
}

// Update 3D view with current track data
function update3DView() {
    if (!currentTrack || !scene) return;
    
    // Remove existing 3D track if present
    if (track3D) {
        scene.remove(track3D);
    }
    
    // Remove existing terrain if present
    if (terrain3D) {
        scene.remove(terrain3D);
    }
    
    // Create 3D track
    const points = currentTrack.points;
    
    // Find min/max values for scaling
    let minEle = Infinity;
    let maxEle = -Infinity;
    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;
    
    points.forEach(point => {
        if (point.ele !== null) {
            minEle = Math.min(minEle, point.ele);
            maxEle = Math.max(maxEle, point.ele);
        }
        minLat = Math.min(minLat, point.lat);
        maxLat = Math.max(maxLat, point.lat);
        minLng = Math.min(minLng, point.lng);
        maxLng = Math.max(maxLng, point.lng);
    });
    
    // Create 3D points
    const positions = [];
    const colors = [];
    
    // Color gradient from green (low) to red (high)
    const colorScale = (value, min, max) => {
        const ratio = (value - min) / (max - min || 1);
        return new THREE.Color(
            ratio, // Red component
            1 - ratio, // Green component
            0 // Blue component
        );
    };
    
    points.forEach(point => {
        // Convert lat/lng to 3D coordinates (simplified projection)
        const x = ((point.lng - minLng) / (maxLng - minLng || 1)) * 2000 - 1000;
        const z = ((point.lat - minLat) / (maxLat - minLat || 1)) * 2000 - 1000;
        const y = point.ele !== null ? ((point.ele - minEle) / (maxEle - minEle || 1)) * 500 : 0;
        
        positions.push(x, y, z);
        
        // Color based on elevation
        const color = point.ele !== null ? colorScale(point.ele, minEle, maxEle) : new THREE.Color(0xffffff);
        colors.push(color.r, color.g, color.b);
    });
    
    // Create buffer geometry
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    
    // Create line material with vertex colors
    const material = new THREE.LineBasicMaterial({
        vertexColors: true,
        linewidth: 2
    });
    
    // Create line and add to scene
    track3D = new THREE.Line(geometry, material);
    scene.add(track3D);
    
    // Position camera to view the entire track
    const centerX = 0;
    const centerY = 250;
    const centerZ = 0;
    camera.position.set(centerX, centerY, 1500);
    camera.lookAt(centerX, centerY, centerZ);
    controls.update();
}

// Display track information
function displayTrackInfo() {
    if (!currentTrack) return;
    
    // Calculate track statistics
    const stats = calculateTrackStats(currentTrack.points);
    
    // Generate elevation profile
    const elevationProfile = generateElevationProfile(currentTrack.points);
    
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
                <h4>Elevation Loss</h4>
                <p>${stats.elevationLoss.toFixed(0)} m</p>
            </div>
            <div class="detail-item">
                <h4>Max Elevation</h4>
                <p>${stats.maxElevation.toFixed(0)} m</p>
            </div>
            <div class="detail-item">
                <h4>Min Elevation</h4>
                <p>${stats.minElevation.toFixed(0)} m</p>
            </div>
            <div class="detail-item">
                <h4>Max Grade</h4>
                <p>${stats.maxGrade.toFixed(1)} %</p>
            </div>
            <div class="detail-item">
                <h4>Average Grade</h4>
                <p>${stats.avgGrade.toFixed(1)} %</p>
            </div>
            <div class="detail-item">
                <h4>Elevation Profile</h4>
                <div class="elevation-profile">${elevationProfile}</div>
            </div>
        </div>
    `;
}

// Calculate track statistics
function calculateTrackStats(points) {
    let distance = 0;
    let elevationGain = 0;
    let elevationLoss = 0;
    let maxElevation = -Infinity;
    let minElevation = Infinity;
    let maxGrade = 0;
    let totalGrade = 0;
    let gradeCount = 0;
    
    for (let i = 0; i < points.length; i++) {
        // Update elevation stats
        if (points[i].ele !== null) {
            maxElevation = Math.max(maxElevation, points[i].ele);
            minElevation = Math.min(minElevation, points[i].ele);
            
            // Calculate elevation gain/loss
            if (i > 0 && points[i-1].ele !== null) {
                const elevationDiff = points[i].ele - points[i-1].ele;
                if (elevationDiff > 0) {
                    elevationGain += elevationDiff;
                } else {
                    elevationLoss += Math.abs(elevationDiff);
                }
                
                // Calculate grade between points
                const segmentDistance = calculateDistance(
                    points[i-1].lat, points[i-1].lng,
                    points[i].lat, points[i].lng
                );
                
                // Only calculate grade if we have a meaningful distance
                if (segmentDistance > 0.01) {
                    const grade = (elevationDiff / (segmentDistance * 1000)) * 100; // Convert to percentage
                    maxGrade = Math.max(maxGrade, Math.abs(grade));
                    totalGrade += Math.abs(grade);
                    gradeCount++;
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
        elevationLoss: elevationLoss,
        maxElevation: maxElevation === -Infinity ? 0 : maxElevation,
        minElevation: minElevation === Infinity ? 0 : minElevation,
        maxGrade: maxGrade,
        avgGrade: gradeCount > 0 ? totalGrade / gradeCount : 0
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

// Generate elevation profile as a simple ASCII-style visualization
function generateElevationProfile(points) {
    // Filter points with elevation data
    const elevations = points
        .filter(point => point.ele !== null)
        .map(point => point.ele);
    
    if (elevations.length === 0) return 'No elevation data available';
    
    // Find min/max for scaling
    const maxEle = Math.max(...elevations);
    const minEle = Math.min(...elevations);
    const range = maxEle - minEle || 1; // Avoid division by zero
    
    // Create a simple visualization with 10 rows
    const rows = 10;
    const cols = Math.min(elevations.length, 50); // Limit columns for display
    const step = Math.max(1, Math.floor(elevations.length / cols));
    
    let profile = '<div class="elevation-chart">';
    
    // Create the elevation profile grid (from top to bottom)
    for (let row = 0; row < rows; row++) {
        profile += '<div class="elevation-row">';
        let rowHasPoint = false;
        
        for (let col = 0; col < cols; col++) {
            const idx = Math.min(col * step, elevations.length - 1);
            const elevation = elevations[idx];
            const normalized = (elevation - minEle) / range;
            // Row 0 is top, row 9 is bottom - so higher elevations should be at lower row numbers
            const targetRow = Math.round((1 - normalized) * (rows - 1));
            
            if (row === targetRow) {
                profile += '<span class="elevation-point">●</span>';
                rowHasPoint = true;
            } else {
                profile += '<span class="elevation-empty">·</span>';
            }
        }
        profile += '</div>';
    }
    
    // Add elevation scale
    profile += `
        <div class="elevation-scale">
            <span>${Math.round(maxEle)}m</span>
            <span style="float: right">${Math.round(minEle)}m</span>
        </div>
    `;
    
    profile += '</div>';
    return profile;
}

// Load sample file on page load
window.addEventListener('DOMContentLoaded', () => {
    // Add a small delay to ensure the map is fully initialized
    setTimeout(() => {
        loadSampleFile();
    }, 500);
});
