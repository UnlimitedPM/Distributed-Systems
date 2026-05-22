# 📈 Rapport de Test de Charge et de Mise à l'Échelle (Scaling)

 Ce document regroupe les résultats des tests de performance de notre application d'ordres d'achat (Order Application) sous une charge CPU intensive artificielle (route `/overload`).  L'objectif est de comparer le comportement du système avec un conteneur unique par rapport à un déploiement distribué avec **Docker Swarm**.

---

## 📊 Tableau Comparatif Synthétique

| Configuration | Utilisateurs Virtuels (VUs) | Requêtes Traitées (Total) | Débit Moyen (req/s) | Temps de Réponse Moyen | Statut |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **1 Réplica (Classique)** | 1 | 4 522 | 226 req/s | 4.32 ms | ✅ Stable |
| **1 Réplica (Classique)** | 2 | 6 887 | 344 req/s | 5.75 ms | ⚠️ saturation |
| **2 Réplicas (Docker Swarm)** | 2 | **10 414** | **520 req/s** | **3.78 ms** | 🚀 Optimal |

---

## 🔬 Détails des Scénarios de Test

### Scénario 1 : Baseline Test (1 Utilisateur - 1 Réplica)
*  **Configuration** : 1 utilisateur bombarde l'application en boucle pendant 20 secondes.
* **Résultat** : Le serveur répond rapidement et traite **4 522 requêtes**. Le thread unique de Node.js gère la charge sans encombre.

### Scénario 2 : Surcharge CPU (2 Utilisateurs - 1 Réplica)
*  **Configuration** : 2 utilisateurs simultanés bombardent la route lourde `/overload`.
* **Résultat** : Le système s'essouffle. Au lieu de doubler le score du scénario 1 (on attendait ~9 000 requêtes), l'application ne traite que **6 887 requêtes**. Le temps de réponse moyen augmente de **33%** (passant à 5.75 ms).
*  **Pourquoi ?** Node.js fonctionne sur un seul fil d'exécution (Single-Thread). La deuxième requête est bloquée et doit attendre que la première boucle CPU se termine.

### Scénario 3 : Scaling Horizontal (2 Utilisateurs - 2 Réplicas avec Swarm)
*  **Configuration** : Activation de Docker Swarm avec un déploiement de 2 clones de l'application.
* **Résultat** : Les performances explosent ! Le système encaisse **10 414 requêtes** (une augmentation de **51%** par rapport au scénario surchargé). Mieux encore, le temps de réponse moyen chute à **3.78 ms** (plus rapide qu'avec un seul utilisateur !).

---

## 💡 Conclusions Techniques

1.  **Limitation de Node.js** : Face à des calculs lourds ou des processus bloquants (comme notre route de surcharge), un seul conteneur Node.js montre rapidement ses limites face à des accès simultanés.
2.  **Efficacité du Load Balancing** : Docker Swarm répartit automatiquement et équitablement le trafic entre les deux conteneurs disponibles.
3.  **Validation du Scaling Horizontal** : En clonant nos services, les requêtes lourdes s'exécutent en parallèle sur des conteneurs distincts, exploitant pleinement la puissance du processeur sans créer de file d'attente bloquante.

---

## 🛠️ Annexes : Données Brutes de l'Outil k6

<details>
<summary>Cliquez pour dérouler les logs k6 d'origine</summary>

### 1 Utilisateur - Sans Swarm
```text
http_reqs......................: 4522   226.07774/s
http_req_duration..............: avg=4.32ms min=2.51ms med=3.88ms max=20.99ms
iterations.....................: 4522   226.07774/s