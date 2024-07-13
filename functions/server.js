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
    const destination = `${currentLoc.lat},${currentLoc.lng}`; // Loop back to origin

    // Use Directions API to get the optimized order
    const waypoints = locations.map(loc => `${loc.lat},${loc.lng}`).join('|');
    const directionsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&waypoints=optimize:true|${waypoints}&key=${GOOGLE_API_KEY}`;
    console.log('Directions API URL:', directionsUrl); // Log the URL for debugging

    const directionsResponse = await fetch(directionsUrl);
    const directionsData = await directionsResponse.json();
    console.log('Directions API Response:', directionsData); // Log the response for debugging

    if (directionsData.status !== 'OK') {
      throw new Error(`Directions API failed: ${directionsData.error_message}`);
    }

    const optimizedOrder = directionsData.routes[0].waypoint_order;
    console.log('Optimized Order:', optimizedOrder);

    // Rearrange waypoints according to the optimized order
    const optimizedWaypoints = optimizedOrder.map(index => locations[index]);
    const optimizedWaypointsStr = optimizedWaypoints.map(loc => `${loc.lat},${loc.lng}`).join('|');

    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${optimizedWaypointsStr}&travelmode=driving`;

    console.log('Google Maps URL:', googleMapsUrl);

    return {
      statusCode: 200,
      body: JSON.stringify({ googleMapsUrl })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
