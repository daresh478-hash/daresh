# CulinaryScale PRO — Enterprise Recipe Scaler

An enterprise-grade, precision culinary batch scaling application built strictly with **HTML5, CSS3 (with 3D perspective & tactile depth), and Vanilla JavaScript (ES6+)**.

## Core Mathematical Formulation

Every ingredient quantity is scaled proportionally to ensure identical flavor profiles and culinary yield ratios:

$$\text{Scaled Quantity} = \text{Original Quantity} \times \left( \frac{\text{Wanted Servings}}{\text{Original Servings}} \right)$$

## Features

1. **Precision Input Form**:
   - Dish Name
   - Base Servings (Yield)
   - Target Servings (Yield)
   - 3 Core Ingredients (Name, Original Quantity, and Unit)
2. **Robust Multi-Layer Validation**:
   - Validates that no input fields are left blank.
   - Validates that both serving fields are strictly positive numbers ($> 0$).
   - Flags zero, negative, or invalid non-numeric inputs immediately.
   - Hides/suppresses calculation output whenever invalid inputs exist.
   - Displays clear field-specific visual indicators and an accessible summary alert box.
3. **Enterprise 3D CSS Interface**:
   - CSS 3D perspective workspace (`perspective: 1400px`, `transform-style: preserve-3d`).
   - Tactile 3D press-button interactions with multi-stop linear gradients and layered box shadows.
   - Interactive mouse tilt dynamics on result cards.
   - Clean slate-900 & amber-copper enterprise kitchen theme.
4. **Complete LocalStorage Persistence & Restoration**:
   - Auto-saves all form inputs on change.
   - Stores the latest valid calculated result.
   - Automatically restores all inputs and the calculated result card when the page is refreshed.
   - Reset button clears active form state and resets browser storage.
5. **Decimals & Numerical Edge Cases**:
   - Handled cleanly without IEEE-754 precision floating point artifacts.
   - Clean representation of fractions and decimal quantities (e.g. `2.5`, `1.2`, `800`).
6. **Zero External Dependencies**:
   - 100% Client-Side.
   - No external APIs, no backend servers, no third-party CDNs.
   - Fully functional offline.

## Project Structure

```
project/
├── index.html
├── css/
│   └── style.css
├── js/
│   └── script.js
├── assets/
│   ├── images/
│   └── icons/
└── README.md
```

## How to Run

Open `index.html` in any modern web browser directly, or serve it using any local static file server:

```bash
# Using Vite (Development)
npm run dev

# Or with any static web server
npx serve .
```
