import { type NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
    const { NEXT_PUBLIC_GLPI_URL, NEXT_PUBLIC_GLPI_APP_TOKEN, NEXT_PUBLIC_GLPI_USER_TOKEN } = process.env

    if (!NEXT_PUBLIC_GLPI_URL || !NEXT_PUBLIC_GLPI_APP_TOKEN || !NEXT_PUBLIC_GLPI_USER_TOKEN) {
        return NextResponse.json({ error: "Variables d'environnement manquantes" }, { status: 500 })
    }

    let sessionToken: string | null = null

    async function resolveComponentLinks(links: any[]) {
        const details: Record<string, any> = {}
        for (const link of links) {
            const rel = link.rel
            const href = link.href
            if (!rel.startsWith("Device") && !rel.startsWith("Entity")) continue
            try {
                const detailRes = await fetch(href, {
                    headers: {
                        "Content-Type": "application/json",
                        "Session-Token": sessionToken!,
                        "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN!,
                    },
                })
                if (detailRes.ok) {
                    const data = await detailRes.json()
                    for (const [key, value] of Object.entries(data)) {
                        if (key.endsWith("_manufacturers_id") && typeof value === "number") {
                            try {
                                const manufacturerRes = await fetch(`${NEXT_PUBLIC_GLPI_URL}Manufacturer/${value}`, {
                                    headers: {
                                        "Content-Type": "application/json",
                                        "Session-Token": sessionToken!,
                                        "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN!,
                                    },
                                })
                                if (manufacturerRes.ok) {
                                    const manufacturerData = await manufacturerRes.json()
                                    data[key] = manufacturerData.name ?? value
                                }
                            } catch (e) {
                                console.error(`Erreur récupération Manufacturer/${value}`, e)
                            }
                        }
                    }
                    details[rel] = data
                }
            } catch (err) {
                console.error(`Erreur lors de la récupération de ${rel} depuis ${href}`, err)
            }
        }
        return details
    }

    try {
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

        await new Promise((resolve) => setTimeout(resolve, 100)) // 100ms de pause

        // Récupérer les ordinateurs
        const computersRes = await fetch(`${NEXT_PUBLIC_GLPI_URL}Computer?range=0-1000&expand_dropdowns=true`, {
            headers: {
                "Content-Type": "application/json",
                "Session-Token": sessionToken,
                "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN,
            },
        })

        if (!computersRes.ok) {
            const error = await computersRes.text()
            return NextResponse.json({ error: "Erreur récupération ordinateurs", details: error }, { status: 500 })
        }

        const computers = await computersRes.json()

        const BATCH_SIZE = 5 // Traiter seulement 5 PC à la fois

        const enrichedComputers = []
        for (let i = 0; i < computers.length; i += BATCH_SIZE) {
            const batch = computers.slice(i, i + BATCH_SIZE)
            const batchResults = await Promise.all(
                batch.map(async (computer: any) => {
                    // Ajouter un délai progressif pour éviter la surcharge
                    await new Promise((resolve) => setTimeout(resolve, 0))

                    try {
                        let assignedUser = null
                        try {
                            const userRes = await fetch(`${NEXT_PUBLIC_GLPI_URL}Computer/${computer.id}/User`, {
                                headers: {
                                    "Content-Type": "application/json",
                                    "Session-Token": sessionToken!,
                                    "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN!,
                                },
                            })
                            if (userRes.ok) {
                                const users = await userRes.json()
                                if (users.length > 0) {
                                    const userBasic = users[0]
                                    const userDetailRes = await fetch(`${NEXT_PUBLIC_GLPI_URL}User/${userBasic.id}`, {
                                        headers: {
                                            "Content-Type": "application/json",
                                            "Session-Token": sessionToken!,
                                            "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN!,
                                        },
                                    })
                                    if (userDetailRes.ok) {
                                        assignedUser = await userDetailRes.json()
                                    } else {
                                        assignedUser = userBasic
                                    }
                                }
                            }
                        } catch (e) {
                            console.error(`Erreur récupération utilisateur pour PC ${computer.id}`, e)
                        }

                        await new Promise((resolve) => setTimeout(resolve, 100)) // 100ms de pause

                        // OS
                        let operatingSystem = null
                        try {
                            const osRes = await fetch(`${NEXT_PUBLIC_GLPI_URL}Computer/${computer.id}/OperatingSystem`, {
                                headers: {
                                    "Content-Type": "application/json",
                                    "Session-Token": sessionToken!,
                                    "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN!,
                                },
                            })
                            if (osRes.ok) {
                                const osData = await osRes.json()
                                operatingSystem = Array.isArray(osData) ? osData[0] : osData
                            }
                        } catch (e) {
                            console.error(`Erreur récupération OS pour PC ${computer.id}`, e)
                        }

                        await new Promise((resolve) => setTimeout(resolve, 100)) // 100ms de pause

                        // Détails matériel - CORRECTION ICI
                        const componentsData: Record<string, any> = {}
                        try {
                            const computerDetailRes = await fetch(
                                `${NEXT_PUBLIC_GLPI_URL}Computer/${computer.id}?expand_relations=true`,
                                {
                                    headers: {
                                        "Content-Type": "application/json",
                                        "Session-Token": sessionToken!,
                                        "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN!,
                                    },
                                },
                            )
                            if (computerDetailRes.ok) {
                                const computerDetail = await computerDetailRes.json()
                                if (Array.isArray(computerDetail.links)) {
                                    for (const link of computerDetail.links) {
                                        if (link.rel.startsWith("Item_Device")) {
                                            // CORRECTION: Mapping correct des noms de composants
                                            let componentType = ""
                                            if (link.rel === "Item_DeviceProcessor") {
                                                componentType = "processor"
                                            } else if (link.rel === "Item_DeviceMemory") {
                                                componentType = "memory"
                                            } else if (link.rel === "Item_DeviceFirmware") {
                                                componentType = "firmware"
                                            } else if (link.rel === "Item_DeviceHardDrive") {
                                                componentType = "harddrive"
                                            } else {
                                                componentType = link.rel.replace("Item_Device", "").toLowerCase()
                                            }

                                            try {
                                                const itemRes = await fetch(link.href, {
                                                    headers: {
                                                        "Content-Type": "application/json",
                                                        "Session-Token": sessionToken!,
                                                        "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN!,
                                                    },
                                                })
                                                if (itemRes.ok) {
                                                    const itemData = await itemRes.json()
                                                    // CORRECTION: Gérer les tableaux correctement
                                                    if (Array.isArray(itemData)) {
                                                        // Pour chaque élément du tableau, enrichir avec les détails
                                                        const enrichedItems = await Promise.all(
                                                            itemData.map(async (item) => {
                                                                if (item?.links) {
                                                                    const enriched = await resolveComponentLinks(item.links)
                                                                    return { ...item, details: enriched }
                                                                }
                                                                return item
                                                            }),
                                                        )
                                                        componentsData[componentType] = enrichedItems
                                                    } else {
                                                        // Un seul élément
                                                        if (itemData?.links) {
                                                            const enriched = await resolveComponentLinks(itemData.links)
                                                            itemData.details = enriched
                                                        }
                                                        componentsData[componentType] = [itemData]
                                                    }
                                                }
                                            } catch (e) {
                                                console.error(`Erreur récupération composant ${componentType} pour PC ${computer.id}`, e)
                                            }
                                        }
                                    }
                                }
                            }
                        } catch (e) {
                            console.error(`Erreur récupération détails PC ${computer.id}`, e)
                        }

                        await new Promise((resolve) => setTimeout(resolve, 100)) // 100ms de pause

                        return {
                            ...computer,
                            assignedUser,
                            operatingSystem,
                            components: componentsData,
                            status: computer.states_id,
                            lastSeen: computer.date_mod || computer.date_creation,
                        }
                    } catch (error) {
                        console.error(`Erreur enrichissement PC ${computer.id}:`, error)
                        return {
                            ...computer,
                            assignedUser: null,
                            operatingSystem: null,
                            components: {},
                            status: null,
                            lastSeen: computer.date_mod || computer.date_creation,
                        }
                    }
                }),
            )
            enrichedComputers.push(...batchResults)

            // Pause entre les batches
            if (i + BATCH_SIZE < computers.length) {
                await new Promise((resolve) => setTimeout(resolve, 1000)) // 1 seconde entre les batches
            }
        }

        return NextResponse.json({
            success: true,
            computers: enrichedComputers,
            total: enrichedComputers.length,
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

// NOUVELLE MÉTHODE PUT pour la mise à jour automatique des statuts
export async function PUT(request: NextRequest) {
    try {
        const { action, computers, statuses } = await request.json()

        if (action !== "auto-update-status") {
            return NextResponse.json({ error: "Action non supportée" }, { status: 400 })
        }

        const { NEXT_PUBLIC_GLPI_URL, NEXT_PUBLIC_GLPI_APP_TOKEN, NEXT_PUBLIC_GLPI_USER_TOKEN } = process.env

        if (!NEXT_PUBLIC_GLPI_URL || !NEXT_PUBLIC_GLPI_APP_TOKEN || !NEXT_PUBLIC_GLPI_USER_TOKEN) {
            return NextResponse.json({ error: "Variables d'environnement manquantes" }, { status: 500 })
        }

        // Fonction pour trouver l'ID d'un statut par son nom
        const getStatusIdByName = (statusName: string): number | null => {
            const normalizedName = statusName.toLowerCase().trim()

            // Chercher une correspondance exacte d'abord
            let status = statuses.find((s: any) => s.name.toLowerCase().trim() === normalizedName)

            // Si pas trouvé, chercher par mots-clés
            if (!status) {
                if (
                    normalizedName.includes("non affecté") ||
                    normalizedName.includes("non affecte") ||
                    normalizedName.includes("disponible")
                ) {
                    status = statuses.find(
                        (s: any) =>
                            s.name.toLowerCase().includes("non affecté") ||
                            s.name.toLowerCase().includes("non affecte") ||
                            s.name.toLowerCase().includes("disponible"),
                    )
                } else if (normalizedName.includes("affecté") || normalizedName.includes("affecte")) {
                    status = statuses.find(
                        (s: any) => s.name.toLowerCase().includes("affecté") || s.name.toLowerCase().includes("affecte"),
                    )
                } else if (normalizedName.includes("transition")) {
                    status = statuses.find((s: any) => s.name.toLowerCase().includes("transition"))
                } else if (normalizedName.includes("congé") || normalizedName.includes("conge")) {
                    status = statuses.find(
                        (s: any) => s.name.toLowerCase().includes("congé") || s.name.toLowerCase().includes("conge"),
                    )
                } else if (normalizedName.includes("délégué") || normalizedName.includes("delegue")) {
                    status = statuses.find(
                        (s: any) => s.name.toLowerCase().includes("délégué") || s.name.toLowerCase().includes("delegue"),
                    )
                }
            }

            if (status) {
                console.log(`✅ Statut trouvé: "${statusName}" → ID ${status.id} (${status.name})`)
                return status.id
            } else {
                console.warn(`⚠️ Statut non trouvé: "${statusName}"`)
                console.log(
                    "Statuts disponibles:",
                    statuses.map((s: any) => `${s.name} (ID: ${s.id})`),
                )
                return null
            }
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
            const errorText = await sessionRes.text()
            console.error("❌ Erreur session GLPI:", errorText)
            return NextResponse.json({ error: "Erreur session GLPI" }, { status: 500 })
        }

        const sessionData = await sessionRes.json()
        const sessionToken = sessionData.session_token
        console.log("✅ Session GLPI créée pour mise à jour automatique")

        const updates: any[] = []
        const errors: any[] = []

        try {
            for (const computer of computers) {
                try {
                    console.log(`🔄 Traitement ${computer.name}: ${computer.currentStatus} → ${computer.newStatus}`)

                    // NOUVELLE VÉRIFICATION : Ne jamais modifier un PC "Délégué"
                    if (computer.currentStatus === "Délégué") {
                        console.log(`⚠️ PC ${computer.name} est "Délégué" - Aucune modification automatique`)
                        continue
                    }

                    // Récupérer l'ID du nouveau statut
                    const statusId = getStatusIdByName(computer.newStatus)

                    if (!statusId) {
                        console.warn(`⚠️ Impossible de trouver l'ID pour le statut: ${computer.newStatus}`)
                        errors.push({
                            computerId: computer.id,
                            computerName: computer.name,
                            error: `Statut non trouvé: ${computer.newStatus}`,
                        })
                        continue
                    }

                    // Mettre à jour le statut dans GLPI
                    const updateRes = await fetch(`${NEXT_PUBLIC_GLPI_URL}Computer/${computer.id}`, {
                        method: "PUT",
                        headers: {
                            "Content-Type": "application/json",
                            "Session-Token": sessionToken,
                            "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN,
                        },
                        body: JSON.stringify({
                            input: {
                                states_id: statusId,
                            },
                        }),
                    })

                    const responseText = await updateRes.text()
                    console.log(`📤 Réponse GLPI pour ${computer.name}:`, updateRes.status, responseText)

                    if (updateRes.ok) {
                        updates.push({
                            computerId: computer.id,
                            computerName: computer.name,
                            oldStatus: computer.currentStatus,
                            newStatus: computer.newStatus,
                            reason: computer.reason,
                        })
                        console.log(`✅ ${computer.name} mis à jour avec succès (ID statut: ${statusId})`)

                        // Si le nouveau statut est "Non affecté", désaffecter l'utilisateur
                        if (computer.newStatus === "Non affecté" && computer.assignedUser) {
                            try {
                                const unassignRes = await fetch(`${NEXT_PUBLIC_GLPI_URL}Computer/${computer.id}/User`, {
                                    method: "DELETE",
                                    headers: {
                                        "Content-Type": "application/json",
                                        "Session-Token": sessionToken,
                                        "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN,
                                    },
                                })

                                if (unassignRes.ok) {
                                    console.log(`✅ Utilisateur désaffecté pour ${computer.name}`)
                                } else {
                                    console.warn(`⚠️ Erreur désaffectation ${computer.name}`)
                                }
                            } catch (e) {
                                console.warn(`⚠️ Erreur désaffectation ${computer.name}:`, e)
                            }
                        }
                    } else {
                        errors.push({
                            computerId: computer.id,
                            computerName: computer.name,
                            error: `Erreur GLPI: ${updateRes.status} - ${responseText}`,
                        })
                        console.error(`❌ Erreur mise à jour ${computer.name}:`, responseText)
                    }
                } catch (error) {
                    errors.push({
                        computerId: computer.id,
                        computerName: computer.name,
                        error: error instanceof Error ? error.message : "Erreur inconnue",
                    })
                    console.error(`❌ Erreur lors de la mise à jour de ${computer.name}:`, error)
                }

                // Petite pause pour éviter de surcharger l'API
                await new Promise((resolve) => setTimeout(resolve, 500))
            }

            console.log(`✅ Mise à jour automatique terminée: ${updates.length} succès, ${errors.length} erreurs`)

            return NextResponse.json({
                success: true,
                updates,
                errors,
                message: `${updates.length} ordinateur(s) mis à jour, ${errors.length} erreur(s)`,
            })
        } finally {
            // Kill session
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
                console.error("⚠️ Erreur fermeture session:", e)
            }
        }
    } catch (error) {
        console.error("❌ Erreur générale mise à jour automatique:", error)
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Erreur lors de la mise à jour automatique",
            },
            { status: 500 },
        )
    }
}
