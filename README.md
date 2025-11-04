![GitHub repo size](https://img.shields.io/github/repo-size/AnemiB/Nerdy-Nibbles)
![GitHub watchers](https://img.shields.io/github/watchers/AnemiB/Nerdy-Nibbles)
![GitHub language count](https://img.shields.io/github/languages/count/AnemiB/Nerdy-Nibbles)
![GitHub code size](https://img.shields.io/github/languages/code-size/AnemiB/Nerdy-Nibbles)
![GitHub top language](https://img.shields.io/github/languages/top/AnemiB/Nerdy-Nibbles)

<p align="center">
  <img src="/assets/Logo.png" alt="Nerdy Nibbles logo" width="220" />
</p>
<p align="center">
Nerdy Nibbles — learn food fundamentals via AI-driven lessons and one-on-one tutoring with Nibble AI.
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
* [Git commands to commit & push README](#git-commands-to-commit--push-readme)

---

## About the Project

**Nerdy Nibbles** is an educational mobile app focused on food literacy. The app is fully AI integrated and AI driven — every lesson and every quiz is generated on the fly by the AI engine, and there is a built-in chat tutor ("Nibble AI") for anytime food questions.

Key ideas:

* Fast access to AI-generated lessons (regeneratable — same topic, different phrasing/approach each time).
* Interactive AI Q&A for food education (nutrition, food safety, cooking basics, food science).
* Tracking of progress through lessons and quizzes.
* Simple, friendly UI for low-friction learning.

---

## Built With

* **React Native (Expo)** — cross-platform mobile app
* **React** (latest)
* **TypeScript**
* **Firebase** (Authentication, Firestore, Storage)
* **Python** — lightweight backend used to orchestrate AI requests (server bridge in development)
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
