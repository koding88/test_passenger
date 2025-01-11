// Book a ride
async function bookRide() {
    try {
        if (!currentPassengerLocation) {
            alert("Waiting for your location. Please try again.");
            return;
        }

        if (!dropoffMarker) {
            showTripNotification(
                "Chọn điểm đến",
                "Vui lòng nhấp vào bản đồ để chọn điểm đến của bạn trước khi đặt xe.",
                "warning"
            );
            return;
        }

        document.getElementById("bookButton").disabled = true;
        document.getElementById("cancelButton").style.display = "block";

        if (!currentRideRequestId) {
            const response = await fetch(`${API_CONFIG.baseUrl}/booking`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    passenger: {
                        id: document.getElementById("passengerId").value,
                        name: document.getElementById("passengerName").value,
                        phone: document.getElementById("passengerPhone").value,
                    },
                    pickup_location: {
                        type: "Point",
                        coordinates: currentPassengerLocation,
                    },
                    dropoff_location: {
                        type: "Point",
                        coordinates: DROPOFF_LOCATION,
                    },
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (data.status === "success") {
                currentRideRequest = data.payload.ride_request;
                updateStatus(
                    `Searching for drivers (${
                        data.payload.nearby_drivers?.length || 0
                    } drivers nearby)...`,
                    "info"
                );
            } else {
                throw new Error(data.message || "Unknown error occurred");
            }
        } else {
            updateStatus("Continuing search for drivers...", "info");
        }
    } catch (error) {
        updateStatus("Error creating booking: " + error.message, "error");
        console.error("Booking error:", error);
        resetBookingUI();
    }
}

// Retry booking
async function retryBooking() {
    try {
        hideTimeoutModal();
        updateStatus("Retrying booking...", "info");

        const response = await fetch(`${API_CONFIG.baseUrl}/booking`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                passenger: {
                    id: document.getElementById("passengerId").value,
                    name: document.getElementById("passengerName").value,
                    phone: document.getElementById("passengerPhone").value,
                },
                pickup_location: {
                    type: "Point",
                    coordinates: [PICKUP_LOCATION[1], PICKUP_LOCATION[0]],
                },
                dropoff_location: {
                    type: "Point",
                    coordinates: [DROPOFF_LOCATION[1], DROPOFF_LOCATION[0]],
                },
                ride_request_id: currentRideRequestId,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            if (errorData.message.includes("cancelled")) {
                updateStatus(
                    "This booking has been cancelled. Please make a new booking.",
                    "error"
                );
                resetBookingUI();
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (data.status === "success") {
            updateStatus(
                `Searching for drivers (${
                    data.payload.nearby_drivers?.length || 0
                } drivers nearby)...`,
                "info"
            );
        } else {
            throw new Error(data.message || "Unknown error occurred");
        }
    } catch (error) {
        console.error("Error retrying booking:", error);
        updateStatus("Failed to retry booking: " + error.message, "error");
        resetBookingUI();
    }
}

// Cancel booking
async function cancelBooking() {
    try {
        if (currentRideRequestId) {
            hideTimeoutModal();
            stopCountdown();

            const response = await fetch(
                `${API_CONFIG.baseUrl}/booking/${currentRideRequestId}/cancel`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );

            if (!response.ok) {
                throw new Error("Failed to cancel booking");
            }

            updateStatus("Booking cancelled", "info");
            resetBookingUI();
        }
    } catch (error) {
        console.error("Error cancelling booking:", error);
        alert("Failed to cancel booking. Please try again.");
    }
}

// Check for active trip
async function checkActiveTrip() {
    try {
        const passengerId = document.getElementById("passengerId").value;
        console.log("Checking active trip for passenger:", passengerId);

        const response = await fetch(
            `${API_CONFIG.baseUrl}/trip/passenger/active-trip/${passengerId}`
        );
        const data = await response.json();
        console.log("Active trip response:", data);

        if (data.status === "success" && data.payload) {
            const trip = data.payload;
            currentTrip = trip;
            console.log("Found active trip:", trip);

            document.getElementById("bookingForm").style.display = "none";
            document.querySelector(".trip-info").style.display = "block";

            if (trip.driver_id) {
                console.log("Driver ID from trip:", trip.driver_id);
                const driverId = trip.driver_id._id || trip.driver_id;
                const driverResponse = await fetch(
                    `${API_CONFIG.baseUrl}/driver/${driverId}`
                );
                const driverData = await driverResponse.json();

                if (driverData.status === "success") {
                    const driver = driverData.payload;
                    console.log("Driver info:", driver);
                    updateDriverInfo(driver);

                    if (driver.location) {
                        updateDriverLocation(driver.location);
                    }
                }
            }

            document.getElementById("tripStatusText").textContent =
                getTripStatusText(trip.status);

            if (trip.pickup_location) {
                const pickupCoords = trip.pickup_location.coordinates;
                if (!pickupMarker) {
                    pickupMarker = L.marker(
                        [pickupCoords[1], pickupCoords[0]],
                        {
                            icon: createCustomIcon("📍", "pickup-marker"),
                        }
                    ).addTo(map);
                } else {
                    pickupMarker.setLatLng([pickupCoords[1], pickupCoords[0]]);
                }
            }

            if (trip.dropoff_location) {
                const dropoffCoords = trip.dropoff_location.coordinates;
                if (!dropoffMarker) {
                    dropoffMarker = L.marker(
                        [dropoffCoords[1], dropoffCoords[0]],
                        {
                            icon: createCustomIcon("🏁", "dropoff-marker"),
                        }
                    ).addTo(map);
                } else {
                    dropoffMarker.setLatLng([
                        dropoffCoords[1],
                        dropoffCoords[0],
                    ]);
                }
            }

            const bounds = L.latLngBounds([]);
            if (pickupMarker) bounds.extend(pickupMarker.getLatLng());
            if (dropoffMarker) bounds.extend(dropoffMarker.getLatLng());
            if (driverMarker) bounds.extend(driverMarker.getLatLng());
            if (bounds.isValid()) {
                map.fitBounds(bounds, { padding: [50, 50] });
            }

            setupTripSocketListeners(trip._id);
        } else {
            document.getElementById("bookingForm").style.display = "block";
            document.querySelector(".trip-info").style.display = "none";
            document.getElementById("driverInfoPanel").style.display = "none";

            if (driverMarker) {
                map.removeLayer(driverMarker);
                driverMarker = null;
            }
            if (routeControl) {
                map.removeControl(routeControl);
                routeControl = null;
            }
        }
    } catch (error) {
        console.error("Error checking active trip:", error);
        updateStatus("Error checking trip status", "error");
    }
}

// Set up trip socket listeners
function setupTripSocketListeners(tripId) {
    socket.on("driver_location_updated", (data) => {
        if (data.trip_id === tripId) {
            updateDriverLocation(data.location);
        }
    });

    socket.on("trip_started", (data) => {
        if (data.trip_id === tripId) {
            document.getElementById("tripStatusText").innerText =
                "Trip Status: in_progress";
        }
    });

    socket.on("trip_completed", (data) => {
        if (data.trip_id === tripId) {
            document.getElementById("tripStatusText").innerText =
                "Trip Status: completed";
            setTimeout(() => {
                document.getElementById("bookingForm").style.display = "block";
                document.getElementById("tripStatus").style.display = "none";
            }, 5000);
        }
    });
}
