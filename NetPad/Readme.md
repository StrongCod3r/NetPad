🧱 1. Crear el proyecto (librería)

Primero necesitas una librería:

dotnet new classlib -n MiLibreria
cd MiLibreria
⚙️ 2. Configurar el .csproj

Edita el .csproj para añadir metadata del paquete:

<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>

    <!-- Metadata NuGet -->
    <PackageId>MiLibreria</PackageId>
    <Version>1.0.0</Version>
    <Authors>TuNombre</Authors>
    <Company>TuEmpresa</Company>
    <Description>Descripción de la librería</Description>

    <!-- Opcional pero recomendado -->
    <PackageTags>csharp;utils</PackageTags>
    <RepositoryUrl>https://github.com/tu/repo</RepositoryUrl>
    <PackageLicenseExpression>MIT</PackageLicenseExpression>

    <!-- Generar el .nupkg automáticamente -->
    <GeneratePackageOnBuild>true</GeneratePackageOnBuild>
  </PropertyGroup>

</Project>
📦 3. Generar el paquete

Tienes dos opciones:

✔️ Opción A: build directo
dotnet build --configuration Release

✔️ Opción B: pack explícito
dotnet pack -c Release


copy bin\Release\MiLibreria.1.0.0.nupkg C:\nuget-local
dotnet add package MiLibreria --source local

dotnet nuget add source C:\nuget-local -n local

Esto genera un .nupkg en:

bin/Release/
🚀 4. Publicar en NuGet.org
1. Crear API Key

En: NuGet
👉 https://www.nuget.org/account/apikeys

2. Subir el paquete
dotnet nuget push bin/Release/MiLibreria.1.0.0.nupkg \
  --api-key TU_API_KEY \
  --source https://api.nuget.org/v3/index.json
🧪 5. Probar localmente (muy útil)

Puedes crear un feed local:

mkdir local-nuget
dotnet nuget add source ./local-nuget -n local

Copias el .nupkg ahí y luego:

dotnet add package MiLibreria --source local
🔥 Tips avanzados (esto te interesa como senior)
✔️ Multi-targeting
<TargetFrameworks>net8.0;netstandard2.1</TargetFrameworks>
✔️ Incluir símbolos (debug)
<IncludeSymbols>true</IncludeSymbols>
<SymbolPackageFormat>snupkg</SymbolPackageFormat>
✔️ SourceLink (muy recomendable)
<PublishRepositoryUrl>true</PublishRepositoryUrl>
<EmbedUntrackedSources>true</EmbedUntrackedSources>
paquete:
dotnet add package Microsoft.SourceLink.GitHub
✔️ Empaquetar XML docs
<GenerateDocumentationFile>true</GenerateDocumentationFile>
✔️ Control fino del pack (escenario pro)
dotnet pack -p:PackageVersion=1.2.3

Ideal para CI/CD (Azure DevOps 👀)

🧠 Flujo típico profesional
Versionas (semver)
dotnet pack
Tests
Publicas
Tag en git