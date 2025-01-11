// Update status message
function updateStatus(message, type) {
    const statusDiv = document.getElementById("bookingStatus");
    if (statusDiv) {
        statusDiv.textContent = message;
        statusDiv.className = "status-message " + type;
    }
}

// Show/hide trip info
function showTripInfo(show = true) {
    document.querySelector(".trip-info").style.display = show
        ? "block"
        : "none";
}

// Update trip status text
function updateTripStatus(message) {
    document.getElementById("tripStatusText").textContent = message;
}

// Update driver information display
function updateDriverInfo(driver) {
    document.getElementById("driverName").value = driver.name;
    document.getElementById("driverPhone").value = driver.phone || "N/A";
    document.getElementById("driverPlate").value =
        driver.license_plate || "N/A";
    document.getElementById("driverStatus").value = "On the way";
    document.getElementById("driverInfoPanel").style.display = "block";
}

// Show driver dialog
function showDriverDialog(driver) {
    console.log("Showing driver dialog with info:", driver);
    const content = createDriverDialogContent(driver);
    document.getElementById("driverDialogContent").innerHTML = content;
    showOverlay(true);
    document.getElementById("driverDialog").style.display = "block";
}

// Close driver dialog
function closeDriverDialog() {
    showOverlay(false);
    document.getElementById("driverDialog").style.display = "none";
}

// Show trip notification
function showTripNotification(title, content, type = "info") {
    console.log("Showing trip notification:", { title, content, type });

    // Set icon based on notification type
    let icon = "✨";
    switch (type) {
        case "warning":
            icon = "⚠️";
            break;
        case "error":
            icon = "❌";
            break;
        case "success":
            icon = "✅";
            break;
        case "info":
        default:
            icon = "ℹ️";
    }

    document.getElementById("tripNotificationIcon").textContent = icon;
    document.getElementById("tripNotificationTitle").textContent = title;
    document.getElementById("tripNotificationContent").textContent = content;
    showOverlay(true);
    document.getElementById("tripNotification").style.display = "block";
}

// Close trip notification
function closeTripNotification() {
    showOverlay(false);
    document.getElementById("tripNotification").style.display = "none";
}

// Show/hide overlay
function showOverlay(show) {
    document.getElementById("overlay").style.display = show ? "block" : "none";
}

// Show timeout modal
function showTimeoutModal() {
    document.getElementById("timeoutModal").style.display = "block";
}

// Hide timeout modal
function hideTimeoutModal() {
    document.getElementById("timeoutModal").style.display = "none";
}

// Start countdown timer
function startCountdown(duration) {
    const timerDisplay = document.getElementById("timer");
    const countdownTimer = document.getElementById("countdownTimer");
    let timeLeft = duration;

    countdownTimer.style.display = "block";

    countdownInterval = setInterval(() => {
        const minutes = Math.floor(timeLeft / 60000);
        const seconds = Math.floor((timeLeft % 60000) / 1000);

        timerDisplay.textContent = `${minutes}:${seconds
            .toString()
            .padStart(2, "0")}`;

        timeLeft -= 1000;

        if (timeLeft < 0) {
            clearInterval(countdownInterval);
        }
    }, 1000);
}

// Stop countdown timer
function stopCountdown() {
    clearInterval(countdownInterval);
    document.getElementById("countdownTimer").style.display = "none";
}

// Update route information display
function updateRouteInfo(distance, duration) {
    document.getElementById("routeDistance").textContent = `${distance} km`;
    document.getElementById("routeDuration").textContent = `${duration} min`;
    document.querySelector(".route-info").classList.add("visible");
}

// Create driver dialog content
function createDriverDialogContent(driver) {
    return `
        <div class="notification-dialog">
            <h3 class="text-2xl font-bold mb-6">Driver Found!</h3>
            <div class="driver-info bg-gray-50 rounded-lg p-4">
                <div class="info-row flex items-center py-3 border-b border-gray-200">
                    <span class="label text-gray-600 w-24">Name:</span>
                    <span class="value font-semibold text-gray-900">${driver.name}</span>
                </div>
                <div class="info-row flex items-center py-3 border-b border-gray-200">
                    <span class="label text-gray-600 w-24">Vehicle:</span>
                    <span class="value font-semibold text-gray-900">${driver.license_plate}</span>
                </div>
                <div class="info-row flex items-center py-3 border-b border-gray-200">
                    <span class="label text-gray-600 w-24">Phone:</span>
                    <span class="value font-semibold text-gray-900">${driver.phone}</span>
                </div>
                <div class="info-row flex items-center py-3">
                    <span class="label text-gray-600 w-24">Status:</span>
                    <span class="status-badge bg-emerald-500 text-white text-sm px-3 py-1 rounded-full">
                        On the way
                    </span>
                </div>
            </div>
        </div>
    `;
}

// Create driver info content for map popup
function createDriverInfoContent(driver) {
    return `
        <div class="driver-popup-info">
            <div class="driver-header">
                <span class="driver-icon">🚗</span>
                <h3>${driver.name}</h3>
            </div>
            <div class="driver-details">
                <p><strong>Phone:</strong> ${driver.phone || "N/A"}</p>
                <p><strong>License Plate:</strong> ${
                    driver.license_plate || "N/A"
                }</p>
                <p><strong>Status:</strong> <span class="status-badge">${
                    currentTrip?.status || "Assigned"
                }</span></p>
            </div>
        </div>
    `;
}

// Reset booking UI
function resetBookingUI() {
    document.getElementById("bookButton").disabled = false;
    document.getElementById("cancelButton").style.display = "none";
    currentRideRequestId = null;
    currentRideRequest = null;

    if (driverMarker) {
        map.removeLayer(driverMarker);
        driverMarker = null;
    }
    if (routeControl) {
        map.removeControl(routeControl);
        routeControl = null;
    }
}

// Get trip status text
function getTripStatusText(status) {
    switch (status) {
        case "pending":
            return "Driver is being assigned...";
        case "assigned":
            return "Driver is on the way to pick you up";
        case "in_progress":
            return "Trip in progress - On the way to destination";
        case "completed":
            return "Trip completed";
        case "cancelled":
            return "Trip cancelled";
        default:
            return `Trip status: ${status}`;
    }
}
