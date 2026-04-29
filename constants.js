// Définition des états de l'ordre
const STATE_CREATED = 0;
const STATE_EXECUTED = 1;
const STATE_SOLD = 2;

// Définition des transitions d'état autorisées
const VALID_TRANSITIONS = {
    [STATE_CREATED]: [STATE_EXECUTED],
    [STATE_EXECUTED]: [STATE_SOLD]
};

// Exportation des constantes pour les utiliser ailleurs [cite: 407]
module.exports = {
    STATE_CREATED,
    STATE_EXECUTED,
    STATE_SOLD,
    VALID_TRANSITIONS
};