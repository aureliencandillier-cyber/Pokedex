function PokemonCard({ pokemon, onSelect }) {
    // Détermination du nom à afficher (Français si disponible, sinon Anglais)
    const displayName = pokemon.frName || pokemon.name;
    
    // Extraction de l'ID à partir de l'objet ou de l'URL
    const pokemonId = pokemon.id || pokemon.url.split('/').filter(Boolean).pop();
    
    // Construction de l'URL de l'image officielle (Sprite par défaut)
    const imageUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`;

    return (
        // onClick sur la div pour sélectionner le Pokémon
        <div className="pokemon-card-vignette" onClick={() => onSelect(pokemon)}>
            <img src={imageUrl} alt={displayName} style={{ width: '96px', height: '96px' }} />
            <h3 style={{ textTransform: 'capitalize', color: 'white' }}>{displayName}</h3>
            
            <button 
                className="btn-details"
                onClick={(e) => { 
                    e.stopPropagation(); // Empêche le clic de se propager à la div parente
                    onSelect(pokemon); 
                }}
            >
                Voir détails
            </button>
        </div>
    );
}

export default PokemonCard;