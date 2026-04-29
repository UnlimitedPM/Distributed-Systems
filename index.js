const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./dbConnection');
// Importation des constantes [cite: 407]
const { STATE_CREATED, VALID_TRANSITIONS } = require('./constants');

const app = express();
app.use(bodyParser.json());
app.use(cors());

// 1. Create Order: POST /orders
app.post('/orders', (req, res) => {
    const { name, isin, amount } = req.body;

    if (!name || !isin || !amount) {
        console.warn("Attempted to create order with missing fields");
        return res.status(400).send("Missing required fields");
    }

    db.execute(
        'INSERT INTO orders (name, isin, amount, price, state) VALUES (?, ?, ?, 0, 0)',
        [name, isin, amount]
    )
    .then(([result]) => {
        console.info(`Order created in DB with ID: ${result.insertId}`);
        res.status(201).json({
            id: result.insertId,
            name, isin, amount,
            price: 0,
            state: STATE_CREATED
        });
    })
    .catch(err => {
        console.error("DB Error on Create:", err);
        res.status(500).send("Internal Server Error");
    });
});

// 2. Read All: GET /orders
app.get('/orders', (req, res) => {
    const state = req.query.state;
    let query = 'SELECT * FROM orders';
    let params = [];

    if (state !== undefined) {
        query += ' WHERE state = ?';
        params.push(state);
    }

    db.execute(query, params)
        .then(([rows]) => res.status(200).json(rows))
        .catch(err => {
            console.error(err);
            res.status(500).send("Error reading orders");
        });
});

// 3. Read With ID: GET /orders/:id
app.get('/orders/:id', (req, res) => {
    db.execute('SELECT * FROM orders WHERE id = ?', [req.params.id])
        .then(([rows]) => {
            if (rows.length === 0) return res.status(404).send('Order not found');
            res.status(200).json(rows[0]);
        })
        .catch(err => res.status(500).send(err));
});

// 4. Update Amount: PATCH /orders/:id/amount
app.patch('/orders/:id/amount', (req, res) => {
    const id = req.params.id;
    const newAmount = req.body.amount;

    if (isNaN(newAmount) || newAmount === null) {
        return res.status(400).send("Invalid amount");
    }

    db.execute('SELECT state FROM orders WHERE id = ?', [id])
        .then(([rows]) => {
            if (rows.length === 0) return res.status(404).send('Order not found');
            if (rows[0].state !== STATE_CREATED) return res.status(400).send('Only created orders can be modified');
            
            return db.execute('UPDATE orders SET amount = ? WHERE id = ?', [newAmount, id]);
        })
        .then((result) => {
            if (result) res.status(200).send('Amount updated');
        })
        .catch(err => {
            if (!res.headersSent) res.status(500).send(err);
        });
});

// 5. Update State: PATCH /orders/:id/state
app.patch('/orders/:id/state', (req, res) => {
    const id = req.params.id;
    const newState = parseInt(req.body.state);

    if (isNaN(newState)) return res.status(400).send("Invalid state");

    db.execute('SELECT state FROM orders WHERE id = ?', [id])
        .then(([rows]) => {
            if (rows.length === 0) return res.status(404).send('Order not found');
            
            const currentState = rows[0].state;
            const allowed = VALID_TRANSITIONS[currentState] || [];

            if (!allowed.includes(newState)) return res.status(400).send('Invalid state transition');

            return db.execute('UPDATE orders SET state = ? WHERE id = ?', [newState, id]);
        })
        .then((result) => {
            if (result) res.status(200).send('State updated');
        })
        .catch(err => {
            if (!res.headersSent) res.status(500).send(err);
        });
});

// 6. Delete Order: DELETE /orders/:id
app.delete('/orders/:id', (req, res) => {
    const id = req.params.id;

    db.execute('SELECT state FROM orders WHERE id = ?', [id])
        .then(([rows]) => {
            if (rows.length === 0) return res.status(404).send('Order not found');
            if (rows[0].state !== STATE_CREATED) return res.status(400).send('Only created orders can be deleted');

            return db.execute('DELETE FROM orders WHERE id = ?', [id]);
        })
        .then((result) => {
            if (result) res.status(204).send();
        })
        .catch(err => {
            if (!res.headersSent) res.status(500).send(err);
        });
});

const PORT = 6010;
app.listen(PORT, () => {
    console.info(`Server is running on port ${PORT}`);
});