import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
    const { NEXT_PUBLIC_GLPI_URL, NEXT_PUBLIC_GLPI_APP_TOKEN, NEXT_PUBLIC_GLPI_USER_TOKEN } = process.env

    if (!NEXT_PUBLIC_GLPI_URL || !NEXT_PUBLIC_GLPI_APP_TOKEN || !NEXT_PUBLIC_GLPI_USER_TOKEN) {
        return NextResponse.json({ error: "Variables d'environnement manquantes" }, { status: 500 })
    }

    let sessionToken: string | null = null

    try {
        const body = await req.json()
        const { computerId, reason } = body

        if (!computerId) {
            return NextResponse.json({ error: "computerId est requis" }, { status: 400 })
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

        // Récupérer les informations actuelles de l'ordinateur
        const computerRes = await fetch(`${NEXT_PUBLIC_GLPI_URL}Computer/${computerId}`, {
            headers: {
                "Content-Type": "application/json",
                "Session-Token": sessionToken,
                "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN,
            },
        })

        let currentComputer = null
        if (computerRes.ok) {
            currentComputer = await computerRes.json()
        }

        // Mettre à jour l'ordinateur pour retirer l'assignement
        const updateComputerRes = await fetch(`${NEXT_PUBLIC_GLPI_URL}Computer/${computerId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Session-Token": sessionToken,
                "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN,
            },
            body: JSON.stringify({
                input: {
                    users_id: 0, // Retirer l'utilisateur assigné
                    states_id: "non affecté", // Changer le statut
                    comment: `${currentComputer?.comment || ""}\n--- DÉSASSIGNEMENT ---\nDate: ${new Date().toISOString().split("T")[0]}\nRaison: ${reason || "Non spécifiée"}`,
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

        // Optionnel: Créer un ticket de désassignement
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
                        name: `Désassignement PC ${computerId}`,
                        content: `Ordinateur désassigné:\n- PC: ${currentComputer?.name || computerId}\n- Ancien utilisateur: ${currentComputer?.users_id || "N/A"}\n- Raison: ${reason || "Non spécifiée"}\n- Date: ${new Date().toLocaleString()}`,
                        type: 1, // Type "Incident"
                        status: 4, // Statut "En attente"
                        urgency: 3,
                        impact: 3,
                        priority: 3,
                    },
                }),
            })

            if (!ticketRes.ok) {
                console.warn("Impossible de créer le ticket de désassignement")
            }
        } catch (ticketError) {
            console.warn("Erreur lors de la création du ticket:", ticketError)
        }

        return NextResponse.json({
            success: true,
            message: "Assignement supprimé avec succès",
            data: {
                computerId,
                reason,
                previousUser: currentComputer?.users_id,
                computerName: currentComputer?.name,
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
