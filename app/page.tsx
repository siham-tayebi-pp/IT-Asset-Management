"use client"
import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Monitor } from "lucide-react"

export default function LoginPage() {
  const [credentials, setCredentials] = useState({ username: "", password: "" })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [errorDetails, setErrorDetails] = useState<any>(null)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setErrorDetails(null)

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: credentials.username.trim(),
          password: credentials.password.trim(),
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        localStorage.setItem("user", JSON.stringify(data.user))

        // Redirection basée sur le rôle
        if (data.user.role === "admin") {
          router.push("/dashboard")
        } else {
          router.push("/user-dashboard")
        }
      } else {
        setError("Pardon, soit l'utilisateur soit le mot de passe sont incorrects")
      }
    } catch (err) {
      setError("Erreur de connexion au serveur")
      setErrorDetails({ networkError: true })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <Monitor className="w-6 h-6 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-white">IT Asset Management</CardTitle>
            <CardDescription className="text-slate-400">Connectez-vous avec vos identifiants GLPI</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-slate-300">
                  Nom d'utilisateur
                </Label>
                <Input
                  id="username"
                  type="text"
                  value={credentials.username}
                  onChange={(e) => setCredentials((prev) => ({ ...prev, username: e.target.value }))}
                  required
                  placeholder="Votre nom d'utilisateur GLPI"
                  disabled={loading}
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:border-blue-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300">
                  Mot de passe
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={credentials.password}
                  onChange={(e) => setCredentials((prev) => ({ ...prev, password: e.target.value }))}
                  required
                  placeholder="Votre mot de passe"
                  disabled={loading}
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:border-blue-500"
                />
              </div>

              {error && (
                <Alert className="bg-red-50 border-red-200 text-red-800">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <AlertDescription className="text-red-700">
                    <strong>Pardon, soit l'utilisateur soit le mot de passe sont incorrects</strong>
                  </AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
                {loading ? "Connexion..." : "Se connecter"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center">
          <Badge variant="outline" className="text-xs bg-slate-800 border-slate-600 text-slate-400">
            Serveur GLPI : http://192.168.0.58/glpi
          </Badge>
        </div>
      </div>
    </div>
  )
}
