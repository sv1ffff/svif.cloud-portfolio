<a href="README.md">
  <img src="https://img.shields.io/badge/Language-English-blue?style=flat-square&logo=google-translate&logoColor=white" alt="English">
</a>
<a href="README-TR.md">
  <img src="https://img.shields.io/badge/Dil-Türkçe-red?style=flat-square&logo=google-translate&logoColor=white" alt="Türkçe">
</a>

  <br />
  <br />

<div align="center">
  <img src="public/logo.png" width="120" height="120" />
  <br />
  <br />

  <p>
     A personal portfolio website inspired by the design quality of Awwwards.
  </p>

![Next.js](https://img.shields.io/badge/Next.js-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-purple?style=for-the-badge&logo=framer)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)

  <p>
    <a href="#features">Features</a> •
    <a href="#tech">Technologies</a> •
    <a href="#installation">Installation</a> •
    <a href="#license">License</a>
  </p>

  <br />
  <br />
</div>

## 📋 About

**Kintarowwards** is an open-source, highly interactive personal portfolio template inspired by top-tier Awwwards-winning websites. It features smooth scrolling, physics-based micro-interactions, dynamic theme switching, and a fully multilingual system designed to deliver a premium user experience. Every detail is crafted to leave a lasting impression while maintaining high performance and clean code standards.

## <a id="features"></a> ✨ Features

- **Advanced Animations**: Fluid transitions and micro-interactions with Framer Motion and Motion libraries.
- **Physics-Based Components**: Dynamic and physics-compliant UI elements like "Hanging Profile" that respond to mouse movements.
- **Smooth Scroll**: A modern and high-quality scrolling experience with Lenis integration.
- **Dynamic Theme Support**: Optimized Dark and Light mode transitions with next-themes.
- **Multi-language Support**: Extensible language options for global users.
- **Responsive Design**: A mobile-first interface that looks perfect on all devices.
- **URL Shortener & Redirect System**: Create short links like `https://yourdomain.com/v1` from `/admin`, stored in Firebase Realtime Database, with instant server-side redirects on any domain.

## 🔗 URL Shortener & Redirect System

Create short links from the admin panel at `/admin`, store them in Firebase Realtime Database, and every domain pointing at this app instantly redirects `/<slug>` to the original URL (server-side, no JS needed).

### How it works

- The portfolio now serves at the **root** `/` (no `/en` prefix). `/en` and `/tr` still work.
- `app/[[...slug]]/layout.tsx` is a catch-all: `/en`/`/tr` render the portfolio, and **any other single segment** (`/v1`, `/discord`, …) is looked up in Firebase and returns a server-side `redirect`.
- If the slug doesn't exist, the visitor gets a **404**.
- Works on **every domain** pointing at the deployment — the lookup is global, not tied to one host.

### File structure

```
app/
  layout.tsx                     # Root shell: <html>, fonts, ThemeProvider
  [[...slug]]/
    layout.tsx                   # Portfolio shell + redirect logic (slug lookup)
    page.tsx                     # Home page (hero, projects, contact, …)
  admin/page.tsx                 # Admin panel (create / list / delete / copy short links)
  api/links/route.ts             # CRUD API used by the admin panel
lib/
  firebase/
    admin.ts                     # Firebase Admin SDK (server-only): RTDB read/write + token verify
    client.ts                    # Firebase web SDK (browser): Google sign-in
    shortener.ts                 # Shared validation: slug regex, reserved words, URL normalization
```

Links are stored in the RTDB node `links/{slug}` with the slug as the key:

```json
{
  "links": {
    "v1": {
      "slug": "v1",
      "url": "https://example.com",
      "createdAt": 1760000000000,
      "updatedAt": 1760000000000,
      "visits": 0
    }
  }
}
```

Because RTDB reads are path-based, `links/v1` fetches only that one child → fast redirects.

### Setup

1. **Firebase project** → add a **Web app** (Project settings → Your apps → Web). Copy the config into `.env.local` (see `.env.example`).
2. **Service account** (Project settings → Service accounts → *Generate new private key*) for the Admin SDK. Put `FIREBASE_PROJECT_ID`, `FIREBASE_DATABASE_URL`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` in `.env.local`.
3. **Admin access** — pick one or both:
   - Shared key: set `ADMIN_KEY` to a long random string, type it at `/admin`.
   - Google sign-in: enable the **Google** provider in Firebase → Authentication → Sign-in method, then set `ADMIN_EMAILS` to your comma-separated allowlist.
4. **Realtime Database security rules** (the app writes through the Admin SDK, so the DB can be fully locked):
   ```json
   {
     "rules": {
       ".read": false,
       ".write": false
     }
   }
   ```

Then open `/admin`, create a short link, and share `https://yourdomain.com/v1`.

## <a id="technologies"></a> 🛠️ Technologies

- **Next.js**: The core React framework used for routing, server-side rendering, and performance optimization.
- **Tailwind CSS**: Utility-first CSS framework for rapid and responsive UI styling.
- **TypeScript**: Ensures type safety and provides a superior developer experience with clean architecture.
- **Framer Motion**: Powers the complex, physics-based UI animations, transitions, and gesture interactions.
- **Shadcn/UI**: Provides accessible, beautifully designed, and customizable core UI components.
- **Lucide React**: A clean and consistent icon library used for UI navigation and actions.
- **Lenis**: Delivers a silky-smooth, native-feeling scroll experience across all devices.
- **Firebase**: Realtime Database storage + Authentication (Google sign-in) powering the URL shortener admin.

## <a id="installation"></a> 🚀 Installation

Follow the steps below to run the project in your local environment:

1. **Clone the repository:**

   ```bash
   git clone https://github.com/sv1ffff/ultra-portfolio.git
   cd ultra-portfolio
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Start the Development Server:**

   ```bash
   npm run dev
   ```

You can view the project by visiting [http://localhost:3000](http://localhost:3000) in your browser.

## 📄 License <a id="license"></a>

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

#

<p align="center">
  <sub>Developed by Saif Fikry</sub>
</p>
