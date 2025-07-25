import { NextResponse } from "next/server"

async function getValidSessionToken() {
    const GLPI_URL = process.env.GLPI_URL || "http://192.168.0.1/glpi"
    const APP_TOKEN = process.env.GLPI_APP_TOKEN || "ow3eeLBLEpnrS7hHN0S04a7617VMqGtYCUH9AceL"
    const USER_TOKEN = process.env.GLPI_USER_TOKEN || "your_user_token_here"

    try {
        const initResponse = await fetch(`${GLPI_URL}/apirest.php/initSession`, {
            method: "GET",
            headers: {
                "App-Token": APP_TOKEN,
                Authorization: `user_token ${USER_TOKEN}`,
                "Content-Type": "application/json",
            },
        })

        if (initResponse.ok) {
            const sessionData = await initResponse.json()
            return sessionData.session_token
        }
        return null
    } catch (error) {
        return null
    }
}

export async function GET() {
    try {
        const GLPI_URL = process.env.GLPI_URL || "http://192.168.0.1/glpi"
        const APP_TOKEN = process.env.GLPI_APP_TOKEN || "ow3eeLBLEpnrS7hHN0S04a7617VMqGtYCUH9AceL"
        let SESSION_TOKEN = process.env.GLPI_SESSION_TOKEN || "c6dq7c52jnv6tsr2f47i2lsq1k"

        let response = await fetch(`${GLPI_URL}/apirest.php/Profile`, {
            method: "GET",
            headers: {
                "App-Token": APP_TOKEN,
                "Session-Token": SESSION_TOKEN,
                "Content-Type": "application/json",
            },
        })

        if (response.status === 401) {
            const newToken = await getValidSessionToken()
            if (newToken) {
                SESSION_TOKEN = newToken
                response = await fetch(`${GLPI_URL}/apirest.php/Profile`, {
                    method: "GET",
                    headers: {
                        "App-Token": APP_TOKEN,
                        "Session-Token": SESSION_TOKEN,
                        "Content-Type": "application/json",
                    },
                })
            }
        }

        if (!response.ok) {
            throw new Error(`Failed to fetch profiles: ${response.status}`)
        }

        const profiles = await response.json()

        return NextResponse.json({
            success: true,
            profiles: profiles,
        })
    } catch (error) {
        console.error("Erreur récupération profils:", error)
        return NextResponse.json(
            {
                success: false,
                error: "Erreur lors de la récupération des profils",
            },
            { status: 500 },
        )
    }
}
