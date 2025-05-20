# React Migration Plan

A step-by-step checklist to replace the existing static HTML UI with a React application.

## 1. Scaffold React Project
- [ ] From the repo root, run:
  ```bash
  npx create-react-app front-end-react
  ```

## 2. Copy Global Assets
- [ ] Copy `front-end/style.css` to `front-end-react/src/style.css`
- [ ] In `front-end-react/src/index.js`, add:
  ```js
  import './style.css';
  ```

## 3. Define API Base URL
- [ ] Create `.env` in `front-end-react/` with:
  ```ini
  REACT_APP_API_URL=http://localhost:8000
  ```

## 4. Create React Components
- [ ] Under `front-end-react/src/components/`, create:
  - `StaticScraper.jsx`
  - `DynamicScraper.jsx`
  - `FieldRow.jsx`
  - `Results.jsx`

## 5. Implement State & Handlers
- [ ] Use React hooks (`useState`, `useEffect`) to manage form inputs and API calls
- [ ] In `StaticScraper.jsx`, implement `fetch(
    `${API_URL}/scrape?url=${encodeURIComponent(url)}`
  )`
- [ ] In `DynamicScraper.jsx`, POST to `${API_URL}/scrape-dynamic` with the payload

## 6. Reuse Existing CSS
- [ ] Import `style.css` or convert to CSS Modules as needed
- [ ] Adjust class names in JSX to match existing styles

## 7. Update App.js
- [ ] In `front-end-react/src/App.js`, import and render:
  ```jsx
  import StaticScraper from './components/StaticScraper';
  import DynamicScraper from './components/DynamicScraper';
  function App() {
    return (
      <main>
        <StaticScraper />
        <DynamicScraper />
      </main>
    );
  }
  export default App;
  ```

## 8. Run & Test Locally
- [ ] `cd front-end-react && npm install`
- [ ] `npm start` (opens on port 3000)
- [ ] Ensure backend is running on port 8000 with CORS enabled

## 9. Production Build & Deployment
- [ ] Run `npm run build` to generate `build/` folder
- [ ] Serve via `serve -s build` or mount static files in FastAPI:
  ```python
  from fastapi.staticfiles import StaticFiles
  app.mount('/', StaticFiles(directory='build', html=True), name='frontend')
  ```