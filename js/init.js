// Initialize the application
async function initializeApp() {
    try {
        // Initialize map
        await initMap();

        // Initialize socket connection
        initializeSocket();

        // Check for active trip
        await checkActiveTrip();

        // Add event listener for passenger ID changes
        document
            .getElementById("passengerId")
            .addEventListener("change", async () => {
                // Disconnect current socket
                socket.disconnect();

                // Update socket query parameters
                socket.io.opts.query = {
                    userId: document.getElementById("passengerId").value,
                    type: "passenger",
                };

                // Reconnect with new ID
                socket.connect();

                // Check for active trips with new ID
                await checkActiveTrip();
            });

        // Add socket reconnection logic
        socket.on("disconnect", () => {
            console.log("Socket disconnected, attempting to reconnect...");
            socket.io.opts.query = {
                userId: document.getElementById("passengerId").value,
                type: "passenger",
            };
            socket.connect();
        });
    } catch (error) {
        console.error("Error initializing app:", error);
        updateStatus(
            "Error loading trip information. Please refresh the page.",
            "error"
        );
    }
}

// Initialize app when window loads
window.addEventListener("load", initializeApp);
