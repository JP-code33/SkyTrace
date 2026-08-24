const routeCache = new Map()

async function fetchSkyTraceRoute(callsign) {
    if(!callsign || callsign === "Unknown") {
        return null
    }

    if(routeCache.has(callsign)) {
        return routeCache.get(callsign)
    }

    try{
        const response = await fetch(`https://sky-trace-qtiq.vercel.app/api/route?callsign=${encodeURIComponent(callsign)}`)

        if(response.status === 404) {
            routeCache.set(callsign, null)
            return null
        }

        if(!response.ok) {
            console.error(`Route API error for ${callsign}: ${response.status}`)
            return null
        }
        const route = await response.json()
        routeCache.set(callsign, route)
        return route
    } catch(error) {
        console.error(`Failed to load route for ${callsign}:`, error)
        return null
    }
}

export async function fetchSkyTraceAircraft(latitude, longitude, distance = 250) {
    const url = `https://sky-trace-qtiq.vercel.app/api/aircraft?lat=${latitude}&lon=${longitude}&dist=${distance}`
    const response = await fetch(url)

    if(!response.ok) {
        throw new Error(`SkyTrace aircraft API error: ${response.status}`)
    }
    const data = await response.json()
    const aircraftList = (data.ac || [])
    .filter(aircraft => aircraft.lat !== undefined && aircraft.lon !== undefined)
    .map(aircraft => {
        const callsign = aircraft.flight?.trim() || "Unknown"

        return{
        id: aircraft.hex, 
        callsign: callsign,
        latitude: aircraft.lat, longitude: aircraft.lon, altitude: aircraft.alt_baro, speed: aircraft.gs,
        heading: aircraft.track, registration: aircraft.r, aircraftType: aircraft.t
        }
    })

    const aircraftWithRoutes = await Promise.all(
        aircraftList.map(async(aircraft) => {
            const route = await fetchSkyTraceRoute(aircraft.callsign)
            return{
                ...aircraft, airline: route?.airline || "Unknown Airline", origin: route?.origin || null, destination: route?.destination || null
            }
        })
    )
    return aircraftWithRoutes
}