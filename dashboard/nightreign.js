// Nightreign Seed Finder - Dashboard Interactive Map
let currentMap = null;
let markedSlots = {};
let nightreignSeeds = [];

// Map slot positions (x%, y% coordinates)
const slotPositions = {
    normal: [
        { x: 20, y: 30 }, { x: 35, y: 25 }, { x: 50, y: 20 },
        { x: 65, y: 30 }, { x: 75, y: 40 }, { x: 70, y: 60 },
        { x: 50, y: 70 }, { x: 30, y: 65 }, { x: 25, y: 45 }
    ],
    mountaintop: [
        { x: 25, y: 35 }, { x: 40, y: 28 }, { x: 55, y: 25 },
        { x: 68, y: 35 }, { x: 78, y: 48 }, { x: 72, y: 65 },
        { x: 52, y: 72 }, { x: 32, y: 68 }, { x: 22, y: 50 }
    ],
    noklateo: [
        { x: 22, y: 32 }, { x: 38, y: 26 }, { x: 52, y: 22 },
        { x: 66, y: 32 }, { x: 76, y: 45 }, { x: 70, y: 62 },
        { x: 50, y: 70 }, { x: 30, y: 66 }, { x: 24, y: 48 }
    ],
    rotted: [
        { x: 24, y: 34 }, { x: 39, y: 27 }, { x: 54, y: 24 },
        { x: 67, y: 34 }, { x: 77, y: 47 }, { x: 71, y: 64 },
        { x: 51, y: 71 }, { x: 31, y: 67 }, { x: 25, y: 49 }
    ],
    crater: [
        { x: 23, y: 33 }, { x: 37, y: 27 }, { x: 51, y: 23 },
        { x: 65, y: 33 }, { x: 75, y: 46 }, { x: 69, y: 63 },
        { x: 49, y: 70 }, { x: 29, y: 66 }, { x: 23, y: 48 }
    ],
    greatHollow: [
        { x: 26, y: 36 }, { x: 41, y: 29 }, { x: 56, y: 26 },
        { x: 69, y: 36 }, { x: 79, y: 49 }, { x: 73, y: 66 },
        { x: 53, y: 73 }, { x: 33, y: 69 }, { x: 27, y: 51 }
    ]
};

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
    
    // Load map image
    const mapImg = document.getElementById('nightreign-map-img');
    mapImg.src = `https://artimuz.github.io/Nightreign-Seed-Finder/Images/mapTypes/${mapType}Icon.webp`;
    
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
