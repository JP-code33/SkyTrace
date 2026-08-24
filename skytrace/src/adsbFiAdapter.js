const airlinePrefixes = {
    AAL: "American Airlines",
    DAL: "Delta Air Lines",
    UAL: "United Airlines",
    SWA: "Southwest Airlines",
    BAW: "British Airways",
    ACA: "Air Canada",
    AFR: "Air France",
    KLM: "KLM",
    DLH: "Lufthansa",
    UAE: "Emirates",
    QTR: "Qatar Airways", 
    QFA: "Qantas",
    ANA: "All Nippon Airways",
    JAL: "Japan Airlines",
    WJA: "WestJet",
    RYR: "Ryanair",
    EZY: "easyJet",
    SIA: "Singapore Airlines",
    KAL: "Korean Airlines",
    THY: "Turkish Airlines",
    ETD: "Etihad Airways",
    AIC: "Air India",
    ASA: "Alaska Airlines",
    JBU: "JetBlue",
    IGO: "IndiGo"
}

export async function fetchSkyTraceAircraft(latitude, longitude, distance = 250) {
    const url = `https://sky-trace-qtiq.vercel.app/api/aircraft?lat=${latitude}&lon=${longitude}&dist=${distance}`
    const response = await fetch(url)

    if(!response.ok) {
        throw new Error(`SkyTrace aircraft API error: ${response.status}`)
    }
    const data = await response.json()
    return(data.ac || [])
    .filter(aircraft => aircraft.lat !== undefined && aircraft.lon !== undefined)
    .map(aircraft => {
        const callsign = aircraft.flight?.trim() || "Unknown"
        const airlineCode = callsign.substring(0, 3)
        const airline = airlinePrefixes[airlineCode] || "Unknown"

        return{
        id: aircraft.hex, 
        callsign: callsign, airline: airline,
        latitude: aircraft.lat, longitude: aircraft.lon, altitude: aircraft.alt_baro, speed: aircraft.gs,
        heading: aircraft.track, registration: aircraft.r, aircraftType: aircraft.t
        }
    })
}