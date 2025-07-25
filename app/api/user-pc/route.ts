import { type NextRequest, NextResponse } from "next/server"

// Simulation des PC utilisateurs
const userPCs = {
  user: {
    id: "1",
    name: "PC-COMPTA-01",
    department: "Comptabilité",
    status: "assigned",
    lastSeen: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    specs: {
      ram: "16 GB",
      cpu: "Intel i5-12400",
      os: "Windows 11 Pro",
    },
  },
  delegate: {
    id: "2",
    name: "PC-RH-01",
    department: "RH",
    status: "delegate",
    lastSeen: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    specs: {
      ram: "32 GB",
      cpu: "Intel i7-13700",
      os: "Windows 11 Pro",
    },
  },
  admin: {
    id: "5",
    name: "PC-IT-01",
    department: "IT",
    status: "assigned",
    lastSeen: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    specs: {
      ram: "64 GB",
      cpu: "Intel i9-13900K",
      os: "Windows 11 Pro",
    },
  },
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const username = searchParams.get("username")

    if (!username) {
      return NextResponse.json({ error: "Nom d'utilisateur requis" }, { status: 400 })
    }

    const pc = userPCs[username as keyof typeof userPCs]

    return NextResponse.json({
      success: true,
      pc: pc || null,
    })
  } catch (error) {
    return NextResponse.json({ error: "Erreur lors de la récupération du PC utilisateur" }, { status: 500 })
  }
}
