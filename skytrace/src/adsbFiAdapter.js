const ADSB_LOL_BASE_URL = "https://api.adsb.lol"

export async function fetchSkyTraceAircraft(latitude, longitude) {
    const url = `${ADSB_LOL_BASE_URL}/v2/lat/${latitude}/lon/${longitude}/dist/250`
    const response = await fetch(url)

    if(!response.ok) {
        throw new Error(`ADSB.lol API error: ${response.status}`)
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