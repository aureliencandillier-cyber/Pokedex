import { useState, useEffect, useMemo } from 'react';
import './App.css';
import PokemonCard from './PokemonCard';
import PokemonDetail from './PokemonDetail';

// OPTIMISATION 1 : Définition des constantes EN DEHORS du composant.
// Cela évite de recréer ce tableau en mémoire à chaque rendu de l'application.
const POKEMON_TYPES = [
  { id: 'normal', fr: 'Normal' }, { id: 'fire', fr: 'Feu' }, { id: 'water', fr: 'Eau' },
  { id: 'grass', fr: 'Plante' }, { id: 'electric', fr: 'Électrik' }, { id: 'ice', fr: 'Glace' },
  { id: 'fighting', fr: 'Combat' }, { id: 'poison', fr: 'Poison' }, { id: 'ground', fr: 'Sol' },
  { id: 'flying', fr: 'Vol' }, { id: 'psychic', fr: 'Psy' }, { id: 'bug', fr: 'Insecte' },
  { id: 'rock', fr: 'Roche' }, { id: 'ghost', fr: 'Spectre' }, { id: 'dragon', fr: 'Dragon' },
  { id: 'dark', fr: 'Ténèbres' }, { id: 'steel', fr: 'Acier' }, { id: 'fairy', fr: 'Fée' }
];

function App() {
  // --- ÉTATS (STATE) ---
  const [pokemonList, setPokemonList] = useState([]);
  const [selectedPokemon, setSelectedPokemon] = useState(null);
  
  // États UI (Interface Utilisateur)
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0); // Barre de progression visuelle

  // États de Filtrage et Tri
  // Initialisation paresseuse (Lazy Initializer) pour localStorage : on évite de lire le disque à chaque rendu
  const [searchTerm, setSearchTerm] = useState(() => localStorage.getItem('last_search') || "");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [sortCriteria, setSortCriteria] = useState('id'); 
  const [selectedType, setSelectedType] = useState(""); 

  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('pokedex_favorites');
    return saved ? JSON.parse(saved) : [];
  });

  // --- LOGIQUE MÉTIER ---

  const saveFavorite = (pokemon) => {
    // .some() est optimisé pour s'arrêter dès qu'il trouve une correspondance
    const isAlreadyFavorite = favorites.some(fav => fav.name === pokemon.name);
    
    // Utilisation de l'opérateur ternaire pour un code plus concis
    const updatedFavorites = isAlreadyFavorite 
      ? favorites.filter(fav => fav.name !== pokemon.name)
      : [...favorites, pokemon];

    setFavorites(updatedFavorites);
    localStorage.setItem('pokedex_favorites', JSON.stringify(updatedFavorites));
  };

  // OPTIMISATION 2 : Gestion intelligente du clic ("Lazy Fetch / Repair")
  // Remplace le simple setSelectedPokemon pour gérer les cas où les données sont incomplètes
  const handleSelectPokemon = async (poke) => {
    // Si le Pokémon n'a pas de types (donnée critique), on tente de le re-télécharger
    if (!poke.types || poke.types.length === 0) {
      try {
        const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${poke.id}/`);
        if (res.ok) {
          const data = await res.json();
          // On recrée un objet propre avec les nouvelles données
          const fixedPokemon = { ...poke, weight: data.weight, height: data.height, types: data.types };
          
          // Mise à jour de la liste principale pour ne pas avoir à refaire la requête plus tard
          setPokemonList(prev => prev.map(p => p.id === fixedPokemon.id ? fixedPokemon : p));
          setSelectedPokemon(fixedPokemon);
          return;
        }
      } catch (e) {
        alert("Erreur de connexion : Impossible de récupérer les détails.");
      }
    }
    // Cas normal : on affiche direct
    setSelectedPokemon(poke);
  };

  // --- EFFETS (SIDE EFFECTS) ---

  useEffect(() => {
    // Sauvegarde automatique de la recherche sans bloquer le rendu
    localStorage.setItem('last_search', searchTerm);
  }, [searchTerm]);

  useEffect(() => {
    const fetchAndTranslate = async () => {
      try {
        setIsLoading(true);
        setProgress(0);

        // Limite fixée à 151 pour garantir la fluidité. 
        // Au-delà (ex: 1000), Promise.all peut saturer le navigateur.
        const response = await fetch('https://pokeapi.co/api/v2/pokemon?limit=1008');
        const data = await response.json();
        const total = data.results.length;
        let count = 0;

        // Promise.all permet de lancer toutes les requêtes en parallèle (beaucoup plus rapide qu'une boucle for)
        const enrichedList = await Promise.all(
          data.results.map(async (poke) => {
            const id = poke.url.split('/').filter(Boolean).pop();
            
            // Initialisation avec valeurs par défaut (fail-safe)
            let details = { id: parseInt(id), frName: poke.name, weight: 0, height: 0, types: [] };

            try {
              // OPTIMISATION 3 : Double Fetch Parallèle
              // On lance la requête "infos" et la requête "espèce" (traduction) EN MÊME TEMPS
              const [resBasic, resSpecies] = await Promise.all([
                fetch(`https://pokeapi.co/api/v2/pokemon/${id}/`).catch(() => null),
                fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}/`).catch(() => null)
              ]);

              if (resBasic && resBasic.ok) {
                const bData = await resBasic.json();
                details.weight = bData.weight;
                details.height = bData.height;
                details.types = bData.types;
              }

              if (resSpecies && resSpecies.ok) {
                const sData = await resSpecies.json();
                const found = sData.names.find(n => n.language.name === 'fr');
                if (found) details.frName = found.name;
              }
            } catch (e) {
              // On catch l'erreur ici pour qu'un seul Pokémon défaillant ne plante pas toute l'app
              console.warn(`Erreur partielle sur ${poke.name}`);
            }

            // Mise à jour de la barre de progression (tous les 5 items pour éviter trop de "re-renders")
            count++;
            if (count % 5 === 0 || count === total) setProgress(Math.round((count / total) * 100));

            return { ...poke, ...details };
          })
        );

        setPokemonList(enrichedList);
      } catch (err) {
        console.error("Erreur critique:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAndTranslate();
  }, []); // Le tableau vide [] assure que cela ne s'exécute qu'une seule fois au montage

  // --- CALCULS MÉMOISÉS (PERFORMANCE) ---
  
  // OPTIMISATION 4 : useMemo recalcule la liste UNIQUEMENT si une dépendance change.
  // Cela évite de retrier/filtrer 150 items à chaque micro-changement (ex: clic sur un bouton)
  const filteredPokemons = useMemo(() => {
    let list = showFavoritesOnly ? favorites : pokemonList;

    // 1. Filtre Recherche
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      list = list.filter(poke => 
        (poke.frName || "").toLowerCase().includes(lowerTerm) || 
        poke.name.toLowerCase().includes(lowerTerm)
      );
    }

    // 2. Filtre Type
    if (selectedType) {
      // ?. (Optional Chaining) protège contre les erreurs si 'types' est undefined
      list = list.filter(poke => poke.types?.some(t => t.type.name === selectedType));
    }

    // 3. Tri (On utilise [...list] pour copier le tableau avant de trier, principe d'immutabilité)
    return [...list].sort((a, b) => {
      switch (sortCriteria) {
        case 'weight': return (b.weight || 0) - (a.weight || 0);
        case 'height': return (b.height || 0) - (a.height || 0);
        case 'name': return (a.frName || a.name).localeCompare(b.frName || b.name);
        case 'id': default: return (a.id || 0) - (b.id || 0);
      }
    });
  }, [searchTerm, pokemonList, favorites, showFavoritesOnly, sortCriteria, selectedType]);

  // --- RENDU JSX ---
  return (
    <div className="App">
      <header style={{ position: 'relative', marginBottom: '40px' }}>
        <h1>{showFavoritesOnly ? "Mes Pokémons Favoris" : "Pokédex National"}</h1>
        {/* Rendu conditionnel : Le bouton n'apparaît que si aucun Pokémon n'est sélectionné */}
        {!selectedPokemon && (
          <button
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            style={{
              position: 'absolute', top: '10px', right: '0',
              backgroundColor: showFavoritesOnly ? '#ff4d4d' : '#333',
              color: 'white', padding: '10px 15px', borderRadius: '8px', cursor: 'pointer', border: '1px solid #555'
            }}
          >
            {showFavoritesOnly ? '🏠 Voir Tout' : '❤️ Mes Favoris'}
          </button>
        )}
      </header>

      {selectedPokemon ? (
        <PokemonDetail
          pokemon={selectedPokemon}
          onBack={() => setSelectedPokemon(null)}
          onNavigate={(newPoke) => handleSelectPokemon(newPoke)} // On utilise handleSelectPokemon pour la navigation aussi !
          onToggleFavorite={saveFavorite}
          isFavorite={favorites.some(f => f.name === selectedPokemon.name)}
        />
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '30px', gap: '15px' }}>
            {/* Zone de Reset et Recherche */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', width: '100%' }}>
               <button
                onClick={() => { setSearchTerm(""); setSelectedType(""); setSortCriteria("id"); }}
                title="Réinitialiser les filtres"
                style={{ backgroundColor: '#333', color: 'white', border: '1px solid #555', borderRadius: '8px', padding: '0 15px', cursor: 'pointer' }}
              >
                🧹
              </button>
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ padding: '15px', borderRadius: '8px', border: '1px solid #333', backgroundColor: '#111', color: 'white', width: '300px', textAlign: 'center' }}
              />
            </div>

            {/* Zone des filtres (Flexbox pour alignement) */}
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center', color: 'white' }}>
              <div>
                <label>Trier par : </label>
                <select value={sortCriteria} onChange={(e) => setSortCriteria(e.target.value)} style={{ padding: '8px', borderRadius: '5px', backgroundColor: '#222', color: 'white' }}>
                  <option value="id">N° National</option>
                  <option value="name">Nom (A-Z)</option>
                  <option value="weight">Poids</option>
                  <option value="height">Taille</option>
                </select>
              </div>
              <div>
                <label>Type : </label>
                <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} style={{ padding: '8px', borderRadius: '5px', backgroundColor: '#222', color: 'white' }}>
                  <option value="">Tous</option>
                  {POKEMON_TYPES.map(t => <option key={t.id} value={t.id}>{t.fr}</option>)}
                </select>
              </div>
            </div>
          </div>

          {isLoading ? (
             /* Loader optimisé : affichage conditionnel basé sur l'état isLoading */
            <div className="pikachu-loader-container">
               <img src="https://raw.githubusercontent.com/aureliencandillier-cyber/Pokedex/main/public/pikachu-running.gif" alt="loading" className="pikachu-gif"/>
               <div className="loading-text">Chargement... {progress}%</div>
               <div className="progress-bar-background">
                  <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
               </div>
            </div>
          ) : (
            <div className="pokemon-list">
              {filteredPokemons.map((poke) => (
                <PokemonCard 
                  key={poke.name} // La prop 'key' est cruciale pour que React identifie les éléments de la liste
                  pokemon={poke} 
                  onSelect={handleSelectPokemon} // C'est ici qu'on branche la fonction de "réparation"
                />
              ))}
              {filteredPokemons.length === 0 && <p style={{ textAlign: 'center', color: '#666', width: '100%' }}>Aucun résultat.</p>}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;