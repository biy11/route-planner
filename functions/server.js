const fetch = require('node-fetch');
const dotenv = require('dotenv');

dotenv.config();

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

exports.handler = async (event) => {
  const { currentLocation, addresses } = JSON.parse(event.body);

  const geocodeAddress = async (address) => {
    const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_API_KEY}`);
    const data = await response.json();
    if (data.results && data.results.length > 0) {
      return data.results[0].geometry.location;
    }
    throw new Error('Geocoding failed');
  };

  try {
    const locations = await Promise.all(addresses.map(address => geocodeAddress(address)));
    const currentLoc = await geocodeAddress(currentLocation);

    console.log('Current Location:', currentLoc);
    console.log('Locations:', locations);

    const origin = `${currentLoc.lat},${currentLoc.lng}`;
    const destination = `${locations[locations.length - 1].lat},${locations[locations.length - 1].lng}`;

    // Use Routes API to get the optimized order
    const routesUrl = `https://routes.googleapis.com/directions/v2:computeRoutes?key=${GOOGLE_API_KEY}`;
    const routesBody = {
      origin: {
        location: {
          latLng: {
            latitude: currentLoc.lat,
            longitude: currentLoc.lng,
          },
        },
      },
      destination: {
        location: {
          latLng: {
            latitude: locations[locations.length - 1].lat,
            longitude: locations[locations.length - 1].lng,
          },
        },
      },
      intermediates: locations.slice(0, -1).map(loc => ({
        location: {
          latLng: {
            latitude: loc.lat,
            longitude: loc.lng,
          },
        },
      })),
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_AWARE',
      computeAlternativeRoutes: false,
      routeModifiers: {
        avoidTolls: false,
        avoidHighways: false,
        avoidFerries: false
      },
      languageCode: 'en-US',
      units: 'IMPERIAL'
    };

    const routesResponse = await fetch(routesUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-FieldMask': 'routes.legs.start_location,routes.legs.end_location,routes.legs.steps', // Specify the fields you need
      },
      body: JSON.stringify(routesBody),
    });

    const routesData = await routesResponse.json();
    console.log('Routes API Response:', routesData); // Log the response for debugging

    if (routesData.error) {
      throw new Error(`Routes API failed: ${routesData.error.message}`);
    }

    const route = routesData.routes && routesData.routes[0];
    if (!route) {
      throw new Error('No route found');
    }

    const waypointsOrder = route.waypoint_order || [];
    if (waypointsOrder.length === 0) {
      throw new Error('No waypoints found');
    }

    const optimizedWaypoints = waypointsOrder.map(index => locations[index]).map(loc => `${loc.lat},${loc.lng}`).join('|');
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${optimizedWaypoints}&travelmode=driving`;

    console.log('Google Maps URL:', googleMapsUrl);

    return {
      statusCode: 200,
      body: JSON.stringify({ googleMapsUrl }),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
