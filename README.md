# Spanish Wine & Beach Trails

Interactive map and guide for hiking trails in La Rioja, Tarragona, Costa Brava, and Penedès regions of Spain.

🌐 **Live Site**: [https://spanish-hikes.netlify.app/](https://spanish-hikes.netlify.app/)

## Features

- 10 curated hiking routes across 4 Spanish regions
- Interactive maps with Leaflet.js
- Google Maps walking directions integration
- Winery and restaurant recommendations
- Responsive design for mobile and desktop

## Regions Covered

- **La Rioja**: Wine country trails through medieval villages
- **Tarragona**: Coastal paths and Roman heritage sites  
- **Costa Brava**: Cliff-top trails and hidden coves
- **Penedès**: Cava cellars and vineyard walks

## Deployment

The site is automatically deployed to Netlify on every push to the `main` branch:
- Production URL: https://spanish-hikes.netlify.app/
- Auto-deploys: Enabled for `main` branch

## Local Development

1. Clone the repository:
   ```bash
   git clone git@github.com:extensa-io/spanish-hikes.git
   cd spanish-hikes
   ```
2. Serve the files with a local HTTP server:
   ```bash
   python3 -m http.server 8000
   ```
3. Open http://localhost:8000/src in your browser

## Technologies

- HTML5/CSS3
- Vanilla JavaScript
- Leaflet.js for interactive maps
- Google Maps API for walking directions