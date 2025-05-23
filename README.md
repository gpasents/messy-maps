# 🗺️ Messy Maps

**Messy Maps** is a satirical web mapping app that takes you on the most inefficient, convoluted, and chaotic road trips imaginable. Instead of guiding you along the fastest path, it injects random detours across Europe to ensure your journey is as wildly unoptimized as possible.

---

## 🚀 Features

- 📍 Automatically detects your location
- 🔍 Lets you search for a destination using Nominatim (OpenStreetMap)
- 🧭 Uses OpenRouteService to plot driving directions
- 😈 Injects absurd detours that make your route hilariously inefficient
- 📝 Displays real turn-by-turn driving instructions
- 🌍 Interactive Leaflet-based map interface

---

## 🛠 Setup

1. **Clone the repo:**

   ```bash
   git clone https://github.com/your-username/messy-maps.git
   cd messy-maps
Install dependencies:

2. **Install dependencies:**
   ```bash
   npm install

3. **Get an OpenRouteService API key:**

    Go to openrouteservice.org/dev

    Sign up or log in

    Create a new token with access to the directions service

4. **Create a .env.local file in your project root:**
    VITE_ORS_API_KEY=your_actual_api_key_here