// Create custom icon for map markers
function createCustomIcon(emoji, className) {
    return L.divIcon({
        html: `<div class="custom-marker ${className}">${emoji}</div>`,
        className: "custom-marker-container",
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -40],
    });
}

// Initialize map
async function initMap() {
    try {
        const position = await getCurrentPosition();
        const { latitude, longitude } = position.coords;
        currentPassengerLocation = [longitude, latitude];
        PICKUP_LOCATION = [latitude, longitude];

        // Initialize map view
        map = L.map("map").setView(
            [latitude, longitude],
            MAP_CONFIG.initialZoom
        );
        L.tileLayer(MAP_CONFIG.tileLayerUrl).addTo(map);

        // Add pickup marker at current location
        pickupMarker = L.marker([latitude, longitude], {
            icon: createCustomIcon("📍", "pickup-marker"),
            title: "Pickup Location",
        }).addTo(map);
        pickupMarker.bindPopup("Pickup Location (Your Location)");

        // Add passenger marker
        passengerMarker = L.marker([latitude, longitude], {
            icon: createCustomIcon("👤", "passenger-marker"),
            title: "You",
        }).addTo(map);

        // Add click event to map for selecting dropoff location
        map.on("click", function (e) {
            if (!currentRideRequest) {
                setDropoffLocation([e.latlng.lat, e.latlng.lng]);
            }
        });

        // Start continuous location tracking
        startLocationTracking();
    } catch (error) {
        console.error("Error initializing map:", error);
        alert("Please enable location services to use this app");
    }
}

// Update driver location on map
function updateDriverLocation(location) {
    if (!location || !location.coordinates) {
        console.error("Invalid location data:", location);
        return;
    }

    const [longitude, latitude] = location.coordinates;
    console.log("Updating driver location:", { longitude, latitude });

    // Create or update driver marker
    if (!driverMarker) {
        driverMarker = L.marker([latitude, longitude], {
            icon: createCustomIcon("🚗", "driver-marker"),
        }).addTo(map);
    } else {
        driverMarker.setLatLng([latitude, longitude]);
    }

    // Update route based on trip status
    if (currentTrip) {
        const driverLatLng = [latitude, longitude];
        if (
            currentTrip.status === "pending" ||
            currentTrip.status === "waiting"
        ) {
            // Route to pickup location
            const pickupCoords = currentTrip.pickup_location.coordinates;
            updateRoute(driverLatLng, [pickupCoords[1], pickupCoords[0]]);
        } else if (currentTrip.status === "in_progress") {
            // Route to dropoff location
            const dropoffCoords = currentTrip.dropoff_location.coordinates;
            updateRoute(driverLatLng, [dropoffCoords[1], dropoffCoords[0]]);
        }
    }
}

// Update route on map
function updateRoute(start, end) {
    if (routeControl) {
        map.removeControl(routeControl);
    }

    console.log("Input coordinates:", { start, end });

    let startLatLng, endLatLng;

    if (Array.isArray(start)) {
        const [lng, lat] = start;
        startLatLng = L.latLng(lat, lng);
    } else {
        startLatLng = start;
    }

    if (Array.isArray(end)) {
        const [lng, lat] = end;
        endLatLng = L.latLng(lat, lng);
    } else {
        endLatLng = end;
    }

    console.log("Processed coordinates:", { startLatLng, endLatLng });

    if (!startLatLng || !endLatLng) {
        console.error("Invalid coordinates:", { startLatLng, endLatLng });
        return;
    }

    if (currentTrip && currentTrip.status === "in_progress") {
        const pickupCoords = currentTrip.pickup_location.coordinates;
        const dropoffCoords = currentTrip.dropoff_location.coordinates;
        startLatLng = L.latLng(pickupCoords[1], pickupCoords[0]);
        endLatLng = L.latLng(dropoffCoords[1], dropoffCoords[0]);
    }

    routeControl = L.Routing.control({
        waypoints: [startLatLng, endLatLng],
        router: L.Routing.osrmv1({
            serviceUrl: "https://router.project-osrm.org/route/v1",
            profile: "driving",
            geometryOnly: false,
        }),
        lineOptions: {
            styles: [{ color: "blue", opacity: 0.6, weight: 6 }],
        },
        addWaypoints: false,
        draggableWaypoints: false,
        fitSelectedRoutes: false,
        showAlternatives: false,
    }).addTo(map);

    routeControl.hide();
}

// Set dropoff location
function setDropoffLocation(coords) {
    DROPOFF_LOCATION = coords;

    if (dropoffMarker) {
        dropoffMarker.setLatLng(coords);
    } else {
        dropoffMarker = L.marker(coords, {
            icon: createCustomIcon("🏁", "dropoff-marker"),
            title: "Dropoff Location",
        }).addTo(map);
    }
    dropoffMarker.bindPopup("Điểm đến của bạn").openPopup();

    document.getElementById(
        "dropoffLocation"
    ).textContent = `Điểm đến: ${coords[0].toFixed(6)}, ${coords[1].toFixed(
        6
    )}`;
    document.getElementById("clearDropoffBtn").style.display = "block";
}

// Clear dropoff location
function clearDropoffLocation() {
    if (dropoffMarker) {
        map.removeLayer(dropoffMarker);
        dropoffMarker = null;
    }
    document.getElementById("dropoffLocation").textContent =
        "Chưa chọn điểm đến";
    document.getElementById("clearDropoffBtn").style.display = "none";
}

// Calculate distance between two points
async function calculateDistance(point1, point2) {
    try {
        // Format coordinates for OSRM API
        const from = `${point1[0]},${point1[1]}`; // lng,lat
        const to = `${point2[0]},${point2[1]}`; // lng,lat

        // Call OSRM Routing API
        const response = await fetch(
            `https://router.project-osrm.org/route/v1/driving/${from};${to}?overview=false`
        );

        if (!response.ok) {
            throw new Error("Failed to fetch route from Leaflet API");
        }

        const data = await response.json();

        // Extract distance in meters from response
        const distance = data.routes[0].distance;

        return distance;
    } catch (error) {
        console.error("Error calculating distance:", error);
        throw error;
    }
}

// Restore map state
function restoreMapState(trip) {
    if (trip.pickup_location) {
        const pickupCoords = trip.pickup_location.coordinates;
        if (!pickupMarker) {
            pickupMarker = L.marker([pickupCoords[1], pickupCoords[0]], {
                icon: createCustomIcon("🚶", "pickup-marker"),
            }).addTo(map);
        } else {
            pickupMarker.setLatLng([pickupCoords[1], pickupCoords[0]]);
        }
    }

    if (trip.dropoff_location) {
        const dropoffCoords = trip.dropoff_location.coordinates;
        if (!dropoffMarker) {
            dropoffMarker = L.marker([dropoffCoords[1], dropoffCoords[0]], {
                icon: createCustomIcon("🏁", "dropoff-marker"),
            }).addTo(map);
        } else {
            dropoffMarker.setLatLng([dropoffCoords[1], dropoffCoords[0]]);
        }
    }

    if (trip.driver && trip.driver.location) {
        updateDriverLocation(trip.driver.location);
    }

    const bounds = L.latLngBounds([]);
    if (pickupMarker) bounds.extend(pickupMarker.getLatLng());
    if (dropoffMarker) bounds.extend(dropoffMarker.getLatLng());
    if (driverMarker) bounds.extend(driverMarker.getLatLng());
    if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50] });
    }
}
