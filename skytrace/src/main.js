import "leaflet/dist/leaflet.css"
import "./style.css"
import L from "leaflet"

const map = L.map("map").setView([39.8, -98.5], 4)
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreeMap contributors"
}).addTo(map)