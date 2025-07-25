import { type NextRequest, NextResponse } from "next/server"

// Simulation de la base de données des PC
const pcs = [
  {
    id: "1",
    name: "PC-COMPTA-01",
    owner: "user",
    department: "Comptabilité",
    status: "assigned",
    lastSeen: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2h ago
    specs: {
      ram: "16 GB",
      cpu: "Intel i5-12400",
      os: "Windows 11 Pro",
    },
    isOnLeave: false,
  },
  {
    id: "2",
    name: "PC-RH-01",
    owner: "delegate",
    department: "RH",
    status: "delegate",
    lastSeen: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1h ago
    specs: {
      ram: "32 GB",
      cpu: "Intel i7-13700",
      os: "Windows 11 Pro",
    },
    isOnLeave: false,
  },
  {
    id: "3",
    name: "PC-MARKETING-01",
    owner: undefined,
    department: "Marketing",
    status: "unassigned",
    lastSeen: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(), // 25h ago (> 24h)
    specs: {
      ram: "8 GB",
      cpu: "Intel i3-10100",
      os: "Windows 10 Pro",
    },
    isOnLeave: false,
  },
  {
    id: "4",
    name: "PC-VENTES-01",
    owner: "marie.dupont",
    department: "Ventes",
    status: "assigned",
    lastSeen: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), // 48h ago
    specs: {
      ram: "16 GB",
      cpu: "AMD Ryzen 5 5600",
      os: "Windows 11 Pro",
    },
    isOnLeave: true, // Utilisateur en congé
  },
  {
    id: "5",
    name: "PC-IT-01",
    owner: "admin",
    department: "IT",
    status: "assigned",
    lastSeen: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30min ago
    specs: {
      ram: "64 GB",
      cpu: "Intel i9-13900K",
      os: "Windows 11 Pro",
    },
    isOnLeave: false,
  },
]

export async function GET(request: NextRequest) {
  try {
    // Simulation de la logique du timer 24h
    const now = new Date()
    const updatedPcs = pcs.map((pc) => {
      const lastSeenDate = new Date(pc.lastSeen)
      const hoursSinceLastSeen = (now.getTime() - lastSeenDate.getTime()) / (1000 * 60 * 60)

      // Si plus de 24h sans activité et pas de statut spécial (délégué, congé)
      if (hoursSinceLastSeen > 24 && pc.status !== "delegate" && !pc.isOnLeave) {
        return { ...pc, status: "unassigned" as const }
      }

      return pc
    })

    return NextResponse.json({
      success: true,
      pcs: updatedPcs,
    })
  } catch (error) {
    return NextResponse.json({ error: "Erreur lors de la récupération des PC" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const pcData = await request.json()

    // Simulation de l'ajout/mise à jour d'un PC par l'agent
    console.log("Données PC reçues de l'agent:", pcData)

    return NextResponse.json({
      success: true,
      message: "PC enregistré avec succès",
    })
  } catch (error) {
    return NextResponse.json({ error: "Erreur lors de l'enregistrement du PC" }, { status: 500 })
  }
}
