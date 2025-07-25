import { NextResponse } from "next/server"

export async function GET() {
    return NextResponse.json({
        message: "API Debug fonctionne !",
        timestamp: new Date().toISOString(),
        route: "/api/debug",
    })
}
