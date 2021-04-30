(async function () {
    
    const app = await require('./src/server')

    // Listen to incoming connections on port X.
    app.listen(app.config.server.port, "0.0.0.0");

    // Notify user that the service is ready for incoming connections.
    app.debug.status(
    "Listening for incoming connections on port " + app.config.server.port
    );
}())