import io
import os

import requests
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from starlette.responses import JSONResponse

# --- Configuration ---
# CRITICAL: This is the URL to your model's FREE inference endpoint
# NOTE: Using the tiny model is recommended due to the startup time issue.
HF_INFERENCE_URL = "https://api-inference.huggingface.co/models/p29ris/whisper-tiny-step1300"
# We read the API token from the secure Hugging Face Secrets environment variable.
HF_API_TOKEN = os.environ.get("HF_API_TOKEN") 
# WARNING: Ensure you have set this secret in your Space's Settings page!

# --- Initialization ---
# FastAPI app instance
app = FastAPI()

# We check if the token was successfully loaded from the environment.
APP_STATUS = "Operational" if HF_API_TOKEN else "Error: Token Missing"
STATUS_CODE = 200 if HF_API_TOKEN else 503

# --- 1. HEALTH CHECK ROUTE (GET /) ---
@app.get("/", status_code=STATUS_CODE)
async def health_check():
    """Provides a simple JSON response to confirm the server is running."""
    return {
        "status": APP_STATUS,
        "message": "FastAPI ASR Inference API is running.",
        "model_url": HF_INFERENCE_URL
    }

# --- 2. DIRECT FILE UPLOAD ENDPOINT (POST /upload_and_transcribe) ---
@app.post("/upload_and_transcribe")
async def direct_upload_and_transcribe(
    # FastAPI handles form data fields cleanly:
    audio_file: UploadFile = File(...), 
    userId: str = Form(None)
):
    # CRITICAL: Check if the token is available before spending time processing
    if APP_STATUS != "Operational":
        raise HTTPException(
            status_code=503,
            detail="Server not configured for inference (HF_API_TOKEN Missing). Please check Secrets."
        )

    if not audio_file:
        raise HTTPException(status_code=400, detail="Missing file part named 'audio_file'.")
    
    try:
        # 1. Read file contents directly into memory (bytes)
        # This is asynchronous and efficient (no disk writing needed).
        audio_bytes = await audio_file.read()
        print(f"File received: {audio_file.filename} ({len(audio_bytes)} bytes).")

        # 2. Send the bytes to the Hugging Face Inference API
        headers = {"Authorization": f"Bearer {HF_API_TOKEN}"}
        
        print("Starting inference via Hugging Face Inference API...")
        
        # Use requests call (synchronous, but fast since the file is small)
        inference_response = requests.post(
            HF_INFERENCE_URL, 
            headers=headers, 
            data=audio_bytes
        )
        inference_response.raise_for_status() # Raise exception for bad status codes (4xx or 5xx)

        # 3. Parse the result
        result_json = inference_response.json()
        
        # Inference API returns a list of dicts for ASR, take the first one
        if isinstance(result_json, list) and len(result_json) > 0:
            transcribed_text = result_json[0].get("text")
        else:
             # Handle case where API returns a single dictionary
             transcribed_text = result_json.get("text")
        
        print(f"Inference complete. Text: {transcribed_text[:50]}...")

        # 4. Return the result
        return {
            "message": "Transcription successful (FastAPI Inference API)",
            "transcribedText": transcribed_text
        }
    
    except requests.exceptions.RequestException as e:
        error_detail = str(e)
        if "429" in error_detail:
             error_detail = "Too Many Requests (429). Try again later (free tier rate limit)."
        
        print(f"Inference API Error: {error_detail}")
        raise HTTPException(
            status_code=500, 
            detail=f"Hugging Face API Error: {error_detail}"
        )

    except Exception as e:
        print(f"Server processing error: {e}")
        # The HTTPException allows FastAPI to return a clean JSON error response
        raise HTTPException(
            status_code=500, 
            detail=f"Server processing error during file handling."
        )
