import { NextResponse } from "next/server"

async function getValidSessionToken() {
    const GLPI_URL = process.env.GLPI_URL || "http://192.168.0.1/glpi"
    const APP_TOKEN = process.env.GLPI_APP_TOKEN || "ow3eeLBLEpnrS7hHN0S04a7617VMqGtYCUH9AceL"
    const USER_TOKEN = process.env.GLPI_USER_TOKEN || "your_user_token_here"

    try {
        console.log("🔐 [EDIT-MANAGER] Génération d'un nouveau token de session...")
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
            console.log("✅ [EDIT-MANAGER] Nouveau token généré")
            return sessionData.session_token
        } else {
            const errorText = await initResponse.text()
            console.error("❌ [EDIT-MANAGER] Échec génération token:", errorText)
            return null
        }
    } catch (error) {
        console.error("💥 [EDIT-MANAGER] Erreur génération token:", error)
        return null
    }
}

export async function POST(request: Request) {
    try {
        const { managerId, profileId, comments } = await request.json()
        const GLPI_URL = process.env.GLPI_URL || "http://192.168.0.1/glpi"
        const APP_TOKEN = process.env.GLPI_APP_TOKEN || "ow3eeLBLEpnrS7hHN0S04a7617VMqGtYCUH9AceL"
        let SESSION_TOKEN = process.env.GLPI_SESSION_TOKEN || "c6dq7c52jnv6tsr2f47i2lsq1k"

        console.log("✏️ [EDIT-MANAGER] Modification du profil du manager:", {
            managerId,
            newProfileId: profileId,
            comments,
        })

        if (!managerId || !profileId) {
            return NextResponse.json({
                success: false,
                error: "managerId et profileId sont obligatoires",
            })
        }

        // Étape 1: Vérifier que l'utilisateur existe
        let userResponse = await fetch(`${GLPI_URL}/apirest.php/User/${managerId}`, {
            method: "GET",
            headers: {
                "App-Token": APP_TOKEN,
                "Session-Token": SESSION_TOKEN,
                "Content-Type": "application/json",
            },
        })

        // Si erreur 401, régénérer le token
        if (userResponse.status === 401) {
            console.log("🔄 [EDIT-MANAGER] Token invalide, régénération...")
            const newToken = await getValidSessionToken()
            if (newToken) {
                SESSION_TOKEN = newToken
                userResponse = await fetch(`${GLPI_URL}/apirest.php/User/${managerId}`, {
                    method: "GET",
                    headers: {
                        "App-Token": APP_TOKEN,
                        "Session-Token": SESSION_TOKEN,
                        "Content-Type": "application/json",
                    },
                })
            }
        }

        if (!userResponse.ok) {
            const errorText = await userResponse.text()
            console.error("❌ [EDIT-MANAGER] Utilisateur non trouvé:", errorText)
            return NextResponse.json({
                success: false,
                error: `Utilisateur ${managerId} non trouvé dans GLPI`,
            })
        }

        const userData = await userResponse.json()
        console.log("👤 [EDIT-MANAGER] Utilisateur trouvé:", {
            id: userData.id,
            name: userData.name,
            firstname: userData.firstname,
            realname: userData.realname,
        })

        // Étape 2: Supprimer les anciens profils
        try {
            console.log("🗑️ [EDIT-MANAGER] Suppression des anciens profils...")
            const searchProfileResponse = await fetch(
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

            if (searchProfileResponse.ok) {
                const profileData = await searchProfileResponse.json()
                if (profileData.data && profileData.data.length > 0) {
                    console.log(`🔍 [EDIT-MANAGER] ${profileData.data.length} profils trouvés à supprimer`)
                    for (const relation of profileData.data) {
                        const relationId = relation[2] // ID de la relation Profile_User
                        const deleteResponse = await fetch(`${GLPI_URL}/apirest.php/Profile_User/${relationId}`, {
                            method: "DELETE",
                            headers: {
                                "App-Token": APP_TOKEN,
                                "Session-Token": SESSION_TOKEN,
                                "Content-Type": "application/json",
                            },
                        })

                        if (deleteResponse.ok) {
                            console.log(`✅ [EDIT-MANAGER] Relation profil ${relationId} supprimée`)
                        } else {
                            console.warn(`⚠️ [EDIT-MANAGER] Erreur suppression relation ${relationId}`)
                        }
                    }
                } else {
                    console.log("ℹ️ [EDIT-MANAGER] Aucun profil existant trouvé")
                }
            }
        } catch (error) {
            console.warn("⚠️ [EDIT-MANAGER] Erreur suppression anciens profils:", error)
        }

        // Étape 3: Ajouter le nouveau profil
        try {
            console.log(`🔐 [EDIT-MANAGER] Attribution du nouveau profil ${profileId}...`)
            const profileResponse = await fetch(`${GLPI_URL}/apirest.php/Profile_User`, {
                method: "POST",
                headers: {
                    "App-Token": APP_TOKEN,
                    "Session-Token": SESSION_TOKEN,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    input: {
                        users_id: Number.parseInt(managerId),
                        profiles_id: Number.parseInt(profileId),
                        entities_id: 0, // Entité racine
                        is_recursive: 1,
                        is_dynamic: 0,
                    },
                }),
            })

            if (!profileResponse.ok) {
                const profileError = await profileResponse.text()
                console.error("❌ [EDIT-MANAGER] Erreur attribution nouveau profil:", profileError)
                return NextResponse.json({
                    success: false,
                    error: `Impossible d'attribuer le nouveau profil: ${profileError}`,
                })
            }

            const profileResult = await profileResponse.json()
            console.log("✅ [EDIT-MANAGER] Nouveau profil assigné:", profileResult)
        } catch (profileError) {
            console.error("💥 [EDIT-MANAGER] Erreur attribution nouveau profil:", profileError)
            return NextResponse.json({
                success: false,
                error: "Erreur lors de l'attribution du nouveau profil",
            })
        }

        // Étape 4: Mettre à jour le commentaire de l'utilisateur si fourni
        if (comments) {
            try {
                console.log("📝 [EDIT-MANAGER] Mise à jour du commentaire...")
                const updateCommentResponse = await fetch(`${GLPI_URL}/apirest.php/User/${managerId}`, {
                    method: "PUT",
                    headers: {
                        "App-Token": APP_TOKEN,
                        "Session-Token": SESSION_TOKEN,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        input: {
                            id: Number.parseInt(managerId),
                            comment: `${userData.comment || ""}\n\nModification profil le ${new Date().toISOString()}: ${comments}`,
                        },
                    }),
                })

                if (updateCommentResponse.ok) {
                    console.log("✅ [EDIT-MANAGER] Commentaire mis à jour")
                } else {
                    console.warn("⚠️ [EDIT-MANAGER] Erreur mise à jour commentaire")
                }
            } catch (commentError) {
                console.warn("⚠️ [EDIT-MANAGER] Erreur mise à jour commentaire:", commentError)
            }
        }

        console.log("🎉 [EDIT-MANAGER] Profil du manager modifié avec succès!")
        return NextResponse.json({
            success: true,
            message: "Profil du manager modifié avec succès",
            managerId: managerId,
            newProfileId: profileId,
            timestamp: new Date().toISOString(),
        })
    } catch (error) {
        console.error("💥 [EDIT-MANAGER] Erreur générale:", error)
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
