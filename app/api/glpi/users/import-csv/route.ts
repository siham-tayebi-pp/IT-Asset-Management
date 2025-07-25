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
        const { users } = await request.json()

        if (!users || !Array.isArray(users) || users.length === 0) {
            return NextResponse.json({
                success: false,
                error: "Aucun utilisateur à importer",
            })
        }

        const GLPI_URL = process.env.GLPI_URL || "http://192.168.0.1/glpi"
        const APP_TOKEN = process.env.GLPI_APP_TOKEN || "ow3eeLBLEpnrS7hHN0S04a7617VMqGtYCUH9AceL"
        let SESSION_TOKEN = process.env.GLPI_SESSION_TOKEN || "c6dq7c52jnv6tsr2f47i2lsq1k"

        console.log(`📥 [CSV-IMPORT] Import de ${users.length} utilisateurs`)

        const results = {
            success: 0,
            errors: 0,
            details: [] as any[],
        }

        // Traiter chaque utilisateur
        for (let i = 0; i < users.length; i++) {
            const user = users[i]

            try {
                console.log(`👤 [CSV-IMPORT] Traitement utilisateur ${i + 1}/${users.length}: ${user.username}`)

                // Vérifier les champs obligatoires
                if (!user.username || !user.lastname || !user.firstname) {
                    results.errors++
                    results.details.push({
                        line: i + 2, // +2 car ligne 1 = headers et index commence à 0
                        username: user.username || "N/A",
                        error: "Champs obligatoires manquants (username, lastname, firstname)",
                        success: false,
                    })
                    continue
                }

                // Préparer les données pour GLPI
                const glpiUserData = {
                    input: {
                        name: user.username.trim(),
                        realname: user.lastname.trim(),
                        firstname: user.firstname.trim(),
                        is_active: 1,
                        phone: user.phone?.trim() || "",
                        phone2: user.phone2?.trim() || "",
                        mobile: user.mobile?.trim() || "",
                        registration_number: user.matricule?.trim() || "",
                        comment: user.comments?.trim() || `Importé via CSV le ${new Date().toLocaleDateString()}`,
                        profiles_id: 2, // Self-Service par défaut
                        entities_id: 0,
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

                // Si erreur 401, régénérer le token une seule fois
                if (createResponse.status === 401 && i === 0) {
                    console.log("🔄 [CSV-IMPORT] Token invalide, régénération...")
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

                if (createResponse.ok) {
                    const result = await createResponse.json()
                    console.log(`✅ [CSV-IMPORT] Utilisateur ${user.username} créé avec ID: ${result.id}`)

                    // Ajouter l'email si fourni
                    if (user.email?.trim() && result.id) {
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
                                        email: user.email.trim(),
                                        is_default: 1,
                                    },
                                }),
                            })
                            console.log(`📧 [CSV-IMPORT] Email ajouté pour ${user.username}`)
                        } catch (emailError) {
                            console.warn(`⚠️ [CSV-IMPORT] Erreur ajout email pour ${user.username}:`, emailError)
                        }
                    }

                    results.success++
                    results.details.push({
                        line: i + 2,
                        username: user.username,
                        name: `${user.firstname} ${user.lastname}`,
                        id: result.id,
                        success: true,
                    })
                } else {
                    const errorText = await createResponse.text()
                    console.error(`❌ [CSV-IMPORT] Erreur création ${user.username}:`, errorText)

                    results.errors++
                    results.details.push({
                        line: i + 2,
                        username: user.username,
                        error: `Erreur GLPI: ${createResponse.status} - ${errorText}`,
                        success: false,
                    })
                }
            } catch (error) {
                console.error(`💥 [CSV-IMPORT] Exception pour ${user.username}:`, error)
                results.errors++
                results.details.push({
                    line: i + 2,
                    username: user.username || "N/A",
                    error: error instanceof Error ? error.message : "Erreur inconnue",
                    success: false,
                })
            }

            // Petite pause pour éviter de surcharger l'API
            if (i < users.length - 1) {
                await new Promise((resolve) => setTimeout(resolve, 100))
            }
        }

        console.log(`🎯 [CSV-IMPORT] Import terminé: ${results.success} succès, ${results.errors} erreurs`)

        return NextResponse.json({
            success: true,
            message: `Import terminé: ${results.success} utilisateurs créés, ${results.errors} erreurs`,
            results: results,
        })
    } catch (error) {
        console.error("💥 [CSV-IMPORT] Erreur générale:", error)
        return NextResponse.json(
            {
                success: false,
                error: "Erreur interne du serveur lors de l'import",
                details: error instanceof Error ? error.message : "Erreur inconnue",
            },
            { status: 500 },
        )
    }
}
