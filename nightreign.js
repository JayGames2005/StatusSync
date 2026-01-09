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
        difficulty: 'Easy'
    },
    {
        seed_id: 'NRM-002',
        map_type: 'normal',
        slots: { slot_2: 'sorcerer_rise', slot_4: 'church', slot_8: 'village' },
        nightlord: 'Sentient Pest',
        difficulty: 'Easy'
    },
    {
        seed_id: 'NRM-003',
        map_type: 'normal',
        slots: { slot_1: 'village', slot_5: 'church', slot_9: 'sorcerer_rise' },
        nightlord: 'Tricephalos',
        difficulty: 'Medium'
    },

    // MOUNTAINTOP SEEDS
    {
        seed_id: 'MTN-001',
        map_type: 'mountaintop',
        slots: { slot_2: 'church', slot_4: 'sorcerer_rise', slot_6: 'village' },
        nightlord: 'Equilibrious Beast',
        difficulty: 'Hard'
    },
    {
        seed_id: 'MTN-002',
        map_type: 'mountaintop',
        slots: { slot_1: 'village', slot_3: 'church', slot_7: 'church' },
        nightlord: 'Darkdrift Knight',
        difficulty: 'Hard'
    },

    // NOKLATEO SEEDS
    {
        seed_id: 'NOK-001',
        map_type: 'noklateo',
        slots: { slot_3: 'sorcerer_rise', slot_5: 'church', slot_8: 'village' },
        nightlord: 'Augur',
        difficulty: 'Very Hard'
    },
    {
        seed_id: 'NOK-002',
        map_type: 'noklateo',
        slots: { slot_1: 'church', slot_4: 'village', slot_9: 'sorcerer_rise' },
        nightlord: 'Heolstor',
        difficulty: 'Very Hard'
    },

    // ROTTED WOODS SEEDS
    {
        seed_id: 'ROT-001',
        map_type: 'rotted',
        slots: { slot_2: 'church', slot_6: 'sorcerer_rise', slot_8: 'village' },
        nightlord: 'Fissure in the Fog',
        difficulty: 'Extreme'
    },
    {
        seed_id: 'ROT-002',
        map_type: 'rotted',
        slots: { slot_1: 'village', slot_5: 'church', slot_7: 'church' },
        nightlord: 'Gnoster',
        difficulty: 'Hard'
    },

    // CRATER SEEDS
    {
        seed_id: 'CRT-001',
        map_type: 'crater',
        slots: { slot_3: 'church', slot_4: 'sorcerer_rise', slot_9: 'village' },
        nightlord: 'Night Aspect',
        difficulty: 'Extreme'
    },
    {
        seed_id: 'CRT-002',
        map_type: 'crater',
        slots: { slot_2: 'church', slot_6: 'village', slot_8: 'sorcerer_rise' },
        nightlord: 'Darkdrift Knight',
        difficulty: 'Extreme'
    },

    // GREAT HOLLOW SEEDS
    {
        seed_id: 'GHL-001',
        map_type: 'greatHollow',
        slots: { slot_1: 'church', slot_5: 'village', slot_7: 'sorcerer_rise' },
        nightlord: 'Gaping Jaw',
        difficulty: 'Hard'
    },
    {
        seed_id: 'GHL-002',
        map_type: 'greatHollow',
        slots: { slot_3: 'sorcerer_rise', slot_4: 'village', slot_9: 'church' },
        nightlord: 'Tricephalos',
        difficulty: 'Medium'
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

// Find matching seeds based on selected slots
function findMatchingSeeds(session) {
    if (!session || !session.map_type) return [];
    
    let matches = nightreignSeeds.filter(s => s.map_type === session.map_type);
    
    // Filter by nightlord if selected
    if (session.nightlord) {
        matches = matches.filter(s => s.nightlord === session.nightlord);
    }
    
    // Filter by selected slots - seed must have ALL selected buildings at those slots
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

// Create finder interface showing current selections
function createFinderEmbed(userId) {
    const session = getSession(userId);
    if (!session) return null;
    
    const { map_type, selectedSlots, nightlord } = session;
    const matches = findMatchingSeeds(session);
    
    // Display selected slots
    let slotDisplay = '';
    if (Object.keys(selectedSlots).length > 0) {
        for (const [slotId, buildingType] of Object.entries(selectedSlots)) {
            const building = buildingTypes[buildingType];
            const slotNum = slotId.replace('slot_', '');
            slotDisplay += `**Slot ${slotNum}:** ${building.emoji} ${building.name}\n`;
        }
    } else {
        slotDisplay = '❓ No slots marked yet';
    }
    
    const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`🗺️ ${mapNames[map_type]} - Seed Finder`)
        .setDescription('**Mark building locations to find your seed:**\n\nClick slot buttons to mark buildings on the map.')
        .addFields(
            {
                name: '🏛️ Marked Slots',
                value: slotDisplay,
                inline: false
            },
            {
                name: '👑 Nightlord (Optional)',
                value: nightlord || '❓ Not selected',
                inline: false
            },
            {
                name: '🎯 Matching Seeds',
                value: `**${matches.length}** possible seed(s)`,
                inline: false
            }
        )
        .setFooter({ text: `Mark at least 3 slots for accurate results • ${Object.keys(selectedSlots).length}/9 slots marked` });
    
    return embed;
}

// Create slot selection buttons (9 slots in 3 rows)
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

// Create building selection menu for a slot
function createBuildingSelectMenu(slotNum) {
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`nightreign_building_slot_${slotNum}`)
        .setPlaceholder(`Select building for Slot ${slotNum}...`)
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
                description: 'Remove building from this slot',
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
    
    const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle(`🎯 Seed: ${seed.seed_id}`)
        .setDescription(`**Map:** ${mapNames[seed.map_type]}\n**Difficulty:** ${seed.difficulty}\n**Nightlord:** ${seed.nightlord}`)
        .addFields(
            { name: '🏛️ Building Locations', value: slotList, inline: false }
        )
        .setFooter({ text: `Result ${page + 1} of ${matches.length} • Use arrows to browse` });
    
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
    mapSlots,
    createFinderSession,
    getSession,
    setSlot,
    setNightlord,
    clearSlot,
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

