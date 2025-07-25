import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
    const { NEXT_PUBLIC_GLPI_URL, NEXT_PUBLIC_GLPI_APP_TOKEN, NEXT_PUBLIC_GLPI_USER_TOKEN } = process.env

    if (!NEXT_PUBLIC_GLPI_URL || !NEXT_PUBLIC_GLPI_APP_TOKEN || !NEXT_PUBLIC_GLPI_USER_TOKEN) {
        return NextResponse.json({ error: "Variables d'environnement manquantes" }, { status: 500 })
    }

    let sessionToken: string | null = null

    try {
        const body = await request.json()
        const { userId, itemType = "Computer" } = body
        const computerId = Number.parseInt(params.id)

        if (!computerId) {
            return NextResponse.json({ error: "computerId est requis" }, { status: 400 })
        }

        const isAssigning = userId !== null && userId !== undefined && userId !== "0"
        console.log(
            `🔄 ${isAssigning ? `Assignement ${itemType} ${computerId} à l'utilisateur ${userId}` : `Désaffectation ${itemType} ${computerId}`}`,
        )

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
            console.error("❌ Erreur session GLPI:", error)
            return NextResponse.json({ error: "Erreur session GLPI", details: error }, { status: 500 })
        }

        const sessionData = await sessionRes.json()
        sessionToken = sessionData.session_token
        console.log("✅ Session GLPI créée")

        // Préparer les données selon si c'est une assignation ou désaffectation
        const updateData: any = {
            users_id: isAssigning ? Number.parseInt(userId) : 0, // 0 pour désaffecter
        }

        // Définir le statut selon l'action
        if (isAssigning) {
            // Assignation : chercher l'ID du statut "Affecté"
            updateData.states_id = 2 // ID par défaut pour "Affecté"
            updateData.comment = `Assigné depuis l'interface d'inventaire\nUtilisateur: ${userId}\nDate: ${new Date().toISOString().split("T")[0]}`
        } else {
            // Désaffectation : chercher l'ID du statut "Non affecté"
            updateData.states_id = 1 // ID par défaut pour "Non affecté"
            updateData.comment = `Désaffecté depuis l'interface d'inventaire\nDate: ${new Date().toISOString().split("T")[0]}`
        }

        console.log("📤 Données à envoyer:", updateData)

        // Mettre à jour l'équipement
        const updateRes = await fetch(`${NEXT_PUBLIC_GLPI_URL}${itemType}/${computerId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Session-Token": sessionToken,
                "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN,
            },
            body: JSON.stringify({
                input: updateData,
            }),
        })

        const responseText = await updateRes.text()
        console.log(`📥 Réponse GLPI:`, updateRes.status, responseText)

        if (!updateRes.ok) {
            console.error("❌ Erreur mise à jour:", responseText)
            return NextResponse.json(
                { error: "Erreur lors de la mise à jour de l'équipement", details: responseText },
                { status: 500 },
            )
        }

        console.log("✅ Opération réussie!")

        // Optionnel: Créer un ticket de suivi
        try {
            const ticketData = {
                name: isAssigning
                    ? `Assignement ${itemType} ${computerId} à l'utilisateur ${userId}`
                    : `Désaffectation ${itemType} ${computerId}`,
                content: isAssigning
                    ? `Équipement assigné depuis l'interface d'inventaire\n- Type: ${itemType}\n- ID: ${computerId}\n- Utilisateur: ${userId}\n- Date: ${new Date().toISOString()}`
                    : `Équipement désaffecté depuis l'interface d'inventaire\n- Type: ${itemType}\n- ID: ${computerId}\n- Date: ${new Date().toISOString()}`,
                users_id_requester: isAssigning ? Number.parseInt(userId) : 1, // Utilisateur par défaut pour la désaffectation
                type: 1, // Incident
                status: 4, // En attente
                urgency: 3, // Moyenne
                impact: 3, // Moyen
                priority: 3, // Moyenne
            }

            const ticketRes = await fetch(`${NEXT_PUBLIC_GLPI_URL}Ticket`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Session-Token": sessionToken,
                    "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN,
                },
                body: JSON.stringify({
                    input: ticketData,
                }),
            })

            if (ticketRes.ok) {
                console.log("📋 Ticket de suivi créé")
            } else {
                console.warn("⚠️ Impossible de créer le ticket de suivi")
            }
        } catch (ticketError) {
            console.warn("⚠️ Erreur lors de la création du ticket:", ticketError)
        }

        return NextResponse.json({
            success: true,
            message: isAssigning ? "Assignement créé avec succès" : "Désaffectation réussie",
            data: {
                userId: isAssigning ? userId : null,
                computerId,
                itemType,
                action: isAssigning ? "assign" : "unassign",
                statusId: updateData.states_id,
            },
        })
    } catch (error) {
        console.error("❌ Erreur générale:", error)
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Erreur interne",
            },
            { status: 500 },
        )
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
                console.log("🔒 Session GLPI fermée")
            } catch (e) {
                console.error("⚠️ Erreur killSession:", e)
            }
        }
    }
}
