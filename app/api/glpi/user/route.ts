import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    // Récupérer les informations de l'utilisateur depuis le body de la requête
    const { userId, username } = await req.json()

    console.log("🚀 === DÉBUT RECHERCHE UTILISATEUR ===")
    console.log("📝 Paramètres reçus:", { userId, username })

    if (!userId && !username) {
      console.log("❌ Paramètres manquants")
      return NextResponse.json({ error: "Informations utilisateur manquantes" }, { status: 400 })
    }

    const { NEXT_PUBLIC_GLPI_URL, NEXT_PUBLIC_GLPI_APP_TOKEN, NEXT_PUBLIC_GLPI_USER_TOKEN } = process.env

    if (!NEXT_PUBLIC_GLPI_URL || !NEXT_PUBLIC_GLPI_APP_TOKEN || !NEXT_PUBLIC_GLPI_USER_TOKEN) {
      console.log("❌ Variables d'environnement manquantes")
      return NextResponse.json({ error: "Variables d'environnement manquantes" }, { status: 500 })
    }

    console.log("🌐 Configuration GLPI:", {
      url: NEXT_PUBLIC_GLPI_URL,
      hasAppToken: !!NEXT_PUBLIC_GLPI_APP_TOKEN,
      hasUserToken: !!NEXT_PUBLIC_GLPI_USER_TOKEN,
    })

    let sessionToken: string | null = null

    try {
      // 1. Init session
      console.log("🔐 Initialisation session GLPI...")
      const sessionRes = await fetch(`${NEXT_PUBLIC_GLPI_URL}initSession`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN,
          Authorization: `user_token ${NEXT_PUBLIC_GLPI_USER_TOKEN}`,
        },
      })

      console.log("📡 Réponse session status:", sessionRes.status)

      if (!sessionRes.ok) {
        const error = await sessionRes.text()
        console.log("❌ Erreur session GLPI:", error)
        return NextResponse.json({ error: "Erreur session GLPI", details: error }, { status: 500 })
      }

      const sessionData = await sessionRes.json()
      sessionToken = sessionData.session_token
      console.log("✅ Session créée, token:", sessionToken ? "PRÉSENT" : "ABSENT")

      // 2. Rechercher l'utilisateur par nom d'utilisateur ou ID
      let user = null
      const computerId = null

      console.log("🔍 === RECHERCHE UTILISATEUR ===")
      console.log("🔍 Recherche pour:", username, "ID:", userId)

      // Méthode 1: Recherche par ID si disponible
      if (userId && userId !== username) {
        try {
          console.log("🔍 [MÉTHODE 1] Recherche par ID:", userId)
          const userRes = await fetch(`${NEXT_PUBLIC_GLPI_URL}User/${userId}`, {
            headers: {
              "Content-Type": "application/json",
              "Session-Token": sessionToken,
              "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN,
            },
          })
          console.log("📡 Status recherche par ID:", userRes.status)

          if (userRes.ok) {
            user = await userRes.json()
            console.log("✅ [MÉTHODE 1] Utilisateur trouvé par ID:", {
              id: user.id,
              name: user.name,
              firstname: user.firstname,
              realname: user.realname,
            })
          } else {
            const errorText = await userRes.text()
            console.log("❌ [MÉTHODE 1] Utilisateur non trouvé par ID:", userRes.status, errorText)
          }
        } catch (err) {
          console.log("⚠️ [MÉTHODE 1] Erreur recherche utilisateur par ID:", err)
        }
      }

      // Méthode 2: Recherche par nom d'utilisateur exact avec l'API search
      if (!user) {
        try {
          console.log("🔍 [MÉTHODE 2] Recherche par nom exact:", username)
          const searchUrl = `${NEXT_PUBLIC_GLPI_URL}search/User?criteria[0][field]=1&criteria[0][searchtype]=equals&criteria[0][value]=${encodeURIComponent(username)}`
          console.log("🔗 URL de recherche:", searchUrl)

          const userSearchRes = await fetch(searchUrl, {
            headers: {
              "Content-Type": "application/json",
              "Session-Token": sessionToken,
              "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN,
            },
          })

          console.log("📡 Status recherche par nom exact:", userSearchRes.status)

          if (userSearchRes.ok) {
            const searchResult = await userSearchRes.json()
            console.log("📊 [MÉTHODE 2] Résultat recherche par nom exact:", {
              totalcount: searchResult.totalcount,
              count: searchResult.count,
              data: searchResult.data,
            })

            if (searchResult.data && searchResult.data.length > 0) {
              const foundUserId = searchResult.data[0][2]
              console.log("🎯 [MÉTHODE 2] ID utilisateur trouvé:", foundUserId)

              // Récupérer les détails complets de l'utilisateur
              const userDetailRes = await fetch(`${NEXT_PUBLIC_GLPI_URL}User/${foundUserId}`, {
                headers: {
                  "Content-Type": "application/json",
                  "Session-Token": sessionToken,
                  "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN,
                },
              })

              console.log("📡 Status détails utilisateur:", userDetailRes.status)

              if (userDetailRes.ok) {
                user = await userDetailRes.json()
                console.log("✅ [MÉTHODE 2] Utilisateur trouvé par recherche exacte:", {
                  id: user.id,
                  name: user.name,
                  firstname: user.firstname,
                  realname: user.realname,
                })
              } else {
                const errorText = await userDetailRes.text()
                console.log("❌ [MÉTHODE 2] Erreur récupération détails:", userDetailRes.status, errorText)
              }
            } else {
              console.log("❌ [MÉTHODE 2] Aucun résultat trouvé")
            }
          } else {
            const errorText = await userSearchRes.text()
            console.log("❌ [MÉTHODE 2] Erreur API search User:", userSearchRes.status, errorText)
          }
        } catch (err) {
          console.log("⚠️ [MÉTHODE 2] Erreur recherche utilisateur par nom exact:", err)
        }
      }

      // Méthode 3: Recherche par nom d'utilisateur avec contains (plus flexible)
      if (!user) {
        try {
          console.log("🔍 [MÉTHODE 3] Recherche par nom flexible:", username)
          const searchUrl = `${NEXT_PUBLIC_GLPI_URL}search/User?criteria[0][field]=1&criteria[0][searchtype]=contains&criteria[0][value]=${encodeURIComponent(username)}`
          console.log("🔗 URL de recherche flexible:", searchUrl)

          const userSearchRes = await fetch(searchUrl, {
            headers: {
              "Content-Type": "application/json",
              "Session-Token": sessionToken,
              "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN,
            },
          })

          console.log("📡 Status recherche flexible:", userSearchRes.status)

          if (userSearchRes.ok) {
            const searchResult = await userSearchRes.json()
            console.log("📊 [MÉTHODE 3] Résultat recherche flexible:", {
              totalcount: searchResult.totalcount,
              count: searchResult.count,
              data: searchResult.data,
            })

            if (searchResult.data && searchResult.data.length > 0) {
              // Chercher l'utilisateur exact dans les résultats
              for (const userRow of searchResult.data) {
                const foundUserId = userRow[2]
                const foundUserName = userRow[1]

                console.log("🔍 [MÉTHODE 3] Comparaison:", {
                  foundUserName,
                  username,
                  match: foundUserName === username,
                })

                if (foundUserName === username) {
                  console.log("🎯 [MÉTHODE 3] Utilisateur exact trouvé:", foundUserName)

                  const userDetailRes = await fetch(`${NEXT_PUBLIC_GLPI_URL}User/${foundUserId}`, {
                    headers: {
                      "Content-Type": "application/json",
                      "Session-Token": sessionToken,
                      "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN,
                    },
                  })

                  if (userDetailRes.ok) {
                    user = await userDetailRes.json()
                    console.log("✅ [MÉTHODE 3] Utilisateur trouvé par recherche flexible:", {
                      id: user.id,
                      name: user.name,
                      firstname: user.firstname,
                      realname: user.realname,
                    })
                    break
                  }
                }
              }

              // Si pas de correspondance exacte, prendre le premier résultat
              if (!user && searchResult.data.length > 0) {
                const foundUserId = searchResult.data[0][2]
                console.log("🔍 [MÉTHODE 3] Prise du premier résultat, ID:", foundUserId)

                const userDetailRes = await fetch(`${NEXT_PUBLIC_GLPI_URL}User/${foundUserId}`, {
                  headers: {
                    "Content-Type": "application/json",
                    "Session-Token": sessionToken,
                    "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN,
                  },
                })

                if (userDetailRes.ok) {
                  user = await userDetailRes.json()
                  console.log("✅ [MÉTHODE 3] Premier utilisateur pris:", {
                    id: user.id,
                    name: user.name,
                    firstname: user.firstname,
                    realname: user.realname,
                  })
                }
              }
            } else {
              console.log("❌ [MÉTHODE 3] Aucun résultat trouvé")
            }
          } else {
            const errorText = await userSearchRes.text()
            console.log("❌ [MÉTHODE 3] Erreur API search User flexible:", userSearchRes.status, errorText)
          }
        } catch (err) {
          console.log("⚠️ [MÉTHODE 3] Erreur recherche utilisateur flexible:", err)
        }
      }

      // Méthode 4: Recherche directe avec l'ancienne méthode (fallback)
      if (!user) {
        try {
          console.log("🔍 [MÉTHODE 4] Recherche directe (fallback):", username)
          const searchUrl = `${NEXT_PUBLIC_GLPI_URL}User?searchText=${encodeURIComponent(username)}`
          console.log("🔗 URL de recherche directe:", searchUrl)

          const userSearchRes = await fetch(searchUrl, {
            headers: {
              "Content-Type": "application/json",
              "Session-Token": sessionToken,
              "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN,
            },
          })

          console.log("📡 Status recherche directe:", userSearchRes.status)

          if (userSearchRes.ok) {
            const users = await userSearchRes.json()
            console.log("📊 [MÉTHODE 4] Résultat recherche directe:", {
              isArray: Array.isArray(users),
              length: Array.isArray(users) ? users.length : "N/A",
              users: Array.isArray(users) ? users.map((u) => ({ id: u.id, name: u.name })) : users,
            })

            if (Array.isArray(users) && users.length > 0) {
              // Trouver l'utilisateur exact
              user = users.find((u) => u.name === username) || users[0]
              console.log("✅ [MÉTHODE 4] Utilisateur trouvé par recherche directe:", {
                id: user?.id,
                name: user?.name,
                firstname: user?.firstname,
                realname: user?.realname,
              })
            }
          } else {
            const errorText = await userSearchRes.text()
            console.log("❌ [MÉTHODE 4] Erreur recherche directe:", userSearchRes.status, errorText)
          }
        } catch (err) {
          console.log("⚠️ [MÉTHODE 4] Erreur recherche utilisateur directe:", err)
        }
      }

      console.log("🔍 === RÉSULTAT FINAL RECHERCHE UTILISATEUR ===")
      console.log(
        "🎯 Utilisateur trouvé:",
        user
          ? {
            id: user.id,
            name: user.name,
            firstname: user.firstname,
            realname: user.realname,
          }
          : "NON TROUVÉ",
      )

      if (!user) {
        console.log("❌ Aucune méthode de recherche n'a fonctionné pour:", username)
        return NextResponse.json(
          {
            error: `Utilisateur non trouvé dans GLPI: ${username}`,
            details:
              "L'utilisateur n'existe pas dans la base GLPI ou n'est pas accessible. Vérifiez que l'utilisateur existe et est actif.",
            suggestions: [
              "Vérifiez l'orthographe du nom d'utilisateur",
              "Assurez-vous que l'utilisateur existe dans GLPI",
              "Vérifiez que l'utilisateur est actif",
              "Contactez l'administrateur GLPI",
            ],
          },
          { status: 404 },
        )
      }

      // 3. Rechercher l'ordinateur assigné à cet utilisateur
      let computer = null
      try {
        console.log("💻 === RECHERCHE ORDINATEUR ===")
        console.log("💻 Recherche ordinateur pour utilisateur ID:", user.id)

        // Recherche des ordinateurs où cet utilisateur est assigné (champ users_id = 70)
        const computerSearchUrl = `${NEXT_PUBLIC_GLPI_URL}search/Computer?criteria[0][field]=70&criteria[0][searchtype]=equals&criteria[0][value]=${user.id}&forcedisplay[0]=2&forcedisplay[1]=1&forcedisplay[2]=5&forcedisplay[3]=6&forcedisplay[4]=23&forcedisplay[5]=40&forcedisplay[6]=4&forcedisplay[7]=31`
        console.log("🔗 URL recherche ordinateur par users_id:", computerSearchUrl)

        const computerSearchRes = await fetch(computerSearchUrl, {
          headers: {
            "Content-Type": "application/json",
            "Session-Token": sessionToken,
            "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN,
          },
        })

        console.log("📡 Status recherche ordinateur par users_id:", computerSearchRes.status)

        if (computerSearchRes.ok) {
          const computerSearchResult = await computerSearchRes.json()
          console.log("📊 Résultat recherche ordinateur par users_id:", {
            totalcount: computerSearchResult.totalcount,
            count: computerSearchResult.count,
            data: computerSearchResult.data,
          })

          if (computerSearchResult.data && computerSearchResult.data.length > 0) {
            const firstResult = computerSearchResult.data[0]

            // Extraire l'ID de l'ordinateur depuis les résultats de recherche
            let computerId = null
            if (Array.isArray(firstResult)) {
              computerId = firstResult[0] // L'ID est généralement dans la première colonne
            } else if (typeof firstResult === "object") {
              computerId = firstResult["2"] || firstResult["0"] || firstResult.id
            }

            console.log("🎯 ID ordinateur extrait:", computerId)
            console.log("📊 Structure des données:", firstResult)

            if (computerId) {
              // Récupérer les détails complets de l'ordinateur avec cet ID spécifique
              console.log("💻 Récupération détails ordinateur ID:", computerId)
              const computerRes = await fetch(`${NEXT_PUBLIC_GLPI_URL}Computer/${computerId}`, {
                headers: {
                  "Content-Type": "application/json",
                  "Session-Token": sessionToken,
                  "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN,
                },
              })

              console.log("📡 Status détails ordinateur:", computerRes.status)

              if (computerRes.ok) {
                computer = await computerRes.json()

                // Récupérer les noms réels des références (modèle, type, fabricant, etc.)
                try {
                  // Récupérer le nom du modèle
                  if (computer.computermodels_id) {
                    const modelRes = await fetch(`${NEXT_PUBLIC_GLPI_URL}ComputerModel/${computer.computermodels_id}`, {
                      headers: {
                        "Content-Type": "application/json",
                        "Session-Token": sessionToken,
                        "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN,
                      },
                    })
                    if (modelRes.ok) {
                      const modelData = await modelRes.json()
                      computer.model_name = modelData.name
                    }
                  }

                  // Récupérer le nom du type
                  if (computer.computertypes_id) {
                    const typeRes = await fetch(`${NEXT_PUBLIC_GLPI_URL}ComputerType/${computer.computertypes_id}`, {
                      headers: {
                        "Content-Type": "application/json",
                        "Session-Token": sessionToken,
                        "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN,
                      },
                    })
                    if (typeRes.ok) {
                      const typeData = await typeRes.json()
                      computer.type_name = typeData.name
                    }
                  }

                  // Récupérer le nom du fabricant
                  if (computer.manufacturers_id) {
                    const manufacturerRes = await fetch(
                      `${NEXT_PUBLIC_GLPI_URL}Manufacturer/${computer.manufacturers_id}`,
                      {
                        headers: {
                          "Content-Type": "application/json",
                          "Session-Token": sessionToken,
                          "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN,
                        },
                      },
                    )
                    if (manufacturerRes.ok) {
                      const manufacturerData = await manufacturerRes.json()
                      computer.manufacturer_name = manufacturerData.name
                    }
                  }

                  // Récupérer le nom du statut
                  if (computer.states_id) {
                    const stateRes = await fetch(`${NEXT_PUBLIC_GLPI_URL}State/${computer.states_id}`, {
                      headers: {
                        "Content-Type": "application/json",
                        "Session-Token": sessionToken,
                        "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN,
                      },
                    })
                    if (stateRes.ok) {
                      const stateData = await stateRes.json()
                      computer.state_name = stateData.name
                    }
                  }

                  // Récupérer le nom du groupe
                  if (computer.groups_id) {
                    const groupRes = await fetch(`${NEXT_PUBLIC_GLPI_URL}Group/${computer.groups_id}`, {
                      headers: {
                        "Content-Type": "application/json",
                        "Session-Token": sessionToken,
                        "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN,
                      },
                    })
                    if (groupRes.ok) {
                      const groupData = await groupRes.json()
                      computer.group_name = groupData.name
                    }
                  }
                } catch (err) {
                  console.log("⚠️ Erreur récupération noms des références:", err)
                }

                console.log("✅ Détails ordinateur récupérés:", {
                  id: computer.id,
                  name: computer.name,
                  serial: computer.serial,
                  otherserial: computer.otherserial,
                  model_name: computer.model_name,
                  type_name: computer.type_name,
                  manufacturer_name: computer.manufacturer_name,
                  state_name: computer.state_name,
                })
              } else {
                const errorText = await computerRes.text()
                console.log("❌ Erreur récupération détails ordinateur:", computerRes.status, errorText)
              }
            } else {
              console.log("❌ Impossible d'extraire l'ID de l'ordinateur")
            }
          }
        } else {
          const errorText = await computerSearchRes.text()
          console.log("❌ Erreur recherche ordinateur par users_id:", computerSearchRes.status, errorText)
        }

        if (!computer) {
          console.log("❌ Aucun ordinateur trouvé pour l'utilisateur")
        }
      } catch (err) {
        console.log("⚠️ Erreur recherche ordinateur:", err)
      }

      // 4. Récupérer le système d'exploitation si ordinateur trouvé
      let operatingSystem = null
      if (computerId) {
        console.log("🖥️ === RECHERCHE SYSTÈME D'EXPLOITATION ===")
        try {
          // Recherche du système d'exploitation lié à cet ordinateur
          const osSearchUrl = `${NEXT_PUBLIC_GLPI_URL}search/Item_OperatingSystem?criteria[0][field]=2&criteria[0][searchtype]=equals&criteria[0][value]=${computerId}&criteria[1][field]=1&criteria[1][searchtype]=equals&criteria[1][value]=Computer`
          console.log("🔗 URL recherche OS:", osSearchUrl)

          const osSearchRes = await fetch(osSearchUrl, {
            headers: {
              "Content-Type": "application/json",
              "Session-Token": sessionToken,
              "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN,
            },
          })

          console.log("📡 Status recherche OS:", osSearchRes.status)

          if (osSearchRes.ok) {
            const osSearchResult = await osSearchRes.json()
            console.log("📊 Résultat recherche OS:", {
              totalcount: osSearchResult.totalcount,
              count: osSearchResult.count,
              data: osSearchResult.data,
            })

            if (osSearchResult.data && osSearchResult.data.length > 0) {
              const osItemId = osSearchResult.data[0][2]
              console.log("🖥️ OS Item ID trouvé:", osItemId)

              const osDetailRes = await fetch(`${NEXT_PUBLIC_GLPI_URL}Item_OperatingSystem/${osItemId}`, {
                headers: {
                  "Content-Type": "application/json",
                  "Session-Token": sessionToken,
                  "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN,
                },
              })

              console.log("📡 Status détails OS:", osDetailRes.status)

              if (osDetailRes.ok) {
                operatingSystem = await osDetailRes.json()
                console.log("✅ Système d'exploitation trouvé:", {
                  id: operatingSystem.id,
                  name: operatingSystem.name,
                  version: operatingSystem.version,
                })
              }
            }
          }
        } catch (err) {
          console.log("⚠️ Erreur récupération OS:", err)
        }
      }

      // 5. Récupérer les composants de base de l'ordinateur
      const componentsData: Record<string, any[]> = {}
      if (computer && computer.id) {
        console.log("🔧 === RÉCUPÉRATION COMPOSANTS ===")
        console.log("🔧 Récupération des composants pour ordinateur ID:", computer.id)

        try {
          // Récupérer les processeurs avec leurs détails
          const processorRes = await fetch(`${NEXT_PUBLIC_GLPI_URL}Computer/${computer.id}/Item_DeviceProcessor`, {
            headers: {
              "Content-Type": "application/json",
              "Session-Token": sessionToken,
              "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN,
            },
          })

          if (processorRes.ok) {
            const processors = await processorRes.json()
            if (Array.isArray(processors) && processors.length > 0) {
              // Enrichir chaque processeur avec ses détails
              for (const processor of processors) {
                if (processor.deviceprocessors_id) {
                  try {
                    const processorDetailRes = await fetch(
                      `${NEXT_PUBLIC_GLPI_URL}DeviceProcessor/${processor.deviceprocessors_id}`,
                      {
                        headers: {
                          "Content-Type": "application/json",
                          "Session-Token": sessionToken,
                          "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN,
                        },
                      },
                    )
                    if (processorDetailRes.ok) {
                      const processorDetail = await processorDetailRes.json()
                      processor.details = { DeviceProcessor: processorDetail }
                    }
                  } catch (err) {
                    console.log("⚠️ Erreur récupération détail processeur:", err)
                  }
                }
              }
              componentsData.processor = processors
              console.log("✅ Processeurs récupérés:", processors.length)
            }
          }

          // Récupérer la mémoire avec ses détails
          const memoryRes = await fetch(`${NEXT_PUBLIC_GLPI_URL}Computer/${computer.id}/Item_DeviceMemory`, {
            headers: {
              "Content-Type": "application/json",
              "Session-Token": sessionToken,
              "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN,
            },
          })

          if (memoryRes.ok) {
            const memory = await memoryRes.json()
            if (Array.isArray(memory) && memory.length > 0) {
              // Enrichir chaque mémoire avec ses détails
              for (const mem of memory) {
                if (mem.devicememories_id) {
                  try {
                    const memoryDetailRes = await fetch(
                      `${NEXT_PUBLIC_GLPI_URL}DeviceMemory/${mem.devicememories_id}`,
                      {
                        headers: {
                          "Content-Type": "application/json",
                          "Session-Token": sessionToken,
                          "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN,
                        },
                      },
                    )
                    if (memoryDetailRes.ok) {
                      const memoryDetail = await memoryDetailRes.json()
                      mem.details = { DeviceMemory: memoryDetail }
                    }
                  } catch (err) {
                    console.log("⚠️ Erreur récupération détail mémoire:", err)
                  }
                }
              }
              componentsData.memory = memory
              console.log("✅ Mémoire récupérée:", memory.length)
            }
          }

          // Récupérer les disques durs avec leurs détails
          const harddriveRes = await fetch(`${NEXT_PUBLIC_GLPI_URL}Computer/${computer.id}/Item_DeviceHardDrive`, {
            headers: {
              "Content-Type": "application/json",
              "Session-Token": sessionToken,
              "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN,
            },
          })

          if (harddriveRes.ok) {
            const harddrives = await harddriveRes.json()
            if (Array.isArray(harddrives) && harddrives.length > 0) {
              // Enrichir chaque disque dur avec ses détails
              for (const hdd of harddrives) {
                if (hdd.deviceharddrives_id) {
                  try {
                    const hddDetailRes = await fetch(
                      `${NEXT_PUBLIC_GLPI_URL}DeviceHardDrive/${hdd.deviceharddrives_id}`,
                      {
                        headers: {
                          "Content-Type": "application/json",
                          "Session-Token": sessionToken,
                          "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN,
                        },
                      },
                    )
                    if (hddDetailRes.ok) {
                      const hddDetail = await hddDetailRes.json()
                      hdd.details = { DeviceHardDrive: hddDetail }
                    }
                  } catch (err) {
                    console.log("⚠️ Erreur récupération détail disque dur:", err)
                  }
                }
              }
              componentsData.harddrive = harddrives
              console.log("✅ Disques durs récupérés:", harddrives.length)
            }
          }

          // Récupérer les cartes réseau avec leurs détails
          const networkRes = await fetch(`${NEXT_PUBLIC_GLPI_URL}Computer/${computer.id}/Item_DeviceNetworkCard`, {
            headers: {
              "Content-Type": "application/json",
              "Session-Token": sessionToken,
              "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN,
            },
          })

          if (networkRes.ok) {
            const networks = await networkRes.json()
            if (Array.isArray(networks) && networks.length > 0) {
              // Enrichir chaque carte réseau avec ses détails
              for (const net of networks) {
                if (net.devicenetworkcards_id) {
                  try {
                    const netDetailRes = await fetch(
                      `${NEXT_PUBLIC_GLPI_URL}DeviceNetworkCard/${net.devicenetworkcards_id}`,
                      {
                        headers: {
                          "Content-Type": "application/json",
                          "Session-Token": sessionToken,
                          "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN,
                        },
                      },
                    )
                    if (netDetailRes.ok) {
                      const netDetail = await netDetailRes.json()
                      net.details = { DeviceNetworkCard: netDetail }
                    }
                  } catch (err) {
                    console.log("⚠️ Erreur récupération détail carte réseau:", err)
                  }
                }
              }
              componentsData.networkcard = networks
              console.log("✅ Cartes réseau récupérées:", networks.length)
            }
          }

          // Récupérer les cartes graphiques avec leurs détails
          const graphicRes = await fetch(`${NEXT_PUBLIC_GLPI_URL}Computer/${computer.id}/Item_DeviceGraphicCard`, {
            headers: {
              "Content-Type": "application/json",
              "Session-Token": sessionToken,
              "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN,
            },
          })

          if (graphicRes.ok) {
            const graphics = await graphicRes.json()
            if (Array.isArray(graphics) && graphics.length > 0) {
              // Enrichir chaque carte graphique avec ses détails
              for (const gpu of graphics) {
                if (gpu.devicegraphiccards_id) {
                  try {
                    const gpuDetailRes = await fetch(
                      `${NEXT_PUBLIC_GLPI_URL}DeviceGraphicCard/${gpu.devicegraphiccards_id}`,
                      {
                        headers: {
                          "Content-Type": "application/json",
                          "Session-Token": sessionToken,
                          "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN,
                        },
                      },
                    )
                    if (gpuDetailRes.ok) {
                      const gpuDetail = await gpuDetailRes.json()
                      gpu.details = { DeviceGraphicCard: gpuDetail }
                    }
                  } catch (err) {
                    console.log("⚠️ Erreur récupération détail carte graphique:", err)
                  }
                }
              }
              componentsData.graphiccard = graphics
              console.log("✅ Cartes graphiques récupérées:", graphics.length)
            }
          }

          // Récupérer les cartes son avec leurs détails
          const soundRes = await fetch(`${NEXT_PUBLIC_GLPI_URL}Computer/${computer.id}/Item_DeviceSoundCard`, {
            headers: {
              "Content-Type": "application/json",
              "Session-Token": sessionToken,
              "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN,
            },
          })

          if (soundRes.ok) {
            const sounds = await soundRes.json()
            if (Array.isArray(sounds) && sounds.length > 0) {
              // Enrichir chaque carte son avec ses détails
              for (const sound of sounds) {
                if (sound.devicesoundcards_id) {
                  try {
                    const soundDetailRes = await fetch(
                      `${NEXT_PUBLIC_GLPI_URL}DeviceSoundCard/${sound.devicesoundcards_id}`,
                      {
                        headers: {
                          "Content-Type": "application/json",
                          "Session-Token": sessionToken,
                          "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN,
                        },
                      },
                    )
                    if (soundDetailRes.ok) {
                      const soundDetail = await soundDetailRes.json()
                      sound.details = { DeviceSoundCard: soundDetail }
                    }
                  } catch (err) {
                    console.log("⚠️ Erreur récupération détail carte son:", err)
                  }
                }
              }
              componentsData.soundcard = sounds
              console.log("✅ Cartes son récupérées:", sounds.length)
            }
          }

          // Récupérer les batteries avec leurs détails
          const batteryRes = await fetch(`${NEXT_PUBLIC_GLPI_URL}Computer/${computer.id}/Item_DeviceBattery`, {
            headers: {
              "Content-Type": "application/json",
              "Session-Token": sessionToken,
              "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN,
            },
          })

          if (batteryRes.ok) {
            const batteries = await batteryRes.json()
            if (Array.isArray(batteries) && batteries.length > 0) {
              // Enrichir chaque batterie avec ses détails
              for (const battery of batteries) {
                if (battery.devicebatteries_id) {
                  try {
                    const batteryDetailRes = await fetch(
                      `${NEXT_PUBLIC_GLPI_URL}DeviceBattery/${battery.devicebatteries_id}`,
                      {
                        headers: {
                          "Content-Type": "application/json",
                          "Session-Token": sessionToken,
                          "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN,
                        },
                      },
                    )
                    if (batteryDetailRes.ok) {
                      const batteryDetail = await batteryDetailRes.json()
                      battery.details = { DeviceBattery: batteryDetail }
                    }
                  } catch (err) {
                    console.log("⚠️ Erreur récupération détail batterie:", err)
                  }
                }
              }
              componentsData.battery = batteries
              console.log("✅ Batteries récupérées:", batteries.length)
            }
          }

          // Récupérer les firmwares avec leurs détails
          const firmwareRes = await fetch(`${NEXT_PUBLIC_GLPI_URL}Computer/${computer.id}/Item_DeviceFirmware`, {
            headers: {
              "Content-Type": "application/json",
              "Session-Token": sessionToken,
              "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN,
            },
          })

          if (firmwareRes.ok) {
            const firmwares = await firmwareRes.json()
            if (Array.isArray(firmwares) && firmwares.length > 0) {
              // Enrichir chaque firmware avec ses détails
              for (const firmware of firmwares) {
                if (firmware.devicefirmwares_id) {
                  try {
                    const firmwareDetailRes = await fetch(
                      `${NEXT_PUBLIC_GLPI_URL}DeviceFirmware/${firmware.devicefirmwares_id}`,
                      {
                        headers: {
                          "Content-Type": "application/json",
                          "Session-Token": sessionToken,
                          "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN,
                        },
                      },
                    )
                    if (firmwareDetailRes.ok) {
                      const firmwareDetail = await firmwareDetailRes.json()
                      firmware.details = { DeviceFirmware: firmwareDetail }
                    }
                  } catch (err) {
                    console.log("⚠️ Erreur récupération détail firmware:", err)
                  }
                }
              }
              componentsData.firmware = firmwares
              console.log("✅ Firmwares récupérés:", firmwares.length)
            }
          }

          // Récupérer les contrôleurs avec leurs détails
          const controlRes = await fetch(`${NEXT_PUBLIC_GLPI_URL}Computer/${computer.id}/Item_DeviceControl`, {
            headers: {
              "Content-Type": "application/json",
              "Session-Token": sessionToken,
              "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN,
            },
          })

          if (controlRes.ok) {
            const controls = await controlRes.json()
            if (Array.isArray(controls) && controls.length > 0) {
              // Enrichir chaque contrôleur avec ses détails
              for (const control of controls) {
                if (control.devicecontrols_id) {
                  try {
                    const controlDetailRes = await fetch(
                      `${NEXT_PUBLIC_GLPI_URL}DeviceControl/${control.devicecontrols_id}`,
                      {
                        headers: {
                          "Content-Type": "application/json",
                          "Session-Token": sessionToken,
                          "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN,
                        },
                      },
                    )
                    if (controlDetailRes.ok) {
                      const controlDetail = await controlDetailRes.json()
                      control.details = { DeviceControl: controlDetail }
                    }
                  } catch (err) {
                    console.log("⚠️ Erreur récupération détail contrôleur:", err)
                  }
                }
              }
              componentsData.control = controls
              console.log("✅ Contrôleurs récupérés:", controls.length)
            }
          }
        } catch (err) {
          console.log("⚠️ Erreur récupération composants:", err)
        }
      }

      if (computer) {
        computer.components = componentsData
        console.log("🔧 === RÉSUMÉ COMPOSANTS ===")
        console.log("🔧 Types de composants récupérés:", Object.keys(componentsData))
        console.log(
          "🔧 Total composants:",
          Object.values(componentsData).reduce((sum, arr) => sum + arr.length, 0),
        )
      }

      console.log("🏁 === FIN TRAITEMENT ===")
      console.log("📋 Résumé final:", {
        userFound: !!user,
        computerFound: !!computer,
        osFound: !!operatingSystem,
        componentsCount: Object.keys(componentsData).length,
      })

      return NextResponse.json({
        user,
        computer,
        operatingSystem,
      })
    } catch (error) {
      console.error("❌ Erreur interne:", error)
      return NextResponse.json({ error: "Erreur interne" }, { status: 500 })
    } finally {
      if (sessionToken) {
        try {
          console.log("🔐 Fermeture session GLPI...")
          await fetch(`${NEXT_PUBLIC_GLPI_URL}killSession`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Session-Token": sessionToken,
              "App-Token": NEXT_PUBLIC_GLPI_APP_TOKEN,
            },
          })
          console.log("✅ Session fermée")
        } catch (err) {
          console.log("⚠️ Erreur fermeture session:", err)
        }
      }
    }
  } catch (error) {
    console.error("❌ Erreur générale:", error)
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 })
  }
}
