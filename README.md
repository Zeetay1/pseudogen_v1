# Pseudogen  
**AI-powered pseudocode generator for developers, educators, and students**

---

## Overview  
**Pseudogen** is an intelligent pseudocode generation tool designed to help users quickly convert natural language prompts into structured pseudocode. Built with **FastAPI** on the backend and a **React + TailwindCSS** frontend, it offers a clean interface, persistent history management, and dark mode support.

Whether you're a developer sketching algorithm logic, an educator creating lesson material, or a student learning programming fundamentals, Pseudogen simplifies the process of transforming ideas into clear algorithmic steps.

---

## Features  

- ⚡ **FastAPI backend** for quick and reliable pseudocode generation  
- 💡 **React frontend** with a responsive, minimalist design  
- 🧠 **Persistent history** — automatically stored in `localStorage`  
- 🔍 **Smooth selection and preview** of previously generated outputs  
- 💾 **Local-first architecture** — no external database or server required  

---

## Tech Stack  

| Layer | Technology |
|-------|-------------|
| **Frontend** | React, Vite, TailwindCSS, Lucide Icons |
| **Backend** | FastAPI, Python |
| **State Management** | React Hooks (`useState`, `useEffect`) |
| **Storage** | Browser `localStorage` |
| **Styling** | TailwindCSS with custom dark mode |

---

## Getting Started  

### 1. Clone the repository  
```bash
git clone https://github.com/zeetay1/pseudogen.git
cd pseudogen
```

### 2. Set up the backend

```bash
add new terminal
cd backend
activate venv
cd ..
pip install -r requirements.txt
uvicorn backend.app:app --reload --host 0.0.0.0 --port 8000
```

> The FastAPI backend runs by default on **[http://127.0.0.1:8000](http://127.0.0.1:8000)**.

### 3. Set up the frontend

```bash
add new terminal
if venv loads in new terminal --> run: deactivate
cd frontend
npm run dev
```

> The React app runs by default on **[http://localhost:5173](http://localhost:5173)**.

---

## API Reference

### **POST** `/generate`

Generates pseudocode from a given natural language problem.

#### Request Body

```json
{
  "problem": "Sort a list of numbers in ascending order using bubble sort",
  "style": "Academic",
  "detail": "Concise"
}
```

#### Response

```json
{
  "markdown": "BEGIN\n  FOR i FROM 0 TO n-1\n    FOR j FROM 0 TO n-i-1\n      IF arr[j] > arr[j+1]\n        SWAP arr[j], arr[j+1]\n      ENDIF\n    END FOR\n  END FOR\nEND"
}
```

---

## Project Structure

```
pseudogen/
├── backend/
│   ├── __pycache__/
│   ├── .venv/
│   ├── scripts/
│   │   ├── check_groq_models.py
│   ├── __init__.py
│   ├── .env
│   ├── ai_prompts.py
│   ├── app.py
│   ├── requirements.txt
│   └── utils.py
├── frontend/
│   ├── node_modules/
│   ├── public/
│   │   ├── Pseudogen.svg
│   │   ├── pseudogen2.svg
│   │   └── vite.svg
│   ├── src/
│   │   ├── assets/
│   │   │   └── react.svg
│   │   ├── components/
│   │   │   ├── HistoryPanel.jsx
│   │   │   ├── InputForm.jsx
│   │   │   └── OutputPanel.jsx
│   │   ├── App.css
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── .gitignore
│   ├── eslint.config.js
│   ├── index.html
│   ├── package-lock.json
│   ├── package.json
│   ├── postcss.config.js
│   ├── README.md
│   ├── tailwind.config.js
│   └── vite.config.js
├── .gitignore
├── how_to.md
└── README.md
```

---

## Usage Flow

1. Enter a problem statement or algorithm description.
2. Choose your preferred pseudocode **style** and **detail level**.
3. Click **Generate** to view formatted pseudocode output.
4. Review past generations from the **History Panel** — accessible via the sidebar toggle.
5. Rename or delete saved entries as needed.

---

## Future Enhancements

* 🌐 Integration with OpenAI or local LLM APIs
* 📄 Export pseudocode as `.txt` or `.md`
* 🧩 Syntax highlighting for structured output
* 🔗 Multi-session storage and sharing options

---

**Pseudogen** — Turning ideas into clear logic, one step at a time.