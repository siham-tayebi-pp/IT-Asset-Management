import { type NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
    const { NEXT_PUBLIC_GLPI_URL, NEXT_PUBLIC_GLPI_APP_TOKEN, NEXT_PUBLIC_GLPI_USER_TOKEN } = process.env

    if (!NEXT_PUBLIC_GLPI_URL || !NEXT_PUBLIC_GLPI_APP_TOKEN || !NEXT_PUBLIC_GLPI_USER_TOKEN) {
        return NextResponse.json(
            {
                error: "Variables d'environnement manquantes",
                success: false,
                users: [],
                total: 0,
            },
            { status: 500 },
        )
    }

    let sessionToken: string | null = null

    try {
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
            const error = await sessionRes.text()
            return NextResponse.json(
                {
                    error: "Erreur session GLPI",
                    details: error,
                    success: false,
                    users: [],
                    total: 0,
                },
                { status: 500 },
            )
        }

        const sessionData = await sessionRes.json()
        sessionToken = sessionData.session_token

        // Récupérer les utilisateurs
        const usersRes = await fetch(`${NEXT_PUBLIC_GLPI_URL}User?range=0-1000&expand_dropdowns=true`, {
            headers: {
                "Content-Type": "application/json",
                "Session-Token": sessionToken,
                "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN,
            },
        })

        if (!usersRes.ok) {
            const error = await usersRes.text()
            return NextResponse.json(
                {
                    error: "Erreur récupération utilisateurs",
                    details: error,
                    success: false,
                    users: [],
                    total: 0,
                },
                { status: 500 },
            )
        }

        const users = await usersRes.json()

        // 🔽 Enrichissement avec les emails (optionnel)
        const usersWithEmails = await Promise.all(
            users.map(async (user: any) => {
                try {
                    const emailRes = await fetch(`${NEXT_PUBLIC_GLPI_URL}User/${user.id}/UserEmail`, {
                        method: "GET",
                        headers: {
                            "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN,
                            "Session-Token": sessionToken!,
                            "Content-Type": "application/json",
                        },
                    })

                    if (emailRes.ok) {
                        const emailData = await emailRes.json()
                        const email = Array.isArray(emailData) && emailData.length > 0 ? emailData[0].email : ""
                        return { ...user, email }
                    }

                    return { ...user, email: "" }
                } catch (err) {
                    console.error(`Erreur récupération email pour user ${user.id}`, err)
                    return { ...user, email: "" }
                }
            }),
        )

        // Filtrer les utilisateurs actifs
        const activeUsers = usersWithEmails.filter((user: any) => user.is_active === 1)

        return NextResponse.json({
            success: true,
            users: activeUsers,
            total: activeUsers.length,
            // Format original pour rétrocompatibilité
            data: usersWithEmails,
        })
    } catch (error) {
        console.error("Erreur générale:", error)
        return NextResponse.json(
            {
                error: "Erreur interne",
                success: false,
                users: [],
                total: 0,
            },
            { status: 500 },
        )
    } finally {
        if (sessionToken) {
            try {
                await fetch(`${NEXT_PUBLIC_GLPI_URL}killSession`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Session-Token": sessionToken,
                        "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN,
                    },
                })
            } catch (e) {
                console.error("Erreur killSession:", e)
            }
        }
    }
}
