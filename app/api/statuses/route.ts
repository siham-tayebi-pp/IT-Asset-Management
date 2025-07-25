import { NextResponse } from "next/server"

export async function GET() {
    try {
        const { NEXT_PUBLIC_GLPI_URL, NEXT_PUBLIC_GLPI_APP_TOKEN, NEXT_PUBLIC_GLPI_USER_TOKEN } = process.env

        if (!NEXT_PUBLIC_GLPI_URL || !NEXT_PUBLIC_GLPI_APP_TOKEN || !NEXT_PUBLIC_GLPI_USER_TOKEN) {
            return NextResponse.json({ error: "Variables d'environnement manquantes" }, { status: 500 })
        }

        console.log("🔍 Récupération des statuts GLPI...")

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
        console.log("✅ Session GLPI créée pour les statuts")

        try {
            // Essayer plusieurs endpoints pour les statuts
            let statuses = []

            // 1. Essayer State (États)
            console.log("🔍 Tentative avec State...")
            const stateRes = await fetch(`${NEXT_PUBLIC_GLPI_URL}State?range=0-100`, {
                headers: {
                    "Content-Type": "application/json",
                    "Session-Token": sessionToken,
                    "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN,
                },
            })

            if (stateRes.ok) {
                const stateData = await stateRes.json()
                console.log("📊 Données State reçues:", stateData)
                if (Array.isArray(stateData) && stateData.length > 0) {
                    statuses = stateData
                }
            } else {
                console.log("⚠️ State endpoint failed:", stateRes.status)
            }

            // 2. Si pas de résultats, essayer avec les statuts par défaut
            if (statuses.length === 0) {
                console.log("🔍 Utilisation des statuts par défaut...")
                statuses = [
                    { id: 1, name: "Non affecté" },
                    { id: 2, name: "Affecté" },
                    { id: 3, name: "En maintenance" },
                    { id: 4, name: "Hors service" },
                    { id: 5, name: "En stock" },
                    { id: 6, name: "Délégué" },
                    { id: 7, name: "En congé" },
                    { id: 8, name: "En transition" },
                ]
            }

            console.log(
                `📊 ${statuses.length} statuts disponibles:`,
                statuses.map((s) => s.name),
            )

            return NextResponse.json({
                success: true,
                statuses: statuses,
                debug: {
                    endpoint: "State",
                    count: statuses.length,
                },
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
                console.error("⚠️ Erreur killSession:", e)
            }
        }
    } catch (error) {
        console.error("❌ Erreur lors de la récupération des statuts:", error)
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Erreur serveur",
                statuses: [
                    // Statuts de fallback
                    { id: 1, name: "Non affecté" },
                    { id: 2, name: "Affecté" },
                    { id: 3, name: "En maintenance" },
                    { id: 4, name: "Hors service" },
                    { id: 5, name: "En stock" },
                ],
            },
            { status: 200 }, // Retourner 200 avec les statuts par défaut
        )
    }
}
