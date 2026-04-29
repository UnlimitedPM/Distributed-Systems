const express = require('express');
const bodyParser = require('body-parser');
const { randomBytes } = require('crypto');
const cors = require('cors');

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Constantes d'état [cite: 108-111]
const STATE_CREATED = 0;
const STATE_EXECUTED = 1;
const STATE_SOLD = 2;

// Définition des transitions valides 
const VALID_TRANSITIONS = {
    [STATE_CREATED]: [STATE_EXECUTED],
    [STATE_EXECUTED]: [STATE_SOLD]
};

let orders = [];

// 1. Create Order: POST /orders [cite: 47-58]
app.post('/orders', (req, res) => {
    const { name, isin, amount } = req.body;

    if (!name || !isin || !amount) {
        console.warn("Attempted to create order with missing fields");
        return res.status(400).send("Missing required fields");
    }

    const newOrder = {
        id: randomBytes(4).toString('hex'), // ID 32-bit hex [cite: 51]
        name: name,
        isin: isin,
        amount: amount,
        price: 0, // Défaut [cite: 58]
        state: STATE_CREATED  // Défaut [cite: 58]
    };

    orders.push(newOrder);
    console.info(`Order created: ${newOrder.id}`);
    res.status(201).json(newOrder);
});

// 2. Read All: GET /orders (avec filtrage) [cite: 78-88]
app.get('/orders', (req, res) => {
    const stateQuery = req.query.state;
    
    if (stateQuery !== undefined) {
        const filteredOrders = orders.filter(o => o.state == parseInt(stateQuery));
        return res.status(200).json(filteredOrders);
    }
    
    res.status(200).json(orders);
});

// 3. Read With ID: GET /orders/:id [cite: 89-93]
app.get('/orders/:id', (req, res) => {
    const order = orders.find(o => o.id === req.params.id);
    if (!order) {
        console.error(`Order not found: ${req.params.id}`);
        return res.status(404).send('Order not found');
    }
    res.status(200).json(order);
});

// 4. Update Amount: PATCH /orders/:id/amount [cite: 94-101]
app.patch('/orders/:id/amount', (req, res) => {
    const order = orders.find(o => o.id === req.params.id);
    if (!order) return res.status(404).send('Order not found');

    // Vérification de l'état (uniquement si created) 
    if (order.state !== STATE_CREATED) {
        return res.status(400).send('Cannot update amount of an order that is not in "created" state');
    }

    order.amount = req.body.amount;
    res.status(200).json(order);
});

// 5. Update State: PATCH /orders/:id/state [cite: 106-123]
app.patch('/orders/:id/state', (req, res) => {
    const order = orders.find(o => o.id === req.params.id);
    if (!order) return res.status(404).send('Order not found');

    const newState = parseInt(req.body.state);
    const allowedTransitions = VALID_TRANSITIONS[order.state] || [];

    // Vérification de la transition valide [cite: 112, 116]
    if (!allowedTransitions.includes(newState)) {
        console.warn(`Invalid state transition attempted for ${order.id}: ${order.state} -> ${newState}`);
        return res.status(400).send('Invalid state transition');
    }

    order.state = newState;
    res.status(200).json(order);
});

// 6. Delete Order: DELETE /orders/:id [cite: 124-128]
app.delete('/orders/:id', (req, res) => {
    const index = orders.findIndex(o => o.id === req.params.id);
    if (index === -1) return res.status(404).send('Order not found');

    // Vérification de l'état avant suppression 
    if (orders[index].state !== STATE_CREATED) {
        return res.status(400).send('Only orders in "created" state can be deleted');
    }

    orders.splice(index, 1);
    res.status(204).send();
});

const PORT = 6010;
app.listen(PORT, () => {
    console.info(`Server is running on port ${PORT}`);
});