// Load routes data and generate HTML
window.addEventListener('DOMContentLoaded', function() {
    loadRoutesData();
});

async function loadRoutesData() {
    try {
        const response = await fetch('routes-data.json');
        const data = await response.json();
        generateRouteCards(data.routes);
        
        // Initialize maps after routes are generated
        if (typeof L !== 'undefined' && !window.location.href.includes('claude.ai')) {
            initializeMaps();
        }
    } catch (error) {
        console.error('Error loading routes data:', error);
    }
}

function generateRouteCards(routes) {
    const container = document.getElementById('routes-container');
    
    routes.forEach(route => {
        const routeCard = createRouteCard(route);
        container.appendChild(routeCard);
    });
}

function createGoogleMapsUrl(route) {
    // Start with the base Google Maps directions URL
    let url = 'https://www.google.com/maps/dir/?api=1';
    
    // Set travel mode to walking
    url += '&travelmode=walking';
    
    // Check if we have timeline with coords (new format)
    const timelineCoords = [];
    if (route.timeline) {
        route.timeline.forEach(item => {
            if (item.coords) {
                timelineCoords.push(item.coords);
            }
        });
    }
    
    // Use timeline coords if available, otherwise fall back to route array
    const routeCoords = timelineCoords.length > 0 ? timelineCoords : route.route;
    
    if (routeCoords && routeCoords.length > 0) {
        // First coordinate as origin
        url += `&origin=${routeCoords[0][0]},${routeCoords[0][1]}`;
        
        // Last coordinate as destination (check if it's circular route)
        const lastIdx = routeCoords.length - 1;
        const isCircular = routeCoords[0][0] === routeCoords[lastIdx][0] && 
                          routeCoords[0][1] === routeCoords[lastIdx][1];
        
        if (isCircular && routeCoords.length > 1) {
            // For circular routes, use the same point as destination
            url += `&destination=${routeCoords[0][0]},${routeCoords[0][1]}`;
        } else {
            url += `&destination=${routeCoords[lastIdx][0]},${routeCoords[lastIdx][1]}`;
        }
        
        // Add ALL intermediate points as waypoints (Google Maps allows up to 25 waypoints)
        if (routeCoords.length > 2) {
            const waypoints = [];
            const maxWaypoints = 23; // Google allows 25 total, minus origin and destination
            
            // For circular routes, exclude the duplicate end point
            const endIndex = isCircular ? routeCoords.length - 1 : routeCoords.length - 1;
            
            // Include all intermediate points
            for (let i = 1; i < endIndex; i++) {
                waypoints.push(`${routeCoords[i][0]},${routeCoords[i][1]}`);
                
                // Stop if we hit the waypoint limit
                if (waypoints.length >= maxWaypoints) {
                    console.warn(`Route ${route.number} has more than ${maxWaypoints} waypoints, truncating`);
                    break;
                }
            }
            
            if (waypoints.length > 0) {
                url += `&waypoints=${waypoints.join('|')}`;
            }
        }
    }
    
    console.log(`Route ${route.number} URL:`, url);
    return url;
}

function createRouteCard(route) {
    const card = document.createElement('div');
    card.className = 'route-card';
    
    const regionColors = {
        'rioja': 'rgba(102, 126, 234, 0.1); color: #667eea',
        'tarragona': 'rgba(52, 152, 219, 0.1); color: #3498db',
        'costa-brava': 'rgba(46, 204, 113, 0.1); color: #2ecc71',
        'penedes': 'rgba(241, 196, 15, 0.1); color: #f1c40f'
    };
    
    const regionNames = {
        'rioja': 'La Rioja',
        'tarragona': 'Tarragona',
        'costa-brava': 'Costa Brava',
        'penedes': 'Penedès'
    };
    
    const regionColor = regionColors[route.region] || regionColors['tarragona'];
    const regionName = regionNames[route.region] || route.region;
    
    const badges = [
        `<span class="badge" style="background: ${regionColor}; font-weight: 600;">${regionName}</span>`,
        `<span class="badge">${route.distance}</span>`,
        `<span class="badge">${route.duration}</span>`,
        `<span class="badge">${route.difficulty}</span>`
    ];
    
    // Add special badges
    if (route.specialBadges && route.specialBadges.length > 0) {
        route.specialBadges.forEach(badge => {
            badges.push(`<span class="badge">${badge}</span>`);
        });
    }
    
    // Create Google Maps URL with waypoints
    const googleMapsUrl = createGoogleMapsUrl(route);
    
    card.innerHTML = `
        <div class="route-header">
            <div>
                <span class="route-number">${route.number}</span>
                <span class="route-title">${route.title}</span>
            </div>
            <div class="route-badges">
                ${badges.join('\n                ')}
            </div>
        </div>
        
        <div class="map-container" id="map${route.number}">
            <div class="map-placeholder">
                <div>📍 ${route.location.name}</div>
                <div style="font-size: 0.85em; margin-top: 8px;">${route.location.lat.toFixed(4)}°N, ${Math.abs(route.location.lon).toFixed(4)}°${route.location.lon >= 0 ? 'E' : 'W'}</div>
            </div>
        </div>
        
        <div class="map-actions">
            <a href="${googleMapsUrl}" target="_blank" class="directions-button">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
                </svg>
                Get Walking Directions
            </a>
        </div>
        
        <div class="route-details">
            ${route.timeline ? createTimelineSection(route.timeline) : ''}
            ${route.highlights ? createHighlightsSection(route.highlights) : ''}
            ${route.wineries ? createWineriesSection(route.wineries) : ''}
            ${route.restaurants ? createRestaurantsSection(route.restaurants) : ''}
            ${route.description ? createDescriptionSection(route.description) : ''}
        </div>
    `;
    
    return card;
}

function createTimelineSection(timeline) {
    const timelineItems = timeline.map(item => `
        <div class="timeline-item">
            <span class="timeline-time">${item.time}</span>
            <span class="timeline-activity">${item.activity}</span>
        </div>
    `).join('');
    
    return `
        <div class="detail-section">
            <h4>Optimal Schedule</h4>
            <div class="timeline">
                ${timelineItems}
            </div>
        </div>
    `;
}

function createHighlightsSection(highlights) {
    return `
        <div class="detail-section">
            <h4>Route Highlights</h4>
            <p>${highlights}</p>
        </div>
    `;
}

function createWineriesSection(wineries) {
    const wineryItems = wineries.map(winery => `
        <div class="winery-item">
            <div class="winery-name">${winery.name}</div>
            <div class="winery-details">
                ${winery.details}
                <br><a href="tel:${winery.phone}" class="winery-phone">${winery.phone}</a>
            </div>
        </div>
    `).join('');
    
    return `
        <div class="detail-section">
            <h4>Wineries</h4>
            <div class="winery-list">
                ${wineryItems}
            </div>
        </div>
    `;
}

function createRestaurantsSection(restaurants) {
    const restaurantItems = restaurants.map(restaurant => `
        <div class="winery-item">
            <div class="winery-name">${restaurant.name}</div>
            <div class="winery-details">
                ${restaurant.details}
                <br><a href="tel:${restaurant.phone}" class="winery-phone">${restaurant.phone}</a>
            </div>
        </div>
    `).join('');
    
    return `
        <div class="detail-section">
            <h4>Hidden Restaurants</h4>
            <div class="winery-list">
                ${restaurantItems}
            </div>
        </div>
    `;
}

function createDescriptionSection(description) {
    return `
        <div class="detail-section">
            <h4>Optimal Schedule</h4>
            <p>${description}</p>
        </div>
    `;
}


function initializeMaps() {
    console.log('Initializing maps...');
    // Route 1: Briones
    const map1Element = document.getElementById('map1');
    if (map1Element) {
        map1Element.innerHTML = '';
        const map1 = L.map('map1', {
            center: [42.5456, -2.7850],
            zoom: 14,
            zoomControl: false
        });
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(map1);
        
        // Briones hiking route
        const brionesRoute = [
            [42.5456, -2.7850], // Start: Briones village
            [42.5440, -2.7820], // Descent point
            [42.5420, -2.7790], // Through village
            [42.5380, -2.7750], // Dinastía Vivanco
            [42.5350, -2.7700], // Vineyard path
            [42.5330, -2.7650], // Finca Valpiedra
            [42.5340, -2.7630], // Valley bottom
            [42.5380, -2.7680], // Valley views
            [42.5420, -2.7750], // Terrace path
            [42.5440, -2.7800], // Ascent back
            [42.5456, -2.7850]  // Return to Briones
        ];
        
        // Add route line
        const brionesPolyline = L.polyline(brionesRoute, {
            color: '#667eea',
            weight: 4,
            opacity: 0.7,
            smoothFactor: 1
        }).addTo(map1);
        
        // Add markers
        L.marker([42.5456, -2.7850], {title: 'Start/End'}).addTo(map1)
            .bindPopup('<b>Briones Village</b><br>Start/End point');
        L.marker([42.5380, -2.7750], {title: 'Winery'}).addTo(map1)
            .bindPopup('<b>Dinastía Vivanco</b><br>Wine Museum');
        L.marker([42.5330, -2.7650], {title: 'Winery'}).addTo(map1)
            .bindPopup('<b>Finca Valpiedra</b><br>Single Estate');
        
        // Fit map to route
        map1.fitBounds(brionesPolyline.getBounds());
    }
    
    // Route 2: San Vicente
    const map2Element = document.getElementById('map2');
    if (map2Element) {
        map2Element.innerHTML = '';
        const map2 = L.map('map2', {
            center: [42.5611, -2.7567],
            zoom: 14,
            zoomControl: false
        });
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(map2);
        
        // San Vicente route
        const sanVicenteRoute = [
            [42.5611, -2.7567], // San Vicente start
            [42.5620, -2.7560], // Village exit
            [42.5630, -2.7550], // Castle approach
            [42.5640, -2.7530], // Castle ruins
            [42.5635, -2.7510], // Ridge walk
            [42.5620, -2.7480], // Remelluri descent
            [42.5600, -2.7460], // Vineyard section
            [42.5580, -2.7450], // Lower vineyards
            [42.5560, -2.7470], // Turn toward river
            [42.5560, -2.7500], // Ebro River path
            [42.5570, -2.7520], // River walk
            [42.5580, -2.7540], // Return path
            [42.5600, -2.7560], // Final ascent
            [42.5611, -2.7567]  // Back to start
        ];
        
        const sanVicentePolyline = L.polyline(sanVicenteRoute, {
            color: '#667eea',
            weight: 4,
            opacity: 0.7,
            smoothFactor: 1
        }).addTo(map2);
        
        L.marker([42.5611, -2.7567], {title: 'Start/End'}).addTo(map2)
            .bindPopup('<b>San Vicente de la Sonsierra</b><br>Start/End');
        L.marker([42.5640, -2.7530], {title: 'Castle'}).addTo(map2)
            .bindPopup('<b>Castle Ruins</b><br>360° views');
        L.marker([42.5620, -2.7480], {title: 'Winery'}).addTo(map2)
            .bindPopup('<b>Remelluri</b><br>Exclusive bodega');
        
        map2.fitBounds(sanVicentePolyline.getBounds());
    }
    
    // Route 3: Nájera
    const map3Element = document.getElementById('map3');
    if (map3Element) {
        map3Element.innerHTML = '';
        const map3 = L.map('map3', {
            center: [42.4167, -2.7333],
            zoom: 13,
            zoomControl: false
        });
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(map3);
        
        const najeraRoute = [
            [42.4167, -2.7333], // Nájera start
            [42.4180, -2.7300], // Exit town
            [42.4180, -2.7280], // River path start
            [42.4190, -2.7250], // Along river
            [42.4200, -2.7230], // Monastery approach
            [42.4210, -2.7210], // Monastery visit
            [42.4230, -2.7180], // Vineyard ascent
            [42.4250, -2.7130], // High point
            [42.4240, -2.7110], // Tricio direction
            [42.4220, -2.7100], // Roman Basilica area
            [42.4200, -2.7120], // Loop back start
            [42.4180, -2.7150], // Return path
            [42.4160, -2.7200], // Farm tracks
            [42.4150, -2.7250], // Final approach
            [42.4160, -2.7300], // Back to town
            [42.4167, -2.7333]  // Return to Nájera
        ];
        
        const najeraPolyline = L.polyline(najeraRoute, {
            color: '#667eea',
            weight: 4,
            opacity: 0.7,
            smoothFactor: 1
        }).addTo(map3);
        
        L.marker([42.4167, -2.7333], {title: 'Start/End'}).addTo(map3)
            .bindPopup('<b>Nájera</b><br>Start/End');
        L.marker([42.4200, -2.7230], {title: 'Monastery'}).addTo(map3)
            .bindPopup('<b>Santa María la Real</b>');
        
        map3.fitBounds(najeraPolyline.getBounds());
    }
    
    // Route 4: Altafulla
    console.log('Initializing map4...');
    const map4Element = document.getElementById('map4');
    if (map4Element) {
        console.log('Map4 element found');
        map4Element.innerHTML = '';
        const map4 = L.map('map4', {
            center: [41.1350, 1.3850],
            zoom: 14,
            zoomControl: false
        });
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(map4);
        
        const altafullaRoute = [
            [41.1350, 1.3850],
            [41.1355, 1.3845],
            [41.1360, 1.3840],
            [41.1365, 1.3835],
            [41.1370, 1.3830],
            [41.1375, 1.3825],
            [41.1380, 1.3820],
            [41.1385, 1.3815],
            [41.1390, 1.3810],
            [41.1395, 1.3805],
            [41.1390, 1.3800],
            [41.1385, 1.3805],
            [41.1380, 1.3810],
            [41.1375, 1.3815],
            [41.1370, 1.3820],
            [41.1365, 1.3825],
            [41.1360, 1.3830],
            [41.1355, 1.3835],
            [41.1350, 1.3850]
        ];
        
        const altafullaPolyline = L.polyline(altafullaRoute, {
            color: '#3498db',
            weight: 4,
            opacity: 0.7,
            smoothFactor: 1
        }).addTo(map4);
        
        L.marker([41.1350, 1.3850], {title: 'Start/End'}).addTo(map4)
            .bindPopup('<b>Altafulla Beach</b><br>Start/End + Swimming');
        L.marker([41.1365, 1.3835], {title: 'Roman Site'}).addTo(map4)
            .bindPopup('<b>Villa dels Munts</b><br>Roman ruins');
        L.marker([41.1395, 1.3805], {title: 'Castle'}).addTo(map4)
            .bindPopup('<b>Tamarit Castle</b><br>Medieval castle');
        
        map4.fitBounds(altafullaPolyline.getBounds());
    }
    
    // Route 5: Falset
    const map5Element = document.getElementById('map5');
    if (map5Element) {
        map5Element.innerHTML = '';
        const map5 = L.map('map5', {
            center: [41.1467, 0.8206],
            zoom: 15,
            zoomControl: false
        });
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(map5);
        
        const falsetRoute = [
            [41.1467, 0.8206], // Falset start
            [41.1480, 0.8220], // Exit town
            [41.1490, 0.8250], // First vineyards
            [41.1510, 0.8270], // Ascent start
            [41.1520, 0.8280], // Wine cooperative
            [41.1540, 0.8290], // Upper vineyards
            [41.1550, 0.8300], // Montsant viewpoint
            [41.1545, 0.8320], // Ridge walk
            [41.1540, 0.8350], // High point
            [41.1520, 0.8340], // Descent start
            [41.1500, 0.8330], // Mid descent
            [41.1480, 0.8300], // Lower vineyards
            [41.1470, 0.8280], // Valley path
            [41.1460, 0.8240], // Return approach
            [41.1465, 0.8220], // Final stretch
            [41.1467, 0.8206]  // Back to Falset
        ];
        
        const falsetPolyline = L.polyline(falsetRoute, {
            color: '#3498db',
            weight: 4,
            opacity: 0.7,
            smoothFactor: 1
        }).addTo(map5);
        
        L.marker([41.1467, 0.8206], {title: 'Start/End'}).addTo(map5)
            .bindPopup('<b>Falset</b><br>Start/End');
        L.marker([41.1520, 0.8280], {title: 'Cooperative'}).addTo(map5)
            .bindPopup('<b>Wine Cooperative</b><br>Modernist building');
        L.marker([41.1550, 0.8300], {title: 'Viewpoint'}).addTo(map5)
            .bindPopup('<b>Montsant Views</b><br>Panoramic point');
        
        // Force explicit bounds for Falset
        map5.fitBounds([[41.146, 0.820], [41.155, 0.835]]);
    }
    
    // Route 6: Tarragona Roman - FIXED ZOOM ISSUE
    const map6Element = document.getElementById('map6');
    if (map6Element) {
        map6Element.innerHTML = '';
        const map6 = L.map('map6', {
            center: [41.1189, 1.2445],
            zoom: 14,
            zoomControl: false
        });
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(map6);
        
        const tarragonaRoute = [
            [41.1147, 1.2589], // Roman Amphitheatre
            [41.1160, 1.2570], // Along coast
            [41.1180, 1.2550], // City climb
            [41.1210, 1.2520], // Old town
            [41.1250, 1.2480], // Toward aqueduct
            [41.1290, 1.2440], // Country path
            [41.1320, 1.2400], // Pont del Diable
            [41.1310, 1.2380], // After aqueduct
            [41.1280, 1.2350], // Nulles direction
            [41.1250, 1.2360], // Vineyard entry
            [41.1230, 1.2380], // Through vines
            [41.1200, 1.2420], // Return path
            [41.1180, 1.2450], // Back to city
            [41.1160, 1.2500], // City approach
            [41.1150, 1.2550], // Mediterranean Balcony
            [41.1147, 1.2589]  // Return to start
        ];
        
        const tarragonaPolyline = L.polyline(tarragonaRoute, {
            color: '#3498db',
            weight: 4,
            opacity: 0.7,
            smoothFactor: 1
        }).addTo(map6);
        
        L.marker([41.1147, 1.2589], {title: 'Start/End'}).addTo(map6)
            .bindPopup('<b>Roman Amphitheatre</b><br>Start/End');
        L.marker([41.1320, 1.2400], {title: 'Aqueduct'}).addTo(map6)
            .bindPopup('<b>Pont del Diable</b><br>Roman aqueduct');
        
        // Force explicit bounds for Tarragona
        map6.fitBounds([[41.114, 1.240], [41.132, 1.260]]);
    }
    
    // Route 7: Costa Brava Cliffs
    const map7Element = document.getElementById('map7');
    if (map7Element) {
        map7Element.innerHTML = '';
        const map7 = L.map('map7', {
            center: [41.9574, 3.2108],
            zoom: 14,
            zoomControl: false
        });
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(map7);
        
        const costaBravaRoute = [
            [41.9574, 3.2108],
            [41.9580, 3.2120],
            [41.9590, 3.2140],
            [41.9610, 3.2180],
            [41.9630, 3.2200],
            [41.9650, 3.2220],
            [41.9660, 3.2240],
            [41.9670, 3.2260],
            [41.9675, 3.2280],
            [41.9680, 3.2300],
            [41.9685, 3.2320],
            [41.9690, 3.2340],
            [41.9574, 3.2108]
        ];
        
        const costaBravaPolyline = L.polyline(costaBravaRoute, {
            color: '#2ecc71',
            weight: 4,
            opacity: 0.7,
            smoothFactor: 1
        }).addTo(map7);
        
        L.marker([41.9574, 3.2108], {title: 'Start'}).addTo(map7)
            .bindPopup('<b>Begur Village</b><br>Medieval watchtowers');
        L.marker([41.9650, 3.2220], {title: 'Viewpoint'}).addTo(map7)
            .bindPopup('<b>Cala Aiguablava</b><br>Panoramic sea views');
        L.marker([41.9690, 3.2340], {title: 'Beach'}).addTo(map7)
            .bindPopup('<b>Sa Tuna Cove</b><br>Hidden fisherman\'s beach');
        
        map7.fitBounds(costaBravaPolyline.getBounds());
    }
    
    // Route 8: Sant Sadurní
    const map8Element = document.getElementById('map8');
    if (map8Element) {
        map8Element.innerHTML = '';
        const map8 = L.map('map8', {
            center: [41.4292, 1.7886],
            zoom: 14,
            zoomControl: false
        });
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(map8);
        
        const penedesRoute = [
            [41.4292, 1.7886],
            [41.4310, 1.7900],
            [41.4330, 1.7920],
            [41.4350, 1.7940],
            [41.4370, 1.7960],
            [41.4380, 1.7980],
            [41.4375, 1.8000],
            [41.4360, 1.8020],
            [41.4340, 1.8010],
            [41.4320, 1.7990],
            [41.4300, 1.7970],
            [41.4292, 1.7886]
        ];
        
        const penedesPolyline = L.polyline(penedesRoute, {
            color: '#f1c40f',
            weight: 4,
            opacity: 0.7,
            smoothFactor: 1
        }).addTo(map8);
        
        L.marker([41.4292, 1.7886], {title: 'Start'}).addTo(map8)
            .bindPopup('<b>Sant Sadurní Station</b><br>Capital of Cava');
        L.marker([41.4350, 1.7940], {title: 'Hidden Cellar'}).addTo(map8)
            .bindPopup('<b>Celler Bohigas</b><br>Family secret since 1924');
        L.marker([41.4380, 1.7980], {title: 'Underground'}).addTo(map8)
            .bindPopup('<b>Caves Sumarroca</b><br>Historic underground cellars');
        
        map8.fitBounds(penedesPolyline.getBounds());
    }
    
    // Route 9: Reus Modernist
    const map9Element = document.getElementById('map9');
    if (map9Element) {
        map9Element.innerHTML = '';
        const map9 = L.map('map9', {
            center: [41.1557, 1.1074],
            zoom: 14,
            zoomControl: false
        });
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(map9);
        
        const reusRoute = [
            [41.1557, 1.1074],
            [41.1570, 1.1080],
            [41.1580, 1.1090],
            [41.1590, 1.1100],
            [41.1600, 1.1110],
            [41.1610, 1.1120],
            [41.1605, 1.1130],
            [41.1595, 1.1125],
            [41.1585, 1.1115],
            [41.1575, 1.1105],
            [41.1565, 1.1090],
            [41.1557, 1.1074]
        ];
        
        const reusPolyline = L.polyline(reusRoute, {
            color: '#3498db',
            weight: 4,
            opacity: 0.7,
            smoothFactor: 1
        }).addTo(map9);
        
        L.marker([41.1557, 1.1074], {title: 'Start'}).addTo(map9)
            .bindPopup('<b>Gaudí Centre</b><br>Birth city of Antoni Gaudí');
        L.marker([41.1590, 1.1100], {title: 'Modernist'}).addTo(map9)
            .bindPopup('<b>Casa Navàs</b><br>Lluís Domènech i Montaner');
        L.marker([41.1610, 1.1120], {title: 'Vermouth'}).addTo(map9)
            .bindPopup('<b>Historic Vermouth Cellars</b><br>Traditional tastings');
        
        map9.fitBounds(reusPolyline.getBounds());
    }
    
    // Route 10: Naturist Beach
    const map10Element = document.getElementById('map10');
    if (map10Element) {
        map10Element.innerHTML = '';
        const map10 = L.map('map10', {
            center: [40.8780, 0.7985],
            zoom: 14,
            zoomControl: false
        });
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(map10);
        
        const naturistRoute = [
            [40.8839, 0.8025], // Start: L'Ametlla de Mar center
            [40.8825, 0.8015], // South along coast
            [40.8810, 0.8005], // Coastal path
            [40.8795, 0.7995], // Rocky coastline
            [40.8780, 0.7985], // Approaching Cala Llenya
            [40.8765, 0.7975], // Cala Llenya (red cliffs)
            [40.8750, 0.7965], // Continue south
            [40.8735, 0.7955], // Torrent del Pi approach
            [40.8720, 0.7945], // Platja del Torrent del Pi (naturist)
            [40.8725, 0.7950], // Natural lagoon area
            [40.8740, 0.7960], // Return path through pines
            [40.8755, 0.7970], // Coastal trail north
            [40.8770, 0.7980], // Back along cliffs
            [40.8785, 0.7990], // L'Estany Podrit area
            [40.8800, 0.8000], // GR-92 coastal trail
            [40.8815, 0.8010], // Final approach
            [40.8830, 0.8020], // Urban edge
            [40.8839, 0.8025]  // Return to start
        ];
        
        const naturistPolyline = L.polyline(naturistRoute, {
            color: '#3498db',
            weight: 4,
            opacity: 0.7,
            smoothFactor: 1
        }).addTo(map10);
        
        L.marker([40.8839, 0.8025], {title: 'Start/End'}).addTo(map10)
            .bindPopup('<b>L\'Ametlla de Mar</b><br>Start/End point');
        L.marker([40.8765, 0.7975], {title: 'Cove'}).addTo(map10)
            .bindPopup('<b>Cala Llenya</b><br>Red cliffs & pine forest');
        L.marker([40.8720, 0.7945], {title: 'Naturist Beach'}).addTo(map10)
            .bindPopup('<b>Platja del Torrent del Pi</b><br>Official naturist beach with lagoon');
        
        map10.fitBounds(naturistPolyline.getBounds());
    }
}