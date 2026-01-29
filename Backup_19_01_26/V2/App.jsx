import { useState, useEffect, useMemo, useCallback } from 'react';
import './App.css';
import PokemonCard from './PokemonCard';
import PokemonDetail from './PokemonDetail';
// Importation de la fonction de récupération de données depuis ton service
import { fetchPokemonLite } from './pokemonApi';

// Liste statique des types pour le menu déroulant (en dehors pour éviter les re-rendus)
const POKEMON_TYPES = [
  { id: 'normal', fr: 'Normal' }, { id: 'fire', fr: 'Feu' }, { id: 'water', fr: 'Eau' },
  { id: 'grass', fr: 'Plante' }, { id: 'electric', fr: 'Électrik' }, { id: 'ice', fr: 'Glace' },
  { id: 'fighting', fr: 'Combat' }, { id: 'poison', fr: 'Poison' }, { id: 'ground', fr: 'Sol' },
  { id: 'flying', fr: 'Vol' }, { id: 'psychic', fr: 'Psy' }, { id: 'bug', fr: 'Insecte' },
  { id: 'rock', fr: 'Roche' }, { id: 'ghost', fr: 'Spectre' }, { id: 'dragon', fr: 'Dragon' },
  { id: 'dark', fr: 'Ténèbres' }, { id: 'steel', fr: 'Acier' }, { id: 'fairy', fr: 'Fée' }
];

function App() {
  // --- ÉTATS (MÉMOIRE DU COMPOSANT) ---
  const [pokemonList, setPokemonList] = useState([]); // Liste complète des Pokémon chargés
  const [selectedPokemon, setSelectedPokemon] = useState(null); // Pokémon actuellement affiché en détail
  const [progress, setProgress] = useState(0); // Pourcentage de la barre de chargement
  const [isLoading, setIsLoading] = useState(true); // État de chargement initial
  
  // États pour les filtres et le tri
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [sortCriteria, setSortCriteria] = useState('id'); 
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // Initialisation des favoris à partir du stockage local (localStorage)
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('pokedex_favorites');
    return saved ? JSON.parse(saved) : [];
  });

  // Fonction pour ajouter/retirer un favori (mémorisée avec useCallback pour la performance)
  const saveFavorite = useCallback((pokemon) => {
    setFavorites(prev => {
      const isFav = prev.some(f => f.name === pokemon.name);
      const updated = isFav ? prev.filter(f => f.name !== pokemon.name) : [...prev, pokemon];
      localStorage.setItem('pokedex_favorites', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // --- EFFET DE CHARGEMENT INITIAL ---
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setProgress(0);
        // Appel au service externe pour charger les 1008 Pokémon
        const enriched = await fetchPokemonLite(1008, setProgress);
        setPokemonList(enriched);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // --- LOGIQUE DE FILTRAGE ET TRI ---
  // useMemo permet de ne recalculer cette liste que si un paramètre de filtre change
  const filteredPokemons = useMemo(() => {
    let list = showFavoritesOnly ? favorites : pokemonList;

    // Filtrage par nom
    if (searchTerm) {
      list = list.filter(p => (p.frName || p.name).toLowerCase().includes(searchTerm.toLowerCase()));
    }
    // Filtrage par type
    if (selectedType) {
      list = list.filter(p => p.types?.some(t => t.type.name === selectedType));
    }

    // Tri de la liste
    return [...list].sort((a, b) => {
      switch (sortCriteria) {
        case 'weight': return (b.weight || 0) - (a.weight || 0);
        case 'height': return (b.height || 0) - (a.height || 0);
        case 'name': return (a.frName || a.name).localeCompare(b.frName || b.name);
        default: return a.id - b.id;
      }
    });
  }, [searchTerm, selectedType, sortCriteria, showFavoritesOnly, favorites, pokemonList]);

  return (
    <div className="App">
      <header>
        <h1>{showFavoritesOnly ? "Mes Favoris" : "Pokédex National"}</h1>
        {/* Affichage conditionnel du bouton Favoris si aucun Pokémon n'est sélectionné */}
        {!selectedPokemon && (
          <button className="btn-favorites" onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}>
            {showFavoritesOnly ? '🏠 Accueil' : '❤️ Mes Favoris'}
          </button>
        )}
      </header>

      {/* Si un Pokémon est sélectionné, on affiche PokemonDetail, sinon la liste */}
      {selectedPokemon ? (
        <PokemonDetail 
          pokemon={selectedPokemon} 
          onBack={() => setSelectedPokemon(null)}
          onToggleFavorite={saveFavorite}
          isFavorite={favorites.some(f => f.name === selectedPokemon.name)}
          onNavigate={setSelectedPokemon}
        />
      ) : (
        <>
          {/* BARRE DE RECHERCHE ET FILTRES */}
          <div className="filters-container">
            <div className="search-row">
              <button className="btn-icon" onClick={() => {setSearchTerm(""); setSelectedType(""); setSortCriteria("id");}}>🧹</button>
              <input className="search-input" placeholder="Rechercher..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="options-row">
              <select className="filter-select" value={sortCriteria} onChange={(e) => setSortCriteria(e.target.value)}>
                <option value="id">Numéro</option>
                <option value="name">Nom</option>
                <option value="weight">Poids</option>
                <option value="height">Taille</option>
              </select>
              <select className="filter-select" value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
                <option value="">Tous les Types</option>
                {POKEMON_TYPES.map(t => <option key={t.id} value={t.id}>{t.fr}</option>)}
              </select>
            </div>
          </div>

          {/* AFFICHAGE DU LOADER OU DE LA GRILLE */}
          {isLoading ? (
            <div className="pikachu-loader-container">
              <img className="pikachu-gif" src="/Pokedex/pikachu-running.gif" alt="Pikachu running" />
              <div className="loading-text">Attrapez-les tous... {progress}%</div>
              <div className="progress-bar-background">
                <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          ) : (
            <div className="pokemon-list">
              {filteredPokemons.map(p => <PokemonCard key={p.id} pokemon={p} onSelect={setSelectedPokemon} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;