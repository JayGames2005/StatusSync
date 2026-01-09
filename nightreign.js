// Nightreign Seed Finder Module
// Uses complete seed database from Nightreign-Seed-Finder GitHub repo
// Data source: https://github.com/Artimuz/Nightreign-Seed-Finder

// Load the complete seed database (340+ seeds)
const nightreignSeeds = require('./seed_data.json');

// Building types found in the seed database
const buildingTypes = {
    // Base buildings
    church: 'Church',
    church_spawn: 'Church (Spawn)',
    sorcerers: "Sorcerer's Rise",
    township: 'Township',
    greatchurch: 'Great Church',
    fort: 'Fort',
    mainencampment: 'Main Encampment',
    ruins: 'Ruins',
    
    // Elemental variants
    greatchurch_fire: 'Great Church (Fire)',
    greatchurch_holy: 'Great Church (Holy)',
    greatchurch_eletric: 'Great Church (Electric)',
    greatchurch_frostbite: 'Great Church (Frostbite)',
    greatchurch_sleep: 'Great Church (Sleep)',
    
    fort_magic: 'Fort (Magic)',
    
    mainencampment_fire: 'Main Encampment (Fire)',
    mainencampment_eletric: 'Main Encampment (Electric)',
    mainencampment_madness: 'Main Encampment (Madness)',
    
    ruins_poison: 'Ruins (Poison)',
    ruins_frostbite: 'Ruins (Frostbite)',
    ruins_blight: 'Ruins (Blight)',
    ruins_bleed: 'Ruins (Bleed)',
    ruins_eletric: 'Ruins (Electric)',
    ruins_magic: 'Ruins (Magic)',
    ruins_sleep: 'Ruins (Sleep)',
    ruins_holy: 'Ruins (Holy)',
    
    // Update 1.0 buildings (1000+ seed series)
    forge: 'Forge',
    forge_fire: 'Forge (Fire)',
    forge_poison: 'Forge (Poison)',
    forge_eletric: 'Forge (Electric)',
    forge_holy: 'Forge (Holy)',
    forge_bleed: 'Forge (Bleed)',
    
    marsh_poison: 'Marsh (Poison)',
    marsh_bleed: 'Marsh (Bleed)',
    marsh_rot: 'Marsh (Rot)',
    marsh_frostbite: 'Marsh (Frostbite)',
    marsh_madness: 'Marsh (Madness)',
    marsh_sleep: 'Marsh (Sleep)',
    
    // Great Hollow special buildings
    WUF_magic: 'West Upper Floor (Magic)',
    WUF_fire: 'West Upper Floor (Fire)',
    EUF_holy: 'East Upper Floor (Holy)',
    EUF_rot: 'East Upper Floor (Rot)',
    ScaleBearingMerchant: 'Scale-Bearing Merchant',
    
    // Special
    empty_spawn: 'Empty (Spawn)'
};

// Extract unique nightlords from seed data
const nightlords = [...new Set(nightreignSeeds.map(seed => seed.nightlord))].sort();

// Extract unique event types
const eventTypes = [...new Set(nightreignSeeds.map(seed => seed.Event).filter(e => e))].sort();

// Map type names for display
const mapNames = {
    Normal: 'Normal',
    Mountaintop: 'Mountaintop',
    Noklateo: 'Noklateo',
    Rotted: 'Rotted Woods',
    Crater: 'Crater',
    'Great Hollow': 'Great Hollow'
};

// Normalize map type for consistent matching
function normalizeMapType(mapType) {
    const normalized = {
        'normal': 'Normal',
        'mountaintop': 'Mountaintop',
        'noklateo': 'Noklateo',
        'rotted': 'Rotted',
        'rotted woods': 'Rotted',
        'crater': 'Crater',
        'great hollow': 'Great Hollow',
        'greathollow': 'Great Hollow'
    };
    return normalized[mapType.toLowerCase()] || mapType;
}

// Search seeds based on criteria
function searchSeeds(criteria) {
    const { mapType, markedSlots, nightlord, spawnSlot } = criteria;
    
    let results = nightreignSeeds;
    
    // Filter by map type
    if (mapType) {
        const normalizedMapType = normalizeMapType(mapType);
        results = results.filter(seed => normalizeMapType(seed.map_type) === normalizedMapType);
    }
    
    // Filter by nightlord
    if (nightlord) {
        results = results.filter(seed => seed.nightlord === nightlord);
    }
    
    // Filter by marked slots (must match ALL marked slots)
    if (markedSlots && Object.keys(markedSlots).length > 0) {
        results = results.filter(seed => {
            for (const [slotId, buildingType] of Object.entries(markedSlots)) {
                // Normalize slot ID (remove any prefixes)
                const normalizedSlotId = slotId.replace('slot_', '');
                
                // Check if seed has this building at this slot
                if (seed.slots[normalizedSlotId] !== buildingType) {
                    return false;
                }
            }
            return true;
        });
    }
    
    return results;
}

// Get available buildings for a specific slot across all seeds of a map type
function getAvailableBuildingsForSlot(mapType, slotId) {
    const normalizedMapType = normalizeMapType(mapType);
    const seeds = nightreignSeeds.filter(seed => normalizeMapType(seed.map_type) === normalizedMapType);
    
    const buildings = new Set();
    seeds.forEach(seed => {
        const building = seed.slots[slotId.toString()];
        if (building && building !== '') {
            buildings.add(building);
        }
    });
    
    return Array.from(buildings).sort();
}

// Get slot count for a map type (27 for normal maps, 20 for Great Hollow)
function getSlotCount(mapType) {
    const normalizedMapType = normalizeMapType(mapType);
    return normalizedMapType === 'Great Hollow' ? 20 : 27;
}

module.exports = {
    nightreignSeeds,
    buildingTypes,
    mapNames,
    nightlords,
    eventTypes,
    searchSeeds,
    getAvailableBuildingsForSlot,
    getSlotCount,
    normalizeMapType
};
