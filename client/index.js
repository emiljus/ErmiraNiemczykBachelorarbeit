// DOM-Elemente
const textModeBtn = document.getElementById('text-mode-btn');
const imageModeBtn = document.getElementById('image-mode-btn');
const i2iParams = document.getElementById('i2i-params');
const roomGroup = document.getElementById('room-group');
const roomPreview = document.querySelector('#room-preview img');
const imageStrength = document.getElementById('image-strength');
const strengthValue = document.getElementById('strength-value');
const buildingSelect = document.getElementById('building-select');
const roomSelect = document.getElementById('room-select');
const angleSelect = document.getElementById('angle-select');
const lightingSelect = document.getElementById('lighting-select');
const styleSelect = document.getElementById('style-select');
const situationSelect = document.getElementById('situations-select');
const topicSelect = document.getElementById('topic-select');
const userIdeasInput = document.getElementById('user-ideas');
const negativePromptInput = document.getElementById('negative-prompt')
const promptPreview = document.getElementById('prompt-preview');
const resultContainer = document.getElementById('result-container');
const form = document.getElementById('prompt-form');
const roomSelection = document.getElementById('room-selection');
const imageStrengthGroup = document.getElementById('image-strength-group');

// Globale Variablen
let buildings = [];
let rooms = {};
let angles = [];
let lightings = [];
let styles = [];
let situations = [];
let topics = [];
let currentBuilding = null;
let currentRoom = null;
let currentMode = 'text'; // 'text' oder 'image'
let currentAngle = null;
let currentLighting = null;
let currentStyle = null;
let currentSituation = null;
let currentTopic = null;

// Moduswechsel
textModeBtn.addEventListener('click', () => {
    setMode('text');
});

imageModeBtn.addEventListener('click', () => {
    setMode('image');
});

function setMode(mode) {
    currentMode = mode;
    textModeBtn.classList.toggle('active', mode === 'text');
    imageModeBtn.classList.toggle('active', mode === 'image');
    
    i2iParams.classList.toggle('hidden', mode === 'text');
    roomGroup.classList.toggle('hidden', mode === 'text');
    roomSelection.classList.toggle('hidden', mode === 'text');
    imageStrengthGroup.classList.toggle('hidden', mode === 'text'); 

    updatePromptPreview();
}

// Bildstärke-Anzeige
imageStrength.addEventListener('input', () => {
    strengthValue.textContent = imageStrength.value;
    updatePromptPreview();
});

// JSON-Daten laden
async function loadDropdownData() {
    try {
        if (!buildingSelect || !roomSelect || !angleSelect || 
            !lightingSelect || !styleSelect || !situationSelect || !topicSelect) {
            throw new Error('Required dropdown elements not found');
        }

        // Gebäude laden
        const buildingResponse = await fetch('/prompt_data/buildings.json');
        if (!buildingResponse.ok) throw new Error('Could not load buildings');
        buildings = await buildingResponse.json();
        
        buildingSelect.innerHTML = '<option value="">Gebäude auswählen</option>';
        buildings.forEach(building => {
            const option = document.createElement('option');
            option.value = building.id;
            option.textContent = building.name;
            buildingSelect.appendChild(option);
        });
        
        // Räume laden
        const roomResponse = await fetch('/prompt_data/rooms.json');
        if (!roomResponse.ok) throw new Error('Could not load rooms');
        rooms = await roomResponse.json();
        
        // Blickwinkel laden
        const angleResponse = await fetch('/prompt_data/angle.json');
        if (!angleResponse.ok) throw new Error('Could not load angles');
        angles = await angleResponse.json();
        
        angleSelect.innerHTML = '<option value="">Blickwinkel auswählen</option>';
        angles.forEach(angle => {
            const option = document.createElement('option');
            option.value = angle.name;
            option.textContent = angle.name;
            angleSelect.appendChild(option);
        });
        
        // Beleuchtungen laden
        const lightingResponse = await fetch('prompt_data/lighting.json');
        if (!lightingResponse.ok) throw new Error('Could not load lighting');
        lightings = await lightingResponse.json();
        
        lightingSelect.innerHTML = '<option value="">Beleuchtung auswählen</option>';
        lightings.forEach(lighting => {
            const option = document.createElement('option');
            option.value = lighting.name;
            option.textContent = lighting.name;
            lightingSelect.appendChild(option);
        });
        
        // Stile laden
        const styleResponse = await fetch('prompt_data/styles.json');
        if (!styleResponse.ok) throw new Error('Could not load styles');
        styles = await styleResponse.json();
        
        styleSelect.innerHTML = '<option value="">Stil auswählen</option>';
        styles.forEach(style => {
            const option = document.createElement('option');
            option.value = style.name;
            option.textContent = style.name;
            styleSelect.appendChild(option);
        });

        // Situationen laden
        const situationsResponse = await fetch('prompt_data/situations.json');
        if (!situationsResponse.ok) throw new Error('Could not load situations');
        situations = await situationsResponse.json();
        
        situationSelect.innerHTML = '<option value="">Situationen auswählen</option>';
        situations.forEach(situation => {
            const option = document.createElement('option');
            option.value = situation.name;
            option.textContent = situation.name;
            situationSelect.appendChild(option);
        });
        
        // Themen laden
        const topicResponse = await fetch('prompt_data/topics.json');
        if (!topicResponse.ok) throw new Error('Could not load topics');
        topics = await topicResponse.json();
        
        topicSelect.innerHTML = '<option value="">Thema auswählen</option>';
        topics.forEach(topic => {
            const option = document.createElement('option');
            option.value = topic.name;
            option.textContent = topic.name;
            topicSelect.appendChild(option);
        });

    } catch (error) {
        console.error('Error loading dropdown data:', error);
        showError('Fehler beim Laden der Daten: ' + error.message);
        throw error;
    }
}

// Event-Listener für Gebäudeauswahl
buildingSelect.addEventListener('change', () => {
    const buildingId = buildingSelect.value;
    currentBuilding = buildings.find(b => b.id === buildingId);
    
    if (currentBuilding) {
        const buildingRooms = rooms[buildingId] || [];
        roomSelect.innerHTML = '<option value="">Raum auswählen</option>';
        roomSelect.disabled = false;
        
        buildingRooms.forEach(room => {
            const option = document.createElement('option');
            option.value = room.name;
            option.textContent = room.name;
            roomSelect.appendChild(option);
        });
        
        roomPreview.src = 'images/logo.png';
    } else {
        roomSelect.innerHTML = '<option value="">Bitte zuerst Gebäude auswählen</option>';
        roomSelect.disabled = true;
    }
    
    updatePromptPreview();
});

// Event-Listener für Raumauswahl
roomSelect.addEventListener('change', () => {
    const roomName = roomSelect.value;
    
    if (currentBuilding && roomName) {
        const buildingRooms = rooms[currentBuilding.id] || [];
        currentRoom = buildingRooms.find(r => r.name === roomName);
        
        if (currentRoom) {
            updateRoomPreview();
        }
    }
    
    updatePromptPreview();
});

// Raumvorschau aktualisieren
function updateRoomPreview() {
    if (currentBuilding && currentRoom && currentRoom.preview) {
        roomPreview.src = `i2i/${currentBuilding.id}/${currentRoom.preview}`;
    } else {
        roomPreview.src = 'images/logo.png';
    }
}

// Globale Variablen synchronisieren
function syncGlobals() {
    currentAngle = angleSelect.value ? angles.find(a => a.name === angleSelect.value) : null;
    currentLighting = lightingSelect.value ? lightings.find(l => l.name === lightingSelect.value) : null;
    currentStyle = styleSelect.value ? styles.find(s => s.name === styleSelect.value) : null;
    currentSituation = situationSelect.value ? situations.find(s => s.name === situationSelect.value) : null;
    currentTopic = topicSelect.value ? topics.find(t => t.name === topicSelect.value) : null;
}

// Formular-Handler
function handleFormSubmit(e) {
    e.preventDefault();
    syncGlobals();

    if (!currentBuilding || !currentAngle || !currentLighting || 
        !currentStyle || !currentSituation || !currentTopic) {
        showError('Bitte wählen Sie alle erforderlichen Optionen aus');
        return;
    }
    
    if (currentMode === 'image' && !currentRoom) {
        showError('Bitte wählen Sie einen Raum für den Image-Modus');
        return;
    }

    let prompt = `${currentBuilding.promptAddition}`;
    
    if (currentRoom) prompt += ` - ${currentRoom.promptAddition}`;
    prompt += `, ${currentAngle.promptAddition}`;
    prompt += `, ${currentLighting.promptAddition}`;
    prompt += `, Stil: ${currentStyle.promptAddition}`;
    prompt += `, Situationen: ${currentSituation.promptAddition}`;
    prompt += `, Thema: ${currentTopic.promptAddition}`;

    const userIdeas = userIdeasInput.value.trim();
    if (userIdeas) {
        prompt += `, The Image should contain the following:  ${userIdeas}`;
    }
    
    const negativePrompts = negativePromptInput.value.trim();
    if(negativePrompts) {
        prompt += `, The Image should not contain the following: ${negativePrompts}`;
    }

    if (currentMode === 'image') {
        prompt += `, Bild-zu-Bild (Stärke: ${imageStrength.value})`;
    }
    
    generateImage(prompt);
}

// Bildgenerierung
async function generateImage(prompt) {
    const generationData = {
        prompt: prompt,
        mode: currentMode
    };

    if (currentMode === 'image' && currentBuilding && currentRoom) {
        generationData.imagePath = `${currentBuilding.id}/${currentRoom.preview}`;
        generationData.image_strength = parseFloat(imageStrength.value);
    }

    resultContainer.innerHTML = '<div class="loading">Bild wird generiert...</div>';
    
    const button = form.querySelector('button');
    button.disabled = true;
    button.textContent = 'Wird generiert...';

    try {
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(generationData)
        });

        if (!response.ok) throw new Error('Server error: ' + response.status);

        const data = await response.json();
        
        if (data.imageUrl) {
            resultContainer.innerHTML = `
                <img id="generated-image" src="${data.imageUrl}" alt="Generiertes Bild">
                <div class="image-info">Prompt: ${prompt}</div>
            `;
        } else {
            showError(data.error || 'Unbekannter Fehler bei der Generierung');
        }
    } catch (error) {
        console.error('Fehler:', error);
        showError('Serverfehler aufgetreten: ' + error.message);
    } finally {
        button.disabled = false;
        button.textContent = 'Generieren';
    }
}

// Prompt-Vorschau aktualisieren
function updatePromptPreview() {
    syncGlobals();
    
    const buildingId = buildingSelect.value;
    const userIdeas = userIdeasInput.value.trim();
    const negativePrompts = negativePromptInput.value.trim();
    const selectedBuilding = buildingId ? buildings.find(b => b.id === buildingId) : null;

    let preview = '';
    
    if (buildingId && currentAngle && currentLighting && currentStyle && currentSituation && currentTopic) {
        preview = `Photorealistic Illustration: ${selectedBuilding.promptAddition}`;
        
        if (userIdeas) {
            preview += `, The Image should contain the following:  ${userIdeas}`;
        }

        if (negativePrompts) {
            preview += `, The Image should not contain the following: ${negativePrompts}`;
        }
        
        preview += `, ${currentAngle.promptAddition}`;
        preview += `, ${currentLighting.promptAddition}`;
        preview += `, Stil: ${currentStyle.promptAddition}`;
        preview += `, Situationen: ${currentSituation.promptAddition}`;
        preview += `, Thema: ${currentTopic.promptAddition}`;
        
        if (currentMode === 'image') {
            preview += `, Bild-zu-Bild (Stärke: ${imageStrength.value})`;
        }
    } else {
        preview = 'Bitte wählen Sie alle erforderlichen Optionen aus';
    }
    
    promptPreview.textContent = preview;
}

// Fehler anzeigen
function showError(message) {
    resultContainer.innerHTML = `<div class="error">Fehler: ${message}</div>`;
}

// Event-Listener initialisieren
function initEventListeners() {
    // Dropdown-Änderungen
    buildingSelect.addEventListener('change', updatePromptPreview);
    roomSelect.addEventListener('change', updatePromptPreview);
    angleSelect.addEventListener('change', updatePromptPreview);
    lightingSelect.addEventListener('change', updatePromptPreview);
    styleSelect.addEventListener('change', updatePromptPreview);
    situationSelect.addEventListener('change', updatePromptPreview);
    topicSelect.addEventListener('change', updatePromptPreview);
    
    // Textfelder
    userIdeasInput.addEventListener('input', updatePromptPreview);
    negativePromptInput.addEventListener('input', updatePromptPreview);
    
    // Formular abschicken
    form.addEventListener('submit', handleFormSubmit);
}

function handleUrlParameters() {
  const urlParams = new URLSearchParams(window.location.search);
  
  const params = [
    { key: 'perspective', setter: (value) => setDropdownValue('angle', value) },
    { key: 'stilrichtung', setter: (value) => setDropdownValue('style', value) },
    { key: 'licht', setter: (value) => setDropdownValue('lighting', value) },
    { key: 'situation', setter: (value) => setDropdownValue('situation', value) },
    { key: 'thema', setter: (value) => setDropdownValue('topic', value) }
  ];
  
  let needsUpdate = false;
  
  params.forEach(param => {
    const value = urlParams.get(param.key);
    if (value) {
      param.setter(value);
      needsUpdate = true;
    }
  });
  
  if (needsUpdate) {
    updatePromptPreview();
    
    setTimeout(() => {
      document.getElementById('prompt-form').scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }
}

// Hilfsfunktion zum Setzen von Dropdown-Werten
function setDropdownValue(type, value) {
  let selectElement, collection;
  
  switch (type) {
    case 'angle':
      selectElement = angleSelect;
      collection = angles;
      break;
    case 'style':
      selectElement = styleSelect;
      collection = styles;
      break;
    case 'lighting':
      selectElement = lightingSelect;
      collection = lightings;
      break;
    case 'situation':
      selectElement = situationSelect;
      collection = situations;
      break;
    case 'topic':
      selectElement = topicSelect;
      collection = topics;
      break;
    default:
      return;
  }
  
  const normalizedValue = value.toLowerCase().replace(/\s+/g, '');
  const foundItem = collection.find(item => 
    item.name.toLowerCase().replace(/\s+/g, '') === normalizedValue
  );
  
  if (foundItem) {
    selectElement.value = foundItem.name;
    
    switch (type) {
      case 'angle':
        currentAngle = foundItem;
        break;
      case 'style':
        currentStyle = foundItem;
        break;
      case 'lighting':
        currentLighting = foundItem;
        break;
      case 'situation':
        currentSituation = foundItem;
        break;
      case 'topic':
        currentTopic = foundItem;
        break;
    }
  }
}

// Initialisierung
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadDropdownData();
        setMode('text');
        initEventListeners();
        handleUrlParameters();
        updateRoomPreview();
    } catch (error) {
        console.error('Initialisierungsfehler:', error);
    }
});