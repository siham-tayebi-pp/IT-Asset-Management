import { type NextRequest, NextResponse } from "next/server"

// Configuration GLPI
const GLPI_CONFIG = {
  url: process.env.NEXT_PUBLIC_GLPI_URL || "http://your-glpi-server/apirest.php",
  app_token: process.env.NEXT_PUBLIC_GLPI_APP_TOKEN,
  user_token: process.env.GLPI_USER_TOKEN,
}

interface GLPISession {
  session_token: string
}

interface GLPIUser {
  id: number
  name: string
  realname: string
  firstname: string
  entities_id: number
  profiles_id: number
}

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    // 1. Initialiser une session GLPI
    const sessionResponse = await fetch(`${GLPI_CONFIG.url}/initSession`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "App-Token": GLPI_CONFIG.app_token || "",
      },
      body: JSON.stringify({
        login: username,
        password: password,
      }),
    })

    if (!sessionResponse.ok) {
      return NextResponse.json({ error: "Identifiants GLPI invalides" }, { status: 401 })
    }

    const sessionData: GLPISession = await sessionResponse.json()

    // 2. Récupérer les informations utilisateur
    const userResponse = await fetch(`${GLPI_CONFIG.url}/getMyProfiles`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "App-Token": GLPI_CONFIG.app_token || "",
        "Session-Token": sessionData.session_token,
      },
    })

    if (!userResponse.ok) {
      return NextResponse.json({ error: "Erreur lors de la récupération du profil" }, { status: 500 })
    }

    const userProfiles = await userResponse.json()

    // 3. Récupérer les détails de l'utilisateur
    const userDetailsResponse = await fetch(`${GLPI_CONFIG.url}/getMyEntity`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "App-Token": GLPI_CONFIG.app_token || "",
        "Session-Token": sessionData.session_token,
      },
    })

    const userDetails = await userDetailsResponse.json()

    // 4. Déterminer le rôle basé sur le profil GLPI
    const role = determineUserRole(userProfiles)

    // 5. Récupérer le département/entité
    const department = await getUserDepartment(sessionData.session_token, userDetails.entities_id)

    // 6. Fermer la session GLPI
    await fetch(`${GLPI_CONFIG.url}/killSession`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "App-Token": GLPI_CONFIG.app_token || "",
        "Session-Token": sessionData.session_token,
      },
    })

    // 7. Retourner les informations utilisateur
    return NextResponse.json({
      success: true,
      user: {
        id: userDetails.id,
        username: username,
        role: role,
        department: department,
        fullName: `${userDetails.firstname} ${userDetails.realname}`,
      },
    })
  } catch (error) {
    console.error("Erreur GLPI:", error)
    return NextResponse.json({ error: "Erreur de connexion à GLPI" }, { status: 500 })
  }
}

function determineUserRole(profiles: any[]): string {
  // Logique pour déterminer le rôle basé sur les profils GLPI
  const adminProfiles = ["Super-Admin", "Admin"]
  const delegateProfiles = ["Technician", "Hotliner"]

  for (const profile of profiles) {
    if (adminProfiles.includes(profile.name)) {
      return "admin"
    }
    if (delegateProfiles.includes(profile.name)) {
      return "delegate"
    }
  }

  return "user"
}

async function getUserDepartment(sessionToken: string, entityId: number): Promise<string> {
  try {
    const entityResponse = await fetch(`${GLPI_CONFIG.url}/Entity/${entityId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "App-Token": GLPI_CONFIG.app_token || "",
        "Session-Token": sessionToken,
      },
    })

    if (entityResponse.ok) {
      const entity = await entityResponse.json()
      return entity.name || "Non défini"
    }
  } catch (error) {
    console.error("Erreur lors de la récupération du département:", error)
  }

  return "Non défini"
}
