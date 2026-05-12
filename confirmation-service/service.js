const axios = require('axios');

// On exporte la fonction pour l'utiliser dans le serveur
module.exports = async function getPriceFromExternalAPI(isin) {
    try {
        // Nouvelle URL avec délai pour tester l'asynchronisme
        const url = `https://onlineweiterbildung-reutlingen-university.de/vswsp5/index.php?isin=${isin}`;
        const response = await axios.get(url);
        const data = response.data;
        const values = Object.values(data);

        if (values.length > 0) {
            const priceString = values[0];
            const cleanPrice = parseFloat(priceString.replace(',', ''));
            return { confirmed: true, price: cleanPrice };
        }
        return { confirmed: false, price: 0 };
    } catch (error) {
        console.error("Price API Error");
        return { confirmed: false, price: 0 };
    }
};