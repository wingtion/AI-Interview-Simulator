# syntax=docker/dockerfile:1

# ---- Build stage ----
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Restore first (layer-cached unless the csproj changes)
COPY ["MockMate.API.csproj", "./"]
RUN dotnet restore "MockMate.API.csproj"

# Build & publish
COPY . .
RUN dotnet publish "MockMate.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

# ---- Runtime stage ----
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

# Fly routes traffic to this port (see internal_port in fly.toml).
ENV ASPNETCORE_URLS=http://+:8080
# Workstation GC uses less memory — fits the 256MB free VM.
ENV DOTNET_gcServer=0
EXPOSE 8080

ENTRYPOINT ["dotnet", "MockMate.API.dll"]
