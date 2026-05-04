const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());
app.use(cors());

const PORT = 4000; // [cite: 535]

/**
 * Récupère le prix sur l'API externe [cite: 516-524]
 */
async function getPriceData(isin) {
    try {
        const url = `https://onlineweiterbildung-reutlingen-university.de/vswsp4/index.php?isin=${isin}`;
        const response = await axios.get(url);
        return response.data; // {isin, price, name}
    } catch (error) {
        console.error("External Price API error [cite: 522]");
        throw error;
    }
}

app.get('/confirmation/:isin', async (req, res) => {
    const isin = req.params.isin;
    console.info(`>>> Requête de confirmation reçue pour l'ISIN : ${isin}`);

    try {
        const data = await getPriceData(isin);
        console.info(`Données reçues de l'université :`, data);

        // 1. On récupère toutes les valeurs de l'objet (ex: ['1,023.94'])
        const values = Object.values(data);

        if (values.length > 0) {
            // 2. On prend la première valeur et on enlève la virgule pour en faire un nombre
            const priceString = values[0]; // '1,023.94'
            const cleanPrice = parseFloat(priceString.replace(',', '')); // 1023.94

            console.info(`Prix extrait et converti : ${cleanPrice}`);

            res.status(200).json({
                confirmed: true,
                price: cleanPrice
            });
        } else {
            console.warn("Aucune donnée de prix dans la réponse de l'université");
            res.status(200).json({ confirmed: false, price: 0 });
        }
    } catch (error) {
        console.error("Erreur lors de l'appel à l'API externe");
        res.status(200).json({ confirmed: false, price: 0 });
    }
});

app.listen(PORT, () => console.info(`Confirmation Service on port ${PORT}`));