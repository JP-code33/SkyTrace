export default async function handler(request, response) {
    try {
        const latitude = Number(request.query.lat)
        const longitude = Number(request.query.lon)
        const distance = Number(request.query.dist) || 100

        if(!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            return response.status(400).json({
                error: "Invalid latitude or longitude"
            })
        }
        const apiUrl = `https://opendata.adsb.fi/api/v3/lat/${latitude}/lon/${longitude}/dist/${distance}`
        const aircraftResponse = await fetch(apiUrl)
        if(!aircraftResponse.ok) {
            return response.status(aircraftResponse.status).json({
                error: "ADS-B.fi API request failed"
            })
        }

        const aircraftData = await aircraftResponse.json()
        return response.status(200).json(aircraftData)
    } catch(error) {
        console.error(error)
        return response.status(500).json({
            error: "Failed to fetch aircraft data"
        })
    }
}