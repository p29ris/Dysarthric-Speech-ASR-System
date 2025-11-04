import os
import requests
import soundfile as sf
import torch
from flask import Flask, request, jsonify
from transformers import pipeline

# --- Configuration ---
# REPLACE with your actual model name on Hugging Face
HF_MODEL_NAME = "YOUR_HUGGINGFACE_MODEL_NAME/ASR_Model" 
TEMP_AUDIO_PATH = "temp_audio.wav"

# --- Initialization ---
# Use 'cuda' if you use a GPU on Render, otherwise 'cpu'
device = 0 if torch.cuda.is_available() else -1 

# Load the ASR model pipeline (This is the slow part, do it once globally)
try:
    asr_pipeline = pipeline(
        "automatic-speech-recognition",
        model=HF_MODEL_NAME,
        device=device
    )
    print(f"Model {HF_MODEL_NAME} loaded successfully.")
except Exception as e:
    print(f"Error loading model: {e}")
    asr_pipeline = None

app = Flask(__name__)

# --- Helper Function ---
def download_audio_from_url(url, output_path):
    """Downloads an audio file from a given URL."""
    response = requests.get(url, stream=True)
    if response.status_code != 200:
        raise Exception(f"Failed to download audio. Status: {response.status_code}")
    
    with open(output_path, 'wb') as f:
        for chunk in response.iter_content(chunk_size=8192):
            f.write(chunk)
    print(f"Audio downloaded to {output_path}")

# --- API Endpoint ---
@app.route('/transcribe', methods=['POST'])
def transcribe_audio():
    if not asr_pipeline:
        return jsonify({"message": "ASR model is not initialized."}), 503
    
    data = request.json
    audio_url = data.get('audioUrl')
    
    if not audio_url:
        return jsonify({"message": "Missing audioUrl in request body."}), 400

    try:
        # 1. Download the audio file from Firebase Storage URL
        download_audio_from_url(audio_url, TEMP_AUDIO_PATH)
        
        # 2. Run the ASR Model
        # The pipeline handles resampling and format conversion internally
        print("Starting transcription...")
        
        # You can specify chunking or batching here for large files if needed
        result = asr_pipeline(TEMP_AUDIO_PATH)
        transcribed_text = result['text']
        
        print(f"Transcription complete: {transcribed_text[:50]}...")
        
        # 3. Clean up the temporary file
        os.remove(TEMP_AUDIO_PATH)

        # 4. Return the result to the Expo App
        return jsonify({
            "message": "Transcription successful",
            "transcribedText": transcribed_text
        })
    
    except Exception as e:
        print(f"Transcription error: {e}")
        # Ensure cleanup even on error
        if os.path.exists(TEMP_AUDIO_PATH):
            os.remove(TEMP_AUDIO_PATH)
            
        return jsonify({"message": f"An error occurred during processing: {str(e)}"}), 500

if __name__ == '__main__':
    # Use gunicorn for production
    app.run(host='0.0.0.0', port=os.environ.get('PORT', 5000))