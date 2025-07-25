"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Computer,
  LogOut,
  User,
  HardDrive,
  Cpu,
  Monitor,
  WifiOff,
  MemoryStick,
  Network,
  BatteryCharging,
  Component,
  Speaker,
  CalendarDays,
  Key,
  Shield,
} from "lucide-react"

type AuthenticatedUser = {
  id: string
  username: string
  fullName: string
  firstname: string
  realname: string
  email: string
  phone: string
  role: string
  department: string
  source: string
  server?: string
  glpiInfo?: any
}

type GLPIUser = {
  id: number
  name: string
  firstname: string
  realname: string
  comment?: string
  email?: string
  phone?: string
  location?: string
}

type OperatingSystem = {
  id: number
  name: string
  version: string
  architecture: string
  service_pack: string | null
  kernel_version: string
  edition: string
  productid: string
  serial: string
  company: string
  owner: string
  install_date: string
  hostid: string
  date_creation: string
  last_update: string
}

type ComponentBase = {
  id: number
  name?: string
  manufacturer_name?: string
  serial?: string
  [key: string]: any
}

type ProcessorComponent = ComponentBase & {
  frequency?: number
  nbcores?: number
  nbthreads?: number
}

type MemoryComponent = ComponentBase & {
  size?: number
  busID?: string
}

type HardDriveComponent = ComponentBase & {
  capacity?: number
  interface?: string
}

type NetworkCardComponent = ComponentBase & {
  mac?: string
}

type GraphicCardComponent = ComponentBase & {
  memory?: number
  chipset?: string
}

type BatteryComponent = ComponentBase & {
  manufacturing_date?: string
  real_capacity?: number
  type?: string
  voltage?: number
  capacity?: number
}

type FirmwareComponent = ComponentBase & {
  version?: string
  date_publication?: string
}

type SoundCardComponent = ComponentBase & {
  description?: string
}

type ControlComponent = ComponentBase & {
  interface?: string
}

type GlpiPC = {
  id: number
  entities_id: string
  name: string
  serial: string
  otherserial: string
  contact?: string
  comment?: string
  date_mod: string
  autoupdatesystems_id?: string
  locations_id?: number
  networks_id?: number
  computermodels_id?: string
  computertypes_id?: string
  manufacturers_id?: string
  is_deleted?: number
  is_dynamic?: number
  users_id?: string
  groups_id?: string
  states_id?: string
  ticket_tco?: string
  uuid: string
  date_creation: string
  is_recursive?: number
  last_inventory_update?: string
  last_boot?: string
  operatingsystems_id?: number
  components: {
    motherboard?: any[]
    firmware?: FirmwareComponent[]
    processor?: ProcessorComponent[]
    memory?: MemoryComponent[]
    harddrive?: HardDriveComponent[]
    networkcard?: NetworkCardComponent[]
    graphiccard?: GraphicCardComponent[]
    soundcard?: SoundCardComponent[]
    battery?: BatteryComponent[]
    control?: ControlComponent[]
    pci?: any[]
    case?: any[]
    powersupply?: any[]
    generic?: any[]
    simcard?: any[]
    sensor?: any[]
    camera?: any[]
  }
  model_name?: string
  type_name?: string
  manufacturer_name?: string
  group_name?: string
  state_name?: string
}

export default function UserDashboard() {
  const [authenticatedUser, setAuthenticatedUser] = useState<AuthenticatedUser | null>(null)
  const [glpiUser, setGlpiUser] = useState<GLPIUser | null>(null)
  const [glpiPC, setGlpiPC] = useState<GlpiPC | null>(null)
  const [operatingSystem, setOperatingSystem] = useState<OperatingSystem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const localUser = localStorage.getItem("user")
    if (!localUser) {
      router.push("/")
      return
    }

    try {
      const user = JSON.parse(localUser) as AuthenticatedUser
      setAuthenticatedUser(user)
      console.log("👤 Utilisateur connecté:", user)

      // Si c'est un utilisateur GLPI, récupérer les données PC
      if (user.source === "glpi-cloud") {
        fetchGlpiData()
      } else {
        setLoading(false)
      }
    } catch (err) {
      console.error("Erreur parsing user data:", err)
      router.push("/")
    }
  }, [router])

  const fetchGlpiData = async () => {
    try {
      setLoading(true)

      // Récupérer les informations de l'utilisateur connecté depuis localStorage
      const localUser = localStorage.getItem("user")
      if (!localUser) {
        router.push("/")
        return
      }

      const user = JSON.parse(localUser)
      console.log("🔍 Récupération des données GLPI pour:", user.username)

      const response = await fetch(`/api/glpi/user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          username: user.username,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Erreur ${response.status}`)
      }

      const data = await response.json()
      console.log("📋 Données GLPI reçues:", data)

      setGlpiUser(data.user)
      setGlpiPC(data.computer)
      setOperatingSystem(data.operatingSystem)
      setError(null)
    } catch (err: any) {
      console.error("Erreur lors du chargement des données GLPI:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("user")
    router.push("/")
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A"
    try {
      return new Date(dateString).toLocaleString("fr-FR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    } catch (e) {
      return dateString
    }
  }

  const formatShortDate = (dateString?: string) => {
    if (!dateString) return "N/A"
    try {
      return new Date(dateString).toLocaleDateString("fr-FR")
    } catch (e) {
      return dateString
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Shield className="w-4 h-4 text-red-600" />
      case "delegate":
        return <User className="w-4 h-4 text-blue-600" />
      default:
        return <User className="w-4 h-4 text-gray-600" />
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-red-100 text-red-800 border-red-200">Super-Admin</Badge>
      case "delegate":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Délégué</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Utilisateur</Badge>
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Computer className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Recherche de votre poste dans GLPI...</p>
          {authenticatedUser?.source === "glpi-cloud" && (
            <p className="text-sm text-gray-500 mt-2">Recherche pour {authenticatedUser.username}...</p>
          )}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8 bg-white rounded-lg shadow-md max-w-md">
          <WifiOff className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Impossible de se connecter à GLPI</h2>
          <p className="text-gray-600 mb-4">Nous n'avons pas pu récupérer les informations de votre poste.</p>
          <Alert className="mb-4">
            <AlertDescription className="text-sm text-red-600">{error}</AlertDescription>
          </Alert>
          <div className="flex gap-2">
            <Button onClick={fetchGlpiData} className="flex-1">
              Réessayer
            </Button>
            <Button variant="outline" onClick={handleLogout} className="flex-1 bg-transparent">
              Déconnexion
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Computer className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl text-primary font-semibold">Mon Poste de Travail</h1>
                <p className="text-sm text-gray-500">Données issues de GLPI</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {getRoleIcon(authenticatedUser?.role || "user")}
                <span className="text-sm text-primary font-medium">
                  {(() => {
                    const localUser = localStorage.getItem("user")
                    if (localUser) {
                      const user = JSON.parse(localUser)
                      return user.fullName || user.username
                    }
                    return glpiUser ? `${glpiUser.firstname} ${glpiUser.realname}` : "Utilisateur inconnu"
                  })()}
                </span>
                {getRoleBadge(authenticatedUser?.role || "user")}
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Déconnexion
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Informations Utilisateur
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {glpiUser ? (
                <>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Nom complet</label>
                    <p className="text-lg font-semibold">
                      {glpiUser.firstname} {glpiUser.realname}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Date de modification</label>
                    <p className="text-lg font-semibold">{formatDate(glpiPC?.date_mod)}</p>
                  </div>
                  {glpiPC?.contact && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Usager</label>
                      <p className="text-lg font-semibold">{glpiPC.contact}</p>
                    </div>
                  )}
                  {(glpiPC?.model_name || glpiPC?.computermodels_id) && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Modèle</label>
                      <p className="text-lg font-semibold">{glpiPC.model_name || glpiPC.computermodels_id}</p>
                    </div>
                  )}
                  {(glpiPC?.type_name || glpiPC?.computertypes_id) && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Type</label>
                      <p className="text-lg font-semibold">{glpiPC.type_name || glpiPC.computertypes_id}</p>
                    </div>
                  )}
                  {(glpiPC?.group_name || glpiPC?.groups_id) && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Groupe</label>
                      <p className="text-lg font-semibold">{glpiPC.group_name || glpiPC.groups_id}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-gray-600">Nom d'utilisateur GLPI</label>
                    <p className="text-lg">{glpiUser.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Commentaire</label>
                    <p className="text-sm text-gray-500">{glpiUser.comment || "Aucun commentaire"}</p>
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <User className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-gray-500">Informations utilisateur GLPI non trouvées</p>
                  <p className="text-xs text-gray-400 mt-1">Utilisateur: {authenticatedUser?.username}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* PC Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="w-5 h-5" />
                Mon PC
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {glpiPC ? (
                <>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Nom du PC</label>
                    <p className="text-lg font-semibold">{glpiPC.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Numéro de série</label>
                    <p className="text-lg font-semibold">{glpiPC.otherserial || glpiPC.serial}</p>
                  </div>
                  {(glpiPC.model_name || glpiPC.computermodels_id) && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Modèle</label>
                      <p className="text-lg font-semibold">{glpiPC.model_name || glpiPC.computermodels_id}</p>
                    </div>
                  )}
                  {(glpiPC.type_name || glpiPC.computertypes_id) && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Type</label>
                      <p className="text-lg font-semibold">{glpiPC.type_name || glpiPC.computertypes_id}</p>
                    </div>
                  )}
                  {(glpiPC.manufacturer_name || glpiPC.manufacturers_id) && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Fabricant</label>
                      <p className="text-lg font-semibold">{glpiPC.manufacturer_name || glpiPC.manufacturers_id}</p>
                    </div>
                  )}
                  {(glpiPC.group_name || glpiPC.groups_id) && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Groupe</label>
                      <p className="text-lg font-semibold">{glpiPC.group_name || glpiPC.groups_id}</p>
                    </div>
                  )}
                  {(glpiPC.state_name || glpiPC.states_id) && (
                    <div>
                      <label className="text-sm font-medium text-gray-600" style={{ marginRight: "10px" }}>
                        Statut
                      </label>
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        {glpiPC.state_name || glpiPC.states_id}
                      </Badge>
                    </div>
                  )}
                  {glpiPC.comment && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Commentaire</label>
                      <p className="text-sm text-gray-500">{glpiPC.comment}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-gray-600">Dernier inventaire</label>
                    <p className="text-sm text-gray-500">{formatDate(glpiPC.last_inventory_update)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Date de modification</label>
                    <p className="text-sm text-gray-500">{formatDate(glpiPC.date_mod)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Date de création</label>
                    <p className="text-sm text-gray-500">{formatDate(glpiPC.date_creation)}</p>
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <Computer className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-gray-500">
                    Aucun ordinateur trouvé pour l'utilisateur <strong>{authenticatedUser?.username}</strong>
                  </p>
                  <p className="text-sm text-gray-400 mt-2">
                    Vérifiez que votre compte est bien assigné à un ordinateur dans GLPI
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* PC Specifications */}
        {glpiPC && glpiPC.components && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Computer className="w-5 h-5" />
                Configuration Matérielle
              </CardTitle>
              <CardDescription>Informations techniques du poste</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Operating System */}
                {operatingSystem && (
                  <div className="flex flex-col gap-2 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Monitor className="w-8 h-8 text-indigo-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-600">Système d'exploitation</p>
                        <p className="text-lg font-semibold text-indigo-600">
                          {operatingSystem.name} {operatingSystem.version}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-1 text-sm text-gray-700">
                      {operatingSystem.edition && (
                        <p>
                          <span className="font-medium">Édition:</span> {operatingSystem.edition}
                        </p>
                      )}
                      {operatingSystem.architecture && (
                        <p>
                          <span className="font-medium">Architecture:</span> {operatingSystem.architecture}
                        </p>
                      )}
                      {operatingSystem.kernel_version && (
                        <p>
                          <span className="font-medium">Noyau:</span> {operatingSystem.kernel_version}
                        </p>
                      )}
                      {operatingSystem.service_pack && (
                        <p>
                          <span className="font-medium">Service Pack:</span> {operatingSystem.service_pack}
                        </p>
                      )}
                      {operatingSystem.productid && (
                        <p className="flex items-center gap-1">
                          <Key className="w-4 h-4 text-gray-500" />
                          <span className="font-medium">ID Produit:</span> {operatingSystem.productid}
                        </p>
                      )}
                      {operatingSystem.serial && (
                        <p>
                          <span className="font-medium">Numéro de série:</span> {operatingSystem.serial}
                        </p>
                      )}
                      {operatingSystem.company && (
                        <p>
                          <span className="font-medium">Entreprise:</span> {operatingSystem.company}
                        </p>
                      )}
                      {operatingSystem.owner && (
                        <p>
                          <span className="font-medium">Propriétaire:</span> {operatingSystem.owner}
                        </p>
                      )}
                      {operatingSystem.install_date && (
                        <p className="flex items-center gap-1">
                          <CalendarDays className="w-4 h-4 text-gray-500" />
                          <span className="font-medium">Date d'installation:</span>{" "}
                          {formatShortDate(operatingSystem.install_date)}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Processor */}
                {glpiPC.components.processor?.map((processor, index) => (
                  <div key={`processor-${index}`} className="flex flex-col gap-2 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Cpu className="w-8 h-8 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-600">Processeur</p>
                        <p className="text-lg font-semibold text-green-600">
                          {processor.details?.DeviceProcessor?.designation || "Processeur inconnu"}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-1 text-sm text-gray-700">
                      {processor.frequency && (
                        <p>
                          <span className="font-medium">Fréquence:</span> {(processor.frequency / 1000).toFixed(2)} GHz
                        </p>
                      )}
                      {processor.nbcores && (
                        <p>
                          <span className="font-medium">Cœurs:</span> {processor.nbcores}
                        </p>
                      )}
                      {processor.nbthreads && (
                        <p>
                          <span className="font-medium">Threads:</span> {processor.nbthreads}
                        </p>
                      )}
                      {processor.serial && (
                        <p>
                          <span className="font-medium">Série:</span> {processor.serial}
                        </p>
                      )}
                    </div>
                  </div>
                ))}

                {/* Memory */}
                {glpiPC.components.memory?.map((memory, index) => (
                  <div key={`memory-${index}`} className="flex flex-col gap-2 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <MemoryStick className="w-8 h-8 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-600">Mémoire</p>
                        <p className="text-lg font-semibold text-blue-600">
                          {memory.details?.DeviceMemory?.designation || "Mémoire inconnue"}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-1 text-sm text-gray-700">
                      {memory.size && (
                        <p>
                          <span className="font-medium">Taille:</span> {(memory.size / 1024).toFixed(0)} Go
                        </p>
                      )}
                      {memory.details?.DeviceMemory?.frequence && (
                        <p>
                          <span className="font-medium">Fréquence:</span> {memory.details.DeviceMemory.frequence} MHz
                        </p>
                      )}
                      {memory.serial && (
                        <p>
                          <span className="font-medium">Série:</span> {memory.serial}
                        </p>
                      )}
                    </div>
                  </div>
                ))}

                {/* Hard Drive */}
                {glpiPC.components.harddrive?.map((harddrive, index) => (
                  <div key={`harddrive-${index}`} className="flex flex-col gap-2 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <HardDrive className="w-8 h-8 text-orange-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-600">Disque dur</p>
                        <p className="text-lg font-semibold text-orange-600">
                          {harddrive.details?.DeviceHardDrive?.designation || "Disque dur inconnu"}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-1 text-sm text-gray-700">
                      {harddrive.capacity && (
                        <p>
                          <span className="font-medium">Capacité:</span> {(harddrive.capacity / 1024).toFixed()} Go
                        </p>
                      )}
                      {harddrive.details?.DeviceHardDrive?.interfacetypes_id && (
                        <p>
                          <span className="font-medium">Interface:</span>{" "}
                          {harddrive.details.DeviceHardDrive.interfacetypes_id}
                        </p>
                      )}
                      {harddrive.serial && (
                        <p>
                          <span className="font-medium">Série:</span> {harddrive.serial}
                        </p>
                      )}
                    </div>
                  </div>
                ))}

                {/* Firmware */}
                {glpiPC.components.firmware?.map((firmware, index) => (
                  <div key={`firmware-${index}`} className="flex flex-col gap-2 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Component className="w-8 h-8 text-cyan-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-600">Firmware</p>
                        <p className="text-lg font-semibold text-cyan-600">
                          {firmware.details?.DeviceFirmware?.designation || "Firmware inconnu"}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-1 text-sm text-gray-700">
                      {firmware.details?.DeviceFirmware?.version && (
                        <p>
                          <span className="font-medium">Version:</span> {firmware.details.DeviceFirmware.version}
                        </p>
                      )}
                      {firmware.details?.DeviceFirmware?.date && (
                        <p>
                          <span className="font-medium">Date:</span>{" "}
                          {formatShortDate(firmware.details.DeviceFirmware.date)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}

                {/* Battery */}
                {glpiPC.components.battery?.map((battery, index) => (
                  <div key={`battery-${index}`} className="flex flex-col gap-2 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <BatteryCharging className="w-8 h-8 text-yellow-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-600">Batterie</p>
                        <p className="text-lg font-semibold text-yellow-600">
                          {battery.details?.DeviceBattery?.designation || "Batterie inconnue"}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-1 text-sm text-gray-700">
                      {battery.manufacturing_date && (
                        <p>
                          <span className="font-medium">Date de fabrication:</span>{" "}
                          {formatShortDate(battery.manufacturing_date)}
                        </p>
                      )}
                      {battery.details?.DeviceBattery?.capacity && (
                        <p>
                          <span className="font-medium">Capacité:</span> {battery.details.DeviceBattery.capacity} mWh
                        </p>
                      )}
                      {battery.details?.DeviceBattery?.voltage && (
                        <p>
                          <span className="font-medium">Voltage:</span> {battery.details.DeviceBattery.voltage} mV
                        </p>
                      )}
                    </div>
                  </div>
                ))}

                {/* Graphic Card */}
                {glpiPC.components.graphiccard?.map((graphiccard, index) => (
                  <div key={`graphiccard-${index}`} className="flex flex-col gap-2 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Monitor className="w-8 h-8 text-red-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-600">Carte graphique</p>
                        <p className="text-lg font-semibold text-red-600">
                          {graphiccard.details?.DeviceGraphicCard?.designation || "Carte graphique inconnue"}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-1 text-sm text-gray-700">
                      {graphiccard.memory && (
                        <p>
                          <span className="font-medium">Mémoire:</span> {graphiccard.memory} Mo
                        </p>
                      )}
                      {graphiccard.details?.DeviceGraphicCard?.chipset && (
                        <p>
                          <span className="font-medium">Chipset:</span> {graphiccard.details.DeviceGraphicCard.chipset}
                        </p>
                      )}
                    </div>
                  </div>
                ))}

                {/* Sound Card */}
                {glpiPC.components.soundcard?.map((soundcard, index) => (
                  <div key={`soundcard-${index}`} className="flex flex-col gap-2 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Speaker className="w-8 h-8 text-pink-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-600">Carte son</p>
                        <p className="text-lg font-semibold text-pink-600">
                          {soundcard.details?.DeviceSoundCard?.designation || "Carte son inconnue"}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-1 text-sm text-gray-700">
                      {soundcard.details?.DeviceSoundCard?.comment && (
                        <p>
                          <span className="font-medium">Description:</span> {soundcard.details.DeviceSoundCard.comment}
                        </p>
                      )}
                    </div>
                  </div>
                ))}

                {/* Network Card */}
                {glpiPC.components.networkcard?.map((networkcard, index) => (
                  <div key={`networkcard-${index}`} className="flex flex-col gap-2 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Network className="w-8 h-8 text-purple-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-600">Carte réseau</p>
                        <p className="text-lg font-semibold text-purple-600">
                          {networkcard.details?.DeviceNetworkCard?.designation || "Carte réseau inconnue"}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-1 text-sm text-gray-700">
                      {networkcard.mac && (
                        <p>
                          <span className="font-medium">Adresse MAC:</span> {networkcard.mac}
                        </p>
                      )}
                    </div>
                  </div>
                ))}

                {/* Control */}
                {glpiPC.components.control?.map((control, index) => (
                  <div key={`control-${index}`} className="flex flex-col gap-2 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Component className="w-8 h-8 text-gray-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-600">Contrôleur</p>
                        <p className="text-lg font-semibold text-gray-600">
                          {control.details?.DeviceControl?.designation || "Contrôleur inconnu"}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-1 text-sm text-gray-700">
                      {control.details?.DeviceControl?.interfacetypes_id && (
                        <p>
                          <span className="font-medium">Interface:</span>{" "}
                          {control.details.DeviceControl.interfacetypes_id}
                        </p>
                      )}
                    </div>
                  </div>
                ))}

                {/* Message si aucun composant */}
                {(!glpiPC.components ||
                  Object.keys(glpiPC.components).length === 0 ||
                  Object.values(glpiPC.components).every((arr) => !arr || arr.length === 0)) && (
                    <div className="col-span-full text-center py-8">
                      <Component className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-gray-500">Aucun composant matériel trouvé</p>
                      <p className="text-sm text-gray-400 mt-2">
                        Les informations de configuration matérielle ne sont pas disponibles
                      </p>
                    </div>
                  )}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
