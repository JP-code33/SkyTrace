export async function fetchSkyTraceAircraft(latitude, longitude, distance = 250) {
    const url = `https://sky-trace-qtiq.vercel.app/api/aircraft?lat=${latitude}&lon=${longitude}&dist=${distance}`
    const response = await fetch(url)

    if(!response.ok) {
        throw new Error(`SkyTrace aircraft API error: ${response.status}`)
    }
    const data = await response.json()
    return(data.ac || [])
    .filter(aircraft => aircraft.lat !== undefined && aircraft.lon !== undefined)
    .map(aircraft => ({
        id: aircraft.hex, 
        callsign: aircraft.flight?.trim() || "Unknown",
        latitude: aircraft.lat, longitude: aircraft.lon, altitude: aircraft.alt_baro, speed: aircraft.gs,
        heading: aircraft.track, registration: aircraft.r, aircraftType: aircraft.t
    }))
}