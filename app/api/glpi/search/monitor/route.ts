import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const userId = searchParams.get("userId")

        if (!userId) {
            return NextResponse.json({ error: "userId is required" }, { status: 400 })
        }

        const GLPI_URL = process.env.GLPI_URL || "http://192.168.0.1/glpi"
        const APP_TOKEN = process.env.GLPI_APP_TOKEN || "gF41mo9jyFhtbG7wd5R5RoErPNGFulD0dt7njwbU"
        const SESSION_TOKEN = process.env.GLPI_SESSION_TOKEN || "njg5dik1f8vb134am47mf9c3a4"

        // Utilisons le champ 4 qui correspond généralement à users_id dans GLPI
        // Si ça ne marche pas, on essaiera d'autres champs
        const possibleFields = [4, 70, 5] // users_id, users_id (autre), users_id_tech

        let data = null
        let lastError = null

        for (const field of possibleFields) {
            try {
                const searchUrl = `${GLPI_URL}/apirest.php/search/Monitor?criteria[0][field]=${field}&criteria[0][searchtype]=equals&criteria[0][value]=${userId}`

                console.log(`🖥️ [Monitor] Tentative avec champ ${field} pour userId ${userId}`)

                const response = await fetch(searchUrl, {
                    method: "GET",
                    headers: {
                        "App-Token": APP_TOKEN,
                        "Session-Token": SESSION_TOKEN,
                        "Content-Type": "application/json",
                    },
                })

                if (response.ok) {
                    const responseData = await response.json()
                    if (responseData.data && responseData.data.length > 0) {
                        console.log(`✅ [Monitor] Succès avec champ ${field}, trouvé ${responseData.data.length} moniteurs`)
                        data = responseData
                        break
                    } else {
                        console.log(`⚠️ [Monitor] Champ ${field} OK mais aucun résultat`)
                    }
                } else {
                    const errorText = await response.text()
                    console.log(`❌ [Monitor] Champ ${field} échoué: ${response.status} - ${errorText}`)
                    lastError = `Field ${field}: ${response.status} - ${errorText}`
                }
            } catch (error) {
                console.error(`💥 [Monitor] Erreur avec champ ${field}:`, error)
                lastError = `Field ${field}: ${error instanceof Error ? error.message : "Unknown error"}`
            }
        }

        if (data) {
            return NextResponse.json({
                success: true,
                data: data.data || [],
                count: data.totalcount || 0,
            })
        } else {
            return NextResponse.json({
                success: false,
                error: `Aucun champ fonctionnel trouvé. Dernière erreur: ${lastError}`,
                data: [],
            })
        }
    } catch (error) {
        console.error("💥 Erreur lors de la récupération des moniteurs:", error)
        return NextResponse.json(
            {
                success: false,
                error: "Internal server error",
                data: [],
            },
            { status: 500 },
        )
    }
}
