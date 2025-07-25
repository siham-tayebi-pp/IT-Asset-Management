"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  CheckSquare,
  Download,
  Plus,
  Search,
  Users,
  HardDrive,
  Monitor,
  Settings,
  Wrench,
  Calendar,
  User,
  LogOut,
  Shield,
  Package,
  BarChart3,
  Loader2,
  AlertTriangle,
  Trash2,
  Edit,
  RefreshCw,
} from "lucide-react"

interface Assignment {
  id: number
  user: string
  department: string
  pc: string
  configuration: string
  accessories: string
  date: string
  createdBy: string
  selected?: boolean
  computerId?: number
  userId?: number
}

interface Computer {
  id: number
  name: string
  serial?: string
  status: string
  assignedUser?: any
}

interface GLPIUser {
  id: number
  name: string
  firstname?: string
  realname?: string
  email?: string
}

export default function AssignmentsPage() {
  const [user, setUser] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [computers, setComputers] = useState<Computer[]>([])
  const [users, setUsers] = useState<GLPIUser[]>([])
  const [loading, setLoading] = useState(false)
  const [usersLoading, setUsersLoading] = useState(false)
  const [computersLoading, setComputersLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null)

  // États pour les assets utilisateurs
  const [userAssetsMap, setUserAssetsMap] = useState<Record<number, Record<string, any[]>>>({})
  const [assetsLoading, setAssetsLoading] = useState(false)

  // Dialog states pour la suppression
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [assignmentToDelete, setAssignmentToDelete] = useState<Assignment | null>(null)
  const [deleteReason, setDeleteReason] = useState("")

  // États pour l'édition
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [assignmentToEdit, setAssignmentToEdit] = useState<Assignment | null>(null)
  const [editAssignment, setEditAssignment] = useState({
    userId: "",
    computerId: "",
    department: "",
    accessories: "",
    comment: "",
  })

  // Form state pour nouvel assignement
  const [newAssignment, setNewAssignment] = useState({
    userId: "",
    computerId: "",
    department: "",
    accessories: "",
    comment: "",
  })

  const router = useRouter()

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (!userData) {
      router.push("/")
      return
    }
    setUser(JSON.parse(userData))
    fetchData()
  }, [router])

  async function fetchAssetsByUserId(userId: number) {
    const types = ["monitor", "printer", "phone", "peripheral", "networkequipment"]
    const results: Record<string, any[]> = {}

    console.log(`🔍 [DEBUG] Récupération assets pour userId: ${userId}`)

    for (const type of types) {
      try {
        const url = `/api/glpi/search/${type}?userId=${userId}`
        console.log(`📡 [DEBUG] Appel API: ${url}`)

        const res = await fetch(url)
        console.log(`📊 [DEBUG] ${type} - Status: ${res.status}`)

        if (res.ok) {
          const data = await res.json()
          console.log(`✅ [DEBUG] ${type} - Réponse complète:`, data)
          results[type] = data.data || []
          console.log(`📦 [DEBUG] ${type} - Items trouvés: ${results[type].length}`)

          // Afficher les premiers éléments pour debug
          if (results[type].length > 0) {
            console.log(`🔍 [DEBUG] ${type} - Premier élément:`, results[type][0])
          }
        } else {
          const errorText = await res.text()
          console.error(`❌ [DEBUG] ${type} - Erreur ${res.status}:`, errorText)
          results[type] = []
        }
      } catch (error) {
        console.error(`💥 [DEBUG] ${type} - Exception:`, error)
        results[type] = []
      }
    }

    console.log(`🎯 [DEBUG] Résultats finaux pour userId ${userId}:`, results)
    return results
  }

  async function fetchAllUsersAssets(assignments: any[]) {
    setAssetsLoading(true)
    try {
      console.log("🔄 [DEBUG] Début fetchAllUsersAssets avec assignments:", assignments)

      // Extraire les userIds uniques depuis les assignements
      const userIds = Array.from(
        new Set(
          assignments
            .map((a) => {
              const userId = a.userId || a.assignedUser?.id
              console.log(`👤 [DEBUG] Assignment ${a.id}: userId=${userId}, user=${a.user}`)
              return userId
            })
            .filter(Boolean),
        ),
      )

      console.log("🎯 [DEBUG] UserIds extraits:", userIds)

      const map: Record<number, Record<string, any[]>> = {}

      // Récupérer les assets pour chaque utilisateur
      for (const userId of userIds) {
        console.log(`📦 [DEBUG] Traitement userId: ${userId}`)
        map[userId] = await fetchAssetsByUserId(userId)
        console.log(`✅ [DEBUG] Assets pour ${userId}:`, map[userId])
      }

      console.log("🏁 [DEBUG] Map finale complète:", map)
      setUserAssetsMap(map)
    } catch (error) {
      console.error("❌ [DEBUG] Erreur dans fetchAllUsersAssets:", error)
    } finally {
      setAssetsLoading(false)
    }
  }

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      console.log("🔄 Début de la récupération des données...")
      // Récupérer les ordinateurs et utilisateurs en parallèle
      const [computersRes, usersRes] = await Promise.all([
        fetch("/api/glpi/computer"),
        fetch("/api/glpi/user-assignement"),
      ])

      console.log("📡 Réponses reçues:")
      console.log("- Computers response status:", computersRes.status)
      console.log("- Users response status:", usersRes.status)

      // Traiter les ordinateurs
      let computersData = { success: false, computers: [] }
      if (computersRes.ok) {
        computersData = await computersRes.json()
        console.log("💻 Données ordinateurs:", {
          success: computersData.success,
          count: computersData.computers?.length || 0,
        })
        if (computersData.success) {
          setComputers(computersData.computers)
        }
      } else {
        console.error("❌ Erreur récupération ordinateurs:", computersRes.status)
      }

      // Traiter les utilisateurs
      let usersData = { success: false, users: [] }
      if (usersRes.ok) {
        usersData = await usersRes.json()
        console.log("👥 Données utilisateurs:", {
          success: usersData.success,
          count: usersData.users?.length || 0,
          firstUser: usersData.users?.[0],
        })
        if (usersData.success && usersData.users) {
          console.log("✅ Utilisateurs récupérés avec succès:", usersData.users.length)
          setUsers(usersData.users)
        } else {
          console.warn("⚠️ Pas d'utilisateurs dans la réponse")
          setUsers([])
        }
      } else {
        console.error("❌ Erreur récupération utilisateurs:", usersRes.status)
        const errorText = await usersRes.text()
        console.error("Détails erreur utilisateurs:", errorText)
      }

      // Créer les assignements simulés
      const simulatedAssignments: Assignment[] =
        computersData.computers
          ?.filter((comp: any) => comp.assignedUser)
          .map((comp: any, index: number) => ({
            id: index + 1,
            computerId: comp.id,
            userId: comp.assignedUser?.id,
            user:
              comp.assignedUser?.firstname && comp.assignedUser?.realname
                ? `${comp.assignedUser.firstname} ${comp.assignedUser.realname}`
                : comp.assignedUser?.name || "Utilisateur inconnu",
            department: comp.groups_id || "N/A",
            pc: comp.name,
            configuration: `${comp.computermodels_id || "N/A"} - ${comp.manufacturers_id || "N/A"}`,
            accessories: "",
            date: comp.date_mod?.split(" ")[0] || new Date().toISOString().split("T")[0],
            createdBy: "Admin",
            selected: false,
          })) || []

      setAssignments(simulatedAssignments)
      console.log("📋 Assignements créés:", simulatedAssignments.length)

      // Charger les assets des utilisateurs après avoir créé les assignements
      if (simulatedAssignments.length > 0) {
        console.log("🔄 Chargement des assets utilisateurs...")
        await fetchAllUsersAssets(simulatedAssignments)
      }
    } catch (error) {
      console.error("💥 Erreur générale lors du chargement des données:", error)
      setError(`Erreur lors du chargement des données: ${error instanceof Error ? error.message : "Erreur inconnue"}`)
    } finally {
      setLoading(false)
    }
  }

  // Fonction pour recharger uniquement les utilisateurs
  const fetchUsers = async () => {
    setUsersLoading(true)
    try {
      console.log("🔄 Rechargement des utilisateurs...")
      const response = await fetch("/api/glpi/users")
      if (response.ok) {
        const data = await response.json()
        console.log("👥 Utilisateurs rechargés:", data)
        if (data.success && data.users) {
          setUsers(data.users)
          console.log("✅ Utilisateurs mis à jour:", data.users.length)
        } else {
          console.warn("⚠️ Pas d'utilisateurs dans la réponse de rechargement")
          setUsers([])
        }
      } else {
        console.error("❌ Erreur rechargement utilisateurs:", response.status)
        const errorText = await response.text()
        console.error("Détails:", errorText)
      }
    } catch (error) {
      console.error("💥 Erreur rechargement utilisateurs:", error)
    } finally {
      setUsersLoading(false)
    }
  }

  // Fonction pour recharger uniquement les ordinateurs
  const fetchComputers = async () => {
    setComputersLoading(true)
    try {
      console.log("🔄 Rechargement des ordinateurs...")
      const response = await fetch("/api/glpi/computer")
      if (response.ok) {
        const data = await response.json()
        console.log("💻 Ordinateurs rechargés:", data)
        if (data.success && data.computers) {
          setComputers(data.computers)
          console.log("✅ Ordinateurs mis à jour:", data.computers.length)
        }
      } else {
        console.error("❌ Erreur rechargement ordinateurs:", response.status)
      }
    } catch (error) {
      console.error("💥 Erreur rechargement ordinateurs:", error)
    } finally {
      setComputersLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("user")
    router.push("/")
  }

  // Fonction pour télécharger les assignements sélectionnés
  const handleDownloadSelected = async () => {
    setIsDownloading(true)
    try {
      const selectedAssignments = assignments.filter((a) => a.selected)
      if (selectedAssignments.length === 0) {
        alert("Veuillez sélectionner au moins un assignement à télécharger")
        return
      }

      const csvHeaders = ["ID", "Utilisateur", "Département", "PC", "Configuration", "Accessoires", "Date", "Créé par"]
      const csvContent = [
        csvHeaders.join(","),
        ...selectedAssignments.map((assignment) =>
          [
            assignment.id,
            `"${assignment.user}"`,
            `"${assignment.department}"`,
            `"${assignment.pc}"`,
            `"${assignment.configuration}"`,
            `"${assignment.accessories}"`,
            assignment.date,
            `"${assignment.createdBy}"`,
          ].join(","),
        ),
      ].join("\n")

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const link = document.createElement("a")
      const url = URL.createObjectURL(blob)
      link.setAttribute("href", url)
      link.setAttribute("download", `assignments_${new Date().toISOString().split("T")[0]}.csv`)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error("Erreur lors du téléchargement:", error)
      alert("Erreur lors du téléchargement")
    } finally {
      setIsDownloading(false)
    }
  }

  // Fonction pour créer un nouvel assignement dans GLPI
  const handleCreateAssignment = async () => {
    if (!newAssignment.userId || !newAssignment.computerId) {
      alert("Veuillez sélectionner un utilisateur et un ordinateur")
      return
    }

    setLoading(true)
    try {
      console.log("🔄 Création assignement:", newAssignment)
      const response = await fetch("/api/glpi/assign-computer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: Number.parseInt(newAssignment.userId),
          computerId: Number.parseInt(newAssignment.computerId),
          accessories: newAssignment.accessories,
          comment: newAssignment.comment,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          alert("Assignement créé avec succès!")
          setIsDialogOpen(false)
          setNewAssignment({
            userId: "",
            computerId: "",
            department: "",
            accessories: "",
            comment: "",
          })
          // Recharger les données
          fetchData()
        } else {
          alert(`Erreur: ${result.error}`)
        }
      } else {
        const errorText = await response.text()
        console.error("Erreur création assignement:", errorText)
        alert("Erreur lors de la création de l'assignement")
      }
    } catch (error) {
      console.error("Erreur:", error)
      alert("Erreur lors de la création de l'assignement")
    } finally {
      setLoading(false)
    }
  }

  // Fonction pour ouvrir le dialog de suppression
  const handleDeleteClick = (assignment: Assignment) => {
    setAssignmentToDelete(assignment)
    setDeleteReason("")
    setDeleteDialogOpen(true)
  }

  // Fonction pour supprimer un assignement
  const handleDeleteAssignment = async () => {
    if (!assignmentToDelete?.computerId) {
      alert("Erreur: ID de l'ordinateur manquant")
      return
    }

    setDeleteLoading(assignmentToDelete.id)
    try {
      const response = await fetch("/api/glpi/unassign-computer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          computerId: assignmentToDelete.computerId,
          reason: deleteReason,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          alert("Assignement supprimé avec succès!")
          setDeleteDialogOpen(false)
          setAssignmentToDelete(null)
          setDeleteReason("")
          fetchData()
        } else {
          alert(`Erreur: ${result.error}`)
        }
      } else {
        alert("Erreur lors de la suppression de l'assignement")
      }
    } catch (error) {
      console.error("Erreur:", error)
      alert("Erreur lors de la suppression de l'assignement")
    } finally {
      setDeleteLoading(null)
    }
  }

  // Fonction pour ouvrir le dialog d'édition
  const handleEditClick = (assignment: Assignment) => {
    setAssignmentToEdit(assignment)
    setEditAssignment({
      userId: "", // On ne peut pas changer l'utilisateur facilement
      computerId: assignment.computerId?.toString() || "",
      department: assignment.department,
      accessories: assignment.accessories,
      comment: "", // Nouveau commentaire
    })
    setEditDialogOpen(true)
  }

  // Fonction pour sauvegarder les modifications
  const handleUpdateAssignment = async () => {
    if (!assignmentToEdit?.computerId) {
      alert("Erreur: ID de l'ordinateur manquant")
      return
    }

    setLoading(true)
    try {
      console.log("🔄 Mise à jour assignement:", editAssignment)
      const response = await fetch("/api/glpi/assign-computer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: assignmentToEdit.computerId, // Garder le même utilisateur
          computerId: Number.parseInt(editAssignment.computerId),
          department: editAssignment.department,
          accessories: editAssignment.accessories,
          comment: `MODIFICATION: ${editAssignment.comment}`,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          alert("Assignement modifié avec succès!")
          setEditDialogOpen(false)
          setAssignmentToEdit(null)
          setEditAssignment({
            userId: "",
            computerId: "",
            department: "",
            accessories: "",
            comment: "",
          })
          fetchData()
        } else {
          alert(`Erreur: ${result.error}`)
        }
      } else {
        alert("Erreur lors de la modification de l'assignement")
      }
    } catch (error) {
      console.error("Erreur:", error)
      alert("Erreur lors de la modification de l'assignement")
    } finally {
      setLoading(false)
    }
  }

  // Fonction pour sélectionner/désélectionner un assignement
  const toggleAssignmentSelection = (id: number) => {
    setAssignments((prev) =>
      prev.map((assignment) => (assignment.id === id ? { ...assignment, selected: !assignment.selected } : assignment)),
    )
  }

  // Fonction pour sélectionner/désélectionner tous les assignements
  const toggleSelectAll = () => {
    const allSelected = assignments.every((a) => a.selected)
    setAssignments((prev) => prev.map((assignment) => ({ ...assignment, selected: !allSelected })))
  }

  const filteredAssignments = assignments.filter(
    (assignment) =>
      assignment.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.pc.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const availableComputers = computers.filter((comp) => !comp.assignedUser)
  const selectedCount = assignments.filter((a) => a.selected).length

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
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <CheckSquare className="w-8 h-8 text-white" />
            <div>
              <h1 className="text-3xl font-bold text-white">Assignments</h1>
              {selectedCount > 0 && (
                <p className="text-slate-400 text-sm">{selectedCount} assignement(s) sélectionné(s)</p>
              )}
              <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
                <span>👥 Utilisateurs: {users.length}</span>
                <span>💻 Ordinateurs: {computers.length}</span>
                <span>📋 Assignements: {assignments.length}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={loading}
              className="text-white border-slate-600 hover:bg-slate-700 bg-transparent"
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Actualiser
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleDownloadSelected}
              disabled={isDownloading || selectedCount === 0}
            >
              {isDownloading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Download Selected ({selectedCount})
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  New Assignment
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-white">Nouvel Assignement</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {/* Section debug info */}
                  <div className="p-3 bg-slate-700 rounded-lg text-xs">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-slate-300">État des données:</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={fetchUsers}
                        disabled={usersLoading}
                        className="h-6 px-2 text-xs"
                      >
                        {usersLoading ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                    <div className="space-y-1 text-slate-400">
                      <div>👥 Utilisateurs chargés: {users.length}</div>
                      <div>💻 Ordinateurs disponibles: {availableComputers.length}</div>
                      {users.length === 0 && <div className="text-yellow-400">⚠️ Aucun utilisateur trouvé</div>}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="user" className="text-white">
                      Utilisateur
                    </Label>
                    <Select
                      value={newAssignment.userId}
                      onValueChange={(value) => setNewAssignment((prev) => ({ ...prev, userId: value }))}
                    >
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue
                          placeholder={
                            users.length === 0 ? "Aucun utilisateur disponible" : "Sélectionner un utilisateur"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700 border-slate-600">
                        {users.length === 0 ? (
                          <SelectItem value="no-users" disabled className="text-slate-500">
                            Aucun utilisateur trouvé
                          </SelectItem>
                        ) : (
                          users.map((user) => (
                            <SelectItem key={user.id} value={user.id.toString()} className="text-white">
                              {user.firstname && user.realname
                                ? `${user.firstname} ${user.realname}`
                                : user.name || `User ${user.id}`}
                              {user.email && <span className="text-slate-400 text-xs ml-2">({user.email})</span>}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="computer" className="text-white">
                      Ordinateur
                    </Label>
                    <Select
                      value={newAssignment.computerId}
                      onValueChange={(value) => setNewAssignment((prev) => ({ ...prev, computerId: value }))}
                    >
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue
                          placeholder={
                            availableComputers.length === 0
                              ? "Aucun ordinateur disponible"
                              : "Sélectionner un ordinateur"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700 border-slate-600">
                        {availableComputers.length === 0 ? (
                          <SelectItem value="no-computers" disabled className="text-slate-500">
                            Aucun ordinateur disponible
                          </SelectItem>
                        ) : (
                          availableComputers.map((computer) => (
                            <SelectItem key={computer.id} value={computer.id.toString()} className="text-white">
                              {computer.name}
                              {computer.serial && (
                                <span className="text-slate-400 text-xs ml-2">({computer.serial})</span>
                              )}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="accessories" className="text-white">
                      Accessoires
                    </Label>
                    <Input
                      id="accessories"
                      value={newAssignment.accessories}
                      onChange={(e) => setNewAssignment((prev) => ({ ...prev, accessories: e.target.value }))}
                      className="bg-slate-700 border-slate-600 text-white"
                      placeholder="Ex: Clavier, Souris, Écran..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="comment" className="text-white">
                      Commentaire
                    </Label>
                    <Textarea
                      id="comment"
                      value={newAssignment.comment}
                      onChange={(e) => setNewAssignment((prev) => ({ ...prev, comment: e.target.value }))}
                      className="bg-slate-700 border-slate-600 text-white"
                      placeholder="Commentaire optionnel..."
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button
                      onClick={handleCreateAssignment}
                      disabled={loading || users.length === 0 || availableComputers.length === 0}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                      Créer
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      className="flex-1 border-slate-600 text-white hover:bg-slate-700"
                    >
                      Annuler
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Dialog de confirmation de suppression */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-500" />
                Supprimer l'assignement
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-red-900/20 border border-red-700 rounded-lg">
                <p className="text-red-300 text-sm">
                  Êtes-vous sûr de vouloir supprimer l'assignement de <strong>{assignmentToDelete?.pc}</strong> à{" "}
                  <strong>{assignmentToDelete?.user}</strong> ?
                </p>
                <p className="text-red-400 text-xs mt-2">Cette action ne peut pas être annulée.</p>
              </div>
              <div>
                <Label htmlFor="deleteReason" className="text-white">
                  Raison de la suppression (optionnel)
                </Label>
                <Textarea
                  id="deleteReason"
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                  placeholder="Ex: Changement de poste, départ de l'employé..."
                  rows={3}
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleDeleteAssignment}
                  disabled={deleteLoading === assignmentToDelete?.id}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  {deleteLoading === assignmentToDelete?.id ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  Supprimer
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setDeleteDialogOpen(false)}
                  className="flex-1 border-slate-600 text-white hover:bg-slate-700"
                >
                  Annuler
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog d'édition */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Edit className="w-5 h-5 text-blue-500" />
                Modifier l'assignement
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {assignmentToEdit && (
                <div className="p-3 bg-slate-700 rounded-lg text-sm">
                  <div className="text-slate-300 mb-2">Assignement actuel:</div>
                  <div className="space-y-1 text-slate-400">
                    <div>👤 Utilisateur: {assignmentToEdit.user}</div>
                    <div>💻 PC: {assignmentToEdit.pc}</div>
                    <div>🏢 Département: {assignmentToEdit.department}</div>
                  </div>
                </div>
              )}
              <div>
                <Label htmlFor="editDepartment" className="text-white">
                  Nouveau Département
                </Label>
                <Input
                  id="editDepartment"
                  value={editAssignment.department}
                  onChange={(e) => setEditAssignment((prev) => ({ ...prev, department: e.target.value }))}
                  className="bg-slate-700 border-slate-600 text-white"
                  placeholder="Ex: IT, Comptabilité, RH..."
                />
              </div>
              <div>
                <Label htmlFor="editAccessories" className="text-white">
                  Nouveaux Accessoires
                </Label>
                <Input
                  id="editAccessories"
                  value={editAssignment.accessories}
                  onChange={(e) => setEditAssignment((prev) => ({ ...prev, accessories: e.target.value }))}
                  className="bg-slate-700 border-slate-600 text-white"
                  placeholder="Ex: Clavier, Souris, Écran..."
                />
              </div>
              <div>
                <Label htmlFor="editComment" className="text-white">
                  Commentaire de modification
                </Label>
                <Textarea
                  id="editComment"
                  value={editAssignment.comment}
                  onChange={(e) => setEditAssignment((prev) => ({ ...prev, comment: e.target.value }))}
                  className="bg-slate-700 border-slate-600 text-white"
                  placeholder="Raison de la modification..."
                  rows={3}
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleUpdateAssignment}
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Edit className="w-4 h-4 mr-2" />}
                  Sauvegarder
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setEditDialogOpen(false)}
                  className="flex-1 border-slate-600 text-white hover:bg-slate-700"
                >
                  Annuler
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg">
            <p className="text-red-300 text-sm">
              <AlertTriangle className="w-4 h-4 inline mr-2" />
              {error}
            </p>
          </div>
        )}

        {/* Assignments Table */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="bg-slate-700">
            <div className="flex justify-between items-center">
              <CardTitle className="text-white flex items-center gap-2">
                <CheckSquare className="w-5 h-5" />
                Current Assignments ({filteredAssignments.length})
              </CardTitle>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search assignments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-slate-600 border-slate-500 text-white placeholder:text-slate-400 w-64"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Table Header */}
            <div className="grid grid-cols-9 gap-4 p-4 bg-blue-600 text-white text-sm font-medium">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={assignments.length > 0 && assignments.every((a) => a.selected)}
                  onCheckedChange={toggleSelectAll}
                  className="border-white"
                />
              </div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                USER
              </div>
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4" />
                DEPARTMENT
              </div>
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4" />
                PC
              </div>
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                CONFIGURATION
              </div>
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4" />
                ACCESSORIES
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                DATE
              </div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                CREATED BY
              </div>
              <div>ACTIONS</div>
            </div>
            {/* Table Body */}
            <div className="divide-y divide-slate-700">
              {loading ? (
                <div className="p-8 text-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                  Chargement...
                </div>
              ) : filteredAssignments.length === 0 ? (
                <div className="p-8 text-center text-slate-400">Aucune affectation trouvée</div>
              ) : (
                filteredAssignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="grid grid-cols-9 gap-4 p-4 text-slate-300 hover:bg-slate-700 transition-colors"
                  >
                    <div className="flex items-center">
                      <Checkbox
                        checked={assignment.selected || false}
                        onCheckedChange={() => toggleAssignmentSelection(assignment.id)}
                        className="border-slate-400"
                      />
                    </div>
                    <div className="font-medium">{assignment.user}</div>
                    <div>{assignment.department}</div>
                    <div className="font-mono text-sm">{assignment.pc}</div>
                    <div className="text-sm">{assignment.configuration}</div>
                    <div className="text-sm">
                      {assignment.accessories}
                      {assignment.userId ? (
                        <>
                          <br />
                          <div className="mt-1 text-xs">
                            <strong className="text-blue-300">Équipements GLPI:</strong>
                            {assetsLoading ? (
                              <div className="text-blue-300 flex items-center gap-1 mt-1">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Chargement...
                              </div>
                            ) : userAssetsMap[assignment.userId] ? (
                              <div className="mt-1 space-y-1">
                                {Object.entries(userAssetsMap[assignment.userId]).map(([type, items]) => (
                                  <div key={type} className="text-slate-400">
                                    <span className="font-medium text-slate-300">{type}:</span>{" "}
                                    {items.length > 0 ? (
                                      items
                                        .map((item: any) => {
                                          console.log(`🔍 [DEBUG] Item ${type}:`, item)
                                          return (
                                            item.name ||
                                            item.completename ||
                                            item[1] ||
                                            `${type} ${item.id || "unknown"}`
                                          )
                                        })
                                        .join(", ")
                                    ) : (
                                      <span className="text-slate-500">Aucun</span>
                                    )}
                                  </div>
                                ))}
                                {Object.values(userAssetsMap[assignment.userId]).every(
                                  (items) => items.length === 0,
                                ) && <div className="text-slate-500 italic">Aucun équipement trouvé</div>}
                              </div>
                            ) : (
                              <div className="text-yellow-400 mt-1">Pas de données dans userAssetsMap</div>
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <br />
                          <div className="text-xs text-red-400">Pas d'userId pour cet assignment</div>
                        </>
                      )}
                    </div>
                    <div className="text-sm">{new Date(assignment.date).toLocaleDateString()}</div>
                    <div className="text-sm">{assignment.createdBy}</div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-slate-600 text-slate-300 hover:bg-slate-600 bg-transparent px-2"
                        onClick={() => handleEditClick(assignment)}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-600 text-red-400 hover:bg-red-900 bg-transparent px-2"
                        onClick={() => handleDeleteClick(assignment)}
                        disabled={deleteLoading === assignment.id}
                      >
                        {deleteLoading === assignment.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
