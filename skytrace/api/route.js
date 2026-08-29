export default async function handler(request, response) {
    try {
        const callsign = request.query.callsign?.trim()
        if(!callsign) {
            return response.status(400).json({
                error: "Missing callsign"
            })
        }

        try {
            const routeUrl = `https://api.adsb.com/v0/callsign/${encodeURIComponent(callsign)}`
            const routeResponse = await fetch(routeUrl)

            if(routeResponse.ok) {
                const data = await routeResponse.json()
                const route = data.response?.flightroute

                if(route) {
                    return response.status(200).json({
                        airline: route.airline?.name || null,
                        origin: route.origin ? {
                            name: route.origin.name, iata: route.origin.iata_code, 
                            icao: route.origin.icao_code, latitude: Number(route.origin.latitude), longitude: Number(route.origin.longitude)
                        } : null,
                        
                        destination: route.destination ? {
                            name: route.destination.name, iata: route.destination.iata_code,
                            icao: route.destination.icao_code, latitude: Number(route.destination.latitude), longitude: Number(route.destination.longitude)
                        } : null,
                        source: "adsbdb"
                    })
                }
            }
            
        } catch(adsbdbError) {
            console.log("ADSBDB failed, trying HexDB:", adsbdbError.message)
        }

        const hexRouteUrl = `https://hexdb.io/api/v1/route/icao/${encodeURIComponent(callsign)}`
        const hexRouteResponse = await fetch(hexRouteUrl)

        if(!hexRouteResponse.ok) {
            return response.status(404).json({
                error: "Route not found"
            })
        }

        const hexRoute = await hexRouteResponse.json()

        if(!hexRoute.route || !hexRoute.route.includes("-")) {
            return response.status(404).json({
                error: "Route not found"
            })
        }

        const [originIcao, destinationIcao] = hexRoute.route.split("-")
        const [originResponse, destinationResponse] = await Promise.all([
            fetch(`https://hexdb.io/api/v1/airport/icao/${originIcao}`),
            fetch(`https://hexdb.io/api/v1/airport/icao/${destinationIcao}`)
        ])

        if(!originResponse.ok || !destinationResponse.ok) {
            return response.status(404).json({
                error: "Airport information not found"
            })
        }

        const origin = await originResponse.json()
        const destination = await destinationResponse.json()
        return response.status(200).json({
            airline: null,

            origin: {
                name: origin.airport || null, iata: origin.iata || null, icao: origin.icao || originIcao, latitude: Number(origin.latitude), longitude: Number(origin.longitude)
            },
            destination: {
                name: destination.airport || null, iata: destination.iata || null, icao: destination.icao || destinationIcao, latitude: Number(destination.latitude), longitude: Number(destination.longtiude)
            },
            source: "hexDB"
        })
    } catch (error) {
        return response.status(500).json({
            error: "Failed to fetch route data",
            details: error.message
        })
    }
}