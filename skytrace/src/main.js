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
