import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const id = Number.parseInt(params.id)
        const { searchParams } = new URL(request.url)
        const itemType = searchParams.get("type") || "Computer"

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
            // Étape 1: Récupérer l'item avec expand_dropdowns=true
            console.log(`🔍 Récupération de ${itemType}/${id} avec expand_dropdowns=true`)

            const itemRes = await fetch(`${NEXT_PUBLIC_GLPI_URL}${itemType}/${id}?expand_dropdowns=true`, {
                headers: {
                    "Content-Type": "application/json",
                    "Session-Token": sessionToken,
                    "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN,
                },
            })

            if (!itemRes.ok) {
                return NextResponse.json({ error: "Équipement non trouvé" }, { status: 404 })
            }

            const item = await itemRes.json()
            console.log("📊 Item avec expand_dropdowns:", JSON.stringify(item, null, 2))

            // Étape 2: Récupérer aussi l'item sans expand_dropdowns pour avoir les IDs numériques
            console.log(`🔍 Récupération de ${itemType}/${id} sans paramètres pour les IDs`)

            const itemWithIdsRes = await fetch(`${NEXT_PUBLIC_GLPI_URL}${itemType}/${id}`, {
                headers: {
                    "Content-Type": "application/json",
                    "Session-Token": sessionToken,
                    "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN,
                },
            })

            let itemWithIds = null
            if (itemWithIdsRes.ok) {
                itemWithIds = await itemWithIdsRes.json()
                console.log("📊 Item avec IDs numériques:", JSON.stringify(itemWithIds, null, 2))
            }

            // Créer des champs _name pour la compatibilité avec le frontend
            const enrichedItem = {
                ...item,
                users_id_name: typeof item.users_id === "string" ? item.users_id : null,
                states_id_name: typeof item.states_id === "string" ? item.states_id : null,
                manufacturers_id_name: typeof item.manufacturers_id === "string" ? item.manufacturers_id : null,
                locations_id_name: typeof item.locations_id === "string" ? item.locations_id : null,
                computermodels_id_name: typeof item.computermodels_id === "string" ? item.computermodels_id : null,
                computertypes_id_name: typeof item.computertypes_id === "string" ? item.computertypes_id : null,
                entities_id_name: typeof item.entities_id === "string" ? item.entities_id : null,
                autoupdatesystems_id_name: typeof item.autoupdatesystems_id === "string" ? item.autoupdatesystems_id : null,
                groups_id_name: typeof item.groups_id === "string" ? item.groups_id : null,
            }

            // Récupération des détails utilisateur
            let userDetails = null
            const userIdToUse = itemWithIds?.users_id || item.users_id

            if (typeof userIdToUse === "number" && userIdToUse > 0) {
                try {
                    console.log(`🔍 Récupération User/${userIdToUse}`)
                    const userRes = await fetch(`${NEXT_PUBLIC_GLPI_URL}User/${userIdToUse}`, {
                        headers: {
                            "Content-Type": "application/json",
                            "Session-Token": sessionToken,
                            "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN,
                        },
                    })

                    if (userRes.ok) {
                        userDetails = await userRes.json()
                        console.log("✅ Détails utilisateur:", JSON.stringify(userDetails, null, 2))
                    } else {
                        console.log("❌ Erreur récupération utilisateur:", userRes.status)
                    }
                } catch (error) {
                    console.warn("⚠️ Erreur utilisateur:", error)
                }
            } else if (typeof item.users_id === "string" && item.users_id !== "0") {
                // Si on a le nom d'utilisateur directement
                userDetails = {
                    id: 0,
                    name: item.users_id,
                    realname: null,
                    firstname: null,
                }
            }

            // Récupération des détails d'emplacement
            let locationDetails = null
            const locationIdToUse = itemWithIds?.locations_id || item.locations_id

            if (typeof item.locations_id === "string" && item.locations_id !== "0" && item.locations_id.trim() !== "") {
                // Si expand_dropdowns a fonctionné pour les emplacements
                locationDetails = {
                    id: locationIdToUse,
                    name: item.locations_id,
                    completename: item.locations_id,
                }
                console.log("✅ Emplacement depuis expand_dropdowns:", item.locations_id)
            } else if (typeof locationIdToUse === "number" && locationIdToUse > 0) {
                // Si on a un ID numérique, faire un appel séparé
                try {
                    console.log(`🔍 Récupération Location/${locationIdToUse}`)
                    const locationRes = await fetch(`${NEXT_PUBLIC_GLPI_URL}Location/${locationIdToUse}`, {
                        headers: {
                            "Content-Type": "application/json",
                            "Session-Token": sessionToken,
                            "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN,
                        },
                    })

                    if (locationRes.ok) {
                        locationDetails = await locationRes.json()
                        console.log("✅ Détails emplacement:", JSON.stringify(locationDetails, null, 2))

                        // Mettre à jour l'item enrichi avec le nom de l'emplacement
                        enrichedItem.locations_id_name = locationDetails.name || locationDetails.completename
                    } else {
                        console.log("❌ Erreur récupération emplacement:", locationRes.status)
                    }
                } catch (error) {
                    console.warn("⚠️ Erreur emplacement:", error)
                }
            } else {
                console.log("ℹ️ Aucun emplacement défini (locations_id = 0 ou vide)")
            }

            // Récupération des détails de statut si nécessaire
            let statusDetails = null
            const statusIdToUse = itemWithIds?.states_id || item.states_id

            if (typeof statusIdToUse === "number" && statusIdToUse > 0 && typeof item.states_id !== "string") {
                try {
                    console.log(`🔍 Récupération State/${statusIdToUse}`)
                    const statusRes = await fetch(`${NEXT_PUBLIC_GLPI_URL}State/${statusIdToUse}`, {
                        headers: {
                            "Content-Type": "application/json",
                            "Session-Token": sessionToken,
                            "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN,
                        },
                    })

                    if (statusRes.ok) {
                        statusDetails = await statusRes.json()
                        console.log("✅ Détails statut:", JSON.stringify(statusDetails, null, 2))

                        // Mettre à jour l'item enrichi avec le nom du statut
                        enrichedItem.states_id_name = statusDetails.name
                    } else {
                        console.log("❌ Erreur récupération statut:", statusRes.status)
                    }
                } catch (error) {
                    console.warn("⚠️ Erreur statut:", error)
                }
            }

            // Récupération des détails de fabricant si nécessaire
            let manufacturerDetails = null
            const manufacturerIdToUse = itemWithIds?.manufacturers_id || item.manufacturers_id

            if (
                typeof manufacturerIdToUse === "number" &&
                manufacturerIdToUse > 0 &&
                typeof item.manufacturers_id !== "string"
            ) {
                try {
                    console.log(`🔍 Récupération Manufacturer/${manufacturerIdToUse}`)
                    const manufacturerRes = await fetch(`${NEXT_PUBLIC_GLPI_URL}Manufacturer/${manufacturerIdToUse}`, {
                        headers: {
                            "Content-Type": "application/json",
                            "Session-Token": sessionToken,
                            "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN,
                        },
                    })

                    if (manufacturerRes.ok) {
                        manufacturerDetails = await manufacturerRes.json()
                        console.log("✅ Détails fabricant:", JSON.stringify(manufacturerDetails, null, 2))

                        // Mettre à jour l'item enrichi avec le nom du fabricant
                        enrichedItem.manufacturers_id_name = manufacturerDetails.name
                    } else {
                        console.log("❌ Erreur récupération fabricant:", manufacturerRes.status)
                    }
                } catch (error) {
                    console.warn("⚠️ Erreur fabricant:", error)
                }
            }

            return NextResponse.json({
                success: true,
                item: enrichedItem,
                userDetails,
                locationDetails,
                statusDetails,
                manufacturerDetails,
                modelDetails: null,
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
        console.error("Erreur lors de la récupération des détails:", error)
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Erreur serveur",
            },
            { status: 500 },
        )
    }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const id = Number.parseInt(params.id)
        const body = await request.json()
        const { searchParams } = new URL(request.url)
        const itemType = searchParams.get("type") || "Computer"

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
            // Transform our app data to GLPI format
            const glpiData: any = {}
            if (body.name) glpiData.name = body.name
            if (body.serial) glpiData.serial = body.serial
            if (body.notes) glpiData.comment = body.notes

            const updateRes = await fetch(`${NEXT_PUBLIC_GLPI_URL}${itemType}/${id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Session-Token": sessionToken,
                    "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN,
                },
                body: JSON.stringify({ input: glpiData }),
            })

            if (!updateRes.ok) {
                const errorText = await updateRes.text()
                throw new Error(`Erreur GLPI: ${updateRes.status} - ${errorText}`)
            }

            return NextResponse.json({
                success: true,
                message: "Équipement mis à jour avec succès",
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
        console.error("Erreur lors de la mise à jour:", error)
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Erreur lors de la mise à jour",
            },
            { status: 500 },
        )
    }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const id = Number.parseInt(params.id)
        const { searchParams } = new URL(request.url)
        const itemType = searchParams.get("type") || "Computer"

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
            const deleteRes = await fetch(`${NEXT_PUBLIC_GLPI_URL}${itemType}/${id}`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    "Session-Token": sessionToken,
                    "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN,
                },
            })

            if (!deleteRes.ok) {
                const errorText = await deleteRes.text()
                throw new Error(`Erreur GLPI: ${deleteRes.status} - ${errorText}`)
            }

            return NextResponse.json({
                success: true,
                message: "Équipement supprimé avec succès",
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
        console.error("Erreur lors de la suppression:", error)
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Erreur lors de la suppression",
            },
            { status: 500 },
        )
    }
}
