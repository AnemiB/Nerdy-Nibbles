![GitHub repo size](https://img.shields.io/github/repo-size/AnemiB/Nerdy-Nibbles)
![GitHub watchers](https://img.shields.io/github/watchers/AnemiB/Nerdy-Nibbles)
![GitHub language count](https://img.shields.io/github/languages/count/AnemiB/Nerdy-Nibbles)
![GitHub code size](https://img.shields.io/github/languages/code-size/AnemiB/Nerdy-Nibbles)
![GitHub top language](https://img.shields.io/github/languages/top/AnemiB/Nerdy-Nibbles)

<p align="center">
  <img src="/assets/Logo2.png" alt="Nerdy Nibbles logo" width="220" />
</p>
<p align="center">
Nerdy Nibbles: learn food fundamentals via AI-driven lessons and one-on-one tutoring with Nibble AI.
</p>

<p align="center">
  <a href="https://github.com/AnemiB/Nerdy-Nibbles">Repository</a>
  ·
  <a href="https://github.com/AnemiB/Nerdy-Nibbles/issues">Report Bug / Request Feature</a>
  ·
  <a href="#">Demo (internal)</a>
</p>

---

## Table of Contents

* [About the Project](#about-the-project)
* [Built With](#built-with)
* [Getting Started](#getting-started)
  * [Prerequisites](#prerequisites)
  * [Install & Run (local dev)](#install--run-local-dev)
* [App Features](#app-features)
* [Design & Concept](#design--concept)
  * [Concept Process](#concept-process)
    * [Ideation](#ideation)
    * [ER Diagram](#er-diagram)
    * [Wireframes](#wireframes)
  * [Custom UI](#custom-ui)
* [Development Process](#development-process)
  * [Implementation Process](#implementation-process)
    * [Frontend](#frontend)
    * [Backend / AI & Persistence](#backend--ai--persistence)
    * [DevOps & Tooling](#devops--tooling)
  * [Highlights](#highlights)
  * [Challenges](#challenges)
  * [Future Implementation](#future-implementation)
* [Final Outcome](#final-outcome)
  * [Mockups](#mockups)
  * [Video Demonstration](#video-demonstration)
* [Conclusion](#conclusion)
* [License](#license)
* [Contact](#contact)
* [Acknowledgements](#acknowledgements)
* [Troubleshooting Quicklinks](#troubleshooting-quicklinks)
* [Git commands to commit & push example](#git-commands-to-commit--push-readme)

---

## About the Project

**Nerdy Nibbles** is an educational mobile app focused on food literacy. The app is fully AI integrated and AI driven, every lesson and every quiz is generated on the fly by the AI engine, and there is a built-in chat tutor ("Nibble AI") for anytime food questions.

Key ideas:

* Fast access to AI-generated lessons (regeneratable, same topic, different phrasing/approach each time).
* Interactive AI Q&A for food education (nutrition, food safety, cooking basics, food science).
* Tracking of progress through lessons and quizzes.
* Simple, friendly UI for low-friction learning.

---

## Built With

* **React Native (Expo)** cross-platform mobile app
* **React** (latest)
* **TypeScript**
* **Firebase** (Authentication, Firestore, Storage)
* **Python** lightweight backend used to orchestrate AI requests (server bridge in development)
* **Gemini** model (e.g. `gemini-2.5-flash`) used as the core LLM for lesson & quiz generation and the Nibble AI chat.
* `react-native-svg`, `react-navigation`, `@react-native-async-storage/async-storage`, and other standard RN libs.

---

## Getting Started

### Prerequisites

* Node.js (v16+)
* Yarn or npm
* Expo CLI (optional): `npm install -g expo-cli`
* Python 3.8+ (if running a local AI bridge)
* Android Studio / Xcode for emulators (optional)
* Firebase project (Auth + Firestore)

### Install & Run (local dev)

1. Clone:

```bash
git clone https://github.com/AnemiB/Nerdy-Nibbles.git
cd Nerdy-Nibbles
````

2. Install JS deps:

```bash
npm install
# or
yarn
```

3. (Optional) Install Python deps for an AI bridge:

```bash
python -m venv .venv
source .venv/bin/activate      # macOS/Linux
# .venv\Scripts\activate       # Windows
pip install -r requirements.txt
```

4. Add environment config (example):

Create a `.env` file or configure `env.ts` / `firebase.ts` with your keys:

```
FIREBASE_API_KEY=REPLACE_ME
FIREBASE_AUTH_DOMAIN=REPLACE_ME
FIREBASE_PROJECT_ID=REPLACE_ME
FIREBASE_STORAGE_BUCKET=REPLACE_ME
FIREBASE_MESSAGING_SENDER_ID=REPLACE_ME
FIREBASE_APP_ID=REPLACE_ME

# AI bridge or direct model usage
AI_SERVER_URL=http://localhost:5000/api/ai
OPENAI_API_KEY=REPLACE_ME_OR_USE_CLOUD_KEY
GEMINI_MODEL=gemini-2.5-flash
```

> **Security note:** Keep API keys out of source control. Use environment variables or a secrets manager.

5. Start Expo:

```bash
npx expo start
```

6. (Optional) Start local AI bridge if used:

```bash
# from the server folder or root depending on your structure
python server.py
```

Open the app on Expo Go or an emulator.

---

## App Features

* **Auth:** Email sign up / log in (Firebase).
* **Home dashboard:** Greeting, progress bar (lessons completed / total), recent activities.
* **Nibble AI chat:** Food-education-focused chat powered by the chosen LLM (Gemini). Ask about nutrition, food safety, culinary techniques, and more.
* **Lessons:** 8 base lessons (examples below). Each time you open a lesson, the AI generates the lesson content for that lesson title. Lessons are regeneratable, same topic, different details and examples each time.
* **Quiz:** Multiple-choice (A-D) quizzes generated from the AI for each lesson. Answers are auto-scored.
* **Results:** Quiz score screen with breakdown and explanations (AI-generated).
* **Settings:** Update profile, re-auth, preference toggles.
* **Local & remote persistence:** Firestore stores user progress, activities, and optionally saved lessons.

---

## Design & Concept

Nerdy Nibbles aims for a calm, informative look, focus on clarity and a friendly learning tone.

### Concept Process

#### Ideation

* Problem: Many food questions are fragmented across sources; learners want a single place to learn food basics and get instant, personalized answers.
* Solution: AI-first lessons and chat tutor, short and practical lessons, instant quizzes.

#### ER Diagram

<img src="/assets/ER Diagram.png" alt="ER Diagram" style="width:50%; height:auto;" />

Main collections:

* `users/{uid}` (profile, progress)
* `users/{uid}/activities` (lessons taken, quiz results)
* `lessons/{lessonId}` (optional: cached lesson instances)
* `community/{postId}` (optional community notes)

#### Wireframes

<img src="/assets/AppWireframes.png" alt="Wireframes" style="width:70%; height:auto;" />

### Custom UI

* Primary palette: calm blue + warm accent
* Buttons: rounded, friendly
* Emphasis on readable cards and short chunks of information

---

## Development Process

### Implementation Process

#### Frontend

* Expo + React Native + TypeScript.
* Navigation: auth stack and app stack (conditional on Firebase `onAuthStateChanged`).
* Key screens: `HomeScreen`, `NibbleAiScreen`, `LessonsScreen`, `LessonDetailScreen`, `QuizScreen`, `ProgressScreen`, `SettingsScreen`, `Splash`, `Login`, `SignUp`.
* SVG usage for icons and illustration assets.

#### Backend / AI & Persistence

* Firebase for user & progress data.
* Optional Python microservice acts as an AI bridge to the LLM (Gemini). The frontend posts prompts to the server which handles model orchestration and prompt templates then returns standardized outputs (lesson content, quiz items, explanation text).
* Optionally call the LLM directly from a secure backend (avoid direct frontend model calls that expose keys).

#### DevOps & Tooling

* Expo for iteration.
* Firebase Emulator Suite recommended for local dev.
* Linting & unit tests recommended for production readiness.

### Highlights

* Fully AI-driven lesson and quiz generation.
* Food-expert chat (Nibble AI) tailored to the app’s lesson topics.
* Regeneratable lessons for repeated learning sessions.

### Challenges

* Ensuring AI outputs are consistent in format (e.g., quiz must return 4 choices and one correct answer).
* Handling user re-authentication for sensitive account actions.
* Having to change the AI used to improve generated results.

### Future Implementation

* Offline lesson caching and local persistence.
* More advanced prompt templates and guardrails for accuracy.
* Community features (likes, threaded comments, anonymity toggle).
* Analytics for learning behavior and retention.

---

## Final Outcome

### Lesson topics (8 base lessons)

1. Nutrition Basics
2. Reading Labels
3. Food Safety
4. Budgeting
5. Misleading Claims
6. Labeling Rules
7. Serving Sizes
8. Sugar & Sweeteners

### Mockups

<img src="/assets/Mockup 1.png" alt="Mockup One" style="width:60%; height:auto;" />
<img src="/assets/Mockup 2.png" alt="Mockup Two" style="width:60%; height:auto;" />
<img src="/assets/Mockup 3.png" alt="Mockup Three" style="width:60%; height:auto;" />

### Video Demonstration

(Internal demo link or recorded walkthrough)

---

## Conclusion

Nerdy Nibbles delivers an AI-first approach to food education: regenerate lessons, take AI-generated quizzes, and chat with a food expert any time. It’s designed to be low friction and highly interactive.

---

## License

Distributed under the MIT License. See `LICENSE` for details.

---

## Contact

**Anemi Breytenbach**, [231178@virtualwindow.co.za](mailto:231178@virtualwindow.co.za)
GitHub: [AnemiB](https://github.com/AnemiB)

---

## Acknowledgements

* Figma for wireframing
* Expo / React Native / Firebase open-source projects
* LLM providers for enabling AI features
* The open-source community

---

## Troubleshooting Quicklinks

* `expo start -c` reset packager cache
* `npx react-native start --reset-cache` RN cache reset
---

## Git commands to commit & push exampe

```bash
git checkout -b feat/readme
git add README.md
git commit -m "docs: add Nerdy Nibbles README"
git push origin feat/readme
```

```
