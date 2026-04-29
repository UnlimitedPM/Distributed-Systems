const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./dbConnection'); // [cite: 239-240]

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Constantes d'état [cite: 108-111, 216-221]
const STATE_CREATED = 0;
const STATE_EXECUTED = 1;
const STATE_SOLD = 2;

const VALID_TRANSITIONS = {
    [STATE_CREATED]: [STATE_EXECUTED],
    [STATE_EXECUTED]: [STATE_SOLD]
};

// 1. Create Order: POST /orders [cite: 242, 252-253, 257]
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
            name,
            isin,
            amount,
            price: 0,
            state: 0
        });
    })
    .catch(err => {
        console.error("DB Error on Create:", err);
        res.status(500).send("Internal Server Error");
    });
});

// 2. Read All: GET /orders [cite: 85-88, 257]
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

// 3. Read With ID: GET /orders/:id [cite: 90-93, 257]
app.get('/orders/:id', (req, res) => {
    db.execute('SELECT * FROM orders WHERE id = ?', [req.params.id])
        .then(([rows]) => {
            if (rows.length === 0) return res.status(404).send('Order not found');
            res.status(200).json(rows[0]);
        })
        .catch(err => res.status(500).send(err));
});

// 4. Update Amount: PATCH /orders/:id/amount [cite: 94-101, 257]
app.patch('/orders/:id/amount', (req, res) => {
    const id = req.params.id;
    const newAmount = req.body.amount;

    db.execute('SELECT state FROM orders WHERE id = ?', [id])
        .then(([rows]) => {
            if (rows.length === 0) {
                res.status(404).send('Order not found');
                return null; // On retourne null pour signaler au prochain .then de ne rien faire
            }
            if (rows[0].state !== STATE_CREATED) {
                res.status(400).send('Only created orders can be modified');
                return null; 
            }
            return db.execute('UPDATE orders SET amount = ? WHERE id = ?', [newAmount, id]);
        })
        .then((result) => {
            // On n'envoie la réponse 200 que si le UPDATE a vraiment eu lieu (result n'est pas null)
            if (result) {
                console.info(`Amount updated for order ${id}`);
                res.status(200).send('Amount updated');
            }
        })
        .catch(err => {
            if (!res.headersSent) res.status(500).send(err);
        });
});

// 5. Update State: PATCH /orders/:id/state [cite: 106-123, 257]
app.patch('/orders/:id/state', (req, res) => {
    const id = req.params.id;
    const newState = parseInt(req.body.state);

    db.execute('SELECT state FROM orders WHERE id = ?', [id])
        .then(([rows]) => {
            if (rows.length === 0) {
                res.status(404).send('Order not found');
                return null;
            }
            
            const currentState = rows[0].state;
            const allowed = VALID_TRANSITIONS[currentState] || [];

            if (!allowed.includes(newState)) {
                console.warn(`Invalid transition: ${currentState} -> ${newState}`);
                res.status(400).send('Invalid state transition');
                return null;
            }

            return db.execute('UPDATE orders SET state = ? WHERE id = ?', [newState, id]);
        })
        .then((result) => {
            if (result) res.status(200).send('State updated');
        })
        .catch(err => {
            if (!res.headersSent) res.status(500).send(err);
        });
});

// 6. Delete Order: DELETE /orders/:id [cite: 124-128, 257]
app.delete('/orders/:id', (req, res) => {
    const id = req.params.id;

    db.execute('SELECT state FROM orders WHERE id = ?', [id])
        .then(([rows]) => {
            if (rows.length === 0) {
                res.status(404).send('Order not found');
                return null;
            }
            if (rows[0].state !== STATE_CREATED) {
                res.status(400).send('Only created orders can be deleted');
                return null;
            }

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