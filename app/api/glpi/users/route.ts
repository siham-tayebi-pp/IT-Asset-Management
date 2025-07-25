import { NextResponse } from "next/server"

async function getValidSessionToken() {
    const GLPI_API_URL = process.env.GLPI_API_URL
    const GLPI_APP_TOKEN = process.env.GLPI_APP_TOKEN
    const USER_TOKEN = process.env.GLPI_USER_TOKEN

    try {
        console.log("🔐 [USERS] Génération d'un nouveau token...")
        const initResponse = await fetch(`${GLPI_API_URL}/initSession`, {
            method: "GET",
            headers: {
                "App-Token": GLPI_APP_TOKEN,
                Authorization: `user_token ${USER_TOKEN}`,
                "Content-Type": "application/json",
            },
        })

        if (initResponse.ok) {
            const sessionData = await initResponse.json()
            console.log("✅ [USERS] Nouveau token généré")
            return sessionData.session_token
        }
        return null
    } catch (error) {
        console.error("❌ [USERS] Erreur génération token:", error)
        return null
    }
}

export async function GET() {
    const GLPI_API_URL = process.env.GLPI_API_URL
    const GLPI_APP_TOKEN = process.env.GLPI_APP_TOKEN
    let GLPI_SESSION_TOKEN = process.env.GLPI_SESSION_TOKEN

    console.log("👥 [USERS] === DÉBUT RÉCUPÉRATION UTILISATEURS ===")
    console.log("🔗 [USERS] API URL:", GLPI_API_URL)
    console.log("🎫 [USERS] APP TOKEN:", GLPI_APP_TOKEN ? "✅ Défini" : "❌ Manquant")
    console.log("🔑 [USERS] SESSION TOKEN:", GLPI_SESSION_TOKEN ? "✅ Défini" : "❌ Manquant")

    if (!GLPI_API_URL || !GLPI_APP_TOKEN || !GLPI_SESSION_TOKEN) {
        return NextResponse.json({ error: "Missing GLPI API environment variables" }, { status: 500 })
    }

    try {
        // 🔥 CORRECTION: Utiliser range=0-999 au lieu de 0-9999 pour commencer
        const url = `${GLPI_API_URL}/User?expand_dropdowns=true&range=0-999`
        console.log("📡 [USERS] URL complète:", url)

        let response = await fetch(url, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "App-Token": GLPI_APP_TOKEN,
                "Session-Token": GLPI_SESSION_TOKEN,
            },
        })

        console.log("📊 [USERS] Status de la réponse:", response.status)

        // Si erreur 401, régénérer le token
        if (response.status === 401) {
            console.log("🔄 [USERS] Token invalide, régénération...")
            const newToken = await getValidSessionToken()
            if (newToken) {
                GLPI_SESSION_TOKEN = newToken
                response = await fetch(url, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        "App-Token": GLPI_APP_TOKEN,
                        "Session-Token": GLPI_SESSION_TOKEN,
                    },
                })
                console.log("📊 [USERS] Status après nouveau token:", response.status)
            }
        }

        if (!response.ok) {
            const errorText = await response.text()
            console.error("❌ [USERS] Erreur détaillée:", {
                status: response.status,
                statusText: response.statusText,
                url: url,
                errorText: errorText,
            })

            return NextResponse.json(
                {
                    error: `Failed to fetch users from GLPI: ${response.statusText}`,
                    details: {
                        status: response.status,
                        url: url,
                        response: errorText,
                    },
                },
                { status: response.status },
            )
        }

        const data = await response.json()
        console.log(`✅ [USERS] ${data.length} utilisateurs récupérés depuis GLPI`)

        // 🔽 Enrichissement avec les emails (limité pour éviter trop de requêtes)
        console.log("📧 [USERS] Enrichissement avec les emails...")
        const usersWithEmails = await Promise.all(
            data.slice(0, 50).map(async (user: any) => {
                // Limiter à 50 pour commencer
                try {
                    const emailRes = await fetch(`${GLPI_API_URL}/User/${user.id}/UserEmail`, {
                        method: "GET",
                        headers: {
                            "App-Token": GLPI_APP_TOKEN,
                            "Session-Token": GLPI_SESSION_TOKEN,
                            "Content-Type": "application/json",
                        },
                    })

                    if (emailRes.ok) {
                        const emailData = await emailRes.json()
                        const email = Array.isArray(emailData) && emailData.length > 0 ? emailData[0].email : ""
                        return { ...user, email }
                    } else {
                        return { ...user, email: "" }
                    }
                } catch (err) {
                    return { ...user, email: "" }
                }
            }),
        )

        // Ajouter les utilisateurs restants sans emails pour l'instant
        const remainingUsers = data.slice(50).map((user: any) => ({ ...user, email: "" }))
        const allUsers = [...usersWithEmails, ...remainingUsers]

        console.log(`🎉 [USERS] ${allUsers.length} utilisateurs total retournés`)

        return NextResponse.json(allUsers)
    } catch (error) {
        console.error("💥 [USERS] Erreur générale:", error)
        return NextResponse.json(
            {
                error: "Internal server error while fetching GLPI users",
                details: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 },
        )
    }
}
