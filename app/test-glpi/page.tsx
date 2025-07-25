"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, AlertTriangle, Settings } from "lucide-react"

export default function TestGLPIPage() {
  const [testResult, setTestResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const runTest = async () => {
    setLoading(true)
    setTestResult(null)

    try {
      const response = await fetch("/api/glpi/test")
      const data = await response.json()
      setTestResult(data)
    } catch (error) {
      setTestResult({
        error: "Erreur de connexion",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-6 h-6" />
              Test de Configuration GLPI
            </CardTitle>
            <CardDescription>Vérifiez la connexion et la configuration de votre serveur GLPI</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Button onClick={runTest} disabled={loading} className="w-full">
              {loading ? "Test en cours..." : "Tester la connexion GLPI"}
            </Button>

            {testResult && (
              <div className="space-y-4">
                {testResult.success ? (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      <strong>✅ Connexion GLPI réussie !</strong>
                      <br />
                      {testResult.message}
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert variant="destructive">
                    <XCircle className="w-4 h-4" />
                    <AlertDescription>
                      <strong>❌ Erreur de connexion GLPI</strong>
                      <br />
                      {testResult.error}
                    </AlertDescription>
                  </Alert>
                )}

                {testResult.data && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Données récupérées</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-600">Token de session</label>
                          <p className="text-sm font-mono bg-gray-100 p-2 rounded">
                            {testResult.data.session_token?.substring(0, 20)}...
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Ordinateurs trouvés</label>
                          <p className="text-lg font-semibold">{testResult.data.computers_count}</p>
                        </div>
                      </div>

                      {testResult.data.sample_computers && testResult.data.sample_computers.length > 0 && (
                        <div className="mt-4">
                          <label className="text-sm font-medium text-gray-600">Exemples d'ordinateurs</label>
                          <div className="mt-2 space-y-2">
                            {testResult.data.sample_computers.map((computer: any, index: number) => (
                              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                <span className="font-medium">{computer.name}</span>
                                <Badge variant="outline">ID: {computer.id}</Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {testResult.missing && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-orange-500" />
                        Configuration manquante
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {Object.entries(testResult.missing).map(([key, missing]) => (
                          <div key={key} className="flex items-center justify-between">
                            <span className="font-medium">{key}</span>
                            {missing ? (
                              <Badge variant="destructive">Manquant</Badge>
                            ) : (
                              <Badge variant="default" className="bg-green-100 text-green-800">
                                Configuré
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {testResult.details && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Détails techniques</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-sm bg-gray-100 p-4 rounded overflow-auto">
                        {JSON.stringify(testResult, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            <div className="mt-8 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold mb-2">📋 Variables d'environnement requises :</h3>
              <div className="text-sm space-y-1 font-mono">
                <p>
                  <strong>GLPI_URL</strong>=http://votre-serveur-glpi.com/apirest.php
                </p>
                <p>
                  <strong>GLPI_APP_TOKEN</strong>=votre_app_token
                </p>
                <p>
                  <strong>GLPI_USER_TOKEN</strong>=votre_user_token
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
