import "leaflet/dist/leaflet.css"
import "./style.css"
import L from "leaflet"
import {fetchSkyTraceAircraft} from "./adsbFiAdapter.js"
import planeIcon from "./assets/planeIcon.png"
import airportIcon from "./assets/airportMarker.png"
import largeAirports from "./data/largeAirports.json"
import mediumAirports from "./data/mediumAirports.json"


const skyTraceMap = L.map("map").setView([39.8, -98.5], 4)
skyTraceMap.on("click", () => {
  closeSkyTraceAircraftPanel()
})

const skyTraceStandardMap = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreeMap contributors"
})

const skyTraceDarkLayer = L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
  attribution: "&copy; OpenStreetMap contributors &copy; CARTO"
})

const skyTraceSatelliteLayer = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
  attribution: "Tiles &copy; Esri"
})

const skyTraceTerrainLayer = L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors, SRTM | OpenTopoMap"
})

skyTraceStandardMap.addTo(skyTraceMap)

const skyTraceMapLayers = {standard: skyTraceStandardMap, dark: skyTraceDarkLayer, satellite: skyTraceSatelliteLayer, terrain: skyTraceTerrainLayer}

function changeSkyTraceMapLayer(skyTraceLayerName) {
  Object.values(skyTraceMapLayers).forEach((skyTraceLayer) => {
    if(skyTraceMap.hasLayer(skyTraceLayer)) {
      skyTraceMap.removeLayer(skyTraceLayer)
    }
  })
  skyTraceMapLayers[skyTraceLayerName].addTo(skyTraceMap)
}
window.changeSkyTraceMapLayer = changeSkyTraceMapLayer

let skyTraceRadarLayer = null

async function loadSkyTraceRadar() {
  try {
    const skyTraceRadarResponse = await fetch("https://api.rainviewer.com/public/weather-maps.json")
    
    if(!skyTraceRadarResponse.ok) {
      throw new Error(`Radar API error: ${skyTraceRadarResponse.status}`)
    }

    const skyTraceRadarData = await skyTraceRadarResponse.json()
    const skyTraceRadarFrames = skyTraceRadarData.radar?.past || []

    if(skyTraceRadarFrames.length === 0) {
      console.log("No SkyTrace radar frames available")
      return
    }

    const skyTraceLatestRadar = skyTraceRadarFrames[skyTraceRadarFrames.length -1]
    const skyTraceRadarTileUrl = `${skyTraceRadarData.host}${skyTraceLatestRadar.path}/256/{z}/{x}/{y}/2/1_1.png`

    skyTraceRadarLayer = L.tileLayer(skyTraceRadarTileUrl, {
      opacity: 0.6, attribution: "Weather data by RainViewer"
    })
  } catch(skyTraceRadarError) {
    console.error("failed to load SkyTrace weather:", skyTraceRadarError)
  }
}

async function toggleSkyTraceRadar() {
  if(!skyTraceRadarLayer) {
    await loadSkyTraceRadar()
  }

  if(!skyTraceRadarLayer) {
    return
  }

  if(skyTraceMap.hasLayer(skyTraceRadarLayer)) {
    skyTraceMap.removeLayer(skyTraceRadarLayer)
  } else {
    skyTraceRadarLayer.addTo(skyTraceMap)
  }
}

window.toggleSkyTraceRadar = toggleSkyTraceRadar

function showSkyTraceAircraftPanel(aircraft) {
  document.getElementById("skyTraceAircraftCallsign").textContent = aircraft.callsign || "Unknown"
  document.getElementById("skyTraceAircraftAltitude").textContent = aircraft.altitude != null ? `${Math.round(aircraft.altitude)}ft` : "N/A"
  document.getElementById("skyTraceAircraftSpeed").textContent = aircraft.speed != null ? `${Math.round(aircraft.speed)}kt` : "N/A"
  document.getElementById("skyTraceAircraftHeading").textContent = aircraft.heading !=null ? `${Math.round(aircraft.heading)}°` : "N/A"
  document.getElementById("skyTraceAircraftRegistration").textContent = aircraft.registration || "N/A"
  document.getElementById("skyTraceAircraftType").textContent = aircraft.aircraftType || "N/A"
  document.getElementById("skyTraceAircraftICAO").textContent = aircraft.id || "N/A"
  document.getElementById("skyTraceAircraftPanel").classList.add("open")
}


function closeSkyTraceAircraftPanel() {
  const panel = document.getElementById("skyTraceAircraftPanel")
  if(panel) {
    panel.classList.remove("open")
    return
  }
}

window.showSkyTraceAircraftPanel = showSkyTraceAircraftPanel
window.closeSkyTraceAircraftPanel = closeSkyTraceAircraftPanel


const aircraftMarkers = new Map()
function createAircraftIcon(heading) {
  return L.divIcon({
    className: "skyTraceAircraftIcon",
    html: `<img src="${planeIcon}" alt="Aircraft" style="transform: rotate(${heading || 0}deg)">`,
    iconSize: [60, 60],
    iconAnchor: [30, 30]
  })
}

function updateAircraftMarkers(aircraftList) {
  const currentAircraftIds = new Set()
  aircraftList.forEach((aircraft) => {
    if(aircraft.latitude == null || aircraft.longitude == null || aircraft.id == null) {
      return
    }

    currentAircraftIds.add(aircraft.id)
    let marker = aircraftMarkers.get(aircraft.id)
    if(!marker) {
      marker = L.marker([aircraft.latitude, aircraft.longitude], 
        {
          icon: createAircraftIcon(aircraft.heading)}).addTo(skyTraceMap)
      
          marker.on("click", () => {
            L.DomEvent.stopPropagation(aircraft)
        showSkyTraceAircraftPanel(aircraft)
      })
      
      aircraftMarkers.set(aircraft.id, marker)
    } else {
      marker.setLatLng([aircraft.latitude, aircraft.longitude])
      marker.setIcon(createAircraftIcon(aircraft.heading))
    }
  })

  aircraftMarkers.forEach((marker, aircraftId) => {
    if(!currentAircraftIds.has(aircraftId)) {
      skyTraceMap.removeLayer(marker)
      aircraftMarkers.delete(aircraftId)
    }
  })
}

function showAirportPanel(airport) {
  document.getElementById("skyTraceAirportName").textContent = airport.name || "Unknown Airport"
  document.getElementById("skyTraceAirportIATA").textContent = airport.iata || "---"
  document.getElementById("skyTraceAirportICAO").textContent = airport.icao || "---"
  document.getElementById("skyTraceAirportCity").textContent = airport.city || "N/A"
  document.getElementById("skyTraceAirportCountry").textContent = airport.country || "N/A"
  document.getElementById("skyTraceAirportElevation").textContent = airport.elevation != null ? `${airport.elevation}ft` : "N/A"
  document.getElementById("skyTraceAirportPanel").classList.add("open")
}

function closeAirportPanel () {
  document.getElementById("skyTraceAirportPanel").classList.remove("open")
}

window.showAirportPanel = showAirportPanel
window.closeAirportPanel = closeAirportPanel

async function loadSkyTraceAircraft() {
  try {
    const center = skyTraceMap.getCenter()
    const aircraft = await fetchSkyTraceAircraft(center.lat, center.lng, 250)
    updateAircraftMarkers(aircraft)
    console.log(`SkyTrace: ${aircraft.length} aircraft loaded`)
  } catch(error) {console.error("Failed to load SkyTrace aircraft:", error)}
}

loadSkyTraceAircraft()

setInterval(loadSkyTraceAircraft, 15000)

const airportMarkers = new Map()

function createAirportIcon() {
  return L.divIcon({
    className: "skyTraceAirportIcon",
    html:`<img src="${airportIcon}" alt="Airport" style="width: 12px; height: 12px; display: block">`, iconSize: [12, 12], iconAnchor: [6, 6]
  })
}

function updateAirportMarkers(airports) {
 const visibleAirportIds = new Set()
 const mapBounds = skyTraceMap.getBounds()
 airports.forEach((airport) => {
  if(airport.latitude == null || airport.longitude == null || airport.id == null) {
    return
  }
  if(!mapBounds.contains([airport.latitude, airport.longitude])) {
    return
  }
  visibleAirportIds.add(airport.id)
  let marker = airportMarkers.get(airport.id)
  if(!marker) {
    marker = L.marker([airport.latitude, airport.longitude], {icon: createAirportIcon()}).addTo(skyTraceMap)
    marker.on("click", () => {
      L.DomEvent.stopPropagation(airport)
      showAirportPanel(airport)
    })
    airportMarkers.set(airport.id, marker)
  }
 })

 airportMarkers.forEach((marker, airportId) => {
  if(!visibleAirportIds.has(airportId)) {
    skyTraceMap.removeLayer(marker)
    airportMarkers.delete(airportId)
  }
 })
}

function updateVisibleAirports() {
  const zoom = skyTraceMap.getZoom()
  if(zoom <= 4) {
    updateAirportMarkers(largeAirports.filter((airport) => airport.iata))
  } else if (zoom <= 6) {
    updateAirportMarkers(largeAirports)
  } else {
    updateAirportMarkers([...largeAirports, ...mediumAirports])
  }
}

skyTraceMap.on("zoomend moveend", updateVisibleAirports)
updateVisibleAirports()