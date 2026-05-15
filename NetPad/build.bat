
del bin\Release\NetPad.1.0.0.nupkg

dotnet clean
dotnet build --configuration Release
dotnet pack -c Release

copy bin\Release\NetPad.1.0.0.nupkg C:\nuget-local