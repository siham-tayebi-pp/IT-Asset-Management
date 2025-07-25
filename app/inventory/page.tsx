"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Package,
  Plus,
  Search,
  Tag,
  HardDrive,
  Monitor,
  Hash,
  CheckCircle,
  Settings,
  Calendar,
  LogOut,
  Shield,
  Users,
  BarChart3,
  CheckSquare,
  Loader2,
  AlertTriangle,
  Laptop,
  Printer,
  Wifi,
  Phone,
  Eye,
  MoreHorizontal,
  Edit,
  UserPlus,
  RefreshCw,
  Trash2,
  Download,
  TestTube,
} from "lucide-react"

interface InventoryItem {
  id: number
  name: string
  type: string
  brand?: string
  model?: string
  serial?: string
  otherserial?: string
  status: string
  condition?: string
  date_creation: string
  date_mod: string
  locations_id?: number
  states_id?: number
  manufacturers_id?: string
  assignedUser?: {
    id: number
    name: string
    firstname?: string
    realname?: string
  } | null
  quantity?: number
}

interface User {
  id: number
  name: string
  firstname?: string
  realname?: string
  email?: string
}

export default function InventoryPage() {
  const [user, setUser] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [statuses, setStatuses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("all")
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [showAssignDialog, setShowAssignDialog] = useState(false)
  const [showStatusDialog, setShowStatusDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [assignedUserId, setAssignedUserId] = useState("")
  const [newStatus, setNewStatus] = useState("")
  const [editForm, setEditForm] = useState({
    name: "",
    brand: "",
    model: "",
    serial: "",
    condition: "",
    notes: "",
  })
  const router = useRouter()

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (!userData) {
      router.push("/")
      return
    }
    setUser(JSON.parse(userData))
    fetchInventoryData()
    fetchUsers()
    fetchStatuses()
  }, [router])

  const fetchInventoryData = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log("Fetching inventory from GLPI API...")

      const response = await fetch("/api/glpi/inventory")
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Erreur HTTP: ${response.status}`)
      }

      const data = await response.json()
      console.log("Inventory data received:", data)

      if (data.success && data.inventory) {
        setInventoryItems(data.inventory)
        console.log(`Loaded ${data.inventory.length} items from GLPI`)
      } else {
        throw new Error(data.error || "Erreur lors de la récupération de l'inventaire")
      }
    } catch (error) {
      console.error("Erreur lors du chargement de l'inventaire:", error)
      setError(error instanceof Error ? error.message : "Erreur inconnue")
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      console.log("Fetching users from GLPI API...")
      const response = await fetch("/api/users")
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
        console.log(`Loaded ${data.users?.length || 0} users from GLPI`)
      }
    } catch (error) {
      console.error("Erreur lors du chargement des utilisateurs:", error)
    }
  }

  const fetchStatuses = async () => {
    try {
      console.log("🔍 Fetching statuses from GLPI API...")
      const response = await fetch("/api/statuses")

      if (response.ok) {
        const data = await response.json()
        console.log("📊 Statuses data received:", data)

        if (data.statuses && Array.isArray(data.statuses)) {
          setStatuses(data.statuses)
          console.log(
            `✅ Loaded ${data.statuses.length} statuses from GLPI:`,
            data.statuses.map((s) => s.name),
          )
        } else {
          console.warn("⚠️ No statuses array in response:", data)
          // Utiliser des statuts par défaut
          const defaultStatuses = [
            { id: 1, name: "Non affecté" },
            { id: 2, name: "Affecté" },
            { id: 3, name: "En maintenance" },
            { id: 4, name: "Hors service" },
            { id: 5, name: "En stock" },
          ]
          setStatuses(defaultStatuses)
          console.log("📋 Using default statuses")
        }
      } else {
        console.error("❌ Failed to fetch statuses:", response.status)
      }
    } catch (error) {
      console.error("❌ Erreur lors du chargement des statuts:", error)
      // Utiliser des statuts par défaut en cas d'erreur
      const defaultStatuses = [
        { id: 1, name: "Non affecté" },
        { id: 2, name: "Affecté" },
        { id: 3, name: "En maintenance" },
        { id: 4, name: "Hors service" },
        { id: 5, name: "En stock" },
      ]
      setStatuses(defaultStatuses)
      console.log("📋 Using fallback statuses due to error")
    }
  }

  const testGLPIConnection = async () => {
    try {
      setError(null)
      console.log("Testing GLPI connection...")

      const response = await fetch("/api/glpi/test")
      const data = await response.json()

      if (data.success) {
        alert(
          `Connexion GLPI réussie!\n\nOrdinateurs: ${data.data.computersCount}\nUtilisateurs: ${data.data.usersCount}`,
        )
      } else {
        alert(`Erreur de connexion GLPI:\n${data.error}`)
      }
    } catch (error) {
      console.error("Erreur lors du test GLPI:", error)
      alert(`Erreur lors du test: ${error instanceof Error ? error.message : "Erreur inconnue"}`)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("user")
    router.push("/")
  }

  const handleAssignUser = async () => {
    if (!selectedItem || !assignedUserId) return

    try {
      const isAssigning = assignedUserId !== "0" // true si on assigne, false si on désaffecte

      console.log(
        `🔄 ${isAssigning ? `Assignation à l'utilisateur ${assignedUserId}` : "Désaffectation"} pour ${selectedItem.name}`,
      )

      // 1. Faire l'assignation/désaffectation
      const assignResponse = await fetch(`/api/inventory/${selectedItem.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: assignedUserId === "0" ? null : assignedUserId,
          itemType: selectedItem.type,
        }),
      })

      if (!assignResponse.ok) {
        const errorData = await assignResponse.json()
        alert(`Erreur lors de l'assignation: ${errorData.error}`)
        return
      }

      // 2. Changer automatiquement le statut selon l'action
      if (isAssigning) {
        // Si on assigne un utilisateur → statut "Affecté"
        console.log("📝 Changement automatique du statut vers 'Affecté'...")

        const affectedStatus = statuses.find(
          (s) => s.name.toLowerCase().includes("affecté") || s.name.toLowerCase().includes("assigned"),
        )

        if (affectedStatus) {
          const statusResponse = await fetch(`/api/inventory/${selectedItem.id}/status`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              status: affectedStatus.id.toString(),
              itemType: selectedItem.type,
            }),
          })

          if (!statusResponse.ok) {
            console.warn("⚠️ Erreur lors du changement automatique de statut vers 'Affecté'")
          } else {
            console.log("✅ Statut changé automatiquement vers 'Affecté'")
          }
        }
      } else {
        // Si on désaffecte → statut "Non affecté"
        console.log("📝 Changement automatique du statut vers 'Non affecté'...")

        const unassignedStatus = statuses.find(
          (s) => s.name.toLowerCase().includes("non affecté") || s.name.toLowerCase().includes("unassigned"),
        )

        if (unassignedStatus) {
          const statusResponse = await fetch(`/api/inventory/${selectedItem.id}/status`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              status: unassignedStatus.id.toString(),
              itemType: selectedItem.type,
            }),
          })

          if (!statusResponse.ok) {
            console.warn("⚠️ Erreur lors du changement automatique de statut vers 'Non affecté'")
          } else {
            console.log("✅ Statut changé automatiquement vers 'Non affecté'")
          }
        }
      }

      await fetchInventoryData()
      setShowAssignDialog(false)
      setAssignedUserId("")
      setSelectedItem(null)

      // Messages de confirmation appropriés
      if (isAssigning) {
        alert("✅ Utilisateur assigné et statut changé vers 'Affecté' !")
      } else {
        alert("✅ Utilisateur désaffecté et statut changé vers 'Non affecté' !")
      }
    } catch (error) {
      console.error("Erreur lors de l'assignation:", error)
      alert("Erreur lors de l'assignation")
    }
  }

  const handleStatusChange = async () => {
    if (!selectedItem || !newStatus) return

    try {
      // Vérifier si le nouveau statut est "Non affecté"
      const selectedStatus = statuses.find((s) => s.id.toString() === newStatus)
      const isUnassignedStatus = selectedStatus?.name?.toLowerCase().includes("non affecté")

      console.log(`🔄 Changement de statut vers: ${selectedStatus?.name} (ID: ${newStatus})`)

      // 1. Si c'est "Non affecté" et qu'il y a un utilisateur assigné, le désaffecter d'abord
      if (isUnassignedStatus && selectedItem.assignedUser) {
        console.log("🚫 Désaffectation automatique de l'utilisateur...")

        const unassignResponse = await fetch(`/api/inventory/${selectedItem.id}/assign`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: null, // Désaffecter
            itemType: selectedItem.type,
          }),
        })

        if (!unassignResponse.ok) {
          const errorData = await unassignResponse.json()
          console.warn("⚠️ Erreur lors de la désaffectation automatique:", errorData.error)
          // Continuer quand même avec le changement de statut
        } else {
          console.log("✅ Utilisateur désaffecté automatiquement")
        }
      }

      // 2. Changer le statut
      const response = await fetch(`/api/inventory/${selectedItem.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          itemType: selectedItem.type,
        }),
      })

      if (response.ok) {
        await fetchInventoryData()
        setShowStatusDialog(false)
        setNewStatus("")
        setSelectedItem(null)

        if (isUnassignedStatus && selectedItem.assignedUser) {
          alert("✅ Statut modifié et utilisateur désaffecté automatiquement !")
        }
      } else {
        const errorData = await response.json()
        alert(`Erreur lors du changement de statut: ${errorData.error}`)
      }
    } catch (error) {
      console.error("Erreur lors du changement de statut:", error)
      alert("Erreur lors du changement de statut")
    }
  }

  const handleEdit = async () => {
    if (!selectedItem) return

    try {
      const response = await fetch(`/api/inventory/${selectedItem.id}?type=${selectedItem.type}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      })

      if (response.ok) {
        await fetchInventoryData()
        setShowEditDialog(false)
        setSelectedItem(null)
      } else {
        const errorData = await response.json()
        alert(`Erreur lors de la modification: ${errorData.error}`)
      }
    } catch (error) {
      console.error("Erreur lors de la modification:", error)
      alert("Erreur lors de la modification")
    }
  }

  const handleDelete = async (item: InventoryItem) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet équipement ?")) return

    try {
      const response = await fetch(`/api/inventory/${item.id}?type=${item.type}`, {
        method: "DELETE",
      })

      if (response.ok) {
        await fetchInventoryData()
      } else {
        const errorData = await response.json()
        alert(`Erreur lors de la suppression: ${errorData.error}`)
      }
    } catch (error) {
      console.error("Erreur lors de la suppression:", error)
      alert("Erreur lors de la suppression")
    }
  }

  const openAssignDialog = (item: InventoryItem) => {
    setSelectedItem(item)
    setShowAssignDialog(true)
  }

  const openStatusDialog = (item: InventoryItem) => {
    setSelectedItem(item)
    setNewStatus(item.status)
    setShowStatusDialog(true)
  }

  const openEditDialog = (item: InventoryItem) => {
    setSelectedItem(item)
    setEditForm({
      name: item.name,
      brand: item.brand || "",
      model: item.model || "",
      serial: item.serial || "",
      condition: item.condition || "",
      notes: "",
    })
    setShowEditDialog(true)
  }

  const exportToCSV = () => {
    const headers = ["Type", "Nom", "Marque", "Modèle", "Série", "Statut", "Utilisateur", "Date MAJ"]
    const csvContent = [
      headers.join(","),
      ...finalFilteredItems.map((item) =>
        [
          item.type,
          item.name,
          item.brand || "",
          item.model || "",
          item.serial || "",
          item.status,
          item.assignedUser ? `${item.assignedUser.firstname || ""} ${item.assignedUser.realname || ""}`.trim() : "",
          formatDate(item.date_mod),
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `inventaire_glpi_${new Date().toISOString().split("T")[0]}.csv`
    a.click()
  }

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase()
    if (statusLower.includes("non affecté") || statusLower.includes("disponible") || statusLower === "n/a") {
      return <Badge className="bg-green-600 text-white">En Stock</Badge>
    } else if (statusLower === ("affecté") || statusLower.includes("assigned")) {
      return <Badge className="bg-blue-600 text-white">Affecté</Badge>
    } else if (statusLower.includes("délégué")) {
      return <Badge className="bg-purple-600 text-white">Délégué</Badge>
    } else if (statusLower.includes("en congé")) {
      return <Badge className="bg-cyan-600 text-white">En Congé</Badge>
    } else if (statusLower.includes("en transition")) {
      return <Badge className="bg-orange-600 text-white">En Transition</Badge>
    } else if (statusLower.includes("maintenance")) {
      return <Badge className="bg-yellow-600 text-white">Maintenance</Badge>
    } else if (statusLower.includes("hors service")) {
      return <Badge className="bg-red-600 text-white">Hors Service</Badge>
    } else {
      return <Badge variant="outline">{status || "Inconnu"}</Badge>
    }
  }

  const getTypeIcon = (type: string) => {
    const typeLower = type.toLowerCase()
    if (typeLower.includes("computer") || typeLower.includes("ordinateur")) {
      return <Laptop className="w-4 h-4" />
    } else if (typeLower.includes("monitor") || typeLower.includes("écran")) {
      return <Monitor className="w-4 h-4" />
    } else if (typeLower.includes("printer") || typeLower.includes("imprimante")) {
      return <Printer className="w-4 h-4" />
    } else if (typeLower.includes("network") || typeLower.includes("réseau")) {
      return <Wifi className="w-4 h-4" />
    } else if (typeLower.includes("phone") || typeLower.includes("téléphone")) {
      return <Phone className="w-4 h-4" />
    } else {
      return <Package className="w-4 h-4" />
    }
  }

  const countByType = (type: string) => {
    if (type === "all") return inventoryItems.length
    return inventoryItems.filter((item) => item.type.toLowerCase().includes(type.toLowerCase())).length
  }
  const countByStatus = (targetStatus: string) => {
    const normalized = targetStatus.trim().toLowerCase()
    return inventoryItems.filter((item) => item.status?.trim().toLowerCase() === normalized).length

  }
  const filteredByTab = inventoryItems.filter((item) => {
    if (activeTab === "all") return true
    return item.type.toLowerCase().includes(activeTab.toLowerCase())
  })

  const finalFilteredItems = filteredByTab.filter((item) => {
    const searchLower = searchTerm.toLowerCase()
    return (
      item.name.toLowerCase().includes(searchLower) ||
      item.type.toLowerCase().includes(searchLower) ||
      (item.brand?.toLowerCase() || "").includes(searchLower) ||
      (item.model?.toLowerCase() || "").includes(searchLower) ||
      (item.serial?.toLowerCase() || "").includes(searchLower) ||
      (item.assignedUser?.name?.toLowerCase() || "").includes(searchLower) ||
      item.status.toLowerCase().includes(searchLower)
    )
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-slate-300">Chargement de l'inventaire GLPI...</p>
          <p className="text-slate-500 text-sm mt-2">Connexion à {process.env.NEXT_PUBLIC_GLPI_URL}</p>
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
                <p className="text-xs text-blue-200">Connecté à GLPI</p>
              </div>
              <nav className="hidden md:flex items-center gap-6 ml-8">
                <Button
                  variant="ghost"
                  className="text-white hover:bg-blue-700"
                  onClick={() => router.push("/dashboard")}
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
                <Button
                  variant="ghost"
                  className="text-blue-200 hover:bg-blue-700"
                  onClick={() => router.push("/assignments")}
                >
                  <CheckSquare className="w-4 h-4 mr-2" />
                  Assignments
                </Button>
                <Button
                  variant="ghost"
                  className="text-blue-200 hover:bg-blue-700"
                  onClick={() => router.push("/users")}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Users
                </Button>
                <Button
                  variant="ghost"
                  className="text-blue-200 hover:bg-blue-700 bg-blue-800"
                  onClick={() => router.push("/inventory")}
                >
                  <Package className="w-4 h-4 mr-2" />
                  Inventory
                </Button>
                <Button
                  variant="ghost"
                  className="text-blue-200 hover:bg-blue-700"
                  onClick={() => router.push("/managers")}
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Managers
                </Button>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={testGLPIConnection}
                className="text-blue-200 hover:bg-blue-700"
              >
                <TestTube className="w-4 h-4 mr-2" />
                Test GLPI
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
                className="border-white/20 text-white hover:bg-white/10 bg-transparent"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Déconnexion
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <Package className="w-8 h-8 text-white" />
            <div>
              <h1 className="text-3xl font-bold text-white">Inventaire GLPI</h1>
              <p className="text-slate-400">Gestion complète des équipements depuis GLPI</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={exportToCSV}
              className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
            >
              <Download className="w-4 h-4 mr-2" />
              Exporter CSV
            </Button>
            <Button asChild className="bg-blue-600 hover:bg-blue-700">
              <a
                href={`${process.env.NEXT_PUBLIC_GLPI_URL?.replace("/apirest.php/", "")}/front/dashboard_assets.php`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Plus className="w-4 h-4 mr-2" />
                Ajouter dans GLPI
              </a>
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg">
            <p className="text-red-300 text-sm">
              <AlertTriangle className="w-4 h-4 inline mr-2" />
              {error}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchInventoryData}
              className="mt-2 border-red-600 text-red-300 hover:bg-red-900/20 bg-transparent"
            >
              Réessayer
            </Button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">Total Équipements</p>
                <p className="text-3xl font-bold text-white">{inventoryItems.length}</p>
              </div>
              <Package className="w-12 h-12 text-blue-500" />
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">En Stock</p>
                <p className="text-3xl font-bold text-white">
                  {countByStatus("Non affecté") + countByStatus("N/A") + countByStatus("En stock")}
                </p>
              </div>
              <CheckCircle className="w-12 h-12 text-green-500" />
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">Affectés</p>
                <p className="text-3xl font-bold text-white">
                  {countByStatus("affecté") +
                    countByStatus("délégué") +
                    countByStatus("En congé") +
                    countByStatus("en transition")}
                </p>
              </div>
              <Users className="w-12 h-12 text-blue-500" />
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">Maintenance</p>
                <p className="text-3xl font-bold text-white">{countByStatus("en maintenance")}</p>
              </div>
              <Settings className="w-12 h-12 text-yellow-500" />
            </CardContent>
          </Card>
        </div>

        {/* Tabs for filtering by type */}
        <Tabs defaultValue="all" className="mb-6" onValueChange={setActiveTab}>
          <TabsList className="bg-slate-800 border border-slate-700 text-white">
            <TabsTrigger value="all" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              Tous ({countByType("all")})
            </TabsTrigger>
            <TabsTrigger value="computer" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              Ordinateurs ({countByType("computer")})
            </TabsTrigger>
            <TabsTrigger value="monitor" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              Écrans ({countByType("monitor")})
            </TabsTrigger>
            <TabsTrigger value="printer" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              Imprimantes ({countByType("printer")})
            </TabsTrigger>
            <TabsTrigger value="network" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              Réseau ({countByType("network")})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Inventory Table */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="bg-slate-700">
            <div className="flex justify-between items-center">
              <CardTitle className="text-white flex items-center gap-2">
                <Package className="w-5 h-5" />
                Inventaire GLPI ({finalFilteredItems.length})
              </CardTitle>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Rechercher dans l'inventaire..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-slate-600 border-slate-500 text-white placeholder:text-slate-400 w-64"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Table Header */}
            <div className="grid grid-cols-[1fr_1fr_1.5fr_1fr_1fr_1fr_1fr_0.8fr] gap-4 p-4 bg-blue-600 text-white text-sm font-medium">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4" />
                TYPE
              </div>
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                NOM
              </div>
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4" />
                MARQUE/MODÈLE
              </div>
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4" />
                SÉRIE
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                STATUT
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                UTILISATEUR
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                DATE MAJ
              </div>
              <div>ACTIONS</div>
            </div>
            {/* Table Body */}
            <div className="divide-y divide-slate-700">
              {finalFilteredItems.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  {loading ? "Chargement depuis GLPI..." : "Aucun élément d'inventaire trouvé"}
                </div>
              ) : (
                finalFilteredItems.map((item) => (
                  <div
                    key={`${item.type}-${item.id}`}
                    className="grid grid-cols-[1fr_1fr_1.5fr_1fr_1fr_1fr_1fr_0.8fr] gap-4 p-4 text-slate-300 hover:bg-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-2 font-medium">
                      {getTypeIcon(item.type)}
                      {item.type}
                    </div>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-sm">
                      <div>{item.brand || item.manufacturers_id || "N/A"}</div>
                      {item.model && <div className="text-xs text-slate-500">{item.model}</div>}
                    </div>
                    <div className="font-mono text-sm">{item.serial || item.otherserial || "N/A"}</div>
                    <div>{getStatusBadge(item.status)}</div>
                    <div>
                      {item.assignedUser ? (
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {item.assignedUser.firstname && item.assignedUser.realname
                              ? `${item.assignedUser.firstname} ${item.assignedUser.realname}`
                              : item.assignedUser.name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-500">Non assigné</span>
                      )}
                    </div>
                    <div className="text-sm">{formatDate(item.date_mod)}</div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-blue-400 hover:text-blue-300 p-1"
                        onClick={() =>
                          router.push(`/inventory/${item.type.toLowerCase()}/${item.id}?type=${item.type}`)
                        }
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-300 p-1">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                          <DropdownMenuItem
                            onClick={() => openEditDialog(item)}
                            className="text-slate-300 hover:bg-slate-700"
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openAssignDialog(item)}
                            className="text-slate-300 hover:bg-slate-700"
                          >
                            <UserPlus className="w-4 h-4 mr-2" />
                            Assigner
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openStatusDialog(item)}
                            className="text-slate-300 hover:bg-slate-700"
                          >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Changer statut
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-slate-700" />
                          <DropdownMenuItem
                            onClick={() => handleDelete(item)}
                            className="text-red-400 hover:bg-red-900/20"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Assign User Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Assigner un utilisateur</DialogTitle>
            <DialogDescription className="text-slate-400">
              Assigner l'équipement "{selectedItem?.name}" à un utilisateur dans GLPI
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="user-select">Utilisateur</Label>
              <Select value={assignedUserId} onValueChange={setAssignedUserId}>
                <SelectTrigger className="bg-slate-700 border-slate-600">
                  <SelectValue placeholder="Sélectionner un utilisateur" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="0">
                    <span className="text-red-400">🚫 Aucun (Désaffecter)</span>
                  </SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.firstname && user.realname ? `${user.firstname} ${user.realname}` : user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleAssignUser} className="bg-blue-600 hover:bg-blue-700">
              Assigner dans GLPI
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Status Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Changer le statut</DialogTitle>
            <DialogDescription className="text-slate-400">
              Modifier le statut de l'équipement "{selectedItem?.name}" dans GLPI
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="status-select">Nouveau statut</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="bg-slate-700 border-slate-600">
                  <SelectValue placeholder="Sélectionner un statut" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {statuses.length === 0 ? (
                    <SelectItem value="loading" disabled>
                      Chargement des statuts...
                    </SelectItem>
                  ) : (
                    statuses.map((status) => (
                      <SelectItem key={status.id} value={status.id.toString()}>
                        {status.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {/* Debug info */}
              <p className="text-xs text-slate-500 mt-1">{statuses.length} statuts disponibles</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleStatusChange} className="bg-blue-600 hover:bg-blue-700">
              Modifier dans GLPI
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Modifier l'équipement</DialogTitle>
            <DialogDescription className="text-slate-400">
              Modifier les informations de l'équipement "{selectedItem?.name}" dans GLPI
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nom</Label>
                <Input
                  id="name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="bg-slate-700 border-slate-600"
                />
              </div>
              <div>
                <Label htmlFor="serial">Numéro de série</Label>
                <Input
                  id="serial"
                  value={editForm.serial}
                  onChange={(e) => setEditForm({ ...editForm, serial: e.target.value })}
                  className="bg-slate-700 border-slate-600"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="notes">Notes/Commentaires</Label>
              <Textarea
                id="notes"
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                className="bg-slate-700 border-slate-600"
                rows={3}
                placeholder="Commentaires à ajouter dans GLPI..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleEdit} className="bg-blue-600 hover:bg-blue-700">
              Sauvegarder dans GLPI
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
