function PokemonCard({ pokemon, onSelect }) {
    const displayName = pokemon.frName || pokemon.name;
    const pokemonId = pokemon.id || pokemon.url.split('/').filter(Boolean).pop();
    const imageUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`;

    return (
        <div className="pokemon-card-vignette" onClick={() => onSelect(pokemon)}>
            <img src={imageUrl} alt={displayName} style={{ width: '96px', height: '96px' }} />
            <h3 style={{ textTransform: 'capitalize', color: 'white' }}>{displayName}</h3>
            <button 
                onClick={(e) => { e.stopPropagation(); onSelect(pokemon); }}
                style={{ 
                    backgroundColor: '#8a8a8a', // Ton Gris
                    color: 'white',             // Ton Blanc
                    border: 'none', 
                    padding: '8px 16px', 
                    borderRadius: '20px', 
                    cursor: 'pointer',
                    fontWeight: 'bold'
                }}
            >
                Voir détails
            </button>
        </div>
    );
}

export default PokemonCard;