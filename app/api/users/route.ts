import { NextResponse } from "next/server"

export async function GET() {
    try {
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
            return NextResponse.json({ error: "Erreur session GLPI" }, { status: 500 })
        }

        const sessionData = await sessionRes.json()
        const sessionToken = sessionData.session_token

        try {
            const usersRes = await fetch(`${NEXT_PUBLIC_GLPI_URL}User?range=0-100`, {
                headers: {
                    "Content-Type": "application/json",
                    "Session-Token": sessionToken,
                    "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN,
                },
            })

            const users = usersRes.ok ? await usersRes.json() : []

            return NextResponse.json({
                success: true,
                users: Array.isArray(users) ? users : [],
            })
        } finally {
            // Kill session
            await fetch(`${NEXT_PUBLIC_GLPI_URL}killSession`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Session-Token": sessionToken,
                    "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN,
                },
            }).catch(() => { })
        }
    } catch (error) {
        console.error("Erreur lors de la récupération des utilisateurs:", error)
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Erreur serveur",
            },
            { status: 500 },
        )
    }
}
