import { useState, useEffect, useMemo } from 'react';
import './App.css';
import PokemonCard from './PokemonCard';
import PokemonDetail from './PokemonDetail';

function App() {
  const [pokemonList, setPokemonList] = useState([]);
  const [selectedPokemon, setSelectedPokemon] = useState(null);
  
  // NOUVEAU : État pour gérer la progression (0 à 100)
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('pokedex_favorites');
    return saved ? JSON.parse(saved) : [];
  });

  const saveFavorite = (pokemon) => {
    const isAlreadyFavorite = favorites.some(fav => fav.name === pokemon.name);
    let updatedFavorites;
    if (isAlreadyFavorite) {
      updatedFavorites = favorites.filter(fav => fav.name !== pokemon.name);
    } else {
      updatedFavorites = [...favorites, pokemon];
    }
    setFavorites(updatedFavorites);
    localStorage.setItem('pokedex_favorites', JSON.stringify(updatedFavorites));
  };

  useEffect(() => {
    const fetchAndTranslate = async () => {
      try {
        setIsLoading(true);
        setProgress(0); // Reset

        // 1. ON CHARGE TOUT LE MONDE (limit=1302 est le max actuel approx, ou 2000 pour être sûr)
        // Attention : Cela peut prendre 10-20 secondes selon la connexion !
        const response = await fetch('https://pokeapi.co/api/v2/pokemon?limit=1302');
        const data = await response.json();
        
        const total = data.results.length;
        let count = 0;

        // 2. ENRICHISSEMENT AVEC BARRE DE PROGRESSION
        const enrichedList = await Promise.all(
          data.results.map(async (poke) => {
            const id = poke.url.split('/').filter(Boolean).pop();
            let frName = poke.name; // Fallback anglais

            try {
              // On récupère le nom français
              const sRes = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}/`);
              if (sRes.ok) {
                const sData = await sRes.json();
                const found = sData.names.find(n => n.language.name === 'fr');
                if (found) frName = found.name;
              }
            } catch (e) {
              // Certaines formes spéciales n'ont pas de fiche "species", on ignore l'erreur
            }

            // MISE À JOUR DE LA PROGRESSION
            count++;
            // On met à jour le state tous les 10 items pour ne pas faire laguer le rendu
            if (count % 10 === 0 || count === total) {
              setProgress(Math.round((count / total) * 100));
            }

            return { ...poke, id, frName };
          })
        );

        setPokemonList(enrichedList);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAndTranslate();
  }, []);

  const filteredPokemons = useMemo(() => {
    const baseList = showFavoritesOnly ? favorites : pokemonList;
    return baseList.filter(poke => 
      poke.frName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      poke.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, pokemonList, favorites, showFavoritesOnly]);

  return (
    <div className="App">
      <header style={{ position: 'relative', marginBottom: '40px' }}>
        <h1>{showFavoritesOnly ? "Mes Pokémons Favoris" : "Pokédex National"}</h1>
        {!selectedPokemon && (
          <button
            className="btn-favorites"
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            style={{
              position: 'absolute', top: '10px', right: '0',
              backgroundColor: showFavoritesOnly ? '#ff4d4d' : '#333',
              color: 'white', padding: '10px 15px', borderRadius: '8px', cursor: 'pointer',
              border: '1px solid #555', fontWeight: 'bold'
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
          onNavigate={(newPoke) => setSelectedPokemon(newPoke)}
          onToggleFavorite={saveFavorite}
          isFavorite={favorites.some(f => f.name === selectedPokemon.name)}
        />
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '30px', gap: '10px' }}>
             <button
              onClick={() => setSearchTerm("")}
              title="Nettoyer la recherche"
              style={{
                backgroundColor: '#333', color: 'white', border: '1px solid #555',
                borderRadius: '8px', padding: '0 15px', fontSize: '1.2rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >
              🧹
            </button>
            <input
              className="search-input"
              type="text"
              placeholder="Rechercher un pokémon..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                flex: 1, maxWidth: '400px', padding: '15px', borderRadius: '8px',
                border: '1px solid #333', backgroundColor: '#111', color: 'white', textAlign: 'center'
              }}
            />
          </div>

          {isLoading ? (
            /* --- LE LOADER PIKACHU --- */
            <div className="pikachu-loader-container">
              <img className="pikachu-gif" 
                src="/pikachu-running.gif" 
                alt="Pikachu running"
              />
              <div className="loading-text">Attrapez-les tous... {progress}%</div>
              <div className="progress-bar-background">
                <div 
                  className="progress-bar-fill" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p style={{color: '#666', marginTop: '10px', fontSize: '0.8rem'}}>Chargement de {progress > 0 ? Math.floor((progress/100)*1302) : 0} / 1302 Pokémons</p>
            </div>
          ) : (
            <div className="pokemon-list">
              {filteredPokemons.map((poke) => (
                <PokemonCard key={poke.name} pokemon={poke} onSelect={setSelectedPokemon} />
              ))}
              {filteredPokemons.length === 0 && (
                <p style={{ width: '100%', textAlign: 'center', color: '#666', marginTop: '20px' }}>
                  Aucun Pokémon trouvé. Essayez le balais 🧹 !
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;