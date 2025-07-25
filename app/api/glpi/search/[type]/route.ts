import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: { type: string } }) {
    try {
        const { searchParams } = new URL(request.url)
        const userId = searchParams.get("userId")
        const { type } = params

        if (!userId) {
            return NextResponse.json({ error: "userId is required" }, { status: 400 })
        }

        // Valider le type d'équipement
        const validTypes = ["monitor", "printer", "phone", "peripheral", "networkequipment"]
        if (!validTypes.includes(type.toLowerCase())) {
            return NextResponse.json({ error: `Invalid equipment type: ${type}` }, { status: 400 })
        }

        const GLPI_URL = process.env.GLPI_API_URL || "http://192.168.0.1/glpi"
        const APP_TOKEN = process.env.GLPI_APP_TOKEN || "gF41mo9jyFhtbG7wd5R5RoErPNGFulD0dt7njwbU"
        const SESSION_TOKEN = process.env.GLPI_SESSION_TOKEN || "njg5dik1f8vb134am47mf9c3a4"

        // Mapping des types vers les noms GLPI corrects
        const glpiTypeMap: Record<string, string> = {
            monitor: "Monitor",
            printer: "Printer",
            phone: "Phone",
            peripheral: "Peripheral",
            networkequipment: "NetworkEquipment",
        }

        const glpiType = glpiTypeMap[type.toLowerCase()]

        // Essayer différents champs pour trouver les équipements assignés à l'utilisateur
        const possibleFields = [4, 70, 5, 24] // users_id, users_id (autre), users_id_tech, users_id (autre variante)

        let data = null
        let lastError = null
        let workingField = null

        for (const field of possibleFields) {
            try {
                const searchUrl = `${GLPI_URL}/apirest.php/search/${glpiType}?criteria[0][field]=${field}&criteria[0][searchtype]=equals&criteria[0][value]=${userId}`

                console.log(`🔍 [${type}] Tentative avec champ ${field} pour userId ${userId}`)
                console.log(`📡 [${type}] URL: ${searchUrl}`)

                const response = await fetch(searchUrl, {
                    method: "GET",
                    headers: {
                        "App-Token": APP_TOKEN,
                        "Session-Token": SESSION_TOKEN,
                        "Content-Type": "application/json",
                    },
                })

                console.log(`📊 [${type}] Status: ${response.status}`)

                if (response.ok) {
                    const responseData = await response.json()
                    console.log(`📦 [${type}] Données reçues:`, responseData)

                    if (responseData.data && responseData.data.length > 0) {
                        console.log(`✅ [${type}] Succès avec champ ${field}, trouvé ${responseData.data.length} équipements`)
                        data = responseData
                        workingField = field
                        break
                    } else {
                        console.log(`⚠️ [${type}] Champ ${field} OK mais aucun résultat`)
                        // Même si pas de résultats, on garde cette réponse comme valide
                        if (!data) {
                            data = responseData
                            workingField = field
                        }
                    }
                } else {
                    const errorText = await response.text()
                    console.log(`❌ [${type}] Champ ${field} échoué: ${response.status} - ${errorText}`)
                    lastError = `Field ${field}: ${response.status} - ${errorText}`
                }
            } catch (error) {
                console.error(`💥 [${type}] Erreur avec champ ${field}:`, error)
                lastError = `Field ${field}: ${error instanceof Error ? error.message : "Unknown error"}`
            }
        }

        if (data) {
            return NextResponse.json({
                success: true,
                data: data.data || [],
                count: data.totalcount || 0,
                workingField: workingField,
                type: type,
                glpiType: glpiType,
                userId: userId,
            })
        } else {
            return NextResponse.json({
                success: false,
                error: `Aucun champ fonctionnel trouvé pour ${type}. Dernière erreur: ${lastError}`,
                data: [],
                type: type,
                userId: userId,
            })
        }
    } catch (error) {
        console.error(`💥 Erreur lors de la récupération de ${params.type}:`, error)
        return NextResponse.json(
            {
                success: false,
                error: "Internal server error",
                data: [],
                details: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 },
        )
    }
}
