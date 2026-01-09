// Nightreign Seed Finder Module - Slot-based Map System
const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// Building types available in Nightreign (matching website)
const buildingTypes = {
    'church': { name: 'Church', emoji: '⛪', description: 'Grace restoration point' },
    'village': { name: 'Village', emoji: '🏘️', description: 'NPC merchant hub' },
    'sorcerer_rise': { name: "Sorcerer's Rise", emoji: '🗼', description: 'Magic enhancement tower' }
};

// Map slots - each map has specific slot positions (matching website's orange dots)
const mapSlots = ['slot_1', 'slot_2', 'slot_3', 'slot_4', 'slot_5', 'slot_6', 'slot_7', 'slot_8', 'slot_9'];

// Nightlord bosses (matching game data)
const nightlords = [
    'Tricephalos', 'Gaping Jaw', 'Sentient Pest', 'Augur', 
    'Equilibrious Beast', 'Darkdrift Knight', 'Fissure in the Fog',
    'Night Aspect', 'Heolstor', 'Gnoster'
];

// Comprehensive seed database (slot-based, matching website structure)
const nightreignSeeds = [
    // NORMAL MAP SEEDS
    {
        seed_id: 'NRM-001',
        map_type: 'normal',
        slots: { slot_1: 'church', slot_3: 'village', slot_7: 'church' },
        nightlord: 'Gaping Jaw',
        difficulty: 'Easy',
        additional_bosses: ['Ancient Dragon Lansseax', 'Loretta Knight of the Haligtree'],
        items: ['Golden Seed x2', 'Sacred Tear', 'Somber Smithing Stone [7]']
    },
    {
        seed_id: 'NRM-002',
        map_type: 'normal',
        slots: { slot_2: 'sorcerer_rise', slot_4: 'church', slot_8: 'village' },
        nightlord: 'Sentient Pest',
        difficulty: 'Easy',
        additional_bosses: ['Godskin Duo', 'Draconic Tree Sentinel'],
        items: ['Ancient Dragon Smithing Stone', 'Golden Seed', 'Crystal Tear']
    },
    {
        seed_id: 'NRM-003',
        map_type: 'normal',
        slots: { slot_1: 'village', slot_5: 'church', slot_9: 'sorcerer_rise' },
        nightlord: 'Tricephalos',
        difficulty: 'Medium',
        additional_bosses: ['Elemer of the Briar', 'Crucible Knight Ordovis'],
        items: ['Sacred Tear x2', 'Somber Smithing Stone [8]', 'Golden Seed']
    },

    // MOUNTAINTOP SEEDS
    {
        seed_id: 'MTN-001',
        map_type: 'mountaintop',
        slots: { slot_2: 'church', slot_4: 'sorcerer_rise', slot_6: 'village' },
        nightlord: 'Equilibrious Beast',
        difficulty: 'Hard',
        additional_bosses: ['Commander Niall', 'Borealis the Freezing Fog'],
        items: ['Ancient Dragon Smithing Stone', 'Freezing Grease x5', 'Golden Seed']
    },
    {
        seed_id: 'MTN-002',
        map_type: 'mountaintop',
        slots: { slot_1: 'village', slot_3: 'church', slot_7: 'church' },
        nightlord: 'Darkdrift Knight',
        difficulty: 'Hard',
        additional_bosses: ['Fire Giant', 'Deathbird'],
        items: ['Sacred Tear x2', 'Smithing Stone [7] x6', 'Warming Stone x3']
    },

    // NOKLATEO SEEDS
    {
        seed_id: 'NOK-001',
        map_type: 'noklateo',
        slots: { slot_3: 'sorcerer_rise', slot_5: 'church', slot_8: 'village' },
        nightlord: 'Augur',
        difficulty: 'Very Hard',
        additional_bosses: ['Dragonkin Soldier of Nokstella', 'Valiant Gargoyle'],
        items: ['Somber Ancient Dragon Smithing Stone', 'Larval Tear', 'Moon of Nokstella']
    },
    {
        seed_id: 'NOK-002',
        map_type: 'noklateo',
        slots: { slot_1: 'church', slot_4: 'village', slot_9: 'sorcerer_rise' },
        nightlord: 'Heolstor',
        difficulty: 'Very Hard',
        additional_bosses: ['Mimic Tear', 'Ancestral Spirit'],
        items: ['Larval Tear x2', 'Sacred Tear', 'Somber Smithing Stone [9]']
    },

    // ROTTED WOODS SEEDS
    {
        seed_id: 'ROT-001',
        map_type: 'rotted',
        slots: { slot_2: 'church', slot_6: 'sorcerer_rise', slot_8: 'village' },
        nightlord: 'Fissure in the Fog',
        difficulty: 'Extreme',
        additional_bosses: ['Putrid Avatar', 'Ulcerated Tree Spirit'],
        items: ['Golden Seed x3', 'Sacramental Bud x5', 'Rot Grease x8']
    },
    {
        seed_id: 'ROT-002',
        map_type: 'rotted',
        slots: { slot_1: 'village', slot_5: 'church', slot_7: 'church' },
        nightlord: 'Gnoster',
        difficulty: 'Hard',
        additional_bosses: ['Cleanrot Knight Duo', 'Erdtree Avatar'],
        items: ['Sacred Tear x2', 'Golden Seed', 'Preserving Boluses x10']
    },

    // CRATER SEEDS
    {
        seed_id: 'CRT-001',
        map_type: 'crater',
        slots: { slot_3: 'church', slot_4: 'sorcerer_rise', slot_9: 'village' },
        nightlord: 'Night Aspect',
        difficulty: 'Extreme',
        additional_bosses: ['Lichdragon Fortissax', 'Crucible Knight Siluria'],
        items: ['Ancient Dragon Smithing Stone', 'Sacred Tear', 'Miquellan Lily x3']
    },
    {
        seed_id: 'CRT-002',
        map_type: 'crater',
        slots: { slot_2: 'church', slot_6: 'village', slot_8: 'sorcerer_rise' },
        nightlord: 'Darkdrift Knight',
        difficulty: 'Extreme',
        additional_bosses: ['Astel Naturalborn of the Void', 'Malformed Star'],
        items: ['Somber Ancient Dragon Smithing Stone', 'Starlight Shards x5', 'Memory Stone']
    },

    // GREAT HOLLOW SEEDS
    {
        seed_id: 'GHL-001',
        map_type: 'greatHollow',
        slots: { slot_1: 'church', slot_5: 'village', slot_7: 'sorcerer_rise' },
        nightlord: 'Gaping Jaw',
        difficulty: 'Hard',
        additional_bosses: ['Mohg Lord of Blood', 'Esgar Priest of Blood'],
        items: ['Sacred Tear', 'Golden Seed x2', 'Bloodboil Aromatic x3']
    },
    {
        seed_id: 'GHL-002',
        map_type: 'greatHollow',
        slots: { slot_3: 'sorcerer_rise', slot_4: 'village', slot_9: 'church' },
        nightlord: 'Tricephalos',
        difficulty: 'Medium',
        additional_bosses: ['Red Wolf of Radagon', 'Misbegotten Warrior'],
        items: ['Memory Stone', 'Smithing Stone [6] x10', 'Golden Seed']
    },
];

const mapNames = {
    mountaintop: 'Mountaintop',
    noklateo: 'Noklateo',
    normal: 'Normal',
    rotted: 'Rotted Woods',
    crater: 'Crater',
    greatHollow: 'Great Hollow'
};

// Store active seed finder sessions (in-memory)
// userId -> { map_type, selectedSlots: {slot_id: building_type}, nightlord }
const finderSessions = new Map();

// Initialize a new seed finder session
function createFinderSession(userId, mapType) {
    finderSessions.set(userId, {
        map_type: mapType,
        selectedSlots: {}, // slot_id -> building_type
        nightlord: null
    });
}

// Get user's active session
function getSession(userId) {
    return finderSessions.get(userId);
}

// Set building at a specific slot
function setSlot(userId, slotId, buildingType) {
    const session = getSession(userId);
    if (session) {
        session.selectedSlots[slotId] = buildingType;
    }
}

// Set nightlord selection
function setNightlord(userId, nightlord) {
    const session = getSession(userId);
    if (session) session.nightlord = nightlord;
}

// Clear a slot
function clearSlot(userId, slotId) {
    const session = getSession(userId);
    if (session && session.selectedSlots[slotId]) {
        delete session.selectedSlots[slotId];
    }
}

// Clear entire session
function clearSession(userId) {
    const session = getSession(userId);
    if (session) {
        session.selectedSlots = {};
        session.nightlord = null;
    }
}

// Find matching seeds based on marked slots
function findMatchingSeeds(session) {
    if (!session || !session.map_type) return [];
    
    let matches = nightreignSeeds.filter(s => s.map_type === session.map_type);
    
    // Filter by nightlord if selected
    if (session.nightlord) {
        matches = matches.filter(s => s.nightlord === session.nightlord);
    }
    
    // Filter by selected slots - seed must match ALL marked slots
    if (Object.keys(session.selectedSlots).length > 0) {
        matches = matches.filter(seed => {
            for (const [slotId, buildingType] of Object.entries(session.selectedSlots)) {
                if (seed.slots[slotId] !== buildingType) {
                    return false;
                }
            }
            return true;
        });
    }
    
    return matches;
}

// Create initial map selection embed
function createMapSelectionEmbed() {
    const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle('🗺️ Nightreign Seed Finder')
        .setDescription('**Elden Ring: Nightreign** - Find your exact seed!\n\nMatch building locations on the map to identify your seed.\n\n✅ Select a map type to begin marking slots.')
        .setImage('https://artimuz.github.io/Nightreign-Seed-Finder/Images/logo_header.webp')
        .setFooter({ text: 'Interactive seed finder • Match 3+ slots for accurate results' })
        .setTimestamp();

    return embed;
}

// Create map selection dropdown
function createMapSelectMenu() {
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('nightreign_map_select')
        .setPlaceholder('Choose your map type...')
        .addOptions([
            {
                label: 'Normal',
                description: 'Starting area - Easy',
                value: 'normal',
                emoji: '🌲'
            },
            {
                label: 'Mountaintop',
                description: 'Frozen peaks - Hard',
                value: 'mountaintop',
                emoji: '🏔️'
            },
            {
                label: 'Noklateo',
                description: 'Eternal city - Very Hard',
                value: 'noklateo',
                emoji: '🌙'
            },
            {
                label: 'Rotted Woods',
                description: 'Scarlet rot - Extreme',
                value: 'rotted',
                emoji: '🍄'
            },
            {
                label: 'Crater',
                description: 'Floating ruins - Extreme',
                value: 'crater',
                emoji: '⚡'
            },
            {
                label: 'Great Hollow',
                description: 'Volcanic region - Hard',
                value: 'greatHollow',
                emoji: '🌋'
            }
        ]);

    return new ActionRowBuilder().addComponents(selectMenu);
}

// Create finder interface showing map with slot positions
function createFinderEmbed(userId) {
    const session = getSession(userId);
    if (!session) return null;
    
    const { map_type, selectedSlots, nightlord } = session;
    const matches = findMatchingSeeds(session);
    
    // Display marked slots
    let slotDisplay = '';
    if (Object.keys(selectedSlots).length > 0) {
        for (const [slotId, buildingType] of Object.entries(selectedSlots)) {
            const building = buildingTypes[buildingType];
            const slotNum = slotId.replace('slot_', '');
            slotDisplay += `**Slot ${slotNum}:** ${building.emoji} ${building.name}\n`;
        }
    } else {
        slotDisplay = '❓ No slots marked yet - Click slot buttons below';
    }
    
    const mapImages = {
        normal: 'https://artimuz.github.io/Nightreign-Seed-Finder/Images/mapTypes/normalIcon.webp',
        mountaintop: 'https://artimuz.github.io/Nightreign-Seed-Finder/Images/mapTypes/mountainIcon.webp',
        noklateo: 'https://artimuz.github.io/Nightreign-Seed-Finder/Images/mapTypes/noklateoIcon.webp',
        rotted: 'https://artimuz.github.io/Nightreign-Seed-Finder/Images/mapTypes/rotIcon.webp',
        crater: 'https://artimuz.github.io/Nightreign-Seed-Finder/Images/mapTypes/craterIcon.webp',
        greatHollow: 'https://artimuz.github.io/Nightreign-Seed-Finder/Images/mapTypes/greatHollowIcon.webp'
    };
    
    const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`🗺️ ${mapNames[map_type]} - Mark Building Locations`)
        .setDescription('**Click numbered slot buttons to mark buildings**\n\nMatch the slot numbers to locations on your in-game map.')
        .setImage(mapImages[map_type])
        .addFields(
            {
                name: '🏛️ Marked Slots',
                value: slotDisplay,
                inline: false
            },
            {
                name: '👑 Nightlord',
                value: nightlord || '❓ Not selected (optional)',
                inline: false
            },
            {
                name: '🎯 Matching Seeds',
                value: `**${matches.length}** possible seed(s)`,
                inline: false
            }
        )
        .setFooter({ text: `${Object.keys(selectedSlots).length}/9 slots marked • Mark at least 3 for best results` });
    
    return embed;
}

// Create slot selection buttons (9 slots)
function createSlotButtons() {
    const rows = [];
    
    // Row 1: Slots 1-3
    rows.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('nightreign_slot_1')
            .setLabel('Slot 1')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('1️⃣'),
        new ButtonBuilder()
            .setCustomId('nightreign_slot_2')
            .setLabel('Slot 2')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('2️⃣'),
        new ButtonBuilder()
            .setCustomId('nightreign_slot_3')
            .setLabel('Slot 3')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('3️⃣')
    ));
    
    // Row 2: Slots 4-6
    rows.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('nightreign_slot_4')
            .setLabel('Slot 4')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('4️⃣'),
        new ButtonBuilder()
            .setCustomId('nightreign_slot_5')
            .setLabel('Slot 5')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('5️⃣'),
        new ButtonBuilder()
            .setCustomId('nightreign_slot_6')
            .setLabel('Slot 6')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('6️⃣')
    ));
    
    // Row 3: Slots 7-9
    rows.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('nightreign_slot_7')
            .setLabel('Slot 7')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('7️⃣'),
        new ButtonBuilder()
            .setCustomId('nightreign_slot_8')
            .setLabel('Slot 8')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('8️⃣'),
        new ButtonBuilder()
            .setCustomId('nightreign_slot_9')
            .setLabel('Slot 9')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('9️⃣')
    ));
    
    // Row 4: Control buttons
    rows.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('nightreign_select_nightlord')
            .setLabel('Select Nightlord')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('👑'),
        new ButtonBuilder()
            .setCustomId('nightreign_search')
            .setLabel('Search Seeds')
            .setStyle(ButtonStyle.Success)
            .setEmoji('🔍'),
        new ButtonBuilder()
            .setCustomId('nightreign_reset')
            .setLabel('Reset')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🔄')
    ));
    
    return rows;
}

// Create building selection menu for a slot
function createBuildingSelectMenu(slotNum) {
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`nightreign_building_slot_${slotNum}`)
        .setPlaceholder(`What building is at Slot ${slotNum}?`)
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
                label: 'Clear Slot',
                description: 'Remove this marker',
                value: 'clear',
                emoji: '❌'
            }
        ]);
    
    return new ActionRowBuilder().addComponents(selectMenu);
}

// Create nightlord selection menu
function createNightlordSelectMenu() {
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('nightreign_nightlord_select')
        .setPlaceholder('Select nightlord (optional)...')
        .addOptions(
            nightlords.map(nl => ({
                label: nl,
                value: nl,
                emoji: '⚔️'
            }))
        );
    
    return new ActionRowBuilder().addComponents(selectMenu);
}

// Create results embed showing matching seeds
function createResultsEmbed(session, page = 0) {
    const matches = findMatchingSeeds(session);
    
    if (matches.length === 0) {
        return new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('❌ No Matching Seeds')
            .setDescription('No seeds match your slot configuration.\n\nTry:\n• Removing some slots\n• Changing building types\n• Selecting a different map')
            .setFooter({ text: 'Tip: Mark fewer slots for more results' });
    }
    
    const seed = matches[page];
    
    // Display all slots in the seed
    let slotList = '';
    for (let i = 1; i <= 9; i++) {
        const slotId = `slot_${i}`;
        const building = seed.slots[slotId];
        if (building) {
            const b = buildingTypes[building];
            slotList += `**Slot ${i}:** ${b.emoji} ${b.name}\n`;
        }
    }
    
    if (!slotList) slotList = 'No specific buildings';
    
    const mapImages = {
        normal: 'https://artimuz.github.io/Nightreign-Seed-Finder/Images/mapTypes/normalIcon.webp',
        mountaintop: 'https://artimuz.github.io/Nightreign-Seed-Finder/Images/mapTypes/mountainIcon.webp',
        noklateo: 'https://artimuz.github.io/Nightreign-Seed-Finder/Images/mapTypes/noklateoIcon.webp',
        rotted: 'https://artimuz.github.io/Nightreign-Seed-Finder/Images/mapTypes/rotIcon.webp',
        crater: 'https://artimuz.github.io/Nightreign-Seed-Finder/Images/mapTypes/craterIcon.webp',
        greatHollow: 'https://artimuz.github.io/Nightreign-Seed-Finder/Images/mapTypes/greatHollowIcon.webp'
    };
    
    const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle(`🎯 Seed Match: ${seed.seed_id}`)
        .setDescription(`**Map:** ${mapNames[seed.map_type]}\n**Difficulty:** ${seed.difficulty}\n**Nightlord:** 👑 ${seed.nightlord}`)
        .setImage(mapImages[seed.map_type])
        .addFields(
            { name: '🏛️ Building Locations', value: slotList, inline: false },
            { name: '⚔️ Other Bosses', value: seed.additional_bosses?.join(', ') || 'TBA', inline: false },
            { name: '💎 Notable Items', value: seed.items?.join(', ') || 'TBA', inline: false }
        )
        .setFooter({ text: `Result ${page + 1} of ${matches.length} • Copy seed ID to use in-game` });
    
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
    nightlords,
    createFinderSession,
    getSession,
    setSlot,
    clearSlot,
    setNightlord,
    clearSession,
    findMatchingSeeds,
    createMapSelectionEmbed,
    createMapSelectMenu,
    createFinderEmbed,
    createSlotButtons,
    createBuildingSelectMenu,
    createNightlordSelectMenu,
    createResultsEmbed,
    createResultsButtons
};

