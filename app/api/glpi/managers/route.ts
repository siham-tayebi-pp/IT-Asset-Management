import { NextResponse } from "next/server"

async function getValidSessionToken() {
    const GLPI_URL = process.env.GLPI_URL || "http://192.168.0.1/glpi"
    const APP_TOKEN = process.env.GLPI_APP_TOKEN || "ow3eeLBLEpnrS7hHN0S04a7617VMqGtYCUH9AceL"
    const USER_TOKEN = process.env.GLPI_USER_TOKEN || "your_user_token_here"

    try {
        console.log("🔐 [MANAGERS] Génération d'un nouveau token de session...")

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
            console.log("✅ [MANAGERS] Nouveau token généré")
            return sessionData.session_token
        } else {
            const errorText = await initResponse.text()
            console.error("❌ [MANAGERS] Échec génération token:", errorText)
            return null
        }
    } catch (error) {
        console.error("💥 [MANAGERS] Erreur génération token:", error)
        return null
    }
}

export async function GET(request: Request) {
    try {
        // Récupérer le timestamp de la requête pour éviter le cache
        const { searchParams } = new URL(request.url)
        const timestamp = searchParams.get("t") || new Date().getTime()

        const GLPI_URL = process.env.GLPI_URL || "http://192.168.0.1/glpi"
        const APP_TOKEN = process.env.GLPI_APP_TOKEN || "ow3eeLBLEpnrS7hHN0S04a7617VMqGtYCUH9AceL"
        let SESSION_TOKEN = process.env.GLPI_SESSION_TOKEN || "c6dq7c52jnv6tsr2f47i2lsq1k"

        console.log("👥 [MANAGERS] Récupération des managers Super-Admin uniquement...")
        console.log("🕐 [MANAGERS] Timestamp requête:", timestamp)
        console.log("🕐 [MANAGERS] Timestamp serveur:", new Date().toISOString())

        // Étape 1: Récupérer tous les profils avec range étendu et no-cache
        let profilesResponse = await fetch(`${GLPI_URL}/apirest.php/Profile?range=0-999`, {
            method: "GET",
            headers: {
                "App-Token": APP_TOKEN,
                "Session-Token": SESSION_TOKEN,
                "Content-Type": "application/json",
                "Cache-Control": "no-cache, no-store, must-revalidate",
                Pragma: "no-cache",
            },
        })

        // Si erreur 401, régénérer le token
        if (profilesResponse.status === 401) {
            console.log("🔄 [MANAGERS] Token invalide, régénération...")
            const newToken = await getValidSessionToken()
            if (newToken) {
                SESSION_TOKEN = newToken
                profilesResponse = await fetch(`${GLPI_URL}/apirest.php/Profile?range=0-999`, {
                    method: "GET",
                    headers: {
                        "App-Token": APP_TOKEN,
                        "Session-Token": SESSION_TOKEN,
                        "Content-Type": "application/json",
                        "Cache-Control": "no-cache, no-store, must-revalidate",
                        Pragma: "no-cache",
                    },
                })
            }
        }

        if (!profilesResponse.ok) {
            const errorText = await profilesResponse.text()
            console.error("❌ [MANAGERS] Erreur récupération profils:", profilesResponse.status, errorText)
            return NextResponse.json({
                success: false,
                error: `Impossible de récupérer les profils GLPI: ${profilesResponse.status}`,
                managers: [],
            })
        }

        const profiles = await profilesResponse.json()
        console.log("📋 [MANAGERS] Profils récupérés:", profiles.length)

        // Étape 2: Trouver EXACTEMENT le profil "Super-Admin"
        const superAdminProfile = profiles.find((profile: any) => {
            const profileName = (profile.name || "").toLowerCase().trim()
            return profileName === "super-admin" || profileName === "super admin" || profile.name === "Super-Admin"
        })

        if (!superAdminProfile) {
            console.warn("⚠️ [MANAGERS] Profil 'Super-Admin' exact non trouvé")
            return NextResponse.json({
                success: false,
                error: "Profil 'Super-Admin' non trouvé dans GLPI",
                managers: [],
                availableProfiles: profiles.map((p: any) => ({ id: p.id, name: p.name })),
            })
        }

        console.log("✅ [MANAGERS] Profil Super-Admin trouvé:", {
            id: superAdminProfile.id,
            name: superAdminProfile.name,
        })

        // Étape 3: Récupérer TOUTES les associations Profile_User avec no-cache
        const profileUsersResponse = await fetch(`${GLPI_URL}/apirest.php/Profile_User?range=0-9999`, {
            method: "GET",
            headers: {
                "App-Token": APP_TOKEN,
                "Session-Token": SESSION_TOKEN,
                "Content-Type": "application/json",
                "Cache-Control": "no-cache, no-store, must-revalidate",
                Pragma: "no-cache",
            },
        })

        if (!profileUsersResponse.ok) {
            const errorText = await profileUsersResponse.text()
            console.error("❌ [MANAGERS] Erreur récupération Profile_User:", errorText)
            return NextResponse.json({
                success: false,
                error: `Impossible de récupérer les associations profil-utilisateur: ${profileUsersResponse.status}`,
                managers: [],
            })
        }

        const profileUsers = await profileUsersResponse.json()
        console.log("🔗 [MANAGERS] TOUTES les associations Profile_User récupérées:", profileUsers.length)

        // Étape 4: Filtrer uniquement les utilisateurs avec le profil Super-Admin
        const superAdminUserIds = profileUsers
            .filter((pu: any) => {
                const match = pu.profiles_id === superAdminProfile.id
                if (match) {
                    console.log(
                        `✅ [MANAGERS] Association Super-Admin trouvée: user_id=${pu.users_id}, profile_id=${pu.profiles_id}`,
                    )
                }
                return match
            })
            .map((pu: any) => pu.users_id)

        console.log("👤 [MANAGERS] TOUS les IDs utilisateurs Super-Admin:", superAdminUserIds)
        console.log("📊 [MANAGERS] Nombre d'utilisateurs Super-Admin trouvés:", superAdminUserIds.length)

        if (superAdminUserIds.length === 0) {
            return NextResponse.json({
                success: true,
                managers: [],
                message: `Aucun utilisateur avec profil 'Super-Admin' trouvé`,
                timestamp: new Date().toISOString(),
            })
        }

        // Étape 5: Récupérer les détails de TOUS les utilisateurs Super-Admin avec no-cache
        const managers = []
        console.log(`🔄 [MANAGERS] Récupération des détails pour ${superAdminUserIds.length} utilisateurs Super-Admin...`)

        for (const userId of superAdminUserIds) {
            try {
                console.log(`👤 [MANAGERS] Récupération utilisateur Super-Admin ID: ${userId}`)
                const userResponse = await fetch(`${GLPI_URL}/apirest.php/User/${userId}`, {
                    method: "GET",
                    headers: {
                        "App-Token": APP_TOKEN,
                        "Session-Token": SESSION_TOKEN,
                        "Content-Type": "application/json",
                        "Cache-Control": "no-cache, no-store, must-revalidate",
                        Pragma: "no-cache",
                    },
                })

                if (userResponse.ok) {
                    const userData = await userResponse.json()
                    console.log(`✅ [MANAGERS] Utilisateur Super-Admin ${userId} récupéré:`, {
                        id: userData.id,
                        name: userData.name,
                        firstname: userData.firstname,
                        realname: userData.realname,
                        email: userData.email,
                        is_active: userData.is_active,
                    })

                    managers.push({
                        id: userData.id,
                        name:
                            userData.firstname && userData.realname
                                ? `${userData.firstname} ${userData.realname}`
                                : userData.name || `User ${userData.id}`,
                        username: userData.name || `user_${userData.id}`,
                        email: userData.email || "N/A",
                        department: userData.groups_id || "N/A",
                        status: userData.is_active ? "Active" : "Inactive",
                        phone: userData.phone || "N/A",
                        location: userData.locations_id || "N/A",
                        lastLogin: userData.last_login || "N/A",
                        profileName: superAdminProfile.name,
                        profileId: superAdminProfile.id,
                    })
                } else {
                    const errorText = await userResponse.text()
                    console.error(
                        `❌ [MANAGERS] Erreur récupération utilisateur Super-Admin ${userId}: ${userResponse.status} - ${errorText}`,
                    )
                }
            } catch (error) {
                console.error(`💥 [MANAGERS] Exception utilisateur Super-Admin ${userId}:`, error)
            }
        }

        console.log("🎉 [MANAGERS] TOUS les managers Super-Admin récupérés:", managers.length)
        console.log(
            "📋 [MANAGERS] Liste finale des Super-Admin:",
            managers.map((m) => ({ id: m.id, name: m.name, username: m.username })),
        )

        // Retourner avec headers no-cache
        const response = NextResponse.json({
            success: true,
            managers: managers,
            count: managers.length,
            superAdminProfileId: superAdminProfile.id,
            superAdminProfileName: superAdminProfile.name,
            timestamp: new Date().toISOString(),
            requestTimestamp: timestamp,
            method: "super_admin_exact_match_no_cache",
        })

        // Ajouter headers no-cache à la réponse
        response.headers.set("Cache-Control", "no-cache, no-store, must-revalidate")
        response.headers.set("Pragma", "no-cache")
        response.headers.set("Expires", "0")
        response.headers.set("Last-Modified", new Date().toUTCString())

        return response
    } catch (error) {
        console.error("💥 [MANAGERS] Erreur générale:", error)
        return NextResponse.json(
            {
                success: false,
                error: "Erreur interne du serveur",
                managers: [],
                details: error instanceof Error ? error.message : "Erreur inconnue",
                timestamp: new Date().toISOString(),
            },
            { status: 500 },
        )
    }
}
