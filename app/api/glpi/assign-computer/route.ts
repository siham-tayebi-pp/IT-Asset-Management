import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
    const { NEXT_PUBLIC_GLPI_URL, NEXT_PUBLIC_GLPI_APP_TOKEN, NEXT_PUBLIC_GLPI_USER_TOKEN } = process.env

    if (!NEXT_PUBLIC_GLPI_URL || !NEXT_PUBLIC_GLPI_APP_TOKEN || !NEXT_PUBLIC_GLPI_USER_TOKEN) {
        return NextResponse.json({ error: "Variables d'environnement manquantes" }, { status: 500 })
    }

    let sessionToken: string | null = null

    // Fonction pour récupérer le nom du groupe
    const getGroupName = async (groupId: number | string): Promise<string> => {
        try {
            const groupRes = await fetch(`${NEXT_PUBLIC_GLPI_URL}Group/${groupId}`, {
                headers: {
                    "Content-Type": "application/json",
                    "Session-Token": sessionToken!,
                    "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN!,
                },
            })

            if (groupRes.ok) {
                const groupData = await groupRes.json()
                return groupData.name || `Groupe ${groupId}`
            } else {
                console.warn(`Impossible de récupérer le groupe ${groupId}`)
                return `Groupe ${groupId}`
            }
        } catch (error) {
            console.error(`Erreur lors de la récupération du groupe ${groupId}:`, error)
            return `Groupe ${groupId}`
        }
    }

    try {
        const body = await req.json()
        const { userId, computerId, department, accessories, comment } = body

        if (!userId || !computerId) {
            return NextResponse.json({ error: "userId et computerId sont requis" }, { status: 400 })
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
            const error = await sessionRes.text()
            return NextResponse.json({ error: "Erreur session GLPI", details: error }, { status: 500 })
        }

        const sessionData = await sessionRes.json()
        sessionToken = sessionData.session_token

        // Récupérer les informations de l'utilisateur pour obtenir son groups_id
        let userGroupName = null
        try {
            const userRes = await fetch(`${NEXT_PUBLIC_GLPI_URL}User/${userId}`, {
                headers: {
                    "Content-Type": "application/json",
                    "Session-Token": sessionToken,
                    "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN,
                },
            })

            if (userRes.ok) {
                const userData = await userRes.json()
                console.log("Données utilisateur:", userData)

                if (userData.groups_id) {
                    userGroupName = await getGroupName(userData.groups_id)
                    console.log(`Groupe de l'utilisateur ${userId}: ${userGroupName}`)
                }
            }
        } catch (error) {
            console.warn("Erreur lors de la récupération des informations utilisateur:", error)
        }

        // Mettre à jour l'ordinateur avec l'utilisateur assigné
        const updateComputerRes = await fetch(`${NEXT_PUBLIC_GLPI_URL}Computer/${computerId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Session-Token": sessionToken,
                "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN,
            },
            body: JSON.stringify({
                input: {
                    users_id: userId,
                    states_id: "affecté", // ou l'ID du statut "affecté" dans votre GLPI
                    comment: `${comment ? comment + "\n" : ""}Département: ${department}\nAccessoires: ${accessories}\nDate d'assignement: ${new Date().toISOString().split("T")[0]}`,
                },
            }),
        })

        if (!updateComputerRes.ok) {
            const error = await updateComputerRes.text()
            return NextResponse.json(
                { error: "Erreur lors de la mise à jour de l'ordinateur", details: error },
                { status: 500 },
            )
        }

        // Récupérer les informations mises à jour de l'ordinateur
        let updatedComputerData = null
        try {
            const computerRes = await fetch(`${NEXT_PUBLIC_GLPI_URL}Computer/${computerId}`, {
                headers: {
                    "Content-Type": "application/json",
                    "Session-Token": sessionToken,
                    "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN,
                },
            })

            if (computerRes.ok) {
                updatedComputerData = await computerRes.json()

                // Si l'ordinateur a un groups_id, récupérer le nom du groupe
                if (updatedComputerData.groups_id) {
                    const computerGroupName = await getGroupName(updatedComputerData.groups_id)
                    updatedComputerData.groups_id_name = computerGroupName
                    console.log(`Groupe de l'ordinateur ${computerId}: ${computerGroupName}`)
                }
            }
        } catch (error) {
            console.warn("Erreur lors de la récupération des informations de l'ordinateur:", error)
        }

        // Optionnel: Créer un ticket ou un log d'assignement
        try {
            const ticketRes = await fetch(`${NEXT_PUBLIC_GLPI_URL}Ticket`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Session-Token": sessionToken,
                    "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN,
                },
                body: JSON.stringify({
                    input: {
                        name: `Assignement PC ${computerId} à l'utilisateur ${userId}`,
                        content: `Ordinateur assigné avec les détails suivants:\n- Département: ${department}\n- Accessoires: ${accessories}\n- Commentaire: ${comment}${userGroupName ? `\n- Groupe utilisateur: ${userGroupName}` : ""}`,
                        users_id_requester: userId,
                        type: 1, // Type "Incident" ou selon votre configuration
                        status: 4, // Statut "En attente" ou selon votre configuration
                        urgency: 3,
                        impact: 3,
                        priority: 3,
                    },
                }),
            })

            // Ne pas faire échouer l'assignement si la création du ticket échoue
            if (!ticketRes.ok) {
                console.warn("Impossible de créer le ticket d'assignement")
            }
        } catch (ticketError) {
            console.warn("Erreur lors de la création du ticket:", ticketError)
        }

        return NextResponse.json({
            success: true,
            message: "Assignement créé avec succès",
            data: {
                userId,
                computerId,
                department,
                accessories,
                comment,
                userGroupName, // Nom du groupe de l'utilisateur
                computerData: updatedComputerData, // Données complètes de l'ordinateur avec groups_id_name
            },
        })
    } catch (error) {
        console.error("Erreur générale:", error)
        return NextResponse.json({ error: "Erreur interne" }, { status: 500 })
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
