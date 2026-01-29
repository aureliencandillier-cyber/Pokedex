import { useState, useEffect, useMemo, useCallback } from 'react';
import './App.css';
import PokemonCard from './PokemonCard';
import PokemonDetail from './PokemonDetail';
// Importation de la fonction de récupération de données depuis ton service
import { fetchPokemonLite } from './pokemonApi';

// Liste statique des types pour le menu déroulant
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
  const [pokemonList, setPokemonList] = useState([]); 
  const [selectedPokemon, setSelectedPokemon] = useState(null); 
  const [progress, setProgress] = useState(0); 
  const [isLoading, setIsLoading] = useState(true); 
  
  // États pour les filtres et le tri
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [sortCriteria, setSortCriteria] = useState('id'); 
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // --- PAGINATION VIRTUELLE ---
  // On définit combien de Pokémon sont affichés initialement (50)
  const [visibleCount, setVisibleCount] = useState(50);

  // Initialisation des favoris
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('pokedex_favorites');
    return saved ? JSON.parse(saved) : [];
  });

  const saveFavorite = useCallback((pokemon) => {
    setFavorites(prev => {
      const isFav = prev.some(f => f.name === pokemon.name);
      const updated = isFav ? prev.filter(f => f.name !== pokemon.name) : [...prev, pokemon];
      localStorage.setItem('pokedex_favorites', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // --- CHARGEMENT INITIAL ---
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setProgress(0);
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
  const filteredPokemons = useMemo(() => {
    let list = showFavoritesOnly ? favorites : pokemonList;

    if (searchTerm) {
      list = list.filter(p => (p.frName || p.name).toLowerCase().includes(searchTerm.toLowerCase()));
    }
    if (selectedType) {
      list = list.filter(p => p.types?.some(t => t.type.name === selectedType));
    }

    return [...list].sort((a, b) => {
      switch (sortCriteria) {
        case 'weight': return (b.weight || 0) - (a.weight || 0);
        case 'height': return (b.height || 0) - (a.height || 0);
        case 'name': return (a.frName || a.name).localeCompare(b.frName || b.name);
        default: return a.id - b.id;
      }
    });
  }, [searchTerm, selectedType, sortCriteria, showFavoritesOnly, favorites, pokemonList]);

  // --- LOGIQUE DE PAGINATION ---
  // On crée une sous-liste qui contient uniquement les éléments à afficher
  const displayedPokemons = useMemo(() => {
    return filteredPokemons.slice(0, visibleCount);
  }, [filteredPokemons, visibleCount]);

  // --- EFFET DE RÉINITIALISATION ---
  // Si l'utilisateur change un filtre, on remet la pagination à 50
  // pour éviter d'afficher 500 résultats si on change soudainement de recherche.
  useEffect(() => {
    setVisibleCount(50);
  }, [searchTerm, selectedType, sortCriteria, showFavoritesOnly]);

  return (
    <div className="App">
      <header>
        <h1>{showFavoritesOnly ? "Mes Favoris" : "Pokédex National"}</h1>
        {!selectedPokemon && (
          <button className="btn-favorites" onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}>
            {showFavoritesOnly ? '🏠 Accueil' : '❤️ Mes Favoris'}
          </button>
        )}
      </header>

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

          {isLoading ? (
            <div className="pikachu-loader-container">
              <img className="pikachu-gif" src="/Pokedex/pikachu-running.gif" alt="Pikachu running" />
              <div className="loading-text">Attrapez-les tous... {progress}%</div>
              <div className="progress-bar-background">
                <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          ) : (
            <>
              <div className="pokemon-list">
                {/* On itère sur 'displayedPokemons' au lieu de 'filteredPokemons' */}
                {displayedPokemons.map(p => <PokemonCard key={p.id} pokemon={p} onSelect={setSelectedPokemon} />)}
              </div>

              {/* BOUTON CHARGER PLUS */}
              {/* Il n'apparaît que s'il reste des Pokémon à afficher dans la liste filtrée */}
              {visibleCount < filteredPokemons.length && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
                  <button 
                    className="pokedex-control" // Utilise le style que nous avons créé précédemment
                    onClick={() => setVisibleCount(prev => prev + 50)}
                    style={{ padding: '12px 30px', cursor: 'pointer' }}
                  >
                    Charger plus de Pokémon...
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

export default App;