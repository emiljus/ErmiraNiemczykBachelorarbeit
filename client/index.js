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
const negativePromptInput = document.getElementById('negative-prompt'); // ID korrigiert
const promptPreview = document.getElementById('prompt-preview');
const resultContainer = document.getElementById('result-container');
const form = document.getElementById('prompt-form');
const generatedPromptText = document.getElementById('generated-prompt-text'); // Neu hinzugefügt

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
let currentMode = 'text'; // Standardmodus

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
        const lightingResponse = await fetch('/prompt_data/lighting.json');
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
        const styleResponse = await fetch('/prompt_data/styles.json');
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
        const situationsResponse = await fetch('/prompt_data/situations.json');
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
        const topicResponse = await fetch('/prompt_data/topics.json');
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
        
        roomPreview.src = '/images/logo.png';
    } else {
        roomSelect.innerHTML = '<option value="">Bitte zuerst Gebäude auswählen</option>';
        roomSelect.disabled = true;
        currentRoom = null;
    }
    
    updateRoomPreview();
    updatePromptPreview();
});

// Event-Listener für Raumauswahl
roomSelect.addEventListener('change', () => {
    const roomName = roomSelect.value;
    
    if (currentBuilding && roomName) {
        const buildingRooms = rooms[currentBuilding.id] || [];
        currentRoom = buildingRooms.find(r => r.name === roomName);
    } else {
        currentRoom = null;
    }
    
    updateRoomPreview();
    updatePromptPreview();
});

// Raumvorschau aktualisieren
function updateRoomPreview() {
    if (currentBuilding && currentRoom && currentRoom.preview) {
        roomPreview.src = `/i2i/${currentBuilding.id}/${currentRoom.preview}`;
    } else {
        roomPreview.src = '/images/logo.png';
    }
}

// Formular-Handler (KORRIGIERT)
function handleFormSubmit(e) {
    e.preventDefault();

    const angle = angleSelect.value;
    const lighting = lightingSelect.value;
    const style = styleSelect.value;
    const situation = situationSelect.value;
    const topic = topicSelect.value;
    const userIdeas = userIdeasInput.value.trim();
    const negativePrompt = negativePromptInput.value.trim();

    // Validierung der Pflichtfelder
    if (!angle || !lighting || !style || !situation || !topic) {
        showError('Bitte wählen Sie alle erforderlichen Optionen aus');
        return;
    }

    // Zusätzliche Validierung für Bildmodus
    if (currentMode === 'image' && (!currentBuilding || !currentRoom)) {
        showError('Bitte wählen Sie ein Gebäude und einen Raum aus');
        return;
    }

    // Finde die ausgewählten Objekte
    const currentAngleObj = angles.find(a => a.name === angle);
    const currentLightingObj = lightings.find(l => l.name === lighting);
    const currentStyleObj = styles.find(s => s.name === style);
    const currentSituationObj = situations.find(p => p.name === situation);
    const currentTopicObj = topics.find(t => t.name === topic);

    if (!currentAngleObj || !currentLightingObj || !currentStyleObj || !currentSituationObj || !currentTopicObj) {
        showError('Ein oder mehrere ausgewählte Elemente wurden nicht gefunden');
        return;
    }

    // Prompt zusammenbauen
    let prompt = '';
    
    // Gebäude und Raum nur im Bildmodus hinzufügen
    if (currentMode === 'image' && currentBuilding && currentRoom) {
        prompt += `${currentBuilding.promptAddition} - ${currentRoom.promptAddition}, `;
    }
    
    prompt += `${currentAngleObj.promptAddition}`;
    prompt += `, ${currentLightingObj.promptAddition}`;
    prompt += `, Stil: ${currentStyleObj.promptAddition}`;
    prompt += `, Situationen: ${currentSituationObj.promptAddition}`;
    prompt += `, Thema: ${currentTopicObj.promptAddition}`;

    if (userIdeas) {
        prompt += `, The Image should contain the following: ${userIdeas}`;
    }
    
    if (negativePrompt) {
        prompt += `, The Image should not contain the following: ${negativePrompt}`;
    }
    
    generateImage(prompt);
}

async function generateImage(prompt) {
    const generationData = {
        prompt: prompt,
        mode: currentMode
    };

    // Ergebniscontainer vorbereiten
    resultContainer.classList.remove('hidden');
    resultContainer.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Bild wird generiert...</p>
        </div>
    `;
    
    const button = form.querySelector('button');
    button.disabled = true;
    button.textContent = 'Wird generiert...';

    // Bildmodus-spezifische Parameter
    if (currentMode === 'image' && currentBuilding && currentRoom) {
        generationData.imagePath = `${currentBuilding.id}/${currentRoom.preview}`;
        generationData.image_strength = parseFloat(imageStrength.value);
    }

    try {
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(generationData)
        });

        // Debugging-Hilfe
        const rawResponse = await response.clone().text();
        console.log("Raw API Response:", rawResponse);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Serverfehler (${response.status})`);
        }

        const data = await response.json();
        console.log("API Response Data:", data);
        
        if (data.imageUrl) {
            // Element sicher referenzieren
            const generatedPromptElement = document.getElementById('generated-prompt-text');
            
            // Ergebnis-HTML erstellen
            const resultHTML = `
                <div class="result-images">
                    <div class="result-image-wrapper">
                        <img class="result-image" src="${data.imageUrl}" alt="Generiertes Bild">
                        <img class="download-icon" src="/images/download-icon.png" alt="Download">
                    </div>
                </div>
                <div class="result-prompt">
                    <strong>Generierter Prompt:</strong>
                    <p>${prompt}</p>
                </div>
            `;
            
            resultContainer.innerHTML = resultHTML;
            
            // Download-Funktion
            document.querySelector('.download-icon').addEventListener('click', () => {
                const link = document.createElement('a');
                link.href = data.imageUrl;
                link.download = 'generiertes-bild.jpg';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            });
            
            // Falls spezielles Element existiert, Prompt setzen
            if (generatedPromptElement) {
                generatedPromptElement.textContent = prompt;
            } else {
                console.warn('Element #generated-prompt-text nicht gefunden');
            }
        } else if (data.error) {
            showError(data.error);
        } else {
            showError('Kein Bild in der Antwort erhalten');
        }
    } catch (error) {
        console.error('Fehler:', error);
        showError('Serverfehler: ' + error.message);
    } finally {
        button.disabled = false;
        button.textContent = 'Generieren';
    }
}

// Prompt-Vorschau aktualisieren
function updatePromptPreview() {
    const angle = angleSelect.value;
    const lighting = lightingSelect.value;
    const style = styleSelect.value;
    const situation = situationSelect.value;
    const topic = topicSelect.value;
    const userIdeas = userIdeasInput.value.trim();
    const negativePrompt = negativePromptInput.value.trim();

    let preview = '';
    
    if (angle && lighting && style && situation && topic) {
        const currentAngleObj = angles.find(a => a.name === angle);
        const currentLightingObj = lightings.find(l => l.name === lighting);
        const currentStyleObj = styles.find(s => s.name === style);
        const currentSituationObj = situations.find(p => p.name === situation);
        const currentTopicObj = topics.find(t => t.name === topic);

        // Nur Objekte verwenden, wenn sie gefunden wurden
        if (currentAngleObj && currentLightingObj && currentStyleObj && currentSituationObj && currentTopicObj) {
            // Gebäude und Raum nur im Bildmodus hinzufügen
            if (currentMode === 'image' && currentBuilding && currentRoom) {
                preview += `${currentBuilding.promptAddition} - ${currentRoom.promptAddition}, `;
            }
            
            preview += `${currentAngleObj.promptAddition}`;
            preview += `, ${currentLightingObj.promptAddition}`;
            preview += `, Stil: ${currentStyleObj.promptAddition}`;
            preview += `, Situationen: ${currentSituationObj.promptAddition}`;
            preview += `, Thema: ${currentTopicObj.promptAddition}`;

            if (userIdeas) {
                preview += `, The Image should contain the following: ${userIdeas}`;
            }

            if (negativePrompt) {
                preview += `, The Image should not contain the following: ${negativePrompt}`;
            }
        } else {
            preview = 'Ein oder mehrere ausgewählte Elemente wurden nicht gefunden';
        }
    } else {
        preview = 'Bitte wählen Sie alle erforderlichen Optionen aus';
    }
    
    promptPreview.textContent = preview;
}

// Fehler anzeigen
function showError(message) {
    resultContainer.classList.remove('hidden');
    resultContainer.innerHTML = `<div class="error">Fehler: ${message}</div>`;
}

// Event-Listener initialisieren
function initEventListeners() {
    // Dropdown-Änderungen
    angleSelect.addEventListener('change', updatePromptPreview);
    lightingSelect.addEventListener('change', updatePromptPreview);
    styleSelect.addEventListener('change', updatePromptPreview);
    situationSelect.addEventListener('change', updatePromptPreview);
    topicSelect.addEventListener('change', updatePromptPreview);
    userIdeasInput.addEventListener('input', updatePromptPreview);
    negativePromptInput.addEventListener('input', updatePromptPreview);
    buildingSelect.addEventListener('change', updatePromptPreview);
    roomSelect.addEventListener('change', updatePromptPreview);
    imageStrength.addEventListener('input', updatePromptPreview);

    // Formular abschicken
    form.addEventListener('submit', handleFormSubmit);
}

// Initialisierung
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadDropdownData();
        setMode('text');
        initEventListeners();
        updateRoomPreview();
        updatePromptPreview();
        
        // Ergebniscontainer initial verstecken
        resultContainer.classList.add('hidden');
    } catch (error) {
        console.error('Initialisierungsfehler:', error);
        showError('Initialisierungsfehler: ' + error.message);
    }
});