ASR Mobile: Specialized Speech Recognition for Clinical Use

I. Project Overview

ASR Mobile is a cross-platform mobile application built using Expo and React Native, designed for specialized Automatic Speech Recognition (ASR), particularly optimized for speech patterns observed in conditions like dysarthria.

This application provides a secure authentication flow (Firebase), real-time recording capabilities, audio file upload features, and transcription history, all presented in a modern, subdued Dark Lavender theme suitable for clinical environments.

II. Features

- Secure Authentication: User registration, login, and password reset via Firebase Email/Password Auth, with optional biometric (Face ID/Touch ID) integration via expo-local-authentication.

- Specialized ASR Integration: Connects to a high-accuracy, remote FastAPI endpoint (https://p29ris-dysarthria-asr-apiv3.hf.space/transcribe) for transcription optimized for complex speech patterns.

- Real-time Recording & Processing: Allows users to record speech directly in the app and submit the audio for transcription.

- Transcription History: Persists all transcription results to Firestore for easy review and clinical logging.

- Cohesive Design: Implements a professional, low-light Dark Lavender theme across all screens (Dashboard, History, Login, Registration).

III. Technology Stack

- Frontend: React Native (Managed Workflow via Expo)

- Authentication & Database: Google Firebase (Authentication, Firestore)

- ASR Processing: Remote FastAPI Endpoint (Likely backed by a GPU-accelerated Hugging Face model)

- Local Storage: expo-secure-store for biometric credential caching

- Navigation: @react-navigation/stack

IV. Getting Started

1. Prerequisites:

Node.js (LTS version)

Expo CLI (npm install -g expo-cli)

A Firebase Project configured with Authentication (Email/Password) and Firestore.

2. Installation

- Clone the Repository:

git clone [YOUR_REPO_URL]
cd ASRMobile


- Install Dependencies:

npm install


- Configure Firebase:
You must create a file named firebaseConfig.js (or .jsx) in the project root and populate it with your Firebase configuration object.

// firebaseConfig.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);


- Run the Application:
Start the Expo development server:

expo start


Scan the QR code with your Expo Go app (iOS or Android) to run the application on your device.

V. Theme Overview: Subdued Dark Lavender

The application uses a custom dark theme optimized for low-light clinical settings.

Background: Deep Charcoal (#1a1a1e, #2a2a30)

Primary Accent: Deep Purple (#6a1b9a)

Secondary/Info: Muted Lavender (#9a7fd1, #c2b3d8)

Danger/Logout: Soft Red (#ff8a80)

VI. Latency Justification

The transcription process involves communicating with a powerful, specialized ASR model hosted remotely. Users may observe a noticeable delay (latency) after completing a recording.

This latency is a direct consequence of prioritizing clinical accuracy:

- Specialized Model: The ASR model is trained specifically for complex speech patterns, making it larger and more computationally demanding than general-purpose assistants.

- GPU Processing: The model requires GPU acceleration for processing. The time taken is necessary to execute the complex calculations needed to ensure the highest possible accuracy for clinical diagnosis and communication support.

- Queue Time: Due to shared server resources, the task may wait briefly in a queue before accessing the necessary computational resources.
