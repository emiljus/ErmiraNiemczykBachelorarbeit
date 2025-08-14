const express = require('express');
const router = express.Router();
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const LEONARDO_API_BASE = 'https://cloud.leonardo.ai/api/rest/v1';
const UPLOAD_API_URL = `${LEONARDO_API_BASE}/init-image`;
const GENERATION_API_URL = `${LEONARDO_API_BASE}/generations`;

async function uploadImageToLeonardo(base64Image) {
  try {
    const matches = base64Image.match(/^data:(image\/(jpeg|png));base64,(.+)$/);
    if (!matches) throw new Error('Nur JPEG/PNG Bilder werden unterstützt');
    
    const contentType = matches[1];
    const base64Data = matches[3];
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Presigned URL anfordern
    const extension = contentType.includes('png') ? 'png' : 'jpg';
    console.log('Fordere Presigned URL an...');
    const presignedResponse = await axios.post(
      UPLOAD_API_URL,
      { extension },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.LEONARDO_API_KEY}`
        }
      }
    );

    console.log('Presigned URL Antwort:', presignedResponse.data);

    if (presignedResponse.status !== 200) {
      throw new Error(`Fehler bei Presigned URL: ${presignedResponse.status}`);
    }

    const presignedData = presignedResponse.data;
    if (!presignedData.uploadInitImage) {
      throw new Error('Ungültige Antwort von Leonardo API');
    }

    const { fields, url: presignedUrl, id: imageId } = presignedData.uploadInitImage;
    
    let parsedFields;
    try {
      parsedFields = JSON.parse(fields);
    } catch (parseError) {
      throw new Error('Fehler beim Parsen der Felder: ' + parseError.message);
    }

    console.log('Erhaltene Upload-Felder:', parsedFields);
    
    const requiredFields = [
      'key', 
      'X-Amz-Algorithm',    
      'X-Amz-Credential',   
      'X-Amz-Date',         
      'Policy',             
      'X-Amz-Signature'     
    ];
    
    const missingFields = requiredFields.filter(field => !(field in parsedFields));
    if (missingFields.length > 0) {
      throw new Error(`Fehlende Felder in API-Antwort: ${missingFields.join(', ')}`);
    }

    const form = new FormData();
    
    Object.entries(parsedFields).forEach(([key, value]) => {
      form.append(key, value);
    });
    
    form.append('file', buffer, {
      filename: `upload.${extension}`,
      contentType,
      knownLength: buffer.length
    });

    console.log('Lade Bild hoch...');
    const uploadResponse = await axios.post(presignedUrl, form, {
      headers: {
        ...form.getHeaders(),
        'Content-Length': form.getLengthSync()
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    if (uploadResponse.status !== 204) {
      throw new Error(`Bildupload fehlgeschlagen: ${uploadResponse.status}`);
    }

    console.log('Bild erfolgreich hochgeladen');
    return imageId;
  } catch (error) {
    console.error('Upload Fehler:', {
      message: error.message,
      response: error.response?.data,
      stack: error.stack
    });
    throw new Error(`Bildupload fehlgeschlagen: ${error.message}`);
  }
}

async function waitForGenerationResult(generationId) {
  const maxAttempts = 30;
  const pollInterval = 2000;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await new Promise(resolve => setTimeout(resolve, pollInterval));
    
    try {
      console.log(`Überprüfe Generierungsstatus (Versuch ${attempt})...`);
      const response = await axios.get(`${GENERATION_API_URL}/${generationId}`, {
        headers: {
          'Authorization': `Bearer ${process.env.LEONARDO_API_KEY}`
        }
      });

      const statusData = response.data;
      
      // DEBUGGING: Logge die gesamte API-Antwort
      console.log('API-Antwort:', JSON.stringify(statusData, null, 2));
      
      // NEU: Aktuelle API-Struktur verarbeiten
      if (statusData.generations_by_pk) {
        const generation = statusData.generations_by_pk;
        
        if (!generation) {
          throw new Error('Generierungsdaten nicht gefunden');
        }

        if (generation.status === 'COMPLETE') {
          if (generation.generated_images?.length > 0) {
            console.log('Generierung erfolgreich abgeschlossen');
            return generation.generated_images.map(img => img.url);
          }
          throw new Error('Keine Bilder in der Antwort');
        } else if (generation.status === 'FAILED') {
          throw new Error('Generierung fehlgeschlagen');
        }
      } 
      // ALTERNATIVE: Neue API-Struktur
      else if (statusData.generation && statusData.generation.generated_images) {
        const generation = statusData.generation;
        
        if (generation.status === 'COMPLETE') {
          if (generation.generated_images?.length > 0) {
            console.log('Generierung erfolgreich abgeschlossen (neue Struktur)');
            return generation.generated_images.map(img => img.url);
          }
          throw new Error('Keine Bilder in der Antwort');
        } else if (generation.status === 'FAILED') {
          throw new Error('Generierung fehlgeschlagen');
        }
      }
      // FALLBACK: Direkter Zugriff auf Bilder
      else if (statusData.generated_images?.length > 0) {
        console.log('Generierung erfolgreich abgeschlossen (Fallback)');
        return statusData.generated_images.map(img => img.url);
      } 
      else {
        throw new Error('Unbekannte API-Antwortstruktur');
      }
    } catch (error) {
      console.log(`Abfrageversuch ${attempt} fehlgeschlagen: ${error.message}`);
    }
  }
  
  throw new Error('Generierung überschritt Zeitlimit');
}

router.post('/generate', async (req, res) => {
  try {
    const { 
      prompt, 
      mode, 
      imagePath, 
      image_strength 
    } = req.body;

    // Sicherheitscheck für imagePath
    if (imagePath && (imagePath.includes('../') || imagePath.startsWith('/')) ){
      throw new Error('Ungültiger Bildpfad');
    }

    let init_image_id = null;
    if (mode === 'image' && imagePath) {
      console.log('Lade Bild vom Server:', imagePath);
      
      try {
        const fullPath = path.join(__dirname, '../../server/i2i', imagePath);
        
        console.log('Vollständiger Pfad:', fullPath);
        console.log('Existiert Datei?', fs.existsSync(fullPath));
        
        if (!fs.existsSync(fullPath)) {
          throw new Error('Bilddatei nicht gefunden');
        }
        
        const imageBuffer = fs.readFileSync(fullPath);
        const mimeType = imagePath.endsWith('.png') ? 'image/png' : 'image/jpeg';
        const base64Image = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
        
        init_image_id = await uploadImageToLeonardo(base64Image);
        console.log('Bild erfolgreich hochgeladen, ID:', init_image_id);
      } catch (error) {
        console.error('Fehler beim Lesen des Bildes:', error);
        throw new Error('Bilddatei nicht gefunden oder kann nicht gelesen werden');
      }
    }

    const payload = {
      prompt,
      modelId: "e316348f-7773-490e-adcd-46757c738eb7", 
      width: 768,
      height: 512,
      num_images: 1,
      scheduler: "LEONARDO",
      presetStyle: "ILLUSTRATION",
      alchemy: false,
      photoReal: false,  
    };

    if (init_image_id) {
      payload.init_image_id = init_image_id;
      payload.init_strength = image_strength || 0.5;
    }

    console.log('Starte Bildgenerierung mit Payload:', payload);
    const response = await axios.post(GENERATION_API_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.LEONARDO_API_KEY}`
      }
    });

    console.log('Generierungsantwort:', response.data);

    const generationId = response.data.sdGenerationJob?.generationId;
    if (!generationId) throw new Error('Keine Generierungs-ID erhalten');

    console.log('Generation gestartet, ID:', generationId);
    
    // KORREKTUR: Erhalten eines Arrays von URLs
    const imageUrls = await waitForGenerationResult(generationId);
    console.log('Bilder erfolgreich generiert:', imageUrls);

    // KORREKTUR: Rückgabe der ersten Bild-URL
    res.json({
      success: true, 
      imageUrl: imageUrls[0] // Erstes Bild aus dem Array
    });
  } catch (error) {
    console.error('Leonardo API Fehler:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
      stack: error.stack
    });
    
    res.status(500).json({ 
      success: false,
      error: 'Bildgenerierung fehlgeschlagen',
      details: error.message
    });
  }
});

module.exports = router;