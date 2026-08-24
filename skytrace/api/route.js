export default async function handler(request, response) {
    try {
        const callsign = request.query.callsign?.trim()
        if(!callsign) {
            return response.status(400).json({
                error: "Missing callsign"
            })
        }

        const routeUrl = `https://api.adsbdb.com/v0/callsign/${encodeURIComponent(callsign)}`
        console.log("Looking up:", routeUrl)
        const routeResponse = await fetch(routeUrl)
        const responseText = await routeResponse.text()
        console.log("ADSBDB status:", routeResponse.status)
        console.log("ADSBDB response:", responseText)

        if(!routeResponse.ok) {
            return response.status(routeResponse.status).json({
                error: "ADSBDB request failed",
                status: routeResponse.status,
                details: responseText
            })
        }
        const data = JSON.parse(responseText)
        const route = data.response?.flightroute
        
        if(!route) {
            return response.status(404).json({
                error: "Route not found"
            })
        }
        return response.status(200).json({
            airline: route.airline?.name || null,
            origin: route.origin ? {name: route.origin.name, iata: route.origin.iata_code, icao: route.origin.icao_code, latitude: route.origin.latitude, longitude: route.origin.longitude} : null,
            destination: route.destination ? {name: route.destination.name, iata: route.destination.iata_code, icao: route.destination.icao_code, latitude: route.destination.latitude, longitude: route.destination.longitude} : null,
        })
    } catch(error) {
        console.error("Route API error:", error)
        return response.status(500).json({
            error: "Failed to fetch route data",
            details: error.message
        })
    }
}