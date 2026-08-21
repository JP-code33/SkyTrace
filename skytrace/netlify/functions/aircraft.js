export default async () => {
    return new Response(
        JSON.stringify({
            success: true, message: "SKyTrace is working"
        }), {headers: {"Content-Type": "applications/json"}}
    )
}