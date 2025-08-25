// Global variable to store routes data
let routesData = null;

// Load routes data and generate HTML
window.addEventListener('DOMContentLoaded', function() {
    loadRoutesData();
});

async function loadRoutesData() {
    try {
        const response = await fetch('routes-data.json');
        const data = await response.json();
        routesData = data.routes; // Store for map initialization
        generateRouteCards(data.routes);
        
        // Initialize maps after routes are generated
        if (typeof L !== 'undefined' && !window.location.href.includes('claude.ai')) {
            initializeMapsFromData();
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


function initializeMapsFromData() {
    console.log('Initializing maps from data...');
    
    if (!routesData) {
        console.error('No routes data available');
        return;
    }
    
    routesData.forEach(route => {
        const mapElement = document.getElementById(`map${route.number}`);
        if (mapElement) {
            mapElement.innerHTML = '';
            
            // Get coordinates from timeline or route array
            let routeCoords = [];
            if (route.timeline) {
                route.timeline.forEach(item => {
                    if (item.coords) {
                        routeCoords.push(item.coords);
                    }
                });
            }
            
            // Fallback to route array if no timeline coords
            if (routeCoords.length === 0 && route.route) {
                routeCoords = route.route;
            }
            
            // Skip if no coordinates available
            if (routeCoords.length === 0) {
                console.warn(`No coordinates for route ${route.number}`);
                return;
            }
            
            // Create map
            const map = L.map(`map${route.number}`, {
                center: route.center || routeCoords[0],
                zoom: route.zoom || 14,
                zoomControl: false
            });
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap'
            }).addTo(map);
            
            // Add route line
            const polyline = L.polyline(routeCoords, {
                color: route.region === 'rioja' ? '#667eea' : 
                       route.region === 'costa-brava' ? '#2ecc71' :
                       route.region === 'penedes' ? '#f1c40f' : '#3498db',
                weight: 4,
                opacity: 0.7,
                smoothFactor: 1
            }).addTo(map);
            
            // Add markers from timeline
            if (route.timeline) {
                route.timeline.forEach((item, index) => {
                    if (item.coords && item.place) {
                        const isStartEnd = index === 0 || index === route.timeline.length - 1;
                        L.marker(item.coords, {
                            title: item.place
                        }).addTo(map)
                        .bindPopup(`<b>${item.place}</b><br>${item.time}: ${item.activity}`);
                    }
                });
            } else if (route.markers) {
                // Fallback to old markers format
                route.markers.forEach(marker => {
                    L.marker(marker.coords, {
                        title: marker.title
                    }).addTo(map)
                    .bindPopup(marker.popup);
                });
            }
            
            // Fit map to route
            map.fitBounds(polyline.getBounds());
        }
    });
}

