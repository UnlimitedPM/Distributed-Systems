const gRPC = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const getPriceLogic = require('./service'); // Import de la logique[cite: 3]

// Chargement du fichier proto[cite: 3]
const packageDef = protoLoader.loadSync('confirmation.proto', {});
const gRPCObject = gRPC.loadPackageDefinition(packageDef);
const confirmationPackage = gRPCObject.confirmation;

// Définition de la méthode RPC[cite: 3]
async function ConfirmOrder(call, callback) {
    const isin = call.request.isin;
    console.info(`>>> gRPC Request received for ISIN: ${isin}`);

    const result = await getPriceLogic(isin);

    // Retour des données via le callback[cite: 3]
    callback(null, {
        confirmed: result.confirmed,
        price: result.price
    });
}

// Création et démarrage du serveur gRPC[cite: 3]
const server = new gRPC.Server();
server.addService(confirmationPackage.Confirmation.service, { ConfirmOrder });

server.bindAsync("0.0.0.0:4000", gRPC.ServerCredentials.createInsecure(), (error, port) => {
    if (error) {
        console.error(`Failed to bind server: ${error.message}`);
        return;
    }
    console.log(`gRPC Server running at http://0.0.0.0:${port}`);
});