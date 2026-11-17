/* ===========================
   Weatherly — Script
   =========================== */

// 👉 STEP 1: Add your OpenWeatherMap API key here
const API_KEY = "4769fea573be137978925d83b7ae7db9"; // e.g. "abc123xyz..."
const BASE_URL = "https://api.openweathermap.org/data/2.5/weather";

// DOM elements
const cityInput  = document.getElementById("cityInput");
const searchForm = document.getElementById("searchForm");
const searchBtn  = document.getElementById("searchBtn");
const geoBtn     = document.getElementById("geoBtn");
const unitToggle = document.getElementById("unitToggle");

const statusBar  = document.getElementById("status");
const card       = document.getElementById("card");

const placeEl    = document.getElementById("place");
const dateText   = document.getElementById("dateText");
const iconEl     = document.getElementById("icon");

const tempEl     = document.getElementById("temp");
const feelsEl    = document.getElementById("feels");
const descEl     = document.getElementById("desc");
const cloudsEl   = document.getElementById("clouds");
const humidityEl = document.getElementById("humidity");
const pressureEl = document.getElementById("pressure");
const windEl     = document.getElementById("wind");
const visEl      = document.getElementById("visibility");
const updatedEl  = document.getElementById("updated");

const yearEl     = document.getElementById("year");
yearEl.textContent = new Date().getFullYear();

// Recent searches
const recentWrap = document.getElementById("recentWrap");
const recentList = document.getElementById("recentList");
const RECENT_KEY = "weatherly_recent_v1";

// Helpers
const fmt = (n, d=0) => Number(n).toFixed(d);
const toKmh = (ms) => ms * 3.6;
const metersToKm = (m) => m/1000;

function showStatus(msg, type="info"){
  statusBar.hidden = false;
  statusBar.textContent = msg;
  statusBar.style.borderColor = type === "error" ? "#f87171" : "#1f2937";
  statusBar.style.color = type === "error" ? "#fca5a5" : "";
}
function clearStatus(){ statusBar.hidden = true; statusBar.textContent = ""; }

function unitSystem(){
  // false -> metric(°C), true -> imperial(°F)
  return unitToggle.checked ? "imperial" : "metric";
}
function unitSymbol(){
  return unitSystem() === "metric" ? "°C" : "°F";
}
function windUnit(){
  return unitSystem() === "metric" ? "km/h" : "mph";
}

function iconUrl(code){
  return `https://openweathermap.org/img/wn/${code}@2x.png`;
}
function isoToLocal(ts, tzOffsetSec){
  // ts (seconds), tzOffsetSec from API
  const utc = ts * 1000;
  const local = utc + (tzOffsetSec * 1000);
  return new Date(local);
}
function saveRecent(name){
  const list = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  const value = name.trim();
  if(!value) return;
  const newList = [value, ...list.filter(c => c.toLowerCase() !== value.toLowerCase())].slice(0, 6);
  localStorage.setItem(RECENT_KEY, JSON.stringify(newList));
  renderRecent();
}
function renderRecent(){
  const list = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  recentList.innerHTML = "";
  if(list.length === 0){ recentWrap.hidden = true; return; }
  recentWrap.hidden = false;
  list.forEach(city => {
    const btn = document.createElement("button");
    btn.className = "chip";
    btn.textContent = city;
    btn.addEventListener("click", () => fetchByCity(city));
    recentList.appendChild(btn);
  });
}

// Main fetchers
async function fetchByCity(city){
  if(!city || !city.trim()){ showStatus("Please enter a city name.", "error"); return; }
  await getWeather({ q: city.trim() });
}
async function fetchByCoords(lat, lon){
  await getWeather({ lat, lon });
}

async function getWeather(params){
  try{
    clearStatus();
    card.hidden = true;
    searchBtn.disabled = true; geoBtn.disabled = true;

    const qs = new URLSearchParams({
      appid: API_KEY,
      units: unitSystem(),
      ...params
    });

    const url = `${BASE_URL}?${qs.toString()}`;
    const res = await fetch(url);

    if(res.status === 401){
      throw new Error("Invalid API key. Please add your OpenWeatherMap API key in script.js.");
    }
    if(res.status === 404){
      throw new Error("City not found. Try another name.");
    }
    if(!res.ok){
      throw new Error(`Request failed (${res.status}). Please try again.`);
    }

    const data = await res.json();
    renderCard(data);
    card.hidden = false;

    // Save recent by city name when available
    if(data.name){ saveRecent(data.name); }
    showStatus("Success ✓");
    setTimeout(clearStatus, 1200);

  }catch(err){
    showStatus(err.message || "Something went wrong.", "error");
  }finally{
    searchBtn.disabled = false; geoBtn.disabled = false;
  }
}


function renderCard(d){
  const sym = unitSymbol();

  // City + Country
  placeEl.textContent = `${d.name || "—"}, ${d.sys?.country || "—"}`;

  // Local date/time at location
  const localNow = isoToLocal(d.dt, d.timezone ?? 0);
  dateText.textContent = localNow.toLocaleString();

  // Icon + description
  const w = d.weather?.[0];
  if(w?.icon){
    iconEl.src = iconUrl(w.icon);
    iconEl.alt = w.description || "Weather icon";
  }else{
    iconEl.removeAttribute("src");
    iconEl.alt = "";
  }
  descEl.textContent = w?.main ? `${w.main}` : "—";
  cloudsEl.textContent = `Clouds: ${d.clouds?.all ?? 0}%`;

  // Temps
  tempEl.textContent = `${fmt(d.main?.temp ?? 0, 1)}${sym}`;
  feelsEl.textContent = `Feels like ${fmt(d.main?.feels_like ?? 0, 1)}${sym}`;

  // Humidity / Pressure
  humidityEl.textContent = `${d.main?.humidity ?? 0}%`;
  pressureEl.textContent = `Pressure: ${d.main?.pressure ?? 0} hPa`;

  // Wind
  const windSpeed = d.wind?.speed ?? 0;
  const speedDisplay = unitSystem() === "metric" ? fmt(toKmh(windSpeed), 1) : fmt(windSpeed, 1);
  windEl.textContent = `${speedDisplay} ${windUnit()} ${d.wind?.deg!=null ? `• ${degToDir(d.wind.deg)}` : ""}`;

  // Visibility
  const vis = d.visibility!=null ? `${fmt(metersToKm(d.visibility), 1)} km` : "—";
  visEl.textContent = `Visibility: ${vis}`;

  // Updated time
  updatedEl.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;

  // ✅ Background change yahan add karo
  if(w){
    let bgImage = "images/default.jpg"; 
    if(w.main.includes("Clear")) bgImage = "images/clear.jpg";
    else if(w.main.includes("Cloud")) bgImage = "images/cloudy.jpg";
    else if(w.main.includes("Rain")) bgImage = "images/rainy.jpg";
    else if(w.main.includes("Snow")) bgImage = "images/snow.jpg";

    document.body.style.backgroundImage = `url('${bgImage}')`;
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundPosition = "center";
    document.body.style.transition = "background-image 0.5s ease-in-out";
  }
}


function degToDir(deg){
  const dirs = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}

// Events
searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  fetchByCity(cityInput.value);
});

unitToggle.addEventListener("change", () => {
  // Re-fetch in new units for current query if available
  const last = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]")[0];
  if(last){
    fetchByCity(last);
  }else if(navigator.geolocation){
    // if first load and user prefers location
    // (don’t auto-prompt; only switch if they already granted)
    navigator.permissions?.query?.({ name: "geolocation" }).then((p) => {
      if(p.state === "granted"){
        navigator.geolocation.getCurrentPosition(pos => {
          fetchByCoords(pos.coords.latitude, pos.coords.longitude);
        });
      }
    }).catch(()=>{});
  }
});

geoBtn.addEventListener("click", () => {
  if(!navigator.geolocation){
    showStatus("Geolocation is not supported on this device.", "error");
    return;
  }
  showStatus("Getting your location…");
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      clearStatus();
      fetchByCoords(pos.coords.latitude, pos.coords.longitude);
    },
    (err) => {
      showStatus("Location access denied or unavailable.", "error");
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
  );
});

// Load recent on start
renderRecent();
