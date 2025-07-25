import { type NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
    const { NEXT_PUBLIC_GLPI_URL, NEXT_PUBLIC_GLPI_APP_TOKEN, NEXT_PUBLIC_GLPI_USER_TOKEN } = process.env

    if (!NEXT_PUBLIC_GLPI_URL || !NEXT_PUBLIC_GLPI_APP_TOKEN || !NEXT_PUBLIC_GLPI_USER_TOKEN) {
        return NextResponse.json({ error: "Variables d'environnement manquantes" }, { status: 500 })
    }

    let sessionToken: string | null = null

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

        // Récupérer différents types d'équipements
        const inventoryPromises = [
            // Ordinateurs
            fetch(`${NEXT_PUBLIC_GLPI_URL}Computer?range=0-1000&expand_dropdowns=true`, {
                headers: {
                    "Content-Type": "application/json",
                    "Session-Token": sessionToken,
                    "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN,
                },
            }),
            // Écrans
            fetch(`${NEXT_PUBLIC_GLPI_URL}Monitor?range=0-1000&expand_dropdowns=true`, {
                headers: {
                    "Content-Type": "application/json",
                    "Session-Token": sessionToken,
                    "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN,
                },
            }),
            // Imprimantes
            fetch(`${NEXT_PUBLIC_GLPI_URL}Printer?range=0-1000&expand_dropdowns=true`, {
                headers: {
                    "Content-Type": "application/json",
                    "Session-Token": sessionToken,
                    "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN,
                },
            }),
            // Équipements réseau
            fetch(`${NEXT_PUBLIC_GLPI_URL}NetworkEquipment?range=0-1000&expand_dropdowns=true`, {
                headers: {
                    "Content-Type": "application/json",
                    "Session-Token": sessionToken,
                    "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN,
                },
            }),
            // Téléphones
            fetch(`${NEXT_PUBLIC_GLPI_URL}Phone?range=0-1000&expand_dropdowns=true`, {
                headers: {
                    "Content-Type": "application/json",
                    "Session-Token": sessionToken,
                    "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN,
                },
            }),
        ]

        const responses = await Promise.all(inventoryPromises)
        const inventoryData = await Promise.all(responses.map((res) => (res.ok ? res.json() : [])))

        // Traiter et unifier les données
        const allInventory = []

        // Ordinateurs
        if (inventoryData[0] && Array.isArray(inventoryData[0])) {
            inventoryData[0].forEach((computer: any) => {
                allInventory.push({
                    id: computer.id,
                    name: computer.name,
                    type: "Computer",
                    brand: computer.manufacturers_id_name || computer.manufacturers_id,
                    model: computer.computermodels_id_name || computer.computermodels_id,
                    serial: computer.serial,
                    otherserial: computer.otherserial,
                    status: computer.states_id_name || computer.states_id || "N/A",
                    date_creation: computer.date_creation,
                    date_mod: computer.date_mod,
                    locations_id: computer.locations_id,
                    states_id: computer.states_id,
                    manufacturers_id: computer.manufacturers_id_name || computer.manufacturers_id,
                    assignedUser: computer.users_id
                        ? {
                            id: computer.users_id,
                            name: computer.users_id_name || `User ${computer.users_id}`,
                        }
                        : null,
                })
            })
        }

        // Écrans
        if (inventoryData[1] && Array.isArray(inventoryData[1])) {
            inventoryData[1].forEach((monitor: any) => {
                allInventory.push({
                    id: monitor.id,
                    name: monitor.name,
                    type: "Monitor",
                    brand: monitor.manufacturers_id_name || monitor.manufacturers_id,
                    model: monitor.monitormodels_id_name || monitor.monitormodels_id,
                    serial: monitor.serial,
                    otherserial: monitor.otherserial,
                    status: monitor.states_id_name || monitor.states_id || "N/A",
                    date_creation: monitor.date_creation,
                    date_mod: monitor.date_mod,
                    locations_id: monitor.locations_id,
                    states_id: monitor.states_id,
                    manufacturers_id: monitor.manufacturers_id_name || monitor.manufacturers_id,
                    assignedUser: monitor.users_id
                        ? {
                            id: monitor.users_id,
                            name: monitor.users_id_name || `User ${monitor.users_id}`,
                        }
                        : null,
                })
            })
        }

        // Imprimantes
        if (inventoryData[2] && Array.isArray(inventoryData[2])) {
            inventoryData[2].forEach((printer: any) => {
                allInventory.push({
                    id: printer.id,
                    name: printer.name,
                    type: "Printer",
                    brand: printer.manufacturers_id_name || printer.manufacturers_id,
                    model: printer.printermodels_id_name || printer.printermodels_id,
                    serial: printer.serial,
                    otherserial: printer.otherserial,
                    status: printer.states_id_name || printer.states_id || "N/A",
                    date_creation: printer.date_creation,
                    date_mod: printer.date_mod,
                    locations_id: printer.locations_id,
                    states_id: printer.states_id,
                    manufacturers_id: printer.manufacturers_id_name || printer.manufacturers_id,
                    assignedUser: printer.users_id
                        ? {
                            id: printer.users_id,
                            name: printer.users_id_name || `User ${printer.users_id}`,
                        }
                        : null,
                })
            })
        }

        // Équipements réseau
        if (inventoryData[3] && Array.isArray(inventoryData[3])) {
            inventoryData[3].forEach((network: any) => {
                allInventory.push({
                    id: network.id,
                    name: network.name,
                    type: "NetworkEquipment",
                    brand: network.manufacturers_id_name || network.manufacturers_id,
                    model: network.networkequipmentmodels_id_name || network.networkequipmentmodels_id,
                    serial: network.serial,
                    otherserial: network.otherserial,
                    status: network.states_id_name || network.states_id || "N/A",
                    date_creation: network.date_creation,
                    date_mod: network.date_mod,
                    locations_id: network.locations_id,
                    states_id: network.states_id,
                    manufacturers_id: network.manufacturers_id_name || network.manufacturers_id,
                    assignedUser: network.users_id
                        ? {
                            id: network.users_id,
                            name: network.users_id_name || `User ${network.users_id}`,
                        }
                        : null,
                })
            })
        }

        // Téléphones
        if (inventoryData[4] && Array.isArray(inventoryData[4])) {
            inventoryData[4].forEach((phone: any) => {
                allInventory.push({
                    id: phone.id,
                    name: phone.name,
                    type: "Phone",
                    brand: phone.manufacturers_id_name || phone.manufacturers_id,
                    model: phone.phonemodels_id_name || phone.phonemodels_id,
                    serial: phone.serial,
                    otherserial: phone.otherserial,
                    status: phone.states_id_name || phone.states_id || "N/A",
                    date_creation: phone.date_creation,
                    date_mod: phone.date_mod,
                    locations_id: phone.locations_id,
                    states_id: phone.states_id,
                    manufacturers_id: phone.manufacturers_id_name || phone.manufacturers_id,
                    assignedUser: phone.users_id
                        ? {
                            id: phone.users_id,
                            name: phone.users_id_name || `User ${phone.users_id}`,
                        }
                        : null,
                })
            })
        }

        return NextResponse.json({
            success: true,
            inventory: allInventory,
            total: allInventory.length,
            breakdown: {
                computers: inventoryData[0]?.length || 0,
                monitors: inventoryData[1]?.length || 0,
                printers: inventoryData[2]?.length || 0,
                networkEquipments: inventoryData[3]?.length || 0,
                phones: inventoryData[4]?.length || 0,
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
