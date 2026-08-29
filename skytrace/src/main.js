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
  skyTraceFollowAircraft = false

  if(selectedAircraftRoute) {
    skyTraceMap.removeLayer(selectedAircraftRoute)
    selectedAircraftRoute = null
  }

  if(selectedAircraftCompletedRoute) {
    skyTraceMap.removeLayer(selectedAircraftCompletedRoute)
    selectedAircraftCompletedRoute = null
  }

  if(selectedAircraftId) {
    const trail = aircraftTrails.get(selectedAircraftId)
    if(trail) {
      skyTraceMap.removeLayer(trail)
    }
    selectedAircraftId = null
  }
})

const skyTraceStandardMap = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreeMap contributors"
})

const skyTraceDarkLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreeMap contributors"
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
  Object.entries(skyTraceMapLayers).forEach(([layerName, skyTraceLayer]) => {
    if(skyTraceMap.hasLayer(skyTraceLayer)) {
      skyTraceMap.removeLayer(skyTraceLayer)
    }
  })
  skyTraceMap.getContainer().classList.remove("skyTraceDarkMap")
  skyTraceMapLayers[skyTraceLayerName].addTo(skyTraceMap)
  if(skyTraceLayerName === "dark") {
    skyTraceMap.getContainer().classList.add("skyTraceDarkMap")
  }
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

let selectedAircraftId = null
let skyTraceFollowAircraft = false

function showSkyTraceAircraftPanel(aircraft) {
  document.getElementById("skyTraceAircraftCallsign").textContent = aircraft.callsign || "Unknown"
  document.getElementById("skyTraceAircraftAirline").textContent = aircraft.airline || "Unknown Airline"
  document.getElementById("skyTraceAircraftOrigin").textContent = aircraft.origin?.iata || aircraft.origin?.icao || "N/A"
  document.getElementById("skyTraceAircraftDestination").textContent = aircraft.destination?.iata || aircraft.destination?.icao || "N/A"
  document.getElementById("skyTraceAircraftAltitude").textContent = aircraft.altitude != null ? `${Math.round(aircraft.altitude)}ft` : "N/A"
  document.getElementById("skyTraceAircraftSpeed").textContent = aircraft.speed != null ? `${Math.round(aircraft.speed)}kt` : "N/A"
  document.getElementById("skyTraceAircraftHeading").textContent = aircraft.heading !=null ? `${Math.round(aircraft.heading)}°` : "N/A"
  document.getElementById("skyTraceAircraftRegistration").textContent = aircraft.registration || "N/A"
  document.getElementById("skyTraceAircraftType").textContent = aircraft.aircraftType || "N/A"
  document.getElementById("skyTraceAircraftICAO").textContent = aircraft.id || "N/A"
  document.getElementById("skyTraceAircraftPanel").classList.add("open")
}

function updateSelectedAircraftPanel(aircraft) {
  if(selectedAircraftId !== aircraft.id) {
    return
  }
  showSkyTraceAircraftPanel(aircraft)
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
const aircraftAnimationFrames = new Map()
const aircraftTrails = new Map()
let selectedAircraftRoute = null
let selectedAircraftCompletedRoute = null
const skyTraceFlightSearch = document.getElementById("skyTraceFlightSearch")
const skyTraceSearchResults = document.getElementById("skyTraceSearchResults")
const aircraftHistory = new Map()
const skyTraceReplayButton = document.getElementById("skyTraceReplayButton")
const skyTraceReplayControls = document.getElementById("skyTraceReplayControls")
const skyTraceReplayTimeline = document.getElementById("skyTraceReplayTimeline")
const skyTraceReplayCurrentTime = document.getElementById("skyTraceReplayCurrentTime")
const skyTraceReplayTotalTime = document.getElementById("skyTraceReplayTotalTime")
const skyTraceReplayPlayPause = document.getElementById("skyTraceReplayPlayPause")
const skyTraceReplayRestart = document.getElementById("skyTraceReplayRestart")
const skyTraceReplaySpeedButtons = document.querySelectorAll(".skyTraceReplaySpeed")
const skyTraceReplayHud = document.getElementById("skyTraceReplayHud")
const skyTraceReplayHudCallsign = document.getElementById("skyTraceReplayHudCallsign")
const skyTraceReplayHudRoute = document.getElementById("skyTraceReplayHudRoute")
const skyTraceReplayHudAltitude = document.getElementById("skyTraceReplayHudAltitude")
const skyTraceReplayHudSpeed = document.getElementById("skyTraceReplayHudSpeed")
const skyTraceReplayHudHeading = document.getElementById("skyTraceReplayHudHeading")
const skyTraceReplayHudTime = document.getElementById("skyTraceReplayHudTime")
let skyTraceReplayMode = false

function createAircraftIcon(heading) {
  return L.divIcon({
    className: "skyTraceAircraftIcon",
    html: `<img src="${planeIcon}" alt="Aircraft" style="transform: rotate(${heading || 0}deg)">`,
    iconSize: [60, 60],
    iconAnchor: [30, 30]
  })
}

function animateAircraftMarker(marker, aircraftId, startPosition, endPosition, duration = 5000) {
  const startTime = performance.now()
  if(aircraftAnimationFrames.has(aircraftId)) {
    cancelAnimationFrame(aircraftAnimationFrames.get(aircraftId))
  }

  function animate(currentTime) {
    const elapsed = currentTime - startTime
    const progress = Math.min(elapsed / duration, 1)
    const smoothProgress = progress * progress * (3 - 2 * progress)
    const latitude = startPosition[0] + (endPosition[0] - startPosition[0]) * smoothProgress
    const longitude = startPosition[1] + (endPosition[1] - startPosition[1]) * smoothProgress
    marker.setLatLng([latitude, longitude])

    if(progress < 1) {
      const frame = requestAnimationFrame(animate)
      aircraftAnimationFrames.set(aircraftId, frame)
    } else {
      aircraftAnimationFrames.delete(aircraftId)
    }
  }

  const frame = requestAnimationFrame(animate)
  aircraftAnimationFrames.set(aircraftId, frame)
}

function createAircraftTrail(aircraftId, latitude, longitude) {
  let trail = aircraftTrails.get(aircraftId)

  if(!trail) {
    trail = L.polyline([], {
      color: "#4da3ff", 
      weight: 2, 
      opacity: 0.65,
      smoothFactor: 1
    })
    aircraftTrails.set(aircraftId, trail)
  }

  const points = trail.getLatLngs()
  points.push([latitude, longitude])
  if(points.length > 20) {
    points.shift()
  }
  trail.setLatLngs(points)
}

function updateSkyTraceAircraftRouteProgress(aircraft) {
  if(selectedAircraftId !== aircraft.id) {
    return
  }

  if(!selectedAircraftRoute || !selectedAircraftCompletedRoute) {
    return
  }

  const history = aircraftHistory.get(aircraft.id)
  if(!history || history.length < 2) {
    return
  }

  const progressPoint = [aircraft.latitude, aircraft.longitude]
  const routeLatLngs = selectedAircraftRoute.getLatLngs()
  let closestIndex = 0
  let closestDistance = Infinity

  routeLatLngs.forEach((point, index) => {
    const distance = skyTraceMap.distance(progressPoint, [point.lat, point.lng])
    if(distance < closestDistance) {
      closestDistance = distance
      closestIndex = index
    }
  })

  if(closestIndex <= 0) {
    selectedAircraftCompletedRoute.setLatLngs([])
    return
  }

  const completedPoints = routeLatLngs.slice(0, closestIndex + 1)
  completedPoints.push(progressPoint)
  selectedAircraftCompletedRoute.setLatLngs(completedPoints)
}

function showSkyTraceAircraftRoute(aircraft) {
  if(selectedAircraftRoute) {
    skyTraceMap.removeLayer(selectedAircraftRoute)
    selectedAircraftRoute = null
  }

  if(selectedAircraftCompletedRoute) {
    skyTraceMap.removeLayer(selectedAircraftCompletedRoute)
    selectedAircraftCompletedRoute = null
  }

  if(!aircraft.origin || !aircraft.destination) {
    return
  }
  const originLat = aircraft.origin.latitude
  const originLon = aircraft.origin.longitude
  const destinationLat = aircraft.destination.latitude
  const destinationLon = aircraft.destination.longitude

  if(originLat == null || originLon == null || destinationLat == null || destinationLon == null) {
    return
  }

  const currentLat = aircraft.latitude
  const currentLon = aircraft.longitude
  const routePoints = []
  const curveAmount = Math.min(20, Math.max(5, Math.abs(destinationLon - originLon) * 0.15))

  const midLat = (originLat + destinationLat) / 2 + curveAmount
  const midLon = (originLon + destinationLon) / 2
  const steps = 50
  for(let i = 0; i <= steps; i++) {
    const x = i / steps
    const oneMinusX = 1 - x
    const latitude = oneMinusX * oneMinusX * originLat + 2 * oneMinusX * x * midLat + x * x * destinationLat
    const longitude = oneMinusX * oneMinusX * originLon + 2 * oneMinusX * x * midLon + x * x * destinationLon
    routePoints.push([latitude, longitude])
  }

  selectedAircraftRoute = L.polyline(routePoints,
    {color: "#4da3ff", weight: 3, opacity: 0.75, dashArray: "8 8"}
  ).addTo(skyTraceMap)

  selectedAircraftCompletedRoute = L.polyline([], {
    color: "#4da3ff", weight: 4, opacity: 0.95, smoothFactor: 1
  }).addTo(skyTraceMap)
}

skyTraceFlightSearch.addEventListener("input", () => {
  const searchValue = skyTraceFlightSearch.value.trim().toLowerCase()
  skyTraceSearchResults.innerHTML = ""

  if(!searchValue) {
    return
  }

  const matches = []
  aircraftMarkers.forEach((marker, aircraftId) => {
    const aircraft = marker.skyTraceAircraft

    if(!aircraft) {
      return
    }

    const callsign = aircraft.callsign?.toLowerCase() || ""
    const registration = aircraft.registration?.toLowerCase() || ""
    const icao = aircraft.id?.toLowerCase() || ""

    if(callsign.includes(searchValue) || registration.includes(searchValue) || icao.includes(searchValue)) {
      matches.push(aircraft)
    }
  })

  matches.slice(0, 8).forEach((aircraft) => {
    const result = document.createElement("div")
    result.className = "skyTraceSearchResult"
    result.innerHTML = `<strong>${aircraft.callsign}</strong>
    <span>${aircraft.registration || aircraft.id || "Unknown aircraft"}</span`

    result.addEventListener("click", () => {
      selectSkyTraceAircraft(aircraft) 
      skyTraceFlightSearch.value = aircraft.callsign
      skyTraceSearchResults.innerHTML = ""
    })
    skyTraceSearchResults.appendChild(result)
  })
})

function updateAircraftMarkers(aircraftList) {
  const currentAircraftIds = new Set()
  aircraftList.forEach((aircraft) => {
    if(aircraft.latitude == null || aircraft.longitude == null || aircraft.id == null) {
      return
    }

    if(aircraft.id === selectedAircraftId) {
      updateSelectedAircraftPanel(aircraft)
      updateSkyTraceAircraftRouteProgress(aircraft)

      if(skyTraceFollowAircraft && !skyTraceReplayMode) {
        skyTraceMap.panTo([aircraft.latitude, aircraft.longitude], {
          animate: true, duration: 0.8
        })
      }
    }

    currentAircraftIds.add(aircraft.id)
    createAircraftTrail(aircraft.id, aircraft.latitude, aircraft.longitude)

    if(!aircraftHistory.has(aircraft.id)) {
      aircraftHistory.set(aircraft.id, [])
    }

    const history = aircraftHistory.get(aircraft.id)
    history.push({latitude: aircraft.latitude, longitude: aircraft.longitude, altitude: aircraft.altitude, speed: aircraft.speed, heading: aircraft.heading, timestamp: Date.now()})
    if(history.length > 60) {
      history.shift()
    }
    console.log("SkyTrace History:", aircraft.id, aircraftHistory.get(aircraft.id))

    let marker = aircraftMarkers.get(aircraft.id)

    if(!marker) {
      marker = L.marker([aircraft.latitude, aircraft.longitude], 
        {
          icon: createAircraftIcon(aircraft.heading)}).addTo(skyTraceMap)

          marker.skyTraceAircraft = aircraft
      
          marker.on("click", () => {
            if(selectedAircraftId && selectedAircraftId !== aircraft.id) {
              const previousTrail = aircraftTrails.get(selectedAircraftId)
              if(previousTrail) {
                skyTraceMap.removeLayer(previousTrail)
              }
              const previousMarker = aircraftMarkers.get(selectedAircraftId)
              if(previousMarker) {
                previousMarker.setIcon(
                  createAircraftIcon(previousMarker.skyTraceAircraft?.heading)
                )
              }
            }
            selectSkyTraceAircraft(aircraft)
      })
      
      aircraftMarkers.set(aircraft.id, marker)
    } else {
      marker.skyTraceAircraft = aircraft
      const currentPosition = marker.getLatLng()

      if(!skyTraceReplayMode) {
        animateAircraftMarker(marker, aircraft.id, [currentPosition.lat, currentPosition.lng], [aircraft.latitude, aircraft.longitude], 5000)

      }
      
      if(aircraft.id === selectedAircraftId) {
        marker.setIcon(createSelectedAircraftIcon(aircraft.heading))
      } else {
        marker.setIcon(createAircraftIcon(aircraft.heading))
      }
    }
  })

  aircraftMarkers.forEach((marker, aircraftId) => {
    if(!currentAircraftIds.has(aircraftId)) {
      skyTraceMap.removeLayer(marker)
      aircraftMarkers.delete(aircraftId)
    }
  })
}

function selectSkyTraceAircraft(aircraft) {
  hideSkyTraceReplayHud()

  skyTraceReplayMode = false
  skyTraceReplayRunning = false
  skyTraceReplayIndex = 0
  if(skyTraceReplayAnimation) {
    cancelAnimationFrame(skyTraceReplayAnimation)
    skyTraceReplayAnimation = null
  }

  selectedAircraftId = aircraft.id
  skyTraceFollowAircraft = true
 
  const marker = aircraftMarkers.get(aircraft.id)
  
  if(marker) {
    marker.setIcon(createSelectedAircraftIcon(aircraft.heading))
  }
  
  skyTraceMap.setView([aircraft.latitude, aircraft.longitude], 10 ,{
    animate: true, duration: 0.8
  })

  showSkyTraceAircraftPanel(aircraft)
  showSkyTraceAircraftRoute(aircraft)
  const trail = aircraftTrails.get(aircraft.id)
  if(trail) {
    trail.addTo(skyTraceMap)
  }
}

let skyTraceReplayAnimation = null
let skyTraceReplayRunning = false
let skyTraceReplayIndex = 0
let skyTraceReplaySpeed = 1
let skyTraceReplayStartTime = 0
let skyTraceReplaySegmentDuration = 500

function formatSkyTraceReplayTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = Math.floor(totalSeconds % 60)
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
  }

function replaySkyTraceAircraft() {
  if(!selectedAircraftId) {
    console.log("SkyTrace: No aircraft selected for replay")
    return
  }

  const history = aircraftHistory.get(selectedAircraftId)

  if(!history || history.length < 2) {
    console.log("SkyTrace: Not enough history to replay")
    return
  }
  
  skyTraceReplayHud.classList.add("open")

  const marker = aircraftMarkers.get(selectedAircraftId)
  
  if(!marker) {
    return
  }
  
  if(skyTraceReplayAnimation) {
    cancelAnimationFrame(skyTraceReplayAnimation)
  }

  skyTraceFollowAircraft = false
  skyTraceReplayMode = true
  skyTraceReplayRunning = true
  skyTraceReplayIndex = 0
  let skyTraceReplayStartTime  = performance.now()
  skyTraceReplayTimeline.max = history.length - 1
  skyTraceReplayTimeline.value = 0
  
  skyTraceReplayTotalTime.textContent = formatSkyTraceReplayTime((history.length - 1) * 5)
  skyTraceReplayPlayPause.textContent = "Pause"

  function animateReplay(currentTime) {
    if(!skyTraceReplayRunning) {
      return
    }

    if(skyTraceReplayIndex  >= history.length - 1) {
      const finalPoint = history[history.length - 1]
      marker.setLatLng([finalPoint.latitude, finalPoint.longitude])
      skyTraceMap.panTo([finalPoint.latitude, finalPoint.longitude], {animate: false})

      skyTraceReplayTimeline.value = history.length - 1
      skyTraceReplayCurrentTime.textContent = formatSkyTraceReplayTime((history.length - 1) * 5)

      skyTraceReplayRunning = false
      skyTraceReplayMode = false
      skyTraceReplayAnimation = null
      skyTraceReplayPlayPause.textContent = "Play"
      hideSkyTraceReplayHud()
      console.log("SkyTrace: Replay finished")
      return
    }

    const currentPoint = history[skyTraceReplayIndex]
    const nextPoint = history[skyTraceReplayIndex + 1]
    const elapsed = currentTime - skyTraceReplayStartTime
    const duration = skyTraceReplaySegmentDuration / skyTraceReplaySpeed
    const progress = Math.min(elapsed / duration, 1)
    updateSkyTraceReplayHud({...marker.skyTraceAircraft, altitude: currentPoint.altitude, speed: currentPoint.speed, heading: currentPoint.heading}, (skyTraceReplayIndex + progress) * 5)
    const smoothProgress = progress * progress * (3 - 2 * progress)
    const latitude = currentPoint.latitude + (nextPoint.latitude - currentPoint.latitude) * smoothProgress
    const longitude = currentPoint.longitude + (nextPoint.longitude - currentPoint.longitude) * smoothProgress

    marker.setLatLng([latitude, longitude])
    skyTraceMap.panTo([latitude, longitude], {animate: false})

    skyTraceReplayTimeline.value = skyTraceReplayTimeline.value = skyTraceReplayIndex + progress
    skyTraceReplayCurrentTime.textContent = formatSkyTraceReplayTime((skyTraceReplayIndex + progress) * 5)

    if(progress >= 1) {
      skyTraceReplayIndex++
      skyTraceReplayStartTime = currentTime
    }
    skyTraceReplayAnimation = requestAnimationFrame(animateReplay)
  }
  skyTraceReplayAnimation = requestAnimationFrame(animateReplay)
  console.log(`SkyTrace: Starting replay with ${history.length} recorded points`)
}

function updateSkyTraceReplayHud(aircraft, replayTime) {
  if(!aircraft) {
    return
  }

  skyTraceReplayHudCallsign.textContent = aircraft.callsign || "Unknown"
  const origin = aircraft.origin?.iata || aircraft.origin?.icao || "N/A"
  const destination = aircraft.destination?.iata || aircraft.destination?.icao || "N/A"
  skyTraceReplayHudRoute.textContent = `${origin} to ${destination}`
  skyTraceReplayHudAltitude.textContent = aircraft.altitude != null ? `${Math.round(aircraft.altitude)}ft` : "N/A"
  skyTraceReplayHudSpeed.textContent = aircraft.speed != null ? `${Math.round(aircraft.speed)}kt` : "N/A"
  skyTraceReplayHudHeading.textContent = aircraft.heading != null ? `${Math.round(aircraft.heading)}°` : "N/A"
  skyTraceReplayHudTime.textContent = formatSkyTraceReplayTime(replayTime)
}

function hideSkyTraceReplayHud() {
  skyTraceReplayHud.classList.remove("open")
}

function stopSkyTraceReplay() {
  skyTraceReplayRunning = false
  if(skyTraceReplayAnimation) {
    cancelAnimationFrame(skyTraceReplayAnimation)
    skyTraceReplayAnimation = null
  }
  console.log("SkyTrace: Replay Stopped")
}

skyTraceReplayButton.addEventListener("click", () => {
  console.log("Replay button clicked")
  replaySkyTraceAircraft()
})

skyTraceReplayPlayPause.addEventListener("click", () => {
  

  if(skyTraceReplayRunning) {
    skyTraceReplayRunning = false

    if(skyTraceReplayAnimation) {
      cancelAnimationFrame(skyTraceReplayAnimation)
      skyTraceReplayAnimation = null
    }

    skyTraceReplayPlayPause.textContent = "Play"
  } else {
    const history = aircraftHistory.get(selectedAircraftId)

    if(!history || history.length < 2) {
      return
    }

    const marker = aircraftMarkers.get(selectedAircraftId)
    if(marker) {
      updateSkyTraceReplayHud(marker.skyTraceAircraft, skyTraceReplayIndex * 5)
    }
    skyTraceReplayHud.classList.add("open")

    const currrentPoint = history[skyTraceReplayIndex]
    if(marker && currrentPoint) {
      marker.setLatLng([currrentPoint.latitude, currrentPoint.longitude])
    }

    skyTraceReplayRunning = true
    skyTraceReplayStartTime = performance.now()
    skyTraceReplayPlayPause.textContent = "Pause"

    function resumeReplay(currentTime) {
      if(!skyTraceReplayRunning) {
        return
      }

      if(skyTraceReplayIndex >= history.length - 1) {
        skyTraceReplayRunning = false
        skyTraceReplayPlayPause.textContent = "Play"
        return
      }

      const currentPoint = history[skyTraceReplayIndex]
      const nextPoint = history[skyTraceReplayIndex + 1]

      const elapsed = currentTime - skyTraceReplayStartTime
      const duration = skyTraceReplaySegmentDuration / skyTraceReplaySpeed
      const progress = Math.min(elapsed / duration, 1)
      const smoothProgress = progress * progress * (3 - 2 * progress)
      const latitude = currentPoint.latitude + (nextPoint.latitude - currentPoint.latitude) * smoothProgress
      const longitude = currentPoint.longitude + (nextPoint.longitude - currentPoint.longitude) * smoothProgress
      const marker = aircraftMarkers.get(selectedAircraftId)

      if(marker) {
        marker.setLatLng([latitude, longitude])
      }
      skyTraceMap.panTo([latitude, longitude], {animate: false})

      skyTraceReplayTimeline.value = skyTraceReplayIndex + progress
      skyTraceReplayCurrentTime.textContent = formatSkyTraceReplayTime((skyTraceReplayIndex + progress) * 5)
      if(progress >= 1) {
        skyTraceReplayIndex++
        skyTraceReplayStartTime = currentTime
      }
      skyTraceReplayAnimation = requestAnimationFrame(resumeReplay)
    }
    skyTraceReplayAnimation = requestAnimationFrame(resumeReplay)
  }
})

skyTraceReplayRestart.addEventListener("click", () => {
  const history = aircraftHistory.get(selectedAircraftId)

  if(!history || history.length < 2) {
    return
  }

  if(skyTraceReplayAnimation) {
    cancelAnimationFrame(skyTraceReplayAnimation)
  }

  const marker = aircraftMarkers.get(selectedAircraftId)
  if(marker) {
    marker.setLatLng([
      history[0].latitude,
      history[0].longitude
    ])
  }

  skyTraceReplayIndex = 0
  skyTraceReplayTimeline.value = 0
  skyTraceReplayCurrentTime.textContent = "00:00"
  skyTraceReplayRunning = false
  skyTraceReplayPlayPause.textContent = "Play"
})

skyTraceReplaySpeedButtons.forEach((button) => {
  button.addEventListener("click", () => {
    skyTraceReplaySpeed = Number(button.dataset.speed)
    skyTraceReplaySpeedButtons.forEach((speedButton) => {
      speedButton.classList.remove("active")
    })

    button.classList.add("active")
  })
})

skyTraceReplayTimeline.addEventListener("input", () => {
  const history = aircraftHistory.get(selectedAircraftId)
  if(!history || history.length < 2) {
    return
  }

  const value = Number(skyTraceReplayTimeline.value)
  const index = Math.floor(value)
  const point = history[Math.min(index, history.length - 1)]
  const marker = aircraftMarkers.get(selectedAircraftId)

  if(marker) {
    marker.setLatLng([point.latitude, point.longitude])
  }
  skyTraceMap.panTo([point.latitude, point.longitude], {animate: false})
  skyTraceReplayIndex = Math.min(index, history.length - 2)
  skyTraceReplayCurrentTime.textContent = formatSkyTraceReplayTime(value * 5)
})

function createSelectedAircraftIcon(heading) {
  return L.divIcon({
    className: "skyTraceSelectedAircraftIcon",
    html: `
    <div class="skyTraceSelectedAircraft">
      <div class="skyTraceSelectedAircraftRing"></div>
      <img
        src="${planeIcon}"
        alt="Selected Aircraft"
        style="transform: rotate(${heading || 0}deg)"
    </div>`,
    iconSize: [70, 70], iconAnchor: [35, 35]
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
    const zoom = skyTraceMap.getZoom()
    if(zoom < 4){
      updateAircraftMarkers([])
      return
    }

    const center = skyTraceMap.getCenter()

    let distance 
    if(zoom === 4){
      distance = 250
    } else if (zoom === 5) {
      distance = 200
    } else if  (zoom === 6) {
      distance = 150
    } else {
      distance = 100
    }


    const aircraft = await fetchSkyTraceAircraft(center.lat, center.lng, distance)
    updateAircraftMarkers(aircraft)
    console.log(`SkyTrace: ${aircraft.length} aircraft loaded`)
  } catch(error) {console.error("Failed to load SkyTrace aircraft:", error)}
}

loadSkyTraceAircraft()

setInterval(loadSkyTraceAircraft, 5000)

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