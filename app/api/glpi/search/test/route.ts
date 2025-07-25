import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const userId = searchParams.get("userId") || "1"

        console.log("🧪 [TEST] Test route appelée avec userId:", userId)

        const GLPI_URL = process.env.GLPI_URL || "http://192.168.0.58/glpi"
        const APP_TOKEN = process.env.GLPI_APP_TOKEN || "ow3eeLBLEpnrS7hHN0S04a7617VMqGtYCUH9AceL"
        const SESSION_TOKEN = process.env.GLPI_SESSION_TOKEN || "c6dq7c52jnv6tsr2f47i2lsq1k"

        // D'abord, récupérons la liste des champs disponibles pour Monitor
        const listFieldsUrl = `${GLPI_URL}/apirest.php/listSearchOptions/Monitor`
        console.log("📋 [TEST] Récupération des champs disponibles:", listFieldsUrl)

        const fieldsResponse = await fetch(listFieldsUrl, {
            method: "GET",
            headers: {
                "App-Token": APP_TOKEN,
                "Session-Token": SESSION_TOKEN,
                "Content-Type": "application/json",
            },
        })

        const fieldsData = await fieldsResponse.text()
        console.log("📋 [TEST] Champs disponibles:", fieldsData)

        // Testons différents champs possibles pour "user" ou "assigned"
        const possibleFields = [
            { field: 4, name: "users_id" },
            { field: 5, name: "users_id_tech" },
            { field: 70, name: "users_id" },
            { field: 71, name: "groups_id" },
        ]

        const results = []

        for (const { field, name } of possibleFields) {
            const searchUrl = `${GLPI_URL}/apirest.php/search/Monitor?criteria[0][field]=${field}&criteria[0][searchtype]=equals&criteria[0][value]=${userId}`
            console.log(`🔍 [TEST] Test champ ${field} (${name}):`, searchUrl)

            try {
                const response = await fetch(searchUrl, {
                    method: "GET",
                    headers: {
                        "App-Token": APP_TOKEN,
                        "Session-Token": SESSION_TOKEN,
                        "Content-Type": "application/json",
                    },
                })

                const responseText = await response.text()
                let data
                try {
                    data = JSON.parse(responseText)
                } catch (e) {
                    data = { error: "Invalid JSON", raw: responseText }
                }

                results.push({
                    field,
                    name,
                    status: response.status,
                    success: response.ok,
                    data: data,
                    url: searchUrl,
                })

                console.log(`📊 [TEST] Résultat champ ${field}:`, {
                    status: response.status,
                    success: response.ok,
                    dataCount: data?.data?.length || 0,
                })
            } catch (error) {
                results.push({
                    field,
                    name,
                    error: error instanceof Error ? error.message : "Unknown error",
                    url: searchUrl,
                })
            }
        }

        return NextResponse.json({
            success: true,
            userId: userId,
            fieldsInfo: fieldsData,
            testResults: results,
            glpiUrl: GLPI_URL,
        })
    } catch (error) {
        console.error("💥 [TEST] Erreur:", error)
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
                stack: error instanceof Error ? error.stack : undefined,
            },
            { status: 500 },
        )
    }
}
