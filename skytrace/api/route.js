export default async function handler(request, response) {
    try {
        const callsign = request.query.callsign?.trim()
        if(!callsign) {
            return response.status(400).json({
                error: "Missing callsign"
            })
        }

        const routeURL = `https://api.adsbdb.com/v0/callsign/${encodeURIComponent(callsign)}`
        const routeResponse = await fetch(routeURL)

        if(!routeResponse.ok) {
            return response.status(routeResponse.status).json({
                error: "ADSBDB route lookup failed"
            })
        }

        const data = await routeResponse.json()
        const route = data.response?.flightroute

        if(!reoute) {
            return response.status(400).json({
                error: "Route not found"
            })
        }

        return response.status(200).json({
            airline: route.airline?.name || null,
            origin: route.origin ? {name: route.origin.name, iata: route.origin.iata_code, icao: route.origin.icao_code} : null,
            destination : route.destination ? {name: route.destination.name, iata: route.destination.iata_code, icao: route.destination.icao_code} : null
        })
    } catch(error) {
        console.error(error)
        return response.status(500).json({
            error: "Failed to fetch route data"
        })
    }
}