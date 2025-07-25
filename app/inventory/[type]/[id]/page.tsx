"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
    ArrowLeft,
    Package,
    User,
    AlertTriangle,
    ExternalLink,
    Hash,
    Tag,
    Building,
    Clock,
    RefreshCw,
    Info,
    Monitor,
    Laptop,
    PrinterIcon as Print,
    Wifi,
    Phone,
    MapPin,
    Download,
    QrCode,
    History,
    Settings,
    Zap,
    Activity,
    Wrench,
    CheckCircle,
    XCircle,
    Network,
    Server,
    Star,
    Copy,
} from "lucide-react"
import { Printer } from "lucide-react"

interface InventoryItem {
    id: number
    name: string
    type?: string
    itemtype?: string
    users_id?: number
    users_id_name?: string
    locations_id?: number
    locations_id_name?: string
    [key: string]: any
}

interface Status {
    id: number
    name: string
    [key: string]: any
}

interface UserDetails {
    id: number
    name: string
    realname?: string
    firstname?: string
    phone?: string
    email?: string
    [key: string]: any
}

interface LocationDetails {
    id: number
    name: string
    completename?: string
    address?: string
    building?: string
    room?: string
    town?: string
    country?: string
    [key: string]: any
}

interface StatusDetails {
    id: number
    name: string
    [key: string]: any
}

interface ManufacturerDetails {
    id: number
    name: string
    [key: string]: any
}

interface ModelDetails {
    id: number
    name: string
    [key: string]: any
}

export default function InventoryDetailPage() {
    const [item, setItem] = useState<InventoryItem | null>(null)
    const [userDetails, setUserDetails] = useState<UserDetails | null>(null)
    const [locationDetails, setLocationDetails] = useState<LocationDetails | null>(null)
    const [statuses, setStatuses] = useState<Status[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState("overview")
    const [isFavorite, setIsFavorite] = useState(false)
    const [qrCodeUrl, setQrCodeUrl] = useState<string>("")
    const [showQrDialog, setShowQrDialog] = useState(false)
    const printRef = useRef<HTMLDivElement>(null)
    const [statusDetails, setStatusDetails] = useState<StatusDetails | null>(null)
    const [manufacturerDetails, setManufacturerDetails] = useState<ManufacturerDetails | null>(null)
    const [modelDetails, setModelDetails] = useState<ModelDetails | null>(null)
    const [debugMode, setDebugMode] = useState(false)
    const [debugData, setDebugData] = useState<any>(null)
    const [rawApiData, setRawApiData] = useState<any>(null)
    const [showRawData, setShowRawData] = useState(false)

    const router = useRouter()
    const params = useParams()
    const searchParams = useSearchParams()

    useEffect(() => {
        if (params.id) {
            Promise.all([fetchItemDetails(), fetchStatuses()])
        }
    }, [params.id])

    const fetchItemDetails = async () => {
        try {
            setLoading(true)
            setError(null)
            const itemType = searchParams.get("type") || "Computer"
            console.log(`🔍 Récupération des détails pour ${itemType} ${params.id} depuis GLPI...`)

            const response = await fetch(`/api/inventory/${params.id}?type=${itemType}`)
            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || `Erreur HTTP: ${response.status}`)
            }

            const data = await response.json()
            console.log("📊 Détails de l'équipement reçus:", data)

            // Stocker les données brutes pour debug
            setRawApiData(data)

            // Stocker les données de debug
            setDebugData(data.debugInfo || null)

            if (data.success && data.item) {
                setItem(data.item)
                setUserDetails(data.userDetails || null)
                setLocationDetails(data.locationDetails || null)
                setStatusDetails(data.statusDetails || null)
                setManufacturerDetails(data.manufacturerDetails || null)
                setModelDetails(data.modelDetails || null)

                console.log("📊 Item reçu:", data.item)
                console.log("👤 User details:", data.userDetails)
                console.log("📍 Location details:", data.locationDetails)
                console.log("📊 Status details:", data.statusDetails)
                console.log("🏭 Manufacturer details:", data.manufacturerDetails)
                console.log("💻 Model details:", data.modelDetails)

                // Générer le QR code
                generateQRCode(data.item)

                console.log("✅ Détails chargés avec succès")
            } else {
                throw new Error(data.error || "Erreur lors de la récupération des détails")
            }
        } catch (error) {
            console.error("❌ Erreur lors du chargement des détails:", error)
            setError(error instanceof Error ? error.message : "Erreur inconnue")
        } finally {
            setLoading(false)
        }
    }

    const fetchStatuses = async () => {
        try {
            console.log("🔍 Récupération des statuts depuis GLPI...")
            const response = await fetch("/api/statuses")
            if (response.ok) {
                const data = await response.json()
                if (data.statuses && Array.isArray(data.statuses)) {
                    setStatuses(data.statuses)
                    console.log("✅ Statuts chargés depuis GLPI")
                }
            }
        } catch (error) {
            console.error("❌ Erreur lors du chargement des statuts:", error)
        }
    }

    const generateQRCode = (itemData: InventoryItem) => {
        const qrData = {
            id: itemData.id,
            name: itemData.name,
            type: itemData.itemtype || itemData.type,
            serial: itemData.serial,
            url: `${window.location.origin}/inventory/${itemData.id}?type=${itemData.itemtype || itemData.type}`,
        }

        const qrString = JSON.stringify(qrData)
        const encodedData = encodeURIComponent(qrString)
        setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodedData}`)
    }

    const handlePrint = () => {
        const printContent = printRef.current
        if (!printContent) return

        const printWindow = window.open("", "_blank")
        if (!printWindow) return

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Fiche Équipement - ${item?.name || "N/A"}</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        margin: 20px;
                        color: #333;
                    }
                    .header {
                        text-align: center;
                        border-bottom: 2px solid #333;
                        padding-bottom: 20px;
                        margin-bottom: 30px;
                    }
                    .header h1 {
                        margin: 0;
                        font-size: 24px;
                    }
                    .header p {
                        margin: 5px 0;
                        color: #666;
                    }
                    .section {
                        margin-bottom: 25px;
                    }
                    .section h2 {
                        background: #f5f5f5;
                        padding: 10px;
                        margin: 0 0 15px 0;
                        border-left: 4px solid #007bff;
                    }
                    .info-grid {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 15px;
                    }
                    .info-item {
                        display: flex;
                        justify-content: space-between;
                        padding: 8px 0;
                        border-bottom: 1px solid #eee;
                    }
                    .info-label {
                        font-weight: bold;
                        color: #555;
                    }
                    .info-value {
                        color: #333;
                    }
                    .qr-section {
                        text-align: center;
                        margin-top: 30px;
                        page-break-inside: avoid;
                    }
                    .footer {
                        margin-top: 40px;
                        text-align: center;
                        font-size: 12px;
                        color: #666;
                        border-top: 1px solid #eee;
                        padding-top: 20px;
                    }
                    @media print {
                        body { margin: 0; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>${item?.name || "Équipement"}</h1>
                    <p>ID: ${item?.id} | Type: ${item?.itemtype || item?.type || "N/A"}</p>
                    <p>Généré le ${new Date().toLocaleDateString("fr-FR")} à ${new Date().toLocaleTimeString("fr-FR")}</p>
                </div>

                <div class="section">
                    <h2>Informations générales</h2>
                    <div class="info-grid">
                        <div class="info-item">
                            <span class="info-label">Nom:</span>
                            <span class="info-value">${item?.name || "N/A"}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Numéro de série:</span>
                            <span class="info-value">${item?.serial || "N/A"}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Marque:</span>
                            <span class="info-value">${item?.manufacturers_id_name || "N/A"}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Modèle:</span>
                            <span class="info-value">${item?.computermodels_id_name || "N/A"}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Statut:</span>
                            <span class="info-value">${item?.states_id_name || "N/A"}</span>
                        </div>
                    </div>
                </div>

                ${userDetails
                ? `
                <div class="section">
                    <h2>Utilisateur assigné</h2>
                    <div class="info-grid">
                        <div class="info-item">
                            <span class="info-label">Nom complet:</span>
                            <span class="info-value">${userDetails.firstname && userDetails.realname ? `${userDetails.firstname} ${userDetails.realname}` : userDetails.name || "N/A"}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Nom d'utilisateur:</span>
                            <span class="info-value">${userDetails.name || "N/A"}</span>
                        </div>
                        ${userDetails.email
                    ? `
                        <div class="info-item">
                            <span class="info-label">Email:</span>
                            <span class="info-value">${userDetails.email}</span>
                        </div>
                        `
                    : ""
                }
                        ${userDetails.phone
                    ? `
                        <div class="info-item">
                            <span class="info-label">Téléphone:</span>
                            <span class="info-value">${userDetails.phone}</span>
                        </div>
                        `
                    : ""
                }
                    </div>
                </div>
                `
                : ""
            }

                ${locationDetails
                ? `
                <div class="section">
                    <h2>Emplacement</h2>
                    <div class="info-grid">
                        <div class="info-item">
                            <span class="info-label">Nom:</span>
                            <span class="info-value">${locationDetails.name || "N/A"}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Emplacement complet:</span>
                            <span class="info-value">${locationDetails.completename || "N/A"}</span>
                        </div>
                        ${locationDetails.building
                    ? `
                        <div class="info-item">
                            <span class="info-label">Bâtiment:</span>
                            <span class="info-value">${locationDetails.building}</span>
                        </div>
                        `
                    : ""
                }
                        ${locationDetails.room
                    ? `
                        <div class="info-item">
                            <span class="info-label">Salle:</span>
                            <span class="info-value">${locationDetails.room}</span>
                        </div>
                        `
                    : ""
                }
                        ${locationDetails.address
                    ? `
                        <div class="info-item">
                            <span class="info-label">Adresse:</span>
                            <span class="info-value">${locationDetails.address}</span>
                        </div>
                        `
                    : ""
                }
                    </div>
                </div>
                `
                : ""
            }

                ${qrCodeUrl
                ? `
                <div class="qr-section">
                    <h2>QR Code</h2>
                    <img src="${qrCodeUrl}" alt="QR Code" style="max-width: 200px; height: auto;" />
                    <p style="font-size: 12px; margin-top: 10px;">Scannez ce code pour accéder aux détails de l'équipement</p>
                </div>
                `
                : ""
            }

                <div class="footer">
                    <p>Document généré automatiquement depuis l'application d'inventaire GLPI</p>
                    <p>Date d'impression: ${new Date().toLocaleDateString("fr-FR")} ${new Date().toLocaleTimeString("fr-FR")}</p>
                </div>
            </body>
            </html>
        `)

        printWindow.document.close()
        printWindow.focus()

        setTimeout(() => {
            printWindow.print()
            printWindow.close()
        }, 250)
    }

    const getTypeIcon = (type?: string) => {
        if (!type) return <Package className="w-6 h-6" />
        const typeLower = type.toLowerCase()
        if (typeLower.includes("computer")) return <Laptop className="w-6 h-6" />
        if (typeLower.includes("monitor")) return <Monitor className="w-6 h-6" />
        if (typeLower.includes("printer")) return <Printer className="w-6 h-6" />
        if (typeLower.includes("network")) return <Wifi className="w-6 h-6" />
        if (typeLower.includes("phone")) return <Phone className="w-6 h-6" />
        if (typeLower.includes("server")) return <Server className="w-6 h-6" />
        return <Package className="w-6 h-6" />
    }

    const getStatusInfo = (statesId?: number, statusName?: string) => {
        if (statesId && statuses.length > 0) {
            const status = statuses.find((s) => s.id === statesId)
            return status || { id: statesId, name: statusName || "Inconnu" }
        }
        return { id: 0, name: statusName || "Inconnu" }
    }

    const getStatusBadge = (statesId?: number, statusName?: string) => {
        const statusInfo = statusDetails || getStatusInfo(statesId, statusName)
        const statusLower = (statusInfo.name || statusName || "").toLowerCase()

        if (statusLower.includes("affecté") && !statusLower.includes("non")) {
            return (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    {statusInfo.name || statusName || "Affecté"}
                </Badge>
            )
        }
        if (statusLower.includes("non affecté") || statusLower.includes("stock")) {
            return (
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30">
                    <Package className="w-3 h-3 mr-1" />
                    {statusInfo.name || statusName || "Non affecté"}
                </Badge>
            )
        }
        if (statusLower.includes("maintenance")) {
            return (
                <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/30">
                    <Wrench className="w-3 h-3 mr-1" />
                    {statusInfo.name || statusName || "Maintenance"}
                </Badge>
            )
        }
        if (statusLower.includes("hors service")) {
            return (
                <Badge className="bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30">
                    <XCircle className="w-3 h-3 mr-1" />
                    {statusInfo.name || statusName || "Hors service"}
                </Badge>
            )
        }
        return (
            <Badge variant="outline" className="border-slate-600 text-slate-300">
                <Info className="w-3 h-3 mr-1" />
                {statusInfo.name || statusName || "Inconnu"}
            </Badge>
        )
    }

    const formatDate = (dateString: string) => {
        if (!dateString) return "N/A"
        return new Date(dateString).toLocaleDateString("fr-FR", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        })
    }

    const getRelativeTime = (dateString: string) => {
        if (!dateString) return "N/A"
        const date = new Date(dateString)
        const now = new Date()
        const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

        if (diffInDays === 0) return "Aujourd'hui"
        if (diffInDays === 1) return "Hier"
        if (diffInDays < 7) return `Il y a ${diffInDays} jours`
        if (diffInDays < 30) return `Il y a ${Math.floor(diffInDays / 7)} semaines`
        if (diffInDays < 365) return `Il y a ${Math.floor(diffInDays / 30)} mois`
        return `Il y a ${Math.floor(diffInDays / 365)} ans`
    }

    const openInGLPI = () => {
        if (!item) return
        const glpiUrl = process.env.NEXT_PUBLIC_GLPI_URL?.replace("/apirest.php/", "")
        const itemType = (item.itemtype || item.type || "Computer").toLowerCase()
        window.open(`${glpiUrl}/front/${itemType}.form.php?id=${item.id}`, "_blank")
    }

    const handleRefresh = () => {
        fetchItemDetails()
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
    }

    const exportData = () => {
        if (!item) return
        const dataStr = JSON.stringify(item, null, 2)
        const dataBlob = new Blob([dataStr], { type: "application/json" })
        const url = URL.createObjectURL(dataBlob)
        const link = document.createElement("a")
        link.href = url
        link.download = `equipment_${item.id}_${item.name}.json`
        link.click()
    }

    const getFieldsByCategory = () => {
        if (!item) return { basic: [], technical: [], network: [], dates: [], ids: [], custom: [] }

        const basic = []
        const technical = []
        const network = []
        const dates = []
        const ids = []
        const custom = []

        Object.entries(item).forEach(([key, value]) => {
            if (value === null || value === undefined || value === "") return

            if (["name", "serial", "otherserial", "comment", "contact", "contact_num"].includes(key)) {
                basic.push({ key, value, label: getFieldLabel(key) })
            } else if (key.endsWith("_name") && !key.includes("date") && !key.includes("network")) {
                basic.push({ key, value, label: getFieldLabel(key) })
            } else if (
                [
                    "model",
                    "brand",
                    "condition",
                    "locations_id",
                    "manufacturers_id",
                    "computermodels_id",
                    "states_id",
                    "ram",
                    "cpu",
                    "storage",
                    "gpu",
                ].includes(key)
            ) {
                technical.push({ key, value, label: getFieldLabel(key) })
            } else if (key.includes("network") || key.includes("ip") || key.includes("mac")) {
                network.push({ key, value, label: getFieldLabel(key) })
            } else if (key.includes("date")) {
                dates.push({ key, value, label: getFieldLabel(key) })
            } else if (key.includes("_id") || key === "id" || key === "type" || key === "itemtype") {
                ids.push({ key, value, label: getFieldLabel(key) })
            } else {
                custom.push({ key, value, label: getFieldLabel(key) })
            }
        })

        return { basic, technical, network, dates, ids, custom }
    }

    const getFieldLabel = (key: string): string => {
        const labels: { [key: string]: string } = {
            name: "Nom",
            serial: "Numéro de série",
            otherserial: "Autre série",
            comment: "Commentaires",
            contact: "Contact",
            contact_num: "Téléphone",
            date_creation: "Date de création",
            date_mod: "Dernière modification",
            manufacturers_id_name: "Marque",
            computermodels_id_name: "Modèle",
            locations_id_name: "Emplacement",
            states_id_name: "Statut",
            users_id_name: "Utilisateur assigné",
            id: "ID GLPI",
            type: "Type",
            itemtype: "Type d'item",
            states_id: "ID Statut",
            locations_id: "ID Emplacement",
            users_id: "ID Utilisateur",
            ram: "Mémoire RAM",
            cpu: "Processeur",
            storage: "Stockage",
            gpu: "Carte graphique",
        }
        return labels[key] || key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
                        <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-blue-400 rounded-full animate-spin mx-auto opacity-60"></div>
                    </div>
                    <p className="text-slate-300 text-lg font-medium">Chargement des détails depuis GLPI...</p>
                    <p className="text-slate-500 text-sm mt-2">Équipement ID: {params.id}</p>
                    <div className="mt-4 w-64 mx-auto">
                        <Progress value={75} className="h-2" />
                    </div>
                </div>
            </div>
        )
    }

    if (error || !item) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <div className="text-center max-w-md">
                    <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertTriangle className="w-10 h-10 text-red-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-3">Oops ! Une erreur s'est produite</h2>
                    <p className="text-slate-400 mb-6 leading-relaxed">
                        {error || "L'équipement demandé n'a pas pu être trouvé dans GLPI."}
                    </p>
                    <div className="flex gap-3 justify-center">
                        <Button onClick={() => router.push("/inventory")} className="bg-blue-600 hover:bg-blue-700">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Retour à l'inventaire
                        </Button>
                        <Button
                            onClick={handleRefresh}
                            variant="outline"
                            className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
                        >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Réessayer
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    const { basic, technical, network, dates, ids, custom } = getFieldsByCategory()

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Contenu caché pour l'impression */}
                <div ref={printRef} className="hidden">
                    {/* Le contenu sera généré dynamiquement dans handlePrint */}
                </div>

                {/* Breadcrumb */}
                <Breadcrumb className="mb-6">
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink href="/inventory" className="text-slate-400 hover:text-white transition-colors">
                                Inventaire
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator className="text-slate-600" />
                        <BreadcrumbItem>
                            <BreadcrumbLink
                                href={`/inventory?type=${item.itemtype || item.type}`}
                                className="text-slate-400 hover:text-white transition-colors"
                            >
                                {item.itemtype || item.type || "Équipements"}
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator className="text-slate-600" />
                        <BreadcrumbItem>
                            <BreadcrumbPage className="text-white font-medium">{item.name || `Équipement ${item.id}`}</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>

                {/* Header */}
                <div className="bg-gradient-to-r from-slate-800/50 to-slate-700/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 mb-8 shadow-2xl">
                    <div className="flex items-start justify-between">
                        <div className="flex items-start gap-6">
                            <div className="relative">
                                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                                    {getTypeIcon(item.itemtype || item.type)}
                                </div>
                                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                                    <CheckCircle className="w-4 h-4 text-white" />
                                </div>
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <h1 className="text-4xl font-bold text-white">{item.name || `Équipement ${item.id}`}</h1>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setIsFavorite(!isFavorite)}
                                        className="text-slate-400 hover:text-yellow-400 transition-colors"
                                    >
                                        {isFavorite ? (
                                            <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                                        ) : (
                                            <Star className="w-5 h-5" />
                                        )}
                                    </Button>
                                </div>
                                <div className="flex items-center gap-4 mb-4">
                                    <Badge variant="outline" className="border-slate-600 text-slate-300 px-3 py-1">
                                        <Tag className="w-3 h-3 mr-1" />
                                        {item.itemtype || item.type || "Équipement"}
                                    </Badge>
                                    <Badge variant="outline" className="border-slate-600 text-slate-300 px-3 py-1">
                                        <Hash className="w-3 h-3 mr-1" />
                                        ID: {item.id}
                                    </Badge>
                                    {getStatusBadge(item.states_id, item.states_id_name)}
                                </div>
                                <div className="flex items-center gap-6 text-sm text-slate-400">
                                    {(manufacturerDetails?.name || item.manufacturers_id_name) && (
                                        <div className="flex items-center gap-2">
                                            <Building className="w-4 h-4" />
                                            <span>{manufacturerDetails?.name || item.manufacturers_id_name}</span>
                                        </div>
                                    )}
                                    {(locationDetails?.name || item.locations_id_name) && (
                                        <div className="flex items-center gap-2">
                                            <MapPin className="w-4 h-4" />
                                            <span>{locationDetails?.completename || locationDetails?.name || item.locations_id_name}</span>
                                        </div>
                                    )}
                                    {item.date_mod && (
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-4 h-4" />
                                            <span>Modifié {getRelativeTime(item.date_mod)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleRefresh}
                                className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
                            >
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Actualiser
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={exportData}
                                className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Exporter
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={openInGLPI}
                                className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
                            >
                                <ExternalLink className="w-4 h-4 mr-2" />
                                GLPI
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setDebugMode(!debugMode)}
                                className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
                            >
                                <Info className="w-4 h-4 mr-2" />
                                Debug
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowRawData(!showRawData)}
                                className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
                            >
                                <Info className="w-4 h-4 mr-2" />
                                {showRawData ? "Masquer" : "Voir"} données brutes
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Quick Stats */}
                {showRawData && rawApiData && (
                    <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm shadow-xl mb-8">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-3">
                                <Info className="w-5 h-5" />
                                Données brutes reçues de l'API
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyToClipboard(JSON.stringify(rawApiData, null, 2))}
                                    className="ml-auto"
                                >
                                    <Copy className="w-4 h-4 mr-2" />
                                    Copier
                                </Button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div>
                                    <h4 className="text-green-400 font-semibold mb-2">✅ Item principal:</h4>
                                    <pre className="bg-slate-800/50 p-4 rounded-lg text-xs text-slate-300 overflow-auto max-h-60 border border-slate-600">
                                        {JSON.stringify(rawApiData.item, null, 2)}
                                    </pre>
                                </div>

                                <div>
                                    <h4 className="text-blue-400 font-semibold mb-2">👤 User Details:</h4>
                                    <pre className="bg-slate-800/50 p-4 rounded-lg text-xs text-slate-300 overflow-auto max-h-40 border border-slate-600">
                                        {JSON.stringify(rawApiData.userDetails, null, 2)}
                                    </pre>
                                </div>

                                <div>
                                    <h4 className="text-purple-400 font-semibold mb-2">📍 Location Details:</h4>
                                    <pre className="bg-slate-800/50 p-4 rounded-lg text-xs text-slate-300 overflow-auto max-h-40 border border-slate-600">
                                        {JSON.stringify(rawApiData.locationDetails, null, 2)}
                                    </pre>
                                </div>

                                <div>
                                    <h4 className="text-orange-400 font-semibold mb-2">📊 Status Details:</h4>
                                    <pre className="bg-slate-800/50 p-4 rounded-lg text-xs text-slate-300 overflow-auto max-h-40 border border-slate-600">
                                        {JSON.stringify(rawApiData.statusDetails, null, 2)}
                                    </pre>
                                </div>

                                <div>
                                    <h4 className="text-yellow-400 font-semibold mb-2">🏭 Manufacturer Details:</h4>
                                    <pre className="bg-slate-800/50 p-4 rounded-lg text-xs text-slate-300 overflow-auto max-h-40 border border-slate-600">
                                        {JSON.stringify(rawApiData.manufacturerDetails, null, 2)}
                                    </pre>
                                </div>

                                <div>
                                    <h4 className="text-cyan-400 font-semibold mb-2">💻 Model Details:</h4>
                                    <pre className="bg-slate-800/50 p-4 rounded-lg text-xs text-slate-300 overflow-auto max-h-40 border border-slate-600">
                                        {JSON.stringify(rawApiData.modelDetails, null, 2)}
                                    </pre>
                                </div>

                                {rawApiData.debugInfo && (
                                    <div>
                                        <h4 className="text-red-400 font-semibold mb-2">🔍 Debug Info (3 approches GLPI):</h4>
                                        <div className="space-y-2">
                                            <div>
                                                <p className="text-slate-400 text-sm">Approche 1 (expand_dropdowns=true):</p>
                                                <pre className="bg-slate-800/50 p-2 rounded text-xs text-slate-300 overflow-auto max-h-32 border border-slate-600">
                                                    {JSON.stringify(rawApiData.debugInfo.approach1, null, 2)}
                                                </pre>
                                            </div>
                                            <div>
                                                <p className="text-slate-400 text-sm">Approche 2 (with_dropdowns=true):</p>
                                                <pre className="bg-slate-800/50 p-2 rounded text-xs text-slate-300 overflow-auto max-h-32 border border-slate-600">
                                                    {JSON.stringify(rawApiData.debugInfo.approach2, null, 2)}
                                                </pre>
                                            </div>
                                            <div>
                                                <p className="text-slate-400 text-sm">Approche 3 (sans paramètres):</p>
                                                <pre className="bg-slate-800/50 p-2 rounded text-xs text-slate-300 overflow-auto max-h-32 border border-slate-600">
                                                    {JSON.stringify(rawApiData.debugInfo.approach3, null, 2)}
                                                </pre>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20 backdrop-blur-sm">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-blue-400 text-sm font-medium">Statut</p>
                                    <p className="text-white text-lg font-bold">
                                        {statusDetails?.name || item.states_id_name || item.state || "Inconnu"}
                                    </p>
                                </div>
                                <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                                    <Activity className="w-6 h-6 text-blue-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/20 backdrop-blur-sm">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-green-400 text-sm font-medium">Utilisateur</p>
                                    <p className="text-white text-lg font-bold">
                                        {userDetails
                                            ? userDetails.firstname && userDetails.realname
                                                ? `${userDetails.firstname} ${userDetails.realname}`
                                                : userDetails.name || "Inconnu"
                                            : item.users_id_name || "Libre"}
                                    </p>
                                </div>
                                <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                                    <User className="w-6 h-6 text-green-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/20 backdrop-blur-sm">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-purple-400 text-sm font-medium">Emplacement</p>
                                    <p className="text-white text-lg font-bold">
                                        {locationDetails?.name || item.locations_id_name || "Non défini"}
                                    </p>
                                </div>
                                <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                                    <MapPin className="w-6 h-6 text-purple-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 border-orange-500/20 backdrop-blur-sm">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-orange-400 text-sm font-medium">Dernière MAJ</p>
                                    <p className="text-white text-lg font-bold">{getRelativeTime(item.date_mod)}</p>
                                </div>
                                <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
                                    <Clock className="w-6 h-6 text-orange-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList className="bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm p-1 h-auto">
                        <TabsTrigger
                            value="overview"
                            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white px-6 py-3"
                        >
                            <Info className="w-4 h-4 mr-2" />
                            Vue d'ensemble
                        </TabsTrigger>
                        <TabsTrigger
                            value="technical"
                            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white px-6 py-3"
                        >
                            <Settings className="w-4 h-4 mr-2" />
                            Technique
                        </TabsTrigger>
                        <TabsTrigger
                            value="network"
                            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white px-6 py-3"
                        >
                            <Network className="w-4 h-4 mr-2" />
                            Réseau
                        </TabsTrigger>
                        <TabsTrigger
                            value="history"
                            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white px-6 py-3"
                        >
                            <History className="w-4 h-4 mr-2" />
                            Historique
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Main Information */}
                            <div className="lg:col-span-2 space-y-6">
                                {/* Basic Info */}
                                {basic.length > 0 && (
                                    <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm shadow-xl">
                                        <CardHeader className="pb-4">
                                            <CardTitle className="text-white flex items-center gap-3 text-xl">
                                                <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                                                    <Info className="w-4 h-4 text-blue-400" />
                                                </div>
                                                Informations générales
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {basic.map(({ key, value, label }) => (
                                                    <div key={key} className="group">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <p className="text-sm font-medium text-slate-400">{label}</p>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => copyToClipboard(String(value))}
                                                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-auto"
                                                            >
                                                                <Copy className="w-3 h-3" />
                                                            </Button>
                                                        </div>
                                                        {key === "comment" ? (
                                                            <div className="bg-slate-700/50 border border-slate-600/50 rounded-lg p-4">
                                                                <p className="text-white whitespace-pre-wrap leading-relaxed">{value}</p>
                                                            </div>
                                                        ) : key.includes("serial") ? (
                                                            <div className="bg-slate-900/50 border border-slate-600/50 rounded-lg p-3">
                                                                <p className="text-white font-mono text-sm tracking-wider">{value}</p>
                                                            </div>
                                                        ) : (
                                                            <p className="text-white font-medium text-lg">{value}</p>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>

                            {/* Sidebar */}
                            <div className="space-y-6">
                                {/* Assignment */}
                                <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm shadow-xl">
                                    <CardHeader className="pb-4">
                                        <CardTitle className="text-white flex items-center gap-3">
                                            <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                                                <User className="w-4 h-4 text-green-400" />
                                            </div>
                                            Assignation
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {userDetails || item.users_id_name ? (
                                            <div className="text-center">
                                                <Avatar className="w-16 h-16 mx-auto mb-4 border-2 border-green-500/30">
                                                    <AvatarFallback className="bg-green-500/20 text-green-400 text-lg font-bold">
                                                        {(() => {
                                                            if (userDetails?.firstname && userDetails?.realname) {
                                                                return `${userDetails.firstname.charAt(0)}${userDetails.realname.charAt(0)}`.toUpperCase()
                                                            }
                                                            if (userDetails?.name) {
                                                                return userDetails.name.charAt(0).toUpperCase()
                                                            }
                                                            if (item.users_id_name) {
                                                                return item.users_id_name.charAt(0).toUpperCase()
                                                            }
                                                            return "U"
                                                        })()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="space-y-2">
                                                    <p className="text-white font-semibold text-lg">
                                                        {userDetails
                                                            ? userDetails.firstname && userDetails.realname
                                                                ? `${userDetails.firstname} ${userDetails.realname}`
                                                                : userDetails.name || "Utilisateur inconnu"
                                                            : item.users_id_name || "Utilisateur inconnu"}
                                                    </p>
                                                    {userDetails?.name && <p className="text-slate-400 text-sm">@{userDetails.name}</p>}
                                                    <p className="text-slate-400 text-sm">Utilisateur assigné</p>
                                                    <div className="flex flex-wrap gap-2 justify-center mt-3">
                                                        {item.users_id && (
                                                            <Badge variant="outline" className="border-slate-600 text-slate-400 text-xs">
                                                                ID: {item.users_id}
                                                            </Badge>
                                                        )}
                                                        {userDetails?.email && (
                                                            <Badge variant="outline" className="border-slate-600 text-slate-400 text-xs">
                                                                {userDetails.email}
                                                            </Badge>
                                                        )}
                                                        {userDetails?.phone && (
                                                            <Badge variant="outline" className="border-slate-600 text-slate-400 text-xs">
                                                                {userDetails.phone}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center py-8">
                                                <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                                                    <User className="w-8 h-8 text-slate-500" />
                                                </div>
                                                <p className="text-slate-400 font-medium">Non assigné</p>
                                                <p className="text-slate-500 text-sm mt-1">Équipement disponible</p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Location Details */}
                                {locationDetails && (
                                    <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm shadow-xl">
                                        <CardHeader className="pb-4">
                                            <CardTitle className="text-white flex items-center gap-3">
                                                <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                                                    <MapPin className="w-4 h-4 text-purple-400" />
                                                </div>
                                                Emplacement détaillé
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            {locationDetails.completename && (
                                                <div>
                                                    <p className="text-sm font-medium text-slate-400 mb-1">Emplacement complet</p>
                                                    <p className="text-white font-medium">{locationDetails.completename}</p>
                                                </div>
                                            )}
                                            {locationDetails.building && (
                                                <div>
                                                    <p className="text-sm font-medium text-slate-400 mb-1">Bâtiment</p>
                                                    <p className="text-white font-medium">{locationDetails.building}</p>
                                                </div>
                                            )}
                                            {locationDetails.room && (
                                                <div>
                                                    <p className="text-sm font-medium text-slate-400 mb-1">Salle</p>
                                                    <p className="text-white font-medium">{locationDetails.room}</p>
                                                </div>
                                            )}
                                            {locationDetails.address && (
                                                <div>
                                                    <p className="text-sm font-medium text-slate-400 mb-1">Adresse</p>
                                                    <p className="text-white font-medium">{locationDetails.address}</p>
                                                </div>
                                            )}
                                            {(locationDetails.town || locationDetails.country) && (
                                                <div>
                                                    <p className="text-sm font-medium text-slate-400 mb-1">Localisation</p>
                                                    <p className="text-white font-medium">
                                                        {[locationDetails.town, locationDetails.country].filter(Boolean).join(", ")}
                                                    </p>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Quick Actions */}
                                <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm shadow-xl">
                                    <CardHeader className="pb-4">
                                        <CardTitle className="text-white flex items-center gap-3">
                                            <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                                                <Zap className="w-4 h-4 text-purple-400" />
                                            </div>
                                            Actions rapides
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={openInGLPI}
                                            className="w-full justify-start border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
                                        >
                                            <ExternalLink className="w-4 h-4 mr-2" />
                                            Ouvrir dans GLPI
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={exportData}
                                            className="w-full justify-start border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
                                        >
                                            <Download className="w-4 h-4 mr-2" />
                                            Exporter les données
                                        </Button>

                                        {/* QR Code Dialog */}
                                        <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
                                            <DialogTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="w-full justify-start border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
                                                >
                                                    <QrCode className="w-4 h-4 mr-2" />
                                                    Générer QR Code
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="bg-slate-800 border-slate-700">
                                                <DialogHeader>
                                                    <DialogTitle className="text-white">QR Code - {item.name}</DialogTitle>
                                                </DialogHeader>
                                                <div className="text-center py-6">
                                                    {qrCodeUrl && (
                                                        <div className="space-y-4">
                                                            <img
                                                                src={qrCodeUrl || "/placeholder.svg"}
                                                                alt="QR Code"
                                                                className="mx-auto border border-slate-600 rounded-lg"
                                                            />
                                                            <p className="text-slate-400 text-sm">
                                                                Scannez ce code pour accéder aux détails de l'équipement
                                                            </p>
                                                            <div className="flex gap-2 justify-center">
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        const link = document.createElement("a")
                                                                        link.href = qrCodeUrl
                                                                        link.download = `qr-code-${item.id}.png`
                                                                        link.click()
                                                                    }}
                                                                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                                                                >
                                                                    <Download className="w-4 h-4 mr-2" />
                                                                    Télécharger
                                                                </Button>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => copyToClipboard(qrCodeUrl)}
                                                                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                                                                >
                                                                    <Copy className="w-4 h-4 mr-2" />
                                                                    Copier URL
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </DialogContent>
                                        </Dialog>

                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handlePrint}
                                            className="w-full justify-start border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
                                        >
                                            <Print className="w-4 h-4 mr-2" />
                                            Imprimer la fiche
                                        </Button>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="technical" className="space-y-6">
                        {technical.length > 0 && (
                            <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm shadow-xl">
                                <CardHeader className="pb-4">
                                    <CardTitle className="text-white flex items-center gap-3 text-xl">
                                        <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center">
                                            <Settings className="w-4 h-4 text-orange-400" />
                                        </div>
                                        Spécifications techniques
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {technical.map(({ key, value, label }) => (
                                            <div key={key} className="group">
                                                <div className="flex items-center justify-between mb-2">
                                                    <p className="text-sm font-medium text-slate-400">{label}</p>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => copyToClipboard(String(value))}
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-auto"
                                                    >
                                                        <Copy className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                                <p className="text-white font-medium text-lg">{value}</p>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    <TabsContent value="network" className="space-y-6">
                        {network.length > 0 ? (
                            <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm shadow-xl">
                                <CardHeader className="pb-4">
                                    <CardTitle className="text-white flex items-center gap-3 text-xl">
                                        <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                                            <Network className="w-4 h-4 text-cyan-400" />
                                        </div>
                                        Configuration réseau
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {network.map(({ key, value, label }) => (
                                            <div key={key} className="group">
                                                <div className="flex items-center justify-between mb-2">
                                                    <p className="text-sm font-medium text-slate-400">{label}</p>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => copyToClipboard(String(value))}
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-auto"
                                                    >
                                                        <Copy className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                                <p className="text-white font-medium text-lg font-mono">{value}</p>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        ) : (
                            <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm shadow-xl">
                                <CardContent className="py-12 text-center">
                                    <Network className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                                    <p className="text-slate-400 text-lg">Aucune information réseau disponible</p>
                                    <p className="text-slate-500 text-sm mt-2">
                                        Les données de configuration réseau n'ont pas été trouvées dans GLPI
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    <TabsContent value="history" className="space-y-6">
                        <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm shadow-xl">
                            <CardHeader className="pb-4">
                                <CardTitle className="text-white flex items-center gap-3 text-xl">
                                    <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                                        <History className="w-4 h-4 text-indigo-400" />
                                    </div>
                                    Historique des modifications
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {dates.length > 0 ? (
                                    <div className="space-y-4">
                                        {dates.map(({ key, value, label }, index) => (
                                            <div key={key} className="flex items-center gap-4 p-4 bg-slate-700/30 rounded-lg">
                                                <div className="w-10 h-10 bg-indigo-500/20 rounded-full flex items-center justify-center">
                                                    <Clock className="w-5 h-5 text-indigo-400" />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-white font-medium">{label}</p>
                                                    <p className="text-slate-400 text-sm">{formatDate(value)}</p>
                                                    <p className="text-slate-500 text-xs mt-1">{getRelativeTime(value)}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <History className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                                        <p className="text-slate-400 text-lg">Aucun historique disponible</p>
                                        <p className="text-slate-500 text-sm mt-2">
                                            L'historique des modifications n'est pas disponible pour cet équipement
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                {/* Back Button */}
                <div className="mt-8 flex justify-center">
                    <Button
                        onClick={() => router.push("/inventory")}
                        variant="outline"
                        className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent px-8 py-3"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Retour à l'inventaire
                    </Button>
                </div>
            </div>
        </div>
    )
}
