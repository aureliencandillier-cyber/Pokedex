// src/services/pokemonApi.js

/**
 * CACHE GLOBAL : Stocké hors des fonctions pour persister pendant toute la session.
 * Il évite de traduire plusieurs fois le même Pokémon dans la chaîne d'évolution.
 */
const EVOLUTION_CACHE = {};

// ============================================================
// FONCTION 1 : fetchPokemonLite (Pour la Grille Principale)
// ============================================================
/**
 * Récupère une liste optimisée pour l'affichage de la grille.
 * On ne prend que le "Data Budget" nécessaire pour le Tri et le Filtre.
 */
export const fetchPokemonLite = async (limit = 1500, onProgress) => {
  try {
    // 1. Appel initial pour obtenir la liste des noms et URLs
    const response = await fetch(`https://pokeapi.co/api/v2/pokemon?limit=${limit}`);
    if (!response.ok) throw new Error("Erreur réseau");
    
    const data = await response.json();
    const total = data.results.length;
    let count = 0;

    // 2. Enrichissement : On parcourt la liste pour récupérer les infos de TRI/FILTRE
    // Promise.all permet de lancer toutes les requêtes en parallèle (gain de temps énorme)
    return await Promise.all(data.results.map(async (poke) => {
      const id = poke.url.split('/').filter(Boolean).pop();
      
      try {
        // On récupère les types (pour filtrer) et le poids/taille (pour trier)
        // On récupère aussi l'espèce pour avoir le nom en Français
        const [resB, resS] = await Promise.all([
          fetch(`https://pokeapi.co/api/v2/pokemon/${id}/`),
          fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}/`).catch(() => null)
        ]);

        const bData = await resB.json();
        const sData = resS && resS.ok ? await resS.json() : null;
        
        // Recherche du nom français, sinon garde le nom anglais
        const frName = sData?.names.find(n => n.language.name === 'fr')?.name || poke.name;

        // Mise à jour de la barre de progression dans App.jsx
        count++;
        if (onProgress && (count % 10 === 0 || count === total)) {
          onProgress(Math.round((count / total) * 100));
        }

        // On retourne un objet "Léger" (Lite)
        return { 
          name: poke.name,
          url: poke.url,
          id: parseInt(id), 
          frName, 
          weight: bData.weight, // Gardé pour le tri
          height: bData.height, // Gardé pour le tri
          types: bData.types    // Gardé pour le filtre
          // On ne met pas les stats ni les évolutions ici !
        };
      } catch (e) {
        return { name: poke.name, id: parseInt(id), frName: poke.name };
      }
    }));
  } catch (error) {
    console.error("Erreur fetchPokemonLite:", error);
    throw error;
  }
};

// ============================================================
// FONCTION 2 : fetchFullPokemonData (Pour la Vue Détails)
// ============================================================
/**
 * Récupère l'intégralité des données d'un Pokémon spécifique.
 * Cette fonction est appelée UNIQUEMENT quand l'utilisateur clique sur une carte.
 */
export const fetchFullPokemonData = async (id) => {
  try {
    // 1. On récupère les détails lourds (stats, talents) et l'espèce (description)
    const [pRes, sRes] = await Promise.all([
      fetch(`https://pokeapi.co/api/v2/pokemon/${id}`),
      fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}`)
    ]);

    const pData = await pRes.json();
    const sData = await sRes.json();

    // 2. On récupère la chaîne d'évolution via son URL spécifique
    let evolutions = [];
    if (sData.evolution_chain?.url) {
      evolutions = await getEvoChainData(sData.evolution_chain.url);
    }

    // On retourne le pack complet pour PokemonDetail.jsx
    return {
      details: pData,
      species: sData,
      evolutions: evolutions
    };
  } catch (error) {
    console.error("Erreur fetchFullPokemonData:", error);
    throw error;
  }
};

// ============================================================
// HELPER INTERNE : getEvoChainData (Logique des Évolutions)
// ============================================================
/**
 * Fonction récursive qui parcourt l'arbre d'évolution.
 * Elle n'est pas exportée car elle ne sert qu'à fetchFullPokemonData.
 */
async function getEvoChainData(url) {
  const response = await fetch(url);
  const data = await response.json();
  let chainList = [];

  // Fonction interne pour descendre dans les branches de l'arbre (ex: Evoli)
  const traverse = async (node) => {
    const pokeId = node.species.url.split('/').filter(Boolean).pop();
    let frName = node.species.name;

    // Utilisation du cache pour éviter des appels API inutiles
    if (EVOLUTION_CACHE[node.species.name]) {
      frName = EVOLUTION_CACHE[node.species.name];
    } else {
      try {
        const sRes = await fetch(node.species.url);
        const sData = await sRes.json();
        const found = sData.names.find(n => n.language.name === 'fr')?.name;
        if (found) {
          frName = found;
          EVOLUTION_CACHE[node.species.name] = frName; // On mémorise pour la prochaine fois
        }
      } catch (e) { /* Fallback sur le nom anglais */ }
    }

    chainList.push({
      name: node.species.name,
      frName,
      id: pokeId,
      image: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokeId}.png`
    });

    // Si le Pokémon a des évolutions suivantes, on continue la traversée
    if (node.evolves_to && node.evolves_to.length > 0) {
      await Promise.all(node.evolves_to.map(child => traverse(child)));
    }
  };

  await traverse(data.chain);
  
  // On trie par ID pour que Bulbizarre apparaisse avant Herbizarre
  return chainList.sort((a, b) => parseInt(a.id) - parseInt(b.id));
}