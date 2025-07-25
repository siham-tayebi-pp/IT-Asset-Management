import { type NextRequest, NextResponse } from "next/server"

// Configuration spécifique pour GLPI Cloud
const GLPI_CONFIG = {
  url: process.env.NEXT_PUBLIC_GLPI_URL || "http://192.168.0.57/glpi/apirest.php",
  app_token: process.env.NEXT_PUBLIC_GLPI_APP_TOKEN,
  user_token: process.env.NEXT_PUBLIC_GLPI_USER_TOKEN,
}

export async function GET(request: NextRequest) {
  console.log("🔍 Test de connexion GLPI Cloud...")
  console.log("📡 URL:", GLPI_CONFIG.url)
  console.log("🔑 App Token:", GLPI_CONFIG.app_token ? "Configuré" : "Manquant")
  console.log("👤 User Token:", GLPI_CONFIG.user_token ? "Configuré" : "Manquant")

  // Vérifier la configuration
  const missingConfig = {
    NEXT_PUBLIC_GLPI_URL: !GLPI_CONFIG.url,
    NEXT_PUBLIC_GLPI_APP_TOKEN: !GLPI_CONFIG.app_token,
    NEXT_PUBLIC_GLPI_USER_TOKEN: !GLPI_CONFIG.user_token,
  }

  if (missingConfig.NEXT_PUBLIC_GLPI_URL || missingConfig.NEXT_PUBLIC_GLPI_APP_TOKEN) {
    return NextResponse.json({
      error: "Configuration GLPI manquante",
      missing: missingConfig,
      instructions: {
        step1: "Connectez-vous à votre instance GLPI",
        step2: "Allez dans Configuration > Générale > API",
        step3: "Activez l'API REST",
        step4: "Créez un App Token dans 'Clients API'",
        step5: "Ajoutez NEXT_PUBLIC_GLPI_URL et NEXT_PUBLIC_GLPI_APP_TOKEN dans les variables d'environnement",
      },
    })
  }

  try {
    // Test 1: Vérifier l'accessibilité de l'API
    console.log("🌐 Test d'accessibilité de l'API...")

    const healthResponse = await fetch(GLPI_CONFIG.url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "App-Token": GLPI_CONFIG.app_token!,
      },
    })

    console.log("📊 Status API:", healthResponse.status)

    // Pour GLPI, un status 400 sur GET / est normal (endpoint non supporté)
    if (healthResponse.status !== 400 && healthResponse.status !== 200) {
      return NextResponse.json({
        error: "API GLPI non accessible",
        status: healthResponse.status,
        url: GLPI_CONFIG.url,
        suggestions: [
          "Vérifiez que l'URL est correcte",
          "Vérifiez que l'API REST est activée dans GLPI",
          "Vérifiez votre connexion internet",
        ],
      })
    }

    console.log("✅ API accessible")

    // Test 2: Tester avec User Token si disponible
    if (GLPI_CONFIG.user_token) {
      console.log("🔐 Test avec User Token...")

      const sessionResponse = await fetch(`${GLPI_CONFIG.url}/initSession`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "App-Token": GLPI_CONFIG.app_token!,
          Authorization: `user_token ${GLPI_CONFIG.user_token}`,
        },
      })

      console.log("📡 Status session:", sessionResponse.status)

      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json()
        console.log("✅ Session créée avec User Token")

        // Test 3: Récupérer quelques ordinateurs
        const computersResponse = await fetch(`${GLPI_CONFIG.url}/Computer?range=0-5`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "App-Token": GLPI_CONFIG.app_token!,
            "Session-Token": sessionData.session_token,
          },
        })

        let computers = []
        if (computersResponse.ok) {
          computers = await computersResponse.json()
          console.log(`💻 ${computers.length} ordinateurs trouvés`)
        } else {
          console.log("⚠️ Erreur récupération ordinateurs:", computersResponse.status)
        }

        // Test 4: Récupérer les profils
        const profilesResponse = await fetch(`${GLPI_CONFIG.url}/getMyProfiles`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "App-Token": GLPI_CONFIG.app_token!,
            "Session-Token": sessionData.session_token,
          },
        })

        let profiles = []
        if (profilesResponse.ok) {
          profiles = await profilesResponse.json()
          console.log(`👤 ${profiles.length} profils trouvés`)
        }

        // Fermer la session
        await fetch(`${GLPI_CONFIG.url}/killSession`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "App-Token": GLPI_CONFIG.app_token!,
            "Session-Token": sessionData.session_token,
          },
        })

        return NextResponse.json({
          success: true,
          message: "✅ Connexion GLPI Cloud réussie !",
          server: GLPI_CONFIG.url,
          data: {
            session_created: true,
            computers_count: computers.length,
            profiles_count: profiles.length,
            sample_computers: computers.slice(0, 3).map((c: any) => ({
              id: c.id,
              name: c.name,
              serial: c.serial,
            })),
            available_profiles: profiles.map((p: any) => p.name || p.profiles_name),
          },
        })
      } else {
        const errorData = await sessionResponse.text()
        console.log("❌ Erreur session User Token:", errorData)

        return NextResponse.json({
          error: "Erreur avec User Token",
          status: sessionResponse.status,
          details: errorData,
          suggestions: [
            "Vérifiez que le User Token est valide",
            "Vérifiez que l'utilisateur a les droits API",
            "Régénérez le User Token dans GLPI",
          ],
        })
      }
    } else {
      // Test 3: Tester l'authentification par identifiants (simulation)
      console.log("🧪 Test d'authentification par identifiants...")

      const testSessionResponse = await fetch(`${GLPI_CONFIG.url}/initSession`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "App-Token": GLPI_CONFIG.app_token!,
        },
        body: JSON.stringify({
          login: "test",
          password: "test",
        }),
      })

      console.log("📡 Status test auth:", testSessionResponse.status)
      const testResponseText = await testSessionResponse.text()

      return NextResponse.json({
        warning: "User Token manquant",
        message: "L'API est accessible mais aucun User Token configuré",
        api_status: "accessible",
        auth_test: {
          status: testSessionResponse.status,
          response: testResponseText.substring(0, 200) + (testResponseText.length > 200 ? "..." : ""),
        },
        next_steps: [
          "Connectez-vous à GLPI avec un compte administrateur",
          "Allez dans votre profil utilisateur",
          "Générez un User Token dans 'Paramètres personnels'",
          "Ajoutez NEXT_PUBLIC_GLPI_USER_TOKEN dans les variables d'environnement",
        ],
      })
    }
  } catch (error) {
    console.error("❌ Erreur test GLPI:", error)

    return NextResponse.json({
      error: "Erreur de connexion",
      details: error instanceof Error ? error.message : "Erreur inconnue",
      server: GLPI_CONFIG.url,
      troubleshooting: [
        "Vérifiez votre connexion internet",
        "Vérifiez que l'URL GLPI est correcte",
        "Vérifiez que l'API est activée dans GLPI",
        "Vérifiez les tokens d'API",
      ],
    })
  }
}