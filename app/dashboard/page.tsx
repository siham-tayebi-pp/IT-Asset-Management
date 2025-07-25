"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Package } from "lucide-react"
import {
  LogOut,
  Shield,
  Users,
  CheckSquare,
  Monitor,
  BarChart3,
  Laptop,
  MemoryStick,
  Cpu,
  Clock,
  UserIcon,
  AlertTriangle,
  Search,
  Settings,
  Loader2,
  RefreshCw,
  Play,
  Pause,
} from "lucide-react"
import { Input } from "@/components/ui/input"

type GLPIPc = Record<string, any>
type User = {
  id: number
  username: string
  nom: string
  prenom: string
  role: string
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [glpiPcs, setGlpiPcs] = useState<GLPIPc[]>([])
  const [statuses, setStatuses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [autoUpdateLoading, setAutoUpdateLoading] = useState(false)
  const [lastAutoUpdate, setLastAutoUpdate] = useState<Date | null>(null)
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState(true)
  const [nextUpdateTime, setNextUpdateTime] = useState<Date | null>(null)
  const [updateHistory, setUpdateHistory] = useState<any[]>([])
  const router = useRouter()

  // Intervalle pour la mise à jour automatique (30 minutes)
  const AUTO_UPDATE_INTERVAL = 30 * 60 * 1000 // 30 minutes en millisecondes

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (!userData) {
      router.push("/")
      return
    }
    setUser(JSON.parse(userData))
    fetchStatuses()
    fetchGlpiPcs()
  }, [router])

  // Effet pour la planification automatique
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null

    if (autoUpdateEnabled && statuses.length > 0) {
      console.log("🕐 Planification automatique activée - Mise à jour toutes les 30 minutes")

      // Calculer le prochain temps de mise à jour
      const nextUpdate = new Date(Date.now() + AUTO_UPDATE_INTERVAL)
      setNextUpdateTime(nextUpdate)

      intervalId = setInterval(() => {
        console.log("⏰ Déclenchement automatique de la mise à jour des statuts")
        performAutoStatusUpdate(true) // true = mode automatique
      }, AUTO_UPDATE_INTERVAL)

      // Première mise à jour après 2 minutes de chargement initial
      const initialTimeout = setTimeout(
        () => {
          console.log("🚀 Première mise à jour automatique après chargement")
          performAutoStatusUpdate(true)
        },
        2 * 60 * 1000,
      ) // 2 minutes

      return () => {
        if (intervalId) clearInterval(intervalId)
        clearTimeout(initialTimeout)
      }
    } else {
      setNextUpdateTime(null)
    }

    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [autoUpdateEnabled, statuses.length, glpiPcs.length])

  // Récupérer les statuts depuis GLPI
  const fetchStatuses = async () => {
    try {
      console.log("🔍 Récupération des statuts depuis GLPI...")
      const response = await fetch("/api/statuses")
      if (response.ok) {
        const data = await response.json()
        console.log("📊 Statuts reçus:", data)
        if (data.statuses && Array.isArray(data.statuses)) {
          setStatuses(data.statuses)
          console.log(
            `✅ ${data.statuses.length} statuts chargés:`,
            data.statuses.map((s) => `${s.name} (ID: ${s.id})`),
          )
        } else {
          console.warn("⚠️ Pas de statuts dans la réponse")
          setStatuses([])
        }
      } else {
        console.error("❌ Erreur récupération statuts:", response.status)
        setStatuses([])
      }
    } catch (error) {
      console.error("❌ Erreur lors du chargement des statuts:", error)
      setStatuses([])
    }
  }

  // Fonction pour calculer le temps écoulé depuis la dernière activité
  const calculateTimeSinceLastActivity = (lastSeen: string) => {
    if (!lastSeen || lastSeen === "N/A") return null

    const now = new Date()
    const lastSeenDate = new Date(lastSeen)
    const diffMs = now.getTime() - lastSeenDate.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    return { diffMs, diffHours, diffDays }
  }

  // Fonction pour déterminer le nouveau statut basé sur l'inactivité
  const determineNewStatusByInactivity = (pc: any) => {
    const timeDiff = calculateTimeSinceLastActivity(pc.lastSeen)
    if (!timeDiff) return null

    const { diffHours, diffDays } = timeDiff
    const currentStatus = determineStatus(pc)

    // Si déjà "Non affecté" ou "Délégué", pas besoin de changer
    if (currentStatus === "Non affecté" || currentStatus === "Délégué") return null

    // Règles de mise à jour automatique
    if (diffDays >= 30) {
      // Plus d'1 mois
      return { newStatus: "désaffecté", reason: `Inactif depuis ${diffDays} jours` }
    } else if (diffDays >= 7) {
      // Plus d'1 semaine
      return { newStatus: "En congé", reason: `Inactif depuis ${diffDays} jours` }
    } else if (diffHours >= 24) {
      // Plus de 24h
      return { newStatus: "En transition", reason: `Inactif depuis ${diffHours} heures` }
    }
    else if (diffHours < 24 && currentStatus != "Affecté") {
      // Plus de 24h
      return { newStatus: "Affecté", reason: `Inactif depuis ${diffHours} heures` }
    }

    return null
  }

  // Fonction pour mettre à jour automatiquement les statuts via l'API computer
  const performAutoStatusUpdate = async (isAutomatic = false) => {
    if (statuses.length === 0) {
      if (!isAutomatic) {
        alert("⚠️ Impossible de faire la mise à jour : statuts GLPI non chargés")
      }
      return
    }

    setAutoUpdateLoading(true)

    try {
      const updateTime = new Date()
      console.log(
        `🔄 ${isAutomatic ? "Mise à jour automatique" : "Mise à jour manuelle"} démarrée à ${updateTime.toLocaleString("fr-FR")}`,
      )

      // Préparer les données pour la mise à jour
      const computersToUpdate = glpiPcs
        .map((pc) => {
          const statusUpdate = determineNewStatusByInactivity(pc)
          if (statusUpdate && pc.assignedUser) {
            return {
              id: pc.id,
              name: pc.name,
              lastSeen: pc.lastSeen,
              currentStatus: determineStatus(pc),
              newStatus: statusUpdate.newStatus,
              reason: statusUpdate.reason,
              assignedUser: pc.assignedUser,
            }
          }
          return null
        })
        .filter(Boolean)

      if (computersToUpdate.length === 0) {
        console.log("ℹ️ Aucune mise à jour nécessaire")

        // Ajouter à l'historique même si aucune mise à jour
        const historyEntry = {
          timestamp: updateTime,
          type: isAutomatic ? "Automatique" : "Manuelle",
          updatesCount: 0,
          errorsCount: 0,
          message: "Aucune mise à jour nécessaire",
          updates: [],
        }
        setUpdateHistory((prev) => [historyEntry, ...prev.slice(0, 9)]) // Garder les 10 dernières

        if (!isAutomatic) {
          alert("ℹ️ Aucune mise à jour de statut nécessaire")
        }
        return
      }

      console.log(`📝 ${computersToUpdate.length} PC(s) à mettre à jour:`, computersToUpdate)

      // Appeler l'API computer avec les mises à jour
      const response = await fetch("/api/glpi/computer", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "auto-update-status",
          computers: computersToUpdate,
          statuses: statuses,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        console.log("✅ Résultat mise à jour:", result)

        setLastAutoUpdate(updateTime)

        // Calculer le prochain temps de mise à jour
        if (isAutomatic) {
          const nextUpdate = new Date(Date.now() + AUTO_UPDATE_INTERVAL)
          setNextUpdateTime(nextUpdate)
        }

        // Ajouter à l'historique
        const historyEntry = {
          timestamp: updateTime,
          type: isAutomatic ? "Automatique" : "Manuelle",
          updatesCount: result.updates?.length || 0,
          errorsCount: result.errors?.length || 0,
          message: result.message || "Mise à jour terminée",
          updates: result.updates || [],
        }
        setUpdateHistory((prev) => [historyEntry, ...prev.slice(0, 9)]) // Garder les 10 dernières

        if (result.success && result.updates && result.updates.length > 0) {
          const updates = result.updates

          if (!isAutomatic) {
            alert(
              `✅ Mise à jour ${isAutomatic ? "automatique" : "manuelle"} terminée!\n\n${updates.length} PC(s) mis à jour:\n${updates
                .slice(0, 5)
                .map((u) => `${u.computerName}: ${u.oldStatus} → ${u.newStatus}`)
                .join("\n")}${updates.length > 5 ? "\n..." : ""}`,
            )
          } else {
            console.log(`✅ Mise à jour automatique terminée: ${updates.length} PC(s) mis à jour`)
          }

          // Recharger les données pour refléter les changements
          await fetchGlpiPcs()
        } else {
          if (!isAutomatic) {
            alert("ℹ️ Aucune mise à jour de statut nécessaire")
          }
        }
      } else {
        const errorData = await response.json()
        console.error("❌ Erreur mise à jour:", errorData)

        // Ajouter l'erreur à l'historique
        const historyEntry = {
          timestamp: updateTime,
          type: isAutomatic ? "Automatique" : "Manuelle",
          updatesCount: 0,
          errorsCount: 1,
          message: `Erreur: ${errorData.error}`,
          updates: [],
        }
        setUpdateHistory((prev) => [historyEntry, ...prev.slice(0, 9)])

        if (!isAutomatic) {
          alert(`❌ Erreur lors de la mise à jour: ${errorData.error}`)
        }
      }
    } catch (error) {
      console.error("❌ Erreur lors de la mise à jour automatique:", error)

      // Ajouter l'erreur à l'historique
      const historyEntry = {
        timestamp: new Date(),
        type: isAutomatic ? "Automatique" : "Manuelle",
        updatesCount: 0,
        errorsCount: 1,
        message: `Erreur: ${error instanceof Error ? error.message : "Erreur inconnue"}`,
        updates: [],
      }
      setUpdateHistory((prev) => [historyEntry, ...prev.slice(0, 9)])

      if (!isAutomatic) {
        alert("❌ Erreur lors de la mise à jour automatique")
      }
    } finally {
      setAutoUpdateLoading(false)
    }
  }

  const fetchGlpiPcs = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch("/api/glpi/computer")
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`)
      }
      const data = await response.json()
      console.log("Données complètes reçues de l'API:", data)
      if (data.success && data.computers) {
        console.log("Premier ordinateur avec composants:", data.computers[0])
        setGlpiPcs(data.computers)
        console.log("✅ Données chargées. Planification automatique active.")
      } else {
        throw new Error(data.error || "Erreur lors de la récupération des données")
      }
    } catch (e) {
      console.error("Erreur de récupération:", e)
      setError(e instanceof Error ? e.message : "Erreur inconnue")
    } finally {
      setLoading(false)
    }
  }

  // Fonction pour obtenir le badge de statut avec indicateur d'inactivité
  const getStatusBadgeWithInactivity = (pc: any) => {
    const status = determineStatus(pc)
    const statusUpdate = determineNewStatusByInactivity(pc)

    let badgeClass = ""
    let statusText = status

    // Ajouter un indicateur si une mise à jour est suggérée
    if (statusUpdate && pc.assignedUser) {
      statusText += " ⚠️"
    }

    switch (status) {
      case "Affecté":
        badgeClass = "bg-green-600 text-white"
        break
      case "Délégué":
        badgeClass = "bg-yellow-600 text-white"
        break
      case "Non affecté":
        badgeClass = "bg-red-600 text-white"
        break
      case "En congé":
        badgeClass = "bg-orange-600 text-white"
        break
      case "En transition":
        badgeClass = "bg-blue-600 text-white"
        break
      default:
        badgeClass = "bg-gray-500 text-white"
    }

    return <Badge className={badgeClass}>{statusText}</Badge>
  }

  // Fonctions existantes (getProcessorInfo, getMemoryInfo, etc.)
  const getProcessorInfo = (components: any) => {
    if (!components?.processor || !Array.isArray(components.processor) || components.processor.length === 0) {
      return "N/A"
    }
    const processor = components.processor[0]
    if (processor?.details?.DeviceProcessor?.designation) {
      return processor.details.DeviceProcessor.designation
    }
    if (processor?.details?.DeviceProcessor?.name) {
      return processor.details.DeviceProcessor.name
    }
    if (processor?.designation) {
      return processor.designation
    }
    if (processor?.name) {
      return processor.name
    }
    return "N/A"
  }

  const getMemoryInfo = (components: any) => {
    if (!components?.memory || !Array.isArray(components.memory) || components.memory.length === 0) {
      return "N/A"
    }

    let totalSize = 0
    let memoryType = "N/A"
    let frequency = ""

    components.memory.forEach((mem: any) => {
      if (mem?.details?.DeviceMemory) {
        const device = mem.details.DeviceMemory
        const size = device.size || 0
        totalSize += size
        if (memoryType === "N/A" && device.designation) {
          memoryType = device.designation
        }
        if (!frequency && device.frequence) {
          frequency = ` @ ${device.frequence}MHz`
        }
      }
      if (mem?.size) {
        totalSize += mem.size
        if (memoryType === "N/A" && mem.designation) {
          memoryType = mem.designation
        }
      }
    })

    if (totalSize > 0) {
      const totalGB = Math.round(totalSize / 1024)
      return `${memoryType !== "N/A" ? memoryType + " " : ""}${totalGB}GB${frequency}`
    }
    return "N/A"
  }

  const getFirmwareInfo = (components: any) => {
    if (!components?.firmware || !Array.isArray(components.firmware) || components.firmware.length === 0) {
      return "N/A"
    }
    const firmware = components.firmware[0]
    if (firmware?.details?.DeviceFirmware?.designation) {
      return firmware.details.DeviceFirmware.designation
    }
    if (firmware?.details?.DeviceFirmware?.name) {
      return firmware.details.DeviceFirmware.name
    }
    if (firmware?.designation) {
      return firmware.designation
    }
    if (firmware?.name) {
      return firmware.name
    }
    return "N/A"
  }

  const formatLastActivityFromDate = (lastSeen: string) => {
    if (!lastSeen || lastSeen === "N/A") return "N/A"
    const now = new Date()
    const lastSeenDate = new Date(lastSeen)
    const diffMs = now.getTime() - lastSeenDate.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMinutes < 1) return "À l'instant"
    if (diffMinutes < 60) return `${diffMinutes}min`
    if (diffHours < 24) return `${diffHours}h`
    return `${diffDays}j`
  }

  const handleLogout = () => {
    localStorage.removeItem("user")
    router.push("/")
  }

  const determineStatus = (pc: any) => {
    const statesId = (pc.states_id || "").toString().toLowerCase().trim()
    if (statesId === "affecté" || statesId === "affecte") {
      return "Affecté"
    }
    if (statesId === "délégué" || statesId === "delegue") {
      return "Délégué"
    }
    if (
      statesId === "non affecté" ||
      statesId === "non affecte" ||
      statesId === "désaffecté" ||
      statesId === "desaffecte"
    ) {
      return "Non affecté"
    }
    if (statesId === "en congé" || statesId === "en conge") {
      return "En congé"
    }
    if (statesId === "en transition") {
      return "En transition"
    }
    if (!pc.assignedUser) {
      return "Non affecté"
    }
    return "Affecté"
  }

  const countByStatus = (status: string) => {
    return glpiPcs.filter((pc) => {
      const pcStatus = determineStatus(pc)
      return pcStatus === status
    }).length
  }

  const getFilteredPcsByTab = () => {
    if (activeTab === "all") return glpiPcs
    return glpiPcs.filter((pc) => {
      const status = determineStatus(pc)
      return status === activeTab
    })
  }

  const filteredUsers = getFilteredPcsByTab().filter((pc) =>
    [
      pc.name || "",
      pc.assignedUser?.firstname || "",
      pc.assignedUser?.realname || "",
      pc.serial || "",
      pc.computermodels_id || "",
      pc.computertypes_id || "",
    ]
      .filter(Boolean)
      .some((field) => String(field).toLowerCase().includes(searchTerm.toLowerCase())),
  )

  const displayValue = (value: any) => {
    if (value === null || value === undefined || value === "" || value === 0 || value === "0") {
      return "N/A"
    }
    return value
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-slate-300">Chargement du tableau de bord...</p>
          <p className="text-slate-500 text-sm mt-2">Récupération des statuts GLPI...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-blue-600 shadow-lg relative z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <Monitor className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-white">IT Asset Management</h1>
              </div>
              <nav className="hidden md:flex items-center gap-6 ml-8">
                <Button
                  variant="ghost"
                  className="text-white hover:bg-blue-700 border border-red-500"
                  onClick={() => router.push("/dashboard")}
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
                <Button
                  variant="ghost"
                  className="text-blue-200 hover:bg-blue-700 border border-red-500"
                  onClick={() => router.push("/assignments")}
                >
                  <CheckSquare className="w-4 h-4 mr-2" />
                  Assignments
                </Button>
                <Button
                  variant="ghost"
                  className="text-blue-200 hover:bg-blue-700 border border-red-500"
                  onClick={() => router.push("/users")}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Users
                </Button>
                <Button
                  variant="ghost"
                  className="text-blue-200 hover:bg-blue-700 border border-red-500"
                  onClick={() => router.push("/inventory")}
                >
                  <Package className="w-4 h-4 mr-2" />
                  Inventory
                </Button>
                <Button
                  variant="ghost"
                  className="text-blue-200 hover:bg-blue-700 border border-red-500"
                  onClick={() => router.push("/managers")}
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Managers
                </Button>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" className="text-white">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
              </Button>
              <div className="flex items-center gap-2 text-white">
                <Shield className="w-4 h-4" />
                <span className="text-sm font-medium">{user?.username}</span>
                <Badge className="bg-blue-800 text-blue-100">Admin</Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="border border-red-500 bg-transparent"
              >
                <LogOut className="w-4 h-4 mr-2" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Gestion des PC</h1>
              <p className="text-slate-400">Tableau de bord administrateur avec mise à jour automatique des statuts</p>
              {statuses.length > 0 && (
                <p className="text-slate-500 text-sm mt-1">
                  📋 {statuses.length} statuts GLPI chargés: {statuses.map((s) => s.name).join(", ")}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setAutoUpdateEnabled(!autoUpdateEnabled)}
                className={`border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent ${autoUpdateEnabled ? "border-green-500 text-green-400" : "border-red-500 text-red-400"
                  }`}
              >
                {autoUpdateEnabled ? <Play className="w-4 h-4 mr-2" /> : <Pause className="w-4 h-4 mr-2" />}
                Auto: {autoUpdateEnabled ? "ON" : "OFF"}
              </Button>
              <Button
                variant="outline"
                onClick={() => performAutoStatusUpdate(false)}
                disabled={autoUpdateLoading || statuses.length === 0}
                className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
              >
                {autoUpdateLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Mise à jour manuelle
              </Button>
            </div>
          </div>

          {/* Informations sur la planification */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            {lastAutoUpdate && (
              <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                <p className="text-slate-400 text-xs">Dernière mise à jour</p>
                <p className="text-white text-sm font-medium">{lastAutoUpdate.toLocaleString("fr-FR")}</p>
              </div>
            )}

            {nextUpdateTime && autoUpdateEnabled && (
              <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                <p className="text-slate-400 text-xs">Prochaine mise à jour</p>
                <p className="text-green-400 text-sm font-medium">{nextUpdateTime.toLocaleString("fr-FR")}</p>
              </div>
            )}

            <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
              <p className="text-slate-400 text-xs">Statut automatique</p>
              <p className={`text-sm font-medium ${autoUpdateEnabled ? "text-green-400" : "text-red-400"}`}>
                {autoUpdateEnabled ? "🟢 Actif (30min)" : "🔴 Désactivé"}
              </p>
            </div>
          </div>

          {/* Historique des mises à jour */}
          {updateHistory.length > 0 && (
            <div className="mt-4">
              <h3 className="text-white text-sm font-medium mb-2">Historique des mises à jour</h3>
              <div className="bg-slate-800 rounded-lg border border-slate-700 max-h-32 overflow-y-auto">
                {updateHistory.slice(0, 5).map((entry, index) => (
                  <div key={index} className="p-2 border-b border-slate-700 last:border-b-0">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300 text-xs">
                        {entry.timestamp.toLocaleString("fr-FR")} - {entry.type}
                      </span>
                      <span className={`text-xs ${entry.updatesCount > 0 ? "text-green-400" : "text-slate-400"}`}>
                        {entry.updatesCount} mises à jour
                      </span>
                    </div>
                    <p className="text-slate-500 text-xs">{entry.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-900/50 border border-red-700 rounded-lg">
              <p className="text-red-300 text-sm">
                <AlertTriangle className="w-4 h-4 inline mr-2" />
                Erreur de connexion à GLPI: {error}
              </p>
            </div>
          )}

          {statuses.length === 0 && (
            <div className="mt-4 p-4 bg-yellow-900/50 border border-yellow-700 rounded-lg">
              <p className="text-yellow-300 text-sm">
                <AlertTriangle className="w-4 h-4 inline mr-2" />
                ⚠️ Statuts GLPI non chargés - La mise à jour automatique est désactivée
              </p>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">Total PC</p>
                <p className="text-3xl font-bold text-white">{glpiPcs.length}</p>
              </div>
              <Laptop className="w-12 h-12 text-blue-500" />
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">Affectés</p>
                <p className="text-3xl font-bold text-white">{countByStatus("Affecté")}</p>
              </div>
              <CheckSquare className="w-12 h-12 text-green-500" />
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">En Transition</p>
                <p className="text-3xl font-bold text-white">{countByStatus("En transition")}</p>
              </div>
              <Clock className="w-12 h-12 text-blue-500" />
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">En Congé</p>
                <p className="text-3xl font-bold text-white">{countByStatus("En congé")}</p>
              </div>
              <Settings className="w-12 h-12 text-orange-500" />
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">Non affectés</p>
                <p className="text-3xl font-bold text-white">{countByStatus("Non affecté")}</p>
              </div>
              <AlertTriangle className="w-12 h-12 text-red-500" />
            </CardContent>
          </Card>
        </div>

        {/* Liste des PC section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">Liste des PC</h2>
          <p className="text-slate-400">
            Gestion et monitoring de tous les postes de travail avec mise à jour automatique toutes les 30 minutes
          </p>
        </div>

        {/* Tabs for filtering */}
        <Tabs defaultValue="all" className="mb-6" onValueChange={setActiveTab}>
          <TabsList className="bg-slate-800 border border-slate-700 text-white">
            <TabsTrigger value="all" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              Tous ({glpiPcs.length})
            </TabsTrigger>
            <TabsTrigger value="Affecté" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              Affectés ({countByStatus("Affecté")})
            </TabsTrigger>
            <TabsTrigger
              value="En transition"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              En Transition ({countByStatus("En transition")})
            </TabsTrigger>
            <TabsTrigger value="En congé" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              En Congé ({countByStatus("En congé")})
            </TabsTrigger>
            <TabsTrigger value="Non affecté" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              Non affectés ({countByStatus("Non affecté")})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* PC List Table */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="bg-slate-700">
            <div className="flex justify-between items-center">
              <CardTitle className="text-white flex items-center gap-2">
                <Laptop className="w-5 h-5" />
                Liste des PCs ({filteredUsers.length})
                {autoUpdateLoading && <Loader2 className="w-4 h-4 animate-spin text-blue-400" />}
                {autoUpdateEnabled && <Badge className="bg-green-600 text-white text-xs">AUTO</Badge>}
              </CardTitle>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Rechercher un PC..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-slate-600 border-slate-500 text-white placeholder:text-slate-400 w-64"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Table Header */}
            <div className="grid grid-cols-[1.5fr_1fr_1fr_2fr_1fr] gap-4 p-4 bg-blue-600 text-white text-sm font-medium">
              <div className="flex items-center gap-2">
                <Laptop className="w-4 h-4" />
                Nom du PC
              </div>
              <div className="flex items-center gap-2">
                <UserIcon className="w-4 h-4" />
                Propriétaire
              </div>
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4" />
                Statut
              </div>
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Configuration
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Dernière activité
              </div>
            </div>
            {/* Table Body */}
            <div className="divide-y divide-slate-700">
              {loading ? (
                <div className="p-8 text-center text-slate-300 flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Chargement...
                </div>
              ) : error ? (
                <div className="p-8 text-center text-red-400">Erreur: {error}</div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-8 text-center text-slate-400">Aucun PC trouvé</div>
              ) : (
                filteredUsers.map((item) => {
                  const processorInfo = getProcessorInfo(item.components)
                  const memoryInfo = getMemoryInfo(item.components)
                  const firmwareInfo = getFirmwareInfo(item.components)
                  const statusUpdate = determineNewStatusByInactivity(item)

                  return (
                    <div
                      key={item.id || "N/A"}
                      className={`grid grid-cols-[1.5fr_1fr_1fr_2fr_1fr] gap-4 p-4 text-slate-300 hover:bg-slate-700 transition-colors ${statusUpdate && item.assignedUser ? "bg-yellow-900/20 border-l-4 border-yellow-500" : ""
                        }`}
                    >
                      <div className="font-medium flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <Laptop className="w-4 h-4 text-slate-400" />
                          {displayValue(item.name)}
                          {statusUpdate && item.assignedUser && (
                            <Badge
                              variant="outline"
                              className="text-xs bg-yellow-900/50 border-yellow-600 text-yellow-300"
                            >
                              Mise à jour prévue
                            </Badge>
                          )}
                        </div>
                        {item.serial && <div className="text-xs text-slate-500">S/N: {item.serial}</div>}
                        {item.computermodels_id && (
                          <div className="text-xs text-slate-500">{displayValue(item.computermodels_id)}</div>
                        )}
                        <div className="text-xs text-slate-500">{displayValue(item.computertypes_id)}</div>
                      </div>
                      <div>
                        {item.assignedUser ? (
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {displayValue(item.assignedUser.firstname)} {displayValue(item.assignedUser.realname)}
                            </span>
                            <span className="text-xs text-slate-500">{displayValue(item.assignedUser.name)}</span>
                          </div>
                        ) : (
                          <span className="text-slate-500">Non assigné</span>
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        {getStatusBadgeWithInactivity(item)}
                        {statusUpdate && item.assignedUser && (
                          <div className="text-xs text-yellow-400">→ {statusUpdate.newStatus}</div>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 text-sm">
                        <div className="flex items-center gap-1">
                          <MemoryStick className="w-3 h-3 text-slate-400" />
                          <span className="truncate">{memoryInfo}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Cpu className="w-3 h-3 text-slate-400" />
                          <span className="truncate">{processorInfo}</span>
                        </div>
                        <div className="text-xs text-slate-500 truncate">{firmwareInfo}</div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="w-3 h-3 text-slate-400" />
                          Il y a {formatLastActivityFromDate(item.lastSeen)}
                        </div>
                        {statusUpdate && item.assignedUser && (
                          <div className="text-xs text-yellow-400">{statusUpdate.reason}</div>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
