// Check GPS permission status
async function checkGPSPermission() {
    try {
        const permissionStatus = await navigator.permissions.query({
            name: "geolocation",
        });
        return permissionStatus.state;
    } catch (error) {
        console.error("Error checking GPS permission:", error);
        return "denied";
    }
}

// Request GPS permission
async function requestGPSPermission() {
    try {
        const status = await checkGPSPermission();
        if (status === "granted") {
            updateGPSStatus("active");
            return true;
        }

        // Show permission request dialog
        showTripNotification(
            "Yêu cầu quyền truy cập",
            "Ứng dụng cần quyền truy cập vị trí của bạn để hoạt động. Vui lòng cho phép truy cập.",
            "info"
        );

        // Try to get position to trigger permission request
        const position = await getCurrentPosition();
        updateGPSStatus("active");
        return true;
    } catch (error) {
        console.error("Error requesting GPS permission:", error);
        updateGPSStatus("disabled");
        showTripNotification(
            "GPS không hoạt động",
            "Vui lòng bật GPS và cho phép truy cập vị trí để sử dụng ứng dụng.",
            "error"
        );
        return false;
    }
}

// Update GPS status display
function updateGPSStatus(status) {
    const statusDiv = document.getElementById("currentLocation");
    switch (status) {
        case "active":
            statusDiv.className = "status-badge bg-emerald-500";
            statusDiv.innerHTML =
                '<span class="mr-2">📍</span>GPS đang hoạt động';
            break;
        case "disabled":
            statusDiv.className = "status-badge bg-red-500";
            statusDiv.innerHTML =
                '<span class="mr-2">⚠️</span>GPS không hoạt động';
            break;
        case "searching":
            statusDiv.className = "status-badge bg-blue-500";
            statusDiv.innerHTML =
                '<span class="mr-2">🔄</span>Đang tìm vị trí...';
            break;
    }
}

// Get current position promise wrapper
function getCurrentPosition() {
    updateGPSStatus("searching");
    return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
        });
    });
}

// Start tracking passenger location
async function startLocationTracking() {
    try {
        const hasPermission = await requestGPSPermission();
        if (!hasPermission) {
            return;
        }

        const options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
        };

        watchId = navigator.geolocation.watchPosition(
            handleLocationUpdate,
            handleLocationError,
            options
        );
    } catch (error) {
        console.error("Error starting location tracking:", error);
        handleLocationError(error);
    }
}

// Handle location updates
function handleLocationUpdate(position) {
    const { latitude, longitude } = position.coords;
    currentPassengerLocation = [longitude, latitude];
    updateGPSStatus("active");

    // Update current location display
    document.getElementById(
        "currentLocation"
    ).innerHTML = `<span class="mr-2">📍</span>${latitude.toFixed(
        6
    )}, ${longitude.toFixed(6)}`;

    // Update passenger marker
    if (passengerMarker) {
        passengerMarker.setLatLng([latitude, longitude]);
    } else {
        passengerMarker = L.marker([latitude, longitude], {
            icon: createCustomIcon("👤", "passenger-marker"),
        }).addTo(map);
    }

    // Emit location update if there's an active trip
    if (currentTrip && currentTrip.driver_id) {
        console.log("Emitting passenger location update:", {
            trip_id: currentTrip._id,
            driver_id: currentTrip.driver_id._id || currentTrip.driver_id,
            location: {
                type: "Point",
                coordinates: [longitude, latitude],
            },
        });

        socket.emit("passenger:updateLocation", {
            trip_id: currentTrip._id,
            driver_id: currentTrip.driver_id._id || currentTrip.driver_id,
            passenger_id: document.getElementById("passengerId").value,
            location: {
                type: "Point",
                coordinates: [longitude, latitude],
            },
        });
    }

    // Update pickup location if booking hasn't started
    if (!currentRideRequest) {
        PICKUP_LOCATION = [longitude, latitude];
        if (pickupMarker) {
            pickupMarker.setLatLng([latitude, longitude]);
        }
    }
}

// Handle location errors
function handleLocationError(error) {
    console.error("Error getting location:", error);
    updateGPSStatus("disabled");

    let errorMessage = "Không thể xác định vị trí của bạn. ";
    switch (error.code) {
        case error.PERMISSION_DENIED:
            errorMessage +=
                "Vui lòng cho phép truy cập vị trí để sử dụng ứng dụng.";
            break;
        case error.POSITION_UNAVAILABLE:
            errorMessage += "Thông tin vị trí không khả dụng.";
            break;
        case error.TIMEOUT:
            errorMessage += "Quá thời gian yêu cầu vị trí.";
            break;
        default:
            errorMessage += "Lỗi không xác định.";
    }

    showTripNotification("GPS không hoạt động", errorMessage, "error");
}

// Stop location tracking
function stopLocationTracking() {
    if (watchId) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }
}
