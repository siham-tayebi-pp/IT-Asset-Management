import { NextResponse } from "next/server"

async function getValidSessionToken() {
    const GLPI_URL = process.env.GLPI_URL || "http://192.168.0.1/glpi"
    const APP_TOKEN = process.env.GLPI_APP_TOKEN || "ow3eeLBLEpnrS7hHN0S04a7617VMqGtYCUH9AceL"
    const USER_TOKEN = process.env.GLPI_USER_TOKEN || "your_user_token_here"

    try {
        console.log("🔐 [CREATE-MANAGER] Génération d'un nouveau token de session...")
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
            console.log("✅ [CREATE-MANAGER] Nouveau token généré")
            return sessionData.session_token
        } else {
            const errorText = await initResponse.text()
            console.error("❌ [CREATE-MANAGER] Échec génération token:", errorText)
            return null
        }
    } catch (error) {
        console.error("💥 [CREATE-MANAGER] Erreur génération token:", error)
        return null
    }
}

export async function POST(request: Request) {
    try {
        const userData = await request.json()
        const GLPI_URL = process.env.GLPI_URL || "http://192.168.0.1/glpi"
        const APP_TOKEN = process.env.GLPI_APP_TOKEN || "ow3eeLBLEpnrS7hHN0S04a7617VMqGtYCUH9AceL"
        let SESSION_TOKEN = process.env.GLPI_SESSION_TOKEN || "c6dq7c52jnv6tsr2f47i2lsq1k"

        console.log("👤 [CREATE-MANAGER] Création d'un nouveau manager Super-Admin:", {
            username: userData.username,
            firstname: userData.firstname,
            lastname: userData.lastname,
            profileId: userData.profileId,
        })

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
                comment: userData.comments || `Manager Super-Admin créé via API - ${new Date().toISOString()}`,
                begin_date: userData.validFrom || null,
                end_date: userData.validUntil || null,
            },
        }

        console.log("📋 [CREATE-MANAGER] Données GLPI préparées:", glpiUserData)

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
            console.log("🔄 [CREATE-MANAGER] Token invalide, régénération...")
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
            console.error("❌ [CREATE-MANAGER] Erreur création utilisateur:", errorText)
            return NextResponse.json({
                success: false,
                error: `Erreur lors de la création: ${createResponse.status} - ${errorText}`,
            })
        }

        const result = await createResponse.json()
        console.log("✅ [CREATE-MANAGER] Utilisateur créé avec ID:", result.id)

        // Ajouter l'email si fourni
        if (userData.email && result.id) {
            try {
                console.log("📧 [CREATE-MANAGER] Ajout de l'email...")
                const emailResponse = await fetch(`${GLPI_URL}/apirest.php/UserEmail`, {
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

                if (emailResponse.ok) {
                    console.log("✅ [CREATE-MANAGER] Email ajouté avec succès")
                } else {
                    console.warn("⚠️ [CREATE-MANAGER] Erreur ajout email:", await emailResponse.text())
                }
            } catch (emailError) {
                console.warn("⚠️ [CREATE-MANAGER] Erreur ajout email:", emailError)
            }
        }

        // Assigner le profil Super-Admin OBLIGATOIREMENT
        if (userData.profileId && result.id) {
            try {
                console.log(`🔐 [CREATE-MANAGER] Attribution du profil Super-Admin ${userData.profileId}...`)
                const profileResponse = await fetch(`${GLPI_URL}/apirest.php/Profile_User`, {
                    method: "POST",
                    headers: {
                        "App-Token": APP_TOKEN,
                        "Session-Token": SESSION_TOKEN,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        input: {
                            users_id: result.id,
                            profiles_id: Number.parseInt(userData.profileId),
                            entities_id: 0, // Entité racine
                            is_recursive: 1,
                            is_dynamic: 0,
                        },
                    }),
                })

                if (profileResponse.ok) {
                    const profileResult = await profileResponse.json()
                    console.log("✅ [CREATE-MANAGER] Profil Super-Admin assigné:", profileResult)
                } else {
                    const profileError = await profileResponse.text()
                    console.error("❌ [CREATE-MANAGER] Erreur attribution profil:", profileError)

                    // Si l'attribution du profil échoue, supprimer l'utilisateur créé
                    await fetch(`${GLPI_URL}/apirest.php/User/${result.id}`, {
                        method: "DELETE",
                        headers: {
                            "App-Token": APP_TOKEN,
                            "Session-Token": SESSION_TOKEN,
                            "Content-Type": "application/json",
                        },
                    })

                    return NextResponse.json({
                        success: false,
                        error: `Impossible d'attribuer le profil Super-Admin. Utilisateur supprimé. Erreur: ${profileError}`,
                    })
                }
            } catch (profileError) {
                console.error("💥 [CREATE-MANAGER] Erreur attribution profil:", profileError)
                return NextResponse.json({
                    success: false,
                    error: "Erreur lors de l'attribution du profil Super-Admin",
                })
            }
        } else {
            // Si pas de profil spécifié, supprimer l'utilisateur
            await fetch(`${GLPI_URL}/apirest.php/User/${result.id}`, {
                method: "DELETE",
                headers: {
                    "App-Token": APP_TOKEN,
                    "Session-Token": SESSION_TOKEN,
                    "Content-Type": "application/json",
                },
            })

            return NextResponse.json({
                success: false,
                error: "Profil Super-Admin obligatoire pour créer un manager",
            })
        }

        console.log("🎉 [CREATE-MANAGER] Manager Super-Admin créé avec succès!")
        return NextResponse.json({
            success: true,
            message: "Manager Super-Admin créé avec succès",
            userId: result.id,
            user: result,
        })
    } catch (error) {
        console.error("💥 [CREATE-MANAGER] Erreur générale:", error)
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
