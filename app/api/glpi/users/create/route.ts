import { NextResponse } from "next/server"

async function getValidSessionToken() {
    const GLPI_URL = process.env.GLPI_URL || "http://192.168.0.1/glpi"
    const APP_TOKEN = process.env.GLPI_APP_TOKEN || "ow3eeLBLEpnrS7hHN0S04a7617VMqGtYCUH9AceL"
    const USER_TOKEN = process.env.GLPI_USER_TOKEN || "your_user_token_here"

    try {
        const initResponse = await fetch(`${GLPI_URL}/apirest.php/initSession`, {
            method: "GET",
            headers: {
                "App-Token": APP_TOKEN,
                Authorization: `user_token ${USER_TOKEN}`,
                "Content-Type": "application/json",
            },
        })

        if (initResponse.ok) {
            const sessionData = await initResponse.json()
            return sessionData.session_token
        }
        return null
    } catch (error) {
        console.error("Erreur génération token:", error)
        return null
    }
}

export async function POST(request: Request) {
    try {
        const userData = await request.json()

        const GLPI_URL = process.env.GLPI_URL || "http://192.168.0.1/glpi"
        const APP_TOKEN = process.env.GLPI_APP_TOKEN || "ow3eeLBLEpnrS7hHN0S04a7617VMqGtYCUH9AceL"
        let SESSION_TOKEN = process.env.GLPI_SESSION_TOKEN || "c6dq7c52jnv6tsr2f47i2lsq1k"

        console.log("👤 [CREATE-USER] Création d'un nouvel utilisateur:", userData)

        // Préparer les données pour GLPI
        const glpiUserData = {
            input: {
                name: userData.username,
                realname: userData.lastname,
                firstname: userData.firstname,
                password: userData.password,
                password2: userData.confirmPassword,
                is_active: userData.isActive ? 1 : 0,
                phone: userData.phone || "",
                phone2: userData.phone2 || "",
                mobile: userData.mobile || "",
                registration_number: userData.matricule || "",
                comment: userData.comments || "",
                profiles_id: userData.profileId || 2, // Self-Service par défaut
                entities_id: userData.entityId || 0,
                begin_date: userData.validFrom || null,
                end_date: userData.validUntil || null,
            },
        }

        // Créer l'utilisateur
        let createResponse = await fetch(`${GLPI_URL}/apirest.php/User`, {
            method: "POST",
            headers: {
                "App-Token": APP_TOKEN,
                "Session-Token": SESSION_TOKEN,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(glpiUserData),
        })

        // Si erreur 401, régénérer le token
        if (createResponse.status === 401) {
            const newToken = await getValidSessionToken()
            if (newToken) {
                SESSION_TOKEN = newToken
                createResponse = await fetch(`${GLPI_URL}/apirest.php/User`, {
                    method: "POST",
                    headers: {
                        "App-Token": APP_TOKEN,
                        "Session-Token": SESSION_TOKEN,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(glpiUserData),
                })
            }
        }

        if (!createResponse.ok) {
            const errorText = await createResponse.text()
            console.error("❌ [CREATE-USER] Erreur création:", errorText)
            return NextResponse.json({
                success: false,
                error: `Erreur lors de la création: ${createResponse.status} - ${errorText}`,
            })
        }

        const result = await createResponse.json()
        console.log("✅ [CREATE-USER] Utilisateur créé:", result)

        // Si un email est fourni, l'ajouter
        if (userData.email && result.id) {
            try {
                await fetch(`${GLPI_URL}/apirest.php/UserEmail`, {
                    method: "POST",
                    headers: {
                        "App-Token": APP_TOKEN,
                        "Session-Token": SESSION_TOKEN,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        input: {
                            users_id: result.id,
                            email: userData.email,
                            is_default: 1,
                        },
                    }),
                })
            } catch (emailError) {
                console.warn("⚠️ [CREATE-USER] Erreur ajout email:", emailError)
            }
        }

        return NextResponse.json({
            success: true,
            message: "Utilisateur créé avec succès",
            userId: result.id,
            user: result,
        })
    } catch (error) {
        console.error("💥 [CREATE-USER] Erreur générale:", error)
        return NextResponse.json(
            {
                success: false,
                error: "Erreur interne du serveur",
                details: error instanceof Error ? error.message : "Erreur inconnue",
            },
            { status: 500 },
        )
    }
}
