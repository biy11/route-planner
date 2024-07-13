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

    const waypoints = locations.map(loc => `${loc.lat},${loc.lng}`).join('|');
    const origin = `${currentLoc.lat},${currentLoc.lng}`;
    const destination = waypoints.split('|').pop();

    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=driving`;

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
