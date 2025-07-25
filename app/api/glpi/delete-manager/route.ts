import { NextResponse } from "next/server"

async function getValidSessionToken() {
    const GLPI_URL = process.env.GLPI_URL || "http://192.168.0.1/glpi"
    const APP_TOKEN = process.env.GLPI_APP_TOKEN || "ow3eeLBLEpnrS7hHN0S04a7617VMqGtYCUH9AceL"
    const USER_TOKEN = process.env.GLPI_USER_TOKEN || "your_user_token_here"

    try {
        console.log("🔐 [DELETE-MANAGER] Génération d'un nouveau token de session...")
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
            console.log("✅ [DELETE-MANAGER] Nouveau token généré")
            return sessionData.session_token
        } else {
            const errorText = await initResponse.text()
            console.error("❌ [DELETE-MANAGER] Échec génération token:", errorText)
            return null
        }
    } catch (error) {
        console.error("💥 [DELETE-MANAGER] Erreur génération token:", error)
        return null
    }
}

export async function POST(request: Request) {
    try {
        const { managerId, reason, action = "deactivate" } = await request.json()

        if (!managerId) {
            return NextResponse.json({ error: "managerId is required" }, { status: 400 })
        }

        const GLPI_URL = process.env.GLPI_URL || "http://192.168.0.1/glpi"
        const APP_TOKEN = process.env.GLPI_APP_TOKEN || "ow3eeLBLEpnrS7hHN0S04a7617VMqGtYCUH9AceL"
        let SESSION_TOKEN = process.env.GLPI_SESSION_TOKEN || "c6dq7c52jnv6tsr2f47i2lsq1k"

        console.log(`🗑️ [DELETE-MANAGER] === DÉBUT ${action.toUpperCase()} ===`)
        console.log(`🗑️ [DELETE-MANAGER] Manager ID: ${managerId}`)
        console.log(`🎯 [DELETE-MANAGER] Action demandée: ${action}`)
        console.log(`📝 [DELETE-MANAGER] Raison: ${reason || "Aucune raison fournie"}`)

        // Étape 1: Vérifier que l'utilisateur existe AVANT action
        let userResponse = await fetch(`${GLPI_URL}/apirest.php/User/${managerId}`, {
            method: "GET",
            headers: {
                "App-Token": APP_TOKEN,
                "Session-Token": SESSION_TOKEN,
                "Content-Type": "application/json",
                "Cache-Control": "no-cache, no-store, must-revalidate",
            },
        })

        // Si erreur 401, régénérer le token
        if (userResponse.status === 401) {
            console.log("🔄 [DELETE-MANAGER] Token invalide, régénération...")
            const newToken = await getValidSessionToken()
            if (newToken) {
                SESSION_TOKEN = newToken
                userResponse = await fetch(`${GLPI_URL}/apirest.php/User/${managerId}`, {
                    method: "GET",
                    headers: {
                        "App-Token": APP_TOKEN,
                        "Session-Token": SESSION_TOKEN,
                        "Content-Type": "application/json",
                        "Cache-Control": "no-cache, no-store, must-revalidate",
                    },
                })
            }
        }

        let userData = null
        if (userResponse.ok) {
            userData = await userResponse.json()
            console.log("👤 [DELETE-MANAGER] Utilisateur trouvé:", {
                id: userData.id,
                name: userData.name,
                firstname: userData.firstname,
                realname: userData.realname,
                email: userData.email,
                is_active: userData.is_active,
            })
        } else {
            const errorText = await userResponse.text()
            console.error(`❌ [DELETE-MANAGER] Utilisateur ${managerId} non trouvé:`, errorText)
            return NextResponse.json({
                success: false,
                error: `Utilisateur ${managerId} non trouvé dans GLPI`,
            })
        }

        // Si l'utilisateur veut seulement désactiver
        if (action === "deactivate") {
            console.log(`🔄 [DELETE-MANAGER] Désactivation demandée`)
            const deactivateResponse = await fetch(`${GLPI_URL}/apirest.php/User/${managerId}`, {
                method: "PUT",
                headers: {
                    "App-Token": APP_TOKEN,
                    "Session-Token": SESSION_TOKEN,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    input: {
                        id: managerId,
                        is_active: 0,
                        comment: `${userData?.comment || ""}\n\nDésactivé via API le ${new Date().toISOString()} - Raison: ${reason || "Désactivation demandée"}`,
                    },
                }),
            })

            console.log(`📊 [DELETE-MANAGER] Status de désactivation: ${deactivateResponse.status}`)
            const deactivateResponseText = await deactivateResponse.text()

            if (deactivateResponse.ok) {
                console.log("✅ [DELETE-MANAGER] Utilisateur désactivé avec succès")
                return NextResponse.json({
                    success: true,
                    message: "Manager désactivé avec succès",
                    action: "deactivated",
                    deletedManager: {
                        id: managerId,
                        name: userData ? `${userData.firstname} ${userData.realname}` : `User ${managerId}`,
                        username: userData?.name || "unknown",
                    },
                    reason: reason,
                    timestamp: new Date().toISOString(),
                })
            } else {
                console.error("❌ [DELETE-MANAGER] Échec désactivation:", deactivateResponseText)
                return NextResponse.json({
                    success: false,
                    error: `Impossible de désactiver le manager: ${deactivateResponse.status}`,
                    details: deactivateResponseText,
                })
            }
        }

        // Si l'utilisateur veut supprimer définitivement
        if (action === "delete") {
            console.log(`🗑️ [DELETE-MANAGER] Suppression définitive demandée`)

            // D'abord, supprimer les relations Profile_User
            try {
                console.log("🔗 [DELETE-MANAGER] Suppression des relations profils...")
                const profileUserResponse = await fetch(
                    `${GLPI_URL}/apirest.php/search/Profile_User?criteria[0][field]=2&criteria[0][searchtype]=equals&criteria[0][value]=${managerId}`,
                    {
                        method: "GET",
                        headers: {
                            "App-Token": APP_TOKEN,
                            "Session-Token": SESSION_TOKEN,
                            "Content-Type": "application/json",
                        },
                    },
                )

                if (profileUserResponse.ok) {
                    const profileUserData = await profileUserResponse.json()
                    if (profileUserData.data && profileUserData.data.length > 0) {
                        for (const relation of profileUserData.data) {
                            await fetch(`${GLPI_URL}/apirest.php/Profile_User/${relation[2]}`, {
                                method: "DELETE",
                                headers: {
                                    "App-Token": APP_TOKEN,
                                    "Session-Token": SESSION_TOKEN,
                                    "Content-Type": "application/json",
                                },
                            })
                        }
                        console.log("✅ [DELETE-MANAGER] Relations profils supprimées")
                    }
                }
            } catch (error) {
                console.warn("⚠️ [DELETE-MANAGER] Erreur suppression relations profils:", error)
            }

            // Ensuite, supprimer l'utilisateur
            const deleteResponse = await fetch(`${GLPI_URL}/apirest.php/User/${managerId}?force_purge=true`, {
                method: "DELETE",
                headers: {
                    "App-Token": APP_TOKEN,
                    "Session-Token": SESSION_TOKEN,
                    "Content-Type": "application/json",
                },
            })

            console.log(`📊 [DELETE-MANAGER] Status de suppression: ${deleteResponse.status}`)
            const deleteResponseText = await deleteResponse.text()

            // Vérifier le résultat après suppression
            await new Promise((resolve) => setTimeout(resolve, 1000))
            const verifyResponse = await fetch(`${GLPI_URL}/apirest.php/User/${managerId}`, {
                method: "GET",
                headers: {
                    "App-Token": APP_TOKEN,
                    "Session-Token": SESSION_TOKEN,
                    "Content-Type": "application/json",
                    "Cache-Control": "no-cache, no-store, must-revalidate",
                },
            })

            if (verifyResponse.status === 404) {
                console.log("✅ [DELETE-MANAGER] Suppression définitive réussie")
                return NextResponse.json({
                    success: true,
                    message: "Manager supprimé définitivement avec succès",
                    action: "deleted",
                    deletedManager: {
                        id: managerId,
                        name: userData ? `${userData.firstname} ${userData.realname}` : `User ${managerId}`,
                        username: userData?.name || "unknown",
                    },
                    reason: reason,
                    timestamp: new Date().toISOString(),
                })
            } else if (verifyResponse.ok) {
                const stillExists = await verifyResponse.json()
                console.error("❌ [DELETE-MANAGER] Suppression échouée, utilisateur existe encore")

                // Fallback: désactiver l'utilisateur
                const fallbackResponse = await fetch(`${GLPI_URL}/apirest.php/User/${managerId}`, {
                    method: "PUT",
                    headers: {
                        "App-Token": APP_TOKEN,
                        "Session-Token": SESSION_TOKEN,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        input: {
                            id: managerId,
                            is_active: 0,
                            comment: `${userData?.comment || ""}\n\nTentative de suppression échouée, utilisateur désactivé le ${new Date().toISOString()} - Raison: ${reason || "Suppression impossible"}`,
                        },
                    }),
                })

                if (fallbackResponse.ok) {
                    return NextResponse.json({
                        success: true,
                        message: "Suppression impossible, utilisateur désactivé à la place",
                        action: "deactivated_fallback",
                        deletedManager: {
                            id: managerId,
                            name: userData ? `${userData.firstname} ${userData.realname}` : `User ${managerId}`,
                            username: userData?.name || "unknown",
                        },
                        reason: reason,
                        note: "La suppression complète n'est pas possible, mais l'utilisateur est désactivé",
                        timestamp: new Date().toISOString(),
                    })
                }

                return NextResponse.json({
                    success: false,
                    error: "La suppression définitive a échoué - l'utilisateur existe encore dans GLPI",
                    details: {
                        suggestion: "L'utilisateur pourrait être référencé ailleurs dans GLPI ou avoir des permissions spéciales",
                        userStillExists: {
                            id: stillExists.id,
                            name: stillExists.name,
                            is_active: stillExists.is_active,
                        },
                    },
                })
            } else {
                // Si on ne peut pas vérifier mais DELETE a retourné OK
                if (deleteResponse.ok) {
                    return NextResponse.json({
                        success: true,
                        message: "Manager probablement supprimé (vérification impossible)",
                        action: "deleted_unverified",
                        deletedManager: {
                            id: managerId,
                            name: userData ? `${userData.firstname} ${userData.realname}` : `User ${managerId}`,
                            username: userData?.name || "unknown",
                        },
                        reason: reason,
                        timestamp: new Date().toISOString(),
                    })
                }
            }

            return NextResponse.json({
                success: false,
                error: `Impossible de supprimer définitivement le manager: ${deleteResponse.status}`,
                details: deleteResponseText,
            })
        }

        // Si aucune action valide
        return NextResponse.json({
            success: false,
            error: "Action non reconnue. Utilisez 'deactivate' ou 'delete'",
        })
    } catch (error) {
        console.error("💥 [DELETE-MANAGER] Erreur générale:", error)
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
