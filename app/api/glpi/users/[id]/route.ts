import { NextResponse } from "next/server"

async function getValidSessionToken() {
    const GLPI_API_URL = process.env.GLPI_API_URL
    const GLPI_APP_TOKEN = process.env.GLPI_APP_TOKEN
    const USER_TOKEN = process.env.GLPI_USER_TOKEN

    try {
        console.log("🔐 [DELETE-USER] Génération d'un nouveau token...")
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
            console.log("✅ [DELETE-USER] Nouveau token généré")
            return sessionData.session_token
        }
        return null
    } catch (error) {
        console.error("❌ [DELETE-USER] Erreur génération token:", error)
        return null
    }
}

// PUT - Modifier un utilisateur
export async function PUT(request: Request, { params }: { params: { id: string } }) {
    try {
        const userData = await request.json()
        const userId = params.id

        const GLPI_API_URL = process.env.GLPI_API_URL
        const GLPI_APP_TOKEN = process.env.GLPI_APP_TOKEN
        let GLPI_SESSION_TOKEN = process.env.GLPI_SESSION_TOKEN

        console.log(`✏️ [UPDATE-USER] Modification utilisateur ${userId}:`, userData)

        const glpiUserData = {
            input: {
                id: Number.parseInt(userId),
                name: userData.username,
                realname: userData.lastname,
                firstname: userData.firstname,
                is_active: userData.isActive ? 1 : 0,
                phone: userData.phone || "",
                phone2: userData.phone2 || "",
                mobile: userData.mobile || "",
                registration_number: userData.matricule || "",
                comment: userData.comments || "",
            },
        }

        // Si un mot de passe est fourni
        if (userData.password) {
            glpiUserData.input.password = userData.password
            glpiUserData.input.password2 = userData.confirmPassword
        }

        let updateResponse = await fetch(`${GLPI_API_URL}/User/${userId}`, {
            method: "PUT",
            headers: {
                "App-Token": GLPI_APP_TOKEN,
                "Session-Token": GLPI_SESSION_TOKEN,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(glpiUserData),
        })

        if (updateResponse.status === 401) {
            const newToken = await getValidSessionToken()
            if (newToken) {
                GLPI_SESSION_TOKEN = newToken
                updateResponse = await fetch(`${GLPI_API_URL}/User/${userId}`, {
                    method: "PUT",
                    headers: {
                        "App-Token": GLPI_APP_TOKEN,
                        "Session-Token": GLPI_SESSION_TOKEN,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(glpiUserData),
                })
            }
        }

        if (!updateResponse.ok) {
            const errorText = await updateResponse.text()
            console.error("❌ [UPDATE-USER] Erreur modification:", errorText)
            return NextResponse.json({
                success: false,
                error: `Erreur lors de la modification: ${updateResponse.status}`,
            })
        }

        // Mettre à jour l'email si fourni
        if (userData.email) {
            try {
                // D'abord, récupérer les emails existants
                const emailsResponse = await fetch(`${GLPI_API_URL}/User/${userId}/UserEmail`, {
                    method: "GET",
                    headers: {
                        "App-Token": GLPI_APP_TOKEN,
                        "Session-Token": GLPI_SESSION_TOKEN,
                        "Content-Type": "application/json",
                    },
                })

                if (emailsResponse.ok) {
                    const existingEmails = await emailsResponse.json()

                    if (Array.isArray(existingEmails) && existingEmails.length > 0) {
                        // Mettre à jour l'email existant
                        await fetch(`${GLPI_API_URL}/UserEmail/${existingEmails[0].id}`, {
                            method: "PUT",
                            headers: {
                                "App-Token": GLPI_APP_TOKEN,
                                "Session-Token": GLPI_SESSION_TOKEN,
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                                input: {
                                    id: existingEmails[0].id,
                                    email: userData.email,
                                },
                            }),
                        })
                    } else {
                        // Créer un nouvel email
                        await fetch(`${GLPI_API_URL}/UserEmail`, {
                            method: "POST",
                            headers: {
                                "App-Token": GLPI_APP_TOKEN,
                                "Session-Token": GLPI_SESSION_TOKEN,
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                                input: {
                                    users_id: Number.parseInt(userId),
                                    email: userData.email,
                                    is_default: 1,
                                },
                            }),
                        })
                    }
                }
            } catch (emailError) {
                console.warn("⚠️ [UPDATE-USER] Erreur mise à jour email:", emailError)
            }
        }

        console.log("✅ [UPDATE-USER] Utilisateur modifié avec succès")

        return NextResponse.json({
            success: true,
            message: "Utilisateur modifié avec succès",
        })
    } catch (error) {
        console.error("💥 [UPDATE-USER] Erreur générale:", error)
        return NextResponse.json(
            {
                success: false,
                error: "Erreur interne du serveur",
            },
            { status: 500 },
        )
    }
}

// DELETE - Supprimer un utilisateur (CORRIGÉ)
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    try {
        const userId = params.id

        const GLPI_API_URL = process.env.GLPI_API_URL
        const GLPI_APP_TOKEN = process.env.GLPI_APP_TOKEN
        let GLPI_SESSION_TOKEN = process.env.GLPI_SESSION_TOKEN

        console.log(`🗑️ [DELETE-USER] === DÉBUT SUPPRESSION ===`)
        console.log(`🗑️ [DELETE-USER] User ID: ${userId}`)
        console.log(`🔗 [DELETE-USER] API URL: ${GLPI_API_URL}`)
        console.log(`🎫 [DELETE-USER] APP TOKEN: ${GLPI_APP_TOKEN ? "✅ Défini" : "❌ Manquant"}`)
        console.log(`🔑 [DELETE-USER] SESSION TOKEN: ${GLPI_SESSION_TOKEN ? "✅ Défini" : "❌ Manquant"}`)

        if (!GLPI_API_URL || !GLPI_APP_TOKEN || !GLPI_SESSION_TOKEN) {
            return NextResponse.json({
                success: false,
                error: "Variables d'environnement GLPI manquantes",
            })
        }

        // Étape 1: Vérifier que l'utilisateur existe AVANT suppression
        const checkUrl = `${GLPI_API_URL}/User/${userId}`
        console.log(`🔍 [DELETE-USER] Vérification existence: ${checkUrl}`)

        let userResponse = await fetch(checkUrl, {
            method: "GET",
            headers: {
                "App-Token": GLPI_APP_TOKEN,
                "Session-Token": GLPI_SESSION_TOKEN,
                "Content-Type": "application/json",
            },
        })

        console.log(`📊 [DELETE-USER] Status vérification: ${userResponse.status}`)

        // Si erreur 401, régénérer le token
        if (userResponse.status === 401) {
            console.log("🔄 [DELETE-USER] Token invalide, régénération...")
            const newToken = await getValidSessionToken()
            if (newToken) {
                GLPI_SESSION_TOKEN = newToken
                userResponse = await fetch(checkUrl, {
                    method: "GET",
                    headers: {
                        "App-Token": GLPI_APP_TOKEN,
                        "Session-Token": GLPI_SESSION_TOKEN,
                        "Content-Type": "application/json",
                    },
                })
                console.log(`📊 [DELETE-USER] Status après nouveau token: ${userResponse.status}`)
            }
        }

        let userData = null
        if (userResponse.ok) {
            userData = await userResponse.json()
            console.log("👤 [DELETE-USER] Utilisateur trouvé:", {
                id: userData.id,
                name: userData.name,
                firstname: userData.firstname,
                realname: userData.realname,
                is_active: userData.is_active,
            })
        } else {
            const errorText = await userResponse.text()
            console.error(`❌ [DELETE-USER] Utilisateur ${userId} non trouvé:`, errorText)
            return NextResponse.json({
                success: false,
                error: `Utilisateur ${userId} non trouvé dans GLPI`,
            })
        }

        // Étape 2: Tentative de suppression
        const deleteUrl = `${GLPI_API_URL}/User/${userId}`
        console.log(`🗑️ [DELETE-USER] URL de suppression: ${deleteUrl}`)

        const deleteResponse = await fetch(deleteUrl, {
            method: "DELETE",
            headers: {
                "App-Token": GLPI_APP_TOKEN,
                "Session-Token": GLPI_SESSION_TOKEN,
                "Content-Type": "application/json",
            },
        })

        console.log(`📊 [DELETE-USER] Status suppression: ${deleteResponse.status}`)
        const deleteResponseText = await deleteResponse.text()
        console.log(`📄 [DELETE-USER] Réponse suppression:`, deleteResponseText)

        if (!deleteResponse.ok) {
            console.error(`❌ [DELETE-USER] Erreur suppression: ${deleteResponse.status} - ${deleteResponseText}`)

            // Si la suppression échoue, essayer de désactiver l'utilisateur
            console.log(`🔄 [DELETE-USER] Suppression échouée, tentative de désactivation...`)

            const deactivateResponse = await fetch(`${GLPI_API_URL}/User/${userId}`, {
                method: "PUT",
                headers: {
                    "App-Token": GLPI_APP_TOKEN,
                    "Session-Token": GLPI_SESSION_TOKEN,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    input: {
                        id: Number.parseInt(userId),
                        is_active: 0,
                        comment: `Désactivé via suppression - ${new Date().toISOString()}`,
                    },
                }),
            })

            if (deactivateResponse.ok) {
                console.log("✅ [DELETE-USER] Utilisateur désactivé avec succès")
                return NextResponse.json({
                    success: true,
                    message: "Utilisateur désactivé avec succès (suppression impossible)",
                    action: "deactivated",
                })
            } else {
                const deactivateError = await deactivateResponse.text()
                console.error("❌ [DELETE-USER] Échec désactivation:", deactivateError)
                return NextResponse.json({
                    success: false,
                    error: `Impossible de supprimer ou désactiver l'utilisateur: ${deleteResponse.status}`,
                    details: deleteResponseText,
                })
            }
        }

        // Étape 3: Vérifier que la suppression a réussi
        console.log(`🔍 [DELETE-USER] Vérification post-suppression...`)
        await new Promise((resolve) => setTimeout(resolve, 1000)) // Attendre 1 seconde

        const verifyResponse = await fetch(checkUrl, {
            method: "GET",
            headers: {
                "App-Token": GLPI_APP_TOKEN,
                "Session-Token": GLPI_SESSION_TOKEN,
                "Content-Type": "application/json",
            },
        })

        console.log(`🔍 [DELETE-USER] Status vérification finale: ${verifyResponse.status}`)

        if (verifyResponse.status === 404) {
            console.log("✅ [DELETE-USER] SUCCÈS: Utilisateur vraiment supprimé")
            return NextResponse.json({
                success: true,
                message: "Utilisateur supprimé avec succès",
                action: "deleted",
            })
        } else if (verifyResponse.ok) {
            const stillExists = await verifyResponse.json()
            console.warn("⚠️ [DELETE-USER] Utilisateur existe encore:", stillExists)

            if (stillExists.is_active === 0) {
                return NextResponse.json({
                    success: true,
                    message: "Utilisateur désactivé (suppression complète impossible)",
                    action: "deactivated",
                })
            } else {
                return NextResponse.json({
                    success: false,
                    error: "La suppression a échoué - l'utilisateur existe encore et est actif",
                })
            }
        } else {
            // Si on ne peut pas vérifier mais DELETE a retourné OK
            console.log("✅ [DELETE-USER] Suppression probablement réussie")
            return NextResponse.json({
                success: true,
                message: "Utilisateur probablement supprimé",
                action: "deleted_unverified",
            })
        }
    } catch (error) {
        console.error("💥 [DELETE-USER] Erreur générale:", error)
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
