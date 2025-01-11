// Initialize socket connection
function initializeSocket() {
    socket = io(SOCKET_CONFIG.url, {
        ...SOCKET_CONFIG.options,
        query: {
            userId: document.getElementById("passengerId").value,
            type: "passenger",
        },
    });

    // Connection events
    socket.on("connect", () => {
        console.log("Socket connected successfully");
        console.log("Socket ID:", socket.id);
        console.log("Socket query params:", socket.handshake?.query);
    });

    socket.on("connect_error", (error) => {
        console.error("Socket connection error:", error);
    });

    socket.on("disconnect", (reason) => {
        console.log("Socket disconnected:", reason);
    });

    // Ride status events
    socket.on("ride_accepted", handleRideAccepted);
    socket.on("driver_arrived", handleDriverArrival);
    socket.on("trip_started", handleTripStart);
    socket.on("trip_completed", handleTripCompletion);
    socket.on("booking_timeout", handleBookingTimeout);
    socket.on("booking_started", handleBookingStarted);
    socket.on("driver:driverLocation", handleDriverLocationUpdate);
}

// Handle ride accepted event
async function handleRideAccepted(data) {
    console.log("Ride accepted:", data);
    currentTrip = data;
    stopCountdown();
    hideTimeoutModal();
    document.getElementById("cancelButton").style.display = "none";

    try {
        const response = await fetch(
            `${API_CONFIG.baseUrl}/driver/${data.driver_id}`
        );
        if (!response.ok) {
            throw new Error("Failed to fetch driver information");
        }
        const driverData = await response.json();
        if (driverData.status === "success") {
            const driver = driverData.payload;
            currentTrip.driver = driver;

            console.log("Driver data:", driver);
            updateDriverInfo(driver);
            showDriverDialog(driver);

            if (driverMarker) {
                const popupContent = createDriverInfoContent(driver);
                driverMarker.bindPopup(popupContent, {
                    maxWidth: 300,
                    className: "driver-popup",
                });
            }

            updateStatus(
                `Driver ${driver.name} has accepted your ride request`,
                "success"
            );
        }
    } catch (error) {
        console.error("Error fetching driver information:", error);
        updateStatus("Error getting driver information", "error");
        showTripNotification(
            "Error",
            "Could not get driver details. Please try refreshing the page."
        );
    }
}

// Handle driver arrival event
function handleDriverArrival(data) {
    console.log("Driver arrived at pickup location:", data);
    showTripNotification(
        "Driver Arrived",
        "Your driver has arrived at the pickup location. Please proceed to meet them."
    );
    updateTripStatus("Driver has arrived - Waiting to start trip");
    updateStatus("Driver has arrived at pickup location", "success");
}

// Handle trip start event
function handleTripStart(data) {
    console.log("Trip started event received:", data);
    tripStarted = true;
    showTripNotification(
        "Trip Started",
        "Your trip has started. Heading to the destination."
    );
    updateStatus("Trip has started - Heading to destination", "info");
    updateTripStatus("Trip in progress - Heading to destination");

    if (driverMarker) {
        const driverPos = driverMarker.getLatLng();
        passengerMarker.setLatLng(driverPos);
    }
}

// Handle trip completion event
function handleTripCompletion(data) {
    console.log("Trip completed event received:", data);
    tripStarted = false;
    currentTrip = null;

    showTripNotification(
        "Trip Completed",
        "You have reached your destination. Thank you for riding with us!"
    );
    updateStatus("Trip completed! Thank you for riding with us", "success");
    updateTripStatus("Trip completed");

    document.querySelector(".route-info").classList.remove("visible");
    if (driverMarker) {
        map.removeLayer(driverMarker);
        driverMarker = null;
    }
    if (routeControl) {
        map.removeControl(routeControl);
        routeControl = null;
    }

    passengerMarker.setLatLng(PICKUP_LOCATION);

    setTimeout(() => {
        showTripInfo(false);
        map.setView(PICKUP_LOCATION, 15);
    }, 5000);
}

// Handle booking timeout event
function handleBookingTimeout(data) {
    console.log("Booking timeout:", data);
    stopCountdown();
    showTimeoutModal();
    updateStatus("Booking timeout - No drivers available", "error");
}

// Handle booking started event
function handleBookingStarted(data) {
    console.log("Booking started:", data);
    currentRideRequestId = data.ride_request_id;
    startCountdown(data.timeout);
}

// Handle driver location update event
async function handleDriverLocationUpdate(data) {
    if (currentTrip && data.driverId === currentTrip.driver_id) {
        console.log("Driver location update:", data);
        updateDriverLocation(data.location);

        if (tripStarted && passengerMarker && driverMarker) {
            const driverPos = driverMarker.getLatLng();
            passengerMarker.setLatLng(driverPos);
        }

        let targetLocation;
        let startLocation;

        if (tripStarted) {
            startLocation = [
                currentTrip.pickup_location.coordinates[1],
                currentTrip.pickup_location.coordinates[0],
            ];
            targetLocation = [
                currentTrip.dropoff_location.coordinates[1],
                currentTrip.dropoff_location.coordinates[0],
            ];
        } else {
            startLocation = [
                data.location.coordinates[1],
                data.location.coordinates[0],
            ];
            targetLocation = [
                currentTrip.pickup_location.coordinates[1],
                currentTrip.pickup_location.coordinates[0],
            ];
        }

        const distance = await calculateDistance(startLocation, targetLocation);
        const eta = Math.round(distance / 500);
        const distanceKm = (distance / 1000).toFixed(1);

        const status = tripStarted
            ? "Heading to destination"
            : "Driver is on the way";
        const locationText = tripStarted ? "destination" : "pickup";
        updateTripStatus(
            `${status} - ${distanceKm}km away (ETA: ${eta} minutes to ${locationText})`
        );

        updateRouteInfo(distanceKm, eta);
    }
}
