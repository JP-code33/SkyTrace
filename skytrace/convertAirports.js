import fs from "fs"
import {parse} from "csv-parse/sync"
import { resourceUsage } from "process"
import { convertProcessSignalToExitCode } from "util"

const csv = fs.readFileSync("./src/airports/airports.csv", "utf8")
const rows = parse(csv, {
    columns: true, skip_empty_lines: true
})

const largeAirports = rows.filter((airport) => airport.type === "large_airport" && airport.latitude_deg && airport.longitude_deg).map((airport) => ({
    id: airport.ident, name: airport.name, iata: airport.iata_code || "", icao: airport.icao_code || "",
    city: airport.municipality || "", country: airport.iso_country || "", latitude: Number(airport.latitude_deg), longitude: Number(airport.longitude_deg), 
    elevation: airport.elevation_ft ? Number(airport.elevation_ft) : null, type: airport.type
}))

const mediumAirports = rows.filter((airport) => airport.type === "medium_airport" && airport.latitude_deg && airport.longitude_deg).map((airport) => ({
    id: airport.ident, name: airport.name, iata: airport.iata_code || "", icao: airport.icao_code || "",
    city: airport.municipality || "", country: airport.iso_country || "", latitude: Number(airport.latitude_deg), longitude: Number(airport.longitude_deg), 
    elevation: airport.elevation_ft ? Number(airport.elevation_ft) : null, type: airport.type
}))

fs.mkdirSync("./src/data", {recursive:true})
fs.writeFileSync("./src/data/largeAirports.json", JSON.stringify(largeAirports))
fs.writeFileSync("./src/data/mediumAirports.json", JSON.stringify(mediumAirports))
console.log(`Large Airports: ${largeAirports.length}`)
console.log(`Medium Airports: ${mediumAirports.length}`)