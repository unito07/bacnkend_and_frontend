# Vite + React Blank-Page Debug Checklist

- [x] cd front-end-react, run `npm install` then `npm run dev`
- [x] Confirm `index.html` and `src/main.jsx` exist in `front-end-react`
- [x] Verify dev-server URL in terminal (e.g. http://localhost:5173)
- [x] Open browser at that exact URL
- [ ] DevTools → Console: no errors?
- [ ] DevTools → Network: all resources (main.jsx, App.jsx, etc.) loaded (no 404s)
- [ ] Ensure `<div id="root"></div>` is present in `index.html`
- [ ] Ensure `createRoot(document.getElementById("root")).render(<App />)` is in `src/main.jsx`
- [ ] Check CSS imports: comment out `index.css` if it hides content
- [ ] Add `console.log("App mounted")` at the top of `App.jsx` and confirm it logs
- [ ] Add a simple JSX element (e.g. `<h1>Hello World</h1>`) in `App.jsx` to test rendering
