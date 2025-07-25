import { type NextRequest, NextResponse } from "next/server"

const GLPI_CONFIG = {
  url: process.env.NEXT_PUBLIC_GLPI_URL || "http://192.168.0.57/glpi/apirest.php",
  app_token: process.env.NEXT_PUBLIC_GLPI_APP_TOKEN,
  user_token: process.env.NEXT_PUBLIC_GLPI_USER_TOKEN,
}

async function initSession() {
  if (!GLPI_CONFIG.app_token || !GLPI_CONFIG.user_token) {
    throw new Error("Configuration GLPI incomplète")
  }

  const sessionResponse = await fetch(`${GLPI_CONFIG.url}/initSession`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "App-Token": GLPI_CONFIG.app_token,
      Authorization: `user_token ${GLPI_CONFIG.user_token}`,
    },
  })

  if (!sessionResponse.ok) {
    throw new Error("Erreur d'authentification GLPI")
  }

  return sessionResponse.json()
}

async function killSession(sessionToken: string) {
  try {
    await fetch(`${GLPI_CONFIG.url}/killSession`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "App-Token": GLPI_CONFIG.app_token!,
        "Session-Token": sessionToken,
      },
    })
  } catch (error) {
    console.error("Erreur lors de la fermeture de session:", error)
  }
}

export async function GET(request: NextRequest) {
  let session: { session_token: string } | null = null
  try {
    console.log("📊 Récupération des ordinateurs depuis GLPI...")
    session = await initSession()

    const computersResponse = await fetch(`${GLPI_CONFIG.url}/Computer?range=0-100&expand_dropdowns=true`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "App-Token": GLPI_CONFIG.app_token!,
        "Session-Token": session!.session_token,
      },
    })

    if (!computersResponse.ok) {
      throw new Error("Erreur lors de la récupération des ordinateurs")
    }

    const computers = await computersResponse.json()
    console.log(`💻 ${computers.length} ordinateurs trouvés`)

    const transformedPCs = await Promise.all(
      computers.map(async (computer: any) => {
        let assignedUser = null
        if (computer.users_id && computer.users_id > 0) {
          assignedUser = await getUser(session!.session_token, computer.users_id)
        }

        const status = determineComputerStatus(computer, assignedUser)
        const specs = await getComputerSpecs(session!.session_token, computer.id)

        return {
          id: computer.id.toString(),
          name: computer.name || `PC-${computer.id}`,
          owner: assignedUser?.name || assignedUser?.login || undefined,
          department: computer.locations_name || computer.entities_name || "Non défini",
          status: status,
          lastSeen: computer.date_mod || new Date().toISOString(),
          specs: {
            ram: specs.ram || computer.memory || "Non défini",
            cpu: specs.cpu || "Non défini",
            os: computer.operatingsystems_name || "Non défini",
          },
          isOnLeave: false,
        }
      }),
    )

    console.log(`✅ ${transformedPCs.length} PC transformés`)

    return NextResponse.json({
      success: true,
      pcs: transformedPCs,
    })
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des PC GLPI:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  } finally {
    if (session) {
      await killSession(session.session_token)
    }
  }
}

async function getUser(sessionToken: string, userId: number) {
  try {
    const userResponse = await fetch(`${GLPI_CONFIG.url}/User/${userId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "App-Token": GLPI_CONFIG.app_token!,
        "Session-Token": sessionToken,
      },
    })

    if (userResponse.ok) {
      return await userResponse.json()
    }
  } catch (error) {
    console.error("Erreur lors de la récupération de l'utilisateur:", error)
  }

  return null
}

async function getComputerSpecs(sessionToken: string, computerId: number) {
  try {
    const itemsResponse = await fetch(`${GLPI_CONFIG.url}/Computer/${computerId}/Item_DeviceMemory`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "App-Token": GLPI_CONFIG.app_token!,
        "Session-Token": sessionToken,
      },
    })

    let ram = "Non défini"
    if (itemsResponse.ok) {
      const memoryItems = await itemsResponse.json()
      if (memoryItems && memoryItems.length > 0) {
        const totalMemory = memoryItems.reduce((total: number, item: any) => {
          return total + (Number.parseInt(item.size) || 0)
        }, 0)
        if (totalMemory > 0) {
          ram = `${totalMemory} MB`
        }
      }
    }

    return { ram, cpu: "Non défini" }
  } catch (error) {
    console.error("Erreur lors de la récupération des spécifications:", error)
    return { ram: "Non défini", cpu: "Non défini" }
  }
}

function determineComputerStatus(computer: any, assignedUser: any): "assigned" | "unassigned" | "delegate" {
  if (!assignedUser) return "unassigned"

  if (assignedUser.profiles_id === 4 || assignedUser.name?.toLowerCase().includes("tech")) {
    return "delegate"
  }

  return "assigned"
}