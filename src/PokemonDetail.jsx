import { useState, useEffect, useLayoutEffect, useRef } from 'react';

// --- CACHE GLOBAL (HORS DU COMPOSANT) ---
// Permet de stocker les noms français déjà chargés pour ne pas rappeler l'API
const EVOLUTION_CACHE = {};

function PokemonDetail({ pokemon, onBack, onToggleFavorite, isFavorite, onNavigate }) {
  const [details, setDetails] = useState(null);
  const [species, setSpecies] = useState(null);
  const [evolutions, setEvolutions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const evoRef = useRef(null);

  // ÉTATS VISUELS
  const [currentArtwork, setCurrentArtwork] = useState("");
  const [artworkName, setArtworkName] = useState("Officiel");

  // --- LOGIQUE DE SCROLL ---
  useLayoutEffect(() => {
    const isNavigating = sessionStorage.getItem('is_navigating_evo');
    if (!loading && isNavigating && evoRef.current) {
      evoRef.current.scrollIntoView({ behavior: 'instant', block: 'center' });
      sessionStorage.removeItem('is_navigating_evo');
    }
  }, [loading, details]);

  // --- DICTIONNAIRES (COULEURS & TRADUCTIONS) ---
  const typeColors = {
    normal: '#A8A77A', fire: '#EE8130', water: '#6390F0', electric: '#F7D02C',
    grass: '#7AC74C', ice: '#96D9D6', fighting: '#C22E28', poison: '#A33EA1',
    ground: '#E2BF65', flying: '#A98FF3', psychic: '#F95587', bug: '#A6B91A',
    rock: '#B6A136', ghost: '#735797', dragon: '#6F35FC', steel: '#B7B7CE',
    fairy: '#D685AD', dark: '#705746'
  };

  const typeTranslations = {
    fire: 'Feu', water: 'Eau', grass: 'Plante', electric: 'Électrik',
    ice: 'Glace', fighting: 'Combat', poison: 'Poison', ground: 'Sol',
    flying: 'Vol', psychic: 'Psy', bug: 'Insecte', rock: 'Roche',
    ghost: 'Spectre', dragon: 'Dragon', steel: 'Acier', fairy: 'Fée',
    normal: 'Normal', dark: 'Ténèbres'
  };

  const typeMatchups = {
    normal: { rock: 0.5, ghost: 0, steel: 0.5 },
    fire: { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
    water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
    grass: { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
    electric: { water: 2, grass: 0.5, electric: 0.5, ground: 0, flying: 2, dragon: 0.5 },
    ice: { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
    fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5 },
    poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
    ground: { fire: 2, grass: 0.5, electric: 2, poison: 2, bug: 0.5, rock: 2, steel: 2 },
    flying: { grass: 2, electric: 0.5, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
    psychic: { fighting: 2, poison: 2, psychic: 0.5, steel: 0.5, dark: 0 },
    bug: { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5 },
    rock: { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
    ghost: { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
    dragon: { dragon: 2, steel: 0.5, fairy: 0 },
    steel: { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
    dark: { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
    fairy: { fighting: 2, poison: 0.5, steel: 0.5, dragon: 2, dark: 2, fire: 0.5 }
  };

  const calculateWeaknesses = (types) => {
    let weaknesses = {};
    Object.keys(typeMatchups).forEach(atkType => {
      let multiplier = 1;
      types.forEach(defType => {
        const factor = typeMatchups[atkType][defType.type.name];
        if (factor !== undefined) multiplier *= factor;
      });
      if (multiplier !== 1) weaknesses[atkType] = multiplier;
    });
    return weaknesses;
  };

  const getFrenchName = (dataSpecies = species) => {
    if (!dataSpecies) return details?.name || "";
    const entry = dataSpecies.names.find(n => n.language.name === 'fr');
    return entry ? entry.name : details?.name || "";
  };

  const getFrenchDescription = () => {
    if (!species) return "";
    const entry = species.flavor_text_entries.find(e => e.language.name === 'fr');
    return entry ? entry.flavor_text.replace(/[\n\f\r]/g, ' ') : "Description non disponible.";
  };

  const formatStatName = (name) => {
    const labels = { 'hp': 'PV', 'attack': 'Attaque', 'defense': 'Défense', 'special-attack': 'Atk. Spé', 'special-defense': 'Déf. Spé', 'speed': 'Vitesse' };
    return labels[name] || name;
  };

  const translateEggGroup = (name) => {
    const groups = { 'monster': 'Monstre', 'bug': 'Insecte', 'flying': 'Volant', 'grass': 'Plante', 'water1': 'Aquatique 1', 'water2': 'Aquatique 2', 'water3': 'Aquatique 3', 'mineral': 'Minéral', 'human-like': 'Humanoïde', 'fairy': 'Fée', 'ditto': 'Métamorph' };
    return groups[name] || name;
  };

  const changeArtwork = (type) => {
    if (!details) return;
    switch(type) {
      case 'official':
        setCurrentArtwork(details.sprites.other['official-artwork'].front_default);
        setArtworkName("Officiel");
        break;
      case 'shiny':
        setCurrentArtwork(details.sprites.other['official-artwork'].front_shiny || details.sprites.front_shiny);
        setArtworkName("Chromatique ✨");
        break;
      case 'retro':
        const retro = details.sprites.versions['generation-iii']?.['ruby-sapphire']?.front_default || details.sprites.front_default;
        setCurrentArtwork(retro);
        setArtworkName("Rétro (GBA)");
        break;
      case 'pixel':
        setCurrentArtwork(details.sprites.front_default);
        setArtworkName("Pixel Art");
        break;
      default: break;
    }
  };

  // --- LOGIQUE DE RÉCUPÉRATION DES ÉVOLUTIONS (AVEC CACHE & MULTI-BRANCHES) ---
  const getEvoChain = async (url) => {
    const response = await fetch(url);
    const data = await response.json();
    let chainList = [];

    // Fonction récursive qui parcourt tout l'arbre
    const traverse = async (node) => {
      const pokeId = node.species.url.split('/').filter(Boolean).pop();
      let frName = node.species.name; // Fallback

      // 1. VÉRIFICATION DU CACHE
      if (EVOLUTION_CACHE[node.species.name]) {
        frName = EVOLUTION_CACHE[node.species.name];
      } else {
        // 2. FETCH SI PAS EN CACHE
        try {
          const sRes = await fetch(node.species.url);
          const sData = await sRes.json();
          const foundName = sData.names.find(n => n.language.name === 'fr')?.name;
          if (foundName) {
            frName = foundName;
            // 3. MISE EN CACHE
            EVOLUTION_CACHE[node.species.name] = frName;
          }
        } catch (e) {
          console.warn("Erreur traduction évolution", e);
        }
      }

      chainList.push({
        name: node.species.name,
        frName: frName,
        id: pokeId,
        image: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokeId}.png`
      });

      // Gestion des branches multiples (ex: Evoli)
      if (node.evolves_to && node.evolves_to.length > 0) {
        // On attend que toutes les branches soient traitées
        await Promise.all(node.evolves_to.map(child => traverse(child)));
      }
    };

    await traverse(data.chain);
    
    // Optionnel : On trie par ID pour garder un ordre logique (ex: Vaporeon avant Jolteon)
    chainList.sort((a, b) => parseInt(a.id) - parseInt(b.id));
    
    setEvolutions(chainList);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const id = pokemon.id || pokemon.url.split('/').filter(Boolean).pop();
        const [pRes, sRes] = await Promise.all([
          fetch(`https://pokeapi.co/api/v2/pokemon/${id}`),
          fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}`)
        ]);
        const pData = await pRes.json();
        const sData = await sRes.json();
        setDetails(pData);
        setSpecies(sData);
        setCurrentArtwork(pData.sprites?.other['official-artwork']?.front_default || pData.sprites?.front_default);
        if (sData.evolution_chain?.url) {
          await getEvoChain(sData.evolution_chain.url);
        }
      } catch (error) {
        console.error("Erreur:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [pokemon]);

  if (!details && loading) return <div className="loader"></div>;
  if (!details || !species) return <p style={{ color: 'white' }}>Erreur de données.</p>;

  const weaknesses = calculateWeaknesses(details.types);

  return (
    <>
      {/* STYLE POUR L'ANIMATION FADE-IN */}
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade {
            animation: fadeIn 0.4s ease-out forwards;
          }
        `}
      </style>

      <div 
        // CLÉ UNIQUE POUR DÉCLENCHER L'ANIMATION À CHAQUE CHANGEMENT D'ID
        key={details.id}
        className="pokemon-detail-container animate-fade" 
        style={{ 
          color: 'white', paddingBottom: '80px', maxWidth: '800px', margin: '0 auto',
          // On garde l'opacité pour le loading interne si besoin, mais l'animation gère l'arrivée
          opacity: loading ? 0.8 : 1, 
          transition: 'opacity 0.2s'
        }}
      >
        
        <button onClick={onBack} style={{ cursor: 'pointer', padding: '10px', marginBottom: '20px' }}>← Retour</button>
        
        <div style={{ 
          backgroundColor: '#1a1a1a', borderRadius: '20px', padding: '30px', 
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)', border: `2px solid ${species.color?.name || '#333'}` 
        }}>
          
          {/* --- HEADER --- */}
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src={currentArtwork} alt={getFrenchName()} style={{ maxHeight: '200px', filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.2))' }} />
            </div>
            <p style={{ color: '#888', fontSize: '0.8rem', marginTop: '10px' }}>Version : <strong>{artworkName}</strong></p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '10px' }}>
              <button onClick={() => changeArtwork('official')} style={btnVersionStyle}>Moderne</button>
              <button onClick={() => changeArtwork('shiny')} style={btnVersionStyle}>Shiny ✨</button>
              <button onClick={() => changeArtwork('pixel')} style={btnVersionStyle}>Pixel</button>
              <button onClick={() => changeArtwork('retro')} style={btnVersionStyle}>Rétro</button>
            </div>

            <h1 style={{ textTransform: 'capitalize', margin: '20px 0 10px 0', fontSize: '2.5rem' }}>
              {getFrenchName()} <span style={{ color: '#666', fontSize: '0.6em' }}>#{details.id}</span>
            </h1>
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
              {details.types.map((t) => (
                <span key={t.type.name} style={{
                  background: typeColors[t.type.name] || '#333', 
                  padding: '6px 18px', borderRadius: '20px', fontWeight: 'bold', border: '1px solid rgba(255,255,255,0.2)', textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
                }}>
                  {typeTranslations[t.type.name] || t.type.name}
                </span>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '30px', textAlign: 'center', fontStyle: 'italic', color: '#ccc' }}>
            "{getFrenchDescription()}"
          </div>

          {/* --- INFOS --- */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px', backgroundColor: '#000', padding: '20px', borderRadius: '15px', marginBottom: '30px' }}>
            <div><h4 style={{ color: '#666', margin: '0 0 5px 0' }}>Taille</h4><p>{details.height / 10} m</p></div>
            <div><h4 style={{ color: '#666', margin: '0 0 5px 0' }}>Poids</h4><p>{details.weight / 10} kg</p></div>
            <div><h4 style={{ color: '#666', margin: '0 0 5px 0' }}>Génération</h4><p style={{ textTransform: 'uppercase' }}>{species.generation?.name.replace('generation-', 'Gen ')}</p></div>
            <div><h4 style={{ color: '#666', margin: '0 0 5px 0' }}>Groupe d'œuf</h4><p style={{ textTransform: 'capitalize' }}>{species.egg_groups?.map(g => translateEggGroup(g.name)).join(', ')}</p></div>
            <div><h4 style={{ color: '#666', margin: '0 0 5px 0' }}>Habitat</h4><p style={{ textTransform: 'capitalize' }}>{species.habitat?.name || 'Inconnu'}</p></div>
          </div>

          {/* --- STATS --- */}
          <h3 style={{ borderBottom: '1px solid #444', paddingBottom: '10px', marginBottom: '15px' }}>Statistiques</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '30px' }}>
            {details.stats.map((stat) => (
              <div key={stat.stat.name} style={{ display: 'flex', alignItems: 'center', fontSize: '0.9rem' }}>
                <span style={{ width: '80px', fontWeight: 'bold', color: '#888' }}>{formatStatName(stat.stat.name)}</span>
                <span style={{ width: '40px', textAlign: 'right', marginRight: '10px' }}>{stat.base_stat}</span>
                <div style={{ flex: 1, height: '10px', backgroundColor: '#333', borderRadius: '5px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(stat.base_stat / 1.5, 100)}%`, height: '100%', backgroundColor: stat.base_stat > 100 ? '#00d2d3' : (stat.base_stat > 70 ? '#4CAF50' : '#ff9f43') }}></div>
                </div>
              </div>
            ))}
          </div>

          {/* --- SENSIBILITÉS --- */}
          <h3 style={{ borderBottom: '1px solid #444', paddingBottom: '10px', marginBottom: '15px' }}>Sensibilités</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(85px, 1fr))', gap: '10px', marginBottom: '30px' }}>
            {Object.entries(weaknesses).sort((a, b) => b[1] - a[1]).map(([type, mult]) => (
              <div key={type} style={{
                textAlign: 'center', padding: '8px', borderRadius: '8px', backgroundColor: '#050505',
                borderTop: `4px solid ${typeColors[type] || '#333'}`,
                borderLeft: '1px solid #333', borderRight: '1px solid #333', borderBottom: '1px solid #333',
              }}>
                <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 'bold', color: typeColors[type] || '#aaa', marginBottom: '2px' }}>{typeTranslations[type] || type}</div>
                <div style={{ fontWeight: 'bold', fontSize: '1rem', color: mult > 1 ? '#ff4d4d' : (mult < 1 ? '#4CAF50' : 'white') }}>{mult}x</div>
              </div>
            ))}
          </div>

          {/* --- ÉVOLUTIONS (GRILLE FAMILIALE) --- */}
          <h3 ref={evoRef} style={{ borderBottom: '1px solid #444', paddingBottom: '10px', marginBottom: '15px' }}>
            Famille d'évolution {loading && "..."}
          </h3>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: '20px', marginBottom: '30px' }}>
            {evolutions.map((evo) => (
              <div key={evo.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div 
                  onClick={() => {
                    if (evo.name !== details.name) {
                      sessionStorage.setItem('is_navigating_evo', 'true');
                      // CHANGEMENT IMPORTANT ICI : On passe frName pour la cohérence
                      onNavigate({ 
                          name: evo.name, 
                          frName: evo.frName, 
                          url: `https://pokeapi.co/api/v2/pokemon/${evo.id}/` 
                      });
                    }
                  }} 
                  style={{ 
                    textAlign: 'center', 
                    cursor: evo.name === details.name ? 'default' : 'pointer',
                    transition: 'transform 0.2s',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => evo.name !== details.name && (e.currentTarget.style.transform = 'scale(1.1)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                >
                  <div style={{ 
                    width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#050505', 
                    border: evo.name === details.name ? `3px solid ${species.color?.name || 'white'}` : '1px solid #333',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: evo.name === details.name ? '0 0 20px rgba(255,255,255,0.4)' : 'none'
                  }}>
                    <img src={evo.image} alt={evo.name} style={{ width: '60px' }} />
                  </div>
                  <p style={{ marginTop: '8px', fontSize: '0.85rem', textTransform: 'capitalize', fontWeight: evo.name === details.name ? 'bold' : 'normal', color: evo.name === details.name ? 'white' : '#888' }}>
                    {evo.frName}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* --- TALENTS --- */}
          <div style={{ marginTop: '30px' }}>
              <h3 style={{ borderBottom: '1px solid #444', paddingBottom: '10px', marginBottom: '15px' }}>Talents</h3>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {details.abilities.map(a => (
                      <span key={a.ability.name} style={{ backgroundColor: '#222', border: '1px solid #444', padding: '8px 15px', borderRadius: '8px', textTransform: 'capitalize' }}>
                          {a.ability.name} {a.is_hidden && <span style={{ fontSize: '0.8em', color: '#ff4d4d' }}> (Caché)</span>}
                      </span>
                  ))}
              </div>
          </div>
        </div>

        <button
          onClick={() => onToggleFavorite(pokemon)}
          style={{ position: 'fixed', bottom: '20px', right: '20px', padding: '15px 25px', borderRadius: '50px', border: 'none', cursor: 'pointer', backgroundColor: isFavorite ? '#ff4d4d' : '#2A75BB', color: 'white', fontWeight: 'bold', fontSize: '1.1rem', boxShadow: '0 4px 15px rgba(0,0,0,0.4)', zIndex: 999 }}
        >
          {isFavorite ? '❤️ Retirer' : '🤍 Ajouter aux favoris'}
        </button>
      </div>
    </>
  );
}

// J'ai ajouté ce style qui manquait dans ton code fourni
const btnVersionStyle = {
  backgroundColor: '#222', color: '#ccc', border: '1px solid #444', padding: '4px 10px', borderRadius: '10px', fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.2s'
};

export default PokemonDetail;