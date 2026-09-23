# BREAK THROUGH AI — Pastel Animatic Healthcare Platform

A production-grade, highly animated healthcare web application with real-time prescription synchronization, custom alarm triggers, and strict credential access.

---

## 🔐 Credentials (Strict Access)

Only the following accounts can authenticate into the platform:

| Role | Username / ID | Password | Portal Destination |
| :--- | :--- | :--- | :--- |
| **Caregiver** | `nandhini2007` | `nandi2007` | Nandhini's Caregiver Dashboard |
| **Coordinator** | `saranraj` | `saran5721` | Dr. Saranraj's Clinical Studio |

*The coordinator can create additional caregiver usernames and passwords from the Caregiver Accounts panel.*
*All other credentials will be rejected with an animated card shake and error banner.*

---

## 🎨 Theme & Motion: Pastel Animatic Design System

* **Primary Background:** Soft Lavender-White (`#F7F5FB`)
* **Secondary Background / Cards:** Pale Mint (`#EAF6F0`) & Pure Crisp Glass White (`#FFFFFF`)
* **Primary Accent (Buttons & Active States):** Pastel Violet (`#B8A6E8`)
* **Secondary Accent (Links & Highlights):** Pastel Sky Blue (`#A8D8F0`)
* **Success / Adherence State:** Pastel Mint Green (`#A8E6CF`)
* **Warning / Alert State:** Pastel Peach (`#FFD3B0`)
* **Error / Urgent State:** Pastel Coral Red (`#FFB3B3`)
* **Primary Text:** Deep Muted Indigo (`#3A3552`) — WCAG AAA contrast
* **Secondary Text:** Muted Gray-Lavender (`#8B87A3`)
* **Borders & Dividers:** Very Light Lilac (`#E3DEF2`)
* **Glow & Shadow Accent:** Soft Periwinkle (`#C9BFF0`)
* **Dynamic Animations:**
  * Ambient floating pastel glow orbs drifting seamlessly in the background
  * Smooth micro-interactions: button hover/press scale + soft periwinkle glow
  * Gentle entrance rise animation for cards and modals (`.animate-rise`)
  * Breathing pulse animation on pending alarms and notification badges (`.badge-amber`)
  * Dynamic ringing bell animations on medication alert triggers

---

## 🩺 End-to-End Workflow

### 1. Coordinator Workflow (Dr. Saranraj)
1. Log in using `saranraj` / `saran5721`.
2. **Add Patients:** Click the **"+ Add Patient"** button to register new patient profiles.
3. **Select Patient:** Click on **Nandhini** (`nandhini2007`) or **Abinaya** (`abinaya2008`) from the roster.
   * The studio prominently displays the selected **Patient Name & Patient ID**.
4. **Deploy Prescription & Schedule Alarm:**
   * **Upload Medicine Image:** Select any image (JPG, PNG, WebP) from your device. It previews live, is automatically resized/compressed to prevent storage quotas, and is saved to the record.
   * Enter **Medicine Name**, **Dosage**, and **Food Instructions**.
   * Enter the exact **Alarm Trigger Timing** (e.g. `20:00`), or click "+1 min from now" to test in real time.
   * Click **"Deploy to Patient Dashboard"**.
   * The prescription is immediately saved and synchronized to the selected patient.

### 2. Caregiver Workflow (Nandhini or other Caregivers)
1. Log in using `nandhini2007` / `nandi2007`.
2. The dashboard greets the caregiver with their name and shows all patients assigned to them and their scheduled prescriptions.
3. Each medication displays the uploaded medicine image, dosage, instructions, and alarm timing.
4. **Real-Time Alarm Clock:**
   * The system monitors current local time against prescribed alarm times every second.
   * When the scheduled time arrives (or when clicking "Test Ring"), the **High-Contrast Pastel Alarm Modal** triggers with an active Web Audio chime and glowing periwinkle shockwave animation.
   * Clicking **[ ACKNOWLEDGE MEDICATION ]** stops the chime, closes the modal, marks the dose as TAKEN with the exact confirmation timestamp, and syncs back to Dr. Saranraj's coordinator portal.

---

## 🚀 How to Run

1. Open `index.html` directly in **Brave, Chrome, or Edge**:
   ```
   /Users/cliffrichardsandrus/Documents/sathya/iLoveZIP_Create/index.html
   ```
2. The application opens directly on the **Login** page.

## 🎙️ Voice Updates

Caregivers can record voice updates directly from their dashboard. The audio note is compressed and synced to the coordinator portal, where Dr. Saranraj can listen to patient updates in real time.
