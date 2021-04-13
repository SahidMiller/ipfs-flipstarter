module.exports = async function (app) {
  //
  app.debug.struct("Initializing network module.");

  // Load the electrum library.
  const { ElectrumCluster, ElectrumTransport } = require("electrum-cash");

  // Initialize an electrum cluster with default settings.
  app.electrum = new ElectrumCluster("Flipstarter Backend", "1.4.1");

  //
  app.debug.struct("Adding " + app.config.server.env + " servers to cluster.");

  // Add some servers to the cluster.
  if (app.config.server.env === "development") {

    app.electrum.addServer("testnet.bitcoincash.network", 60004, ElectrumTransport.WSS.Scheme);
    app.electrum.addServer('blackie.c3-soft.com', 60004, ElectrumTransport.WSS.Scheme)
    app.electrum.addServer('electroncash.de', 60004, ElectrumTransport.WSS.Scheme)    

  } else {

    app.electrum.addServer("bch.imaginary.cash");
    app.electrum.addServer("electroncash.de");
    app.electrum.addServer("electroncash.dk");
    app.electrum.addServer("electron.jochen-hoenicke.de", 51002);
    app.electrum.addServer("electrum.imaginary.cash");  
  }


  //
  app.debug.struct("Waiting for sufficient connectivity.");

  // Wait for enough connections to be available.
  await app.electrum.ready();

  //
  app.debug.struct("Cluster is now active.");

  // Notify the user that logging has been initialized.
  app.debug.status("Completed network initialization.");
};
