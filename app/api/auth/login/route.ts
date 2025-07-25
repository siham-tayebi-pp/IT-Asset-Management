import { type NextRequest, NextResponse } from "next/server"

// Configuration GLPI Cloud Iberma
const GLPI_CONFIG = {
  url: process.env.GLPI_API_URL,
  app_token: process.env.GLPI_APP_TOKEN,
  user_token: process.env.GLPI_USER_TOKEN,
}

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()
    console.log("🔐 Tentative de connexion pour:", username)

    if (!username || !password) {
      return NextResponse.json(
        {
          error: "Pardon, soit l'utilisateur soit le mot de passe sont incorrects",
        },
        { status: 400 },
      )
    }

    // Vérifier la configuration GLPI
    if (!GLPI_CONFIG.app_token || !GLPI_CONFIG.url) {
      return NextResponse.json(
        {
          error: "Configuration GLPI requise",
          details: "L'application nécessite une configuration GLPI valide pour fonctionner",
        },
        { status: 500 },
      )
    }

    console.log("🌐 Authentification GLPI Cloud...")
    return await authenticateWithGLPI(username, password)
  } catch (error) {
    console.error("❌ Erreur lors de l'authentification:", error)
    return NextResponse.json(
      {
        error: "Pardon, soit l'utilisateur soit le mot de passe sont incorrects",
      },
      { status: 500 },
    )
  }
}

async function authenticateWithGLPI(username: string, password: string) {
  try {
    console.log("🌐 Authentification GLPI Cloud pour:", username)

    // 1. Tester l'accessibilité de l'API
    console.log("🔍 Test d'accessibilité de l'API...")
    try {
      const testResponse = await fetch(GLPI_CONFIG.url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "App-Token": GLPI_CONFIG.app_token,
        },
      })
      console.log("📊 Status test API:", testResponse.status)
      if (testResponse.status !== 400 && testResponse.status !== 200) {
        throw new Error(`API non accessible (${testResponse.status})`)
      }
    } catch (testError) {
      console.log("❌ Erreur test API:", testError)
      return NextResponse.json(
        {
          error: "Pardon, soit l'utilisateur soit le mot de passe sont incorrects",
        },
        { status: 500 },
      )
    }

    // 2. Initialiser une session GLPI
    console.log("🔐 Initialisation de session GLPI...")
    const sessionPayload = {
      login: username.trim(),
      password: password.trim(),
    }

    const sessionResponse = await fetch(`${GLPI_CONFIG.url}/initSession`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "App-Token": GLPI_CONFIG.app_token,
        "User-Agent": "PC-Management-System/1.0",
      },
      body: JSON.stringify(sessionPayload),
    })

    console.log("📡 Réponse session status:", sessionResponse.status)
    const responseText = await sessionResponse.text()

    if (!sessionResponse.ok) {
      console.log("❌ Erreur session GLPI:", responseText)
      return NextResponse.json(
        {
          error: "Pardon, soit l'utilisateur soit le mot de passe sont incorrects",
        },
        { status: 401 },
      )
    }

    let sessionData
    try {
      sessionData = JSON.parse(responseText)
      console.log("✅ Session GLPI créée:", sessionData.session_token ? "Token reçu" : "Pas de token")
    } catch (parseError) {
      return NextResponse.json(
        {
          error: "Pardon, soit l'utilisateur soit le mot de passe sont incorrects",
        },
        { status: 500 },
      )
    }

    if (!sessionData.session_token) {
      return NextResponse.json(
        {
          error: "Pardon, soit l'utilisateur soit le mot de passe sont incorrects",
        },
        { status: 500 },
      )
    }

    // 3. Récupérer les informations utilisateur complètes
    let userInfo = null
    let role = "user"
    let isActive = false
    let userId = null

    try {
      // Récupérer la session complète avec les infos utilisateur
      const fullSessionResponse = await fetch(`${GLPI_CONFIG.url}/getFullSession`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "App-Token": GLPI_CONFIG.app_token,
          "Session-Token": sessionData.session_token,
        },
      })

      if (fullSessionResponse.ok) {
        const fullSession = await fullSessionResponse.json()
        console.log("👤 Session complète récupérée")

        if (fullSession.session) {
          userInfo = fullSession.session
          userId = userInfo.glpiID

          // Vérifier l'état actif de l'utilisateur
          isActive = checkUserActiveStatus(fullSession)
          console.log("🔍 État actif de l'utilisateur:", isActive)
        }
      }

      // Récupérer les informations utilisateur détaillées si on a l'ID
      let detailedUserInfo = null
      if (userId) {
        try {
          const userDetailResponse = await fetch(`${GLPI_CONFIG.url}/User/${userId}`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "App-Token": GLPI_CONFIG.app_token,
              "Session-Token": sessionData.session_token,
            },
          })

          if (userDetailResponse.ok) {
            detailedUserInfo = await userDetailResponse.json()
            console.log("📋 Informations utilisateur détaillées récupérées")

            // Double vérification de l'état actif depuis les détails utilisateur
            if (detailedUserInfo.is_active !== undefined) {
              isActive =
                detailedUserInfo.is_active === 1 ||
                detailedUserInfo.is_active === "1" ||
                detailedUserInfo.is_active === true
              console.log("🔍 État actif depuis détails utilisateur:", isActive)
            }
          }
        } catch (detailError) {
          console.log("⚠️ Erreur récupération détails utilisateur:", detailError)
        }
      }

      // VÉRIFICATION DU PROFIL SUPER-ADMIN
      if (userId && isActive) {
        console.log("🔍 === DÉBUT VÉRIFICATION PROFIL SUPER-ADMIN ===")
        console.log("🔍 Utilisateur ID:", userId, "- Actif:", isActive)

        try {
          // Récupérer les profils de l'utilisateur connecté
          const myProfilesResponse = await fetch(`${GLPI_CONFIG.url}/getMyProfiles`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "App-Token": GLPI_CONFIG.app_token,
              "Session-Token": sessionData.session_token,
            },
          })

          console.log("📡 Status récupération profils:", myProfilesResponse.status)

          if (myProfilesResponse.ok) {
            const userProfiles = await myProfilesResponse.json()
            console.log("🔍 === PROFILS RÉCUPÉRÉS ===")
            console.log("📋 Données brutes des profils:", JSON.stringify(userProfiles, null, 2))

            // Les profils sont dans userProfiles.myprofiles
            const profilesArray = userProfiles.myprofiles || userProfiles
            console.log("📊 Nombre de profils:", Array.isArray(profilesArray) ? profilesArray.length : "Pas un tableau")

            if (Array.isArray(profilesArray) && profilesArray.length > 0) {
              console.log("🔍 === ANALYSE DES PROFILS ===")

              // Analyser chaque profil
              profilesArray.forEach((profile, index) => {
                console.log(`📋 Profil ${index + 1}:`, {
                  id: profile.id,
                  name: profile.name,
                  rawProfile: profile,
                })
              })

              // Chercher le profil par défaut ou prendre le premier
              console.log("🎯 === RECHERCHE PROFIL SUPER-ADMIN ===")

              // Vérifier chaque profil pour Super-Admin
              let hasSuperAdminProfile = false
              const superAdminPatterns = [
                "super-admin",
                "super admin",
                "superadmin",
                "super administrateur",
                "super-administrateur",
                "super_admin",
              ]

              console.log("🔍 === VÉRIFICATION PATTERNS SUPER-ADMIN ===")

              for (const profile of profilesArray) {
                const profileName = (profile.name || "").toLowerCase().trim()
                console.log(`🔍 Vérification du profil: "${profile.name}" → "${profileName}"`)

                for (const pattern of superAdminPatterns) {
                  const matches = profileName.includes(pattern)
                  console.log(`   Pattern "${pattern}": ${matches ? "✅ MATCH" : "❌ NO MATCH"}`)

                  if (matches) {
                    hasSuperAdminProfile = true
                    console.log(`🎉 === SUPER-ADMIN DÉTECTÉ ===`)
                    console.log(`🎉 Nom: "${profile.name}"`)
                    console.log(`🎉 Pattern: "${pattern}"`)
                    break
                  }
                }

                if (hasSuperAdminProfile) break
              }

              console.log("🏁 === RÉSULTAT FINAL ===")
              console.log("🏁 Super-Admin détecté:", hasSuperAdminProfile ? "✅ OUI" : "❌ NON")

              if (hasSuperAdminProfile) {
                role = "admin"
                console.log("✅ Rôle défini comme: ADMIN")
              } else {
                role = "user"
                console.log("ℹ️ Rôle défini comme: USER")
              }
            } else {
              console.log("⚠️ Aucun profil trouvé dans myprofiles")
              role = "user"
            }
          } else {
            const errorText = await myProfilesResponse.text()
            console.log("❌ Erreur récupération profils:", myProfilesResponse.status, errorText)
            role = "user"
          }
        } catch (profileError) {
          console.log("❌ Erreur lors de la vérification des profils:", profileError)
          role = "user"
        }

        console.log("🔍 === FIN VÉRIFICATION PROFIL SUPER-ADMIN ===")
      } else {
        console.log("⚠️ Utilisateur non actif ou ID manquant - rôle par défaut: user")
        console.log("⚠️ UserId:", userId, "- isActive:", isActive)
        role = "user"
      }

      console.log("🎯 === RÔLE FINAL ATTRIBUÉ ===")
      console.log("🎯 Rôle:", role)
      console.log("🎯 Username:", username)

      // 4. Fermer la session GLPI
      try {
        await fetch(`${GLPI_CONFIG.url}/killSession`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "App-Token": GLPI_CONFIG.app_token,
            "Session-Token": sessionData.session_token,
          },
        })
      } catch (killError) {
        console.log("⚠️ Erreur fermeture session GLPI:", killError)
      }

      // 5. Construire la réponse utilisateur
      const fullName = detailedUserInfo
        ? `${detailedUserInfo.firstname || ""} ${detailedUserInfo.realname || ""}`.trim() || detailedUserInfo.name
        : userInfo
          ? `${userInfo.glpifirstname || ""} ${userInfo.glpirealname || ""}`.trim() || userInfo.glpiname
          : username

      console.log("✅ Authentification GLPI réussie pour:", username, "- Rôle:", role, "- Actif:", isActive)

      return NextResponse.json({
        success: true,
        user: {
          id: userId || username,
          username: username,
          fullName: fullName,
          firstname: detailedUserInfo?.firstname || userInfo?.glpifirstname || "",
          realname: detailedUserInfo?.realname || userInfo?.glpirealname || "",
          email: detailedUserInfo?.email || "",
          phone: detailedUserInfo?.phone || "",
          role: role,
          isActive: isActive,
          department: "Non défini",
          source: "glpi-cloud",
          server: "iberma.with30.glpi-network.cloud",
          glpiInfo: {
            ...userInfo,
            detailedInfo: detailedUserInfo,
          },
        },
      })
    } catch (profileError) {
      console.log("⚠️ Erreur lors de la récupération des informations utilisateur:", profileError)

      // Fermer la session même en cas d'erreur
      try {
        await fetch(`${GLPI_CONFIG.url}/killSession`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "App-Token": GLPI_CONFIG.app_token,
            "Session-Token": sessionData.session_token,
          },
        })
      } catch (killError) {
        console.log("⚠️ Erreur fermeture session GLPI:", killError)
      }

      return NextResponse.json(
        {
          error: "Pardon, soit l'utilisateur soit le mot de passe sont incorrects",
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("❌ Erreur GLPI:", error)
    return NextResponse.json(
      {
        error: "Pardon, soit l'utilisateur soit le mot de passe sont incorrects",
      },
      { status: 500 },
    )
  }
}

function checkUserActiveStatus(fullSession: any): boolean {
  // Vérifier différents endroits où l'état actif peut être stocké
  if (fullSession.session) {
    // Vérifier is_active
    if (fullSession.session.is_active !== undefined) {
      const isActive =
        fullSession.session.is_active === 1 ||
        fullSession.session.is_active === "1" ||
        fullSession.session.is_active === true
      console.log("🔍 État actif trouvé dans session.is_active:", fullSession.session.is_active, "→", isActive)
      return isActive
    }

    // Vérifier glpiactive
    if (fullSession.session.glpiactive !== undefined) {
      const isActive =
        fullSession.session.glpiactive === 1 ||
        fullSession.session.glpiactive === "1" ||
        fullSession.session.glpiactive === true
      console.log("🔍 État actif trouvé dans session.glpiactive:", fullSession.session.glpiactive, "→", isActive)
      return isActive
    }

    // Vérifier active
    if (fullSession.session.active !== undefined) {
      const isActive =
        fullSession.session.active === 1 || fullSession.session.active === "1" || fullSession.session.active === true
      console.log("🔍 État actif trouvé dans session.active:", fullSession.session.active, "→", isActive)
      return isActive
    }
  }

  console.log("⚠️ État actif non trouvé, considéré comme actif par défaut pour les connexions réussies")
  return true // Si on arrive à se connecter, on considère l'utilisateur comme actif
}
