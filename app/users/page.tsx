"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Users,
  Plus,
  Search,
  User,
  HardDrive,
  LogOut,
  Shield,
  Package,
  BarChart3,
  CheckSquare,
  Monitor,
  Loader2,
  XCircle,
  Clock,
  Tag,
  Phone,
  Mail,
  Edit,
  Trash2,
  Upload,
  RefreshCw,
  AlertTriangle,
} from "lucide-react"

type GLPIUser = Record<string, any>

interface Profile {
  id: number
  name: string
}

export default function UsersPage() {
  const [user, setUser] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [glpiUsers, setGlpiUsers] = useState<GLPIUser[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set())

  // Dialog states
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false)
  const [editUserDialogOpen, setEditUserDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [csvDialogOpen, setCsvDialogOpen] = useState(false)

  // Form states
  const [userToEdit, setUserToEdit] = useState<GLPIUser | null>(null)
  const [userToDelete, setUserToDelete] = useState<GLPIUser | null>(null)
  const [formLoading, setFormLoading] = useState(false)

  // New user form
  const [newUser, setNewUser] = useState({
    username: "",
    lastname: "",
    firstname: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    phone2: "",
    mobile: "",
    matricule: "",
    comments: "",
    profileId: "",
    isActive: true,
    validFrom: "",
    validUntil: "",
  })

  // Ajouter les états pour l'édition après les autres états de form
  const [editUser, setEditUser] = useState({
    username: "",
    lastname: "",
    firstname: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    phone2: "",
    mobile: "",
    matricule: "",
    comments: "",
    profileId: "",
    isActive: true,
  })

  // CSV import
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvPreview, setCsvPreview] = useState<any[]>([])

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

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      console.log("🔄 Récupération des données utilisateurs et profils...")

      // Récupérer les utilisateurs et profils en parallèle
      const [usersResponse, profilesResponse] = await Promise.all([
        fetch("/api/glpi/users"),
        fetch("/api/glpi/profiles"),
      ])

      console.log("📊 Réponses reçues:")
      console.log("- Users response status:", usersResponse.status)
      console.log("- Profiles response status:", profilesResponse.status)

      if (!usersResponse.ok) {
        let errorMessage = `Failed to fetch GLPI users: ${usersResponse.statusText}`
        try {
          // Cloner la réponse pour pouvoir la lire plusieurs fois si nécessaire
          const responseClone = usersResponse.clone()
          const errorData = await responseClone.json()
          errorMessage = errorData.error || errorMessage
        } catch (jsonError) {
          // Si ce n'est pas du JSON, utiliser le texte brut de la réponse originale
          try {
            const errorText = await usersResponse.text()
            errorMessage = errorText || errorMessage
          } catch (textError) {
            // Garder le message par défaut si tout échoue
            console.error("❌ Impossible de lire la réponse d'erreur:", textError)
          }
        }
        throw new Error(errorMessage)
      }

      const usersData: GLPIUser[] = await usersResponse.json()
      console.log("👥 Utilisateurs récupérés:", usersData.length)
      setGlpiUsers(usersData)

      // Traitement des profils
      if (profilesResponse.ok) {
        const profilesData = await profilesResponse.json()
        console.log("📋 Réponse profils:", profilesData)

        if (profilesData.success && profilesData.profiles) {
          console.log("✅ Profils chargés:", profilesData.profiles.length)
          console.log(
            "📋 Liste des profils:",
            profilesData.profiles.map((p: any) => ({ id: p.id, name: p.name })),
          )
          setProfiles(profilesData.profiles)
        } else {
          console.warn("⚠️ Pas de profils dans la réponse:", profilesData)
          setProfiles([])
        }
      } else {
        const profilesError = await profilesResponse.text()
        console.error("❌ Erreur récupération profils:", profilesResponse.status, profilesError)
        setProfiles([])
      }
    } catch (err) {
      console.error("💥 Error fetching data:", err)
      setError((err as Error).message || "An unknown error occurred.")
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("user")
    router.push("/")
  }

  // Créer un nouvel utilisateur
  const handleCreateUser = async () => {
    if (!newUser.username || !newUser.lastname || !newUser.firstname) {
      alert("Veuillez remplir les champs obligatoires")
      return
    }

    if (newUser.password !== newUser.confirmPassword) {
      alert("Les mots de passe ne correspondent pas")
      return
    }

    setFormLoading(true)
    try {
      const response = await fetch("/api/glpi/users/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newUser),
      })

      const result = await response.json()

      if (result.success) {
        alert("Utilisateur créé avec succès!")
        setAddUserDialogOpen(false)
        setNewUser({
          username: "",
          lastname: "",
          firstname: "",
          email: "",
          password: "",
          confirmPassword: "",
          phone: "",
          phone2: "",
          mobile: "",
          matricule: "",
          comments: "",
          profileId: "",
          isActive: true,
          validFrom: "",
          validUntil: "",
        })
        fetchData()
      } else {
        alert(`Erreur: ${result.error}`)
      }
    } catch (error) {
      console.error("Erreur création utilisateur:", error)
      alert("Erreur lors de la création de l'utilisateur")
    } finally {
      setFormLoading(false)
    }
  }

  // Supprimer un utilisateur
  const handleDeleteUser = async () => {
    if (!userToDelete) return

    setFormLoading(true)
    try {
      const response = await fetch(`/api/glpi/users/${userToDelete.id}`, {
        method: "DELETE",
      })

      const result = await response.json()

      if (response.ok) {
        // ✅ Suppression ou désactivation réussie
        alert(result.message || "Utilisateur supprimé avec succès!")
        setDeleteDialogOpen(false)
        setUserToDelete(null)
        fetchData() // 🔄 recharge la liste
      } else {
        // ❌ Cas où le backend a répondu mais avec un échec
        alert(`Erreur : ${result.error || "Une erreur est survenue."}`)
      }
    } catch (error: any) {
      // ❌ Erreur réseau ou inattendue
      console.error("Erreur suppression utilisateur:", error)
      alert("Erreur lors de la suppression de l'utilisateur")
    } finally {
      setFormLoading(false)
    }
  }


  // Ajouter la fonction handleEditUser après handleDeleteUser
  const handleEditUser = async () => {
    if (!userToEdit || !editUser.username || !editUser.lastname || !editUser.firstname) {
      alert("Veuillez remplir les champs obligatoires")
      return
    }

    if (editUser.password && editUser.password !== editUser.confirmPassword) {
      alert("Les mots de passe ne correspondent pas")
      return
    }

    setFormLoading(true)
    try {
      const response = await fetch(`/api/glpi/users/${userToEdit.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editUser),
      })

      const result = await response.json()

      if (result.success) {
        alert("Utilisateur modifié avec succès!")
        setEditUserDialogOpen(false)
        setUserToEdit(null)
        setEditUser({
          username: "",
          lastname: "",
          firstname: "",
          email: "",
          password: "",
          confirmPassword: "",
          phone: "",
          phone2: "",
          mobile: "",
          matricule: "",
          comments: "",
          profileId: "",
          isActive: true,
        })
        fetchData()
      } else {
        alert(`Erreur: ${result.error}`)
      }
    } catch (error) {
      console.error("Erreur modification utilisateur:", error)
      alert("Erreur lors de la modification de l'utilisateur")
    } finally {
      setFormLoading(false)
    }
  }

  // Import CSV
  const handleCsvImport = async () => {
    if (!csvFile || csvPreview.length === 0) {
      alert("Veuillez sélectionner un fichier CSV valide")
      return
    }

    setFormLoading(true)
    try {
      console.log("📥 Début import CSV avec", csvPreview.length, "utilisateurs")

      const response = await fetch("/api/glpi/users/import-csv", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          users: csvPreview,
        }),
      })

      const result = await response.json()

      if (result.success) {
        alert(
          `Import réussi!\n${result.message}\n\nDétails:\n- Succès: ${result.results.success}\n- Erreurs: ${result.results.errors}`,
        )

        // Afficher les détails des erreurs s'il y en a
        if (result.results.errors > 0) {
          const errorDetails = result.results.details
            .filter((d: any) => !d.success)
            .map((d: any) => `Ligne ${d.line}: ${d.username} - ${d.error}`)
            .join("\n")

          if (errorDetails) {
            console.error("Détails des erreurs d'import:", errorDetails)
            alert(`Erreurs détaillées:\n${errorDetails}`)
          }
        }

        setCsvDialogOpen(false)
        setCsvFile(null)
        setCsvPreview([])
        fetchData() // Recharger la liste des utilisateurs
      } else {
        alert(`Erreur lors de l'import: ${result.error}`)
      }
    } catch (error) {
      console.error("Erreur import CSV:", error)
      alert("Erreur lors de l'import du fichier CSV")
    } finally {
      setFormLoading(false)
    }
  }

  // Gérer la sélection des utilisateurs
  const toggleUserSelection = (userId: number) => {
    const newSelected = new Set(selectedUsers)
    if (newSelected.has(userId)) {
      newSelected.delete(userId)
    } else {
      newSelected.add(userId)
    }
    setSelectedUsers(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set())
    } else {
      setSelectedUsers(new Set(filteredUsers.map((u) => u.id)))
    }
  }

  // Traitement CSV - Modifier la fonction handleCsvUpload
  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setCsvFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string
        const lines = text.split("\n").filter((line) => line.trim()) // Filtrer les lignes vides

        if (lines.length < 2) {
          alert("Le fichier CSV doit contenir au moins une ligne d'en-têtes et une ligne de données")
          return
        }

        const headers = lines[0].split(",").map((h) => h.trim())
        console.log("📋 Headers CSV détectés:", headers)

        // Traiter TOUTES les lignes de données (pas seulement les 5 premières)
        const allData = lines
          .slice(1)
          .map((line, index) => {
            const values = line.split(",")
            const obj: any = {}
            headers.forEach((header, headerIndex) => {
              obj[header] = values[headerIndex]?.trim() || ""
            })
            return obj
          })
          .filter((obj) => obj.username) // Filtrer les lignes sans username

        console.log(`📊 ${allData.length} utilisateurs détectés dans le CSV`)
        setCsvPreview(allData) // Stocker TOUTES les données, pas seulement un aperçu
      }
      reader.readAsText(file)
    }
  }

  const filteredUsers = glpiUsers.filter((user) =>
    [
      user.name,
      `${user.firstname || ""} ${user.realname || ""}`,
      user.email,
      user.phone,
      user.department,
      user.last_login,
      user.registration_number,
    ]
      .filter(Boolean)
      .some((field) => String(field).toLowerCase().includes(searchTerm.toLowerCase())),
  )

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
                  className="text-white hover:bg-blue-700 border border-red-500"
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
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-white" />
            <div>
              <h1 className="text-3xl font-bold text-white">Users</h1>
              <p className="text-slate-400 text-sm">
                {glpiUsers.length} utilisateurs • {selectedUsers.size} sélectionnés
              </p>
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
            <Button className="bg-green-600 hover:bg-green-700" onClick={() => setCsvDialogOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Import CSV
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setAddUserDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg">
            <p className="text-red-300 text-sm">
              <AlertTriangle className="w-4 h-4 inline mr-2" />
              {error}
            </p>
          </div>
        )}

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="bg-slate-700">
            <div className="flex justify-between items-center">
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="w-5 h-5" />
                User Directory ({filteredUsers.length})
              </CardTitle>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search users..."
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
                  checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                  onCheckedChange={toggleSelectAll}
                  className="border-white"
                />
              </div>
              <div>IDENTIFIANT</div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" /> NOM COMPLET
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" /> EMAIL
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4" /> PHONE
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" /> LAST LOGIN
              </div>
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4" /> MATRICULE
              </div>
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4" /> DEPARTMENT
              </div>
              <div>ACTIONS</div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-slate-700">
              {loading ? (
                <div className="p-8 text-center text-slate-300 flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" /> Loading users...
                </div>
              ) : error ? (
                <div className="p-8 text-center text-red-400 flex items-center justify-center gap-2">
                  <XCircle className="w-5 h-5" /> Error: {error}
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="text-blue-400 mb-2">ℹ️ No users found.</div>
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="grid grid-cols-9 gap-4 p-4 text-slate-300 hover:bg-slate-700 transition-colors"
                  >
                    <div className="flex items-center">
                      <Checkbox
                        checked={selectedUsers.has(user.id)}
                        onCheckedChange={() => toggleUserSelection(user.id)}
                        className="border-slate-400"
                      />
                    </div>
                    <div className="font-medium">{user.name}</div>
                    <div className="text-sm">{`${user.firstname || ""} ${user.realname || ""}`}</div>
                    <div className="text-sm">{user.email || "N/A"}</div>
                    <div className="text-sm">{user.phone || "N/A"}</div>
                    <div className="text-sm">{user.last_login || "N/A"}</div>
                    <div className="text-sm">{user.registration_number || "N/A"}</div>
                    <div className="text-sm">
                      {user.department} {user.groups_id && ` ${user.groups_id}`}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-slate-600 text-slate-300 hover:bg-slate-600 bg-transparent"
                        onClick={() => {
                          setUserToEdit(user)
                          setEditUser({
                            username: user.name || "",
                            lastname: user.realname || "",
                            firstname: user.firstname || "",
                            email: user.email || "",
                            password: "",
                            confirmPassword: "",
                            phone: user.phone || "",
                            phone2: user.phone2 || "",
                            mobile: user.mobile || "",
                            matricule: user.registration_number || "",
                            comments: user.comment || "",
                            profileId: "",
                            isActive: user.is_active === 1 || user.is_active === true,
                          })
                          setEditUserDialogOpen(true)
                        }}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-600 text-red-400 hover:bg-red-900 bg-transparent"
                        onClick={() => {
                          setUserToDelete(user)
                          setDeleteDialogOpen(true)
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Dialog Ajouter Utilisateur */}
        <Dialog open={addUserDialogOpen} onOpenChange={setAddUserDialogOpen}>
          <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-500" />
                Nouvel Utilisateur
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="username" className="text-white">
                    Identifiant *
                  </Label>
                  <Input
                    id="username"
                    value={newUser.username}
                    onChange={(e) => setNewUser((prev) => ({ ...prev, username: e.target.value }))}
                    className="bg-slate-700 border-slate-600 text-white"
                    placeholder="nom.utilisateur"
                  />
                </div>
                <div>
                  <Label htmlFor="email" className="text-white">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser((prev) => ({ ...prev, email: e.target.value }))}
                    className="bg-slate-700 border-slate-600 text-white"
                    placeholder="utilisateur@exemple.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="lastname" className="text-white">
                    Nom de famille *
                  </Label>
                  <Input
                    id="lastname"
                    value={newUser.lastname}
                    onChange={(e) => setNewUser((prev) => ({ ...prev, lastname: e.target.value }))}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="firstname" className="text-white">
                    Prénom *
                  </Label>
                  <Input
                    id="firstname"
                    value={newUser.firstname}
                    onChange={(e) => setNewUser((prev) => ({ ...prev, firstname: e.target.value }))}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="password" className="text-white">
                    Mot de passe
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser((prev) => ({ ...prev, password: e.target.value }))}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="confirmPassword" className="text-white">
                    Confirmer mot de passe
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={newUser.confirmPassword}
                    onChange={(e) => setNewUser((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="phone" className="text-white">
                    Téléphone
                  </Label>
                  <Input
                    id="phone"
                    value={newUser.phone}
                    onChange={(e) => setNewUser((prev) => ({ ...prev, phone: e.target.value }))}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="mobile" className="text-white">
                    Mobile
                  </Label>
                  <Input
                    id="mobile"
                    value={newUser.mobile}
                    onChange={(e) => setNewUser((prev) => ({ ...prev, mobile: e.target.value }))}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="matricule" className="text-white">
                    Matricule
                  </Label>
                  <Input
                    id="matricule"
                    value={newUser.matricule}
                    onChange={(e) => setNewUser((prev) => ({ ...prev, matricule: e.target.value }))}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="profile" className="text-white">
                  Profil
                </Label>
                {/* Debug info */}
                <div className="text-xs text-slate-400 mb-1">
                  {profiles.length === 0 ? "⚠️ Aucun profil chargé" : `✅ ${profiles.length} profils disponibles`}
                </div>
                <Select
                  value={newUser.profileId}
                  onValueChange={(value) => setNewUser((prev) => ({ ...prev, profileId: value }))}
                >
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue
                      placeholder={profiles.length === 0 ? "Aucun profil disponible" : "Sélectionner un profil"}
                    />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    {profiles.length === 0 ? (
                      <SelectItem value="no-profiles" disabled className="text-slate-500">
                        Aucun profil trouvé
                      </SelectItem>
                    ) : (
                      profiles.map((profile) => (
                        <SelectItem key={profile.id} value={profile.id.toString()} className="text-white">
                          {profile.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isActive"
                  checked={newUser.isActive}
                  onCheckedChange={(checked) => setNewUser((prev) => ({ ...prev, isActive: !!checked }))}
                />
                <Label htmlFor="isActive" className="text-white">
                  Utilisateur actif
                </Label>
              </div>

              <div>
                <Label htmlFor="comments" className="text-white">
                  Commentaires
                </Label>
                <Textarea
                  id="comments"
                  value={newUser.comments}
                  onChange={(e) => setNewUser((prev) => ({ ...prev, comments: e.target.value }))}
                  className="bg-slate-700 border-slate-600 text-white"
                  rows={3}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleCreateUser}
                  disabled={formLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {formLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                  Créer l'utilisateur
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setAddUserDialogOpen(false)}
                  className="flex-1 border-slate-600 text-white hover:bg-slate-700"
                >
                  Annuler
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog Supprimer Utilisateur */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-500" />
                Supprimer l'utilisateur
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-red-900/20 border border-red-700 rounded-lg">
                <p className="text-red-300 text-sm">
                  Êtes-vous sûr de vouloir supprimer l'utilisateur{" "}
                  <strong>
                    {userToDelete?.firstname} {userToDelete?.realname}
                  </strong>{" "}
                  ({userToDelete?.name}) ?
                </p>
                <p className="text-red-400 text-xs mt-2">Cette action ne peut pas être annulée.</p>
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleDeleteUser}
                  disabled={formLoading}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  {formLoading ? (
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

        {/* Dialog Éditer Utilisateur */}
        <Dialog open={editUserDialogOpen} onOpenChange={setEditUserDialogOpen}>
          <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Edit className="w-5 h-5 text-blue-500" />
                Modifier l'utilisateur
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {userToEdit && (
                <div className="p-3 bg-slate-700 rounded-lg text-sm">
                  <div className="text-slate-300 mb-2">Utilisateur actuel:</div>
                  <div className="space-y-1 text-slate-400">
                    <div>👤 ID: {userToEdit.id}</div>
                    <div>📧 Email actuel: {userToEdit.email || "N/A"}</div>
                    <div>📱 Téléphone actuel: {userToEdit.phone || "N/A"}</div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editUsername" className="text-white">
                    Identifiant *
                  </Label>
                  <Input
                    id="editUsername"
                    value={editUser.username}
                    onChange={(e) => setEditUser((prev) => ({ ...prev, username: e.target.value }))}
                    className="bg-slate-700 border-slate-600 text-white"
                    placeholder="nom.utilisateur"
                  />
                </div>
                <div>
                  <Label htmlFor="editEmail" className="text-white">
                    Email
                  </Label>
                  <Input
                    id="editEmail"
                    type="email"
                    value={editUser.email}
                    onChange={(e) => setEditUser((prev) => ({ ...prev, email: e.target.value }))}
                    className="bg-slate-700 border-slate-600 text-white"
                    placeholder="utilisateur@exemple.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editLastname" className="text-white">
                    Nom de famille *
                  </Label>
                  <Input
                    id="editLastname"
                    value={editUser.lastname}
                    onChange={(e) => setEditUser((prev) => ({ ...prev, lastname: e.target.value }))}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="editFirstname" className="text-white">
                    Prénom *
                  </Label>
                  <Input
                    id="editFirstname"
                    value={editUser.firstname}
                    onChange={(e) => setEditUser((prev) => ({ ...prev, firstname: e.target.value }))}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editPassword" className="text-white">
                    Nouveau mot de passe (optionnel)
                  </Label>
                  <Input
                    id="editPassword"
                    type="password"
                    value={editUser.password}
                    onChange={(e) => setEditUser((prev) => ({ ...prev, password: e.target.value }))}
                    className="bg-slate-700 border-slate-600 text-white"
                    placeholder="Laisser vide pour ne pas changer"
                  />
                </div>
                <div>
                  <Label htmlFor="editConfirmPassword" className="text-white">
                    Confirmer nouveau mot de passe
                  </Label>
                  <Input
                    id="editConfirmPassword"
                    type="password"
                    value={editUser.confirmPassword}
                    onChange={(e) => setEditUser((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="editPhone" className="text-white">
                    Téléphone
                  </Label>
                  <Input
                    id="editPhone"
                    value={editUser.phone}
                    onChange={(e) => setEditUser((prev) => ({ ...prev, phone: e.target.value }))}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="editMobile" className="text-white">
                    Mobile
                  </Label>
                  <Input
                    id="editMobile"
                    value={editUser.mobile}
                    onChange={(e) => setEditUser((prev) => ({ ...prev, mobile: e.target.value }))}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="editMatricule" className="text-white">
                    Matricule
                  </Label>
                  <Input
                    id="editMatricule"
                    value={editUser.matricule}
                    onChange={(e) => setEditUser((prev) => ({ ...prev, matricule: e.target.value }))}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="editProfile" className="text-white">
                  Profil
                </Label>
                <Select
                  value={editUser.profileId}
                  onValueChange={(value) => setEditUser((prev) => ({ ...prev, profileId: value }))}
                >
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="Sélectionner un profil" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    {profiles.map((profile) => (
                      <SelectItem key={profile.id} value={profile.id.toString()} className="text-white">
                        {profile.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="editIsActive"
                  checked={editUser.isActive}
                  onCheckedChange={(checked) => setEditUser((prev) => ({ ...prev, isActive: !!checked }))}
                />
                <Label htmlFor="editIsActive" className="text-white">
                  Utilisateur actif
                </Label>
              </div>

              <div>
                <Label htmlFor="editComments" className="text-white">
                  Commentaires
                </Label>
                <Textarea
                  id="editComments"
                  value={editUser.comments}
                  onChange={(e) => setEditUser((prev) => ({ ...prev, comments: e.target.value }))}
                  className="bg-slate-700 border-slate-600 text-white"
                  rows={3}
                  placeholder="Commentaires sur les modifications..."
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleEditUser}
                  disabled={formLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {formLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Edit className="w-4 h-4 mr-2" />}
                  Sauvegarder les modifications
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditUserDialogOpen(false)
                    setUserToEdit(null)
                    setEditUser({
                      username: "",
                      lastname: "",
                      firstname: "",
                      email: "",
                      password: "",
                      confirmPassword: "",
                      phone: "",
                      phone2: "",
                      mobile: "",
                      matricule: "",
                      comments: "",
                      profileId: "",
                      isActive: true,
                    })
                  }}
                  className="flex-1 border-slate-600 text-white hover:bg-slate-700"
                >
                  Annuler
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog Import CSV */}
        <Dialog open={csvDialogOpen} onOpenChange={setCsvDialogOpen}>
          <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Upload className="w-5 h-5 text-green-500" />
                Import d'utilisateurs depuis CSV
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="csvFile" className="text-white">
                  Fichier CSV
                </Label>
                <Input
                  id="csvFile"
                  type="file"
                  accept=".csv"
                  onChange={handleCsvUpload}
                  className="bg-slate-700 border-slate-600 text-white"
                />
                <p className="text-slate-400 text-xs mt-1">
                  Format attendu: username,lastname,firstname,email,phone,matricule
                </p>
              </div>

              {csvPreview.length > 0 && (
                <div>
                  <Label className="text-white">Aperçu (5 premières lignes)</Label>
                  <div className="bg-slate-700 rounded-lg p-4 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-600">
                          {Object.keys(csvPreview[0]).map((header) => (
                            <th key={header} className="text-left p-2 text-slate-300">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {csvPreview.map((row, index) => (
                          <tr key={index} className="border-b border-slate-600">
                            {Object.values(row).map((value: any, i) => (
                              <td key={i} className="p-2 text-slate-400">
                                {value}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleCsvImport}
                  disabled={!csvFile || formLoading || csvPreview.length === 0}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {formLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  Importer les utilisateurs ({csvPreview.length})
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setCsvDialogOpen(false)
                    setCsvFile(null)
                    setCsvPreview([])
                  }}
                  className="flex-1 border-slate-600 text-white hover:bg-slate-700"
                >
                  Annuler
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
