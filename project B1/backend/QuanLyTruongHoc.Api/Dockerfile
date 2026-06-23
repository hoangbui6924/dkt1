FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY QuanLyTruongHoc.sln ./
COPY QuanLyTruongHoc.Api/QuanLyTruongHoc.Api.csproj QuanLyTruongHoc.Api/
COPY QuanLyTruongHoc.Application/QuanLyTruongHoc.Application.csproj QuanLyTruongHoc.Application/
COPY QuanLyTruongHoc.Domain/QuanLyTruongHoc.Domain.csproj QuanLyTruongHoc.Domain/
COPY QuanLyTruongHoc.Infrastructure/QuanLyTruongHoc.Infrastructure.csproj QuanLyTruongHoc.Infrastructure/
RUN dotnet restore QuanLyTruongHoc.Api/QuanLyTruongHoc.Api.csproj

COPY . .
RUN dotnet publish QuanLyTruongHoc.Api/QuanLyTruongHoc.Api.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "QuanLyTruongHoc.Api.dll"]
