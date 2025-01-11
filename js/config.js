// Map configuration
const MAP_CONFIG = {
    initialZoom: 15,
    tileLayerUrl: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
};

// Socket configuration
const SOCKET_CONFIG = {
    url: "http://localhost:5001",
    options: {
        transports: ["websocket"],
    },
};

// API configuration
const API_CONFIG = {
    baseUrl: "http://localhost:5001/api/v1",
};

// Default locations (will be updated with user's location)
let PICKUP_LOCATION = [21.0285, 105.8542];
let DROPOFF_LOCATION = [21.0355, 105.8462];

// Global variables
let map = null;
let pickupMarker = null;
let dropoffMarker = null;
let driverMarker = null;
let passengerMarker = null;
let routeControl = null;
let tripStarted = false;
let currentRideRequest = null;
let currentTrip = null;
let watchId = null;
let currentPassengerLocation = null;
let countdownInterval = null;
let currentRideRequestId = null;
let socket = null;
