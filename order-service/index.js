const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');
const db = require('./dbConnection');
const { 
    STATE_CREATED, 
    STATE_CONFIRMED, 
    VALID_TRANSITIONS 
} = require('./constants'); //

const app = express();
app.use(bodyParser.json());
app.use(cors());

/**
 * Appelle le service de confirmation
 */
async function callConfirmationService(isin) {
    try {
        const response = await axios.get(`http://confirmation-service:4000/confirmation/${isin}`);
        return response.data; // { confirmed: true/false, price: XX }
    } catch (error) {
        console.error("Call to confirmation service failed");
        return { confirmed: false, price: 0 };
    }
}

// 1. POST /orders : Créer un ordre
app.post('/orders', async (req, res) => {
    const { name, isin, amount } = req.body;
    if (!name || !isin || !amount) return res.status(400).send("Missing fields");

    try {
        const [result] = await db.execute(
            'INSERT INTO orders (name, isin, amount, price, state) VALUES (?, ?, ?, 0, 0)',
            [name, isin, amount]
        );
        res.status(201).json({ id: result.insertId, name, isin, amount, price: 0, state: STATE_CREATED });
    } catch (err) {
        res.status(500).send("Database error");
    }
});

// 2. GET /orders : Liste tous les ordres (avec filtre optionnel)
app.get('/orders', async (req, res) => {
    const state = req.query.state;
    let query = 'SELECT * FROM orders';
    let params = [];
    if (state !== undefined) {
        query += ' WHERE state = ?';
        params.push(state);
    }
    try {
        const [rows] = await db.execute(query, params);
        res.status(200).json(rows);
    } catch (err) {
        res.status(500).send("Error reading database");
    }
});

// 3. GET /orders/:id : Lire un ordre spécifique (C'est la route qui manquait !)
app.get('/orders/:id', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM orders WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).send('Order not found');
        res.status(200).json(rows[0]);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// 4. PATCH /orders/:id/amount : Modifier la quantité (seulement état 0)
app.patch('/orders/:id/amount', async (req, res) => {
    const { amount } = req.body;
    try {
        const [rows] = await db.execute('SELECT state FROM orders WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).send('Not found');
        if (rows[0].state !== STATE_CREATED) return res.status(400).send('Modification allowed only in state 0');

        await db.execute('UPDATE orders SET amount = ? WHERE id = ?', [amount, req.params.id]);
        res.status(200).send('Amount updated');
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// 5. PATCH /orders/:id/state : Changer d'état et appeler la confirmation
app.patch('/orders/:id/state', async (req, res) => {
    const id = req.params.id;
    const newState = parseInt(req.body.state);

    try {
        const [rows] = await db.execute('SELECT isin, state FROM orders WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).send('Not found');
        
        const order = rows[0];
        const allowed = VALID_TRANSITIONS[order.state] || [];
        if (!allowed.includes(newState)) return res.status(400).send('Invalid state transition');

        // Logique spécifique pour la transition vers l'état CONFIRMED (1)
        if (newState === STATE_CONFIRMED) {
            const result = await callConfirmationService(order.isin);
            if (!result.confirmed) return res.status(400).send('Confirmation failed by external service');
            
            // On utilise "result.price || 0" pour éviter l'erreur SQL "undefined"
            await db.execute('UPDATE orders SET state = ?, price = ? WHERE id = ?', 
                [STATE_CONFIRMED, result.price || 0, id]);
            return res.status(200).send('Order confirmed and price updated');
        }

        await db.execute('UPDATE orders SET state = ? WHERE id = ?', [newState, id]);
        res.status(200).send('State updated');
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// 6. DELETE /orders/:id : Supprimer un ordre (états 0 et 1 autorisés)
app.delete('/orders/:id', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT state FROM orders WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).send('Not found');
        
        // Suppression interdite si l'état est supérieur à 1 (confirmé)
        if (rows[0].state > STATE_CONFIRMED) return res.status(400).send('Only created or confirmed orders can be deleted');

        await db.execute('DELETE FROM orders WHERE id = ?', [req.params.id]);
        res.status(204).send();
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// Port d'écoute
app.listen(6010, () => console.info("Order Service is running on port 6010"));