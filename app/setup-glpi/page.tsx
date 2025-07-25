"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheckCircle, XCircle, AlertTriangle, Settings, Copy, ExternalLink } from "lucide-react"

export default function SetupGLPIPage() {
  const [testResult, setTestResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [tokens, setTokens] = useState({
    appToken: "",
    userToken: "",
  })

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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Configuration GLPI Cloud</h1>
          <p className="text-gray-600">
            Configuration pour le serveur : <strong>http://192.168.0.57/glpi</strong>
          </p>
        </div>

        <Tabs defaultValue="setup" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="setup">Configuration</TabsTrigger>
            <TabsTrigger value="test">Test de connexion</TabsTrigger>
            <TabsTrigger value="troubleshoot">Dépannage</TabsTrigger>
          </TabsList>

          <TabsContent value="setup" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Étape 1 : Activer l'API dans GLPI</CardTitle>
                <CardDescription>Configurez l'API REST dans votre instance GLPI Cloud</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                  <ExternalLink className="w-5 h-5 text-blue-600" />
                  <a
                    href="http://192.168.0.57/glpi/apirest.php/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline font-medium"
                  >
                    Ouvrir GLPI Cloud Iberma
                  </a>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold">Instructions :</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>Connectez-vous avec vos identifiants administrateur</li>
                    <li>
                      Allez dans <strong>Configuration</strong> → <strong>Générale</strong> → <strong>API</strong>
                    </li>
                    <li>
                      Cochez <strong>"Activer l'API REST"</strong>
                    </li>
                    <li>
                      Cochez <strong>"Activer la connexion avec identifiants utilisateur"</strong>
                    </li>
                    <li>
                      Cochez <strong>"Activer la connexion avec token utilisateur"</strong>
                    </li>
                    <li>Cliquez sur "Sauvegarder"</li>
                  </ol>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Étape 2 : Créer un App Token</CardTitle>
                <CardDescription>Générez un token d'application pour l'API</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <h4 className="font-semibold">Instructions :</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>
                      Dans GLPI, allez dans <strong>Configuration</strong> → <strong>Générale</strong> →{" "}
                      <strong>API</strong>
                    </li>
                    <li>
                      Section <strong>"Clients API"</strong>
                    </li>
                    <li>Cliquez sur "Ajouter"</li>
                    <li>
                      <strong>Nom :</strong> "PC Management System"
                    </li>
                    <li>
                      <strong>Actif :</strong> Oui
                    </li>
                    <li>
                      <strong>Adresse IP :</strong> 0.0.0.0/0 (pour autoriser toutes les IP)
                    </li>
                    <li>Cliquez sur "Ajouter"</li>
                    <li>
                      <strong>Copiez le App Token généré</strong>
                    </li>
                  </ol>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="appToken">App Token</Label>
                  <div className="flex gap-2">
                    <Input
                      id="appToken"
                      placeholder="Collez votre App Token ici"
                      value={tokens.appToken}
                      onChange={(e) => setTokens((prev) => ({ ...prev, appToken: e.target.value }))}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(`GLPI_APP_TOKEN=${tokens.appToken}`)}
                      disabled={!tokens.appToken}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Étape 3 : Créer un User Token</CardTitle>
                <CardDescription>Générez un token utilisateur pour l'authentification</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <h4 className="font-semibold">Instructions :</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>
                      Allez dans <strong>Administration</strong> → <strong>Utilisateurs</strong>
                    </li>
                    <li>Sélectionnez votre utilisateur administrateur</li>
                    <li>
                      Onglet <strong>"Paramètres personnels"</strong>
                    </li>
                    <li>
                      Section <strong>"Tokens d'API"</strong>
                    </li>
                    <li>Cliquez sur "Générer"</li>
                    <li>
                      <strong>Copiez le User Token généré</strong>
                    </li>
                  </ol>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="userToken">User Token</Label>
                  <div className="flex gap-2">
                    <Input
                      id="userToken"
                      placeholder="Collez votre User Token ici"
                      value={tokens.userToken}
                      onChange={(e) => setTokens((prev) => ({ ...prev, userToken: e.target.value }))}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(`GLPI_USER_TOKEN=${tokens.userToken}`)}
                      disabled={!tokens.userToken}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Étape 4 : Variables d'environnement</CardTitle>
                <CardDescription>Ajoutez ces variables à votre projet</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-gray-100 rounded-lg font-mono text-sm">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span>GLPI_URL=http://192.168.0.57/glpi/apirest.php/</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            copyToClipboard("GLPI_URL=http://192.168.0.57/glpi/apirest.php/")
                          }
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>GLPI_APP_TOKEN={tokens.appToken || "votre_app_token"}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(`GLPI_APP_TOKEN=${tokens.appToken}`)}
                          disabled={!tokens.appToken}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>GLPI_USER_TOKEN={tokens.userToken || "votre_user_token"}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(`GLPI_USER_TOKEN=${tokens.userToken}`)}
                          disabled={!tokens.userToken}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <Alert>
                    <AlertTriangle className="w-4 h-4" />
                    <AlertDescription>
                      <strong>Important :</strong> Ajoutez ces variables dans les paramètres de votre projet v0 ou dans
                      votre fichier .env.local
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="test" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-6 h-6" />
                  Test de Configuration GLPI Cloud
                </CardTitle>
                <CardDescription>Vérifiez la connexion avec http://192.168.0.57/glpi</CardDescription>
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
                          <strong>✅ Connexion GLPI Cloud réussie !</strong>
                          <br />
                          Serveur : {testResult.server} (Version {testResult.version})
                        </AlertDescription>
                      </Alert>
                    ) : testResult.warning ? (
                      <Alert className="border-orange-200 bg-orange-50">
                        <AlertTriangle className="w-4 h-4 text-orange-600" />
                        <AlertDescription className="text-orange-800">
                          <strong>⚠️ Configuration incomplète</strong>
                          <br />
                          {testResult.message}
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <Alert variant="destructive">
                        <XCircle className="w-4 h-4" />
                        <AlertDescription>
                          <strong>❌ Erreur de connexion</strong>
                          <br />
                          {testResult.error}
                        </AlertDescription>
                      </Alert>
                    )}

                    {testResult.data && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Données GLPI récupérées</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium text-gray-600">Ordinateurs trouvés</label>
                              <p className="text-2xl font-bold text-green-600">{testResult.data.computers_count}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-600">Profils disponibles</label>
                              <p className="text-2xl font-bold text-blue-600">{testResult.data.profiles_count}</p>
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
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="troubleshoot" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Problèmes courants</CardTitle>
                <CardDescription>Solutions aux erreurs les plus fréquentes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="border-l-4 border-red-500 pl-4">
                    <h4 className="font-semibold text-red-700">Erreur 401 - Non autorisé</h4>
                    <p className="text-sm text-gray-600">L'API n'est pas activée ou les tokens sont incorrects</p>
                    <ul className="text-sm text-gray-600 mt-2 space-y-1">
                      <li>• Vérifiez que l'API REST est activée dans GLPI</li>
                      <li>• Vérifiez que les tokens sont corrects</li>
                      <li>• Vérifiez que l'utilisateur a les droits API</li>
                    </ul>
                  </div>

                  <div className="border-l-4 border-orange-500 pl-4">
                    <h4 className="font-semibold text-orange-700">Erreur 400 - Requête invalide</h4>
                    <p className="text-sm text-gray-600">Format de requête incorrect</p>
                    <ul className="text-sm text-gray-600 mt-2 space-y-1">
                      <li>• Vérifiez l'URL de l'API (doit finir par /apirest.php)</li>
                      <li>• Vérifiez le format des headers</li>
                    </ul>
                  </div>

                  <div className="border-l-4 border-blue-500 pl-4">
                    <h4 className="font-semibold text-blue-700">Pas de données récupérées</h4>
                    <p className="text-sm text-gray-600">L'API fonctionne mais ne retourne pas de données</p>
                    <ul className="text-sm text-gray-600 mt-2 space-y-1">
                      <li>• Vérifiez les droits de l'utilisateur sur les ordinateurs</li>
                      <li>• Vérifiez qu'il y a des ordinateurs dans GLPI</li>
                      <li>• Vérifiez les entités accessibles</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
