// Nightreign Seed Finder Module - Interactive Map Builder
const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// Building types available in Nightreign
const buildingTypes = {
    'church': { name: 'Church', emoji: '⛪', description: 'Grace restoration' },
    'village': { name: 'Village', emoji: '🏘️', description: 'NPC merchant hub' },
    'sorcerer_rise': { name: "Sorcerer's Rise", emoji: '🗼', description: 'Magic enhancement' },
    'none': { name: 'Empty', emoji: '⚫', description: 'No building' }
};

// Map locations - these are the orange dot positions on the map
const mapLocations = [
    'North', 'Northeast', 'East', 'Southeast', 
    'South', 'Southwest', 'West', 'Northwest', 
    'Center'
];

// Spawn locations for each map
const spawnLocations = ['North Spawn', 'South Spawn', 'East Spawn', 'West Spawn'];

// Boss encounters that appear in runs
const bossEncounters = [
    'Gravebird', 'Crucible Knight', 'Erdtree Avatar', 'Ulcerated Tree Spirit',
    'Night Cavalry', 'Deathbird', 'Beastman', 'Stonedigger Troll',
    'Zamor Knight', 'Frost Dragon', 'Ancient Hero', 'Misbegotten Warrior',
    'Mimic Tear', 'Dragonkin Soldier', 'Gargoyle', 'Ancestral Spirit',
    'Cleanrot Knight', 'Kindred of Rot', 'Putrid Crystalian', 'Pest Spirit',
    'Godskin Apostle', 'Draconic Tree Sentinel', 'Black Blade Kindred',
    'Abductor Virgin', 'Magma Wyrm', 'Fire Prelate', 'Man-Serpent'
];

// Comprehensive seed database with spawn, buildings, and boss data
// Each seed only needs 3 key data points to identify
const nightreignSeeds = [
    // NORMAL MAP SEEDS
    {
        id: 'NRM-001',
        mapType: 'normal',
        spawn: 'North Spawn',
        buildings: { 'North': 'church', 'East': 'village', 'South': 'none' },
        boss: 'Gravebird',
        nightlord: 'Gaping Jaw',
        difficulty: 'Easy',
        imageUrl: 'https://artimuz.github.io/Nightreign-Seed-Finder/Images/mapTypes/normalIcon.webp'
    },
    {
        id: 'NRM-002',
        mapType: 'normal',
        spawn: 'South Spawn',
        buildings: { 'North': 'sorcerer_rise', 'West': 'church', 'East': 'none' },
        boss: 'Crucible Knight',
        nightlord: 'Sentient Pest',
        difficulty: 'Easy',
        imageUrl: 'https://artimuz.github.io/Nightreign-Seed-Finder/Images/mapTypes/normalIcon.webp'
    },
    {
        id: 'NRM-003',
        mapType: 'normal',
        spawn: 'East Spawn',
        buildings: { 'Center': 'church', 'North': 'village', 'South': 'sorcerer_rise' },
        boss: 'Night Cavalry',
        nightlord: 'Tricephalos',
        difficulty: 'Medium',
        imageUrl: 'https://artimuz.github.io/Nightreign-Seed-Finder/Images/mapTypes/normalIcon.webp'
    },

    // MOUNTAINTOP SEEDS
    {
        id: 'MTN-001',
        mapType: 'mountaintop',
        spawn: 'West Spawn',
        buildings: { 'North': 'church', 'East': 'sorcerer_rise', 'South': 'village' },
        boss: 'Zamor Knight',
        nightlord: 'Equilibrious Beast',
        difficulty: 'Hard',
        imageUrl: 'https://artimuz.github.io/Nightreign-Seed-Finder/Images/mapTypes/mountainIcon.webp'
    },
    {
        id: 'MTN-002',
        mapType: 'mountaintop',
        spawn: 'North Spawn',
        buildings: { 'Center': 'village', 'South': 'church', 'West': 'none' },
        boss: 'Frost Dragon',
        nightlord: 'Darkdrift Knight',
        difficulty: 'Hard',
        imageUrl: 'https://artimuz.github.io/Nightreign-Seed-Finder/Images/mapTypes/mountainIcon.webp'
    },

    // NOKLATEO SEEDS
    {
        id: 'NOK-001',
        mapType: 'noklateo',
        spawn: 'South Spawn',
        buildings: { 'North': 'sorcerer_rise', 'East': 'church', 'West': 'village' },
        boss: 'Mimic Tear',
        nightlord: 'Augur',
        difficulty: 'Very Hard',
        imageUrl: 'https://artimuz.github.io/Nightreign-Seed-Finder/Images/mapTypes/noklateoIcon.webp'
    },
    {
        id: 'NOK-002',
        mapType: 'noklateo',
        spawn: 'East Spawn',
        buildings: { 'North': 'church', 'South': 'village', 'Center': 'sorcerer_rise' },
        boss: 'Dragonkin Soldier',
        nightlord: 'Heolstor',
        difficulty: 'Very Hard',
        imageUrl: 'https://artimuz.github.io/Nightreign-Seed-Finder/Images/mapTypes/noklateoIcon.webp'
    },

    // ROTTED WOODS SEEDS
    {
        id: 'ROT-001',
        mapType: 'rotted_woods',
        spawn: 'North Spawn',
        buildings: { 'East': 'church', 'South': 'sorcerer_rise', 'West': 'village' },
        boss: 'Cleanrot Knight',
        nightlord: 'Fissure in the Fog',
        difficulty: 'Extreme',
        imageUrl: 'https://artimuz.github.io/Nightreign-Seed-Finder/Images/mapTypes/rotIcon.webp'
    },
    {
        id: 'ROT-002',
        mapType: 'rotted_woods',
        spawn: 'West Spawn',
        buildings: { 'North': 'village', 'Center': 'church', 'East': 'none' },
        boss: 'Kindred of Rot',
        nightlord: 'Gnoster',
        difficulty: 'Hard',
        imageUrl: 'https://artimuz.github.io/Nightreign-Seed-Finder/Images/mapTypes/rotIcon.webp'
    },

    // CRATER SEEDS
    {
        id: 'CRT-001',
        mapType: 'crater',
        spawn: 'East Spawn',
        buildings: { 'North': 'church', 'South': 'sorcerer_rise', 'West': 'village' },
        boss: 'Godskin Apostle',
        nightlord: 'The Shape of Night',
        difficulty: 'Extreme',
        imageUrl: 'https://artimuz.github.io/Nightreign-Seed-Finder/Images/mapTypes/craterIcon.webp'
    },
    {
        id: 'CRT-002',
        mapType: 'crater',
        spawn: 'South Spawn',
        buildings: { 'Center': 'church', 'North': 'village', 'East': 'sorcerer_rise' },
        boss: 'Draconic Tree Sentinel',
        nightlord: 'Darkdrift Knight',
        difficulty: 'Extreme',
        imageUrl: 'https://artimuz.github.io/Nightreign-Seed-Finder/Images/mapTypes/craterIcon.webp'
    },

    // GREAT HOLLOW SEEDS
    {
        id: 'GHL-001',
        mapType: 'great_hollow',
        spawn: 'North Spawn',
        buildings: { 'South': 'church', 'East': 'village', 'West': 'sorcerer_rise' },
        boss: 'Abductor Virgin',
        nightlord: 'Gaping Jaw',
        difficulty: 'Hard',
        imageUrl: 'https://artimuz.github.io/Nightreign-Seed-Finder/Images/mapTypes/greatHollowIcon.webp'
    },
    {
        id: 'GHL-002',
        mapType: 'great_hollow',
        spawn: 'West Spawn',
        buildings: { 'North': 'sorcerer_rise', 'Center': 'village', 'South': 'church' },
        boss: 'Magma Wyrm',
        nightlord: 'Tricephalos',
        difficulty: 'Medium',
        imageUrl: 'https://artimuz.github.io/Nightreign-Seed-Finder/Images/mapTypes/greatHollowIcon.webp'
    },
];

const mapNames = {
    mountaintop: 'Mountaintop of the Giants',
    noklateo: 'Noklateo, Eternal City',
    normal: 'Limgrave (Normal)',
    rotted_woods: 'Caelid Rotted Woods',
    crater: 'Crumbling Farum Azula',
    great_hollow: 'Mt. Gelmir Great Hollow'
};

// Store active seed finder sessions (in-memory)
// userId -> { mapType, spawn, buildings: {}, boss }
const finderSessions = new Map();

// Initialize a new seed finder session
function createFinderSession(userId, mapType) {
    finderSessions.set(userId, {
        mapType,
        spawn: null,
        buildings: {}, // location -> building type
        boss: null
    });
}

// Get user's active session
function getSession(userId) {
    return finderSessions.get(userId);
}

// Update session with spawn selection
function setSpawn(userId, spawn) {
    const session = getSession(userId);
    if (session) session.spawn = spawn;
}

// Update session with building at location
function setBuilding(userId, location, buildingType) {
    const session = getSession(userId);
    if (session) session.buildings[location] = buildingType;
}

// Update session with boss selection
function setBoss(userId, boss) {
    const session = getSession(userId);
    if (session) session.boss = boss;
}

// Clear session
function clearSession(userId) {
    finderSessions.delete(userId);
}

// Filter seeds based on session data (spawn, buildings, boss)
function findMatchingSeeds(session) {
    if (!session || !session.mapType) return [];
    
    let matches = nightreignSeeds.filter(s => s.mapType === session.mapType);
    
    // Filter by spawn if selected
    if (session.spawn) {
        matches = matches.filter(s => s.spawn === session.spawn);
    }
    
    // Filter by buildings if any selected
    if (Object.keys(session.buildings).length > 0) {
        matches = matches.filter(seed => {
            for (const [location, buildingType] of Object.entries(session.buildings)) {
                if (seed.buildings[location] !== buildingType) {
                    return false;
                }
            }
            return true;
        });
    }
    
    // Filter by boss if selected
    if (session.boss) {
        matches = matches.filter(s => s.boss === session.boss);
    }
    
    return matches;
}

// Create initial map selection embed
function createMapSelectionEmbed() {
    const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle('🗺️ Nightreign Seed Finder')
        .setDescription('**Elden Ring: Nightreign** - Find your exact seed!\n\nIdentify your seed in 3 simple steps:\n1️⃣ Select your spawn location\n2️⃣ Mark building locations on the map\n3️⃣ Select which boss you encountered\n\nChoose your map type to begin:')
        .setImage('https://artimuz.github.io/Nightreign-Seed-Finder/Images/logo_header.webp')
        .setFooter({ text: 'Only 3 data points needed to identify your seed!' })
        .setTimestamp();

    return embed;
}

// Create map selection dropdown
function createMapSelectMenu() {
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('nightreign_map_select')
        .setPlaceholder('Choose a map type...')
        .addOptions([
            {
                label: 'Normal (Limgrave)',
                description: 'Starting area - Easy difficulty',
                value: 'normal',
                emoji: '🌲'
            },
            {
                label: 'Mountaintop of the Giants',
                description: 'Endgame frozen peaks - Hard',
                value: 'mountaintop',
                emoji: '🏔️'
            },
            {
                label: 'Noklateo, Eternal City',
                description: 'Underground realm - Very Hard',
                value: 'noklateo',
                emoji: '🌙'
            },
            {
                label: 'Caelid Rotted Woods',
                description: 'Scarlet rot wasteland - Extreme',
                value: 'rotted_woods',
                emoji: '🍄'
            },
            {
                label: 'Crumbling Farum Azula',
                description: 'Floating ruins - Extreme',
                value: 'crater',
                emoji: '⚡'
            },
            {
                label: 'Mt. Gelmir Great Hollow',
                description: 'Volcanic region - Hard',
                value: 'great_hollow',
                emoji: '🌋'
            }
        ]);

    return new ActionRowBuilder().addComponents(selectMenu);
}

// Create seed finder interface showing current progress
function createFinderEmbed(userId) {
    const session = getSession(userId);
    if (!session) return null;
    
    const { mapType, spawn, buildings, boss } = session;
    const matches = findMatchingSeeds(session);
    
    const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`🗺️ ${mapNames[mapType]}`)
        .setDescription('**Mark your findings to identify the seed:**')
        .addFields(
            {
                name: '1️⃣ Spawn Location',
                value: spawn || '❓ Not selected',
                inline: false
            },
            {
                name: '2️⃣ Buildings Found',
                value: Object.keys(buildings).length > 0 
                    ? Object.entries(buildings).map(([loc, type]) => 
                        `${buildingTypes[type].emoji} ${buildingTypes[type].name} at **${loc}**`
                      ).join('\n')
                    : '❓ None marked yet',
                inline: false
            },
            {
                name: '3️⃣ Boss Encountered',
                value: boss || '❓ Not selected',
                inline: false
            },
            {
                name: '🎯 Matching Seeds',
                value: `**${matches.length}** possible seed(s)`,
                inline: false
            }
        )
        .setFooter({ text: 'Use the buttons below to mark your findings' });
    
    return embed;
}

// Create spawn selection buttons
function createSpawnButtons() {
    const buttons = spawnLocations.map(spawn => 
        new ButtonBuilder()
            .setCustomId(`nightreign_spawn_${spawn.replace(' ', '_')}`)
            .setLabel(spawn)
            .setStyle(ButtonStyle.Primary)
            .setEmoji('📍')
    );
    
    // Split into rows (max 5 per row)
    const row = new ActionRowBuilder().addComponents(buttons);
    return [row];
}

// Create location selection buttons for marking buildings
function createLocationButtons() {
    const rows = [];
    let currentRow = [];
    
    mapLocations.forEach((location, index) => {
        currentRow.push(
            new ButtonBuilder()
                .setCustomId(`nightreign_location_${location}`)
                .setLabel(location)
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('📍')
        );
        
        // Create new row after 5 buttons or at end
        if (currentRow.length === 5 || index === mapLocations.length - 1) {
            rows.push(new ActionRowBuilder().addComponents(currentRow));
            currentRow = [];
        }
    });
    
    // Add control buttons
    rows.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('nightreign_view_results')
            .setLabel('View Results')
            .setStyle(ButtonStyle.Success)
            .setEmoji('🎯'),
        new ButtonBuilder()
            .setCustomId('nightreign_clear_all')
            .setLabel('Clear All')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🗑️')
    ));
    
    return rows;
}

// Create building type selection menu for a location
function createBuildingSelectMenu(location) {
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`nightreign_building_${location}`)
        .setPlaceholder(`Select building at ${location}...`)
        .addOptions([
            {
                label: 'Church',
                description: 'Grace restoration point',
                value: 'church',
                emoji: '⛪'
            },
            {
                label: 'Village',
                description: 'NPC merchant hub',
                value: 'village',
                emoji: '🏘️'
            },
            {
                label: "Sorcerer's Rise",
                description: 'Magic enhancement tower',
                value: 'sorcerer_rise',
                emoji: '🗼'
            },
            {
                label: 'None / Empty',
                description: 'No building at this location',
                value: 'none',
                emoji: '⚫'
            }
        ]);
    
    return new ActionRowBuilder().addComponents(selectMenu);
}

// Create boss selection menu
function createBossSelectMenu() {
    const options = bossEncounters.map(boss => ({
        label: boss,
        value: boss,
        emoji: '⚔️'
    }));
    
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('nightreign_boss_select')
        .setPlaceholder('Select which boss you encountered...')
        .addOptions(options);
    
    return new ActionRowBuilder().addComponents(selectMenu);
}

// Create results embed showing matching seeds
function createResultsEmbed(session, page = 0) {
    const matches = findMatchingSeeds(session);
    
    if (matches.length === 0) {
        return new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('❌ No Matching Seeds')
            .setDescription('No seeds match your criteria. Try adjusting your selections.')
            .setFooter({ text: 'Double-check your spawn, buildings, and boss' });
    }
    
    const seed = matches[page];
    const buildingList = Object.entries(seed.buildings)
        .map(([loc, type]) => `${buildingTypes[type].emoji} **${buildingTypes[type].name}** at ${loc}`)
        .join('\n');
    
    const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle(`🎯 Seed Match: ${seed.id}`)
        .setDescription(`**Nightlord:** ${seed.nightlord}\n**Difficulty:** ${seed.difficulty}`)
        .addFields(
            { name: '📍 Spawn', value: seed.spawn, inline: true },
            { name: '⚔️ Boss', value: seed.boss, inline: true },
            { name: '🏛️ Buildings', value: buildingList || 'None', inline: false }
        )
        .setThumbnail(seed.imageUrl)
        .setFooter({ text: `Seed ${page + 1} of ${matches.length}` });
    
    return embed;
}

// Create pagination buttons for results
function createResultsButtons(currentPage, totalResults) {
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`nightreign_result_prev`)
                .setLabel('◀ Previous')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(currentPage === 0),
            new ButtonBuilder()
                .setCustomId(`nightreign_result_next`)
                .setLabel('Next ▶')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(currentPage >= totalResults - 1),
            new ButtonBuilder()
                .setCustomId('nightreign_back_to_finder')
                .setLabel('Back to Finder')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🔍')
        );
    
    return [row];
}

module.exports = {
    buildingTypes,
    mapNames,
    bossEncounters,
    mapLocations,
    spawnLocations,
    createFinderSession,
    getSession,
    setSpawn,
    setBuilding,
    setBoss,
    clearSession,
    findMatchingSeeds,
    createMapSelectionEmbed,
    createMapSelectMenu,
    createFinderEmbed,
    createSpawnButtons,
    createLocationButtons,
    createBuildingSelectMenu,
    createBossSelectMenu,
};

