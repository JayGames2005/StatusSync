// Nightreign Seed Finder Module
const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// Seed database for Nightreign maps
const nightreignSeeds = {
    mountaintop: [
        { seed: 'MTN001', bosses: ['Radahn', 'Malenia'], items: ['Sacred Relic Sword', 'Golden Seeds'], image: 'https://artimuz.github.io/Nightreign-Seed-Finder/Images/mapTypes/mountainIcon.webp' },
        { seed: 'MTN002', bosses: ['Godfrey', 'Morgott'], items: ['Marika\'s Hammer', 'Rune Arc'], image: 'https://artimuz.github.io/Nightreign-Seed-Finder/Images/mapTypes/mountainIcon.webp' },
        { seed: 'MTN003', bosses: ['Mohg', 'Fire Giant'], items: ['Mohgwyn\'s Spear', 'Ancient Dragon Stone'], image: 'https://artimuz.github.io/Nightreign-Seed-Finder/Images/mapTypes/mountainIcon.webp' },
    ],
    noklateo: [
        { seed: 'NOK001', bosses: ['Astel', 'Dragonlord'], items: ['Meteorite Staff', 'Dark Moon Greatsword'], image: 'https://artimuz.github.io/Nightreign-Seed-Finder/Images/mapTypes/noklateoIcon.webp' },
        { seed: 'NOK002', bosses: ['Ancestor Spirit', 'Valiant Gargoyles'], items: ['Ancestral Spirit Horn', 'Gargoyle Twinblade'], image: 'https://artimuz.github.io/Nightreign-Seed-Finder/Images/mapTypes/noklateoIcon.webp' },
        { seed: 'NOK003', bosses: ['Mimic Tear', 'Lichdragon'], items: ['Silver Tear Mask', 'Sacred Relic Sword'], image: 'https://artimuz.github.io/Nightreign-Seed-Finder/Images/mapTypes/noklateoIcon.webp' },
    ],
    normal: [
        { seed: 'NRM001', bosses: ['Margit', 'Godrick'], items: ['Grafted Blade', 'Golden Seed'], image: 'https://artimuz.github.io/Nightreign-Seed-Finder/Images/mapTypes/normalIcon.webp' },
        { seed: 'NRM002', bosses: ['Rennala', 'Red Wolf'], items: ['Moon Sorceries', 'Carian Knight Sword'], image: 'https://artimuz.github.io/Nightreign-Seed-Finder/Images/mapTypes/normalIcon.webp' },
        { seed: 'NRM003', bosses: ['Tree Sentinel', 'Crucible Knight'], items: ['Tree Sentinel Armor', 'Crucible Axe'], image: 'https://artimuz.github.io/Nightreign-Seed-Finder/Images/mapTypes/normalIcon.webp' },
    ],
    rotted_woods: [
        { seed: 'ROT001', bosses: ['Malenia', 'Scarlet Rot Dragon'], items: ['Hand of Malenia', 'Rot Incantations'], image: 'https://artimuz.github.io/Nightreign-Seed-Finder/Images/mapTypes/rotIcon.webp' },
        { seed: 'ROT002', bosses: ['Kindred of Rot', 'Cleanrot Knight'], items: ['Rot Crystal Sword', 'Cleanrot Spear'], image: 'https://artimuz.github.io/Nightreign-Seed-Finder/Images/mapTypes/rotIcon.webp' },
        { seed: 'ROT003', bosses: ['Commander O\'Neil', 'Putrid Avatar'], items: ['Commander\'s Standard', 'Putrid Crystalian'], image: 'https://artimuz.github.io/Nightreign-Seed-Finder/Images/mapTypes/rotIcon.webp' },
    ],
    crater: [
        { seed: 'CRT001', bosses: ['Elden Beast', 'Radagon'], items: ['Elden Remembrance', 'Sacred Relic Sword'], image: 'https://artimuz.github.io/Nightreign-Seed-Finder/Images/mapTypes/craterIcon.webp' },
        { seed: 'CRT002', bosses: ['Godskin Duo', 'Maliketh'], items: ['Black Blade', 'Godskin Peeler'], image: 'https://artimuz.github.io/Nightreign-Seed-Finder/Images/mapTypes/craterIcon.webp' },
        { seed: 'CRT003', bosses: ['Placidusax', 'Fortissax'], items: ['Dragon King Cragblade', 'Death Lightning'], image: 'https://artimuz.github.io/Nightreign-Seed-Finder/Images/mapTypes/craterIcon.webp' },
    ],
    great_hollow: [
        { seed: 'GHL001', bosses: ['Rykard', 'Abductor Virgins'], items: ['Blasphemous Blade', 'Magma Wyrm Scalesword'], image: 'https://artimuz.github.io/Nightreign-Seed-Finder/Images/mapTypes/greatHollowIcon.webp' },
        { seed: 'GHL002', bosses: ['Godskin Noble', 'Fire Prelate'], items: ['Godskin Stitcher', 'Prelate\'s Inferno Crozier'], image: 'https://artimuz.github.io/Nightreign-Seed-Finder/Images/mapTypes/greatHollowIcon.webp' },
        { seed: 'GHL003', bosses: ['Magma Wyrm', 'Demi-Human Queen'], items: ['Moonveil', 'Magma Shot'], image: 'https://artimuz.github.io/Nightreign-Seed-Finder/Images/mapTypes/greatHollowIcon.webp' },
    ]
};

const mapNames = {
    mountaintop: 'Mountaintop',
    noklateo: 'Noklateo',
    normal: 'Normal',
    rotted_woods: 'Rotted Woods',
    crater: 'Crater',
    great_hollow: 'Great Hollow'
};

const mapDescriptions = {
    mountaintop: 'Snowy peaks with legendary bosses',
    noklateo: 'Underground eternal city with cosmic threats',
    normal: 'Standard Limgrave starting area',
    rotted_woods: 'Scarlet rot-infested swamplands',
    crater: 'Endgame crater with final bosses',
    great_hollow: 'Volcanic region with fire-based enemies'
};

// Create initial map selection embed
function createMapSelectionEmbed() {
    const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle('🗺️ Nightreign Seed Finder')
        .setDescription('**Elden Ring: Nightreign** - Find the perfect seed for your run!\n\nSelect a map type below to see available seeds with boss and item spawns.')
        .setImage('https://artimuz.github.io/Nightreign-Seed-Finder/Images/logo_header.webp')
        .addFields(
            { name: '🏔️ Mountaintop', value: mapDescriptions.mountaintop, inline: true },
            { name: '🌙 Noklateo', value: mapDescriptions.noklateo, inline: true },
            { name: '🌲 Normal', value: mapDescriptions.normal, inline: true },
            { name: '🍄 Rotted Woods', value: mapDescriptions.rotted_woods, inline: true },
            { name: '⚡ Crater', value: mapDescriptions.crater, inline: true },
            { name: '🌋 Great Hollow', value: mapDescriptions.great_hollow, inline: true }
        )
        .setFooter({ text: 'Based on Nightreign Seed Finder by Artimuz' })
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
                label: 'Mountaintop',
                description: 'Snowy peaks with legendary bosses',
                value: 'mountaintop',
                emoji: '🏔️'
            },
            {
                label: 'Noklateo',
                description: 'Underground eternal city',
                value: 'noklateo',
                emoji: '🌙'
            },
            {
                label: 'Normal',
                description: 'Standard Limgrave area',
                value: 'normal',
                emoji: '🌲'
            },
            {
                label: 'Rotted Woods',
                description: 'Scarlet rot swamplands',
                value: 'rotted_woods',
                emoji: '🍄'
            },
            {
                label: 'Crater',
                description: 'Endgame crater zone',
                value: 'crater',
                emoji: '⚡'
            },
            {
                label: 'Great Hollow',
                description: 'Volcanic fire region',
                value: 'great_hollow',
                emoji: '🌋'
            }
        ]);

    return new ActionRowBuilder().addComponents(selectMenu);
}

// Create seed list for selected map
function createSeedListEmbed(mapType) {
    const seeds = nightreignSeeds[mapType];
    const mapName = mapNames[mapType];
    
    const embed = new EmbedBuilder()
        .setColor(0x00D9FF)
        .setTitle(`🗺️ ${mapName} Seeds`)
        .setDescription(`Available seeds for **${mapName}**. Click a seed button below to see details!`)
        .setThumbnail(seeds[0].image);

    seeds.forEach((seed, index) => {
        embed.addFields({
            name: `${index + 1}. Seed: ${seed.seed}`,
            value: `**Bosses:** ${seed.bosses.join(', ')}\n**Items:** ${seed.items.slice(0, 2).join(', ')}`,
            inline: false
        });
    });

    embed.setFooter({ text: `${seeds.length} seeds available for ${mapName}` });
    embed.setTimestamp();

    return embed;
}

// Create seed selection buttons
function createSeedButtons(mapType) {
    const seeds = nightreignSeeds[mapType];
    const buttons = seeds.map((seed, index) => 
        new ButtonBuilder()
            .setCustomId(`nightreign_seed_${mapType}_${index}`)
            .setLabel(seed.seed)
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🎲')
    );

    // Add back button
    buttons.push(
        new ButtonBuilder()
            .setCustomId('nightreign_back')
            .setLabel('Back to Maps')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('◀️')
    );

    // Split into rows (max 5 buttons per row)
    const rows = [];
    for (let i = 0; i < buttons.length; i += 5) {
        rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
    }

    return rows;
}

// Create detailed seed embed
function createSeedDetailEmbed(mapType, seedIndex) {
    const seed = nightreignSeeds[mapType][seedIndex];
    const mapName = mapNames[mapType];
    
    const embed = new EmbedBuilder()
        .setColor(0x32CD32)
        .setTitle(`🎲 Seed: ${seed.seed}`)
        .setDescription(`**Map:** ${mapName}\n\nThis seed contains specific boss encounters and item spawns for your Nightreign run.`)
        .setThumbnail(seed.image)
        .addFields(
            { 
                name: '⚔️ Boss Encounters', 
                value: seed.bosses.map((b, i) => `${i + 1}. ${b}`).join('\n'), 
                inline: true 
            },
            { 
                name: '🎁 Notable Items', 
                value: seed.items.map((item, i) => `${i + 1}. ${item}`).join('\n'), 
                inline: true 
            },
            {
                name: '📋 Seed Code',
                value: `\`\`\`${seed.seed}\`\`\``,
                inline: false
            }
        )
        .setFooter({ text: 'Copy the seed code to use in Nightreign' })
        .setTimestamp();

    return embed;
}

// Create back button
function createBackButton(mapType) {
    return new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`nightreign_map_${mapType}`)
                .setLabel(`Back to ${mapNames[mapType]}`)
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('◀️'),
            new ButtonBuilder()
                .setCustomId('nightreign_back')
                .setLabel('Back to Maps')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🗺️')
        );
}

module.exports = {
    nightreignSeeds,
    mapNames,
    createMapSelectionEmbed,
    createMapSelectMenu,
    createSeedListEmbed,
    createSeedButtons,
    createSeedDetailEmbed,
    createBackButton
};
