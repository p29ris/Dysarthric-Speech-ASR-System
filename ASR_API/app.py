import os
from flask import Flask, request, jsonify
from transformers import pipeline
import torch
# We do not need requests or urllib.parse for the direct upload solution

# --- Configuration ---
# HF_MODEL_NAME will be loaded from the environment variables set on Render
# IMPORTANT: Make sure you set HF_MODEL_NAME in Render environment settings
HF_MODEL_NAME = "p29ris/whisper-small-torgo-step2500" 
TEMP_AUDIO_PATH = "temp_audio.wav"

# --- Initialization ---
# Use 0 for GPU (cuda) if available on your Render instance, otherwise use -1 for CPU
# For Free/Starter tiers, use -1 (CPU)
device = -1 # Assuming CPU for free/starter Render plan

# Load the ASR model pipeline (This runs once when the service starts)
try:
    asr_pipeline = pipeline(
        "automatic-speech-recognition",
        model=HF_MODEL_NAME,
        device=device
    )
    print(f"Model {HF_MODEL_NAME} loaded successfully.")
except Exception as e:
    print(f"ERROR: Failed to load ASR model: {e}")
    asr_pipeline = None

app = Flask(__name__)

# --- 1. HEALTH CHECK ROUTE (GET /) ---
@app.route('/', methods=['GET'])
def health_check():
    """Provides a simple JSON response to confirm the server is running."""
    status = "Operational" if asr_pipeline else "Error: Model failed to load"
    return jsonify({
        "status": status,
        "message": "ASR API is running successfully.",
        "model_name": HF_MODEL_NAME
    }), 200

# --- 2. DIRECT FILE UPLOAD ENDPOINT (POST /upload_and_transcribe) ---
@app.route('/upload_and_transcribe', methods=['POST'])
def direct_upload_and_transcribe():
    if not asr_pipeline:
        return jsonify({"message": "ASR model is not initialized."}), 503
    
    # 1. Validation Check
    if 'audio_file' not in request.files:
        return jsonify({"message": "Missing file part named 'audio_file'."}), 400
    
    audio_file = request.files['audio_file']
    if audio_file.filename == '':
        return jsonify({"message": "No selected file."}), 400

    try:
        # 2. Save the uploaded file locally on the Render server
        # The .save() method streams the file data directly to disk.
        audio_file.save(TEMP_AUDIO_PATH)
        print(f"File received and saved locally: {TEMP_AUDIO_PATH}")
        
        # 3. Run the ASR Model 
        print("Starting transcription...")
        result = asr_pipeline(TEMP_AUDIO_PATH)
        transcribed_text = result['text']
        
        print(f"Transcription complete: {transcribed_text[:50]}...")
        
        # 4. Clean up the temporary file
        os.remove(TEMP_AUDIO_PATH)

        # 5. Return the result
        return jsonify({
            "message": "Transcription successful (Direct Upload)",
            "transcribedText": transcribed_text
        })
    
    except Exception as e:
        # Ensure cleanup even on error
        if os.path.exists(TEMP_AUDIO_PATH):
            os.remove(TEMP_AUDIO_PATH)
            
        print(f"Transcription error: {e}")
        # Return a generic server error to the client
        return jsonify({"message": f"Server processing error. Check service logs for details. Error: {str(e)}"}), 500


# --- 3. (REMOVED) The /transcribe route for Firebase is removed as we are not using Firebase storage for now. ---

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
