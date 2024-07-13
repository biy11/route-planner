import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public')); // Serve the HTML file

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

app.post('/calculate-route', async (req, res) => {
    const { currentLocation, addresses } = req.body;

    // Geocode addresses
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

        const waypoints = locations.map(loc => `${loc.lat},${loc.lng}`).join('|');
        const origin = `${currentLoc.lat},${currentLoc.lng}`;
        const destination = waypoints.split('|').pop();

        const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=driving`;

        res.json({ googleMapsUrl });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

