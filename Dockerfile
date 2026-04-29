# Utilisation de la version alpine (légère) avec Node.js [cite: 295-296]
FROM node:22-alpine 

# Sécurité : on utilise l'utilisateur 'node' au lieu de root [cite: 297-298]
USER node

# Répertoire de travail dans le conteneur [cite: 299]
WORKDIR /home/node

# Copie des fichiers package avec changement de propriétaire [cite: 300-305]
COPY --chown=node:node ./package.json ./package.json
COPY --chown=node:node ./package-lock.json ./package-lock.json

# Installation des dépendances [cite: 306-307]
RUN npm install

# Copie du reste des fichiers (ton code source) [cite: 308-309]
COPY --chown=node:node . .

# Commande de démarrage [cite: 310-311, 323]
CMD ["node", "index.js"]