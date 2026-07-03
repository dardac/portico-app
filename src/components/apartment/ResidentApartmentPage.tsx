"use client";

import { ApartmentProfileSection } from "@/components/apartment/ApartmentProfileSection";

export function ResidentApartmentPage() {
  return (
    <div className="page-content">
      <header className="page-header">
        <p className="page-eyebrow">Perfil</p>
        <h1 className="page-title mt-2">Tu apartamento</h1>
        <p className="page-subtitle">
          Datos permanentes de tu unidad: infraestructura, tuberías y contacto de emergencia.
        </p>
      </header>

      <ApartmentProfileSection
        variant="default"
        integration="standalone"
        disableCollapse
      />
    </div>
  );
}
