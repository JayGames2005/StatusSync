// Nightreign Seed Finder Module - Interactive Map Builder
const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// Building types available in Nightreign
const buildingTypes = {
    // Combat buildings
    'forge': { name: 'Forge', emoji: '⚔️', type: 'combat', description: 'Weapon upgrades' },
    'barracks': { name: 'Barracks', emoji: '🛡️', type: 'combat', description: 'Defensive buffs' },
    'arena': { name: 'Arena', emoji: '⚡', type: 'combat', description: 'Combat training' },
    
    // Resource buildings
    'mine': { name: 'Mine', emoji: '⛏️', type: 'resource', description: 'Ore gathering' },
    'farm': { name: 'Farm', emoji: '🌾', type: 'resource', description: 'Food supplies' },
    'shrine': { name: 'Shrine', emoji: '🕯️', type: 'resource', description: 'Spirit ashes' },
    
    // Boss buildings
    'cathedral': { name: 'Cathedral', emoji: '⛪', type: 'boss', description: 'Holy boss spawn' },
    'catacombs': { name: 'Catacombs', emoji: '💀', type: 'boss', description: 'Undead boss spawn' },
    'tower': { name: 'Tower', emoji: '🗼', type: 'boss', description: 'Mage boss spawn' },
    
    // Special buildings
    'merchant': { name: 'Merchant', emoji: '🏪', type: 'special', description: 'Item shop' },
    'library': { name: 'Library', emoji: '📚', type: 'special', description: 'Spell shop' },
    'stable': { name: 'Stable', emoji: '🐴', type: 'special', description: 'Mount upgrades' },
};

// Map slot configuration (6 slots per map)
const mapSlots = ['A', 'B', 'C', 'D', 'E', 'F'];

// Comprehensive seed database with building positions and rewards
const nightreignSeeds = [
    // NORMAL MAP SEEDS
    {
        id: 'NRM-001',
        mapType: 'normal',
        buildings: { A: 'forge', B: 'barracks', C: 'mine', D: 'farm', E: 'merchant', F: 'shrine' },
        nightlord: 'Gaping Jaw',
        bosses: ['Gravebird', 'Stonedigger Troll', 'Ulcerated Tree Spirit'],
        items: ['Nightreign Shard', 'Sacred Flask', 'Ancient Smithing Stone'],
        difficulty: 'Easy',
        imageUrl: 'https://artimuz.github.io/Nightreign-Seed-Finder/Images/mapTypes/normalIcon.webp'
    },
    {
        id: 'NRM-002',
        mapType: 'normal',
        buildings: { A: 'arena', B: 'merchant', C: 'library', D: 'forge', E: 'farm', F: 'stable' },
        nightlord: 'Sentient Pest',
        bosses: ['Crucible Knight', 'Erdtree Avatar', 'Deathbird'],
        items: ['Crucible Feather', 'Erdtree Blessing', 'Golden Seed x3'],
        difficulty: 'Easy',
        imageUrl: 'https://artimuz.github.io/Nightreign-Seed-Finder/Images/mapTypes/normalIcon.webp'
    },
    {
        id: 'NRM-003',
        mapType: 'normal',
        buildings: { A: 'catacombs', B: 'shrine', C: 'forge', D: 'barracks', E: 'mine', F: 'merchant' },
        nightlord: 'Tricephalos',
        bosses: ['Night Cavalry', 'Beastman', 'Grafted Scion'],
        items: ['Night Shard', 'Beast Blood', 'Grafted Greatsword'],
        difficulty: 'Medium',
        imageUrl: 'https://artimuz.github.io/Nightreign-Seed-Finder/Images/mapTypes/normalIcon.webp'
    },

    // MOUNTAINTOP SEEDS
    {
        id: 'MTN-001',
        mapType: 'mountaintop',
        buildings: { A: 'forge', B: 'cathedral', C: 'library', D: 'barracks', E: 'mine', F: 'stable' },
        nightlord: 'Equilibrious Beast',
        bosses: ['Zamor Knight', 'Frost Dragon', 'Ancient Hero'],
        items: ['Frozen Armament', 'Dragon Scale', 'Hero\'s Rune'],
        difficulty: 'Hard',
        imageUrl: 'https://artimuz.github.io/Nightreign-Seed-Finder/Images/mapTypes/mountainIcon.webp'
    },
    {
        id: 'MTN-002',
        mapType: 'mountaintop',
        buildings: { A: 'arena', B: 'tower', C: 'forge', D: 'shrine', E: 'merchant', F: 'barracks' },
        nightlord: 'Darkdrift Knight',
        bosses: ['Flame Guardian', 'Misbegotten Warrior', 'Putrid Avatar'],
        items: ['Darkdrift Blade', 'Flame Grease', 'Sacred Tear x2'],
        difficulty: 'Hard',
        imageUrl: 'https://artimuz.github.io/Nightreign-Seed-Finder/Images/mapTypes/mountainIcon.webp'
    },

    // NOKLATEO SEEDS
    {
        id: 'NOK-001',
        mapType: 'noklateo',
        buildings: { A: 'library', B: 'catacombs', C: 'shrine', D: 'merchant', E: 'forge', F: 'tower' },
        nightlord: 'Augur',
        bosses: ['Mimic Tear', 'Dragonkin Soldier', 'Gargoyle'],
        items: ['Mimic Veil', 'Dragonscale Blade', 'Gargoyle Twinblade'],
        difficulty: 'Very Hard',
        imageUrl: 'https://artimuz.github.io/Nightreign-Seed-Finder/Images/mapTypes/noklateoIcon.webp'
    },
    {
        id: 'NOK-002',
        mapType: 'noklateo',
        buildings: { A: 'forge', B: 'arena', C: 'library', D: 'stable', E: 'merchant', F: 'catacombs' },
        nightlord: 'Heolstor',
        bosses: ['Ancestral Spirit', 'Celestial Dew', 'Silver Tear'],
        items: ['Spirit Calling Bell', 'Starlight Shard', 'Silver Mirrorshield'],
        difficulty: 'Very Hard',
        imageUrl: 'https://artimuz.github.io/Nightreign-Seed-Finder/Images/mapTypes/noklateoIcon.webp'
    },

    // ROTTED WOODS SEEDS
    {
        id: 'ROT-001',
        mapType: 'rotted_woods',
        buildings: { A: 'shrine', B: 'catacombs', C: 'farm', D: 'forge', E: 'library', F: 'merchant' },
        nightlord: 'Fissure in the Fog',
        bosses: ['Cleanrot Knight', 'Kindred of Rot', 'Putrid Crystalian'],
        items: ['Cleanrot Spear', 'Rot Grease', 'Preserving Boluses'],
        difficulty: 'Extreme',
        imageUrl: 'https://artimuz.github.io/Nightreign-Seed-Finder/Images/mapTypes/rotIcon.webp'
    },
    {
        id: 'ROT-002',
        mapType: 'rotted_woods',
        buildings: { A: 'forge', B: 'barracks', C: 'shrine', D: 'mine', E: 'catacombs', F: 'stable' },
        nightlord: 'Gnoster',
        bosses: ['Scarlet Aeonia', 'Rotten Watchdog', 'Pest Spirit'],
        items: ['Rotten Winged Sword', 'Scarlet Rot Boluses', 'Pest Threads'],
        difficulty: 'Hard',
        imageUrl: 'https://artimuz.github.io/Nightreign-Seed-Finder/Images/mapTypes/rotIcon.webp'
    },

    // CRATER SEEDS
    {
        id: 'CRT-001',
        mapType: 'crater',
        buildings: { A: 'cathedral', B: 'tower', C: 'forge', D: 'library', E: 'shrine', F: 'barracks' },
        nightlord: 'The Shape of Night',
        bosses: ['Godskin Apostle', 'Draconic Tree Sentinel', 'Wyrm'],
        items: ['Godskin Stitcher', 'Dragon Communion', 'Wyrm Greatsword'],
        difficulty: 'Extreme',
        imageUrl: 'https://artimuz.github.io/Nightreign-Seed-Finder/Images/mapTypes/craterIcon.webp'
    },
    {
        id: 'CRT-002',
        mapType: 'crater',
        buildings: { A: 'forge', B: 'arena', C: 'merchant', D: 'cathedral', E: 'library', F: 'stable' },
        nightlord: 'Darkdrift Knight',
        bosses: ['Beastman', 'Farum Azula Dragon', 'Godskin Noble'],
        items: ['Beast Claw', 'Dragon Heart', 'Black Blade Incantation'],
        difficulty: 'Extreme',
        imageUrl: 'https://artimuz.github.io/Nightreign-Seed-Finder/Images/mapTypes/craterIcon.webp'
    },

    // GREAT HOLLOW SEEDS
    {
        id: 'GHL-001',
        mapType: 'great_hollow',
        buildings: { A: 'forge', B: 'catacombs', C: 'merchant', D: 'library', E: 'shrine', F: 'tower' },
        nightlord: 'Gaping Jaw',
        bosses: ['Abductor Virgin', 'Magma Wyrm', 'Godskin Apostle'],
        items: ['Inquisitor\'s Girandole', 'Magma Blade', 'Gelmir Glintstone Staff'],
        difficulty: 'Hard',
        imageUrl: 'https://artimuz.github.io/Nightreign-Seed-Finder/Images/mapTypes/greatHollowIcon.webp'
    },
    {
        id: 'GHL-002',
        mapType: 'great_hollow',
        buildings: { A: 'arena', B: 'forge', C: 'barracks', D: 'mine', E: 'merchant', F: 'stable' },
        nightlord: 'Tricephalos',
        bosses: ['Fire Prelate', 'Man-Serpent', 'Iron Virgin'],
        items: ['Prelate\'s Inferno Crozier', 'Serpent Bow', 'Virgin Abductor Shield'],
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

const mapDescriptions = {
    mountaintop: 'Frozen peaks with legendary endgame bosses',
    noklateo: 'Underground eternal city with cosmic horrors',
    normal: 'Starting area with beginner-friendly encounters',
    rotted_woods: 'Scarlet rot swamplands with deadly foes',
    crater: 'Crumbling ruins with final game bosses',
    great_hollow: 'Volcanic manor with fire-based challenges'
};

// Store active map building sessions (in-memory, can be moved to database later)
const buildSessions = new Map(); // userId -> { mapType, selectedBuildings: {}, filters: [] }

// Initialize a new map building session
function createBuildSession(userId, mapType) {
    buildSessions.set(userId, {
        mapType,
        selectedBuildings: {},
        filters: []
    });
}

// Get user's active session
function getSession(userId) {
    return buildSessions.get(userId);
}

// Update session with building selection
function updateBuilding(userId, slot, buildingType) {
    const session = getSession(userId);
    if (session) {
        session.selectedBuildings[slot] = buildingType;
    }
}

// Clear a building slot
function clearBuilding(userId, slot) {
    const session = getSession(userId);
    if (session) {
        delete session.selectedBuildings[slot];
    }
}

// Filter seeds based on selected buildings
function filterSeeds(mapType, selectedBuildings) {
    const relevantSeeds = nightreignSeeds.filter(s => s.mapType === mapType);
    
    if (Object.keys(selectedBuildings).length === 0) {
        return relevantSeeds;
    }
    
    return relevantSeeds.filter(seed => {
        // Check if seed matches all selected building requirements
        for (const [slot, building] of Object.entries(selectedBuildings)) {
            if (seed.buildings[slot] !== building) {
                return false;
            }
        }
        return true;
    });
}

// Create initial map selection embed
function createMapSelectionEmbed() {
    const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle('🗺️ Nightreign Seed Finder - Interactive Map Builder')
        .setDescription('**Elden Ring: Nightreign** - Build your perfect map!\n\nSelect a map type to begin building your ideal seed configuration.')
        .setImage('https://artimuz.github.io/Nightreign-Seed-Finder/Images/logo_header.webp')
        .addFields(
            { name: '🏔️ Mountaintop', value: mapDescriptions.mountaintop, inline: true },
            { name: '🌙 Noklateo', value: mapDescriptions.noklateo, inline: true },
            { name: '🌲 Normal', value: mapDescriptions.normal, inline: true },
            { name: '🍄 Rotted Woods', value: mapDescriptions.rotted_woods, inline: true },
            { name: '⚡ Crater', value: mapDescriptions.crater, inline: true },
            { name: '🌋 Great Hollow', value: mapDescriptions.great_hollow, inline: true }
        )
        .setFooter({ text: 'Interactive map builder • Based on Artimuz\'s Seed Finder' })
        .setTimestamp();

    return embed;
}

// Create map selection dropdown
function createMapSelectMenu() {
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('nightreign_map_select')
        .setPlaceholder('Choose a map type to start building...')
        .addOptions([
            {
                label: 'Mountaintop of the Giants',
                description: 'Endgame frozen peaks',
                value: 'mountaintop',
                emoji: '🏔️'
            },
            {
                label: 'Noklateo, Eternal City',
                description: 'Underground cosmic realm',
                value: 'noklateo',
                emoji: '🌙'
            },
            {
                label: 'Limgrave (Normal)',
                description: 'Starting area',
                value: 'normal',
                emoji: '🌲'
            },
            {
                label: 'Caelid Rotted Woods',
                description: 'Scarlet rot wasteland',
                value: 'rotted_woods',
                emoji: '🍄'
            },
            {
                label: 'Crumbling Farum Azula',
                description: 'Floating ancient ruins',
                value: 'crater',
                emoji: '⚡'
            },
            {
                label: 'Mt. Gelmir Great Hollow',
                description: 'Volcanic lava region',
                value: 'great_hollow',
                emoji: '🌋'
            }
        ]);

    return new ActionRowBuilder().addComponents(selectMenu);
}

// Create map builder interface
function createMapBuilderEmbed(userId) {
    const session = getSession(userId);
    if (!session) return null;
    
    const { mapType, selectedBuildings } = session;
    const matchingSeeds = filterSeeds(mapType, selectedBuildings);
    
    let mapLayout = '```\n';
    mapLayout += 'MAP LAYOUT (6 Slots)\n';
    mapLayout += '===================\n\n';
    
    for (const slot of mapSlots) {
        const building = selectedBuildings[slot];
        if (building && buildingTypes[building]) {
            const b = buildingTypes[building];
            mapLayout += `[${slot}] ${b.emoji} ${b.name} - ${b.description}\n`;
        } else {
            mapLayout += `[${slot}] ⬜ Empty Slot\n`;
        }
    }
    
    mapLayout += '\n```';
    
    const embed = new EmbedBuilder()
        .setColor(0x00D9FF)
        .setTitle(`🗺️ Building: ${mapNames[mapType]}`)
        .setDescription(`**Interactive Map Builder**\n\n${mapLayout}\n**Matching Seeds:** ${matchingSeeds.length} found`)
        .addFields(
            { name: '📍 Instructions', value: 'Select a slot (A-F) to place a building, then choose the building type.\nView results to see all matching seeds!', inline: false }
        )
        .setFooter({ text: `${Object.keys(selectedBuildings).length}/6 slots filled` })
        .setTimestamp();

    return embed;
}

// Create slot selection buttons
function createSlotButtons() {
    const buttons = mapSlots.map(slot => 
        new ButtonBuilder()
            .setCustomId(`nightreign_slot_${slot}`)
            .setLabel(`Slot ${slot}`)
            .setStyle(ButtonStyle.Secondary)
    );
    
    const row1 = new ActionRowBuilder().addComponents(buttons.slice(0, 3));
    const row2 = new ActionRowBuilder().addComponents(buttons.slice(3, 6));
    
    const row3 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('nightreign_view_results')
                .setLabel('View Matching Seeds')
                .setStyle(ButtonStyle.Success)
                .setEmoji('🔍'),
            new ButtonBuilder()
                .setCustomId('nightreign_clear_map')
                .setLabel('Clear Map')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🗑️'),
            new ButtonBuilder()
                .setCustomId('nightreign_back')
                .setLabel('Change Map')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🗺️')
        );
    
    return [row1, row2, row3];
}

// Create building type selection menu for a slot
function createBuildingSelectMenu(slot) {
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`nightreign_building_${slot}`)
        .setPlaceholder(`Choose building for Slot ${slot}...`)
        .addOptions(
            Object.entries(buildingTypes).map(([key, data]) => ({
                label: data.name,
                description: data.description,
                value: key,
                emoji: data.emoji
            }))
        );
    
    return new ActionRowBuilder().addComponents(selectMenu);
}

// Create seed results embed
function createResultsEmbed(userId, page = 0) {
    const session = getSession(userId);
    if (!session) return null;
    
    const { mapType, selectedBuildings } = session;
    const matchingSeeds = filterSeeds(mapType, selectedBuildings);
    
    if (matchingSeeds.length === 0) {
        return new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('❌ No Matching Seeds')
            .setDescription('No seeds found with your selected building configuration.\n\nTry removing some buildings or changing your map type.')
            .setFooter({ text: 'Tip: Fewer building requirements = more results' });
    }
    
    const seed = matchingSeeds[page];
    
    let buildingList = '';
    for (const slot of mapSlots) {
        const building = seed.buildings[slot];
        const b = buildingTypes[building];
        buildingList += `**${slot}:** ${b.emoji} ${b.name}\n`;
    }
    
    const embed = new EmbedBuilder()
        .setColor(0x32CD32)
        .setTitle(`🎲 Seed: ${seed.id}`)
        .setDescription(`**Map:** ${mapNames[mapType]}\n**Difficulty:** ${seed.difficulty}`)
        .setThumbnail(seed.imageUrl)
        .addFields(
            { name: '🏗️ Building Layout', value: buildingList, inline: true },
            { name: '👑 Nightlord Boss', value: seed.nightlord, inline: true },
            { name: '⚔️ Additional Bosses', value: seed.bosses.join('\n'), inline: false },
            { name: '🎁 Notable Rewards', value: seed.items.join('\n'), inline: false }
        )
        .setFooter({ text: `Seed ${page + 1} of ${matchingSeeds.length} • Use arrows to browse` })
        .setTimestamp();

    return embed;
}

// Create navigation buttons for results
function createResultsButtons(userId, currentPage) {
    const session = getSession(userId);
    if (!session) return [];
    
    const { mapType, selectedBuildings } = session;
    const matchingSeeds = filterSeeds(mapType, selectedBuildings);
    
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`nightreign_result_prev_${currentPage}`)
                .setLabel('◀ Previous')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(currentPage === 0),
            new ButtonBuilder()
                .setCustomId(`nightreign_result_next_${currentPage}`)
                .setLabel('Next ▶')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(currentPage >= matchingSeeds.length - 1),
            new ButtonBuilder()
                .setCustomId('nightreign_back_to_builder')
                .setLabel('Back to Builder')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🔨')
        );
    
    return [row];
}

module.exports = {
    nightreignSeeds,
    buildingTypes,
    mapNames,
    mapSlots,
    createBuildSession,
    getSession,
    updateBuilding,
    clearBuilding,
    filterSeeds,
    createMapSelectionEmbed,
    createMapSelectMenu,
    createMapBuilderEmbed,
    createSlotButtons,
    createBuildingSelectMenu,
    createResultsEmbed,
    createResultsButtons
};

