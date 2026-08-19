import "leaflet/dist/leaflet.css"
import "./style.css"
import L from "leaflet"


const skyTraceMap = L.map("map").setView([39.8, -98.5], 4)

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
