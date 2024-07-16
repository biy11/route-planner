async function loadGoogleMapsApi() {
    try {
        const response = await fetch('/.netlify/functions/get-google-api-key');
        if (!response.ok) {
            throw new Error('Failed to fetch API key');
        }
        const apiKey = await response.text();
        console.log('Fetched API Key');

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        document.head.appendChild(script);

        script.onload = () => {
            initializeAutocomplete();
        };

        script.onerror = () => {
            console.error('Error loading Google Maps script');
        };

        // Store API key globally for use in locateMe function
        window.googleApiKey = apiKey;
    } catch (error) {
        console.error('Error fetching Google API key:', error);
    }
}

function initializeAutocomplete() {
    const autocompleteInputs = document.getElementsByClassName('autocomplete-address');
    for (let i = 0; i < autocompleteInputs.length; i++) {
        new google.maps.places.Autocomplete(autocompleteInputs[i]);
    }
    new google.maps.places.Autocomplete(document.getElementById('current-location'));
    new google.maps.places.Autocomplete(document.getElementById('final-destination'));
}

function addAddressField() {
    const container = document.getElementById('addresses-container');
    const addressGroups = container.getElementsByClassName('address-group');
    const newIndex = addressGroups.length + 1;

    const newAddressGroup = document.createElement('div');
    newAddressGroup.classList.add('form-group', 'address-group');
    newAddressGroup.innerHTML = `
        <label for="address-${newIndex}">Address ${newIndex}:</label>
        <input type="text" id="address-${newIndex}" name="address-${newIndex}" class="form-control autocomplete-address">
        <label for="time-${newIndex}">Delivery Time Constraint (HH:MM, leave blank if none):</label>
        <input type="time" id="time-${newIndex}" name="time-${newIndex}" class="form-control">
    `;

    container.appendChild(newAddressGroup);

    // Initialize autocomplete for the new address field
    new google.maps.places.Autocomplete(newAddressGroup.querySelector('.autocomplete-address'));
}

function locateMe() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${window.googleApiKey}`;
            const response = await fetch(geocodeUrl);
            const data = await response.json();
            if (data.results && data.results.length > 0) {
                document.getElementById('current-location').value = data.results[0].formatted_address;
            } else {
                alert('Unable to determine your location.');
            }
        }, (error) => {
            console.error('Error occurred while retrieving location:', error);
            alert('Error occurred while retrieving location.');
        });
    } else {
        alert('Geolocation is not supported by this browser.');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    loadGoogleMapsApi();

    document.getElementById('add-address').addEventListener('click', addAddressField);
    document.getElementById('locate-me').addEventListener('click', locateMe);

    document.getElementById('same-as-start').addEventListener('change', function() {
        const finalDestinationGroup = document.getElementById('final-destination-group');
        if (this.checked) {
            finalDestinationGroup.style.display = 'none';
        } else {
            finalDestinationGroup.style.display = 'block';
        }
    });

    document.getElementById('route-form').addEventListener('submit', async function(event) {
        event.preventDefault();
        document.getElementById('loading').style.display = 'block'; // Show spinner
        document.getElementById('result').innerHTML = '';

        const currentLocation = document.getElementById('current-location').value;
        const addresses = [];
        const addressInputs = document.getElementsByClassName('autocomplete-address');
        const timeInputs = document.querySelectorAll('input[type="time"]');
        for (let i = 0; i < addressInputs.length; i++) {
            if (addressInputs[i].value && addressInputs[i].id !== 'final-destination') {
                addresses.push({
                    address: addressInputs[i].value,
                    time: timeInputs[i].value || null
                });
            }
        }

        let finalDestination;
        if (document.getElementById('same-as-start').checked) {
            finalDestination = currentLocation;
        } else {
            finalDestination = document.getElementById('final-destination').value;
        }

        // Include final destination separately
        const routeData = {
            currentLocation,
            addresses,
            finalDestination
        };

        try {
            const response = await fetch('/.netlify/functions/server', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(routeData),
            });

            const result = await response.json();
            document.getElementById('result').innerHTML = `<a href="${result.googleMapsUrl}" target="_blank">Open Route in Google Maps</a>`;
        } catch (error) {
            document.getElementById('result').innerHTML = `<p class="text-danger">Error: ${error.message}</p>`;
        } finally {
            document.getElementById('loading').style.display = 'none'; // Hide spinner
        }
    });
});
