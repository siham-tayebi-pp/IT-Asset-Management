import { type NextRequest, NextResponse } from "next/server"

interface UserStatus {
    id: number
    name: string
    last_login: string | null
    current_status: string
    new_status: string
    days_since_login: number
    action_taken: boolean
}

export async function POST(request: NextRequest) {
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
            console.log("🔍 Récupération de tous les utilisateurs...")

            // Récupérer tous les utilisateurs actifs
            const usersRes = await fetch(`${NEXT_PUBLIC_GLPI_URL}User?range=0-1000&is_active=1`, {
                headers: {
                    "Content-Type": "application/json",
                    "Session-Token": sessionToken,
                    "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN,
                },
            })

            if (!usersRes.ok) {
                throw new Error(`Erreur récupération utilisateurs: ${usersRes.status}`)
            }

            const users = await usersRes.json()
            console.log(`📊 ${users.length} utilisateurs trouvés`)

            const now = new Date()
            const results: UserStatus[] = []
            let updatedCount = 0

            // Définir les statuts possibles
            const STATUS_MAPPING = {
                ACTIVE: "Actif",
                TRANSITION: "En transition",
                LEAVE: "En congé",
                UNASSIGNED: "Non affecté",
            }

            for (const user of users) {
                try {
                    const userStatus: UserStatus = {
                        id: user.id,
                        name: user.name || `User ${user.id}`,
                        last_login: user.last_login,
                        current_status: user.usertitles_id || "Actif",
                        new_status: user.usertitles_id || "Actif",
                        days_since_login: 0,
                        action_taken: false,
                    }

                    // Calculer les jours depuis la dernière connexion
                    if (user.last_login) {
                        const lastLogin = new Date(user.last_login)
                        const diffTime = now.getTime() - lastLogin.getTime()
                        userStatus.days_since_login = Math.floor(diffTime / (1000 * 60 * 60 * 24))
                    } else {
                        // Si pas de last_login, considérer comme très ancien
                        userStatus.days_since_login = 999
                    }

                    // Déterminer le nouveau statut
                    let newStatus = userStatus.current_status
                    let shouldUpdate = false

                    if (userStatus.days_since_login > 30) {
                        newStatus = STATUS_MAPPING.UNASSIGNED
                        shouldUpdate = true
                    } else if (userStatus.days_since_login > 7) {
                        newStatus = STATUS_MAPPING.LEAVE
                        shouldUpdate = true
                    } else if (userStatus.days_since_login > 1) {
                        newStatus = STATUS_MAPPING.TRANSITION
                        shouldUpdate = true
                    }
                    // Moins de 24h → pas de changement

                    userStatus.new_status = newStatus

                    // Mettre à jour si nécessaire
                    if (shouldUpdate && newStatus !== userStatus.current_status) {
                        try {
                            console.log(`🔄 Mise à jour utilisateur ${user.name}: ${userStatus.current_status} → ${newStatus}`)

                            const updateRes = await fetch(`${NEXT_PUBLIC_GLPI_URL}User/${user.id}`, {
                                method: "PUT",
                                headers: {
                                    "Content-Type": "application/json",
                                    "Session-Token": sessionToken,
                                    "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN,
                                },
                                body: JSON.stringify({
                                    input: {
                                        comment: `Statut mis à jour automatiquement - Dernière connexion: ${userStatus.days_since_login} jours`,
                                        // Note: Le champ exact pour le statut peut varier selon votre configuration GLPI
                                        // Vous devrez peut-être ajuster selon vos champs personnalisés
                                    },
                                }),
                            })

                            if (updateRes.ok) {
                                userStatus.action_taken = true
                                updatedCount++
                                console.log(`✅ Utilisateur ${user.name} mis à jour`)
                            } else {
                                console.log(`❌ Erreur mise à jour ${user.name}:`, updateRes.status)
                            }
                        } catch (error) {
                            console.error(`❌ Erreur mise à jour utilisateur ${user.name}:`, error)
                        }
                    }

                    results.push(userStatus)
                } catch (error) {
                    console.error(`❌ Erreur traitement utilisateur ${user.id}:`, error)
                }
            }

            return NextResponse.json({
                success: true,
                message: `Traitement terminé: ${updatedCount} utilisateurs mis à jour sur ${users.length}`,
                summary: {
                    total_users: users.length,
                    updated_count: updatedCount,
                    active_users: results.filter((u) => u.days_since_login <= 1).length,
                    transition_users: results.filter((u) => u.days_since_login > 1 && u.days_since_login <= 7).length,
                    leave_users: results.filter((u) => u.days_since_login > 7 && u.days_since_login <= 30).length,
                    unassigned_users: results.filter((u) => u.days_since_login > 30).length,
                },
                details: results,
                timestamp: new Date().toISOString(),
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
        console.error("Erreur mise à jour statuts utilisateurs:", error)
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Erreur serveur",
            },
            { status: 500 },
        )
    }
}
