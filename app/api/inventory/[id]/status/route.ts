import { type NextRequest, NextResponse } from "next/server"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const id = Number.parseInt(params.id)
        const { status, itemType = "Computer" } = await request.json()

        console.log(`🔄 Changement de statut pour ${itemType} ${id} vers "${status}"`)

        const { NEXT_PUBLIC_GLPI_URL, NEXT_PUBLIC_GLPI_APP_TOKEN, NEXT_PUBLIC_GLPI_USER_TOKEN } = process.env

        if (!NEXT_PUBLIC_GLPI_URL || !NEXT_PUBLIC_GLPI_APP_TOKEN || !NEXT_PUBLIC_GLPI_USER_TOKEN) {
            return NextResponse.json({ error: "Variables d'environnement manquantes" }, { status: 500 })
        }

        // Init session
        const sessionRes = await fetch(`${NEXT_PUBLIC_GLPI_URL}initSession`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN,
                Authorization: `user_token ${NEXT_PUBLIC_GLPI_USER_TOKEN}`,
            },
        })

        if (!sessionRes.ok) {
            const errorText = await sessionRes.text()
            console.error("❌ Erreur session GLPI:", errorText)
            return NextResponse.json({ error: "Erreur session GLPI" }, { status: 500 })
        }

        const sessionData = await sessionRes.json()
        const sessionToken = sessionData.session_token
        console.log("✅ Session GLPI créée")

        try {
            // Utiliser directement l'ID du statut reçu
            const updateRes = await fetch(`${NEXT_PUBLIC_GLPI_URL}${itemType}/${id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Session-Token": sessionToken,
                    "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN,
                },
                body: JSON.stringify({
                    input: {
                        states_id: Number.parseInt(status), // Utiliser l'ID numérique du statut
                    },
                }),
            })

            const responseText = await updateRes.text()
            console.log(`📤 Réponse GLPI:`, updateRes.status, responseText)

            if (!updateRes.ok) {
                throw new Error(`Erreur GLPI: ${updateRes.status} - ${responseText}`)
            }

            console.log("✅ Statut mis à jour avec succès!")

            return NextResponse.json({
                success: true,
                message: "Statut mis à jour avec succès dans GLPI",
                details: { status },
            })
        } finally {
            // Kill session
            try {
                await fetch(`${NEXT_PUBLIC_GLPI_URL}killSession`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Session-Token": sessionToken,
                        "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN,
                    },
                })
                console.log("🔒 Session GLPI fermée")
            } catch (e) {
                console.error("⚠️ Erreur fermeture session:", e)
            }
        }
    } catch (error) {
        console.error("❌ Erreur générale changement de statut:", error)
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Erreur lors du changement de statut",
            },
            { status: 500 },
        )
    }
}
