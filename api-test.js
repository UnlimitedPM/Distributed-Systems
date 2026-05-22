import http from 'k6/http'; // [cite: 271]

// Configuration du test de charge [cite: 269, 272]
export let options = {
    insecureSkipTLSVerify: true, // [cite: 274]
    noConnectionReuse: false,    // [cite: 275]
    vus: 2,                      // 2 utilisateurs virtuels pour commencer [cite: 276]
    duration: '20s'              // Le test va durer 20 secondes 
};

// Le scénario exécuté en boucle par chaque utilisateur virtuel [cite: 269, 280]
export default function () {
    const url = 'http://localhost:6010/overload'; // [cite: 282]
    http.get(url); // [cite: 283]
}