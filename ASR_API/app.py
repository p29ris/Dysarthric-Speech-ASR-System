import torchaudio
from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
from io import BytesIO
import soundfile as sf
import subprocess
import tempfile
import time
import torch
import traceback
from transformers import WhisperProcessor, WhisperForConditionalGeneration
from peft import PeftModel

# Set torchaudio default backend (essential for some Docker images)
try:
    torchaudio.set_audio_backend("sox_io")
except Exception:
    pass

class TranscriptionResponse(BaseModel):
    transcription: str
    model_name: str
    time_taken_ms: float

ASR_ADAPTER_ID = "p29ris/whisper-lora-dysarthria"
BASE_MODEL_ID = "openai/whisper-small"
# Use 'cpu' if no GPU is available, as defined in your Docker setup
DEVICE = "cuda:0" if torch.cuda.is_available() else "cpu"

app = FastAPI(
    title="Impaired Speech ASR API",
    description="ASR service for impaired speech using Hugging Face Transformers.",
    version="1.0.0"
)

# -----------------------------
# Load base model + LoRA adapter
# -----------------------------
model, processor = None, None
try:
    print("🔄 Loading base Whisper model...")
    base_model = WhisperForConditionalGeneration.from_pretrained(BASE_MODEL_ID)

    print("🔄 Attaching LoRA adapter...")
    model = PeftModel.from_pretrained(base_model, ASR_ADAPTER_ID)

    print("🔄 Loading processor...")
    processor = WhisperProcessor.from_pretrained(ASR_ADAPTER_ID)

    model.to(DEVICE)
    model.eval()

    print(f"✅ Model '{ASR_ADAPTER_ID}' loaded successfully on {DEVICE}")
except Exception as e:
    print(f"FATAL: Could not load ASR model. Error: {e}")
    # traceback.print_exc() # Keep this commented out unless actively debugging model load issues

# -----------------------------
# Routes
# -----------------------------
@app.get("/")
def read_root():
    return {"status": "ok", "message": "ASR API is running! Go to /docs for details."}

@app.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe_audio(audio_file: UploadFile = File(...)):
    if model is None or processor is None:
        raise HTTPException(status_code=503, detail="Model not initialized")

    start_time = time.time()
    audio_data = await audio_file.read()

    # --- 1. Audio Decoding ---
    try:
        # soundfile handles most formats if system libraries (like ffmpeg) are present
        audio_input, sampling_rate = sf.read(BytesIO(audio_data), dtype='float32')
    except Exception:
        # Fallback to conversion using subprocess/ffmpeg if soundfile fails (e.g., complex mobile codec)
        try:
            print("Audio read failed, attempting FFmpeg conversion fallback.")
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_in:
                tmp_in.write(audio_data)
                tmp_in.flush()
                input_path = tmp_in.name
            
            with tempfile.NamedTemporaryFile(suffix="_converted.wav", delete=False) as tmp_out:
                output_path = tmp_out.name
            
            # Use ffmpeg to convert to a universally readable WAV format
            subprocess.run(
                ["ffmpeg", "-y", "-i", input_path, output_path], 
                check=True, 
                stdout=subprocess.PIPE, 
                stderr=subprocess.PIPE
            )
            # Read the converted file
            audio_input, sampling_rate = sf.read(output_path, dtype='float32')
            
            # Clean up temp files
            import os
            os.remove(input_path)
            os.remove(output_path)

        except Exception as e:
            print("FFmpeg conversion fallback also failed:", e)
            traceback.print_exc()
            raise HTTPException(status_code=400, detail=f"Audio conversion failed, please ensure file format is supported.")

    # --- 2. Resampling (CRITICAL FIX for 44100 Hz error) ---
    TARGET_SAMPLING_RATE = 16000
    if sampling_rate != TARGET_SAMPLING_RATE:
        print(f"Resampling audio from {sampling_rate}Hz to {TARGET_SAMPLING_RATE}Hz.")
        
        # soundfile gives mono array for mono, torchaudio expects [channels, samples]
        if audio_input.ndim == 1:
            audio_tensor = torch.tensor(audio_input, dtype=torch.float32).unsqueeze(0)
        else:
            audio_tensor = torch.tensor(audio_input, dtype=torch.float32).T
        
        # Perform resampling
        resampler = torchaudio.transforms.Resample(
            orig_freq=sampling_rate, 
            new_freq=TARGET_SAMPLING_RATE
        ).to(audio_tensor.device) 
        
        audio_tensor = resampler(audio_tensor)
        
        # Convert back to mono numpy array for the processor
        audio_input = audio_tensor.squeeze().numpy()
        sampling_rate = TARGET_SAMPLING_RATE
        
    # --- 3. Transcription ---
    try:
        # Audio must be a 1D NumPy array sampled at 16kHz
        inputs = processor(
            audio_input, 
            sampling_rate=sampling_rate, 
            return_tensors="pt"
        ).input_features.to(DEVICE)

        with torch.no_grad():
            predicted_ids = model.generate(inputs)
            
        transcribed_text = processor.batch_decode(
            predicted_ids, 
            skip_special_tokens=True
        )[0]
        
    except Exception as e:
        print("🔥 Transcription failed:", e)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Transcription error: {e}")

    end_time = time.time()
    return TranscriptionResponse(
        transcription=transcribed_text.strip(),
        model_name=ASR_ADAPTER_ID,
        time_taken_ms=round((end_time - start_time) * 1000, 2)
    )