// Nightreign Seed Finder - Dashboard Interactive Map
let currentMap = null;
let markedSlots = {};
let nightreignSeeds = [];

// Real slot positions from the GitHub repo (coordinates on 1000x1000 canvas, scaled to percentages)
// These are the actual building slot coordinates used in the web version
const slotPositions = {
    normal: [
        { x: 40.0, y: 18.0 },  // slot_1
        { x: 71.0, y: 21.0 },  // slot_2
        { x: 53.5, y: 22.5 },  // slot_3
        { x: 23.2, y: 28.1 },  // slot_4
        { x: 62.8, y: 29.3 },  // slot_5
        { x: 41.2, y: 30.3 },  // slot_6
        { x: 77.6, y: 36.1 },  // slot_7
        { x: 21.7, y: 35.4 },  // slot_8
        { x: 69.3, y: 37.0 },  // slot_9
        { x: 35.7, y: 39.5 },  // slot_10
        { x: 58.0, y: 43.0 },  // slot_11
        { x: 77.4, y: 42.5 },  // slot_12
        { x: 28.2, y: 44.7 },  // slot_13
        { x: 66.3, y: 46.5 },  // slot_14
        { x: 31.8, y: 55.0 },  // slot_15
        { x: 20.5, y: 55.5 },  // slot_16
        { x: 80.4, y: 57.6 },  // slot_17
        { x: 62.9, y: 58.5 },  // slot_18
        { x: 55.0, y: 63.0 },  // slot_19
        { x: 75.3, y: 63.1 },  // slot_20
        { x: 27.6, y: 65.0 },  // slot_21
        { x: 61.0, y: 69.0 },  // slot_22
        { x: 45.2, y: 69.5 },  // slot_23
        { x: 19.9, y: 71.0 },  // slot_24
        { x: 74.5, y: 74.0 },  // slot_25
        { x: 40.0, y: 78.0 },  // slot_26
        { x: 56.6, y: 79.5 }   // slot_27
    ],
    greatHollow: [
        { x: 34.7, y: 31.2 },  // slot_1
        { x: 73.3, y: 34.7 },  // slot_2
        { x: 77.0, y: 41.4 },  // slot_3
        { x: 61.2, y: 51.2 },  // slot_4
        { x: 35.3, y: 52.5 },  // slot_5
        { x: 25.3, y: 57.9 },  // slot_6
        { x: 64.1, y: 65.5 },  // slot_7
        { x: 28.0, y: 68.3 },  // slot_8
        { x: 36.1, y: 77.3 },  // slot_9
        { x: 45.3, y: 77.9 },  // slot_10
        { x: 92.1, y: 80.6 },  // slot_11
        { x: 88.1, y: 89.8 },  // slot_12
        { x: 68.5, y: 93.1 },  // slot_13
        { x: 39.7, y: 39.0 },  // slot_14
        { x: 72.3, y: 47.5 },  // slot_15
        { x: 43.6, y: 55.1 },  // slot_16
        { x: 31.9, y: 63.6 },  // slot_17
        { x: 36.2, y: 74.1 },  // slot_18
        { x: 89.3, y: 81.6 },  // slot_19
        { x: 81.1, y: 90.8 }   // slot_20
    ]
};

// Use same coordinates for all other maps (they share the 27-slot layout)
slotPositions.mountaintop = slotPositions.normal;
slotPositions.noklateo = slotPositions.normal;
slotPositions.rotted = slotPositions.normal;
slotPositions.crater = slotPositions.normal;

const buildingTypes = {
    church: { name: 'Church', emoji: '⛪', color: '#FAA61A' },
    village: { name: 'Village', emoji: '🏘️', color: '#3BA55D' },
    sorcerer_rise: { name: "Sorcerer's Rise", emoji: '🗼', color: '#5865F2' }
};

// Select map type
function selectNightMap(mapType) {
    currentMap = mapType;
    markedSlots = {};
    
    // Update UI
    document.querySelectorAll('.map-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-map="${mapType}"]`).classList.add('active');
    
    // Show finder
    document.getElementById('nightreign-finder').style.display = 'block';
    
    const mapNames = {
        normal: 'Normal',
        mountaintop: 'Mountaintop',
        noklateo: 'Noklateo',
        rotted: 'Rotted Woods',
        crater: 'Crater',
        greatHollow: 'Great Hollow'
    };
    
    document.getElementById('map-title').textContent = `${mapNames[mapType]} - Mark Building Locations`;
    
    // Load high-res map image from GitHub Pages
    const mapImg = document.getElementById('nightreign-map-img');
    const mapImages = {
        normal: 'https://artimuz.github.io/Nightreign-Seed-Finder/Images/mapTypes/Normal.webp',
        mountaintop: 'https://artimuz.github.io/Nightreign-Seed-Finder/Images/mapTypes/Mountaintop.webp',
        noklateo: 'https://artimuz.github.io/Nightreign-Seed-Finder/Images/mapTypes/Noklateo%2C%20the%20Shrouded%20City.webp',
        rotted: 'https://artimuz.github.io/Nightreign-Seed-Finder/Images/mapTypes/Rotted%20Woods.webp',
        crater: 'https://artimuz.github.io/Nightreign-Seed-Finder/Images/mapTypes/Crater.webp',
        greatHollow: 'https://artimuz.github.io/Nightreign-Seed-Finder/Images/mapTypes/greatHollow.webp'
    };
    
    mapImg.src = mapImages[mapType];
    
    // Draw markers
    mapImg.onload = () => drawMarkers();
    
    updateMarkedSlotsList();
    updateMatchCount();
}

// Draw interactive markers on map
function drawMarkers() {
    if (!currentMap) return;
    
    const svg = document.getElementById('nightreign-markers');
    const positions = slotPositions[currentMap];
    
    svg.innerHTML = '';
    
    positions.forEach((pos, index) => {
        const slotId = `slot_${index + 1}`;
        const marked = markedSlots[slotId];
        
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.classList.add('nightreign-marker');
        g.setAttribute('data-slot', slotId);
        g.style.cursor = 'pointer';
        
        // Circle
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', `${pos.x}%`);
        circle.setAttribute('cy', `${pos.y}%`);
        circle.setAttribute('r', marked ? '24' : '18');
        circle.setAttribute('fill', marked ? buildingTypes[marked].color : '#FFFFFF');
        circle.setAttribute('stroke', marked ? '#FFFFFF' : '#23272A');
        circle.setAttribute('stroke-width', marked ? '3' : '2');
        circle.setAttribute('opacity', marked ? '1' : '0.7');
        
        // Number
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', `${pos.x}%`);
        text.setAttribute('y', `${pos.y}%`);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'middle');
        text.setAttribute('fill', marked ? '#FFFFFF' : '#23272A');
        text.setAttribute('font-size', '16');
        text.setAttribute('font-weight', 'bold');
        text.textContent = index + 1;
        
        g.appendChild(circle);
        g.appendChild(text);
        
        g.onclick = () => showBuildingMenu(slotId, index + 1);
        
        svg.appendChild(g);
    });
}

// Show building selection menu
function showBuildingMenu(slotId, slotNum) {
    const building = prompt(
        `Slot ${slotNum} - Select building:\n\n` +
        `1 - ⛪ Church\n` +
        `2 - 🏘️ Village\n` +
        `3 - 🗼 Sorcerer's Rise\n` +
        `0 - Clear\n\n` +
        `Enter number (1-3, or 0 to clear):`
    );
    
    if (building === null) return;
    
    const choice = parseInt(building);
    
    if (choice === 0) {
        delete markedSlots[slotId];
    } else if (choice === 1) {
        markedSlots[slotId] = 'church';
    } else if (choice === 2) {
        markedSlots[slotId] = 'village';
    } else if (choice === 3) {
        markedSlots[slotId] = 'sorcerer_rise';
    } else {
        return;
    }
    
    drawMarkers();
    updateMarkedSlotsList();
    updateMatchCount();
}

// Update marked slots list
function updateMarkedSlotsList() {
    const container = document.getElementById('marked-slots');
    
    if (Object.keys(markedSlots).length === 0) {
        container.innerHTML = '<p style="color: #B9BBBE; font-size: 14px;">No slots marked yet</p>';
        return;
    }
    
    container.innerHTML = '';
    
    Object.entries(markedSlots).forEach(([slotId, buildingType]) => {
        const slotNum = slotId.replace('slot_', '');
        const building = buildingTypes[buildingType];
        
        const div = document.createElement('div');
        div.className = 'marked-slot-item';
        div.innerHTML = `
            <span><strong>Slot ${slotNum}:</strong> ${building.emoji} ${building.name}</span>
            <button onclick="clearSlot('${slotId}')">✕</button>
        `;
        container.appendChild(div);
    });
}

// Clear specific slot
function clearSlot(slotId) {
    delete markedSlots[slotId];
    drawMarkers();
    updateMarkedSlotsList();
    updateMatchCount();
}

// Clear all
function clearNightreign() {
    markedSlots = {};
    document.getElementById('nightlord-select').value = '';
    drawMarkers();
    updateMarkedSlotsList();
    updateMatchCount();
    document.getElementById('nightreign-results').innerHTML = '';
}

// Update match count
function updateMatchCount() {
    const matches = findMatchingSeeds();
    const countDiv = document.getElementById('match-count');
    countDiv.innerHTML = `<strong>🎯 ${matches.length}</strong> matching seed(s)`;
}

// Find matching seeds
function findMatchingSeeds() {
    if (!currentMap) return [];
    
    let matches = nightreignSeeds.filter(seed => seed.map_type === currentMap);
    
    // Filter by marked slots
    if (Object.keys(markedSlots).length > 0) {
        matches = matches.filter(seed => {
            for (const [slotId, buildingType] of Object.entries(markedSlots)) {
                if (seed.slots[slotId] !== buildingType) {
                    return false;
                }
            }
            return true;
        });
    }
    
    // Filter by nightlord
    const nightlord = document.getElementById('nightlord-select').value;
    if (nightlord) {
        matches = matches.filter(seed => seed.nightlord === nightlord);
    }
    
    return matches;
}

// Search and display seeds
async function searchSeeds() {
    const matches = findMatchingSeeds();
    const resultsDiv = document.getElementById('nightreign-results');
    
    if (matches.length === 0) {
        resultsDiv.innerHTML = `
            <div class="card" style="text-align: center; padding: 40px;">
                <h3 style="color: #ED4245;">❌ No Seeds Found</h3>
                <p style="color: #B9BBBE; margin-top: 10px;">
                    Try marking fewer slots or removing the nightlord filter
                </p>
            </div>
        `;
        return;
    }
    
    resultsDiv.innerHTML = '<h3 style="margin-bottom: 20px;">🎯 Found Seeds</h3>';
    
    matches.forEach(seed => {
        const slotsHtml = Object.entries(seed.slots)
            .sort(([a], [b]) => parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]))
            .map(([slotId, buildingType]) => {
                const slotNum = slotId.replace('slot_', '');
                const building = buildingTypes[buildingType];
                return `<span style="margin-right: 12px;"><strong>Slot ${slotNum}:</strong> ${building.emoji} ${building.name}</span>`;
            })
            .join('<br>');
        
        const bossesHtml = seed.additional_bosses?.join(', ') || 'TBA';
        const itemsHtml = seed.items?.join(', ') || 'TBA';
        
        const difficultyClass = `difficulty-${seed.difficulty.replace(' ', '.')}`;
        
        resultsDiv.innerHTML += `
            <div class="seed-result">
                <h3>🎯 Seed: ${seed.seed_id}</h3>
                <div class="seed-meta">
                    <div class="seed-meta-item">
                        <strong>Difficulty</strong>
                        <span class="${difficultyClass}">${seed.difficulty}</span>
                    </div>
                    <div class="seed-meta-item">
                        <strong>Nightlord</strong>
                        ${seed.nightlord}
                    </div>
                </div>
                <div class="seed-meta-item" style="margin-bottom: 10px;">
                    <strong>Building Locations</strong>
                    ${slotsHtml}
                </div>
                <div class="seed-meta-item" style="margin-bottom: 10px;">
                    <strong>⚔️ Other Bosses</strong>
                    ${bossesHtml}
                </div>
                <div class="seed-meta-item">
                    <strong>💎 Notable Items</strong>
                    ${itemsHtml}
                </div>
            </div>
        `;
    });
    
    // Scroll to results
    resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Load seed data from API
async function loadNightreignSeeds() {
    try {
        const response = await fetch('/api/nightreign-seeds');
        if (response.ok) {
            nightreignSeeds = await response.json();
        }
    } catch (error) {
        console.error('Failed to load Nightreign seeds:', error);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadNightreignSeeds();
});
