# On utilise l'image officielle MySQL version 8.0 comme demandé [cite: 199]
FROM mysql:8.0

# On définit le mot de passe root et le nom de la base [cite: 190]
ENV MYSQL_ROOT_PASSWORD=root
ENV MYSQL_DATABASE=stock_service

# On copie le script SQL dans un dossier spécial de l'image.
# MySQL exécute automatiquement tous les fichiers .sql présents dans ce dossier au démarrage.
COPY init.sql /docker-entrypoint-initdb.d/