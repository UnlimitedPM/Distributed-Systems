const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./dbConnection');
const gRPC = require('@grpc/grpc-js'); // [cite: 179, 349]
const protoLoader = require('@grpc/proto-loader'); // [cite: 179, 350]
const { STATE_CREATED, STATE_CONFIRMED, VALID_TRANSITIONS } = require('./constants');

const app = express();
app.use(bodyParser.json());
app.use(cors());

// --- CONFIGURATION CLIENT gRPC --- [cite: 343-347]
const packageDefinition = protoLoader.loadSync('./confirmation.proto', {
    keepCase: true, longs: String, enums: String, defaults: true, oneofs: true
});
const confirmationProto = gRPC.loadPackageDefinition(packageDefinition).confirmation;

// Création du stub pour parler au service de confirmation [cite: 359-360]
const client = new confirmationProto.Confirmation(
    'confirmation-service:4000', 
    gRPC.credentials.createInsecure()
);

/**
 * Fonction locale qui exécute l'appel RPC [cite: 348, 361-372]
 */
function callConfirmationService(isin) {
    return new Promise((resolve, reject) => {
        client.ConfirmOrder({ isin: isin }, (error, response) => {
            if (error) {
                console.error("gRPC Call failed");
                reject(error);
            } else {
                resolve(response);
            }
        });
    });
}

// --- ROUTES REST ---

// 1. POST /orders : Créer un ordre
app.post('/orders', async (req, res) => {
    const { name, isin, amount } = req.body;
    try {
        const [result] = await db.execute(
            'INSERT INTO orders (name, isin, amount, price, state) VALUES (?, ?, ?, 0, 0)',
            [name, isin, amount]
        );
        res.status(201).json({ id: result.insertId, name, isin, amount, state: 0 });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// 2. GET /orders : Voir tous les ordres
app.get('/orders', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM orders');
        res.status(200).json(rows);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// 3. GET /orders/:id : Voir un ordre spécifique
app.get('/orders/:id', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM orders WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).send('Not found');
        res.status(200).json(rows[0]);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// 4. PATCH /orders/:id/amount : Modifier la quantité 
app.patch('/orders/:id/amount', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT state FROM orders WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).send('Not found');
        
        // Bloquer si l'état n'est pas 0 (Created) [cite: 68]
        if (rows[0].state !== STATE_CREATED) {
            return res.status(400).send('Updating amount is only possible in state created (0)');
        }

        await db.execute('UPDATE orders SET amount = ? WHERE id = ?', [req.body.amount, req.params.id]);
        res.status(200).send('Amount updated');
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// 5. PATCH /orders/:id/state : Transition d'état via gRPC [cite: 174, 374-376]
app.patch('/orders/:id/state', async (req, res) => {
    const id = req.params.id;
    const newState = parseInt(req.body.state);

    try {
        const [rows] = await db.execute('SELECT isin, state FROM orders WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).send('Not found');
        
        const order = rows[0];
        const allowed = VALID_TRANSITIONS[order.state] || [];
        if (!allowed.includes(newState)) return res.status(400).send('Invalid transition');

        if (newState === STATE_CONFIRMED) {
            // Utilisation de la fonction gRPC exportée [cite: 374-376]
            const result = await callConfirmationService(order.isin);
            if (!result.confirmed) return res.status(400).send('Confirmation failed');
            
            await db.execute('UPDATE orders SET state = ?, price = ? WHERE id = ?', 
                [STATE_CONFIRMED, result.price || 0, id]);
            return res.status(200).send('Confirmed via gRPC');
        }

        await db.execute('UPDATE orders SET state = ? WHERE id = ?', [newState, id]);
        res.status(200).send('State updated');
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// 6. DELETE /orders/:id : Supprimer un ordre 
app.delete('/orders/:id', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT state FROM orders WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).send('Not found');
        
        // Autorisé seulement en état 0 ou 1 [cite: 67]
        if (rows[0].state > STATE_CONFIRMED) {
            return res.status(400).send('Deletion is only possible in states created (0) and confirmed (1)');
        }

        await db.execute('DELETE FROM orders WHERE id = ?', [req.params.id]);
        res.status(204).send();
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.listen(6010, () => console.info("Order Service running on port 6010"));