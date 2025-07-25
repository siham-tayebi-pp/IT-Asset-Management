import { NextResponse } from "next/server"

export async function GET() {
    console.log("🔍 API /api/managers - Récupération des administrateurs depuis GLPI")

    try {
        const { NEXT_PUBLIC_GLPI_URL, NEXT_PUBLIC_GLPI_APP_TOKEN, NEXT_PUBLIC_GLPI_USER_TOKEN } = process.env

        if (!NEXT_PUBLIC_GLPI_URL || !NEXT_PUBLIC_GLPI_APP_TOKEN || !NEXT_PUBLIC_GLPI_USER_TOKEN) {
            return NextResponse.json({ error: "Variables d'environnement GLPI manquantes" }, { status: 500 })
        }

        // Init session GLPI
        console.log("🔐 Initialisation session GLPI...")
        const sessionRes = await fetch(`${NEXT_PUBLIC_GLPI_URL}initSession`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN,
                Authorization: `user_token ${NEXT_PUBLIC_GLPI_USER_TOKEN}`,
            },
        })

        if (!sessionRes.ok) {
            console.error("❌ Erreur session GLPI:", sessionRes.status)
            return NextResponse.json({ error: "Erreur connexion GLPI" }, { status: 500 })
        }

        const sessionData = await sessionRes.json()
        const sessionToken = sessionData.session_token
        console.log("✅ Session GLPI établie")

        try {
            // Récupérer tous les utilisateurs actifs
            console.log("👥 Récupération des utilisateurs depuis GLPI...")
            const usersRes = await fetch(`${NEXT_PUBLIC_GLPI_URL}User?range=0-200&is_active=1`, {
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
            console.log(`📊 ${users.length} utilisateurs trouvés dans GLPI`)

            // Récupérer les profils pour identifier les administrateurs
            console.log("🔍 Récupération des profils GLPI...")
            const profilesRes = await fetch(`${NEXT_PUBLIC_GLPI_URL}Profile?range=0-50`, {
                headers: {
                    "Content-Type": "application/json",
                    "Session-Token": sessionToken,
                    "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN,
                },
            })

            let profiles = []
            if (profilesRes.ok) {
                profiles = await profilesRes.json()
                console.log(`📋 ${profiles.length} profils trouvés`)
            }

            // Récupérer les relations utilisateur-profil
            console.log("🔗 Récupération des relations utilisateur-profil...")
            const userProfilesRes = await fetch(`${NEXT_PUBLIC_GLPI_URL}Profile_User?range=0-500`, {
                headers: {
                    "Content-Type": "application/json",
                    "Session-Token": sessionToken,
                    "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN,
                },
            })

            let userProfiles = []
            if (userProfilesRes.ok) {
                userProfiles = await userProfilesRes.json()
                console.log(`🔗 ${userProfiles.length} relations utilisateur-profil trouvées`)
            }

            // Identifier les profils administrateur
            const adminProfiles = profiles.filter(
                (profile) =>
                    profile.name &&
                    (profile.name.toLowerCase().includes("admin") ||
                        profile.name.toLowerCase().includes("super") ||
                        profile.name.toLowerCase().includes("gestionnaire")),
            )

            console.log(
                `👑 ${adminProfiles.length} profils administrateur identifiés:`,
                adminProfiles.map((p) => p.name),
            )

            // Trouver les utilisateurs avec des profils administrateur
            const adminUserIds = new Set()
            const userProfileMap = new Map()

            userProfiles.forEach((up) => {
                const isAdmin = adminProfiles.some((ap) => ap.id === up.profiles_id)
                if (isAdmin) {
                    adminUserIds.add(up.users_id)
                    if (!userProfileMap.has(up.users_id)) {
                        userProfileMap.set(up.users_id, [])
                    }
                    const profile = profiles.find((p) => p.id === up.profiles_id)
                    if (profile) {
                        userProfileMap.get(up.users_id).push(profile.name)
                    }
                }
            })

            // Filtrer les utilisateurs administrateurs
            const adminUsers = users.filter((user) => adminUserIds.has(user.id))
            console.log(`👨‍💼 ${adminUsers.length} utilisateurs administrateurs trouvés`)

            // Récupérer les entités pour les départements
            console.log("🏢 Récupération des entités...")
            const entitiesRes = await fetch(`${NEXT_PUBLIC_GLPI_URL}Entity?range=0-100`, {
                headers: {
                    "Content-Type": "application/json",
                    "Session-Token": sessionToken,
                    "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN,
                },
            })

            let entities = []
            if (entitiesRes.ok) {
                entities = await entitiesRes.json()
                console.log(`🏢 ${entities.length} entités trouvées`)
            }

            // Formater les données pour l'interface
            const managers = adminUsers.map((user) => {
                const userProfileNames = userProfileMap.get(user.id) || []
                const entity = entities.find((e) => e.id === user.entities_id)

                return {
                    id: user.id,
                    name: user.realname && user.firstname ? `${user.firstname} ${user.realname}` : user.name || `User ${user.id}`,
                    username: user.name || `user_${user.id}`,
                    email: user.email || "N/A",
                    department: entity?.name || entity?.completename || "N/A",
                    profile:
                        userProfileNames.length > 0
                            ? userProfileNames.includes("Super-Admin") ||
                                userProfileNames.some((p) => p.toLowerCase().includes("super"))
                                ? "Super-Admin"
                                : "Admin"
                            : "Admin",
                    status: user.is_active ? "Active" : "Inactive",
                    last_login: user.last_login || null,
                    phone: user.phone || "N/A",
                    location: user.locations_id_name || entity?.name || "N/A",
                    created: user.date_creation || null,
                    modified: user.date_mod || null,
                }
            })

            console.log(`✅ ${managers.length} administrateurs formatés pour l'interface`)

            return NextResponse.json({
                success: true,
                managers: managers,
                total: managers.length,
                message: `${managers.length} administrateurs récupérés depuis GLPI`,
                timestamp: new Date().toISOString(),
                debug: {
                    total_users: users.length,
                    total_profiles: profiles.length,
                    admin_profiles: adminProfiles.length,
                    user_profiles_relations: userProfiles.length,
                    admin_users_found: adminUsers.length,
                },
            })
        } finally {
            // Fermer la session GLPI
            console.log("🔒 Fermeture session GLPI...")
            await fetch(`${NEXT_PUBLIC_GLPI_URL}killSession`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Session-Token": sessionToken,
                    "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN,
                },
            }).catch(() => {
                console.warn("⚠️ Erreur fermeture session GLPI")
            })
        }
    } catch (error) {
        console.error("❌ Erreur API managers:", error)
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Erreur serveur",
                message: "Impossible de récupérer les administrateurs depuis GLPI",
            },
            { status: 500 },
        )
    }
}
