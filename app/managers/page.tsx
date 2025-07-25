"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
    Shield,
    Plus,
    CheckCircle,
    LogOut,
    Users,
    Package,
    BarChart3,
    CheckSquare,
    Monitor,
    Search,
    Loader2,
    AlertTriangle,
    RefreshCw,
    XCircle,
    Phone,
    Mail,
    Trash2,
    Edit,
} from "lucide-react"

interface Manager {
    id: number
    name: string
    username: string
    email: string
    department: string
    status: "Active" | "Inactive"
    phone?: string
    phone2?: string
    mobile?: string
    registration_number?: string
    comment?: string
    is_active?: boolean
    valid_from?: string
    valid_until?: string
    firstname?: string
    realname?: string
}

interface Profile {
    id: number
    name: string
}

export default function ManagersPage() {
    const [user, setUser] = useState<any>(null)
    const [managers, setManagers] = useState<Manager[]>([])
    const [profiles, setProfiles] = useState<Profile[]>([])
    const [allProfiles, setAllProfiles] = useState<Profile[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState("")
    const router = useRouter()

    // Dialog states
    const [addUserDialogOpen, setAddUserDialogOpen] = useState(false)
    const [editUserDialogOpen, setEditUserDialogOpen] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

    // Form states
    const [managerToEdit, setManagerToEdit] = useState<Manager | null>(null)
    const [managerToDelete, setManagerToDelete] = useState<Manager | null>(null)
    const [deleteReason, setDeleteReason] = useState("")
    const [deleteLoading, setDeleteLoading] = useState<number | null>(null)
    const [deleteAction, setDeleteAction] = useState<"deactivate" | "delete">("deactivate")
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

    // Edit user form
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
        validFrom: "",
        validUntil: "",
    })

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
            // Récupérer les managers et profils en parallèle
            const [managersResponse, profilesResponse] = await Promise.all([
                fetch(`/api/glpi/managers?t=${new Date().getTime()}`, {
                    method: "GET",
                    headers: {
                        "Cache-Control": "no-cache, no-store, must-revalidate",
                        Pragma: "no-cache",
                        Expires: "0",
                    },
                    cache: "no-store",
                }),
                fetch("/api/glpi/profiles"),
            ])

            if (!managersResponse.ok) {
                const errorText = await managersResponse.text()
                throw new Error(`Erreur HTTP ${managersResponse.status}: ${errorText}`)
            }

            const managersData = await managersResponse.json()
            if (managersData.success) {
                setManagers(managersData.managers || [])
            } else {
                throw new Error(managersData.error || "Erreur lors du chargement des managers")
            }

            // Traitement des profils
            if (profilesResponse.ok) {
                const profilesData = await profilesResponse.json()
                if (profilesData.success && profilesData.profiles) {
                    // Garder tous les profils pour l'édition
                    setAllProfiles(profilesData.profiles)

                    // Filtrer pour ne garder que les profils Super-Admin pour la création
                    const superAdminProfiles = profilesData.profiles.filter(
                        (profile: Profile) =>
                            profile.name.toLowerCase().includes("super-admin") ||
                            profile.name.toLowerCase().includes("super admin") ||
                            profile.name.toLowerCase().includes("superadmin"),
                    )
                    setProfiles(superAdminProfiles)
                }
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Erreur inconnue"
            setError(`Erreur de connexion: ${errorMessage}`)
        } finally {
            setLoading(false)
        }
    }

    const handleLogout = () => {
        localStorage.removeItem("user")
        router.push("/")
    }
    const handleAutoDeactivate = async (manager: Manager) => {
        try {
            setDeleteLoading(manager.id);
            const response = await fetch("/api/glpi/delete-manager", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    managerId: manager.id,
                    reason: "Désactivation automatique lors de l'édition",
                    action: "deactivate",
                }),
            });

            if (!response.ok) throw new Error("Échec de la désactivation");

            const result = await response.json();
            if (!result.success) throw new Error(result.error);

            // Rafraîchir les données après désactivation
            fetchData();
        } catch (error) {
            alert(error instanceof Error ? error.message : "Erreur lors de la désactivation");
        } finally {
            setDeleteLoading(null);
        }
    };
    const handleDeleteClick = (manager: Manager) => {
        setManagerToDelete(manager)
        setDeleteReason("")
        setDeleteAction("deactivate")
        setDeleteDialogOpen(true)
    }

    const handleDeleteManager = async () => {
        if (!managerToDelete?.id) {
            alert("Erreur: ID du manager manquant")
            return
        }

        setDeleteLoading(managerToDelete.id)
        try {
            const response = await fetch("/api/glpi/delete-manager", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    managerId: managerToDelete.id,
                    reason: deleteReason,
                    action: deleteAction,
                }),
            })

            if (!response.ok) {
                const errorText = await response.text()
                throw new Error(errorText)
            }

            const result = await response.json()
            if (!result.success) {
                throw new Error(result.error)
            }

            alert(`Manager ${deleteAction === "delete" ? "supprimé définitivement" : "désactivé"} avec succès!`)
            setDeleteDialogOpen(false)
            setTimeout(fetchData, 500)
        } catch (error) {
            alert(error instanceof Error ? error.message : "Erreur lors de l'action sur le manager")
        } finally {
            setDeleteLoading(null)
        }
    }

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
            const response = await fetch("/api/glpi/create-manager", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(newUser),
            })

            if (!response.ok) {
                const errorText = await response.text()
                throw new Error(errorText)
            }

            const result = await response.json()
            if (!result.success) {
                throw new Error(result.error)
            }

            alert("Manager créé avec succès!")
            setAddUserDialogOpen(false)
            resetNewUserForm()
            fetchData()
        } catch (error) {
            alert(error instanceof Error ? error.message : "Erreur lors de la création du manager")
        } finally {
            setFormLoading(false)
        }
    }

    const handleEditUser = async () => {
        if (!managerToEdit || !editUser.profileId) {
            alert("Veuillez sélectionner un profil")
            return
        }

        setFormLoading(true)
        try {
            const response = await fetch("/api/glpi/edit-manager", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    managerId: managerToEdit.id,
                    profileId: editUser.profileId,
                    comments: editUser.comments,
                }),
            })

            if (!response.ok) {
                const errorText = await response.text()
                throw new Error(errorText)
            }

            const result = await response.json()
            if (!result.success) {
                throw new Error(result.error)
            }

            alert("Profil du manager modifié avec succès!")
            setEditUserDialogOpen(false)
            setManagerToEdit(null)
            resetEditUserForm()
            fetchData()
        } catch (error) {
            alert(error instanceof Error ? error.message : "Erreur lors de la modification du manager")
        } finally {
            setFormLoading(false)
        }
    }

    const resetNewUserForm = () => {
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
    }

    const resetEditUserForm = () => {
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
            validFrom: "",
            validUntil: "",
        })
    }

    const filteredManagers = managers.filter((manager) =>
        [manager.name, manager.username, manager.email, manager.department, manager.phone]
            .filter(Boolean)
            .some((field) => field.toString().toLowerCase().includes(searchTerm.toLowerCase())),
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
                                    className="text-blue-200 hover:bg-blue-700"
                                    onClick={() => router.push("/inventory")}
                                >
                                    <Package className="w-4 h-4 mr-2" />
                                    Inventory
                                </Button>
                                <Button
                                    variant="ghost"
                                    className="text-white hover:bg-blue-700"
                                    onClick={() => router.push("/managers")}
                                >
                                    <Shield className="w-4 h-4 mr-2" />
                                    Managers
                                </Button>
                            </nav>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 text-white">
                                <Shield className="w-4 h-4" />
                                <span className="text-sm font-medium">{user?.username}</span>
                                <Badge className="bg-blue-800 text-blue-100">Admin</Badge>
                            </div>
                            <Button variant="outline" size="sm" onClick={handleLogout} className="border-red-500 bg-transparent">
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
                        <Shield className="w-8 h-8 text-white" />
                        <div>
                            <h1 className="text-3xl font-bold text-white">Managers</h1>
                            <p className="text-slate-400 text-sm">Utilisateurs avec profil Super-Admin</p>
                            <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
                                <span>👥 Managers: {managers.length}</span>
                                <span>🔍 Filtrés: {filteredManagers.length}</span>
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
                        <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setAddUserDialogOpen(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Manager
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

                {/* Search */}
                <div className="mb-6">
                    <div className="relative max-w-md">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                        <Input
                            placeholder="Rechercher un manager..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 bg-slate-800 border-slate-600 text-white placeholder:text-slate-400"
                        />
                    </div>
                </div>

                {/* Managers Table */}
                <Card className="bg-slate-800 border-slate-700">
                    <CardHeader className="bg-slate-700">
                        <CardTitle className="text-white flex items-center gap-2">
                            <Shield className="w-5 h-5" />
                            Super-Admin Managers ({filteredManagers.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {/* Table Header */}
                        <div className="grid grid-cols-8 gap-4 p-4 bg-blue-600 text-white text-sm font-medium">
                            <div className="flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                NAME
                            </div>
                            <div>USERNAME</div>
                            <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4" />
                                EMAIL
                            </div>
                            <div>DEPARTMENT</div>
                            <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4" />
                                PHONE
                            </div>
                            <div>STATUS</div>
                            <div>LAST LOGIN</div>
                            <div>ACTIONS</div>
                        </div>

                        {/* Table Body */}
                        <div className="divide-y divide-slate-700">
                            {loading ? (
                                <div className="p-8 text-center text-slate-400">
                                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                                    Chargement des managers...
                                </div>
                            ) : filteredManagers.length === 0 ? (
                                <div className="p-8 text-center text-slate-400">
                                    {managers.length === 0 ? (
                                        <div>
                                            <Shield className="w-12 h-12 mx-auto mb-4 text-slate-600" />
                                            <p>Aucun manager Super-Admin trouvé</p>
                                            <p className="text-sm text-slate-500 mt-2">
                                                Vérifiez que des utilisateurs ont le profil "Super-Admin" dans GLPI
                                            </p>
                                        </div>
                                    ) : (
                                        <div>
                                            <Search className="w-12 h-12 mx-auto mb-4 text-slate-600" />
                                            <p>Aucun manager trouvé pour "{searchTerm}"</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                filteredManagers.map((manager) => (
                                    <div
                                        key={manager.id}
                                        className="grid grid-cols-8 gap-4 p-4 text-slate-300 hover:bg-slate-700 transition-colors"
                                    >
                                        <div className="font-medium">{manager.name}</div>
                                        <div className="font-mono text-sm">{manager.username}</div>
                                        <div className="text-sm">{manager.email}</div>
                                        <div>{manager.department}</div>
                                        <div className="text-sm">{manager.phone || "N/A"}</div>
                                        <div>
                                            <Badge className={manager.status === "Active" ? "bg-green-600" : "bg-red-600"}>
                                                {manager.status === "Active" ? (
                                                    <CheckCircle className="w-3 h-3 mr-1" />
                                                ) : (
                                                    <XCircle className="w-3 h-3 mr-1" />
                                                )}
                                                {manager.status}
                                            </Badge>
                                        </div>
                                        <div className="text-sm">N/A</div>
                                        <div className="flex flex-col gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="border-slate-600 text-slate-300 hover:bg-slate-600 bg-transparent"
                                                onClick={() => {
                                                    // Désactive d'abord automatiquement
                                                    handleAutoDeactivate(manager);

                                                    // Puis ouvre l'édition
                                                    setManagerToEdit(manager);
                                                    setEditUser({
                                                        username: manager.username || "",
                                                        lastname: manager.realname || manager.name.split(" ")[1] || "",
                                                        firstname: manager.firstname || manager.name.split(" ")[0] || "",
                                                        email: manager.email || "",
                                                        password: "",
                                                        confirmPassword: "",
                                                        phone: manager.phone || "",
                                                        phone2: manager.phone2 || "",
                                                        mobile: manager.mobile || "",
                                                        matricule: manager.registration_number || "",
                                                        comments: manager.comment || "",
                                                        profileId: "",
                                                        isActive: manager.is_active === 1 || manager.is_active === true,
                                                        validFrom: manager.valid_from || "",
                                                        validUntil: manager.valid_until || "",
                                                    });
                                                    setEditUserDialogOpen(true);
                                                }}
                                                disabled={deleteLoading === manager.id}
                                            >
                                                {deleteLoading === manager.id ? (
                                                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                                ) : (
                                                    <Edit className="w-3 h-3 mr-1" />
                                                )}
                                                Edit
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="border-red-600 text-red-400 hover:bg-red-900 bg-transparent"
                                                onClick={() => handleDeleteClick(manager)}
                                                disabled={deleteLoading === manager.id}
                                            >
                                                {deleteLoading === manager.id ? (
                                                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                                ) : (
                                                    <Trash2 className="w-3 h-3 mr-1" />
                                                )}
                                                Delete
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Dialog Ajouter manager */}
                <Dialog
                    open={addUserDialogOpen}
                    onOpenChange={(open) => {
                        if (!open) resetNewUserForm()
                        setAddUserDialogOpen(open)
                    }}
                >
                    <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="text-white flex items-center gap-2">
                                <Plus className="w-5 h-5 text-blue-500" />
                                Nouvel Manager Super-Admin
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
                                        Mot de passe *
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
                                        Confirmer mot de passe *
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
                                    <Label htmlFor="phone2" className="text-white">
                                        Téléphone secondaire
                                    </Label>
                                    <Input
                                        id="phone2"
                                        value={newUser.phone2}
                                        onChange={(e) => setNewUser((prev) => ({ ...prev, phone2: e.target.value }))}
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
                            </div>

                            <div className="grid grid-cols-2 gap-4">
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
                                <div>
                                    <Label htmlFor="profile" className="text-white">
                                        Profil Super-Admin *
                                    </Label>
                                    <div className="text-xs text-slate-400 mb-1">
                                        {profiles.length === 0
                                            ? "⚠️ Aucun profil Super-Admin trouvé"
                                            : `✅ ${profiles.length} profils Super-Admin disponibles`}
                                    </div>
                                    <Select
                                        value={newUser.profileId}
                                        onValueChange={(value) => setNewUser((prev) => ({ ...prev, profileId: value }))}
                                    >
                                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                                            <SelectValue
                                                placeholder={
                                                    profiles.length === 0
                                                        ? "Aucun profil Super-Admin disponible"
                                                        : "Sélectionner le profil Super-Admin"
                                                }
                                            />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-700 border-slate-600">
                                            {profiles.length === 0 ? (
                                                <SelectItem value="no-profiles" disabled className="text-slate-500">
                                                    Aucun profil Super-Admin trouvé
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
                                    Créer le manager
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setAddUserDialogOpen(false)
                                        resetNewUserForm()
                                    }}
                                    className="flex-1 border-slate-600 text-white hover:bg-slate-700"
                                >
                                    Annuler
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Dialog Éditer manager - SEULEMENT LE PROFIL */}
                <Dialog
                    open={editUserDialogOpen}
                    onOpenChange={(open) => {
                        if (!open) {
                            setManagerToEdit(null)
                            resetEditUserForm()
                        }
                        setEditUserDialogOpen(open)
                    }}
                >
                    <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-lg">
                        <DialogHeader>
                            <DialogTitle className="text-white flex items-center gap-2">
                                <Edit className="w-5 h-5 text-blue-500" />
                                Modifier le profil du manager
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            {managerToEdit && (
                                <div className="p-3 bg-slate-700 rounded-lg text-sm">
                                    <div className="text-slate-300 mb-2">Manager sélectionné:</div>
                                    <div className="space-y-1 text-slate-400">
                                        <div>
                                            👤 {managerToEdit.firstname} {managerToEdit.realname}
                                        </div>
                                        <div>🔑 Username: {managerToEdit.username}</div>
                                        <div>📧 Email: {managerToEdit.email || "N/A"}</div>
                                    </div>
                                </div>
                            )}

                            <div>
                                <Label htmlFor="editProfile" className="text-white">
                                    Nouveau profil *
                                </Label>
                                <div className="text-xs text-slate-400 mb-1">Choisissez le nouveau profil pour ce manager</div>
                                <Select
                                    value={editUser.profileId}
                                    onValueChange={(value) => setEditUser((prev) => ({ ...prev, profileId: value }))}
                                >
                                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                                        <SelectValue placeholder="Sélectionner un profil" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-700 border-slate-600">
                                        {allProfiles.map((profile) => (
                                            <SelectItem key={profile.id} value={profile.id.toString()} className="text-white">
                                                {profile.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label htmlFor="editComments" className="text-white">
                                    Raison du changement de profil
                                </Label>
                                <Textarea
                                    id="editComments"
                                    value={editUser.comments}
                                    onChange={(e) => setEditUser((prev) => ({ ...prev, comments: e.target.value }))}
                                    className="bg-slate-700 border-slate-600 text-white"
                                    rows={3}
                                    placeholder="Ex: Changement de rôle, promotion, etc..."
                                />
                            </div>

                            <div className="flex gap-2 pt-4">
                                <Button
                                    onClick={handleEditUser}
                                    disabled={formLoading || !editUser.profileId}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                                >
                                    {formLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Edit className="w-4 h-4 mr-2" />}
                                    Modifier le profil
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setEditUserDialogOpen(false)
                                        setManagerToEdit(null)
                                        resetEditUserForm()
                                    }}
                                    className="flex-1 border-slate-600 text-white hover:bg-slate-700"
                                >
                                    Annuler
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Dialog de confirmation de suppression */}
                <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-lg">
                        <DialogHeader>
                            <DialogTitle className="text-white flex items-center gap-2">
                                <Trash2 className="w-5 h-5 text-red-500" />
                                Action sur le manager
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className="p-4 bg-blue-900/20 border border-blue-700 rounded-lg">
                                <p className="text-blue-300 text-sm">
                                    Manager sélectionné: <strong>{managerToDelete?.name}</strong> ({managerToDelete?.username})
                                </p>
                                <p className="text-blue-400 text-xs mt-2">Choisissez l'action à effectuer sur ce manager.</p>
                            </div>

                            <div className="space-y-3">
                                <Label className="text-white font-medium">Type d'action :</Label>
                                <div className="space-y-2">
                                    <div
                                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${deleteAction === "deactivate"
                                            ? "border-yellow-500 bg-yellow-900/20"
                                            : "border-slate-600 hover:border-slate-500"
                                            }`}
                                        onClick={() => setDeleteAction("deactivate")}
                                    >
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="radio"
                                                name="deleteAction"
                                                value="deactivate"
                                                checked={deleteAction === "deactivate"}
                                                onChange={() => setDeleteAction("deactivate")}
                                                className="text-yellow-500"
                                            />
                                            <div>
                                                <div className="text-yellow-300 font-medium">🔒 Désactiver (Recommandé)</div>
                                                <div className="text-slate-400 text-xs">
                                                    L'utilisateur sera désactivé mais conservé dans GLPI. Plus sûr pour l'intégrité des données.
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div
                                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${deleteAction === "delete"
                                            ? "border-red-500 bg-red-900/20"
                                            : "border-slate-600 hover:border-slate-500"
                                            }`}
                                        onClick={() => setDeleteAction("delete")}
                                    >
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="radio"
                                                name="deleteAction"
                                                value="delete"
                                                checked={deleteAction === "delete"}
                                                onChange={() => setDeleteAction("delete")}
                                                className="text-red-500"
                                            />
                                            <div>
                                                <div className="text-red-300 font-medium">🗑️ Supprimer définitivement</div>
                                                <div className="text-slate-400 text-xs">
                                                    ⚠️ L'utilisateur sera complètement supprimé de GLPI. Action irréversible !
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="deleteReason" className="text-white">
                                    Raison de l'action (optionnel)
                                </Label>
                                <Textarea
                                    id="deleteReason"
                                    value={deleteReason}
                                    onChange={(e) => setDeleteReason(e.target.value)}
                                    className="bg-slate-700 border-slate-600 text-white"
                                    placeholder={
                                        deleteAction === "deactivate"
                                            ? "Ex: Départ temporaire, changement de rôle..."
                                            : "Ex: Départ définitif de l'entreprise..."
                                    }
                                    rows={3}
                                />
                            </div>

                            <div className="flex gap-2 pt-4">
                                <Button
                                    onClick={handleDeleteManager}
                                    disabled={deleteLoading === managerToDelete?.id}
                                    className={`flex-1 ${deleteAction === "deactivate" ? "bg-yellow-600 hover:bg-yellow-700" : "bg-red-600 hover:bg-red-700"
                                        }`}
                                >
                                    {deleteLoading === managerToDelete?.id ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : deleteAction === "deactivate" ? (
                                        <>🔒 Désactiver</>
                                    ) : (
                                        <>
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            Supprimer définitivement
                                        </>
                                    )}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setDeleteDialogOpen(false)
                                        setDeleteAction("deactivate")
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
